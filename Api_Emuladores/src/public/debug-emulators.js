/**
 * Debug Dashboard - Emulators Page JavaScript
 * 
 * Handles:
 * - Manual Refresh
 * - Auto-refresh (every 5s)
 * - Clock update
 * - JWT input and localStorage
 * - Control buttons (ON/OFF, temperature)
 */

// Wait for DOM ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DEBUG-EMULATORS] initializing...');

  function setDebugJwtCookie(jwt) {
    document.cookie = 'safeair_debug_jwt=' + encodeURIComponent(jwt) + '; path=/debug; SameSite=Lax';
  }

  function clearDebugJwtCookie() {
    document.cookie = 'safeair_debug_jwt=; path=/debug; Max-Age=0; SameSite=Lax';
  }

  function hasDebugJwtCookie() {
    return document.cookie.split(';').some(cookie => cookie.trim().startsWith('safeair_debug_jwt='));
  }

  function getDebugJwtCookie() {
    const match = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith('safeair_debug_jwt='));

    return match ? decodeURIComponent(match.slice('safeair_debug_jwt='.length)) : '';
  }
  
  // ── Manual Refresh ─────────────────────────────────────────────────────
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      console.log('manual refresh clicked');
      window.location.reload();
    });
  }

  // ── Auto-refresh ──────────────────────────────────────────────────────
  const autoCheck = document.getElementById('autoRefresh');
  let autoInterval;
  
  function startAutoRefresh() {
    if (autoCheck && autoCheck.checked) {
      console.log('[DEBUG-EMULATORS] starting auto-refresh (5s)');
      autoInterval = setInterval(() => {
        console.log('auto refresh tick');
        window.location.reload();
      }, 5000);
    }
  }
  
  if (autoCheck) {
    autoCheck.addEventListener('change', () => {
      clearInterval(autoInterval);
      if (autoCheck.checked) startAutoRefresh();
    });
  }
  startAutoRefresh();

  // ── Clock Update ──────────────────────────────────────────────────────
  setInterval(() => {
    const el = document.getElementById('clock');
    if (el) {
      el.textContent = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    }
  }, 1000);

  // ── JWT Input ─────────────────────────────────────────────────────────
  const jwtInput = document.getElementById('jwtToken');
  if (jwtInput) {
    const saved = localStorage.getItem('safeair.debug.jwt');
    if (saved) {
      jwtInput.value = saved;
      if (!hasDebugJwtCookie() || getDebugJwtCookie() !== saved) {
        setDebugJwtCookie(saved);
        window.location.reload();
        return;
      }
    }
    jwtInput.addEventListener('change', () => {
      const jwt = jwtInput.value.trim();
      if (!jwt) {
        localStorage.removeItem('safeair.debug.jwt');
        clearDebugJwtCookie();
      } else {
        localStorage.setItem('safeair.debug.jwt', jwt);
        setDebugJwtCookie(jwt);
      }
      window.location.reload();
    });
  }

  // ── Control Buttons ───────────────────────────────────────────────────
  document.querySelectorAll('.btn-control').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) {
        return;
      }

      const controlsSection = btn.closest('.controls-section');
      const roomId = controlsSection?.dataset.roomId;
      const emulatorId = controlsSection?.dataset.emulatorId;
      const device = btn.dataset.device;
      const action = btn.dataset.action;
      const value = btn.dataset.value;
      const resultEl = document.getElementById('result-' + emulatorId);

      console.log('control clicked:', { roomId, emulatorId, device, action, value });

      if (!roomId) {
        if (resultEl) {
          resultEl.textContent = '⚠️ Sin emulador asignado para este room';
          resultEl.className = 'control-result error';
        }
        return;
      }

      const jwt = localStorage.getItem('safeair.debug.jwt') || jwtInput?.value;
      if (!jwt || jwt.length < 10) {
        if (resultEl) {
          resultEl.textContent = '⚠️ Token requerido para enviar comandos';
          resultEl.className = 'control-result error';
        }
        return;
      }

      if (resultEl) {
        resultEl.textContent = '⏳ Enviando...';
        resultEl.className = 'control-result';
      }

      // Body must match: {"action":"turn_on","value":true,"source":"debug-dashboard"}
      const body = {
        action,
        value: value !== undefined ? (value === 'true' ? true : value === 'false' ? false : parseInt(value)) : undefined,
        source: 'debug-dashboard'
      };

      const url = '/api/v1/rooms/' + roomId + '/actuators/' + device + '/command';
      console.log('[DEBUG-EMULATORS] sending:', url, JSON.stringify(body));

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + jwt
          },
          body: JSON.stringify(body)
        });

        const data = await res.json().catch(() => ({}));
        console.log('[DEBUG-EMULATORS] response:', res.status, data);

        if (res.ok) {
          if (resultEl) {
            resultEl.textContent = '✅ OK ' + res.status + ': ' + (data.message || action);
            resultEl.className = 'control-result success';
          }
        } else {
          if (resultEl) {
            resultEl.textContent = '❌ Error ' + res.status + ': ' + (data.message || res.statusText);
            resultEl.className = 'control-result error';
          }
        }
      } catch (e) {
        console.error('[DEBUG-EMULATORS] network error:', e);
        if (resultEl) {
          resultEl.textContent = '❌ Red: ' + e.message;
          resultEl.className = 'control-result error';
        }
      }
    });
  });
  
  console.log('[DEBUG-EMULATORS] initialized successfully');
});
