'use strict';
// Scheda di Starfinder (1ª edizione) con calcoli automatici. Dati in src/sf-dati.js (wiki Absalom Outsider).
// Struttura come la scheda PF1: i campi sono legati con data-sf="percorso" (es. "armi#id|nome"),
// data-ridisegna-sf ridisegna la pagina al cambio, i valori calcolati hanno data-sfcalc.
window.creaSF = function creaSF(ctx) {
  const { esc, uid, norm } = ctx;
  const D = window.SF_DATI || { abilita: [], classi: {}, razze: {}, temi: {} };
  const WIKI = 'https://starfinder.altervista.org/wiki/';
  const n = (v) => (v === '' || v == null || isNaN(Number(v)) ? 0 : Number(v));
  const segno = (v) => (v >= 0 ? '+' : '') + v;
  const opz = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const CARS = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'];
  const NOMI_CAR = { FOR: 'Forza', DES: 'Destrezza', COS: 'Costituzione', INT: 'Intelligenza', SAG: 'Saggezza', CAR: 'Carisma' };
  // Caratteristica chiave di ogni classe (regole base; il Soldato sceglie tra FOR e DES)
  const CHIAVE = { Avanguardia: ['COS'], Biohacker: ['INT'], Emissario: ['CAR'], Meccanico: ['INT'], Mistico: ['SAG'], Nanocita: ['COS'], Operativo: ['DES'], Solarian: ['CAR'], Soldato: ['FOR', 'DES'], 'Stregone del Velo': ['CAR'], Tecnomante: ['INT'] };
  const CLASSI_INC = { Mistico: 'SAG', Tecnomante: 'INT', 'Stregone del Velo': 'CAR' };
  // Abilità con penalità dell'armatura alla prova
  const CON_PENALITA = new Set(['Acrobazia', 'Atletica', 'Furtività', 'Rapidità di Mano']);
  const TAGLIE = [['Minuscola', 2], ['Piccola', 1], ['Media', 0], ['Grande', -1], ['Enorme', -2]];
  const CAMPI_CALCOLATI = new Set(['Razza', 'Tema', 'Classe', 'Livello', 'CA Energia (CAE)', 'CA Cinetica (CAC)', 'Tempra', 'Riflessi', 'Volontà']);
  const nomeClasse = (x) => Object.keys(D.classi).find((k) => norm(k) === norm(String(x || '').trim())) || '';

  // ---- Bonus attivabili e regole di cumulo (come PF1: stesso tipo = vale il più alto, tranne circostanza e senza tipo) ----
  const TIPI_BONUS = ['senza tipo', 'armatura', 'circostanza', 'cognitivo', 'divino', 'fortuna', 'morale', 'potenziamento', 'razziale', 'resistenza'];
  const CUMULABILI = new Set(['senza tipo', 'circostanza']);
  const BERSAGLI = [
    ['FOR', 'Forza'], ['DES', 'Destrezza'], ['COS', 'Costituzione'], ['INT', 'Intelligenza'], ['SAG', 'Saggezza'], ['CAR', 'Carisma'],
    ['colpire', 'Tiri per colpire'], ['danni', 'Danni'], ['ca', 'CA (CAE e CAC)'], ['cae', 'CA Energia'], ['cac', 'CA Cinetica'],
    ['ts', 'Tutti i tiri salvezza'], ['tempra', 'Tempra'], ['riflessi', 'Riflessi'], ['volonta', 'Volontà'], ['abilita', 'Tutte le abilità'], ['iniz', 'Iniziativa'],
  ];
  const E = (bersaglio, valore, tipo = 'senza tipo') => ({ bersaglio, valore, tipo });
  const PRESET = {
    'Fiancheggiare': [E('colpire', 2)],
    'Carica': [E('colpire', 2), E('ca', -2)],
    'Combattere sulla difensiva': [E('colpire', -4), E('ca', 2)],
    'Difesa totale': [E('ca', 4)],
    'Scosso': [E('colpire', -2), E('ts', -2), E('abilita', -2)],
    'Infermo': [E('colpire', -2), E('danni', -2), E('ts', -2), E('abilita', -2)],
    'Prono (contro mischia)': [E('ca', -4)],
  };
  function analizzaCumulo(lista) {
    const voci = lista.map((e) => ({ ...e, v: n(e.valore), tipo: e.tipo || 'senza tipo', conta: true, motivo: '' }));
    const gruppi = new Map();
    for (const x of voci) {
      if (x.v <= 0) continue;
      const k = CUMULABILI.has(x.tipo) ? `${x.tipo}|${norm(x.fonte || '') || Math.random()}` : x.tipo;
      if (!gruppi.has(k)) gruppi.set(k, []);
      gruppi.get(k).push(x);
    }
    for (const g of gruppi.values()) {
      if (g.length < 2) continue;
      const m = g.reduce((a, b) => (b.v > a.v ? b : a));
      for (const x of g) if (x !== m) { x.conta = false; x.motivo = CUMULABILI.has(x.tipo) ? `stessa fonte (${m.fonte})` : `superato da ${m.fonte || 'altro'} (${segno(m.v)} ${x.tipo})`; }
    }
    return { totale: voci.reduce((a, x) => a + (x.conta ? x.v : 0), 0), voci };
  }
  const cumula = (l) => analizzaCumulo(l).totale;

  // ---- Contenuti dal wiki (src/sf-contenuti.js) ----
  const C = window.SF_CONTENUTI || { talenti: [], incantesimi: [], armi: [], armature: [], scudi: [] };
  const linkWiki = (pagina, nome) => WIKI + String(pagina || nome).replace(/ /g, '_');
  const TALENTI = C.talenti.map(([nome, en, tipo, pre, fonte, pagina]) => ({ nome, en, tipo, pre, fonte, pagina: pagina || nome }));
  const talentoDi = (nome) => TALENTI.find((t) => norm(t.nome) === norm(String(nome || '').replace(/\s*\([^)]*\)\s*$/, ''))) || TALENTI.find((t) => norm(t.nome) === norm(nome || '')) || null;
  // Prerequisiti: parti controllabili (caratteristiche, BAB, livello, gradi, talenti, livello di classe); il resto è "da verificare"
  function requisiti(t) {
    return String(t.pre || '').split(/,\s*|;\s*/).map((s) => s.trim().replace(/\.$/, '')).filter(Boolean).map((s) => {
      const x = norm(s);
      let m;
      if ((m = x.match(/^(forza|destrezza|costituzione|intelligenza|saggezza|carisma|for|des|cos|int|sag|car)\s+(\d+)/))) return { testo: s, k: 'car', c: { forza: 'FOR', destrezza: 'DES', costituzione: 'COS', intelligenza: 'INT', saggezza: 'SAG', carisma: 'CAR' }[m[1]] || m[1].toUpperCase(), v: +m[2] };
      if ((m = x.match(/^(?:bonus di attacco base|bab)\s*\+?(\d+)/))) return { testo: s, k: 'bab', v: +m[1] };
      if ((m = x.match(/livello del personaggio\s*(\d+)|(\d+)\s*[°º]\s*livello del personaggio|personaggio di (\d+)\s*[°º]/))) return { testo: s, k: 'liv', v: +(m[1] || m[2] || m[3]) };
      if ((m = s.match(/^(.+?)\s+(\d+)\s+grad[oi]$/i)) || (m = s.match(/^(\d+)\s+grad[oi]\s+(?:in|di)\s+(.+)$/i))) {
        const [ab, v] = /^\d+$/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
        return { testo: s, k: 'gradi', abil: ab.trim(), v: +v };
      }
      if ((m = s.match(/^(.+?)\s+di\s+(\d+)\s*[°º]\s*livello$/i)) && nomeClasse(m[1])) return { testo: s, k: 'classe', nome: nomeClasse(m[1]), v: +m[2] };
      const tal = talentoDi(s);
      if (tal) return { testo: s, k: 'tal', nome: tal.nome };
      return { testo: s, k: 'testo' };
    });
  }
  function verifica(r, p, d, c) {
    switch (r.k) {
      case 'car': return (c.punteggio[r.c] ?? 10) >= r.v;
      case 'bab': return c.bab >= r.v;
      case 'liv': return c.liv >= r.v;
      case 'gradi': { const k = D.abilita.find(([a]) => norm(a) === norm(r.abil))?.[0]; return k ? n(d.abil[k]?.gradi) >= r.v : null; }
      case 'classe': return (d.classi.find((x) => nomeClasse(x.nome) === r.nome)?.livello || 0) >= r.v;
      case 'tal': return d.capacita.some((x) => norm(x.nome.replace(/\s*\([^)]*\)\s*$/, '')) === norm(r.nome));
      default: return null;
    }
  }
  function statoTalento(t, p, d, c) {
    const req = requisiti(t).map((r) => ({ ...r, esito: verifica(r, p, d, c) }));
    return { req, stato: req.some((r) => r.esito === false) ? 'no' : req.some((r) => r.esito === null) ? 'forse' : 'ok' };
  }
  const filtriTalenti = { testo: '', tipo: '', stato: '' };
  function listaTalentiHtml(p) {
    const d = dati(p);
    const c = calcola(p);
    const q = norm(filtriTalenti.testo.trim());
    const presi = new Set(d.capacita.map((x) => norm(x.nome)));
    const righe = TALENTI.filter((t) => (!q || norm(t.nome).includes(q) || norm(t.en).includes(q) || norm(t.pre).includes(q)) && (!filtriTalenti.tipo || t.tipo === filtriTalenti.tipo))
      .map((t) => [t, statoTalento(t, p, d, c)])
      .filter(([, s]) => !filtriTalenti.stato || (filtriTalenti.stato === 'acquisibili' ? s.stato !== 'no' : s.stato === filtriTalenti.stato));
    return `<p class="muto tal-conta">${righe.length} talenti</p>` + righe.slice(0, 150).map(([t, s]) => `<div class="tal-riga tal-${s.stato}${presi.has(norm(t.nome)) ? ' presa' : ''}">
        <span class="tal-stato">${{ ok: '✔', forse: '?', no: '✖' }[s.stato]}</span>
        <div class="tal-corpo"><div><b>${esc(t.nome)}</b> <small class="muto">${esc(t.en)}</small> <small class="tal-tipi">${esc(t.tipo)}</small></div>
          <div class="tal-pre"><span class="muto">Prerequisiti:</span> ${s.req.length ? s.req.map((r) => `<span class="pre-${r.esito === true ? 'ok' : r.esito === false ? 'no' : 'forse'}">${esc(r.testo)}</span>`).join(', ') : '<span class="muto">nessuno</span>'}</div></div>
        <a class="btn-mini" href="${esc(linkWiki(t.pagina))}" target="_blank" rel="noopener" title="Descrizione sul wiki">i</a>
        <button class="btn-piccolo" data-azione="sf-prendi-talento" data-id="${p.id}" data-nome="${esc(t.nome)}" ${s.stato === 'no' ? `disabled title="Manca: ${esc(s.req.filter((r) => r.esito === false).map((r) => r.testo).join(', '))}"` : ''}>+ Prendi</button>
      </div>`).join('');
  }
  // Incantesimi per classe: colonna di livello nei dati
  const COL_INC = { Mistico: 1, Tecnomante: 2, 'Stregone del Velo': 3 };
  const INCANTESIMI = C.incantesimi.map((v) => ({ nome: v[0], liv: { Mistico: v[1], Tecnomante: v[2], 'Stregone del Velo': v[3] }, scuola: v[4], tempo: v[5], gittata: v[6], durata: v[7], ts: v[8], ri: v[9], pagina: v[10] || v[0] }));
  // Livelli: "1" o "0-6" (incantesimi a più livelli): si prende il primo
  const livelloInc = (v, classe) => { const s = v.liv[classe]; return s === '' || s == null ? null : Number(String(s).split('-')[0]); };
  const sfogliaInc = {}; // classe -> livello mostrato nell'elenco
  // Equipaggiamento
  const TIPOLOGIA = { 'da Mischia Base': ['mischia base', 'mischia'], 'da Mischia Avanzata': ['mischia avanzata', 'mischia'], Piccole: ['piccola', 'distanza'], Lunghe: ['lunga', 'distanza'], Pesanti: ['pesante', 'distanza'], 'di Precisione': ['precisione', 'distanza'], Speciali: ['speciale', 'distanza'] };

  // ---- Dati del personaggio ----
  // Operativo: specializzazioni (wiki «Operativo/Specializzazioni»). abil: abilità associate; attacco: abilità per l'attacco
  // ingannevole con il suo bonus; classe: abilità che diventa di classe; trucco: trucco della specializzazione (5°); potere: 11°
  const SPEC_OPERATIVO = {
    'Asso del Volante': { abil: ['Pilotare', 'Sopravvivenza'], attacco: ['Pilotare', 1, 'da un veicolo'], trucco: 'Acrobazia Spericolata', potere: "Tutt'uno con il Volante" },
    Bandito: { abil: ['Intimidire', 'Intuizione'], attacco: ['Intimidire', 4], trucco: 'Comando Disarmante', potere: 'Presenza Autoritaria' },
    Detective: { abil: ['Cultura', 'Intuizione'], attacco: ['Intuizione', 4], trucco: 'Scorgere la Verità', potere: 'Intuizione del Detective' },
    Discepolo: { abil: ['Misticismo', 'Percezione'], attacco: ['Misticismo', 4], classe: 'Misticismo', trucco: 'Apprendimento Esperienziale', potere: 'Resistenza agli Incantesimi' },
    'Esperto di Dispositivi': { abil: ['Ingegneria', 'Rapidità di Mano'], attacco: ['Ingegneria', 4], trucco: 'Cintura Portaoggetti', potere: 'Dispiegamento Rapido' },
    Esploratore: { abil: ['Cultura', 'Sopravvivenza'], attacco: ['Sopravvivenza', 4], trucco: 'Sempre Vigile', potere: 'In Terre Inesplorate' },
    Fantasma: { abil: ['Acrobazia', 'Furtività'], attacco: ['Furtività', 1], trucco: 'Campo di Ammantamento', potere: 'Fuga Fuori Fase' },
    Hacker: { abil: ['Computer', 'Ingegneria'], attacco: ['Computer', 4], trucco: 'Hacker Elusivo', potere: 'Hackeraggio di Controllo' },
    Ladro: { abil: ['Percezione', 'Rapidità di Mano'], attacco: ['Rapidità di Mano', 0], trucco: 'Distrazione Olografica', potere: 'Piano di Riserva' },
    Spia: { abil: ['Camuffare', 'Raggirare'], attacco: ['Raggirare', 4], trucco: 'Maestro dei Travestimenti', potere: 'Ingannare Individuazione' },
    Temerario: { abil: ['Acrobazia', 'Atletica'], attacco: ['Acrobazia', 0], trucco: 'Movimento Versatile', potere: 'Sfruttare il Terreno' },
  };
  // Mistico: connessioni (src/sf-connessioni.js, wiki «Mistico/Connessioni») e incantesimi conosciuti (tabella del mistico)
  const CONNESSIONI = window.SF_CONNESSIONI || {};
  const livMistico = (d) => d.classi.filter((cl) => nomeClasse(cl.nome) === 'Mistico').reduce((a, cl) => a + n(cl.livello), 0);
  const connessioneDi = (d) => CONNESSIONI[d.mistico?.connessione] || null;
  // Incanalare Abilità: +1 al 2° livello (al 1° per la connessione Akashica), poi +1 ogni 3 livelli
  const incanalareMs = (L, akashica) => (L >= 2 ? 1 + Math.floor((L - 2) / 3) : akashica && L >= 1 ? 1 : 0);
  // Incantesimi conosciuti per livello del mistico: [livello 0, 1°, 2°, …, 6°]
  const CONOSCIUTI_MS = [[4, 2], [5, 3], [6, 4], [6, 4, 2], [6, 4, 3], [6, 4, 4], [6, 5, 4, 2], [6, 5, 4, 3], [6, 5, 4, 4], [6, 5, 5, 4, 2], [6, 6, 5, 4, 3], [6, 6, 5, 4, 4],
    [6, 6, 5, 5, 4, 2], [6, 6, 6, 5, 4, 3], [6, 6, 6, 5, 4, 4], [6, 6, 6, 5, 5, 4, 2], [6, 6, 6, 6, 5, 4, 3], [6, 6, 6, 6, 5, 4, 4], [6, 6, 6, 6, 5, 5, 4], [6, 6, 6, 6, 6, 5, 5]];
  // Livello d'incantesimo più alto del mistico (1° dal 1°, 2° dal 4°, 3° dal 7°… 6° dal 16°)
  const incMaxMs = (L) => (L ? Math.min(6, Math.floor((L - 1) / 3) + 1) : 0);
  // Incantesimi della connessione tra i conosciuti: uno per livello lanciabile; con l'incantesimo di livello variabile,
  // il livello più alto ha quello variabile e i livelli sotto l'incantesimo che lo sostituisce
  function sincronizzaConnessione(d) {
    const cn = connessioneDi(d);
    const L = livMistico(d);
    const voluti = [];
    if (cn && L) {
      const max = incMaxMs(L);
      for (let l = 1; l <= max; l++) {
        const nome = cn.variabile && (l === max || !cn.inc[l]) ? cn.variabile : cn.inc[l];
        if (nome) voluti.push({ id: `conn-${l}`, classe: 'Mistico', nome, livello: l, connessione: true });
      }
    }
    const chiave = (x) => `${x.livello}|${x.nome}`;
    const ora = d.incantesimi.filter((x) => x.connessione);
    if (ora.length === voluti.length && ora.every((x, i) => chiave(x) === chiave(voluti[i]))) return;
    d.incantesimi = [...d.incantesimi.filter((x) => !x.connessione), ...voluti];
  }
  // Soldato: stili di combattimento (src/sf-stili.js, wiki «Soldato/Stili»). Lo stile primario usa il livello da soldato,
  // quello secondario (dal 9°) il livello da soldato −8: le sue tecniche arrivano al 9°, 13° e 17°
  const STILI = window.SF_STILI || {};
  const livSoldato = (d) => d.classi.filter((cl) => nomeClasse(cl.nome) === 'Soldato').reduce((a, cl) => a + n(cl.livello), 0);
  function stiliSoldato(d) {
    const L = livSoldato(d);
    const out = [];
    if (!L) return out;
    const pr = d.soldato?.primario, se = d.soldato?.secondario;
    if (STILI[pr]) out.push({ nome: pr, liv: L, ruolo: 'primario' });
    if (L >= 9 && STILI[se] && se !== pr) out.push({ nome: se, liv: L - 8, ruolo: 'secondario' });
    return out;
  }
  const livStile = (d, nome) => stiliSoldato(d).find((x) => x.nome === nome)?.liv || 0;
  // Abilità del tema (wiki, Conoscenza Specialistica): stringa = abilità fissa, elenco = a scelta. Senza Tema: qualsiasi, senza il +1.
  // Truffatore: +1 a Professione; Quartiermastro: Professione (quartiermastro) di classe
  const ABIL_TEMA = {
    Biotecnologo: 'Medicina', 'Cercatore di Xeno': 'Scienza Biologica', 'Esploratore dello Spazio': 'Scienza Fisica', Fuorilegge: 'Rapidità di Mano',
    Icona: 'Cultura', Mercenario: 'Atletica', 'Pilota Esperto': 'Pilotare', Sacerdote: 'Misticismo', Quartiermastro: 'Professione',
    Atleta: ['Acrobazia', 'Atletica'], Burocrate: ['Cultura', 'Misticismo', 'Professione', 'Scienza Biologica', 'Scienza Fisica'],
    Erudito: ['Scienza Biologica', 'Scienza Fisica'], 'Investigatore del Paranormale': ['Diplomazia', 'Scienza Biologica', 'Misticismo', 'Sopravvivenza'],
    'Rampollo Nobile': ['Raggirare', 'Diplomazia'], 'Senza Tema': 'qualsiasi',
  };
  // Abilità del tema del personaggio: { nome, scelte (se a scelta), piu1 (vale la regola del +1) }
  function abilTema(d) {
    const nome = d.tema?.nome;
    if (!nome) return null;
    const x = ABIL_TEMA[nome] ?? D.temi[nome]?.abil;
    const tutte = D.abilita.map(([a]) => a);
    const scelte = x === 'qualsiasi' ? tutte : Array.isArray(x) ? x : null;
    const abil = scelte ? (scelte.includes(d.tema.abil) ? d.tema.abil : '') : x || '';
    return { nome: abil, scelte, piu1: nome !== 'Senza Tema' && nome !== 'Quartiermastro' };
  }
  // +1 a una caratteristica del tema: quelle tra cui scegliere (null = fissa dai dati; Senza Tema: tutte)
  function sceltaCarTema(d) {
    const nome = d.tema?.nome;
    if (nome === 'Atleta') return ['FOR', 'DES', 'COS'];
    if (nome === 'Guardiano') return ['FOR', 'DES'];
    if (nome === 'Burocrate') {
      const a = abilTema(d)?.nome;
      if (!a) return [];
      const car = D.abilita.find(([x]) => x === a)?.[1];
      return car ? [car] : ['INT', 'SAG', 'CAR']; // Professione: dipende dal mestiere
    }
    return D.temi[nome]?.car ? null : CARS;
  }
  // Caratteristica del tema che riceve il +1 ('' = ancora da scegliere)
  function carTemaDi(d) {
    if (!d.tema?.nome || !D.temi[d.tema.nome]) return '';
    const sc = sceltaCarTema(d);
    if (!sc) return D.temi[d.tema.nome].car;
    return sc.length === 1 ? sc[0] : sc.includes(d.tema.car) ? d.tema.car : '';
  }
  const livOperativo = (d) => d.classi.filter((cl) => nomeClasse(cl.nome) === 'Operativo').reduce((a, cl) => a + n(cl.livello), 0);
  const specDi = (d) => SPEC_OPERATIVO[d.operativo?.spec] || null;
  // Vantaggio dell'Operativo: +1, +2 al 3°, poi +1 ogni 4 livelli (7°, 11°, 15°, 19°)
  const vantaggioOp = (L) => (L >= 3 ? 2 + Math.floor((L - 3) / 4) : L ? 1 : 0);
  const predefiniti = () => ({
    operativo: { spec: '' }, mistico: { connessione: '' }, // tema.abil: abilità scelta per i temi che la lasciano libera soldato: { primario: '', secondario: '', caccia: '' },
    razza: { nome: '', scelta: '', inclusi: false }, tema: { nome: '', car: '' }, chiave: '',
    classi: [], pf: { attuali: '', temp: '' }, ps: { attuali: '' }, pr: { usati: 0 },
    ca: { cae: '', cac: '' }, ts: { tempra: { varie: '' }, riflessi: { varie: '' }, volonta: { varie: '' } }, iniz: { varie: '' },
    abil: {}, gradiExtra: '', armi: [], armature: [], capacita: [], bonus: [], oggetti: [], crediti: '', taglia: '',
    incantesimi: [], usiInc: {}, // incantesimi conosciuti [{ id, classe, nome, livello }] e slot usati { classe: { livello: n } }
  });
  function dati(p) {
    if (!p.sf) {
      p.sf = predefiniti();
      // Riprende razza, tema e classe scritti nei campi di testo
      const r = Object.keys(D.razze).find((k) => norm(k) === norm(p.campi?.Razza || ''));
      if (r) { p.sf.razza.nome = r; p.sf.razza.inclusi = true; }
      const t = Object.keys(D.temi).find((k) => norm(k) === norm(p.campi?.Tema || ''));
      if (t) p.sf.tema.nome = t;
      const k = nomeClasse(p.campi?.Classe);
      if (k) p.sf.classi.push({ id: uid(), nome: k, livello: Math.max(1, parseInt(p.campi?.Livello, 10) || 1) });
    }
    const d = p.sf;
    const def = predefiniti();
    for (const key of Object.keys(def)) if (d[key] === undefined) d[key] = def[key];
    sincronizzaConnessione(d);
    return d;
  }
  const razzaDi = (d) => D.razze[d.razza?.nome] || null;
  const temaDi = (d) => D.temi[d.tema?.nome] || null;
  const livelloTot = (d) => d.classi.reduce((a, c) => a + n(c.livello), 0);
  const rigaClasse = (cl, L) => D.classi[nomeClasse(cl.nome)]?.righe[Math.min(20, L) - 1] || null;
  const valRiga = (cl, i) => { const L = n(cl.livello); const r = L > 0 ? rigaClasse(cl, L) : null; return r ? n(String(r[i]).replace('+', '')) : 0; };
  const chiaveDi = (d) => {
    if (d.chiave) return d.chiave;
    const k = d.classi.map((c) => nomeClasse(c.nome)).find(Boolean);
    return k ? CHIAVE[k][0] : 'COS';
  };

  // ---- Calcoli ----
  // Volume di un oggetto: numero, "L" leggero, "—" trascurabile (regola comune in src/luoghi.js)
  const volumeDi = (testo, qta) => (window.Luoghi?.volumeDi ? window.Luoghi.volumeDi(testo, qta)
    : (/^L/i.test(String(testo || '').trim()) ? { interi: 0, leggeri: n(qta) } : { interi: n(String(testo || '').replace(',', '.')) * n(qta), leggeri: 0 }));
  // Volume scritto dal wiki: "L (1)" → "L", "-" → trascurabile
  const volumeWiki = (s) => { const t = String(s || '').trim(); return !t || t === '-' || t === '—' ? '' : t.split(/\s/)[0]; };
  // Livello dell'oggetto: in un insediamento tipico si trova fino al livello del personaggio +1, nei maggiori fino a +2
  function avvisoLivello(p, livello) {
    const lo = n(livello), lp = livelloTot(dati(p));
    if (!lp || lo <= lp + 1) return '';
    return lo <= lp + 2 ? ' · si trova solo negli insediamenti maggiori (livello personaggio +2)' : ` · ⚠ livello ${lo}: oltre quanto si trova di solito (fino al ${lp + 2}°), serve il permesso del GM`;
  }
  function calcola(p) {
    const d = dati(p);
    const razza = razzaDi(d);
    const tema = temaDi(d);
    const eff = [
      ...(razza?.bonus || []).map(([bersaglio, valore, tratto]) => ({ bersaglio, valore, tipo: 'razziale', fonte: `${tratto} (razza)` })),
      ...d.bonus.filter((b) => b.attivo).flatMap((b) => (b.effetti || []).map((e) => ({ ...e, fonte: b.nome || 'bonus', fonteId: b.id }))),
    ];
    const livOp = livOperativo(d);
    const spec = livOp ? specDi(d) : null;
    if (livOp) { const v = vantaggioOp(livOp); eff.push({ bersaglio: 'iniz', valore: v, tipo: 'cognitivo', fonte: "Vantaggio dell'Operativo" }, { bersaglio: 'abilita', valore: v, tipo: 'cognitivo', fonte: "Vantaggio dell'Operativo" }); }
    if (spec) for (const a of spec.abil) eff.push({ bersaglio: 'abil:' + a, valore: 3, tipo: 'cognitivo', fonte: `Abilità Focalizzata (${d.operativo.spec})` });
    const livMs = livMistico(d);
    const conn = livMs ? connessioneDi(d) : null;
    const incanalare = conn ? incanalareMs(livMs, d.mistico.connessione === 'Akashica') : 0;
    if (incanalare) for (const a of conn.abil) eff.push({ bersaglio: 'abil:' + a, valore: incanalare, tipo: 'cognitivo', fonte: `Incanalare Abilità (${d.mistico.connessione})` });
    // Soldato: Reazione Rapida (Incursore) +4 all'iniziativa; Vigilanza (Agguatatore) dà Iniziativa Migliorata come talento bonus
    const livSo = livSoldato(d);
    if (livStile(d, 'Incursore')) eff.push({ bersaglio: 'iniz', valore: 4, tipo: 'senza tipo', fonte: 'Reazione Rapida (Incursore)' });
    if (livStile(d, 'Agguatatore')) eff.push({ bersaglio: 'iniz', valore: 4, tipo: 'senza tipo', fonte: 'Iniziativa Migliorata (Vigilanza, Agguatatore)' });
    const guardia = livStile(d, 'Guardia') > 0; // Addestramento nell'Armatura: penalità −1 (minimo 0) e DES massima +1 dell'armatura
    const per = (...k) => eff.filter((e) => k.includes(e.bersaglio));
    const liv = livelloTot(d);
    const base = {}, punteggio = {}, m = {};
    for (const s of CARS) {
      const v = p.caratteristiche?.[s];
      base[s] = v === '' || v == null ? 10 : n(v);
      const mRazza = razza && !d.razza.inclusi ? n(razza.car[s]) + (razza.scelta && d.razza.scelta === s ? razza.scelta : 0) : 0;
      const carTema = carTemaDi(d);
      const mTema = d.tema.nome && !d.razza.inclusi && carTema === s ? 1 : 0;
      punteggio[s] = base[s] + mRazza + mTema + cumula(per(s));
      m[s] = Math.floor((punteggio[s] - 10) / 2);
    }
    const chiave = chiaveDi(d);
    const bab = d.classi.reduce((a, cl) => a + valRiga(cl, 0), 0);
    // Salute e risolutezza
    const pfMax = (razza ? n(razza.pf) : 0) + d.classi.reduce((a, cl) => a + n(D.classi[nomeClasse(cl.nome)]?.pf) * n(cl.livello), 0);
    const psMax = Math.max(0, d.classi.reduce((a, cl) => a + (n(D.classi[nomeClasse(cl.nome)]?.ps) + m.COS) * n(cl.livello), 0));
    const prMax = liv ? Math.max(1, Math.floor(liv / 2)) + m[chiave] : 0;
    const pfAtt = d.pf.attuali === '' ? pfMax : n(d.pf.attuali);
    const psAtt = d.ps.attuali === '' ? psMax : n(d.ps.attuali);
    // Volume portato (wiki «Equipaggiamento»): oggetti nello zaino, armi e armature; 10 leggeri = 1, le frazioni non contano.
    // Oltre metà della Forza: ingombrato; oltre la Forza: sovraccarico.
    const vol = { interi: 0, leggeri: 0 };
    const aggiungiVol = (testo, qta) => { const v = volumeDi(testo, qta); vol.interi += v.interi; vol.leggeri += v.leggeri; };
    for (const o of d.oggetti) if (!window.Luoghi || window.Luoghi.porta(o, d, 'sf')) aggiungiVol(o.ingombro, o.qta === '' || o.qta == null ? 1 : o.qta);
    for (const a of d.armi) aggiungiVol(a.volume, 1);
    for (const a of d.armature) aggiungiVol(a.volume, 1);
    const volume = Math.floor(vol.interi) + Math.floor(vol.leggeri / 10);
    const forza = punteggio.FOR;
    const carico = volume > forza ? 'sovraccarico' : volume > forza / 2 ? 'ingombrato' : '';
    // Armatura indossata e CA (il carico limita anche la DES alla CA: +2 ingombrato, +0 sovraccarico)
    const arm = d.armature.filter((a) => a.indossata);
    const suArmatura = (a) => (guardia && a.tipo !== 'scudo' ? 1 : 0);
    const limiti = arm.filter((a) => a.desMax !== '' && a.desMax != null).map((a) => Number(a.desMax) + suArmatura(a));
    if (carico) limiti.push(carico === 'sovraccarico' ? 0 : 2);
    const desMax = limiti.length ? Math.min(...limiti) : null;
    const desCA = desMax === null ? m.DES : Math.min(m.DES, desMax);
    const penalita = arm.reduce((a, x) => a + Math.max(0, Math.abs(n(x.penalita)) - suArmatura(x)), 0);
    const t = (TAGLIE.find((x) => x[0] === (d.taglia || razza?.taglia || 'Media')) || TAGLIE[2])[1];
    const caArm = (k) => arm.map((a) => ({ tipo: a.tipo === 'scudo' ? 'scudo' : 'armatura', valore: a[k], fonte: a.nome || 'armatura' }));
    const cae = 10 + desCA + t + n(d.ca.cae) + cumula([...caArm('cae'), ...per('ca', 'cae')]);
    const cac = 10 + desCA + t + n(d.ca.cac) + cumula([...caArm('cac'), ...per('ca', 'cac')]);
    // Tiri salvezza dalle tabelle di classe
    const ts = {};
    for (const [k, car, i] of [['tempra', 'COS', 1], ['riflessi', 'DES', 2], ['volonta', 'SAG', 3]]) {
      const b = d.classi.reduce((a, cl) => a + valRiga(cl, i), 0);
      ts[k] = { base: b, tot: b + m[car] + n(d.ts[k]?.varie) + cumula(per('ts', k)) };
    }
    const iniz = m.DES + n(d.iniz.varie) + cumula(per('iniz'));
    // Abilità
    const diClasse = new Set(d.classi.flatMap((cl) => D.classi[nomeClasse(cl.nome)]?.abil || []));
    // Tema: l'abilità diventa di classe; se lo è già per la classe presa al 1° livello, +1 alle prove
    const at = abilTema(d);
    let temaPiu1 = '';
    if (at?.nome) {
      const prima = D.classi[nomeClasse(d.classi[0]?.nome)]?.abil || [];
      if (at.piu1 && prima.includes(at.nome)) { temaPiu1 = at.nome; eff.push({ bersaglio: 'abil:' + at.nome, valore: 1, tipo: 'senza tipo', fonte: `Tema ${d.tema.nome}` }); }
      else diClasse.add(at.nome);
    }
    if (d.tema?.nome === 'Truffatore') eff.push({ bersaglio: 'abil:Professione', valore: 1, tipo: 'senza tipo', fonte: 'Tema Truffatore' });
    if (spec?.classe) diClasse.add(spec.classe);
    // Cacciatore Competente: Percezione di classe e un grado gratuito per livello (dello stile) da usare in Percezione o Sopravvivenza.
    // La divisione si sceglie nella sezione del soldato; se non è scelta, i gradi vanno prima a Percezione fin dove servono
    const caccia = livStile(d, 'Cacciatore');
    if (caccia) diClasse.add('Percezione');
    const cacciaPerc = !caccia ? 0 : d.soldato.caccia !== '' && d.soldato.caccia != null ? Math.min(caccia, Math.max(0, n(d.soldato.caccia)))
      : Math.min(caccia, Math.max(0, liv - n(d.abil.Percezione?.gradi)));
    const gratisCaccia = { Percezione: cacciaPerc, Sopravvivenza: caccia - cacciaPerc };
    const abil = {};
    let gradiSpesi = 0;
    for (const [nome, car] of D.abilita) {
      const s = d.abil[nome] || {};
      gradiSpesi += n(s.gradi);
      // Specializzazione dell'operativo: un grado gratuito per livello da operativo nelle abilità associate (senza superare il massimo)
      const gratis = (spec?.abil.includes(nome) ? livOp : 0) + (gratisCaccia[nome] || 0);
      const gr = Math.min(Math.max(liv, n(s.gradi)), n(s.gradi) + gratis);
      const classe = !!s.classe || diClasse.has(nome);
      // Penalità: la peggiore tra quella dell'armatura e quella del carico (−5 alle prove basate su FOR e DES), non si sommano
      const pen = Math.max(CON_PENALITA.has(nome) ? penalita : 0, carico && (car === 'FOR' || car === 'DES') ? 5 : 0);
      // Gradi spesi che non servono: i gradi gratuiti arrivano già al massimo (livello del personaggio)
      const sprecati = gratis ? Math.max(0, Math.min(n(s.gradi), n(s.gradi) + gratis - liv)) : 0;
      abil[nome] = { tot: gr + (m[car] || 0) + (classe && gr > 0 ? 3 : 0) + n(s.varie) - pen + cumula(per('abilita', 'abil:' + nome)), classe, gratis: Math.max(0, gr - n(s.gradi)), gratisMax: gratis, sprecati };
    }
    const umano = razza && /^umano$/i.test(d.razza.nome) ? liv : 0; // tratto Esperto: +1 grado per livello
    const gradiDisp = d.classi.reduce((a, cl) => a + Math.max(1, n(D.classi[nomeClasse(cl.nome)]?.gradi) + m.INT) * n(cl.livello), 0) + umano + n(d.gradiExtra);
    // Attacchi: arma specializzata dal 3° livello (+livello ai danni, +½ livello con le armi piccole)
    const colpire = cumula(per('colpire'));
    const danniB = cumula(per('danni'));
    const armi = d.armi.map((a) => {
      const mischia = a.tipo === 'mischia';
      const colpo = bab + (mischia ? m.FOR : m.DES) + n(a.bonus) + colpire;
      const spec = a.specializzata !== false && liv >= 3 ? (a.categoria === 'piccola' ? Math.floor(liv / 2) : a.categoria === 'granata' ? 0 : liv) : 0;
      const bonusDanni = (mischia ? m.FOR : 0) + spec + n(a.bonusDanni) + danniB;
      return { id: a.id, colpo, danni: `${a.danni || '1d4'}${bonusDanni ? (bonusDanni > 0 ? '+' : '') + bonusDanni : ''}`, spec };
    });
    // Incantesimi al giorno (solo tabelle delle classi incantatrici): base dalla tabella + bonus della caratteristica
    const incantesimi = d.classi.filter((cl) => CLASSI_INC[nomeClasse(cl.nome)]).map((cl) => {
      const k = nomeClasse(cl.nome);
      const r = rigaClasse(cl, n(cl.livello)) || [];
      const mc = m[CLASSI_INC[k]];
      const giorno = [1, 2, 3, 4, 5, 6].map((L) => {
        const b = r[4 + L];
        if (b === undefined || b === '-' || b === '') return '';
        return n(b) + (mc >= L ? 1 + Math.floor((mc - L) / 4) : 0);
      });
      return { classe: k, giorno, cd: (L) => 10 + L + mc };
    });
    return { base, punteggio, m, liv, livOp, livMs, livSo, temaPiu1, caccia, cacciaPerc, incanalare, chiave, bab, pfMax, psMax, prMax, pfAtt, psAtt, cae, cac, desMax, penalita, ts, iniz, abil, gradiSpesi, gradiDisp, armi, incantesimi, arm,
      volume, leggeri: vol.leggeri, carico, limiteVolume: forza / 2, forza,
      bonusAttivi: d.bonus.filter((b) => b.attivo).map((b) => b.nome), cumuli: { voci: eff } };
  }
  function mappa(c) {
    const o = { liv: String(c.liv), bab: segno(c.bab), cae: String(c.cae), cac: String(c.cac), iniz: segno(c.iniz), pfmax: String(c.pfMax), psmax: String(c.psMax), prmax: String(c.prMax),
      gradi: `${c.gradiSpesi} / ${c.gradiDisp}`, penalita: c.penalita ? `penalità armatura −${c.penalita}` : '', desmax: c.desMax !== null ? `DES max ${segno(c.desMax)}` : '' };
    for (const s of CARS) { o['mod:' + s] = segno(c.m[s]); o['eff:' + s] = c.punteggio[s] !== c.base[s] ? `→ ${c.punteggio[s]}` : ''; }
    for (const k of ['tempra', 'riflessi', 'volonta']) { o['ts:' + k] = segno(c.ts[k].tot); o['tsb:' + k] = segno(c.ts[k].base); }
    for (const [k, v] of Object.entries(c.abil)) o['abil:' + k] = segno(v.tot);
    for (const a of c.armi) { o[`arma:${a.id}:colpo`] = segno(a.colpo); o[`arma:${a.id}:danni`] = a.danni; }
    return o;
  }
  function aggiorna(p) {
    const v = mappa(calcola(p));
    document.querySelectorAll('[data-sfcalc]').forEach((el) => { if (el.dataset.sfcalc in v) el.textContent = v[el.dataset.sfcalc]; });
  }

  // ---- Percorsi dei campi (es. "armi#id|nome") ----
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
    if (el.classList?.contains('sf-sez')) { if (el.open) chiuse.delete(el.dataset.sez); else chiuse.add(el.dataset.sez); }
    // L'elenco dei talenti si costruisce quando lo si apre
    if (el.dataset?.sfTalenti !== undefined) {
      filtriTalenti.aperto = el.open;
      const box = el.querySelector('#sf-elenco-talenti');
      if (el.open && box && !box.innerHTML.trim()) box.innerHTML = listaTalentiHtml(ctx.personaggio(box.dataset.pg));
    }
  }, true);
  let salita = null; // pannello "Sali di livello" aperto: { pgId, classe, car: [] }

  function vistaScheda(p) {
    const d = dati(p);
    const c = calcola(p);
    const v = mappa(c);
    const id = p.id;
    const k = (chiave) => `<span data-sfcalc="${esc(chiave)}">${esc(v[chiave] ?? '')}</span>`;
    const campo = (perc, val, extra = '') => `<input data-sf="${esc(perc)}" data-id="${id}" value="${esc(val ?? '')}" ${extra}>`;
    const num = (perc, val, extra = '') => campo(perc, val, `type="number" data-tipo="numero" ${extra}`);
    const chk = (perc, val, extra = '') => `<input type="checkbox" data-sf="${esc(perc)}" data-id="${id}" ${val ? 'checked' : ''} ${extra}>`;
    const sel = (perc, lista, val, extra = '') => `<select data-sf="${esc(perc)}" data-id="${id}" ${extra}>${opz(lista, val)}</select>`;
    const togli = (lista, elem) => `<button class="btn-x" data-azione="sf-rimuovi" data-id="${id}" data-lista="${esc(lista)}" data-elem="${esc(elem)}" title="Rimuovi">×</button>`;
    const aggiungi = (lista, testo) => `<button class="btn-piccolo" data-azione="sf-aggiungi" data-id="${id}" data-lista="${lista}">+ ${testo}</button>`;
    const dado = (tiro, titolo) => `<button class="btn-dado" data-azione="sf-tira" data-id="${id}" data-tiro="${esc(tiro)}" title="Tira: ${esc(titolo)}">🎲</button>`;
    const sezione = (chiave, titolo, corpo, extra = '') => `<details class="pannello pf-sez sf-sez" data-sez="${chiave}" ${chiuse.has(chiave) ? '' : 'open'}><summary><h3>${titolo}</h3>${extra}</summary>${corpo}</details>`;
    const razza = razzaDi(d);
    const tema = temaDi(d);
    const wiki = (pagina, testo = '📖 wiki') => (pagina ? `<a class="btn-piccolo" href="${esc(WIKI + pagina.replace(/ /g, '_'))}" target="_blank" rel="noopener" title="Apri la pagina sul wiki Absalom Outsider">${testo}</a>` : '');

    // Razza e tema
    const corpoRazza = `<div class="pf-riga">
        <label>Razza ${sel('razza|nome', [['', '— scegli —'], ...Object.keys(D.razze).sort((a, b) => a.localeCompare(b, 'it')).map((x) => [x, x])], d.razza.nome, 'data-ridisegna-sf')}</label>
        ${razza?.scelta ? `<label>+${razza.scelta} a ${sel('razza|scelta', [['', '— scegli —'], ...CARS.map((s) => [s, NOMI_CAR[s]])], d.razza.scelta, 'data-ridisegna-sf')}</label>` : ''}
        ${razza ? wiki(razza.pagina) : ''}
        <label>Tema ${sel('tema|nome', [['', '— nessuno —'], ...Object.keys(D.temi).sort((a, b) => a.localeCompare(b, 'it')).map((x) => [x, x])], d.tema.nome, 'data-ridisegna-sf')}</label>
        ${tema && sceltaCarTema(d)?.length > 1 ? `<label>+1 a ${sel('tema|car', [['', '— scegli —'], ...sceltaCarTema(d).map((s) => [s, NOMI_CAR[s]])], carTemaDi(d), 'data-ridisegna-sf')}</label>` : ''}
        ${tema ? wiki(d.tema.nome) : ''}
      </div>
      ${razza ? `<div class="fede-righe">
        <div><span class="muto">Caratteristiche</span> ${esc(Object.entries(razza.car).map(([s, x]) => `${NOMI_CAR[s]} ${segno(x)}`).join(', ') || (razza.scelta ? `+${razza.scelta} a scelta` : '—'))} · <span class="muto">PF razziali</span> <b>${razza.pf}</b> · <span class="muto">Taglia</span> ${esc(razza.taglia)}</div>
        ${razza.bonus.length ? `<div><span class="muto">Bonus sempre attivi</span> ${esc(razza.bonus.map(([b, x, t]) => `${b.replace(/^abil:/, '')} +${x} (${t})`).join(' · '))}</div>` : ''}
        <div><span class="muto">Tratti</span> ${esc(razza.tratti.join(', '))}</div></div>` : ''}
      ${tema ? `<div class="fede-righe"><div><span class="muto">Tema</span> +1 ${esc(NOMI_CAR[carTemaDi(d)] || (d.tema.nome === 'Burocrate' ? "alla caratteristica dell'abilità scelta" : 'da scegliere'))}${rigaAbilTema(p, d, c)}${d.tema.nome === 'Truffatore' ? ' · +1 a Professione' : ''}</div>
        <div><span class="muto">Capacità</span> ${tema.capacita.map(([nome, L]) => `<span class="${L > c.liv ? 'muto' : ''}">${esc(nome)} (${L}°)</span>`).join(', ')}</div></div>` : ''}
      <label class="pf-chk pf-mini">${chk('razza|inclusi', d.razza.inclusi, 'data-ridisegna-sf')} I punteggi inseriti comprendono già i modificatori di razza e tema</label>`;

    // Classi
    const classi = d.classi.map((cl) => `<div class="pf-riga">
        ${sel(`classi#${cl.id}|nome`, [['', '— classe —'], ...Object.keys(D.classi).map((x) => [x, x])], nomeClasse(cl.nome) || cl.nome, 'data-ridisegna-sf')}
        ${window.MODALITA_GIOCATORE && !window.gdr ? `<span class="pf-liv-fisso" title="Nella scheda del giocatore i livelli si prendono uno alla volta con «⬆ Sali di livello»">Livello <b>${Number(cl.livello) || 1}</b></span>`
          : `<label>Livello ${num(`classi#${cl.id}|livello`, cl.livello, 'min="1" max="20" data-ridisegna-sf')}</label>`}
        ${D.classi[nomeClasse(cl.nome)] ? `<span class="muto">PS ${D.classi[nomeClasse(cl.nome)].ps} + COS · PF ${D.classi[nomeClasse(cl.nome)].pf} · gradi ${D.classi[nomeClasse(cl.nome)].gradi} + INT</span>${wiki(nomeClasse(cl.nome))}` : ''}
        ${togli('classi', cl.id)}</div>`).join('');
    const chiavi = [...new Set(d.classi.flatMap((cl) => CHIAVE[nomeClasse(cl.nome)] || []))];
    const corpoClassi = `${classi || '<p class="muto">Nessuna classe.</p>'}
      <div class="pf-piede">${window.MODALITA_GIOCATORE && !window.gdr && d.classi.length ? '<span class="muto">Le altre classi si aggiungono con «⬆ Sali di livello».</span>' : aggiungi('classi', 'Classe')}
        <label title="Caratteristica chiave: determina i Punti Risolutezza (e le CD di molte capacità)">Caratteristica chiave ${sel('chiave', [['', `automatica (${NOMI_CAR[chiaveDi(d)]})`], ...(chiavi.length ? chiavi : CARS).map((s) => [s, NOMI_CAR[s]])], d.chiave, 'data-ridisegna-sf')}</label>
        <span class="muto">Livello <b>${k('liv')}</b> · BAB <b>${k('bab')}</b></span>
        ${GIOCATORE && mancaPerSalire(p, d, c).length ? '<button class="primario" disabled title="Completa prima il livello attuale">⬆ Sali di livello</button>' : `<button class="primario" data-azione="sf-livello-apri" data-id="${id}">⬆ Sali di livello</button>`}</div>
      ${GIOCATORE && salita?.pgId !== id ? boxDaCompletare(mancaPerSalire(p, d, c), d.classi.length ? c.liv : 0) : ''}`;

    // Caratteristiche (i punteggi base restano nei dati generici del personaggio, con data-bind)
    const car = CARS.map((s) => `<div class="car">
        <div class="car-sigla">${s}</div>
        <div class="car-valori"><input type="number" value="${esc(p.caratteristiche?.[s] ?? 10)}" data-bind="personaggio" data-id="${id}" data-sez="caratteristiche" data-chiave="${s}" data-tipo="numero" aria-label="${NOMI_CAR[s]}">
          <span class="car-eff">${k('eff:' + s)}</span></div><div class="car-mod">${k('mod:' + s)}</div><div class="car-nome">${NOMI_CAR[s]}</div>${dado('car:' + s, NOMI_CAR[s])}</div>`).join('');

    // Salute e risolutezza
    const corpoSalute = `<div class="pf-griglia">
      <div class="pf-box"><div class="pf-etich">Punti Stamina</div><div class="pf-pf">${num('ps|attuali', d.ps.attuali, `class="pf-grande" placeholder="${c.psMax}"`)} <span class="muto">/</span> <b class="pf-max">${k('psmax')}</b></div>
        <div class="muto pf-mini">(PS di classe + COS) × livello</div></div>
      <div class="pf-box"><div class="pf-etich">Punti Ferita</div><div class="pf-pf">${num('pf|attuali', d.pf.attuali, `class="pf-grande" placeholder="${c.pfMax}"`)} <span class="muto">/</span> <b class="pf-max">${k('pfmax')}</b></div>
        <div class="pf-mini"><label>Temporanei ${num('pf|temp', d.pf.temp)}</label></div><div class="muto pf-mini">PF razziali + PF di classe × livello</div></div>
      <div class="pf-box"><div class="pf-etich">Punti Risolutezza</div><div class="pf-pf"><b class="pf-grande">${Math.max(0, c.prMax - n(d.pr.usati))}</b> <span class="muto">/</span> <b class="pf-max">${k('prmax')}</b></div>
        <div class="pf-mini"><button class="btn-piccolo" data-azione="sf-pr" data-id="${id}" data-d="1">− usa 1</button><button class="btn-piccolo" data-azione="sf-pr" data-id="${id}" data-d="-1">+ recupera</button></div>
        <div class="muto pf-mini">½ livello (min 1) + mod. ${NOMI_CAR[c.chiave]}</div></div>
      <div class="pf-box"><div class="pf-etich">Danni e cure</div>
        <div class="pf-mini"><input type="number" min="0" class="sf-quanti mini" placeholder="0"><button class="btn-piccolo" data-azione="sf-danno" data-id="${id}" data-segno="-1">Danno</button><button class="btn-piccolo" data-azione="sf-danno" data-id="${id}" data-segno="1">Cura PF</button><button class="btn-piccolo" data-azione="sf-danno" data-id="${id}" data-segno="2" title="Recupera Punti Stamina">Recupera PS</button></div>
        <div class="muto pf-mini">Il danno toglie prima i PS, poi i PF.</div>
        <button class="btn-piccolo" data-azione="sf-riposo" data-id="${id}" title="10 minuti di riposo spendendo 1 PR: Stamina al massimo">☕ Riposo breve (1 PR)</button>
        <button class="btn-piccolo" data-azione="sf-riposo-lungo" data-id="${id}" title="8 ore: PR, PS e PF (livello) recuperati">🌙 Riposo (8 ore)</button></div>
    </div>`;

    // Difese
    const corpoDifese = `<div class="pf-griglia">
      <div class="pf-box"><div class="pf-etich">CA Energia (CAE)</div><div class="pf-valore">${k('cae')}</div><div class="pf-mini"><label>Varie ${num('ca|cae', d.ca.cae)}</label></div></div>
      <div class="pf-box"><div class="pf-etich">CA Cinetica (CAC)</div><div class="pf-valore">${k('cac')}</div><div class="pf-mini"><label>Varie ${num('ca|cac', d.ca.cac)}</label></div><div class="muto pf-mini">Manovre: CAC + 8 = <b>${c.cac + 8}</b></div></div>
      <div class="pf-box"><div class="pf-etich">Iniziativa ${dado('iniz', 'Iniziativa')}</div><div class="pf-valore">${k('iniz')}</div><div class="pf-mini"><label>Varie ${num('iniz|varie', d.iniz.varie)}</label></div><div class="muto pf-mini">${k('desmax')} ${k('penalita')}</div></div>
      <div class="pf-box"><div class="pf-etich">Tiri salvezza</div>${[['tempra', 'Tempra', 'COS'], ['riflessi', 'Riflessi', 'DES'], ['volonta', 'Volontà', 'SAG']].map(([kk, nome, cs]) => `<div class="pf-ts">
        <span class="pf-ts-nome">${nome}</span><b class="pf-tot">${k('ts:' + kk)}</b><span class="muto">base ${k('tsb:' + kk)} + ${cs}</span><label>varie ${num(`ts|${kk}|varie`, d.ts[kk]?.varie)}</label>${dado('ts:' + kk, nome)}</div>`).join('')}</div>
    </div>`;

    // Attacchi
    const CATEGORIE = [['mischia base', 'Mischia base'], ['mischia avanzata', 'Mischia avanzata'], ['piccola', 'Arma piccola'], ['lunga', 'Arma lunga'], ['pesante', 'Arma pesante'], ['precisione', 'Arma di precisione'], ['granata', 'Granata'], ['speciale', 'Speciale']];
    const armi = d.armi.map((a) => {
      const ca = c.armi.find((x) => x.id === a.id);
      return `<div class="pf-arma"><div class="pf-riga">
        <input class="pf-largo" data-sf="armi#${a.id}|nome" data-id="${id}" value="${esc(a.nome)}" placeholder="Arma">
        ${sel(`armi#${a.id}|categoria`, CATEGORIE, a.categoria, 'data-ridisegna-sf')}
        ${sel(`armi#${a.id}|tipo`, [['distanza', 'a distanza (DES)'], ['mischia', 'in mischia (FOR)']], a.tipo, 'data-ridisegna-sf')}
        <label>Danni ${campo(`armi#${a.id}|danni`, a.danni, 'class="pf-corto" placeholder="1d6 F"')}</label>
        <label>Critico ${campo(`armi#${a.id}|critico`, a.critico, 'class="pf-corto" placeholder="es. Brucia 1d6"')}</label>
        <label>Bonus colpire ${num(`armi#${a.id}|bonus`, a.bonus, 'class="pf-corto"')}</label><label>Bonus danni ${num(`armi#${a.id}|bonusDanni`, a.bonusDanni, 'class="pf-corto"')}</label>
        <label class="pf-chk" title="Arma specializzata dal 3° livello: +livello ai danni (+½ livello con le armi piccole)">${chk(`armi#${a.id}|specializzata`, a.specializzata !== false, 'data-ridisegna-sf')} Specializzata${ca?.spec ? ` (+${ca.spec})` : ''}</label>
        <label title="Volume: un numero, L (leggero) o vuoto se trascurabile">Volume ${campo(`armi#${a.id}|volume`, a.volume, 'class="pf-corto" placeholder="L" data-ridisegna-sf')}</label>
        ${togli('armi', a.id)}</div>
        <div class="pf-arma-tiri"><span>Colpire <b>${k(`arma:${a.id}:colpo`)}</b> ${dado('colpo:' + a.id, 'attacco')}</span><span>Danni <b>${k(`arma:${a.id}:danni`)}</b> ${dado('danni:' + a.id, 'danni')}</span>
          <label>Munizioni ${num(`armi#${a.id}|munizioni`, a.munizioni, 'class="pf-corto"')}</label></div></div>`;
    }).join('');
    const gruppiArmi = new Map();
    for (const a of C.armi) { const g = `${a[12] || 'Altro'} · ${a[1] || '—'}`; if (!gruppiArmi.has(g)) gruppiArmi.set(g, []); gruppiArmi.get(g).push(a); }
    const sceltaArmi = C.armi.length ? `<span class="pf-dal-wiki">dal wiki: <select id="sf-scelta-arma-${id}"><option value="">— scegli —</option>${[...gruppiArmi].map(([g, l]) => `<optgroup label="${esc(g)}">${l.map((a) => `<option value="${esc(a[0])}">${esc(a[0])} (liv. ${esc(a[2])})</option>`).join('')}</optgroup>`).join('')}</select>
      <button class="btn-piccolo" data-azione="sf-arma-wiki" data-id="${id}">Aggiungi</button></span>` : '';
    const corpoAttacchi = `${armi || '<p class="muto">Nessuna arma.</p>'}<div class="pf-piede">${aggiungi('armi', 'Arma')}${sceltaArmi}<span class="muto">Mischia: BAB + FOR (e FOR ai danni); distanza: BAB + DES. Dal 3° livello si aggiunge la specializzazione ai danni.</span></div>`;

    // Abilità
    const righeAbil = D.abilita.map(([nome, car, senza]) => {
      const s = d.abil[nome] || {};
      const a = c.abil[nome];
      return `<div class="pf-abil${a.classe ? ' di-classe' : ''}">
        <label class="pf-chk" title="Abilità di classe (spunta per quelle extra)">${chk(`abil|${nome}|classe`, s.classe || a.classe, a.classe && !s.classe ? 'disabled' : 'data-ridisegna-sf')}</label>
        <span class="pf-abil-nome">${esc(nome)} <small class="muto">${car}${senza ? '' : ' · solo addestrata'}${CON_PENALITA.has(nome) ? ' · pen.' : ''}</small></span>
        <label title="Gradi${a.gratisMax ? ` (più ${a.gratis} gratuiti)` : ''}">${num(`abil|${nome}|gradi`, s.gradi, `min="0" max="${c.liv}" class="pf-corto"${a.gratisMax ? ' data-ridisegna-sf' : ''}`)}</label>
        <label title="Varie">${num(`abil|${nome}|varie`, s.varie, 'class="pf-corto"')}</label>
        <b class="pf-tot">${k('abil:' + nome)}</b>${dado('abil:' + nome, nome)}
        ${a.gratisMax ? `<small class="${a.sprecati ? 'oltre' : 'muto'} sf-abil-gratis">${a.sprecati ? `⚠ ${a.sprecati} ${a.sprecati === 1 ? 'grado sprecato' : 'gradi sprecati'}: i gradi gratuiti (${Math.min(a.gratisMax, c.liv)}) la portano già al massimo di ${c.liv}; spostali su un'altra abilità` : `+${a.gratis} gradi gratuiti`}</small>` : ''}</div>`;
    }).join('');
    const corpoAbil = `<div class="pf-griglia-abil">${righeAbil}</div><div class="pf-piede"><label>Gradi extra ${num('gradiExtra', d.gradiExtra)}</label></div>`;

    // Talenti e capacità (con i privilegi di classe dalle tabelle)
    const privilegi = d.classi.map((cl) => {
      const kk = nomeClasse(cl.nome);
      const righe = D.classi[kk]?.righe.slice(0, n(cl.livello)) || [];
      const tutti = [...new Set(righe.flatMap((r) => String(r[4]).split(/,\s*/)).filter((x) => x && x !== '-' && x !== '—'))];
      return tutti.length ? `<div class="priv-classe"><span class="muto">${esc(kk)}:</span> ${tutti.map(esc).join(', ')}</div>` : '';
    }).join('');
    const capacita = d.capacita.map((x) => `<div class="pf-cap"><div class="pf-riga">
        <input class="pf-largo" data-sf="capacita#${x.id}|nome" data-id="${id}" value="${esc(x.nome)}" placeholder="Talento o capacità">
        ${sel(`capacita#${x.id}|tipo`, ['Talento', 'Capacità di classe', 'Capacità razziale', 'Capacità del tema', 'Altro'].map((t) => [t, t]), x.tipo)}
        ${togli('capacita', x.id)}</div>
        <textarea rows="2" data-sf="capacita#${x.id}|descrizione" data-id="${id}" placeholder="Effetto, usi…">${esc(x.descrizione || '')}</textarea></div>`).join('');
    const nTalenti = Math.floor((c.liv + 1) / 2) + (/^umano$/i.test(d.razza.nome) ? 1 : 0);
    const corpoCap = `${privilegi ? `<h4>Privilegi di classe <small class="muto">dalle tabelle</small></h4>${privilegi}` : ''}
      <h4>Talenti e capacità <small class="muto">talenti dal livello: ${nTalenti}${/^umano$/i.test(d.razza.nome) ? ' (incluso quello bonus umano)' : ''} · presi: ${d.capacita.filter((x) => x.tipo === 'Talento').length}</small></h4>
      ${capacita || '<p class="muto">Nessuno.</p>'}<div class="pf-piede">${aggiungi('capacita', 'Talento o capacità')}</div>
      <details class="pf-alternativi" ${filtriTalenti.aperto ? 'open' : ''} data-sf-talenti><summary>Elenco talenti del wiki <small class="muto">(${TALENTI.length})</small></summary>
        <div class="tal-filtri">
          <label>Cerca <input type="search" data-sf-filtro="testo" value="${esc(filtriTalenti.testo)}" placeholder="nome, originale o prerequisito"></label>
          <label>Tipo <select data-sf-filtro="tipo">${opz([['', 'tutti'], ...[...new Set(TALENTI.map((t) => t.tipo))].map((x) => [x, x])], filtriTalenti.tipo)}</select></label>
          <label>Mostra <select data-sf-filtro="stato">${opz([['', 'tutti'], ['acquisibili', 'acquisibili'], ['ok', 'prerequisiti soddisfatti'], ['no', 'non acquisibili']], filtriTalenti.stato)}</select></label>
        </div>
        <p class="muto pf-aiuto"><span class="pre-ok">verde</span> soddisfatto · <span class="pre-no">rosso</span> manca · <span class="pre-forse">giallo</span> da verificare. Un talento con un prerequisito mancante non si può prendere.</p>
        <div id="sf-elenco-talenti" data-pg="${id}">${filtriTalenti.aperto ? listaTalentiHtml(p) : ''}</div>
      </details>`;

    // Incantesimi: slot al giorno con gli usi, incantesimi conosciuti, elenco del wiki per livello
    const corpoInc = c.incantesimi.map((inc) => {
      const usi = d.usiInc[inc.classe] || {};
      const slot = inc.giorno.map((x, i) => (x === '' ? '' : `<span class="chip">${i + 1}°: <b>${Math.max(0, x - n(usi[i + 1]))}</b>/${x} · CD ${inc.cd(i + 1)}
        <button class="btn-mini" data-azione="sf-slot" data-id="${id}" data-classe="${esc(inc.classe)}" data-livello="${i + 1}" data-d="-1" title="Recupera uno slot">+</button></span>`)).join(' ');
      const maxL = Math.max(0, ...inc.giorno.map((x, i) => (x === '' ? 0 : i + 1)));
      const noti = d.incantesimi.filter((x) => x.classe === inc.classe).sort((a, b) => a.livello - b.livello || a.nome.localeCompare(b.nome, 'it'));
      const perLiv = [...new Set(noti.map((x) => x.livello))].map((L) => `<div class="pf-riga"><b>${L}°</b> ${noti.filter((x) => x.livello === L).map((x) => {
        const v = INCANTESIMI.find((y) => y.nome === x.nome);
        return `<span class="chip" title="${esc(v ? [v.scuola, v.tempo, v.gittata, v.durata, v.ts && `TS ${v.ts}`].filter(Boolean).join(' · ') : '')}">${esc(x.nome)}
          ${v ? `<a class="btn-mini" href="${esc(linkWiki(v.pagina))}" target="_blank" rel="noopener" title="Descrizione sul wiki">i</a>` : ''}
          <button class="btn-mini" data-azione="sf-lancia" data-id="${id}" data-classe="${esc(inc.classe)}" data-livello="${L}" data-nome="${esc(x.nome)}" title="Lancia (usa uno slot)">✨</button>
          ${x.connessione ? '<small class="muto" title="Incantesimo della connessione: lo dà la connessione">◆ connessione</small>' : `<button class="chip-x" data-azione="sf-rimuovi" data-id="${id}" data-lista="incantesimi" data-elem="${x.id}" title="Togli">×</button>`}</span>`;
      }).join(' ')}</div>`).join('');
      const L = sfogliaInc[inc.classe] ?? '';
      const lista = L === '' ? [] : INCANTESIMI.filter((v) => livelloInc(v, inc.classe) === Number(L)).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
      return `<h4>${esc(inc.classe)} <small class="muto">caratteristica ${NOMI_CAR[CLASSI_INC[inc.classe]]} · incantesimi di livello 0 a volontà</small>
          <button class="btn-piccolo olo-apri" data-azione="sf-olo-apri" data-id="${id}" data-classe="${esc(inc.classe)}" title="Gli incantesimi su uno schermo olografico, da tenere aperto durante il gioco">◈ Archivio olografico</button></h4>
        <div class="pf-riga">${slot || '<span class="muto">nessuno slot a questo livello</span>'}</div>
        ${perLiv || '<p class="muto">Nessun incantesimo conosciuto: aggiungili dall\'elenco.</p>'}
        <div class="pf-elenco-inc"><div class="pf-riga"><b>Elenco del wiki</b>
          <label>Livello <select data-sf-inc="${esc(inc.classe)}">${opz([['', '— chiuso —'], ...Array.from({ length: maxL + 1 }, (_, i) => [String(i), `${i}°`])], L)}</select></label>
          ${L !== '' ? `<span class="muto">${lista.length} incantesimi</span>` : `<span class="muto">${INCANTESIMI.filter((v) => livelloInc(v, inc.classe) !== null).length} incantesimi per ${esc(inc.classe)} sul wiki</span>`}</div>
          ${lista.length ? `<div class="pf-voci-inc">${lista.map((v) => {
            const preso = noti.some((x) => x.nome === v.nome);
            return `<div class="pf-voce-inc${preso ? ' presa' : ''}"><button class="btn-mini" data-azione="sf-inc-aggiungi" data-id="${id}" data-classe="${esc(inc.classe)}" data-livello="${L}" data-nome="${esc(v.nome)}" ${preso ? 'disabled' : ''}>+</button>
              <span>${esc(v.nome)}</span><small class="muto">${esc(v.scuola.split(' ')[0])}</small>
              <a class="btn-mini" href="${esc(linkWiki(v.pagina))}" target="_blank" rel="noopener">i</a></div>`;
          }).join('')}</div>` : ''}</div>`;
    }).join('');

    // Bonus attivabili
    const bonus = d.bonus.map((b) => `<div class="pf-bonus${b.attivo ? ' attivo' : ''}"><div class="pf-riga">
        <label class="pf-chk">${chk(`bonus#${b.id}|attivo`, b.attivo, 'data-ridisegna-sf')}</label>
        <input class="pf-largo" data-sf="bonus#${b.id}|nome" data-id="${id}" value="${esc(b.nome)}">
        ${togli('bonus', b.id)}</div>
        <div class="pf-effetti">${(b.effetti || []).map((e) => `<div class="pf-riga">
          ${sel(`bonus#${b.id}|effetti#${e.id}|bersaglio`, [...BERSAGLI, ...D.abilita.map(([a]) => ['abil:' + a, a])], e.bersaglio, 'data-ridisegna-sf')}
          ${sel(`bonus#${b.id}|effetti#${e.id}|tipo`, TIPI_BONUS.map((x) => [x, x]), e.tipo, 'data-ridisegna-sf')}
          ${num(`bonus#${b.id}|effetti#${e.id}|valore`, e.valore, 'class="pf-corto" data-ridisegna-sf')}
          ${togli(`bonus#${b.id}|effetti`, e.id)}</div>`).join('')}
          <button class="btn-piccolo" data-azione="sf-effetto" data-id="${id}" data-bonus="${b.id}">+ Effetto</button></div></div>`).join('');
    const corpoBonus = `<p class="muto pf-aiuto">Bonus dello stesso tipo non si sommano (vale il più alto), tranne circostanza e senza tipo; le penalità si sommano sempre.</p>
      ${bonus || '<p class="muto">Nessun bonus.</p>'}
      <div class="pf-piede"><select id="sf-preset-${id}">${opz(Object.keys(PRESET).map((x) => [x, x]))}</select>
        <button class="btn-piccolo" data-azione="sf-preset" data-id="${id}">+ Aggiungi dall'elenco</button>
        <button class="btn-piccolo" data-azione="sf-preset" data-id="${id}" data-vuoto="1">+ Bonus personalizzato</button></div>`;

    // Equipaggiamento
    const armature = d.armature.map((a) => `<div class="pf-riga">
        <label class="pf-chk" title="Indossata">${chk(`armature#${a.id}|indossata`, a.indossata, 'data-ridisegna-sf')}</label>
        <input class="pf-largo" data-sf="armature#${a.id}|nome" data-id="${id}" value="${esc(a.nome)}" placeholder="Armatura">
        ${sel(`armature#${a.id}|tipo`, [['leggera', 'leggera'], ['pesante', 'pesante'], ['potenziata', 'potenziata'], ['scudo', 'scudo']], a.tipo)}
        <label>CAE ${num(`armature#${a.id}|cae`, a.cae, 'class="pf-corto" data-ridisegna-sf')}</label><label>CAC ${num(`armature#${a.id}|cac`, a.cac, 'class="pf-corto" data-ridisegna-sf')}</label>
        <label>DES max ${num(`armature#${a.id}|desMax`, a.desMax, 'class="pf-corto" data-ridisegna-sf')}</label><label>Penalità ${num(`armature#${a.id}|penalita`, a.penalita, 'class="pf-corto" data-ridisegna-sf')}</label>
        <label>Velocità ${campo(`armature#${a.id}|velocita`, a.velocita, 'class="pf-corto"')}</label>
        <label>Upgrade ${campo(`armature#${a.id}|upgrade`, a.upgrade, 'class="pf-largo" placeholder="upgrade installati"')}</label>
        <label title="Volume: un numero, L (leggero) o vuoto se trascurabile">Volume ${campo(`armature#${a.id}|volume`, a.volume, 'class="pf-corto" placeholder="1" data-ridisegna-sf')}</label>
        ${togli('armature', a.id)}</div>`).join('');
    const L = window.Luoghi;
    const rigaOggetto = (o) => `<div class="pf-riga luogo-riga">
        <input class="pf-largo" data-sf="oggetti#${o.id}|nome" data-id="${id}" value="${esc(o.nome)}" placeholder="Oggetto">
        <label>Qtà ${num(`oggetti#${o.id}|qta`, o.qta, 'class="pf-corto" data-ridisegna-sf')}</label><label title="Volume: un numero, L (leggero, 10 = 1 volume) o vuoto se trascurabile">Volume ${campo(`oggetti#${o.id}|ingombro`, o.ingombro, 'class="pf-corto" placeholder="L" data-ridisegna-sf')}</label>
        <label title="Valore di un pezzo in crediti (per la vendita)">Valore ${num(`oggetti#${o.id}|valore`, o.valore, `class="pf-corto" min="0" placeholder="${L?.valoreDi(o) || 'cr'}" data-ridisegna-sf`)}</label>
        ${campo(`oggetti#${o.id}|note`, o.note, 'class="pf-largo" placeholder="note"')}
        ${L ? L.vendita(o, id, 'sf') : ''}
        ${L ? `<label class="luogo-dove" title="Dove si trova"><select data-sf="oggetti#${o.id}|dove" data-id="${id}" data-ridisegna-sf>${L.opzioni(L.luogo(o, d, 'sf'), d, 'sf')}</select></label>` : ''}${togli('oggetti', o.id)}</div>`;
    // Volume di una riga (per il totale del luogo): "L" = un decimo, altrimenti il numero scritto
    const ingombroDi = (o) => { const v = volumeDi(o.ingombro, o.qta === '' || o.qta == null ? 1 : o.qta); return v.interi + v.leggeri / 10; };
    const oggetti = L ? L.sezione({
      oggetti: d.oggetti, riga: rigaOggetto, peso: ingombroDi, unita: 'volume', dati: d, pg: id, sistema: 'sf',
      aggiungi: (k) => `<button class="btn-mini" data-azione="sf-aggiungi" data-id="${id}" data-lista="oggetti" data-dove="${k}" title="Aggiungi un oggetto qui">+</button>`,
      extra: (k) => {
        // Nello zaino (ciò che il personaggio porta) compaiono anche armi e armature, che contano nel volume
        if (k !== 'zaino') return '';
        const fissi = [...d.armature.filter((a) => a.indossata !== false && a.nome).map((a) => `🛡 ${esc(a.nome)}`), ...(d.armi || []).filter((a) => a.nome).map((a) => `⚔ ${esc(a.nome)}`)];
        return fissi.length ? `<div class="luogo-fissi" title="Armi e armature (si modificano nelle loro sezioni)">${fissi.map((x) => `<span class="luogo-fisso">${x}</span>`).join('')}</div>` : '';
      },
    }) : d.oggetti.map(rigaOggetto).join('');
    const sceltaArm = `<span class="pf-dal-wiki">dal wiki: <select id="sf-scelta-armatura-${id}"><option value="">— scegli —</option>
      ${['Leggera', 'Pesante', 'Potenziata'].map((cat) => `<optgroup label="Armature ${cat.toLowerCase()}">${C.armature.filter((a) => a[1] === cat).map((a) => `<option value="A:${esc(a[0])}">${esc(a[0])} (liv. ${esc(a[2])})</option>`).join('')}</optgroup>`).join('')}
      <optgroup label="Scudi">${C.scudi.map((s) => `<option value="S:${esc(s[0])}">${esc(s[0])} (liv. ${esc(s[1])})</option>`).join('')}</optgroup></select>
      <button class="btn-piccolo" data-azione="sf-armatura-wiki" data-id="${id}">Aggiungi</button></span>`;
    // Capacità di trasporto: volume portato rispetto a metà Forza (ingombrato) e Forza (sovraccarico)
    const statoCarico = `<div class="sf-carico ${c.carico || 'libero'}">
        <b>🎒 Volume portato ${c.volume}</b>${c.leggeri ? ` <small class="muto">(${c.leggeri} oggett${c.leggeri === 1 ? 'o leggero' : 'i leggeri'} = ${Math.floor(c.leggeri / 10)})</small>` : ''}
        <span>senza difficoltà fino a ${String(c.limiteVolume).replace('.', ',')} · massimo ${c.forza} (Forza ${c.forza})</span>
        ${c.carico === 'ingombrato' ? '<span class="sf-cond">⚠ Ingombrato: velocità −3 m, DES max alla CA +2, −5 alle prove basate su FOR e DES (già applicati a CA e abilità)</span>'
    : c.carico === 'sovraccarico' ? '<span class="sf-cond">⛔ Sovraccarico: velocità 1,5 m, DES max alla CA +0, −5 alle prove basate su FOR e DES (già applicati a CA e abilità)</span>' : '<span class="muto">nessuna penalità</span>'}
        <small class="muto">Contano armi, armature e ciò che è nello zaino; casa e astronave no. Con l'armatura vale la penalità peggiore, non si sommano.</small></div>`;
    const corpoEquip = `${statoCarico}<h4>Armature e scudi</h4>${armature || '<p class="muto">Nessuna.</p>'}<div class="pf-piede">${aggiungi('armature', 'Armatura')}${sceltaArm}</div>
      <h4>Oggetti</h4>${oggetti || '<p class="muto">Nessun oggetto.</p>'}<div class="pf-piede">${aggiungi('oggetti', 'Oggetto')}<label>Crediti ${num('crediti', d.crediti)}</label></div>`;

    // Progressione
    const corpoProg = d.classi.map((cl) => {
      const kk = nomeClasse(cl.nome);
      const dc = D.classi[kk];
      if (!dc) return '';
      const L = n(cl.livello);
      const inc = dc.incantatore;
      return `<h4>${esc(kk)} <small class="muto">livello ${L}</small></h4><div class="prog-scorri"><table class="prog-tabella"><thead><tr><th>Liv</th><th>BAB</th><th>Tem</th><th>Rif</th><th>Vol</th><th>Privilegi di classe</th>${inc ? '<th>Incantesimi al giorno (1°–6°)</th>' : ''}</tr></thead><tbody>
        ${dc.righe.map((r, i) => `<tr class="${i + 1 === L ? 'prog-attuale' : i + 1 > L ? 'prog-futuro' : ''}"><td><b>${i + 1}°</b></td><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td>${inc ? `<td>${esc(r.slice(5).join(' / '))}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
    }).join('') + '<p class="muto pf-aiuto">Tabelle dal wiki Absalom Outsider (starfinder.altervista.org).</p>';

    return `<div class="pf1-scheda" data-sf-scheda="${id}">
      <div class="pf-barra-azioni"><span class="muto">Bonus attivi: <b>${esc(c.bonusAttivi.join(', ') || 'nessuno')}</b></span></div>
      ${salita?.pgId === id ? sezioneSalita(p, d, c) : ''}
      ${sezione('razza', 'Razza e tema', corpoRazza)}
      ${sezione('classi', 'Classi e livelli', corpoClassi)}
      ${sezione('caratteristiche', 'Caratteristiche', `<div class="griglia-car">${car}</div>`)}
      ${sezione('salute', 'Salute e risolutezza', corpoSalute, `<span class="ts-sommario">PS <b>${c.psAtt}/${c.psMax}</b> · PF <b>${c.pfAtt}/${c.pfMax}</b> · PR <b>${Math.max(0, c.prMax - n(d.pr.usati))}/${c.prMax}</b></span>`)}
      ${sezione('difese', 'Difese e tiri salvezza', corpoDifese, `<span class="ts-sommario">CAE <b>${c.cae}</b> · CAC <b>${c.cac}</b></span>`)}
      ${sezione('attacchi', 'Attacchi', corpoAttacchi)}
      ${sezione('abilita', 'Abilità', corpoAbil, `<span class="ts-sommario">Gradi <b>${k('gradi')}</b> · max ${c.liv} per abilità</span>`)}
      ${c.livMs ? sezione('mistico', 'Mistico', sezioneMistico(p, d, c), `<small class="muto">${esc(d.mistico?.connessione || 'connessione da scegliere')}</small>`) : ''}
      ${c.livSo ? sezione('soldato', 'Soldato', sezioneSoldato(p, d, c), `<small class="muto">${esc([d.soldato?.primario, c.livSo >= 9 ? d.soldato?.secondario : ''].filter(Boolean).join(' · ') || 'stile da scegliere')}</small>`) : ''}
      ${c.livOp ? sezione('operativo', 'Operativo', sezioneOperativo(p, d, c), `<small class="muto">${esc(d.operativo?.spec || 'specializzazione da scegliere')}</small>`) : ''}
      ${sezione('capacita', 'Talenti e capacità', corpoCap)}
      ${corpoInc ? sezione('incantesimi', 'Incantesimi', corpoInc) : ''}
      ${sezione('bonus', 'Bonus e condizioni', corpoBonus)}
      ${sezione('progressione', 'Progressione di classe', corpoProg)}
      ${sezione('equip', 'Equipaggiamento', corpoEquip)}
    </div>`;
  }

  // ---- Salita di livello ----
  const LIVELLI_CAR = [5, 10, 15, 20];
  function anteprimaSalita(p, d, c) {
    const esistente = d.classi.find((x) => x.id === salita.classe);
    const k = esistente ? nomeClasse(esistente.nome) : nomeClasse(salita.classe);
    const dc = D.classi[k];
    const prima = esistente ? n(esistente.livello) : 0;
    const dopo = prima + 1;
    const livTot = c.liv + 1;
    const r0 = prima ? dc?.righe[prima - 1] : null;
    const r1 = dc?.righe[dopo - 1];
    const dlt = (i) => (r1 ? n(String(r1[i]).replace('+', '')) - (r0 ? n(String(r0[i]).replace('+', '')) : 0) : 0);
    const privilegi = r1 ? String(r1[4]).split(/,\s*/).filter((x) => x && x !== '-') : [];
    const incantesimi = dc?.incantatore && r1 ? r1.slice(5).map((x, i) => (x !== '-' && (!r0 || r0[5 + i] === '-') ? `nuovo livello di incantesimi: ${i + 1}°` : '')).filter(Boolean) : [];
    return {
      k, dc, esistente, dopo, livTot, bab: dlt(0), ts: [dlt(1), dlt(2), dlt(3)], privilegi, incantesimi,
      pf: n(dc?.pf) + (c.liv === 0 && razzaDi(d) ? n(razzaDi(d).pf) : 0), ps: n(dc?.ps) + c.m.COS,
      gradi: Math.max(1, n(dc?.gradi) + c.m.INT) + (/^umano$/i.test(d.razza.nome) ? 1 : 0),
      talento: livTot % 2 === 1, caratteristiche: LIVELLI_CAR.includes(livTot), pr: livTot % 2 === 0,
    };
  }
  // Scheda del giocatore (kit): si sale di livello solo dopo aver completato quello attuale. Restituisce cosa manca.
  const GIOCATORE = !!window.MODALITA_GIOCATORE && !window.gdr;
  // Sezione «Operativo»: specializzazione e privilegi della classe calcolati dal livello (wiki «Operativo»)
  function sezioneOperativo(p, d, c) {
    const id = p.id;
    const L = c.livOp;
    const sp = specDi(d);
    const dadi = L >= 5 ? `${Math.floor((L - 1) / 2) + 1}d8` : L >= 3 ? '1d8' : '1d4';
    const pesante = (c.arm || []).some((a) => a.tipo && a.tipo !== 'leggera');
    const svelto = L >= 15 ? 9 : L >= 9 ? 6 : L >= 3 ? 3 : 0;
    const trucchi = Math.floor(L / 2);
    const cdTs = 10 + Math.floor(L / 2) + c.m.DES;
    const cdAbil = 10 + Math.floor(L * 1.5) + c.m.DES;
    const tot = (a) => c.abil[a]?.tot ?? 0;
    const prove = ['Furtività', 'Intimidire', 'Raggirare'].map((a) => [a, tot(a), '']);
    if (sp && !prove.some(([a]) => a === sp.attacco[0])) prove.push([sp.attacco[0], tot(sp.attacco[0]) + sp.attacco[1], sp.attacco[2] || '']);
    else if (sp) { const x = prove.find(([a]) => a === sp.attacco[0]); x[1] += sp.attacco[1]; }
    const voce = (ok, nome, testo) => `<li class="${ok ? '' : 'muto'}"><b>${esc(nome)}</b>${testo ? ` — ${testo}` : ''}${ok ? '' : ' <small>(non ancora)</small>'}</li>`;
    return `<div class="pf-riga">
        <label>Specializzazione <select data-sf="operativo|spec" data-id="${id}" data-ridisegna-sf>${opz([['', '— scegli —'], ...Object.keys(SPEC_OPERATIVO).map((x) => [x, x])], d.operativo?.spec || '')}</select></label>
        <a class="btn-piccolo" href="${esc(linkWiki('Operativo/Specializzazioni'))}" target="_blank" rel="noopener">📖 specializzazioni</a>
        <a class="btn-piccolo" href="${esc(linkWiki('Operativo'))}" target="_blank" rel="noopener">📖 operativo</a>
        <span class="muto">livello da operativo <b>${L}</b></span></div>
      ${sp ? `<div class="fede-righe">
        <div><span class="muto">Abilità associate</span> ${sp.abil.map((a) => `<b>${esc(a)}</b> ${segno(tot(a))}${c.abil[a]?.gratis ? ` <small class="muto">(${c.abil[a].gratis} gradi gratuiti)</small>` : ''}`).join(' · ')}
          <small class="muto">— Abilità Focalizzata (+3 cognitivo) e un grado gratuito per livello da operativo${sp.classe ? `; ${esc(sp.classe)} è abilità di classe` : ''}</small></div>
        <div><span class="muto">Trucco della specializzazione</span> ${esc(sp.trucco)} ${L >= 5 ? '' : '<small class="muto">(dal 5° livello)</small>'}
          · <span class="muto">Potere</span> ${esc(sp.potere)} ${L >= 11 ? '' : '<small class="muto">(dall\'11° livello)</small>'}</div></div>` : '<p class="oltre pf-aiuto">Scegli la specializzazione: dà Abilità Focalizzata e gradi gratuiti nelle sue due abilità, un\'abilità per l\'attacco ingannevole, un trucco al 5° e un potere all\'11°.</p>'}
      <ul class="op-privilegi">
        ${voce(true, 'Attacco Ingannevole', `<b>+${dadi}</b> danni · azione completa: ti muovi alla tua velocità e attacchi con un'arma piccola o da mischia Operativo; prima tiri una prova (CD 20 + GS del nemico): ${prove.map(([a, v, nota]) => `${esc(a)} <b>${segno(v)}</b>${nota ? ` <small>(${esc(nota)})</small>` : ''}`).join(', ')}`)}
        ${voce(true, "Vantaggio dell'Operativo", `<b>+${vantaggioOp(L)}</b> cognitivo all'iniziativa e a tutte le abilità (già nella scheda; non si somma all'Abilità Focalizzata, vale il più alto)`)}
        ${voce(L >= 2, 'Eludere', 'con armatura leggera o nessuna e senza ingombro')}
        ${voce(L >= 2, "Trucchi dell'operativo", `<b>${trucchi}</b>${L >= 5 && sp ? ` + ${esc(sp.trucco)}` : ''} · CD tiri salvezza <b>${cdTs}</b> · CD prove di abilità <b>${cdAbil}</b> — scrivili in «Talenti e capacità»`)}
        ${voce(L >= 3, 'Movimento Svelto', svelto ? `<b>+${svelto} m</b> alla velocità sul terreno ${pesante || c.carico ? '<span class="oltre">— ora non vale (armatura non leggera o ingombrato)</span>' : '(armatura leggera o nessuna, non ingombrato)'}` : '+3 m dal 3°, +6 m dal 9°, +9 m dal 15°')}
        ${voce(L >= 3, 'Arma Specializzata', 'talento bonus per le armi della classe (danni già nella scheda)')}
        ${voce(L >= 4, 'Inganno Debilitante', 'se riescono prova e attacco ingannevole: il bersaglio è impreparato o deconcentrato fino al tuo prossimo turno')}
        ${voce(L >= 7, 'Agilità Prodigiosa', 'immune a impreparato; nessun bonus a chi ti attacca ai fianchi o quando sei prono')}
        ${voce(L >= 7, "Padronanza dell'Abilità della Specializzazione", 'prendere 10 anche sotto stress con le abilità di Abilità Focalizzata')}
        ${voce(L >= 8, L >= 13 ? 'Quadruplo Attacco' : 'Triplo Attacco', `attacco completo con armi piccole o da mischia Operativo: fino a ${L >= 13 ? 4 : 3} attacchi`)}
        ${voce(L >= 11, 'Potere della Specializzazione', sp ? esc(sp.potere) : '')}
        ${voce(L >= 17, 'Doppia Debilitazione', 'due effetti di inganno debilitante')}
        ${voce(L >= 20, 'Operativo Supremo', 'tiri due volte le prove delle abilità della specializzazione; 1 volta al giorno scambi un trucco per 24 ore')}
      </ul>`;
  }

  // Abilità del tema nella riga del tema: scelta (se libera) e cosa dà
  function rigaAbilTema(p, d, c) {
    const at = abilTema(d);
    if (!at) return '';
    const scelta = at.scelte ? ` · abilità <select data-sf="tema|abil" data-id="${p.id}" data-ridisegna-sf>${opz([['', '— scegli —'], ...at.scelte.map((x) => [x, x])], at.nome)}</select>` : '';
    if (!at.nome) return scelta;
    const cosa = c.temaPiu1 ? `+1 alle prove di ${esc(at.nome)} <small class="muto">(è già di classe per la classe del 1° livello)</small>` : `${esc(at.nome)} diventa abilità di classe`;
    return `${scelta} · ${cosa}`;
  }

  // Sezione «Soldato»: stili di combattimento con le tecniche e privilegi calcolati dal livello (wiki «Soldato», «Soldato/Stili»)
  function sezioneSoldato(p, d, c) {
    const id = p.id;
    const L = c.livSo;
    const attivi = stiliSoldato(d);
    const voce = (ok, nome, testo) => `<li class="${ok ? '' : 'muto'}"><b>${esc(nome)}</b>${testo ? ` — ${testo}` : ''}${ok ? '' : ' <small>(non ancora)</small>'}</li>`;
    const scelta = (k, etich, escluso) => `<label>${etich} <select data-sf="soldato|${k}" data-id="${id}" data-ridisegna-sf>${opz([['', '— scegli —'], ...Object.keys(STILI).filter((x) => x !== escluso).map((x) => [x, x])], d.soldato?.[k] || '')}</select></label>`;
    // Note sulle tecniche che la scheda calcola o che hanno numeri dal livello
    const note = (nome, ls) => {
      const r = [];
      if (nome === 'Incursore') r.push('Reazione Rapida: +4 all\'iniziativa (già nella scheda) e +3 m alla velocità sul terreno');
      if (nome === 'Agguatatore') {
        r.push('Vigilanza: Iniziativa Migliorata come talento bonus (+4, già nella scheda)');
        if (!c.abil['Furtività']?.classe) r.push('<span class="oltre">serve Furtività come abilità di classe per scegliere questo stile</span>');
      }
      if (nome === 'Guardia') {
        r.push('Addestramento nell\'Armatura: penalità dell\'armatura −1 e DES massima +1 (già nella scheda)');
        if (ls >= 13) r.push(`Resistenza Cinetica: <b>RD ${ls >= 17 ? 5 : 3}/-</b>`);
      }
      if (nome === 'Cacciatore') {
        r.push(`Cacciatore Competente: Percezione è di classe; <b>${c.caccia}</b> gradi gratuiti tra Percezione e Sopravvivenza —
          a Percezione <input type="number" min="0" max="${c.caccia}" class="pf-corto" data-sf="soldato|caccia" data-id="${id}" data-ridisegna-sf value="${esc(d.soldato?.caccia ?? '')}" placeholder="${c.cacciaPerc}">
          (${c.cacciaPerc} a Percezione, ${c.caccia - c.cacciaPerc} a Sopravvivenza; vuoto = in automatico)`);
      }
      if (nome === 'Guerriero Collerico') r.push(`Combattimento Frenetico: 1d4 + ${Math.ceil(ls / 2)} round, <b>+${2 + Math.floor((ls - 1) / 4)}</b> danni in mischia, +2 TS Volontà, −1 CA (attivalo come bonus in «Bonus e condizioni»)`);
      if (nome === 'Guerriero Provetto') r.push(`Rinforzare Resilienza: <b>RD ${Math.min(5, 1 + Math.floor((ls - 1) / 4))}/-</b> per round pari al modificatore di FOR o COS (+1 se hai RD da altre fonti)`);
      if (nome === 'Mordi e Fuggi' && ls >= 13) r.push('Bersaglio Elusivo: +1 cognitivo alla CA nei turni in cui ti muovi');
      if (nome === 'Tattico Multibraccia') r.push('serve avere almeno quattro braccia');
      return r.length ? `<div class="muto pf-aiuto">${r.join(' · ')}</div>` : '';
    };
    const blocco = (k, etich) => {
      const nome = d.soldato?.[k];
      const st = STILI[nome];
      if (!st) return '';
      const ls = k === 'primario' ? L : L - 8;
      return `<div class="fede-righe"><div><span class="muto">${etich} · ${esc(nome)}</span> ${st.filter(([, l]) => k === 'primario' || l + 8 <= 20).map(([t, l]) => `<span class="${ls >= l ? '' : 'muto'}">${esc(t)} (${k === 'primario' ? l : l + 8}°)</span>`).join(', ')}</div>${ls >= 1 ? note(nome, ls) : ''}</div>`;
    };
    const esperienze = L >= 3 ? 1 + Math.floor((L - 3) / 4) : 0;
    return `<div class="pf-riga">
        ${scelta('primario', 'Stile primario', L >= 9 ? d.soldato?.secondario : '')}
        ${L >= 9 ? scelta('secondario', 'Stile secondario', d.soldato?.primario) : '<span class="muto">stile secondario dal 9° livello</span>'}
        <a class="btn-piccolo" href="${esc(linkWiki('Soldato/Stili'))}" target="_blank" rel="noopener">📖 stili</a>
        <a class="btn-piccolo" href="${esc(linkWiki('Soldato'))}" target="_blank" rel="noopener">📖 soldato</a>
        <span class="muto">livello da soldato <b>${L}</b></span></div>
      ${STILI[d.soldato?.primario] ? blocco('primario', 'Stile primario') : '<p class="oltre pf-aiuto">Scegli lo stile di combattimento primario: dà una tecnica al 1°, 5°, 9°, 13° e 17° livello. Una volta scelto non si cambia.</p>'}
      ${L >= 9 ? (attivi.some((x) => x.ruolo === 'secondario') ? blocco('secondario', 'Stile secondario') : '<p class="oltre pf-aiuto">Scegli lo stile secondario: le sue tecniche arrivano al 9°, 13° e 17° livello (livello da soldato −8).</p>') : ''}
      <ul class="op-privilegi">
        ${voce(L >= 2, 'Talenti di Combattimento', `<b>${Math.floor(L / 2)}</b> talenti bonus di combattimento (al 2° e ogni 2 livelli) — scrivili in «Talenti e capacità»`)}
        ${voce(L >= 3, 'Arma Specializzata', 'talento bonus per le armi della classe (danni già nella scheda)')}
        ${voce(L >= 3, "Esperienza con l'Equipaggiamento", `<b>${esperienze}</b> (al 3° e ogni 4 livelli); al posto di ognuna puoi prendere un addestramento delle forze speciali o un'esperienza con il talento`)}
        ${voce(L >= 9, 'Stile di Combattimento Secondario', 'tecniche al 9°, 13° e 17°')}
        ${voce(L >= 11, 'Massacro del Soldato', 'attacco completo: fino a tre attacchi, con penalità −6 invece di −4')}
        ${voce(L >= 20, 'Colpo Letale', 'azione standard: un attacco; se colpisce e non uccide, spendi 1 PR: TS su Tempra o muore (immune per 24 ore)')}
      </ul>`;
  }

  // Sezione «Mistico»: connessione, incantesimi conosciuti e privilegi calcolati dal livello (wiki «Mistico»)
  function sezioneMistico(p, d, c) {
    const id = p.id;
    const L = c.livMs;
    const cn = connessioneDi(d);
    const cdTs = 10 + Math.floor(L / 2) + c.m.SAG;
    const cdAbil = 10 + Math.floor(L * 1.5) + c.m.SAG;
    const tot = (a) => c.abil[a]?.tot ?? 0;
    // Incantesimi conosciuti: tabella del mistico (gli incantesimi della connessione si aggiungono e non contano)
    const tab = CONOSCIUTI_MS[Math.min(20, L) - 1] || [];
    const noti = d.incantesimi.filter((x) => x.classe === 'Mistico' && !x.connessione);
    const conteggi = tab.map((max, l) => {
      const presi = noti.filter((x) => n(x.livello) === l).length;
      return `<span class="chip">${l ? `${l}°` : 'liv. 0'} <b class="${presi > max ? 'oltre' : ''}">${presi}/${max}</b></span>`;
    }).join(' ');
    const voce = (ok, nome, testo) => `<li class="${ok ? '' : 'muto'}"><b>${esc(nome)}</b>${testo ? ` — ${testo}` : ''}${ok ? '' : ' <small>(non ancora)</small>'}</li>`;
    return `<div class="pf-riga">
        <label>Connessione <select data-sf="mistico|connessione" data-id="${id}" data-ridisegna-sf>${opz([['', '— scegli —'], ...Object.keys(CONNESSIONI).map((x) => [x, x])], d.mistico?.connessione || '')}</select></label>
        <a class="btn-piccolo" href="${esc(linkWiki('Mistico/Connessioni'))}" target="_blank" rel="noopener">📖 connessioni</a>
        <a class="btn-piccolo" href="${esc(linkWiki('Mistico'))}" target="_blank" rel="noopener">📖 mistico</a>
        <span class="muto">livello da mistico <b>${L}</b> · CD incantesimi 10 + livello ${segno(c.m.SAG)}</span></div>
      ${cn ? `<div class="fede-righe">
        <div><span class="muto">Abilità associate</span> ${cn.abil.map((a) => `<b>${esc(a)}</b> ${segno(tot(a))}`).join(' · ')}
          <small class="muto">— Incanalare Abilità ${c.incanalare ? `+${c.incanalare} cognitivo (già nella scheda; non si somma ad altri bonus cognitivi, vale il più alto)` : 'dal 2° livello'}</small></div>
        <div><span class="muto">Incantesimi della connessione</span> ${[1, 2, 3, 4, 5, 6].map((l) => {
          const nome = cn.variabile && (!cn.inc[l] || l === incMaxMs(L)) && l <= incMaxMs(L) ? cn.variabile : cn.inc[l] || cn.variabile;
          return `<span class="${l <= incMaxMs(L) ? '' : 'muto'}">${l}° ${esc(nome || '—')}</span>`;
        }).join(' · ')}${cn.variabile ? ` <small class="muto">(${esc(cn.variabile)}: incantesimo di livello variabile, al livello più alto che lanci)</small>` : ''}
          <small class="muto">— aggiunti da soli agli incantesimi conosciuti</small></div>
        <div><span class="muto">Poteri della connessione</span> ${cn.poteri.map(([nome, l]) => `<span class="${l <= L ? '' : 'muto'}">${esc(nome)} (${l}°)</span>`).join(', ')}
          · CD tiri salvezza <b>${cdTs}</b> · CD prove di abilità <b>${cdAbil}</b></div></div>`
        : '<p class="oltre pf-aiuto">Scegli la connessione: dà due abilità associate (Incanalare Abilità), un incantesimo in più per ogni livello di incantesimi e i poteri della connessione.</p>'}
      <div class="pf-riga"><span class="muto">Incantesimi conosciuti (tabella del mistico, senza quelli della connessione):</span> ${conteggi}</div>
      <ul class="op-privilegi">
        ${voce(true, 'Tocco di Cura', `1 volta al giorno, 10 minuti: cura un alleato fino a <b>${5 * L}</b> PF`)}
        ${voce(L >= 2, 'Arma Specializzata', 'talento bonus per le armi della classe (danni già nella scheda)')}
        ${voce(L >= 2 || d.mistico?.connessione === 'Akashica', 'Incanalare Abilità', c.incanalare ? `+${c.incanalare} cognitivo alle abilità della connessione` : '')}
        ${voce(L >= 3, 'Collegamento Mentale', 'a volontà, una volta al giorno per creatura toccata')}
        ${voce(L >= 11, 'Legame Telepatico', 'permanente, fino a 6 creature consenzienti')}
        ${voce(L >= 19, 'Trascendenza', 'ogni incantesimo della connessione 1 volta al giorno senza slot; proiezione psichica (1 PR)')}
        ${voce(L >= 20, 'Illuminazione', '1 volta al giorno per 1 minuto: +4 a colpire, TS e prove; 20 PR per i poteri della connessione; Miracolo 1 volta a settimana')}
      </ul>`;
  }

  function mancaPerSalire(p, d, c) {
    const manca = [];
    if (!razzaDi(d)) manca.push('scegli la razza');
    const tema = temaDi(d);
    if (!d.tema?.nome) manca.push('scegli il tema');
    else if (!carTemaDi(d)) manca.push('scegli la caratteristica del tema (+1)');
    if (abilTema(d)?.scelte && !abilTema(d).nome) manca.push("scegli l'abilità del tema");
    if (!d.classi.some((cl) => nomeClasse(cl.nome))) { manca.push('scegli la classe di 1° livello'); return manca; }
    if (livOperativo(d) && !specDi(d)) manca.push("scegli la specializzazione dell'operativo");
    if (livMistico(d) && !connessioneDi(d)) manca.push('scegli la connessione del mistico');
    const livSo = livSoldato(d);
    if (livSo && !STILI[d.soldato?.primario]) manca.push('scegli lo stile di combattimento primario del soldato');
    if (livSo >= 9 && !stiliSoldato(d).some((x) => x.ruolo === 'secondario')) manca.push('scegli lo stile di combattimento secondario del soldato');
    const sprecati = Object.entries(c.abil).filter(([, a]) => a.sprecati);
    if (sprecati.length) manca.push(`sposta i gradi sprecati in ${sprecati.map(([x, a]) => `${x} (${a.sprecati})`).join(', ')}: hanno già i gradi gratuiti al massimo`);
    if (c.gradiSpesi < c.gradiDisp) manca.push(`assegna i gradi di abilità (${c.gradiSpesi}/${c.gradiDisp})`);
    if (c.gradiSpesi > c.gradiDisp) manca.push(`hai assegnato più gradi del possibile (${c.gradiSpesi}/${c.gradiDisp})`);
    const attesi = Math.floor((c.liv + 1) / 2) + (/^umano$/i.test(d.razza.nome) ? 1 : 0) + Math.floor(livSo / 2); // + talenti di combattimento del soldato
    const presi = d.capacita.filter((x) => x.tipo === 'Talento').length;
    if (presi < attesi) manca.push(`scegli i talenti (${presi}/${attesi})`);
    return manca;
  }
  const boxDaCompletare = (manca, liv) => (manca.length ? `<div class="pannello pf-da-completare"><b>${liv ? `Per completare il ${liv}° livello` : 'Per iniziare'}</b>${liv ? ' (poi potrai salire al successivo)' : ''}:<ul>${manca.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '');
  function sezioneSalita(p, d, c) {
    const a = anteprimaSalita(p, d, c);
    const id = p.id;
    const opzClassi = [...d.classi.map((x) => [x.id, `${x.nome} ${x.livello} → ${n(x.livello) + 1}`]), ...Object.keys(D.classi).filter((x) => !d.classi.some((y) => nomeClasse(y.nome) === x)).map((x) => [x, `${x} (nuova, 1°)`])];
    const scelte = salita.car || [];
    return `<div class="pannello salita"><div class="pf-riga"><h3>⬆ Sali al livello ${a.livTot}</h3>
        <label>Classe <select data-sf-salita="classe">${opz(opzClassi, salita.classe)}</select></label>
        <button class="btn-x" data-azione="sf-livello-chiudi" title="Annulla">×</button></div>
      ${a.livTot > 20 ? '<p class="oltre">Già al 20° livello.</p>' : `<div class="salita-griglia">
        <div><h4>Cosa ottieni</h4><ul>
          <li><b>${esc(a.k)} ${a.dopo}°</b> · livello del personaggio ${a.livTot}</li>
          <li>BAB ${a.bab ? '+' + a.bab : 'invariato'} · TS: Tem ${segno(a.ts[0])}, Rif ${segno(a.ts[1])}, Vol ${segno(a.ts[2])}</li>
          <li><b>+${a.pf} PF</b> e <b>+${a.ps} PS</b>${a.pr ? ' · +1 PR' : ''}</li>
          <li>${a.privilegi.length ? `Privilegi: <b>${esc(a.privilegi.join(', '))}</b>` : 'Nessun privilegio nuovo in tabella'}</li>
          ${a.incantesimi.map((x) => `<li>✨ ${esc(x)}</li>`).join('')}
        </ul></div>
        <div><h4>Scelte da fare</h4><ul>
          <li><b>${a.gradi}</b> gradi di abilità da assegnare (massimo ${a.livTot} per abilità)</li>
          ${a.talento ? '<li><b>1 talento</b> (livello dispari)</li>' : ''}
          ${a.caratteristiche ? `<li><b>Aumento di caratteristiche</b> (livello ${a.livTot}): scegli 4 caratteristiche, +2 ciascuna (+1 se il punteggio è già 17 o più)
            <div class="pf-riga">${CARS.map((s) => `<label class="pf-chk"><input type="checkbox" data-azione="sf-salita-car" data-car="${s}" ${scelte.includes(s) ? 'checked' : ''}> ${s}</label>`).join('')} <span class="muto">${scelte.length}/4</span></div></li>` : ''}
          ${a.privilegi.length ? '<li>Scegli i nuovi poteri di classe (es. talenti di combattimento, trucchi, rivelazioni) e scrivili in Talenti e capacità</li>' : ''}
        </ul></div></div>
      <div class="pf-piede"><button class="primario" data-azione="sf-livello-conferma" data-id="${id}" ${a.caratteristiche && scelte.length !== 4 ? 'disabled title="Scegli 4 caratteristiche"' : ''}>Conferma il livello ${a.livTot}</button></div>`}
    </div>`;
  }

  // ---- Tiri ----
  function tira(p, chiave) {
    const c = calcola(p);
    const [tipo, arg] = chiave.split(/:(.*)/s);
    const t = (b, et) => ctx.eseguiTiro(`1d20${b ? (b > 0 ? '+' : '') + b : ''}`, `${p.nome} · ${et}`);
    if (tipo === 'car') return t(c.m[arg], NOMI_CAR[arg]);
    if (tipo === 'ts') return t(c.ts[arg].tot, { tempra: 'Tempra', riflessi: 'Riflessi', volonta: 'Volontà' }[arg]);
    if (tipo === 'iniz') return t(c.iniz, 'Iniziativa');
    if (tipo === 'abil') return t(c.abil[arg]?.tot ?? 0, arg);
    const a = c.armi.find((x) => x.id === arg);
    const nome = dati(p).armi.find((x) => x.id === arg)?.nome || 'arma';
    if (tipo === 'colpo' && a) return t(a.colpo, nome);
    if (tipo === 'danni' && a) {
      const espr = (a.danni.match(/^\s*(\d+d\d+)/) || [])[1];
      const bonus = (a.danni.match(/([+-]\d+)\s*$/) || [])[1] || '';
      if (espr) return ctx.eseguiTiro(espr + bonus, `${p.nome} · danni ${nome}`);
    }
    return null;
  }

  // Danno: prima i Punti Stamina, poi i Punti Ferita
  function applicaDanno(p, q, modo) {
    const d = dati(p);
    const c = calcola(p);
    let ps = c.psAtt, pf = c.pfAtt;
    if (modo === -1) {
      const daPs = Math.min(ps, q);
      ps -= daPs;
      pf = Math.max(0, pf - (q - daPs));
    } else if (modo === 1) pf = Math.min(c.pfMax, pf + q);
    else ps = Math.min(c.psMax, ps + q);
    d.ps.attuali = ps;
    d.pf.attuali = pf;
  }

  // ---- Azioni ----
  const NUOVI = {
    classi: () => ({ id: uid(), nome: '', livello: 1 }),
    armi: () => ({ id: uid(), nome: '', categoria: 'piccola', tipo: 'distanza', danni: '1d4', critico: '', bonus: '', bonusDanni: '', specializzata: true, munizioni: '', volume: '' }),
    armature: () => ({ id: uid(), nome: '', tipo: 'leggera', cae: '', cac: '', desMax: '', penalita: '', velocita: '', upgrade: '', indossata: true, volume: '' }),
    capacita: () => ({ id: uid(), nome: '', tipo: 'Talento', descrizione: '' }),
    oggetti: () => ({ id: uid(), nome: '', qta: 1, ingombro: '', note: '', dove: 'zaino' }),
  };
  const azioni = {
    'sf-aggiungi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const nuovo = NUOVI[el.dataset.lista]();
      if (el.dataset.dove) nuovo.dove = el.dataset.dove;
      dati(p)[el.dataset.lista].push(nuovo);
      ctx.salva();
      ctx.render();
    },
    'sf-rimuovi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const t = trova(dati(p), el.dataset.lista + '|x');
      const arr = t?.[0];
      if (!Array.isArray(arr)) return;
      const i = arr.findIndex((x) => x.id === el.dataset.elem);
      if (i >= 0) arr.splice(i, 1);
      ctx.salva(); ctx.render();
    },
    'sf-tira'(el) { const p = ctx.personaggio(el.dataset.id); if (p) tira(p, el.dataset.tiro); },
    'sf-pr'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      d.pr.usati = Math.max(0, Math.min(c.prMax, n(d.pr.usati) + Number(el.dataset.d)));
      ctx.salva(); ctx.render();
    },
    'sf-danno'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const q = n(el.closest('.pf-box').querySelector('.sf-quanti').value);
      if (!q) return;
      applicaDanno(p, q, Number(el.dataset.segno));
      ctx.salva(); ctx.render();
    },
    'sf-riposo'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      if (c.prMax - n(d.pr.usati) < 1) { ctx.toast('Serve almeno 1 Punto Risolutezza per recuperare la Stamina', 'errore'); return; }
      d.pr.usati = n(d.pr.usati) + 1;
      d.ps.attuali = '';
      ctx.salva(); ctx.render();
      ctx.toast('☕ Riposo di 10 minuti: speso 1 PR, Punti Stamina al massimo');
    },
    'sf-riposo-lungo'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      d.pr.usati = 0;
      d.ps.attuali = '';
      d.usiInc = {};
      d.pf.attuali = Math.min(c.pfMax, c.pfAtt + Math.max(1, c.liv));
      if (d.pf.attuali >= c.pfMax) d.pf.attuali = '';
      ctx.salva(); ctx.render();
      ctx.toast(`🌙 Riposo di 8 ore: PR e PS recuperati, +${Math.max(1, c.liv)} PF`);
    },
    'sf-effetto'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const b = dati(p).bonus.find((x) => x.id === el.dataset.bonus);
      if (b) { b.effetti = b.effetti || []; b.effetti.push({ id: uid(), ...E('colpire', 1) }); }
      ctx.salva(); ctx.render();
    },
    'sf-preset'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const nome = el.dataset.vuoto ? 'Nuovo bonus' : document.getElementById(`sf-preset-${p.id}`).value;
      const eff = el.dataset.vuoto ? [E('colpire', 1, 'morale')] : PRESET[nome];
      dati(p).bonus.push({ id: uid(), nome, attivo: !el.dataset.vuoto, effetti: eff.map((e) => ({ id: uid(), ...e })) });
      ctx.salva(); ctx.render();
    },
    'sf-prendi-talento'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const t = talentoDi(el.dataset.nome);
      if (!p || !t) return;
      const d = dati(p);
      const s = statoTalento(t, p, d, calcola(p));
      if (s.stato === 'no') { ctx.toast(`Non puoi prendere <b>${esc(t.nome)}</b>: manca ${esc(s.req.filter((r) => r.esito === false).map((r) => r.testo).join(', '))}`, 'errore'); return; }
      d.capacita.push({ id: uid(), nome: t.nome, tipo: 'Talento', descrizione: '' });
      ctx.salva(); ctx.render();
      ctx.toast(`🎖 <b>${esc(t.nome)}</b> aggiunto ai talenti${s.stato === 'forse' ? ' · controlla i prerequisiti in giallo' : ''}`);
    },
    'sf-inc-aggiungi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      dati(p).incantesimi.push({ id: uid(), classe: el.dataset.classe, nome: el.dataset.nome, livello: Number(el.dataset.livello) });
      ctx.salva(); ctx.render();
    },
    'sf-lancia'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const L = Number(el.dataset.livello);
      const nome = esc(el.dataset.nome);
      if (L === 0) { ctx.toast(`✨ <b>${nome}</b> lanciato (livello 0, a volontà)`); return; }
      const inc = calcola(p).incantesimi.find((x) => x.classe === el.dataset.classe);
      const tot = n(inc?.giorno[L - 1]);
      const usi = d.usiInc[el.dataset.classe] = d.usiInc[el.dataset.classe] || {};
      if (n(usi[L]) >= tot) { ctx.toast(`Nessuno slot di ${L}° livello rimasto per <b>${nome}</b>`, 'errore'); return; }
      usi[L] = n(usi[L]) + 1;
      ctx.salva(); ctx.render();
      ctx.toast(`✨ <b>${nome}</b> lanciato · slot di ${L}° rimasti: ${tot - usi[L]} · CD ${inc.cd(L)}`);
    },
    'sf-slot'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const usi = dati(p).usiInc[el.dataset.classe] = dati(p).usiInc[el.dataset.classe] || {};
      usi[el.dataset.livello] = Math.max(0, n(usi[el.dataset.livello]) + Number(el.dataset.d));
      ctx.salva(); ctx.render();
    },
    'sf-arma-wiki'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const a = C.armi.find((x) => x[0] === document.getElementById(`sf-scelta-arma-${p.id}`)?.value);
      if (!a) { ctx.toast('Scegli prima un\'arma', 'errore'); return; }
      const [nome, , livello, , danni, gittata, critico, capacita, , volume, speciale, , tip] = a;
      const [categoria, tipo] = TIPOLOGIA[tip] || ['speciale', 'distanza'];
      dati(p).armi.push({ ...NUOVI.armi(), nome, categoria, tipo, danni: danni === '-' ? '' : danni, critico: [critico, gittata && gittata !== '-' ? `gittata ${gittata}` : '', speciale].filter((x) => x && x !== '-').join(' · '), munizioni: capacita && capacita !== '-' ? capacita : '', volume: volumeWiki(volume) });
      ctx.salva(); ctx.render();
      ctx.toast(`⚔ <b>${esc(nome)}</b> (livello ${esc(livello)}) aggiunta agli attacchi${avvisoLivello(p, livello)}`);
    },
    'sf-armatura-wiki'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const v = document.getElementById(`sf-scelta-armatura-${p.id}`)?.value || '';
      const numero = (s) => { const m = String(s || '').match(/[+-]?\d+/); return m ? Number(m[0]) : ''; };
      if (v.startsWith('A:')) {
        const a = C.armature.find((x) => x[0] === v.slice(2));
        if (!a) return;
        dati(p).armature.push({ ...NUOVI.armature(), nome: a[0], tipo: { Leggera: 'leggera', Pesante: 'pesante', Potenziata: 'potenziata' }[a[1]] || 'leggera', cae: numero(a[4]), cac: numero(a[5]), desMax: numero(a[6]), penalita: Math.abs(numero(a[7]) || 0) || '', velocita: a[8] === '-' ? '' : a[8], upgrade: a[9] && a[9] !== '0' ? `${a[9]} spazi per migliorie` : '', volume: volumeWiki(a[10]) });
        ctx.toast(`🛡 <b>${esc(a[0])}</b> (livello ${esc(a[2])}) aggiunta${avvisoLivello(p, a[2])}`);
      } else if (v.startsWith('S:')) {
        const s = C.scudi.find((x) => x[0] === v.slice(2));
        if (!s) return;
        const b = numero(s[3]);
        dati(p).armature.push({ ...NUOVI.armature(), nome: s[0], tipo: 'scudo', cae: b, cac: b, desMax: numero(s[4]), penalita: Math.abs(numero(s[5]) || 0) || '', upgrade: `bonus ${s[3]} (impugnato/allineato)`, volume: volumeWiki(s[6]) });
        ctx.toast(`🛡 <b>${esc(s[0])}</b> (livello ${esc(s[1])}) aggiunto${avvisoLivello(p, s[1])}`);
      } else { ctx.toast('Scegli prima un\'armatura o uno scudo', 'errore'); return; }
      ctx.salva(); ctx.render();
    },
    'sf-livello-apri'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      if (GIOCATORE) { const p0 = ctx.personaggio(el.dataset.id); const manca = mancaPerSalire(p0, d, calcola(p0)); if (manca.length) { ctx.toast(`Completa prima il livello attuale: ${esc(manca.join('; '))}`, 'errore'); return; } }
      salita = { pgId: el.dataset.id, classe: d.classi[0]?.id || 'Soldato', car: [] };
      ctx.render();
    },
    'sf-livello-chiudi'() { salita = null; ctx.render(); },
    'sf-salita-car'(el) {
      if (!salita) return;
      const s = el.dataset.car;
      salita.car = salita.car.includes(s) ? salita.car.filter((x) => x !== s) : salita.car.length < 4 ? [...salita.car, s] : salita.car;
      ctx.render();
    },
    'sf-livello-conferma'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p || !salita) return;
      const d = dati(p);
      const c = calcola(p);
      const a = anteprimaSalita(p, d, c);
      if (a.livTot > 20) return;
      if (a.caratteristiche && salita.car.length !== 4) { ctx.toast('Scegli 4 caratteristiche da aumentare', 'errore'); return; }
      if (a.esistente) a.esistente.livello = n(a.esistente.livello) + 1;
      else d.classi.push({ id: uid(), nome: a.k, livello: 1 });
      if (a.caratteristiche) {
        p.caratteristiche = p.caratteristiche || {};
        for (const s of salita.car) {
          const v = p.caratteristiche[s] === '' || p.caratteristiche[s] == null ? 10 : n(p.caratteristiche[s]);
          p.caratteristiche[s] = v + (c.punteggio[s] >= 17 ? 1 : 2);
        }
      }
      p.campi = p.campi || {};
      p.campi.Livello = String(c.liv + 1);
      salita = null;
      ctx.salva(); ctx.render();
      ctx.toast(`⬆ <b>${esc(p.nome)}</b> è ora di ${c.liv + 1}° livello. Da scegliere: ${a.gradi} gradi di abilità${a.talento ? ', 1 talento' : ''}${a.privilegi.length ? ', nuovi poteri di classe' : ''}`);
    },
  };

  // ---- Modifica dei campi ----
  function applica(el) {
    const p = ctx.personaggio(el.dataset.id);
    if (!p) return;
    const d = dati(p);
    const t = trova(d, el.dataset.sf);
    if (!t) return;
    t[0][t[1]] = valoreDa(el);
    // Razza, tema e classe scritti anche nei campi di testo del personaggio (per elenchi e ricerca)
    p.campi = p.campi || {};
    if (el.dataset.sf === 'razza|nome') { d.razza.scelta = ''; p.campi.Razza = d.razza.nome; const r = razzaDi(d); if (r) d.taglia = r.taglia; }
    if (el.dataset.sf === 'tema|nome') { d.tema.car = ''; d.tema.abil = ''; p.campi.Tema = d.tema.nome; }
    if (/^classi#/.test(el.dataset.sf)) { p.campi.Classe = d.classi.map((x) => `${x.nome} ${x.livello}`).join(' / '); p.campi.Livello = String(livelloTot(d)); }
    p.modificato = Date.now();
    ctx.salva();
    aggiorna(p);
  }

  // =====================================================================
  // Archivio olografico: il "libro degli incantesimi" di Starfinder, come uno schermo olografico.
  // Si apre in una finestra a parte (nell'app) o nella stessa pagina (kit dei giocatori): #/olografico/<pg>/<classe>
  // =====================================================================
  const slugClasse = (k) => String(k).replace(/ /g, '-');
  const classeDaSlug = (s) => Object.keys(CLASSI_INC).find((k) => slugClasse(k) === s) || '';
  const olo = { pg: '', classe: '', livello: null, scelto: '' };
  const testiOlo = new Map(); // descrizioni lette dal wiki (pagina → testo), non salvate
  function estraiDescrizione(doc) {
    const c = doc.querySelector('#mw-content-text .mw-parser-output') || doc.querySelector('#mw-content-text');
    if (!c) return '';
    c.querySelectorAll('table, .toc, .navbox, .mw-editsection, sup.reference, style, script').forEach((x) => x.remove());
    const out = [];
    for (const x of c.querySelectorAll('p, li')) {
      const t = x.textContent.replace(/\s+/g, ' ').trim();
      if (t.length <= 2 || /^Fonte\s*:/i.test(t)) continue;
      // Blocco delle statistiche (già nei riquadri): se ne tiene solo bersaglio, area ed effetto
      if (/^Scuola\s*:/i.test(t)) {
        const extra = [...x.textContent.matchAll(/(Bersagli?o?|Area|Effetto)\s*:\s*([^\n]+?)(?=\s*(?:Durata|Tiro Salvezza|Resistenza|Gittata|Tempo di Lancio)\s*:|\n|$)/gi)].map((m) => `${m[1]}: ${m[2].trim()}`);
        if (extra.length) out.push(extra.join(' · '));
        continue;
      }
      out.push(t.replace(/^Descrizione\s*:\s*/i, ''));
    }
    return out.join('\n\n');
  }
  function caricaDescrizione(pagina) {
    if (testiOlo.has(pagina) || !ctx.wiki) return;
    testiOlo.set(pagina, null); // in caricamento
    ctx.wiki(pagina.replace(/ /g, '_'), 'sf')
      .then((html) => estraiDescrizione(new DOMParser().parseFromString(html, 'text/html')))
      .then((t) => { testiOlo.set(pagina, t || ''); }, () => { testiOlo.delete(pagina); testiOlo.set('!' + pagina, true); })
      .then(() => { const box = document.getElementById('olo-testo'); if (box && box.dataset.pagina === pagina) box.outerHTML = testoOlo(pagina); });
  }
  function testoOlo(pagina) {
    const t = testiOlo.get(pagina);
    const corpo = t ? t.split(/\n{2,}/).map((x) => `<p>${esc(x)}</p>`).join('')
      : t === '' || testiOlo.has('!' + pagina) || !ctx.wiki ? `<p class="olo-muto">Descrizione non disponibile qui: apri la scheda sul wiki.</p>`
        : '<p class="olo-muto olo-carica">Ricezione dati dal wiki<span>…</span></p>';
    return `<div id="olo-testo" class="olo-testo" data-pagina="${esc(pagina)}">${corpo}</div>`;
  }
  function vistaOlografico(p, slug) {
    if (!p) return '<p class="vuoto">Personaggio non trovato.</p>';
    const d = dati(p);
    const c = calcola(p);
    const classe = classeDaSlug(slug) || c.incantesimi[0]?.classe || '';
    const inc = c.incantesimi.find((x) => x.classe === classe);
    if (olo.pg !== p.id || olo.classe !== classe) Object.assign(olo, { pg: p.id, classe, livello: null, scelto: '' });
    document.title = `Archivio olografico — ${p.nome}`;
    if (!inc) return `<div class="olo"><div class="olo-schermo"><p class="olo-muto">${esc(p.nome)} non ha classi incantatrici.</p></div></div>`;
    const usi = d.usiInc[classe] || {};
    const noti = d.incantesimi.filter((x) => x.classe === classe);
    const livelli = [0, ...inc.giorno.map((x, i) => (x === '' ? null : i + 1)).filter((x) => x !== null)];
    for (const x of noti) if (!livelli.includes(x.livello)) livelli.push(x.livello);
    livelli.sort((a, b) => a - b);
    if (olo.livello === null || !livelli.includes(olo.livello)) olo.livello = livelli.find((L) => noti.some((x) => x.livello === L)) ?? livelli[0];
    const L = olo.livello;
    const qui = noti.filter((x) => x.livello === L).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    if (!qui.some((x) => x.id === olo.scelto)) olo.scelto = qui[0]?.id || '';
    const scelto = qui.find((x) => x.id === olo.scelto);
    const v = scelto ? INCANTESIMI.find((y) => y.nome === scelto.nome) : null;
    const tot = (Lv) => (Lv === 0 ? null : n(inc.giorno[Lv - 1]));
    const restano = (Lv) => (Lv === 0 ? null : Math.max(0, tot(Lv) - n(usi[Lv])));
    const tacche = (Lv) => (Lv === 0 ? '<span class="olo-inf">∞</span>' : Array.from({ length: tot(Lv) }, (_, i) => `<i class="${i < restano(Lv) ? 'on' : ''}"></i>`).join(''));
    const schede = livelli.map((Lv) => `<button class="olo-tab${Lv === L ? ' attiva' : ''}" data-azione="sf-olo-livello" data-livello="${Lv}">
        <b>${Lv === 0 ? 'LIV 0' : `LIV ${Lv}`}</b><span class="olo-tacche">${tacche(Lv)}</span>
        <small>${noti.filter((x) => x.livello === Lv).length} incant.</small></button>`).join('');
    const elenco = qui.map((x) => {
      const w = INCANTESIMI.find((y) => y.nome === x.nome);
      return `<button class="olo-voce${x.id === olo.scelto ? ' scelta' : ''}" data-azione="sf-olo-scegli" data-sp="${x.id}">
        <span class="olo-voce-nome">${esc(x.nome)}</span><small>${esc(w ? w.scuola.split(' ')[0] : '')}${w?.tempo ? ` · ${esc(w.tempo)}` : ''}</small></button>`;
    }).join('') || `<p class="olo-muto">Nessun incantesimo conosciuto di livello ${L}. Aggiungili dalla scheda.</p>`;
    let dettaglio = '<p class="olo-muto">Seleziona un incantesimo.</p>';
    if (scelto) {
      const pagina = v?.pagina || scelto.nome;
      caricaDescrizione(pagina);
      const dato = (et, val) => (val ? `<div class="olo-dato"><span>${et}</span><b>${esc(val)}</b></div>` : '');
      const puoi = L === 0 || restano(L) > 0;
      dettaglio = `<div class="olo-titolo"><h2>${esc(scelto.nome)}</h2><span class="olo-liv">LIV ${L}</span></div>
        <div class="olo-dati">${dato('Scuola', v?.scuola)}${dato('Tempo di lancio', v?.tempo)}${dato('Gittata', v?.gittata)}${dato('Durata', v?.durata)}${dato('Tiro salvezza', v?.ts)}${dato('Resistenza incant.', v?.ri)}${dato('CD', L > 0 ? String(inc.cd(L)) : String(10 + c.m[CLASSI_INC[classe]]))}</div>
        ${testoOlo(pagina)}
        <div class="olo-comandi">
          <button class="olo-lancia" data-azione="sf-lancia" data-remoto data-id="${p.id}" data-classe="${esc(classe)}" data-livello="${L}" data-nome="${esc(scelto.nome)}" ${puoi ? '' : 'disabled'}>✦ ${puoi ? 'Lancia' : 'Slot esauriti'}</button>
          <a class="olo-link" href="${esc(linkWiki(pagina))}" target="_blank" rel="noopener">Apri sul wiki ↗</a>
        </div>`;
    }
    return `<div class="olo">
      <div class="olo-schermo">
        <span class="olo-angolo a1"></span><span class="olo-angolo a2"></span><span class="olo-angolo a3"></span><span class="olo-angolo a4"></span>
        <header class="olo-testa">
          <div><div class="olo-sigla">◈ ARCHIVIO ARCANO · ${esc(classe.toUpperCase())}</div><h1>${esc(p.nome)}</h1></div>
          <div class="olo-stato"><span>CD base ${10 + c.m[CLASSI_INC[classe]]}</span><span>${esc(NOMI_CAR[CLASSI_INC[classe]])} ${c.m[CLASSI_INC[classe]] >= 0 ? '+' : ''}${c.m[CLASSI_INC[classe]]}</span><span class="olo-online">● ONLINE</span></div>
        </header>
        <nav class="olo-tabs">${schede}</nav>
        <div class="olo-corpo">
          <div class="olo-elenco">${elenco}</div>
          <section class="olo-dettaglio">${dettaglio}</section>
        </div>
      </div>
    </div>`;
  }
  Object.assign(azioni, {
    'sf-olo-apri'(el) { ctx.apriLibro?.(el.dataset.id, slugClasse(el.dataset.classe), 'olografico'); },
    'sf-olo-livello'(el) { olo.livello = Number(el.dataset.livello); olo.scelto = ''; ctx.render(); },
    'sf-olo-scegli'(el) { olo.scelto = el.dataset.sp; ctx.render(); },
  });

  return {
    CAMPI_CALCOLATI,
    vistaScheda,
    vistaOlografico,
    azioni,
    moduli: {},
    calcola: (p) => calcola(p),
    // Per il tracker di combattimento: valori della scheda
    infoCombattimento(p) {
      const c = calcola(p);
      const d = dati(p);
      return {
        modIniz: c.iniz, cae: c.cae, cac: c.cac, pfMax: c.pfMax, pfAtt: c.pfAtt, psMax: c.psMax, psAtt: c.psAtt, prAtt: Math.max(0, c.prMax - n(d.pr.usati)), prMax: c.prMax,
        ts: { tempra: c.ts.tempra.tot, riflessi: c.ts.riflessi.tot, volonta: c.ts.volonta.tot },
        armi: d.armi.map((a) => { const x = c.armi.find((y) => y.id === a.id); return { id: a.id, nome: a.nome || 'Arma', colpo: x?.colpo ?? 0, danni: x?.danni || '' }; }),
        bonusAttivi: c.bonusAttivi,
      };
    },
    tira: (p, chiave) => tira(p, chiave),
    // Bonus del personaggio (per condizioni ed effetti del tracker)
    bonusDi: (p) => dati(p).bonus,
    danno: (p, q, modo) => applicaDanno(p, q, modo),
    // Nomi delle abilità del regolamento Starfinder allineati al wiki (es. "Scienza Biologica")
    migraRegolamento(r) {
      r.abilita = D.abilita.map(([nome, car]) => ({ nome, car, predefinito: '' }));
      r.risorse = [];
    },
    input(el) {
      // Filtri dell'elenco talenti: ridisegna solo l'elenco
      if (el.dataset.sfFiltro) {
        filtriTalenti[el.dataset.sfFiltro] = el.value;
        const box = document.getElementById('sf-elenco-talenti');
        if (box) box.innerHTML = listaTalentiHtml(ctx.personaggio(box.dataset.pg));
        return true;
      }
      if (el.dataset.sfInc !== undefined && el.tagName === 'SELECT') { sfogliaInc[el.dataset.sfInc] = el.value; ctx.render(); return true; }
      if (el.dataset.sfSalita) { if (salita) salita[el.dataset.sfSalita] = el.value; ctx.render(); return true; }
      if (el.dataset.sf) { applica(el); return true; }
      const sch = el.closest('[data-sf-scheda]');
      if (sch) { const p = ctx.personaggio(sch.dataset.sfScheda); if (p) aggiorna(p); }
      return false;
    },
    change(el) {
      if (el.dataset.sfSalita || el.dataset.sfFiltro || el.dataset.sfInc !== undefined) return true;
      if (el.dataset.sf) { if (el.dataset.ridisegnaSf !== undefined) ctx.render(); return true; }
      return false;
    },
  };
};
