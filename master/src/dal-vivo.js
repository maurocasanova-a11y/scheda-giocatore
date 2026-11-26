'use strict';
// Sessione dal vivo: collegamento tra la scheda del giocatore (telefono, tablet, kit) e il tracker del master,
// attraverso Firebase Realtime Database usato via REST (nessuna libreria esterna):
//  - accesso anonimo (Identity Toolkit), con il rinnovo del gettone ogni ora;
//  - scrittura con PUT/PATCH/POST/DELETE;
//  - ascolto in tempo reale con EventSource (gli eventi "put"/"patch" del database).
// Struttura: sessioni/<CODICE> = { master, aperta, campagna, creata, pg/<uid> = {...}, eventi/<id> = {...} }
(function () {
  const CFG = window.DAL_VIVO_CONFIG || {};
  const CHIAVE_ACCESSO = 'dal-vivo-accesso';
  const configurato = () => !!(CFG.apiKey && CFG.databaseURL);
  const base = () => String(CFG.databaseURL || '').replace(/\/+$/, '');
  // Indirizzi dell'accesso anonimo (sostituibili solo per le prove con un server finto)
  const URL_ACCESSO = CFG.authURL ? `${CFG.authURL}/signUp` : 'https://identitytoolkit.googleapis.com/v1/accounts:signUp';
  const URL_RINNOVO = CFG.authURL ? `${CFG.authURL}/token` : 'https://securetoken.googleapis.com/v1/token';

  // ---------- Accesso anonimo (un utente per dispositivo, conservato nel browser) ----------
  let accesso = null; // { uid, idToken, refreshToken, scade }
  try { accesso = JSON.parse(localStorage.getItem(CHIAVE_ACCESSO) || 'null'); } catch { accesso = null; }
  const ricorda = () => { try { localStorage.setItem(CHIAVE_ACCESSO, JSON.stringify(accesso)); } catch { /* niente */ } };
  async function richiestaJson(url, opzioni) {
    const r = await fetch(url, opzioni);
    let d = null;
    try { d = await r.json(); } catch { d = null; }
    if (!r.ok) {
      const msg = d?.error?.message || d?.error || `errore ${r.status}`;
      const e = new Error(String(msg));
      e.stato = r.status;
      throw e;
    }
    return d;
  }
  let inCorso = null;
  async function gettone() {
    if (!configurato()) throw new Error('la sessione dal vivo non è configurata (manca il database Firebase)');
    if (accesso?.idToken && accesso.scade > Date.now() + 60000) return accesso.idToken;
    if (inCorso) return inCorso;
    inCorso = (async () => {
      try {
        if (accesso?.refreshToken) {
          try {
            const d = await richiestaJson(`${URL_RINNOVO}?key=${encodeURIComponent(CFG.apiKey)}`, {
              method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(accesso.refreshToken)}`,
            });
            accesso = { uid: d.user_id, idToken: d.id_token, refreshToken: d.refresh_token, scade: Date.now() + Number(d.expires_in || 3600) * 1000 };
            ricorda();
            return accesso.idToken;
          } catch (e) { if (e.stato && e.stato < 500) accesso = null; else throw e; }
        }
        const d = await richiestaJson(`${URL_ACCESSO}?key=${encodeURIComponent(CFG.apiKey)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
        });
        accesso = { uid: d.localId, idToken: d.idToken, refreshToken: d.refreshToken, scade: Date.now() + Number(d.expiresIn || 3600) * 1000 };
        ricorda();
        return accesso.idToken;
      } finally { inCorso = null; }
    })();
    return inCorso;
  }
  async function mioUid() { await gettone(); return accesso.uid; }

  // ---------- Database ----------
  const percorso = (p) => String(p).split('/').filter(Boolean).map(encodeURIComponent).join('/');
  async function db(metodo, p, valore) {
    const t = await gettone();
    return richiestaJson(`${base()}/${percorso(p)}.json?auth=${encodeURIComponent(t)}`, {
      method: metodo,
      headers: valore === undefined ? {} : { 'Content-Type': 'application/json' },
      body: valore === undefined ? undefined : JSON.stringify(valore),
    });
  }
  const leggi = (p) => db('GET', p);
  const scrivi = (p, v) => db('PUT', p, v);
  const aggiorna = (p, v) => db('PATCH', p, v);
  const aggiungi = (p, v) => db('POST', p, v);
  const cancella = (p) => db('DELETE', p);
  const ORA = { '.sv': 'timestamp' };

  // Ascolto in tempo reale: tiene una copia dell'albero sotto "p" e chiama alCambio(copia, {path, data}) a ogni modifica.
  // Si ricollega da solo (nuovo gettone ogni ora, rete che cade). Restituisce una funzione che smette di ascoltare.
  function ascolta(p, alCambio, alErrore = () => {}) {
    let fonte = null, fermo = false, attesa = null, copia = null;
    const applica = (path, data, unisci) => {
      const parti = String(path).split('/').filter(Boolean);
      if (!parti.length) { copia = unisci && copia && data && typeof copia === 'object' ? Object.assign(copia, data) : data; return; }
      if (!copia || typeof copia !== 'object') copia = {};
      let o = copia;
      for (const k of parti.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
      const k = parti[parti.length - 1];
      if (unisci && data && typeof data === 'object') { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; for (const [kk, vv] of Object.entries(data)) { if (vv === null) delete o[k][kk]; else o[k][kk] = vv; } }
      else if (data === null) delete o[k];
      else o[k] = data;
    };
    const riprova = (ms) => { if (fermo) return; clearTimeout(attesa); attesa = setTimeout(apri, ms); };
    async function apri() {
      if (fermo) return;
      try { fonte?.close(); } catch { /* niente */ }
      let t;
      try { t = await gettone(); } catch (e) { alErrore(e); riprova(10000); return; }
      if (fermo) return;
      fonte = new EventSource(`${base()}/${percorso(p)}.json?auth=${encodeURIComponent(t)}`);
      const gestisci = (unisci) => (ev) => {
        let d;
        try { d = JSON.parse(ev.data); } catch { return; }
        applica(d.path, d.data, unisci);
        try { alCambio(copia, d); } catch (e) { console.error(e); }
      };
      fonte.addEventListener('put', gestisci(false));
      fonte.addEventListener('patch', gestisci(true));
      fonte.addEventListener('auth_revoked', () => { accesso && (accesso.scade = 0); riprova(500); });
      fonte.addEventListener('cancel', () => { try { fonte.close(); } catch { /* niente */ } alErrore(new Error('accesso negato dal database')); });
      fonte.onerror = () => { if (fonte.readyState === 2) riprova(5000); };
    }
    apri();
    // Il gettone scade dopo un'ora: lo si rinnova prima e si riapre l'ascolto
    const rinnovo = setInterval(() => { if (accesso && accesso.scade < Date.now() + 5 * 60000) { accesso.scade = 0; apri(); } }, 60000);
    return () => { fermo = true; clearTimeout(attesa); clearInterval(rinnovo); try { fonte?.close(); } catch { /* niente */ } };
  }

  // Codice della sessione: parola + 4 cifre (facile da dettare al tavolo)
  const PAROLE = ['DRAGO', 'GRIFO', 'ELFO', 'NANO', 'ORCO', 'TROLL', 'FATA', 'LUPO', 'MAGO', 'LICH', 'GOLEM', 'IDRA', 'SFINGE', 'FENICE', 'BASILISCO', 'CHIMERA', 'GOBLIN', 'COBOLDO', 'VIVERNA', 'KRAKEN'];
  function codiceNuovo() {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return `${PAROLE[a[0] % PAROLE.length]}-${String(1000 + (a[1] % 9000))}`;
  }
  const normCodice = (s) => String(s || '').toUpperCase().replace(/\s+/g, '').replace(/^([A-Z]+)(\d{4})$/, '$1-$2');

  window.DalVivo = { configurato, mioUid, leggi, scrivi, aggiorna, aggiungi, cancella, ascolta, codiceNuovo, normCodice, ORA };
})();
