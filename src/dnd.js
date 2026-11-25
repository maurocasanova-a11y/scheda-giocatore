'use strict';
// Scheda di D&D 5ª edizione (regole 2014) con calcoli automatici. Dati in src/dnd-dati.js (wiki Fandom italiano).
// Struttura come le schede PF1 e Starfinder: campi legati con data-dnd="percorso", data-ridisegna-dnd ridisegna,
// valori calcolati con data-dndcalc.
window.creaDND = function creaDND(ctx) {
  const { esc, uid, norm } = ctx;
  const D = window.DND_DATI || { abilita: [], classi: {}, razze: {} };
  // Fatti del Manuale del Giocatore (src/dnd-manuale.js): hanno la precedenza sui dati del wiki
  const MAN = window.DND_MANUALE || { classi: {}, razze: {}, background: {} };
  const RAZZE = Object.keys(MAN.razze).length ? MAN.razze : D.razze;
  const WIKI = 'https://dungeonsanddragons.fandom.com/it/wiki/';
  const n = (v) => (v === '' || v == null || isNaN(Number(v)) ? 0 : Number(v));
  const segno = (v) => (v >= 0 ? '+' : '') + v;
  const opz = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const CARS = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'];
  const NOMI_CAR = { FOR: 'Forza', DES: 'Destrezza', COS: 'Costituzione', INT: 'Intelligenza', SAG: 'Saggezza', CAR: 'Carisma' };
  const ABIL_CAR = { Acrobazia: 'DES', 'Addestrare Animali': 'SAG', Arcano: 'INT', Atletica: 'FOR', Furtività: 'DES', Indagare: 'INT', Inganno: 'CAR', Intimidire: 'CAR', Intrattenere: 'CAR', Intuizione: 'SAG', Medicina: 'SAG', Natura: 'INT', Percezione: 'SAG', Persuasione: 'CAR', 'Rapidità di Mano': 'DES', Religione: 'INT', Sopravvivenza: 'SAG', Storia: 'INT' };
  const ABILITA = Object.keys(ABIL_CAR);
  // Background del Manuale del Giocatore (il wiki ha solo l'Accolito, gli altri sono homebrew): solo i dati di regola
  const BACKGROUND = Object.keys(MAN.background || {}).length ? MAN.background : {
    Accolito: { abil: ['Intuizione', 'Religione'], strumenti: '', lingue: 2, privilegio: 'Rifugio dei Fedeli' },
    'Artigiano di Gilda': { abil: ['Intuizione', 'Persuasione'], strumenti: 'un tipo di strumenti da artigiano', lingue: 1, privilegio: 'Membro di una Gilda' },
    Ciarlatano: { abil: ['Inganno', 'Rapidità di Mano'], strumenti: 'kit per il camuffamento, kit da falsario', lingue: 0, privilegio: 'Falsa Identità' },
    Criminale: { abil: ['Furtività', 'Inganno'], strumenti: 'un tipo di set da gioco, arnesi da scasso', lingue: 0, privilegio: 'Contatto Criminale' },
    Eremita: { abil: ['Medicina', 'Religione'], strumenti: 'kit da erborista', lingue: 1, privilegio: 'Scoperta' },
    'Eroe Popolare': { abil: ['Addestrare Animali', 'Sopravvivenza'], strumenti: 'un tipo di strumenti da artigiano, veicoli (terrestri)', lingue: 0, privilegio: 'Ospitalità Rustica' },
    Forestiero: { abil: ['Atletica', 'Sopravvivenza'], strumenti: 'un tipo di strumento musicale', lingue: 1, privilegio: 'Viandante' },
    Intrattenitore: { abil: ['Acrobazia', 'Intrattenere'], strumenti: 'kit per il camuffamento, un tipo di strumento musicale', lingue: 0, privilegio: 'A Grande Richiesta' },
    Marinaio: { abil: ['Atletica', 'Percezione'], strumenti: 'strumenti da navigatore, veicoli (acquatici)', lingue: 0, privilegio: 'Passaggio su Nave' },
    Monello: { abil: ['Furtività', 'Rapidità di Mano'], strumenti: 'kit per il camuffamento, arnesi da scasso', lingue: 0, privilegio: 'Segreti della Città' },
    Nobile: { abil: ['Persuasione', 'Storia'], strumenti: 'un tipo di set da gioco', lingue: 1, privilegio: 'Posizione Privilegiata' },
    Sapiente: { abil: ['Arcano', 'Storia'], strumenti: '', lingue: 2, privilegio: 'Ricercatore' },
    Soldato: { abil: ['Atletica', 'Intimidire'], strumenti: 'un tipo di set da gioco, veicoli (terrestri)', lingue: 0, privilegio: 'Grado Militare' },
  };
  // Fatti del regolamento base (2014) usati dove il wiki è incompleto o formattato in modo irregolare
  const BASE = {
    Artefice: { dado: 8, ts: ['COS', 'INT'], inc: 'INT', tipo: 'mezzo-su', sotto: 3 },
    Barbaro: { dado: 12, ts: ['FOR', 'COS'], sotto: 3 },
    Bardo: { dado: 8, ts: ['DES', 'CAR'], inc: 'CAR', tipo: 'pieno', abil: ABILITA, quante: 3, sotto: 3 },
    Chierico: { dado: 8, ts: ['SAG', 'CAR'], inc: 'SAG', tipo: 'pieno', sotto: 1 },
    Druido: { dado: 8, ts: ['INT', 'SAG'], inc: 'SAG', tipo: 'pieno', sotto: 2 },
    Guerriero: { dado: 10, ts: ['FOR', 'COS'], sotto: 3 },
    Ladro: { dado: 8, ts: ['DES', 'INT'], sotto: 3 },
    Mago: { dado: 6, ts: ['INT', 'SAG'], inc: 'INT', tipo: 'pieno', abil: ['Arcano', 'Indagare', 'Intuizione', 'Medicina', 'Religione', 'Storia'], quante: 2, sotto: 2 },
    Monaco: { dado: 8, ts: ['FOR', 'DES'], sotto: 3 },
    Paladino: { dado: 10, ts: ['SAG', 'CAR'], inc: 'CAR', tipo: 'mezzo', sotto: 3 },
    Ranger: { dado: 10, ts: ['FOR', 'DES'], inc: 'SAG', tipo: 'mezzo', sotto: 3 },
    Stregone: { dado: 6, ts: ['COS', 'CAR'], inc: 'CAR', tipo: 'pieno', abil: ['Arcano', 'Inganno', 'Intimidire', 'Intuizione', 'Persuasione', 'Religione'], quante: 2, sotto: 1 },
    Warlock: { dado: 8, ts: ['SAG', 'CAR'], inc: 'CAR', tipo: 'patto', sotto: 1 },
  };
  const classeDi = (nome) => {
    const k = Object.keys(BASE).find((x) => norm(x) === norm(String(nome || '').trim()));
    if (!k) return null;
    const w = D.classi[k] || {};
    const m = MAN.classi[k] || {};
    const abil = m.abil === null ? ABILITA : m.abil || BASE[k].abil || w.abil || [];
    return { nome: k, ...w, ...BASE[k], ...m, abil, quante: m.quante || BASE[k].quante || w.quante || 2 };
  };
  // Competenze di classe nelle armi e armature (Manuale, cap. 3) e quelle che dà una classe presa in multiclasse (cap. 6)
  const SEMPLICI_MAGO = ['Balestra Leggera', 'Bastone Ferrato', 'Dardo', 'Fionda', 'Pugnale'];
  const COMPETENZE = {
    Artefice: { armi: ['semplice'], armature: ['leggera', 'media', 'scudo'], multi: { armi: [], armature: ['leggera', 'media', 'scudo'] } },
    Barbaro: { armi: ['semplice', 'guerra'], armature: ['leggera', 'media', 'scudo'], multi: { armi: ['semplice', 'guerra'], armature: ['scudo'] } },
    Bardo: { armi: ['semplice', 'Balestra a Mano', 'Spada Corta', 'Spada Lunga', 'Stocco'], armature: ['leggera'], multi: { armi: [], armature: ['leggera'], abil: 1 } },
    Chierico: { armi: ['semplice'], armature: ['leggera', 'media', 'scudo'], multi: { armi: [], armature: ['leggera', 'media', 'scudo'] } },
    Druido: { armi: ['Bastone Ferrato', 'Dardo', 'Falcetto', 'Fionda', 'Giavellotto', 'Lancia', 'Mazza', 'Pugnale', 'Randello', 'Scimitarra'], armature: ['leggera', 'media', 'scudo'], multi: { armi: [], armature: ['leggera', 'media', 'scudo'] } },
    Guerriero: { armi: ['semplice', 'guerra'], armature: ['leggera', 'media', 'pesante', 'scudo'], multi: { armi: ['semplice', 'guerra'], armature: ['leggera', 'media', 'scudo'] } },
    Ladro: { armi: ['semplice', 'Balestra a Mano', 'Spada Corta', 'Spada Lunga', 'Stocco'], armature: ['leggera'], multi: { armi: [], armature: ['leggera'], abil: 1 } },
    Mago: { armi: SEMPLICI_MAGO, armature: [], multi: { armi: [], armature: [] } },
    Monaco: { armi: ['semplice', 'Spada Corta'], armature: [], multi: { armi: ['semplice', 'Spada Corta'], armature: [] } },
    Paladino: { armi: ['semplice', 'guerra'], armature: ['leggera', 'media', 'pesante', 'scudo'], multi: { armi: ['semplice', 'guerra'], armature: ['leggera', 'media', 'scudo'] } },
    Ranger: { armi: ['semplice', 'guerra'], armature: ['leggera', 'media', 'scudo'], multi: { armi: ['semplice', 'guerra'], armature: ['leggera', 'media', 'scudo'], abil: 1 } },
    Stregone: { armi: SEMPLICI_MAGO, armature: [], multi: { armi: [], armature: [] } },
    Warlock: { armi: ['semplice'], armature: ['leggera'], multi: { armi: ['semplice'], armature: ['leggera'] } },
  };
  // Sottoclassi che danno competenze in più (Manuale): domini del chierico, Collegio del Valore
  const COMPETENZE_SOTTO = [
    [/Dominio della (Guerra|Tempesta)/i, { armi: ['guerra'], armature: ['pesante'] }],
    [/Dominio della (Vita|Natura)/i, { armi: [], armature: ['pesante'] }],
    [/Collegio del Valore/i, { armi: ['guerra'], armature: ['media', 'scudo'] }],
  ];
  const sottoclasse = (d, classe, re) => d.classi.some((cl) => classeDi(cl.nome)?.nome === classe && re.test(cl.sottoclasse || ''));
  function competenzeDi(d) {
    const armi = new Set(), armature = new Set();
    d.classi.forEach((cl, i) => {
      const k = classeDi(cl.nome)?.nome;
      const c = COMPETENZE[k];
      if (!c) return;
      const fonte = i === 0 ? c : c.multi;
      fonte.armi.forEach((x) => armi.add(x));
      fonte.armature.forEach((x) => armature.add(x));
      for (const [re, extra] of COMPETENZE_SOTTO) if (re.test(cl.sottoclasse || '')) { extra.armi.forEach((x) => armi.add(x)); extra.armature.forEach((x) => armature.add(x)); }
    });
    const r = razzaDi(d), s = sottoDi(d);
    for (const x of [...(r?.armi || []), ...(s?.armi || [])]) armi.add(x);
    for (const x of [...(r?.armature || []), ...(s?.armature || [])]) armature.add(x);
    return { armi, armature };
  }
  // Competenza in un'arma: per categoria (semplice / da guerra) o per nome
  function competenteArma(comp, nome) {
    const a = ARMI_BASE.find((x) => norm(x[0]) === norm(nome || ''));
    if (!a) return null; // arma non del manuale: decide il giocatore
    return comp.armi.has(a[0]) || (/^semplice/.test(a[1]) && comp.armi.has('semplice')) || (/^da guerra/.test(a[1]) && comp.armi.has('guerra'));
  }
  // Slot incantesimo per livello d'incantatore (tabella dell'incantatore multiclasse) e Magia del Patto del warlock
  const SLOT = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
  const PATTO = (L) => (L ? { slot: L >= 17 ? 4 : L >= 11 ? 3 : L >= 2 ? 2 : 1, livello: Math.min(5, Math.ceil(L / 2)) } : null);
  const TAGLIE = ['Minuscola', 'Piccola', 'Media', 'Grande', 'Enorme'];
  const CONDIZIONI = ['Accecato', 'Afferrato', 'Affascinato', 'Assordato', 'Avvelenato', 'Incapacitato', 'Invisibile', 'Paralizzato', 'Pietrificato', 'Privo di sensi', 'Prono', 'Spaventato', 'Stordito', 'Trattenuto'];
  const CAMPI_CALCOLATI = new Set(['Specie / Razza', 'Classe', 'Livello', 'Classe Armatura', 'Velocità', 'Bonus di competenza']);

  // ---- Contenuti: incantesimi e oggetti magici dal wiki (src/dnd-contenuti.js), armi e armature del regolamento base ----
  const C = window.DND_CONTENUTI || { incantesimi: [], oggetti: [] };
  const INCANTESIMI = C.incantesimi.map(([nome, livello, scuola, tempo, gittata, componenti, durata, conc, rituale, classi, wiki]) => ({ nome, livello, scuola, tempo, gittata, componenti, durata, conc, rituale, classi: classi.split(','), wiki: wiki === undefined ? nome : wiki }));
  // Pulsante "i": pagina del wiki se c'è, altrimenti solo i dati dell'incantesimo (dal manuale)
  const infoInc = (v, nome) => {
    const dati = v ? [v.scuola, v.tempo && `tempo: ${v.tempo}`, v.gittata && `gittata: ${v.gittata}`, v.componenti && `componenti: ${v.componenti}`, v.durata && `durata: ${v.durata}`].filter(Boolean).join(' · ') : '';
    return v?.wiki ? `<a class="btn-mini" href="${esc(WIKI + v.wiki.replace(/ /g, '_'))}" target="_blank" rel="noopener" title="${esc(dati ? dati + ' — ' : '')}Descrizione sul wiki">i</a>`
      : `<span class="btn-mini dnd-info-inc" title="${esc(dati || nome)} (descrizione sul Manuale del Giocatore)">i</span>`;
  };
  const incantesimoDi = (nome) => INCANTESIMI.find((x) => norm(x.nome) === norm(nome || '')) || null;
  // Lista di incantesimi usata da una classe (Cavaliere Mistico e Mistificatore Arcano usano quella del mago)
  const terzoDi = (cl) => !!cl.terzo || /Cavaliere Mistico|Mistificatore Arcano/i.test(cl.sottoclasse || '');
  const listaDi = (cl) => { const k = classeDi(cl.nome)?.nome; return k === 'Artefice' ? '' : BASE[k]?.inc ? k : terzoDi(cl) ? 'Mago' : ''; };
  // Incantatori che preparano gli incantesimi ogni giorno (gli altri li conoscono)
  const PREPARANO = { Chierico: 1, Druido: 1, Mago: 1, Paladino: 0.5, Artefice: 0.5 };
  // [nome, categoria, danni, tipo di danno, proprietà]
  const ARMI_BASE = [
    ['Ascia', 'semplice da mischia', '1d6', 'taglienti', 'leggera, lancio (6/18 m)'], ['Bastone Ferrato', 'semplice da mischia', '1d6', 'contundenti', 'versatile (1d8)'],
    ['Falcetto', 'semplice da mischia', '1d4', 'taglienti', 'leggera'], ['Giavellotto', 'semplice da mischia', '1d6', 'perforanti', 'lancio (9/36 m)'],
    ['Lancia', 'semplice da mischia', '1d6', 'perforanti', 'lancio (6/18 m), versatile (1d8)'], ['Martello Leggero', 'semplice da mischia', '1d4', 'contundenti', 'leggera, lancio (6/18 m)'],
    ['Mazza', 'semplice da mischia', '1d6', 'contundenti', ''], ['Pugnale', 'semplice da mischia', '1d4', 'perforanti', 'accurata, leggera, lancio (6/18 m)'],
    ['Randello', 'semplice da mischia', '1d4', 'contundenti', 'leggera'], ['Randello Pesante', 'semplice da mischia', '1d8', 'contundenti', 'a due mani'],
    ['Arco Corto', 'semplice a distanza', '1d6', 'perforanti', 'munizioni (24/96 m), a due mani'], ['Balestra Leggera', 'semplice a distanza', '1d8', 'perforanti', 'munizioni (24/96 m), ricarica, a due mani'],
    ['Dardo', 'semplice a distanza', '1d4', 'perforanti', 'accurata, lancio (6/18 m)'], ['Fionda', 'semplice a distanza', '1d4', 'contundenti', 'munizioni (9/36 m)'],
    ['Alabarda', 'da guerra da mischia', '1d10', 'taglienti', 'pesante, portata, a due mani'], ['Ascia Bipenne', 'da guerra da mischia', '1d12', 'taglienti', 'pesante, a due mani'],
    ['Ascia da Battaglia', 'da guerra da mischia', '1d8', 'taglienti', 'versatile (1d10)'], ['Falcione', 'da guerra da mischia', '1d10', 'taglienti', 'pesante, portata, a due mani'],
    ['Frusta', 'da guerra da mischia', '1d4', 'taglienti', 'accurata, portata'], ['Lancia da Cavaliere', 'da guerra da mischia', '1d12', 'perforanti', 'portata, speciale'],
    ['Maglio', 'da guerra da mischia', '2d6', 'contundenti', 'pesante, a due mani'], ['Martello da Guerra', 'da guerra da mischia', '1d8', 'contundenti', 'versatile (1d10)'],
    ['Mazzafrusto', 'da guerra da mischia', '1d8', 'contundenti', ''], ['Morning Star', 'da guerra da mischia', '1d8', 'perforanti', ''],
    ['Picca', 'da guerra da mischia', '1d10', 'perforanti', 'pesante, portata, a due mani'], ['Piccone da Guerra', 'da guerra da mischia', '1d8', 'perforanti', ''],
    ['Scimitarra', 'da guerra da mischia', '1d6', 'taglienti', 'accurata, leggera'], ['Spada Corta', 'da guerra da mischia', '1d6', 'perforanti', 'accurata, leggera'],
    ['Spada Lunga', 'da guerra da mischia', '1d8', 'taglienti', 'versatile (1d10)'], ['Spadone', 'da guerra da mischia', '2d6', 'taglienti', 'pesante, a due mani'],
    ['Stocco', 'da guerra da mischia', '1d8', 'perforanti', 'accurata'], ['Tridente', 'da guerra da mischia', '1d6', 'perforanti', 'lancio (6/18 m), versatile (1d8)'],
    ['Arco Lungo', 'da guerra a distanza', '1d8', 'perforanti', 'munizioni (45/180 m), pesante, a due mani'], ['Balestra a Mano', 'da guerra a distanza', '1d6', 'perforanti', 'munizioni (9/36 m), leggera, ricarica'],
    ['Balestra Pesante', 'da guerra a distanza', '1d10', 'perforanti', 'munizioni (30/120 m), pesante, ricarica, a due mani'], ['Cerbottana', 'da guerra a distanza', '1', 'perforanti', 'munizioni (7,5/30 m), ricarica'],
    ['Rete', 'da guerra a distanza', '', '', 'speciale, lancio (1,5/4,5 m)'],
  ];
  // [nome, tipo, CA base, svantaggio a Furtività, Forza richiesta] (Manuale, cap. 5)
  const ARMATURE_BASE = [
    ['Imbottita', 'leggera', 11, 1], ['Cuoio', 'leggera', 11, 0], ['Cuoio Borchiato', 'leggera', 12, 0],
    ['Pelle', 'media', 12, 0], ['Giaco di Maglia', 'media', 13, 0], ['Corazza di Scaglie', 'media', 14, 1], ['Corazza di Piastre', 'media', 14, 0], ['Mezza Armatura', 'media', 15, 1],
    ['Corazza ad Anelli', 'pesante', 14, 1], ['Cotta di Maglia', 'pesante', 16, 1, 13], ['Corazza a Strisce', 'pesante', 17, 1, 15], ['Armatura Completa', 'pesante', 18, 1, 15],
    ['Scudo', 'scudo', 2, 0],
  ];
  const sfoglia = {}; // classe -> livello mostrato nell'elenco
  const filtroInc = {}; // classe -> testo cercato

  // ---- Dati del personaggio ----
  const predefiniti = () => ({
    razza: { nome: '', sotto: '', scelte: [], inclusi: false }, background: '', classi: [],
    pf: { attuali: '', temp: '', metodo: 'media', varie: '' }, dadiUsati: {}, ispirazione: false, morte: { successi: 0, fallimenti: 0 }, indebolimento: 0,
    ts: {}, abil: {}, iniz: { varie: '' }, ca: { varie: '' }, armi: [], armature: [], capacita: [], oggetti: [], monete: { mp: '', mo: '', ma: '', mr: '' },
    slotUsati: {}, pattoUsati: 0, incantesimi: [], condizioni: [], risorseUsate: {},
  });
  function dati(p) {
    if (!p.dnd) {
      p.dnd = predefiniti();
      const r = Object.keys(RAZZE).find((k) => norm(k) === norm(p.campi?.['Specie / Razza'] || ''));
      if (r) { p.dnd.razza.nome = r; p.dnd.razza.inclusi = true; }
      const k = classeDi(p.campi?.Classe);
      if (k) p.dnd.classi.push({ id: uid(), nome: k.nome, livello: Math.max(1, parseInt(p.campi?.Livello, 10) || 1), sottoclasse: '', terzo: false });
      p.dnd.background = p.campi?.Background || '';
    }
    const d = p.dnd;
    const def = predefiniti();
    for (const key of Object.keys(def)) if (d[key] === undefined) d[key] = def[key];
    // Nomi delle sottorazze come nel Manuale (le schede vecchie usavano quelli del wiki)
    if (d.razza.sotto === 'Gnomo della foresta') d.razza.sotto = 'Gnomo delle Foreste';
    if (d.razza.nome && RAZZE[d.razza.nome] && d.razza.sotto && !RAZZE[d.razza.nome].sotto?.[d.razza.sotto]) d.razza.sotto = '';
    return d;
  }
  const razzaDi = (d) => RAZZE[d.razza?.nome] || null;
  const sottoDi = (d) => razzaDi(d)?.sotto?.[d.razza?.sotto] || null;
  const livelloTot = (d) => d.classi.reduce((a, c) => a + n(c.livello), 0);
  const competenza = (liv) => 2 + Math.floor((Math.max(1, liv) - 1) / 4);
  const rigaClasse = (cl) => { const k = classeDi(cl.nome); return k?.righe?.[Math.min(20, n(cl.livello)) - 1] || null; };

  // ---- Calcoli ----
  function calcola(p) {
    const d = dati(p);
    const razza = razzaDi(d);
    const sotto = sottoDi(d);
    const liv = livelloTot(d);
    const comp = competenza(liv);
    const base = {}, punteggio = {}, m = {};
    for (const s of CARS) {
      const v = p.caratteristiche?.[s];
      base[s] = v === '' || v == null ? 10 : n(v);
      const mr = razza && !d.razza.inclusi ? n(razza.car[s]) + n(sotto?.car?.[s]) + (d.razza.scelte.includes(s) ? 1 : 0) : 0;
      punteggio[s] = Math.min(30, base[s] + mr);
      m[s] = Math.floor((punteggio[s] - 10) / 2);
    }
    const prima = classeDi(d.classi[0]?.nome);
    const livDi = (nome) => d.classi.filter((cl) => classeDi(cl.nome)?.nome === nome).reduce((a, cl) => a + n(cl.livello), 0);
    const haTalento = (re) => d.capacita.some((x) => re.test(x.nome || ''));
    const esaurimento = n(d.indebolimento);
    // Tiri salvezza: competenze della prima classe (regola del multiclasse) più quelle segnate a mano;
    // Anima Adamantina (monaco 14°): competenza in tutti; Aura di Protezione (paladino 6°): + mod. di Carisma (minimo +1)
    const animaAdamantina = livDi('Monaco') >= 14;
    const aura = livDi('Paladino') >= 6 ? Math.max(1, m.CAR) : 0;
    const ts = {};
    for (const s of CARS) {
      const auto = !!prima?.ts.includes(s) || animaAdamantina;
      const c = auto || !!d.ts[s]?.comp;
      ts[s] = { comp: c, auto, tot: m[s] + (c ? comp : 0) + aura + n(d.ts[s]?.varie) };
    }
    // Abilità: competenze della razza (automatiche), segnate a mano (classe, background…), maestria (doppia);
    // Factotum del bardo dal 2° livello: metà competenza (per difetto) alle prove senza competenza;
    // Atleta Straordinario del Campione (guerriero 7°): metà competenza (per eccesso) alle prove di FOR, DES e COS senza competenza
    const factotum = livDi('Bardo') >= 2;
    const atleta = livDi('Guerriero') >= 7 && sottoclasse(d, 'Guerriero', /Campione/i);
    const daRazza = new Set([...(razza?.abil || []), ...(sotto?.abil || [])]);
    // Armatura indossata: competenza, Forza richiesta, svantaggio alla Furtività
    const competenze = competenzeDi(d);
    const arm = d.armature.filter((a) => a.indossata && a.tipo !== 'scudo')[0];
    const scudiIndossati = d.armature.filter((a) => a.indossata && a.tipo === 'scudo');
    const nonCompetente = [arm, ...scudiIndossati].filter((a) => a && d.classi.length && !competenze.armature.has(a.tipo)).map((a) => a.nome || a.tipo);
    const svantaggioFurtivita = [arm, ...scudiIndossati].some((a) => a?.furtivita);
    const abil = {};
    for (const a of ABILITA) {
      const s = d.abil[a] || {};
      const razziale = daRazza.has(a);
      const molt = s.maestria ? 2 : s.comp || razziale ? 1 : 0;
      const fisico = ['FOR', 'DES', 'COS'].includes(ABIL_CAR[a]);
      const meta = !molt ? (atleta && fisico ? Math.ceil(comp / 2) : factotum ? Math.floor(comp / 2) : 0) : 0;
      abil[a] = { comp: !!s.comp || razziale, razziale, maestria: !!s.maestria, tot: m[ABIL_CAR[a]] + molt * comp + meta + n(s.varie), svantaggio: a === 'Furtività' && svantaggioFurtivita };
    }
    const passiva = 10 + abil.Percezione.tot + (haTalento(/^osservatore\b/i) ? 5 : 0);
    // Punti ferita: massimo del dado al 1° livello, poi media (dado/2 + 1) o massimo per livello, + COS per livello;
    // Robustezza Nanica (+1/livello), Resilienza Draconica dello stregone (+1 per livello da stregone), talento Robusto (+2/livello)
    let pfMax = 0;
    d.classi.forEach((cl, i) => {
      const k = classeDi(cl.nome);
      const dado = k?.dado || 8;
      for (let l = 0; l < n(cl.livello); l++) pfMax += i === 0 && l === 0 ? dado : d.pf.metodo === 'massimo' ? dado : Math.floor(dado / 2) + 1;
    });
    pfMax += m.COS * liv + n(d.pf.varie);
    if (d.razza.sotto === 'Nano delle Colline') pfMax += liv;
    const draconico = sottoclasse(d, 'Stregone', /Discendenza Draconica/i);
    if (draconico) pfMax += livDi('Stregone');
    if (haTalento(/^robusto\b/i)) pfMax += 2 * liv;
    pfMax = Math.max(liv ? 1 : 0, pfMax);
    if (esaurimento >= 4) pfMax = Math.floor(pfMax / 2); // indebolimento 4: PF massimi dimezzati
    const pfAtt = d.pf.attuali === '' ? pfMax : Math.min(pfMax, n(d.pf.attuali));
    // Classe armatura: armatura indossata (leggera + DES, media + DES max 2, pesante), scudo, difese senza armatura
    const scudo = scudiIndossati.reduce((a, x) => a + n(x.ca) + n(x.magia), 0);
    const opzioni = [];
    if (arm) opzioni.push([n(arm.ca) + n(arm.magia) + (arm.tipo === 'leggera' ? m.DES : arm.tipo === 'media' ? Math.min(haTalento(/^esperto delle armature medie/i) ? 3 : 2, m.DES) : 0), arm.nome || 'armatura']);
    else {
      opzioni.push([10 + m.DES, 'senza armatura']);
      if (livDi('Barbaro')) opzioni.push([10 + m.DES + m.COS, 'Difesa Senza Armatura (barbaro)']);
      if (livDi('Monaco') && !scudo) opzioni.push([10 + m.DES + m.SAG, 'Difesa Senza Armatura (monaco)']);
      if (draconico) opzioni.push([13 + m.DES, 'Resilienza Draconica']);
    }
    const migliore = opzioni.reduce((a, b) => (b[0] > a[0] ? b : a));
    const ca = migliore[0] + scudo + n(d.ca.varie);
    // Iniziativa: DES, Factotum / Atleta Straordinario (è una prova di Destrezza), talento Allerta (+5)
    const iniz = m.DES + (atleta ? Math.ceil(comp / 2) : factotum ? Math.floor(comp / 2) : 0) + (haTalento(/^allerta\b/i) ? 5 : 0) + n(d.iniz.varie);
    // Velocità: razza; armatura pesante senza la Forza richiesta −3 m (non per i nani); Movimento Veloce del barbaro (5°, senza
    // armatura pesante); Movimento Senza Armatura del monaco (2°, senza armatura né scudo); indebolimento 2 (dimezzata) e 5 (0)
    let vel = n(sotto?.vel) || n(razza?.vel) || 9;
    const note = [];
    const forzaRichiesta = arm && arm.tipo === 'pesante' ? n(arm.forza) || n(ARMATURE_BASE.find((x) => norm(x[0]) === norm(arm.nome || ''))?.[4]) : 0;
    if (forzaRichiesta && punteggio.FOR < forzaRichiesta && !razza?.pesante) { vel -= 3; note.push(`armatura pesante senza FOR ${forzaRichiesta}: −3 m`); }
    if (livDi('Barbaro') >= 5 && arm?.tipo !== 'pesante') { vel += 3; note.push('Movimento Veloce +3 m'); }
    const lm = livDi('Monaco');
    if (lm >= 2 && !arm && !scudo) { const extra = lm >= 18 ? 9 : lm >= 14 ? 7.5 : lm >= 10 ? 6 : lm >= 6 ? 4.5 : 3; vel += extra; note.push(`Movimento Senza Armatura +${String(extra).replace('.', ',')} m`); }
    if (haTalento(/^mobile\b/i)) { vel += 3; note.push('talento Mobile +3 m'); }
    if (esaurimento >= 5) { vel = 0; note.push('indebolimento 5: velocità 0'); } else if (esaurimento >= 2) { vel = vel / 2; note.push('indebolimento: velocità dimezzata'); }
    // Attacchi: FOR (o DES per armi a distanza/accurate), + competenza se competente, + bonus magico.
    // Le armi del manuale sono competenti o no in base a classe e razza (si può forzare a mano)
    const armi = d.armi.map((a) => {
      const car = a.car === 'accurata' ? (m.DES > m.FOR ? 'DES' : 'FOR') : a.car || 'FOR';
      const auto = competenteArma(competenze, a.nome);
      const ok = a.compForzata === true || a.compForzata === false ? a.compForzata : auto ?? a.comp !== false;
      const colpo = m[car] + (ok ? comp : 0) + n(a.magia) + n(a.bonus);
      const danniB = m[car] + n(a.magia) + n(a.bonusDanni);
      return { id: a.id, colpo, comp: ok, auto, danni: `${a.danni || '1d4'}${danniB ? (danniB > 0 ? '+' : '') + danniB : ''}${a.tipoDanno ? ' ' + a.tipoDanno : ''}`, car };
    });
    // Incantesimi: CD e attacco per classe; slot dalla tabella dell'incantatore multiclasse
    let livInc = 0;
    const incantatori = [];
    const soloUno = d.classi.filter((cl) => { const k = classeDi(cl.nome); return k?.tipo && k.tipo !== 'patto' || terzoDi(cl); }).length === 1;
    for (const cl of d.classi) {
      const k = classeDi(cl.nome);
      const L = n(cl.livello);
      if (!k) continue;
      if (k.tipo === 'pieno') livInc += L;
      else if (k.tipo === 'mezzo') livInc += soloUno ? (L >= 2 ? Math.ceil(L / 2) : 0) : Math.floor(L / 2);
      else if (k.tipo === 'mezzo-su') livInc += Math.ceil(L / 2);
      else if (terzoDi(cl)) livInc += soloUno ? (L >= 3 ? Math.ceil(L / 3) : 0) : Math.floor(L / 3);
      const car = k.inc || (terzoDi(cl) ? 'INT' : '');
      if (car) {
        // Quanti incantesimi preparare (mod. + livello, o metà livello per paladino e artefice) o quanti se ne conoscono (tabella di classe)
        const riga = rigaClasse(cl) || [];
        const col = (re) => { const i = (k.colonne || []).findIndex((x) => re.test(x)); return i >= 0 ? n(String(riga[i]).replace(/[^\d]/g, '')) : null; };
        // paladino: metà livello per difetto; artefice: metà livello per eccesso
        const prep = PREPARANO[k.nome] ? Math.max(1, m[car] + (k.nome === 'Artefice' ? Math.ceil(L / 2) : Math.floor(L * PREPARANO[k.nome]))) : null;
        incantatori.push({ classe: k.nome, idClasse: cl.id, lista: listaDi(cl), car, cd: 8 + comp + m[car], attacco: comp + m[car], prep, trucchetti: col(/Trucchetti/i), conosciuti: prep ? null : col(/Incantesimi Conosciuti/i) });
      }
    }
    const slot = SLOT[Math.min(20, livInc)] || [];
    const lw = d.classi.find((cl) => classeDi(cl.nome)?.nome === 'Warlock');
    const patto = lw ? PATTO(n(lw.livello)) : null;
    // Dadi vita per tipo
    const dadi = {};
    for (const cl of d.classi) { const k = classeDi(cl.nome); if (k) dadi[k.dado] = (dadi[k.dado] || 0) + n(cl.livello); }
    return { base, punteggio, m, liv, comp, ts, abil, passiva, pfMax, pfAtt, ca, caFonte: migliore[1], iniz, vel, noteVel: note, armi, incantatori, slot, patto, dadi, factotum, atleta,
      competenze, nonCompetente, aura, animaAdamantina, risorse: risorseDi(d, m, livDi) };
  }
  // Risorse di classe da segnare (Manuale, cap. 3): usi, dado o riserva; si recuperano con un riposo breve o lungo
  function risorseDi(d, m, livDi) {
    const r = [];
    const add = (chiave, nome, max, riposo, nota = '') => { if (max) r.push({ chiave, nome, max, riposo, nota }); };
    const lb = livDi('Barbaro');
    if (lb >= 20) r.push({ chiave: 'ira', nome: 'Ira', max: 0, riposo: '', nota: "ire illimitate · danni dell'ira +4" });
    else if (lb) add('ira', 'Ira', lb >= 17 ? 6 : lb >= 12 ? 5 : lb >= 6 ? 4 : lb >= 3 ? 3 : 2, 'lungo', `danni dell'ira ${lb >= 16 ? '+4' : lb >= 9 ? '+3' : '+2'}`);
    const lbd = livDi('Bardo');
    if (lbd) add('ispirazione', 'Ispirazione Bardica', Math.max(1, m.CAR), lbd >= 5 ? 'breve' : 'lungo', `dado d${lbd >= 15 ? 12 : lbd >= 10 ? 10 : lbd >= 5 ? 8 : 6}${lbd >= 2 ? ` · Canto di Riposo d${lbd >= 17 ? 12 : lbd >= 13 ? 10 : lbd >= 9 ? 8 : 6}` : ''}`);
    const lc = livDi('Chierico');
    if (lc >= 2) add('incanalare-chierico', 'Incanalare Divinità', lc >= 18 ? 3 : lc >= 6 ? 2 : 1, 'breve', lc >= 5 ? `Distruggere Non Morti GS ${lc >= 17 ? 4 : lc >= 14 ? 3 : lc >= 11 ? 2 : lc >= 8 ? 1 : '1/2'}` : '');
    if (lc >= 10) add('intervento', 'Intervento Divino', 1, 'lungo', lc >= 20 ? 'riesce sempre' : `riesce con d100 ≤ ${lc}; se riesce, 7 giorni di attesa`);
    const ld = livDi('Druido');
    if (ld >= 20) r.push({ chiave: 'forma', nome: 'Forma Selvatica', max: 0, riposo: '', nota: 'usi illimitati (Arcidruido)' });
    if (ld >= 2 && ld < 20) add('forma', 'Forma Selvatica', 2, 'breve', `GS massimo ${ld >= 8 ? 1 : ld >= 4 ? '1/2' : '1/4'}${ld >= 8 ? ', volo' : ld >= 4 ? ', nuoto' : ''}`);
    const lg = livDi('Guerriero');
    if (lg) add('recuperare', 'Recuperare Energie', 1, 'breve', `1d10 + ${lg} PF`);
    if (lg >= 2) add('impetuosa', 'Azione Impetuosa', lg >= 17 ? 2 : 1, 'breve');
    if (lg >= 9) add('indomito', 'Indomito', lg >= 17 ? 3 : lg >= 13 ? 2 : 1, 'lungo');
    const lm = livDi('Monaco');
    if (lm >= 2) add('ki', 'Punti Ki', lm, 'breve', `arti marziali ${lm >= 17 ? '1d10' : lm >= 11 ? '1d8' : lm >= 5 ? '1d6' : '1d4'} · CD ki ${8 + 2 + Math.floor((Math.max(1, d.classi.reduce((a, c) => a + n(c.livello), 0)) - 1) / 4) + m.SAG}`);
    const lp = livDi('Paladino');
    if (lp) { add('mani', 'Imposizione delle Mani', 5 * lp, 'lungo', 'riserva di PF'); add('divino', 'Percezione del Divino', 1 + Math.max(0, m.CAR), 'lungo'); }
    if (lp >= 3) add('incanalare-paladino', 'Incanalare Divinità', 1, 'breve');
    const ls = livDi('Stregone');
    if (ls >= 2) add('stregoneria', 'Punti Stregoneria', ls, 'lungo');
    const lw = livDi('Warlock');
    for (const [L, liv] of [[11, 6], [13, 7], [15, 8], [17, 9]]) if (lw >= L) add(`arcanum${liv}`, `Arcanum Mistico (${liv}°)`, 1, 'lungo');
    const lmg = livDi('Mago');
    if (lmg) add('recupero', 'Recupero Arcano', 1, 'lungo', `slot per un totale di ${Math.ceil(lmg / 2)} livell${Math.ceil(lmg / 2) === 1 ? 'o' : 'i'} (nessuno di 6° o più)`);
    const ll = livDi('Ladro');
    if (ll) r.push({ chiave: 'furtivo', nome: 'Attacco Furtivo', max: 0, riposo: '', nota: `${Math.ceil(ll / 2)}d6 una volta per turno` });
    return r;
  }
  function mappa(c) {
    const o = { liv: String(c.liv), comp: segno(c.comp), ca: String(c.ca), iniz: segno(c.iniz), pfmax: String(c.pfMax), passiva: String(c.passiva) };
    for (const s of CARS) { o['mod:' + s] = segno(c.m[s]); o['eff:' + s] = c.punteggio[s] !== c.base[s] ? `→ ${c.punteggio[s]}` : ''; o['ts:' + s] = segno(c.ts[s].tot); }
    for (const [k, v] of Object.entries(c.abil)) o['abil:' + k] = segno(v.tot);
    for (const a of c.armi) { o[`arma:${a.id}:colpo`] = segno(a.colpo); o[`arma:${a.id}:danni`] = a.danni; }
    return o;
  }
  function aggiorna(p) {
    const v = mappa(calcola(p));
    document.querySelectorAll('[data-dndcalc]').forEach((el) => { if (el.dataset.dndcalc in v) el.textContent = v[el.dataset.dndcalc]; });
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
    if (el.classList?.contains('dnd-sez')) { if (el.open) chiuse.delete(el.dataset.sez); else chiuse.add(el.dataset.sez); }
  }, true);
  let salita = null;

  function vistaScheda(p) {
    const d = dati(p);
    const c = calcola(p);
    const v = mappa(c);
    const id = p.id;
    const k = (chiave) => `<span data-dndcalc="${esc(chiave)}">${esc(v[chiave] ?? '')}</span>`;
    const campo = (perc, val, extra = '') => `<input data-dnd="${esc(perc)}" data-id="${id}" value="${esc(val ?? '')}" ${extra}>`;
    const num = (perc, val, extra = '') => campo(perc, val, `type="number" data-tipo="numero" ${extra}`);
    const chk = (perc, val, extra = '') => `<input type="checkbox" data-dnd="${esc(perc)}" data-id="${id}" ${val ? 'checked' : ''} ${extra}>`;
    const sel = (perc, lista, val, extra = '') => `<select data-dnd="${esc(perc)}" data-id="${id}" ${extra}>${opz(lista, val)}</select>`;
    const togli = (lista, elem) => `<button class="btn-x" data-azione="dnd-rimuovi" data-id="${id}" data-lista="${esc(lista)}" data-elem="${esc(elem)}" title="Rimuovi">×</button>`;
    const aggiungi = (lista, testo) => `<button class="btn-piccolo" data-azione="dnd-aggiungi" data-id="${id}" data-lista="${lista}">+ ${testo}</button>`;
    const dado = (tiro, titolo) => `<button class="btn-dado" data-azione="dnd-tira" data-id="${id}" data-tiro="${esc(tiro)}" title="Tira: ${esc(titolo)} (Maiusc = vantaggio, Ctrl = svantaggio)">🎲</button>`;
    const sezione = (chiave, titolo, corpo, extra = '') => `<details class="pannello pf-sez dnd-sez" data-sez="${chiave}" ${chiuse.has(chiave) ? '' : 'open'}><summary><h3>${titolo}</h3>${extra}</summary>${corpo}</details>`;
    const wiki = (pagina, testo = '📖 wiki') => (pagina ? `<a class="btn-piccolo" href="${esc(WIKI + pagina.replace(/ /g, '_'))}" target="_blank" rel="noopener" title="Apri la pagina sul wiki">${testo}</a>` : '');
    const razza = razzaDi(d);
    const sotto = sottoDi(d);

    // Razza e background
    const sceltaCar = razza?.scelta ? `<div class="pf-riga"><span class="muto">+1 a ${razza.scelta} caratteristiche a scelta:</span> ${CARS.filter((s) => !n(razza.car[s])).map((s) => `<label class="pf-chk"><input type="checkbox" data-azione="dnd-scelta-car" data-id="${id}" data-car="${s}" ${d.razza.scelte.includes(s) ? 'checked' : ''}> ${s}</label>`).join('')} <span class="muto">${d.razza.scelte.length}/${razza.scelta}</span></div>` : '';
    const corpoRazza = `<div class="pf-riga">
        <label>Razza ${sel('razza|nome', [['', '— scegli —'], ...Object.keys(RAZZE).map((x) => [x, x])], d.razza.nome, 'data-ridisegna-dnd')}</label>
        ${razza && Object.keys(razza.sotto).length ? `<label>${esc(razza.etichettaSotto || 'Sottorazza')} ${sel('razza|sotto', [['', '— scegli —'], ...Object.keys(razza.sotto).map((x) => [x, x])], d.razza.sotto, 'data-ridisegna-dnd')}</label>` : ''}
        ${razza ? wiki(d.razza.nome) : ''}
        <label>Background ${sel('background', [['', '— scegli —'], ...Object.keys(BACKGROUND).map((x) => [x, x]), ...(d.background && !BACKGROUND[d.background] ? [[d.background, d.background]] : []), ['…', 'Altro (scrivi tu)']], d.background, 'data-ridisegna-dnd')}</label>
        ${d.bgLibero || (d.background && !BACKGROUND[d.background]) ? `<label>Nome del background ${campo('background', d.background, 'class="pf-largo" placeholder="es. Cacciatore di Taglie" data-ridisegna-dnd')}</label>` : ''}
        ${d.background === 'Accolito' ? wiki('Personalità e Background') : ''}
      </div>${sceltaCar}
      ${BACKGROUND[d.background] ? (() => { const b = BACKGROUND[d.background]; return `<div class="fede-righe"><div><span class="muto">Competenze</span> ${esc(b.abil.join(', '))}${b.strumenti ? ` · <span class="muto">Strumenti</span> ${esc(b.strumenti)}` : ''}${b.lingue ? ` · <span class="muto">Linguaggi</span> ${b.lingue === 1 ? 'uno' : 'due'} a scelta` : ''}</div>
        <div><span class="muto">Privilegio</span> ${esc(b.privilegio)}</div></div>`; })() : ''}
      ${razza ? `<div class="fede-righe"><div><span class="muto">Aumenti</span> ${esc(Object.entries({ ...razza.car }).map(([s, x]) => `${NOMI_CAR[s]} +${x}`).concat(Object.entries(sotto?.car || {}).map(([s, x]) => `${NOMI_CAR[s]} +${x} (sottorazza)`)).join(', ') || '—')}
        · <span class="muto">Taglia</span> ${esc(razza.taglia)} · <span class="muto">Velocità</span> ${String(c.vel).replace('.', ',')} m</div>
        <div><span class="muto">Tratti</span> ${esc([...razza.tratti, ...(sotto?.tratti || [])].join(', ') || '—')}</div>
        ${[...(razza.abil || []), ...(sotto?.abil || [])].length ? `<div><span class="muto">Competenza</span> ${esc([...(razza.abil || []), ...(sotto?.abil || [])].join(', '))} <small class="muto">(automatica)</small></div>` : ''}
        ${razza.abilScelta ? `<div class="muto">Competenza in ${razza.abilScelta === 1 ? "un'abilità" : `${razza.abilScelta} abilità`} a scelta: spuntala tra le abilità.</div>` : ''}
        ${razza.talento ? '<div class="muto">Un talento a scelta al 1° livello: aggiungilo in «Privilegi, talenti e capacità».</div>' : ''}</div>` : ''}
      <label class="pf-chk pf-mini">${chk('razza|inclusi', d.razza.inclusi, 'data-ridisegna-dnd')} I punteggi inseriti comprendono già gli aumenti della razza</label>`;

    // Classi
    const classi = d.classi.map((cl) => {
      const kk = classeDi(cl.nome);
      return `<div class="pf-riga">
        ${sel(`classi#${cl.id}|nome`, [['', '— classe —'], ...Object.keys(BASE).map((x) => [x, x])], kk?.nome || cl.nome, 'data-ridisegna-dnd')}
        ${window.MODALITA_GIOCATORE && !window.gdr ? `<span class="pf-liv-fisso" title="Nella scheda del giocatore i livelli si prendono uno alla volta con «⬆ Sali di livello»">Livello <b>${Number(cl.livello) || 1}</b></span>`
          : `<label>Livello ${num(`classi#${cl.id}|livello`, cl.livello, 'min="1" max="20" class="pf-corto" data-ridisegna-dnd')}</label>`}
        <label>Sottoclasse ${campo(`classi#${cl.id}|sottoclasse`, cl.sottoclasse, `placeholder="${kk ? `dal ${kk.sotto}° livello` : ''}" list="dnd-sotto-${esc(kk?.nome || '')}" data-ridisegna-dnd`)}</label>
        ${kk?.sottoclassi ? `<datalist id="dnd-sotto-${esc(kk.nome)}">${kk.sottoclassi.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}
        ${kk && !kk.inc && !/Cavaliere Mistico|Mistificatore Arcano/i.test(cl.sottoclasse || '') ? `<label class="pf-chk" title="Cavaliere Mistico o Mistificatore Arcano: incantatore a un terzo (INT)">${chk(`classi#${cl.id}|terzo`, cl.terzo, 'data-ridisegna-dnd')} incantatore (⅓)</label>` : ''}
        ${kk ? `<span class="muto">d${kk.dado}</span>${wiki(kk.nome)}` : ''}${togli('classi', cl.id)}</div>`;
    }).join('');
    const kp = classeDi(d.classi[0]?.nome);
    const compClassi = kp ? `<div class="fede-righe"><div><span class="muto">Competenze (${esc(kp.nome)})</span> armature: ${esc(kp.armature || '—')} · armi: ${esc(kp.armi || '—')}${kp.attrezzi && kp.attrezzi !== 'Nessuno' ? ` · strumenti: ${esc(kp.attrezzi)}` : ''} · tiri salvezza: ${esc((kp.ts || []).map((x) => NOMI_CAR[x]).join(', '))}</div>${d.classi.length > 1 ? '<div class="muto">Le classi prese in multiclasse danno solo alcune competenze (Manuale, cap. 6): la scheda le conta da sola.</div>' : ''}</div>` : '';
    const corpoClassi = `${classi || '<p class="muto">Nessuna classe.</p>'}${compClassi}
      <div class="pf-piede">${window.MODALITA_GIOCATORE && !window.gdr && d.classi.length ? '<span class="muto">Le altre classi si aggiungono con «⬆ Sali di livello».</span>' : aggiungi('classi', 'Classe')}<span class="muto">Livello <b>${k('liv')}</b> · Bonus di competenza <b>${k('comp')}</b></span>
        ${GIOCATORE && mancaPerSalire(p, d).length ? '<button class="primario" disabled title="Completa prima il livello attuale">⬆ Sali di livello</button>' : `<button class="primario" data-azione="dnd-livello-apri" data-id="${id}">⬆ Sali di livello</button>`}</div>
      ${GIOCATORE && salita?.pgId !== id ? boxDaCompletare(mancaPerSalire(p, d), d.classi.length ? c.liv : 0) : ''}`;

    // Caratteristiche e tiri salvezza
    const notaTs = [c.aura ? `Aura di Protezione: +${c.aura} a tutti i tiri salvezza` : '', c.animaAdamantina ? 'Anima Adamantina: competenza in tutti i tiri salvezza' : ''].filter(Boolean).join(' · ');
    const car = CARS.map((s) => `<div class="car">
        <div class="car-sigla">${s}</div>
        <div class="car-valori"><input type="number" value="${esc(p.caratteristiche?.[s] ?? 10)}" data-bind="personaggio" data-id="${id}" data-sez="caratteristiche" data-chiave="${s}" data-tipo="numero" aria-label="${NOMI_CAR[s]}">
          <span class="car-eff">${k('eff:' + s)}</span></div><div class="car-mod">${k('mod:' + s)}</div><div class="car-nome">${NOMI_CAR[s]}</div>${dado('car:' + s, NOMI_CAR[s])}
        <div class="dnd-ts"><label class="pf-chk" title="${c.ts[s].auto ? 'Competenza della prima classe' : 'Competenza nel tiro salvezza'}">${chk(`ts|${s}|comp`, c.ts[s].comp, `${c.ts[s].auto ? 'disabled' : ''} data-ridisegna-dnd`)} TS</label> <b>${k('ts:' + s)}</b>${dado('ts:' + s, `TS su ${NOMI_CAR[s]}`)}</div></div>`).join('');

    // Salute
    const dadiVita = Object.entries(c.dadi).map(([dv, tot]) => `<span class="chip">d${dv}: <b>${tot - n(d.dadiUsati[dv])}</b>/${tot}
      <button class="btn-mini" data-azione="dnd-dado-vita" data-id="${id}" data-dado="${dv}" title="Spendi un dado vita (riposo breve): tira 1d${dv} + COS">🎲</button></span>`).join(' ');
    const pallini = (k2, quanti) => Array.from({ length: 3 }, (_, i) => `<button class="pallino${i < quanti ? ' usato' : ''}" data-azione="dnd-morte" data-id="${id}" data-k="${k2}" data-i="${i + 1}" title="${k2}"></button>`).join('');
    const corpoSalute = `<div class="pf-griglia">
      <div class="pf-box"><div class="pf-etich">Punti ferita</div>
        <div class="pf-pf">${num('pf|attuali', d.pf.attuali, `class="pf-grande" placeholder="${c.pfMax}"`)} <span class="muto">/</span> <b class="pf-max">${k('pfmax')}</b></div>
        <div class="pf-mini"><label>Temporanei ${num('pf|temp', d.pf.temp, 'class="pf-corto"')}</label><label>Varie ${num('pf|varie', d.pf.varie, 'class="pf-corto"')}</label>
          <label>Dopo il 1° liv. ${sel('pf|metodo', [['media', 'media'], ['massimo', 'massimo']], d.pf.metodo, 'data-ridisegna-dnd')}</label></div>
        <div class="pf-mini"><input type="number" min="0" class="dnd-quanti mini" placeholder="0"><button class="btn-piccolo" data-azione="dnd-danno" data-id="${id}" data-segno="-1">Danno</button><button class="btn-piccolo" data-azione="dnd-danno" data-id="${id}" data-segno="1">Cura</button></div>
        <div class="muto pf-mini">Il danno toglie prima i PF temporanei.</div></div>
      <div class="pf-box"><div class="pf-etich">Dadi vita</div><div class="pf-riga">${dadiVita || '<span class="muto">—</span>'}</div>
        <button class="btn-piccolo" data-azione="dnd-riposo-breve" data-id="${id}" title="Slot del patto e risorse che si recuperano con un riposo breve (Ki, Incanalare Divinità, Recuperare Energie…); i dadi vita si spendono qui sopra">☕ Riposo breve</button>
        <button class="btn-piccolo" data-azione="dnd-riposo-lungo" data-id="${id}" title="PF al massimo, metà dei dadi vita, slot, risorse, tiri contro la morte e un livello di indebolimento">🌙 Riposo lungo</button></div>
      <div class="pf-box"><div class="pf-etich">Tiri contro la morte</div>
        <div class="pf-riga"><span class="muto">Successi</span> <span class="pf-pallini">${pallini('successi', n(d.morte.successi))}</span></div>
        <div class="pf-riga"><span class="muto">Fallimenti</span> <span class="pf-pallini">${pallini('fallimenti', n(d.morte.fallimenti))}</span></div>
        <button class="btn-piccolo" data-azione="dnd-tira-morte" data-id="${id}">🎲 Tira contro la morte</button></div>
      <div class="pf-box"><div class="pf-etich">Altro</div>
        <label class="pf-chk">${chk('ispirazione', d.ispirazione, 'data-ridisegna-dnd')} Ispirazione</label>
        <label>Indebolimento ${sel('indebolimento', [0, 1, 2, 3, 4, 5, 6].map((x) => [x, x ? `livello ${x}` : 'nessuno']), d.indebolimento, 'data-tipo="numero" data-ridisegna-dnd')}</label>
        ${n(d.indebolimento) ? `<div class="muto pf-mini">${['', 'svantaggio alle prove di caratteristica', '+ velocità dimezzata', '+ svantaggio a tiri per colpire e tiri salvezza', '+ PF massimi dimezzati', '+ velocità ridotta a 0', 'morte'][n(d.indebolimento)]}</div>` : ''}
        <div class="pf-riga">${CONDIZIONI.map((x) => `<label class="pf-chk"><input type="checkbox" data-azione="dnd-condizione" data-id="${id}" data-nome="${x}" ${d.condizioni.includes(x) ? 'checked' : ''}> ${x}</label>`).join(' ')}</div></div>
    </div>`;

    // Difese
    const corpoDifese = `<div class="pf-griglia">
      <div class="pf-box"><div class="pf-etich">Classe armatura</div><div class="pf-valore">${k('ca')}</div><div class="muto pf-mini">${esc(c.caFonte)}</div>${c.nonCompetente.length ? `<div class="oltre pf-mini" title="Senza competenza: svantaggio alle prove, ai tiri salvezza e ai tiri per colpire con FOR o DES, e niente incantesimi">⚠ senza competenza: ${esc(c.nonCompetente.join(', '))}</div>` : ''}<div class="pf-mini"><label>Varie ${num('ca|varie', d.ca.varie, 'class="pf-corto"')}</label></div></div>
      <div class="pf-box"><div class="pf-etich">Iniziativa ${dado('iniz', 'Iniziativa')}</div><div class="pf-valore">${k('iniz')}</div><div class="pf-mini"><label>Varie ${num('iniz|varie', d.iniz.varie, 'class="pf-corto"')}</label></div></div>
      <div class="pf-box"><div class="pf-etich">Velocità</div><div class="pf-valore">${String(c.vel).replace('.', ',')} m</div>${c.noteVel.length ? `<div class="muto pf-mini">${esc(c.noteVel.join(' · '))}</div>` : ''}</div>
      <div class="pf-box"><div class="pf-etich">Percezione passiva</div><div class="pf-valore">${k('passiva')}</div></div>
    </div>`;

    // Abilità
    const prima = classeDi(d.classi[0]?.nome);
    const sceltiClasse = prima ? prima.abil.filter((a) => d.abil[a]?.comp && !(d.bgAbil || []).includes(a) && !c.abil[a].razziale).length : 0;
    const corpoAbil = `<p class="muto pf-aiuto">Spunta le competenze (●) e la maestria (★, competenza doppia).${prima ? ` ${esc(prima.nome)}: scegli ${prima.quante} tra ${esc(prima.abil.length === ABILITA.length ? 'tutte le abilità' : prima.abil.join(', '))} — scelte <b class="${sceltiClasse > prima.quante ? 'oltre' : ''}">${sceltiClasse}/${prima.quante}</b>.` : ''}${d.bgAbil?.length ? ` Dal background: ${esc(d.bgAbil.join(', '))}.` : ''}${c.factotum && !c.atleta ? " Factotum: metà competenza alle prove senza competenza (anche l'iniziativa)." : ''}${c.atleta ? " Atleta Straordinario: metà competenza (per eccesso) alle prove di FOR, DES e COS senza competenza (anche l'iniziativa)." : ''}</p>
      <div class="pf-griglia-abil">${ABILITA.map((a) => `<div class="pf-abil${c.abil[a].comp ? ' di-classe' : ''}">
        <label class="pf-chk" title="${c.abil[a].razziale ? 'Competenza della razza' : 'Competenza'}">${chk(`abil|${a}|comp`, c.abil[a].comp, `${c.abil[a].razziale ? 'disabled' : ''} data-ridisegna-dnd`)}</label>
        <label class="pf-chk" title="Maestria">${chk(`abil|${a}|maestria`, c.abil[a].maestria, 'data-ridisegna-dnd')}★</label>
        <span class="pf-abil-nome">${esc(a)} <small class="muto">${ABIL_CAR[a]}</small>${c.abil[a].svantaggio ? ' <small class="oltre" title="Svantaggio per l&#39;armatura indossata">svantaggio</small>' : ''}</span>
        <label title="Varie">${num(`abil|${a}|varie`, d.abil[a]?.varie, 'class="pf-corto"')}</label>
        <b class="pf-tot">${k('abil:' + a)}</b>${dado('abil:' + a, a)}</div>`).join('')}</div>`;

    // Attacchi
    const armi = d.armi.map((a) => `<div class="pf-arma"><div class="pf-riga">
        <input class="pf-largo" data-dnd="armi#${a.id}|nome" data-id="${id}" value="${esc(a.nome)}" placeholder="Arma">
        <label>Caratteristica ${sel(`armi#${a.id}|car`, [['FOR', 'FOR (mischia)'], ['DES', 'DES (distanza)'], ['accurata', 'accurata (la migliore)'], ...['INT', 'SAG', 'CAR'].map((x) => [x, x])], a.car, 'data-ridisegna-dnd')}</label>
        <label>Danni ${campo(`armi#${a.id}|danni`, a.danni, 'class="pf-corto" placeholder="1d8"')}</label>
        <label>Tipo ${campo(`armi#${a.id}|tipoDanno`, a.tipoDanno, 'class="pf-corto" placeholder="taglienti"')}</label>
        ${(() => { const x = c.armi.find((y) => y.id === a.id); const forzata = a.compForzata === true || a.compForzata === false; return `<label class="pf-chk" title="${x?.auto === null ? 'Arma non del manuale: decidi tu' : `Secondo classe e razza: ${x?.auto ? 'competente' : 'non competente'}`}">${chk(`armi#${a.id}|compForzata`, x?.comp, 'data-ridisegna-dnd')} competente${x?.auto !== null && forzata && a.compForzata !== x?.auto ? ' <small class="oltre">(a mano)</small>' : ''}</label>`; })()}
        <label>Magia ${num(`armi#${a.id}|magia`, a.magia, 'class="pf-corto" min="0" max="3"')}</label>
        <label>Proprietà ${campo(`armi#${a.id}|proprieta`, a.proprieta, 'class="pf-largo" placeholder="versatile, lancio (6/18 m)…"')}</label>
        ${togli('armi', a.id)}</div>
        <div class="pf-arma-tiri"><span>Colpire <b>${k(`arma:${a.id}:colpo`)}</b> ${dado('colpo:' + a.id, 'attacco')}</span><span>Danni <b>${k(`arma:${a.id}:danni`)}</b> ${dado('danni:' + a.id, 'danni')}</span></div></div>`).join('');
    const gruppiArmi = [...new Set(ARMI_BASE.map((a) => a[1]))];
    const sceltaArma = `<span class="pf-dal-wiki">dal manuale: <select id="dnd-scelta-arma-${id}"><option value="">— scegli —</option>${gruppiArmi.map((g) => `<optgroup label="Armi ${esc(g)}">${ARMI_BASE.filter((a) => a[1] === g).map((a) => `<option value="${esc(a[0])}">${esc(a[0])} (${esc(a[2] || '—')})</option>`).join('')}</optgroup>`).join('')}</select>
      <button class="btn-piccolo" data-azione="dnd-arma-base" data-id="${id}">Aggiungi</button></span>`;
    const corpoAttacchi = `${armi || '<p class="muto">Nessuna arma.</p>'}<div class="pf-piede">${aggiungi('armi', 'Arma')}${sceltaArma}<span class="muto">Colpire = caratteristica + competenza + magia; danni = caratteristica + magia.</span></div>`;

    // Incantesimi: per classe CD e attacco, incantesimi conosciuti/preparati e elenco del wiki
    const slotUsati = d.slotUsati || {};
    const maxSlot = Math.max(c.slot.length, c.patto ? c.patto.livello : 0);
    const blocchiInc = c.incantatori.map((x) => {
      const noti = d.incantesimi.filter((s) => s.classe === x.classe).sort((a, b) => a.livello - b.livello || a.nome.localeCompare(b.nome, 'it'));
      const nTrucchetti = noti.filter((s) => s.livello === 0).length;
      const nPrep = noti.filter((s) => s.livello > 0 && s.preparato).length;
      const nNoti = noti.filter((s) => s.livello > 0).length;
      const conta = [x.trucchetti != null ? `trucchetti <b class="${nTrucchetti > x.trucchetti ? 'oltre' : ''}">${nTrucchetti}/${x.trucchetti}</b>` : '',
        x.prep ? `preparati <b class="${nPrep > x.prep ? 'oltre' : ''}">${nPrep}/${x.prep}</b>` : x.conosciuti != null ? `conosciuti <b class="${nNoti > x.conosciuti ? 'oltre' : ''}">${nNoti}/${x.conosciuti}</b>` : ''].filter(Boolean).join(' · ');
      const perLiv = [...new Set(noti.map((s) => s.livello))].map((L) => `<div class="pf-riga"><b>${L ? L + '°' : 'Trucchetti'}</b> ${noti.filter((s) => s.livello === L).map((s) => {
        const v = incantesimoDi(s.nome);
        return `<span class="chip${x.prep && L > 0 && !s.preparato ? ' muto' : ''}" title="${esc(v ? [v.scuola, v.tempo, v.gittata, v.componenti, v.durata].filter(Boolean).join(' · ') : '')}">
          ${x.prep && L > 0 ? `<input type="checkbox" data-azione="dnd-prepara" data-id="${id}" data-inc="${s.id}" ${s.preparato ? 'checked' : ''} title="Preparato">` : ''}${esc(s.nome)}${v?.conc ? ' <small title="Concentrazione">Ⓒ</small>' : ''}${v?.rituale ? ' <small title="Rituale">Ⓡ</small>' : ''}
          ${infoInc(v, s.nome)}
          ${L > 0 ? `<button class="btn-mini" data-azione="dnd-lancia" data-id="${id}" data-inc="${s.id}" title="Lancia: usa lo slot più basso disponibile">✨</button>` : ''}
          <button class="chip-x" data-azione="dnd-rimuovi" data-id="${id}" data-lista="incantesimi" data-elem="${s.id}" title="Togli">×</button></span>`;
      }).join(' ')}</div>`).join('');
      const Lv = sfoglia[x.classe] ?? '';
      const q = norm(filtroInc[x.classe] || '');
      const elenco = x.lista && Lv !== '' ? INCANTESIMI.filter((v) => v.classi.includes(x.lista) && v.livello === Number(Lv) && (!q || norm(v.nome).includes(q))) : [];
      return `<h4>${esc(x.classe)} <small class="muto">${NOMI_CAR[x.car]} · CD ${x.cd} · attacco ${segno(x.attacco)}${conta ? ' · ' : ''}${conta}</small> ${dado('incatt:' + x.classe, `attacco con incantesimo (${x.classe})`)}</h4>
        ${perLiv || '<p class="muto">Nessun incantesimo: aggiungili dall\'elenco qui sotto.</p>'}
        ${x.lista ? `<div class="pf-elenco-inc"><div class="pf-riga"><b>Incantesimi da ${esc(x.lista.toLowerCase())}</b>
          <label>Livello <select data-dnd-sfoglia="${esc(x.classe)}">${opz([['', '— chiuso —'], ...Array.from({ length: maxSlot + 1 }, (_, i) => [String(i), i ? `${i}°` : 'trucchetti'])], Lv)}</select></label>
          ${Lv !== '' ? `<label>Cerca <input type="search" data-dnd-cerca="${esc(x.classe)}" value="${esc(filtroInc[x.classe] || '')}"></label><span class="muto">${elenco.length} incantesimi</span>` : `<span class="muto">${INCANTESIMI.filter((v) => v.classi.includes(x.lista)).length} incantesimi (Manuale del Giocatore)</span>`}</div>
          ${elenco.length ? `<div class="pf-voci-inc">${elenco.map((v) => {
            const preso = noti.some((s) => s.nome === v.nome);
            return `<div class="pf-voce-inc${preso ? ' presa' : ''}"><button class="btn-mini" data-azione="dnd-inc-aggiungi" data-id="${id}" data-classe="${esc(x.classe)}" data-nome="${esc(v.nome)}" data-livello="${v.livello}" ${preso ? 'disabled' : ''}>+</button>
              <span>${esc(v.nome)}${v.conc ? ' <small>Ⓒ</small>' : ''}${v.rituale ? ' <small>Ⓡ</small>' : ''}</span><small class="muto">${esc(v.scuola)}</small>
              ${infoInc(v, v.nome)}</div>`;
          }).join('')}</div>` : ''}</div>` : ''}`;
    }).join('');
    const corpoInc = c.incantatori.length || c.patto ? `${blocchiInc}
      ${c.slot.length ? `<div class="pf-riga">${c.slot.map((tot, i) => `<span class="chip">${i + 1}°: <b>${Math.max(0, tot - n(slotUsati[i + 1]))}</b>/${tot}
        <button class="btn-mini" data-azione="dnd-slot" data-id="${id}" data-l="${i + 1}" data-d="1" title="Usa uno slot">−</button><button class="btn-mini" data-azione="dnd-slot" data-id="${id}" data-l="${i + 1}" data-d="-1" title="Recupera">+</button></span>`).join(' ')}</div>` : ''}
      ${c.patto ? `<div class="pf-riga"><b>Magia del Patto</b> <span class="chip">${c.patto.slot - n(d.pattoUsati)}/${c.patto.slot} slot di ${c.patto.livello}° <button class="btn-mini" data-azione="dnd-patto" data-id="${id}" data-d="1">−</button><button class="btn-mini" data-azione="dnd-patto" data-id="${id}" data-d="-1">+</button></span> <span class="muto">si recuperano con un riposo breve</span></div>` : ''}
      <p class="muto pf-aiuto">Slot calcolati con la tabella dell'incantatore multiclasse (incantatori completi, a metà e a un terzo); il warlock ha gli slot del patto a parte.</p>` : '';

    // Capacità: privilegi dalle tabelle di classe + talenti e capacità scritte
    const privilegi = d.classi.map((cl) => {
      const kk = classeDi(cl.nome);
      const righe = kk?.righe?.slice(0, n(cl.livello)) || [];
      const iP = (kk?.colonne || []).findIndex((x) => /Privileg/i.test(x));
      const tutti = iP < 0 ? [] : [...new Set(righe.flatMap((r) => String(r[iP]).split(/,\s*/)).map((x) => x.replace(/"/g, '').trim()).filter((x) => x && !/^[-—─]+$/.test(x)))];
      return tutti.length ? `<div class="priv-classe"><span class="muto">${esc(kk.nome)}${cl.sottoclasse ? ` (${esc(cl.sottoclasse)})` : ''}:</span> ${tutti.map(esc).join(', ')}</div>` : '';
    }).join('');
    const capacita = d.capacita.map((x) => `<div class="pf-cap"><div class="pf-riga">
        <input class="pf-largo" data-dnd="capacita#${x.id}|nome" data-id="${id}" value="${esc(x.nome)}" placeholder="Talento, privilegio, tratto">
        ${sel(`capacita#${x.id}|tipo`, ['Talento', 'Privilegio di classe', 'Tratto razziale', 'Background', 'Altro'].map((t) => [t, t]), x.tipo)}${togli('capacita', x.id)}</div>
        <textarea rows="2" data-dnd="capacita#${x.id}|descrizione" data-id="${id}" placeholder="Effetto, usi…">${esc(x.descrizione || '')}</textarea></div>`).join('');
    const corpoCap = `${privilegi ? `<h4>Privilegi di classe <small class="muto">dalle tabelle</small></h4>${privilegi}` : ''}<h4>Talenti e capacità</h4>${capacita || '<p class="muto">Nessuna.</p>'}<div class="pf-piede">${aggiungi('capacita', 'Talento o capacità')}</div>`;

    // Equipaggiamento
    const armature = d.armature.map((a) => `<div class="pf-riga">
        <label class="pf-chk" title="Indossata">${chk(`armature#${a.id}|indossata`, a.indossata, 'data-ridisegna-dnd')}</label>
        <input class="pf-largo" data-dnd="armature#${a.id}|nome" data-id="${id}" value="${esc(a.nome)}" placeholder="Armatura o scudo">
        ${sel(`armature#${a.id}|tipo`, [['leggera', 'leggera (+DES)'], ['media', 'media (+DES max 2)'], ['pesante', 'pesante'], ['scudo', 'scudo']], a.tipo, 'data-ridisegna-dnd')}
        <label>CA ${num(`armature#${a.id}|ca`, a.ca, 'class="pf-corto" data-ridisegna-dnd')}</label><label>Magia ${num(`armature#${a.id}|magia`, a.magia, 'class="pf-corto" data-ridisegna-dnd')}</label>
        <label class="pf-chk" title="Svantaggio alle prove di Furtività">${chk(`armature#${a.id}|furtivita`, a.furtivita)} svantaggio Furtività</label>${togli('armature', a.id)}</div>`).join('');
    const L = window.Luoghi;
    const rigaOggetto = (o) => `<div class="pf-riga luogo-riga"><input class="pf-largo" data-dnd="oggetti#${o.id}|nome" data-id="${id}" value="${esc(o.nome)}" placeholder="Oggetto">
        ${o.magico ? `<a class="btn-mini" href="${esc(WIKI + o.nome.replace(/ /g, '_'))}" target="_blank" rel="noopener" title="Descrizione sul wiki">i</a>` : ''}
        ${o.sintonia ? `<label class="pf-chk" title="Sintonizzato (massimo 3 oggetti)">${chk(`oggetti#${o.id}|sintonizzato`, o.sintonizzato, 'data-ridisegna-dnd')} sintonia</label>` : ''}
        <label>Qtà ${num(`oggetti#${o.id}|qta`, o.qta, 'class="pf-corto"')}</label>
        <label title="Valore di un pezzo in monete d'oro (per la vendita)">Valore ${num(`oggetti#${o.id}|valore`, o.valore, `class="pf-corto" min="0" step="0.01" placeholder="${L?.valoreDi(o) || 'mo'}" data-ridisegna-dnd`)}</label>${campo(`oggetti#${o.id}|note`, o.note, 'class="pf-largo" placeholder="note"')}
        ${L ? L.vendita(o, id, 'dnd') : ''}
        ${L ? `<label class="luogo-dove" title="Dove si trova"><select data-dnd="oggetti#${o.id}|dove" data-id="${id}" data-ridisegna-dnd>${L.opzioni(L.luogo(o, d), d)}</select></label>` : ''}${togli('oggetti', o.id)}</div>`;
    const oggetti = L ? L.sezione({
      oggetti: d.oggetti, riga: rigaOggetto, dati: d, pg: id, sistema: 'dnd',
      aggiungi: (k) => `<button class="btn-mini" data-azione="dnd-aggiungi" data-id="${id}" data-lista="oggetti" data-dove="${k}" title="Aggiungi un oggetto qui">+</button>`,
      extra: (k) => {
        if (k !== 'indossato') return '';
        const fissi = [...d.armature.filter((a) => a.nome).map((a) => `🛡 ${esc(a.nome)}`), ...(d.armi || []).filter((a) => a.nome).map((a) => `⚔ ${esc(a.nome)}`)];
        return fissi.length ? `<div class="luogo-fissi" title="Armi e armature (si modificano nelle loro sezioni)">${fissi.map((x) => `<span class="luogo-fisso">${x}</span>`).join('')}</div>` : '';
      },
    }) : d.oggetti.map(rigaOggetto).join('');
    const sceltaArmatura = `<span class="pf-dal-wiki">dal manuale: <select id="dnd-scelta-armatura-${id}"><option value="">— scegli —</option>${['leggera', 'media', 'pesante', 'scudo'].map((t) => `<optgroup label="${t === 'scudo' ? 'Scudi' : `Armature ${t === 'leggera' ? 'leggere' : t === 'media' ? 'medie' : 'pesanti'}`}">${ARMATURE_BASE.filter((a) => a[1] === t).map((a) => `<option value="${esc(a[0])}">${esc(a[0])} (CA ${t === 'scudo' ? '+' : ''}${a[2]})</option>`).join('')}</optgroup>`).join('')}</select>
      <button class="btn-piccolo" data-azione="dnd-armatura-base" data-id="${id}">Aggiungi</button></span>`;
    const sintonia = d.oggetti.filter((o) => o.sintonia && o.sintonizzato).length;
    const sceltaOggetto = `<span class="pf-dal-wiki">oggetto magico dal wiki: <input id="dnd-scelta-oggetto-${id}" list="dnd-oggetti-magici" class="pf-largo" placeholder="scrivi per cercare (${C.oggetti.length})">
      <button class="btn-piccolo" data-azione="dnd-oggetto-magico" data-id="${id}">Aggiungi</button></span>
      <datalist id="dnd-oggetti-magici">${C.oggetti.map((o) => `<option value="${esc(o[0])}">${esc(`${o[1]}, ${o[2]}${o[3] ? ', sintonia' : ''}`)}</option>`).join('')}</datalist>`;
    const corpoEquip = `<h4>Armature e scudi</h4>${armature || '<p class="muto">Nessuna (CA senza armatura).</p>'}<div class="pf-piede">${aggiungi('armature', 'Armatura o scudo')}${sceltaArmatura}</div>
      <h4>Oggetti <small class="${sintonia > 3 ? 'oltre' : 'muto'}">sintonia ${sintonia}/3</small> <small class="muto">· divisi per luogo</small></h4>${oggetti || '<p class="muto">Nessun oggetto.</p>'}<div class="pf-piede">${aggiungi('oggetti', 'Oggetto')}${sceltaOggetto}</div>
      <div class="pf-riga"><label>mp ${num('monete|mp', d.monete.mp, 'class="pf-corto"')}</label><label>mo ${num('monete|mo', d.monete.mo, 'class="pf-corto"')}</label><label>ma ${num('monete|ma', d.monete.ma, 'class="pf-corto"')}</label><label>mr ${num('monete|mr', d.monete.mr, 'class="pf-corto"')}</label></div>`;

    // Progressione
    const corpoProg = d.classi.map((cl) => {
      const kk = classeDi(cl.nome);
      if (!kk?.righe?.length) return '';
      const L = n(cl.livello);
      return `<h4>${esc(kk.nome)} <small class="muto">livello ${L}</small></h4><div class="prog-scorri"><table class="prog-tabella"><thead><tr><th>Liv</th>${kk.colonne.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>
        ${kk.righe.map((r, i) => `<tr class="${i + 1 === L ? 'prog-attuale' : i + 1 > L ? 'prog-futuro' : ''}"><td><b>${i + 1}°</b></td>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }).join('') + "<p class=\"muto pf-aiuto\">Tabelle del Manuale del Giocatore (l'Artefice dal wiki Fandom italiano).</p>";

    return `<div class="pf1-scheda" data-dnd-scheda="${id}">
      ${salita?.pgId === id ? sezioneSalita(p, d, c) : ''}
      ${sezione('razza', 'Razza e background', corpoRazza)}
      ${sezione('classi', 'Classi e livelli', corpoClassi)}
      ${sezione('caratteristiche', 'Caratteristiche e tiri salvezza', `<div class="griglia-car">${car}</div>${notaTs ? `<p class="muto pf-aiuto">${esc(notaTs)}</p>` : ''}`)}
      ${sezione('salute', 'Salute', corpoSalute, `<span class="ts-sommario">PF <b>${c.pfAtt}${n(d.pf.temp) ? `+${n(d.pf.temp)}` : ''}/${c.pfMax}</b>${d.ispirazione ? ' · ✨ ispirazione' : ''}${n(d.indebolimento) ? ` · indebolimento ${d.indebolimento}` : ''}${d.condizioni.length ? ` · ${esc(d.condizioni.join(', '))}` : ''}</span>`)}
      ${sezione('difese', 'Difese', corpoDifese, `<span class="ts-sommario">CA <b>${c.ca}</b> · iniz. <b>${segno(c.iniz)}</b></span>`)}
      ${c.risorse.length ? sezione('risorse', 'Risorse di classe', corpoRisorse(p, d, c)) : ''}
      ${sezione('abilita', 'Abilità', corpoAbil)}
      ${sezione('attacchi', 'Attacchi', corpoAttacchi)}
      ${corpoInc ? sezione('incantesimi', 'Incantesimi', corpoInc) : ''}
      ${sezione('capacita', 'Privilegi, talenti e capacità', corpoCap)}
      ${sezione('progressione', 'Progressione di classe', corpoProg)}
      ${sezione('equip', 'Equipaggiamento', corpoEquip)}
    </div>`;
  }

  // Risorse di classe: pallini per gli usi (fino a 20), un campo numerico per le riserve grandi (Imposizione delle Mani)
  function corpoRisorse(p, d, c) {
    const id = p.id;
    const righe = c.risorse.map((x) => {
      const usati = n(d.risorseUsate[x.chiave]);
      const resto = Math.max(0, x.max - usati);
      const quando = x.riposo === 'breve' ? 'riposo breve' : x.riposo === 'lungo' ? 'riposo lungo' : '';
      let ctrl = '';
      if (x.max > 20) ctrl = `<label>restano <input type="number" class="pf-corto" min="0" max="${x.max}" value="${resto}" data-dnd-risorsa="${esc(x.chiave)}" data-id="${id}" data-max="${x.max}"> / ${x.max}</label>`;
      else if (x.max) ctrl = `<span class="pf-pallini">${Array.from({ length: x.max }, (_, i) => `<button class="pallino${i < usati ? ' usato' : ''}" data-azione="dnd-risorsa" data-id="${id}" data-k="${esc(x.chiave)}" data-i="${i + 1}" title="${i < usati ? 'Usato' : 'Disponibile'}"></button>`).join('')}</span> <b>${resto}/${x.max}</b>`;
      return `<div class="pf-riga dnd-risorsa"><b>${esc(x.nome)}</b> ${ctrl} ${quando ? `<small class="muto">si recupera con un ${quando}</small>` : ''} ${x.nota ? `<span class="muto">· ${esc(x.nota)}</span>` : ''}</div>`;
    }).join('');
    return `${righe}<p class="muto pf-aiuto">Clicca un pallino per segnare un uso (o per toglierlo). I riposi nella sezione Salute le ricaricano.</p>`;
  }

  // ---- Salita di livello ----
  function anteprimaSalita(p, d, c) {
    const esistente = d.classi.find((x) => x.id === salita.classe);
    const k = classeDi(esistente ? esistente.nome : salita.classe);
    const prima = esistente ? n(esistente.livello) : 0;
    const dopo = prima + 1;
    const livTot = c.liv + 1;
    const iP = (k?.colonne || []).findIndex((x) => /Privileg/i.test(x));
    const riga = k?.righe?.[dopo - 1];
    const privilegi = iP >= 0 && riga ? String(riga[iP]).split(/,\s*/).map((x) => x.replace(/"/g, '').trim()).filter((x) => x && !/^[-—─]+$/.test(x)) : [];
    const asi = privilegi.some((x) => /Aumento dei Punteggi/i.test(x));
    const pf = (c.liv === 0 ? k.dado : d.pf.metodo === 'massimo' ? k.dado : Math.floor(k.dado / 2) + 1) + c.m.COS + (d.razza.sotto === 'Nano delle Colline' ? 1 : 0)
      + (k.nome === 'Stregone' && /Discendenza Draconica/i.test(esistente?.sottoclasse || '') ? 1 : 0) + (d.capacita.some((x) => /^robusto/i.test(x.nome || '')) ? 2 : 0);
    // Multiclasse: requisito di 13 nella caratteristica principale (qui solo promemoria)
    return { k, esistente, dopo, livTot, privilegi, asi, pf, compPrima: c.comp, compDopo: competenza(livTot), sotto: dopo === k.sotto };
  }
  // Scheda del giocatore (kit): si sale di livello solo dopo aver completato quello attuale. Restituisce cosa manca.
  const GIOCATORE = !!window.MODALITA_GIOCATORE && !window.gdr;
  function mancaPerSalire(p, d) {
    const manca = [];
    const razza = razzaDi(d);
    if (!razza) manca.push('scegli la razza');
    else if (Object.keys(razza.sotto || {}).length && !d.razza.sotto) manca.push('scegli la sottorazza');
    if (!d.background) manca.push('scegli il background');
    if (!d.classi.length || !d.classi.some((cl) => classeDi(cl.nome))) { manca.push('scegli la classe di 1° livello'); return manca; }
    for (const cl of d.classi) {
      const kk = classeDi(cl.nome);
      if (kk && n(cl.livello) >= n(kk.sotto) && n(kk.sotto) > 0 && !String(cl.sottoclasse || '').trim()) manca.push(`scegli la sottoclasse di ${kk.nome} (dal ${kk.sotto}° livello)`);
    }
    // Abilità di classe scelte (oltre a quelle di background e razza) e talento dell'umano variante
    const k0 = classeDi(d.classi[0]?.nome);
    if (k0) {
      const scelte = k0.abil.filter((a) => d.abil[a]?.comp && !(d.bgAbil || []).includes(a) && !(razza?.abil || []).includes(a)).length;
      if (scelte < k0.quante) manca.push(`scegli le abilità di classe (${scelte}/${k0.quante})`);
    }
    if (razza?.talento && !d.capacita.some((x) => x.tipo === 'Talento' && x.nome && !/^Talento \(livello/.test(x.nome))) manca.push("scegli il talento dell'umano (variante)");
    for (const x of d.capacita || []) {
      const m = String(x.nome || '').match(/^Talento \(livello (\d+)\)$/);
      if (m) manca.push(`scrivi quale talento hai preso al ${m[1]}° livello (in "Privilegi, talenti e capacità")`);
    }
    return manca;
  }
  const boxDaCompletare = (manca, liv) => (manca.length ? `<div class="pannello pf-da-completare"><b>${liv ? `Per completare il ${liv}° livello` : 'Per iniziare'}</b>${liv ? ' (poi potrai salire al successivo)' : ''}:<ul>${manca.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '');
  function sezioneSalita(p, d, c) {
    const a = anteprimaSalita(p, d, c);
    const id = p.id;
    const opzClassi = [...d.classi.map((x) => [x.id, `${x.nome} ${x.livello} → ${n(x.livello) + 1}`]), ...Object.keys(BASE).filter((x) => !d.classi.some((y) => classeDi(y.nome)?.nome === x)).map((x) => [x, `${x} (nuova, 1°)`])];
    const sc = salita.car || [];
    return `<div class="pannello salita"><div class="pf-riga"><h3>⬆ Sali al livello ${a.livTot}</h3>
        <label>Classe <select data-dnd-salita="classe">${opz(opzClassi, salita.classe)}</select></label>
        <button class="btn-x" data-azione="dnd-livello-chiudi" title="Annulla">×</button></div>
      ${a.livTot > 20 ? '<p class="oltre">Già al 20° livello.</p>' : `<div class="salita-griglia">
        <div><h4>Cosa ottieni</h4><ul>
          <li><b>${esc(a.k.nome)} ${a.dopo}°</b> · livello del personaggio ${a.livTot}</li>
          <li><b>+${a.pf} PF</b> (d${a.k.dado} ${c.liv === 0 ? 'massimo' : d.pf.metodo} + COS) · un dado vita d${a.k.dado} in più</li>
          ${a.compDopo > a.compPrima ? `<li>Bonus di competenza <b>${segno(a.compDopo)}</b></li>` : ''}
          <li>${a.privilegi.length ? `Privilegi: <b>${esc(a.privilegi.join(', '))}</b>` : 'Nessun privilegio nuovo in tabella'}</li>
          ${a.sotto ? `<li>Scegli la <b>sottoclasse</b> (${esc(a.k.nome)} ${a.dopo}°)</li>` : ''}
        </ul></div>
        <div><h4>Scelte da fare</h4><ul>
          ${!a.esistente && d.classi.length ? '<li>Multiclasse: serve almeno 13 nella caratteristica principale della nuova classe e di quella attuale</li>' : ''}
          ${a.asi ? `<li><b>Aumento dei punteggi di caratteristica</b>: +2 a una o +1 a due (oppure un talento al posto dell'aumento)
            <div class="pf-riga">${CARS.map((s) => `<label class="pf-chk"><input type="checkbox" data-azione="dnd-salita-car" data-car="${s}" ${sc.filter((x) => x === s).length ? 'checked' : ''}> ${s}${sc.filter((x) => x === s).length === 2 ? ' +2' : ''}</label>`).join('')}
            <button class="btn-mini" data-azione="dnd-salita-car-doppio" title="+2 alla stessa caratteristica: spunta una caratteristica e premi">+2</button> <span class="muto">${sc.length}/2 punti</span>
            <label class="pf-chk"><input type="checkbox" data-azione="dnd-salita-talento" ${salita.talento ? 'checked' : ''}> prendo un talento</label></div></li>` : ''}
          ${a.privilegi.length ? '<li>Leggi i nuovi privilegi sul wiki e annota le scelte in "Privilegi, talenti e capacità"</li>' : ''}
        </ul></div></div>
      <div class="pf-piede"><button class="primario" data-azione="dnd-livello-conferma" data-id="${id}" ${a.asi && !salita.talento && sc.length !== 2 ? 'disabled title="Assegna i 2 punti o scegli un talento"' : ''}>Conferma il livello ${a.livTot}</button></div>`}
    </div>`;
  }

  // ---- Tiri ----
  // Maiusc = vantaggio (2d20, il più alto), Ctrl = svantaggio (il più basso)
  let modoTiro = '';
  document.addEventListener('click', (e) => { if (e.target.closest?.('[data-azione="dnd-tira"]')) modoTiro = e.shiftKey ? 'kh1' : e.ctrlKey ? 'kl1' : ''; }, true);
  function tira(p, chiave) {
    const c = calcola(p);
    const d = dati(p);
    const [tipo, arg] = chiave.split(/:(.*)/s);
    const d20 = modoTiro ? `2d20${modoTiro}` : '1d20';
    const etV = modoTiro === 'kh1' ? ' (vantaggio)' : modoTiro === 'kl1' ? ' (svantaggio)' : '';
    const t = (b, et) => ctx.eseguiTiro(`${d20}${b ? (b > 0 ? '+' : '') + b : ''}`, `${p.nome} · ${et}${etV}`);
    if (tipo === 'car') return t(c.m[arg], NOMI_CAR[arg]);
    if (tipo === 'ts') return t(c.ts[arg].tot, `TS ${NOMI_CAR[arg]}`);
    if (tipo === 'iniz') return t(c.iniz, 'Iniziativa');
    if (tipo === 'abil') return t(c.abil[arg]?.tot ?? 0, arg);
    if (tipo === 'incatt') { const x = c.incantatori.find((y) => y.classe === arg); return t(x?.attacco ?? 0, `attacco con incantesimo`); }
    const a = c.armi.find((x) => x.id === arg);
    const nome = d.armi.find((x) => x.id === arg)?.nome || 'arma';
    if (tipo === 'colpo' && a) return t(a.colpo, nome);
    if (tipo === 'danni' && a) { const m = a.danni.match(/^\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)/); if (m) return ctx.eseguiTiro(m[1].replace(/\s/g, ''), `${p.nome} · danni ${nome}`); }
    return null;
  }
  // Danno: prima i PF temporanei; cura fino al massimo
  function applicaDanno(p, q, modo) {
    const d = dati(p);
    const c = calcola(p);
    if (modo < 0) {
      let resto = q;
      const t = n(d.pf.temp);
      if (t) { const via = Math.min(t, resto); d.pf.temp = t - via || ''; resto -= via; }
      d.pf.attuali = Math.max(0, c.pfAtt - resto);
    } else {
      d.pf.attuali = Math.min(c.pfMax, c.pfAtt + q);
      if (c.pfAtt <= 0 && q > 0) d.morte = { successi: 0, fallimenti: 0 };
    }
    if (d.pf.attuali === c.pfMax) d.pf.attuali = '';
  }

  // ---- Azioni ----
  const NUOVI = {
    classi: () => ({ id: uid(), nome: '', livello: 1, sottoclasse: '', terzo: false }),
    armi: () => ({ id: uid(), nome: '', car: 'FOR', danni: '1d6', tipoDanno: '', comp: true, magia: '', proprieta: '' }),
    armature: () => ({ id: uid(), nome: '', tipo: 'leggera', ca: 11, magia: '', indossata: true, furtivita: false }),
    capacita: () => ({ id: uid(), nome: '', tipo: 'Talento', descrizione: '' }),
    oggetti: () => ({ id: uid(), nome: '', qta: 1, note: '', dove: 'zaino' }),
  };
  const azioni = {
    'dnd-aggiungi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const nuovo = NUOVI[el.dataset.lista]();
      if (el.dataset.dove) nuovo.dove = el.dataset.dove;
      dati(p)[el.dataset.lista].push(nuovo);
      ctx.salva();
      ctx.render();
    },
    'dnd-rimuovi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const t = trova(dati(p), el.dataset.lista + '|x');
      const arr = t?.[0];
      if (!Array.isArray(arr)) return;
      const i = arr.findIndex((x) => x.id === el.dataset.elem);
      if (i >= 0) arr.splice(i, 1);
      ctx.salva(); ctx.render();
    },
    'dnd-tira'(el) { const p = ctx.personaggio(el.dataset.id); if (p) tira(p, el.dataset.tiro); },
    'dnd-scelta-car'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const s = el.dataset.car;
      const max = razzaDi(d)?.scelta || 0;
      d.razza.scelte = d.razza.scelte.includes(s) ? d.razza.scelte.filter((x) => x !== s) : d.razza.scelte.length < max ? [...d.razza.scelte, s] : d.razza.scelte;
      ctx.salva(); ctx.render();
    },
    'dnd-condizione'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      d.condizioni = d.condizioni.includes(el.dataset.nome) ? d.condizioni.filter((x) => x !== el.dataset.nome) : [...d.condizioni, el.dataset.nome];
      ctx.salva(); ctx.render();
    },
    'dnd-danno'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const q = n(el.closest('.pf-box').querySelector('.dnd-quanti').value);
      if (!q) return;
      applicaDanno(p, q, Number(el.dataset.segno));
      ctx.salva(); ctx.render();
    },
    'dnd-dado-vita'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      const dv = el.dataset.dado;
      if (n(d.dadiUsati[dv]) >= n(c.dadi[dv])) { ctx.toast(`Nessun d${dv} rimasto`, 'errore'); return; }
      const r = ctx.eseguiTiro(`1d${dv}${c.m.COS ? (c.m.COS > 0 ? '+' : '') + c.m.COS : ''}`, `${p.nome} · dado vita`);
      const cura = Math.max(0, r?.totale ?? 0);
      d.dadiUsati[dv] = n(d.dadiUsati[dv]) + 1;
      applicaDanno(p, cura, 1);
      ctx.salva(); ctx.render();
      ctx.toast(`❤ Dado vita: +${cura} PF`);
    },
    'dnd-riposo-lungo'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      d.pf.attuali = '';
      d.pf.temp = '';
      // Recupera dadi vita fino a metà del totale (minimo 1)
      let rec = Math.max(1, Math.floor(c.liv / 2));
      for (const dv of Object.keys(c.dadi).sort((a, b) => b - a)) { const via = Math.min(rec, n(d.dadiUsati[dv])); d.dadiUsati[dv] = n(d.dadiUsati[dv]) - via; rec -= via; }
      d.slotUsati = {};
      d.pattoUsati = 0;
      d.risorseUsate = {};
      d.morte = { successi: 0, fallimenti: 0 };
      if (n(d.indebolimento) > 0) d.indebolimento = n(d.indebolimento) - 1;
      ctx.salva(); ctx.render();
      ctx.toast('🌙 Riposo lungo: PF al massimo, slot, risorse e metà dei dadi vita recuperati');
    },
    // Riposo breve: slot del patto e risorse che si recuperano con un riposo breve (i dadi vita si spendono a parte)
    'dnd-riposo-breve'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      d.pattoUsati = 0;
      const brevi = c.risorse.filter((x) => x.riposo === 'breve');
      for (const x of brevi) delete d.risorseUsate[x.chiave];
      ctx.salva(); ctx.render();
      ctx.toast(`☕ Riposo breve${c.patto ? ': slot del patto' : ''}${brevi.length ? `${c.patto ? ',' : ':'} ${esc(brevi.map((x) => x.nome).join(', '))}` : ''} recuperati. Spendi i dadi vita per curarti.`);
    },
    'dnd-risorsa'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const k = el.dataset.k;
      const i = Number(el.dataset.i);
      d.risorseUsate[k] = n(d.risorseUsate[k]) >= i ? i - 1 : i;
      ctx.salva(); ctx.render();
    },
    'dnd-morte'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const k = el.dataset.k;
      const i = Number(el.dataset.i);
      d.morte[k] = n(d.morte[k]) >= i ? i - 1 : i;
      ctx.salva(); ctx.render();
    },
    'dnd-tira-morte'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const r = ctx.eseguiTiro('1d20', `${p.nome} · tiro contro la morte`);
      const v = r?.totale ?? 10;
      if (v === 20) { d.pf.attuali = 1; d.morte = { successi: 0, fallimenti: 0 }; ctx.toast('✨ 20 naturale: torna cosciente con 1 PF'); }
      else if (v === 1) d.morte.fallimenti = Math.min(3, n(d.morte.fallimenti) + 2);
      else if (v >= 10) d.morte.successi = Math.min(3, n(d.morte.successi) + 1);
      else d.morte.fallimenti = Math.min(3, n(d.morte.fallimenti) + 1);
      if (n(d.morte.successi) >= 3) ctx.toast('Stabilizzato (3 successi)');
      if (n(d.morte.fallimenti) >= 3) ctx.toast('💀 3 fallimenti: il personaggio muore', 'errore');
      ctx.salva(); ctx.render();
    },
    'dnd-slot'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      const L = el.dataset.l;
      d.slotUsati[L] = Math.max(0, Math.min(c.slot[L - 1] || 0, n(d.slotUsati[L]) + Number(el.dataset.d)));
      ctx.salva(); ctx.render();
    },
    'dnd-patto'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      d.pattoUsati = Math.max(0, Math.min(c.patto?.slot || 0, n(d.pattoUsati) + Number(el.dataset.d)));
      ctx.salva(); ctx.render();
    },
    'dnd-inc-aggiungi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const L = Number(el.dataset.livello);
      const prepara = !!PREPARANO[el.dataset.classe];
      d.incantesimi.push({ id: uid(), classe: el.dataset.classe, nome: el.dataset.nome, livello: L, preparato: L === 0 || !prepara });
      ctx.salva(); ctx.render();
    },
    'dnd-prepara'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const s = d.incantesimi.find((x) => x.id === el.dataset.inc);
      if (s) s.preparato = !s.preparato;
      ctx.salva(); ctx.render();
    },
    'dnd-lancia'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p);
      const s = d.incantesimi.find((x) => x.id === el.dataset.inc);
      if (!s) return;
      const v = incantesimoDi(s.nome);
      const x = c.incantatori.find((y) => y.classe === s.classe);
      // Il warlock usa gli slot del patto; gli altri lo slot più basso disponibile di livello pari o superiore
      if (s.classe === 'Warlock' && c.patto) {
        if (n(d.pattoUsati) >= c.patto.slot) { ctx.toast('Nessuno slot del patto rimasto', 'errore'); return; }
        d.pattoUsati = n(d.pattoUsati) + 1;
        ctx.salva(); ctx.render();
        ctx.toast(`✨ <b>${esc(s.nome)}</b> con uno slot del patto di ${c.patto.livello}° · CD ${x?.cd ?? ''}${v?.conc ? ' · concentrazione' : ''}`);
        return;
      }
      const L = c.slot.findIndex((tot, i) => i + 1 >= s.livello && n(d.slotUsati[i + 1]) < tot) + 1;
      if (!L) { ctx.toast(`Nessuno slot di ${s.livello}° livello o superiore rimasto`, 'errore'); return; }
      d.slotUsati[L] = n(d.slotUsati[L]) + 1;
      ctx.salva(); ctx.render();
      ctx.toast(`✨ <b>${esc(s.nome)}</b> con uno slot di ${L}°${L > s.livello ? ' (livello superiore)' : ''} · CD ${x?.cd ?? ''}${v?.conc ? ' · concentrazione' : ''}`);
    },
    'dnd-arma-base'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const a = ARMI_BASE.find((x) => x[0] === document.getElementById(`dnd-scelta-arma-${p.id}`)?.value);
      if (!a) { ctx.toast('Scegli prima un\'arma', 'errore'); return; }
      const [nome, cat, danni, tipoDanno, prop] = a;
      const car = /accurata/.test(prop) ? 'accurata' : /distanza/.test(cat) ? 'DES' : 'FOR';
      dati(p).armi.push({ ...NUOVI.armi(), nome, car, danni, tipoDanno, proprieta: prop });
      ctx.salva(); ctx.render();
    },
    'dnd-armatura-base'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const a = ARMATURE_BASE.find((x) => x[0] === document.getElementById(`dnd-scelta-armatura-${p.id}`)?.value);
      if (!a) { ctx.toast('Scegli prima un\'armatura o uno scudo', 'errore'); return; }
      const d = dati(p);
      // Indossando una nuova armatura (non scudo) si toglie quella indossata prima
      if (a[1] !== 'scudo') for (const x of d.armature) if (x.tipo !== 'scudo') x.indossata = false;
      d.armature.push({ ...NUOVI.armature(), nome: a[0], tipo: a[1], ca: a[2], furtivita: !!a[3], ...(a[4] ? { forza: a[4] } : {}) });
      ctx.salva(); ctx.render();
    },
    'dnd-oggetto-magico'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const o = C.oggetti.find((x) => norm(x[0]) === norm(document.getElementById(`dnd-scelta-oggetto-${p.id}`)?.value || ''));
      if (!o) { ctx.toast('Scrivi o scegli un oggetto magico dall\'elenco', 'errore'); return; }
      dati(p).oggetti.push({ ...NUOVI.oggetti(), nome: o[0], note: `${o[1]}, ${o[2]}`, magico: true, sintonia: !!o[3], sintonizzato: false });
      ctx.salva(); ctx.render();
      ctx.toast(`✨ <b>${esc(o[0])}</b> aggiunto${o[3] ? ' · richiede sintonia' : ''}`);
    },
    'dnd-livello-apri'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      if (GIOCATORE) { const manca = mancaPerSalire(ctx.personaggio(el.dataset.id), d); if (manca.length) { ctx.toast(`Completa prima il livello attuale: ${esc(manca.join('; '))}`, 'errore'); return; } }
      salita = { pgId: el.dataset.id, classe: d.classi[0]?.id || 'Guerriero', car: [], talento: false };
      ctx.render();
    },
    'dnd-livello-chiudi'() { salita = null; ctx.render(); },
    'dnd-salita-car'(el) {
      if (!salita) return;
      const s = el.dataset.car;
      salita.car = salita.car.includes(s) ? salita.car.filter((x) => x !== s) : salita.car.length < 2 ? [...salita.car, s] : salita.car;
      salita.ultima = s;
      ctx.render();
    },
    'dnd-salita-car-doppio'() {
      if (!salita?.car.length) return;
      salita.car = [salita.car[0], salita.car[0]];
      ctx.render();
    },
    'dnd-salita-talento'() { if (salita) { salita.talento = !salita.talento; if (salita.talento) salita.car = []; } ctx.render(); },
    'dnd-livello-conferma'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p || !salita) return;
      const d = dati(p);
      const c = calcola(p);
      const a = anteprimaSalita(p, d, c);
      if (a.livTot > 20) return;
      if (a.esistente) a.esistente.livello = n(a.esistente.livello) + 1;
      else d.classi.push({ ...NUOVI.classi(), nome: a.k.nome });
      if (a.asi && !salita.talento) {
        p.caratteristiche = p.caratteristiche || {};
        for (const s of salita.car) p.caratteristiche[s] = Math.min(20, (p.caratteristiche[s] === '' || p.caratteristiche[s] == null ? 10 : n(p.caratteristiche[s])) + 1);
      }
      if (a.asi && salita.talento) d.capacita.push({ ...NUOVI.capacita(), nome: 'Talento (livello ' + a.livTot + ')' });
      p.campi = p.campi || {};
      p.campi.Livello = String(c.liv + 1);
      p.campi.Classe = d.classi.map((x) => `${x.nome} ${x.livello}`).join(' / ');
      salita = null;
      ctx.salva(); ctx.render();
      ctx.toast(`⬆ <b>${esc(p.nome)}</b> è ora di ${c.liv + 1}° livello (+${a.pf} PF)${a.sotto ? ' · scegli la sottoclasse' : ''}`);
    },
  };

  function applica(el) {
    const p = ctx.personaggio(el.dataset.id);
    if (!p) return;
    const d = dati(p);
    const t = trova(d, el.dataset.dnd);
    if (!t) return;
    t[0][t[1]] = valoreDa(el);
    p.campi = p.campi || {};
    if (el.dataset.dnd === 'razza|nome') { d.razza.sotto = ''; d.razza.scelte = []; p.campi['Specie / Razza'] = d.razza.nome; }
    if (el.dataset.dnd === 'background') {
      if (d.background === '…') { d.background = ''; d.bgLibero = true; }
      else if (el.tagName === 'SELECT') d.bgLibero = false;
      // Le competenze date dal background precedente si tolgono, quelle del nuovo si spuntano; il privilegio va tra le capacità
      for (const a of d.bgAbil || []) if (d.abil[a]) d.abil[a].comp = false;
      d.capacita = d.capacita.filter((x) => !(x.tipo === 'Background' && x.daBackground));
      const b = BACKGROUND[d.background];
      d.bgAbil = [];
      if (b) {
        for (const a of b.abil) { d.abil[a] = d.abil[a] || {}; if (!d.abil[a].comp) { d.abil[a].comp = true; d.bgAbil.push(a); } }
        d.capacita.push({ ...NUOVI.capacita(), nome: `Privilegio: ${b.privilegio}`, tipo: 'Background', daBackground: true, descrizione: [b.strumenti && `Strumenti: ${b.strumenti}`, b.lingue && `Linguaggi: ${b.lingue === 1 ? 'uno' : 'due'} a scelta`].filter(Boolean).join(' · ') });
      }
      p.campi.Background = d.background;
    }
    if (/^classi#/.test(el.dataset.dnd)) { p.campi.Classe = d.classi.map((x) => `${x.nome} ${x.livello}`).join(' / '); p.campi.Livello = String(livelloTot(d)); }
    // La maestria richiede la competenza
    const mm = el.dataset.dnd.match(/^abil\|(.+)\|maestria$/);
    if (mm && el.checked) d.abil[mm[1]].comp = true;
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
      return { modIniz: c.iniz, ca: c.ca, pfMax: c.pfMax, pfAtt: c.pfAtt, temp: n(d.pf.temp), ts: Object.fromEntries(CARS.map((s) => [s, c.ts[s].tot])),
        armi: d.armi.map((a) => { const x = c.armi.find((y) => y.id === a.id); return { id: a.id, nome: a.nome || 'Arma', colpo: x?.colpo ?? 0, danni: x?.danni || '' }; }), condizioni: d.condizioni };
    },
    migraRegolamento(r) { r.risorse = []; },
    input(el) {
      if (el.dataset.dndSfoglia !== undefined) { sfoglia[el.dataset.dndSfoglia] = el.value; ctx.render(); return true; }
      if (el.dataset.dndCerca !== undefined) { filtroInc[el.dataset.dndCerca] = el.value; return true; }
      if (el.dataset.dndSalita) { if (salita) { salita[el.dataset.dndSalita] = el.value; salita.car = []; } ctx.render(); return true; }
      if (el.dataset.dndRisorsa !== undefined) { const p = ctx.personaggio(el.dataset.id); if (p) { const d = dati(p); const max = n(el.dataset.max); d.risorseUsate[el.dataset.dndRisorsa] = Math.max(0, Math.min(max, max - n(el.value))); ctx.salva(); } return true; }
      if (el.dataset.dnd) { applica(el); return true; }
      const sch = el.closest('[data-dnd-scheda]');
      if (sch) { const p = ctx.personaggio(sch.dataset.dndScheda); if (p) aggiorna(p); }
      return false;
    },
    change(el) {
      if (el.dataset.dndSfoglia !== undefined) return true;
      // La ricerca negli incantesimi si applica alla conferma (Invio o uscita dal campo), così il campo non perde il fuoco mentre si scrive
      if (el.dataset.dndCerca !== undefined) { filtroInc[el.dataset.dndCerca] = el.value; ctx.render(); return true; }
      if (el.dataset.dndSalita) return true;
      if (el.dataset.dndRisorsa !== undefined) { ctx.render(); return true; }
      if (el.dataset.dnd) { if (el.dataset.ridisegnaDnd !== undefined) ctx.render(); return true; }
      return false;
    },
  };
};
