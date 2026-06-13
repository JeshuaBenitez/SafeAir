/**
 * Debug Dashboard - Logs Page JavaScript
 *
 * Handles SSE live updates and an automatic polling fallback.
 */
document.addEventListener('DOMContentLoaded', () => {
  const LOG_PREFIX = '[DEBUG-LOGS]';
  const MAX_ROWS = 200;
  const STALE_AFTER_MS = 30000;
  const FALLBACK_REFRESH_MS = 5000;
  let fallbackInterval = null;
  let refreshing = false;
  let sseAbortController = null;
  let reconnectTimer = null;
  let lastEventAt = 0;
  let logs = [];
  const logIds = new Set();

  console.log(LOG_PREFIX + ' initializing');

  const statusEl = document.getElementById('debugStatus');
  const tbody = document.getElementById('logsTableBody');
  const logCount = document.getElementById('logCount');

  function setStatus(message, type) {
    if (!statusEl) return;
    const suffix = lastEventAt ? ' Ultimo evento: ' + formatShortTime(lastEventAt) : '';
    statusEl.textContent = (message || '') + suffix;
    statusEl.className = 'debug-status' + (type ? ' ' + type : '');
  }

  function formatShortTime(value) {
    return new Date(value).toLocaleTimeString('es-MX', {
      timeZone: 'America/Mexico_City',
      hour12: false
    });
  }

  async function readErrorBody(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json().catch(() => null);
      return json && (json.error || json.message) ? (json.error || json.message) : JSON.stringify(json);
    }

    return response.text().catch(() => '');
  }

  async function validateLogsEndpoint() {
    const url = new URL('/debug/logs', window.location.origin);
    url.searchParams.set('limit', String(MAX_ROWS));
    url.searchParams.set('t', Date.now().toString());

    const headers = {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };
    const response = await fetch(url.toString(), {
      cache: 'no-store',
      credentials: 'same-origin',
      headers
    });

    if (!response.ok) {
      const body = await readErrorBody(response);
      throw new Error('HTTP ' + response.status + ' ' + response.statusText + (body ? ': ' + body : ''));
    }

    return response.json();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatLocalTime(isoString) {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (_error) {
      return isoString;
    }
  }

  function normalizeLogs(input) {
    const rawLogs = Array.isArray(input && input.logs)
      ? input.logs
      : Array.isArray(input)
        ? input
        : [];
    return rawLogs
      .filter(log => log && log.id !== undefined)
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, MAX_ROWS);
  }

  function replaceLogs(input) {
    logs = normalizeLogs(input);
    logIds.clear();
    logs.forEach(log => logIds.add(Number(log.id)));
    renderLogs();
  }

  function appendLog(log) {
    if (!log || log.id === undefined) return;
    const id = Number(log.id);
    if (logIds.has(id)) return;

    logIds.add(id);
    logs.unshift(log);
    logs = logs
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, MAX_ROWS);

    while (logIds.size > logs.length) {
      const currentIds = new Set(logs.map(item => Number(item.id)));
      for (const existingId of Array.from(logIds)) {
        if (!currentIds.has(existingId)) logIds.delete(existingId);
      }
    }

    renderLogs();
  }

  function renderLogs() {
    if (logCount) logCount.textContent = String(logs.length);
    if (!tbody) return;

    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Sin logs disponibles. Los eventos apareceran aqui en tiempo real.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.slice(0, 100).map(log => {
      const level = escapeHtml(log.level || 'info');
      return '<tr class="log-' + level + '">' +
        '<td>' + escapeHtml(formatLocalTime(log.timestamp)) + '</td>' +
        '<td><span class="badge badge-' + level + '">' + level.toUpperCase() + '</span></td>' +
        '<td><span class="badge badge-source">' + escapeHtml(log.source || '-') + '</span></td>' +
        '<td>' + escapeHtml(log.event || '-') + '</td>' +
        '<td>' + escapeHtml(log.message || '-') + '</td>' +
        '<td>' + escapeHtml(log.emulatorId || '-') + '</td>' +
        '</tr>';
    }).join('');
  }

  async function refreshView(reason) {
    if (refreshing) return;
    refreshing = true;

    console.log(LOG_PREFIX + ' refresh start', { reason: reason || 'automatic' });
    setStatus('Actualizando logs...', 'info');

    try {
      const data = await validateLogsEndpoint();
      console.log(LOG_PREFIX + ' refresh success', { count: data.count });
      replaceLogs(data);
      setStatus('Logs actualizados. Tiempo real activo.', 'success');
    } catch (error) {
      console.error(LOG_PREFIX + ' refresh error', error);
      setStatus('Refresh error: ' + (error && error.message ? error.message : String(error)), 'error');
    } finally {
      refreshing = false;
    }
  }

  function parseEventData(data) {
    try {
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(LOG_PREFIX + ' invalid SSE payload', error);
      return null;
    }
  }

  function markEvent(message) {
    lastEventAt = Date.now();
    setStatus(message || 'Tiempo real activo.', 'success');
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      startSse();
    }, 2500);
  }

  async function consumeSse(response, onEvent) {
    if (!response.body) {
      throw new Error('El navegador no expuso el stream SSE.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true }).replace(/\r\n/g, '\n');

      let separatorIndex;
      while ((separatorIndex = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        let eventName = 'message';
        const dataLines = [];

        block.split('\n').forEach((line) => {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        });

        onEvent(eventName, dataLines.join('\n'));
      }
    }
  }

  async function startSse() {
    stopSse();
    const controller = new AbortController();
    sseAbortController = controller;

    setStatus('Conectando a tiempo real...', 'info');
    try {
      const response = await fetch('/debug/events/logs', {
        headers: {
          Accept: 'text/event-stream'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(await readErrorBody(response));
      }
      stopFallbackRefresh();
      setStatus('Conexion SSE abierta.', 'info');
      await consumeSse(response, (eventName, data) => {
        const payload = parseEventData(data);
        if (eventName === 'connected' || eventName === 'heartbeat') {
          markEvent('Tiempo real activo.');
        } else if (eventName === 'snapshot') {
          const snapshotLogs = Array.isArray(payload) ? payload : payload && payload.logs;
          if (Array.isArray(snapshotLogs)) replaceLogs(snapshotLogs);
          markEvent('Snapshot de logs recibido.');
        } else if (eventName === 'update') {
          refreshView('sse-update');
        } else if (eventName === 'log' || eventName === 'message' || eventName === 'telemetry' || eventName === 'actuator') {
          appendLog(payload && payload.payload ? payload.payload : payload);
          markEvent('Evento recibido por SSE.');
        }
      });
      if (!controller.signal.aborted) scheduleReconnect();
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(LOG_PREFIX + ' SSE error', error);
      setStatus('Conexion en tiempo real interrumpida; usando actualizacion automatica.', 'error');
      startFallbackRefresh();
      scheduleReconnect();
    }
  }

  function stopSse() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (sseAbortController) {
      sseAbortController.abort();
      sseAbortController = null;
    }
  }

  function stopFallbackRefresh() {
    if (fallbackInterval) {
      clearInterval(fallbackInterval);
      fallbackInterval = null;
    }
  }

  function startFallbackRefresh() {
    if (fallbackInterval) return;
    fallbackInterval = setInterval(() => {
      refreshView('fallback');
    }, FALLBACK_REFRESH_MS);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const stale = !lastEventAt || Date.now() - lastEventAt > STALE_AFTER_MS;
    refreshView(stale ? 'visibility-stale' : 'visibility');
    if (stale) {
      startSse();
    }
  });

  window.addEventListener('pagehide', () => {
    stopFallbackRefresh();
    stopSse();
  });

  startSse();
  refreshView('initial');

  setInterval(() => {
    const el = document.getElementById('clock');
    if (el) {
      el.textContent = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    }
  }, 1000);
});
