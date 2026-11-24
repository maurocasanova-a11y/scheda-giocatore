'use strict';
// Kit per tablet e telefoni: installazione come app e funzionamento senza connessione
window.KIT_WEB = true;
(function () {
  const sicuro = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (sicuro && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
  // Chiede al browser di non cancellare i dati della scheda quando manca spazio
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
