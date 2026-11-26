'use strict';
(() => {
  // ================= Archiviazione =================
  // In Electron usa il ponte del preload; aperto in un normale browser
  // (utile per sviluppo) ripiega su localStorage.
  const archivio = window.gdr || {
    carica: async () => { try { return JSON.parse(localStorage.getItem('gestore-gdr') || 'null'); } catch { return null; } },
    salva: async (d) => { localStorage.setItem('gestore-gdr', JSON.stringify(d)); return true; },
    salvaSync: (d) => { localStorage.setItem('gestore-gdr', JSON.stringify(d)); return true; },
    esporta: async (d) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = 'cronache-del-master-backup.json';
      a.click();
      return 'cartella Download';
    },
    importa: async () => { throw new Error("Importazione disponibile solo nell'app"); },
    apriCartella: async () => {},
  };

  // ================= Utilità =================
  const $ = (sel, radice = document) => radice.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const segno = (n) => (n >= 0 ? '+' : '') + n;
  const fmtMod = (n) => (!n ? '' : n > 0 ? '+' + n : String(n));
  const oggiISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const fmtData = (iso) => {
    if (!iso) return 'senza data';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  // Testo semplice per anteprime ed estratti: niente @[…] né asterischi di formattazione
  const ripulisci = (s) => String(s ?? '').replace(/@\[([^\]\n]+)\]/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1');
  const titoloSessione = (s) => s.titolo || `Sessione ${s.numero}`;
  const STATI = ['Attiva', 'In pausa', 'Conclusa'];
  const MODALITA = {
    d20: 'd20 — punteggi (modificatore = (valore − 10) / 2)',
    d20mod: 'd20 — si annotano direttamente i modificatori',
    percentuale: 'd100 — tiro percentuale sotto il valore',
    pool: 'Riserva di d10 — successi con 6 o più',
    nessuna: 'Nessun tiro dalla scheda',
  };

  // ================= Stato =================
  let S = null;
  let timerSalva = null;
  let ultimoHash = null;
  let attributoRiserva = null; // attributo scelto per i tiri di abilità in modalità riserva

  const statoIniziale = () => ({
    versione: 1,
    regolamenti: JSON.parse(JSON.stringify(window.REGOLAMENTI_PREDEFINITI)),
    campagne: [], personaggi: [], sessioni: [], tiri: [], astronavi: [],
  });
  const normalizza = (d) => {
    for (const k of ['regolamenti', 'campagne', 'personaggi', 'sessioni', 'tiri', 'astronavi']) if (!Array.isArray(d[k])) d[k] = [];
    d.versione = d.versione || 1;
    // Il Pathfinder 1 precaricato usa la scheda con calcoli automatici
    for (const r of d.regolamenti) if (r.id === 'pf1' && !r.scheda) r.scheda = 'pf1';
    for (const r of d.regolamenti) if (r.scheda === 'pf1') pf1.migraRegolamento(r);
    // Lo Starfinder precaricato usa la scheda con calcoli automatici (src/sf.js)
    for (const r of d.regolamenti) if (r.id === 'starfinder' && !r.scheda) r.scheda = 'sf';
    for (const r of d.regolamenti) if (r.scheda === 'sf') sf.migraRegolamento(r);
    // D&D 5e precaricato: scheda con calcoli automatici (src/dnd.js)
    for (const r of d.regolamenti) if (r.id === 'dnd5e' && !r.scheda) r.scheda = 'dnd';
    for (const r of d.regolamenti) if (r.scheda === 'dnd') dnd.migraRegolamento(r);
    // Pathfinder 2 precaricato: scheda con calcoli automatici (src/pf2.js)
    for (const r of d.regolamenti) if (r.id === 'pf2' && !r.scheda) r.scheda = 'pf2';
    for (const r of d.regolamenti) if (r.scheda === 'pf2') pf2.migraRegolamento(r);
    // Vampiri e Cthulhu non sono più tra i regolamenti precaricati: si tolgono se nessuna campagna li usa
    d.regolamenti = d.regolamenti.filter((r) => !['vampiri-v5', 'coc7'].includes(r.id) || d.campagne.some((c) => c.regolamentoId === r.id));
    return d;
  };

  const registra = (msg) => { try { window.gdr?.registra(msg); } catch { /* niente */ } };
  window.addEventListener('error', (e) => registra(`errore: ${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => registra(`promessa rifiutata: ${e.reason?.stack || e.reason}`));

  // Finestra "schermo" del tracker: sola lettura, non salva mai (i dati arrivano dalla finestra principale)
  const SCHERMO = new URLSearchParams(location.search).get('schermo') === '1';
  const TITOLO_PAGINA = document.title;
  const GIOCATORE = !!window.MODALITA_GIOCATORE && !window.gdr;
  function salva() {
    if (SCHERMO) return;
    if (GIOCATORE) dvGProgramma(); // scheda collegata dal vivo: la modifica parte anche verso il master
    else dvMProgramma(); // sessione dal vivo aperta: le modifiche ai PG collegati partono verso i giocatori
    clearTimeout(timerSalva);
    statoSalvataggio('Salvataggio…');
    timerSalva = setTimeout(async () => {
      timerSalva = null;
      try {
        const ok = await archivio.salva(S);
        if (ok === false) { statoSalvataggio('🔒 Non salvato (sola lettura)'); return; }
        statoSalvataggio(`Salvato alle ${new Date().toLocaleTimeString('it-IT')}`);
        avvisoGrave(null);
        programmaCopiaOnline();
      } catch (e) {
        console.error(e);
        registra(`salvataggio fallito: ${e.stack || e}`);
        statoSalvataggio('⚠ Errore di salvataggio');
        avvisoGrave(`I dati NON sono stati salvati su disco (${esc(e.message || e)}). Non chiudere l'app: usa "Esporta backup" per metterli al sicuro.`);
      }
    }, 400);
  }
  let statoDati = null; // cartella dati, sola lettura, PC (solo nell'app)
  // Brani: i file della cartella dati si salvano per nome; i vecchi indirizzi file:// della cartella musica si convertono
  function urlMusica(b) {
    if (!b.file && /^file:/i.test(b.url || '') && /\/musica\//i.test(b.url)) b.file = decodeURIComponent(b.url.split('/').pop());
    return b.file && statoDati?.musicaUrl ? statoDati.musicaUrl + encodeURIComponent(b.file) : b.url;
  }
  function statoSalvataggio(t) { const el = $('#stato-salvataggio'); if (el) el.textContent = t; }
  function avvisoGrave(html) {
    let el = $('#avviso-grave');
    if (!html) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'avviso-grave'; document.body.appendChild(el); }
    el.innerHTML = `⚠ ${html}`;
  }
  // Violazioni della politica di sicurezza (es. un gestore di eventi scritto nell'HTML): nel registro con
  // l'elemento e il punto d'origine, per poterle correggere. Una sola riga per tipo, per non riempire il registro.
  const violazioniViste = new Set();
  document.addEventListener('securitypolicyviolation', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    const descr = el ? `<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}>` : String(e.target?.nodeName || '');
    const attr = el ? [...el.attributes].filter((a) => /^on/i.test(a.name)).map((a) => `${a.name}="${a.value.slice(0, 80)}"`).join(' ') : '';
    const chiave = `${e.violatedDirective}|${descr}|${attr}`;
    if (violazioniViste.has(chiave)) return;
    violazioniViste.add(chiave);
    const riga = `CSP bloccato: ${e.violatedDirective} · elemento ${descr} ${attr} · origine ${e.sourceFile || '?'}:${e.lineNumber || '?'} · campione «${(e.sample || '').slice(0, 80)}» · pagina ${location.hash}`;
    registra(riga);
  });
  window.addEventListener('beforeunload', () => {
    if (timerSalva && !SCHERMO) { clearTimeout(timerSalva); archivio.salvaSync(S); }
  });

  // Accesso ai dati
  const regolamento = (id) => S.regolamenti.find((r) => r.id === id);
  const campagna = (id) => S.campagne.find((c) => c.id === id);
  const personaggio = (id) => S.personaggi.find((p) => p.id === id);
  const sessione = (id) => S.sessioni.find((s) => s.id === id);
  const personaggiDi = (cid) => S.personaggi.filter((p) => p.campagnaId === cid);
  const sessioniDi = (cid) => S.sessioni.filter((s) => s.campagnaId === cid)
    .sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0) || String(a.data).localeCompare(String(b.data)));
  const REG_VUOTO = { nome: '—', modalita: 'nessuna', campi: [], caratteristiche: [], abilita: [], risorse: [] };
  const regDi = (p) => regolamento(campagna(p.campagnaId)?.regolamentoId) || REG_VUOTO;
  const valore = (p, sez, chiave, pred) => { const v = p[sez]?.[chiave]; return v === undefined ? (pred ?? '') : v; };
  const numero = (v) => (v === '' || v == null || isNaN(Number(v)) ? 0 : Number(v));

  // ================= Citazioni di PNG nei diari =================
  // Un personaggio è riconosciuto nel testo in due modi:
  //  - citazione esplicita @[Nome] (inserita con l'autocompletamento)
  //  - il suo nome o un alias compare nel testo come parola intera
  const nomiDi = (p) => [p.nome, ...String(p.alias || '').split(',')].map((x) => x.trim()).filter((x) => x.length >= 2);
  const cacheMatcher = new Map();
  function matcher(pers) {
    const chiave = pers.map((p) => `${p.id}:${p.nome}:${p.alias || ''}`).join('|');
    const c = cacheMatcher.get(chiave);
    if (c) return c;
    const mappa = new Map();
    for (const p of pers) for (const n of nomiDi(p)) { const k = n.toLocaleLowerCase('it'); if (!mappa.has(k)) mappa.set(k, p.id); }
    const nomi = [...mappa.keys()].sort((a, b) => b.length - a.length).map(escRe);
    const pattern = '@\\[([^\\]\\n]+)\\]' + (nomi.length ? `|(?<![\\p{L}\\p{N}_])(${nomi.join('|')})(?![\\p{L}\\p{N}_])` : '');
    const m = { re: new RegExp(pattern, 'giu'), mappa };
    if (cacheMatcher.size > 50) cacheMatcher.clear();
    cacheMatcher.set(chiave, m);
    return m;
  }
  function tokenizza(testo, pers) {
    testo = testo || '';
    const { re, mappa } = matcher(pers);
    const out = [];
    let ultimo = 0;
    for (const m of testo.matchAll(re)) {
      const id = mappa.get((m[1] !== undefined ? m[1].trim() : m[2]).toLocaleLowerCase('it'));
      if (!id && m[1] === undefined) continue; // corrispondenza senza personaggio: resta testo
      if (m.index > ultimo) out.push({ t: 'testo', v: testo.slice(ultimo, m.index) });
      const v = m[1] !== undefined ? m[1].trim() : m[2];
      out.push(id ? { t: 'pg', id, v, i: m.index, l: m[0].length } : { t: 'ignoto', v, i: m.index, l: m[0].length });
      ultimo = m.index + m[0].length;
    }
    if (ultimo < testo.length) out.push({ t: 'testo', v: testo.slice(ultimo) });
    return out;
  }
  function contaCitazioni(testo, pers) {
    const conta = new Map();
    for (const t of tokenizza(testo, pers)) if (t.t === 'pg') conta.set(t.id, (conta.get(t.id) || 0) + 1);
    return conta;
  }
  function citazioniIgnote(testo, pers) {
    return [...new Set(tokenizza(testo, pers).filter((t) => t.t === 'ignoto').map((t) => t.v))];
  }
  function indiceApparizioni(cid) {
    const pers = personaggiDi(cid);
    const idx = new Map();
    for (const s of sessioniDi(cid)) {
      for (const [id, n] of contaCitazioni(s.testo, pers)) {
        if (!idx.has(id)) idx.set(id, []);
        idx.get(id).push({ s, n });
      }
    }
    return idx;
  }
  function apparizioni(p) {
    const pers = personaggiDi(p.campagnaId);
    const out = [];
    for (const s of sessioniDi(p.campagnaId)) {
      const tok = tokenizza(s.testo, pers).filter((t) => t.t === 'pg' && t.id === p.id);
      if (tok.length) out.push({ s, n: tok.length, prima: tok[0] });
    }
    return out;
  }
  function estratto(testo, i, lunghezza, prima = 80, dopo = 140) {
    const inizio = Math.max(0, i - prima);
    const fine = Math.min(testo.length, i + lunghezza + dopo);
    const pre = ripulisci(testo.slice(inizio, i)).replace(/\s+/g, ' ');
    const mid = ripulisci(testo.slice(i, i + lunghezza));
    const post = ripulisci(testo.slice(i + lunghezza, fine)).replace(/\s+/g, ' ');
    return `${inizio > 0 ? '…' : ''}${esc(pre)}<mark>${esc(mid)}</mark>${esc(post)}${fine < testo.length ? '…' : ''}`;
  }
  function formatoInline(s) {
    return esc(s).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  }
  function renderTesto(testo, pers, evidenziato, campagnaId) {
    return tokenizza(testo, pers).map((t) => {
      if (t.t === 'testo') return formatoInline(t.v);
      if (t.t === 'ignoto') {
        return `<button class="cit cit-ignota" data-azione="crea-png-da-citazione" data-campagna="${esc(campagnaId)}" data-nome="${esc(t.v)}" title="Personaggio non ancora creato: clicca per crearlo">${esc(t.v)} <span>+</span></button>`;
      }
      const p = personaggio(t.id);
      return `<a class="cit ${p?.tipo === 'PG' ? 'cit-pg' : 'cit-png'}${evidenziato === t.id ? ' evidenziato' : ''}" href="#/personaggio/${esc(t.id)}" title="${esc(p?.ruolo || p?.tipo || '')}">${esc(t.v)}</a>`;
    }).join('');
  }
  function chipCitati(testo, pers, link = true) {
    const conta = contaCitazioni(testo, pers);
    const voci = [...conta].map(([id, n]) => ({ p: personaggio(id), n })).filter((x) => x.p)
      .sort((a, b) => (a.p.tipo === b.p.tipo ? a.p.nome.localeCompare(b.p.nome) : a.p.tipo === 'PNG' ? -1 : 1));
    return voci.map(({ p, n }) => link
      ? `<a class="chip ${p.tipo === 'PG' ? 'chip-pg' : ''}" href="#/personaggio/${p.id}">${esc(p.nome)}${n > 1 ? ` <small>×${n}</small>` : ''}</a>`
      : `<span class="chip ${p.tipo === 'PG' ? 'chip-pg' : ''}">${esc(p.nome)}</span>`).join('');
  }

  // ================= Dadi =================
  function esitoPercentuale(t, v) {
    if (t === 1) return 'Successo critico';
    if (t === 100 || (v < 50 && t >= 96)) return 'Disastro';
    if (t <= Math.floor(v / 5)) return 'Successo estremo';
    if (t <= Math.floor(v / 2)) return 'Successo difficile';
    if (t <= v) return 'Successo';
    return 'Fallimento';
  }
  function eseguiTiro(espr, etichetta = '', opz = {}) {
    let r;
    try { r = Dadi.tira(espr); } catch (e) { toast(`<b>${esc(e.message)}</b>`, 'errore'); return null; }
    const tiro = { ...r, id: uid(), etichetta, quando: Date.now() };
    if (opz.soglia !== undefined) { tiro.soglia = opz.soglia; tiro.esito = esitoPercentuale(r.totale, opz.soglia); }
    if (r.riserva) {
      const dieci = r.parti.filter((p) => p.tipo === 'dadi' && p.facce === 10).flatMap((p) => p.valori).filter((x) => x.v === 10).length;
      if (dieci >= 2) tiro.nota = `${Math.floor(dieci / 2)} coppia/e di 10`;
    }
    S.tiri.unshift(tiro);
    S.tiri.length = Math.min(S.tiri.length, 100);
    salva();
    toast(htmlTiro(tiro, true));
    return tiro;
  }
  function htmlTiro(t, compatto = false) {
    const parti = t.parti.map((p, i) => {
      const s = i === 0 && p.segno > 0 ? '' : p.segno > 0 ? ' + ' : ' − ';
      if (p.tipo === 'num') return `${s}${p.v}`;
      const d = p.valori.map((x) => `<span class="d${x.scartato ? ' scartato' : ''}${x.successo ? ' successo' : ''}${x.max ? ' massimo' : ''}${x.min ? ' minimo' : ''}">${x.v}</span>`).join('');
      return `${s}${p.n}d${p.facce}${esc(p.mod)} <span class="dadi">${d}</span>`;
    }).join('');
    const totale = t.riserva ? `${t.totale} success${t.totale === 1 ? 'o' : 'i'}` : t.totale;
    const esito = t.esito ? `<span class="esito esito-${norm(t.esito).replace(/\s+/g, '-')}">${esc(t.esito)} <small>(su ${t.soglia})</small></span>` : '';
    return `<div class="tiro${compatto ? ' compatto' : ''}">
      <div class="tiro-testa">${t.etichetta ? `<span class="tiro-etichetta">${esc(t.etichetta)}</span>` : ''}<code>${esc(t.espr)}</code>${compatto ? '' : `<span class="tiro-ora">${new Date(t.quando).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>`}</div>
      <div class="tiro-corpo"><span class="tiro-totale">${totale}</span><span class="tiro-dettaglio">${parti}</span></div>
      ${esito || t.nota ? `<div class="tiro-piede">${esito}${t.nota ? `<span class="esito">${esc(t.nota)}</span>` : ''}</div>` : ''}
    </div>`;
  }
  function tiroCaratteristica(p, sigla) {
    const r = regDi(p);
    const k = r.caratteristiche.find((x) => x.sigla === sigla);
    if (!k) return;
    const v = numero(valore(p, 'caratteristiche', sigla, k.predefinito));
    const et = `${p.nome} · ${k.nome}`;
    if (r.modalita === 'd20') eseguiTiro('1d20' + fmtMod(Math.floor((v - 10) / 2)), et);
    else if (r.modalita === 'd20mod') eseguiTiro('1d20' + fmtMod(v), et);
    else if (r.modalita === 'percentuale') eseguiTiro('1d100', et, { soglia: v });
    else if (r.modalita === 'pool') eseguiTiro(`${Math.max(1, v)}d10>=6`, et);
  }
  function tiroAbilita(p, nome) {
    const r = regDi(p);
    const a = r.abilita.find((x) => x.nome === nome);
    if (!a) return;
    const v = numero(valore(p, 'abilita', nome, a.predefinito));
    const et = `${p.nome} · ${a.nome}`;
    if (r.modalita === 'd20' || r.modalita === 'd20mod') eseguiTiro('1d20' + fmtMod(v), et);
    else if (r.modalita === 'percentuale') eseguiTiro('1d100', et, { soglia: v });
    else if (r.modalita === 'pool') {
      const k = r.caratteristiche.find((x) => x.sigla === attributoRiserva) || r.caratteristiche[0];
      const va = k ? numero(valore(p, 'caratteristiche', k.sigla, k.predefinito)) : 0;
      eseguiTiro(`${Math.max(1, va + v)}d10>=6`, `${et}${k ? ' + ' + k.nome : ''}`);
    }
  }

  // ================= Viste =================
  const nonTrovato = () => '<div class="vuoto"><h2>Elemento non trovato</h2><p>Forse è stato eliminato.</p><p><a href="#/campagne">Torna alle campagne</a></p></div>';
  const opzioni = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const bind = (tipo, id, campo, extra = '') => `data-bind="${tipo}" data-id="${esc(id)}" data-campo="${esc(campo)}" ${extra}`;

  function vistaCampagne() {
    const opzReg = opzioni(S.regolamenti.map((r) => [r.id, r.nome]));
    const schede = S.campagne.slice().sort((a, b) => STATI.indexOf(a.stato) - STATI.indexOf(b.stato) || a.nome.localeCompare(b.nome)).map((c) => {
      const r = regolamento(c.regolamentoId);
      const ss = sessioniDi(c.id);
      const pp = personaggiDi(c.id);
      const ultima = ss[ss.length - 1];
      return `<a class="scheda" href="#/campagna/${c.id}/diario">
        <div class="scheda-titolo">${esc(c.nome)}<button class="btn-cestino" data-azione="elimina-campagna" data-id="${c.id}" title="Elimina la campagna">🗑</button></div>
        <div class="scheda-sotto">${esc(r ? r.nome : 'Regolamento mancante')} <span class="badge stato-${norm(c.stato).replace(/\s+/g, '-')}">${esc(c.stato)}</span></div>
        <div class="scheda-num"><b>${ss.length}</b> sessioni · <b>${pp.filter((p) => p.tipo === 'PG').length}</b> PG · <b>${pp.filter((p) => p.tipo === 'PNG').length}</b> PNG${pp.some((p) => p.tipo === 'Mostro') ? ` · <b>${pp.filter((p) => p.tipo === 'Mostro').length}</b> mostri` : ''}</div>
        ${ultima ? `<div class="scheda-sotto">Ultima: ${esc(titoloSessione(ultima))} · ${esc(fmtData(ultima.data))}</div>` : ''}
      </a>`;
    }).join('');
    return `<header class="intest"><h1>Campagne</h1></header>
      <form class="riga-form" data-form="nuova-campagna" autocomplete="off">
        <input name="nome" placeholder="Nome della nuova campagna" required>
        <select name="regolamentoId" aria-label="Regolamento">${opzReg}</select>
        <button class="primario">Crea campagna</button>
      </form>
      ${S.campagne.length ? `<div class="griglia">${schede}</div>` : '<p class="vuoto">Nessuna campagna ancora. Creane una qui sopra.</p>'}`;
  }

  function vistaCampagna(id, scheda, sotto) {
    const c = campagna(id);
    if (!c) return nonTrovato();
    const r = regolamento(c.regolamentoId);
    const navi = S.astronavi.filter((x) => x.campagnaId === c.id);
    const schede = [['diario', 'Diario delle sessioni'], ['personaggi', 'Personaggi'], ['lore', `Lore${c.lore?.length ? ` (${c.lore.length})` : ''}`], ['combattimento', 'Combattimento'], ...(r?.scheda === 'sf' ? [['astronavi', `Astronavi${navi.length ? ` (${navi.length})` : ''}`]] : []), ['dettagli', 'Dettagli']];
    let corpo = '';
    if (scheda === 'personaggi') corpo = schedaPersonaggi(c, sotto);
    else if (scheda === 'lore') corpo = schedaLore(c, sotto);
    else if (scheda === 'combattimento') corpo = pf1.vistaIncontro(c);
    else if (scheda === 'dettagli') corpo = schedaDettagli(c);
    else if (scheda === 'astronavi') corpo = schedaAstronavi(c);
    else corpo = schedaDiario(c);
    return `<div class="briciole"><a href="#/campagne">Campagne</a></div>
      <header class="intest"><h1><span data-titolo="campagna:${c.id}">${esc(c.nome)}</span> <button class="btn-rinomina" data-azione="rinomina-campagna" data-id="${c.id}" title="Cambia il nome della campagna">✏️</button> <button class="btn-cestino" data-azione="elimina-campagna" data-id="${c.id}" title="Elimina la campagna con sessioni e personaggi">🗑</button></h1>
        <div class="intest-sotto">${r ? `<a href="#/regolamento/${r.id}">${esc(r.nome)}</a>` : 'Regolamento mancante'} · <span class="badge stato-${norm(c.stato).replace(/\s+/g, '-')}">${esc(c.stato)}</span>${c.master ? ` · Master: ${esc(c.master)}` : ''}</div>
      </header>
      <nav class="schede">${schede.map(([k, t]) => `<a href="#/campagna/${c.id}/${k}" class="${(scheda || 'diario') === k ? 'attiva' : ''}">${t}</a>`).join('')}</nav>
      ${corpo}`;
  }

  function schedaDiario(c) {
    const pers = personaggiDi(c.id);
    const ss = sessioniDi(c.id).reverse();
    const voci = ss.map((s) => {
      const testo = ripulisci(s.testo).replace(/\s+/g, ' ').trim();
      const chip = chipCitati(s.testo, pers, false);
      return `<a class="voce-sessione" href="#/sessione/${s.id}">
        <button class="btn-cestino" data-azione="elimina-sessione" data-id="${s.id}" title="Elimina la sessione">🗑</button>
        <div class="voce-num">#${esc(s.numero)}</div>
        <div class="voce-corpo">
          <div class="voce-titolo">${esc(titoloSessione(s))}</div>
          <div class="voce-data">${esc(fmtData(s.data))}</div>
          ${testo ? `<div class="voce-anteprima">${esc(testo.slice(0, 260))}${testo.length > 260 ? '…' : ''}</div>` : '<div class="voce-anteprima muto">Nessun testo ancora.</div>'}
          ${chip ? `<div class="chips">${chip}</div>` : ''}
        </div>
      </a>`;
    }).join('');
    return `<div class="barra-azioni"><button class="primario" data-azione="nuova-sessione" data-campagna="${c.id}">+ Nuova sessione</button></div>
      ${ss.length ? `<div class="lista-sessioni">${voci}</div>` : '<p class="vuoto">Il diario è vuoto. Crea la prima sessione.</p>'}`;
  }

  // Riga di un mostro della campagna: nome, voce del bestiario con le statistiche principali
  function rigaMostro(c, p, idx) {
    const m = pf1.mostroDi(p.mostro || p.nome, c);
    const sis = pf1.sistemaDi(c);
    const app = idx.get(p.id) || [];
    const dettagli = m ? [sis === 'pf2' ? `Liv ${m[1]}` : `GS ${m[1]}`, `${m[4] || ''} ${m[3] || ''}`.trim(), `CA ${m[8]}`, `PF ${m[11]}`].filter(Boolean).join(' · ') : '';
    const filtro = norm([p.nome, p.alias, p.mostro, m?.[3]].join(' '));
    return `<div class="riga-mostro" data-filtro="${esc(filtro)}">
      <a class="mostro-nome" href="#/personaggio/${p.id}">${p.immagine ? `<span class="ritratto ritratto-mini">${ritratto(p)}</span>` : '<span class="mostro-icona">👹</span>'}<b>${esc(p.nome)}</b>
        ${m && norm(m[0]) !== norm(p.nome) ? ` <small class="muto">(${esc(m[0])})</small>` : ''}</a>
      <span class="mostro-stat">${m ? esc(dettagli) : '<span class="muto">non nel bestiario: statistiche nelle note</span>'}</span>
      <span class="png-app">${app.length ? `${app.length} session${app.length === 1 ? 'e' : 'i'}` : '<span class="muto">mai citato</span>'}</span>
      <span class="mostro-azioni">
        ${m ? `<button class="btn-mini" data-azione="inc-info-mostro" data-nome="${esc(m[0])}" data-sistema="${esc(sis)}" title="Blocco statistiche dal wiki">i</button>` : ''}
        <input type="number" class="mini mostro-qta" min="1" max="30" value="1" aria-label="Quanti" title="Quanti nello scontro">
        <button class="btn-piccolo" data-azione="mostro-scontro" data-id="${p.id}" title="Aggiunge il mostro al tracker di combattimento">⚔ Allo scontro</button>
        <button class="btn-cestino" data-azione="elimina-personaggio" data-id="${p.id}" title="Elimina il mostro">🗑</button>
      </span>
    </div>`;
  }

  function schedaPersonaggi(c, sotto) {
    const pers = personaggiDi(c.id);
    const idx = indiceApparizioni(c.id);
    const r = regolamento(c.regolamentoId) || REG_VUOTO;
    const pg = pers.filter((p) => p.tipo === 'PG').sort((a, b) => a.nome.localeCompare(b.nome));
    const png = pers.filter((p) => p.tipo !== 'PG' && p.tipo !== 'Mostro').sort((a, b) => a.nome.localeCompare(b.nome));
    const mostri = pers.filter((p) => p.tipo === 'Mostro').sort((a, b) => a.nome.localeCompare(b.nome));
    const vista = ['pg', 'png', 'mostri'].includes(sotto) ? sotto : 'pg';
    const tabs = `<nav class="sotto-schede">${[['pg', '🛡 PG', pg.length], ['png', '🎭 PNG', png.length], ['mostri', '👹 Mostri', mostri.length]].map(([k, t, nn]) => `<a href="#/campagna/${c.id}/personaggi/${k}" class="${vista === k ? 'attiva' : ''}">${t} <small>${nn}</small></a>`).join('')}</nav>`;
    if (vista === 'mostri') {
      const bestiario = pf1.bestiario(c);
      return `${tabs}
        <form class="riga-form" data-form="nuovo-personaggio" autocomplete="off">
          <input type="hidden" name="campagnaId" value="${c.id}"><input type="hidden" name="tipo" value="Mostro">
          <input name="nome" placeholder="${bestiario.length ? `Mostro dal bestiario (${bestiario.length}) o nome inventato` : 'Nome del mostro'}" list="bestiario-campagna" required>
          <button class="primario">Aggiungi mostro</button>
          ${pf1.sistemaDi(c) === 'pf1' ? `<button type="button" data-azione="mostro-personalizzato" data-campagna="${c.id}" title="Un mostro nuovo con le regole di Creazione Mostri: GS, tipo, taglia, DV, statistiche confrontate con le medie">🛠 Crea mostro personalizzato</button>` : ''}
        </form>
        ${bestiario.length ? `<datalist id="bestiario-campagna">${bestiario.map((m) => `<option value="${esc(m[0])}">${pf1.sistemaDi(c) === 'pf2' ? 'Liv' : 'GS'} ${esc(m[1])} · ${esc(m[3])}</option>`).join('')}</datalist>` : ''}
        <p class="muto pf-aiuto">I mostri ricorrenti della campagna (il drago della montagna, la banda di goblin…): con il nome di un mostro del bestiario prendono le sue statistiche; con un nome inventato puoi collegarli al bestiario dalla loro scheda.</p>
        ${mostri.length ? `<input id="filtro-png" type="search" class="filtro" placeholder="Filtra mostri per nome o tipo…"><div class="lista-mostri">${mostri.map((p) => rigaMostro(c, p, idx)).join('')}</div>` : '<p class="muto">Nessun mostro.</p>'}`;
    }
    const schedePG = pg.map((p) => {
      const riass = r.campi.slice(0, 3).map((k) => p.campi?.[k]).filter(Boolean).join(' · ');
      return `<a class="scheda" href="#/personaggio/${p.id}">
        <div class="scheda-titolo"><span class="ritratto ritratto-piccolo">${ritratto(p)}</span>${esc(p.nome)}<button class="btn-cestino" data-azione="elimina-personaggio" data-id="${p.id}" title="Elimina il personaggio">🗑</button></div>
        <div class="scheda-sotto">${esc(riass || 'Scheda da compilare')}</div>
        ${p.giocatore ? `<div class="scheda-sotto">Giocatore: ${esc(p.giocatore)}</div>` : ''}
        <div class="scheda-num">Citato in <b>${idx.get(p.id)?.length || 0}</b> sessioni</div>
      </a>`;
    }).join('');
    const righePNG = png.map((p) => {
      const app = idx.get(p.id) || [];
      const ultima = app[app.length - 1];
      const filtro = norm([p.nome, p.alias, p.ruolo].join(' '));
      return `<a class="riga-png" href="#/personaggio/${p.id}" data-filtro="${esc(filtro)}">
        <span class="png-nome">${p.immagine ? `<span class="ritratto ritratto-mini">${ritratto(p)}</span>` : ''}${esc(p.nome)}${p.alias ? ` <small>(${esc(p.alias)})</small>` : ''}</span>
        <span class="png-ruolo">${esc(p.ruolo || '')}</span>
        <span class="png-app">${app.length ? `${app.length} session${app.length === 1 ? 'e' : 'i'}` : '<span class="muto">mai citato</span>'}</span>
        <span class="png-ultima">${ultima ? esc(`#${ultima.s.numero} ${titoloSessione(ultima.s)}`) : ''}</span>
        <span><button class="btn-cestino" data-azione="elimina-personaggio" data-id="${p.id}" title="Elimina il PNG">🗑</button></span>
      </a>`;
    }).join('');
    const modulo = (tipo, testo, segnaposto) => `<form class="riga-form" data-form="nuovo-personaggio" autocomplete="off">
        <input type="hidden" name="campagnaId" value="${c.id}"><input type="hidden" name="tipo" value="${tipo}">
        <input name="nome" placeholder="${segnaposto}" required>
        <button class="primario">${testo}</button>
      </form>`;
    if (vista === 'png') {
      return `${tabs}${modulo('PNG', 'Aggiungi PNG', 'Nome del PNG')}
        <div class="barra-azioni"><button data-azione="pg-importa" data-campagna="${c.id}" data-tipo="PNG" title="Carica il file di una scheda (fatta con il kit o salvata da un'altra campagna) come PNG">📥 Importa scheda</button></div>
        ${png.length ? `<input id="filtro-png" type="search" class="filtro" placeholder="Filtra PNG per nome, alias o ruolo…">
          <div class="tabella-png"><div class="riga-png testa"><span>Nome</span><span>Ruolo</span><span>Apparizioni</span><span>Ultima apparizione</span><span></span></div>${righePNG}</div>`
          : '<p class="muto">Nessun PNG. Puoi crearli qui o direttamente dal diario scrivendo <b>@</b>.</p>'}`;
    }
    return `${tabs}${modulo('PG', 'Aggiungi PG', 'Nome del personaggio giocante')}
      <div class="barra-azioni"><button data-azione="pg-importa" data-campagna="${c.id}" title="Carica il file della scheda compilata da un giocatore con il kit">📥 Importa la scheda di un giocatore</button></div>
      ${pg.length ? `<div class="griglia">${schedePG}</div>` : '<p class="muto">Nessun PG.</p>'}`;
  }

  // ================= Lore della campagna =================
  // Pagine di storia importate dai documenti del master (PDF, DOCX, DOC) o scritte qui.
  // L'HTML viene sempre ripulito: restano solo titoli, paragrafi, enfasi, elenchi, tabelle e immagini incorporate.
  const LORE_TAG = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'IMG', 'HR', 'SUP', 'SUB']);
  function pulisciLore(html) {
    const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    const radice = doc.body.firstElementChild;
    const visita = (nodo) => {
      for (const el of [...nodo.children]) {
        visita(el);
        if (!LORE_TAG.has(el.tagName)) {
          // Tag non ammessi: script, stili e simili spariscono, gli altri lasciano il loro contenuto
          if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|svg|SVG|MATH|TEMPLATE|FORM|INPUT|BUTTON|SELECT|TEXTAREA)$/.test(el.tagName)) el.remove();
          else el.replaceWith(...el.childNodes);
          continue;
        }
        for (const a of [...el.attributes]) {
          const ok = (el.tagName === 'IMG' && a.name === 'src' && /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(a.value))
            || (el.tagName === 'IMG' && a.name === 'alt')
            || (/^T[DH]$/.test(el.tagName) && /^(colspan|rowspan)$/.test(a.name) && /^\d{1,2}$/.test(a.value));
          if (!ok) el.removeAttribute(a.name);
        }
        if (el.tagName === 'IMG' && !el.getAttribute('src')) el.remove();
      }
    };
    visita(radice);
    // Paragrafi vuoti lasciati dalla conversione
    for (const p of [...radice.querySelectorAll('p')]) if (!p.textContent.trim() && !p.querySelector('img')) p.remove();
    return radice.innerHTML;
  }
  const loreTestoBreve = (html, max = 160) => { const t = new DOMParser().parseFromString(html || '', 'text/html').body.textContent.replace(/\s+/g, ' ').trim(); return t.length > max ? t.slice(0, max) + '…' : t; };
  // Divide un documento in capitoli: ai titoli principali (h1; se ce n'è al massimo uno, agli h2)
  function capitoliLore(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const radice = doc.body.firstElementChild;
    const figli = [...radice.childNodes];
    const tag = radice.querySelectorAll(':scope > h1').length >= 2 ? 'H1' : radice.querySelectorAll(':scope > h2').length >= 2 ? 'H2' : '';
    if (!tag) return null;
    const pezzi = [];
    let corrente = null;
    for (const n of figli) {
      if (n.nodeType === 1 && n.tagName === tag) { corrente = { titolo: n.textContent.trim(), nodi: [] }; pezzi.push(corrente); continue; }
      if (!corrente) { corrente = { titolo: '', nodi: [] }; pezzi.push(corrente); }
      corrente.nodi.push(n);
    }
    const html2 = (nodi) => nodi.map((x) => (x.nodeType === 1 ? x.outerHTML : x.textContent)).join('');
    // Il testo prima del primo capitolo (es. titolo del documento) diventa l'introduzione, se non è vuoto
    // (i titoli senza testo, come il titolo generale del documento seguito subito dal capitolo 1, non diventano pagine vuote)
    return pezzi.map((p) => ({ titolo: p.titolo, html: html2(p.nodi) })).filter((p) => loreTestoBreve(p.html) || /<img/i.test(p.html));
  }
  let loreModifica = null; // id della pagina in modifica

  // Dati della scheda di un regolamento (pf1, dnd, pf2, sf) di un personaggio
  const datiSistema = (pid, sistema) => (['pf1', 'dnd', 'pf2', 'sf'].includes(sistema) ? personaggio(pid)?.[sistema] || null : null);

  // ---- Ordine dei blocchi della scheda personaggio (Dati, sezioni del regolamento, Note, Documenti) ----
  // Ogni personaggio ricorda il suo ordine (p.ordineBlocchi); i blocchi nuovi o non elencati restano vicini a dove sono di base.
  const SCHEDA_SISTEMA = '[data-pf1-scheda], [data-dnd-scheda], [data-pf2-scheda], [data-sf-scheda]';
  function blocchiScheda(radice) {
    const col = $('.colonna-scheda', radice);
    if (!col) return null;
    const sistema = $(SCHEDA_SISTEMA, col);
    // Nelle schede con calcoli i blocchi stanno tutti nello stesso contenitore (Dati in testa, Note e Documenti in fondo)
    const cont = sistema || col;
    if (sistema) {
      const sez = [...sistema.children].filter((x) => x.dataset.sez);
      const dati = $(':scope > [data-blocco="dati"]', col);
      if (dati) sistema.insertBefore(dati, sez[0] || null);
      for (const k of ['note', 'documenti']) { const b = $(`:scope > [data-blocco="${k}"]`, col); if (b) sistema.appendChild(b); }
    }
    const blocchi = [...cont.children].filter((x) => x.dataset.blocco || x.dataset.sez);
    for (const b of blocchi) if (!b.dataset.blocco) b.dataset.blocco = `sez:${b.dataset.sez}`;
    return { cont, blocchi, ancora: sistema ? null : $(':scope > .zona-pericolo', col) };
  }
  function ordineBlocchi(predefinito, salvato) {
    if (!Array.isArray(salvato) || !salvato.length) return predefinito;
    const out = salvato.filter((k) => predefinito.includes(k));
    predefinito.forEach((k, i) => {
      if (out.includes(k)) return;
      // Blocco non ancora ordinato: subito dopo quello che lo precede nell'ordine di base
      const prima = predefinito.slice(0, i).reverse().find((x) => out.includes(x));
      out.splice(prima ? out.indexOf(prima) + 1 : 0, 0, k);
    });
    return out;
  }
  function ordinaBlocchi(p, radice) {
    const b = blocchiScheda(radice);
    if (!b || b.blocchi.length < 2) return;
    const perK = new Map(b.blocchi.map((x) => [x.dataset.blocco, x]));
    const ordine = ordineBlocchi(b.blocchi.map((x) => x.dataset.blocco), p.ordineBlocchi);
    for (const k of ordine) b.cont.insertBefore(perK.get(k), b.ancora);
    ordine.forEach((k, i) => {
      const el = perK.get(k);
      const testa = $(':scope > summary', el) || $(':scope > .pannello-testa', el) || $(':scope > h3', el);
      if (!testa) return;
      const comandi = document.createElement('span');
      comandi.className = 'blocco-comandi';
      comandi.innerHTML = `<span class="blocco-maniglia" draggable="true" data-blocco-trascina="${esc(k)}" title="Trascina per spostare il blocco">⠿</span>
        <button class="btn-mini" data-azione="blocco-sposta" data-id="${p.id}" data-k="${esc(k)}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="Sposta su">▲</button>
        <button class="btn-mini" data-azione="blocco-sposta" data-id="${p.id}" data-k="${esc(k)}" data-d="1" ${i === ordine.length - 1 ? 'disabled' : ''} title="Sposta giù">▼</button>
        ${i === 0 && p.ordineBlocchi?.length ? `<button class="btn-mini" data-azione="blocco-predefinito" data-id="${p.id}" title="Rimetti i blocchi nell'ordine di partenza">↺</button>` : ''}`;
      testa.appendChild(comandi);
    });
  }
  // ---- Barra dei salti: a destra un pulsante per ogni blocco della scheda, che porta subito a quella parte ----
  let osservaSalti = null;
  function barraSalti(radice) {
    document.getElementById('salti-scheda')?.remove();
    osservaSalti?.disconnect();
    osservaSalti = null;
    const b = blocchiScheda(radice);
    if (!b || b.blocchi.length < 3) { document.body.classList.remove('con-salti'); return; }
    // Titolo del blocco senza i comandi di spostamento (⠿ ▲ ▼) aggiunti nell'intestazione
    const titolo = (el) => {
      const h = $(':scope > summary h3', el) || $(':scope > summary', el) || $(':scope > .pannello-testa h3', el) || $(':scope > h3', el) || $('h2, h3', el);
      if (!h) return '';
      const c = h.cloneNode(true);
      c.querySelectorAll('.blocco-comandi, button, small').forEach((x) => x.remove());
      return c.textContent.replace(/\s+/g, ' ').trim();
    };
    const voci = b.blocchi.map((el) => ({ k: el.dataset.blocco, t: titolo(el) || (el.dataset.blocco === 'dati' ? 'Dati' : el.dataset.blocco) }));
    const nav = document.createElement('nav');
    nav.id = 'salti-scheda';
    nav.setAttribute('aria-label', 'Vai a una parte della scheda');
    // Aperto di base sugli schermi larghi; poi si ricorda la scelta
    let aperta = window.innerWidth >= 1300;
    try { const v = localStorage.getItem('salti-aperti'); if (v !== null) aperta = v === '1'; } catch { /* niente */ }
    if (aperta) nav.classList.add('aperta');
    document.body.classList.toggle('salti-aperti', aperta);
    const pid = location.hash.slice(1).split('?')[0].split('/').filter(Boolean)[1] || '';
    nav.innerHTML = `<button class="salti-apri" data-azione="salti-apri" title="Mostra o nascondi l'indice della scheda">☰</button>
      <div class="salti-elenco">${voci.map((v, i) => `<div class="salto-riga" data-blocco="${esc(v.k)}">
          <button class="salto" data-azione="salta-blocco" data-vai="${esc(v.k)}" draggable="true" data-blocco-trascina="${esc(v.k)}" title="${esc(v.t)} — clic per andarci, trascina per spostarla">${esc(v.t)}</button>
          <span class="salto-sposta"><button class="btn-mini" data-azione="blocco-sposta" data-indice data-id="${esc(pid)}" data-k="${esc(v.k)}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="Sposta su">▲</button><button class="btn-mini" data-azione="blocco-sposta" data-indice data-id="${esc(pid)}" data-k="${esc(v.k)}" data-d="1" ${i === voci.length - 1 ? 'disabled' : ''} title="Sposta giù">▼</button></span></div>`).join('')}
        <button class="salto salto-su" data-azione="salta-blocco" data-vai="" title="Torna in cima">▲ In cima</button></div>`;
    document.body.appendChild(nav);
    document.body.classList.add('con-salti');
    // La voce della parte che si sta leggendo resta evidenziata. Si osserva dentro #contenuto (che scorre):
    // niente letture di misure qui, che costringerebbero il browser a impaginare subito tutta la scheda.
    osservaSalti = new IntersectionObserver((entrate) => {
      for (const e of entrate) {
        if (!e.isIntersecting) continue;
        nav.querySelectorAll('.salto.attuale').forEach((x) => x.classList.remove('attuale'));
        nav.querySelector(`.salto[data-vai="${CSS.escape(e.target.dataset.blocco)}"]`)?.classList.add('attuale');
      }
    }, { root: $('#contenuto'), rootMargin: '-10% 0px -80% 0px' });
    b.blocchi.forEach((el) => osservaSalti.observe(el));
  }
  // Ordine attuale (dalla pagina) con un blocco spostato in una nuova posizione
  function spostaBlocco(p, k, verso, scorri = true) {
    const b = blocchiScheda($('#contenuto'));
    if (!b) return;
    const ordine = b.blocchi.map((x) => x.dataset.blocco);
    const da = ordine.indexOf(k);
    if (da < 0) return;
    ordine.splice(da, 1);
    const a = typeof verso === 'number' ? Math.max(0, Math.min(ordine.length, da + verso)) : Math.max(0, ordine.indexOf(verso.prima) >= 0 ? ordine.indexOf(verso.prima) : ordine.length);
    ordine.splice(a, 0, k);
    p.ordineBlocchi = ordine;
    p.modificato = Date.now();
    salva();
    render();
    // Il blocco spostato resta sotto gli occhi (non se lo si sposta dall'indice)
    if (scorri) setTimeout(() => $(`[data-blocco="${CSS.escape(k)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
  }

  // Raccolte di pagine: la Lore di una campagna ("campagna:ID") o i documenti di un personaggio ("personaggio:ID")
  const docAperto = {}; // personaggio -> pagina aperta (la Lore usa l'indirizzo della pagina)
  function raccolta(chiave) {
    const [tipo, id] = String(chiave).split(':');
    if (tipo === 'campagna') {
      const c = campagna(id);
      if (!c) return null;
      return { lista: (c.lore = c.lore || []), nome: 'lore', link: (pid) => `href="#/campagna/${id}/lore/${pid}"`, vai: (pid) => { location.hash = `#/campagna/${id}/lore${pid ? `/${pid}` : ''}`; render(); } };
    }
    const p = personaggio(id);
    if (!p) return null;
    return { lista: (p.documenti = p.documenti || []), nome: 'documenti', link: (pid) => `href="#" data-azione="racc-apri" data-racc="${esc(chiave)}" data-id="${pid}"`, vai: (pid) => { docAperto[id] = pid || ''; render(); setTimeout(() => $('.doc-pg .lore-colonna')?.scrollIntoView({ block: 'nearest' }), 30); } };
  }

  function schedaLore(c, paginaId) {
    return libroPagine(`campagna:${c.id}`, paginaId, `<div class="lore-vuota"><div class="lore-vuota-icona">📜</div>
        <h2>La lore della campagna è ancora da scrivere</h2>
        <p>Importa i documenti che hai già scritto — <b>PDF</b>, <b>Word (.docx)</b> o <b>.doc</b> — e diventano pagine di storia leggibili qui, con lo stile del programma.<br>
        Un documento con più capitoli si può dividere in una pagina per capitolo.</p></div>`);
  }

  // Libro di pagine (Lore o documenti del personaggio): indice, lettura con il tema, modifica, capitoli
  function libroPagine(chiave, paginaId, vuoto) {
    const rc = raccolta(chiave);
    const pagine = rc.lista;
    const attiva = pagine.find((x) => x.id === paginaId) || pagine[0];
    const R = `data-racc="${esc(chiave)}"`;
    const indice = pagine.map((x, i) => `<a class="lore-voce${x === attiva ? ' attiva' : ''}" ${rc.link(x.id)}>
        <span class="lore-num">${i + 1}</span><span class="lore-voce-titolo">${esc(x.titolo || 'Senza titolo')}</span>
        ${x.formato ? `<small class="lore-formato">${esc(x.formato.toUpperCase())}</small>` : ''}</a>`).join('');
    const barra = `<div class="barra-azioni">
        <button class="primario" data-azione="lore-importa" ${R} title="Scegli uno o più file PDF, DOCX o DOC: diventano pagine leggibili qui">📥 Importa documenti (PDF, Word)</button>
        <button data-azione="lore-nuova" ${R}>✒️ Nuova pagina vuota</button>
      </div>`;
    if (!pagine.length) return `${barra}${vuoto}`;
    const inModifica = loreModifica === attiva.id;
    const capitoli = !inModifica ? capitoliLore(attiva.html) : null;
    const pagina = inModifica
      ? `<div class="lore-pagina lore-in-modifica">
          <input class="lore-titolo-in" id="lore-titolo" value="${esc(attiva.titolo || '')}" placeholder="Titolo della pagina">
          <div class="lore-strumenti">
            <button data-cmd="formatBlock" data-val="H1" title="Titolo">T1</button><button data-cmd="formatBlock" data-val="H2" title="Sottotitolo">T2</button><button data-cmd="formatBlock" data-val="H3" title="Titoletto">T3</button><button data-cmd="formatBlock" data-val="P" title="Paragrafo normale">¶</button>
            <button data-cmd="bold" title="Grassetto"><b>G</b></button><button data-cmd="italic" title="Corsivo"><i>C</i></button><button data-cmd="underline" title="Sottolineato"><u>S</u></button>
            <button data-cmd="insertUnorderedList" title="Elenco puntato">• Elenco</button><button data-cmd="formatBlock" data-val="BLOCKQUOTE" title="Citazione">❝</button>
          </div>
          <div class="lore-testo" id="lore-testo" contenteditable="true">${pulisciLore(attiva.html) || '<p></p>'}</div>
          <div class="pf-piede"><button class="primario" data-azione="lore-salva" ${R} data-id="${attiva.id}">💾 Salva la pagina</button>
            <button data-azione="lore-annulla">Annulla</button></div>
        </div>`
      : `<article class="lore-pagina">
          <header class="lore-testata">
            <h1 class="lore-titolo">${esc(attiva.titolo || 'Senza titolo')}</h1>
            ${attiva.fonte ? `<div class="lore-fonte">da «${esc(attiva.fonte)}»${attiva.creata ? ` · ${esc(fmtData(new Date(attiva.creata).toISOString().slice(0, 10)))}` : ''}</div>` : ''}
            <div class="lore-ornamento" aria-hidden="true">❦</div>
          </header>
          <div class="lore-testo">${pulisciLore(attiva.html) || '<p class="muto">Pagina vuota: premi «Modifica» per scrivere.</p>'}</div>
        </article>`;
    const i = pagine.indexOf(attiva);
    const azioni = inModifica ? '' : `<div class="lore-azioni">
        <button data-azione="lore-modifica" data-id="${attiva.id}">✏️ Modifica</button>
        ${capitoli && capitoli.length > 1 ? `<button data-azione="lore-dividi" ${R} data-id="${attiva.id}" title="Crea una pagina per ogni capitolo del documento">✂️ Dividi in ${capitoli.length} pagine</button>` : ''}
        <button data-azione="lore-sposta" ${R} data-id="${attiva.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="Sposta prima">↑</button>
        <button data-azione="lore-sposta" ${R} data-id="${attiva.id}" data-d="1" ${i === pagine.length - 1 ? 'disabled' : ''} title="Sposta dopo">↓</button>
        <button class="btn-cestino" data-azione="lore-elimina" ${R} data-id="${attiva.id}" title="Elimina la pagina">🗑</button>
      </div>`;
    const nav = inModifica ? '' : `<div class="lore-sfoglia">
        ${pagine[i - 1] ? `<a ${rc.link(pagine[i - 1].id)}>← ${esc(pagine[i - 1].titolo || 'Pagina precedente')}</a>` : '<span></span>'}
        <span class="muto">Pagina ${i + 1} di ${pagine.length}</span>
        ${pagine[i + 1] ? `<a ${rc.link(pagine[i + 1].id)}>${esc(pagine[i + 1].titolo || 'Pagina successiva')} →</a>` : '<span></span>'}
      </div>`;
    return `${barra}
      <div class="lore-layout">
        <nav class="lore-indice"><h3>Indice</h3>${indice}</nav>
        <div class="lore-colonna">${azioni}${pagina}${nav}</div>
      </div>`;
  }

  function schedaDettagli(c) {
    const b = (campo, extra) => bind('campagna', c.id, campo, extra);
    const ss = sessioniDi(c.id);
    return `<div class="modulo">
        <label>Nome<input id="nome-campagna" value="${esc(c.nome)}" ${b('nome', 'data-ridisegna')}></label>
        <label>Regolamento<select ${b('regolamentoId', 'data-ridisegna')}>${opzioni(S.regolamenti.map((r) => [r.id, r.nome]), c.regolamentoId)}</select></label>
        <label>Master<input value="${esc(c.master || '')}" ${b('master')}></label>
        <label>Stato<select ${b('stato', 'data-ridisegna')}>${opzioni(STATI.map((s) => [s, s]), c.stato)}</select></label>
        <label class="largo">Descrizione, ambientazione, appunti<textarea rows="10" ${b('descrizione')}>${esc(c.descrizione || '')}</textarea></label>
      </div>
      <p class="muto">Cambiando regolamento i valori già inseriti nelle schede restano, ma compaiono solo i campi con lo stesso nome.</p>
      <div class="zona-pericolo"><button class="pericolo" data-azione="elimina-campagna" data-id="${c.id}">Elimina campagna</button>
        <span class="muto">Elimina anche ${ss.length} sessioni e ${personaggiDi(c.id).length} personaggi.</span></div>`;
  }

  function vistaSessione(id, modifica, evidenziato) {
    const s = sessione(id);
    if (!s) return nonTrovato();
    const c = campagna(s.campagnaId);
    const pers = personaggiDi(s.campagnaId);
    const ss = sessioniDi(s.campagnaId);
    const i = ss.indexOf(s);
    const prec = ss[i - 1];
    const succ = ss[i + 1];
    const briciole = `<div class="briciole"><a href="#/campagne">Campagne</a> › <a href="#/campagna/${c.id}/diario">${esc(c.nome)}</a></div>`;
    if (modifica) {
      const b = (campo, extra) => bind('sessione', s.id, campo, extra);
      return `${briciole}
        <div class="riga-campi">
          <label class="stretto">N°<input type="number" value="${esc(s.numero)}" ${b('numero', 'data-tipo="numero"')}></label>
          <label class="stretto">Data<input type="date" value="${esc(s.data || '')}" ${b('data')}></label>
          <label class="largo">Titolo<input value="${esc(s.titolo || '')}" placeholder="Sessione ${esc(s.numero)}" ${b('titolo')}></label>
        </div>
        <textarea id="testo-sessione" class="editor" ${b('testo')} placeholder="Racconta cosa è successo…  Scrivi @ per citare un PNG (o crearne uno nuovo).">${esc(s.testo || '')}</textarea>
        <div class="aiuto">Scrivi <kbd>@</kbd> per citare un personaggio: compare la lista dei PNG, oppure puoi crearne uno nuovo. I nomi e gli alias dei PNG esistenti vengono riconosciuti anche senza @. Formattazione: **grassetto**, *corsivo*.</div>
        <div class="riconosciuti"><span class="muto">Personaggi riconosciuti:</span> <span id="png-riconosciuti">${chipCitati(s.testo, pers) || '<span class="muto">nessuno</span>'}</span></div>
        <div class="barra-azioni">
          <a class="bottone primario" href="#/sessione/${s.id}">Fine</a>
          <button class="pericolo" data-azione="elimina-sessione" data-id="${s.id}">Elimina sessione</button>
        </div>`;
    }
    const chip = chipCitati(s.testo, pers);
    const ignote = citazioniIgnote(s.testo, pers);
    return `${briciole}
      <header class="intest"><h1><span class="muto">#${esc(s.numero)}</span> ${esc(titoloSessione(s))}</h1>
        <div class="intest-sotto">${esc(fmtData(s.data))}</div></header>
      <div class="barra-azioni"><a class="bottone primario" href="#/sessione/${s.id}/modifica">Modifica</a>
        <button class="pericolo" data-azione="elimina-sessione" data-id="${s.id}">Elimina sessione</button></div>
      <div class="layout-sessione">
        <article class="testo-sessione">${s.testo ? renderTesto(s.testo, pers, evidenziato, c.id) : '<span class="muto">Nessun testo. Clicca Modifica per scrivere il resoconto.</span>'}</article>
        <aside class="pannello">
          <h3>In questa sessione</h3>
          <div class="chips colonna">${chip || '<span class="muto">Nessun personaggio citato.</span>'}</div>
          ${ignote.length ? `<h3>Citati ma non creati</h3><div class="chips colonna">${ignote.map((n) => `<button class="chip chip-ignoto" data-azione="crea-png-da-citazione" data-campagna="${c.id}" data-nome="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>` : ''}
        </aside>
      </div>
      <nav class="prec-succ">
        ${prec ? `<a href="#/sessione/${prec.id}">← #${esc(prec.numero)} ${esc(titoloSessione(prec))}</a>` : '<span></span>'}
        ${succ ? `<a href="#/sessione/${succ.id}">#${esc(succ.numero)} ${esc(titoloSessione(succ))} →</a>` : '<span></span>'}
      </nav>`;
  }

  function testoMod(r, v) {
    if (v === '' || v == null || isNaN(Number(v))) return '';
    v = Number(v);
    if (r.modalita === 'd20') return segno(Math.floor((v - 10) / 2));
    if (r.modalita === 'percentuale') return `½ ${Math.floor(v / 2)} · ⅕ ${Math.floor(v / 5)}`;
    return '';
  }

  // Ritratto del personaggio: immagine salvata (piccola, dentro i dati) o iniziali come segnaposto
  const iniziali = (nome) => String(nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || '?';
  const ritratto = (p) => (p.immagine && /^data:image\/(jpeg|png|webp);base64,/.test(p.immagine)
    ? `<img src="${p.immagine}" alt="">`
    : `<span class="ritratto-iniziali">${esc(iniziali(p.nome))}</span>`);
  // Riduce l'immagine scelta (lato lungo 256 px, JPEG) per non appesantire il file dei dati
  function riduciImmagine(file, lato = 256) {
    return new Promise((ok, ko) => {
      const lettore = new FileReader();
      lettore.onerror = () => ko(new Error('Impossibile leggere il file'));
      lettore.onload = () => {
        const img = new Image();
        img.onerror = () => ko(new Error('Il file non è un\'immagine valida'));
        img.onload = () => {
          const s = Math.min(1, lato / Math.max(img.width, img.height));
          const tela = document.createElement('canvas');
          tela.width = Math.max(1, Math.round(img.width * s));
          tela.height = Math.max(1, Math.round(img.height * s));
          const g = tela.getContext('2d');
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, tela.width, tela.height);
          g.drawImage(img, 0, 0, tela.width, tela.height);
          ok(tela.toDataURL('image/jpeg', 0.85));
        };
        img.src = lettore.result;
      };
      lettore.readAsDataURL(file);
    });
  }

  // Ritratto: l'immagine scelta si adatta da sola al cerchio (riempie il riquadro, privilegiando la parte alta dove di
  // solito c'è il viso); un'anteprima permette di spostarla e ingrandirla prima di confermare. Risultato: JPEG quadrato.
  function caricaImmagineFile(file) {
    return new Promise((ok, ko) => {
      const lettore = new FileReader();
      lettore.onerror = () => ko(new Error('Impossibile leggere il file'));
      lettore.onload = () => {
        const img = new Image();
        img.onerror = () => ko(new Error('Il file non è un\'immagine valida'));
        img.onload = () => ok(img);
        img.src = lettore.result;
      };
      lettore.readAsDataURL(file);
    });
  }
  function regolaRitratto(img, lato = 320) {
    return new Promise((fine) => {
      const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
      const V = 260; // lato dell'anteprima in pixel
      const base = V / Math.min(W, H); // scala minima: l'immagine copre tutto il cerchio
      // Posizione automatica: centrata in orizzontale; in verticale, per le immagini alte, verso l'alto (testa)
      const st = { zoom: 1, x: 0, y: 0 };
      const misura = () => ({ w: W * base * st.zoom, h: H * base * st.zoom });
      const limita = () => { const m = misura(); st.x = Math.min(0, Math.max(V - m.w, st.x)); st.y = Math.min(0, Math.max(V - m.h, st.y)); };
      const automatico = () => {
        st.zoom = 1;
        const m = misura();
        st.x = (V - m.w) / 2;
        st.y = m.h > V * 1.05 ? -Math.min(m.h - V, m.h * 0.06) : (V - m.h) / 2;
        limita();
      };
      automatico();
      const fondo = document.createElement('div');
      fondo.className = 'rit-fondo';
      fondo.innerHTML = `<div class="rit-finestra" role="dialog" aria-label="Adatta l'immagine del personaggio">
          <h3>Adatta l'immagine</h3>
          <div class="rit-anteprima" style="width:${V}px;height:${V}px"><img alt="" draggable="false"><div class="rit-cerchio"></div></div>
          <label class="rit-zoom">🔍 <input type="range" min="1" max="4" step="0.01" value="1" aria-label="Ingrandimento"></label>
          <p class="muto rit-aiuto">Trascina l'immagine per spostarla; usa la barra (o la rotellina) per ingrandire. Conta quello che sta nel cerchio.</p>
          <div class="rit-comandi"><button type="button" data-rit="auto">↺ Adatta di nuovo</button><span></span>
            <button type="button" data-rit="annulla">Annulla</button><button type="button" class="primario" data-rit="usa">Usa questa immagine</button></div>
        </div>`;
      document.body.appendChild(fondo);
      const vista = fondo.querySelector('.rit-anteprima');
      const immagine = vista.querySelector('img');
      immagine.src = img.src;
      const barra = fondo.querySelector('input[type=range]');
      const disegna = () => { const m = misura(); Object.assign(immagine.style, { width: `${m.w}px`, height: `${m.h}px`, transform: `translate(${st.x}px, ${st.y}px)` }); barra.value = st.zoom; };
      // Ingrandisce mantenendo fermo il punto (cx, cy) dell'anteprima
      const ingrandisci = (z, cx = V / 2, cy = V / 2) => {
        const prima = misura();
        const px = (cx - st.x) / prima.w, py = (cy - st.y) / prima.h;
        st.zoom = Math.min(4, Math.max(1, z));
        const dopo = misura();
        st.x = cx - px * dopo.w; st.y = cy - py * dopo.h;
        limita(); disegna();
      };
      disegna();
      let presa = null;
      vista.addEventListener('pointerdown', (e) => { presa = { x: e.clientX - st.x, y: e.clientY - st.y }; vista.setPointerCapture(e.pointerId); e.preventDefault(); });
      vista.addEventListener('pointermove', (e) => { if (!presa) return; st.x = e.clientX - presa.x; st.y = e.clientY - presa.y; limita(); disegna(); });
      vista.addEventListener('pointerup', () => { presa = null; });
      vista.addEventListener('pointercancel', () => { presa = null; });
      vista.addEventListener('wheel', (e) => { e.preventDefault(); const r = vista.getBoundingClientRect(); ingrandisci(st.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      barra.addEventListener('input', () => ingrandisci(Number(barra.value)));
      const chiudi = (valore) => { document.removeEventListener('keydown', tasti); fondo.remove(); fine(valore); };
      const tasti = (e) => { if (e.key === 'Escape') chiudi(null); if (e.key === 'Enter') usa(); };
      const usa = () => {
        // Ritaglio: la parte visibile nell'anteprima, riportata alle misure originali
        const k = 1 / (base * st.zoom);
        const tela = document.createElement('canvas');
        tela.width = lato; tela.height = lato;
        const g = tela.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, lato, lato);
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, -st.x * k, -st.y * k, V * k, V * k, 0, 0, lato, lato);
        chiudi(tela.toDataURL('image/jpeg', 0.88));
      };
      document.addEventListener('keydown', tasti);
      fondo.addEventListener('click', (e) => {
        const b = e.target.closest('[data-rit]');
        if (e.target === fondo) chiudi(null);
        if (!b) return;
        e.stopPropagation();
        if (b.dataset.rit === 'auto') { automatico(); disegna(); }
        if (b.dataset.rit === 'annulla') chiudi(null);
        if (b.dataset.rit === 'usa') usa();
      });
      fondo.querySelector('[data-rit="usa"]').focus();
    });
  }

  // Iniziativa in evidenza nell'intestazione di ogni scheda: valore calcolato dalla scheda automatica
  // (si aggiorna da solo) o, per i regolamenti senza scheda automatica, un bonus scritto a mano; sempre tirabile
  function bloccoIniziativa(p, r) {
    const sg = (v) => (Number(v) >= 0 ? '+' : '') + Number(v || 0);
    const dado = (azione, tiro) => `<button class="btn-dado" data-azione="${azione}" data-id="${p.id}" data-tiro="${tiro}" title="Tira l'iniziativa">🎲</button>`;
    let valore, tasto, nota = '';
    try {
      if (r.scheda === 'pf1') { valore = `<span data-calc="init">${esc(sg(pf1.iniziativa(p)))}</span>`; tasto = dado('pf1-tira', 'init'); }
      else if (r.scheda === 'sf') { valore = `<span data-sfcalc="iniz">${esc(sg(sf.calcola(p).iniz))}</span>`; tasto = dado('sf-tira', 'iniz'); }
      else if (r.scheda === 'dnd') { valore = `<span data-dndcalc="iniz">${esc(sg(dnd.infoCombattimento(p).modIniz))}</span>`; tasto = dado('dnd-tira', 'iniz'); }
      else if (r.scheda === 'pf2') { valore = `<span data-pf2calc="perc">${esc(sg(pf2.infoCombattimento(p).modIniz))}</span>`; tasto = dado('pf2-tira', 'iniz'); nota = 'con la Percezione'; }
    } catch { valore = null; }
    if (valore == null) {
      valore = `<input type="number" class="intest-iniz-in" value="${esc(p.iniziativa ?? '')}" placeholder="+0" ${bind('personaggio', p.id, 'iniziativa', 'data-tipo="numero"')} aria-label="Bonus di iniziativa">`;
      tasto = `<button class="btn-dado" data-azione="tira-iniziativa" data-id="${p.id}" title="Tira l'iniziativa">🎲</button>`;
      nota = 'bonus';
    }
    return `<div class="intest-iniz" title="Iniziativa${nota ? ` (${nota})` : ''}"><span class="intest-iniz-et">Iniziativa</span><b class="intest-iniz-val">${valore}</b>${tasto}${nota ? `<small class="muto">${esc(nota)}</small>` : ''}</div>`;
  }

  // Scheda di un mostro della campagna: collegamento al bestiario e statistiche principali
  function pannelloMostro(p, c) {
    const sis = c ? pf1.sistemaDi(c) : '';
    const m = c ? pf1.mostroDi(p.mostro || p.nome, c) : null;
    const bestiario = c ? pf1.bestiario(c) : [];
    const ts = m && Array.isArray(m[13]) ? m[13] : null;
    const voce = (et, v) => (v === '' || v == null ? '' : `<div class="mostro-voce"><span class="muto">${et}</span><b>${esc(v)}</b></div>`);
    // Mostro personalizzato (regole di Creazione Mostri, solo Pathfinder 1)
    if (p.creatoMostro && sis === 'pf1') {
      return `<section class="pannello" data-blocco="bestiario"><h3>🛠 Mostro personalizzato</h3>
        <div class="pf-riga"><input type="number" class="mini mostro-qta" min="1" max="30" value="1" aria-label="Quanti">
          <button class="btn-piccolo" data-azione="mostro-scontro" data-id="${p.id}">⚔ Allo scontro</button>
          <button class="btn-mini" data-azione="inc-info-mostro" data-nome="${esc(p.nome)}" data-sistema="pf1" title="Blocco statistiche">i</button>
          <button class="btn-piccolo pericolo-lieve" data-azione="mc-elimina" data-id="${p.id}" title="Torna a collegarlo al bestiario">Togli le statistiche create</button></div>
        ${pf1.editorMostro(p)}
      </section>`;
    }
    return `<section class="pannello" data-blocco="bestiario"><h3>👹 Bestiario</h3>
      ${sis === 'pf1' ? `<div class="pf-riga"><button class="btn-piccolo" data-azione="mc-crea" data-id="${p.id}" title="Statistiche costruite con le regole di Creazione Mostri del wiki">🛠 Crea le statistiche con le regole di Creazione Mostri</button></div>` : ''}
      <div class="pf-riga">
        <label>Mostro del bestiario <input value="${esc(p.mostro || '')}" ${bind('personaggio', p.id, 'mostro', 'data-ridisegna list="bestiario-mostro"')} placeholder="${bestiario.length ? `scegli tra ${bestiario.length} (es. Goblin)` : 'nessun bestiario per questo regolamento'}"></label>
        ${m ? `<button class="btn-mini" data-azione="inc-info-mostro" data-nome="${esc(m[0])}" data-sistema="${esc(sis)}" title="Blocco statistiche dal wiki">i</button>` : ''}
        <input type="number" class="mini mostro-qta" min="1" max="30" value="1" aria-label="Quanti">
        <button class="btn-piccolo" data-azione="mostro-scontro" data-id="${p.id}">⚔ Allo scontro</button>
      </div>
      ${bestiario.length ? `<datalist id="bestiario-mostro">${bestiario.map((x) => `<option value="${esc(x[0])}">`).join('')}</datalist>` : ''}
      ${m ? `<div class="mostro-griglia">
          ${voce(sis === 'pf2' ? 'Livello' : 'GS', m[1])}${sis === 'pf2' ? '' : voce('PE', m[2])}${voce('Tipo', `${m[4] || ''} ${m[3] || ''}`.trim())}
          ${voce('CA', m[8])}${voce('PF', m[11])}${voce('Iniziativa', typeof m[6] === 'number' ? (m[6] >= 0 ? '+' : '') + m[6] : m[6])}
          ${ts ? voce('Tiri salvezza', ts.map((v) => (v == null ? '—' : (v >= 0 ? '+' : '') + v)).join(' / ')) : ''}${voce('Velocità', m[15])}
        </div>` : `<p class="muto pf-aiuto">${p.mostro ? 'Non trovato nel bestiario: controlla il nome.' : 'Collega un mostro del bestiario per vederne le statistiche e mandarlo nello scontro già pronto; altrimenti scrivi le sue caratteristiche nelle note.'}</p>`}
    </section>`;
  }

  function vistaPersonaggio(id) {
    const p = personaggio(id);
    if (!p) return nonTrovato();
    const c = campagna(p.campagnaId);
    const r = regDi(p);
    const tira = r.modalita !== 'nessuna';
    const b = (campo, extra = '') => bind('personaggio', p.id, campo, extra);
    const bs = (sez, chiave, extra = '') => `data-bind="personaggio" data-id="${p.id}" data-sez="${sez}" data-chiave="${esc(chiave)}" ${extra}`;

    const schedaPf1 = r.scheda === 'pf1';
    const schedaSf = r.scheda === 'sf';
    const schedaDnd = r.scheda === 'dnd';
    const schedaPf2 = r.scheda === 'pf2';
    const campi = r.campi.filter((k) => (!schedaPf1 || !pf1.CAMPI_CALCOLATI.has(k)) && (!schedaSf || !sf.CAMPI_CALCOLATI.has(k)) && (!schedaDnd || !dnd.CAMPI_CALCOLATI.has(k)) && (!schedaPf2 || !pf2.CAMPI_CALCOLATI.has(k))).map((k) => `<label>${esc(k)}<input value="${esc(valore(p, 'campi', k))}" ${bs('campi', k)}></label>`).join('');
    const car = r.caratteristiche.map((k) => {
      const v = valore(p, 'caratteristiche', k.sigla, k.predefinito);
      return `<div class="car">
        <div class="car-sigla" title="${esc(k.nome)}">${esc(k.sigla)}</div>
        <input type="number" value="${esc(v)}" ${bs('caratteristiche', k.sigla, 'data-tipo="numero"')} aria-label="${esc(k.nome)}">
        <div class="car-mod" data-mod="${esc(k.sigla)}">${testoMod(r, v)}</div>
        <div class="car-nome">${esc(k.nome)}</div>
        ${tira ? `<button class="btn-dado" data-azione="tira-car" data-id="${p.id}" data-chiave="${esc(k.sigla)}" title="Tira ${esc(k.nome)}">🎲</button>` : ''}
      </div>`;
    }).join('');
    const ris = r.risorse.map((k) => {
      const att = p.risorse?.[k.nome]?.attuale ?? '';
      const max = p.risorse?.[k.nome]?.max ?? k.max ?? '';
      return `<div class="risorsa"><span>${esc(k.nome)}</span>
        <input type="number" value="${esc(att)}" ${bs('risorse', k.nome, 'data-sub="attuale" data-tipo="numero"')} aria-label="${esc(k.nome)} attuali">
        <span class="muto">/</span>
        <input type="number" value="${esc(max)}" ${bs('risorse', k.nome, 'data-sub="max" data-tipo="numero"')} aria-label="${esc(k.nome)} massimi"></div>`;
    }).join('');
    const sceltaAttr = r.modalita === 'pool' && r.caratteristiche.length
      ? `<label class="in-linea">Somma all'attributo <select id="attributo-riserva">${opzioni(r.caratteristiche.map((k) => [k.sigla, k.nome]), attributoRiserva || r.caratteristiche[0].sigla)}</select></label>` : '';
    const abil = r.abilita.map((a) => `<div class="abilita">
        <span class="abil-nome">${esc(a.nome)}${a.car ? ` <small class="muto">${esc(a.car)}</small>` : ''}</span>
        <input type="number" value="${esc(valore(p, 'abilita', a.nome, a.predefinito))}" ${bs('abilita', a.nome, 'data-tipo="numero"')} aria-label="${esc(a.nome)}">
        ${tira ? `<button class="btn-dado" data-azione="tira-abil" data-id="${p.id}" data-chiave="${esc(a.nome)}" title="Tira ${esc(a.nome)}">🎲</button>` : ''}
      </div>`).join('');

    const app = apparizioni(p);
    const listaApp = app.map(({ s, n, prima }) => `<a class="voce-app" href="#/sessione/${s.id}?evidenzia=${p.id}">
        <div class="voce-app-testa"><b>#${esc(s.numero)} ${esc(titoloSessione(s))}</b> <span class="muto">${esc(fmtData(s.data))}${n > 1 ? ` · citato ${n} volte` : ''}</span></div>
        <div class="voce-app-estratto">${estratto(s.testo, prima.i, prima.l)}</div>
      </a>`).join('');

    return `<div class="briciole"><a href="#/campagne">Campagne</a> › <a href="#/campagna/${c?.id}/personaggi">${esc(c?.nome || '')}</a></div>
      <header class="intest intest-ritratto">
        <div class="ritratto-box">
          <button class="ritratto ritratto-grande" data-azione="ritratto-carica" data-id="${p.id}" title="${p.immagine ? 'Cambia immagine' : 'Aggiungi un\'immagine del personaggio'}">${ritratto(p)}</button>
          ${p.immagine ? `<button class="btn-mini ritratto-togli" data-azione="ritratto-togli" data-id="${p.id}" title="Togli l'immagine">×</button>` : ''}
        </div>
        <div class="intest-nome"><h1><span data-titolo="personaggio:${p.id}">${esc(p.nome)}</span> <span class="badge ${p.tipo === 'PG' ? 'badge-pg' : ''}">${esc(p.tipo)}</span> <button class="btn-cestino" data-azione="pg-esporta" data-id="${p.id}" title="Salva il file della scheda (da mandare al giocatore o da importare altrove)">📤</button> <button class="btn-cestino" data-azione="elimina-personaggio" data-id="${p.id}" title="Elimina il personaggio">🗑</button></h1>
        ${(() => {
          // Riga d'identità: razza/stirpe, classi e livello dalla scheda automatica (o dai campi di testo)
          const k = p.campi || {};
          const sch = p.pf1 || p.sf || p.dnd;
          const classiSch = r.scheda !== 'pf2' && sch?.classi?.filter((x) => x.nome).map((x) => `${x.nome} ${x.livello}`).join(' / ');
          const razza = r.scheda === 'pf2' ? [p.pf2?.stirpe, p.pf2?.lignaggio].filter(Boolean).join(', ') : sch?.razza?.nome || k['Specie / Razza'] || k.Razza || k.Ascendenza || '';
          const classe = r.scheda === 'pf2' ? (p.pf2?.classe ? `${p.pf2.classe} ${p.pf2.livello}` : '') : classiSch || k.Classe || '';
          const liv = k.Livello && classe && !/\d/.test(classe) ? `livello ${k.Livello}` : '';
          const id = [razza, [classe, liv].filter(Boolean).join(' · ')].filter(Boolean).join(' · ');
          return id ? `<div class="intest-identita">${esc(id)}</div>` : '';
        })()}
        <div class="intest-sotto">${esc(r.nome)}${app.length ? ` · citato in ${app.length} session${app.length === 1 ? 'e' : 'i'}` : ''}</div></div>
        ${bloccoIniziativa(p, r)}</header>
      <div class="layout-scheda">
        <div class="colonna-scheda">
          <section class="pannello" data-blocco="dati">
            <h3>Dati</h3>
            <div class="modulo">
              <label>Nome<input value="${esc(p.nome)}" ${b('nome', 'data-ridisegna')}></label>
              <label>Tipo<select ${b('tipo', 'data-ridisegna')}>${opzioni([['PG', 'PG'], ['PNG', 'PNG'], ['Mostro', 'Mostro']], p.tipo)}</select></label>
              ${p.tipo === 'PG' ? `<label>Giocatore<input value="${esc(p.giocatore || '')}" ${b('giocatore')}></label>` : `<label>Ruolo / chi è<input value="${esc(p.ruolo || '')}" placeholder="es. oste della Volpe Zoppa" ${b('ruolo')}></label>`}
              <label><span>Alias <small class="muto">(separati da virgola)</small></span><input value="${esc(p.alias || '')}" placeholder="es. il Rosso, Gerry" ${b('alias', 'data-ridisegna')}></label>
              ${campi}
            </div>
          </section>
          ${p.tipo === 'Mostro' ? pannelloMostro(p, c) : schedaPf1 ? pf1.vistaScheda(p, r) : schedaSf ? sf.vistaScheda(p, r) : schedaDnd ? dnd.vistaScheda(p, r) : schedaPf2 ? pf2.vistaScheda(p, r) : `
          ${r.caratteristiche.length ? `<section class="pannello" data-blocco="caratteristiche"><h3>Caratteristiche</h3><div class="griglia-car">${car}</div></section>` : ''}
          ${r.risorse.length ? `<section class="pannello" data-blocco="risorse"><h3>Risorse</h3><div class="griglia-risorse">${ris}</div></section>` : ''}
          ${r.abilita.length ? `<section class="pannello" data-blocco="abilita"><div class="pannello-testa"><h3>Abilità</h3>${sceltaAttr}</div><div class="griglia-abil">${abil}</div></section>` : ''}`}
          <section class="pannello" data-blocco="note"><h3>Note</h3><textarea rows="8" ${b('note')} placeholder="Aspetto, motivazioni, segreti, equipaggiamento…">${esc(p.note || '')}</textarea></section>
          <section class="pannello doc-pg" data-blocco="documenti"><h3>📜 Documenti di ${esc(p.nome)}${p.documenti?.length ? ` <small class="muto">${p.documenti.length}</small>` : ''}</h3>
            ${libroPagine(`personaggio:${p.id}`, docAperto[p.id], `<div class="lore-vuota doc-vuota"><div class="lore-vuota-icona">📜</div>
              <p>Il background, il diario, le lettere o i segreti di questo personaggio: importa i documenti — <b>PDF</b>, <b>Word (.docx)</b> o <b>.doc</b> — e diventano pagine leggibili qui, con lo stile del programma. Valgono solo per questo personaggio.</p></div>`)}
          </section>
          <div class="zona-pericolo"><button class="pericolo" data-azione="elimina-personaggio" data-id="${p.id}">Elimina personaggio</button></div>
        </div>
        <aside class="pannello colonna-app">
          <h3>Apparizioni nel diario</h3>
          ${app.length ? listaApp : '<p class="muto">Non ancora citato in nessuna sessione. Nel diario scrivi <b>@</b> e il suo nome, oppure usa semplicemente il nome: viene riconosciuto in automatico.</p>'}
        </aside>
      </div>`;
  }

  const serializza = {
    campi: (r) => r.campi.join('\n'),
    caratteristiche: (r) => r.caratteristiche.map((k) => [k.sigla, k.nome, k.predefinito].join(' | ')).join('\n'),
    abilita: (r) => r.abilita.map((a) => [a.nome, a.car, a.predefinito].join(' | ').replace(/( \| )+$/, '')).join('\n'),
    risorse: (r) => r.risorse.map((k) => (k.max === '' || k.max == null ? k.nome : `${k.nome} | ${k.max}`)).join('\n'),
  };
  const righe = (t) => String(t).split('\n').map((x) => x.trim()).filter(Boolean);
  const pezzi = (riga) => riga.split('|').map((x) => x.trim());
  const num = (v) => (v === undefined || v === '' || isNaN(Number(v)) ? '' : Number(v));
  const analizza = {
    campi: (t) => righe(t),
    caratteristiche: (t) => righe(t).map((x) => { const [sigla, nome, pred] = pezzi(x); return { sigla, nome: nome || sigla, predefinito: num(pred) }; }),
    abilita: (t) => righe(t).map((x) => { const [nome, car, pred] = pezzi(x); return { nome, car: car || '', predefinito: num(pred) }; }),
    risorse: (t) => righe(t).map((x) => { const [nome, max] = pezzi(x); return { nome, max: num(max) }; }),
  };

  function vistaRegolamenti() {
    const schede = S.regolamenti.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((r) => {
      const n = S.campagne.filter((c) => c.regolamentoId === r.id).length;
      return `<a class="scheda" href="#/regolamento/${r.id}">
        <div class="scheda-titolo">${esc(r.nome)}</div>
        <div class="scheda-sotto">${esc(r.descrizione || MODALITA[r.modalita] || '')}</div>
        <div class="scheda-num">${r.caratteristiche.length} caratteristiche · ${r.abilita.length} abilità · usato in <b>${n}</b> campagn${n === 1 ? 'a' : 'e'}</div>
      </a>`;
    }).join('');
    return `<header class="intest"><h1>Regolamenti</h1>
        <div class="intest-sotto">Ogni regolamento definisce i campi della scheda e come si tirano i dadi dalla scheda.</div></header>
      <div class="barra-azioni"><button class="primario" data-azione="nuovo-regolamento">+ Nuovo regolamento</button></div>
      <div class="griglia">${schede}</div>`;
  }

  function vistaRegolamento(id) {
    const r = regolamento(id);
    if (!r) return nonTrovato();
    const b = (campo, extra) => bind('regolamento', r.id, campo, extra);
    const usato = S.campagne.filter((c) => c.regolamentoId === r.id);
    const area = (lista, titolo, formato, righeN = 8) => `<label class="largo">${titolo} <small class="muto">— una per riga: ${formato}</small>
        <textarea rows="${righeN}" class="mono" data-bind="regolamento" data-id="${r.id}" data-lista="${lista}">${esc(serializza[lista](r))}</textarea></label>`;
    return `<div class="briciole"><a href="#/regolamenti">Regolamenti</a></div>
      <header class="intest"><h1><span data-titolo="regolamento:${r.id}">${esc(r.nome)}</span></h1></header>
      <div class="modulo">
        <label>Nome<input value="${esc(r.nome)}" ${b('nome', 'data-ridisegna')}></label>
        <label>Dado tipico<input value="${esc(r.dado || '')}" placeholder="es. 1d20" ${b('dado')}></label>
        <label class="largo">Descrizione<input value="${esc(r.descrizione || '')}" ${b('descrizione')}></label>
        <label class="largo">Tiri dalla scheda<select ${b('modalita')}>${opzioni(Object.entries(MODALITA), r.modalita)}</select></label>
        <label class="largo">Tipo di scheda<select ${b('scheda', 'data-ridisegna')}>${opzioni([['', 'Generica (campi liberi)'], ['pf1', 'Pathfinder 1ª ed. — calcoli automatici']], r.scheda || '')}</select></label>
        ${area('campi', 'Campi della scheda', 'nome del campo', 6)}
        ${area('caratteristiche', 'Caratteristiche', 'SIGLA | Nome | valore iniziale')}
        ${area('abilita', 'Abilità', 'Nome | SIGLA caratteristica | valore iniziale', 12)}
        ${area('risorse', 'Risorse (punti ferita, sanità…)', 'Nome | massimo iniziale', 5)}
        <label class="largo">Appunti sulle regole<textarea rows="10" ${b('note')}>${esc(r.note || '')}</textarea></label>
      </div>
      <p class="muto">I valori delle schede sono collegati per nome: se rinomini una voce, i valori già inseriti con il vecchio nome non vengono più mostrati.</p>
      <p>${usato.length ? `Usato da: ${usato.map((c) => `<a href="#/campagna/${c.id}/diario">${esc(c.nome)}</a>`).join(', ')}` : '<span class="muto">Non usato da nessuna campagna.</span>'}</p>
      <div class="zona-pericolo">
        <button data-azione="duplica-regolamento" data-id="${r.id}">Duplica</button>
        <button class="pericolo" data-azione="elimina-regolamento" data-id="${r.id}">Elimina regolamento</button>
      </div>`;
  }

  function vistaDadi() {
    const rapidi = [4, 6, 8, 10, 12, 20, 100].map((f) => `<button data-azione="tiro-rapido" data-espr="1d${f}">d${f}</button>`).join('');
    const preset = [['2d20kh1', 'Vantaggio'], ['2d20kl1', 'Svantaggio'], ['4d6kh3', 'Caratteristica 4d6'], ['5d10>=6', 'Riserva 5d10'], ['1d100', 'Percentuale']]
      .map(([e, t]) => `<button data-azione="tiro-rapido" data-espr="${e}" title="${e}">${t}</button>`).join('');
    return `<header class="intest"><h1>Tiradadi</h1></header>
      <form class="riga-form" data-form="tiro" autocomplete="off">
        <input id="espr-dado" name="espr" placeholder="es. 2d6+3 · 1d20+5 · 2d20kh1 · 6d10>=6 · d%" value="${esc(S.tiri[0]?.espr || '')}" required>
        <input name="etichetta" placeholder="Etichetta (facoltativa)">
        <button class="primario">Tira</button>
      </form>
      <div class="dadi-rapidi">${rapidi}<span class="separatore"></span>${preset}</div>
      <details class="aiuto"><summary>Notazione</summary>
        <p><code>2d6+3</code> somma dadi e costanti · <code>d%</code> equivale a <code>d100</code> · <code>4d6kh3</code> tiene i 3 più alti (<code>kl</code> i più bassi) · <code>6d10>=6</code> conta i successi (riserve alla Vampiri).</p>
      </details>
      <div class="pannello-testa"><h2>Cronologia</h2>${S.tiri.length ? '<button class="btn-piccolo" data-azione="svuota-tiri">Svuota</button>' : ''}</div>
      <div class="cronologia">${S.tiri.map((t) => htmlTiro(t)).join('') || '<p class="muto">Nessun tiro ancora.</p>'}</div>`;
  }

  function vistaCerca(q) {
    return `<header class="intest"><h1>Ricerca</h1>
        <div class="intest-sotto">Cerca in tutte le campagne: personaggi (nome, alias, ruolo, note), diari delle sessioni e pagine della lore.</div></header>
      <input id="cerca-pagina" type="search" class="filtro grande" placeholder="Nome di un PNG, un luogo, un oggetto…" value="${esc(q)}">
      <div id="risultati-cerca">${risultatiCerca(q)}</div>`;
  }

  function risultatiCerca(q) {
    const qn = norm(q.trim());
    if (qn.length < 2) return '<p class="muto">Scrivi almeno 2 caratteri.</p>';
    const trova = (testo) => norm(testo).indexOf(qn);
    const marca = (testo) => {
      const n = norm(testo);
      let out = '';
      let da = 0;
      let i;
      while ((i = n.indexOf(qn, da)) !== -1) { out += esc(testo.slice(da, i)) + '<mark>' + esc(testo.slice(i, i + qn.length)) + '</mark>'; da = i + qn.length; }
      return out + esc(testo.slice(da));
    };
    const pers = S.personaggi.filter((p) => trova([p.nome, p.alias, p.ruolo, p.giocatore, p.note].join(' ')) !== -1)
      .sort((a, b) => (trova(a.nome) === -1) - (trova(b.nome) === -1) || a.nome.localeCompare(b.nome));
    const htmlPers = pers.map((p) => {
      const c = campagna(p.campagnaId);
      const app = apparizioni(p);
      let dettaglio = '';
      const nota = String(p.note || '');
      const iNota = trova(nota);
      if (iNota !== -1 && trova(p.nome) === -1) {
        const da = Math.max(0, iNota - 60);
        dettaglio = `<div class="voce-app-estratto">${da > 0 ? '…' : ''}${marca(nota.slice(da, iNota + qn.length + 100).replace(/\s+/g, ' '))}…</div>`;
      }
      return `<a class="risultato" href="#/personaggio/${p.id}">
        <div><b>${marca(p.nome)}</b> <span class="badge ${p.tipo === 'PG' ? 'badge-pg' : ''}">${esc(p.tipo)}</span> ${p.alias ? `<small class="muto">(${marca(p.alias)})</small>` : ''}</div>
        <div class="muto">${esc(c?.nome || '')}${p.ruolo ? ' · ' + marca(p.ruolo) : ''} · citato in ${app.length} session${app.length === 1 ? 'e' : 'i'}</div>
        ${dettaglio}
      </a>`;
    }).join('');
    const sess = [];
    for (const s of S.sessioni) {
      const testo = ripulisci(s.testo);
      const n = norm(testo);
      let conta = 0;
      let i = n.indexOf(qn);
      const primo = i;
      while (i !== -1) { conta++; i = n.indexOf(qn, i + qn.length); }
      const nelTitolo = trova(titoloSessione(s)) !== -1;
      if (conta || nelTitolo) sess.push({ s, conta, primo, testo });
    }
    sess.sort((a, b) => b.conta - a.conta || String(b.s.data).localeCompare(String(a.s.data)));
    const htmlSess = sess.map(({ s, conta, primo, testo }) => {
      const c = campagna(s.campagnaId);
      let estr = '';
      if (primo !== -1) {
        const da = Math.max(0, primo - 80);
        const a = Math.min(testo.length, primo + qn.length + 140);
        estr = `<div class="voce-app-estratto">${da > 0 ? '…' : ''}${marca(testo.slice(da, a).replace(/\s+/g, ' '))}${a < testo.length ? '…' : ''}</div>`;
      }
      return `<a class="risultato" href="#/sessione/${s.id}">
        <div><b>#${esc(s.numero)} ${marca(titoloSessione(s))}</b> <span class="muto">· ${esc(c?.nome || '')} · ${esc(fmtData(s.data))}${conta > 1 ? ` · ${conta} occorrenze` : ''}</span></div>
        ${estr}
      </a>`;
    }).join('');
    // Pagine della lore: titolo e testo
    const lore = [];
    for (const c of S.campagne) {
      for (const pg of c.lore || []) {
        const testo = testoLore(pg);
        const n = norm(testo);
        let conta = 0;
        let i = n.indexOf(qn);
        const primo = i;
        while (i !== -1) { conta++; i = n.indexOf(qn, i + qn.length); }
        const nelTitolo = trova(pg.titolo || '') !== -1;
        if (conta || nelTitolo) lore.push({ c, pg, conta, primo, testo, nelTitolo });
      }
    }
    // Documenti dei personaggi: stessi risultati, con il nome del personaggio
    for (const pers of S.personaggi) {
      for (const pg of pers.documenti || []) {
        const testo = testoLore(pg);
        const n = norm(testo);
        let conta = 0;
        let i = n.indexOf(qn);
        const primo = i;
        while (i !== -1) { conta++; i = n.indexOf(qn, i + qn.length); }
        const nelTitolo = trova(pg.titolo || '') !== -1;
        if (conta || nelTitolo) lore.push({ c: { id: '', nome: `documenti di ${pers.nome}` }, pers, pg, conta, primo, testo, nelTitolo });
      }
    }
    lore.sort((a, b) => b.nelTitolo - a.nelTitolo || b.conta - a.conta);
    const htmlLore = lore.map(({ c, pers, pg, conta, primo, testo }) => {
      let estr = '';
      if (primo !== -1) {
        const da = Math.max(0, primo - 80);
        const a = Math.min(testo.length, primo + qn.length + 140);
        estr = `<div class="voce-app-estratto">${da > 0 ? '…' : ''}${marca(testo.slice(da, a))}${a < testo.length ? '…' : ''}</div>`;
      }
      return `<a class="risultato" href="${pers ? `#/personaggio/${pers.id}?doc=${pg.id}&cerca=${encodeURIComponent(q.trim())}` : `#/campagna/${c.id}/lore/${pg.id}?cerca=${encodeURIComponent(q.trim())}`}">
        <div><b>📜 ${marca(pg.titolo || 'Senza titolo')}</b> <span class="muto">· ${esc(c.nome)}${conta > 1 ? ` · ${conta} occorrenze` : ''}</span></div>
        ${estr}
      </a>`;
    }).join('');
    if (!pers.length && !sess.length && !lore.length) return `<p class="muto">Nessun risultato per «${esc(q.trim())}».</p>`;
    return `${pers.length ? `<h2>Personaggi <small class="muto">${pers.length}</small></h2><div class="lista-risultati">${htmlPers}</div>` : ''}
      ${sess.length ? `<h2>Sessioni <small class="muto">${sess.length}</small></h2><div class="lista-risultati">${htmlSess}</div>` : ''}
      ${lore.length ? `<h2>Lore e documenti <small class="muto">${lore.length}</small></h2><div class="lista-risultati">${htmlLore}</div>` : ''}`;
  }
  // Testo semplice di una pagina della lore (in memoria finché la pagina non cambia, così la ricerca resta veloce)
  const cacheTestoLore = new Map();
  function testoLore(pg) {
    const k = `${pg.id}|${pg.modificata || pg.creata || ''}|${(pg.html || '').length}`;
    if (!cacheTestoLore.has(k)) {
      const doc = new DOMParser().parseFromString(pg.html || '', 'text/html');
      // Un a capo tra i blocchi, così le parole di paragrafi diversi non si attaccano
      for (const b of doc.body.querySelectorAll('p, h1, h2, h3, h4, li, td, th, blockquote')) b.append(' ');
      cacheTestoLore.set(k, doc.body.textContent.replace(/\s+/g, ' ').trim());
    }
    return cacheTestoLore.get(k);
  }
  // Evidenzia nel testo della pagina tutte le occorrenze cercate; la prima viene portata in vista
  function evidenziaLore(radice, termine) {
    const qn = norm(termine.trim());
    if (!radice || qn.length < 2) return;
    const nodi = [];
    const w = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) nodi.push(w.currentNode);
    let primo = true;
    for (const nodo of nodi) {
      const t = nodo.nodeValue;
      const n = norm(t);
      if (n.indexOf(qn) === -1) continue;
      const frag = document.createDocumentFragment();
      let da = 0;
      let i;
      while ((i = n.indexOf(qn, da)) !== -1) {
        frag.append(t.slice(da, i));
        const m = document.createElement('mark');
        m.textContent = t.slice(i, i + qn.length);
        if (primo) { m.className = 'evidenziato'; primo = false; }
        frag.append(m);
        da = i + qn.length;
      }
      frag.append(t.slice(da));
      nodo.replaceWith(frag);
    }
  }

  // ================= Navigazione e disegno =================
  function render() {
    chiudiSuggerimenti();
    // Sessione dal vivo rimasta aperta (app riavviata): si torna ad ascoltarla
    if (!GIOCATORE && !SCHERMO && !dvM.codice && dvAttivo()) { const cv = S.campagne.find((x) => x.dalVivo?.codice); if (cv) dvMAscolta(cv); }
    const hash = location.hash.slice(1) || '/campagne';
    const [percorso, qs = ''] = hash.split('?');
    const q = new URLSearchParams(qs);
    const p = percorso.split('/').filter(Boolean);
    let html;
    if (GIOCATORE && !['personaggio', 'dadi', 'grimorio', 'breviario', 'olografico', 'astronave', 'mappa'].includes(p[0])) html = vistaGiocatore();
    else switch (p[0]) {
      case 'campagna': html = vistaCampagna(p[1], p[2], p[3]); break;
      case 'sessione': html = vistaSessione(p[1], p[2] === 'modifica', q.get('evidenzia')); break;
      case 'personaggio': {
        const pg = personaggio(p[1]);
        if (q.get('doc')) docAperto[p[1]] = q.get('doc'); // dalla ricerca: apre quel documento
        html = p[2] === 'tavolo' && pg && regDi(pg).scheda === 'pf1' ? pf1.vistaTavolo(pg, regDi(pg)) : vistaPersonaggio(p[1]);
        break;
      }
      case 'schermo': html = pf1.vistaSchermo(campagna(p[1])); break;
      case 'grimorio': html = pf1.vistaGrimorio(personaggio(p[1]), p[2]); break;
      case 'breviario': html = pf1.vistaBreviario(personaggio(p[1]), p[2]); break;
      case 'olografico': html = sf.vistaOlografico(personaggio(p[1]), p[2]); break;
      case 'astronave': html = vistaNave(p[1]); break;
      case 'mappa': html = vistaMappaGiocatore(); break;
      case 'regolamenti': html = vistaRegolamenti(); break;
      case 'regolamento': html = vistaRegolamento(p[1]); break;
      case 'dadi': html = vistaDadi(); break;
      case 'cerca': html = vistaCerca(q.get('q') || ''); break;
      case 'impostazioni': html = vistaImpostazioni(); break;
      default: html = vistaCampagne();
    }
    // Tema grafico della campagna aperta: sci-fi tecnologico per Starfinder, rovine di Thassilon per Pathfinder 1, grimorio arcano per D&D 5e, fantasy per il resto
    const cid = p[0] === 'campagna' || p[0] === 'schermo' ? p[1] : p[0] === 'sessione' ? sessione(p[1])?.campagnaId : p[0] === 'personaggio' ? personaggio(p[1])?.campagnaId : p[0] === 'astronave' ? nave(p[1])?.campagnaId : null;
    const cTema = cid ? campagna(cid) : null;
    const schedaTema = cTema ? regolamento(cTema.regolamentoId)?.scheda : p[0] === 'regolamento' ? regolamento(p[1])?.scheda : '';
    document.body.classList.toggle('tema-sf', schedaTema === 'sf' || p[0] === 'astronave' || p[0] === 'mappa');
    document.body.classList.toggle('tema-pf1', schedaTema === 'pf1'); // Rovine di Thassilon
    document.body.classList.toggle('tema-dnd', schedaTema === 'dnd'); // Grimorio arcano
    if (GIOCATORE && p[0] === 'personaggio' && personaggio(p[1])) html = barraGiocatore(personaggio(p[1])) + html;
    // Master: PG collegato dal vivo (le modifiche fatte qui arrivano al telefono del giocatore)
    else if (!GIOCATORE && !SCHERMO && p[0] === 'personaggio' && dvM.codice && Object.values(dvM.giocatori).some((g) => g.pgId === p[1])) {
      html = `<div class="dv-avviso-master">📡 <b>Collegato dal vivo</b> (sessione ${esc(dvM.codice)}): la scheda la compila il giocatore; danni, cure, condizioni e le modifiche che fai qui arrivano subito anche al suo telefono.</div>` + html;
    }
    // Libro o breviario aperti nella stessa pagina (kit dei giocatori): pulsante per tornare alla scheda
    const libroInPagina = ['grimorio', 'breviario', 'olografico'].includes(p[0]) && !SCHERMO;
    if (libroInPagina) html = `<a class="grim-torna" href="#/personaggio/${esc(p[1] || '')}">← Torna alla scheda</a>${html}`;
    document.body.classList.toggle('modo-libro', libroInPagina);
    // Il libro cambia il titolo della finestra: uscendo si torna a quello della pagina
    if (!['grimorio', 'breviario', 'olografico'].includes(p[0])) document.title = TITOLO_PAGINA;
    document.body.classList.toggle('modo-olo', p[0] === 'olografico');
    const contenuto = $('#contenuto');
    contenuto.innerHTML = html;
    // Arrivando dalla ricerca: parola evidenziata nella pagina della lore
    if (p[0] === 'campagna' && p[2] === 'lore' && q.get('cerca')) evidenziaLore($('.lore-pagina:not(.lore-in-modifica) .lore-testo', contenuto), q.get('cerca'));
    if (p[0] === 'personaggio' && p[2] !== 'tavolo' && personaggio(p[1])) ordinaBlocchi(personaggio(p[1]), contenuto);
    // Indice laterale della scheda (non nelle finestre per i giocatori, nei libri e nella vista da tavolo)
    if (p[0] === 'personaggio' && p[2] !== 'tavolo' && !SCHERMO && personaggio(p[1])) barraSalti(contenuto);
    else { document.getElementById('salti-scheda')?.remove(); document.body.classList.remove('con-salti', 'salti-aperti'); osservaSalti?.disconnect(); }
    if (p[0] === 'personaggio' && q.get('cerca')) evidenziaLore($('.doc-pg .lore-pagina:not(.lore-in-modifica) .lore-testo', contenuto), q.get('cerca'));
    renderBarra(p);
    const nuovaPagina = hash !== ultimoHash;
    ultimoHash = hash;
    if (nuovaPagina) {
      contenuto.scrollTop = 0;
      const ev = $('.evidenziato', contenuto);
      if (ev) ev.scrollIntoView({ block: 'center' });
      if (p[0] === 'sessione' && p[2] === 'modifica') {
        const ta = $('#testo-sessione');
        if (ta && !ta.value) ta.focus();
      }
      if (p[0] === 'cerca') { const el = $('#cerca-pagina'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }

  // ---------- Copia di sicurezza online (src/copia-online.js) ----------
  // Configurazione nei dati (S.copiaOnline = { codice }): così vale su tutti i PC che usano la stessa cartella dati.
  // Nel database: backup/<impronta del codice>/ultima (aggiornata 1 minuto dopo ogni modifica), giorni/<aaaa-mm-gg>
  // (una al giorno, si tengono le ultime 7) e indice (le date presenti).
  const CO = window.CopiaOnline;
  const co = { timer: null, inCorso: false, ultima: 0, errore: '', giornoFatto: '', mostra: false, trovate: null, codiceCercato: '' };
  const GIORNI_TENUTI = 7;
  const oggi = () => new Date().toISOString().slice(0, 10);
  function programmaCopiaOnline(subito = false) {
    if (GIOCATORE || SCHERMO || !S.copiaOnline?.codice || !dvAttivo() || !CO) return;
    clearTimeout(co.timer);
    co.timer = setTimeout(caricaCopiaOnline, subito ? 0 : 60000);
  }
  async function caricaCopiaOnline() {
    if (co.inCorso || !S.copiaOnline?.codice) return;
    co.inCorso = true;
    try {
      const codice = S.copiaOnline.codice;
      const id = await CO.idDa(codice);
      const pacchetto = { ...(await CO.cifra(S, codice)), quando: DV.ORA, pc: String(statoDati?.pc || '').slice(0, 80) };
      await DV.scrivi(`backup/${id}/ultima`, pacchetto);
      const g = oggi();
      if (co.giornoFatto !== g) {
        await DV.scrivi(`backup/${id}/giorni/${g}`, pacchetto);
        const indice = [...new Set([...((await DV.leggi(`backup/${id}/indice`)) || []), g])].sort();
        for (const vecchio of indice.slice(0, Math.max(0, indice.length - GIORNI_TENUTI))) await DV.cancella(`backup/${id}/giorni/${vecchio}`);
        await DV.scrivi(`backup/${id}/indice`, indice.slice(-GIORNI_TENUTI));
        co.giornoFatto = g;
      }
      co.ultima = Date.now();
      co.errore = '';
      registra('copia online salvata');
    } catch (e) {
      co.errore = /401|403|Permission|permesso/i.test(String(e.message || e)) ? 'il database rifiuta la scrittura: vanno aggiornate le regole di Firebase (vedi sotto)' : String(e.message || e);
      registra(`copia online non riuscita: ${co.errore}`);
    } finally {
      co.inCorso = false;
      if (location.hash.startsWith('#/impostazioni')) render();
    }
  }
  function sezioneCopiaOnline() {
    if (!CO) return '';
    if (!dvAttivo()) return `<section class="pannello imp-dati"><h3>☁ Copia di sicurezza online</h3><p class="muto">Serve il database Firebase della sessione dal vivo, che qui non è configurato.</p></section>`;
    const cod = S.copiaOnline?.codice;
    const ora = (t) => new Date(t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
    const trovate = co.trovate ? `<div class="co-trovate">${co.trovate.length ? co.trovate.map((x) => `<div class="pf-riga"><b>${esc(x.nome)}</b> <span class="muto">${[x.quando ? ora(x.quando) : '', x.pc ? `da ${esc(x.pc)}` : '', x.dimensione ? `${Math.max(1, Math.round(x.dimensione / 1024))} KB di dati` : ''].filter(Boolean).join(' · ')}</span>
        <button data-azione="co-ripristina" data-quale="${esc(x.chiave)}">↩ Ripristina questa</button></div>`).join('') : '<p class="oltre">Nessuna copia trovata con questo codice.</p>'}</div>` : '';
    return `<section class="pannello imp-dati">
        <h3>☁ Copia di sicurezza online</h3>
        <p class="muto">Una copia di tutti i dati (campagne, diario, personaggi, astronavi, regolamenti) sul tuo database Firebase, <b>cifrata</b> con un codice di ripristino che hai solo tu: senza il codice nessuno può leggerla, nemmeno dalla console di Firebase. Si aggiorna da sola un minuto dopo ogni modifica, e ogni giorno ne resta una copia (le ultime ${GIORNI_TENUTI}).</p>
        ${cod ? `<p>Codice di ripristino: <b class="co-codice">${co.mostra ? esc(cod) : esc(cod.slice(0, 4)) + '-••••-••••-••••-••••-••••'}</b>
            <button class="btn-mini" data-azione="co-mostra">${co.mostra ? 'Nascondi' : 'Mostra'}</button>${co.mostra ? ' <button class="btn-mini" data-azione="co-copia">📋 Copia</button>' : ''}</p>
          <p>${co.inCorso ? '⏳ Salvataggio in corso…' : co.errore ? `<span class="oltre">⚠ Ultimo tentativo non riuscito: ${esc(co.errore)}</span>` : co.ultima ? `✅ Ultima copia alle ${new Date(co.ultima).toLocaleTimeString('it-IT')}` : 'In attesa della prossima modifica (o premi «Salva adesso»).'}</p>
          <div class="barra-azioni"><button class="primario" data-azione="co-salva">☁ Salva adesso</button><button data-azione="co-disattiva">Disattiva</button></div>
          <p class="muto pf-aiuto">Scrivi il codice su carta o in un posto sicuro fuori da questo PC: se il PC si rompe, è l'unico modo per riavere i dati. Chi ha il codice può leggere la copia.</p>`
        : `<div class="barra-azioni"><button class="primario" data-azione="co-attiva">☁ Attiva la copia online</button></div>`}
        <details class="pf-alternativi"${co.trovate ? ' open' : ''}><summary>Ripristina da una copia online</summary>
          <form class="riga-form" data-form="co-cerca" autocomplete="off"><input name="codice" placeholder="Codice di ripristino (es. K7QM-2XRA-…)" value="${esc(co.codiceCercato)}" required>
            <button>Cerca le copie</button></form>
          ${trovate}
          <p class="muto pf-aiuto">Ripristinare <b>sostituisce tutti i dati di questo PC</b> con quelli della copia: prima conviene usare «Esporta backup».</p></details>
        <details class="pf-alternativi"><summary>Regole del database (da aggiornare una volta)</summary>
          <p class="muto">Nella console di Firebase › Realtime Database › Regole, accanto a «sessioni» serve anche questo blocco (il file completo è <b>firebase-regole.json</b> nella cartella del programma):</p>
          <pre class="co-regole">"backup": {
  "$id": {
    ".read": "auth != null && $id.length === 40",
    ".write": "auth != null && $id.length === 40"
  }
}</pre></details>
      </section>`;
  }

  function vistaImpostazioni() {
    const s = statoDati;
    if (!window.gdr?.statoDati) return '<header class="intest"><h1>Impostazioni</h1></header><p class="vuoto">Le impostazioni dei dati sono disponibili solo nell\'app.</p>';
    if (!s) { window.gdr.statoDati().then((x) => { statoDati = x; render(); }); return '<p class="muto">Carico…</p>'; }
    const l = s.lucchetto;
    // App per tablet Android: i dati stanno nella memoria dell'app; tra PC e tablet passano con la copia online
    if (s.tablet) {
      return `<header class="intest"><h1>Impostazioni</h1></header>
      <section class="pannello imp-dati">
        <h3>Dove sono salvati i dati</h3>
        <p class="imp-cartella"><b>${esc(s.cartella)}</b></p>
        <p class="muto">I dati restano nell'app di questo tablet (si perdono solo disinstallandola). Per lavorare anche sul PC usa la <b>copia di sicurezza online</b> qui sotto:
          sul PC premi «Salva adesso», qui «Ripristina» con lo stesso codice (e viceversa quando torni al PC). Un dispositivo alla volta.</p>
        <p class="muto">«Esporta backup» salva un file nella cartella <b>Documenti/Cronache del Master</b> del tablet; «Importa backup» apre un file scelto da te.</p>
      </section>
      ${sezioneCopiaOnline()}`;
    }
    return `<header class="intest"><h1>Impostazioni</h1></header>
      <section class="pannello imp-dati">
        <h3>Dove sono salvati i dati</h3>
        <p class="imp-cartella"><b>${esc(s.cartella)}</b></p>
        <p class="muto">${s.locale ? 'Cartella locale di questo PC: i dati si vedono solo qui.' : 'Cartella scelta da te: se è dentro Google Drive, i dati si sincronizzano su tutti i PC che la usano.'}
          ${s.usaLocale ? '<br><span class="oltre">La cartella scelta non era raggiungibile: in questa sessione stai usando i dati locali.</span>' : ''}</p>
        <div class="barra-azioni">
          <button class="primario" data-azione="dati-cambia" data-modo="scegli" ${s.solaLettura ? 'disabled' : ''}>☁ Scegli una cartella (es. Google Drive)…</button>
          ${!s.locale ? `<button data-azione="dati-cambia" data-modo="locale" ${s.solaLettura ? 'disabled' : ''}>Torna alla cartella locale</button>` : ''}
          <button data-azione="apri-cartella">Apri la cartella</button>
        </div>
        <p class="muto pf-aiuto">Scegliendo una cartella nuova, i dati di questo PC vengono copiati lì (anche la musica). Se la cartella contiene già i dati salvati da un altro PC, puoi usare quelli. Sugli altri PC scegli la stessa cartella: troverai le stesse campagne.</p>
      </section>
      <section class="pannello imp-dati">
        <h3>Kit per i giocatori</h3>
        <p class="muto">Una versione ridotta dell'app che i giocatori aprono nel browser (Chrome o Edge), senza installare nulla: creano il personaggio con le stesse schede automatiche e ti mandano il file, che importi dalla scheda <b>Personaggi</b> della campagna (📥 Importa la scheda di un giocatore).</p>
        <div class="barra-azioni"><button class="primario" data-azione="kit-crea">🎁 Crea il kit per i giocatori…</button>
          <button data-azione="kit-crea-web">📱 Prepara il kit per tablet e telefoni…</button></div>
        <p class="muto pf-aiuto"><b>Per PC:</b> comparirà la cartella «Cronache del Master - scheda giocatore». Comprimila (tasto destro › Invia a › Cartella compressa) e mandala ai giocatori, o mettila su Google Drive.<br>
          <b>Per tablet e telefoni (Android, iPhone, iPad):</b> se la cartella «… (tablet e telefoni)» è già collegata a GitHub, il pulsante la rigenera e carica subito la nuova versione sul sito (il link viene copiato); altrimenti la crea da pubblicare a mano (istruzioni nel LEGGIMI). I giocatori aprono il link e installano la scheda con «Aggiungi alla schermata Home»; poi funziona anche senza connessione e si aggiorna da sola.<br>
          In entrambi i kit i mostri del tuo Manuale dei Mostri non vengono inclusi, e il file della scheda è lo stesso.</p>
      </section>
      ${sezioneCopiaOnline()}
      <section class="pannello imp-dati">
        <h3>Uso su più PC</h3>
        <p>Questo PC: <b>${esc(s.pc)}</b>${s.solaLettura ? ' · <span class="oltre">aperto in sola lettura</span>' : ''}</p>
        <p class="muto">${s.locale ? 'Con la cartella locale il controllo tra PC non serve.' : l ? `Dati aperti ora da: <b>${esc(l.pc)}</b> (ultimo segnale alle ${new Date(l.aggiornato).toLocaleTimeString('it-IT')}).` : 'Nessun altro PC li ha aperti.'}</p>
        <ul class="muto imp-regole">
          <li>Usa l'app su <b>un PC alla volta</b>: se la apri dove è già aperta, ti propone la sola lettura.</li>
          <li>Prima di passare all'altro PC, <b>chiudi l'app</b> e aspetta che Google Drive finisca di sincronizzare (icona di Drive senza frecce).</li>
          <li>Se un altro PC modifica i dati mentre lavori, le tue modifiche non vanno perse: vengono salvate in una copia «dati.conflitto…» nella cartella.</li>
          <li>Il registro diagnostico (registro.log) resta su ogni PC, nella cartella dell'app.</li>
        </ul>
      </section>`;
  }

  function renderBarra(p) {
    if (GIOCATORE) {
      const miei = S.personaggi.slice().sort((a, b) => a.nome.localeCompare(b.nome));
      $('#barra-campagne').innerHTML = `<a href="#/giocatore" class="${p[0] !== 'personaggio' ? 'attiva' : ''}">◆ I miei personaggi</a>${miei.map((x) => `<a href="#/personaggio/${x.id}" class="${p[0] === 'personaggio' && p[1] === x.id ? 'attiva' : ''}">${esc(x.nome)}</a>`).join('')}<a href="#/dadi" class="${p[0] === 'dadi' ? 'attiva' : ''}">🎲 Tiradadi</a>`;
      return;
    }
    const sez = { campagna: 'campagne', sessione: 'campagne', personaggio: 'campagne', regolamento: 'regolamenti' }[p[0]] || p[0] || 'campagne';
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('attiva', a.dataset.nav === sez));
    let cid = null;
    if (p[0] === 'campagna') cid = p[1];
    if (p[0] === 'sessione') cid = sessione(p[1])?.campagnaId;
    if (p[0] === 'personaggio') cid = personaggio(p[1])?.campagnaId;
    const attive = S.campagne.filter((c) => c.stato !== 'Conclusa').sort((a, b) => a.nome.localeCompare(b.nome));
    $('#barra-campagne').innerHTML = attive.map((c) => `<a href="#/campagna/${c.id}/diario" class="${c.id === cid ? 'attiva' : ''}">${esc(c.nome)}</a>`).join('')
      || '<span class="muto">Nessuna campagna attiva</span>';
  }

  // ================= Kit del giocatore: schede da compilare e file da mandare al master =================
  const FORMATO_SCHEDA = 'cronache-del-master/personaggio';
  function campagnaGiocatore(regId) {
    let c = S.campagne.find((x) => x.regolamentoId === regId && x.perGiocatore);
    if (!c) {
      const r = regolamento(regId);
      c = { id: uid(), nome: `Schede ${r?.nome || ''}`.trim(), regolamentoId: regId, master: '', stato: 'Attiva', descrizione: '', creata: Date.now(), perGiocatore: true };
      S.campagne.push(c);
    }
    return c;
  }
  // Elenco delle astronavi della campagna (Starfinder)
  function schedaAstronavi(c) {
    const navi = S.astronavi.filter((x) => x.campagnaId === c.id);
    const pg = personaggiDi(c.id);
    return `<div class="barra-azioni"><button class="primario" data-azione="nv-nuova" data-campagna="${c.id}">🚀 Nuova astronave</button></div>
      ${navi.length ? `<div class="griglia">${navi.map((v) => { const k = nv.calcola(v, pg); return `<a class="scheda" href="#/astronave/${v.id}">
          <div class="scheda-titolo">🚀 ${esc(v.nome)}</div>
          <div class="scheda-sotto">${esc(v.struttura || 'struttura da scegliere')} · categoria ${esc(v.categoria)} · PS ${k.psMax - (v.combattimento?.danni || 0)}/${k.psMax} · CA ${k.ca} · AB ${k.ab}</div></a>`; }).join('')}</div>`
        : '<p class="muto">Nessuna astronave. Creane una: struttura, sistemi e armi si scelgono dal wiki, con i Punti Costruzione e l\'energia controllati da soli.</p>'}
      ${navi.length ? mp.vista(c) : ''}
      <p class="muto pf-aiuto">L'equipaggio si sceglie tra i personaggi della campagna: le prove di ogni ruolo vengono dalle loro schede. Per farla vedere ai giocatori, apri l'astronave e premi «💾 File per i giocatori»: lo importano nel kit con «📥 Importa scheda».</p>`;
  }
  function vistaNave(id) {
    const v = nave(id);
    if (!v) return nonTrovato();
    const c = campagna(v.campagnaId);
    return `<div class="briciole">${c ? `<a href="#/campagne">Campagne</a> › <a href="#/campagna/${c.id}/astronavi">${esc(c.nome)}</a>` : '<a href="#/">Le mie schede</a>'}</div>
      <header class="intest"><h1>🚀 ${esc(v.nome)}</h1>
        <div class="intest-sotto">Astronave · Starfinder${GIOCATORE ? (v.dalVivo ? ' · 📡 dal vivo: si aggiorna da sola durante la sessione' : ' · copia mandata dal master (si aggiorna con un file nuovo o collegandosi alla sessione dal vivo)') : ''}</div>
        <div class="barra-azioni">${GIOCATORE ? linkMappa() : `<button data-azione="nv-esporta" data-id="${v.id}" title="Salva il file dell'astronave da mandare ai giocatori">💾 File per i giocatori</button>
          <button class="btn-cestino" data-azione="nv-elimina" data-id="${v.id}" title="Elimina l'astronave">🗑</button>`}</div></header>
      ${nv.vista(v, { personaggi: equipaggioDi(v), sola: GIOCATORE })}`;
  }
  // Kit: mappa del combattimento ricevuta dalla sessione dal vivo (in sola lettura; toccando una nave si vedono archi e bersagli)
  const mappaDalVivo = { battaglia: null };
  const linkMappa = () => (GIOCATORE && mappaDalVivo.battaglia ? '<a class="btn-piccolo primario" href="#/mappa">🗺 Mappa del combattimento</a>' : '');
  function vistaMappaGiocatore() {
    const b = mappaDalVivo.battaglia;
    if (!b) return '<header class="intest"><h1>🗺 Mappa del combattimento</h1></header><p class="muto">Nessuna mappa in questo momento: compare qui quando il master mette le astronavi sulla mappa durante la sessione dal vivo.</p>';
    return `<div class="briciole"><a href="#/">Le mie schede</a></div>
      <header class="intest"><h1>🗺 Mappa del combattimento</h1><div class="intest-sotto">📡 dal vivo: la muove il master. Tocca una nave per vedere i suoi archi di fuoco e chi può colpire.</div></header>
      ${mp.vista({ id: 'dalvivo', battaglia: b }, { sola: true })}`;
  }
  const FORMATO_NAVE = 'cronache-del-master/astronave';
  function esportaNave(v) {
    const copia = JSON.parse(JSON.stringify(v));
    delete copia._personaggi;
    delete copia.dalVivo;
    // Con l'astronave viaggiano le schede dell'equipaggio, così il kit mostra le loro prove
    const ids = new Set(Object.values(v.equipaggio || {}).flat().filter(Boolean));
    const pers = personaggiDi(v.campagnaId).filter((p) => ids.has(p.id)).map((p) => { const x = JSON.parse(JSON.stringify(p)); delete x.campagnaId; return x; });
    const contenuto = JSON.stringify({ formato: FORMATO_NAVE, versione: 1, esportato: new Date().toISOString(), nave: copia, personaggi: pers }, null, 1);
    const nomeFile = `${(v.nome || 'astronave').replace(/[\\/:*?"<>|]+/g, ' ').trim()} - astronave.json`;
    if (window.KIT_WEB && navigator.share && navigator.canShare) {
      const file = new File([contenuto], nomeFile, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: nomeFile }).catch((e) => { if (e?.name !== 'AbortError') scaricaScheda(contenuto, nomeFile); }); return; }
    }
    scaricaScheda(contenuto, nomeFile);
  }

  function vistaGiocatore() {
    const miei = S.personaggi.slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const regs = S.regolamenti.filter((r) => r.scheda).concat(S.regolamenti.filter((r) => !r.scheda));
    // Kit per tablet e telefoni aperto nel browser (non ancora installato): come metterlo nella schermata Home
    const installata = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const installa = window.KIT_WEB && !installata ? `<section class="pannello giocatore-sez giocatore-installa"><h3>📱 Installa la scheda</h3>
        <p>${ios ? 'Tocca il tasto <b>Condividi</b> (il quadrato con la freccia) e poi <b>«Aggiungi alla schermata Home»</b>.' : 'Apri il menu del browser (⋮) e scegli <b>«Installa app»</b> o <b>«Aggiungi a schermata Home»</b>.'}
        La scheda diventa un'app e funziona anche senza connessione.</p>
        ${ios ? '<p class="muto pf-aiuto">Fallo prima di creare il personaggio: su iPhone e iPad l\'app installata e Safari tengono i dati separati.</p>' : ''}</section>` : '';
    return `<header class="intest"><h1>La mia scheda</h1>
        <div class="intest-sotto">Crea il tuo personaggio con la scheda automatica, compilala e poi salva il file da mandare al master.</div></header>
      ${installa}
      <section class="pannello giocatore-sez"><h3>Nuovo personaggio</h3>
        <form class="riga-form" data-form="giocatore-nuovo" autocomplete="off">
          <input name="nome" placeholder="Nome del personaggio" required>
          <select name="reg" aria-label="Regolamento">${opzioni(regs.map((r) => [r.id, r.nome]))}</select>
          <input name="giocatore" placeholder="Il tuo nome (giocatore)">
          <button class="primario">Crea il personaggio</button>
          <button type="button" data-azione="giocatore-carica" title="Carica il file di una scheda già fatta (tua o rimandata dal master)">📥 Importa scheda</button>
        </form>
        <p class="muto pf-aiuto">Scegli il regolamento della campagna: il master ti dirà quale. Hai già il file di una scheda? Usa «Importa scheda».</p></section>
      ${miei.length ? `<h2>I miei personaggi</h2><div class="griglia">${miei.map((x) => `<a class="scheda" href="#/personaggio/${x.id}">
          <div class="scheda-titolo"><span class="ritratto ritratto-piccolo">${ritratto(x)}</span>${esc(x.nome)}</div>
          <div class="scheda-sotto">${esc(regDi(x)?.nome || '')}${x.giocatore ? ` · ${esc(x.giocatore)}` : ''}</div></a>`).join('')}</div>` : ''}
      ${linkMappa() ? `<div class="barra-azioni">${linkMappa()}</div>` : ''}
      ${S.astronavi.length ? `<h2>Astronavi</h2><div class="griglia">${S.astronavi.map((v) => `<a class="scheda" href="#/astronave/${v.id}"><div class="scheda-titolo">🚀 ${esc(v.nome)}</div><div class="scheda-sotto">${esc(v.struttura || '')}</div></a>`).join('')}</div>` : ''}
      <section class="pannello giocatore-sez"><h3>Hai già un file della scheda?</h3>
        <p class="muto">Se il master ti ha rimandato la scheda, o vuoi continuarla da un altro computer, caricala qui.</p>
        <button data-azione="giocatore-carica">📥 Importa scheda</button></section>
      <section class="pannello giocatore-sez"><h3>Come funziona</h3><ol class="giocatore-passi">
        <li>Crea il personaggio e compila la scheda: i valori si calcolano da soli e tutto resta salvato in questo browser.</li>
        <li>Quando hai finito premi <b>💾 Salva il file per il master</b>: ${window.KIT_WEB ? 'si apre la condivisione (WhatsApp, email, Drive…), oppure il file finisce nei <i>Download</i>' : 'il file finisce nella cartella <i>Download</i>'}.</li>
        <li>Manda quel file al master (email, WhatsApp, Drive…): lui lo carica nel suo programma.</li>
        <li>Le descrizioni del wiki (talenti, incantesimi…) qui non si aprono: usa il link al wiki, se c'è, oppure chiedi al master.</li>
      </ol></section>`;
  }
  function barraGiocatore(p) {
    return `<div class="barra-azioni barra-giocatore"><a class="bottone" href="#/giocatore">← I miei personaggi</a>
      <button class="primario" data-azione="pg-esporta" data-id="${p.id}">💾 Salva il file per il master</button>
      <button data-azione="giocatore-carica" title="Carica il file di una scheda (tua o rimandata dal master)">📥 Importa scheda</button>
      <span class="muto">La scheda resta salvata in questo browser; il file serve per mandarla al master.</span></div>
      ${barraDalVivoGiocatore(p)}`;
  }
  // File della scheda: il personaggio con il regolamento a cui appartiene (senza la campagna)
  function esportaScheda(p) {
    const r = regDi(p);
    const pers = JSON.parse(JSON.stringify(p));
    delete pers.campagnaId;
    const dati = { formato: FORMATO_SCHEDA, versione: 1, esportato: new Date().toISOString(), regolamento: { id: r.id, nome: r.nome, scheda: r.scheda || '' }, personaggio: pers };
    const nomeFile = `${(p.nome || 'personaggio').replace(/[\\/:*?"<>|]+/g, ' ').trim()} - scheda.json`;
    const contenuto = JSON.stringify(dati, null, 1);
    // Su tablet e telefoni (kit web) si apre la condivisione: WhatsApp, email, Drive… Se non c'è, si scarica il file.
    if (window.KIT_WEB && navigator.share && navigator.canShare) {
      const file = new File([contenuto], nomeFile, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: nomeFile }).catch((e) => { if (e?.name !== 'AbortError') scaricaScheda(contenuto, nomeFile); });
        return;
      }
    }
    scaricaScheda(contenuto, nomeFile);
  }
  function scaricaScheda(contenuto, nomeFile) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenuto], { type: 'application/json' }));
    a.download = nomeFile;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  // Chiede un file .json e restituisce la scheda letta (o lancia un errore comprensibile)
  function leggiFileScheda() {
    return new Promise((ok, ko) => {
      const scelta = document.createElement('input');
      scelta.type = 'file';
      scelta.accept = '.json,application/json';
      scelta.addEventListener('change', () => {
        const file = scelta.files?.[0];
        if (!file) { ok(null); return; }
        if (file.size > 20 * 1024 * 1024) { ko(new Error('File troppo grande')); return; }
        file.text().then((testo) => {
          let d;
          try { d = JSON.parse(testo); } catch { ko(new Error('Il file non è una scheda leggibile')); return; }
          if (d?.formato === FORMATO_NAVE && d.nave?.id) { ok(d); return; }
          if (d?.formato !== FORMATO_SCHEDA || !d.personaggio?.nome) { ko(new Error('Il file non è una scheda di Cronache del Master (forse è un backup completo?)')); return; }
          ok(d);
        }, ko);
      });
      scelta.click();
    });
  }

  // ================= Azioni =================
  function nuovoPersonaggio(campagnaId, nome, tipo = 'PNG') {
    const p = { id: uid(), campagnaId, tipo, nome: nome.trim(), alias: '', ruolo: '', giocatore: '', campi: {}, caratteristiche: {}, abilita: {}, risorse: {}, note: '', creato: Date.now() };
    S.personaggi.push(p);
    salva();
    return p;
  }

  // Modulo Pathfinder 1 (src/pf1.js). Le funzioni sono passate come lambda perché
  // alcune sono dichiarate più avanti nel file.
  const pf1 = window.creaPF1({
    esc, uid, norm, numero,
    salva: () => salva(),
    render: () => render(),
    toast: (h, t) => toast(h, t),
    eseguiTiro: (e, et, o) => eseguiTiro(e, et, o),
    personaggio: (id) => personaggio(id),
    ritratto: (p) => ritratto(p),
    // Fa scegliere un'immagine dal computer e la restituisce ridotta (lato lungo al massimo "lato" pixel); null se annullato
    scegliImmagine: (lato = 256) => new Promise((ok, ko) => {
      const scelta = document.createElement('input');
      scelta.type = 'file';
      scelta.accept = 'image/png,image/jpeg,image/webp,image/gif';
      scelta.addEventListener('change', () => {
        const file = scelta.files?.[0];
        if (!file) { ok(null); return; }
        if (file.size > 30 * 1024 * 1024) { ko(new Error('Immagine troppo grande (massimo 30 MB)')); return; }
        riduciImmagine(file, lato).then(ok, ko);
      });
      scelta.click();
    }),
    // Musica dello scontro: nell'app i file vengono copiati nella cartella dati; nel browser di sviluppo valgono solo per questa sessione
    scegliMusica: () => (window.gdr?.scegliMusica ? window.gdr.scegliMusica() : new Promise((ok) => {
      const scelta = document.createElement('input');
      scelta.type = 'file';
      scelta.accept = 'audio/*';
      scelta.multiple = true;
      scelta.addEventListener('change', () => ok([...(scelta.files || [])].map((f) => ({ nome: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f), temporaneo: true }))));
      scelta.click();
    })),
    // Aggiunge un testo in fondo al diario dell'ultima sessione della campagna (la crea se non ce n'è); restituisce il titolo
    aggiungiAlDiario: (cid, testo) => {
      const ss = sessioniDi(cid);
      let s = ss[ss.length - 1];
      if (!s) {
        s = { id: uid(), campagnaId: cid, numero: 1, data: oggiISO(), titolo: '', testo: '', creata: Date.now() };
        S.sessioni.push(s);
      }
      s.testo = `${s.testo ? s.testo.replace(/\s+$/, '') + '\n\n' : ''}${testo}`;
      salva();
      return `#${s.numero} ${titoloSessione(s)}`;
    },
    // Immagine dal wiki e PDF: solo nell'app (nel browser di sviluppo non ci sono)
    wikiImmagine: (percorso, sito) => (window.gdr?.wikiImmagine ? window.gdr.wikiImmagine(percorso, sito) : Promise.reject(new Error('disponibile solo nell\'app'))),
    // Apre lo schermo del tracker in una seconda finestra (nel browser di sviluppo: una nuova scheda)
    apriSchermo: (cid) => (window.gdr?.apriSchermo ? window.gdr.apriSchermo(cid) : Promise.resolve(window.open(`index.html?schermo=1#/schermo/${cid}`, 'schermo-gdr'))),
    // Libro degli incantesimi in una finestra a parte (nel browser di sviluppo: una nuova finestra)
    // Nel kit dei giocatori (file aperto dal disco) il libro si apre nella stessa pagina, con il ritorno alla scheda
    apriLibro: (pg, inc, tipo = 'grimorio') => {
      if (window.gdr?.apriLibro) return window.gdr.apriLibro(pg, inc, tipo);
      if (GIOCATORE) { location.hash = `#/${tipo}/${pg}/${inc}`; return Promise.resolve(true); }
      const pagina = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
      return Promise.resolve(window.open(`${encodeURIComponent(pagina)}?schermo=1#/${tipo}/${pg}/${inc}`, `${tipo}-gdr`, 'width=1280,height=860'));
    },
    pdf: (nome) => (window.gdr?.pdf ? window.gdr.pdf(nome) : Promise.reject(new Error('disponibile solo nell\'app'))),
    campagna: (id) => campagna(id),
    personaggiDi: (id) => personaggiDi(id),
    mostriCreati: () => S.personaggi.filter((p) => p.tipo === 'Mostro' && p.creatoMostro),
    regDi: (p) => regDi(p),
    // Lettura di una pagina del wiki (solo nell'app: nel browser di sviluppo non è disponibile)
    wiki: (pagina, sito) => (window.gdr?.wiki ? window.gdr.wiki(pagina, sito) : Promise.reject(new Error('disponibile solo nell\'app'))),
    // Scheda Starfinder (per il tracker di combattimento)
    sf: () => sf,
    dnd: () => dnd,
    pf2: () => pf2,
    urlMusica: (b) => urlMusica(b),
    pannelloDalVivo: (c) => pannelloDalVivo(c),
  });
  // Modulo Starfinder (src/sf.js)
  const sf = window.creaSF({
    esc, uid, norm,
    salva: () => salva(),
    render: () => render(),
    toast: (h, t) => toast(h, t),
    eseguiTiro: (e, et, o) => eseguiTiro(e, et, o),
    personaggio: (id) => personaggio(id),
    // Archivio olografico (libro degli incantesimi) e descrizioni dal wiki
    apriLibro: (pg, inc, tipo) => {
      if (window.gdr?.apriLibro) return window.gdr.apriLibro(pg, inc, tipo);
      if (GIOCATORE) { location.hash = `#/${tipo}/${pg}/${inc}`; return Promise.resolve(true); }
      const pagina = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
      return Promise.resolve(window.open(`${encodeURIComponent(pagina)}?schermo=1#/${tipo}/${pg}/${inc}`, `${tipo}-gdr`, 'width=1280,height=860'));
    },
    wiki: (pagina, sito) => (window.gdr?.wiki ? window.gdr.wiki(pagina, sito) : Promise.reject(new Error('disponibile solo nell\'app'))),
  });

  // Astronavi di Starfinder (src/sf-astronavi.js): della campagna, con l'equipaggio preso dai suoi personaggi.
  // Nel kit dei giocatori l'astronave arriva da un file, con dentro le schede dell'equipaggio (_personaggi).
  const nave = (id) => S.astronavi.find((x) => x.id === id);
  const equipaggioDi = (v) => (v?._personaggi?.length ? v._personaggi : personaggiDi(v?.campagnaId));
  const nv = window.creaAstronavi({
    esc, uid,
    salva: () => salva(),
    render: () => render(),
    toast: (h, t) => toast(h, t),
    nave,
    personaggiDi: (cid) => { const v = S.astronavi.find((x) => x.campagnaId === cid && x._personaggi?.length); return v ? v._personaggi : personaggiDi(cid); },
    sfCalcola: (p) => sf.calcola(p),
  });

  // Mappa a esagoni del combattimento tra astronavi (src/sf-mappa.js), una per campagna
  const mp = window.creaMappaSpaziale({
    esc, uid,
    salva: () => salva(),
    render: () => render(),
    toast: (h, t) => toast(h, t),
    campagna: (id) => campagna(id),
    nave,
    navi: (cid) => S.astronavi.filter((x) => x.campagnaId === cid),
    calcolaNave: (v) => nv.calcola(v, equipaggioDi(v)),
    prova: (v, ruolo) => nv.prova(v, ruolo),
    colpisci: (v, danno, q, venti) => nv.colpisci(v, danno, q, venti),
    tiraDanni: (e) => nv.tiraDanni(e),
    numCategoria: (c) => nv.numCategoria(c),
  });

  // Modulo D&D 5e (src/dnd.js)
  const dnd = window.creaDND({
    esc, uid, norm,
    salva: () => salva(),
    render: () => render(),
    toast: (h, t) => toast(h, t),
    eseguiTiro: (e, et, o) => eseguiTiro(e, et, o),
    personaggio: (id) => personaggio(id),
  });

  // Modulo Pathfinder 2 (src/pf2.js)
  const pf2 = window.creaPF2({
    esc, uid, norm,
    salva: () => salva(),
    render: () => render(),
    toast: (h, t) => toast(h, t),
    eseguiTiro: (e, et, o) => eseguiTiro(e, et, o),
    personaggio: (id) => personaggio(id),
  });

  const moduli = {
    'nuova-campagna'(d) {
      const c = { id: uid(), nome: d.get('nome').trim(), regolamentoId: d.get('regolamentoId'), master: '', stato: 'Attiva', descrizione: '', creata: Date.now() };
      if (!c.nome) return;
      S.campagne.push(c);
      salva();
      location.hash = `#/campagna/${c.id}/diario`;
    },
    'dv-collega'(d) { dvGCollega(d.get('codice'), d.get('pg')); },
    async 'co-cerca'(d) {
      co.codiceCercato = String(d.get('codice') || '');
      const codice = CO.normCodice(co.codiceCercato);
      if (!codice) { toast('Il codice ha 24 caratteri, in 6 gruppi da 4 (es. K7QM-2XRA-9TBC-…)', 'errore'); return; }
      try {
        const id = await CO.idDa(codice);
        const ultima = await DV.leggi(`backup/${id}/ultima`);
        const indice = (await DV.leggi(`backup/${id}/indice`)) || [];
        const trovate = [];
        if (ultima) trovate.push({ chiave: 'ultima', nome: 'Ultima copia', quando: ultima.quando, pc: ultima.pc, dimensione: ultima.dimensione });
        for (const g of [...indice].reverse()) trovate.push({ chiave: `giorni/${g}`, nome: `Copia del ${g.split('-').reverse().join('/')}`, quando: 0, pc: '', dimensione: 0 });
        co.trovate = trovate;
      } catch (e) { co.trovate = null; toast(`Ricerca non riuscita: ${esc(e.message || e)}`, 'errore'); }
      render();
    },
    'giocatore-nuovo'(d) {
      const nome = d.get('nome').trim();
      if (!nome) return;
      const c = campagnaGiocatore(d.get('reg'));
      const p = nuovoPersonaggio(c.id, nome, 'PG');
      p.giocatore = d.get('giocatore').trim();
      salva();
      location.hash = `#/personaggio/${p.id}`;
    },
    'nuovo-personaggio'(d) {
      const nome = d.get('nome').trim();
      if (!nome) return;
      const p = nuovoPersonaggio(d.get('campagnaId'), nome, d.get('tipo'));
      if (p.tipo === 'Mostro') {
        // Mostro del bestiario: resta nell'elenco dei mostri (la scheda si apre dal nome)
        const m = pf1.mostroDi(nome, campagna(p.campagnaId));
        if (m) { p.mostro = m[0]; p.nome = m[0]; }
        salva();
        render();
        toast(`👹 <b>${esc(p.nome)}</b> aggiunto ai mostri${m ? ' (dal bestiario)' : ''}`);
        return;
      }
      location.hash = `#/personaggio/${p.id}`;
    },
    tiro(d) {
      if (eseguiTiro(d.get('espr'), d.get('etichetta').trim())) { render(); $('#espr-dado')?.select(); }
    },
  };
  Object.assign(moduli, mp.moduli);

  const azioni = {
    'nuova-sessione'(el) {
      const ss = sessioniDi(el.dataset.campagna);
      const numeroNuovo = ss.reduce((m, s) => Math.max(m, Number(s.numero) || 0), 0) + 1;
      const s = { id: uid(), campagnaId: el.dataset.campagna, numero: numeroNuovo, data: oggiISO(), titolo: '', testo: '', creata: Date.now() };
      S.sessioni.push(s);
      salva();
      location.hash = `#/sessione/${s.id}/modifica`;
    },
    'elimina-sessione'(el) {
      const s = sessione(el.dataset.id);
      if (!s || !confirm(`Eliminare definitivamente "${titoloSessione(s)}"?`)) return;
      memorizzaEliminazione({ sessioni: [s] }, `<b>#${esc(s.numero)} ${esc(titoloSessione(s))}</b> eliminata`);
      S.sessioni = S.sessioni.filter((x) => x !== s);
      salva();
      if (location.hash.startsWith('#/sessione/')) location.hash = `#/campagna/${s.campagnaId}/diario`; else render();
    },
    // ---- Lore ----
    // ---- Vendita di un oggetto dell'inventario: l'incasso va nelle monete d'oro (crediti in Starfinder) ----
    'oggetto-vendi-apri'(el) { window.Luoghi?.apriVendita(el.dataset.ogg); render(); setTimeout(() => $('.vendita-prezzo')?.select(), 30); },
    'oggetto-vendi-annulla'() { window.Luoghi?.apriVendita(null); render(); },
    // Starfinder: le merci di scambio si vendono al 100% del prezzo, il resto al 10%
    'oggetto-vendi-scambio'(el) {
      const box = el.closest('.vendita');
      const campo = box?.querySelector('.vendita-prezzo');
      if (!campo) return;
      const qta = Math.max(1, Number(box.querySelector('.vendita-qta')?.value) || 1);
      const v = Number(campo.dataset.valore) || 0;
      campo.value = Math.round(v * qta * (Number(el.dataset.quota) || 0.1) * 100) / 100;
    },
    'oggetto-vendi'(el) {
      const sistema = el.dataset.sistema;
      const d = datiSistema(el.dataset.id, sistema);
      const o = d?.oggetti?.find((x) => x.id === el.dataset.ogg);
      if (!o) return;
      const box = el.closest('.vendita');
      const tot = Math.max(1, Number(o.qta) || 1);
      const quanti = Math.min(tot, Math.max(1, Math.floor(Number(box?.querySelector('.vendita-qta')?.value) || tot)));
      const prezzo = Math.max(0, Number(String(box?.querySelector('.vendita-prezzo')?.value || '0').replace(',', '.')) || 0);
      // Incasso: in Starfinder i crediti; altrove monete d'oro, con i decimali in argento e rame (1 mo = 10 ma = 100 mr)
      let incasso;
      if (sistema === 'sf') {
        d.crediti = Math.round((Number(d.crediti) || 0) + prezzo);
        incasso = `${Math.round(prezzo).toLocaleString('it-IT')} crediti`;
      } else {
        d.monete = d.monete || {};
        const rame = Math.round(prezzo * 100);
        const mo = Math.floor(rame / 100), ma = Math.floor((rame % 100) / 10), mr = rame % 10;
        d.monete.mo = (Number(d.monete.mo) || 0) + mo;
        if (ma) d.monete.ma = (Number(d.monete.ma) || 0) + ma;
        if (mr) d.monete.mr = (Number(d.monete.mr) || 0) + mr;
        incasso = [mo ? `${mo.toLocaleString('it-IT')} mo` : '', ma ? `${ma} ma` : '', mr ? `${mr} mr` : ''].filter(Boolean).join(' ') || '0 mo';
      }
      // L'oggetto venduto lascia l'inventario (o ne restano i pezzi non venduti)
      if (quanti < tot) o.qta = tot - quanti;
      else {
        if (o.bonusId && Array.isArray(d.bonus)) d.bonus = d.bonus.filter((b) => b.id !== o.bonusId);
        d.oggetti = d.oggetti.filter((x) => x !== o);
      }
      d.vendite = d.vendite || [];
      d.vendite.push({ nome: o.nome || 'oggetto', qta: quanti, prezzo, quando: Date.now() });
      window.Luoghi?.apriVendita(null);
      salva();
      render();
      toast(`💰 Vendut${quanti > 1 ? 'i' : 'o'} <b>${quanti > 1 ? `${quanti} × ` : ''}${esc(o.nome || 'oggetto')}</b> per <b>${esc(incasso)}</b>: aggiunt${sistema === 'sf' ? 'i ai crediti' : 'o alle monete'}`);
    },
    // ---- Luoghi dell'equipaggiamento (comuni a tutte le schede): più borse, case, cavalli… con il loro nome ----
    'luogo-nuovo'(el) {
      const d = datiSistema(el.dataset.id, el.dataset.sistema);
      if (!d) return;
      const tipo = window.Luoghi?.LISTA.find((l) => l.k === el.dataset.tipo);
      if (!tipo) return;
      const campo = el.closest('.luogo-altro')?.querySelector('.luogo-altro-nome');
      const gia = (d.luoghiExtra || []).filter((x) => x.tipo === tipo.k).length;
      const nome = (campo?.value || '').trim() || `${tipo.nome} ${gia + 2}`;
      // Borsa conservante (PF1): prima di crearla bisogna dire di che tipo è
      const L = window.Luoghi;
      const tipoBorsa = el.closest('.luogo-altro')?.querySelector('.luogo-altro-tipo')?.value || '';
      if (tipo.k === 'borsa' && L.conTipiBorsa(el.dataset.sistema) && !L.TIPI_BORSA[tipoBorsa]) {
        toast('Scegli che tipo di borsa conservante è (Tipo I, II, III o IV)', 'errore');
        el.closest('.luogo-altro')?.querySelector('.luogo-altro-tipo')?.focus();
        return;
      }
      const nuovoId = uid();
      d.luoghiExtra = d.luoghiExtra || [];
      d.luoghiExtra.push({ id: nuovoId, tipo: tipo.k, nome });
      if (tipoBorsa) { d.borseTipi = d.borseTipi || {}; d.borseTipi[nuovoId] = tipoBorsa; }
      salva();
      render();
      toast(`${tipo.icona} Nuovo luogo: <b>${esc(nome)}</b>`);
    },
    'luogo-togli'(el) {
      const d = datiSistema(el.dataset.id, el.dataset.sistema);
      const copia = (d?.luoghiExtra || []).find((x) => x.id === el.dataset.luogo);
      if (!copia) return;
      const dentro = (d.oggetti || []).filter((o) => o.dove === copia.id);
      if (!confirm(`Eliminare «${copia.nome}»?${dentro.length ? `\n\nI suoi ${dentro.length} oggetti tornano nel luogo di base dello stesso tipo.` : ''}`)) return;
      for (const o of dentro) o.dove = copia.tipo;
      d.luoghiExtra = d.luoghiExtra.filter((x) => x !== copia);
      if (d.borseTipi) delete d.borseTipi[copia.id];
      salva();
      render();
    },
    'mostro-personalizzato'(el) {
      const c = campagna(el.dataset.campagna);
      if (!c) return;
      const nome = (el.closest('form')?.querySelector('[name="nome"]')?.value || '').trim() || 'Nuovo mostro';
      const p = nuovoPersonaggio(c.id, nome, 'Mostro');
      p.creatoMostro = pf1.creaMostroVuoto();
      salva();
      location.hash = `#/personaggio/${p.id}`;
    },
    'mostro-scontro'(el) {
      const p = personaggio(el.dataset.id);
      const c = p && campagna(p.campagnaId);
      if (!c) return;
      const qta = el.closest('.riga-mostro, .pannello')?.querySelector('.mostro-qta')?.value || 1;
      const quanti = pf1.aggiungiMostro(c, p, qta);
      toast(`⚔ ${quanti > 1 ? `${quanti} × ` : ''}<b>${esc(p.nome)}</b> nello scontro · <a href="#/campagna/${c.id}/combattimento">apri il combattimento</a>`);
    },
    'blocco-sposta'(el) { const p = personaggio(el.dataset.id); if (p) spostaBlocco(p, el.dataset.k, Number(el.dataset.d), el.dataset.indice === undefined); },
    // Indice laterale: apre la sezione se è chiusa e ci porta la pagina
    'salta-blocco'(el) {
      const k = el.dataset.vai ?? el.dataset.blocco;
      const dest = k ? $(`#contenuto [data-blocco="${CSS.escape(k)}"]`) : null;
      if (!k) { const c = $('#contenuto'); c.scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (!dest) return;
      if (dest.tagName === 'DETAILS' && !dest.open) dest.open = true;
      dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
      dest.classList.remove('salto-arrivo');
      void dest.offsetWidth;
      dest.classList.add('salto-arrivo');
      if (window.innerWidth < 1300) document.getElementById('salti-scheda')?.classList.remove('aperta');
    },
    'salti-apri'() {
      const nav = document.getElementById('salti-scheda');
      if (!nav) return;
      nav.classList.toggle('aperta');
      document.body.classList.toggle('salti-aperti', nav.classList.contains('aperta'));
      try { localStorage.setItem('salti-aperti', nav.classList.contains('aperta') ? '1' : '0'); } catch { /* niente */ }
    },
    'blocco-predefinito'(el) {
      const p = personaggio(el.dataset.id);
      if (!p) return;
      delete p.ordineBlocchi;
      salva();
      render();
      toast('Blocchi della scheda di nuovo nell\'ordine di partenza');
    },
    'racc-apri'(el) { raccolta(el.dataset.racc)?.vai(el.dataset.id); },
    async 'lore-importa'(el) {
      const rc = raccolta(el.dataset.racc);
      if (!rc) return;
      if (!window.gdr?.importaLore) { toast('L\'importazione dei documenti funziona solo nell\'app (non nel browser)', 'errore'); return; }
      toast('📜 Lettura dei documenti…');
      let risultati;
      try { risultati = await window.gdr.importaLore(); } catch (e) { toast(`Impossibile leggere i documenti: ${esc(e.message)}`, 'errore'); return; }
      if (!risultati?.length) return;
      const nuove = [];
      const avvisi = [];
      for (const r of risultati) {
        if (r.errore) { avvisi.push(`«${esc(r.titolo)}»: ${esc(r.errore)}`); continue; }
        const html = pulisciLore(r.html);
        if (!loreTestoBreve(html)) { avvisi.push(`«${esc(r.titolo)}»: nessun testo trovato${r.avvisi?.length ? ` (${esc(r.avvisi[0])})` : ''}`); continue; }
        const base = { formato: r.formato, fonte: `${r.titolo}.${r.formato}`, creata: Date.now() };
        const capitoli = capitoliLore(html);
        if (capitoli && capitoli.length > 1 && confirm(`«${r.titolo}» contiene ${capitoli.length} capitoli.\n\nVuoi una pagina per ogni capitolo?\n(Annulla = tutto in una sola pagina; potrai dividerlo anche dopo.)`)) {
          for (const cap of capitoli) nuove.push({ id: uid(), titolo: cap.titolo || r.titolo, html: cap.html, ...base });
        } else nuove.push({ id: uid(), titolo: r.titolo, html, ...base });
        for (const a of r.avvisi || []) if (!avvisi.includes(a)) avvisi.push(esc(a));
      }
      if (nuove.length) {
        rc.lista.push(...nuove);
        salva();
        rc.vai(nuove[0].id);
      }
      toast(`${nuove.length ? `📜 Aggiunt${nuove.length === 1 ? 'a 1 pagina' : `e ${nuove.length} pagine`} ${rc.nome === 'lore' ? 'alla lore' : 'ai documenti del personaggio'}` : 'Nessuna pagina aggiunta'}${avvisi.length ? `<br><small>${avvisi.join('<br>')}</small>` : ''}`, nuove.length ? '' : 'errore');
    },
    'lore-nuova'(el) {
      const rc = raccolta(el.dataset.racc);
      if (!rc) return;
      const p = { id: uid(), titolo: 'Nuova pagina', html: '<p></p>', creata: Date.now() };
      rc.lista.push(p);
      salva();
      loreModifica = p.id;
      rc.vai(p.id);
      setTimeout(() => { const t = $('#lore-titolo'); if (t) { t.focus(); t.select(); } }, 60);
    },
    'lore-modifica'(el) { loreModifica = el.dataset.id; render(); setTimeout(() => $('#lore-testo')?.focus(), 50); },
    'lore-annulla'() { loreModifica = null; render(); },
    'lore-salva'(el) {
      const p = raccolta(el.dataset.racc)?.lista.find((x) => x.id === el.dataset.id);
      if (!p) return;
      p.titolo = ($('#lore-titolo')?.value || '').trim() || 'Senza titolo';
      p.html = pulisciLore($('#lore-testo')?.innerHTML || '');
      p.modificata = Date.now();
      loreModifica = null;
      salva();
      render();
      toast('📜 Pagina salvata');
    },
    'lore-dividi'(el) {
      const rc = raccolta(el.dataset.racc);
      const i = (rc?.lista || []).findIndex((x) => x.id === el.dataset.id);
      if (i < 0) return;
      const p = rc.lista[i];
      const capitoli = capitoliLore(p.html);
      if (!capitoli || capitoli.length < 2) return;
      if (!confirm(`Dividere «${p.titolo}» in ${capitoli.length} pagine, una per capitolo?`)) return;
      const nuove = capitoli.map((cap) => ({ id: uid(), titolo: cap.titolo || p.titolo, html: cap.html, formato: p.formato, fonte: p.fonte, creata: p.creata || Date.now() }));
      rc.lista.splice(i, 1, ...nuove);
      salva();
      rc.vai(nuove[0].id);
      toast(`✂️ Creata una pagina per ognuno dei ${nuove.length} capitoli`);
    },
    'lore-sposta'(el) {
      const l = raccolta(el.dataset.racc)?.lista || [];
      const i = l.findIndex((x) => x.id === el.dataset.id);
      const j = i + Number(el.dataset.d);
      if (i < 0 || j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]];
      salva();
      render();
    },
    'lore-elimina'(el) {
      const rc = raccolta(el.dataset.racc);
      const i = (rc?.lista || []).findIndex((x) => x.id === el.dataset.id);
      if (i < 0) return;
      if (!confirm(`Eliminare la pagina «${rc.lista[i].titolo}»? Il documento originale sul computer non viene toccato.`)) return;
      rc.lista.splice(i, 1);
      salva();
      rc.vai('');
    },
    // Porta alla scheda Dettagli con il campo del nome già selezionato
    'rinomina-campagna'(el) {
      const dest = `#/campagna/${el.dataset.id}/dettagli`;
      const fuoco = () => { const i = $('#nome-campagna'); if (i) { i.focus(); i.select(); } };
      if (location.hash !== dest) { location.hash = dest; setTimeout(fuoco, 100); } else fuoco();
    },
    'elimina-campagna'(el) {
      const c = campagna(el.dataset.id);
      if (!c || !confirm(`Eliminare definitivamente la campagna "${c.nome}" con tutte le sue sessioni e i suoi personaggi?`)) return;
      memorizzaEliminazione({ campagne: [c], sessioni: S.sessioni.filter((x) => x.campagnaId === c.id), personaggi: S.personaggi.filter((x) => x.campagnaId === c.id) }, `Campagna <b>${esc(c.nome)}</b> eliminata`);
      S.campagne = S.campagne.filter((x) => x !== c);
      S.sessioni = S.sessioni.filter((x) => x.campagnaId !== c.id);
      S.personaggi = S.personaggi.filter((x) => x.campagnaId !== c.id);
      salva();
      if (location.hash === '#/campagne' || location.hash === '') render(); else location.hash = '#/campagne';
    },
    'nv-nuova'(el) {
      const c = campagna(el.dataset.campagna);
      if (!c) return;
      const v = nv.nuova(c.id, `Astronave ${S.astronavi.filter((x) => x.campagnaId === c.id).length + 1}`);
      S.astronavi.push(v);
      salva();
      location.hash = `#/astronave/${v.id}`;
    },
    'nv-elimina'(el) {
      const v = nave(el.dataset.id);
      if (!v || !confirm(`Eliminare l'astronave "${v.nome}"?`)) return;
      S.astronavi = S.astronavi.filter((x) => x !== v);
      salva();
      location.hash = v.campagnaId && campagna(v.campagnaId) ? `#/campagna/${v.campagnaId}/astronavi` : '#/';
    },
    'nv-esporta'(el) {
      const v = nave(el.dataset.id);
      if (!v) return;
      esportaNave(v);
      toast(`💾 File dell'astronave <b>${esc(v.nome)}</b> salvato: mandalo ai giocatori, che lo importano nel kit con «📥 Importa scheda»`);
    },
    'elimina-personaggio'(el) {
      const p = personaggio(el.dataset.id);
      if (!p || !confirm(`Eliminare definitivamente "${p.nome}"? Il testo dei diari non viene toccato.`)) return;
      // Toglie il personaggio anche da un eventuale combattimento in corso
      const inc = campagna(p.campagnaId)?.incontro;
      const nelloScontro = (inc?.combattenti || []).filter((x) => x.pgId === p.id);
      memorizzaEliminazione({ personaggi: [p], combattenti: nelloScontro.map((cb) => ({ campagnaId: p.campagnaId, cb })) }, `<b>${esc(p.nome)}</b> eliminato`);
      S.personaggi = S.personaggi.filter((x) => x !== p);
      if (inc && nelloScontro.length) { inc.combattenti = inc.combattenti.filter((x) => x.pgId !== p.id); if (nelloScontro.some((x) => x.id === inc.attivo)) inc.attivo = inc.combattenti[0]?.id || null; }
      salva();
      if (location.hash.startsWith('#/personaggio/')) location.hash = `#/campagna/${p.campagnaId}/personaggi`; else render();
    },
    'annulla-eliminazione'() {
      const u = ultimaEliminazione;
      if (!u) return;
      ultimaEliminazione = null;
      S.campagne.push(...(u.campagne || []));
      S.sessioni.push(...(u.sessioni || []));
      S.personaggi.push(...(u.personaggi || []));
      for (const { campagnaId, cb } of u.combattenti || []) { const inc = campagna(campagnaId)?.incontro; if (inc && !inc.combattenti.includes(cb)) inc.combattenti.push(cb); }
      salva();
      render();
      toast('↩ Eliminazione annullata');
    },
    'crea-png-da-citazione'(el) {
      const p = nuovoPersonaggio(el.dataset.campagna, el.dataset.nome, 'PNG');
      toast(`PNG <b>${esc(p.nome)}</b> creato. <a href="#/personaggio/${p.id}">Apri scheda</a>`);
      render();
    },
    'tira-car'(el) { const p = personaggio(el.dataset.id); if (p) tiroCaratteristica(p, el.dataset.chiave); },
    'tira-iniziativa'(el) { const p = personaggio(el.dataset.id); if (p && eseguiTiro('1d20' + fmtMod(Number(p.iniziativa) || 0), ` · Iniziativa`)) render(); },
    'tira-abil'(el) { const p = personaggio(el.dataset.id); if (p) tiroAbilita(p, el.dataset.chiave); },
    'tiro-rapido'(el) { if (eseguiTiro(el.dataset.espr)) render(); },
    'svuota-tiri'() { if (confirm('Svuotare la cronologia dei tiri?')) { S.tiri = []; salva(); render(); } },
    'nuovo-regolamento'() {
      const r = { id: uid(), nome: 'Nuovo regolamento', modalita: 'd20', dado: '1d20', descrizione: '', campi: ['Classe', 'Livello'], caratteristiche: [], abilita: [], risorse: [{ nome: 'Punti Ferita', max: '' }], note: '' };
      S.regolamenti.push(r);
      salva();
      location.hash = `#/regolamento/${r.id}`;
    },
    'duplica-regolamento'(el) {
      const r = regolamento(el.dataset.id);
      const copia = { ...JSON.parse(JSON.stringify(r)), id: uid(), nome: r.nome + ' (copia)' };
      S.regolamenti.push(copia);
      salva();
      location.hash = `#/regolamento/${copia.id}`;
    },
    'elimina-regolamento'(el) {
      const r = regolamento(el.dataset.id);
      const usato = S.campagne.filter((c) => c.regolamentoId === r.id);
      if (usato.length) { toast(`Non puoi eliminarlo: è usato da ${usato.map((c) => esc(c.nome)).join(', ')}.`, 'errore'); return; }
      if (!confirm(`Eliminare definitivamente il regolamento "${r.nome}"?`)) return;
      S.regolamenti = S.regolamenti.filter((x) => x !== r);
      salva();
      location.hash = '#/regolamenti';
    },
    async esporta() {
      try { const dove = await archivio.esporta(S); if (dove) toast(`Backup salvato in <b>${esc(dove)}</b>`); }
      catch (e) { toast(esc(e.message), 'errore'); }
    },
    async importa() {
      try {
        const d = await archivio.importa();
        if (!d) return;
        if (!Array.isArray(d.campagne) || !Array.isArray(d.regolamenti)) throw new Error('Il file non sembra un backup di Cronache del Master');
        if (!confirm(`Sostituire TUTTI i dati attuali con il backup (${d.campagne.length} campagne)? Conviene esportare prima un backup dei dati attuali.`)) return;
        S = normalizza(d);
        salva();
        location.hash = '#/campagne';
        render();
        toast('Backup importato');
      } catch (e) { toast(esc(e.message), 'errore'); }
    },
    'apri-cartella'() { archivio.apriCartella(); },
    'co-attiva'() {
      const codice = CO.nuovoCodice();
      S.copiaOnline = { codice, attivata: Date.now() };
      co.mostra = true;
      salva();
      programmaCopiaOnline(true);
      render();
      toast(`☁ Copia online attivata. Codice di ripristino: <b>${esc(codice)}</b> — scrivilo in un posto sicuro`);
    },
    'co-salva'() { programmaCopiaOnline(true); toast('☁ Copia online in partenza…'); },
    'co-mostra'() { co.mostra = !co.mostra; render(); },
    async 'co-copia'() { try { await navigator.clipboard.writeText(S.copiaOnline?.codice || ''); toast('📋 Codice copiato'); } catch { toast('Copia non riuscita: selezionalo e copialo a mano', 'errore'); } },
    'co-disattiva'() {
      if (!S.copiaOnline || !confirm('Disattivare la copia online? Le copie già salvate restano sul database e si possono ancora ripristinare con il codice.')) return;
      delete S.copiaOnline;
      clearTimeout(co.timer);
      co.ultima = 0; co.errore = ''; co.mostra = false;
      salva();
      render();
    },
    async 'co-ripristina'(el) {
      const quale = el.dataset.quale;
      const codice = CO.normCodice(co.codiceCercato);
      if (!codice || !quale) return;
      try {
        const id = await CO.idDa(codice);
        const pacchetto = await DV.leggi(`backup/${id}/${quale}`);
        const d = await CO.decifra(pacchetto, codice);
        if (!Array.isArray(d.campagne) || !Array.isArray(d.regolamenti)) throw new Error('la copia non contiene dati di Cronache del Master');
        if (!confirm(`Sostituire TUTTI i dati di questo PC con la copia online (${d.campagne.length} ${d.campagne.length === 1 ? 'campagna' : 'campagne'})? Conviene esportare prima un backup dei dati attuali.`)) return;
        S = normalizza(d);
        S.copiaOnline = { ...(S.copiaOnline || {}), codice };
        co.trovate = null;
        salva();
        location.hash = '#/campagne';
        render();
        toast(`↩ Dati ripristinati dalla copia online (${d.campagne.length} ${d.campagne.length === 1 ? 'campagna' : 'campagne'})`);
      } catch (e) { toast(`Ripristino non riuscito: ${esc(e.message || e)}`, 'errore'); }
    },
    'pg-esporta'(el) {
      const p = personaggio(el.dataset.id);
      if (!p) return;
      esportaScheda(p);
      toast(`💾 File della scheda di <b>${esc(p.nome)}</b> salvato${GIOCATORE ? ' nella cartella Download: mandalo al master' : ''}`);
    },
    // Giocatore: ricarica una scheda (sua o rimandata dal master) per continuare a compilarla
    async 'giocatore-carica'() {
      try {
        const d = await leggiFileScheda();
        if (!d) return;
        // File di un'astronave mandato dal master: si guarda (con le prove dell'equipaggio)
        if (d.formato === FORMATO_NAVE) {
          const v = { ...d.nave, _personaggi: d.personaggi || [] };
          S.astronavi = S.astronavi.filter((x) => x.id !== v.id).concat(v);
          salva();
          location.hash = `#/astronave/${v.id}`;
          toast(`🚀 Astronave <b>${esc(v.nome)}</b> importata`);
          return;
        }
        const r = S.regolamenti.find((x) => x.id === d.regolamento?.id) || S.regolamenti.find((x) => x.scheda && x.scheda === d.regolamento?.scheda);
        if (!r) { toast(`Questa scheda usa il regolamento «${esc(d.regolamento?.nome || '?')}», che qui non c'è`, 'errore'); return; }
        const c = campagnaGiocatore(r.id);
        const esiste = S.personaggi.find((x) => x.id === d.personaggio.id);
        const p = { ...d.personaggio, campagnaId: c.id };
        if (esiste) Object.assign(esiste, p); else S.personaggi.push(p);
        salva();
        location.hash = `#/personaggio/${p.id}`;
        toast(`📥 Scheda di <b>${esc(p.nome)}</b> importata`);
      } catch (e) { toast(esc(e.message), 'errore'); }
    },
    // Master: importa nella campagna la scheda mandata da un giocatore
    async 'pg-importa'(el) {
      const c = campagna(el.dataset.campagna);
      if (!c) return;
      try {
        const d = await leggiFileScheda();
        if (!d) return;
        if (d.formato === FORMATO_NAVE) { toast('Questo è il file di un\'astronave: le astronavi si creano nella scheda «Astronavi» della campagna', 'errore'); return; }
        const rc = regolamento(c.regolamentoId);
        if (rc && d.regolamento?.id !== rc.id && (d.regolamento?.scheda || '') !== (rc.scheda || '')
          && !confirm(`La scheda è fatta con «${d.regolamento?.nome}», ma la campagna usa «${rc.nome}». Importarla comunque?`)) return;
        const nuovo = { ...d.personaggio, campagnaId: c.id, tipo: el.dataset.tipo || d.personaggio.tipo || 'PG', importato: Date.now(), idGiocatore: d.personaggio.idGiocatore || d.personaggio.id };
        const stesso = S.personaggi.find((x) => x.campagnaId === c.id && (x.id === nuovo.id || norm(x.nome) === norm(nuovo.nome)));
        if (stesso && confirm(`In questa campagna c'è già «${stesso.nome}». Sostituire la sua scheda con quella del file?\n\nOK = sostituisci · Annulla = aggiungi come personaggio nuovo`)) {
          const id = stesso.id;
          for (const k of Object.keys(stesso)) delete stesso[k];
          Object.assign(stesso, nuovo, { id, campagnaId: c.id });
          salva();
          location.hash = `#/personaggio/${id}`;
          toast(`📥 Scheda di <b>${esc(stesso.nome)}</b> aggiornata dal file`);
          return;
        }
        nuovo.id = uid();
        if (stesso) nuovo.nome = `${nuovo.nome} (importato)`;
        S.personaggi.push(nuovo);
        salva();
        location.hash = `#/personaggio/${nuovo.id}`;
        toast(`📥 <b>${esc(nuovo.nome)}</b> importato nella campagna${nuovo.giocatore ? ` (giocatore: ${esc(nuovo.giocatore)})` : ''}`);
      } catch (e) { toast(esc(e.message), 'errore'); }
    },
    async 'kit-crea'() {
      if (!window.gdr?.creaKit) return;
      try {
        const cartella = await window.gdr.creaKit();
        if (cartella) toast(`🎁 Kit per i giocatori creato in <b>${esc(cartella)}</b>: comprimi la cartella e mandala ai giocatori`);
      } catch (e) { toast(`Kit non creato: ${esc(e.message)}`, 'errore'); }
    },
    // Sessione dal vivo
    async 'dv-scollega'() {
      const codice = dvG.codice;
      dvGScollega();
      try { const io = await DV.mioUid(); await DV.cancella(`sessioni/${codice}/pg/${io}`); } catch { /* sessione già chiusa */ }
      toast('📡 Scheda scollegata dalla sessione');
    },
    'dv-apri'(el) { const c = campagna(el.dataset.camp); if (c) dvMApri(c); },
    'dv-chiudi'(el) {
      if (!confirm('Chiudere la sessione dal vivo? I giocatori verranno scollegati e il codice non varrà più.')) return;
      dvMChiudi();
    },
    async 'kit-crea-web'(el) {
      if (!window.gdr?.creaKitWeb) return;
      const testo = el.textContent;
      el.disabled = true;
      el.textContent = '⏳ Preparo il kit e lo carico su GitHub…';
      try {
        const r = await window.gdr.creaKitWeb();
        if (!r) return;
        if (r.pubblicato) {
          try { await navigator.clipboard.writeText(r.sito); } catch { /* appunti non disponibili */ }
          toast(`📱 ${r.modifiche ? 'Nuova versione caricata su GitHub' : 'Su GitHub c\'era già questa versione'}: <b>${esc(r.sito)}</b> (link copiato). I telefoni la scaricano alla prossima apertura con la connessione; il sito si aggiorna in un paio di minuti.`);
        } else if (r.errore) {
          toast(`Kit rigenerato in <b>${esc(r.cartella)}</b>, ma il caricamento su GitHub non è riuscito: ${esc(r.errore)}`, 'errore');
        } else {
          toast(`📱 Kit per tablet e telefoni pronto in <b>${esc(r.cartella)}</b>: pubblicalo seguendo il LEGGIMI e manda il link ai giocatori`);
        }
      } catch (e) { toast(`Kit non creato: ${esc(e.message)}`, 'errore'); } finally { el.disabled = false; el.textContent = testo; }
    },
    async 'dati-cambia'(el) {
      if (!window.gdr?.cambiaCartella) return;
      // Prima si salva tutto nella cartella attuale, poi si cambia e si ricarica
      clearTimeout(timerSalva);
      timerSalva = null;
      try { await archivio.salva(S); } catch (e) { toast(`Salvataggio non riuscito: ${esc(e.message)}`, 'errore'); return; }
      try {
        const r = await window.gdr.cambiaCartella(el.dataset.modo);
        if (!r) return;
        if (!r.cambiata) { toast('È già la cartella in uso'); return; }
        location.reload();
      } catch (e) { toast(esc(e.message), 'errore'); }
    },
    'ritratto-carica'(el) {
      const p = personaggio(el.dataset.id);
      if (!p) return;
      const scelta = document.createElement('input');
      scelta.type = 'file';
      scelta.accept = 'image/png,image/jpeg,image/webp,image/gif';
      scelta.addEventListener('change', async () => {
        const file = scelta.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { toast('Immagine troppo grande (massimo 20 MB)', 'errore'); return; }
        try {
          const risultato = await regolaRitratto(await caricaImmagineFile(file));
          if (!risultato) return;
          p.immagine = risultato;
          p.modificato = Date.now();
          salva();
          render();
          toast('🖼 Immagine del personaggio aggiornata');
        } catch (e) { toast(esc(e.message), 'errore'); }
      });
      scelta.click();
    },
    'ritratto-togli'(el) {
      const p = personaggio(el.dataset.id);
      if (!p || !confirm(`Togliere l'immagine di ${p.nome}?`)) return;
      delete p.immagine;
      salva();
      render();
    },
  };

  function applicaBind(el) {
    const coll = { campagna: S.campagne, personaggio: S.personaggi, sessione: S.sessioni, regolamento: S.regolamenti }[el.dataset.bind];
    const ogg = coll?.find((o) => o.id === el.dataset.id);
    if (!ogg) return;
    if (el.dataset.lista) { ogg[el.dataset.lista] = analizza[el.dataset.lista](el.value); salva(); return; }
    let v = el.value;
    if (el.dataset.tipo === 'numero') v = v === '' ? '' : Number(v);
    const sez = el.dataset.sez;
    const chiave = el.dataset.chiave;
    if (!sez) {
      if (el.dataset.campo === 'nome' && !String(v).trim()) return; // un nome vuoto non si salva
      ogg[el.dataset.campo] = v;
    } else if (sez === 'risorse') {
      ogg.risorse = ogg.risorse || {};
      ogg.risorse[chiave] = ogg.risorse[chiave] || {};
      ogg.risorse[chiave][el.dataset.sub] = v;
    } else {
      ogg[sez] = ogg[sez] || {};
      ogg[sez][chiave] = v;
    }
    ogg.modificato = Date.now();
    salva();
    // Aggiornamenti mirati, senza ridisegnare la pagina (si perderebbe il cursore)
    if (!sez && el.dataset.campo === 'nome') {
      document.querySelectorAll(`[data-titolo="${el.dataset.bind}:${el.dataset.id}"]`).forEach((t) => { t.textContent = v; });
    }
    if (sez === 'caratteristiche') {
      const r = regDi(ogg);
      document.querySelectorAll('[data-mod]').forEach((m) => { if (m.dataset.mod === chiave) m.textContent = testoMod(r, v); });
    }
    if (el.id === 'testo-sessione') {
      const box = $('#png-riconosciuti');
      if (box) box.innerHTML = chipCitati(ogg.testo, personaggiDi(ogg.campagnaId)) || '<span class="muto">nessuno</span>';
    }
  }

  // ================= Autocompletamento @ nel diario =================
  let ac = null;
  let acChiusoA = null; // posizione della @ per cui l'utente ha chiuso i suggerimenti

  function coordCursore(ta, pos) {
    const st = getComputedStyle(ta);
    const div = document.createElement('div');
    for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'tabSize']) div.style[k] = st[k];
    Object.assign(div.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', width: ta.offsetWidth + 'px', top: '0', left: '-9999px' });
    div.textContent = ta.value.slice(0, pos);
    const span = document.createElement('span');
    span.textContent = ta.value.slice(pos) || '.';
    div.appendChild(span);
    document.body.appendChild(div);
    const r = ta.getBoundingClientRect();
    const alt = parseFloat(st.lineHeight) || 24;
    const out = { x: r.left + span.offsetLeft - ta.scrollLeft, y: r.top + span.offsetTop - ta.scrollTop + alt };
    div.remove();
    return out;
  }

  function aggiornaSuggerimenti(ta) {
    const pos = ta.selectionStart;
    if (pos !== ta.selectionEnd) return chiudiSuggerimenti();
    const prima = ta.value.slice(0, pos);
    const m = prima.match(/(^|[^\p{L}\p{N}_])@\[?([^\n@[\]]{0,40})$/u);
    if (!m) { acChiusoA = null; return chiudiSuggerimenti(); }
    const q = m[2];
    const inizio = pos - m[0].length + m[1].length;
    if (/[.,;:!?()"]/.test(q) || /^\s|\s{2}/.test(q) || q.split(/\s+/).length > 4 || inizio === acChiusoA) return chiudiSuggerimenti();
    const s = sessione(ta.dataset.id);
    if (!s) return;
    const pers = personaggiDi(s.campagnaId);
    const qn = norm(q.trim());
    const voci = pers
      .map((p) => {
        const nomi = nomiDi(p).map(norm);
        const punti = !qn ? 1 : nomi.some((n) => n.startsWith(qn)) ? 3 : nomi.some((n) => n.split(/\s+/).some((w) => w.startsWith(qn))) ? 2 : nomi.some((n) => n.includes(qn)) ? 1 : 0;
        return { tipo: 'pg', p, punti };
      })
      .filter((v) => v.punti > 0)
      .sort((a, b) => b.punti - a.punti || (a.p.tipo === b.p.tipo ? 0 : a.p.tipo === 'PNG' ? -1 : 1) || a.p.nome.localeCompare(b.p.nome))
      .slice(0, 8);
    if (qn && !pers.some((p) => nomiDi(p).some((n) => norm(n) === qn))) voci.push({ tipo: 'nuovo', nome: q.trim() });
    if (!voci.length) return chiudiSuggerimenti();
    ac = { ta, inizio, fine: pos, voci, sel: 0 };
    disegnaSuggerimenti();
  }

  function disegnaSuggerimenti() {
    const box = $('#suggerimenti');
    box.innerHTML = ac.voci.map((v, i) => `<div class="sugg${i === ac.sel ? ' sel' : ''}" data-indice="${i}">${v.tipo === 'nuovo'
      ? `<span class="sugg-nuovo">+ Crea PNG «${esc(v.nome)}»</span>`
      : `<b>${esc(v.p.nome)}</b> <span class="badge ${v.p.tipo === 'PG' ? 'badge-pg' : ''}">${v.p.tipo}</span>${v.p.ruolo ? ` <span class="muto">${esc(v.p.ruolo)}</span>` : ''}`}</div>`).join('')
      + '<div class="sugg-aiuto">↑↓ scegli · Invio inserisci · Esc chiudi</div>';
    const { x, y } = coordCursore(ac.ta, ac.inizio);
    box.hidden = false;
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    box.style.left = Math.min(x, window.innerWidth - w - 12) + 'px';
    box.style.top = (y + h > window.innerHeight - 8 ? y - h - 28 : y + 4) + 'px';
  }

  function chiudiSuggerimenti() {
    ac = null;
    const box = $('#suggerimenti');
    if (box) box.hidden = true;
  }

  function scegliSuggerimento(i) {
    if (!ac) return;
    const v = ac.voci[i];
    const ta = ac.ta;
    const s = sessione(ta.dataset.id);
    let nome;
    if (v.tipo === 'nuovo') {
      const p = nuovoPersonaggio(s.campagnaId, v.nome, 'PNG');
      nome = p.nome;
      toast(`PNG <b>${esc(nome)}</b> creato`);
    } else nome = v.p.nome;
    const ins = `@[${nome}] `;
    const { inizio, fine } = ac;
    ta.value = ta.value.slice(0, inizio) + ins + ta.value.slice(fine).replace(/^\]/, '');
    const cur = inizio + ins.length;
    ta.setSelectionRange(cur, cur);
    chiudiSuggerimenti();
    ta.focus();
    applicaBind(ta);
  }

  // Ultima cosa eliminata: si può recuperare dal tasto Annulla del messaggio (fino alla prossima eliminazione)
  let ultimaEliminazione = null;
  function memorizzaEliminazione(cosa, messaggio) {
    ultimaEliminazione = cosa;
    setTimeout(() => toast(`🗑 ${messaggio} <button class="btn-piccolo" data-azione="annulla-eliminazione">↩ Annulla</button>`), 50);
  }

  // ================= Sessione dal vivo (src/dal-vivo.js) =================
  // Il master apre una sessione dal tracker e ottiene un codice; il giocatore lo scrive nella sua scheda (kit) e da lì
  // ogni modifica della scheda arriva al master in tempo reale. La scheda viaggia intera (come testo JSON): il tracker
  // la legge come le altre e si aggiorna da solo (PF, incantesimi, risorse…). Gli incantesimi lanciati arrivano come eventi.
  const DV = window.DalVivo;
  const dvAttivo = () => !!DV?.configurato();
  const testoSemplice = (html) => String(html).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  // Se si sta scrivendo in un campo, il ridisegno aspetta che il campo perda il fuoco
  let dvRidisegnoInAttesa = false;
  function dvRidisegna() {
    const a = document.activeElement;
    if (a && a.closest?.('#contenuto') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) {
      if (!dvRidisegnoInAttesa) { dvRidisegnoInAttesa = true; a.addEventListener('blur', () => { dvRidisegnoInAttesa = false; setTimeout(render, 0); }, { once: true }); }
      return;
    }
    render();
  }

  // Differenze tra due versioni della scheda: elenco di [percorso, valore] (gli elenchi si sostituiscono interi)
  function differenze(a, b, percorso = [], out = []) {
    if (JSON.stringify(a) === JSON.stringify(b)) return out;
    const oggetto = (x) => x && typeof x === 'object' && !Array.isArray(x);
    if (oggetto(a) && oggetto(b)) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) differenze(a[k], b[k], [...percorso, k], out); }
    else out.push(b === undefined ? [percorso, 0, true] : [percorso, b]);
    return out;
  }
  function applicaDifferenze(o, ops) {
    for (const [percorso, v, togli] of ops) {
      if (!percorso.length) continue;
      let x = o;
      for (const k of percorso.slice(0, -1)) { if (!x[k] || typeof x[k] !== 'object') x[k] = {}; x = x[k]; }
      if (togli) delete x[percorso[percorso.length - 1]]; else x[percorso[percorso.length - 1]] = v;
    }
  }

  // ---------- Giocatore: collegamento della scheda ----------
  const CHIAVE_DV_GIOCATORE = 'dal-vivo-giocatore';
  // ultimoComando: l'ultima correzione del master applicata (null = alla prima lettura si saltano quelle già presenti)
  const dvG = { codice: '', pgId: '', ultimo: '', timer: null, stato: '', ultimoComando: null, statoMaster: null, stop: null };
  try { Object.assign(dvG, JSON.parse(localStorage.getItem(CHIAVE_DV_GIOCATORE) || '{}')); } catch { /* niente */ }
  const dvGRicorda = () => { try { localStorage.setItem(CHIAVE_DV_GIOCATORE, JSON.stringify({ codice: dvG.codice, pgId: dvG.pgId, ultimoComando: dvG.ultimoComando })); } catch { /* niente */ } };
  // Ascolta le correzioni del master (danni, cure, condizioni, modifiche alla scheda) e lo stato dello scontro (turno, condizioni)
  // Astronavi mandate dal master nella sessione: si aggiungono o si aggiornano (segnate «dalVivo»)
  function dvGRiceviNavi(copia) {
    const arrivate = Object.values(copia || {}).map((x) => { try { return JSON.parse(x.testo); } catch { return null; } }).filter((x) => x?.nave?.id);
    let cambiate = false;
    for (const { nave: v, personaggi } of arrivate) {
      const prima = S.astronavi.find((x) => x.id === v.id);
      const nuova = { ...v, _personaggi: personaggi || [], dalVivo: true };
      if (prima && JSON.stringify(prima) === JSON.stringify(nuova)) continue;
      cambiate = true;
      if (prima?.dalVivo && Number(prima.combattimento?.danni || 0) !== Number(v.combattimento?.danni || 0)) {
        const k = nv.calcola(nuova, nuova._personaggi);
        toast(`🚀 <b>${esc(v.nome)}</b>: Punti Scafo ${k.psMax - Number(prima.combattimento?.danni || 0)} → <b>${k.psMax - Number(v.combattimento?.danni || 0)}</b>`);
      }
      if (prima) { for (const k of Object.keys(prima)) delete prima[k]; Object.assign(prima, nuova); } else S.astronavi.push(nuova);
    }
    // Quelle tolte dal master spariscono (solo quelle arrivate dal vivo). Se manca tutto il ramo (sessione chiusa)
    // il giocatore tiene l'ultima versione ricevuta.
    const ids = new Set(arrivate.map((x) => x.nave.id));
    const prima = S.astronavi.length;
    if (copia) S.astronavi = S.astronavi.filter((x) => !x.dalVivo || ids.has(x.id));
    if (cambiate || S.astronavi.length !== prima) { salva(); dvRidisegna(); }
  }
  async function dvGAscolta() {
    dvG.stop?.();
    dvG.stop = null;
    dvG.stopNavi?.();
    dvG.stopNavi = null;
    if (!dvG.codice || !dvAttivo()) return;
    const io = await DV.mioUid();
    const codice = dvG.codice;
    dvG.stopNavi = DV.ascolta(`sessioni/${codice}/astronavi`, (copia) => { if (dvG.codice === codice) dvGRiceviNavi(copia); }, () => {});
    dvG.stopMappa?.();
    dvG.stopMappa = DV.ascolta(`sessioni/${codice}/battaglia`, (copia) => {
      if (dvG.codice !== codice) return;
      let b = null;
      try { b = copia?.testo ? JSON.parse(copia.testo) : null; } catch { b = null; }
      const prima = mappaDalVivo.battaglia;
      mappaDalVivo.battaglia = b;
      if (b && prima && b.round !== prima.round) toast(`🗺 Combattimento tra astronavi: round <b>${b.round}</b>`);
      if (JSON.stringify(prima) !== JSON.stringify(b) && (location.hash.startsWith('#/mappa') || !b !== !prima)) dvRidisegna();
    }, () => {});
    dvG.stop = DV.ascolta(`sessioni/${codice}/perGiocatore/${io}`, (copia) => {
      if (dvG.codice !== codice) return;
      const comandi = Object.entries(copia?.comandi || {}).sort(([a], [b]) => (a < b ? -1 : 1));
      if (dvG.ultimoComando == null) { dvG.ultimoComando = comandi.length ? comandi[comandi.length - 1][0] : ''; dvGRicorda(); }
      const nuovi = comandi.filter(([k]) => k > dvG.ultimoComando);
      const p = personaggio(dvG.pgId);
      if (nuovi.length && p) {
        const prima = pf1.pfDalVivo(p.id);
        for (const [k, cmd] of nuovi) {
          try { applicaDifferenze(p, JSON.parse(cmd.ops || '[]')); } catch (e) { registra(`dal vivo: correzione non applicata ${e}`); }
          dvG.ultimoComando = k;
        }
        dvGRicorda();
        const dopo = pf1.pfDalVivo(p.id);
        toast(prima && dopo && prima.pf !== dopo.pf ? `❤ Il master: PF ${prima.pf} → <b>${dopo.pf}</b>` : '📡 Il master ha aggiornato la scheda');
        salva();
        dvRidisegna();
      }
      // Stato dello scontro: tocca a te, round, condizioni del tracker
      const st = copia?.stato || null;
      const eraTurno = !!dvG.statoMaster?.turno;
      const cambiato = JSON.stringify(st) !== JSON.stringify(dvG.statoMaster);
      dvG.statoMaster = st;
      if (st?.turno && !eraTurno) { toast(`⚔ <b>Tocca a te!</b>${st.round ? ` (round ${st.round})` : ''}`); try { navigator.vibrate?.([200, 100, 200]); } catch { /* niente */ } }
      if (cambiato) { const el = $('#dv-scontro'); if (el) el.outerHTML = scontroDvGiocatore(); }
    }, () => {});
  }
  const scontroDvGiocatore = () => {
    const st = dvG.statoMaster;
    if (!st || (!st.inScontro && !st.condizioni?.length)) return '<div id="dv-scontro"></div>';
    return `<div id="dv-scontro" class="dv-scontro${st.turno ? ' turno' : ''}">
      ${st.turno ? '<b class="dv-turno">⚔ Tocca a te!</b>' : st.inScontro ? `<span>⚔ In combattimento${st.di ? ` · turno di <b>${esc(st.di)}</b>` : ''}</span>` : ''}
      ${st.round ? `<span class="muto">round ${st.round}</span>` : ''}
      ${(st.condizioni || []).map((x) => `<span class="chip chip-cond">${esc(x.nome)}${x.durata ? ` <small>${x.durata} r</small>` : ''}</span>`).join(' ')}</div>`;
  };
  function dvGScollega(messaggio) {
    dvG.stop?.();
    dvG.stopNavi?.();
    dvG.stopNavi = null;
    dvG.stopMappa?.();
    dvG.stopMappa = null;
    mappaDalVivo.battaglia = null;
    // Le astronavi ricevute restano com'erano, ma non si aggiornano più
    for (const v of S.astronavi) if (v.dalVivo) v.dalVivo = false;
    dvG.codice = ''; dvG.pgId = ''; dvG.ultimo = ''; dvG.stato = ''; dvG.ultimoComando = null; dvG.statoMaster = null; dvG.stop = null;
    clearTimeout(dvG.timer);
    dvGRicorda();
    if (messaggio) toast(messaggio, 'errore');
    dvRidisegna();
  }
  function dvGProgramma() {
    if (!dvG.codice || !dvAttivo()) return;
    clearTimeout(dvG.timer);
    dvG.timer = setTimeout(dvGInvia, 900);
  }
  async function dvGInvia(forza = false) {
    const p = dvG.codice && personaggio(dvG.pgId);
    if (!p) return;
    const pers = JSON.parse(JSON.stringify(p));
    delete pers.campagnaId;
    const testo = JSON.stringify(pers);
    if (!forza && testo === dvG.ultimo) return;
    const r = regDi(p);
    try {
      const io = await DV.mioUid();
      // ultimoComando: fin dove la scheda contiene le correzioni del master (le successive il master le rimette sopra)
      await DV.scrivi(`sessioni/${dvG.codice}/pg/${io}`, { nome: String(p.nome || '?').slice(0, 120), regolamento: { id: r?.id || '', nome: r?.nome || '', scheda: r?.scheda || '' }, pers: testo, ultimoComando: dvG.ultimoComando || '', aggiornato: DV.ORA });
      dvG.ultimo = testo;
      if (dvG.stato !== 'ok') { dvG.stato = 'ok'; aggiornaStatoDv(); }
    } catch (e) {
      if (e.stato === 401 || e.stato === 403) dvGScollega(`📡 La sessione <b>${esc(dvG.codice)}</b> è stata chiusa dal master (o il codice non è valido)`);
      else { dvG.stato = 'errore'; aggiornaStatoDv(); dvG.timer = setTimeout(() => dvGInvia(true), 8000); }
    }
  }
  function aggiornaStatoDv() {
    const el = $('#dv-stato');
    if (el) el.outerHTML = statoDvGiocatore();
  }
  const statoDvGiocatore = () => `<span id="dv-stato" class="dv-stato ${dvG.stato === 'errore' ? 'errore' : ''}">${dvG.stato === 'errore' ? '🟠 Connessione assente: riprovo…' : dvG.stato === 'ok' ? '🟢 Dal vivo' : '⏳ Collegamento…'} · <b>${esc(dvG.codice)}</b></span>`;
  function barraDalVivoGiocatore(p) {
    if (!dvAttivo()) return '';
    if (dvG.codice && dvG.pgId === p.id) {
      return `<div class="barra-azioni dv-giocatore">${statoDvGiocatore()}
        <button class="btn-piccolo" data-azione="dv-scollega">Scollega</button>
        <span class="muto">Il master vede la scheda in tempo reale; danni, cure e condizioni che segna lui arrivano qui.</span></div>
      ${scontroDvGiocatore()}`;
    }
    return `<form class="riga-form dv-giocatore" data-form="dv-collega" autocomplete="off">
        <input type="hidden" name="pg" value="${p.id}">
        <input name="codice" placeholder="Codice del master (es. DRAGO-4821)" autocapitalize="characters" required>
        <button>📡 Collegati alla sessione</button>
        ${dvG.codice ? `<span class="muto">Ora è collegato <b>${esc(personaggio(dvG.pgId)?.nome || '')}</b>: collegando questo, l'altro si scollega.</span>` : ''}</form>`;
  }
  async function dvGCollega(codice, pgId) {
    const c = DV.normCodice(codice);
    if (!/^[A-Z]+-\d{4}$/.test(c)) { toast('Il codice è fatto così: una parola e quattro cifre (es. DRAGO-4821)', 'errore'); return; }
    try {
      const aperta = await DV.leggi(`sessioni/${c}/aperta`);
      if (aperta !== true) throw Object.assign(new Error('chiusa'), { stato: 401 });
    } catch (e) {
      toast(e.stato === 401 || e.stato === 403 ? `Nessuna sessione aperta con il codice <b>${esc(c)}</b>: controlla il codice con il master` : `Collegamento non riuscito: ${esc(e.message)}`, 'errore');
      return;
    }
    // Se prima era collegato un altro personaggio, la sua voce nella sessione si sostituisce (una per dispositivo)
    Object.assign(dvG, { codice: c, pgId, ultimo: '', stato: '', ultimoComando: null, statoMaster: null });
    dvGRicorda();
    render();
    await dvGAscolta();
    await dvGInvia(true);
    toast(`📡 Collegato alla sessione <b>${esc(c)}</b>: il master vede la tua scheda`);
  }
  // Riavvio della scheda: se era collegata, si rimanda subito lo stato attuale
  if (GIOCATORE && dvG.codice && dvAttivo()) setTimeout(() => { dvGAscolta(); dvGInvia(true); }, 1500);

  // ---------- Master: sessione aperta dal tracker ----------
  // base[pgId]: la scheda come la conosce il giocatore; inAttesa[pgId]: correzioni mandate e non ancora confermate;
  // statoInviato[uid]: l'ultimo stato dello scontro mandato a quel giocatore
  const dvM = { codice: '', campagnaId: '', stop: null, giocatori: {}, visti: {}, eventiVisti: new Set(), errore: '', base: {}, inAttesa: {}, statoInviato: {}, naviInviate: {}, timer: null };
  // Campi della scheda che restano del master (non viaggiano verso il giocatore)
  const CAMPI_DEL_MASTER = ['id', 'campagnaId', 'tipo', 'importato', 'documenti', 'idGiocatore'];
  const schedaPerGiocatore = (p) => { const x = JSON.parse(JSON.stringify(p)); for (const k of CAMPI_DEL_MASTER) delete x[k]; return x; };
  // Dopo ogni salvataggio del master: le modifiche ai PG collegati partono verso i giocatori, con lo stato dello scontro
  function dvMProgramma() {
    if (!dvM.codice) return;
    clearTimeout(dvM.timer);
    dvM.timer = setTimeout(dvMInvia, 500);
  }
  // Astronavi della campagna nella sessione dal vivo: sessioni/<codice>/astronavi/<id> = { testo: JSON di nave + equipaggio }
  function dvMInviaNavi(c, codice) {
    // Mappa del combattimento tra astronavi (solo se c'è almeno una nave sopra)
    const b = c.battaglia?.pedine?.length ? { round: c.battaglia.round, pedine: c.battaglia.pedine.map(({ storia, ...x }) => x) } : null;
    const testoMappa = JSON.stringify(b);
    if (dvM.battagliaInviata !== testoMappa) {
      dvM.battagliaInviata = testoMappa;
      (b ? DV.scrivi(`sessioni/${codice}/battaglia`, { testo: testoMappa, t: DV.ORA }) : DV.cancella(`sessioni/${codice}/battaglia`))
        .catch(() => { dvM.battagliaInviata = null; });
    }
    const navi = S.astronavi.filter((x) => x.campagnaId === c.id);
    for (const v of navi) {
      const copia = JSON.parse(JSON.stringify(v));
      delete copia._personaggi;
      const ids = new Set(Object.values(v.equipaggio || {}).flat().filter(Boolean));
      const pers = personaggiDi(c.id).filter((p) => ids.has(p.id)).map((p) => { const x = JSON.parse(JSON.stringify(p)); delete x.campagnaId; return x; });
      const testo = JSON.stringify({ nave: copia, personaggi: pers });
      if (dvM.naviInviate[v.id] === testo) continue;
      dvM.naviInviate[v.id] = testo;
      DV.scrivi(`sessioni/${codice}/astronavi/${v.id}`, { testo, t: DV.ORA }).catch((e) => { delete dvM.naviInviate[v.id]; dvM.errore = `astronave non inviata: ${e.message}`; });
    }
    // Astronavi eliminate: spariscono anche dai giocatori
    for (const id of Object.keys(dvM.naviInviate)) {
      if (navi.some((v) => v.id === id)) continue;
      delete dvM.naviInviate[id];
      DV.cancella(`sessioni/${codice}/astronavi/${id}`).catch(() => {});
    }
  }
  function dvMInvia() {
    const c = campagna(dvM.campagnaId);
    if (!c || !dvM.codice) return;
    const codice = dvM.codice;
    dvMInviaNavi(c, codice);
    const inc = c.incontro;
    const attivo = inc?.fase ? inc.combattenti.find((x) => x.id === inc.attivo) : null;
    for (const [u, g] of Object.entries(dvM.giocatori)) {
      const p = personaggio(g.pgId);
      if (!p) continue;
      // Correzioni alla scheda
      const ora = schedaPerGiocatore(p);
      const base = dvM.base[p.id];
      if (base) {
        const ops = differenze(base, ora);
        if (ops.length) {
          dvM.base[p.id] = ora;
          const voce = { key: '~', ops };
          (dvM.inAttesa[p.id] = dvM.inAttesa[p.id] || []).push(voce);
          DV.aggiungi(`sessioni/${codice}/perGiocatore/${u}/comandi`, { ops: JSON.stringify(ops), t: DV.ORA })
            .then((r) => { voce.key = r?.name || voce.key; })
            .catch((e) => { dvM.inAttesa[p.id] = (dvM.inAttesa[p.id] || []).filter((x) => x !== voce); dvM.errore = `correzione non inviata a ${p.nome}: ${e.message}`; });
        }
      }
      // Stato dello scontro per quel giocatore
      const cb = inc?.combattenti?.find((x) => x.pgId === p.id);
      const st = cb ? {
        inScontro: !!inc.fase, turno: !!(inc.fase && inc.attivo === cb.id), round: inc.fase === 'sorpresa' ? 0 : Number(inc.round) || 0,
        di: attivo && attivo.id !== cb.id ? (attivo.pgId ? personaggio(attivo.pgId)?.nome : attivo.nome) || '' : '',
        condizioni: (cb.condizioni || []).map((x) => ({ nome: String(x.nome), durata: x.durata === '' || x.durata == null ? 0 : Number(x.durata) })),
      } : null;
      const testo = JSON.stringify(st);
      if (dvM.statoInviato[u] !== testo) {
        dvM.statoInviato[u] = testo;
        DV.scrivi(`sessioni/${codice}/perGiocatore/${u}/stato`, st).catch(() => { delete dvM.statoInviato[u]; });
      }
    }
  }
  async function dvMApri(c) {
    if (!dvAttivo()) { toast('La sessione dal vivo non è ancora configurata (manca il database Firebase)', 'errore'); return; }
    if (dvM.codice) await dvMChiudi(false);
    try {
      const io = await DV.mioUid();
      let codice = '';
      for (let i = 0; i < 6 && !codice; i++) {
        const prova = DV.codiceNuovo();
        try { await DV.leggi(`sessioni/${prova}/aperta`); } catch (e) { if (e.stato === 401 || e.stato === 403) codice = prova; else throw e; }
      }
      if (!codice) throw new Error('nessun codice libero, riprova');
      await DV.scrivi(`sessioni/${codice}`, { master: io, aperta: true, campagna: String(c.nome || '').slice(0, 120), creata: DV.ORA });
      c.dalVivo = { codice, aperta: Date.now() };
      salva();
      dvMAscolta(c);
      dvMProgramma(); // le astronavi della campagna partono subito verso i giocatori
      toast(`📡 Sessione dal vivo aperta: codice <b>${esc(codice)}</b>`);
    } catch (e) { toast(`Sessione non aperta: ${esc(e.message)}`, 'errore'); }
    render();
  }
  function dvMAscolta(c) {
    dvM.stop?.();
    Object.assign(dvM, { codice: c.dalVivo.codice, campagnaId: c.id, giocatori: {}, visti: {}, eventiVisti: new Set(), errore: '', base: {}, inAttesa: {}, statoInviato: {} });
    dvM.stop = DV.ascolta(`sessioni/${dvM.codice}`, (copia) => dvMElabora(copia), (e) => {
      dvM.errore = e.message;
      // Sessione sparita (chiusa da un altro PC o scaduta): si chiude anche qui
      if (/negato/.test(e.message)) { const cc = campagna(dvM.campagnaId); if (cc) delete cc.dalVivo; dvM.stop?.(); Object.assign(dvM, { codice: '', campagnaId: '', stop: null }); salva(); }
      dvRidisegna();
    });
  }
  async function dvMChiudi(avvisa = true) {
    const c = campagna(dvM.campagnaId);
    const codice = dvM.codice;
    dvM.stop?.();
    clearTimeout(dvM.timer);
    Object.assign(dvM, { codice: '', campagnaId: '', stop: null, giocatori: {}, base: {}, inAttesa: {}, statoInviato: {}, naviInviate: {}, battagliaInviata: null });
    if (c) { delete c.dalVivo; salva(); }
    try { if (codice) await DV.cancella(`sessioni/${codice}`); } catch { /* già chiusa */ }
    if (avvisa) toast(`📡 Sessione dal vivo <b>${esc(codice)}</b> chiusa: i giocatori non sono più collegati`);
    render();
  }
  function dvMElabora(copia) {
    const c = campagna(dvM.campagnaId);
    if (!c || !copia) return;
    let cambiato = false;
    const pgCambiati = new Set();
    for (const [u, g] of Object.entries(copia.pg || {})) {
      if (!g || typeof g.pers !== 'string') continue;
      if (dvM.visti[u] === g.aggiornato && dvM.giocatori[u]) continue;
      let pers;
      try { pers = JSON.parse(g.pers); } catch { continue; }
      if (!pers || typeof pers !== 'object') continue;
      dvM.visti[u] = g.aggiornato;
      // Il personaggio della campagna: già collegato, importato da questo giocatore, o con lo stesso nome
      const tra = S.personaggi.filter((x) => x.campagnaId === c.id);
      let loc = tra.find((x) => x.idGiocatore && x.idGiocatore === pers.id) || tra.find((x) => x.id === pers.id)
        || tra.find((x) => x.tipo === 'PG' && !x.idGiocatore && norm(x.nome) === norm(pers.nome));
      // Correzioni del master non ancora arrivate al giocatore: si rimettono sopra la sua scheda
      const ack = String(g.ultimoComando || '');
      if (loc) {
        const pend = (dvM.inAttesa[loc.id] || []).filter((x) => x.key > ack);
        dvM.inAttesa[loc.id] = pend;
        for (const x of pend) applicaDifferenze(pers, x.ops);
      }
      if (loc) {
        const prima = pf1.pfDalVivo(loc.id);
        const tieni = { id: loc.id, campagnaId: c.id, tipo: loc.tipo, importato: loc.importato, documenti: loc.documenti };
        const immagine = loc.immagine;
        for (const k of Object.keys(loc)) delete loc[k];
        Object.assign(loc, pers, tieni, { idGiocatore: pers.id });
        if (!loc.immagine && immagine) loc.immagine = immagine;
        if (!loc.documenti) delete loc.documenti;
        const dopo = pf1.pfDalVivo(loc.id);
        if (prima && dopo) {
          if (prima.pf !== dopo.pf) pf1.annotaDalVivo(c, `❤ ${loc.nome}: PF ${prima.pf} → ${dopo.pf}`);
          if (prima.ps !== dopo.ps && dopo.psMax) pf1.annotaDalVivo(c, `💠 ${loc.nome}: PS ${prima.ps} → ${dopo.ps}`);
        }
      } else {
        loc = { ...pers, id: uid(), idGiocatore: pers.id, campagnaId: c.id, tipo: 'PG', importato: Date.now() };
        S.personaggi.push(loc);
        toast(`📡 <b>${esc(loc.nome)}</b> si è collegato ed è stato aggiunto ai personaggi della campagna`);
      }
      if (!dvM.giocatori[u]) { pf1.annotaDalVivo(c, `📡 ${loc.nome} è collegato dal vivo`); delete dvM.statoInviato[u]; }
      dvM.giocatori[u] = { nome: loc.nome, pgId: loc.id, aggiornato: g.aggiornato };
      // La scheda come la vede ora il giocatore (più le correzioni in viaggio): base per le prossime correzioni
      dvM.base[loc.id] = schedaPerGiocatore(loc);
      pgCambiati.add(loc.id);
      cambiato = true;
    }
    // Giocatori che si sono scollegati (voce tolta dalla sessione)
    for (const u of Object.keys(dvM.giocatori)) if (!copia.pg?.[u]) { delete dvM.giocatori[u]; cambiato = true; }
    // Eventi (incantesimi lanciati…): nel registro dello scontro e in un avviso, poi si cancellano dal database
    for (const [k, ev] of Object.entries(copia.eventi || {})) {
      if (dvM.eventiVisti.has(k)) continue;
      dvM.eventiVisti.add(k);
      const chi = dvM.giocatori[ev.uid]?.nome || copia.pg?.[ev.uid]?.nome || 'Un giocatore';
      pf1.annotaDalVivo(c, `${chi}: ${ev.testo}`);
      toast(`📡 <b>${esc(chi)}</b>: ${esc(ev.testo)}`);
      DV.cancella(`sessioni/${dvM.codice}/eventi/${k}`).catch(() => {});
      cambiato = true;
    }
    if (!cambiato) return;
    salva();
    const h = location.hash;
    if (h.includes(c.id) || [...pgCambiati].some((id) => h.includes(id))) dvRidisegna();
  }
  // Pannello nel tracker di combattimento
  function pannelloDalVivo(c) {
    if (!dvAttivo() || SCHERMO) return '';
    if (c.dalVivo?.codice && dvM.codice !== c.dalVivo.codice) setTimeout(() => { if (c.dalVivo?.codice && dvM.codice !== c.dalVivo.codice) dvMAscolta(c); }, 0);
    const attr = `data-camp="${c.id}"`;
    if (!c.dalVivo?.codice) {
      return `<div class="dv-master"><button data-azione="dv-apri" ${attr}>📡 Apri sessione dal vivo</button>
        <span class="muto">I giocatori si collegano dalla loro scheda (kit per tablet e telefoni) con un codice: qui vedi PF, incantesimi e risorse in tempo reale.</span></div>`;
    }
    const gg = Object.values(dvM.codice === c.dalVivo.codice ? dvM.giocatori : {});
    const ora = (t) => (typeof t === 'number' ? new Date(t).toLocaleTimeString('it-IT') : '');
    return `<div class="dv-master aperta">
      <div class="dv-codice" title="Detta questo codice ai giocatori">📡 Codice <b>${esc(c.dalVivo.codice)}</b></div>
      <div class="dv-giocatori">${gg.length ? gg.map((g) => `<a class="chip dv-chip" href="#/personaggio/${g.pgId}">🟢 ${esc(g.nome)} <small>${ora(g.aggiornato)}</small></a>`).join(' ') : '<span class="muto">Nessun giocatore collegato: nella scheda premono «📡 Collegati alla sessione» e scrivono il codice.</span>'}
        ${dvM.errore ? `<span class="oltre">⚠ ${esc(dvM.errore)}</span>` : ''}</div>
      <button class="btn-piccolo pericolo" data-azione="dv-chiudi" ${attr}>Chiudi sessione</button>
    </div>`;
  }

  // ================= Notifiche =================
  let timerToast = null;
  function toast(html, tipo = '') {
    // Scheda collegata dal vivo: gli incantesimi lanciati e i riposi arrivano anche al master (nel registro dello scontro)
    if (GIOCATORE && dvG.codice && tipo !== 'errore' && dvAttivo()
      && ((/^\s*✨/.test(html) && /lanciat|con uno slot|slot del patto/i.test(html)) || /^\s*🌙/.test(html))) {
      const testo = testoSemplice(html).slice(0, 480);
      DV.mioUid().then((io) => DV.aggiungi(`sessioni/${dvG.codice}/eventi`, { uid: io, testo, t: DV.ORA })).catch(() => {});
    }
    const t = $('#toast');
    t.innerHTML = `<div class="toast ${tipo}">${html}</div>`;
    t.classList.add('visibile');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => t.classList.remove('visibile'), tipo === 'errore' || html.includes('annulla-eliminazione') ? 10000 : 4500);
  }

  Object.assign(azioni, pf1.azioni);
  Object.assign(moduli, pf1.moduli);
  Object.assign(azioni, sf.azioni);
  Object.assign(azioni, nv.azioni);
  Object.assign(azioni, mp.azioni);
  Object.assign(azioni, dnd.azioni);
  Object.assign(azioni, pf2.azioni);
  Object.assign(moduli, sf.moduli);

  // ================= Eventi =================
  // Le finestre di sola lettura (libro, breviario) non scrivono i dati: certi comandi li eseguono la finestra principale
  const canaleComandi = !window.gdr && 'BroadcastChannel' in window ? new BroadcastChannel('cronache-comandi') : null;
  function inviaComando(el) {
    const cmd = { azione: el.dataset.azione, dataset: { ...el.dataset } };
    if (window.gdr?.inviaComando) window.gdr.inviaComando(cmd); else canaleComandi?.postMessage(cmd);
  }
  const AZIONI_REMOTE = new Set(['brev-prepara', 'brev-togli', 'brev-lancia', 'brev-ripristina', 'sf-lancia']);
  function eseguiComando(cmd) {
    if (SCHERMO || !cmd || !AZIONI_REMOTE.has(cmd.azione) || !azioni[cmd.azione]) return;
    azioni[cmd.azione]({ dataset: cmd.dataset, closest: () => null });
  }
  if (window.gdr?.suComando) window.gdr.suComando(eseguiComando);
  else if (canaleComandi) canaleComandi.onmessage = (e) => eseguiComando(e.data);
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-azione]');
    if (el && SCHERMO && el.dataset.remoto !== undefined) { e.preventDefault(); inviaComando(el); return; }
    if (el && azioni[el.dataset.azione]) { e.preventDefault(); azioni[el.dataset.azione](el, e); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.id === 'form-cerca') {
      e.preventDefault();
      const q = $('#cerca-globale').value.trim();
      location.hash = `#/cerca?q=${encodeURIComponent(q)}`;
      $('#cerca-globale').value = '';
      return;
    }
    if (f.dataset.form && moduli[f.dataset.form]) { e.preventDefault(); moduli[f.dataset.form](new FormData(f), f); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.bind && !el.dataset.lista) applicaBind(el);
    // Nome di un luogo dell'equipaggiamento (borsa, casa, cavallo…): lo sceglie il giocatore
    // Tipo di una borsa conservante (I–IV): cambia peso e limiti, quindi si ridisegna
    if (el.dataset.borsaTipo) {
      const d = datiSistema(el.dataset.id, el.dataset.sistema);
      if (!d) return;
      d.borseTipi = d.borseTipi || {};
      if (el.value) d.borseTipi[el.dataset.borsaTipo] = el.value; else delete d.borseTipi[el.dataset.borsaTipo];
      salva();
      render();
      return;
    }
    if (el.dataset.luogoNome) {
      const d = datiSistema(el.dataset.id, el.dataset.sistema);
      if (!d) return;
      const nome = el.value.trim();
      const copia = (d.luoghiExtra || []).find((x) => x.id === el.dataset.luogoNome);
      if (copia) copia.nome = nome;
      else { d.luoghiNomi = d.luoghiNomi || {}; if (nome) d.luoghiNomi[el.dataset.luogoNome] = nome; else delete d.luoghiNomi[el.dataset.luogoNome]; }
      salva();
      return;
    }
    if (nv.input(el)) return;
    if (pf1.input(el)) return;
    if (sf.input(el)) return;
    if (dnd.input(el)) return;
    if (pf2.input(el)) return;
    if (el.id === 'testo-sessione') aggiornaSuggerimenti(el);
    if (el.id === 'filtro-png') {
      const q = norm(el.value.trim());
      document.querySelectorAll('.riga-png[data-filtro], .riga-mostro[data-filtro]').forEach((r) => { r.hidden = q && !r.dataset.filtro.includes(q); });
    }
    if (el.id === 'cerca-pagina') {
      $('#risultati-cerca').innerHTML = risultatiCerca(el.value);
      ultimoHash = `/cerca?q=${encodeURIComponent(el.value)}`;
      history.replaceState(null, '', '#' + ultimoHash);
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (nv.change(el)) return;
    if (pf1.change(el)) return;
    if (sf.change(el)) return;
    if (dnd.change(el)) return;
    if (pf2.change(el)) return;
    if (el.dataset.lista) applicaBind(el);
    if (el.id === 'attributo-riserva') attributoRiserva = el.value;
    if (el.dataset.ridisegna !== undefined) {
      const p = location.hash.slice(1).split('?')[0].split('/').filter(Boolean);
      // Ridisegna solo se non si sta scrivendo in un campo di testo della stessa pagina
      if (el.tagName === 'SELECT' || el.dataset.campo === 'mostro') render(); else renderBarra(p);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!ac || e.target !== ac.ta) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); ac.sel = (ac.sel + 1) % ac.voci.length; disegnaSuggerimenti(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ac.sel = (ac.sel - 1 + ac.voci.length) % ac.voci.length; disegnaSuggerimenti(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); scegliSuggerimento(ac.sel); }
    else if (e.key === 'Escape') { e.preventDefault(); acChiusoA = ac.inizio; chiudiSuggerimenti(); }
  });
  document.addEventListener('keyup', (e) => {
    if (e.target.id === 'testo-sessione' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) aggiornaSuggerimenti(e.target);
  });
  // Trascinamento dei blocchi della scheda personaggio (dalla maniglia ⠿)
  let bloccoTrascinato = null;
  document.addEventListener('dragstart', (e) => {
    const m = e.target.closest?.('[data-blocco-trascina]');
    if (!m) return;
    bloccoTrascinato = m.dataset.bloccoTrascina;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bloccoTrascinato);
    m.closest('[data-blocco]')?.classList.add('blocco-in-volo');
  });
  const pulisciTrascina = () => document.querySelectorAll('.blocco-sopra, .blocco-sotto, .blocco-in-volo').forEach((x) => x.classList.remove('blocco-sopra', 'blocco-sotto', 'blocco-in-volo'));
  document.addEventListener('dragover', (e) => {
    if (!bloccoTrascinato) return;
    const t = e.target.closest?.('[data-blocco]');
    if (!t || t.dataset.blocco === bloccoTrascinato) return;
    e.preventDefault();
    const sopra = e.clientY < t.getBoundingClientRect().top + t.getBoundingClientRect().height / 2;
    document.querySelectorAll('.blocco-sopra, .blocco-sotto').forEach((x) => x !== t && x.classList.remove('blocco-sopra', 'blocco-sotto'));
    t.classList.toggle('blocco-sopra', sopra);
    t.classList.toggle('blocco-sotto', !sopra);
  });
  document.addEventListener('drop', (e) => {
    if (!bloccoTrascinato) return;
    const t = e.target.closest?.('[data-blocco]');
    const k = bloccoTrascinato;
    bloccoTrascinato = null;
    if (!t || t.dataset.blocco === k) { pulisciTrascina(); return; }
    e.preventDefault();
    const sopra = t.classList.contains('blocco-sopra');
    pulisciTrascina();
    const pid = location.hash.slice(1).split('?')[0].split('/').filter(Boolean)[1];
    const p = personaggio(pid);
    if (!p) return;
    // Prima del blocco di arrivo, oppure prima di quello che lo segue
    let prima = t.dataset.blocco;
    if (!sopra) {
      let s = t.nextElementSibling;
      while (s && (!s.dataset.blocco || s.dataset.blocco === k)) s = s.nextElementSibling;
      prima = s ? s.dataset.blocco : '';
    }
    spostaBlocco(p, k, { prima }, !t.classList.contains('salto-riga'));
  });
  document.addEventListener('dragend', () => { bloccoTrascinato = null; pulisciTrascina(); });

  document.addEventListener('mousedown', (e) => {
    // Barra di formattazione della lore: agisce sul testo selezionato senza togliergli il fuoco
    const cmd = e.target.closest('.lore-strumenti [data-cmd]');
    if (cmd) { e.preventDefault(); document.execCommand(cmd.dataset.cmd, false, cmd.dataset.val ? `<${cmd.dataset.val}>` : null); return; }
    const s = e.target.closest('.sugg[data-indice]');
    if (s) { e.preventDefault(); scegliSuggerimento(Number(s.dataset.indice)); return; }
    if (ac && !e.target.closest('#suggerimenti') && e.target !== ac.ta) chiudiSuggerimenti();
  });
  document.addEventListener('focusout', (e) => {
    if (ac && e.target === ac.ta) setTimeout(() => { if (ac && document.activeElement !== ac.ta) chiudiSuggerimenti(); }, 100);
  });
  $('#contenuto').addEventListener('scroll', () => { if (ac) chiudiSuggerimenti(); });
  window.addEventListener('hashchange', render);

  // ================= Avvio =================
  (async () => {
    let dati = null;
    let erroreLettura = false;
    try { dati = await archivio.carica(); } catch (e) { console.error(e); erroreLettura = true; }
    S = normalizza(dati || statoIniziale());
    if (SCHERMO) {
      // Schermo del tracker: niente barra laterale, e si ridisegna a ogni salvataggio della finestra principale
      document.body.classList.add('modo-schermo');
      const aggiorna = (d) => { if (d) { S = normalizza(d); render(); } };
      if (window.gdr?.suAggiornamento) window.gdr.suAggiornamento(aggiorna);
      else window.addEventListener('storage', (e) => { if (e.key === 'gestore-gdr' && e.newValue) aggiorna(JSON.parse(e.newValue)); });
      render();
      return;
    }
    if (window.gdr?.statoDati) {
      try { statoDati = await window.gdr.statoDati(); } catch { statoDati = null; }
      window.gdr.suConflitto?.((info) => {
        if (statoDati) statoDati.solaLettura = true;
        avvisoGrave(`Un altro PC ha modificato i dati mentre lavoravi: per non perdere nulla le tue ultime modifiche sono state salvate a parte (${esc(String(info?.copia || '').split(/[\\/]/).pop())}) e l'app è passata in sola lettura. Chiudi e riapri l'app.`);
      });
    }
    if (statoDati?.solaLettura) {
      avvisoGrave(`Sola lettura: i dati sono aperti su un altro PC${statoDati.lucchetto?.pc ? ` («${esc(statoDati.lucchetto.pc)}»)` : ''}. Le modifiche di questa finestra non vengono salvate.`);
    } else if (!dati && !erroreLettura) salva();
    if (statoDati?.usaLocale) toast('La cartella dati scelta non era raggiungibile: stai usando i dati locali di questo PC.', 'errore');
    statoSalvataggio(erroreLettura ? '⚠ Dati non letti' : 'Dati caricati');
    registra(`finestra pronta: ${S.campagne.length} campagne, ${S.personaggi.length} personaggi, ${S.sessioni.length} sessioni`);
    if (GIOCATORE) { document.body.classList.add('modo-giocatore'); document.title = 'Cronache del Master — Scheda del giocatore'; }
    else if (!window.gdr) avvisoGrave('Collegamento al disco non disponibile: i dati restano solo in questa finestra. Avvia l\'app dal collegamento "Cronache del Master 2.0".');
    if (erroreLettura) toast('Impossibile leggere i dati salvati: le modifiche di questa sessione potrebbero sovrascriverli. Chiudi l\'app e controlla la cartella dati.', 'errore');
    render();
  })();
})();
