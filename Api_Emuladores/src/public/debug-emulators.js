/**
 * Debug Dashboard - Emulators Page JavaScript
 *
 * Handles SSE live updates, automatic fallback refresh, JWT persistence and control buttons.
 */
document.addEventListener('DOMContentLoaded', () => {
  const LOG_PREFIX = '[DEBUG-EMULATORS]';
  const JWT_STORAGE_KEY = 'safeair.debug.jwt';
  let fallbackInterval = null;
  let refreshing = false;
  let sseAbortController = null;
  let reconnectTimer = null;
  let refreshTimer = null;
  let lastEventAt = 0;
  let activeJwt = '';
  let refreshSequence = 0;
  const pendingControls = new Set();
  const STALE_AFTER_MS = 30000;
  const FALLBACK_REFRESH_MS = 5000;

  console.log(LOG_PREFIX + ' initializing');

  const jwtInput = document.getElementById('jwtToken');
  const statusEl = document.getElementById('debugStatus');
  const cardsGrid = document.getElementById('emulatorCardsGrid');
  const applyJwtBtn = document.getElementById('applyJwtBtn');
  const clearJwtBtn = document.getElementById('clearJwtBtn');

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

  function safeLocalStorageGet(key) {
    try {
      return localStorage.getItem(key) || '';
    } catch (error) {
      console.warn(LOG_PREFIX + ' localStorage read error', error);
      return '';
    }
  }

  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(LOG_PREFIX + ' localStorage write error', error);
    }
  }

  function safeLocalStorageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(LOG_PREFIX + ' localStorage remove error', error);
    }
  }

  function getCurrentJwt() {
    return activeJwt;
  }

  function persistJwtFromInput() {
    const jwt = jwtInput ? jwtInput.value.trim() : '';
    if (!jwt) {
      safeLocalStorageRemove(JWT_STORAGE_KEY);
      activeJwt = '';
      return '';
    }

    activeJwt = jwt;
    safeLocalStorageSet(JWT_STORAGE_KEY, jwt);
    return jwt;
  }

  async function readErrorBody(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json().catch(() => null);
      return json && (json.error || json.message) ? (json.error || json.message) : JSON.stringify(json);
    }

    return response.text().catch(() => '');
  }

  async function validateEmulatorsEndpoint(jwt) {
    const url = new URL('/debug/emulators', window.location.origin);
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
      const error = new Error('HTTP ' + response.status + ' ' + response.statusText + (body ? ': ' + body : ''));
      error.status = response.status;
      throw error;
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
    if (!isoString) return 'N/A';
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

  function fmt(value, decimals) {
    const numeric = Number(value);
    return value === null || value === undefined || !Number.isFinite(numeric) ? '—' : Number(numeric.toFixed(decimals)).toString();
  }

  function normalizeTelemetry(emu) {
    const candidates = [
      emu && emu.latestMeasurement,
      emu && emu.currentMetrics,
      emu && emu.metrics,
      emu && emu.telemetry,
      emu && emu.roomState && emu.roomState.metrics,
      emu && emu.roomState
    ];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;

      const metrics = candidate.metrics && typeof candidate.metrics === 'object'
        ? candidate.metrics
        : candidate;
      const temperature = Number(metrics.temperature);
      const humidity = Number(metrics.humidity);
      const co2 = Number(metrics.co2);
      const pm25 = Number(metrics.pm25);

      if ([temperature, humidity, co2, pm25].every(Number.isFinite)) {
        return {
          temperature,
          humidity,
          co2,
          pm25,
          measuredAt: candidate.measuredAt || candidate.updatedAt || candidate.timestamp || emu.lastSeen || null
        };
      }
    }

    return null;
  }

  function telemetryLastSeen(emu, telemetry) {
    return (telemetry && telemetry.measuredAt) || emu.lastSeen || null;
  }

  function deviceDisplay(isOn, targetTemp, label, hasTemp) {
    if (isOn === null || isOn === undefined) return '<span class="device-badge unknown">' + escapeHtml(label) + ': N/A</span>';
    const stateClass = isOn ? 'on' : 'off';
    const stateLabel = isOn ? 'ON' : 'OFF';
    const tempStr = hasTemp && targetTemp !== null && targetTemp !== undefined ? ' (' + escapeHtml(targetTemp) + '°C)' : '';
    return '<span class="device-badge ' + stateClass + '">' + escapeHtml(label) + ': ' + stateLabel + tempStr + '</span>';
  }

  function unitList(emu, type, count) {
    const reported = emu.devices && Array.isArray(emu.devices[type]) ? emu.devices[type] : [];
    const byIndex = new Map(reported.map(unit => [Number(unit.deviceIndex || 1), unit]));
    return Array.from({ length: count }, (_, index) => byIndex.get(index + 1) || {
      deviceIndex: index + 1,
      isOn: null,
      targetTemperature: null
    });
  }

  function controlGroup(type, label, units, supportsTemperature, disabled) {
    const disabledAttr = disabled ? ' disabled' : '';
    return units.map(unit => {
      const isOn = unit.isOn === true ? ' is-active' : '';
      const isOff = unit.isOn === false ? ' is-active' : '';
      return '<div class="control-group">' +
        '<span class="control-label">' + label + ' Unidad ' + escapeHtml(unit.deviceIndex) + '</span>' +
        '<div class="btn-group">' +
        '<button class="btn-control btn-on' + isOn + '" data-device="' + type + '" data-device-index="' + escapeHtml(unit.deviceIndex) + '" data-action="turn_on" data-value="true"' + disabledAttr + '>ON</button>' +
        '<button class="btn-control btn-off' + isOff + '" data-device="' + type + '" data-device-index="' + escapeHtml(unit.deviceIndex) + '" data-action="turn_off" data-value="false"' + disabledAttr + '>OFF</button>' +
        (supportsTemperature
          ? '<button class="btn-control btn-temp" data-device="' + type + '" data-device-index="' + escapeHtml(unit.deviceIndex) + '" data-action="set_temperature" data-value="22"' + disabledAttr + '>22°C</button>' +
            '<button class="btn-control btn-temp" data-device="' + type + '" data-device-index="' + escapeHtml(unit.deviceIndex) + '" data-action="set_temperature" data-value="24"' + disabledAttr + '>24°C</button>' +
            '<button class="btn-control btn-temp" data-device="' + type + '" data-device-index="' + escapeHtml(unit.deviceIndex) + '" data-action="set_temperature" data-value="26"' + disabledAttr + '>26°C</button>'
          : '') +
        '</div></div>';
    }).join('');
  }

  function renderEmulatorCard(emu, index) {
    const assignmentStatus = emu.assignmentStatus || (emu.hasEmulator ? 'assigned' : 'room-without-emulator');
    const isAssigned = assignmentStatus === 'assigned' && emu.ownedByUser && emu.roomId;
    const isFreeAssignable = assignmentStatus === 'free' && emu.status === 'online';
    const connClass = assignmentStatus === 'free'
      ? (isFreeAssignable ? 'available' : 'offline')
      : assignmentStatus === 'room-without-emulator'
        ? 'unassigned'
        : (emu.connected ? 'connected' : 'disconnected');
    const connLabel = assignmentStatus === 'free'
      ? (isFreeAssignable ? 'Libre / asignable' : 'Libre / ' + (emu.status || 'offline') + ' / no operativo')
      : assignmentStatus === 'room-without-emulator'
        ? 'Sin emulador asignado'
        : (emu.connected ? 'Conectado' : 'Desconectado');

    const roomName = emu.roomName || emu.roomId || 'Sin room válido';
    const emulatorLabel = emu.emulatorId || 'Sin emulador asignado';
    const primaryTitle = isAssigned || assignmentStatus === 'room-without-emulator' ? roomName : emulatorLabel;
    const secondaryTitle = isAssigned ? 'Emulador: ' + emulatorLabel : assignmentStatus === 'room-without-emulator' ? 'Sin emulador asignado' : 'Libre / no asignado';
    const roomInfo = emu.roomName && emu.roomId ? roomName + ' (ID: ' + String(emu.roomId).slice(0, 8) + '...)' : (emu.roomId ? 'ID: ' + String(emu.roomId).slice(0, 8) + '...' : 'No asignado a ninguna habitación');
    const cardId = escapeHtml(emu.emulatorId || ('room-' + (emu.roomId || index)));

    const miniCount = Number(emu.minisplitCount || 0);
    const purCount = Number(emu.purifierCount || 0);
    const extCount = Number(emu.extractorCount || 0);
    const minisplitUnits = unitList(emu, 'minisplit', miniCount);
    const purifierUnits = unitList(emu, 'purifier', purCount);
    const extractorUnits = unitList(emu, 'extractor', extCount);
    const controlsDisabled = !isAssigned;
    const telemetry = isAssigned ? normalizeTelemetry(emu) : null;

    const miniBadge = isAssigned ? minisplitUnits.map(unit => deviceDisplay(unit.isOn, unit.targetTemperature, 'Minisplit Unidad ' + unit.deviceIndex, true)).join(' ') : '<span class="device-badge unknown">Minisplit (' + miniCount + '): N/A</span>';
    const purBadge = isAssigned ? purifierUnits.map(unit => deviceDisplay(unit.isOn, null, 'Purificador Unidad ' + unit.deviceIndex, false)).join(' ') : '<span class="device-badge unknown">Purificador (' + purCount + '): N/A</span>';
    const extBadge = isAssigned ? extractorUnits.map(unit => deviceDisplay(unit.isOn, null, 'Extractor Unidad ' + unit.deviceIndex, false)).join(' ') : '<span class="device-badge unknown">Extractor (' + extCount + '): N/A</span>';
    const controlHint = controlsDisabled ? '<div class="control-hint">Sin emulador asignado: el control manual queda deshabilitado para evitar comandos a rooms inválidos.</div>' : '';
    const areaM2 = emu.roomArea !== null && emu.roomArea !== undefined ? fmt(emu.roomArea, 2) + ' m²' : 'No configurado';
    const windowCount = emu.windowCount !== undefined && emu.windowCount !== null ? String(emu.windowCount) : 'No configurado';

    return '<div class="emulator-card">' +
      '<div class="card-header"><div class="card-title"><div class="card-title-main"><strong>' + escapeHtml(primaryTitle) + '</strong><span>' + escapeHtml(secondaryTitle) + '</span></div><span class="status-badge ' + connClass + '">' + escapeHtml(connLabel) + '</span></div>' +
      '<div class="card-meta">Último reporte: ' + escapeHtml(formatLocalTime(telemetryLastSeen(emu, telemetry))) + '</div>' +
      '<div class="card-meta">Habitación: <code>' + escapeHtml(roomInfo) + '</code></div>' +
      '<div class="card-meta">Área ' + escapeHtml(areaM2) + ' · ' + escapeHtml(windowCount) + ' ventanas · Minisplits ' + miniCount + ' · Purificadores ' + purCount + ' · Extractores ' + extCount + '</div></div>' +
      '<div class="metrics-grid">' +
      '<div class="metric-box"><div class="metric-value">' + (telemetry ? fmt(telemetry.temperature, 2) + '°C' : '—') + '</div><div class="metric-label">' + (telemetry ? 'Temperatura' : 'Sin métricas disponibles') + '</div></div>' +
      '<div class="metric-box"><div class="metric-value">' + (telemetry ? fmt(telemetry.humidity, 2) + '%' : '—') + '</div><div class="metric-label">Humedad</div></div>' +
      '<div class="metric-box"><div class="metric-value">' + (telemetry ? fmt(telemetry.co2, 2) : '—') + '</div><div class="metric-label">CO₂ (ppm)</div></div>' +
      '<div class="metric-box"><div class="metric-value">' + (telemetry ? fmt(telemetry.pm25, 2) : '—') + '</div><div class="metric-label">PM2.5 (μg/m³)</div></div>' +
      '<div class="metric-box"><div class="metric-value">' + escapeHtml(areaM2) + '</div><div class="metric-label">Área</div></div>' +
      '<div class="metric-box"><div class="metric-value">' + escapeHtml(windowCount) + '</div><div class="metric-label">Ventanas</div></div></div>' +
      '<div class="devices-section"><div class="section-label">Dispositivos</div><div class="device-badges">' + miniBadge + ' ' + purBadge + ' ' + extBadge + '</div></div>' +
      '<div class="controls-section' + (controlsDisabled ? ' controls-section--disabled' : '') + '" data-room-id="' + (isAssigned ? escapeHtml(emu.roomId) : '') + '" data-emulator-id="' + cardId + '" data-assignment-status="' + escapeHtml(assignmentStatus) + '">' +
      '<div class="section-label">Control Manual</div>' + controlHint +
      controlGroup('minisplit', 'Minisplit', minisplitUnits, true, controlsDisabled) +
      controlGroup('purifier', 'Purificador', purifierUnits, false, controlsDisabled) +
      controlGroup('extractor', 'Extractor', extractorUnits, false, controlsDisabled) +
      '</div><div class="control-result" id="result-' + cardId + '"></div></div>';
  }

  function renderEmulators(data) {
    const emulators = Array.isArray(data && data.emulators) ? data.emulators : [];
    if (!cardsGrid) return;

    cardsGrid.innerHTML = emulators.length
      ? emulators.map(renderEmulatorCard).join('')
      : '<div class="empty-state">No hay rooms configurados para este usuario. Cuando crees una habitación aparecerá aquí.</div>';
  }

  function clearPendingControls() {
    pendingControls.clear();
  }

  function renderEmptyState(message) {
    if (!cardsGrid) return;
    cardsGrid.innerHTML = '<div class="empty-state">' + escapeHtml(message) + '</div>';
  }

  function clearVisibleState(message, type) {
    refreshSequence += 1;
    clearPendingControls();
    renderEmptyState(message || 'Sin JWT: pega un token válido para cargar rooms autorizadas.');
    setStatus(message || 'Sin JWT: pega un token válido para cargar rooms autorizadas.', type || 'info');
  }

  function clearStoredJwt() {
    activeJwt = '';
    safeLocalStorageRemove(JWT_STORAGE_KEY);
    if (jwtInput) {
      jwtInput.value = '';
    }
  }

  function clearAuthState(message, type) {
    refreshing = false;
    clearStoredJwt();
    stopSse();
    clearVisibleState(message || 'Sin JWT: pega un token válido para cargar rooms autorizadas.', type || 'info');
  }

  function applyJwt(jwt, reason) {
    const nextJwt = String(jwt || '').trim();
    stopSse();
    refreshing = false;
    refreshSequence += 1;
    clearPendingControls();

    if (!nextJwt) {
      clearAuthState('Sin JWT: pega un token válido para cargar rooms autorizadas.', 'info');
      return;
    }

    activeJwt = nextJwt;
    if (jwtInput && jwtInput.value.trim() !== nextJwt) {
      jwtInput.value = nextJwt;
    }
    safeLocalStorageSet(JWT_STORAGE_KEY, nextJwt);
    renderEmptyState('Cargando rooms autorizadas...');
    setStatus('Cargando snapshot fresco...', 'info');
    startSse();
    refreshView(reason || 'jwt-change');
  }

  async function refreshView(reason) {
    if (refreshing) return;

    const jwt = getCurrentJwt();
    if (!jwt) {
      clearAuthState('Sin JWT: pega un token válido para cargar rooms autorizadas.', 'info');
      return;
    }

    refreshing = true;
    const requestId = ++refreshSequence;
    const requestJwt = jwt;

    console.log(LOG_PREFIX + ' refresh start', { reason: reason || 'manual', hasToken: Boolean(jwt) });
    setStatus('Actualizando datos...', 'info');

    try {
      const data = await validateEmulatorsEndpoint(jwt);
      if (requestId !== refreshSequence || requestJwt !== activeJwt) {
        console.log(LOG_PREFIX + ' stale refresh ignored', { reason: reason || 'manual' });
        return;
      }
      console.log(LOG_PREFIX + ' refresh success', { count: data.count, mode: data.mode });
      renderEmulators(data);
      setStatus('Datos actualizados. Tiempo real activo.', 'success');
    } catch (error) {
      console.error(LOG_PREFIX + ' refresh error', error);
      if (error && (error.status === 401 || error.status === 403)) {
        stopSse();
        renderEmptyState('JWT inválido o expirado. El token se conserva para que puedas corregirlo.');
        setStatus('JWT inválido o expirado: corrige el token y presiona Aplicar JWT.', 'error');
        return;
      }
      renderEmptyState('No se pudo cargar el snapshot de emuladores.');
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

  function scheduleRefresh(reason) {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refreshView(reason || 'sse');
    }, 300);
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
    if (!activeJwt) {
      setStatus('Sin JWT: tiempo real detenido.', 'info');
      return;
    }

    stopSse();
    const controller = new AbortController();
    sseAbortController = controller;

    setStatus('Conectando a tiempo real...', 'info');
    try {
      const response = await fetch('/debug/events/emulators', {
        headers: {
          Accept: 'text/event-stream',
          Authorization: 'Bearer ' + activeJwt
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
        if (data) parseEvent({ data });
        if (eventName === 'connected' || eventName === 'heartbeat') {
          markEvent('Tiempo real activo.');
          return;
        }
        markEvent('Actualizacion recibida por SSE.');
        scheduleRefresh('sse-' + eventName);
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
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
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

  setInterval(() => {
    const el = document.getElementById('clock');
    if (el) {
      el.textContent = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    }
  }, 1000);

  function initializeJwt() {
    const saved = safeLocalStorageGet(JWT_STORAGE_KEY);
    const loadedJwt = saved;

    if (jwtInput && loadedJwt) {
      jwtInput.value = loadedJwt;
    }

    console.log(LOG_PREFIX + ' token loaded', { hasToken: Boolean(loadedJwt), source: saved ? 'localStorage' : 'none' });

    if (!loadedJwt) {
      clearAuthState('Sin JWT: pega un token válido para cargar rooms autorizadas.', 'info');
      return;
    }

    applyJwt(loadedJwt, 'initial');
  }

  if (jwtInput) {
    jwtInput.addEventListener('input', () => {
      const value = jwtInput.value.trim();
      if (!value) {
        clearAuthState('Sin JWT: pega un token válido para cargar rooms autorizadas.', 'info');
        return;
      }

      if (activeJwt && value !== activeJwt) {
        stopSse();
        clearVisibleState('JWT cambiado: presiona Enter o sal del campo para cargar snapshot fresco.', 'info');
      }
    });
    jwtInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyJwt(jwtInput.value, 'token-enter');
      }
    });
  } else {
    console.log(LOG_PREFIX + ' token input missing');
  }

  if (applyJwtBtn) {
    applyJwtBtn.addEventListener('click', () => applyJwt(jwtInput ? jwtInput.value : '', 'token-button'));
  }

  if (clearJwtBtn) {
    clearJwtBtn.addEventListener('click', () => {
      clearAuthState('JWT eliminado de este navegador.', 'info');
    });
  }

  initializeJwt();

  if (cardsGrid) {
    cardsGrid.addEventListener('click', async (event) => {
      const btn = event.target && event.target.closest ? event.target.closest('.btn-control') : null;
      if (!btn) return;
      if (btn.disabled) return;

      const controlsSection = btn.closest('.controls-section');
      const roomId = controlsSection && controlsSection.dataset.roomId;
      const emulatorId = controlsSection && controlsSection.dataset.emulatorId;
      const assignmentStatus = controlsSection && controlsSection.dataset.assignmentStatus;
      const device = btn.dataset.device;
      const deviceIndex = Number(btn.dataset.deviceIndex || 1);
      const action = btn.dataset.action;
      const value = btn.dataset.value;
      const resultEl = document.getElementById('result-' + emulatorId);
      const controlKey = [roomId || emulatorId || 'unknown', device, deviceIndex].join(':');

      if (!roomId) {
        const message = assignmentStatus === 'free'
          ? 'Emulador libre: aun no hay room de usuario asignada'
          : 'Sin emulador asignado para este room';
        if (resultEl) {
          resultEl.textContent = message;
          resultEl.className = 'control-result error';
        }
        setStatus(message, 'error');
        return;
      }

      const jwt = getCurrentJwt();
      if (!jwt || jwt.length < 10) {
        const message = 'Token requerido para enviar comandos';
        if (resultEl) {
          resultEl.textContent = message;
          resultEl.className = 'control-result error';
        }
        setStatus(message, 'error');
        return;
      }

      if (pendingControls.has(controlKey)) {
        setStatus('Comando pendiente para esta unidad...', 'info');
        return;
      }

      if (resultEl) {
        resultEl.textContent = 'Enviando...';
        resultEl.className = 'control-result';
      }
      setStatus('Enviando comando...', 'info');
      pendingControls.add(controlKey);
      controlsSection
        .querySelectorAll('.btn-control[data-device="' + device + '"][data-device-index="' + deviceIndex + '"]')
        .forEach((control) => {
          control.disabled = true;
        });

      const body = {
        action,
        deviceIndex,
        value: value !== undefined ? (value === 'true' ? true : value === 'false' ? false : parseInt(value, 10)) : undefined,
        source: 'debug-dashboard'
      };

      const url = '/api/v1/rooms/' + roomId + '/actuators/' + device + '/command';
      console.log(LOG_PREFIX + ' sending', { url, body });

      try {
        const res = await fetch(url, {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + jwt
          },
          body: JSON.stringify(body)
        });

        const data = await res.json().catch(() => ({}));
        console.log(LOG_PREFIX + ' response', { status: res.status, data });

        if (res.ok) {
          const message = 'OK ' + res.status + ': ' + (data.message || action);
          if (resultEl) {
            resultEl.textContent = message;
            resultEl.className = 'control-result success';
          }
          setStatus(message, 'success');
          setTimeout(() => refreshView('command-fallback'), 1800);
          return;
        }

        const message = 'Error ' + res.status + ': ' + (data.error || data.message || res.statusText);
        if (resultEl) {
          resultEl.textContent = message;
          resultEl.className = 'control-result error';
        }
        setStatus(message, 'error');
        setTimeout(() => refreshView('command-error-fallback'), 1800);
      } catch (error) {
        console.error(LOG_PREFIX + ' network error', error);
        const message = 'Red: ' + (error && error.message ? error.message : String(error));
        if (resultEl) {
          resultEl.textContent = message;
          resultEl.className = 'control-result error';
        }
        setStatus(message, 'error');
        setTimeout(() => refreshView('command-network-fallback'), 1800);
      } finally {
        setTimeout(() => {
          pendingControls.delete(controlKey);
          if (!controlsSection.isConnected) return;
          controlsSection
            .querySelectorAll('.btn-control[data-device="' + device + '"][data-device-index="' + deviceIndex + '"]')
            .forEach((control) => {
              control.disabled = false;
            });
        }, 1800);
      }
    });
  }
});
