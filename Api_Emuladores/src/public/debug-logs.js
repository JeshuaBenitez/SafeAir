/**
 * Debug Dashboard - Logs Page JavaScript
 * 
 * Handles:
 * - Manual Refresh
 * - Auto-refresh (every 5s)
 * - Clock update
 */

// Wait for DOM ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DEBUG-LOGS] initializing...');
  
  // ── Manual Refresh ─────────────────────────────────────────────────────
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      console.log('manual refresh clicked');
      window.location.href = window.location.pathname + '?t=' + Date.now();
    });
  }

  // ── Auto-refresh ──────────────────────────────────────────────────────
  const autoCheck = document.getElementById('autoRefresh');
  let autoInterval;
  
  function startAutoRefresh() {
    if (autoCheck && autoCheck.checked) {
      console.log('[DEBUG-LOGS] starting auto-refresh (5s)');
      autoInterval = setInterval(() => {
        console.log('auto refresh tick');
        window.location.href = window.location.pathname + '?t=' + Date.now();
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
  
  console.log('[DEBUG-LOGS] initialized successfully');
});
