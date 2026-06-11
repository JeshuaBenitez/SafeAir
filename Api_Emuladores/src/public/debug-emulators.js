/**
 * Debug Dashboard - Emulators Page JavaScript
 *
 * Handles manual refresh, auto-refresh, JWT persistence and control buttons.
 */
document.addEventListener('DOMContentLoaded', () => {
  const LOG_PREFIX = '[DEBUG-EMULATORS]';
  const JWT_STORAGE_KEY = 'safeair.debug.jwt';
  const JWT_COOKIE_NAME = 'safeair_debug_jwt';
  let autoInterval = null;
  let refreshing = false;

  console.log(LOG_PREFIX + ' initializing');

  const refreshBtn = document.getElementById('refreshBtn');
  const autoCheck = document.getElementById('autoRefresh');
  const jwtInput = document.getElementById('jwtToken');
  const statusEl = document.getElementById('debugStatus');

  function setStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.className = 'debug-status' + (type ? ' ' + type : '');
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

  function reloadHtml() {
    const url = new URL(window.location.href);
    url.searchParams.set('t', Date.now().toString());
    window.location.replace(url.toString());
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

    const headers = { 'Accept': 'application/json' };
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

  async function refreshView(reason) {
    if (refreshing) return;
    refreshing = true;

    const jwt = persistJwtFromInput() || getCurrentJwt();
    console.log(LOG_PREFIX + ' refresh start', { reason: reason || 'manual', hasToken: Boolean(jwt) });
    setStatus('Actualizando datos...', 'info');

    try {
      const data = await validateEmulatorsEndpoint(jwt);
      console.log(LOG_PREFIX + ' refresh success', { count: data.count, mode: data.mode });
      setStatus('Refresh OK. Recargando vista...', 'success');
      reloadHtml();
    } catch (error) {
      console.error(LOG_PREFIX + ' refresh error', error);
      setStatus('Refresh error: ' + (error && error.message ? error.message : String(error)), 'error');
      refreshing = false;
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

  window.addEventListener('pagehide', stopAutoRefresh);
  startAutoRefresh();

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
        reloadHtml();
        return;
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

  document.querySelectorAll('.btn-control').forEach(btn => {
    btn.addEventListener('click', async () => {
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

      if (resultEl) {
        resultEl.textContent = 'Enviando...';
        resultEl.className = 'control-result';
      }
      setStatus('Enviando comando...', 'info');

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
          return;
        }

        const message = 'Error ' + res.status + ': ' + (data.error || data.message || res.statusText);
        if (resultEl) {
          resultEl.textContent = message;
          resultEl.className = 'control-result error';
        }
        setStatus(message, 'error');
      } catch (error) {
        console.error(LOG_PREFIX + ' network error', error);
        const message = 'Red: ' + (error && error.message ? error.message : String(error));
        if (resultEl) {
          resultEl.textContent = message;
          resultEl.className = 'control-result error';
        }
        setStatus(message, 'error');
      }
    });
  });
});
