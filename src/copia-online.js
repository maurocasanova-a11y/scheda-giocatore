'use strict';
// Copia di sicurezza online: i dati vengono compressi (gzip) e cifrati (AES-GCM) con il codice di ripristino del master
// prima di andare sul database Firebase. Senza il codice la copia non si legge; anche il posto dove sta nel database
// dipende dal codice (impronta SHA-256), quindi senza codice non si trova. Funzioni pure: le usa app.js.
(function () {
  const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford: senza I, L, O, U (si confondono)
  const PEZZO = 1000000; // caratteri per pezzo nel database (le stringhe di Firebase hanno un limite)
  const ITERAZIONI = 200000;
  const cr = () => globalThis.crypto;
  const enc = new TextEncoder();

  // Codice nuovo: 24 caratteri (120 bit) in 6 gruppi da 4, es. «K7QM-2XRA-9TBC-…»
  function nuovoCodice() {
    const b = cr().getRandomValues(new Uint8Array(24));
    const c = [...b].map((x) => ALFABETO[x % 32]).join('');
    return c.match(/.{4}/g).join('-');
  }
  // Scritto a mano: maiuscole, senza spazi; O→0, I e L→1 come nella codifica di Crockford
  function normCodice(s) {
    const c = String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    return c.length === 24 && [...c].every((x) => ALFABETO.includes(x)) ? c.match(/.{4}/g).join('-') : '';
  }
  const esadecimale = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
  const base64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const daBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  // Posto nel database: impronta del codice (40 caratteri esadecimali)
  async function idDa(codice) {
    return esadecimale(await cr().subtle.digest('SHA-256', enc.encode('cronache-del-master:' + normCodice(codice)))).slice(0, 40);
  }
  async function chiave(codice, sale) {
    const base = await cr().subtle.importKey('raw', enc.encode(normCodice(codice)), 'PBKDF2', false, ['deriveKey']);
    return cr().subtle.deriveKey({ name: 'PBKDF2', salt: sale, iterations: ITERAZIONI, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function trasforma(u8, Flusso) {
    const s = new Blob([u8]).stream().pipeThrough(new Flusso('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  // Oggetto → pacchetto da salvare { v, sale, iv, pezzi, dimensione }
  async function cifra(oggetto, codice) {
    if (!normCodice(codice)) throw new Error('codice di ripristino non valido');
    const testo = enc.encode(JSON.stringify(oggetto));
    const compresso = await trasforma(testo, CompressionStream);
    const sale = cr().getRandomValues(new Uint8Array(16));
    const iv = cr().getRandomValues(new Uint8Array(12));
    const cifrato = new Uint8Array(await cr().subtle.encrypt({ name: 'AES-GCM', iv }, await chiave(codice, sale), compresso));
    const tutto = base64(cifrato);
    const pezzi = [];
    for (let i = 0; i < tutto.length; i += PEZZO) pezzi.push(tutto.slice(i, i + PEZZO));
    return { v: 1, sale: base64(sale), iv: base64(iv), pezzi, dimensione: testo.length };
  }
  // Pacchetto → oggetto (errore se il codice è sbagliato o la copia è rovinata)
  async function decifra(pacchetto, codice) {
    if (!pacchetto?.pezzi) throw new Error('copia vuota o non trovata');
    let chiaro;
    try {
      const k = await chiave(codice, daBase64(pacchetto.sale));
      chiaro = await cr().subtle.decrypt({ name: 'AES-GCM', iv: daBase64(pacchetto.iv) }, k, daBase64([].concat(pacchetto.pezzi).join('')));
    } catch { throw new Error('codice sbagliato o copia rovinata'); }
    return JSON.parse(new TextDecoder().decode(await trasforma(new Uint8Array(chiaro), DecompressionStream)));
  }
  window.CopiaOnline = { nuovoCodice, normCodice, idDa, cifra, decifra };
})();
