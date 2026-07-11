(() => {
  'use strict';

  // ---------- Service worker registration ----------

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        // offline-first app shell still works without a controlling SW on first load
      });
    });
  }

  // ---------- Install prompt ----------

  const banner = document.getElementById('install-banner');
  const btnInstall = document.getElementById('btn-install');
  const btnDismiss = document.getElementById('btn-install-dismiss');
  let deferredPrompt = null;

  const DISMISS_KEY = 'essensroulette_install_dismissed_v1';

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone() && !localStorage.getItem(DISMISS_KEY)) {
      banner.classList.add('is-visible');
    }
  });

  btnInstall && btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    banner.classList.remove('is-visible');
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });

  btnDismiss && btnDismiss.addEventListener('click', () => {
    banner.classList.remove('is-visible');
    localStorage.setItem(DISMISS_KEY, '1');
  });

  window.addEventListener('appinstalled', () => {
    banner.classList.remove('is-visible');
    deferredPrompt = null;
  });

  // ---------- Offline indicator ----------

  const offlinePill = document.getElementById('offline-pill');
  let offlineHideTimer = null;

  function updateOnlineState() {
    if (!navigator.onLine) {
      clearTimeout(offlineHideTimer);
      offlinePill.classList.add('is-visible');
    } else {
      offlinePill.classList.add('is-visible');
      offlinePill.textContent = '✅ Wieder online';
      offlineHideTimer = setTimeout(() => {
        offlinePill.classList.remove('is-visible');
        setTimeout(() => { offlinePill.textContent = '📡 Offline – Alle Daten sind lokal gespeichert'; }, 300);
      }, 2000);
    }
  }

  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);
  if (!navigator.onLine) updateOnlineState();
})();
