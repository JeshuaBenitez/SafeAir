/**
 * Debug Dashboard - Emulators Page JavaScript
 *
 * Handles SSE live updates, manual refresh, JWT persistence and control buttons.
 */
document.addEventListener('DOMContentLoaded', () => {
  const LOG_PREFIX = '[DEBUG-EMULATORS]';
  const JWT_STORAGE_KEY = 'safeair.debug.jwt';
  const JWT_COOKIE_NAME = 'safeair_debug_jwt';
  let autoInterval = null;
  let refreshing = false;
  let eventSource = null;
  let reconnectTimer = null;
  let refreshTimer = null;
  let lastEventAt = 0;
  const pendingControls = new Set();
  const STALE_AFTER_MS = 30000;

  console.log(LOG_PREFIX + ' initializing');

  const refreshBtn = document.getElementById('refreshBtn');
  const autoCheck = document.getElementById('autoRefresh');
  const jwtInput = document.getElementById('jwtToken');
  const statusEl = document.getElementById('debugStatus');
  const cardsGrid = document.getElementById('emulatorCardsGrid');

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

  function writeJwtCookie(jwt) {
    document.cookie = JWT_COOKIE_NAME + '=' + encodeURIComponent(jwt) + '; path=/debug; SameSite=Lax';
  }

  function clearJwtCookie() {
    document.cookie = JWT_COOKIE_NAME + '=; path=/debug; Max-Age=0; SameSite=Lax';
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
    return (jwtInput && jwtInput.value.trim()) || safeLocalStorageGet(JWT_STORAGE_KEY) || readCookie(JWT_COOKIE_NAME);
  }

  function persistJwtFromInput() {
    const jwt = jwtInput ? jwtInput.value.trim() : '';
    if (!jwt) {
      safeLocalStorageRemove(JWT_STORAGE_KEY);
      clearJwtCookie();
      return '';
    }

    safeLocalStorageSet(JWT_STORAGE_KEY, jwt);
    writeJwtCookie(jwt);
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
    return value === null || value === undefined ? '—' : Number(Number(value).toFixed(decimals)).toString();
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

    const miniBadge = isAssigned ? minisplitUnits.map(unit => deviceDisplay(unit.isOn, unit.targetTemperature, 'Minisplit Unidad ' + unit.deviceIndex, true)).join(' ') : '<span class="device-badge unknown">Minisplit (' + miniCount + '): N/A</span>';
    const purBadge = isAssigned ? purifierUnits.map(unit => deviceDisplay(unit.isOn, null, 'Purificador Unidad ' + unit.deviceIndex, false)).join(' ') : '<span class="device-badge unknown">Purificador (' + purCount + '): N/A</span>';
    const extBadge = isAssigned ? extractorUnits.map(unit => deviceDisplay(unit.isOn, null, 'Extractor Unidad ' + unit.deviceIndex, false)).join(' ') : '<span class="device-badge unknown">Extractor (' + extCount + '): N/A</span>';
    const controlHint = controlsDisabled ? '<div class="control-hint">Sin emulador asignado: el control manual queda deshabilitado para evitar comandos a rooms inválidos.</div>' : '';
    const areaM2 = emu.roomArea !== null && emu.roomArea !== undefined ? fmt(emu.roomArea, 2) + ' m²' : 'No configurado';
    const windowCount = emu.windowCount !== undefined && emu.windowCount !== null ? String(emu.windowCount) : 'No configurado';

    return '<div class="emulator-card">' +
      '<div class="card-header"><div class="card-title"><div class="card-title-main"><strong>' + escapeHtml(primaryTitle) + '</strong><span>' + escapeHtml(secondaryTitle) + '</span></div><span class="status-badge ' + connClass + '">' + escapeHtml(connLabel) + '</span></div>' +
      '<div class="card-meta">Último reporte: ' + escapeHtml(formatLocalTime(emu.lastSeen)) + '</div>' +
      '<div class="card-meta">Habitación: <code>' + escapeHtml(roomInfo) + '</code></div>' +
      '<div class="card-meta">Área ' + escapeHtml(areaM2) + ' · ' + escapeHtml(windowCount) + ' ventanas · Minisplits ' + miniCount + ' · Purificadores ' + purCount + ' · Extractores ' + extCount + '</div></div>' +
      '<div class="metrics-grid">' +
      '<div class="metric-box"><div class="metric-value">' + (isAssigned && emu.metrics ? fmt(emu.metrics.temperature, 2) + '°C' : '—') + '</div><div class="metric-label">' + (isAssigned && emu.metrics ? 'Temperatura' : 'Sin métricas disponibles') + '</div></div>' +
      '<div class="metric-box"><div class="metric-value">' + (isAssigned && emu.metrics ? fmt(emu.metrics.humidity, 2) + '%' : '—') + '</div><div class="metric-label">Humedad</div></div>' +
      '<div class="metric-box"><div class="metric-value">' + (isAssigned && emu.metrics ? fmt(emu.metrics.co2, 2) : '—') + '</div><div class="metric-label">CO₂ (ppm)</div></div>' +
      '<div class="metric-box"><div class="metric-value">' + (isAssigned && emu.metrics ? fmt(emu.metrics.pm25, 2) : '—') + '</div><div class="metric-label">PM2.5 (μg/m³)</div></div>' +
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

  async function refreshView(reason) {
    if (refreshing) return;
    refreshing = true;

    const jwt = persistJwtFromInput() || getCurrentJwt();
    console.log(LOG_PREFIX + ' refresh start', { reason: reason || 'manual', hasToken: Boolean(jwt) });
    setStatus('Actualizando datos...', 'info');

    try {
      const data = await validateEmulatorsEndpoint(jwt);
      console.log(LOG_PREFIX + ' refresh success', { count: data.count, mode: data.mode });
      renderEmulators(data);
      setStatus('Datos actualizados. Tiempo real activo.', 'success');
      refreshing = false;
    } catch (error) {
      console.error(LOG_PREFIX + ' refresh error', error);
      setStatus('Refresh error: ' + (error && error.message ? error.message : String(error)), 'error');
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
    eventSource = new EventSource('/debug/events/emulators');

    eventSource.addEventListener('open', () => {
      setStatus('Conexion SSE abierta.', 'info');
    });

    eventSource.addEventListener('connected', () => {
      markEvent('Conectado a tiempo real.');
    });

    eventSource.addEventListener('snapshot', (event) => {
      parseEvent(event);
      markEvent('Snapshot de emuladores recibido.');
      scheduleRefresh('sse-snapshot');
    });

    eventSource.addEventListener('emulator', (event) => {
      parseEvent(event);
      markEvent('Actualizacion de emulador recibida.');
      scheduleRefresh('sse-emulator');
    });

    eventSource.addEventListener('log', () => {
      markEvent('Evento relacionado recibido.');
      scheduleRefresh('sse-log');
    });

    eventSource.addEventListener('message', () => {
      markEvent('Mensaje SSE recibido.');
      scheduleRefresh('sse-message');
    });

    eventSource.addEventListener('telemetry', () => {
      markEvent('Telemetria recibida.');
      scheduleRefresh('sse-telemetry');
    });

    eventSource.addEventListener('actuator', () => {
      markEvent('Actuador actualizado.');
      scheduleRefresh('sse-actuator');
    });

    eventSource.addEventListener('update', () => {
      scheduleRefresh('sse-update');
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
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
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

  if (jwtInput) {
    const saved = safeLocalStorageGet(JWT_STORAGE_KEY);
    const cookieJwt = readCookie(JWT_COOKIE_NAME);
    const loadedJwt = saved || cookieJwt;

    if (loadedJwt) {
      jwtInput.value = loadedJwt;
      if (cookieJwt !== loadedJwt) {
        writeJwtCookie(loadedJwt);
        console.log(LOG_PREFIX + ' token loaded', { source: saved ? 'localStorage' : 'cookie', syncedCookie: true });
        refreshView('token-cookie-sync');
      }
    }

    console.log(LOG_PREFIX + ' token loaded', { hasToken: Boolean(loadedJwt), source: saved ? 'localStorage' : (cookieJwt ? 'cookie' : 'none') });

    jwtInput.addEventListener('input', persistJwtFromInput);
    jwtInput.addEventListener('paste', () => {
      setTimeout(() => {
        persistJwtFromInput();
        refreshView('token-paste');
      }, 0);
    });
    jwtInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        refreshView('token-enter');
      }
    });
    jwtInput.addEventListener('change', () => {
      refreshView('token-change');
    });
  } else {
    console.log(LOG_PREFIX + ' token loaded', { hasToken: Boolean(getCurrentJwt()), source: getCurrentJwt() ? 'storage-or-cookie' : 'none' });
  }

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
