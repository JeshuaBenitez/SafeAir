/**
 * Debug Dashboard - Logs Page JavaScript
 *
 * Handles manual refresh, auto-refresh and visible diagnostics.
 */
document.addEventListener('DOMContentLoaded', () => {
  const LOG_PREFIX = '[DEBUG-LOGS]';
  const JWT_STORAGE_KEY = 'safeair.debug.jwt';
  const JWT_COOKIE_NAME = 'safeair_debug_jwt';
  let autoInterval = null;
  let refreshing = false;

  console.log(LOG_PREFIX + ' initializing');

  const refreshBtn = document.getElementById('refreshBtn');
  const autoCheck = document.getElementById('autoRefresh');
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

  async function validateLogsEndpoint(jwt) {
    const url = new URL('/debug/logs', window.location.origin);
    url.searchParams.set('limit', '1');
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

    const jwt = getCurrentJwt();
    console.log(LOG_PREFIX + ' refresh start', { reason: reason || 'manual', hasToken: Boolean(jwt) });
    setStatus('Actualizando logs...', 'info');

    try {
      const data = await validateLogsEndpoint(jwt);
      console.log(LOG_PREFIX + ' refresh success', { count: data.count });
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

  const jwt = getCurrentJwt();
  console.log(LOG_PREFIX + ' token loaded', { hasToken: Boolean(jwt), source: jwt ? 'localStorage-or-cookie' : 'none' });
});
