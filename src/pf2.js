'use strict';
// Scheda di Pathfinder 2ª edizione con calcoli automatici. Dati in src/pf2-dati.js (wiki Golarion Insider PF2).
// Come le altre schede: campi legati con data-pf2="percorso", data-ridisegna-pf2 ridisegna, valori calcolati con data-pf2calc.
// Regole usate: punteggi da 10 con aumenti (+2, +1 sopra il 18) e difetti (−2); competenza = livello + 2/4/6/8 secondo il grado.
window.creaPF2 = function creaPF2(ctx) {
  const { esc, uid, norm } = ctx;
  const D = window.PF2_DATI || { abilita: {}, classi: {}, stirpi: {}, versatili: [], background: {} };
  const WIKI = 'https://selven.altervista.org/wiki/';
  const n = (v) => (v === '' || v == null || isNaN(Number(v)) ? 0 : Number(v));
  const segno = (v) => (v >= 0 ? '+' : '') + v;
  const opz = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const CARS = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'];
  const NOMI_CAR = { FOR: 'Forza', DES: 'Destrezza', COS: 'Costituzione', INT: 'Intelligenza', SAG: 'Saggezza', CAR: 'Carisma' };
  const GRADI = ['Senza addestramento', 'Addestrato', 'Esperto', 'Maestro', 'Leggendario'];
  const SIGLE_GRADO = ['S', 'A', 'E', 'M', 'L'];
  const ABILITA = Object.keys(D.abilita).filter((x) => x !== 'Sapienza');
  const TS = { tem: ['Tempra', 'COS'], rif: ['Riflessi', 'DES'], vol: ['Volontà', 'SAG'] };
  const CAT_ARMI = [['semplici', 'semplice'], ['guerra', 'da guerra'], ['avanzate', 'avanzata'], ['senzarmi', 'senz\'armi'], ['classe', 'arma di classe']];
  const CAT_ARMATURE = [['nessuna', 'nessuna armatura'], ['leggere', 'leggera'], ['medie', 'media'], ['pesanti', 'pesante']];
  const DADI = ['d4', 'd6', 'd8', 'd10', 'd12'];
  const LIVELLI_AUMENTI = [5, 10, 15, 20];
  const CAMPI_CALCOLATI = new Set(['Ascendenza', 'Retaggio', 'Background', 'Classe', 'Livello', 'Classe Armatura', 'Tempra', 'Riflessi', 'Volontà', 'Percezione', 'Velocità']);
  const wikiUrl = (pagina) => WIKI + String(pagina).replace(/ /g, '_');

  // ---- Contenuti dal wiki (src/pf2-contenuti.js) ----
  const C = window.PF2_CONTENUTI || { talenti: [], incantesimi: [], armi: [], armature: [], scudi: [], oggetti: [] };
  const senzaLiv = (s) => String(s).replace(/\s*\(liv\.\s*\d+\)/i, '').trim();
  const TALENTI = C.talenti.map(([nome, livello, azione, tratti, pre, pagina, raro]) => ({ nome, livello, azione, tratti: tratti ? tratti.split('|') : [], pre, pagina: pagina || nome, raro }));
  const talentoDi = (nome) => TALENTI.find((t) => norm(t.nome) === norm(nome || '')) || null;
  const TRAD = { a: 'arcana', d: 'divina', o: 'occulta', p: 'primeva' };
  const INCANTESIMI = C.incantesimi.map(([nome, tipo, livello, trad, tratti, azioni, comp, raggio, area, bersaglio, durata, ts, pagina]) => ({ nome, tipo, livello, trad: trad.split('').map((x) => TRAD[x]), tratti: tratti ? tratti.split('|') : [], azioni, comp, raggio, area, bersaglio, durata, ts, pagina: pagina || nome }));
  const incantesimoDi = (nome) => INCANTESIMI.find((x) => norm(x.nome) === norm(nome || '')) || null;
  const ARMI_W = C.armi.map(([nome, categoria, danno, gittata, ricarica, volume, mani, gruppo, tratti, prezzo, distanza]) => ({ nome: senzaLiv(nome), categoria, danno, gittata, ricarica, volume, mani, gruppo, tratti, prezzo, distanza }));
  const ARMATURE_W = C.armature.map(([nome, categoria, prezzo, bonus, desMax, penalita, velocita, forza, volume, gruppo, tratti]) => ({ nome: senzaLiv(nome), categoria, prezzo, bonus, desMax, penalita, velocita, forza, volume, gruppo, tratti }));
  const SCUDI_W = C.scudi.map(([nome, prezzo, bonus, velocita, volume, durezza, pf, sr, tratti]) => ({ nome: senzaLiv(nome), prezzo, bonus, velocita, volume, durezza, pf, sr, tratti }));
  // Incantatori: preparano o lanciano spontaneamente; slot per livello d'incantesimo [al primo livello in cui arriva, dal successivo]
  const LANCIO = { Mago: 'prep', Chierico: 'prep', Druido: 'prep', Fattucchiere: 'prep', Magus: 'prep', Bardo: 'spont', Stregone: 'spont', Oracolo: 'spont', Psicomante: 'spont', Convocatore: 'spont' };
  const SLOT_STANDARD = { Mago: [2, 3], Chierico: [2, 3], Druido: [2, 3], Fattucchiere: [2, 3], Bardo: [2, 3], Stregone: [3, 4], Oracolo: [3, 4] };
  // Volume: L = un decimo; "-" = trascurabile
  const volumeNum = (v) => { const t = String(v ?? '').trim(); if (!t || t === '-' || t === '—') return 0; if (/^L$/i.test(t)) return 0.1; const m = t.replace(',', '.').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : 0; };

  // ---- Dati del personaggio ----
  const predefiniti = () => ({
    stirpe: '', lignaggio: '', stirpeLiberi: false, background: '', classe: '', livello: 1, chiave: '', carInc: '', tradizione: '',
    aumenti: { stirpe: [], background: [], l1: [], l5: [], l10: [], l15: [], l20: [] }, manuale: false, punteggi: {},
    abil: {}, sapienze: [], gradiExtra: {}, varie: {},
    pf: { attuali: '', temp: '', varie: '' }, morente: 0, ferito: 0, eroici: 1,
    ca: { categoria: 'nessuna', nome: '', bonus: '', limiteDes: '', penalita: '', velocita: '', forza: '', varie: '' },
    scudo: { nome: '', bonus: '', durezza: '', pf: '', danni: '', alzato: false },
    armi: [], capacita: [], oggetti: [], monete: { mp: '', mo: '', ma: '', mr: '' }, condizioni: [],
    incantesimi: [], slot: { auto: true, max: {}, extra: {}, usati: {} }, focus: { max: '', usati: 0 },
  });
  function dati(p) {
    if (!p.pf2) {
      p.pf2 = predefiniti();
      // Personaggi creati con la scheda generica: i valori erano modificatori, diventano punteggi (10 + 2 × mod)
      const vecchi = CARS.map((s) => p.caratteristiche?.[s]).filter((v) => v !== '' && v != null && n(v) !== 0);
      if (vecchi.length) {
        p.pf2.manuale = true;
        for (const s of CARS) { const v = n(p.caratteristiche?.[s]); p.pf2.punteggi[s] = Math.abs(v) <= 7 ? 10 + 2 * v : v; }
      }
      const cl = Object.keys(D.classi).find((k) => norm(k) === norm(p.campi?.Classe || ''));
      if (cl) p.pf2.classe = cl;
      p.pf2.livello = Math.max(1, parseInt(p.campi?.Livello, 10) || 1);
      const st = Object.keys(D.stirpi).find((k) => norm(k) === norm(p.campi?.Ascendenza || ''));
      if (st) p.pf2.stirpe = st;
      if (p.campi?.Background && D.background[p.campi.Background]) p.pf2.background = p.campi.Background;
    }
    const d = p.pf2;
    const def = predefiniti();
    for (const k of Object.keys(def)) if (d[k] === undefined) d[k] = def[k];
    for (const k of Object.keys(def.aumenti)) if (!Array.isArray(d.aumenti[k])) d.aumenti[k] = [];
    return d;
  }
  const classeDi = (d) => D.classi[d.classe] || null;
  const stirpeDi = (d) => D.stirpi[d.stirpe] || null;
  const bgDi = (d) => D.background[d.background] || null;
  const chiaveDi = (d) => { const k = classeDi(d); if (!k) return ''; return k.chiave.length === 1 ? k.chiave[0] : (k.chiave.includes(d.chiave) ? d.chiave : k.chiave[0]); };
  const prof = (grado, liv) => (grado > 0 ? liv + 2 * grado : 0);

  // Aumenti di caratteristica per fonte: [aumenti, difetti]. I fissi della stirpe sono automatici, il resto scelto
  function fonti(d) {
    const st = stirpeDi(d);
    const out = [];
    if (st) {
      if (d.stirpeLiberi) out.push(['Stirpe (2 aumenti liberi)', d.aumenti.stirpe.slice(0, 2), []]);
      else out.push(['Stirpe', [...st.aumenti.filter((x) => x !== 'Libero'), ...d.aumenti.stirpe.slice(0, st.aumenti.filter((x) => x === 'Libero').length)], st.difetti]);
    }
    if (d.background) out.push(['Background', d.aumenti.background.slice(0, 2), []]);
    const ch = chiaveDi(d);
    if (ch) out.push(['Classe (caratteristica chiave)', [ch], []]);
    out.push(['1° livello (4 liberi)', d.aumenti.l1.slice(0, 4), []]);
    for (const L of LIVELLI_AUMENTI) if (n(d.livello) >= L) out.push([`${L}° livello (4 liberi)`, d.aumenti['l' + L].slice(0, 4), []]);
    return out;
  }

  // ---- Calcoli ----
  function calcola(p) {
    const d = dati(p);
    const k = classeDi(d);
    const st = stirpeDi(d);
    const liv = Math.max(1, Math.min(20, n(d.livello) || 1));
    const punteggio = {};
    if (d.manuale) for (const s of CARS) punteggio[s] = d.punteggi[s] === '' || d.punteggi[s] == null ? 10 : n(d.punteggi[s]);
    else {
      for (const s of CARS) punteggio[s] = 10;
      for (const [, aum, dif] of fonti(d)) {
        for (const s of dif) punteggio[s] -= 2;
        for (const s of aum) if (punteggio[s] != null) punteggio[s] += punteggio[s] >= 18 ? 1 : 2;
      }
    }
    const m = {};
    for (const s of CARS) m[s] = Math.floor((punteggio[s] - 10) / 2);
    // Gradi di competenza: iniziali della classe, aumenti dei privilegi fino al livello, minimi segnati a mano (talenti, archetipi)
    const g = { perc: 0, tem: 0, rif: 0, vol: 0, classe: 0, inc: 0, semplici: 0, guerra: 0, avanzate: 0, senzarmi: 0, nessuna: 0, leggere: 0, medie: 0, pesanti: 0 };
    const gradoCls = k ? { ...k.gradi } : {};
    if (k) {
      for (const key of Object.keys(g)) g[key] = n(gradoCls[key]);
      for (const [L, bers, gr] of k.aumenti) if (L <= liv) for (const b of bers) g[b] = Math.max(g[b], gr);
    }
    g.classeArmi = k?.armiClasse ? Math.max(k.armiClasse.grado, g.semplici) : g.semplici;
    for (const [key, v] of Object.entries(d.gradiExtra || {})) if (key in g) g[key] = Math.max(g[key], n(v));
    const P = (gr) => prof(gr, liv);
    const chiave = chiaveDi(d);
    // Armatura: limite alla DES, penalità alle prove di FOR e DES (se non si ha la Forza richiesta), velocità
    const a = d.ca;
    const cat = a.categoria || 'nessuna';
    const desCa = a.limiteDes === '' || a.limiteDes == null || cat === 'nessuna' ? m.DES : Math.min(m.DES, n(a.limiteDes));
    const forzaOk = a.forza === '' || a.forza == null || punteggio.FOR >= n(a.forza);
    const penalitaProve = cat !== 'nessuna' && !forzaOk ? -Math.abs(n(a.penalita)) : 0;
    const penVel = cat !== 'nessuna' ? Math.abs(n(a.velocita)) - (forzaOk ? 1.5 : 0) : 0;
    const ca = 10 + desCa + P(g[cat]) + n(a.bonus) + n(a.varie) + (d.scudo.alzato ? n(d.scudo.bonus) : 0);
    const vel = Math.max(1.5, (st?.vel || 7.5) - Math.max(0, penVel) + n(d.varie.vel));
    const perc = m.SAG + P(g.perc) + n(d.varie.perc);
    const ts = {};
    for (const [key, [, s]] of Object.entries(TS)) ts[key] = m[s] + P(g[key]) + n(d.varie[key]);
    // Abilità: grado scelto (minimo quello di classe e background), penalità dell'armatura su FOR e DES
    const fisse = new Set([...(k?.abil.fisse || []), ...(bgDi(d)?.abil || []).filter((x) => D.abilita[x])]);
    const abil = {};
    for (const nome of ABILITA) {
      const s = D.abilita[nome];
      const gr = Math.max(n(d.abil[nome]), fisse.has(nome) && !bgDi(d)?.sceltaAbil ? 1 : 0);
      abil[nome] = { grado: gr, car: s, tot: m[s] + P(gr) + (s === 'FOR' || s === 'DES' ? penalitaProve : 0) + n(d.varie['abil:' + nome]) };
    }
    const sapienze = d.sapienze.map((x) => ({ id: x.id, tot: m.INT + P(n(x.grado)) + n(x.varie) }));
    // Punti ferita: stirpe + (classe + COS) per livello
    const pfMax = Math.max(1, (st?.pf || 0) + ((k?.pf || 8) + m.COS) * liv + n(d.pf.varie));
    const pfAtt = d.pf.attuali === '' ? pfMax : n(d.pf.attuali);
    const cdClasse = 10 + (chiave ? m[chiave] : 0) + P(g.classe);
    const carInc = d.carInc || chiave || 'CAR';
    const incAtt = m[carInc] + P(g.inc);
    // Specializzazione con le Armi (danni extra per grado) dai privilegi di classe
    const privilegiFino = k ? Object.entries(k.livelli).filter(([L]) => Number(L) <= liv).flatMap(([, x]) => x) : [];
    const spec = privilegiFino.some((x) => /Specializzazione con le Armi Superiore/i.test(x)) ? 2 : privilegiFino.some((x) => /^Specializzazione con le Armi$/i.test(x)) ? 1 : 0;
    const armi = d.armi.map((w) => {
      const gr = w.categoria === 'classe' ? g.classeArmi : n(g[w.categoria]);
      const carA = w.car === 'finezza' ? (m.DES > m.FOR ? 'DES' : 'FOR') : w.car || 'FOR';
      const colpo = m[carA] + P(gr) + n(w.potenziamento) + n(w.varie);
      const map = w.agile ? [0, -4, -8] : [0, -5, -10];
      const dadi = 1 + Math.max(0, Math.min(3, n(w.colpitore)));
      const bonusD = (w.distanza ? (w.lancio ? m.FOR : 0) : m.FOR) + (spec && gr >= 2 ? [0, 0, 2, 3, 4][gr] * spec : 0) + n(w.danniVarie);
      return { id: w.id, grado: gr, colpo, colpi: map.map((x) => colpo + x), danni: `${dadi}${w.dado || 'd6'}${bonusD ? segno(bonusD) : ''}${w.tipo ? ' ' + w.tipo : ''}` };
    });
    // Conteggi per le scelte: abilità addestrate attese al 1° livello e incrementi di abilità fino al livello
    const addestrate = Object.values(abil).filter((x) => x.grado >= 1).length + d.sapienze.filter((x) => n(x.grado) >= 1).length;
    const attese = k ? k.abil.fisse.length + (k.abil.scelta.length ? 1 : 0) + k.abil.extra + Math.max(0, m.INT) + (bgDi(d) ? 2 : 0) : 0;
    const incrementi = k ? Object.entries(k.livelli).filter(([L]) => Number(L) <= liv).flatMap(([, x]) => x).filter((x) => /Incremento di Abilità/i.test(x)).length : 0;
    return { liv, punteggio, m, g, P, chiave, ca, desCa, forzaOk, penalitaProve, vel, perc, ts, abil, sapienze, pfMax, pfAtt, cdClasse, carInc, incAtt, armi, addestrate, attese, incrementi, spec };
  }
  // Slot incantesimo per livello d'incantesimo (1-10): tabella standard dei manuali o valori a mano, più gli extra (specialista, Fonte Divina…)
  function slotDi(d, c) {
    const std = SLOT_STANDARD[d.classe];
    const auto = d.slot.auto !== false && !!std;
    const out = {};
    for (let r = 1; r <= 10; r++) {
      let base = 0;
      if (auto) { if (r <= 9 && c.liv >= 2 * r - 1) base = c.liv >= 2 * r ? std[1] : std[0]; if (r === 10 && c.liv >= 19) base = 1; }
      else base = n(d.slot.max[r]);
      const tot = base + n(d.slot.extra[r]);
      if (tot > 0) out[r] = tot;
    }
    return { slot: out, auto, std: !!std };
  }
  // Talenti spettanti fino al livello attuale, dalla tabella della classe (+1 di stirpe e +1 di abilità dal background al 1° livello)
  function slotTalenti(d, c) {
    const k = classeDi(d);
    if (!k) return null;
    const priv = Object.entries(k.livelli).filter(([L]) => Number(L) <= c.liv).flatMap(([, x]) => x);
    const conta = (re) => priv.filter((x) => re.test(x)).length;
    return { classe: conta(/^Talent[oi] da /i), abilita: conta(/^Talent[oi] di Abilità/i) + (bgDi(d)?.talento ? 1 : 0), generico: conta(/^Talent[oi] Generic/i), stirpe: conta(/^Talent[oi] di Stirpe/i) + (d.stirpe ? 1 : 0) };
  }
  const TIPO_TAL = { classe: 'Talento di classe', stirpe: 'Talento di stirpe', abilita: 'Talento di abilità', generico: 'Talento generico', archetipo: 'Talento di archetipo' };
  const NOMI_CLASSI = new Set(Object.keys(D.classi));
  const NOMI_STIRPI = new Set([...Object.keys(D.stirpi), ...D.versatili]);
  function categoriaTalento(t, d) {
    const tr = t.tratti;
    if (tr.includes('Archetipo') || tr.includes('Dedizione')) return 'archetipo';
    if (d.classe && tr.includes(d.classe)) return 'classe';
    if (tr.includes('Abilità')) return 'abilita';
    if (tr.includes('Generico')) return 'generico';
    if ((d.stirpe && tr.includes(d.stirpe)) || (d.lignaggio && tr.includes(d.lignaggio))) return 'stirpe';
    if (tr.some((x) => NOMI_CLASSI.has(x))) return 'altra-classe';
    if (tr.some((x) => NOMI_STIRPI.has(x))) return 'altra-stirpe';
    return 'altro';
  }
  // Grado in un'abilità, Percezione, tiro salvezza o Sapienza (per i prerequisiti)
  function gradoDi(a, d, c) {
    const fissi = { Percezione: 'perc', Tempra: 'tem', Riflessi: 'rif', Volontà: 'vol' };
    if (fissi[a]) return c.g[fissi[a]];
    if (/^Sapienza/i.test(a)) return Math.max(0, ...d.sapienze.filter((x) => norm(a) === 'sapienza' || norm(x.nome) === norm(a)).map((x) => n(x.grado)));
    return c.abil[a]?.grado ?? 0;
  }
  // Prerequisiti: ✔ soddisfatto, ✖ mancante, ? da verificare a mano (privilegi, divinità…); il livello conta come requisito
  function statoTalento(t, d, c) {
    const req = t.pre.map((p) => {
      if (p[0] === 'g') return { testo: `${GRADI[p[1]]} in ${p[2].join(' o ')}`, esito: p[2].some((a) => gradoDi(a, d, c) >= p[1]) };
      if (p[0] === 'c') return { testo: `${NOMI_CAR[p[1]]} ${p[2]}`, esito: c.punteggio[p[1]] >= p[2] };
      if (p[0] === 't') return { testo: p[1], esito: d.capacita.some((x) => norm(x.nome) === norm(p[1])) };
      return { testo: p[1], esito: null };
    });
    const livOk = t.livello <= c.liv;
    return { req, livOk, stato: !livOk || req.some((r) => r.esito === false) ? 'no' : req.some((r) => r.esito === null) ? '?' : 'ok' };
  }
  // Ingombro: oggetti (quantità × volume), armi, armatura e scudo; ingombrato a 5 + FOR, massimo 10 + FOR
  function ingombro(d, c) {
    // Conta solo ciò che il personaggio porta (indossato e zaino)
    let tot = d.oggetti.filter((o) => !window.Luoghi || window.Luoghi.porta(o, d)).reduce((a, o) => a + volumeNum(o.ingombro) * Math.max(0, n(o.qta) || 1), 0);
    tot += d.armi.reduce((a, w) => a + volumeNum(w.volume), 0) + volumeNum(d.ca.volume) + volumeNum(d.scudo.volume);
    return { tot: Math.floor(tot + 1e-9), decimi: Math.round((tot % 1) * 10), soglia: 5 + c.m.FOR, max: 10 + c.m.FOR };
  }
  const AZ = { 1: '◆', 2: '◆◆', 3: '◆◆◆', R: '⤾', G: '◇', '1-3': '◆–◆◆◆', '1-2': '◆–◆◆', '2-3': '◆◆–◆◆◆' };
  const azIcona = (a) => (a ? `<span class="pf2-az" title="${esc({ 1: '1 azione', 2: '2 azioni', 3: '3 azioni', R: 'reazione', G: 'azione gratuita' }[a] || a)}">${esc(AZ[a] || a)}</span>` : '');
  const filtroTal = { tipo: 'adatti', livello: '', testo: '', tratto: '', soloOk: false };
  const filtroInc = { trad: '', rango: '', tipo: '', testo: '' };

  function mappa(c) {
    const o = { liv: String(c.liv), ca: String(c.ca), perc: segno(c.perc), pfmax: String(c.pfMax), cdclasse: String(c.cdClasse), incatt: segno(c.incAtt), inccd: String(10 + c.incAtt) };
    for (const s of CARS) { o['pun:' + s] = String(c.punteggio[s]); o['mod:' + s] = segno(c.m[s]); }
    for (const k of Object.keys(TS)) o['ts:' + k] = segno(c.ts[k]);
    for (const [k, v] of Object.entries(c.abil)) o['abil:' + k] = segno(v.tot);
    for (const x of c.sapienze) o['sap:' + x.id] = segno(x.tot);
    for (const a of c.armi) { o[`arma:${a.id}:colpi`] = a.colpi.map(segno).join(' / '); o[`arma:${a.id}:danni`] = a.danni; }
    return o;
  }
  function aggiorna(p) {
    const v = mappa(calcola(p));
    document.querySelectorAll('[data-pf2calc]').forEach((el) => { if (el.dataset.pf2calc in v) el.textContent = v[el.dataset.pf2calc]; });
  }
  function trova(radice, percorso) {
    const parti = percorso.split('|');
    let o = radice;
    for (let i = 0; i < parti.length - 1; i++) {
      const [k, id] = parti[i].split('#');
      o = id ? (o[k] || []).find((x) => x.id === id) : (o[k] = o[k] ?? {});
      if (!o) return null;
    }
    return [o, parti[parti.length - 1]];
  }
  const valoreDa = (el) => (el.type === 'checkbox' ? el.checked : el.dataset.tipo === 'numero' ? (el.value === '' ? '' : Number(el.value)) : el.value);

  // ---- Vista della scheda ----
  const chiuse = new Set();
  document.addEventListener('toggle', (e) => {
    const el = e.target;
    if (el.classList?.contains('pf2-sez')) { if (el.open) chiuse.delete(el.dataset.sez); else chiuse.add(el.dataset.sez); }
  }, true);
  let salita = null;
  let filtroBg = '';

  function vistaScheda(p) {
    const d = dati(p);
    const c = calcola(p);
    const v = mappa(c);
    const id = p.id;
    const k = classeDi(d);
    const st = stirpeDi(d);
    const bg = bgDi(d);
    const kc = (chiave) => `<span data-pf2calc="${esc(chiave)}">${esc(v[chiave] ?? '')}</span>`;
    const campo = (perc, val, extra = '') => `<input data-pf2="${esc(perc)}" data-id="${id}" value="${esc(val ?? '')}" ${extra}>`;
    const num = (perc, val, extra = '') => campo(perc, val, `type="number" data-tipo="numero" ${extra}`);
    const chk = (perc, val, extra = '') => `<input type="checkbox" data-pf2="${esc(perc)}" data-id="${id}" ${val ? 'checked' : ''} ${extra}>`;
    const sel = (perc, lista, val, extra = '') => `<select data-pf2="${esc(perc)}" data-id="${id}" ${extra}>${opz(lista, val)}</select>`;
    const togli = (lista, elem) => `<button class="btn-x" data-azione="pf2-rimuovi" data-id="${id}" data-lista="${esc(lista)}" data-elem="${esc(elem)}" title="Rimuovi">×</button>`;
    const aggiungi = (lista, testo) => `<button class="btn-piccolo" data-azione="pf2-aggiungi" data-id="${id}" data-lista="${lista}">+ ${testo}</button>`;
    const dado = (tiro, titolo) => `<button class="btn-dado" data-azione="pf2-tira" data-id="${id}" data-tiro="${esc(tiro)}" title="Tira: ${esc(titolo)}">🎲</button>`;
    const sezione = (chiave, titolo, corpo, extra = '') => `<details class="pannello pf-sez pf2-sez" data-sez="${chiave}" ${chiuse.has(chiave) ? '' : 'open'}><summary><h3>${titolo}</h3>${extra}</summary>${corpo}</details>`;
    const wiki = (pagina, testo = '📖 wiki') => (pagina ? `<a class="btn-piccolo" href="${esc(wikiUrl(pagina))}" target="_blank" rel="noopener" title="Apri la pagina sul wiki">${testo}</a>` : '');
    const grado = (perc, val, minimo = 0, extra = '') => `<select class="pf2-grado gr-${val}" data-pf2="${esc(perc)}" data-id="${id}" data-tipo="numero" data-ridisegna-pf2 title="${esc(GRADI[val])}" ${extra}>${opz(GRADI.map((t, i) => [i, `${SIGLE_GRADO[i]} · ${t}`]).filter(([i]) => i >= minimo), val)}</select>`;
    const badge = (gr) => `<span class="pf2-badge gr-${gr}" title="${esc(GRADI[gr])}">${SIGLE_GRADO[gr]}</span>`;

    // Origine: stirpe, lignaggio, background
    const lignaggi = st ? [...st.lignaggi, ...D.versatili.filter((x) => !st.lignaggi.includes(x))] : [];
    const bgNomi = Object.keys(D.background).sort((a, b) => a.localeCompare(b, 'it'));
    const q = norm(filtroBg);
    const bgFiltrati = q ? bgNomi.filter((x) => norm(x).includes(q)) : bgNomi;
    const gruppiBg = ['Comune', 'Raro', 'Unico'].map((r) => [r, bgFiltrati.filter((x) => D.background[x].rarita === r)]).filter(([, l]) => l.length || false);
    const opzBg = `<option value="">— scegli —</option>${d.background && !bgFiltrati.includes(d.background) ? `<option value="${esc(d.background)}" selected>${esc(d.background)}</option>` : ''}${gruppiBg.map(([r, l]) => `<optgroup label="Background ${r === 'Comune' ? 'comuni' : r === 'Raro' ? 'rari' : 'unici'}">${l.map((x) => `<option value="${esc(x)}"${x === d.background ? ' selected' : ''}>${esc(x)}</option>`).join('')}</optgroup>`).join('')}`;
    const corpoOrigine = `<div class="pf-riga">
        <label>Stirpe ${sel('stirpe', [['', '— scegli —'], ...Object.keys(D.stirpi).map((x) => [x, x])], d.stirpe, 'data-ridisegna-pf2')}</label>
        ${st ? `<label>Lignaggio ${sel('lignaggio', [['', '— scegli —'], ...st.lignaggi.map((x) => [x, x]), ...(lignaggi.length > st.lignaggi.length ? [['—', '── lignaggi versatili ──']] : []), ...D.versatili.filter((x) => !st.lignaggi.includes(x)).map((x) => [x, x])], d.lignaggio, 'data-ridisegna-pf2')}</label>${wiki(st.pagina)}` : ''}
        ${d.lignaggio && D.versatili.includes(d.lignaggio) ? wiki(d.lignaggio, '📖 lignaggio') : ''}
      </div>
      ${st ? `<div class="fede-righe"><div><span class="muto">PF</span> ${st.pf} · <span class="muto">Taglia</span> ${esc(st.taglia)} · <span class="muto">Velocità</span> ${String(st.vel).replace('.', ',')} m · <span class="muto">Aumenti</span> ${esc(st.aumenti.map((x) => x === 'Libero' ? 'libero' : x).join(', '))}${st.difetti.length ? ` · <span class="muto">Difetto</span> ${esc(st.difetti.join(', '))}` : ''}</div>
        <div><span class="muto">Lingue</span> ${esc(st.lingue)} · <span class="muto">Tratti</span> ${esc(st.tratti)}${st.capacita.length ? ` · <span class="muto">Capacità</span> ${esc(st.capacita.join(', '))}` : ''}</div></div>` : ''}
      <div class="pf-riga">
        <label>Background <select data-pf2="background" data-id="${id}" data-ridisegna-pf2>${opzBg}</select></label>
        <label>Cerca <input type="search" data-pf2-cercabg value="${esc(filtroBg)}" placeholder="${bgNomi.length} background"></label>
        ${d.background ? wiki('Background', '📖 background') : ''}
      </div>
      ${bg ? `<div class="fede-righe"><div><span class="muto">Aumenti</span> ${bg.car.length ? `uno tra ${esc(bg.car.join(' o '))} e uno libero` : 'vedi il wiki'}${bg.rarita !== 'Comune' ? ` · <span class="oltre">${esc(bg.rarita)}</span>` : ''}</div>
        <div><span class="muto">Addestrato in</span> ${esc(bg.abil.join(bg.sceltaAbil ? ' / ' : ', ') || 'vedi il wiki')}${bg.sceltaAbil ? ' <small class="muto">(a scelta)</small>' : ''} · <span class="muto">Talento</span> ${esc(bg.talento || '—')}</div></div>` : ''}`;

    // Classe e livello
    const corpoClasse = `<div class="pf-riga">
        <label>Classe ${sel('classe', [['', '— scegli —'], ...Object.keys(D.classi).map((x) => [x, x])], d.classe, 'data-ridisegna-pf2')}</label>
        ${window.MODALITA_GIOCATORE && !window.gdr ? `<span class="pf-liv-fisso" title="Nella scheda del giocatore i livelli si prendono uno alla volta con «⬆ Sali di livello»">Livello <b>${Number(d.livello) || 1}</b></span>`
          : `<label>Livello ${num('livello', d.livello, 'min="1" max="20" class="pf-corto" data-ridisegna-pf2')}</label>`}
        ${k && k.chiave.length > 1 ? `<label>Caratteristica chiave ${sel('chiave', k.chiave.map((x) => [x, NOMI_CAR[x]]), c.chiave, 'data-ridisegna-pf2')}</label>` : ''}
        ${k ? wiki(d.classe) : ''}
        <button class="primario" data-azione="pf2-livello-apri" data-id="${id}" ${!k || c.liv >= 20 ? 'disabled' : ''}>⬆ Sali di livello</button></div>
      ${k ? `<div class="fede-righe"><div><span class="muto">Caratteristica chiave</span> ${esc(k.chiave.map((x) => NOMI_CAR[x]).join(' o '))} · <span class="muto">PF per livello</span> ${k.pf} + COS
        · <span class="muto">CD di classe</span> <b>${kc('cdclasse')}</b> ${badge(c.g.classe)}</div>
        <div><span class="muto">Abilità</span> ${esc(k.abil.testo)}</div>
        ${k.armiClasse ? `<div><span class="muto">Armi di classe</span> ${esc(k.armiClasse.testo)}</div>` : ''}</div>` : ''}`;

    // Caratteristiche: aumenti per fonte (griglia) o punteggi manuali
    const fontiL = fonti(d);
    const nomiFonte = { 'Stirpe': 'stirpe', 'Stirpe (2 aumenti liberi)': 'stirpe', Background: 'background', '1° livello (4 liberi)': 'l1' };
    for (const L of LIVELLI_AUMENTI) nomiFonte[`${L}° livello (4 liberi)`] = 'l' + L;
    const righeAumenti = fontiL.map(([nome, aum, dif]) => {
      const chiaveF = nomiFonte[nome];
      const fissi = nome === 'Stirpe' && st ? st.aumenti.filter((x) => x !== 'Libero') : nome.startsWith('Classe') ? aum : [];
      const max = nome === 'Stirpe' ? (st?.aumenti.filter((x) => x === 'Libero').length || 0) : nome.startsWith('Stirpe (') ? 2 : nome === 'Background' ? 2 : 4;
      const scelti = chiaveF ? d.aumenti[chiaveF] : [];
      return `<tr><th>${esc(nome)}${chiaveF ? ` <small class="${scelti.length > max ? 'oltre' : 'muto'}">${scelti.length}/${max}</small>` : ''}</th>${CARS.map((s) => {
        if (dif.includes(s)) return '<td class="pf2-difetto" title="Difetto: −2">−</td>';
        if (fissi.includes(s)) return '<td class="pf2-fisso" title="Aumento fisso">●</td>';
        if (!chiaveF) return '<td></td>';
        const on = scelti.includes(s);
        const vietato = !on && (scelti.length >= max || (nome === 'Background' && bg?.car.length && scelti.length === 1 && !bg.car.includes(scelti[0]) && !bg.car.includes(s)));
        return `<td><input type="checkbox" data-azione="pf2-aumento" data-id="${id}" data-fonte="${chiaveF}" data-car="${s}" ${on ? 'checked' : ''} ${vietato ? 'disabled' : ''} title="${esc(nome === 'Background' && bg?.car.length ? `Uno dei due deve essere ${bg.car.join(' o ')}` : 'Aumento')}"></td>`;
      }).join('')}</tr>`;
    }).join('');
    const car = CARS.map((s) => `<div class="car">
        <div class="car-sigla">${s}</div>
        ${d.manuale ? num(`punteggi|${s}`, d.punteggi[s] ?? 10, `aria-label="${NOMI_CAR[s]}"`) : `<div class="pf2-punteggio">${kc('pun:' + s)}</div>`}
        <div class="car-mod">${kc('mod:' + s)}</div><div class="car-nome">${NOMI_CAR[s]}</div>${dado('car:' + s, NOMI_CAR[s])}</div>`).join('');
    const corpoCar = `<div class="griglia-car">${car}</div>
      <label class="pf-chk pf-mini">${chk('manuale', d.manuale, 'data-ridisegna-pf2')} Inserisco i punteggi a mano (senza la tabella degli aumenti)</label>
      ${d.manuale ? '' : `<div class="prog-scorri"><table class="prog-tabella pf2-aumenti"><thead><tr><th>Aumenti</th>${CARS.map((s) => `<th>${s}</th>`).join('')}</tr></thead><tbody>${righeAumenti}</tbody></table></div>
        ${st ? `<label class="pf-chk pf-mini">${chk('stirpeLiberi', d.stirpeLiberi, 'data-ridisegna-pf2')} Stirpe: due aumenti liberi al posto di quelli indicati (e nessun difetto)</label>` : ''}
        <p class="muto pf-aiuto">Ogni aumento dà +2 (+1 se il punteggio è già 18 o più); un difetto −2. Gli aumenti di uno stesso gruppo vanno su caratteristiche diverse.</p>`}`;

    // Salute
    const corpoSalute = `<div class="pf-griglia">
      <div class="pf-box"><div class="pf-etich">Punti ferita</div>
        <div class="pf-pf">${num('pf|attuali', d.pf.attuali, `class="pf-grande" placeholder="${c.pfMax}"`)} <span class="muto">/</span> <b class="pf-max">${kc('pfmax')}</b></div>
        <div class="pf-mini"><label>Temporanei ${num('pf|temp', d.pf.temp, 'class="pf-corto"')}</label><label>Varie ${num('pf|varie', d.pf.varie, 'class="pf-corto"')}</label></div>
        <div class="pf-mini"><input type="number" min="0" class="pf2-quanti mini" placeholder="0"><button class="btn-piccolo" data-azione="pf2-danno" data-id="${id}" data-segno="-1">Danno</button><button class="btn-piccolo" data-azione="pf2-danno" data-id="${id}" data-segno="1">Cura</button></div>
        <div class="muto pf-mini">Il danno toglie prima i PF temporanei. A 0 PF: Morente 1 (+ Ferito).</div></div>
      <div class="pf-box"><div class="pf-etich">Morente e Ferito</div>
        <label>Morente ${sel('morente', [0, 1, 2, 3, 4].map((x) => [x, x || '—']), d.morente, 'data-tipo="numero" data-ridisegna-pf2')}</label>
        <label>Ferito ${sel('ferito', [0, 1, 2, 3].map((x) => [x, x || '—']), d.ferito, 'data-tipo="numero" data-ridisegna-pf2')}</label>
        ${n(d.morente) ? `<button class="btn-piccolo" data-azione="pf2-recupero" data-id="${id}" title="Prova di recupero: CD 10 + Morente">🎲 Prova di recupero (CD ${10 + n(d.morente)})</button>` : ''}
        <div class="muto pf-mini">Morente 4 = morte.</div></div>
      <div class="pf-box"><div class="pf-etich">Punti eroe</div>
        <div class="pf-pallini">${[1, 2, 3].map((i) => `<button class="pallino${i <= n(d.eroici) ? ' usato' : ''}" data-azione="pf2-eroici" data-id="${id}" data-i="${i}" title="Punto eroe"></button>`).join('')}</div>
        <button class="btn-piccolo" data-azione="pf2-riposo" data-id="${id}" title="8 ore di riposo: recuperi PF pari a COS × livello (minimo 1 × livello)">🌙 Riposo notturno</button></div>
    </div>`;

    // Difese: CA, tiri salvezza, Percezione
    const tsBox = Object.entries(TS).map(([key, [nome, s]]) => `<div class="pf-box"><div class="pf-etich">${nome} ${badge(c.g[key])} ${dado('ts:' + key, nome)}</div><div class="pf-valore">${kc('ts:' + key)}</div>
      <div class="pf-mini muto">${s} ${segno(c.m[s])} + ${c.P(c.g[key])}</div><div class="pf-mini"><label>Varie ${num('varie|' + key, d.varie[key], 'class="pf-corto"')}</label></div></div>`).join('');
    const corpoDifese = `<div class="pf-griglia">
      <div class="pf-box"><div class="pf-etich">Classe armatura ${badge(c.g[d.ca.categoria || 'nessuna'])}</div><div class="pf-valore">${kc('ca')}</div>
        <div class="pf-mini muto">10 + DES ${segno(c.desCa)} + competenza ${c.P(c.g[d.ca.categoria || 'nessuna'])}${n(d.ca.bonus) ? ` + armatura ${n(d.ca.bonus)}` : ''}${d.scudo.alzato && n(d.scudo.bonus) ? ` + scudo ${n(d.scudo.bonus)}` : ''}</div></div>
      <div class="pf-box"><div class="pf-etich">Percezione ${badge(c.g.perc)} ${dado('perc', 'Percezione')}</div><div class="pf-valore">${kc('perc')}</div>
        <div class="pf-mini"><label>Varie ${num('varie|perc', d.varie.perc, 'class="pf-corto"')}</label></div></div>
      <div class="pf-box"><div class="pf-etich">Iniziativa ${dado('iniz', 'Iniziativa (Percezione)')}</div><div class="pf-valore">${kc('perc')}</div>
        <div class="pf-mini muto">di norma si tira con la Percezione (o con un'abilità, es. Furtività per chi tende un'imboscata)</div></div>
      ${tsBox}
      <div class="pf-box"><div class="pf-etich">Velocità</div><div class="pf-valore">${String(c.vel).replace('.', ',')} m</div><div class="pf-mini"><label>Varie ${num('varie|vel', d.varie.vel, 'class="pf-corto" step="1.5"')}</label></div></div>
    </div>
    <h4>Armatura e scudo</h4>
    <div class="pf-riga pf-dal-wiki">dal wiki: <select id="pf2-scelta-armatura-${id}"><option value="">— armatura —</option>${CAT_ARMATURE.map(([cat, et]) => `<optgroup label="${esc(cat === 'nessuna' ? 'Senza armatura' : `Armature ${et === 'leggera' ? 'leggere' : et === 'media' ? 'medie' : 'pesanti'}`)}">${ARMATURE_W.filter((a) => a.categoria === cat).map((a) => `<option value="${esc(a.nome)}">${esc(a.nome)} (CA +${a.bonus}${a.desMax !== '' ? `, DES max +${a.desMax}` : ''})</option>`).join('')}</optgroup>`).join('')}</select>
      <button class="btn-piccolo" data-azione="pf2-armatura-wiki" data-id="${id}">Indossa</button>
      <select id="pf2-scelta-scudo-${id}"><option value="">— scudo —</option>${SCUDI_W.map((s) => `<option value="${esc(s.nome)}">${esc(s.nome)} (+${s.bonus}, durezza ${s.durezza})</option>`).join('')}</select>
      <button class="btn-piccolo" data-azione="pf2-scudo-wiki" data-id="${id}">Imbraccia</button></div>
    <div class="pf-riga">
      <input class="pf-largo" data-pf2="ca|nome" data-id="${id}" value="${esc(d.ca.nome)}" placeholder="Armatura">
      <label>Categoria ${sel('ca|categoria', CAT_ARMATURE, d.ca.categoria, 'data-ridisegna-pf2')}</label>
      ${d.ca.categoria !== 'nessuna' ? `<label>Bonus CA ${num('ca|bonus', d.ca.bonus, 'class="pf-corto" data-ridisegna-pf2')}</label>
      <label title="Limite al bonus di DES">Limite DES ${num('ca|limiteDes', d.ca.limiteDes, 'class="pf-corto" data-ridisegna-pf2')}</label>
      <label title="Penalità alle prove di FOR e DES se non hai la Forza richiesta">Penalità ${num('ca|penalita', d.ca.penalita, 'class="pf-corto" data-ridisegna-pf2')}</label>
      <label title="Penalità alla velocità in metri (ridotta di 1,5 m se hai la Forza richiesta)">Vel. ${num('ca|velocita', d.ca.velocita, 'class="pf-corto" step="1.5" data-ridisegna-pf2')}</label>
      <label title="Punteggio di Forza richiesto">FOR ${num('ca|forza', d.ca.forza, 'class="pf-corto" data-ridisegna-pf2')}</label>` : ''}
      <label>Varie ${num('ca|varie', d.ca.varie, 'class="pf-corto" data-ridisegna-pf2')}</label></div>
    ${d.ca.categoria !== 'nessuna' && !c.forzaOk ? '<p class="oltre pf-mini">Forza insufficiente: penalità alle prove di FOR e DES e velocità ridotta.</p>' : ''}
    <div class="pf-riga">
      <input class="pf-largo" data-pf2="scudo|nome" data-id="${id}" value="${esc(d.scudo.nome)}" placeholder="Scudo">
      <label>Bonus ${num('scudo|bonus', d.scudo.bonus, 'class="pf-corto" data-ridisegna-pf2')}</label>
      <label>Durezza ${num('scudo|durezza', d.scudo.durezza, 'class="pf-corto"')}</label>
      <label>PF ${num('scudo|pf', d.scudo.pf, 'class="pf-corto"')}</label>
      <label>Danni subiti ${num('scudo|danni', d.scudo.danni, 'class="pf-corto"')}</label>
      <label class="pf-chk">${chk('scudo|alzato', d.scudo.alzato, 'data-ridisegna-pf2')} Alzato (+CA)</label></div>`;

    // Abilità e sapienze
    const k1 = k?.abil;
    const corpoAbil = `<p class="muto pf-aiuto">Addestrate <b class="${c.attese && c.addestrate > c.attese + c.incrementi ? 'oltre' : ''}">${c.addestrate}</b>${c.attese ? ` · al 1° livello ne spettano ${c.attese} (classe, background e mod. di INT)` : ''}${c.incrementi ? ` · incrementi di abilità fino al ${c.liv}°: <b>${c.incrementi}</b>` : ''}.
        Esperto dal 3° livello, Maestro dal 7°, Leggendario dal 15°.${c.penalitaProve ? ` Penalità dell'armatura ${c.penalitaProve} alle abilità di FOR e DES.` : ''}</p>
      <div class="pf-griglia-abil">${ABILITA.map((a) => {
        const min = (k1?.fisse.includes(a) || (bg?.abil.includes(a) && !bg.sceltaAbil)) ? 1 : 0;
        return `<div class="pf-abil${c.abil[a].grado ? ' di-classe' : ''}">
          ${grado(`abil|${a}`, c.abil[a].grado, min)}
          <span class="pf-abil-nome">${esc(a)} <small class="muto">${D.abilita[a]}</small>${min ? ' <small class="muto" title="Dalla classe o dal background">●</small>' : ''}</span>
          <label title="Varie">${num(`varie|abil:${a}`, d.varie['abil:' + a], 'class="pf-corto"')}</label>
          <b class="pf-tot">${kc('abil:' + a)}</b>${dado('abil:' + a, a)}</div>`;
      }).join('')}
      ${d.sapienze.map((x) => `<div class="pf-abil${n(x.grado) ? ' di-classe' : ''}">
          ${grado(`sapienze#${x.id}|grado`, n(x.grado))}
          <span class="pf-abil-nome"><input data-pf2="sapienze#${x.id}|nome" data-id="${id}" value="${esc(x.nome)}" placeholder="Sapienza (…)" class="pf2-sapienza"> <small class="muto">INT</small></span>
          <label title="Varie">${num(`sapienze#${x.id}|varie`, x.varie, 'class="pf-corto"')}</label>
          <b class="pf-tot">${kc('sap:' + x.id)}</b>${dado('sap:' + x.id, x.nome || 'Sapienza')}${togli('sapienze', x.id)}</div>`).join('')}</div>
      <div class="pf-piede">${aggiungi('sapienze', 'Sapienza')}${bg?.abil.filter((x) => /^Sapienza/.test(x)).map((x) => d.sapienze.some((y) => norm(y.nome) === norm(x)) ? '' : `<button class="btn-piccolo" data-azione="pf2-sapienza-bg" data-id="${id}" data-nome="${esc(x)}">+ ${esc(x)} (background)</button>`).join('') || ''}</div>`;

    // Attacchi
    const armi = d.armi.map((w) => {
      const x = c.armi.find((y) => y.id === w.id);
      return `<div class="pf-arma"><div class="pf-riga">
        <input class="pf-largo" data-pf2="armi#${w.id}|nome" data-id="${id}" value="${esc(w.nome)}" placeholder="Arma">
        <label>Categoria ${sel(`armi#${w.id}|categoria`, CAT_ARMI, w.categoria, 'data-ridisegna-pf2')}</label>
        <label>Car. ${sel(`armi#${w.id}|car`, [['FOR', 'FOR'], ['DES', 'DES'], ['finezza', 'finezza (migliore)']], w.car, 'data-ridisegna-pf2')}</label>
        <label>Dado ${sel(`armi#${w.id}|dado`, DADI.map((x) => [x, x]), w.dado, 'data-ridisegna-pf2')}</label>
        <label>Tipo ${campo(`armi#${w.id}|tipo`, w.tipo, 'class="pf-corto" placeholder="T, P, C"')}</label>
        <label title="Runa di potenziamento: bonus al colpire">Potenz. ${sel(`armi#${w.id}|potenziamento`, [0, 1, 2, 3].map((v) => [v, v ? '+' + v : '—']), w.potenziamento || 0, 'data-tipo="numero" data-ridisegna-pf2')}</label>
        <label title="Runa colpitore: dadi di danno in più">Colpitore ${sel(`armi#${w.id}|colpitore`, [[0, '—'], [1, 'colpitore'], [2, 'superiore'], [3, 'maggiore']], w.colpitore || 0, 'data-tipo="numero" data-ridisegna-pf2')}</label>
        <label class="pf-chk" title="Agile: penalità per attacchi multipli −4/−8">${chk(`armi#${w.id}|agile`, w.agile, 'data-ridisegna-pf2')} agile</label>
        <label class="pf-chk" title="Arma a distanza: niente FOR ai danni (tranne le armi da lancio)">${chk(`armi#${w.id}|distanza`, w.distanza, 'data-ridisegna-pf2')} distanza</label>
        ${w.distanza ? `<label class="pf-chk">${chk(`armi#${w.id}|lancio`, w.lancio, 'data-ridisegna-pf2')} lancio</label>` : ''}
        <label>Tratti ${campo(`armi#${w.id}|tratti`, w.tratti, 'class="pf-largo" placeholder="accurata, sbilanciare…"')}</label>
        ${togli('armi', w.id)}</div>
        <div class="pf-arma-tiri"><span>${badge(x?.grado || 0)} Colpire <b>${kc(`arma:${w.id}:colpi`)}</b> ${[0, 1, 2].map((i) => `<button class="btn-mini" data-azione="pf2-tira" data-id="${id}" data-tiro="colpo:${w.id}:${i}" title="${['Primo attacco', 'Secondo attacco', 'Terzo attacco o successivi'][i]}">🎲${i + 1}</button>`).join('')}</span>
          <span>Danni <b>${kc(`arma:${w.id}:danni`)}</b> ${dado('danni:' + w.id, 'danni')}</span></div></div>`;
    }).join('');
    const sceltaArma = `<span class="pf-dal-wiki">dal wiki: <select id="pf2-scelta-arma-${id}"><option value="">— scegli —</option>${CAT_ARMI.filter(([k2]) => k2 !== 'classe').flatMap(([cat, et]) => [0, 1].map((dist) => [cat, et, dist])).map(([cat, et, dist]) => {
      const l = ARMI_W.filter((a) => a.categoria === cat && a.distanza === dist);
      return l.length ? `<optgroup label="${esc(`${cat === 'senzarmi' ? 'Attacchi senz\'armi' : `Armi ${et === 'da guerra' ? 'da guerra' : et === 'semplice' ? 'semplici' : 'avanzate'}`}${dist ? ' a distanza' : ' da mischia'}`)}">${l.map((a) => `<option value="${esc(a.nome)}|${dist}">${esc(a.nome)} (${esc(a.danno)})</option>`).join('')}</optgroup>` : '';
    }).join('')}</select><button class="btn-piccolo" data-azione="pf2-arma-wiki" data-id="${id}">Aggiungi</button></span>`;
    const corpoAttacchi = `${armi || '<p class="muto">Nessuna arma.</p>'}<div class="pf-piede">${aggiungi('armi', 'Arma')}${sceltaArma}<span class="muto">Colpire = caratteristica + competenza + potenziamento; i tre valori sono il 1°, 2° e 3° attacco del turno. Danni = dadi (+ colpitore) + FOR (in mischia e da lancio)${c.spec ? ' + specializzazione con le armi' : ''}.</span></div>`;

    // Incantesimi: tradizione, CD, slot, trucchetti, focalizzati, elenco del wiki
    const tradizione = k?.tradizione || d.tradizione;
    const lancio = LANCIO[d.classe] || (d.incantesimi.length ? 'prep' : '');
    const sl = slotDi(d, c);
    const rangoTrucchetti = Math.ceil(c.liv / 2);
    const incNoti = d.incantesimi.map((s) => ({ ...s, v: incantesimoDi(s.nome) })).sort((a, b) => n(a.rango) - n(b.rango) || a.nome.localeCompare(b.nome, 'it'));
    const gruppi = [['T', 'Trucchetti', incNoti.filter((s) => s.tipo === 'T')], ...Object.keys(sl.slot).map((r) => [Number(r), `${r}° livello`, incNoti.filter((s) => s.tipo === 'I' && n(s.rango) === Number(r))]),
      ...[...new Set(incNoti.filter((s) => s.tipo === 'I' && !sl.slot[n(s.rango)]).map((s) => n(s.rango)))].map((r) => [r, `${r}° livello (nessuno slot)`, incNoti.filter((s) => s.tipo === 'I' && n(s.rango) === r)]),
      ['F', 'Focalizzati', incNoti.filter((s) => s.tipo === 'F')], ['R', 'Rituali', incNoti.filter((s) => s.tipo === 'R')]];
    const vInc = (s) => {
      const v = s.v;
      const titolo = v ? [v.tratti.join(', '), v.comp, v.raggio && `raggio ${v.raggio}`, v.area && `area ${v.area}`, v.bersaglio && `bersagli ${v.bersaglio}`, v.durata && `durata ${v.durata}`, v.ts && `TS ${v.ts}`].filter(Boolean).join(' · ') : '';
      const prepara = lancio === 'prep' && s.tipo === 'I';
      return `<span class="chip pf2-inc${prepara && !n(s.prep) ? ' muto' : ''}" title="${esc(titolo)}">${esc(s.nome)} ${azIcona(v?.azioni)}
        <a class="btn-mini" href="${esc(wikiUrl(v?.pagina || s.nome))}" target="_blank" rel="noopener" title="Descrizione sul wiki">i</a>
        ${prepara ? `<span class="pf2-prep" title="Copie preparate (lanciate / preparate)"><button class="btn-mini" data-azione="pf2-prep" data-id="${id}" data-inc="${s.id}" data-d="-1">−</button>${n(s.lanciati)}/${n(s.prep)}<button class="btn-mini" data-azione="pf2-prep" data-id="${id}" data-inc="${s.id}" data-d="1">+</button></span>` : ''}
        <button class="btn-mini" data-azione="pf2-lancia" data-id="${id}" data-inc="${s.id}" title="Lancia">✨</button>
        <button class="chip-x" data-azione="pf2-rimuovi" data-id="${id}" data-lista="incantesimi" data-elem="${s.id}" title="Togli">×</button></span>`;
    };
    const righeInc = gruppi.filter(([, , l], i) => l.length || (typeof gruppi[i][0] === 'number' && sl.slot[gruppi[i][0]])).map(([r, nome, l]) => {
      let conta = '';
      if (r === 'T') conta = `<small class="muto">intensificati al ${rangoTrucchetti}° livello</small>`;
      else if (r === 'F') conta = `<small class="muto">punti focus</small>`;
      else if (typeof r === 'number' && sl.slot[r]) {
        const usati = n(d.slot.usati[r]);
        const prep = l.reduce((a, s) => a + n(s.prep), 0);
        conta = lancio === 'prep' ? `<small class="${prep > sl.slot[r] ? 'oltre' : 'muto'}">preparati ${prep}/${sl.slot[r]}</small>`
          : `<span class="chip">slot <b>${Math.max(0, sl.slot[r] - usati)}</b>/${sl.slot[r]} <button class="btn-mini" data-azione="pf2-slot" data-id="${id}" data-r="${r}" data-d="1" title="Usa uno slot">−</button><button class="btn-mini" data-azione="pf2-slot" data-id="${id}" data-r="${r}" data-d="-1" title="Recupera">+</button></span>`;
      }
      return `<div class="pf-riga pf2-inc-riga"><b>${esc(nome)}</b> ${conta} ${l.map(vInc).join(' ') || '<span class="muto">—</span>'}</div>`;
    }).join('');
    // Elenco del wiki con filtri: tradizione (quella della classe), livello, tipo, testo
    const fTrad = filtroInc.trad === '' ? tradizione || '' : filtroInc.trad;
    const fRango = filtroInc.rango;
    const qInc = norm(filtroInc.testo);
    const apertoInc = fRango !== '' || qInc;
    const elencoInc = !apertoInc ? [] : INCANTESIMI.filter((v) => (!fTrad || v.trad.includes(fTrad) || (v.tipo === 'F' && fTrad === 'focalizzati'))
      && (fRango === '' || (fRango === 'T' ? v.tipo === 'T' : fRango === 'F' ? v.tipo === 'F' : fRango === 'R' ? v.tipo === 'R' : v.tipo === 'I' && v.livello === Number(fRango)))
      && (!qInc || norm(v.nome).includes(qInc) || v.tratti.some((t) => norm(t) === qInc)));
    const rangoMaxInc = Math.max(1, ...Object.keys(sl.slot).map(Number));
    const browserInc = `<div class="pf-elenco-inc"><div class="pf-riga"><b>Elenco del wiki</b>
        <label>Tradizione <select data-pf2-filtro="inc|trad">${opz([['', 'tutte'], ...Object.values(TRAD).map((t) => [t, t])], fTrad)}</select></label>
        <label>Livello <select data-pf2-filtro="inc|rango">${opz([['', '— chiuso —'], ['T', 'trucchetti'], ...Array.from({ length: 10 }, (_, i) => [String(i + 1), `${i + 1}°${i + 1 > rangoMaxInc ? ' (non ancora)' : ''}`]), ['F', 'focalizzati'], ['R', 'rituali']], fRango)}</select></label>
        <label>Cerca <input type="search" data-pf2-filtro="inc|testo" value="${esc(filtroInc.testo)}" placeholder="nome o tratto"></label>
        <span class="muto">${apertoInc ? `${elencoInc.length} incantesimi` : `${INCANTESIMI.length} incantesimi sul wiki`}</span></div>
      ${elencoInc.length ? `<div class="pf-voci-inc">${elencoInc.slice(0, 150).map((v) => {
        const preso = d.incantesimi.some((s) => norm(s.nome) === norm(v.nome));
        const tardi = v.tipo === 'I' && v.livello > rangoMaxInc;
        return `<div class="pf-voce-inc${preso ? ' presa' : ''}${tardi ? ' non-ancora' : ''}"><button class="btn-mini" data-azione="pf2-inc-aggiungi" data-id="${id}" data-nome="${esc(v.nome)}" ${preso ? 'disabled' : ''} title="${tardi ? 'Livello non ancora accessibile: lo aggiungi comunque' : 'Aggiungi'}">+</button>
          <span>${esc(v.nome)} ${azIcona(v.azioni)} <small class="muto">${v.tipo === 'T' ? 'trucchetto' : v.tipo === 'F' ? `focalizzato ${v.livello}°` : v.tipo === 'R' ? `rituale ${v.livello}°` : `${v.livello}°`} · ${esc(v.trad.join(', ') || v.tratti.filter((t) => NOMI_CLASSI.has(t)).join(', '))}</small></span>
          <a class="btn-mini" href="${esc(wikiUrl(v.pagina))}" target="_blank" rel="noopener">i</a></div>`;
      }).join('')}${elencoInc.length > 150 ? `<p class="muto">…e altri ${elencoInc.length - 150}: restringi la ricerca.</p>` : ''}</div>` : ''}</div>`;
    const focusMax = n(d.focus.max);
    const mostraInc = k && (c.g.inc > 0 || k.tradizione || d.incantesimi.length || lancio);
    const corpoInc = mostraInc ? `<div class="pf-griglia">
      <div class="pf-box"><div class="pf-etich">Tradizione</div>${k.tradizione ? `<div class="pf-valore pf2-trad">${esc(k.tradizione)}</div>` : sel('tradizione', [['', '— scegli —'], ...Object.values(TRAD).map((x) => [x, x])], d.tradizione, 'data-ridisegna-pf2')}
        <div class="pf-mini muto">${lancio === 'spont' ? 'incantatore spontaneo (repertorio)' : lancio === 'prep' ? 'prepara gli incantesimi' : ''}</div></div>
      <div class="pf-box"><div class="pf-etich">Caratteristica</div>${sel('carInc', CARS.map((s) => [s, NOMI_CAR[s]]), c.carInc, 'data-ridisegna-pf2')}</div>
      <div class="pf-box"><div class="pf-etich">Attacco con incantesimi ${badge(c.g.inc)} ${dado('incatt', 'attacco con incantesimo')}</div><div class="pf-valore">${kc('incatt')}</div></div>
      <div class="pf-box"><div class="pf-etich">CD degli incantesimi</div><div class="pf-valore">${kc('inccd')}</div></div>
      <div class="pf-box"><div class="pf-etich">Punti focus</div>
        <div class="pf-pallini">${Array.from({ length: focusMax }, (_, i) => `<button class="pallino${i < focusMax - n(d.focus.usati) ? ' usato' : ''}" data-azione="pf2-focus" data-id="${id}" data-i="${i + 1}" title="Punto focus"></button>`).join('') || '<span class="muto">—</span>'}</div>
        <label class="pf-mini">Massimo ${sel('focus|max', [0, 1, 2, 3].map((x) => [x, x || '—']), focusMax, 'data-tipo="numero" data-ridisegna-pf2')}</label></div></div>
      <div class="pf-riga pf-mini">${sl.std ? `<label class="pf-chk">${chk('slot|auto', sl.auto, 'data-ridisegna-pf2')} Slot dalla tabella del ${esc(d.classe)}</label>` : '<span class="muto">Slot inseriti a mano:</span>'}
        ${!sl.auto ? Array.from({ length: 10 }, (_, i) => `<label>${i + 1}° ${num(`slot|max|${i + 1}`, d.slot.max[i + 1], 'class="pf-corto" min="0" data-ridisegna-pf2')}</label>`).join('') : ''}
        <details class="pf2-extra"><summary class="muto">slot extra</summary>${Array.from({ length: 10 }, (_, i) => `<label>${i + 1}° ${num(`slot|extra|${i + 1}`, d.slot.extra[i + 1], 'class="pf-corto" data-ridisegna-pf2')}</label>`).join('')}
          <span class="muto">es. mago specialista (+1 per livello), Fonte Divina del chierico</span></details></div>
      ${righeInc || '<p class="muto">Nessun incantesimo: aggiungili dall\'elenco qui sotto.</p>'}
      ${browserInc}` : '';

    // Gradi di competenza (riepilogo e minimi a mano)
    const voci = [['perc', 'Percezione'], ['tem', 'Tempra'], ['rif', 'Riflessi'], ['vol', 'Volontà'], ['classe', 'CD di classe'], ['inc', 'Incantesimi'], ['semplici', 'Armi semplici'], ['guerra', 'Armi da guerra'], ['avanzate', 'Armi avanzate'], ['senzarmi', 'Attacchi senz\'armi'], ['nessuna', 'Senza armatura'], ['leggere', 'Armature leggere'], ['medie', 'Armature medie'], ['pesanti', 'Armature pesanti']];
    const corpoGradi = `<p class="muto pf-aiuto">Calcolati dalla classe e dai suoi privilegi fino al livello attuale. Se un talento o un archetipo ti dà un grado più alto, impostalo nella colonna «minimo».</p>
      <div class="pf2-gradi">${voci.map(([key, nome]) => `<div class="pf2-grado-riga"><span>${esc(nome)}</span>${badge(c.g[key])}<label class="muto">minimo ${sel(`gradiExtra|${key}`, GRADI.map((t, i) => [i, i ? SIGLE_GRADO[i] : '—']), n(d.gradiExtra[key]), 'data-tipo="numero" data-ridisegna-pf2')}</label></div>`).join('')}</div>`;

    // Privilegi, talenti e capacità (talenti dal wiki con prerequisiti e filtri)
    const priv = k ? Object.entries(k.livelli).filter(([L]) => Number(L) <= c.liv).map(([L, x]) => `<div class="priv-classe"><span class="muto">${L}°:</span> ${x.filter((y) => !/^(Competenze Iniziali|Stirpe e Background)$/.test(y)).map(esc).join(', ')}</div>`).join('') : '';
    const TIPI_CAP = ['Talento di stirpe', 'Talento di classe', 'Talento di abilità', 'Talento generico', 'Talento di archetipo', 'Privilegio di classe', 'Capacità di stirpe', 'Altro'];
    const capacita = d.capacita.map((x) => {
      const t = talentoDi(x.nome);
      const s = t ? statoTalento(t, d, c) : null;
      return `<div class="pf-cap"><div class="pf-riga">
        <input class="pf-largo" data-pf2="capacita#${x.id}|nome" data-id="${id}" value="${esc(x.nome)}" placeholder="Talento o capacità">
        ${t ? `${azIcona(t.azione)} <small class="muto" title="${esc(t.tratti.join(', '))}">liv ${t.livello}</small>${s && s.req.some((r) => r.esito === false) ? ' <small class="oltre" title="Prerequisiti non più soddisfatti">✖ prerequisiti</small>' : ''}` : ''}
        ${sel(`capacita#${x.id}|tipo`, TIPI_CAP.map((tt) => [tt, tt]), x.tipo)}
        <label>Preso al ${num(`capacita#${x.id}|livello`, x.livello, 'class="pf-corto" min="1" max="20"')}</label>
        ${x.nome ? `<a class="btn-mini" href="${esc(wikiUrl(t?.pagina || x.nome))}" target="_blank" rel="noopener" title="Apri sul wiki">i</a>` : ''}${togli('capacita', x.id)}</div>
        ${t ? '' : `<textarea rows="2" data-pf2="capacita#${x.id}|descrizione" data-id="${id}" placeholder="Effetto, azioni, usi…">${esc(x.descrizione || '')}</textarea>`}</div>`;
    }).join('');
    const st2 = slotTalenti(d, c);
    const presi = (tipo) => d.capacita.filter((x) => x.tipo === tipo).length;
    const riepilogoTal = st2 ? ['classe', 'stirpe', 'abilita', 'generico'].map((key) => `<span class="chip">${esc(TIPO_TAL[key].replace('Talento ', '').replace(/^di /, ''))} <b class="${presi(TIPO_TAL[key]) > st2[key] ? 'oltre' : ''}">${presi(TIPO_TAL[key])}/${st2[key]}</b></span>`).join(' ') : '';
    // Elenco dei talenti del wiki
    const ft = filtroTal;
    const livMaxT = ft.livello === '' ? c.liv : n(ft.livello);
    const qT = norm(ft.testo);
    const trattoT = ft.tratto;
    const apertoT = ft.tipo !== 'chiuso';
    const elencoT = !apertoT ? [] : TALENTI.filter((t) => {
      const cat = categoriaTalento(t, d);
      if (ft.tipo === 'adatti' && !['classe', 'stirpe', 'abilita', 'generico'].includes(cat)) return false;
      if (['classe', 'stirpe', 'abilita', 'generico', 'archetipo'].includes(ft.tipo) && cat !== ft.tipo) return false;
      if (t.livello > livMaxT) return false;
      if (qT && !norm(t.nome).includes(qT)) return false;
      if (trattoT && !t.tratti.includes(trattoT)) return false;
      return true;
    }).map((t) => ({ t, s: statoTalento(t, d, c) })).filter((x) => !ft.soloOk || x.s.stato !== 'no').sort((a, b) => a.t.livello - b.t.livello || a.t.nome.localeCompare(b.t.nome, 'it'));
    const trattiComuni = ['Abilità', 'Generico', 'Archetipo', 'Dedizione', 'Metamagico', 'Posizione', 'Concentrazione', 'Maneggiare', 'Furia', 'Ostentazione', 'Fortuna', 'Mentale', 'Divino', 'Arcano', 'Occulto', 'Primevo'];
    const browserTal = `<div class="pf-elenco-inc"><div class="pf-riga"><b>Talenti del wiki</b>
        <label>Tipo <select data-pf2-filtro="tal|tipo">${opz([['chiuso', '— chiuso —'], ['adatti', 'per me (classe, stirpe, abilità, generici)'], ['classe', `di classe${d.classe ? ` (${d.classe})` : ''}`], ['stirpe', `di stirpe${d.stirpe ? ` (${d.stirpe})` : ''}`], ['abilita', 'di abilità'], ['generico', 'generici'], ['archetipo', 'di archetipo'], ['tutti', 'tutti']], ft.tipo)}</select></label>
        <label>Fino al livello <select data-pf2-filtro="tal|livello">${opz([['', `${c.liv} (il mio)`], ...Array.from({ length: 20 }, (_, i) => [String(i + 1), String(i + 1)])], ft.livello)}</select></label>
        <label>Tratto <select data-pf2-filtro="tal|tratto">${opz([['', 'tutti'], ...trattiComuni.map((x) => [x, x])], ft.tratto)}</select></label>
        <label>Cerca <input type="search" data-pf2-filtro="tal|testo" value="${esc(ft.testo)}" placeholder="nome"></label>
        <label class="pf-chk"><input type="checkbox" data-pf2-filtro="tal|soloOk" ${ft.soloOk ? 'checked' : ''}> solo quelli che posso prendere</label>
        <span class="muto">${apertoT ? `${elencoT.length} talenti` : `${TALENTI.length} talenti sul wiki`}</span></div>
      ${elencoT.length ? `<div class="pf-voci-inc">${elencoT.slice(0, 150).map(({ t, s }) => {
        const preso = d.capacita.some((x) => norm(x.nome) === norm(t.nome));
        return `<div class="pf-voce-inc pf2-tal stato-${s.stato === '?' ? 'dubbio' : s.stato}${preso ? ' presa' : ''}">
          <button class="btn-mini" data-azione="pf2-talento" data-id="${id}" data-nome="${esc(t.nome)}" ${preso || s.stato === 'no' ? 'disabled' : ''} title="${preso ? 'Già preso' : s.stato === 'no' ? 'Prerequisiti o livello non soddisfatti' : s.stato === '?' ? 'Alcuni prerequisiti vanno verificati a mano' : 'Prendi il talento'}">+</button>
          <span><b>${esc(t.nome)}</b> ${azIcona(t.azione)} <small class="muto">liv ${t.livello} · ${esc(t.tratti.join(', '))}${t.raro ? ' · accesso' : ''}</small>
            ${s.req.length ? `<span class="pf2-req">${s.req.map((r) => `<span class="${r.esito === false ? 'oltre' : r.esito ? 'pf2-ok' : 'muto'}">${r.esito === false ? '✖' : r.esito ? '✔' : '?'} ${esc(r.testo)}</span>`).join(' ')}</span>` : ''}</span>
          <a class="btn-mini" href="${esc(wikiUrl(t.pagina))}" target="_blank" rel="noopener" title="Descrizione sul wiki">i</a></div>`;
      }).join('')}${elencoT.length > 150 ? `<p class="muto">…e altri ${elencoT.length - 150}: restringi la ricerca.</p>` : ''}</div>` : ''}</div>`;
    const corpoCap = `${priv ? `<h4>Privilegi di classe <small class="muto">dalla tabella del wiki</small></h4>${priv}` : ''}
      <h4>Talenti e capacità ${riepilogoTal ? `<small class="muto">presi / spettanti fino al ${c.liv}°:</small> ${riepilogoTal}` : ''}</h4>
      ${capacita || '<p class="muto">Nessuno.</p>'}<div class="pf-piede">${aggiungi('capacita', 'Capacità scritta a mano')}</div>
      ${browserTal}`;

    // Equipaggiamento: oggetti dal wiki con volume, monete, ingombro
    const ing = ingombro(d, c);
    const L = window.Luoghi;
    const rigaOggetto = (o) => `<div class="pf-riga luogo-riga"><input class="pf-largo" data-pf2="oggetti#${o.id}|nome" data-id="${id}" value="${esc(o.nome)}" placeholder="Oggetto">
        ${o.livello !== '' && o.livello != null ? `<small class="muto">liv ${esc(o.livello)}</small>` : ''}
        <label>Qtà ${num(`oggetti#${o.id}|qta`, o.qta, 'class="pf-corto" data-ridisegna-pf2')}</label><label title="Volume (L = leggero, un decimo)">Volume ${campo(`oggetti#${o.id}|ingombro`, o.ingombro, 'class="pf-corto" placeholder="L, 1…" data-ridisegna-pf2')}</label>
        <label title="Valore di un pezzo in monete d'oro (per la vendita)">Valore ${num(`oggetti#${o.id}|valore`, o.valore, `class="pf-corto" min="0" step="0.01" placeholder="${L?.valoreDi(o) || 'mo'}" data-ridisegna-pf2`)}</label>
        ${campo(`oggetti#${o.id}|note`, o.note, 'class="pf-largo" placeholder="note"')}
        ${o.wiki ? `<a class="btn-mini" href="${esc(wikiUrl(o.nome))}" target="_blank" rel="noopener" title="Descrizione sul wiki">i</a>` : ''}
        ${L ? L.vendita(o, id, 'pf2') : ''}
        ${L ? `<label class="luogo-dove" title="Dove si trova"><select data-pf2="oggetti#${o.id}|dove" data-id="${id}" data-ridisegna-pf2>${L.opzioni(L.luogo(o, d), d)}</select></label>` : ''}${togli('oggetti', o.id)}</div>`;
    const oggetti = L ? L.sezione({
      oggetti: d.oggetti, riga: rigaOggetto, unita: 'di volume', dati: d, pg: id, sistema: 'pf2',
      peso: (o) => volumeNum(o.ingombro) * Math.max(0, n(o.qta) || 1),
      aggiungi: (k) => `<button class="btn-mini" data-azione="pf2-aggiungi" data-id="${id}" data-lista="oggetti" data-dove="${k}" title="Aggiungi un oggetto qui">+</button>`,
      extra: (k) => {
        if (k !== 'indossato') return '';
        const fissi = [...(d.ca?.nome ? [`🛡 ${esc(d.ca.nome)}`] : []), ...(d.scudo?.nome ? [`🛡 ${esc(d.scudo.nome)}`] : []), ...d.armi.filter((a) => a.nome).map((a) => `⚔ ${esc(a.nome)}`)];
        return fissi.length ? `<div class="luogo-fissi" title="Armi, armatura e scudo (si modificano nelle loro sezioni)">${fissi.map((x) => `<span class="luogo-fisso">${x}</span>`).join('')}</div>` : '';
      },
    }) : d.oggetti.map(rigaOggetto).join('');
    const sceltaOggetto = `<span class="pf-dal-wiki">dal wiki: <input id="pf2-scelta-oggetto-${id}" list="pf2-oggetti" class="pf-largo" placeholder="scrivi per cercare (${C.oggetti.length})">
      <button class="btn-piccolo" data-azione="pf2-oggetto-wiki" data-id="${id}">Aggiungi</button></span>
      <datalist id="pf2-oggetti">${C.oggetti.map((o) => `<option value="${esc(o[0])}">${esc(`${o[1]}${o[2] ? `, liv ${o[2]}` : ''}${o[3] ? `, ${o[3]}` : ''}`)}</option>`).join('')}</datalist>`;
    const corpoEquip = `<div class="pf-riga"><span class="chip ${ing.tot >= ing.max ? 'oltre' : ''}">Ingombro <b>${ing.tot}${ing.decimi ? ` e ${ing.decimi} L` : ''}</b></span>
        <span class="muto">ingombrato oltre ${ing.soglia} (Maldestro 1 e −3 m alla velocità), massimo ${ing.max}</span>${ing.tot > ing.soglia ? ' <span class="oltre">Ingombrato</span>' : ''}</div>
      ${oggetti || '<p class="muto">Nessun oggetto.</p>'}<div class="pf-piede">${aggiungi('oggetti', 'Oggetto')}${sceltaOggetto}</div>
      <div class="pf-riga"><label>mp ${num('monete|mp', d.monete.mp, 'class="pf-corto"')}</label><label>mo ${num('monete|mo', d.monete.mo, 'class="pf-corto"')}</label><label>ma ${num('monete|ma', d.monete.ma, 'class="pf-corto"')}</label><label>mr ${num('monete|mr', d.monete.mr, 'class="pf-corto"')}</label></div>
      <p class="muto pf-aiuto">Il volume conta oggetti, armi, armatura e scudo; 10 oggetti leggeri (L) fanno 1.</p>`;

    // Progressione
    const corpoProg = k ? `<div class="prog-scorri"><table class="prog-tabella"><thead><tr><th>Liv</th><th>Privilegi di classe</th></tr></thead><tbody>
      ${Array.from({ length: 20 }, (_, i) => i + 1).map((L) => `<tr class="${L === c.liv ? 'prog-attuale' : L > c.liv ? 'prog-futuro' : ''}"><td><b>${L}°</b></td><td>${esc((k.livelli[L] || []).join(', '))}${k.aumenti.filter((x) => x[0] === L).map((x) => ` <small class="muto">(${esc(x[1].map((b) => voci.find((v) => v[0] === b)?.[1] || b).join(', '))} → ${GRADI[x[2]].toLowerCase()})</small>`).join('')}</td></tr>`).join('')}
      </tbody></table></div><p class="muto pf-aiuto">Tabella e gradi di competenza dal wiki Golarion Insider PF2.</p>` : '<p class="muto">Scegli una classe.</p>';

    return `<div class="pf1-scheda" data-pf2-scheda="${id}">
      ${salita?.pgId === id ? sezioneSalita(p, d, c) : ''}
      ${sezione('origine', 'Stirpe e background', corpoOrigine)}
      ${sezione('classe', 'Classe e livello', corpoClasse, k ? `<span class="ts-sommario">${esc(d.classe)} ${c.liv}°</span>` : '')}
      ${sezione('caratteristiche', 'Caratteristiche', corpoCar)}
      ${sezione('salute', 'Salute', corpoSalute, `<span class="ts-sommario">PF <b>${c.pfAtt}${n(d.pf.temp) ? `+${n(d.pf.temp)}` : ''}/${c.pfMax}</b>${n(d.morente) ? ` · morente ${d.morente}` : ''}${n(d.ferito) ? ` · ferito ${d.ferito}` : ''}${d.condizioni.length ? ` · ${esc(d.condizioni.join(', '))}` : ''}</span>`)}
      ${sezione('difese', 'Difese e Percezione', corpoDifese, `<span class="ts-sommario">CA <b>${c.ca}</b> · Perc. <b>${segno(c.perc)}</b> · Tem ${segno(c.ts.tem)} · Rif ${segno(c.ts.rif)} · Vol ${segno(c.ts.vol)}</span>`)}
      ${sezione('abilita', 'Abilità', corpoAbil)}
      ${sezione('attacchi', 'Attacchi', corpoAttacchi)}
      ${corpoInc ? sezione('incantesimi', 'Incantesimi', corpoInc) : ''}
      ${sezione('gradi', 'Gradi di competenza', corpoGradi)}
      ${sezione('capacita', 'Privilegi, talenti e capacità', corpoCap)}
      ${sezione('progressione', 'Progressione di classe', corpoProg)}
      ${sezione('equip', 'Equipaggiamento', corpoEquip)}
    </div>`;
  }

  // ---- Salita di livello ----
  function sezioneSalita(p, d, c) {
    const k = classeDi(d);
    const L = c.liv + 1;
    const priv = (k?.livelli[L] || []);
    const gradi = (k?.aumenti || []).filter((x) => x[0] === L);
    const nomiB = { perc: 'Percezione', tem: 'Tempra', rif: 'Riflessi', vol: 'Volontà', classe: 'CD di classe', inc: 'incantesimi', semplici: 'armi semplici', guerra: 'armi da guerra', avanzate: 'armi avanzate', senzarmi: 'attacchi senz\'armi', nessuna: 'senza armatura', leggere: 'armature leggere', medie: 'armature medie', pesanti: 'armature pesanti' };
    const pf = (k?.pf || 8) + c.m.COS;
    const aumenti = LIVELLI_AUMENTI.includes(L);
    return `<div class="pannello salita"><div class="pf-riga"><h3>⬆ Sali al livello ${L}</h3><button class="btn-x" data-azione="pf2-livello-chiudi" title="Annulla">×</button></div>
      <div class="salita-griglia">
        <div><h4>Cosa ottieni</h4><ul>
          <li><b>${esc(d.classe)} ${L}°</b></li>
          <li><b>+${pf} PF</b> (${k?.pf || 8} + COS ${segno(c.m.COS)})</li>
          <li>Competenze: +1 a tutti i valori in cui sei addestrato o migliore (il livello entra nella competenza)</li>
          ${gradi.map((x) => `<li>${esc(x[3])}: <b>${esc(x[1].map((b) => nomiB[b] || b).join(', '))}</b> → ${GRADI[x[2]].toLowerCase()}</li>`).join('')}
          ${priv.length ? `<li>Privilegi: <b>${esc(priv.join(', '))}</b></li>` : ''}
        </ul></div>
        <div><h4>Scelte da fare</h4><ul>
          ${aumenti ? `<li><b>Quattro aumenti di caratteristica</b>: li segni nella riga «${L}° livello» della tabella degli aumenti</li>` : ''}
          ${priv.filter((x) => /^Talent/i.test(x)).map((x) => `<li>${esc(x)}: annotalo in «Privilegi, talenti e capacità»</li>`).join('')}
          ${priv.some((x) => /Incremento di Abilità/i.test(x)) ? '<li>Incremento di abilità: alza di un grado un\'abilità (Esperto dal 3°, Maestro dal 7°, Leggendario dal 15°)</li>' : ''}
          ${priv.some((x) => /Incantesimi di \d+° Livello/i.test(x)) ? '<li>Nuovo livello di incantesimi</li>' : ''}
        </ul></div></div>
      <div class="pf-piede"><button class="primario" data-azione="pf2-livello-conferma" data-id="${p.id}">Conferma il livello ${L}</button></div></div>`;
  }

  // ---- Tiri ----
  function tira(p, chiave) {
    const c = calcola(p);
    const d = dati(p);
    const [tipo, arg, terzo] = chiave.split(':');
    const t = (b, et) => ctx.eseguiTiro(`1d20${b ? segno(b) : ''}`, `${p.nome} · ${et}`);
    if (tipo === 'car') return t(c.m[arg], NOMI_CAR[arg]);
    if (tipo === 'perc') return t(c.perc, 'Percezione');
    if (tipo === 'iniz') return t(c.perc, 'Iniziativa');
    if (tipo === 'ts') return t(c.ts[arg], `TS ${TS[arg][0]}`);
    if (tipo === 'abil') return t(c.abil[arg]?.tot ?? 0, arg);
    if (tipo === 'sap') { const x = c.sapienze.find((y) => y.id === arg); return t(x?.tot ?? 0, d.sapienze.find((y) => y.id === arg)?.nome || 'Sapienza'); }
    if (tipo === 'incatt') return t(c.incAtt, 'attacco con incantesimo');
    const a = c.armi.find((x) => x.id === arg);
    const nome = d.armi.find((x) => x.id === arg)?.nome || 'arma';
    if (tipo === 'colpo' && a) { const i = n(terzo); return t(a.colpi[i], `${nome}${i ? ` (${i + 1}° attacco)` : ''}`); }
    if (tipo === 'danni' && a) { const m = a.danni.match(/^\s*(\d+d\d+(?:[+-]\d+)?)/); if (m) return ctx.eseguiTiro(m[1], `${p.nome} · danni ${nome}`); }
    return null;
  }
  // Danno: prima i PF temporanei; a 0 PF si diventa Morente 1 + Ferito. Cura fino al massimo
  function applicaDanno(p, q, modo) {
    const d = dati(p);
    const c = calcola(p);
    if (modo < 0) {
      let resto = q;
      const t = n(d.pf.temp);
      if (t) { const via = Math.min(t, resto); d.pf.temp = t - via || ''; resto -= via; }
      d.pf.attuali = Math.max(0, c.pfAtt - resto);
      if (d.pf.attuali === 0 && c.pfAtt > 0 && !n(d.morente)) { d.morente = Math.min(4, 1 + n(d.ferito)); ctx.toast(`💀 <b>${esc(p.nome)}</b> è Morente ${d.morente}`, 'errore'); }
    } else {
      if (c.pfAtt <= 0 && q > 0 && n(d.morente)) { d.ferito = Math.min(3, n(d.ferito) + 1); d.morente = 0; }
      d.pf.attuali = Math.min(c.pfMax, c.pfAtt + q);
    }
    if (d.pf.attuali === c.pfMax) d.pf.attuali = '';
  }

  // ---- Azioni ----
  const NUOVI = {
    armi: () => ({ id: uid(), nome: '', categoria: 'semplici', car: 'FOR', dado: 'd6', tipo: '', potenziamento: 0, colpitore: 0, agile: false, distanza: false, lancio: false, tratti: '' }),
    capacita: () => ({ id: uid(), nome: '', tipo: 'Talento di classe', livello: '', descrizione: '' }),
    oggetti: () => ({ id: uid(), nome: '', qta: 1, ingombro: '', note: '', dove: 'zaino' }),
    sapienze: () => ({ id: uid(), nome: 'Sapienza ', grado: 1, varie: '' }),
  };
  const azioni = {
    'pf2-aggiungi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const nuovo = NUOVI[el.dataset.lista]();
      if (el.dataset.dove) nuovo.dove = el.dataset.dove;
      dati(p)[el.dataset.lista].push(nuovo);
      ctx.salva();
      ctx.render();
    },
    'pf2-rimuovi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const arr = dati(p)[el.dataset.lista];
      if (!Array.isArray(arr)) return;
      const i = arr.findIndex((x) => x.id === el.dataset.elem);
      if (i >= 0) arr.splice(i, 1);
      ctx.salva(); ctx.render();
    },
    'pf2-tira'(el) { const p = ctx.personaggio(el.dataset.id); if (p) tira(p, el.dataset.tiro); },
    'pf2-aumento'(el, e) {
      e?.preventDefault?.();
      const d = dati(ctx.personaggio(el.dataset.id));
      const l = d.aumenti[el.dataset.fonte];
      const s = el.dataset.car;
      d.aumenti[el.dataset.fonte] = l.includes(s) ? l.filter((x) => x !== s) : [...l, s];
      ctx.salva(); ctx.render();
    },
    'pf2-sapienza-bg'(el) { const d = dati(ctx.personaggio(el.dataset.id)); d.sapienze.push({ ...NUOVI.sapienze(), nome: el.dataset.nome }); ctx.salva(); ctx.render(); },
    'pf2-danno'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const q = n(el.closest('.pf-box').querySelector('.pf2-quanti').value);
      if (!q) return;
      applicaDanno(p, q, Number(el.dataset.segno));
      ctx.salva(); ctx.render();
    },
    'pf2-eroici'(el) { const d = dati(ctx.personaggio(el.dataset.id)); const i = Number(el.dataset.i); d.eroici = n(d.eroici) >= i ? i - 1 : i; ctx.salva(); ctx.render(); },
    'pf2-recupero'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const cd = 10 + n(d.morente);
      const r = ctx.eseguiTiro('1d20', `${p.nome} · prova di recupero (CD ${cd})`);
      const v = r?.totale ?? 10;
      // Gradi di successo: ±10 dalla CD; il 20 naturale migliora di un grado, l'1 peggiora
      let esito = v >= cd + 10 ? 3 : v >= cd ? 2 : v <= cd - 10 ? 0 : 1;
      if (v === 20) esito = Math.min(3, esito + 1);
      if (v === 1) esito = Math.max(0, esito - 1);
      d.morente = Math.max(0, Math.min(4, n(d.morente) + [2, 1, -1, -2][esito]));
      if (!d.morente) d.ferito = Math.min(3, n(d.ferito) + 1);
      ctx.toast(`${['Fallimento critico', 'Fallimento', 'Successo', 'Successo critico'][esito]}: ${d.morente >= 4 ? '💀 morto' : d.morente ? `Morente ${d.morente}` : 'stabile, non più morente (Ferito +1)'}`, d.morente >= 4 ? 'errore' : '');
      ctx.salva(); ctx.render();
    },
    'pf2-riposo'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      const cura = Math.max(1, c.m.COS) * c.liv;
      applicaDanno(p, cura, 1);
      d.ferito = 0;
      d.slot.usati = {};
      for (const s of d.incantesimi) s.lanciati = 0;
      d.focus.usati = 0;
      ctx.salva(); ctx.render();
      ctx.toast(`🌙 Riposo: +${cura} PF, Ferito rimosso, slot e punti focus recuperati`);
    },
    'pf2-talento'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      const t = talentoDi(el.dataset.nome);
      if (!t) return;
      const s = statoTalento(t, d, c);
      if (s.stato === 'no') { ctx.toast(`Non puoi prendere <b>${esc(t.nome)}</b>: ${esc(!s.livOk ? `serve il ${t.livello}° livello` : s.req.filter((r) => r.esito === false).map((r) => r.testo).join(', '))}`, 'errore'); return; }
      const cat = categoriaTalento(t, d);
      d.capacita.push({ ...NUOVI.capacita(), nome: t.nome, tipo: TIPO_TAL[cat] || 'Altro', livello: c.liv });
      ctx.salva(); ctx.render();
      ctx.toast(`✔ <b>${esc(t.nome)}</b> aggiunto${s.stato === '?' ? ' · verifica a mano i prerequisiti segnati con ?' : ''}`);
    },
    'pf2-inc-aggiungi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const v = incantesimoDi(el.dataset.nome);
      if (!v) return;
      d.incantesimi.push({ id: uid(), nome: v.nome, tipo: v.tipo, rango: v.tipo === 'T' ? 0 : v.livello, prep: 0, lanciati: 0 });
      ctx.salva(); ctx.render();
    },
    'pf2-prep'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const s = d.incantesimi.find((x) => x.id === el.dataset.inc);
      if (!s) return;
      s.prep = Math.max(0, n(s.prep) + Number(el.dataset.d));
      s.lanciati = Math.min(n(s.lanciati), s.prep);
      ctx.salva(); ctx.render();
    },
    'pf2-slot'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const sl = slotDi(d, calcola(p)).slot;
      const r = el.dataset.r;
      d.slot.usati[r] = Math.max(0, Math.min(sl[r] || 0, n(d.slot.usati[r]) + Number(el.dataset.d)));
      ctx.salva(); ctx.render();
    },
    'pf2-focus'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const i = Number(el.dataset.i);
      const disp = n(d.focus.max) - n(d.focus.usati);
      d.focus.usati = n(d.focus.max) - (disp >= i ? i - 1 : i);
      ctx.salva(); ctx.render();
    },
    'pf2-lancia'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      const s = d.incantesimi.find((x) => x.id === el.dataset.inc);
      if (!s) return;
      const v = incantesimoDi(s.nome);
      const dati2 = `CD ${10 + c.incAtt} · attacco ${segno(c.incAtt)}${v?.ts ? ` · TS ${esc(v.ts)}` : ''}`;
      if (s.tipo === 'T') { ctx.toast(`✨ <b>${esc(s.nome)}</b> (trucchetto, ${Math.ceil(c.liv / 2)}° livello) · ${dati2}`); return; }
      if (s.tipo === 'F') {
        if (n(d.focus.usati) >= n(d.focus.max)) { ctx.toast('Nessun punto focus rimasto', 'errore'); return; }
        d.focus.usati = n(d.focus.usati) + 1;
      } else if (s.tipo === 'R') { ctx.toast(`📜 <b>${esc(s.nome)}</b> è un rituale: richiede le prove del rituale`); return; }
      else if ((LANCIO[d.classe] || 'prep') === 'prep') {
        if (n(s.lanciati) >= n(s.prep)) { ctx.toast(`<b>${esc(s.nome)}</b>: nessuna copia preparata rimasta`, 'errore'); return; }
        s.lanciati = n(s.lanciati) + 1;
      } else {
        const sl = slotDi(d, c).slot;
        const r = Object.keys(sl).map(Number).sort((a, b) => a - b).find((x) => x >= n(s.rango) && n(d.slot.usati[x]) < sl[x]);
        if (!r) { ctx.toast(`Nessuno slot di ${s.rango}° livello o superiore rimasto`, 'errore'); return; }
        d.slot.usati[r] = n(d.slot.usati[r]) + 1;
        ctx.salva(); ctx.render();
        ctx.toast(`✨ <b>${esc(s.nome)}</b> con uno slot di ${r}°${r > n(s.rango) ? ' (intensificato)' : ''} · ${dati2}`);
        return;
      }
      ctx.salva(); ctx.render();
      ctx.toast(`✨ <b>${esc(s.nome)}</b> · ${dati2}${s.tipo === 'F' ? ` · punti focus ${n(d.focus.max) - n(d.focus.usati)}/${n(d.focus.max)}` : ''}`);
    },
    'pf2-armatura-wiki'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const a = ARMATURE_W.find((x) => x.nome === document.getElementById(`pf2-scelta-armatura-${p.id}`)?.value);
      if (!a) { ctx.toast('Scegli prima un\'armatura', 'errore'); return; }
      const d = dati(p);
      d.ca = { ...d.ca, nome: a.nome, categoria: a.categoria || 'nessuna', bonus: a.bonus || '', limiteDes: a.desMax, penalita: a.penalita === '' ? '' : Math.abs(a.penalita), velocita: a.velocita, forza: a.forza, volume: a.volume, tratti: a.tratti };
      ctx.salva(); ctx.render();
      ctx.toast(`🛡 Indossi <b>${esc(a.nome)}</b>`);
    },
    'pf2-scudo-wiki'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const s = SCUDI_W.find((x) => x.nome === document.getElementById(`pf2-scelta-scudo-${p.id}`)?.value);
      if (!s) { ctx.toast('Scegli prima uno scudo', 'errore'); return; }
      const d = dati(p);
      d.scudo = { ...d.scudo, nome: s.nome, bonus: s.bonus, durezza: s.durezza, pf: s.pf, danni: '', volume: s.volume, alzato: false };
      ctx.salva(); ctx.render();
    },
    'pf2-arma-wiki'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const [nome, dist] = (document.getElementById(`pf2-scelta-arma-${p.id}`)?.value || '').split('|');
      const a = ARMI_W.find((x) => x.nome === nome && String(x.distanza) === dist);
      if (!a) { ctx.toast('Scegli prima un\'arma', 'errore'); return; }
      const m = String(a.danno).match(/(\d*)d(\d+)\s*([A-Za-z]*)/);
      const tr = norm(a.tratti);
      dati(p).armi.push({ ...NUOVI.armi(), nome: a.nome, categoria: a.categoria || 'semplici', dado: m ? 'd' + m[2] : 'd6', tipo: m?.[3] || '', car: a.distanza ? 'DES' : /accurata/.test(tr) ? 'finezza' : 'FOR',
        agile: /\bagile\b/.test(tr), distanza: !!a.distanza, lancio: false, tratti: [a.tratti, a.gittata && `gittata ${a.gittata}`, a.ricarica && `ricarica ${a.ricarica}`, a.mani && `mani ${a.mani}`, a.gruppo && `gruppo ${a.gruppo}`].filter(Boolean).join(', '), volume: a.volume });
      ctx.salva(); ctx.render();
    },
    'pf2-oggetto-wiki'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const o = C.oggetti.find((x) => norm(x[0]) === norm(document.getElementById(`pf2-scelta-oggetto-${p.id}`)?.value || ''));
      if (!o) { ctx.toast('Scrivi o scegli un oggetto dall\'elenco', 'errore'); return; }
      dati(p).oggetti.push({ ...NUOVI.oggetti(), nome: o[0], livello: o[2] || '', ingombro: o[4], note: [o[1], o[3]].filter(Boolean).join(', '), wiki: true });
      ctx.salva(); ctx.render();
    },
    'pf2-livello-apri'(el) { salita = { pgId: el.dataset.id }; ctx.render(); },
    'pf2-livello-chiudi'() { salita = null; ctx.render(); },
    'pf2-livello-conferma'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      if (n(d.livello) >= 20) return;
      d.livello = n(d.livello) + 1;
      p.campi = p.campi || {};
      p.campi.Livello = String(d.livello);
      salita = null;
      ctx.salva(); ctx.render();
      ctx.toast(`⬆ <b>${esc(p.nome)}</b> è ora di ${d.livello}° livello${LIVELLI_AUMENTI.includes(d.livello) ? ' · segna i 4 aumenti di caratteristica' : ''}`);
    },
  };

  function applica(el) {
    const p = ctx.personaggio(el.dataset.id);
    if (!p) return;
    const d = dati(p);
    const t = trova(d, el.dataset.pf2);
    if (!t) return;
    t[0][t[1]] = valoreDa(el);
    p.campi = p.campi || {};
    const perc = el.dataset.pf2;
    if (perc === 'stirpe') { d.lignaggio = ''; d.aumenti.stirpe = []; p.campi.Ascendenza = d.stirpe; }
    if (perc === 'lignaggio') { if (d.lignaggio === '—') d.lignaggio = ''; p.campi.Retaggio = d.lignaggio; }
    if (perc === 'background') { d.aumenti.background = []; p.campi.Background = d.background; }
    if (perc === 'stirpeLiberi') d.aumenti.stirpe = [];
    if (perc === 'classe') { d.chiave = ''; p.campi.Classe = d.classe; }
    if (perc === 'livello') { d.livello = Math.max(1, Math.min(20, n(d.livello) || 1)); p.campi.Livello = String(d.livello); }
    p.modificato = Date.now();
    ctx.salva();
    aggiorna(p);
  }

  return {
    CAMPI_CALCOLATI,
    vistaScheda,
    azioni,
    moduli: {},
    calcola: (p) => calcola(p),
    tira: (p, k) => tira(p, k),
    danno: (p, q, modo) => applicaDanno(p, q, modo),
    infoCombattimento(p) {
      const c = calcola(p);
      const d = dati(p);
      return { modIniz: c.perc, ca: c.ca, pfMax: c.pfMax, pfAtt: c.pfAtt, temp: n(d.pf.temp), ts: { Tempra: c.ts.tem, Riflessi: c.ts.rif, Volontà: c.ts.vol },
        armi: d.armi.map((a) => { const x = c.armi.find((y) => y.id === a.id); return { id: a.id, nome: a.nome || 'Arma', colpo: x?.colpo ?? 0, colpi: x?.colpi || [], danni: x?.danni || '' }; }),
        morente: n(d.morente), ferito: n(d.ferito), condizioni: d.condizioni };
    },
    migraRegolamento(r) { r.risorse = []; },
    input(el) {
      if (el.dataset.pf2Cercabg !== undefined) { filtroBg = el.value; return true; }
      if (el.dataset.pf2Filtro) {
        const [qual, campo] = el.dataset.pf2Filtro.split('|');
        const f = qual === 'tal' ? filtroTal : filtroInc;
        f[campo] = el.type === 'checkbox' ? el.checked : el.value;
        // I menu si applicano subito; il testo alla conferma (change), per non perdere il fuoco mentre si scrive
        if (el.tagName === 'SELECT' || el.type === 'checkbox') ctx.render();
        return true;
      }
      if (el.dataset.pf2) { applica(el); return true; }
      const sch = el.closest('[data-pf2-scheda]');
      if (sch) { const p = ctx.personaggio(sch.dataset.pf2Scheda); if (p) aggiorna(p); }
      return false;
    },
    change(el) {
      // La ricerca nei background si applica alla conferma (Invio o uscita dal campo), così il campo non perde il fuoco
      if (el.dataset.pf2Cercabg !== undefined) { filtroBg = el.value; ctx.render(); return true; }
      if (el.dataset.pf2Filtro) { if (el.tagName !== 'SELECT' && el.type !== 'checkbox') ctx.render(); return true; }
      if (el.dataset.pf2) { if (el.dataset.ridisegnaPf2 !== undefined) ctx.render(); return true; }
      return false;
    },
  };
};
