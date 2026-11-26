'use strict';
// Ponte per l'app del master installata dal browser (iPad e tablet, «Aggiungi alla schermata Home»): fa le veci
// del preload di Electron (window.gdr) con quello che offre una pagina web.
// - dati: localStorage del browser (sull'iPad l'app installata ha il suo spazio, separato da Safari);
// - esporta: condivisione di iOS (Salva in File, AirDrop, Drive…) o, dove non c'è, il download del file;
// - importa: selettore di file;
// - wiki: non disponibile (il sito non permette la lettura da un'altra pagina): resta il link alla pagina.
// Si registra anche il service worker, per usare l'app senza connessione.
(() => {
  const CHIAVE = 'gestore-gdr';
  const testo = (d, rientro) => JSON.stringify(d, null, rientro);
  window.gdr = {
    tablet: true,
    web: true,
    async carica() { const l = localStorage.getItem(CHIAVE); return l ? JSON.parse(l) : null; },
    async salva(d) { localStorage.setItem(CHIAVE, testo(d)); return true; },
    salvaSync(d) { localStorage.setItem(CHIAVE, testo(d)); return true; },
    async esporta(d) {
      const nome = `cronache-del-master-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File([testo(d, 2)], nome, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: nome }); return 'il posto scelto nella condivisione'; } catch (e) { if (e.name === 'AbortError') return ''; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = nome;
      a.click();
      return 'Download';
    },
    importa() {
      return new Promise((ok, no) => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'application/json,.json';
        inp.addEventListener('change', () => {
          const f = inp.files?.[0];
          if (!f) { ok(null); return; }
          f.text().then((t) => ok(JSON.parse(t))).catch(no);
        });
        inp.click();
      });
    },
    async apriCartella() {},
    registra(msg) { console.log('[gdr]', msg); },
    async statoDati() {
      return { tablet: true, web: true, cartella: 'Memoria di questa app sul dispositivo', locale: true, scelta: '', usaLocale: false, solaLettura: false, pc: 'Tablet', lucchetto: null,
        notaBackup: '«Esporta backup» apre la condivisione (Salva in File, Drive, AirDrop…); «Importa backup» apre un file scelto da te. Le descrizioni del wiki qui non si caricano: usa il link alla pagina.' };
    },
  };
  document.documentElement.classList.add('app-tablet');
  const sicuro = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (sicuro && 'serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  // Chiede al browser di non cancellare i dati quando manca spazio
  navigator.storage?.persist?.().catch(() => {});
})();
