/**
 * Debug Dashboard - Logs Page JavaScript
 *
 * Handles SSE live updates, manual refresh, auto-refresh fallback and diagnostics.
 */
document.addEventListener('DOMContentLoaded', () => {
  const LOG_PREFIX = '[DEBUG-LOGS]';
  const JWT_STORAGE_KEY = 'safeair.debug.jwt';
  const JWT_COOKIE_NAME = 'safeair_debug_jwt';
  const MAX_ROWS = 200;
  const STALE_AFTER_MS = 30000;
  let autoInterval = null;
  let refreshing = false;
  let eventSource = null;
  let reconnectTimer = null;
  let lastEventAt = 0;
  let logs = [];
  const logIds = new Set();

  console.log(LOG_PREFIX + ' initializing');

  const refreshBtn = document.getElementById('refreshBtn');
  const autoCheck = document.getElementById('autoRefresh');
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

  function readCookie(name) {
    const prefix = name + '=';
    const match = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(prefix));

    return match ? decodeURIComponent(match.slice(prefix.length)) : '';
  }

  function safeLocalStorageGet(key) {
    try {
      return localStorage.getItem(key) || '';
    } catch (error) {
      console.warn(LOG_PREFIX + ' localStorage read error', error);
      return '';
    }
  }

  function getCurrentJwt() {
    return safeLocalStorageGet(JWT_STORAGE_KEY) || readCookie(JWT_COOKIE_NAME);
  }

  async function readErrorBody(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json().catch(() => null);
      return json && (json.error || json.message) ? (json.error || json.message) : JSON.stringify(json);
    }

    return response.text().catch(() => '');
  }

  async function validateLogsEndpoint(jwt) {
    const url = new URL('/debug/logs', window.location.origin);
    url.searchParams.set('limit', String(MAX_ROWS));
    url.searchParams.set('t', Date.now().toString());

    const headers = {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };
    if (jwt) {
      headers.Authorization = 'Bearer ' + jwt;
    }

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

    const jwt = getCurrentJwt();
    console.log(LOG_PREFIX + ' refresh start', { reason: reason || 'manual', hasToken: Boolean(jwt) });
    setStatus('Actualizando logs...', 'info');

    try {
      const data = await validateLogsEndpoint(jwt);
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

  function parseEvent(event) {
    try {
      return event && event.data ? JSON.parse(event.data) : null;
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

  function startSse() {
    if (!window.EventSource) {
      setStatus('SSE no disponible en este navegador. Usa Refresh o Auto-refresh.', 'error');
      return;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    setStatus('Conectando a tiempo real...', 'info');
    eventSource = new EventSource('/debug/events/logs');

    eventSource.addEventListener('open', () => {
      setStatus('Conexion SSE abierta.', 'info');
    });

    eventSource.addEventListener('connected', () => {
      markEvent('Conectado a tiempo real.');
    });

    eventSource.addEventListener('snapshot', (event) => {
      const payload = parseEvent(event);
      if (Array.isArray(payload)) {
        replaceLogs(payload);
      }
      markEvent('Snapshot de logs recibido.');
    });

    eventSource.addEventListener('log', (event) => {
      const payload = parseEvent(event);
      appendLog(payload && payload.payload ? payload.payload : payload);
      markEvent('Log recibido por SSE.');
    });

    eventSource.addEventListener('message', (event) => {
      const payload = parseEvent(event);
      if (payload && payload.payload) {
        appendLog(payload.payload);
      }
      markEvent('Mensaje SSE recibido.');
    });

    eventSource.addEventListener('telemetry', (event) => {
      const payload = parseEvent(event);
      if (payload && payload.payload) {
        appendLog(payload.payload);
      }
      markEvent('Telemetria recibida por SSE.');
    });

    eventSource.addEventListener('actuator', (event) => {
      const payload = parseEvent(event);
      if (payload && payload.payload) {
        appendLog(payload.payload);
      }
      markEvent('Actuador recibido por SSE.');
    });

    eventSource.addEventListener('update', () => {
      refreshView('sse-update');
    });

    eventSource.addEventListener('heartbeat', () => {
      markEvent('Tiempo real activo.');
    });

    eventSource.onerror = () => {
      setStatus('Conexion en tiempo real interrumpida; reintentando...', 'error');
      scheduleReconnect();
    };
  }

  function stopSse() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  function stopAutoRefresh() {
    if (autoInterval) {
      clearInterval(autoInterval);
      autoInterval = null;
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    if (!autoCheck || !autoCheck.checked) return;

    console.log(LOG_PREFIX + ' auto-refresh enabled');
    autoInterval = setInterval(() => {
      refreshView('auto');
    }, 5000);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshView('manual');
    });
  }

  if (autoCheck) {
    autoCheck.addEventListener('change', startAutoRefresh);
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
    stopAutoRefresh();
    stopSse();
  });

  startAutoRefresh();
  startSse();
  refreshView('initial');

  setInterval(() => {
    const el = document.getElementById('clock');
    if (el) {
      el.textContent = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    }
  }, 1000);

  const jwt = getCurrentJwt();
  console.log(LOG_PREFIX + ' token loaded', { hasToken: Boolean(jwt), source: jwt ? 'localStorage-or-cookie' : 'none' });
});
