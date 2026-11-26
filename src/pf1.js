'use strict';
// Pathfinder 1ª edizione: scheda con calcoli automatici (classi, TS, BAB, CA, BMC/DMC,
// abilità a gradi, attacchi, incantesimi, equipaggiamento, mitico, bonus attivabili con
// regole di cumulo, PF automatici), vista da tavolo stampabile e tracker di combattimento.
// app.js chiama window.creaPF1(ctx) passando le funzioni di cui il modulo ha bisogno.
window.creaPF1 = function creaPF1(ctx) {
  const { esc, uid, norm } = ctx;
  // Elenchi per l'autocompletamento che non cambiano mai (talenti, oggetti, classi, specie): si creano una volta sola
  // in un contenitore nascosto fuori dalla scheda, invece di ricostruirli a ogni ridisegno (migliaia di voci).
  function datalistFisso(id, voci) {
    if (document.getElementById(id)) return '';
    let box = document.getElementById('liste-fisse');
    if (!box) { box = document.createElement('div'); box.id = 'liste-fisse'; box.hidden = true; document.body.appendChild(box); }
    const dl = document.createElement('datalist');
    dl.id = id;
    dl.innerHTML = voci();
    box.appendChild(dl);
    return '';
  }
  const n = ctx.numero;
  const segno = (v) => (v >= 0 ? '+' : '') + v;
  const fmtMod = (v) => (!v ? '' : v > 0 ? '+' + v : String(v));
  const kg = (v) => Number(v || 0).toLocaleString('it-IT', { maximumFractionDigits: 1 });
  const opz = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`).join('');

  // =====================================================================
  // Dati di regolamento
  // =====================================================================
  const K = (...xs) => xs.map((x) => `Conoscenze (${x})`);
  const KT = K('arcane', 'dungeon', 'geografia', 'ingegneria', 'locali', 'natura', 'nobiltà', 'piani', 'religioni', 'storia');
  // Dati delle classi presi da Golarion Insider (golarion.altervista.org), che usa i nomi
  // delle edizioni italiane: [BAB, TS buoni (T/R/V), dado vita, gradi per livello,
  // abilità di classe ("*K" = tutte le Conoscenze), classe di prestigio]
  const DATI_CLASSI = {
    // Classi base
    Barbaro: ['pieno', 'T', 12, 4, 'Acrobazia;Addestrare Animali;Artigianato;Cavalcare;Conoscenze (natura);Intimidire;Nuotare;Percezione;Scalare;Sopravvivenza'],
    Bardo: ['3/4', 'RV', 8, 6, '*K;Acrobazia;Artigianato;Artista della Fuga;Camuffare;Diplomazia;Furtività;Intimidire;Intrattenere;Intuizione;Linguistica;Percezione;Professione;Raggirare;Rapidità di Mano;Sapienza Magica;Scalare;Utilizzare Congegni Magici;Valutare'],
    Chierico: ['3/4', 'TV', 8, 2, 'Artigianato;Conoscenze (arcane);Conoscenze (nobiltà);Conoscenze (piani);Conoscenze (religioni);Conoscenze (storia);Diplomazia;Guarire;Intuizione;Linguistica;Professione;Sapienza Magica;Valutare'],
    Druido: ['3/4', 'TV', 8, 4, 'Addestrare Animali;Artigianato;Cavalcare;Conoscenze (geografia);Conoscenze (natura);Guarire;Nuotare;Percezione;Professione;Sapienza Magica;Scalare;Sopravvivenza;Volare'],
    Guerriero: ['pieno', 'T', 10, 2, 'Addestrare Animali;Artigianato;Cavalcare;Conoscenze (dungeon);Conoscenze (ingegneria);Intimidire;Nuotare;Professione;Scalare;Sopravvivenza'],
    Ladro: ['3/4', 'R', 8, 8, 'Acrobazia;Artigianato;Artista della Fuga;Camuffare;Conoscenze (dungeon);Conoscenze (locali);Diplomazia;Disattivare Congegni;Furtività;Intimidire;Intrattenere;Intuizione;Linguistica;Nuotare;Percezione;Professione;Raggirare;Rapidità di Mano;Scalare;Utilizzare Congegni Magici;Valutare'],
    Mago: ['1/2', 'V', 6, 2, '*K;Artigianato;Linguistica;Professione;Sapienza Magica;Valutare;Volare'],
    Monaco: ['3/4', 'TRV', 8, 4, 'Acrobazia;Artigianato;Artista della Fuga;Cavalcare;Conoscenze (religioni);Conoscenze (storia);Furtività;Intimidire;Intrattenere;Intuizione;Nuotare;Percezione;Professione;Scalare'],
    Paladino: ['pieno', 'TV', 10, 2, 'Addestrare Animali;Artigianato;Cavalcare;Conoscenze (nobiltà);Conoscenze (religioni);Diplomazia;Guarire;Intuizione;Professione;Sapienza Magica'],
    Ranger: ['pieno', 'TR', 10, 6, 'Addestrare Animali;Artigianato;Cavalcare;Conoscenze (dungeon);Conoscenze (geografia);Conoscenze (natura);Furtività;Guarire;Intimidire;Nuotare;Percezione;Professione;Sapienza Magica;Scalare;Sopravvivenza'],
    Stregone: ['1/2', 'V', 6, 2, 'Artigianato;Conoscenze (arcane);Intimidire;Professione;Raggirare;Sapienza Magica;Utilizzare Congegni Magici;Valutare;Volare'],
    // Classi avanzate
    Alchimista: ['3/4', 'TR', 8, 4, 'Artigianato;Conoscenze (arcane);Conoscenze (natura);Disattivare Congegni;Guarire;Percezione;Professione;Rapidità di Mano;Sapienza Magica;Sopravvivenza;Utilizzare Congegni Magici;Valutare;Volare'],
    Cavaliere: ['pieno', 'T', 10, 4, 'Addestrare Animali;Artigianato;Cavalcare;Diplomazia;Intimidire;Intuizione;Nuotare;Professione;Raggirare;Scalare'],
    Convocatore: ['3/4', 'V', 8, 2, '*K;Addestrare Animali;Artigianato;Cavalcare;Linguistica;Professione;Sapienza Magica;Utilizzare Congegni Magici;Volare'],
    Fattucchiere: ['1/2', 'V', 6, 2, 'Artigianato;Conoscenze (arcane);Conoscenze (storia);Conoscenze (natura);Conoscenze (piani);Guarire;Intimidire;Professione;Sapienza Magica;Utilizzare Congegni Magici;Volare'],
    Inquisitore: ['3/4', 'TV', 8, 6, 'Artigianato;Camuffare;Cavalcare;Conoscenze (arcane);Conoscenze (dungeon);Conoscenze (natura);Conoscenze (piani);Conoscenze (religioni);Diplomazia;Furtività;Guarire;Intimidire;Intuizione;Nuotare;Percezione;Professione;Raggirare;Sapienza Magica;Scalare;Sopravvivenza'],
    Magus: ['3/4', 'TV', 8, 2, 'Artigianato;Cavalcare;Conoscenze (arcane);Conoscenze (dungeon);Conoscenze (piani);Intimidire;Nuotare;Professione;Sapienza Magica;Scalare;Utilizzare Congegni Magici;Volare'],
    Morfico: ['pieno', 'TR', 10, 4, 'Acrobazia;Addestrare Animali;Artigianato;Cavalcare;Conoscenze (natura);Furtività;Nuotare;Percezione;Professione;Scalare;Sopravvivenza;Volare'],
    Oracolo: ['3/4', 'V', 8, 4, 'Artigianato;Conoscenze (piani);Conoscenze (religioni);Conoscenze (storia);Diplomazia;Guarire;Intuizione;Professione;Sapienza Magica'],
    Pistolero: ['pieno', 'TR', 10, 4, 'Acrobazia;Addestrare Animali;Artigianato;Cavalcare;Conoscenze (ingegneria);Conoscenze (locali);Guarire;Intimidire;Nuotare;Percezione;Professione;Raggirare;Rapidità di Mano;Scalare;Sopravvivenza'],
    Vigilante: ['3/4', 'RV', 8, 6, 'Acrobazia;Artigianato;Artista della Fuga;Camuffare;Cavalcare;Conoscenze (dungeon);Conoscenze (ingegneria);Conoscenze (locali);Conoscenze (nobiltà);Diplomazia;Disattivare Congegni;Furtività;Intimidire;Intrattenere;Intuizione;Nuotare;Percezione;Professione;Raggirare;Rapidità di Mano;Scalare;Sopravvivenza;Utilizzare Congegni Magici;Valutare'],
    // Classi alternative
    Antipaladino: ['pieno', 'TV', 10, 2, 'Addestrare Animali;Artigianato;Camuffare;Cavalcare;Conoscenze (religioni);Furtività;Intimidire;Intuizione;Professione;Raggirare;Sapienza Magica'],
    Ninja: ['3/4', 'R', 8, 8, 'Acrobazia;Artigianato;Artista della Fuga;Camuffare;Conoscenze (locali);Conoscenze (nobiltà);Diplomazia;Disattivare Congegni;Furtività;Intimidire;Intrattenere;Intuizione;Linguistica;Nuotare;Percezione;Professione;Raggirare;Rapidità di Mano;Scalare;Utilizzare Congegni Magici;Valutare'],
    Samurai: ['pieno', 'T', 10, 4, 'Addestrare Animali;Artigianato;Cavalcare;Diplomazia;Intimidire;Intuizione;Nuotare;Professione;Raggirare;Scalare'],
    // Classi ibride
    Arcanista: ['1/2', 'V', 6, 2, '*K;Artigianato;Linguistica;Professione;Sapienza Magica;Utilizzare Congegni Magici;Valutare;Volare'],
    Attaccabrighe: ['pieno', 'TR', 10, 4, 'Acrobazia;Addestrare Animali;Artigianato;Artista della Fuga;Cavalcare;Conoscenze (dungeon);Conoscenze (locali);Intimidire;Intuizione;Nuotare;Percezione;Professione;Scalare'],
    Cacciatore: ['3/4', 'TR', 8, 6, 'Addestrare Animali;Artigianato;Cavalcare;Conoscenze (dungeon);Conoscenze (geografia);Conoscenze (natura);Furtività;Guarire;Intimidire;Nuotare;Percezione;Professione;Sapienza Magica;Scalare;Sopravvivenza'],
    Intrepido: ['pieno', 'R', 10, 4, 'Acrobazia;Artigianato;Artista della Fuga;Cavalcare;Conoscenze (locali);Conoscenze (nobiltà);Diplomazia;Intimidire;Intrattenere;Intuizione;Nuotare;Percezione;Professione;Raggirare;Rapidità di Mano;Scalare'],
    Investigatore: ['3/4', 'RV', 8, 6, '*K;Acrobazia;Artigianato;Artista della Fuga;Camuffare;Diplomazia;Disattivare Congegni;Furtività;Guarire;Intimidire;Intrattenere;Intuizione;Linguistica;Percezione;Professione;Raggirare;Rapidità di Mano;Sapienza Magica;Scalare;Utilizzare Congegni Magici;Valutare'],
    'Iracondo di Stirpe': ['pieno', 'T', 10, 4, 'Acrobazia;Addestrare Animali;Artigianato;Cavalcare;Conoscenze (arcane);Intimidire;Nuotare;Percezione;Sapienza Magica;Scalare;Sopravvivenza'],
    Predatore: ['pieno', 'TR', 10, 6, 'Acrobazia;Artigianato;Camuffare;Cavalcare;Conoscenze (geografia);Conoscenze (dungeon);Conoscenze (locali);Furtività;Guarire;Intimidire;Intuizione;Nuotare;Percezione;Professione;Raggirare;Scalare;Sopravvivenza'],
    'Sacerdote Guerriero': ['3/4', 'TV', 8, 2, 'Addestrare Animali;Artigianato;Cavalcare;Conoscenze (ingegneria);Conoscenze (religioni);Diplomazia;Guarire;Intimidire;Intuizione;Nuotare;Professione;Sapienza Magica;Scalare;Sopravvivenza'],
    Scaldo: ['3/4', 'TV', 8, 4, '*K;Acrobazia;Addestrare Animali;Artigianato;Artista della Fuga;Cavalcare;Diplomazia;Intimidire;Intrattenere;Intuizione;Linguistica;Nuotare;Percezione;Professione;Raggirare;Sapienza Magica;Scalare;Utilizzare Congegni Magici;Valutare'],
    Sciamano: ['3/4', 'V', 8, 4, 'Addestrare Animali;Artigianato;Cavalcare;Conoscenze (natura);Conoscenze (piani);Conoscenze (religioni);Diplomazia;Guarire;Professione;Sapienza Magica;Sopravvivenza;Volare'],
    // Classi occulte
    Cineta: ['3/4', 'TR', 8, 4, 'Acrobazia;Artigianato;Furtività;Guarire;Intimidire;Percezione;Professione;Utilizzare Congegni Magici'],
    Medium: ['3/4', 'V', 8, 4, 'Artigianato;Conoscenze (arcane);Conoscenze (piani);Conoscenze (religioni);Diplomazia;Guarire;Intimidire;Intrattenere;Intuizione;Linguistica;Percezione;Professione;Raggirare;Sapienza Magica;Utilizzare Congegni Magici;Volare'],
    Mesmerista: ['3/4', 'RV', 8, 6, 'Artigianato;Artista della Fuga;Camuffare;Conoscenze (arcane);Conoscenze (dungeon);Conoscenze (locali);Conoscenze (nobiltà);Conoscenze (religioni);Conoscenze (storia);Diplomazia;Furtività;Intimidire;Intrattenere;Intuizione;Linguistica;Percezione;Professione;Raggirare;Rapidità di Mano;Sapienza Magica;Utilizzare Congegni Magici;Valutare'],
    Occultista: ['3/4', 'TV', 8, 4, 'Artigianato;Camuffare;Conoscenze (arcane);Conoscenze (ingegneria);Conoscenze (piani);Conoscenze (religioni);Conoscenze (storia);Diplomazia;Disattivare Congegni;Intuizione;Linguistica;Percezione;Professione;Rapidità di Mano;Sapienza Magica;Utilizzare Congegni Magici;Valutare;Volare'],
    Parapsichico: ['1/2', 'V', 6, 2, '*K;Artigianato;Diplomazia;Intimidire;Intuizione;Linguistica;Percezione;Professione;Raggirare;Sapienza Magica;Volare'],
    Spiritista: ['3/4', 'TV', 8, 4, '*K;Artigianato;Guarire;Intimidire;Intuizione;Linguistica;Professione;Raggirare;Sapienza Magica;Utilizzare Congegni Magici;Volare'],
    // Classi di prestigio
    'Arciere Arcano': ['pieno', 'TR', 10, 4, 'Cavalcare;Furtività;Percezione;Sopravvivenza', 1],
    'Guerriero Arcano': ['pieno', 'T', 10, 2, 'Cavalcare;Conoscenze (arcane);Conoscenze (nobiltà);Intuizione;Linguistica;Nuotare;Sapienza Magica;Scalare', 1],
    'Teurgo Mistico': ['1/2', 'V', 6, 2, 'Conoscenze (arcane);Conoscenze (religioni);Intuizione;Sapienza Magica', 1],
  };
  // Incantatori ([caratteristica, tipo di lancio]) e nomi alternativi riconosciuti (inglesi o usati prima)
  const EXTRA_CLASSI = {
    Alchimista: { inc: ['INT', 'preparati'], alias: ['alchemist'] },
    Antipaladino: { inc: ['CAR', 'preparati'], alias: ['antipaladin'] },
    Arcanista: { inc: ['INT', 'preparati'], alias: ['arcanist'] },
    'Arciere Arcano': { alias: ['arcane archer'] },
    Attaccabrighe: { alias: ['brawler'] },
    Barbaro: { alias: ['barbarian'] },
    Bardo: { inc: ['CAR', 'spontanei'], alias: ['bard'] },
    Cacciatore: { inc: ['SAG', 'spontanei'], alias: ['hunter'] },
    Cavaliere: { alias: ['cavalier'] },
    Chierico: { inc: ['SAG', 'preparati'], alias: ['cleric'] },
    Cineta: { alias: ['kineticist', 'cinetista'] },
    Convocatore: { inc: ['CAR', 'spontanei'], alias: ['summoner', 'evocatore'] },
    Druido: { inc: ['SAG', 'preparati'], alias: ['druid'] },
    Fattucchiere: { inc: ['INT', 'preparati'], alias: ['witch', 'strega', 'fattucchiera'] },
    Guerriero: { alias: ['fighter'] },
    'Guerriero Arcano': { alias: ['eldritch knight', 'cavaliere mistico'] },
    Inquisitore: { inc: ['SAG', 'spontanei'], alias: ['inquisitor'] },
    Intrepido: { alias: ['swashbuckler', 'spadaccino'] },
    Investigatore: { inc: ['INT', 'preparati'], alias: ['investigator'] },
    'Iracondo di Stirpe': { inc: ['CAR', 'spontanei'], alias: ['bloodrager', 'iracondo di sangue'] },
    Ladro: { alias: ['rogue'] },
    Mago: { inc: ['INT', 'preparati'], alias: ['wizard'] },
    Magus: { inc: ['INT', 'preparati'] },
    Medium: { inc: ['CAR', 'spontanei'] },
    Mesmerista: { inc: ['CAR', 'spontanei'], alias: ['mesmerist'] },
    Monaco: { alias: ['monk'] },
    Morfico: { alias: ['shifter'] },
    Occultista: { inc: ['INT', 'spontanei'], alias: ['occultist'] },
    Oracolo: { inc: ['CAR', 'spontanei'], alias: ['oracle'] },
    Paladino: { inc: ['CAR', 'preparati'], alias: ['paladin'] },
    Parapsichico: { inc: ['INT', 'spontanei'], alias: ['psychic', 'psichico'] },
    Pistolero: { alias: ['gunslinger'] },
    Predatore: { alias: ['slayer', 'uccisore', 'sicario'] },
    Ranger: { inc: ['SAG', 'preparati'] },
    'Sacerdote Guerriero': { inc: ['SAG', 'preparati'], alias: ['warpriest'] },
    Scaldo: { inc: ['CAR', 'spontanei'], alias: ['skald'] },
    Sciamano: { inc: ['SAG', 'preparati'], alias: ['shaman'] },
    Spiritista: { inc: ['SAG', 'spontanei'], alias: ['spiritualist'] },
    Stregone: { inc: ['CAR', 'spontanei'], alias: ['sorcerer'] },
    'Teurgo Mistico': { alias: ['mystic theurge', 'mistico teurgo'] },
  };
  // Classi di prestigio dal wiki (src/pf1-prestigio.js): progressione, dado vita, abilità di classe e tabella
  const PRESTIGIO = window.PF1_PRESTIGIO || {};
  // Classe personalizzata del master: uguale al Maestro del Sapere, ma ogni suo livello vale come livello effettivo
  // di Mago per poteri della scuola, incantesimi e talenti (non solo per gli incantesimi al giorno)
  const MS_MOD = 'Maestro del Sapere Mod';
  if (PRESTIGIO['Maestro del Sapere'] && !PRESTIGIO[MS_MOD]) {
    const b = PRESTIGIO['Maestro del Sapere'];
    const col = b.colonne.findIndex((x) => /^incantesimi al giorno$/i.test(x));
    PRESTIGIO[MS_MOD] = {
      ...b, fonte: 'Personalizzata dal master (variante del Maestro del Sapere)', pagina: 'Maestro_del_Sapere', personalizzata: true,
      nota: 'Ogni livello vale come un livello effettivo di Mago per poteri della scuola arcana, incantesimi (al giorno, livello dell\'incantatore, libro) e talenti (prerequisiti e talenti bonus del Mago).',
      colonne: b.colonne.map((x, i) => (i === col ? 'Livello effettivo di Mago' : x)),
      righe: b.righe.map((r) => r.map((v, j) => (j === 4 + col ? '+1 livello di Mago' : v))),
    };
  }
  for (const [nome, v] of Object.entries(PRESTIGIO)) {
    if (!DATI_CLASSI[nome]) DATI_CLASSI[nome] = [v.bab, v.ts, v.dv || 8, v.gradi || 2, v.abil.join(';'), 1];
    if (window.PF1_PROGRESSIONE && !window.PF1_PROGRESSIONE[nome]) window.PF1_PROGRESSIONE[nome] = { colonne: v.colonne, righe: v.righe };
  }
  const CLASSI = Object.fromEntries(Object.entries(DATI_CLASSI).map(([nome, [bab, ts, dv, gradi, abil, prestigio]]) => [nome, {
    bab, ts, dv, gradi, prestigio: !!prestigio,
    abil: abil.split(';').flatMap((a) => (a === '*K' ? KT : [a])),
    ...(EXTRA_CLASSI[nome] || {}),
  }]));

  // [nome, modificatore a CA e attacco, modificatore speciale per BMC/DMC, moltiplicatore di carico]
  const TAGLIE = [
    ['Piccolissima', 8, -8, 1 / 8], ['Minuta', 4, -4, 1 / 4], ['Minuscola', 2, -2, 1 / 2], ['Piccola', 1, -1, 3 / 4],
    ['Media', 0, 0, 1], ['Grande', -1, 1, 2], ['Enorme', -2, 2, 4], ['Mastodontica', -4, 4, 8], ['Colossale', -8, 8, 16],
  ];
  // Carico pesante in libbre per Forza 0–29 (oltre: ×4 ogni 10 punti); nella scheda è in kg (lb/2)
  const PESANTE_LB = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 150, 175, 200, 230, 260, 300, 350, 400, 460, 520, 600, 700, 800, 920, 1040, 1200, 1400];
  // PF bonus per ogni categoria mitica, per percorso (nomi e valori da Golarion Insider)
  const PF_MITICI = { Arcimago: 3, Campione: 5, Gerofante: 4, Maresciallo: 4, Mistificatore: 4, Protettore: 5 };
  const PERCORSI_VECCHI = { Guardiano: 'Protettore', Ierofante: 'Gerofante' };
  const PERCORSI = Object.keys(PF_MITICI);
  const TIPI_CAPACITA = ['Talento', 'Scoperta arcana', 'Tratto', 'Capacità di classe', 'Capacità razziale', 'Capacità mitica', 'Altro'];
  const CONDIZIONI = ['Abbagliato', 'Accecato', 'Accovacciato', 'Affascinato', 'Affaticato', 'Assordato', 'Barcollante', 'Confuso', 'Esausto', 'Frastornato', 'Immobilizzato', 'Impreparato', 'In Lotta', 'In Preda al Panico', 'Inabile', 'Incorporeo', 'Indifeso', 'Infermo', 'Intralciato', 'Invisibile', 'Livelli Negativi', 'Morente', 'Nauseato', 'Paralizzato', 'Pietrificato', 'Privo di Sensi', 'Prono', 'Sanguinante', 'Scosso', 'Spaventato', 'Stabilizzato', 'Stordito'];
  // Effetti in breve delle condizioni (dalle pagine del wiki Golarion Insider, Condizioni); il testo completo si legge dal wiki
  const EFFETTI_CONDIZIONI = {
    abbagliato: '−1 ai tiri per colpire e alle prove di Percezione basate sulla vista',
    accecato: '−2 alla CA e perde la DES alla CA; −4 alle abilità di FOR e DES e alla Percezione contrapposta; tutti gli avversari hanno occultamento totale (50%); prova di Acrobazia CD 10 per muoversi oltre metà velocità',
    accovacciato: 'non può agire; −2 alla CA e perde la DES alla CA',
    affascinato: 'resta fermo a prestare attenzione alla fonte; −4 alle prove di abilità fatte come reazione (es. Percezione); una minaccia evidente spezza l\'effetto',
    affaticato: 'non può correre né caricare; −2 a FOR e DES; se si affatica ancora diventa esausto',
    assordato: '−4 all\'iniziativa; fallisce la Percezione basata sul suono; 20% di fallire gli incantesimi con componente verbale',
    barcollante: 'una sola azione standard o di movimento per round (più azioni gratuite, veloci e immediate); niente round completo',
    confuso: 'non distingue alleati e nemici; agisce a caso secondo la tabella del wiki; attacca chi lo ha attaccato per ultimo',
    esausto: 'velocità dimezzata; −6 a FOR e DES; dopo 1 ora di riposo diventa affaticato',
    frastornato: 'non può compiere azioni, ma nessuna penalità alla CA; di solito dura 1 round',
    immobilizzato: 'non può muoversi, è impreparato e subisce un ulteriore −4 alla CA; azioni limitate (può tentare di liberarsi)',
    impreparato: 'perde la DES alla CA e alla DMC; niente attacchi di opportunità (salvo Riflessi in Combattimento o Schivare Prodigioso)',
    'in lotta': 'non può muoversi; −4 alla DES; −2 ai tiri per colpire e alle manovre (tranne lottare o liberarsi); niente azioni a due mani',
    'in preda al panico': 'è scosso; 50% di lasciar cadere ciò che tiene; fugge dalla fonte della paura per un percorso casuale',
    inabile: 'una sola azione standard o di movimento per round; velocità dimezzata; un\'azione faticosa gli fa perdere 1 PF',
    incorporeo: 'immune agli attacchi non magici; metà danni da armi magiche, incantesimi e capacità magiche o soprannaturali; danni pieni da effetti incorporei e di forza',
    indifeso: 'DES considerata 0 (−5); +4 agli attacchi in mischia contro di lui; si può subire un colpo di grazia',
    infermo: '−2 ai tiri per colpire e ai danni delle armi, ai tiri salvezza, alle prove di abilità e di caratteristica',
    intralciato: 'velocità dimezzata, niente corsa né carica; −2 ai tiri per colpire e −4 alla DES; per lanciare incantesimi serve una prova di concentrazione',
    invisibile: '+2 al tiro per colpire contro avversari che vedono; nega loro il bonus di DES alla CA',
    'livelli negativi': 'per ogni livello: −1 a prove, tiri per colpire, tiri salvezza, BMC e DMC; −5 PF; un livello effettivo in meno',
    morente: 'privo di sensi e non può agire; ogni turno prova di COS CD 10 per stabilizzarsi, altrimenti perde 1 PF',
    nauseato: 'non può attaccare, lanciare incantesimi né concentrarsi; solo un\'azione di movimento per turno',
    paralizzato: 'FOR e DES effettive 0; indifeso; solo azioni mentali; in volo precipita',
    pietrificato: 'trasformato in pietra; è privo di sensi',
    'privo di sensi': 'abbattuto e indifeso',
    prono: '−4 ai tiri per colpire in mischia; niente armi a distanza (tranne la balestra); +4 alla CA contro attacchi a distanza e −4 contro quelli in mischia; rialzarsi è un\'azione di movimento che provoca attacchi di opportunità',
    sanguinante: 'subisce il danno indicato all\'inizio del proprio turno; si ferma con Guarire CD 15 o con una cura magica',
    scosso: '−2 (morale) ai tiri per colpire, ai tiri salvezza e alle prove',
    spaventato: 'è scosso e fugge dalla fonte della paura il più velocemente possibile; se non può fuggire combatte',
    stabilizzato: 'non perde più PF ma resta privo di sensi',
    stordito: 'lascia cadere ciò che ha in mano, non può agire; −2 alla CA e perde la DES alla CA',
  };
  // Pagina del wiki con la descrizione completa (scosso, spaventato e panico stanno sotto Paura)
  const paginaCondizione = (nome) => ({ scosso: 'Paura', spaventato: 'Paura', 'in preda al panico': 'Paura' }[norm(nome)] || String(nome).replace(/\s+\d+$/, ''));
  const CARS = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'];
  const TS = [['tempra', 'Tempra', 'COS'], ['riflessi', 'Riflessi', 'DES'], ['volonta', 'Volontà', 'SAG']];
  // campi di testo del regolamento che la scheda PF1 calcola da sola
  const CAMPI_CALCOLATI = new Set(['Classe', 'Livello', 'Classe Armatura', 'BAB', 'Tempra', 'Riflessi', 'Volontà', 'Divinità', 'Razza']);
  // ---- Razze (dati in src/pf1-razze.js) ----
  const RAZZE = window.PF1_RAZZE || {};
  const razzaDi = (d) => RAZZE[d.razza?.nome] || null;
  // Razze con il tratto Talento Bonus (quanti talenti in più al 1° livello) e razze umane con Esperti (+1 grado per livello)
  const TALENTI_RAZZA = { Umano: 1, 'Umano Azlanti': 2, 'Sangue di Ashardalon': 1, Celestiale: 1 };
  const ESPERTI = new Set(['Umano', 'Umano Azlanti']);
  const espertoUmano = (d) => ESPERTI.has(razzaDi(d)?.nome) && !sostituitiDa(d).has(chiaveTratto('Esperti'));
  // Tratti razziali alternativi scelti (solo quelli della razza attuale)
  const alternativiScelti = (d) => {
    const r = razzaDi(d);
    const scelti = d.razza?.alternativi || [];
    return r ? r.alternativi.filter((a) => scelti.includes(a.nome)) : [];
  };
  // Tratti standard sostituiti dagli alternativi scelti
  // Confronto dei nomi dei tratti senza il tipo tra parentesi, es. "Flessuoso (Str)" = "Flessuoso"
  const chiaveTratto = (s) => norm(String(s).replace(/\s*\([^)]*\)\s*$/, ''));
  const sostituitiDa = (d) => new Set(alternativiScelti(d).flatMap((a) => a.sostituiti.map(chiaveTratto)));
  // Bonus razziali sempre attivi (abilità, tiri salvezza), trattati come bonus di tipo "razziale":
  // quelli dei tratti sostituiti cadono, quelli dei tratti alternativi scelti si aggiungono
  const effettiRazza = (d) => {
    const r = razzaDi(d);
    if (!r) return [];
    const via = sostituitiDa(d);
    const arte = r.arte && !via.has(chiaveTratto("Amante dell'Arte"))
      ? ['Canto', 'Oratoria', d.razza.strumento].filter(Boolean).map((t) => ({ bersaglio: `abil:Intrattenere (${t})`, valore: 4, tipo: 'razziale', tratto: "Amante dell'Arte" }))
      : [];
    return [...r.bonus.filter((b) => !via.has(chiaveTratto(b.tratto))), ...arte, ...alternativiScelti(d).flatMap((a) => a.bonus)];
  };
  // Amante dell'Arte (Celestiale): il beneficio vale per canto, poesia (Oratoria) e un tipo di strumento a scelta
  const STRUMENTI_ARTE = ['Strumenti a Corda', 'Strumenti a Fiato', 'Strumenti a Percussione', 'Strumenti a Tastiera'];
  // Velocità base della razza, tenendo conto dei tratti alternativi che la cambiano
  const velocitaRazza = (d) => {
    const a = alternativiScelti(d).find((x) => x.velocita);
    return a ? a.velocita : razzaDi(d)?.velocita;
  };
  const metri = (v) => `${String(v).replace('.', ',')} m`;
  // Bonus situazionali ai tiri salvezza dai tratti razziali (dati in src/pf1-razze-ts.js): solo tratti posseduti
  function condRazza(d) {
    const r = razzaDi(d);
    if (!r) return [];
    const via = sostituitiDa(d);
    const alt = new Set(alternativiScelti(d).map((a) => chiaveTratto(a.nome)));
    const standard = new Set(r.tratti.map(chiaveTratto));
    return [...((window.PF1_RAZZE_TS || {})[r.nome] || []), ...(r.tsCond || [])].filter(([t]) => {
      const k = chiaveTratto(t);
      return alt.has(k) || (standard.has(k) && !via.has(k));
    }).map(([tratto, valore, tipo, ts, testo], i) => ({ id: `razza${i}`, testo, valore, tipo, ts, tratto, razza: true }));
  }

  // ---- Equipaggiamento dal wiki (dati in src/pf1-equip.js) ----
  // Gli attacchi naturali (src/pf1-attacchi-naturali.js) si aggiungono alle armi come gruppo a parte:
  // [nome, 'Attacchi Naturali', Primario/Secondario, costo, danni P, danni M, critico, gittata, peso, tipo, speciale, danni per taglia]
  const TAGLIE_NATURALI = ['Piccolissima', 'Minuta', 'Minuscola', 'Piccola', 'Media', 'Grande', 'Enorme', 'Mastodontica', 'Colossale'];
  const EQUIP = (() => {
    const base = window.PF1_EQUIP || { armi: [], armature: [] };
    const naturali = (window.PF1_ATTACCHI_NATURALI || []).map(([nome, attacco, tipo, t]) => [nome, 'Attacchi Naturali', attacco, '—', t[3], t[4], 'x2', '—', '—', tipo, `attacco naturale ${attacco.toLowerCase()}`, t]);
    return { ...base, armi: [...base.armi, ...naturali] };
  })();
  const numeroDa = (s) => { const m = String(s || '').replace(/\./g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : ''; };
  // Tendina raggruppata + pulsanti per aggiungere un'arma o un'armatura con i valori del wiki
  function sceltaEquip(p, lista) {
    const voci = EQUIP[lista];
    if (!voci.length) return '';
    const gruppi = new Map();
    for (const v of voci) {
      const g = lista === 'armi' ? `${v[1]} · ${v[2] || 'varie'}` : v[1] || 'Altro';
      if (!gruppi.has(g)) gruppi.set(g, []);
      gruppi.get(g).push(v[0]);
    }
    const opzioni = [...gruppi].map(([g, nomi]) => `<optgroup label="${esc(g)}">${nomi.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</optgroup>`).join('');
    return `<span class="pf-dal-wiki">dal wiki: <select id="scelta-${lista}-${p.id}"><option value="">— scegli —</option>${opzioni}</select>
      <button class="btn-piccolo" data-azione="pf1-equip-wiki" data-id="${p.id}" data-lista="${lista}">Aggiungi</button>
      <button class="btn-mini" data-azione="pf1-info-equip" data-id="${p.id}" data-lista="${lista}" title="Scheda dal wiki dell'oggetto scelto">i</button></span>`;
  }
  // Valori della scheda presi da una riga della tabella del wiki
  function daTabellaArma(v, taglia) {
    const [nome, categoria, gruppo, , dP, dM, critico, gittata, peso] = v;
    // Attacco naturale: danni dalla taglia del personaggio; i secondari a −5 per colpire e con metà FOR ai danni
    if (categoria === 'Attacchi Naturali') {
      const i = TAGLIE_NATURALI.indexOf(taglia || 'Media');
      const secondario = gruppo === 'Secondario';
      return {
        nome, tipo: 'mischia', danni: v[11]?.[i < 0 ? 4 : i] || dM || '', critico: '20/×2', carDanni: secondario ? 'FOR05' : 'FOR',
        bonus: secondario ? -5 : '', peso: '', gittata: '',
      };
    }
    const distanza = /Distanza/.test(gruppo) || categoria === 'Armi da Fuoco';
    const piccola = ['Piccola', 'Minuscola', 'Minuta', 'Piccolissima'].includes(taglia);
    const crit = String(critico || '').replace(/x/g, '×');
    return {
      nome, tipo: distanza ? 'distanza' : 'mischia',
      danni: (piccola ? dP : dM) || '',
      critico: !crit || crit === '—' ? '20/×2' : crit.includes('/') ? crit : `20/${crit}`,
      carDanni: distanza ? (/Arco|Balestra/i.test(nome) || categoria === 'Armi da Fuoco' ? 'nessuno' : 'FOR') : /Due Mani/i.test(gruppo) ? 'FOR15' : 'FOR',
      peso: numeroDa(peso), gittata: gittata && gittata !== '—' ? gittata : '',
    };
  }
  function daTabellaArmatura(v) {
    const [nome, gruppo, , bonus, desMax, penalita, fallimento, , , peso] = v;
    return {
      nome, tipo: /Scudi/i.test(gruppo) ? 'scudo' : 'armatura', bonus: numeroDa(bonus),
      desMax: numeroDa(desMax), penalita: Math.abs(numeroDa(penalita) || 0) || '', fallimento: numeroDa(fallimento), peso: numeroDa(peso),
    };
  }

  // ---- Armi e armature magiche, perfette, di materiali speciali (nomi dalla pagina "Materiali Speciali" del wiki) ----
  // perfetto: il materiale rende sempre l'oggetto perfetto; arm/arma: effetti numerici sulla scheda; nota: il resto, da ricordare
  const MATERIALI = {
    Adamantio: { perfetto: true, nota: 'armatura: RD 1/— leggera, 2/— media, 3/— pesante · arma: ignora durezza inferiore a 20' },
    'Argento Alchemico': { arma: { danni: -1 }, nota: 'supera la RD/argento; −1 ai danni (minimo 1)' },
    'Ferro Freddo': { nota: 'supera la RD/ferro freddo; costa il doppio da incantare' },
    Legnoscuro: { perfetto: true, arm: { penalita: 2 }, peso: 0.5, nota: 'solo oggetti di legno; peso dimezzato' },
    Mithral: { perfetto: true, arm: { desMax: 2, penalita: 3, fallimento: 10 }, peso: 0.5, nota: 'conta come una categoria più leggera; peso dimezzato' },
    'Pelle di Drago': { perfetto: true, nota: 'immunità a un tipo di energia se fatta col drago giusto (vedi wiki)' },
    'Acciaio Forgiato per il Fuoco': { nota: 'vedi wiki' }, 'Acciaio Forgiato per il Ghiaccio': { nota: 'vedi wiki' }, 'Acciaio Vivente': { nota: 'si ripara da solo; vedi wiki' },
    'Bronzo Eliseo': { nota: 'vedi wiki' }, 'Criniera di Grifone': { nota: 'vedi wiki' }, 'Cristallo Sanguinario': { nota: 'vedi wiki' }, Legnofrusta: { nota: 'vedi wiki' },
    Legnoverde: { nota: 'vedi wiki' }, 'Pelle di Angelo': { nota: 'vedi wiki' }, 'Pelle di Anguilla': { nota: 'vedi wiki' }, 'Radice di Wyrwood': { nota: 'vedi wiki' },
    'Stoffa di Fogliascura': { nota: 'vedi wiki' }, Viridio: { nota: 'vedi wiki' },
  };
  const OPZ_MATERIALI = [['', 'normale'], ...Object.keys(MATERIALI).sort((a, b) => a.localeCompare(b, 'it')).map((x) => [x, x])];
  const OPZ_MAGIA = [['', '—'], ...[1, 2, 3, 4, 5].map((v) => [String(v), `+${v}`])];
  const OPZ_MAGIA_ART = [...OPZ_MAGIA, ['6', '+6 (artefatto)']]; // solo gli artefatti arrivano a +6
  function armaEffettiva(a) {
    const mat = MATERIALI[a.materiale] || {};
    const pot = n(a.potenziamento);
    const perfetta = a.perfetta || mat.perfetto;
    return { colpire: pot > 0 ? pot : perfetta ? 1 : 0, danni: pot, malus: mat.arma?.danni || 0, peso: n(a.peso) * (mat.peso || 1) };
  }
  function armaturaEffettiva(a) {
    const mat = MATERIALI[a.materiale] || {};
    const perfetta = a.perfetta || mat.perfetto;
    // La riduzione della penalità del materiale comprende già quella della qualità perfetta
    const riduci = Math.max(perfetta ? 1 : 0, mat.arm?.penalita || 0);
    const desMax = a.desMax === '' || a.desMax == null ? a.desMax : n(a.desMax) + (mat.arm?.desMax || 0);
    return {
      bonus: n(a.bonus) + n(a.potenziamento), desMax,
      penalita: Math.max(0, Math.abs(n(a.penalita)) - riduci),
      fallimento: Math.max(0, n(a.fallimento) - (mat.arm?.fallimento || 0)),
      peso: n(a.peso) * (mat.peso || 1),
    };
  }
  // Riga di controlli comune: magia, perfetta, materiale (+ nota del materiale)
  const controlliMagia = (lista, x, chk, sel) => `<label title="Potenziamento magico (+6 solo per gli artefatti)">Magia ${sel(`${lista}#${x.id}|potenziamento`, n(x.potenziamento) > 5 ? OPZ_MAGIA_ART : OPZ_MAGIA, x.potenziamento ?? '', 'data-ridisegna-pf1')}</label>
    <label class="pf-chk" title="Qualità perfetta: ${lista === 'armi' ? '+1 a colpire (non si somma alla magia)' : 'penalità alla prova −1'}">${chk(`${lista}#${x.id}|perfetta`, x.perfetta, 'data-ridisegna-pf1')} Perfett${lista === 'armi' ? 'a' : 'a'}</label>
    <label>Materiale ${sel(`${lista}#${x.id}|materiale`, OPZ_MATERIALI, x.materiale || '', 'data-ridisegna-pf1')}</label>
    ${MATERIALI[x.materiale]?.nota ? `<small class="muto" title="${esc(MATERIALI[x.materiale].nota)}">ⓘ ${esc(MATERIALI[x.materiale].nota.slice(0, 60))}${MATERIALI[x.materiale].nota.length > 60 ? '…' : ''}</small>` : ''}`;

  // ---- Compagni: compagno animale, famiglio, eidolon (dati in src/pf1-compagni.js) ----
  const COMP = window.PF1_COMPAGNI || { compagno: [], specie: {}, famiglio: [], famigli: [], eidolon: [], forme: {} };
  const TIPI_COMPAGNO = [['compagno', 'Compagno animale'], ['famiglio', 'Famiglio'], ['eidolon', 'Eidolon']];
  // Livello che fa avanzare il compagno: dalle classi del padrone, salvo valore scritto a mano
  function livelloPadrone(d, x) {
    if (x.livello !== '' && x.livello != null) return Math.max(0, Math.min(20, n(x.livello)));
    const L = (k) => livelloClasse(d, k);
    if (x.tipo === 'compagno') return Math.min(20, Math.max(L('Druido'), L('Cacciatore'), L('Cavaliere'), L('Ranger') - 3, 0));
    if (x.tipo === 'famiglio') return Math.min(20, L('Mago') + L('Stregone') + L('Fattucchiere') + L('Arcanista'));
    return Math.min(20, L('Convocatore'));
  }
  const speciali = (righe, i) => [...new Set(righe.slice(0, i).flatMap((r) => String(r).split(/,\s*/)).filter((s) => s && !/^[—-]$/.test(s.trim())))];
  function calcolaCompagno(d, c, x) {
    const L = livelloPadrone(d, x);
    const extra = x.carExtra || {};
    const out = { L, car: {}, dv: 0, bab: 0, tsBase: { tempra: 0, riflessi: 0, volonta: 0 }, natArm: 0, taglia: 'Media', vel: '', att: '', qs: '', speciali: [], righe: [], dado: 8, pf: 0 };
    if (!L) return out;
    if (x.tipo === 'compagno') {
      const row = COMP.compagno[L - 1];
      const sp = COMP.specie[x.specie];
      const av = sp?.l && L >= sp.l ? sp.a : null;
      const base = { FOR: 10, DES: 10, COS: 10, INT: 2, SAG: 10, CAR: 6, ...(sp?.i.car || {}) };
      for (const [k, v] of Object.entries(av?.car || {})) if (v != null) base[k] = n(base[k]) + v;
      const fd = n(row[8]);
      Object.assign(out, {
        dv: n(row[0]), bab: n(row[1]), tsBase: { tempra: n(row[2]), riflessi: n(row[3]), volonta: n(row[4]) },
        natArm: n(sp?.i.ca) + n(av?.ca) + n(row[7]), taglia: av?.taglia || sp?.i.taglia || 'Media', vel: av?.vel || sp?.i.vel || '',
        att: av?.att || sp?.i.att || '', qs: [sp?.i.qs, av?.qs].filter(Boolean).join(', '), speciali: speciali(COMP.compagno.map((r) => r[10]), L),
        righe: [['Abilità (gradi)', row[5]], ['Talenti', row[6]], ['Comandi bonus', row[9]], ['Bonus For/Des', row[8]]], dado: 8,
      });
      for (const s of CARS) out.car[s] = base[s] == null ? null : n(base[s]) + (s === 'FOR' || s === 'DES' ? fd : 0) + n(extra[s]);
      if (av) out.qs += `${out.qs ? ' · ' : ''}avanzamento al ${sp.l}° applicato`;
    } else if (x.tipo === 'famiglio') {
      const row = COMP.famiglio[Math.min(COMP.famiglio.length, Math.ceil(L / 2)) - 1];
      const base = x.carBase || {};
      for (const s of CARS) out.car[s] = (s === 'INT' ? Math.max(n(row[2]), n(base[s]) || 0) : (base[s] === '' || base[s] == null ? 10 : n(base[s]))) + n(extra[s]);
      // Il famiglio usa BAB e tiri salvezza base del padrone, metà dei suoi PF, e i suoi DV sono il livello del padrone
      Object.assign(out, {
        dv: L, bab: c.bab, tsBase: { tempra: c.ts.tempra.base, riflessi: c.ts.riflessi.base, volonta: c.ts.volonta.base },
        natArm: n(row[1]) + n(x.natBase), taglia: x.taglia || 'Minuscola', vel: x.vel || '', att: x.att || '',
        speciali: speciali(COMP.famiglio.map((r) => r[3]), Math.ceil(L / 2)), righe: [['Intelligenza minima', row[2]], ['Armatura naturale (bonus)', '+' + row[1]]],
        pf: Math.floor(c.pfMax / 2),
      });
    } else {
      const row = COMP.eidolon[L - 1];
      const f = COMP.forme[x.forma] || Object.values(COMP.forme)[0] || { car: {}, ts: {}, ca: 0 };
      const fd = n(row[7]);
      for (const s of CARS) out.car[s] = n(f.car[s] ?? 10) + (s === 'FOR' || s === 'DES' ? fd : 0) + n(extra[s]);
      const buono = n(row[2]), scarso = n(row[3]);
      Object.assign(out, {
        dv: n(row[0]), bab: n(row[1]), tsBase: { tempra: f.ts.tempra ? buono : scarso, riflessi: f.ts.riflessi ? buono : scarso, volonta: f.ts.volonta ? buono : scarso },
        natArm: n(f.ca) + n(row[6]), taglia: f.taglia || 'Media', vel: f.vel || '', att: f.att || '', qs: f.evo ? `evoluzioni gratuite: ${f.evo}` : '',
        speciali: speciali(COMP.eidolon.map((r) => r[10]), L), dado: 10,
        righe: [['Abilità (gradi)', row[4]], ['Talenti', row[5]], ['Punti evoluzione', row[8]], ['Attacchi naturali max', row[9]], ['Bonus For/Des', row[7]]],
      });
    }
    const m = {};
    for (const s of CARS) m[s] = out.car[s] == null ? 0 : Math.floor((out.car[s] - 10) / 2);
    const t = TAGLIE.find((y) => y[0] === out.taglia) || TAGLIE[4];
    out.m = m;
    if (!out.pf) out.pf = Math.max(1, Math.floor(out.dv * (out.dado / 2 + 0.5)) + m.COS * out.dv);
    out.ca = 10 + m.DES + out.natArm + t[1];
    out.contatto = 10 + m.DES + t[1];
    out.sorpresa = 10 + out.natArm + t[1];
    out.ts = { tempra: out.tsBase.tempra + m.COS, riflessi: out.tsBase.riflessi + m.DES, volonta: out.tsBase.volonta + m.SAG };
    out.colpire = out.bab + m.FOR + t[1];
    out.bmc = out.bab + m.FOR + t[2];
    out.dmc = 10 + out.bab + m.FOR + m.DES + t[2];
    out.iniz = m.DES;
    return out;
  }
  // Bonus che il famiglio dà al padrone ("+2 ai Tiri Salvezza su Riflessi", "+3 alle prove di Scalare")
  function effettiFamiglio(testo, abilita) {
    let m;
    if ((m = testo.match(/\+(\d+) ai Tiri Salvezza su (Tempra|Riflessi|Volontà)/i))) return [E({ tempra: 'tempra', riflessi: 'riflessi', 'volontà': 'volonta' }[m[2].toLowerCase()], +m[1])];
    if ((m = testo.match(/\+(\d+) (?:alle prove di|all'|alla)\s*Iniziativa/i))) return [E('iniz', +m[1])];
    if ((m = testo.match(/\+(\d+) alle prove di ([^.,(]+)/i))) {
      const nome = abilita.find((a) => norm(a.nome) === norm(m[2].trim()));
      return nome ? [E('abil:' + nome.nome, +m[1])] : [];
    }
    return [];
  }
  function sezioneCompagni(p, d, c, r, aiut) {
    const { chk, sel, num, campo, togli } = aiut;
    const id = p.id;
    const schede = d.compagni.map((x) => {
      const s = calcolaCompagno(d, c, x);
      const tipo = TIPI_COMPAGNO.find((t) => t[0] === x.tipo)?.[1] || 'Compagno';
      const scelta = x.tipo === 'compagno'
        ? `<label>Specie <input list="pf1-specie-compagno" data-pf1="compagni#${x.id}|specie" data-id="${id}" value="${esc(x.specie || '')}" data-ridisegna-pf1 placeholder="es. Lupo"></label>`
        : x.tipo === 'famiglio'
          ? `<label>Famiglio <input list="pf1-specie-famiglio" data-pf1="compagni#${x.id}|specie" data-id="${id}" value="${esc(x.specie || '')}" data-ridisegna-pf1 placeholder="es. Gatto"></label>`
          : `<label>Forma ${sel(`compagni#${x.id}|forma`, Object.keys(COMP.forme).map((f) => [f, f]), x.forma || Object.keys(COMP.forme)[0], 'data-ridisegna-pf1')}</label>`;
      const fam = x.tipo === 'famiglio' ? COMP.famigli.find((f) => norm(f[0]) === norm(x.specie || '')) : null;
      const carRighe = CARS.map((k) => `<div class="comp-car"><span class="muto">${k}</span><b>${s.car[k] == null ? '—' : s.car[k]}</b><small>${s.car[k] == null ? '' : segno(s.m[k])}</small>
          ${x.tipo === 'famiglio' ? `<label title="Punteggio base della specie">base ${num(`compagni#${x.id}|carBase|${k}`, x.carBase?.[k] ?? '', 'data-ridisegna-pf1 class="pf-corto"')}</label>` : ''}
          <label title="Aumenti di caratteristica, oggetti, altro">+ ${num(`compagni#${x.id}|carExtra|${k}`, x.carExtra?.[k] ?? '', 'data-ridisegna-pf1 class="pf-corto"')}</label></div>`).join('');
      // Quante volte la tabella concede "Aumento di Caratteristica" fino al livello attuale
      const nAumenti = x.tipo === 'famiglio' ? 0 : (x.tipo === 'compagno' ? COMP.compagno : COMP.eidolon).slice(0, s.L).filter((rr) => /Aumento di Caratteristica/i.test(rr[10])).length;
      return `<div class="comp-scheda">
        <div class="pf-riga"><b class="comp-tipo">${tipo}</b>
          <input class="pf-largo" data-pf1="compagni#${x.id}|nome" data-id="${id}" value="${esc(x.nome || '')}" placeholder="Nome">
          ${scelta}
          <label title="Vuoto = calcolato dalle classi del personaggio">Livello ${num(`compagni#${x.id}|livello`, x.livello ?? '', `data-ridisegna-pf1 placeholder="${s.L}" class="pf-corto"`)}</label>
          ${togli('compagni', x.id)}</div>
        ${!s.L ? '<p class="muto">Nessun livello utile: aggiungi la classe che lo concede (o scrivi il livello a mano).</p>' : `
        <div class="comp-griglia">
          <div><span class="muto">Livello effettivo</span> <b>${s.L}</b> · <span class="muto">DV</span> <b>${s.dv}</b> · <span class="muto">PF</span> ${num(`compagni#${x.id}|pfAttuali`, x.pfAttuali ?? '', `placeholder="${s.pf}" class="pf-corto"`)} / <b>${s.pf}</b></div>
          <div><span class="muto">CA</span> <b>${s.ca}</b> <small class="muto">(contatto ${s.contatto}, impreparato ${s.sorpresa}; armatura naturale +${s.natArm})</small></div>
          <div><span class="muto">TS</span> Tem <b>${segno(s.ts.tempra)}</b> · Rif <b>${segno(s.ts.riflessi)}</b> · Vol <b>${segno(s.ts.volonta)}</b></div>
          <div><span class="muto">BAB</span> <b>${segno(s.bab)}</b> · <span class="muto">colpire in mischia</span> <b>${segno(s.colpire)}</b> · BMC <b>${segno(s.bmc)}</b> · DMC <b>${s.dmc}</b> · <span class="muto">Iniz.</span> <b>${segno(s.iniz)}</b></div>
          <div><span class="muto">Taglia</span> ${esc(s.taglia)}${s.vel ? ` · <span class="muto">Velocità</span> ${esc(s.vel)}` : ''}</div>
          ${s.att || x.tipo === 'famiglio' ? `<div><span class="muto">Attacchi</span> ${x.tipo === 'famiglio' ? campo(`compagni#${x.id}|att`, x.att || '', 'placeholder="es. 2 artigli (1d2)" class="pf-largo"') : esc(s.att)} <small class="muto">(+${Math.max(0, s.m.FOR)} danni da FOR)</small></div>` : ''}
          ${s.qs ? `<div><span class="muto">Qualità</span> ${esc(s.qs)}</div>` : ''}
          ${s.righe.map(([k2, v]) => `<span class="comp-voce"><span class="muto">${esc(k2)}</span> <b>${esc(v)}</b></span>`).join(' ')}
        </div>
        <div class="comp-cars">${carRighe}</div>
        ${nAumenti > 0 ? `<p class="muto pf-aiuto">Aumenti di caratteristica ottenuti: ${nAumenti} (+1 ciascuno): mettili nei campi "+".</p>` : ''}
        ${fam ? `<p class="pf-aiuto"><span class="muto">Al padrone:</span> ${esc(fam[1])}${x.bonusId ? ' <small class="muto">(già tra i bonus attivi)</small>' : ''}</p>` : ''}
        <div class="priv-classe"><span class="muto">Capacità:</span> ${s.speciali.map((z) => esc(z)).join(', ') || '—'}</div>`}
        ${campo(`compagni#${x.id}|note`, x.note || '', 'placeholder="note (talenti, trucchi, evoluzioni, oggetti…)" class="pf-largo comp-note"')}
      </div>`;
    }).join('');
    return `${schede || '<p class="muto">Nessun compagno.</p>'}
      <div class="pf-piede">${TIPI_COMPAGNO.map(([k2, nome]) => `<button class="btn-piccolo" data-azione="pf1-aggiungi-compagno" data-id="${id}" data-tipo="${k2}">+ ${nome}</button>`).join(' ')}
        <span class="muto">Il livello si calcola dalle classi: Druido, Cacciatore, Cavaliere, Ranger −3 (compagno); Mago, Stregone, Fattucchiere, Arcanista (famiglio); Convocatore (eidolon).</span></div>
      ${datalistFisso('pf1-specie-compagno', () => Object.keys(COMP.specie).map((s) => `<option value="${esc(s)}">`).join(''))}
      ${datalistFisso('pf1-specie-famiglio', () => COMP.famigli.map((f) => `<option value="${esc(f[0])}">${esc(f[1])}</option>`).join(''))}`;
  }

  // ---- Oggetti magici (dati in src/pf1-oggetti.js) ----
  const OGGETTI = window.PF1_OGGETTI || [];
  // Oggetti con bonus fissi: diventano un bonus attivabile con il tipo giusto (così il cumulo funziona da solo)
  const EFFETTI_OGGETTI = [
    [/^Anello di Protezione \+(\d)/, (v) => [E('ca', v, 'deviazione')]],
    [/^Mantello della Resistenza \+(\d)/, (v) => [E('ts', v, 'resistenza')]],
    [/^Amuleto dell'Armatura Naturale \+(\d)/, (v) => [E('ca', v, 'potenziamento arm. naturale')]],
    [/^Bracciali dell'Armatura \+(\d)/, (v) => [E('ca', v, 'armatura')]],
    [/^Cintura della Forza del Gigante \+(\d)/, (v) => [E('FOR', v, 'potenziamento')]],
    [/^Cintura dell'Agilità \+(\d)/, (v) => [E('DES', v, 'potenziamento')]],
    [/^Cintura del Vigore \+(\d)/, (v) => [E('COS', v, 'potenziamento')]],
    [/^Cintura della Potenza Fisica \+(\d)/, (v) => [E('FOR', v, 'potenziamento'), E('DES', v, 'potenziamento')], 'due caratteristiche fisiche a scelta: cambia quelle sbagliate'],
    [/^Cintura della Perfezione Fisica \+(\d)/, (v) => [E('FOR', v, 'potenziamento'), E('DES', v, 'potenziamento'), E('COS', v, 'potenziamento')]],
    [/^Fascia della Sapienza \+(\d)/, (v) => [E('INT', v, 'potenziamento')]],
    [/^Fascia dell'Ispirazione \+(\d)/, (v) => [E('SAG', v, 'potenziamento')]],
    [/^Fascia della Seduzione \+(\d)/, (v) => [E('CAR', v, 'potenziamento')]],
    [/^Fascia della Prodezza Mentale \+(\d)/, (v) => [E('INT', v, 'potenziamento'), E('SAG', v, 'potenziamento')], 'due caratteristiche mentali a scelta: cambia quelle sbagliate'],
    [/^Fascia della Superiorità Mentale \+(\d)/, (v) => [E('INT', v, 'potenziamento'), E('SAG', v, 'potenziamento'), E('CAR', v, 'potenziamento')]],
  ];
  const effettiOggetto = (nome) => {
    for (const [re, f, nota] of EFFETTI_OGGETTI) { const m = nome.match(re); if (m) return { effetti: f(Number(m[1])), nota: nota || '' }; }
    return null;
  };
  const oggettoDi = (nome) => OGGETTI.find((o) => norm(o[0]) === norm(nome)) || null;
  // Equipaggiamento comune dal wiki (src/pf1-merci.js): [gruppo, nome, costo, peso in kg, dettagli, valore in mo, fonte, pagina]
  const MERCI = window.PF1_MERCI?.catalogo || [];
  const merceDi = (nome) => MERCI.find((x) => norm(x[1]) === norm(nome || '')) || null;
  // Descrizione di un oggetto comune: la riga della tabella della pagina del gruppo (per le varianti, la riga dell'oggetto base)
  const estraiMerce = (nome) => (doc) => {
    const base = nome.replace(/\s*\([^)]*\)\s*$/, '');
    const righe = [...doc.querySelectorAll('#mw-content-text tr')];
    const riga = righe.find((r) => norm(r.cells[0]?.textContent.trim() || '') === norm(nome)) || righe.find((r) => norm(r.cells[0]?.textContent.trim() || '') === norm(base));
    if (!riga) return '';
    const testi = [...riga.cells].map((c) => c.textContent.replace(/\s+/g, ' ').trim());
    const lungo = testi.reduce((a, b) => (b.length > a.length ? b : a), '');
    return lungo.length > 40 ? lungo : '';
  };

  // ---- Slot del corpo per gli oggetti magici indossati ----
  // [chiave, nome, punto sul corpo (x, y) nello schema]
  // Slot del corpo: punto sulla figura dell'immagine src/img/sagoma-slot.webp (coordinate in pixel dell'immagine, 683×1024)
  const SLOT_CORPO = [
    ['testa', 'Testa', 340, 108], ['fronte', 'Fronte', 340, 128], ['occhi', 'Occhi', 352, 150], ['collo', 'Collo', 340, 207],
    ['spalle', 'Spalle', 425, 245], ['torace', 'Torace', 345, 290], ['corpo', 'Corpo', 322, 350], ['armatura', 'Armatura', 365, 395],
    ['cintura', 'Cintura', 340, 470], ['polsi', 'Polsi', 482, 490], ['mani', 'Mani', 492, 522], ['anello1', 'Anello 1', 497, 545],
    ['anello2', 'Anello 2', 185, 545], ['scudo', 'Scudo', 215, 430], ['piedi', 'Piedi', 368, 905],
  ];
  const SLOT_WIKI = { mani: 'mani', corpo: 'corpo', torace: 'torace', spalle: 'spalle', collo: 'collo', polsi: 'polsi', anello: 'anello', armatura: 'armatura', testa: 'testa', cintura: 'cintura', scudo: 'scudo', occhi: 'occhi', piedi: 'piedi', fronte: 'fronte' };
  // Slot automatico di un oggetto: dal database del wiki, dagli oggetti creati (anelli) o dal nome ("Anello di…")
  function slotAuto(o, d) {
    const w = oggettoDi(o.nome);
    if (w) return SLOT_WIKI[norm(w[2])] || '';
    const x = o.creazioneId ? (d.creazioni || []).find((y) => y.id === o.creazioneId) : null;
    if (x?.categoria === 'anello' || /^anello\b/i.test(o.nome || '')) return 'anello';
    return '';
  }
  // Riassunto: per ogni slot gli oggetti indossati (armature e scudi indossati compresi); gli anelli vanno nei due slot in ordine
  function slotIndossati(d) {
    const L = window.Luoghi;
    const per = Object.fromEntries(SLOT_CORPO.map(([k]) => [k, []]));
    const anelli = [];
    for (const o of d.oggetti) {
      if (L && L.tipoDi(L.luogo(o, d), d).k !== 'indossato') continue;
      const s = o.slot === 'nessuno' ? '' : o.slot || slotAuto(o, d);
      if (!s) continue;
      if (s === 'anello') anelli.push(o.nome || 'anello');
      else if (per[s]) per[s].push(o.nome || 'oggetto');
    }
    for (const nome of anelli) (per.anello1.length <= per.anello2.length ? per.anello1 : per.anello2).push(nome);
    for (const a of d.armature.filter((x) => x.indossata)) per[a.tipo === 'scudo' ? 'scudo' : 'armatura'].push(a.nome || (a.tipo === 'scudo' ? 'scudo' : 'armatura'));
    return per;
  }
  function schemaSlot(d) {
    const per = slotIndossati(d);
    const pieni = SLOT_CORPO.filter(([k]) => per[k].length).length;
    const doppi = SLOT_CORPO.filter(([k]) => per[k].length > 1);
    const riga = 40;
    const alto = 18 + SLOT_CORPO.length * riga;
    // Ritaglio dell'immagine mostrato a sinistra: la figura (x 150-530, y 80-930 dell'immagine) riempie il riquadro;
    // l'elenco degli slot sta più a destra (TESTI), con le linee che lo collegano ai punti sul corpo
    const S = alto / 850, OX = 150, OY = 80, LARGO = Math.round(380 * S), TESTI = LARGO + 170, LARGHEZZA = TESTI + 330;
    const px = (x) => Math.round((x - OX) * S * 10) / 10;
    const py = (y) => Math.round((y - OY) * S * 10) / 10;
    const voci = SLOT_CORPO.map(([k, nome, ix, iy], i) => {
      const x = px(ix), y = py(iy);
      const ly = 18 + i * riga;
      const og = per[k];
      const stato = og.length > 1 ? 'doppio' : og.length ? 'pieno' : 'vuoto';
      const testo = og.length ? og.join(', ') : '—';
      const breve = testo.length > 40 ? `${testo.slice(0, 38)}…` : testo;
      return `<g class="slot-${stato}"><title>${esc(nome)}: ${esc(testo)}</title>
        <polyline points="${x},${y} ${LARGO + 10},${y} ${TESTI - 60},${ly} ${TESTI - 8},${ly}" class="slot-linea"/>
        <circle cx="${x}" cy="${y}" r="5" class="slot-punto"/>
        <text x="${TESTI}" y="${ly - 3}" class="slot-nome">${esc(nome)}${og.length > 1 ? ' ⚠' : ''}</text>
        <text x="${TESTI}" y="${ly + 13}" class="slot-ogg">${esc(breve)}</text></g>`;
    }).join('');
    // Figura: l'immagine della sala con la sagoma luminosa, ritagliata e sfumata verso le scritte
    const sagoma = `<defs>
        <clipPath id="slot-ritaglio"><rect x="0" y="0" width="${LARGO}" height="${alto}" rx="10"/></clipPath>
        <linearGradient id="slot-sfuma" x1="0" x2="1" y1="0" y2="0"><stop offset="0.72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
      </defs>
      <g clip-path="url(#slot-ritaglio)">
        <image href="src/img/sagoma-slot.webp" x="${-OX * S}" y="${-OY * S}" width="${683 * S}" height="${1024 * S}" preserveAspectRatio="none"/>
        <rect x="0" y="0" width="${LARGO}" height="${alto}" fill="url(#slot-sfuma)"/>
      </g>
      <rect x="0.5" y="0.5" width="${LARGO - 1}" height="${alto - 1}" rx="10" class="slot-cornice"/>`;
    return `<div class="slot-box">
        <svg class="slot-schema" viewBox="0 0 ${LARGHEZZA} ${alto}" role="img" aria-label="Oggetti magici indossati per slot del corpo">${sagoma}${voci}</svg>
        <p class="muto pf-aiuto">${pieni} slot su ${SLOT_CORPO.length} occupati · contano gli oggetti nel luogo «Indossato», le armature e gli scudi indossati.
          ${doppi.length ? `<span class="oltre">⚠ Due oggetti nello stesso slot: ${esc(doppi.map(([, nm]) => nm).join(', '))} — di solito funziona solo il primo indossato.</span>` : ''}
          Lo slot si prende dal database del wiki; per gli altri oggetti sceglilo nella riga dell'oggetto.</p>
      </div>`;
  }

  // ---- Archetipi (dati in src/pf1-archetipi.js) ----
  // Più gli archetipi «di Golarion» (src/pf1-archetipi-golarion.js), che hanno la loro pagina del wiki in fondo
  const ARCHETIPI = (() => {
    const out = { ...(window.PF1_ARCHETIPI || {}) };
    for (const [cl, l] of Object.entries(window.PF1_ARCHETIPI_GOLARION || {})) out[cl] = [...(out[cl] || []), ...l].sort((a, b) => a[0].localeCompare(b[0], 'it'));
    return out;
  })();
  const archetipiClasse = (cl) => ARCHETIPI[nomeClasse(cl.nome)] || [];
  const archetipoDi = (cl, nome) => archetipiClasse(cl).find((a) => a[0] === nome) || null;
  const sceltiClasse = (cl) => (cl.archetipi || []).map((x) => archetipoDi(cl, x)).filter(Boolean);
  // "Addestramento nelle Armi 1 e 2, Padronanza dell'Arma" -> [{ base: 'addestramento nelle armi', nums: [1, 2] }, …]
  function vociPrivilegi(testo) {
    return String(testo || '').split(/,\s*(?=[A-ZÀ-Ý])|\s+e\s+(?=[A-ZÀ-Ý])|;\s*/).map((s) => {
      const nums = (s.match(/\d+/g) || []).map(Number);
      const base = norm(s.replace(/\(.*?\)/g, '').replace(/tutti (?:i|gli) (?:livelli|avanzamenti) (?:di|del|dello|della)/i, '')
        .replace(/\b(?:del|dal|al|ai|livell[oi]|e|°|º)\b/gi, ' ').replace(/[\d°º+.,]/g, ' ')).replace(/\s+/g, ' ').trim();
      return { base, nums };
    }).filter((x) => x.base.length > 2);
  }
  const sovrapposte = (a, b) => a.base === b.base && (!a.nums.length || !b.nums.length || a.nums.some((x) => b.nums.includes(x)));
  // Privilegi toccati (sostituiti o modificati) da un archetipo
  const toccatiDa = (arc) => arc[1].filter((x) => x[2]).flatMap((x) => vociPrivilegi(x[2]));
  // Primo privilegio in comune tra due archetipi: non si possono combinare
  function conflittoArchetipi(a, b) {
    const tb = toccatiDa(b);
    const v = toccatiDa(a).find((x) => tb.some((y) => sovrapposte(x, y)));
    return v ? v.base : '';
  }
  const paginaArchetipi = (classe, nome, pagina) => pagina || `${/\(Monaco Rivisitato\)$/.test(nome) ? 'Monaco_Rivisitato' : classe.replace(/ /g, '_')}/Archetipi`;
  // Testo di un archetipo: la sezione col suo titolo nella pagina degli archetipi della classe
  // (negli archetipi «di Golarion» il titolo dell'archetipo è un h3 dentro la sezione Archetipi)
  const estraiArchetipo = (nome, livello = 'H2') => (doc) => {
    const chiave = norm(nome.replace(/\s*\(Monaco Rivisitato\)$/, ''));
    const c = doc.querySelector('#mw-content-text .mw-parser-output') || doc.querySelector('#mw-content-text');
    const titolo = (el) => norm((el.querySelector('.mw-headline')?.textContent || el.textContent).replace(/\[modifica.*$/i, ''));
    const out = [];
    let dentro = false;
    for (const el of [...(c?.children || [])]) {
      if (el.tagName === livello || (livello === 'H3' && el.tagName === 'H2')) { if (dentro) break; dentro = el.tagName === livello && titolo(el) === chiave; continue; }
      if (!dentro || el.tagName === 'TABLE' || el.classList.contains('golarion-box')) continue;
      el.querySelectorAll('br').forEach((b) => b.replaceWith('\n\n'));
      const t = el.textContent.replace(/\[modifica[^\]]*\]/gi, '').replace(/[ \t\r]+/g, ' ').trim();
      if (t) out.push(el.tagName === 'H3' ? `— ${t} —` : t);
    }
    return out.join('\n\n');
  };

  // ---- Privilegi di classe dalle tabelle di progressione (più gli archetipi) ----
  const colonnaPrivilegi = (t) => Math.max(0, t.colonne.findIndex((c) => /Privileg|Speciale/i.test(c)));
  const pezziPrivilegi = (cella) => String(cella || '').split(/,\s*(?![^(]*\))/).map((x) => x.trim()).filter((x) => x && !/^[+\-−]?\d/.test(x) && x !== '—');
  // Privilegi posseduti ora: per ogni privilegio si tiene la voce del livello più alto raggiunto
  function privilegiAutomatici(d) {
    const P = window.PF1_PROGRESSIONE || {};
    const out = [];
    for (const cl of d.classi) {
      const k = nomeClasse(cl.nome);
      const t = P[k];
      const liv = Math.min(20, n(cl.livello));
      const scelti = sceltiClasse(cl);
      const via = scelti.flatMap((a) => a[1].filter((x) => x[2] && x[3] === 's').flatMap((x) => vociPrivilegi(x[2])));
      const visti = new Map();
      if (t) {
        const j = 4 + colonnaPrivilegi(t);
        t.righe.slice(0, liv).forEach((r, i) => {
          for (const f of pezziPrivilegi(r[j])) {
            const voce = vociPrivilegi(f)[0];
            const chiave = voce ? voce.base : norm(f);
            visti.set(chiave, { nome: f, classe: k, livello: i + 1, fonte: 'classe', sostituito: !!voce && via.some((x) => sovrapposte(voce, x)) });
          }
        });
      }
      for (const a of scelti) for (const [nome, L] of a[1]) if (!L || L <= liv) visti.set('arc:' + norm(nome), { nome, classe: k, livello: L, fonte: a[0], sostituito: false });
      out.push(...visti.values());
    }
    return out;
  }
  // Nomi di tutti i privilegi noti (tutte le classi e gli archetipi): servono a dire "manca" invece di "da verificare"
  let tuttiPrivilegi = null;
  function privilegioNoto(x) {
    if (!tuttiPrivilegi) {
      tuttiPrivilegi = new Set();
      for (const t of Object.values(window.PF1_PROGRESSIONE || {})) {
        const j = 4 + colonnaPrivilegi(t);
        for (const r of t.righe) for (const f of pezziPrivilegi(r[j])) tuttiPrivilegi.add(vociPrivilegi(f)[0]?.base || norm(f));
      }
    }
    return tuttiPrivilegi.has(x);
  }
  const conParola = (testo, x) => new RegExp(`(^|[\\s(])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s),])`).test(testo);
  // true se il personaggio ha il privilegio, false se è un privilegio noto che non ha, null se non si sa
  function haPrivilegio(nome, d) {
    const x = norm(String(nome).replace(/\s*\((?:Str|Sop|Mag|Ex|Su|Sp)\)\s*/gi, ' ')).replace(/\s+/g, ' ').trim();
    if (!x) return null;
    if (d.capacita.some((c) => conParola(norm(c.nome), x))) return true;
    if (privilegiAutomatici(d).some((p) => !p.sostituito && conParola(norm(p.nome), x))) return true;
    const base = vociPrivilegi(nome)[0]?.base || x;
    return privilegioNoto(base) ? false : null;
  }

  // ---- Talenti (dati in src/pf1-talenti-dati.js, lettura dei prerequisiti in src/pf1-talenti.js) ----
  const TALENTI = window.PF1_TALENTI || { voci: [], requisiti: () => [], tipi: [], manuali: [], talento: () => null, norm };
  const CLASSI_ARCANE = new Set(['Mago', 'Stregone', 'Arcanista', 'Bardo', 'Scaldo', 'Magus', 'Fattucchiere', 'Convocatore', 'Iracondo di Stirpe']);
  const CLASSI_DIVINE = new Set(['Chierico', 'Oracolo', 'Druido', 'Ranger', 'Paladino', 'Antipaladino', 'Inquisitore', 'Sacerdote Guerriero', 'Cacciatore', 'Sciamano']);
  // Nome del talento senza la scelta tra parentesi: "Arma Focalizzata (spada lunga)" -> "arma focalizzata"
  // (anche con una parentesi dentro la scelta: "Abilità Focalizzata (Conoscenze (arcane))" -> "abilita focalizzata")
  const baseTalento = (s) => norm(String(s).replace(/\s*\((?!mitico\))[^()]*(?:\([^()]*\))?[^()]*\)\s*$/i, ''));
  // Allineamento del personaggio dal campo di testo (anche sigle come LB, CN, N)
  function allineamentoDi(p) {
    const a = norm(p.campi?.Allineamento || '');
    if (!a) return null;
    const sigle = { lb: 'legale buono', nb: 'neutrale buono', cb: 'caotico buono', ln: 'legale neutrale', n: 'neutrale', cn: 'caotico neutrale', lm: 'legale malvagio', nm: 'neutrale malvagio', cm: 'caotico malvagio' };
    const t = sigle[a.replace(/[^a-z]/g, '')] || a;
    return {
      lc: /legale/.test(t) ? 'legale' : /caotico/.test(t) ? 'caotico' : 'neutrale',
      bm: /buono/.test(t) ? 'buono' : /malvagio/.test(t) ? 'malvagio' : 'neutrale',
    };
  }
  // Un singolo requisito: true soddisfatto, false mancante, null da verificare a mano
  function verificaAtomo(a, p, d, c) {
    switch (a.k) {
      case 'car': return (c.punteggio[a.c] ?? 10) >= a.v;
      case 'bab': return c.bab >= a.v;
      case 'liv': return c.liv >= a.v;
      case 'mitico': return n(d.mitico.grado) >= a.v;
      case 'li': return c.incantatori.some((x) => x.cl >= a.v);
      case 'classe': { const k = nomeClasse(a.nome); return k ? livelloClasse(d, k) >= a.v : null; }
      // La razza del personaggio, oppure una a cui corrisponde (es. gli Umani Azlanti contano come Umani)
      case 'razza': return d.razza.nome ? d.razza.nome === a.nome || (razzaDi(d)?.contaCome || []).includes(a.nome) : null;
      case 'gradi': {
        const nomi = Object.keys(d.abil);
        const k = nomi.find((x) => norm(x) === norm(a.abil)) || nomi.find((x) => norm(a.abil).startsWith(norm(x.replace(/\s*\(.*$/, '')) + ' ('));
        if (k) return n(d.abil[k]?.gradi) >= a.v;
        if (!/\(|,/.test(a.abil)) return false;
        // Abilità con specializzazione (es. Conoscenze (arcane)): se nessuna variante ha abbastanza gradi, manca di sicuro
        const base = norm(a.abil.replace(/\s*\(.*$/, ''));
        return nomi.some((x) => norm(x.replace(/\s*\(.*$/, '')) === base && n(d.abil[x]?.gradi) >= a.v) ? null : false;
      }
      case 'tal': {
        const base = norm(a.nome);
        const presi = d.capacita.filter((x) => baseTalento(x.nome) === base || norm(x.nome) === base);
        if (!presi.length) return false;
        if (!a.param || /scelt|selezionat|qualsiasi|stess|propri/i.test(a.param)) return true;
        return presi.some((x) => norm(x.nome).includes(norm(a.param))) ? true : null;
      }
      case 'inc': {
        const ok = d.incantatori.filter((inc) => {
          const k = nomeClasse(inc.classe);
          if (a.tipo === 'arcani' && !CLASSI_ARCANE.has(k)) return false;
          if (a.tipo === 'divini' && !CLASSI_DIVINE.has(k)) return false;
          const ci = c.incantatori.find((x) => x.id === inc.id);
          return (ci?.livelli || []).some((l) => l.base !== '' && l.L >= (a.L || 0));
        });
        return ok.length > 0;
      }
      case 'priv': return haPrivilegio(a.nome, d);
      case 'testo': {
        // Un requisito non letto che è il nome di un privilegio di classe noto (es. "Ira") si controlla come privilegio
        const base = vociPrivilegi(a.testo)[0]?.base;
        return base && privilegioNoto(base) ? haPrivilegio(a.testo, d) : null;
      }
      case 'tratto': {
        const r = razzaDi(d);
        if (!r) return null;
        const via = sostituitiDa(d);
        const tratti = [...r.tratti.filter((t) => !via.has(chiaveTratto(t))), ...alternativiScelti(d).map((x) => x.nome)].map(chiaveTratto);
        return tratti.some((t) => t === chiaveTratto(a.nome) || t.startsWith(chiaveTratto(a.nome))) ? true : false;
      }
      case 'allin': {
        const al = allineamentoDi(p);
        if (!al) return null;
        const t = a.testo;
        const parole = ['buono', 'malvagio', 'legale', 'caotico'];
        const ha = (w) => (w === 'buono' || w === 'malvagio' ? al.bm === w : al.lc === w);
        const neg = t.match(/^(?:qualsiasi )?non (buono|malvagio|legale|caotico)$/);
        if (neg) return !ha(neg[1]);
        const w = parole.find((x) => t === x || t === 'qualsiasi ' + x);
        if (w) return ha(w);
        if (t === 'neutrale' || t === 'qualsiasi neutrale') return al.lc === 'neutrale' || al.bm === 'neutrale';
        return null;
      }
      case 'taglia': {
        const ordine = TAGLIE.map((x) => norm(x[0]));
        const io = ordine.indexOf(norm(d.taglia || 'Media'));
        const serve = ordine.indexOf(a.taglia);
        if (io < 0 || serve < 0) return null;
        return a.verso === 'superiore' ? io >= serve : a.verso === 'inferiore' ? io <= serve : io === serve;
      }
      default: return null;
    }
  }
  // Stato dei prerequisiti di un talento: 'ok', 'forse' (qualcosa da verificare a mano), 'no' (manca qualcosa)
  function statoTalento(t, p, d, c) {
    const req = TALENTI.requisiti(t).map((r) => {
      const esiti = r.alt.map((a) => verificaAtomo(a, p, d, c));
      return { testo: r.testo, esito: esiti.includes(true) ? true : esiti.every((e) => e === false) ? false : null };
    });
    return { req, stato: req.some((r) => r.esito === false) ? 'no' : req.some((r) => r.esito === null) ? 'forse' : 'ok' };
  }

  // ---- Elenco degli incantesimi (dati in src/pf1-incantesimi.js) ----
  const INC_DATI = window.PF1_INCANTESIMI_DATI || { liste: {}, voci: [] };
  const INCANTESIMI = new Map(); // nome normalizzato -> { nome, scuola, base, pagina, livelli: { codice lista: livello } }
  for (const [nome, scuola, pagina, livelli] of INC_DATI.voci) {
    const l = {};
    for (const x of livelli.split(' ')) { const m = x.match(/^([A-Za-z]+)(\d)$/); if (m) l[m[1]] = Number(m[2]); }
    INCANTESIMI.set(norm(nome), { nome, scuola, base: scuola.split(/[ ([]/)[0], pagina: pagina || `Incantesimi/${nome}`, livelli: l });
  }
  // Classe -> codice della lista di incantesimi che usa
  const LISTA_CLASSE = {
    Mago: 'M', Stregone: 'M', Arcanista: 'M', Bardo: 'B', Scaldo: 'B', Cacciatore: 'Cc', Chierico: 'C', Oracolo: 'C',
    'Sacerdote Guerriero': 'C', Convocatore: 'Cv', Druido: 'D', Fattucchiere: 'F', Inquisitore: 'I', 'Iracondo di Stirpe': 'Is',
    Magus: 'Mg', Medium: 'Md', Mesmerista: 'Ms', Occultista: 'O', Paladino: 'P', Parapsichico: 'Ps', Ranger: 'R',
    Sciamano: 'Sc', Spiritista: 'Sp', Antipaladino: 'A',
  };
  // Lista usata da una classe da incantatore (il Convocatore rivisitato ha una lista sua)
  const listaDi = (inc) => {
    const k = nomeClasse(inc.classe);
    return k === 'Convocatore' && inc.rivisitato ? 'Cr' : LISTA_CLASSE[k] || '';
  };
  const incantesimoDi = (nome) => INCANTESIMI.get(norm(String(nome || '').trim())) || null;
  // Livelli di incantesimo a cui il personaggio accede ora: quelli con incantesimi al giorno nella tabella.
  // Con gli slot inseriti a mano valgono i livelli compilati; se non ce n'è nessuno, tutta la lista.
  const livelliAccessibili = (inc, ci) => {
    const aperti = (ci?.livelli || []).filter((l) => l.base !== '').map((l) => l.L);
    if (ci?.auto || aperti.length) return new Set(aperti);
    return new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  };
  // Incantesimi della lista della classe, solo dei livelli accessibili
  const elencoClasse = (inc, ci) => {
    const c = listaDi(inc);
    if (!c) return [];
    const ok = livelliAccessibili(inc, ci);
    return [...INCANTESIMI.values()].filter((v) => v.livelli[c] !== undefined && ok.has(v.livelli[c]));
  };
  const SCUOLE_INC = ['Abiurazione', 'Ammaliamento', 'Divinazione', 'Evocazione', 'Illusione', 'Invocazione', 'Necromanzia', 'Trasmutazione', 'Universale'];
  // Indirizzo della pagina accettato dal processo principale (spazi -> _, caratteri insoliti codificati)
  const paginaWiki = (p) => p.replace(/ /g, '_').replace(/[^\w%'’().,\-À-ÿ/]/g, (ch) => encodeURIComponent(ch));
  const livelliTesto = (v) => Object.entries(v.livelli).map(([c, L]) => `${INC_DATI.liste[c] || c} ${L}`).join(', ');
  // Aggiunge un incantesimo all'elenco di una classe; per il mago segna da solo quelli delle scuole opposte
  const aggiungiIncantesimo = (p, inc, nome, livello) => {
    const d = dati(p);
    const v = incantesimoDi(nome);
    const opposta = nomeClasse(inc.classe) === 'Mago' && !!v && (d.mago?.opposte || []).includes(v.base);
    inc.incantesimi = inc.incantesimi || [];
    inc.incantesimi.push({ id: uid(), nome, livello, preparati: inc.tipo === 'preparati' ? 1 : '', lanciati: 0, note: '', ...(opposta ? { opposta: true } : {}) });
  };
  // Testo dell'incantesimo: dal titolo fino alla riga di separazione (senza il menù e le tabelle)
  const estraiIncantesimo = (doc) => {
    const c = doc.querySelector('#mw-content-text .mw-parser-output') || doc.querySelector('#mw-content-text');
    const out = [];
    let dentro = false;
    for (const el of [...(c?.children || [])]) {
      if (!dentro) { if (/^H[12]$/.test(el.tagName)) dentro = true; continue; }
      if (el.tagName === 'HR') break;
      if (el.tagName === 'TABLE' || el.classList.contains('golarion-box')) continue;
      el.querySelectorAll('br').forEach((b) => b.replaceWith('\n\n'));
      const t = el.textContent.replace(/[ \t\r]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
      if (t) out.push(t);
    }
    return out.join('\n\n');
  };

  // ---- Tabelle degli incantesimi (dati in src/pf1-tabelle.js) ----
  const TABELLE = window.PF1_TABELLE || { classi: {}, alGiorno: () => '', conosciuti: () => '', bonus: (mod, L) => (L > 0 && mod >= L ? 1 + Math.floor((mod - L) / 4) : 0) };
  // Classi il cui livello incantatore è il livello di classe − 3
  const CL_MENO_3 = new Set(['Paladino', 'Ranger', 'Antipaladino', 'Iracondo di Stirpe']);
  // Classi che preparano da un libro (wiki: libro degli incantesimi, formulario, famiglio): [nome, cosa contiene]
  const LIBRI = {
    Mago: ['Libro degli incantesimi', 'incantesimi'], Magus: ['Libro degli incantesimi', 'incantesimi'], Arcanista: ['Libro degli incantesimi', 'incantesimi'],
    Alchimista: ['Formulario', 'formule'], Investigatore: ['Formulario', 'formule'], Fattucchiere: ['Famiglio', 'incantesimi custoditi'],
  };
  const libroDi = (inc) => (inc.tipo === 'preparati' ? LIBRI[nomeClasse(inc.classe)] || null : null);
  // Lettura del Magico si prepara a memoria anche senza averla nel libro (wiki, Mago)
  const nelLibro = (inc, nome) => norm(nome) === 'lettura del magico' || (inc.libro || []).some((s) => norm(s.nome) === norm(nome));

  // ---- Divinità e domini (dati in src/pf1-fede.js) ----
  const FEDE = window.PF1_FEDE || { divinita: {}, domini: {}, armi: {}, wiki: '' };
  // Domini dei druidi (legame con la natura)
  const DOMINI_NATURA = ['Acqua', 'Animale', 'Aria', 'Fuoco', 'Terra', 'Tempo Atmosferico', 'Vegetale'];
  // Classi che scelgono domini o benedizioni: quanti, con incantesimi di dominio o no
  const CLASSI_DOMINI = {
    Chierico: { n: 2, tipo: 'dominio', incantesimi: true },
    Druido: { n: 1, tipo: 'dominio', incantesimi: true, natura: true },
    Inquisitore: { n: 1, tipo: 'dominio', incantesimi: false },
    'Sacerdote Guerriero': { n: 2, tipo: 'benedizione', incantesimi: false },
  };
  // Classi per cui l'allineamento deve essere vicino a quello della divinità
  const CLASSI_ALLINEAMENTO = new Set(['Chierico', 'Inquisitore', 'Sacerdote Guerriero']);
  const ALLINEAMENTI = { 'legale buono': 'LB', 'neutrale buono': 'NB', 'caotico buono': 'CB', 'legale neutrale': 'LN', 'neutrale': 'N', 'neutrale puro': 'N', 'caotico neutrale': 'CN', 'legale malvagio': 'LM', 'neutrale malvagio': 'NM', 'caotico malvagio': 'CM' };
  const siglaAllineamento = (s) => {
    const t = norm(String(s || '').trim());
    if (/^(lb|nb|cb|ln|n|cn|lm|nm|cm)$/.test(t)) return t.toUpperCase();
    return ALLINEAMENTI[t] || '';
  };

  // ---- Bonus: tipi, bersagli, regole di cumulo ----
  // "potenziamento arm. naturale" (es. Pelle Coriacea, amuleto dell'armatura naturale) si somma all'armatura naturale
  const TIPI_BONUS = ['senza tipo', 'alchemico', 'armatura', 'armatura naturale', 'potenziamento arm. naturale', 'circostanza', 'cognitivo', 'competenza', 'deviazione', 'fortuna', 'intrinseco', 'mitico', 'morale', 'potenziamento', 'profano', 'razziale', 'resistenza', 'sacro', 'schivare', 'scudo', 'taglia', 'tratto'];
  // Questi tipi si sommano tra loro; tutti gli altri: vale solo il più alto. Le penalità si sommano sempre.
  const CUMULABILI = new Set(['senza tipo', 'schivare', 'circostanza']);
  // Bonus alla CA che valgono anche per la DMC
  const TIPI_DMC = new Set(['deviazione', 'schivare', 'cognitivo', 'fortuna', 'morale', 'profano', 'sacro', 'circostanza']);
  const BERSAGLI = [
    ['FOR', 'Forza'], ['DES', 'Destrezza'], ['COS', 'Costituzione'], ['INT', 'Intelligenza'], ['SAG', 'Saggezza'], ['CAR', 'Carisma'], ['proveCar', 'Prove di caratteristica'],
    ['colpire', 'Tiri per colpire'], ['danni', 'Danni'], ['ca', 'Classe Armatura'],
    ['ts', 'Tutti i tiri salvezza'], ['tempra', 'Tempra'], ['riflessi', 'Riflessi'], ['volonta', 'Volontà'],
    ['abilita', 'Tutte le abilità'], ['iniz', 'Iniziativa'], ['bmc', 'BMC'], ['dmc', 'DMC'],
    ['attaccoPoderoso', 'Attacco Poderoso (dal BAB)'], ['tiroMortale', 'Mira Letale (dal BAB)'], ['maestria', 'Maestria in Combattimento (dal BAB)'],
  ];
  const SPECIALI = new Set(['attaccoPoderoso', 'tiroMortale', 'maestria']);
  const E = (bersaglio, valore, tipo = 'senza tipo') => ({ bersaglio, valore, tipo });
  const PRESET_BONUS = {
    'Ira': [E('FOR', 4, 'morale'), E('COS', 4, 'morale'), E('volonta', 2, 'morale'), E('ca', -2)],
    'Ira superiore': [E('FOR', 6, 'morale'), E('COS', 6, 'morale'), E('volonta', 3, 'morale'), E('ca', -2)],
    'Benedizione': [E('colpire', 1, 'morale')],
    'Preghiera': [E('colpire', 1, 'fortuna'), E('danni', 1, 'fortuna'), E('ts', 1, 'fortuna'), E('abilita', 1, 'fortuna')],
    'Eroismo': [E('colpire', 2, 'morale'), E('ts', 2, 'morale'), E('abilita', 2, 'morale')],
    'Ispirare Coraggio +1': [E('colpire', 1, 'competenza'), E('danni', 1, 'competenza')],
    'Ispirare Coraggio +2': [E('colpire', 2, 'competenza'), E('danni', 2, 'competenza')],
    'Velocità': [E('colpire', 1), E('ca', 1, 'schivare'), E('riflessi', 1, 'schivare')],
    'Buona Speranza': [E('colpire', 2, 'morale'), E('danni', 2, 'morale'), E('ts', 2, 'morale'), E('abilita', 2, 'morale')],
    'Favore Divino': [E('colpire', 1, 'fortuna'), E('danni', 1, 'fortuna')],
    'Resistenza (incantesimo)': [E('ts', 1, 'resistenza')],
    'Mantello della Resistenza +1': [E('ts', 1, 'resistenza')],
    'Mantello della Resistenza +2': [E('ts', 2, 'resistenza')],
    'Mantello della Resistenza +3': [E('ts', 3, 'resistenza')],
    'Anello di Protezione +1': [E('ca', 1, 'deviazione')],
    'Anello di Protezione +2': [E('ca', 2, 'deviazione')],
    "Amuleto dell'Armatura Naturale +1": [E('ca', 1, 'potenziamento arm. naturale')],
    "Amuleto dell'Armatura Naturale +2": [E('ca', 2, 'potenziamento arm. naturale')],
    'Forza del Toro': [E('FOR', 4, 'potenziamento')],
    'Grazia del Gatto': [E('DES', 4, 'potenziamento')],
    "Resistenza dell'Orso": [E('COS', 4, 'potenziamento')],
    'Astuzia della Volpe': [E('INT', 4, 'potenziamento')],
    'Saggezza del Gufo': [E('SAG', 4, 'potenziamento')],
    "Splendore dell'Aquila": [E('CAR', 4, 'potenziamento')],
    'Armatura Magica': [E('ca', 4, 'armatura')],
    'Scudo (incantesimo)': [E('ca', 4, 'scudo')],
    'Scudo della Fede': [E('ca', 2, 'deviazione')],
    'Pelle Coriacea': [E('ca', 2, 'potenziamento arm. naturale')],
    'Attacco Poderoso': [E('attaccoPoderoso', 0)],
    'Mira Letale': [E('tiroMortale', 0)],
    'Maestria in Combattimento': [E('maestria', 0)],
    'Combattere sulla difensiva': [E('colpire', -4), E('ca', 2, 'schivare')],
    'Difesa totale': [E('ca', 4, 'schivare')],
    'Carica': [E('colpire', 2), E('ca', -2)],
    'Fiancheggiare': [E('colpire', 2)],
    'Scosso': [E('colpire', -2), E('ts', -2), E('abilita', -2)],
    'Infermo': [E('colpire', -2), E('danni', -2), E('ts', -2), E('abilita', -2)],
    'Affaticato': [E('FOR', -2), E('DES', -2)],
    'Esausto': [E('FOR', -6), E('DES', -6)],
  };
  // Regole di cumulo di PF1:
  // - bonus dello stesso tipo non si sommano: vale il più alto;
  // - schivare, circostanza e senza tipo si sommano, ma non due volte dalla stessa fonte (es. lo stesso incantesimo lanciato due volte);
  // - le penalità si sommano sempre.
  // Restituisce il totale e, per ogni voce, se conta e perché no.
  function analizzaCumulo(lista) {
    const voci = lista.map((e) => ({ ...e, v: n(e.valore), tipo: e.tipo || 'senza tipo', conta: true, motivo: '' }));
    const gruppi = new Map();
    for (const x of voci) {
      if (x.v < 0 || x.v === 0) continue;
      const chiave = CUMULABILI.has(x.tipo) ? `${x.tipo}|${norm(x.fonte || '') || Math.random()}` : x.tipo;
      if (!gruppi.has(chiave)) gruppi.set(chiave, []);
      gruppi.get(chiave).push(x);
    }
    for (const g of gruppi.values()) {
      if (g.length < 2) continue;
      const migliore = g.reduce((a, b) => (b.v > a.v ? b : a));
      for (const x of g) {
        if (x === migliore) continue;
        x.conta = false;
        x.motivo = CUMULABILI.has(x.tipo)
          ? `stessa fonte (${migliore.fonte}): non si somma`
          : `${x.v === migliore.v ? 'uguale a' : 'superato da'} ${migliore.fonte || 'altro bonus'} (${segno(migliore.v)} ${x.tipo})`;
      }
    }
    return { totale: voci.reduce((a, x) => a + (x.conta ? x.v : 0), 0), voci };
  }
  const cumula = (lista) => analizzaCumulo(lista).totale;
  const etichettaBersaglio = (b) => (b?.startsWith('abil:') ? b.slice(5) : BERSAGLI.find((x) => x[0] === b)?.[1] || b);
  const riassuntoBonus = (b) => (b.effetti || []).map((e) => (SPECIALI.has(e.bersaglio)
    ? etichettaBersaglio(e.bersaglio)
    : `${etichettaBersaglio(e.bersaglio)} ${segno(n(e.valore))}${e.tipo && e.tipo !== 'senza tipo' ? ' ' + e.tipo : ''}`)).join(', ');

  // ---- Classi ----
  const baseBab = (tipo, l) => (tipo === 'pieno' ? l : tipo === '3/4' ? Math.floor((l * 3) / 4) : Math.floor(l / 2));
  const baseTs = (buono, l, prestigio) => {
    if (l <= 0) return 0;
    if (prestigio) return buono ? Math.floor((l + 1) / 2) : Math.floor((l + 1) / 3);
    return buono ? 2 + Math.floor(l / 2) : Math.floor(l / 3);
  };
  const nomeClasse = (nome) => {
    const q = norm(String(nome || '').trim());
    if (!q) return undefined;
    return Object.keys(CLASSI).find((k) => norm(k) === q || (CLASSI[k].alias || []).some((a) => norm(a) === q));
  };
  const progressione = (k) => {
    const t = CLASSI[k];
    return { nome: k, bab: t.bab, tempra: t.ts.includes('T'), riflessi: t.ts.includes('R'), volonta: t.ts.includes('V'), dv: t.dv, gradi: t.gradi, prestigio: !!t.prestigio };
  };
  function nuovaClasse(nome, livello = 1) {
    const k = nomeClasse(nome);
    return { id: uid(), livello, ...(k ? progressione(k) : { nome, bab: '3/4', tempra: false, riflessi: false, volonta: false, dv: 8, gradi: 2, prestigio: false }) };
  }
  // Abilità che sono famiglie di abilità: ogni tipo ha i suoi gradi (elenchi dal wiki, pagine Artigianato e Professione)
  const ABIL_SPECIALIZZATE = {
    Intrattenere: ['Canto', 'Comicità', 'Danza', 'Oratoria', 'Recitazione', 'Strumenti a Corda', 'Strumenti a Fiato', 'Strumenti a Percussione', 'Strumenti a Tastiera'],
    Artigianato: ['Alchimia', 'Calligrafia', 'Carpenteria', 'Ceramica', 'Costruire Archi', 'Costruire Navi', 'Costruire Trappole', 'Fabbricare Armature', 'Fabbricare Armi', 'Ferramenta',
      'Intessere Ceste', 'Lavorare Pellami', 'Lavori in Muratura', 'Metallurgia', 'Pittura', 'Oreficeria', 'Rilegare Libri', 'Riparare Scarpe', 'Scultura', 'Tessitura'],
    Professione: ['Allevatore', 'Architetto', 'Avvocato', 'Barcaiolo', 'Bibliotecario', 'Birraio', 'Boscaiolo', 'Cacciatore', 'Carovaniere', 'Conciatore', 'Conestabile', 'Contabile',
      'Contadino', 'Cortigiano', 'Cuoco', 'Erborista', 'Farmacista', 'Fornaio', 'Giardiniere', "Giocatore d'Azzardo", 'Guida', 'Ingegnere', 'Levatrice', 'Locandiere', 'Macellaio',
      'Marinaio', 'Mercante', 'Minatore', 'Mugnaio', 'Pastore', 'Pescatore', 'Scrivano', 'Siniscalco', 'Soldato', 'Stalliere', 'Taglialegna'],
  };
  // Abilità della scheda: quelle del regolamento più i tipi di Artigianato, Professione e Intrattenere scelti dal personaggio.
  // La voce generica resta solo se non ci sono tipi o se ha già dei gradi (schede vecchie).
  function abilitaScheda(r, d) {
    const out = [];
    for (const a of r.abilita) {
      if (!ABIL_SPECIALIZZATE[a.nome]) { out.push(a); continue; }
      const tipi = d.sottoAbil?.[a.nome] || [];
      const s = d.abil[a.nome];
      out.push({ ...a, famiglia: true, nascosta: tipi.length > 0 && !n(s?.gradi) && !n(s?.varie) });
      for (const t of tipi) out.push({ nome: `${a.nome} (${t})`, car: a.car, padre: a.nome, tipo: t });
    }
    return out;
  }

  function abilDiClasse(d) {
    const mappa = new Map();
    for (const cl of d.classi) {
      const k = nomeClasse(cl.nome);
      if (!k) continue;
      for (const a of CLASSI[k].abil) { if (!mappa.has(a)) mappa.set(a, []); mappa.get(a).push(k); }
    }
    // Il mistero dell'oracolo aggiunge abilità di classe
    const mis = FEDE.misteri?.[d.oracolo?.mistero];
    if (mis && d.classi.some((cl) => nomeClasse(cl.nome) === 'Oracolo')) {
      for (const a of mis.abil) { if (!mappa.has(a)) mappa.set(a, []); mappa.get(a).push('Mistero ' + mis.nome); }
    }
    // Umani Azlanti (Linguista Dotato): Linguistica è sempre di classe
    if (razzaDi(d)?.nome === 'Umano Azlanti') { if (!mappa.has('Linguistica')) mappa.set('Linguistica', []); mappa.get('Linguistica').push('Linguista Dotato'); }
    // La stirpe dello stregone aggiunge un'abilità di classe ("Conoscenze (qualsiasi)": quella scelta nella sezione)
    const st = stirpeDi(d);
    if (st && d.classi.some((cl) => nomeClasse(cl.nome) === 'Stregone')) {
      const a = /qualsiasi/i.test(st.abil) ? d.stregone?.abil : st.abil;
      if (a) { if (!mappa.has(a)) mappa.set(a, []); mappa.get(a).push('Stirpe ' + st.nome); }
    }
    return mappa;
  }

  // =====================================================================
  // Dati della scheda
  // =====================================================================
  const predefiniti = () => ({
    classi: [], taglia: 'Media',
    pf: { max: '', attuali: '', temp: '', nonLetali: '' },
    ca: { naturale: '', deviazione: '', schivare: '', varie: '' },
    ts: { tempra: { varie: '' }, riflessi: { varie: '' }, volonta: { varie: '' } },
    tsCond: [], // bonus ai tiri salvezza solo in certe situazioni (es. +2 contro veleni)
    compagni: [], // compagno animale, famiglio, eidolon
    iniz:{ varie: '' }, bmc: { varie: '' }, dmc: { varie: '' },
    abil: {}, gradiExtra: '',
    armi: [], armature: [], oggetti: [], monete: { mp: '', mo: '', ma: '', mr: '' },
    capacita: [], incantatori: [],
    // car: +2 scelto alle categorie 2/4/6/8/10; scelte: capacità di percorso; primo: privilegio di 1° categoria;
    // cimenti: completati verso la prossima categoria; registro: cimenti annotati; incantesimi: incantesimi mitici
    // percorso2 / primo2: secondo percorso e suo privilegio di 1° categoria (talento Doppio Percorso)
    mitico: { grado: '', percorso: '', usati: 0, car: {}, scelte: [], primo: '', cimenti: 0, registro: [], incantesimi: [], percorso2: '', primo2: '' },
    bonus: [],
    fede: { divinita: '', slot: [], usiBenedizioni: 0 },
    oracolo: { mistero: '', maledizione: '', rivelazioni: [], extra: '' },
    fattucchiere: { fatture: [], extra: '', filtro: 'disponibili' },
    creazioni: [], // oggetti magici creati (officina)
    sottoAbil: { Artigianato: [], Professione: [] }, // tipi di Artigianato e Professione scelti (ognuno con i suoi gradi)
    avanzamento: [], // registro dei livelli presi: punto di partenza, scelte di ogni livello, aumenti di caratteristica
    prestigio: { vista: '', filtro: 'tutte' },
    maestro: { segreti: [], padronanza: '', incSegreto: '', linguaggi: ['', ''], veraUsata: false }, // Maestro del Sapere
    mistificatore: { estemporanei: 0, mistificati: 0, invisibile: 0 }, // Mistificatore Arcano: usi di oggi
    chimico: { alterEgo: '', allineamento: '', avanzati: [], drago: '', mutareUsati: 0, soffioUsato: false }, // Mastro Chimico
    resistenze: { fonti: [] }, // resistenze all'energia, RI, fortificazione: fonti aggiunte a mano { id, nome, tipo, valore, immune }
    alchimista: { scoperte: [], extra: '', bombeUsate: 0, tipoBomba: '', filtro: 'disponibili', mutageno: { tipo: 'mutageno', car: ['FOR', 'DES', 'COS'], attivo: false, bonusId: '' } },
    energia: { tipo: '', usati: {} },
    mago: { scuola: '', sotto: '', opposte: ['', ''], usati: {} },
    stregone: { stirpe: '', tipo: '', abil: '', usati: {} }, // stirpe dello stregone; tipo = drago/elemento scelto
    razza: { nome: '', scelta: '', inclusi: false, alternativi: [] },
  });

  function dati(p) {
    if (!p.pf1) {
      p.pf1 = predefiniti();
      // Riprende classe e livello già scritti nei campi di testo della vecchia scheda
      const cl = String(p.campi?.Classe || '').trim();
      if (cl) p.pf1.classi.push(nuovaClasse(cl, parseInt(p.campi?.Livello, 10) || 1));
      ctx.salva();
    }
    const d = p.pf1;
    // Schede create con versioni precedenti: aggiunge i campi nuovi senza toccare quelli esistenti
    if (!d.pfCalc) d.pfCalc = { auto: d.pf?.max === '' || d.pf?.max == null, metodo: 'media', preferita: '', robustezza: false, varie: '' };
    const def = predefiniti();
    // Elementi con lo stesso codice (schede vecchie o duplicati): ognuno riceve il suo, così si modificano e si tolgono separatamente
    for (const lista of Object.values(d)) {
      if (!Array.isArray(lista)) continue;
      const visti = new Set();
      for (const x of lista) if (x && typeof x === 'object' && x.id) { if (visti.has(x.id)) x.id = uid(); visti.add(x.id); }
    }
    for (const k of Object.keys(def)) if (d[k] === undefined) d[k] = def[k];
    // Nomi aggiornati alla traduzione italiana ufficiale (es. Strega → Fattucchiere)
    for (const cl of d.classi) { const k = nomeClasse(cl.nome); if (k && k !== cl.nome) cl.nome = k; }
    for (const inc of d.incantatori) {
      const k = nomeClasse(inc.classe);
      if (k && k !== inc.classe) inc.classe = k;
      // Tabella automatica: attiva se la classe è nota e non c'erano slot inseriti a mano
      if (inc.auto === undefined) inc.auto = !!(k && TABELLE.classi[k]) && Object.values(inc.slot || {}).every((s) => s.base === '' || s.base == null);
      // Libro degli incantesimi: alla prima apertura contiene gli incantesimi già in elenco
      if (k && LIBRI[k] && !Array.isArray(inc.libro)) {
        inc.libro = [];
        for (const s of inc.incantesimi || []) if (s.nome && !inc.libro.some((x) => norm(x.nome) === norm(s.nome))) inc.libro.push({ id: uid(), nome: s.nome, livello: n(s.livello) });
      }
    }
    if (PERCORSI_VECCHI[d.mitico.percorso]) d.mitico.percorso = PERCORSI_VECCHI[d.mitico.percorso];
    // Classe preferita: le schede che avevano il solo bonus del tiefling alchimista ("Alchimista": n) passano alla prima opzione
    if (d.preferitaAlt && typeof d.preferitaAlt === 'object') {
      for (const k of Object.keys(d.preferitaAlt)) if (!k.includes('~')) { d.preferitaAlt[`${k}~0`] = n(d.preferitaAlt[`${k}~0`]) + n(d.preferitaAlt[k]); delete d.preferitaAlt[k]; }
    }
    // Stregone: gli incantesimi bonus della stirpe entrano da soli tra i conosciuti (in più rispetto al limite)
    if (!d.stregone) d.stregone = { stirpe: '', tipo: '', abil: '', usati: {} };
    sincronizzaStirpe(d);
    // Schede mitiche precedenti: campi nuovi
    for (const [k, v] of Object.entries({ car: {}, scelte: [], primo: '', cimenti: 0, registro: [], incantesimi: [], percorso2: '', primo2: '' })) if (d.mitico[k] === undefined) d.mitico[k] = v;
    // La razza scritta nel vecchio campo di testo viene ripresa; i punteggi già inseriti si considerano
    // comprensivi dei modificatori razziali, così non vengono sommati due volte
    if (!Array.isArray(d.razza.alternativi)) d.razza.alternativi = [];
    if (!d.razza.nome && p.campi?.Razza) {
      const trovata = Object.keys(RAZZE).find((k) => norm(k) === norm(p.campi.Razza.trim()));
      if (trovata) { d.razza.nome = trovata; d.razza.inclusi = true; }
    }
    // La divinità scritta nel vecchio campo di testo viene ripresa se è tra quelle note
    if (!d.fede.divinita && p.campi?.['Divinità']) {
      const trovata = Object.keys(FEDE.divinita).find((k) => norm(k) === norm(p.campi['Divinità'].trim()));
      if (trovata) d.fede.divinita = trovata;
    }
    for (const b of d.bonus) {
      if (b.nome === 'Tiro Mortale') b.nome = 'Mira Letale';
      if (b.nome === 'Pelle di Corteccia') {
        b.nome = 'Pelle Coriacea';
        for (const e of b.effetti || []) if (e.bersaglio === 'ca' && e.tipo === 'armatura naturale') e.tipo = 'potenziamento arm. naturale';
      }
    }
    return d;
  }

  // =====================================================================
  // Calcoli
  // =====================================================================
  function calcola(p, r) {
    const d = dati(p);
    // Ogni effetto ricorda da dove viene: serve alla regola "stessa fonte" e a mostrare cosa conta
    const eff = [
      ...effettiRazza(d).map((e) => ({ ...e, fonte: `${e.tratto} (razza)` })),
      ...d.bonus.filter((b) => b.attivo).flatMap((b) => (b.effetti || []).filter((e) => !e.livMin || e.livMin <= livelloPersonaggio(d)).map((e) => ({ ...e, fonte: b.nome || 'bonus', fonteId: b.id }))),
      ...effettiMaestro(d, abilitaScheda(r, d)),
      ...effettiMitici(d),
      ...effettiChimico(d, abilitaScheda(r, d)),
      ...effettiPreferite(d),
      ...effettiTalenti(d, abilitaScheda(r, d)),
    ];
    const gradiGratis = gradiSegretiMS(d);
    const razza = razzaDi(d);
    const per = (...bersagli) => eff.filter((e) => bersagli.includes(e.bersaglio));
    const speciale = (k) => eff.some((e) => e.bersaglio === k);

    const base = {}, punteggio = {}, m = {};
    for (const s of CARS) {
      const k = r.caratteristiche.find((x) => x.sigla === s);
      const v = p.caratteristiche?.[s] ?? k?.predefinito ?? 10;
      base[s] = v === '' ? 10 : n(v);
      // Modificatori razziali (salvo che i punteggi inseriti li comprendano già)
      const mRazza = razza && !d.razza.inclusi ? n(razza.car[s]) + (razza.scelta && d.razza.scelta === s ? razza.scelta : 0) : 0;
      punteggio[s] = base[s] + mRazza + cumula(per(s));
      m[s] = Math.floor((punteggio[s] - 10) / 2);
    }
    const liv = d.classi.reduce((a, c) => a + n(c.livello), 0);
    const bab = d.classi.reduce((a, c) => a + baseBab(c.bab, n(c.livello)), 0);
    const pen = bab >= 1 ? 1 + Math.floor(bab / 4) : 1; // Attacco Poderoso e simili
    const t = TAGLIE.find((x) => x[0] === d.taglia) || TAGLIE[4];

    // Classe armatura: ogni fonte ha un tipo, così i bonus si cumulano secondo le regole
    // Armature e scudi indossati, con potenziamento magico, qualità perfetta e materiale speciale già applicati
    const indossate = d.armature.filter((a) => a.indossata).map((a) => ({ ...a, ...armaturaEffettiva(a) }));
    const limiti = indossate.map((a) => a.desMax).filter((v) => v !== '' && v != null).map(Number);
    const desMax = limiti.length ? Math.min(...limiti) : null;
    const desCA = desMax === null ? m.DES : Math.min(m.DES, desMax);
    const penalita = indossate.reduce((a, x) => a + Math.abs(n(x.penalita)), 0);
    const fallimento = indossate.reduce((a, x) => a + n(x.fallimento), 0);
    const contributi = [
      ...indossate.map((a) => ({ tipo: a.tipo === 'scudo' ? 'scudo' : 'armatura', valore: a.bonus, fonte: a.nome || (a.tipo === 'scudo' ? 'scudo' : 'armatura') })),
      { tipo: 'armatura naturale', valore: d.ca.naturale, fonte: 'Armatura naturale (Difese)' }, { tipo: 'deviazione', valore: d.ca.deviazione, fonte: 'Deviazione (Difese)' },
      { tipo: 'schivare', valore: d.ca.schivare, fonte: 'Schivare (Difese)' }, { tipo: 'senza tipo', valore: d.ca.varie, fonte: 'Varie (Difese)' },
      ...per('ca'),
    ];
    if (speciale('maestria')) contributi.push({ tipo: 'schivare', valore: pen, fonte: 'Maestria in Combattimento' });
    const ca = 10 + desCA + t[1] + cumula(contributi);
    const contatto = 10 + desCA + t[1] + cumula(contributi.filter((x) => !['armatura', 'scudo', 'armatura naturale', 'potenziamento arm. naturale'].includes(x.tipo)));
    const sorpresa = 10 + Math.min(desCA, 0) + t[1] + cumula(contributi.filter((x) => x.tipo !== 'schivare'));

    const ts = {};
    for (const [k, , car] of TS) {
      const b = d.classi.reduce((a, c) => a + baseTs(c[k], n(c.livello), c.prestigio), 0);
      const lista = per('ts', k);
      const fisso = b + m[car] + n(d.ts[k]?.varie);
      const bonus = cumula(lista);
      // Bonus situazionali: si cumulano con quelli attivi secondo le stesse regole (es. un +2 morale non si somma a un altro morale)
      const cond = [...condRazza(d), ...(d.tsCond || [])].filter((x) => x.ts === 'tutti' || x.ts === k).map((x) => {
        const tot = fisso + cumula([...lista, { valore: x.valore, tipo: x.tipo, fonte: x.tratto || x.testo || 'situazionale' }]);
        return { id: x.id, testo: x.testo, valore: n(x.valore), tipo: x.tipo, tratto: x.tratto || '', tot, guadagno: tot - (fisso + bonus) };
      });
      ts[k] = { base: b, car: m[car], bonus, varie: n(d.ts[k]?.varie), tot: fisso + bonus, cond };
    }
    const init = m.DES + n(d.iniz.varie) + cumula(per('iniz'));
    const bmc = bab + m.FOR + t[2] + n(d.bmc.varie) + cumula(per('bmc'));
    const dmc = 10 + bab + m.FOR + m.DES + t[2] + cumula(contributi.filter((x) => TIPI_DMC.has(x.tipo))) + n(d.dmc.varie) + cumula(per('dmc'));

    const daClasse = abilDiClasse(d);
    const abil = {};
    const diClasse = {};
    let gradiSpesi = 0;
    for (const a of abilitaScheda(r, d)) {
      const s = d.abil[a.nome] || {};
      gradiSpesi += n(s.gradi);
      // Padronanza istantanea (Maestro del Sapere): 4 gradi gratuiti, che contano come gradi veri
      const gr = n(s.gradi) + (gradiGratis[a.nome] || 0);
      // Un tipo di Artigianato o Professione è di classe se lo è la famiglia (o se lo spunti tu)
      diClasse[a.nome] = !!s.classe || daClasse.has(a.nome) || (!!a.padre && (daClasse.has(a.padre) || !!d.abil[a.padre]?.classe));
      abil[a.nome] = gr + (m[a.car] || 0) + (diClasse[a.nome] && gr > 0 ? 3 : 0) + n(s.varie)
        - (a.car === 'FOR' || a.car === 'DES' ? penalita : 0) + cumula(per('abilita', 'abil:' + a.nome));
    }
    // Umani (tratto Esperti, se non sostituito): +1 grado di abilità per livello
    const esperti = espertoUmano(d);
    const gradiDisp = d.classi.reduce((a, c) => a + (Math.max(1, n(c.gradi) + m.INT) + (esperti ? 1 : 0)) * n(c.livello), 0) + n(d.gradiExtra);

    // Resoconto del cumulo, valore per valore: quali bonus contano e quali vengono scartati (e perché)
    const cumuli = [];
    const resoconto = (etichetta, lista) => {
      const utili = lista.filter((x) => n(x.valore) !== 0);
      if (utili.length) cumuli.push({ etichetta, ...analizzaCumulo(utili) });
    };
    for (const s of CARS) resoconto(NOMI_CAR[s], per(s));
    resoconto('Prove di caratteristica', per('proveCar'));
    resoconto('Classe Armatura', contributi);
    for (const [k, nome] of TS) resoconto(nome, per('ts', k));
    for (const k of ['colpire', 'danni', 'iniz', 'bmc', 'dmc']) resoconto(etichettaBersaglio(k), per(k));
    const abilToccate = new Set(eff.filter((e) => e.bersaglio?.startsWith('abil:')).map((e) => e.bersaglio.slice(5)));
    for (const a of abilToccate) resoconto(a, per('abilita', 'abil:' + a));
    if (!abilToccate.size || per('abilita').length) resoconto('Tutte le abilità', per('abilita'));

    const numAttacchi = bab >= 1 ? Math.min(4, 1 + Math.floor((bab - 1) / 5)) : 1;
    const bonusColpire = cumula(per('colpire'));
    const bonusDanni = cumula(per('danni'));
    const armi = d.armi.map((a) => {
      const mischia = a.tipo !== 'distanza';
      const usaDes = !mischia || a.accurata;
      // Arma magica (+N a colpire e danni) o perfetta (+1 a colpire): bonus di potenziamento, che non si somma
      // con altri potenziamenti ai tiri per colpire (es. un incantesimo)
      const me = armaEffettiva(a);
      const colpire = me.colpire ? cumula([...per('colpire'), { valore: me.colpire, tipo: 'potenziamento', fonte: a.nome || 'arma' }]) : bonusColpire;
      const danni = me.danni ? cumula([...per('danni'), { valore: me.danni, tipo: 'potenziamento', fonte: a.nome || 'arma' }]) : bonusDanni;
      const ta = talentiArma(d, a); // Arma Focalizzata / Specializzata sull'arma
      let colpo = bab + (usaDes ? m.DES : m.FOR) + t[1] + n(a.bonus) + colpire + ta.colpo;
      const bonusFor = a.carDanni === 'FOR15' ? (m.FOR > 0 ? Math.floor(m.FOR * 1.5) : m.FOR)
        : a.carDanni === 'FOR05' ? (m.FOR > 0 ? Math.floor(m.FOR / 2) : m.FOR)
          : a.carDanni === 'nessuno' ? 0 : m.FOR;
      let danniBonus = bonusFor + n(a.bonusDanni) + danni + me.malus + ta.danni;
      if (mischia && speciale('attaccoPoderoso')) { colpo -= pen; danniBonus += a.carDanni === 'FOR15' ? 3 * pen : a.carDanni === 'FOR05' ? pen : 2 * pen; }
      if (!mischia && speciale('tiroMortale')) { colpo -= pen; danniBonus += 2 * pen; }
      if (mischia && speciale('maestria')) colpo -= pen;
      const sequenza = Array.from({ length: numAttacchi }, (_, i) => segno(colpo - i * 5)).join('/');
      return { id: a.id, colpo, sequenza, danni: `${a.danni || '1d4'}${fmtMod(danniBonus)}`, critico: ta.criticoMigliorato ? critRaddoppiato(a.critico || '20/×2') : a.critico || '20/×2' };
    });

    const pesoMonete = (n(d.monete.mp) + n(d.monete.mo) + n(d.monete.ma) + n(d.monete.mr)) / 100;
    // Pesa solo ciò che il personaggio porta (indossato e zaino), non cavallo, casa, borse extradimensionali…
    const portato = (o) => !window.Luoghi || window.Luoghi.porta(o, d);
    const peso = d.oggetti.filter(portato).reduce((a, o) => a + n(o.peso) * (o.qta === '' || o.qta == null ? 1 : n(o.qta)), 0)
      + d.armi.reduce((a, x) => a + armaEffettiva(x).peso, 0) + d.armature.reduce((a, x) => a + armaturaEffettiva(x).peso, 0) + pesoMonete
      + (window.Luoghi?.pesoBorse ? window.Luoghi.pesoBorse(d) : 0); // le borse conservanti pesano secondo il tipo
    let f = Math.max(0, Math.floor(punteggio.FOR));
    let molt = 1;
    while (f > 29) { f -= 10; molt *= 4; }
    const pesante = (PESANTE_LB[f] * molt * t[3]) / 2;
    const leggero = Math.floor(pesante / 3);
    const medio = Math.floor((pesante * 2) / 3);
    const livelloCarico = peso <= leggero ? 'leggero' : peso <= medio ? 'medio' : peso <= pesante ? 'pesante' : 'oltre il massimo';
    const valoreMonete = n(d.monete.mp) * 10 + n(d.monete.mo) + n(d.monete.ma) / 10 + n(d.monete.mr) / 100;

    const g = n(d.mitico.grado);
    const dm = datiMitici(d);
    const mitico = { grado: g, max: dm.max, impeto: dm.impeto };

    // Punti ferita: massimo del dado al 1° livello, poi media (dado/2 + 1) o massimo
    const pc = d.pfCalc;
    let dadi = 0;
    let primo = true;
    for (const cl of d.classi) {
      const dv = n(cl.dv) || 8;
      for (let i = 0; i < n(cl.livello); i++) {
        if (primo) { dadi += dv; primo = false; } else dadi += pc.metodo === 'massimo' ? dv : Math.floor(dv / 2) + 1;
      }
    }
    const pfCos = m.COS * liv;
    const pfPref = n(pc.preferita);
    // Robustezza: spuntata a mano o data dal segreto Salute segreta del Maestro del Sapere
    const pfRob = pc.robustezza || haSegreto(d, 'robustezza') || haTalento(d, 'Robustezza') ? Math.max(3, liv) : 0;
    const pfMit = g * (PF_MITICI[d.mitico.percorso] || 0);
    const pfVar = n(pc.varie);
    const pfAuto = Math.max(liv, dadi + pfCos + pfPref + pfRob + pfMit + pfVar);
    const pfMax = pc.auto ? pfAuto : n(d.pf.max);
    const pfDett = [`dadi vita ${dadi}`, `COS ${segno(pfCos)}`, pfPref ? `classe preferita +${pfPref}` : '', pfRob ? `Robustezza +${pfRob}` : '',
      pfMit ? `mitico +${pfMit}` : '', pfVar ? `varie ${segno(pfVar)}` : ''].filter(Boolean).join(' · ');
    const pfAtt = d.pf.attuali === '' || d.pf.attuali == null ? pfMax : n(d.pf.attuali);

    const incantatori = d.incantatori.map((inc) => {
      const mm = m[inc.car] ?? 0;
      const punteggioCar = punteggio[inc.car] ?? 10;
      const classe = nomeClasse(inc.classe);
      // Con la tabella automatica gli slot base vengono dalla tabella della classe (wiki) e dal livello di classe
      const auto = !!(inc.auto && classe && TABELLE.classi[classe]);
      // Livelli di classi di prestigio che fanno avanzare gli incantesimi di questa classe
      const livPrestigio = livelliIncPrestigio(d, inc.id);
      const livClasse = classe ? livelloClasse(d, classe) + livPrestigio : 0;
      // Scoperta arcana / ulteriore (Maestro del Sapere): un incantesimo bonus di 1° / 2° livello
      const bonusScoperta = (L) => (incScopertaMS(d) === inc.id && ((L === 1 && haSegreto(d, 'inc1')) || (L === 2 && haSegreto(d, 'inc2'))) ? 1 : 0);
      const cl = auto ? Math.max(0, livClasse - (CL_MENO_3.has(classe) ? 3 : 0)) : n(inc.livello);
      // Conosciuti contati sul limite della classe (quelli di Incantesimi Aggiuntivi sono in più)
      const noti = (inc.incantesimi || []).filter((s) => !s.talentoId && !s.stirpe).reduce((a, s) => { a[n(s.livello)] = (a[n(s.livello)] || 0) + 1; return a; }, {});
      const livelli = [];
      for (let L = 0; L <= 9; L++) {
        const b = auto ? TABELLE.alGiorno(classe, livClasse, L) : (inc.slot?.[L]?.base ?? '');
        const disponibile = b !== '';
        const bonus = disponibile ? TABELLE.bonus(mm, L) + bonusScoperta(L) : 0;
        // Chierici e druidi con un dominio hanno uno slot in più per ogni livello (solo incantesimi di dominio)
        const dominio = disponibile && L > 0 && slotDominio(d, inc.classe) ? 1 : 0;
        // I maghi specialisti hanno uno slot in più per livello, per incantesimi della propria scuola
        const scuola = disponibile && L > 0 && slotScuola(d, inc.classe) ? 1 : 0;
        // Per lanciare un incantesimo serve un punteggio di almeno 10 + livello dell'incantesimo
        // (anche per i trucchetti e le orazioni: con meno di 10 non si lancia nulla)
        const troppoAlto = disponibile && punteggioCar < 10 + L;
        const conosciuti = auto && inc.tipo === 'spontanei' ? TABELLE.conosciuti(classe, livClasse, L) : '';
        livelli.push({ L, base: b, bonus, dominio, scuola, troppoAlto, conosciuti, noti: noti[L] || 0,
          tot: disponibile && !troppoAlto ? n(b) + bonus + dominio + scuola : 0, cd: 10 + L + mm, usati: n(inc.slot?.[L]?.usati) });
      }
      return { id: inc.id, mod: mm, auto, cl, conc: cl + mm, livelli, livPrestigio };
    });

    return {
      base, punteggio, m, liv, bab, ca, contatto, sorpresa, desMax, penalita, fallimento, ts, init, bmc, dmc,
      abil, diClasse, daClasse, gradiSpesi, gradiDisp, armi, peso, leggero, medio, pesante, livelloCarico, valoreMonete,
      mitico, pfMax, pfAtt, pfDett, incantatori, cumuli, bonusColpire, bonusDanni, bonusAttivi: d.bonus.filter((b) => b.attivo).map((b) => b.nome),
      proveCar: cumula(per('proveCar')), // bonus alle prove di caratteristica (es. Forza per sfondare una porta)
    };
  }

  // Valori calcolati da mostrare, indicizzati per chiave (aggiornati a ogni modifica senza ridisegnare)
  function mappa(c) {
    const o = { ...valoriSoffio(c) };
    for (const s of CARS) {
      o['mod:' + s] = segno(c.m[s]);
      o['prova:' + s] = n(c.proveCar) ? `prova ${segno(c.m[s] + n(c.proveCar))}` : '';
      o['eff:' + s] = c.punteggio[s] !== c.base[s] ? `→ ${c.punteggio[s]}` : '';
    }
    Object.assign(o, {
      liv: String(c.liv), bab: segno(c.bab), ca: String(c.ca), contatto: String(c.contatto), sorpresa: String(c.sorpresa),
      init: segno(c.init), bmc: segno(c.bmc), dmc: String(c.dmc),
      caNota: [c.desMax !== null ? `DES max ${segno(c.desMax)}` : '', c.penalita ? `penalità armatura −${c.penalita}` : '', c.fallimento ? `fallimento incantesimi ${c.fallimento}%` : ''].filter(Boolean).join(' · '),
      gradi: `${c.gradiSpesi} / ${c.gradiDisp}`, gradiMax: String(c.liv),
      peso: `${kg(c.peso)} kg`, carico: `${c.livelloCarico} (leggero ≤ ${kg(c.leggero)} · medio ≤ ${kg(c.medio)} · pesante ≤ ${kg(c.pesante)} kg)`,
      monete: `${kg(c.valoreMonete)} mo`,
      'mitico:max': String(c.mitico.max), 'mitico:impeto': c.mitico.impeto,
      pfmax: String(c.pfMax), pfdett: c.pfDett, pfatt: String(c.pfAtt),
      bonusAttivi: c.bonusAttivi.length ? c.bonusAttivi.join(', ') : 'nessuno',
    });
    for (const [k] of TS) {
      const t = c.ts[k];
      Object.assign(o, { ['ts:' + k]: segno(t.tot), ['tsb:' + k]: segno(t.base), ['tscar:' + k]: segno(t.car), ['tsbon:' + k]: segno(t.bonus) });
      for (const x of t.cond) o[`tsc:${k}:${x.id}`] = segno(x.tot);
    }
    for (const [k, v] of Object.entries(c.abil)) o['abil:' + k] = segno(v);
    for (const a of c.armi) { o[`arma:${a.id}:colpo`] = a.sequenza; o[`arma:${a.id}:danni`] = `${a.danni} (${a.critico})`; }
    for (const inc of c.incantatori) {
      o[`inc:${inc.id}:conc`] = segno(inc.conc);
      o[`inc:${inc.id}:cl`] = String(inc.cl);
      for (const l of inc.livelli) {
        o[`inc:${inc.id}:bonus:${l.L}`] = (l.bonus ? '+' + l.bonus : '—') + (l.dominio ? ' +1D' : '') + (l.scuola ? ' +1S' : '');
        o[`inc:${inc.id}:tot:${l.L}`] = l.base === '' ? '—' : l.troppoAlto ? '✕' : String(l.tot);
        o[`inc:${inc.id}:base:${l.L}`] = l.base === '' ? '—' : String(l.base);
        o[`inc:${inc.id}:cd:${l.L}`] = String(l.cd);
      }
    }
    return o;
  }

  function aggiorna(p) {
    const r = ctx.regDi(p);
    const c = calcola(p, r);
    const valori = mappa(c);
    document.querySelectorAll('[data-calc]').forEach((el) => {
      if (el.dataset.calc in valori) el.textContent = valori[el.dataset.calc];
    });
    const sp = document.querySelector('[data-gradi-avviso]');
    if (sp) sp.classList.toggle('oltre', c.gradiSpesi > c.gradiDisp);
    // L'elenco dei talenti (se aperto) segue caratteristiche, gradi, talenti presi…
    clearTimeout(aggiorna.timer);
    aggiorna.timer = setTimeout(() => {
      const box = document.getElementById('elenco-talenti');
      if (box && box.closest('details')?.open && box.dataset.pg === p.id) box.innerHTML = listaTalentiHtml(p);
    }, 300);
  }

  // =====================================================================
  // Divinità e domini
  // =====================================================================
  const divinitaDi = (d) => FEDE.divinita[d.fede?.divinita] || null;

  // Domini o benedizioni concessi dalle classi del personaggio (uno "slot" ciascuno)
  function slotFede(d) {
    const spec = [];
    for (const cl of d.classi) {
      const k = nomeClasse(cl.nome);
      const def = CLASSI_DOMINI[k];
      if (def) for (let i = 0; i < def.n; i++) spec.push({ classe: k, livello: n(cl.livello), ...def });
    }
    while (d.fede.slot.length < spec.length) d.fede.slot.push({ dominio: '', sotto: '' });
    return spec.map((s, i) => ({ ...s, i, scelta: d.fede.slot[i] }));
  }
  // Ha uno slot di dominio in più per livello? (chierico/druido con un dominio scelto)
  function slotDominio(d, classeInc) {
    const k = nomeClasse(classeInc);
    return !!k && slotFede(d).some((s) => s.classe === k && s.incantesimi && s.scelta.dominio);
  }
  const stessoNome = (a, b) => { const x = norm(a), y = norm(b); return x === y || (y.length >= 5 && x.slice(0, 5) === y.slice(0, 5)); };
  function dominiAmmessi(sc, dio, altri) {
    const fonte = sc.tipo === 'benedizione' ? FEDE.benedizioni : FEDE.domini;
    const lista = sc.natura ? DOMINI_NATURA : dio ? dio.domini.filter((x) => fonte[x]) : Object.keys(fonte);
    return lista.filter((x) => !altri.includes(x));
  }
  function sottodominiAmmessi(dominio, dio) {
    const dom = FEDE.domini[dominio];
    if (!dom) return [];
    const tutti = Object.keys(dom.sottodomini);
    // Se il wiki non indica i sottodomini della divinità, li proponiamo tutti
    if (!dio || !dio.sottodomini.length) return tutti;
    return tutti.filter((s) => dio.sottodomini.some((x) => stessoNome(x, s)));
  }
  // Poteri effettivi: quelli del dominio, con le sostituzioni del sottodominio scelto
  function poteriSlot(sc) {
    const dom = FEDE.domini[sc.scelta.dominio];
    if (!dom || sc.tipo !== 'dominio') return [];
    const sub = dom.sottodomini[sc.scelta.sotto];
    return dom.poteri.map((pt) => sub?.poteri.find((x) => x.sostituisce === pt.nome) || pt);
  }
  function incantesimiSlot(sc) {
    const dom = FEDE.domini[sc.scelta.dominio];
    if (!dom || !sc.incantesimi) return [];
    const sub = dom.sottodomini[sc.scelta.sotto];
    return dom.incantesimi.map((nome, i) => sub?.incantesimi[i + 1] || nome);
  }

  // ---- Info point: dati subito, descrizione letta dal wiki ----
  function apriInfo(titolo, corpoHtml, pagina, estrai, sito = 'pf1') {
    document.getElementById('info-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'info-overlay';
    ov.innerHTML = `<div class="info-box" role="dialog" aria-label="${esc(titolo)}">
        <div class="info-testa"><h2>${esc(titolo)}</h2><button class="btn-x" data-azione="pf1-chiudi-info" title="Chiudi">×</button></div>
        <div class="info-corpo">${corpoHtml}</div>
        <div class="info-wiki"><span class="muto">Caricamento della descrizione dal wiki…</span></div>
        <div class="info-piede"><a href="${esc((sito === 'sf' ? 'https://starfinder.altervista.org/wiki/' : sito === 'dnd' ? 'https://dungeonsanddragons.fandom.com/it/wiki/' : sito === 'pf2' ? 'https://selven.altervista.org/wiki/' : FEDE.wiki) + pagina)}" target="_blank" rel="noopener">Apri la pagina completa su ${sito === 'sf' ? 'Absalom Outsider' : sito === 'dnd' ? 'il wiki di D&amp;D' : sito === 'pf2' ? 'Golarion Insider PF2' : 'Golarion Insider'} ↗</a></div>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    // Senza pagina del wiki italiano (es. regole solo in inglese): solo i dati, con un link alla fonte
    if (!pagina) {
      ov.querySelector('.info-wiki').remove();
      const piede = ov.querySelector('.info-piede');
      if (sito && /^https:\/\//.test(sito)) piede.innerHTML = `<a href="${esc(sito)}" target="_blank" rel="noopener">Apri la fonte in inglese ↗</a>`; else piede.remove();
      return;
    }
    ctx.wiki(pagina, sito).then((html) => {
      const box = ov.querySelector('.info-wiki');
      const testo = estrai(new DOMParser().parseFromString(html, 'text/html'));
      box.textContent = '';
      if (!testo) { box.innerHTML = '<span class="muto">Nessuna descrizione trovata nella pagina.</span>'; return; }
      // Solo testo semplice: niente HTML preso dal sito
      for (const par of testo.split(/\n{2,}/)) { const el = document.createElement('p'); el.textContent = par; box.appendChild(el); }
      const fonte = document.createElement('p');
      fonte.className = 'muto info-fonte';
      fonte.textContent = sito === 'pf2' ? 'Testo letto ora da Golarion Insider PF2 (selven.altervista.org), wiki non ufficiale di appassionati.' : sito === 'dnd' ? 'Testo letto ora dal wiki Fandom italiano di D&D (dungeonsanddragons.fandom.com), wiki di appassionati.' : sito === 'sf' ? 'Testo letto ora da Absalom Outsider (starfinder.altervista.org), wiki non ufficiale di appassionati.' : 'Testo letto ora da Golarion Insider (golarion.altervista.org), wiki non ufficiale di appassionati.';
      box.appendChild(fonte);
    }).catch((err) => {
      // Gli errori dall'app arrivano con un prefisso tecnico ("Error invoking remote method…"): si mostra solo il motivo
      const motivo = String(err.message || err).replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/i, '');
      ov.querySelector('.info-wiki').innerHTML = /verifica/i.test(motivo)
        ? `<span class="oltre">⚠ Il wiki in questo momento chiede una verifica anti-bot che l'app non può fare: la descrizione si legge aprendo la pagina nel browser con il link qui sotto.</span>`
        : `<span class="muto">Descrizione non disponibile (${esc(motivo)}): usa il link qui sotto.</span>`;
    });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.getElementById('info-overlay')?.remove(); });
  const blocchiTesto = (doc) => [...(doc.querySelector('#mw-content-text')?.querySelectorAll('h2, h3, h4, p, li, dd, dt') || [])]
    .filter((el) => !el.closest('#toc, .toc, table')).map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const estraiDivinita = (doc) => blocchiTesto(doc).filter((r) => r.length > 80).slice(0, 4).join('\n\n');
  const estraiDominio = (sotto) => (doc) => {
    const righe = blocchiTesto(doc);
    const i = righe.findIndex((r) => /^Poteri Concessi/i.test(r));
    const j = righe.findIndex((r, k) => k > i && /^Incantesimi di Dominio/i.test(r));
    let out = i >= 0 ? righe.slice(i, j > i ? j : i + 6) : [];
    if (sotto) {
      const s = righe.findIndex((r) => /^Sottodominio/i.test(r) && norm(r).includes(norm(sotto)));
      if (s >= 0) {
        const e = righe.findIndex((r, k) => k > s && /^Sottodominio/i.test(r));
        out = out.concat(righe.slice(s, e > s ? e : s + 8));
      }
    }
    return out.join('\n\n');
  };
  const fatto = (etichetta, valore) => (valore ? `<div class="info-fatto"><span class="muto">${etichetta}</span><span>${esc(valore)}</span></div>` : '');

  function sezioneFede(p, d, c) {
    const dio = divinitaDi(d);
    const id = p.id;
    const voci = (principale) => Object.values(FEDE.divinita).filter((x) => x.principale === principale)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')).map((x) => [x.nome, `${x.nome} (${x.allineamento})`]);
    const scelta = `<label>Divinità <select data-pf1="fede|divinita" data-id="${id}" data-ridisegna-pf1>
        <option value="">— nessuna —</option>
        <optgroup label="Divinità principali">${opz(voci(true), d.fede.divinita)}</optgroup>
        <optgroup label="Altre divinità del Mare Interno">${opz(voci(false), d.fede.divinita)}</optgroup>
      </select></label>`;
    const slots = slotFede(d);
    const classiPg = d.classi.map((cl) => nomeClasse(cl.nome)).filter(Boolean);
    const all = siglaAllineamento(p.campi?.Allineamento);
    const avviso = dio && all && classiPg.some((k) => CLASSI_ALLINEAMENTO.has(k)) && !dio.chierici.includes(all)
      ? `<div class="avviso-fede">⚠ Allineamento ${all}: per ${esc(dio.nome)} chierici, inquisitori e sacerdoti guerrieri devono essere ${dio.chierici.join(', ')}</div>` : '';
    const schedaDio = dio ? `<div class="fede-dio">
        <div class="pf-riga"><b class="fede-nome">${esc(dio.nome)}</b> <span class="badge">${esc(dio.allineamento)}</span> <span class="muto">${esc(dio.rango)}</span>
          <button class="btn-piccolo" data-azione="pf1-info-divinita" data-nome="${esc(dio.nome)}">ℹ Info point</button></div>
        ${dio.sfere ? `<div class="muto">${esc(dio.sfere)}</div>` : ''}
        <div class="fede-righe">
          <div><span class="muto">Arma preferita</span> <b>${esc(dio.arma || '—')}</b>
            ${dio.arma ? `<button class="btn-piccolo" data-azione="pf1-arma-divinita" data-id="${id}" title="Aggiunge l'arma agli attacchi con danni e critico">+ agli attacchi</button>` : ''}</div>
          <div><span class="muto">Domini</span> ${esc(dio.domini.join(', ') || '—')}</div>
          <div><span class="muto">Sottodomini</span> ${esc(dio.sottodomini.join(', ') || 'non indicati dal wiki')}</div>
          <div><span class="muto">Allineamenti dei chierici</span> ${esc(dio.chierici.join(', '))}</div>
        </div>
        ${avviso}
      </div>` : '';

    const righe = slots.map((sc) => {
      const altri = slots.filter((o) => o.i !== sc.i && o.classe === sc.classe).map((o) => o.scelta.dominio);
      const ammessi = dominiAmmessi(sc, dio, altri);
      const correnti = [...new Set([...ammessi, ...(sc.scelta.dominio ? [sc.scelta.dominio] : [])])];
      const opzDom = `<option value="">— scegli —</option>${opz(correnti.map((x) => [x, ammessi.includes(x) ? x : x + ' ⚠ non concesso']), sc.scelta.dominio)}`;
      const base = `fede|slot|${sc.i}`;
      const sottos = sc.tipo === 'dominio' && sc.scelta.dominio ? sottodominiAmmessi(sc.scelta.dominio, dio) : [];
      const testa = `<div class="pf-riga">
          <span class="fede-etich">${sc.tipo === 'benedizione' ? 'Benedizione' : 'Dominio'} · ${esc(sc.classe)} ${sc.livello}</span>
          <select data-pf1="${base}|dominio" data-id="${id}" data-ridisegna-pf1>${opzDom}</select>
          ${sottos.length ? `<label>Sottodominio <select data-pf1="${base}|sotto" data-id="${id}" data-ridisegna-pf1><option value="">— nessuno —</option>${opz(sottos.map((x) => [x, x]), sc.scelta.sotto)}</select></label>` : ''}
          ${sc.scelta.dominio && sc.tipo === 'dominio' ? `<button class="btn-piccolo" data-azione="pf1-info-dominio" data-nome="${esc(sc.scelta.dominio)}" data-sotto="${esc(sc.scelta.sotto || '')}">📖 Testo dei poteri</button>` : ''}
          ${sc.scelta.dominio && sc.tipo === 'benedizione' ? `<button class="btn-piccolo" data-azione="pf1-info-benedizione" data-nome="${esc(sc.scelta.dominio)}">📖 Testo dei poteri</button>` : ''}
        </div>`;
      if (!sc.scelta.dominio) return `<div class="fede-slot">${testa}</div>`;
      if (sc.tipo === 'benedizione') {
        const b = FEDE.benedizioni[sc.scelta.dominio];
        if (!b) return `<div class="fede-slot">${testa}</div>`;
        return `<div class="fede-slot">${testa}<ul class="fede-poteri">
            <li><b>${esc(b.minore)}</b> <small class="muto">(potere minore)</small></li>
            <li class="${sc.livello < 10 ? 'non-ancora' : ''}"><b>${esc(b.maggiore)}</b> <small class="muto">(potere maggiore)</small> <small>dal 10° livello</small></li>
          </ul></div>`;
      }
      const poteri = poteriSlot(sc).map((pt) => `<li class="${pt.livello > sc.livello ? 'non-ancora' : ''}">
          <b>${esc(pt.nome)}</b> <small class="muto">(${esc(pt.tipo)})</small>
          ${pt.livello > 1 ? `<small>dal ${pt.livello}° livello</small>` : ''}
          ${pt.sostituisce ? `<small class="muto">— sostituisce ${esc(pt.sostituisce)}</small>` : ''}</li>`).join('');
      const caster = d.incantatori.find((x) => nomeClasse(x.classe) === sc.classe);
      const ciCaster = caster && c.incantatori.find((x) => x.id === caster.id);
      const maxLiv = ciCaster ? Math.max(0, ...ciCaster.livelli.filter((l) => l.base !== '' && !l.troppoAlto).map((l) => l.L)) : Math.ceil(sc.livello / 2);
      const incantesimi = incantesimiSlot(sc).map((nome, i) => {
        const L = i + 1;
        const ok = L <= maxLiv;
        return `<div class="fede-inc${ok ? '' : ' non-ancora'}"><b>${L}°</b> <span>${esc(nome)}</span>
          ${ok && caster ? `<button class="btn-mini" data-azione="pf1-prepara-dominio" data-id="${id}" data-classe="${esc(sc.classe)}" data-livello="${L}" data-nome="${esc(nome)}" title="Aggiungi agli incantesimi">+</button>` : ''}</div>`;
      }).join('');
      return `<div class="fede-slot">${testa}
        <ul class="fede-poteri">${poteri}</ul>
        ${incantesimi ? `<div class="fede-inc-lista"><span class="muto">Incantesimi di dominio${caster ? ' (+ li aggiunge agli incantesimi)' : ''}:</span>${incantesimi}</div>` : ''}
      </div>`;
    }).join('');
    const nota = slots.length ? '' : '<p class="muto pf-aiuto">Domini e benedizioni compaiono qui se il personaggio è Chierico, Druido, Inquisitore o Sacerdote Guerriero. La divinità si può scegliere comunque.</p>';
    // Usi giornalieri delle benedizioni (in comune tra le due): 3 + metà livello da sacerdote guerriero
    const sg = slots.find((s) => s.tipo === 'benedizione');
    const usiBen = sg ? `<div class="fede-slot pf-riga">
        <span class="fede-etich">Benedizioni al giorno</span>
        <span class="pf-pallini">${pallini(3 + Math.floor(sg.livello / 2), n(d.fede.usiBenedizioni), `data-azione="pf1-uso-benedizione" data-id="${id}"`)}</span>
        <span class="muto">CD ${10 + Math.floor(sg.livello / 2) + c.m.SAG}</span>
      </div>` : '';
    return `<div class="pf-riga">${scelta}</div>${schedaDio}${usiBen}${righe}${nota}`;
  }

  // Pallini cliccabili per gli usi giornalieri (clic sull'ultimo pieno = lo libera)
  const pallini = (tot, usati, attr) => Array.from({ length: Math.max(0, tot) }, (_, i) =>
    `<button class="pallino${i < usati ? ' pieno' : ''}" ${attr} data-indice="${i}" title="Uso ${i + 1}"></button>`).join('');
  // Classi i cui livelli contano anche come livelli effettivi di un'altra classe
  const CONTA_COME = { [MS_MOD]: ['Mago'] };
  const livelloClasse = (d, k) => d.classi.filter((cl) => { const x = nomeClasse(cl.nome); return x === k || !!CONTA_COME[x]?.includes(k); })
    .reduce((a, cl) => a + n(cl.livello), 0);

  // ---- Classi di prestigio da incantatore: "+1 livello di classe esistente" ----
  // Ogni livello di prestigio con quella voce conta come un livello in più per una classe da incantatore già posseduta
  // (incantesimi al giorno, conosciuti e livello dell'incantatore). Il Teurgo Mistico ne ha due: uno arcano e uno divino.
  function vociIncPrestigio(d) {
    const out = []; // { cl, k, tipo, livelli, dest }
    for (const cl of d.classi) {
      const v = PRESTIGIO[nomeClasse(cl.nome)] || PRESTIGIO[cl.nome];
      if (!v) continue;
      // "Incantesimi al giorno" o, per le classi degli alchimisti (es. Mastro Chimico), "Estratti al giorno"
      const col = (v.colonne || []).findIndex((x) => /^(incantesimi|estratti) al giorno$/i.test(x));
      if (col < 0) continue;
      const voci = [];
      for (let r = 0; r < Math.min(n(cl.livello), v.righe.length); r++) {
        String(v.righe[r][4 + col] || '').split('/').forEach((parte, k) => {
          if (!/\+\s*1 livello/i.test(parte)) return;
          const tipo = /arcan/i.test(parte) ? 'arcano' : /divin/i.test(parte) ? 'divino' : '';
          // "+1 livello di Alchimista": vale solo per quella classe
          const classe = nomeClasse((parte.match(/livello di ([A-ZÀ-Ý][\wÀ-ÿ' ]*?)\s*$/) || [])[1]) || '';
          if (!voci[k]) voci[k] = { cl, k, tipo, classe, livelli: 0 };
          voci[k].livelli++;
        });
      }
      for (const x of voci.filter(Boolean)) {
        const adatti = d.incantatori.filter((inc) => (x.classe ? nomeClasse(inc.classe) === x.classe : !x.tipo || (x.tipo === 'arcano' ? CLASSI_ARCANE : CLASSI_DIVINE).has(nomeClasse(inc.classe))));
        const scelto = cl.incPrestigio?.[x.k];
        x.adatti = adatti;
        x.dest = d.incantatori.some((inc) => inc.id === scelto) ? scelto : adatti[0]?.id || '';
        out.push(x);
      }
    }
    return out;
  }
  const livelliIncPrestigio = (d, incId) => vociIncPrestigio(d).filter((x) => x.dest === incId).reduce((a, x) => a + x.livelli, 0);

  // ---- Maestro del Sapere: segreti, sapienza, linguaggi bonus ----
  // Segreti (wiki, tabella "Segreti del Maestro del Sapere"): [requisito livello + mod. INT, nome, effetto, tipo]
  const SEGRETI_MS = [
    [1, 'Padronanza istantanea', '4 gradi in un\'abilità in cui il personaggio non ha gradi', 'gradi'],
    [2, 'Salute segreta', 'Robustezza come talento bonus', 'robustezza'],
    [3, 'Segreto della forza interiore', 'Bonus +2 ai TS su Volontà', 'volonta'],
    [4, 'Sapienza del vero vigore', 'Bonus +2 ai TS su Tempra', 'tempra'],
    [5, 'Conoscenza segreta dell\'elusività', 'Bonus +2 ai TS su Riflessi', 'riflessi'],
    [6, 'Trucco dell\'arma', 'Bonus +1 ai tiri per colpire', 'colpire'],
    [7, 'Trucco della schivata', 'Bonus di schivare +1 alla CA', 'ca'],
    [8, 'Conoscenza pratica', 'Un talento qualsiasi', 'talento'],
    [9, 'Scoperta arcana', '1 incantesimo bonus di 1° livello (come per un punteggio alto)', 'inc1'],
    [10, 'Scoperta arcana ulteriore', '1 incantesimo bonus di 2° livello (come per un punteggio alto)', 'inc2'],
  ];
  const MS = 'Maestro del Sapere';
  // Livelli che danno i privilegi del Maestro del Sapere (anche quelli della variante Mod)
  const livMS = (d) => livelloClasse(d, MS) + livelloClasse(d, MS_MOD);
  const segretoMS = (nome) => SEGRETI_MS.find((s) => s[1] === nome);
  const haSegreto = (d, tipo) => livMS(d) > 0 && (d.maestro?.segreti || []).some((nome) => segretoMS(nome)?.[3] === tipo);
  // Segreti a disposizione: 1° livello e poi ogni 2 (3°, 5°, 7°, 9°)
  const segretiDisponibiliMS = (liv) => Math.min(5, Math.ceil(liv / 2));
  // Incantatore che riceve gli incantesimi bonus delle scoperte arcane (quello scelto, o il primo)
  const incScopertaMS = (d) => (d.incantatori.some((x) => x.id === d.maestro?.incSegreto) ? d.maestro.incSegreto : d.incantatori[0]?.id || '');
  // Gradi gratuiti di Padronanza istantanea (non contano tra i gradi spesi)
  const gradiSegretiMS = (d) => (haSegreto(d, 'gradi') && d.maestro.padronanza ? { [d.maestro.padronanza]: 4 } : {});
  // Effetti sulla scheda: bonus dei segreti e Sapienza (+½ livello alle prove di Conoscenze)
  function effettiMaestro(d, abilita) {
    const liv = livMS(d);
    if (!liv) return [];
    const out = [];
    const fonte = (nome) => `${nome} (${MS})`;
    for (const nome of d.maestro?.segreti || []) {
      const s = segretoMS(nome);
      if (!s) continue;
      if (s[3] === 'volonta' || s[3] === 'tempra' || s[3] === 'riflessi') out.push({ ...E(s[3], 2), fonte: fonte(nome) });
      if (s[3] === 'colpire') out.push({ ...E('colpire', 1), fonte: fonte(nome) });
      if (s[3] === 'ca') out.push({ ...E('ca', 1, 'schivare'), fonte: fonte(nome) });
    }
    if (liv >= 2) {
      for (const a of abilita.filter((x) => /^Conoscenze \(/.test(x.nome))) out.push({ ...E('abil:' + a.nome, Math.floor(liv / 2)), fonte: fonte('Sapienza') });
    }
    return out;
  }
  function sezioneMaestro(p, d, c, r) {
    const id = p.id;
    const ms = d.maestro;
    const liv = livMS(d);
    const soglia = liv + c.m.INT;
    const tot = segretiDisponibiliMS(liv);
    const scelti = ms.segreti;
    const nomiAbil = abilitaScheda(r, d).map((a) => a.nome);
    const senzaGradi = nomiAbil.filter((a) => !n(d.abil[a]?.gradi) || a === ms.padronanza);
    const voci = SEGRETI_MS.map(([req, nome, effetto, tipo]) => {
      const preso = scelti.includes(nome);
      const no = req > soglia;
      const pieno = !preso && scelti.length >= tot;
      let extra = '';
      if (preso && tipo === 'gradi') extra = `<label class="ms-extra">Abilità <select data-pf1="maestro|padronanza" data-id="${id}" data-ridisegna-pf1>${opz([['', '— scegli —'], ...senzaGradi.map((a) => [a, a])], ms.padronanza)}</select></label>`;
      if (preso && tipo === 'talento') {
        const t = d.capacita.find((x) => x.segretoMS === 'talento');
        extra = t ? `<span class="ms-extra">→ <b>${esc(t.nome)}</b> <small class="muto">(tra i talenti)</small></span>`
          : `<span class="ms-extra"><input list="ms-talenti" data-ms-talento placeholder="nome del talento"><button class="btn-mini" data-azione="ms-talento" data-id="${id}">Prendi</button></span>`;
      }
      if (preso && (tipo === 'inc1' || tipo === 'inc2') && d.incantatori.length > 1) {
        extra = `<label class="ms-extra">Per <select data-pf1="maestro|incSegreto" data-id="${id}" data-ridisegna-pf1>${opz(d.incantatori.map((x) => [x.id, x.classe || '?']), incScopertaMS(d))}</select></label>`;
      }
      return `<label class="riv alc-scop${(no || pieno) && !preso ? ' non-ancora' : ''}${preso ? ' presa' : ''}">
        <input type="checkbox" ${preso ? 'checked' : ''} ${(no || pieno) && !preso ? 'disabled' : ''} data-azione="ms-segreto" data-id="${id}" data-nome="${esc(nome)}">
        <span><b>${esc(nome)}</b> <small class="muto">(${req})</small><span class="ms-eff">${esc(effetto)}</span>${no && !preso ? ` <i class="alc-no">serve livello + INT ≥ ${req}</i>` : ''}</span>${extra}</label>`;
    }).join('');
    const nLing = (liv >= 4 ? 1 : 0) + (liv >= 8 ? 1 : 0);
    const lingue = Array.from({ length: nLing }, (_, i) => `<label>${i ? '8°' : '4°'} livello <input data-pf1="maestro|linguaggi|${i}" data-id="${id}" value="${esc(ms.linguaggi[i] || '')}" placeholder="linguaggio"></label>`).join('');
    const cap = [
      liv >= 2 ? `<li><b>Sapienza</b>: +${Math.floor(liv / 2)} (½ livello) a tutte le prove di Conoscenze, già sommato; si possono tentare anche senza gradi. Si somma a Conoscenze Bardiche.</li>` : '',
      liv >= 6 ? `<li><b>Sapienza Superiore</b> (Str): +10 di circostanza alle prove di Sapienza Magica per identificare le proprietà di un oggetto magico (Sapienza Magica ora: ${segno(c.abil['Sapienza Magica'] ?? 0)}, per identificare ${segno((c.abil['Sapienza Magica'] ?? 0) + 10)}).</li>` : '',
      liv >= 10 ? `<li><b>Vera Sapienza</b> (Str): 1 volta al giorno, effetto di <i>Conoscenza delle Leggende</i> (tempo di lancio 1 minuto) o di <i>Analizzare Dweomer</i>.
          <label class="pf-chk">${`<input type="checkbox" data-pf1="maestro|veraUsata" data-id="${id}" ${ms.veraUsata ? 'checked' : ''}>`} usata oggi</label></li>` : '',
    ].join('');
    return `<div class="alc-pannello">
        <h4>📚 Segreti <small class="${scelti.length > tot ? 'oltre' : 'muto'}">${scelti.length} / ${tot}</small>
          <small class="muto">al 1°, 3°, 5°, 7° e 9° livello · disponibili quelli fino a livello + INT = ${soglia} · non si sceglie lo stesso due volte</small></h4>
        <div class="riv-griglia alc-griglia ms-griglia">${voci}</div>
        <datalist id="ms-talenti">${TALENTI.voci.map((t) => `<option value="${esc(t.nome)}">`).join('')}</datalist>
      </div>
      ${cap ? `<ul class="ms-cap">${cap}</ul>` : '<p class="muto">Sapienza arriva al 2° livello.</p>'}
      ${nLing ? `<div class="pf-riga"><b>Linguaggi bonus</b> ${lingue}</div>` : '<p class="muto pf-aiuto">Linguaggi bonus: uno al 4° e uno all\'8° livello.</p>'}`;
  }

  // ---- Stregone: stirpi (dati in src/pf1-stirpi.js, dalla pagina «Stregone/Stirpi» del wiki) ----
  const STIRPI = window.PF1_STIRPI || [];
  const stirpeDi = (d) => STIRPI.find((s) => s.nome === d.stregone?.stirpe) || null;
  // Livello da cui si ottiene un incantesimo bonus della stirpe (3°, 5°, … 19°) -> livello dell'incantesimo (1°… 9°)
  const livIncStirpe = (livStregone) => (livStregone - 1) / 2;
  // Tipi a scelta per le stirpi che li chiedono: [nome, energia]
  const TIPI_STIRPE = {
    Draconica: [['Bianco', 'freddo'], ['Blu', 'elettricità'], ['Nero', 'acido'], ['Rosso', 'fuoco'], ['Verde', 'acido'], ['Argento', 'freddo'], ['Bronzo', 'elettricità'], ['Oro', 'fuoco'], ['Ottone', 'fuoco'], ['Rame', 'acido']],
    Elementale: [['Acqua', 'freddo'], ['Aria', 'elettricità'], ['Fuoco', 'fuoco'], ['Terra', 'acido']],
  };
  // Incantesimi bonus raggiunti: aggiunti tra i conosciuti dello stregone (segnati "stirpe", fuori dal limite);
  // cambiando stirpe o scendendo di livello quelli non più dovuti spariscono
  function sincronizzaStirpe(d) {
    const inc = d.incantatori.find((x) => nomeClasse(x.classe) === 'Stregone');
    if (!inc) return;
    const st = stirpeDi(d);
    const liv = livelloClasse(d, 'Stregone');
    const dovuti = st ? st.inc.filter((x) => x.liv <= liv) : [];
    inc.incantesimi = inc.incantesimi || [];
    const prima = inc.incantesimi.length;
    inc.incantesimi = inc.incantesimi.filter((s) => !s.stirpe || dovuti.some((x) => norm(x.nome) === norm(s.nome)));
    for (const x of dovuti) {
      if (inc.incantesimi.some((s) => norm(s.nome) === norm(x.nome))) continue;
      inc.incantesimi.push({ id: uid(), nome: incantesimoDi(x.nome)?.nome || x.nome, livello: livIncStirpe(x.liv), preparati: '', lanciati: 0, note: `Stirpe ${st.nome}`, stirpe: true });
    }
    return inc.incantesimi.length !== prima;
  }
  // Usi al giorno di un potere della stirpe
  const usiPotereStirpe = (pt, liv, c) => ({ '3+CAR': Math.max(0, 3 + c.m.CAR), liv, 'round=liv': liv, 1: 1, 2: 2, 3: 3 }[pt.usi] || 0);
  // Testo di un potere dal wiki: la voce di elenco dentro la sezione della stirpe (i nomi si ripetono tra stirpi)
  const estraiPotereStirpe = (stirpe, potere) => (doc) => {
    const c = doc.querySelector('#mw-content-text .mw-parser-output') || doc.querySelector('#mw-content-text');
    const testa = (el) => (/^H[1-6]$/.test(el.tagName) ? el : el.classList?.contains('mw-heading') ? el.querySelector('h1,h2,h3,h4') : null);
    const tit = (h) => norm((h.querySelector('.mw-headline')?.textContent || h.textContent).replace(/\[modifica.*$/i, ''));
    let dentro = false;
    for (const el of [...(c?.children || [])]) {
      const h = testa(el);
      if (h && h.tagName === 'H2') { if (dentro) break; dentro = tit(h) === norm(stirpe); continue; }
      if (!dentro) continue;
      const li = [...el.querySelectorAll?.('li') || []].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).find((t) => norm(t).startsWith(norm(potere) + ' (') || norm(t).startsWith(norm(potere) + ':'));
      if (li) return li;
    }
    return '';
  };
  function sezioneStirpe(p, d, c) {
    const id = p.id;
    const s = d.stregone;
    const st = stirpeDi(d);
    const liv = livelloClasse(d, 'Stregone');
    const scelta = `<div class="pf-riga"><label>Stirpe <select data-pf1="stregone|stirpe" data-id="${id}" data-ridisegna-pf1>${opz([['', '— scegli la stirpe —'], ...STIRPI.map((x) => [x.nome, x.nome])], s.stirpe)}</select></label>
        ${st && TIPI_STIRPE[st.nome] ? `<label>${st.nome === 'Draconica' ? 'Drago' : 'Elemento'} <select data-pf1="stregone|tipo" data-id="${id}" data-ridisegna-pf1>${opz([['', '— scegli —'], ...TIPI_STIRPE[st.nome].map(([k, en]) => [k, `${k} (${en})`])], s.tipo)}</select></label>` : ''}
        <a class="btn-piccolo" href="${esc(FEDE.wiki)}Stregone/Stirpi" target="_blank" rel="noopener" title="Pagina delle stirpi sul wiki">📖 Wiki</a></div>`;
    if (!st) return `${scelta}<p class="muto pf-aiuto">La stirpe si sceglie al 1° livello e dà un'abilità di classe, incantesimi bonus, una lista di talenti bonus, la magia della stirpe e cinque poteri (1°, 3°, 9°, 15°, 20° livello).</p>`;
    const tipo = TIPI_STIRPE[st.nome]?.find(([k]) => k === s.tipo);
    const abil = /qualsiasi/i.test(st.abil)
      ? `<label>Abilità di classe <select data-pf1="stregone|abil" data-id="${id}" data-ridisegna-pf1>${opz([['', '— quale Conoscenze? —'], ...KT.map((k) => [k, k])], s.abil)}</select></label>`
      : `<span>Abilità di classe: <b>${esc(st.abil)}</b> <small class="muto">(aggiunta alle abilità di classe)</small></span>`;
    const incs = st.inc.map((x) => `<li class="${x.liv <= liv ? 'presa' : 'futura'}"><b>${x.liv}°</b> ${esc(x.nome)} <small class="muto">(incantesimo di ${livIncStirpe(x.liv)}°${x.nota ? `; ${esc(x.nota)}` : ''})</small></li>`).join('');
    // Talenti bonus: uno al 7°, 13° e 19° livello, dalla lista della stirpe
    const dovuti = [7, 13, 19].filter((l) => l <= liv).length;
    const presi = st.talenti.filter((t) => d.capacita.some((x) => norm(x.nome) === norm(t) || baseTalento(x.nome) === baseTalento(t) && !/\(/.test(t)));
    const talenti = st.talenti.map((t) => {
      const preso = presi.includes(t);
      return `<span class="stirpe-tal${preso ? ' preso' : ''}">${preso ? '✓ ' : ''}${esc(t)}${!preso && TALENTI.talento(t.replace(/\s*\(.*$/, '')) ? ` <button class="btn-mini" data-azione="pf1-prendi-talento" data-id="${id}" data-nome="${esc(t.replace(/\s*\(.*$/, ''))}" data-scelta="${esc(sceltaTalento(t))}" title="Prendi questo talento">+</button>` : ''}</span>`;
    }).join('');
    const poteri = st.poteri.map((pt) => {
      const ok = pt.liv <= liv;
      const usi = ok ? usiPotereStirpe(pt, liv, c) : 0;
      const k = `${st.nome}:${pt.nome}`;
      return `<div class="stirpe-potere${ok ? '' : ' futuro'}">
        <b>${esc(pt.nome)}</b> <small class="muto">(${esc(pt.tipo)}, ${pt.liv}° livello${ok ? '' : ' — non ancora'})</small>
        <button class="btn-mini" data-azione="pf1-info-stirpe" data-stirpe="${esc(st.nome)}" data-nome="${esc(pt.nome)}" title="Descrizione dal wiki">i</button>
        ${usi ? `<span class="pf-pallini">${pallini(usi, n(s.usati[k]), `data-azione="pf1-uso-stirpe" data-id="${id}" data-chiave="${esc(k)}"`)}</span> <small class="muto">${pt.usi === 'round=liv' ? 'round' : pt.usi === 'liv' ? 'al giorno (pari al livello)' : 'al giorno'}</small>` : ''}
      </div>`;
    }).join('');
    return `${scelta}
      <div class="pf-riga">${abil}${tipo ? `<span>Energia della stirpe: <b>${esc(tipo[1])}</b></span>` : st && TIPI_STIRPE[st.nome] ? '<span class="oltre">⚠ scegli il tipo</span>' : ''}</div>
      <h4>Incantesimi bonus <small class="muto">si aggiungono da soli agli incantesimi conosciuti, oltre il limite della classe</small></h4>
      <ul class="stirpe-inc">${incs}</ul>
      <h4>Talenti bonus <small class="${presi.length < dovuti ? 'oltre' : 'muto'}">${dovuti ? `${Math.min(presi.length, dovuti)} / ${dovuti}` : 'dal 7° livello'} · uno al 7°, 13° e 19° livello dalla lista</small></h4>
      <div class="stirpe-talenti">${talenti}</div>
      <h4>Magia della stirpe</h4>
      <p class="stirpe-arcano">${esc(st.arcano)}</p>
      <h4>Poteri della stirpe <small class="muto">livello da stregone ${liv}</small></h4>
      ${poteri}
      <p class="muto pf-aiuto">Fonte: Golarion Insider, «Stregone/Stirpi». I poteri si leggono con «i»; gli usi si azzerano con il riposo.</p>`;
  }

  // ---- Mago: scuola arcana, sottoscuola, scuole opposte, poteri ----
  const SCUOLE = TABELLE.scuole || {};
  function slotScuola(d, classeInc) {
    return nomeClasse(classeInc) === 'Mago' && !!SCUOLE[d.mago?.scuola] && d.mago.scuola !== 'Universale';
  }
  // Poteri effettivi: quelli della scuola, con le sostituzioni della sottoscuola scelta
  function poteriScuola(d) {
    const sc = SCUOLE[d.mago?.scuola];
    if (!sc) return [];
    const sub = sc.sottoscuole[d.mago.sotto];
    if (!sub) return sc.poteri;
    const out = [];
    for (const pt of sc.poteri) {
      const i = sub.sostituisce.indexOf(pt.nome);
      if (i < 0) out.push(pt);
      else if (sub.poteri[i]) out.push({ ...sub.poteri[i], sostituisce: pt.nome });
    }
    return out;
  }
  // Usi al giorno di un potere: 3 + INT volte, oppure round pari al livello da mago
  const usiPotere = (pt, c, livMago) => (pt.uso === '3+INT' ? Math.max(0, 3 + c.m.INT) : pt.uso === 'round' ? livMago : 0);

  function sezioneMago(p, d, c) {
    const id = p.id;
    const m = d.mago;
    const liv = livelloClasse(d, 'Mago');
    const sc = SCUOLE[m.scuola];
    const standard = Object.values(SCUOLE).filter((x) => !x.elementale && x.nome !== 'Universale').map((x) => x.nome);
    const elementali = Object.values(SCUOLE).filter((x) => x.elementale).map((x) => x.nome);
    const testa = `<div class="pf-riga">
        <label>Scuola <select data-pf1="mago|scuola" data-id="${id}" data-ridisegna-pf1>
          <option value="">— scegli —</option>
          <option value="Universale"${m.scuola === 'Universale' ? ' selected' : ''}>Universale (nessuna specializzazione)</option>
          <optgroup label="Scuole di specializzazione">${opz(standard.map((x) => [x, x]), m.scuola)}</optgroup>
          <optgroup label="Scuole elementali">${opz(elementali.map((x) => [x, x]), m.scuola)}</optgroup>
        </select></label>
        ${sc && Object.keys(sc.sottoscuole).length ? `<label>Scuola focalizzata <select data-pf1="mago|sotto" data-id="${id}" data-ridisegna-pf1><option value="">— nessuna —</option>${opz(Object.keys(sc.sottoscuole).map((x) => [x, x]), m.sotto)}</select></label>` : ''}
        ${sc ? `<button class="btn-piccolo" data-azione="pf1-info-scuola" data-id="${id}">📖 Testo dei poteri</button>` : ''}
      </div>`;
    if (!sc) return testa + '<p class="muto pf-aiuto">Scegli la scuola: gli specialisti hanno uno slot in più per ogni livello di incantesimo e due scuole opposte.</p>';

    // Scuole opposte
    let opposte = '';
    if (m.scuola === 'Universale') opposte = '<span class="muto">Nessuna: il mago universale prepara incantesimi di tutte le scuole senza restrizioni.</span>';
    else if (sc.elementale && sc.opposto) opposte = `<b>${esc(sc.opposto)}</b> <span class="muto">(elemento contrapposto, fisso)</span>`;
    else if (sc.elementale) {
      opposte = `<select data-pf1="mago|opposte|0" data-id="${id}" data-ridisegna-pf1><option value="">— scegli —</option>${opz(elementali.filter((x) => x !== m.scuola).map((x) => [x, x]), m.opposte[0])}</select>
        <span class="muto">il wiki non indica l'elemento contrapposto di ${esc(m.scuola)}: concordalo con il master</span>`;
    } else {
      opposte = [0, 1].map((i) => `<select data-pf1="mago|opposte|${i}" data-id="${id}" data-ridisegna-pf1><option value="">— scegli —</option>${opz(standard.filter((x) => x !== m.scuola && x !== m.opposte[1 - i]).map((x) => [x, x]), m.opposte[i])}</select>`).join(' ');
    }
    const poteri = poteriScuola(d).map((pt) => {
      const usi = usiPotere(pt, c, liv);
      const disponibile = pt.livello <= liv;
      return `<li class="${disponibile ? '' : 'non-ancora'}">
          <b>${esc(pt.nome)}</b> <small class="muto">(${esc(pt.tipo)})</small>
          ${pt.livello > 1 ? `<small>dal ${pt.livello}° livello</small>` : ''}
          ${pt.sostituisce ? `<small class="muto">— sostituisce ${esc(pt.sostituisce)}</small>` : ''}
          ${disponibile && usi ? `<span class="pf-pallini" title="${pt.uso === 'round' ? 'Round al giorno' : 'Usi al giorno'}">${pallini(usi, n(m.usati[pt.nome]), `data-azione="pf1-uso-scuola" data-id="${id}" data-nome="${esc(pt.nome)}"`)}</span>
            <small class="muto">${usi} ${pt.uso === 'round' ? 'round' : 'volte'} al giorno</small>` : ''}
        </li>`;
    }).join('');
    return `${testa}
      <div class="fede-righe">
        <div><span class="muto">Scuole opposte</span> ${opposte}</div>
        ${m.scuola !== 'Universale' ? '<div><span class="muto">Slot di scuola</span> +1 per livello di incantesimo («+1S» negli incantesimi)</div>' : ''}
      </div>
      ${m.scuola !== 'Universale' ? '<p class="muto pf-aiuto">Gli incantesimi di una scuola opposta occupano due slot: spunta «opp.» accanto a loro nella sezione Incantesimi.</p>' : ''}
      <h4>Poteri della scuola</h4>
      <ul class="fede-poteri">${poteri}</ul>`;
  }
  // Testo dei poteri dal wiki: il blocco della scuola (e della sottoscuola) nella pagina delle scuole arcane
  const estraiScuola = (scuola, sotto, elementale) => (doc) => {
    const c = doc.querySelector('#mw-content-text');
    if (!c) return '';
    const h3 = [...c.querySelectorAll('h3')].filter((h) => !h.closest('#toc, .toc'));
    const blocco = (titolo) => {
      const h = h3.find((x) => x.textContent.replace(/\[.*?\]/g, '').trim() === titolo);
      if (!h) return [];
      const righe = [];
      let el = h.nextElementSibling;
      // Si ferma al titolo successivo o alla riga di separazione; salta i riquadri laterali del wiki
      while (el && !/^(H2|H3|HR)$/.test(el.tagName) && !el.querySelector('h2, h3')) {
        const t = el.classList.contains('golarion-box') ? '' : el.textContent.replace(/\s+/g, ' ').trim();
        if (t) righe.push(t);
        el = el.nextElementSibling;
      }
      return righe;
    };
    const titoloScuola = elementale ? scuola : scuola === 'Universale' ? 'Scuola Universale' : h3.map((h) => h.textContent.trim()).find((t) => /^Scuola (?:di |dell['’]|della )?/.test(t) && t.endsWith(scuola)) || '';
    const righe = blocco(titoloScuola);
    if (sotto) righe.push(`— Scuola focalizzata: ${sotto} —`, ...blocco(sotto));
    return righe.join('\n\n');
  };

  // ---- Razza: tendina, modificatori, taglia, velocità, bonus e tratti ----
  const NOMI_CAR = { FOR: 'Forza', DES: 'Destrezza', COS: 'Costituzione', INT: 'Intelligenza', SAG: 'Saggezza', CAR: 'Carisma' };
  // Soffio di Ashardalon: Nube Sacra (9 m, 1d8 sacri ogni 2 livelli) e Soffio Elettrico (linea 36 m, 1d6 per livello);
  // Riflessi CD 10 + ½ livello + COS. Il livello è quello del personaggio (la razza non ha livelli propri)
  // I valori stanno anche in mappa(): così si aggiornano subito quando cambiano livello o Costituzione
  function valoriSoffio(c) {
    const L = c?.liv || 0;
    const nube = Math.floor(L / 2);
    return { 'soffio:nube': nube ? `${nube}d8` : '— (dal 2° livello)', 'soffio:elettrico': L ? `${L}d6` : '—', 'soffio:cd': `CD ${10 + Math.floor(L / 2) + (c ? c.m.COS : 0)}` };
  }
  function soffioAshardalon(d, c) {
    const v = valoriSoffio(c);
    const k = (chiave) => `<b data-calc="${chiave}">${esc(v[chiave])}</b>`;
    return `<div><span class="muto">Soffio di Ashardalon</span> Nube Sacra (emanazione 9 m) ${k('soffio:nube')} sacri
      · Soffio Elettrico (linea 36 m) ${k('soffio:elettrico')} elettricità · Riflessi ${k('soffio:cd')} <small class="muto">(10 + ½ livello + COS)</small></div>`;
  }
  function rigaArte(p, d) {
    const voluti = ['Canto', 'Oratoria', d.razza.strumento].filter(Boolean);
    const presenti = d.sottoAbil?.Intrattenere || [];
    const mancano = voluti.filter((t) => !presenti.some((x) => norm(x) === norm(t)));
    return `<div><span class="muto">Amante dell'Arte</span> +4 a Intrattenere (Canto), (Oratoria, per la poesia) e
      <select data-pf1="razza|strumento" data-id="${p.id}" data-ridisegna-pf1><option value="">— strumento a scelta —</option>${opz(STRUMENTI_ARTE.map((x) => [x, x]), d.razza.strumento || '')}</select>
      ${mancano.length ? `<button class="btn-mini" data-azione="pf1-arte-tipi" data-id="${p.id}" title="Aggiunge questi tipi nella sezione Abilità">+ aggiungi ${esc(mancano.join(', '))} alle abilità</button>` : '<small class="muto">(già nella sezione Abilità)</small>'}</div>`;
  }
  function sezioneRazza(p, d, c) {
    const id = p.id;
    const r = razzaDi(d);
    const gruppi = ['Razze Base', 'Razze Peculiari', 'Razze Insolite', 'Altre Razze', 'Razze del Master'];
    const tendina = `<label>Razza <select data-pf1="razza|nome" data-id="${id}" data-ridisegna-pf1>
        <option value="">— scegli —</option>
        ${gruppi.map((g) => `<optgroup label="${g}">${opz(Object.values(RAZZE).filter((x) => x.gruppo === g).map((x) => [x.nome, x.nome]), d.razza.nome)}</optgroup>`).join('')}
      </select></label>`;
    if (!r) return `<div class="pf-riga">${tendina}</div><p class="muto pf-aiuto">Scegli la razza: modificatori alle caratteristiche, taglia, velocità e bonus razziali si applicano da soli.</p>`;
    const mods = Object.entries(r.car).map(([s, v]) => `${NOMI_CAR[s]} ${segno(v)}`).join(', ');
    const scelta = r.scelta ? `<label>+${r.scelta} a <select data-pf1="razza|scelta" data-id="${id}" data-ridisegna-pf1><option value="">— scegli —</option>${opz(CARS.map((s) => [s, NOMI_CAR[s]]), d.razza.scelta)}</select></label>` : '';
    const nomeBonus = (b) => `${b.bersaglio === 'ts' ? 'tutti i tiri salvezza' : b.bersaglio === 'ca' ? 'CA' : b.bersaglio.replace(/^abil:/, '')} ${segno(b.valore)}${b.tipo && b.tipo !== 'razziale' ? ` ${b.tipo}` : ''}`;
    const bonus = effettiRazza(d).map((b) => `${nomeBonus(b)} <small class="muto">(${esc(b.tratto)})</small>`).join(' · ');
    const via = sostituitiDa(d);
    const scelti = alternativiScelti(d);
    const tratti = r.tratti.map((t) => (via.has(chiaveTratto(t)) ? `<s class="muto" title="Sostituito da un tratto alternativo">${esc(t)}</s>` : esc(t)));
    tratti.push(...scelti.map((a) => `<b>${esc(a.nome)}</b>`));
    // Un tratto standard si può sostituire una sola volta: gli alternativi che ne toccano uno già sostituito restano bloccati
    const alternativi = r.alternativi.map((a) => {
      const preso = scelti.includes(a);
      const altriVia = new Set(scelti.filter((x) => x !== a).flatMap((x) => x.sostituiti.map(chiaveTratto)));
      const conflitto = !preso && a.sostituiti.some((s) => altriVia.has(chiaveTratto(s)));
      const dettagli = [
        a.sostituiti.length ? `sostituisce ${a.sostituiti.join(', ')}` : 'tratti sostituiti: vedi descrizione',
        ...a.bonus.map(nomeBonus),
        a.velocita ? `velocità ${metri(a.velocita)}` : '',
      ].filter(Boolean).join(' · ');
      return `<div class="riv${preso ? ' presa' : ''}${conflitto ? ' non-ancora' : ''}">
        <label title="${conflitto ? 'Sostituisce un tratto già sostituito da un altro alternativo scelto' : ''}"><input type="checkbox" ${preso ? 'checked' : ''} ${conflitto ? 'disabled' : ''} data-azione="pf1-alternativo" data-id="${id}" data-nome="${esc(a.nome)}">
        ${esc(a.nome)}</label> <button class="btn-mini" data-azione="pf1-info-alternativo" data-razza="${esc(r.nome)}" data-nome="${esc(a.nome)}" title="Descrizione dal wiki">i</button>
        <small class="muto">${esc(dettagli)}</small></div>`;
    }).join('');
    const sezAlt = r.alternativi.length ? `<details class="pf-alternativi"${scelti.length ? ' open' : ''}>
        <summary>Tratti razziali alternativi <small class="muto">(${scelti.length} scelti su ${r.alternativi.length})</small></summary>
        <div class="riv-griglia">${alternativi}</div>
      </details>` : '';
    return `<div class="pf-riga">${tendina} ${scelta}
        <button class="btn-piccolo" data-azione="pf1-info-razza" data-nome="${esc(r.nome)}">📖 Tratti razziali</button></div>
      <div class="fede-righe">
        <div><span class="muto">Caratteristiche</span> ${esc(mods || (r.scelta ? `+${r.scelta} a scelta` : 'nessun modificatore'))}</div>
        <div><span class="muto">Taglia</span> ${esc(r.taglia)} · <span class="muto">Velocità</span> ${metri(velocitaRazza(d))}</div>
        ${bonus ? `<div><span class="muto">Bonus sempre attivi</span> ${bonus}</div>` : ''}
        ${r.resistenze ? `<div><span class="muto">Resistenze</span> ${r.resistenze.map(([t, v, tr]) => `${esc((ENERGIE.find((e) => e[0] === t) || [t, t])[1])} ${v} <small class="muto">(${esc(tr)}, già nelle difese)</small>`).join(' · ')}</div>` : ''}
        ${r.volo ? `<div><span class="muto">Volare</span> ${esc(r.volo)}</div>` : ''}
        ${r.tipo ? `<div><span class="muto">Tipo</span> ${esc(r.tipo)}</div>` : ''}
        ${r.arte ? rigaArte(p, d) : ''}
        ${r.soffio === 'ashardalon' ? soffioAshardalon(d, c) : ''}
        <div><span class="muto">Tratti</span> ${tratti.join(', ')}</div>
      </div>
      ${sezAlt}
      <label class="pf-chk pf-mini" title="Spunta se i punteggi inseriti nelle Caratteristiche includono già i modificatori razziali">
        ${`<input type="checkbox" data-pf1="razza|inclusi" data-id="${id}" ${d.razza.inclusi ? 'checked' : ''} data-ridisegna-pf1>`} I punteggi inseriti comprendono già i modificatori razziali</label>
      <p class="muto pf-aiuto">Taglia e velocità vengono impostate quando scegli la razza (poi puoi cambiarle). I bonus razziali solo in certe situazioni (es. contro i giganti) sono descritti nei tratti ma non entrano nei calcoli.</p>`;
  }
  // Testo dei tratti dal wiki: le righe della tabella "Tratti Razziali"
  const estraiRazza = (doc) => {
    const h = [...(doc.querySelectorAll('#mw-content-text h2') || [])].find((x) => /Tratti Razziali/i.test(x.textContent));
    const box = h?.nextElementSibling;
    if (!box) return '';
    return [...box.querySelectorAll('p, li, dd, td')].map((el) => el.textContent.replace(/\s+/g, ' ').trim())
      .filter((t, i, a) => t.length > 20 && a.indexOf(t) === i).join('\n\n');
  };

  // ---- Tabella di progressione di ogni classe (dati in src/pf1-progressione.js), livello attuale evidenziato ----
  // ---- Archetipi scelti per ogni classe: poteri, privilegi sostituiti, compatibilità ----
  function sezioneArchetipi(p, d) {
    const id = p.id;
    const blocchi = d.classi.map((cl) => {
      const k = nomeClasse(cl.nome);
      const tutti = archetipiClasse(cl);
      if (!k || !tutti.length) return '';
      const liv = n(cl.livello);
      const scelti = sceltiClasse(cl);
      const poteri = scelti.map((a) => `<div class="arc-scelto"><b>${esc(a[0])}</b>
          <button class="btn-mini" data-azione="pf1-info-archetipo" data-classe="${esc(k)}" data-nome="${esc(a[0])}" title="Descrizione dal wiki">i</button>
          <table class="arc-poteri"><tbody>${a[1].map(([nome, L, sost, tipo]) => `<tr class="${L > liv ? 'non-ancora' : ''}">
            <td class="muto">${L ? L + '°' : '—'}</td><td>${esc(nome)}</td>
            <td class="muto">${sost ? `${tipo === 'm' ? 'modifica' : 'sostituisce'} <span class="arc-sost">${esc(sost)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`).join('');
      const elenco = tutti.map((a) => {
        const preso = scelti.includes(a);
        const contro = preso ? null : scelti.map((s) => [s[0], conflittoArchetipi(a, s)]).find((x) => x[1]);
        const tocca = [...new Set(a[1].filter((x) => x[2]).map((x) => x[2]))].join('; ');
        return `<div class="riv${preso ? ' presa' : ''}${contro ? ' non-ancora' : ''}">
          <label title="${contro ? esc(`Non combinabile con ${contro[0]}: entrambi cambiano ${contro[1]}`) : ''}"><input type="checkbox" ${preso ? 'checked' : ''} ${contro ? 'disabled' : ''} data-azione="pf1-archetipo" data-id="${id}" data-classe="${cl.id}" data-nome="${esc(a[0])}"> ${esc(a[0])}</label>
          <button class="btn-mini" data-azione="pf1-info-archetipo" data-classe="${esc(k)}" data-nome="${esc(a[0])}" title="Descrizione dal wiki">i</button>
          <small class="muto">${esc(tocca ? `cambia ${tocca}` : 'privilegi cambiati: vedi descrizione')}</small></div>`;
      }).join('');
      return `<h4>${esc(k)} <small class="muto">livello ${liv}</small></h4>
        ${poteri || '<p class="muto">Nessun archetipo scelto.</p>'}
        <details class="pf-alternativi"${scelti.length ? '' : ' open'}><summary>Scegli archetipi <small class="muto">(${tutti.length} sul wiki)</small></summary>
          <div class="riv-griglia">${elenco}</div></details>`;
    }).join('');
    return blocchi ? `${blocchi}<p class="muto pf-aiuto">Più archetipi si possono combinare solo se non cambiano gli stessi privilegi di classe: quelli in conflitto con gli scelti restano bloccati. I privilegi sostituiti sono barrati nella tabella di progressione.</p>` : '';
  }

  function sezioneProgressione(d) {
    const P = window.PF1_PROGRESSIONE || {};
    return d.classi.map((cl) => {
      const k = nomeClasse(cl.nome);
      const t = P[k];
      if (!t) return '';
      const liv = n(cl.livello);
      const g = TABELLE.classi[k]?.g;
      // Archetipi: privilegi sostituiti barrati, poteri dell'archetipo in una colonna in più
      const scelti = sceltiClasse(cl);
      const via = scelti.flatMap((a) => a[1].filter((x) => x[2] && x[3] === 's').flatMap((x) => vociPrivilegi(x[2])));
      const cella = (v) => String(v).split(/,\s*/).map((f) => {
        const voce = vociPrivilegi(f)[0];
        return voce && via.some((x) => sovrapposte(voce, x)) ? `<s class="muto" title="Sostituito dall'archetipo">${esc(f)}</s>` : esc(f);
      }).join(', ');
      const testa = `<tr><th>Liv</th><th>BAB</th><th>Tem</th><th>Rif</th><th>Vol</th>${t.colonne.map((c) => `<th>${esc(c)}</th>`).join('')}${g ? `<th>Incantesimi al giorno (${g[0].map((L) => L + '°').join(' / ')})</th>` : ''}${scelti.length ? '<th>Archetipo</th>' : ''}</tr>`;
      const righe = t.righe.map((r, i) => `<tr class="${i + 1 === liv ? 'prog-attuale' : i + 1 > liv ? 'prog-futuro' : ''}">
          <td><b>${i + 1}°</b></td>${r.map((v, j) => `<td>${j >= 4 && via.length ? cella(v) : esc(v)}</td>`).join('')}${g ? `<td>${esc(g[1][i].replace(/\//g, ' / '))}</td>` : ''}${scelti.length ? `<td>${esc(scelti.flatMap((a) => a[1].filter((x) => x[1] === i + 1).map((x) => x[0])).join(', '))}</td>` : ''}</tr>`).join('');
      return `<h4>${esc(k)} <small class="muto">livello ${liv}</small></h4><div class="prog-scorri"><table class="prog-tabella"><thead>${testa}</thead><tbody>${righe}</tbody></table></div>`;
    }).join('') + '<p class="muto pf-aiuto">Tabelle da Golarion Insider (golarion.altervista.org).</p>';
  }

  // ---- Avanzamento di livello guidato ----
  // Stato in memoria del pannello: personaggio, classe scelta (id di una classe esistente o nome di una nuova), scelte
  let salita = null;
  const CAR_LIVELLI = [4, 8, 12, 16, 20];
  // Cosa porta il prossimo livello nella classe scelta: valori, privilegi, incantesimi, scelte da fare
  // ---- Registro dell'avanzamento: un punto di partenza e una voce per ogni livello preso con la procedura guidata ----
  // Istantanea di gradi e talenti: quello che cambia tra due livelli è stato scelto in quel livello
  const istantanea = (d) => ({
    gradi: Object.fromEntries(Object.entries(d.abil || {}).filter(([, v]) => n(v?.gradi) > 0).map(([k, v]) => [k, n(v.gradi)])),
    talenti: d.capacita.filter((x) => /talent/i.test(x.tipo || '') || TALENTI.talento(x.nome)).map((x) => x.nome),
  });
  // Apre l'avanzamento guidato; la prima volta registra lo stato attuale come punto di partenza
  function apriSalita(p, classe) {
    const d = dati(p);
    const c = calcola(p, ctx.regDi(p));
    if (!d.avanzamento.length) {
      d.avanzamento.push({
        id: uid(), tipo: 'partenza', livTot: c.liv, quando: Date.now(),
        classi: d.classi.map((x) => `${x.nome || 'Classe'} ${n(x.livello)}`).join(', '),
        car: Object.fromEntries(CARS.map((s) => [s, c.punteggio[s]])), pfMax: c.pfMax,
        aumentiInclusi: CAR_LIVELLI.filter((l) => l <= c.liv).length, // i punteggi scritti finora comprendono già questi aumenti
        stato: istantanea(d),
      });
      ctx.salva();
    }
    salita = { pgId: p.id, classe, preferita: '', car: '', istantanea: istantanea(d) };
  }
  // Righe del riepilogo: livello per livello, con gradi e talenti dedotti dalle istantanee
  function righeAvanzamento(d) {
    const reg = d.avanzamento;
    const attuale = istantanea(d);
    return reg.map((r, i) => {
      if (r.tipo === 'partenza' || r.tipo === 'aumento') return r;
      const prima = r.prima || { gradi: {}, talenti: [] };
      const dopo = reg.slice(i + 1).find((x) => x.tipo === 'livello')?.prima || attuale;
      const gradi = Object.entries(dopo.gradi).map(([k, v]) => [k, v - n(prima.gradi[k])]).filter(([, v]) => v > 0);
      const talenti = dopo.talenti.filter((t) => !prima.talenti.includes(t));
      return { ...r, gradiPresi: gradi, talentiPresi: talenti, gradiTot: gradi.reduce((a, [, v]) => a + v, 0) };
    });
  }
  // Aumenti di caratteristica attesi (4°, 8°, 12°…) e quelli registrati
  function controlloAumenti(d, c) {
    const reg = d.avanzamento;
    const partenza = reg.find((r) => r.tipo === 'partenza');
    const attesi = CAR_LIVELLI.filter((l) => l <= c.liv);
    const fatti = new Map();
    for (const l of attesi) if (partenza && l <= partenza.livTot) fatti.set(l, 'compreso nei punteggi iniziali');
    for (const r of reg) if ((r.tipo === 'livello' || r.tipo === 'aumento') && r.car && CAR_LIVELLI.includes(r.livTot)) fatti.set(r.livTot, r.car);
    return { attesi, fatti, mancanti: attesi.filter((l) => !fatti.has(l)) };
  }

  function sezioneAvanzamento(p, d, c) {
    const id = p.id;
    const reg = d.avanzamento;
    const aum = controlloAumenti(d, c);
    const aumenti = aum.attesi.length ? `<div class="av-aumenti">${CAR_LIVELLI.map((l) => {
      const f = aum.fatti.get(l);
      const raggiunto = l <= c.liv;
      return `<span class="av-aumento ${!raggiunto ? 'futuro' : f ? 'fatto' : 'manca'}" title="${raggiunto ? (f ? `+1 ${esc(NOMI_CAR[f] || f)}` : 'Aumento non registrato') : 'Livello non ancora raggiunto'}"><b>${l}°</b> ${raggiunto ? (f ? (NOMI_CAR[f] ? `+1 ${f}` : '✓ incluso') : '⚠ manca') : '—'}</span>`;
    }).join('')}</div>` : '<p class="muto pf-aiuto">Il primo aumento di caratteristica arriva al 4° livello.</p>';
    const mancanti = aum.mancanti.map((l) => `<div class="pf-riga av-manca">⚠ Al <b>${l}° livello</b> manca il +1 a una caratteristica
        <select id="av-car-${l}-${id}">${opz([['', '— scegli —'], ...CARS.map((x) => [x, NOMI_CAR[x]])], '')}</select>
        <button class="btn-piccolo" data-azione="pf1-aumento-mancante" data-id="${id}" data-liv="${l}">Applica +1</button></div>`).join('');
    // Livelli presi senza la procedura guidata (es. con i pulsanti +/− della classe)
    const registrati = new Set(reg.filter((r) => r.tipo === 'livello').map((r) => r.livTot));
    const partenza = reg.find((r) => r.tipo === 'partenza');
    const nonRegistrati = partenza ? Array.from({ length: Math.max(0, c.liv - partenza.livTot) }, (_, i) => partenza.livTot + i + 1).filter((l) => !registrati.has(l)) : [];
    const righe = righeAvanzamento(d).map((r) => {
      if (r.tipo === 'partenza') {
        return `<tr class="av-partenza"><td><b>1–${r.livTot}</b></td><td colspan="2">Punto di partenza: ${esc(r.classi || '—')}</td>
          <td>${CARS.map((s) => `${s} ${r.car?.[s] ?? '—'}`).join(' · ')}</td><td colspan="3" class="muto">PF ${r.pfMax} · ${(r.stato?.talenti || []).length} talenti · ${Object.values(r.stato?.gradi || {}).reduce((a, v) => a + v, 0)} gradi già assegnati</td></tr>`;
      }
      if (r.tipo === 'aumento') return `<tr><td><b>${r.livTot}°</b></td><td colspan="2" class="muto">aumento aggiunto dopo</td><td><b>+1 ${esc(r.car)}</b></td><td colspan="3"></td></tr>`;
      const talOk = r.talentiPresi.length >= r.talentiPrevisti;
      const gradiOk = r.gradiTot >= r.gradiDisponibili;
      return `<tr>
        <td><b>${r.livTot}°</b></td>
        <td>${esc(r.classe)} ${r.livClasse}°${r.preferita ? ` <small class="muto">(classe preferita: ${r.preferita === 'pf' ? '+1 PF' : r.preferita === 'gradi' ? '+1 grado' : esc(opzioniPreferite(d, r.classe)[Number((String(r.preferita).match(/\d+/) || [0])[0])]?.t || 'bonus razziale')})</small>` : ''}</td>
        <td><b>+${r.pf}</b> <small class="muto">d${r.dv} ${r.metodoPf === 'massimo' ? 'massimo' : 'media'}, COS ${segno(r.cos)}</small></td>
        <td>${r.car ? `<b>+1 ${esc(r.car)}</b>` : '<span class="muto">—</span>'}</td>
        <td class="${talOk ? '' : 'oltre'}">${r.talentiPresi.length ? esc(r.talentiPresi.join(', ')) : '<span class="muto">nessuno</span>'}${r.talentiPrevisti ? ` <small>(${r.talentiPresi.length}/${r.talentiPrevisti})</small>` : ''}</td>
        <td class="${gradiOk ? '' : 'oltre'}">${r.gradiPresi.length ? esc(r.gradiPresi.map(([k2, v]) => `${k2} +${v}`).join(', ')) : '<span class="muto">nessuno</span>'} <small>(${r.gradiTot}/${r.gradiDisponibili})</small></td>
        <td class="muto av-priv">${esc((r.privilegi || []).join(', '))}${(r.incantesimi || []).length ? `${(r.privilegi || []).length ? ' · ' : ''}✨ ${esc(r.incantesimi.join('; '))}` : ''}</td>
      </tr>`;
    }).join('');
    const pfRegistrati = reg.filter((r) => r.tipo === 'livello').reduce((a, r) => a + n(r.pf), 0);
    return `<p class="muto pf-aiuto">Tutto quello che il personaggio ha scelto salendo di livello con «⬆ Sali di livello»: classe, punti ferita, aumenti di caratteristica, talenti e gradi di abilità presi in ogni livello.</p>
      <h4>Aumenti di caratteristica <small class="muto">+1 a una caratteristica al 4°, 8°, 12°, 16° e 20° livello</small></h4>
      ${aumenti}${mancanti}
      ${nonRegistrati.length ? `<p class="oltre pf-aiuto">⚠ Livell${nonRegistrati.length > 1 ? 'i' : 'o'} ${nonRegistrati.map((l) => l + '°').join(', ')} aggiunt${nonRegistrati.length > 1 ? 'i' : 'o'} senza la procedura guidata: punti ferita e scelte non sono nel registro.</p>` : ''}
      ${reg.length ? `<div class="av-tab-box"><table class="av-tab">
        <thead><tr><th>Liv.</th><th>Classe</th><th>PF</th><th>Caratteristica</th><th>Talenti</th><th>Gradi di abilità</th><th>Privilegi e incantesimi</th></tr></thead>
        <tbody>${righe}</tbody></table></div>
        <p class="muto pf-aiuto">PF guadagnati con i livelli registrati: <b>+${pfRegistrati}</b> · PF massimi attuali <b>${c.pfMax}</b>. Talenti e gradi in rosso: ne mancano rispetto a quelli del livello.</p>`
        : `<p class="muto">Il registro parte la prima volta che usi «⬆ Sali di livello»: lo stato attuale diventa il punto di partenza.</p>
          <div class="pf-piede"><button class="btn-piccolo" data-azione="pf1-av-partenza" data-id="${id}">📌 Registra ora il punto di partenza</button></div>`}`;
  }

  function anteprimaSalita(p, d, c) {
    const s = salita;
    const esistente = d.classi.find((x) => x.id === s.classe);
    const k = esistente ? nomeClasse(esistente.nome) : nomeClasse(s.classe);
    const info = k ? CLASSI[k] : null;
    const prima = esistente ? n(esistente.livello) : 0;
    const dopo = prima + 1;
    const livTot = c.liv + 1;
    const prog = k ? progressione(k) : null;
    const delta = (tipo, buono) => (prog ? baseTs(buono, dopo, prog.prestigio) - baseTs(buono, prima, prog.prestigio) : 0);
    const babPiu = prog ? baseBab(prog.bab, dopo) - baseBab(prog.bab, prima) : 0;
    // Privilegi del nuovo livello dalla tabella di progressione, con archetipi
    const t = (window.PF1_PROGRESSIONE || {})[k];
    const scelti = esistente ? sceltiClasse(esistente) : [];
    const via = scelti.flatMap((a) => a[1].filter((x) => x[2] && x[3] === 's').flatMap((x) => vociPrivilegi(x[2])));
    const privilegi = t ? pezziPrivilegi(t.righe[dopo - 1]?.[4 + colonnaPrivilegi(t)]).map((f) => {
      const voce = vociPrivilegi(f)[0];
      return { nome: f, sostituito: !!voce && via.some((x) => sovrapposte(voce, x)) };
    }) : [];
    for (const a of scelti) for (const [nome, L] of a[1]) if (L === dopo) privilegi.push({ nome: `${nome} (${a[0]})`, sostituito: false });
    // Incantesimi: livelli di incantesimo nuovi e conosciuti in più
    const incantesimi = [];
    if (k && TABELLE.classi[k]) {
      for (let L = 0; L <= 9; L++) {
        const a = TABELLE.alGiorno(k, prima, L), b = TABELLE.alGiorno(k, dopo, L);
        if (b !== '' && a === '') incantesimi.push(`nuovo livello di incantesimi: ${L}°`);
        else if (b !== '' && n(b) > n(a)) incantesimi.push(`${L}°: ${a} → ${b} al giorno`);
        const ca = TABELLE.conosciuti(k, prima, L), cb = TABELLE.conosciuti(k, dopo, L);
        if (cb !== '' && n(cb) > n(ca)) incantesimi.push(`${L}°: ${n(cb) - n(ca)} incantesim${n(cb) - n(ca) > 1 ? 'i' : 'o'} conosciut${n(cb) - n(ca) > 1 ? 'i' : 'o'} in più`);
      }
      if (k === 'Mago') incantesimi.push(dopo === 1 ? 'libro degli incantesimi: tutti i trucchetti e 3 + mod. INT incantesimi di 1° livello' : '2 incantesimi gratuiti da aggiungere al libro');
    }
    // Classi che contano come livelli effettivi di un'altra (Maestro del Sapere Mod → Mago): anche i privilegi
    // e gli incantesimi del prossimo livello effettivo di quella classe
    for (const come of CONTA_COME[k] || []) {
      const pc = livelloClasse(d, come), pd = pc + 1;
      const tc = (window.PF1_PROGRESSIONE || {})[come];
      if (tc) for (const f of pezziPrivilegi(tc.righe[pd - 1]?.[4 + colonnaPrivilegi(tc)])) privilegi.push({ nome: `${f} (come ${come} ${pd}°)`, sostituito: false });
      if (TABELLE.classi[come]) {
        for (let L = 0; L <= 9; L++) {
          const a = TABELLE.alGiorno(come, pc, L), b = TABELLE.alGiorno(come, pd, L);
          if (b !== '' && a === '') incantesimi.push(`${come}: nuovo livello di incantesimi ${L}°`);
          else if (b !== '' && n(b) > n(a)) incantesimi.push(`${come} ${L}°: ${a} → ${b} al giorno`);
        }
        if (come === 'Mago') incantesimi.push(`Mago ${pd}° effettivo: 2 incantesimi gratuiti da aggiungere al libro`);
      }
    }
    // Scelte
    const dv = prog ? prog.dv : n(esistente?.dv) || 8;
    const pf = (d.pfCalc.metodo === 'massimo' ? dv : Math.floor(dv / 2) + 1) + c.m.COS + (s.preferita === 'pf' ? 1 : 0);
    const esperti = espertoUmano(d);
    const gradi = Math.max(1, n(prog ? prog.gradi : esistente?.gradi) + c.m.INT) + (s.preferita === 'gradi' ? 1 : 0) + (esperti ? 1 : 0);
    const talento = livTot % 2 === 1;
    const talentiBonus = privilegi.filter((x) => /Talento Bonus/i.test(x.nome) && !x.sostituito).length;
    const caratteristica = CAR_LIVELLI.includes(livTot);
    return { k, info, esistente, prima, dopo, livTot, babPiu, ts: prog ? { tempra: delta('tempra', prog.tempra), riflessi: delta('riflessi', prog.riflessi), volonta: delta('volonta', prog.volonta) } : null,
      privilegi, incantesimi, pf, gradi, talento, talentiBonus, caratteristica, esperti };
  }
  // Scheda del giocatore (kit): si sale un livello alla volta, e solo dopo aver completato quello attuale.
  // Restituisce l'elenco di quello che manca (vuoto = si può salire).
  const GIOCATORE = !!window.MODALITA_GIOCATORE && !window.gdr;
  function mancaPerSalire(p, d, c) {
    const manca = [];
    if (!razzaDi(d)) manca.push('scegli la razza');
    if (!d.classi.length) { manca.push('scegli la classe di 1° livello (sezione Classi e livelli)'); return manca; }
    const livelli = righeAvanzamento(d).filter((r) => r.tipo === 'livello');
    // Talenti: al 1° livello 1 (+1 umani, + talenti bonus di classe del 1°); poi quelli previsti dall'ultimo livello preso
    let talentiOk = true, talentiTesto = '';
    if (!livelli.length) {
      let attesi = 1;
      if (TALENTI_RAZZA[razzaDi(d)?.nome] && !sostituitiDa(d).has(chiaveTratto('Talento Bonus'))) attesi += TALENTI_RAZZA[razzaDi(d).nome];
      const k = nomeClasse(d.classi[0].nome);
      const t = k && (window.PF1_PROGRESSIONE || {})[k];
      if (t) attesi += pezziPrivilegi(t.righe[0]?.[4 + colonnaPrivilegi(t)]).filter((f) => /Talento Bonus/i.test(f)).length;
      const presi = istantanea(d).talenti.length;
      if (presi < attesi) { talentiOk = false; talentiTesto = `scegli i talenti del 1° livello (${presi}/${attesi})`; }
    } else {
      const ultimo = livelli[livelli.length - 1];
      if (ultimo.talentiPresi.length < ultimo.talentiPrevisti) { talentiOk = false; talentiTesto = `scegli i talenti del ${ultimo.livTot}° livello (${ultimo.talentiPresi.length}/${ultimo.talentiPrevisti})`; }
    }
    if (c.gradiSpesi < c.gradiDisp) manca.push(`assegna i gradi di abilità (${c.gradiSpesi}/${c.gradiDisp})`);
    if (c.gradiSpesi > c.gradiDisp) manca.push(`hai assegnato più gradi del possibile (${c.gradiSpesi}/${c.gradiDisp})`);
    if (!talentiOk) manca.push(talentiTesto);
    const aum = controlloAumenti(d, c).mancanti;
    if (aum.length) manca.push(`manca l'aumento di caratteristica del ${aum.join('°, ')}° livello`);
    return manca;
  }
  function sezioneSalita(p, d, c) {
    const s = salita;
    const a = anteprimaSalita(p, d, c);
    const id = p.id;
    const opzClassi = [...d.classi.map((x) => [x.id, `${x.nome || 'Classe'} ${x.livello} → ${n(x.livello) + 1}`]), ...Object.keys(CLASSI).filter((x) => !d.classi.some((y) => nomeClasse(y.nome) === x)).map((x) => [x, `${x} (nuova ${CLASSI[x].prestigio ? 'classe di prestigio' : 'classe'}, 1°)`])];
    const voce = (ok, testo) => `<li class="${ok ? '' : 'muto'}">${testo}</li>`;
    const multiclasse = !a.esistente && d.classi.length ? '<p class="muto pf-aiuto">Multiclasse: controlla i requisiti (es. classi di prestigio) e l\'allineamento.</p>' : '';
    return `<div class="pannello salita">
      <div class="pf-riga"><h3>⬆ Sali al livello ${a.livTot}</h3>
        <label>Classe ${`<select data-salita="classe">${opz(opzClassi, s.classe)}</select>`}</label>
        <button class="btn-x" data-azione="pf1-livello-chiudi" title="Annulla">×</button></div>
      ${a.livTot > 20 ? '<p class="oltre">Il personaggio è già al 20° livello.</p>' : `
      ${multiclasse}
      <div class="salita-griglia">
        <div><h4>Cosa ottieni</h4><ul>
          ${voce(true, `<b>${esc(a.k || s.classe)} ${a.dopo}°</b> · livello del personaggio ${a.livTot}`)}
          ${voce(a.babPiu, `BAB ${a.babPiu ? '+' + a.babPiu : 'invariato'}`)}
          ${a.ts ? voce(true, `TS: Tem ${segno(a.ts.tempra)}, Rif ${segno(a.ts.riflessi)}, Vol ${segno(a.ts.volonta)}`) : ''}
          ${voce(true, `PF <b>+${a.pf}</b> <small class="muto">(${d.pfCalc.metodo === 'massimo' ? 'massimo del dado' : 'media'} + COS${s.preferita === 'pf' ? ' + 1 classe preferita' : ''})</small>`)}
          ${a.privilegi.length ? voce(true, `Privilegi: ${a.privilegi.map((x) => (x.sostituito ? `<s class="muto">${esc(x.nome)}</s>` : `<b>${esc(x.nome)}</b>`)).join(', ')}`) : voce(false, 'Nessun privilegio nuovo in tabella')}
          ${a.incantesimi.map((x) => voce(true, `✨ ${esc(x)}`)).join('')}
        </ul></div>
        <div><h4>Scelte da fare</h4><ul>
          <li>Bonus di classe preferita: ${`<select data-salita="preferita">${opz([['', 'nessuno (non è la classe preferita)'], ['pf', '+1 punto ferita'], ['gradi', '+1 grado di abilità'], ...(a.k ? opzioniPreferite(d, a.k).map((x, i) => [`alt:${i}`, `${nomeRazza(d)}: ${x.t.length > 90 ? x.t.slice(0, 88) + '…' : x.t}`]) : [])], s.preferita)}</select>`}</li>
          <li><b>${a.gradi}</b> gradi di abilità da assegnare <small class="muto">(${esc(a.k || 'classe')} + INT${s.preferita === 'gradi' ? ' + classe preferita' : ''}${a.esperti ? ' + Esperti umani' : ''}; massimo ${a.livTot} per abilità)</small></li>
          ${a.talento ? `<li><b>1 talento</b> (livello dispari): ${sceltaTalentoHtml(p, `salita-talento-${id}`)}</li>` : ''}
          ${a.talentiBonus ? `<li><b>${a.talentiBonus} talento bonus</b> di classe${/Guerriero/i.test(a.k || '') ? ' (di combattimento)' : ''}: ${sceltaTalentoHtml(p, `salita-bonus-${id}`, /Guerriero/i.test(a.k || '') ? 'Combattimento' : '')}</li>` : ''}
          ${a.caratteristica ? `<li><b>+1 a una caratteristica</b> (livello ${a.livTot}): ${`<select data-salita="car">${opz([['', '— scegli —'], ...CARS.map((x) => [x, NOMI_CAR[x]])], s.car)}</select>`}</li>` : ''}
          ${a.privilegi.some((x) => /Dote|Potere d'Ira|Rivelazione|Scoperta|Arcano del Magus|Fattura|Inquisizione|Ardimento|Trucco/i.test(x.nome) && !x.sostituito) ? '<li>Scegli il nuovo potere di classe (doti, poteri d\'ira, rivelazioni, scoperte…) e scrivilo in Talenti e capacità</li>' : ''}
        </ul></div>
      </div>
      <div class="pf-piede"><button class="primario" data-azione="pf1-livello-conferma" data-id="${id}" ${a.caratteristica && !s.car ? 'disabled title="Scegli prima la caratteristica da aumentare"' : ''}>Conferma il livello ${a.livTot}</button>
        <span class="muto">Applica livello, PF e caratteristica; poi assegna gradi e talenti nelle loro sezioni.</span></div>`}
    </div>`;
  }

  // ---- Oracolo: mistero, rivelazioni, maledizione ----
  const LIVELLI_RIVELAZIONE = [1, 3, 7, 11, 15, 19];
  function sezioneOracolo(p, d) {
    const id = p.id;
    const liv = livelloClasse(d, 'Oracolo');
    const o = d.oracolo;
    const mis = FEDE.misteri[o.mistero];
    const testa = `<div class="pf-riga">
        <label>Mistero <select data-pf1="oracolo|mistero" data-id="${id}" data-ridisegna-pf1><option value="">— scegli —</option>${opz(Object.keys(FEDE.misteri).sort((a, b) => a.localeCompare(b, 'it')).map((x) => [x, x]), o.mistero)}</select></label>
        ${mis ? `<button class="btn-piccolo" data-azione="pf1-info-mistero" data-id="${id}">📖 Mistero e rivelazioni</button>` : ''}
        <label>Maledizione <select data-pf1="oracolo|maledizione" data-id="${id}" data-ridisegna-pf1><option value="">— scegli —</option>${opz(FEDE.maledizioni.map((x) => [x, x]), o.maledizione)}</select></label>
        ${o.maledizione ? `<button class="btn-piccolo" data-azione="pf1-info-maledizione" data-nome="${esc(o.maledizione)}">📖 Effetti</button>` : ''}
      </div>`;
    if (!mis) return testa + '<p class="muto pf-aiuto">Scegli il mistero: aggiunge abilità di classe, incantesimi bonus e l\'elenco delle rivelazioni.</p>';
    const disponibili = LIVELLI_RIVELAZIONE.filter((x) => x <= liv).length + n(o.extra);
    const scelte = o.rivelazioni || [];
    const caster = d.incantatori.find((x) => nomeClasse(x.classe) === 'Oracolo');
    const incantesimi = mis.incantesimi.map((s) => {
      const L = s.livello / 2;
      const ok = s.livello <= liv;
      return `<div class="fede-inc${ok ? '' : ' non-ancora'}"><b>${L}°</b> <span>${esc(s.nome || '(vedi wiki)')}</span> <small class="muto">dal ${s.livello}°</small>
        ${ok && caster && s.nome ? `<button class="btn-mini" data-azione="pf1-prepara-dominio" data-id="${id}" data-classe="Oracolo" data-livello="${L}" data-nome="${esc(s.nome)}" title="Aggiungi agli incantesimi conosciuti">+</button>` : ''}</div>`;
    }).join('');
    const rivelazioni = mis.rivelazioni.map((r) => {
      const presa = scelte.includes(r.nome);
      return `<label class="riv${r.livello > liv ? ' non-ancora' : ''}${presa ? ' presa' : ''}">
        <input type="checkbox" ${presa ? 'checked' : ''} data-azione="pf1-rivelazione" data-id="${id}" data-nome="${esc(r.nome)}">
        ${esc(r.nome)} <small class="muto">(${esc(r.tipo)}${r.livello > 1 ? ', dal ' + r.livello + '°' : ''})</small></label>`;
    }).join('');
    return `${testa}
      <div class="fede-righe"><div><span class="muto">Abilità di classe aggiunte</span> ${esc(mis.abil.join(', '))}</div></div>
      <h4>Rivelazioni <small class="${scelte.length > disponibili ? 'oltre' : 'muto'}">${scelte.length} / ${disponibili}</small></h4>
      <div class="riv-griglia">${rivelazioni}</div>
      <div class="pf-piede"><label title="Talento Rivelazione Extra, ecc.">Rivelazioni extra ${`<input type="number" data-pf1="oracolo|extra" data-id="${id}" data-tipo="numero" value="${esc(o.extra)}" min="0">`}</label></div>
      <h4>Incantesimi bonus del mistero</h4>
      <div class="fede-inc-lista">${incantesimi}</div>`;
  }

  // ---- Alchimista: scoperte, bombe, mutageno ----
  // Dati: window.PF1_SCOPERTE = [nome, livello, scoperte richieste, razza, modifica bomba (*), beneficio, fonte, sezione wiki, altri prerequisiti]
  const SCOPERTE = (window.PF1_SCOPERTE || []).map(([nome, livello, richieste, razza, asterisco, beneficio, fonte, sezione, altro]) =>
    ({ nome, livello, richieste, razza, asterisco: !!asterisco, beneficio, fonte, sezione, altro }));
  // Scoperte non tradotte sul wiki italiano (regole da Archives of Nethys, aonprd.com)
  const SCOPERTE_INGLESI = [
    { nome: 'Bomba Sacra', inglese: 'Holy Bombs', livello: 8, richieste: [], razza: '', asterisco: true, altro: '', sezione: '',
      beneficio: 'Le bombe infliggono danni divini (bene); i malvagi colpiti direttamente sono barcollanti nel loro turno successivo (Tempra nega); i neutrali subiscono metà danni e non barcollano; nessun effetto sulle creature buone.',
      fonte: 'Champions of Purity, pag. 24 (solo in inglese)', link: 'https://aonprd.com/AlchemistDiscoveries.aspx' },
  ];
  for (const s of SCOPERTE_INGLESI) if (!SCOPERTE.some((x) => x.nome === s.nome)) SCOPERTE.push(s);
  SCOPERTE.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  const scopertaDi = (nome) => SCOPERTE.find((s) => s.nome === nome);
  // Bombe che cambiano dado o tipo di danno (le altre * aggiungono un effetto e restano a fuoco 1d6)
  const BOMBE_DANNO = {
    'Bomba Acida': ['d6', 'acido', 'un colpo diretto infligge altri 1d6 danni da acido il round successivo'],
    'Bomba Gelida': ['d6', 'freddo', 'colpo diretto: barcollante il round successivo (Tempra nega)'],
    'Bomba Folgorante': ['d6', 'elettricità', 'colpo diretto: abbagliato per 1d4 round'],
    'Bomba Concussiva': ['d4', 'sonoro', 'colpo diretto: assordato per 1 minuto (Tempra nega)'],
    'Bomba di Forza': ['d4', 'forza', 'colpo diretto: prono (Riflessi nega)'],
    'Bomba a Frammentazione': ['d6', 'perforante', ''],
    'Bomba Confondente': ['d6', 'fuoco', 'colpo diretto: confuso per 1 round per livello; danni ridotti di 2d6', 2],
    'Bomba Defoliante': ['d4', 'veleno', 'contro i vegetali 1d8 per dado invece di 1d4; distrugge la vegetazione nell\'area'],
    'Bomba Esplosiva': ['d6', 'fuoco', 'raggio di spargimento 3 m; colpo diretto: prende fuoco, 1d6 danni da fuoco a round finché non viene spento'],
    'Bomba Sacra': ['d6', 'divino (bene)', 'malvagi colpiti direttamente: barcollanti nel loro prossimo turno (Tempra nega) · neutrali: metà danni, non barcollano · buoni: nessun effetto'],
  };
  const COPPIE_MUTAGENO = { FOR: 'INT', DES: 'SAG', COS: 'CAR', INT: 'FOR', SAG: 'DES', CAR: 'COS' };
  const ESTRATTO_PERIODO = (liv) => [2, 4, 6, 8, 10, 12, 14, 16, 18].filter((x) => x <= liv).length;

  function datiAlchimista(d) {
    const a = d.alchimista;
    if (!Array.isArray(a.scoperte)) a.scoperte = [];
    if (!a.mutageno) a.mutageno = { tipo: 'mutageno', car: ['FOR', 'DES', 'COS'], attivo: false, bonusId: '' };
    if (!Array.isArray(a.mutageno.car)) a.mutageno.car = ['FOR', 'DES', 'COS'];
    return a;
  }

  // ---- Mastro Chimico (classe di prestigio, wiki «Mastro Chimico") ----
  const MC = 'Mastro Chimico';
  // Mutageni avanzati: [nome, tipo, livello effettivo di alchimista minimo, altri requisiti (testo), richiede Mutageno Ferino, estratti richiesti (uno a scelta)]
  // Nota: il wiki italiano inverte i livelli di Maggiore (16) e Superiore (12); qui si segue la regola originale (Maggiore 12, Superiore 16 e richiede il Maggiore).
  const AVANZATI_MC = [
    ['Agilità', 'Str', 0, 'in forma mutagena: bonus alchemico pari a ½ livello da mastro chimico alle prove di DES e di abilità basate su DES e alla DMC, e bonus di armatura naturale alla CA'],
    ['Cambiamento Ristoratore', 'Sop', 0, 'quando entra o esce dalla forma mutagena guarisce 1d8 + livello del personaggio'],
    ['Camuffamento', 'Str', 0, 'in forma mutagena può riprendere l\'aspetto normale (Volontà CD 20, +1 per ogni minuto in più)'],
    ['Eludere', 'Str', 0, 'come la capacità del ladro, solo in forma mutagena'],
    ['Fiuto', 'Str', 0, 'fiuto in forma mutagena'],
    ['Mente Duplice', 'Str', 10, '+2 ai TS su Volontà in entrambe le forme; ripete i TS falliti contro ammaliamenti cambiando forma (servono usi di Mutare)'],
    ['Mutageno della Crescita', 'Sop', 16, 'in forma mutagena aumenta di una taglia, come Ingrandire Persone', false, ['Ingrandire Persone', 'Forma di Gigante I', 'Metamorfosi']],
    ['Mutageno Draconico', 'Sop', 16, 'in forma mutagena: resistenza 20 all\'energia del drago scelto e un soffio da 8d8 per trasformazione (Riflessi dimezza, CD 10 + livello da mastro chimico + INT)', true, ['Forma di Drago I']],
    ['Mutageno Furioso', 'Str', 11, 'il dado dei danni di morso e artigli del mutageno ferino aumenta di una categoria', true],
    ['Mutageno Maggiore', 'Str', 12, 'come la scoperta Mutageno Maggiore (e conta come quella scoperta)'],
    ['Mutageno Superiore', 'Str', 16, 'come la scoperta Mutageno Superiore (e conta come quella scoperta); richiede Mutageno Maggiore'],
    ['Mutageno Prolungato', 'Str', 0, 'la durata della forma mutagena raddoppia'],
    ['Mutageno Ferino', 'Str', 0, 'come la scoperta Mutageno Ferino (e conta come quella scoperta)'],
    ['Prestanza Fisica', 'Str', 0, 'in forma mutagena: bonus alchemico pari a ½ livello da mastro chimico alle prove di FOR e COS, alle abilità basate su FOR, a BMC e DMC'],
    ['Visione Notturna', 'Str', 0, 'scurovisione 18 m e visione crepuscolare in forma mutagena'],
  ];
  // Draghi: [tipo, energia, forma del soffio]
  const DRAGHI_MC = [['Bianco', 'freddo', 'cono di 9 m'], ['Blu', 'elettricita', 'linea di 18 m'], ['Nero', 'acido', 'linea di 18 m'], ['Rosso', 'fuoco', 'cono di 9 m'], ['Verde', 'acido', 'cono di 9 m'],
    ['Argento', 'freddo', 'cono di 9 m'], ['Bronzo', 'elettricita', 'linea di 18 m'], ['Oro', 'fuoco', 'cono di 9 m'], ['Ottone', 'fuoco', 'linea di 18 m'], ['Rame', 'acido', 'linea di 18 m']];
  const datiChimico = (d) => {
    if (!d.chimico) d.chimico = { alterEgo: '', allineamento: '', avanzati: [], drago: '', mutareUsati: 0, soffioUsato: false };
    if (!Array.isArray(d.chimico.avanzati)) d.chimico.avanzati = [];
    return d.chimico;
  };
  const livMC = (d) => livelloClasse(d, MC);
  // Il mastro chimico ha (o conta come se avesse) una scoperta grazie a un mutageno avanzato
  const avanzatoMC = (d, nome) => livMC(d) > 0 && (d.chimico?.avanzati || []).includes(nome);
  const haScoperta = (d, nome) => (d.alchimista?.scoperte || []).includes(nome) || avanzatoMC(d, nome);
  const mutareGiorno = (liv) => (liv >= 10 ? 5 : liv >= 8 ? 4 : liv >= 5 ? 3 : liv >= 1 ? 2 : 0);
  const brutalitaMC = (liv) => (liv >= 9 ? 6 : liv >= 7 ? 4 : liv >= 3 ? 2 : 0);
  // Estratti conosciuti (formulario o elenco) per i requisiti dei mutageni avanzati
  const conosceEstratto = (d, nomi) => d.incantatori.some((inc) => [...(inc.incantesimi || []), ...(inc.libro || [])].some((s) => nomi.some((x) => norm(x) === norm(s.nome || ''))));
  function motivoNoAvanzato(d, x) {
    const [nome, , minimo, , ferino, estratti] = x;
    const eff = livelloClasse(d, 'Alchimista') + livMC(d);
    const out = [];
    if (minimo && eff < minimo) out.push(`livello effettivo da alchimista ${minimo} (ora ${eff})`);
    if (ferino && !haScoperta(d, 'Mutageno Ferino')) out.push('Mutageno Ferino');
    if (estratti && !conosceEstratto(d, estratti)) out.push(`conoscere ${estratti.join(' o ')}`);
    if (nome === 'Mutageno Superiore' && !haScoperta(d, 'Mutageno Maggiore')) out.push('Mutageno Maggiore');
    return out;
  }
  // Effetti sulla scheda: Mente Duplice sempre; in forma mutagena Agilità e Prestanza Fisica
  function effettiChimico(d, abilita) {
    const liv = livMC(d);
    if (!liv) return [];
    const ch = datiChimico(d);
    const out = [];
    const f = (nome) => `${nome} (${MC})`;
    if (ch.avanzati.includes('Mente Duplice')) out.push({ ...E('volonta', 2), fonte: f('Mente Duplice') });
    if (d.alchimista?.mutageno?.attivo) {
      const meta = Math.floor(liv / 2);
      if (meta && ch.avanzati.includes('Agilità')) {
        for (const a of abilita.filter((x) => x.car === 'DES')) out.push({ ...E('abil:' + a.nome, meta, 'alchemico'), fonte: f('Agilità') });
        out.push({ ...E('dmc', meta, 'alchemico'), fonte: f('Agilità') }, { ...E('ca', meta, 'armatura naturale'), fonte: f('Agilità') });
      }
      if (meta && ch.avanzati.includes('Prestanza Fisica')) {
        for (const a of abilita.filter((x) => x.car === 'FOR')) out.push({ ...E('abil:' + a.nome, meta, 'alchemico'), fonte: f('Prestanza Fisica') });
        out.push({ ...E('bmc', meta, 'alchemico'), fonte: f('Prestanza Fisica') }, { ...E('dmc', meta, 'alchemico'), fonte: f('Prestanza Fisica') });
      }
    }
    return out;
  }
  function sezioneChimico(p, d, c) {
    const id = p.id;
    const ch = datiChimico(d);
    const liv = livMC(d);
    const alc = livelloClasse(d, 'Alchimista');
    const a = datiAlchimista(d);
    const attivo = !!a.mutageno?.attivo;
    const usi = mutareGiorno(liv);
    const usati = n(ch.mutareUsati);
    const durata = (10 * (alc + liv) + 10 * totaleEffettoPref(d, 'mutagenoDurata')) * (ch.avanzati.includes('Mutageno Prolungato') ? 2 : 1);
    const brut = brutalitaMC(liv);
    const allPg = String(p.campi?.Allineamento || '').trim();
    const ALL = ['Legale Buono', 'Neutrale Buono', 'Caotico Buono', 'Legale Neutrale', 'Neutrale', 'Caotico Neutrale', 'Legale Malvagio', 'Neutrale Malvagio', 'Caotico Malvagio'];
    const uguale = ch.allineamento && allPg && norm(ch.allineamento) === norm(allPg);
    const totAv = Math.floor(liv / 2);
    const drago = DRAGHI_MC.find((x) => x[0] === ch.drago);
    const forma = `<div class="alc-pannello${attivo ? ' attivo' : ''}">
        <h4>🧬 Forma mutagena ${attivo ? '<small class="pf-etichetta">attiva</small>' : '<small class="muto">forma normale</small>'}</h4>
        <div class="pf-riga">
          <label>Nome dell'alter ego <input data-pf1="chimico|alterEgo" data-id="${id}" value="${esc(ch.alterEgo)}" placeholder="es. Macellaio"></label>
          <label>Allineamento dell'alter ego <select data-pf1="chimico|allineamento" data-id="${id}" data-ridisegna-pf1>${opz([['', '— scegli —'], ...ALL.map((x) => [x, x])], ch.allineamento)}</select></label>
          <span class="muto">forma normale: ${esc(allPg || 'allineamento non scritto')}</span>
          ${uguale ? '<span class="oltre">⚠ deve essere diverso da quello della forma normale</span>' : ''}
        </div>
        <div class="pf-riga">
          <span><b>Mutare</b> ${usi}/giorno</span><span class="pf-pallini">${pallini(usi, usati, `data-azione="pf1-mc-usi" data-id="${id}"`)}</span>
          ${attivo
            ? `<button data-azione="pf1-mc-torna" data-id="${id}" title="Tornare prima della fine costa un uso di Mutare">↩ Torna alla forma normale (1 uso)</button>
               <button data-azione="pf1-alc-mutageno" data-id="${id}" title="La durata è finita o la magia è stata interrotta">⏹ Fine della durata</button>`
            : `<button class="primario" data-azione="pf1-mc-muta" data-id="${id}" ${usati >= usi ? 'disabled title="Usi di Mutare finiti per oggi"' : ''}>🧬 Muta (senza bere il mutageno)</button>`}
          <span class="muto">durata ${durata} minuti (livello effettivo da alchimista ${alc + liv}${ch.avanzati.includes('Mutageno Prolungato') ? ', raddoppiata' : ''})</span>
        </div>
        <p class="muto pf-aiuto">Usa le caratteristiche scelte nel pannello del mutageno qui sopra. Bere il mutageno fa assumere comunque la forma mutagena.
          Se in forma normale subisce un critico o fallisce un TS su Tempra e ha ancora usi di Mutare: <b>Volontà CD 25</b> o al turno dopo si trasforma (conta come un uso).
          ${usati < usi && !attivo ? `<button class="btn-mini" data-azione="pf1-tira" data-id="${id}" data-tiro="ts:volonta" title="Tira Volontà">🎲 Volontà</button>` : ''}</p>
      </div>`;
    const capacita = `<ul class="ms-cap">
        <li><b>Lanciatore di Bombe</b>: i dadi delle bombe usano alchimista + mastro chimico (${alc + liv} livelli: ${Math.ceil((alc + liv) / 2)}d6), già nel pannello delle bombe.</li>
        ${liv >= 2 ? '' : '<li class="muto">Mutageno avanzato dal 2° livello.</li>'}
        ${brut ? `<li><b>Brutalità</b>: in forma mutagena <b>+${brut}</b> ai danni con armi semplici e attacchi naturali${attivo ? ' <span class="pf-etichetta">attiva ora</span>' : ''} (aggiungilo ai danni di quelle armi).</li>` : '<li class="muto">Brutalità (+2 ai danni in forma mutagena) dal 3° livello.</li>'}
        <li><b>Estratti</b>: i livelli indicati nella tabella contano come livelli da alchimista per estratti al giorno e livello dell'incantatore (sezione Incantesimi).</li>
      </ul>`;
    const voci = AVANZATI_MC.map((x) => {
      const [nome, tipo, , testo] = x;
      const preso = ch.avanzati.includes(nome);
      const no = motivoNoAvanzato(d, x);
      const pieno = !preso && ch.avanzati.length >= totAv;
      return `<label class="riv alc-scop${(no.length || pieno) && !preso ? ' non-ancora' : ''}${preso ? ' presa' : ''}">
        <input type="checkbox" ${preso ? 'checked' : ''} ${(no.length || pieno) && !preso ? 'disabled' : ''} data-azione="pf1-mc-avanzato" data-id="${id}" data-nome="${esc(nome)}">
        <span><b>${esc(nome)}</b> <small class="muto">(${tipo})</small><span class="ms-eff">${esc(testo)}</span>${no.length && !preso ? ` <i class="alc-no">serve: ${esc(no.join('; '))}</i>` : ''}</span>
        ${preso && nome === 'Mutageno Draconico' ? `<span class="ms-extra"><select data-pf1="chimico|drago" data-id="${id}" data-ridisegna-pf1>${opz([['', '— drago —'], ...DRAGHI_MC.map(([k, en, sf]) => [k, `${k} (${en === 'elettricita' ? 'elettricità' : en}, ${sf})`])], ch.drago)}</select></span>` : ''}</label>`;
    }).join('');
    const soffio = ch.avanzati.includes('Mutageno Draconico') && drago ? `<div class="pf-riga mc-soffio"><b>🐉 Soffio</b> 8d8 ${drago[1] === 'elettricita' ? 'elettricità' : drago[1]}, ${drago[2]}, Riflessi CD ${10 + liv + c.m.INT} dimezza · una volta per trasformazione
        ${attivo ? `<button class="btn-piccolo" data-azione="pf1-mc-soffio" data-id="${id}" ${ch.soffioUsato ? 'disabled title="Già usato in questa trasformazione"' : ''}>🔥 Soffia</button>` : '<span class="muto">(solo in forma mutagena)</span>'}</div>` : '';
    return `${forma}${capacita}
      <h4>Mutageni avanzati <small class="${ch.avanzati.length > totAv ? 'oltre' : 'muto'}">${ch.avanzati.length} / ${totAv}</small>
        <small class="muto">al 2°, 4°, 6°, 8° e 10° livello · non si sceglie lo stesso due volte · livello effettivo da alchimista ${alc + liv}</small></h4>
      <div class="riv-griglia alc-griglia ms-griglia">${voci}</div>${soffio}`;
  }

  // ---- Attacco furtivo: dadi da tutte le classi (ladro, ninja, mistificatore arcano, assassino…), che si sommano ----
  // Si leggono dalle tabelle di progressione: per ogni classe vale la voce "Attacco Furtivo +Nd6" più alta raggiunta
  function attaccoFurtivoDadi(d) {
    const P = window.PF1_PROGRESSIONE || {};
    let tot = 0;
    for (const cl of d.classi) {
      const k = nomeClasse(cl.nome);
      const t = P[k];
      if (!t) continue;
      const col = 4 + colonnaPrivilegi(t);
      let max = 0;
      for (const r of t.righe.slice(0, n(cl.livello))) {
        const m = String(r[col] || '').match(/Attacco Furtivo \+(\d+)d6/i);
        if (m) max = Math.max(max, Number(m[1]));
      }
      tot += max;
    }
    return tot;
  }

  // ---- Mistificatore Arcano (classe di prestigio, wiki «Mistificatore Arcano») ----
  const MA = 'Mistificatore Arcano';
  const livMA = (d) => livelloClasse(d, MA);
  const datiMistificatore = (d) => {
    if (!d.mistificatore) d.mistificatore = { estemporanei: 0, mistificati: 0, invisibile: 0 };
    return d.mistificatore;
  };
  const estemporaneiGiorno = (liv) => (liv >= 7 ? 2 : liv >= 3 ? 1 : 0);
  const mistificatiGiorno = (liv) => (liv >= 9 ? 5 : liv >= 7 ? 4 : liv >= 5 ? 3 : 0);
  function sezioneMistificatore(p, d, c) {
    const id = p.id;
    const m = datiMistificatore(d);
    const liv = livMA(d);
    const dadi = attaccoFurtivoDadi(d);
    const est = estemporaneiGiorno(liv);
    const mis = mistificatiGiorno(liv);
    const inv = liv >= 9 ? liv : 0;
    const usi = (tot, usati, campo, etichetta, testo) => (tot ? `<div class="pf-riga"><span><b>${etichetta}</b> ${tot}${campo === 'invisibile' ? ' round' : ''}/giorno</span>
        <span class="pf-pallini">${pallini(tot, n(usati), `data-azione="pf1-ma-usi" data-id="${id}" data-campo="${campo}"`)}</span><span class="muto">${testo}</span></div>` : '');
    const abil = (nome) => `${esc(nome)} <b>${segno(c.abil[nome] ?? 0)}</b>${n(d.abil[nome]?.gradi) ? '' : ' <small class="oltre">(serve almeno 1 grado)</small>'}`;
    return `<div class="alc-pannello">
        <h4>🗡 Attacco furtivo <b>+${dadi}d6</b> <small class="muto">somma di tutte le classi (ladro, ninja, mistificatore arcano…)</small>
          ${dadi ? `<button class="btn-dado" data-azione="pf1-tira" data-id="${id}" data-tiro="furtivo" title="Tira i danni dell'attacco furtivo">🎲</button>` : ''}</h4>
        <p class="muto pf-aiuto">Contro un bersaglio che perde il bonus di DES alla CA o che viene fiancheggiato. Le creature immuni ai critici non subiscono il danno extra.</p>
        ${usi(est, m.estemporanei, 'estemporanei', 'Attacco Furtivo Estemporaneo', 'dichiara furtivo un attacco (a distanza entro 9 m): il bersaglio perde il bonus di DES alla CA contro quell\'attacco')}
        ${usi(mis, m.mistificati, 'mistificati', 'Incantesimi Mistificati', 'lancia senza componenti verbali e somatiche (come Silenziosi e Immobili) senza aumentare livello o tempo di lancio')}
        ${usi(inv, m.invisibile, 'invisibile', 'Ladro Invisibile', 'invisibilità superiore come azione gratuita, round anche non consecutivi')}
      </div>
      <ul class="ms-cap">
        <li><b>Prestidigitazione a Distanza</b>: Disattivare Congegni e Rapidità di Mano fino a 9 m, CD +5, niente «prendere 10», oggetti fino a 2,5 kg. Ora: ${abil('Disattivare Congegni')} · ${abil('Rapidità di Mano')}.</li>
        <li><b>Incantesimi al giorno</b>: ogni livello conta come un livello della classe da incantatore scelta nella sezione Incantesimi.</li>
        ${liv >= 10 ? `<li><b>Incantesimi a Sorpresa</b>: agli incantesimi che infliggono danni aggiunge +${dadi}d6 dello stesso tipo contro bersagli impreparati (il TS che dimezza o nega vale anche per questo danno).</li>` : `<li class="muto">Più avanti: ${[liv < 3 ? 'Attacco Furtivo Estemporaneo (3°)' : '', liv < 5 ? 'Incantesimi Mistificati (5°)' : '', liv < 9 ? 'Ladro Invisibile (9°)' : '', 'Incantesimi a Sorpresa (10°)'].filter(Boolean).join(', ')}.</li>`}
      </ul>`;
  }

  // Grado del mutageno/cognatogeno secondo le scoperte possedute: 1 base, 2 maggiore, 3 superiore
  // (il Mastro Chimico può averle come mutageni avanzati, che contano come le scoperte)
  function gradoMutageno(a, tipo, d) {
    const base = tipo === 'cognatogeno' ? 'Cognatogeno' : 'Mutageno';
    const ha = (s) => a.scoperte.includes(s) || (d && base === 'Mutageno' && avanzatoMC(d, s));
    if (ha(`${base} Superiore`)) return 3;
    if (ha(`${base} Maggiore`)) return 2;
    return 1;
  }
  // Effetti sulla scheda: bonus alchemici, penalità alle caratteristiche opposte, armatura naturale
  function effettiMutageno(a, d) {
    const mu = a.mutageno;
    const grado = gradoMutageno(a, mu.tipo, d);
    const valori = [[4], [6, 4], [8, 6, 4]][grado - 1];
    const sc = mu.car.slice(0, valori.length);
    const eff = sc.map((s, i) => E(s, valori[i], 'alchemico'));
    for (const s of sc) eff.push(E(COPPIE_MUTAGENO[s], -2, 'senza tipo'));
    // Armatura naturale del mutageno, più l'eventuale bonus di classe preferita (+1/4 per livello)
    eff.push(E('ca', [2, 4, 6][grado - 1] + (d ? totaleEffettoPref(d, 'mutagenoCA') : 0), 'armatura naturale'));
    return eff.map((e) => ({ id: uid(), ...e }));
  }

  // ---- Bonus di classe preferita alternativi delle razze (src/pf1-preferite.js, da Archives of Nethys) ----
  // Ogni livello nella classe preferita si può spendere su +1 PF, +1 grado o una delle opzioni della propria razza.
  // Livelli scelti per opzione: d.preferitaAlt["Classe~indice"]; scelta del tipo di energia: d.preferitaScelta["Classe~indice"].
  const PREFERITE = window.PF1_PREFERITE || {};
  const nomeRazza = (d) => razzaDi(d)?.nome || d.razza?.nome || '';
  const opzioniPreferite = (d, classe) => PREFERITE[nomeRazza(d)]?.[classe] || [];
  const chiavePref = (classe, i) => `${classe}~${i}`;
  const livelliPref = (d, classe, i) => n(d.preferitaAlt?.[chiavePref(classe, i)]);
  // Totale di un'opzione: le frazioni si sommano e si arrotondano per difetto (es. +1/2 per 3 livelli = +1)
  const totalePref = (v, volte) => (v < 1 ? Math.floor(volte * v + 1e-9) : volte * v);
  // Tutte le opzioni prese, con il loro totale (per gli effetti calcolati)
  function prefPrese(d) {
    const out = [];
    for (const classe of new Set(d.classi.map((cl) => nomeClasse(cl.nome)).filter(Boolean))) {
      opzioniPreferite(d, classe).forEach((x, i) => {
        const volte = livelliPref(d, classe, i);
        if (volte) out.push({ classe, i, x, volte, tot: totalePref(x.v, volte), scelta: d.preferitaScelta?.[chiavePref(classe, i)] || '' });
      });
    }
    return out;
  }
  const totaleEffettoPref = (d, tipo) => prefPrese(d).filter((p) => p.x.e?.tipo === tipo).reduce((a, p) => a + p.tot, 0);
  // ---- Talenti con un bonus fisso, applicato da solo quando il talento è tra i talenti del personaggio ----
  const EFFETTI_TALENTI = {
    'iniziativa migliorata': [E('iniz', 4)], // +4 alle prove di iniziativa
    'tempra possente': [E('tempra', 2)],
    'riflessi fulminei': [E('riflessi', 2)],
    'volonta di ferro': [E('volonta', 2)],
    'schivare': [E('ca', 1, 'schivare')],
  };
  // Talenti che danno +2 a due abilità (+4 a quella in cui si hanno almeno 10 gradi)
  const TALENTI_ABILITA = {
    allerta: ['Percezione', 'Intuizione'], atletico: ['Nuotare', 'Scalare'], acrobatico: ['Acrobazia', 'Volare'],
    ingannevole: ['Raggirare', 'Camuffare'], 'affinita animale': ['Addestrare Animali', 'Cavalcare'], manolesta: ['Disattivare Congegni', 'Rapidità di Mano'],
    autosufficiente: ['Guarire', 'Sopravvivenza'], furtivo: ['Artista della Fuga', 'Furtività'], persuasivo: ['Diplomazia', 'Intimidire'],
    'vocazione magica': ['Sapienza Magica', 'Utilizzare Congegni Magici'],
  };
  const haTalento = (d, nome) => d.capacita.some((x) => baseTalento(x.nome || '') === norm(nome));
  // Scelta tra parentesi di un talento (es. "Arma Focalizzata (spada lunga)" -> "spada lunga")
  const sceltaTalento = (nome) => (String(nome).match(/\(([^()]*(?:\([^()]*\))?[^()]*)\)\s*$/) || [])[1] || '';
  function effettiTalenti(d, abilita) {
    const out = [];
    const visti = new Set();
    const gradi = (a) => n(d.abil[a]?.gradi);
    for (const x of d.capacita) {
      const k = baseTalento(x.nome || '');
      const chiave = norm(x.nome || '');
      if (visti.has(chiave)) continue; // lo stesso talento preso due volte non si somma
      visti.add(chiave);
      if (EFFETTI_TALENTI[k]) out.push(...EFFETTI_TALENTI[k].map((e) => ({ ...e, fonte: x.nome })));
      if (TALENTI_ABILITA[k]) for (const a of TALENTI_ABILITA[k]) out.push({ ...E('abil:' + a, gradi(a) >= 10 ? 4 : 2), fonte: x.nome });
      // Abilità Focalizzata (abilità): +3, +6 con almeno 10 gradi
      if (k === 'abilita focalizzata') {
        const s = norm(sceltaTalento(x.nome));
        const a = abilita.find((y) => norm(y.nome) === s);
        if (a) out.push({ ...E('abil:' + a.nome, gradi(a.nome) >= 10 ? 6 : 3), fonte: x.nome });
      }
    }
    return out;
  }
  // Arma Focalizzata / Specializzata (normale e Superiore) sull'arma scelta: bonus al colpo e ai danni di quell'arma.
  // L'arma si riconosce se il suo nome contiene la scelta del talento (es. talento "(spada lunga)", arma "Spada lunga +1").
  // Critico Migliorato: intervallo di minaccia raddoppiato («19-20/×2» → «17-20/×2», «20/×3» → «19-20/×3»)
  function critRaddoppiato(crit) {
    const m = String(crit).match(/^\s*(\d+)(?:\s*-\s*20)?\s*\/\s*(.+)$/);
    if (!m) return crit;
    const basso = 21 - 2 * (21 - Number(m[1]));
    return `${basso < 20 ? `${basso}-20` : '20'}/${m[2].replace(/x/g, '×')}`;
  }
  function talentiArma(d, a) {
    const nomeArma = norm(a.nome || '');
    const per = (talento) => d.capacita.some((x) => baseTalento(x.nome || '') === norm(talento) && sceltaTalento(x.nome) && nomeArma.includes(norm(sceltaTalento(x.nome))));
    return {
      colpo: (per('Arma Focalizzata') ? 1 : 0) + (per('Arma Focalizzata Superiore') ? 1 : 0),
      danni: (per('Arma Specializzata') ? 2 : 0) + (per('Arma Specializzata Superiore') ? 2 : 0),
      criticoMigliorato: per('Critico Migliorato'),
    };
  }
  // Effetti sulla scheda dei bonus di classe preferita: abilità
  const effettiPreferite = (d) => prefPrese(d).filter((p) => p.x.e?.tipo === 'abil' && p.tot)
    .flatMap((p) => p.x.e.abil.map((a) => ({ ...E('abil:' + a, p.tot, p.x.e.bonus || 'senza tipo'), fonte: `Classe preferita (${p.classe})` })));

  // Sezione della scheda: per ogni classe base, quanti livelli sono andati su ciascun bonus e quanto vale in totale
  const ESITI_PREF = { bombe: 'danni delle bombe', bombeUsi: 'bombe al giorno', mutagenoDurata: 'minuti di mutageno', mutagenoCA: 'armatura naturale del mutageno', abil: 'abilità', resistenza: 'resistenza' };
  function sezionePreferite(p, d) {
    const id = p.id;
    const razza = nomeRazza(d);
    const pc = d.pfCalc;
    const classi = d.classi.filter((cl) => !CLASSI[nomeClasse(cl.nome)]?.prestigio && nomeClasse(cl.nome));
    const testa = `<p class="muto pf-aiuto">A ogni livello nella classe preferita si ottiene +1 PF, +1 grado di abilità oppure uno dei bonus della propria razza qui sotto. I livelli di prestigio non danno questo bonus.
        Nella salita di livello si sceglie dall'elenco; qui si possono correggere i conteggi.</p>
      <div class="pf-riga"><span>Già presi in tutto: <b>+${n(pc.preferita)} PF</b> (sezione Difese) · <b>+${n(d.gradiExtra)} gradi</b> (sezione Abilità)</span></div>`;
    if (!razza) return `${testa}<p class="muto">Scegli la razza per vedere i suoi bonus alternativi.</p>`;
    const blocchi = classi.map((cl) => {
      const k = nomeClasse(cl.nome);
      const opz = opzioniPreferite(d, k);
      if (!opz.length) return `<div class="pref-classe"><h4>${esc(k)} <small class="muto">${n(cl.livello)}° livello</small></h4><p class="muto">Nessun bonus alternativo per ${esc(razza)} in questa classe: solo +1 PF o +1 grado.</p></div>`;
      const spesi = opz.reduce((a, _, i) => a + livelliPref(d, k, i), 0);
      const righe = opz.map((x, i) => {
        const volte = livelliPref(d, k, i);
        const tot = totalePref(x.v, volte);
        const kk = chiavePref(k, i);
        const sceltaEnergia = x.e?.tipo === 'resistenza' && !x.e.energia
          ? `<select data-pf1="preferitaScelta|${kk}" data-id="${id}" data-ridisegna-pf1>${opz2((x.e.scelta || ['acido', 'elettricita', 'freddo', 'fuoco']).map((e) => [e, e === 'elettricita' ? 'elettricità' : e]), d.preferitaScelta?.[kk] || '')}</select>` : '';
        return `<div class="pref-voce${volte ? ' presa' : ''}">
          <label class="pref-volte" title="Livelli in cui hai scelto questo bonus"><input type="number" class="pf-corto" min="0" max="${n(cl.livello)}" data-pf1="preferitaAlt|${kk}" data-id="${id}" data-tipo="numero" value="${volte || ''}" placeholder="0" data-ridisegna-pf1> ×</label>
          <span class="pref-testo">${esc(x.t)} <small class="muto">(${esc(x.f)})</small></span>
          <span class="pref-tot">${volte ? `totale <b>${x.v < 1 ? `+${tot}` : `+${tot}`}</b>${x.v < 1 && volte * x.v % 1 > 1e-9 ? ` <small class="muto">(${String(Math.round(volte * x.v * 100) / 100).replace('.', ',')})</small>` : ''}` : ''}
            ${x.e ? `<small class="pref-auto" title="La scheda lo applica da sola">✓ ${esc(ESITI_PREF[x.e.tipo] || 'calcolato')}</small>` : ''}${sceltaEnergia}</span>
        </div>`;
      }).join('');
      return `<div class="pref-classe"><h4>${esc(k)} <small class="${spesi > n(cl.livello) ? 'oltre' : 'muto'}">${spesi} livell${spesi === 1 ? 'o' : 'i'} su bonus razziali · ${n(cl.livello)}° livello</small></h4>${righe}</div>`;
    }).join('');
    return `${testa}${blocchi || '<p class="muto">Nessuna classe base.</p>'}
      <p class="muto pf-aiuto">Bonus di ${esc(razza)} dalla fonte ufficiale inglese Archives of Nethys (aonprd.com), tradotti. Le frazioni si sommano: il totale si arrotonda per difetto.</p>`;
  }
  const opz2 = (lista, val) => `<option value="">— tipo —</option>${opz(lista, val)}`;

  // Valori di una bomba: del tipo scelto nel pannello (o di quello passato, es. dal borsello delle bombe)
  function bombaDi(d, c, tipoScelto) {
    const liv = livelloClasse(d, 'Alchimista');
    const a = datiAlchimista(d);
    const richiesto = tipoScelto === undefined ? a.tipoBomba : tipoScelto;
    const tipo = a.scoperte.includes(richiesto) ? richiesto : '';
    const [dado, energia, nota, meno = 0] = BOMBE_DANNO[tipo] || ['d6', 'fuoco', ''];
    // Lanciatore di Bombe (Mastro Chimico): per i danni si sommano i livelli da alchimista e da mastro chimico
    const dadi = Math.max(1, Math.ceil((liv + livMC(d)) / 2) - meno);
    // Bombe al giorno: livello + INT, +2 per ogni talento Bombe Extra
    const extra = 2 * d.capacita.filter((x) => norm(x.nome || '') === norm('Bombe Extra')).length;
    const int = c.m.INT;
    const cd = 10 + Math.floor(liv / 2) + int;
    const t = TAGLIE.find((x) => x[0] === d.taglia) || TAGLIE[4];
    const colpo = c.bab + c.m.DES + t[1] + (c.bonusColpire || 0);
    const raggio = tipo === 'Bomba Esplosiva' ? '3 m' : '1,5 m';
    // Bonus di classe preferita (es. tiefling: +½ per livello scelto); lo spargimento è il danno minimo, quindi lo include
    const pref = totaleEffettoPref(d, 'bombe');
    return {
      liv, usi: Math.max(0, liv + int + extra + totaleEffettoPref(d, 'bombeUsi')), dadi, dado, energia, nota, cd, colpo, raggio, tipo, pref,
      danni: `${dadi}${dado}${fmtMod(int + pref)}`, spargimento: dadi + int + pref,
      rapide: a.scoperte.includes('Bombe Rapide'),
    };
  }

  // Borsello delle bombe (Equipaggiamento dell'alchimista): tutti i tipi di bomba che conosce, pronti da lanciare
  const MODIFICATORI_BOMBA = ['Bomba Persistente', 'Bombe Precise', 'Bomba Lineare', 'Bomba Ritardata', 'Bombe Rapide', 'Bomba Dissolvente', 'Bomba di Follia', 'Carica Incendiaria', 'Demolizione Subacquea', 'Soffiare Bomba'];
  function sezioneBombe(p, d, c) {
    const id = p.id;
    const a = datiAlchimista(d);
    const base = bombaDi(d, c, '');
    const usate = n(a.bombeUsate);
    const tipi = ['', ...SCOPERTE.filter((s) => s.asterisco && a.scoperte.includes(s.nome)).map((s) => s.nome)];
    const righe = tipi.map((t) => {
      const b = bombaDi(d, c, t);
      const s = t ? scopertaDi(t) : null;
      const effetto = b.nota || (s ? s.beneficio : 'danni da fuoco; chi è nello spargimento subisce i danni minimi');
      return `<tr>
        <td><b>${esc(t || 'Bomba normale')}</b>${s?.inglese ? ' <small class="muto" title="Regola solo in inglese">EN</small>' : ''}${t ? ` <button class="btn-mini" data-azione="pf1-info-scoperta" data-nome="${esc(t)}" title="Descrizione">i</button>` : ''}</td>
        <td>${esc(b.danni)} <small class="muto">${esc(b.energia)}</small></td>
        <td>${b.spargimento} <small class="muto">${b.raggio}</small></td>
        <td>${b.cd}</td>
        <td class="bombe-effetto">${esc(effetto)}</td>
        <td class="bombe-tasti">
          <button class="btn-piccolo" data-azione="pf1-bomba-lancia" data-id="${id}" data-tipo="${esc(t)}" ${usate >= b.usi ? 'disabled title="Bombe del giorno finite"' : 'title="Usa una bomba e tira colpo e danni"'}>💣 Lancia</button>
          <button class="btn-dado" data-azione="pf1-tira" data-id="${id}" data-tiro="bomba:colpo:${esc(t)}" title="Tira per colpire">🎲</button>
          <button class="btn-dado" data-azione="pf1-tira" data-id="${id}" data-tiro="bomba:danni:${esc(t)}" title="Tira i danni">🔥</button>
        </td></tr>`;
    }).join('');
    const modificatori = MODIFICATORI_BOMBA.filter((m) => a.scoperte.includes(m));
    return `<div class="bombe-borsello">
      <div class="pf-riga"><b>💣 Bombe</b>
        <span class="pf-pallini" title="Bombe usate oggi">${pallini(base.usi, usate, `data-azione="pf1-alc-bomba" data-id="${id}"`)}</span>
        <span class="muto">${Math.max(0, base.usi - usate)} su ${base.usi} rimaste oggi · colpo <b>${segno(base.colpo)}</b> (contatto a distanza, 6 m) · si recuperano con il riposo</span></div>
      <div class="bombe-tab-box"><table class="bombe-tab">
        <thead><tr><th>Bomba</th><th>Danni</th><th>Spargimento</th><th>CD</th><th>Effetto</th><th></th></tr></thead>
        <tbody>${righe}</tbody></table></div>
      ${modificatori.length ? `<p class="muto pf-aiuto">Sempre applicabili: ${esc(modificatori.join(', '))}. Una sola scoperta con asterisco (*) per bomba.</p>` : '<p class="muto pf-aiuto">Una sola scoperta con asterisco (*) per bomba. Le nuove bombe si sbloccano con le scoperte (sezione Alchimia).</p>'}
    </div>`;
  }

  function sezioneAlchimista(p, d, c) {
    const id = p.id;
    const a = datiAlchimista(d);
    const liv = livelloClasse(d, 'Alchimista');
    const razza = d.razza.nome || p.campi?.Razza || '';
    const extraTalenti = d.capacita.filter((x) => norm(x.nome || '') === norm('Scoperta Extra')).length;
    const disponibili = ESTRATTO_PERIODO(liv) + n(a.extra) + extraTalenti;
    const scelte = a.scoperte;

    // ---- Bombe ----
    const b = bombaDi(d, c);
    const tipiBomba = SCOPERTE.filter((s) => s.asterisco && scelte.includes(s.nome));
    const bombe = `<div class="alc-pannello">
        <h4>💣 Bombe <small class="muto">${b.usi} al giorno · azione standard, gittata 6 m, provoca attacchi di opportunità</small></h4>
        <div class="pf-riga"><span class="pf-pallini" title="Bombe usate oggi">${pallini(b.usi, n(a.bombeUsate), `data-azione="pf1-alc-bomba" data-id="${id}"`)}</span></div>
        <div class="pf-riga">
          ${tipiBomba.length ? `<label>Bomba <select data-pf1="alchimista|tipoBomba" data-id="${id}" data-ridisegna-pf1><option value="">Normale (fuoco)</option>${opz(tipiBomba.map((s) => [s.nome, s.nome]), b.tipo)}</select></label>` : ''}
          <span>Colpo (contatto a distanza) <b>${segno(b.colpo)}</b> <button class="btn-dado" data-azione="pf1-tira" data-id="${id}" data-tiro="bomba:colpo" title="Tira per colpire con la bomba">🎲</button></span>
          <span>Danni <b>${esc(b.danni)}</b> ${esc(b.energia)} <button class="btn-dado" data-azione="pf1-tira" data-id="${id}" data-tiro="bomba:danni" title="Tira i danni della bomba">🎲</button></span>
          <span>Spargimento <b>${b.spargimento}</b> <small class="muto">raggio ${b.raggio}, Riflessi CD ${b.cd} dimezza</small></span>
        </div>
        ${b.pref ? `<p class="muto pf-aiuto">Classe preferita: +${b.pref} ai danni delle bombe (già sommato; si sceglie nella sezione «Classe preferita»).</p>` : ''}
        ${b.tipo ? `<p class="muto pf-aiuto"><b>${esc(b.tipo)}</b>: ${esc(b.nota || scopertaDi(b.tipo)?.beneficio || '')} — CD ${b.cd}. Una sola modifica (*) per bomba.</p>` : ''}
        ${b.rapide ? '<p class="muto pf-aiuto">Bombe Rapide: con un attacco completo lanci una bomba per ogni attacco.</p>' : ''}
      </div>`;

    // ---- Mutageno / cognatogeno ----
    const mu = a.mutageno;
    const haCogn = scelte.includes('Cognatogeno');
    const tipoMu = haCogn ? mu.tipo : 'mutageno';
    const grado = gradoMutageno(a, tipoMu, d);
    const fisiche = ['FOR', 'DES', 'COS'];
    const lista = tipoMu === 'cognatogeno' ? ['INT', 'SAG', 'CAR'] : fisiche;
    const valori = [[4], [6, 4], [8, 6, 4]][grado - 1];
    const nomeMu = `${tipoMu === 'cognatogeno' ? 'Cognatogeno' : 'Mutageno'}${grado === 3 ? ' Superiore' : grado === 2 ? ' Maggiore' : ''}`;
    const sceltaCar = valori.map((v, i) => `<label>+${v} <select data-pf1="alchimista|mutageno|car|${i}" data-id="${id}" data-ridisegna-pf1 ${mu.attivo ? 'disabled title="Termina prima l\'effetto"' : ''}>${opz(lista.map((s) => [s, s]), mu.car[i])}</select></label>`).join(' ');
    const doppie = new Set(mu.car.slice(0, valori.length)).size < valori.length || mu.car.slice(0, valori.length).some((s) => !lista.includes(s));
    const mutageno = `<div class="alc-pannello${mu.attivo ? ' attivo' : ''}">
        <h4>🧪 ${esc(nomeMu)} <small class="muto">durata ${10 * liv + 10 * totaleEffettoPref(d, 'mutagenoDurata')} minuti${totaleEffettoPref(d, 'mutagenoDurata') ? ' (con la classe preferita)' : ''} · bere è un'azione standard</small></h4>
        <div class="pf-riga">
          ${haCogn ? `<label>Prepara <select data-pf1="alchimista|mutageno|tipo" data-id="${id}" data-ridisegna-pf1 ${mu.attivo ? 'disabled' : ''}>${opz([['mutageno', 'Mutageno'], ['cognatogeno', 'Cognatogeno']], tipoMu)}</select></label>` : ''}
          ${sceltaCar}
          <span class="muto">armatura naturale +${[2, 4, 6][grado - 1]}, −2 a ${esc(mu.car.slice(0, valori.length).map((s) => COPPIE_MUTAGENO[s]).join(', '))}</span>
          <button class="${mu.attivo ? '' : 'primario'}" data-azione="pf1-alc-mutageno" data-id="${id}" ${doppie && !mu.attivo ? 'disabled title="Scegli caratteristiche diverse"' : ''}>${mu.attivo ? '⏹ Fine effetto' : '🧪 Bevi'}</button>
        </div>
        ${grado > 1 && tipoMu === 'cognatogeno' ? '<p class="muto pf-aiuto">Al termine dell\'effetto: 2 danni a ogni caratteristica fisica (segnali a mano).</p>' : ''}
      </div>`;

    // ---- Scoperte ----
    const motivoNo = (s) => {
      const out = [];
      if (s.livello > liv) out.push(`livello ${s.livello}`);
      const mancano = s.richieste.filter((x) => !haScoperta(d, x));
      if (mancano.length) out.push(`richiede ${mancano.join(', ')}`);
      if (s.razza && razza && norm(razza) !== norm(s.razza)) out.push(`solo ${s.razza}`);
      else if (s.razza && !razza) out.push(`razza ${s.razza}`);
      if (s.altro) out.push(s.altro);
      return out;
    };
    const filtro = a.filtro || 'disponibili';
    const voci = SCOPERTE.filter((s) => {
      if (scelte.includes(s.nome)) return true;
      const no = motivoNo(s);
      if (filtro === 'disponibili') return !no.length || (no.length === 1 && s.altro && no[0] === s.altro);
      return filtro === 'tutte';
    }).map((s) => {
      const presa = scelte.includes(s.nome);
      const no = motivoNo(s);
      return `<label class="riv alc-scop${no.length && !presa ? ' non-ancora' : ''}${presa ? ' presa' : ''}" title="${esc(s.beneficio)}${no.length ? ' — ' + esc(no.join('; ')) : ''}">
        <input type="checkbox" ${presa ? 'checked' : ''} data-azione="pf1-scoperta" data-id="${id}" data-nome="${esc(s.nome)}">
        <span>${esc(s.nome)}${s.asterisco ? '<sup title="Modifica la bomba: non si cumula con altre *">*</sup>' : ''}
        <small class="muto">${s.livello ? 'dal ' + s.livello + '° · ' : ''}${esc(s.beneficio)}${no.length ? ` <i class="alc-no">(${esc(no.join('; '))})</i>` : ''}</small></span>
        <button class="btn-mini" data-azione="pf1-info-scoperta" data-nome="${esc(s.nome)}" title="Descrizione dal wiki">i</button></label>`;
    }).join('');
    const scopertePrese = scelte.length ? `<div class="alc-prese">${scelte.map((x) => `<span class="pf-etichetta">${esc(x)}</span>`).join(' ')}</div>` : '';
    return `${bombe}${mutageno}
      <h4>Scoperte <small class="${scelte.length > disponibili ? 'oltre' : 'muto'}">${scelte.length} / ${disponibili}</small>
        <small class="muto">una al 2° livello e ogni 2 livelli · CD delle scoperte ${b.cd}</small></h4>
      ${scopertePrese}
      <div class="pf-riga">
        <label>Mostra <select data-pf1="alchimista|filtro" data-id="${id}" data-ridisegna-pf1>${opz([['disponibili', 'Solo quelle che posso prendere'], ['tutte', 'Tutte (anche non ancora disponibili)']], filtro)}</select></label>
        <label title="Talento Scoperta Extra (contato da solo se è tra i talenti) o altre fonti">Scoperte extra <input type="number" data-pf1="alchimista|extra" data-id="${id}" data-tipo="numero" value="${esc(a.extra)}" min="0"></label>
        ${extraTalenti ? `<small class="muto">+${extraTalenti} dal talento Scoperta Extra</small>` : ''}
      </div>
      <div class="riv-griglia alc-griglia">${voci || '<p class="muto">Nessuna scoperta disponibile a questo livello.</p>'}</div>`;
  }

  // ---- Classi di prestigio: requisiti controllati sulla scheda e tabella di avanzamento ----
  const BAB_TESTO = { pieno: 'pieno (come il guerriero)', '3/4': 'medio (¾ del livello)', '1/2': 'basso (½ del livello)' };
  const TS_NOMI = { T: 'Tempra', R: 'Riflessi', V: 'Volontà' };
  // Ogni riga dei requisiti del wiki diventa uno o più controlli (stesso lettore dei prerequisiti dei talenti)
  // Requisiti scritti a parole che il lettore generico non sa controllare: verifiche fatte a mano per classe.
  // Ogni funzione restituisce true (soddisfatto), false (manca) o null (da verificare).
  const REQ_SPECIALI = {
    'Maestro del Sapere': {
      // Conoscenze (due qualsiasi) 7 gradi in ciascuna
      'Abilità': (p, d) => Object.keys(d.abil).filter((k) => /^conoscenze\s*\(/.test(norm(k)) && n(d.abil[k]?.gradi) >= 7).length >= 2,
      // Tre talenti di Metamagia o di Creazione Oggetto, più Abilità Focalizzata (una Conoscenze)
      'Talenti': (p, d) => {
        const tal = d.capacita.filter((x) => x.tipo === 'Talento' || TALENTI.talento(x.nome));
        const giusti = tal.filter((x) => (TALENTI.talento(x.nome) || TALENTI.talento(String(x.nome).replace(/\s*\(.*$/, '')))?.tipi?.some((t) => t === 'Metamagia' || t === 'Creazione Oggetto'));
        const focal = tal.some((x) => norm(x.nome).startsWith(norm('Abilità Focalizzata')) && norm(x.nome).includes('conoscenze'));
        return giusti.length >= 3 && focal;
      },
      // Sette incantesimi di Divinazione diversi, uno almeno di 3° livello
      'Incantesimi': (p, d) => {
        const div = new Map();
        // Contano gli incantesimi preparati/conosciuti e quelli scritti nel libro (mago), nel formulario o nel famiglio
        for (const inc of d.incantatori) {
          for (const s of [...(inc.incantesimi || []), ...(inc.libro || [])]) {
            const v = incantesimoDi(s.nome);
            if (v && norm(v.base) === 'divinazione') div.set(norm(v.nome), Math.max(div.get(norm(v.nome)) ?? 0, n(s.livello)));
          }
        }
        if (div.size >= 7 && [...div.values()].some((L) => L >= 3)) return true;
        // Chi prepara da tutta la lista divina (chierico, druido...) non scrive ogni incantesimo che può lanciare: da verificare
        const listaIntera = d.incantatori.some((inc) => inc.tipo !== 'spontanei' && CLASSI_DIVINE.has(nomeClasse(inc.classe)));
        return listaIntera ? null : false;
      },
    },
  };

  REQ_SPECIALI[MS_MOD] = REQ_SPECIALI['Maestro del Sapere']; // stessi requisiti
  REQ_SPECIALI['Mistificatore Arcano'] = {
    // Mano Magica e almeno un incantesimo arcano di 2° livello o superiore
    'Incantesimi': (p, d, c) => {
      const arcani = d.incantatori.filter((inc) => CLASSI_ARCANE.has(nomeClasse(inc.classe)));
      if (!arcani.length) return false;
      const secondo = arcani.some((inc) => (c.incantatori.find((x) => x.id === inc.id)?.livelli || []).some((l) => l.L >= 2 && l.base !== '' && !l.troppoAlto));
      if (!secondo) return false;
      const mano = arcani.some((inc) => [...(inc.incantesimi || []), ...(inc.libro || [])].some((s) => norm(s.nome || '') === norm('Mano Magica')));
      return mano ? true : null; // senza Mano Magica scritta nella scheda: da verificare
    },
    'Speciale': (p, d) => attaccoFurtivoDadi(d) >= 2,
  };
  REQ_SPECIALI['Mastro Chimico'] = {
    // Capacità di creare estratti di 3° livello: alchimista con estratti di 3° (dal 7° livello)
    'Incantesimi': (p, d, c) => {
      const inc = d.incantatori.find((x) => nomeClasse(x.classe) === 'Alchimista');
      const ci = inc && c.incantatori.find((x) => x.id === inc.id);
      if (ci) return ci.livelli.some((l) => l.L === 3 && l.base !== '' && !l.troppoAlto);
      return livelloClasse(d, 'Alchimista') >= 7 ? null : false;
    },
    // Mutageno come privilegio di classe (alchimista) o scoperta Mutageno Ferino / Mutageno Infuso
    'Speciale': (p, d) => livelloClasse(d, 'Alchimista') > 0 || haScoperta(d, 'Mutageno Ferino') || haScoperta(d, 'Mutageno Infuso'),
  };

  function requisitiPrestigio(nome, p, d, c) {
    const v = PRESTIGIO[nome];
    return v.requisiti.map(([et, val], i) => {
      const speciale = REQ_SPECIALI[nome]?.[et];
      if (speciale) return { etichetta: et, testo: val, esito: speciale(p, d, c) };
      let atomi;
      if (/attacco base|^bab$/i.test(et)) atomi = [{ alt: [{ k: 'bab', v: +(val.match(/\d+/)?.[0] || 0) }] }];
      else if (/^allineamento/i.test(et)) atomi = [{ alt: [{ k: 'allin', testo: norm(val.replace(/\.$/, '')) }] }];
      else atomi = TALENTI.requisiti({ nome: `prestigio:${nome}:${i}`, tipi: [], prerequisiti: val.replace(/\.$/, '') });
      const esiti = atomi.map((r) => {
        const e = r.alt.map((a) => verificaAtomo(a, p, d, c));
        return e.includes(true) ? true : e.every((x) => x === false) ? false : null;
      });
      const esito = !esiti.length ? null : esiti.includes(false) ? false : esiti.includes(null) ? null : true;
      return { etichetta: et, testo: val, esito };
    });
  }
  const statoPrestigio = (req) => (req.some((r) => r.esito === false) ? 'no' : req.some((r) => r.esito === null) ? 'forse' : 'ok');
  const ICONA_REQ = { true: '✓', false: '✗', null: '?' };

  function sezionePrestigio(p, d, c) {
    const id = p.id;
    const st = d.prestigio;
    const nomi = Object.keys(PRESTIGIO).sort((a, b) => a.localeCompare(b, 'it'));
    if (!nomi.length) return '<p class="muto">Dati delle classi di prestigio non caricati.</p>';
    const stati = Object.fromEntries(nomi.map((x) => [x, statoPrestigio(requisitiPrestigio(x, p, d, c))]));
    const conta = (s) => nomi.filter((x) => stati[x] === s).length;
    const filtro = st.filtro || 'tutte';
    const visibili = nomi.filter((x) => filtro === 'tutte' || (filtro === 'possibili' ? stati[x] !== 'no' : stati[x] === 'ok'));
    const etichette = { ok: 'requisiti soddisfatti', forse: 'alcuni requisiti da verificare', no: 'manca qualche requisito' };
    const chips = visibili.map((x) => {
      const liv = livelloClasse(d, x);
      return `<button class="pres-chip ${stati[x]}${st.vista === x ? ' scelta' : ''}" data-azione="pf1-prestigio-vedi" data-id="${id}" data-nome="${esc(x)}" title="${esc(etichette[stati[x]])}">
        ${ICONA_REQ[stati[x] === 'ok' ? 'true' : stati[x] === 'no' ? 'false' : 'null']} ${esc(x)}${liv ? ` <b>(${liv}°)</b>` : ''}</button>`;
    }).join('');
    const testa = `<p class="muto pf-aiuto">Le classi di prestigio si prendono salendo di livello, quando si soddisfano tutti i requisiti.
        I livelli di prestigio non danno il bonus della classe preferita. Clicca una classe per vedere requisiti e avanzamento.</p>
      <div class="pf-riga">
        <label>Mostra <select data-pf1="prestigio|filtro" data-id="${id}" data-ridisegna-pf1>${opz([['tutte', `Tutte (${nomi.length})`], ['possibili', `Accessibili o da verificare (${conta('ok') + conta('forse')})`], ['ok', `Solo con requisiti soddisfatti (${conta('ok')})`]], filtro)}</select></label>
        <span class="muto"><span class="pres-leg ok">✓ soddisfatti</span> <span class="pres-leg forse">? da verificare</span> <span class="pres-leg no">✗ mancanti</span></span>
      </div>
      <div class="pres-griglia">${chips || '<p class="muto">Nessuna classe di prestigio con questo filtro.</p>'}</div>`;
    const x = st.vista && PRESTIGIO[st.vista];
    if (!x) return testa;

    // ---- Scheda della classe scelta ----
    const nome = st.vista;
    const req = requisitiPrestigio(nome, p, d, c);
    const stato = statoPrestigio(req);
    const livAtt = livelloClasse(d, nome);
    const righeReq = req.map((r) => `<li class="pres-req ${r.esito === true ? 'ok' : r.esito === false ? 'no' : 'forse'}">
        <span class="pres-icona">${ICONA_REQ[r.esito]}</span><b>${esc(r.etichetta)}:</b> ${esc(r.testo)}</li>`).join('');
    const colonne = ['Liv.', 'BAB', 'Tempra', 'Riflessi', 'Volontà', ...x.colonne];
    const tabella = `<div class="pres-tab-box"><table class="pres-tab">
        <thead><tr>${colonne.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${x.righe.map((r, i) => `<tr class="${i + 1 === livAtt ? 'attuale' : i + 1 < livAtt ? 'fatto' : ''}"><td>${i + 1}°</td>${r.map((v) => `<td>${esc(v || '—')}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
    const tsBuoni = x.ts.split('').map((s) => TS_NOMI[s]).join(', ') || 'nessuno';
    const bottone = livAtt
      ? `<button class="primario" data-azione="pf1-prestigio-prendi" data-id="${id}" data-nome="${esc(nome)}">⬆ Sali al ${livAtt + 1}° livello da ${esc(nome)}</button>`
      : `<button class="primario" data-azione="pf1-prestigio-prendi" data-id="${id}" data-nome="${esc(nome)}" ${stato === 'no' ? 'disabled title="Mancano dei requisiti (✗)"' : ''}>⬆ Prendi il 1° livello da ${esc(nome)}</button>`;
    return `${testa}
      <div class="pres-scheda">
        <div class="pf-riga pres-titolo"><h3>${esc(nome)}</h3>
          <span class="pres-stato ${stato}">${esc(etichette[stato])}</span>
          ${livAtt ? `<span class="pf-etichetta">livello attuale ${livAtt}</span>` : ''}
          <button class="btn-piccolo" data-azione="pf1-prestigio-info" data-nome="${esc(nome)}">📖 Descrizione dal wiki</button>
          <button class="btn-x" data-azione="pf1-prestigio-vedi" data-id="${id}" data-nome="" title="Chiudi">×</button></div>
        <div class="fede-righe">
          <div><span class="muto">Dado vita</span> d${x.dv || '?'} · <span class="muto">BAB</span> ${esc(BAB_TESTO[x.bab] || x.bab)} · <span class="muto">TS buoni</span> ${esc(tsBuoni)} · <span class="muto">Gradi per livello</span> ${x.gradi || '?'} + INT</div>
          <div><span class="muto">Abilità di classe</span> ${esc(x.abil.map((a) => (a === '*K' ? 'Conoscenze (tutte)' : a)).join(', '))}</div>
          ${x.fonte ? `<div><span class="muto">Fonte</span> ${esc(x.fonte)}</div>` : ''}
          ${x.nota ? `<div class="pres-nota">✦ ${esc(x.nota)}</div>` : ''}
        </div>
        <h4>Requisiti</h4>
        <ul class="pres-reqs">${righeReq}</ul>
        ${stato === 'forse' ? '<p class="muto pf-aiuto">«?» = requisito che la scheda non può controllare da sola (allineamento, privilegi, linguaggi, condizioni speciali): verificalo con il master.</p>' : ''}
        <h4>Avanzamento (10 livelli)</h4>
        ${tabella}
        <div class="pf-piede">${bottone}</div>
      </div>`;
  }

  // ---- Officina: oggetti magici creati da giocatori o master ----
  // Regole dal wiki: «Creare Oggetti Magici» (tabella del valore in mo) e «Durezza» (durezza e PF di sostanze, armi, scudi, armature).
  const CAP_MAGICHE = window.PF1_CAPACITA_MAGICHE || { mischia: [], distanza: [], munizioni: [], armatura: [], scudo: [] };
  const CATEGORIE_OGG = [
    ['arma', 'Arma'], ['munizioni', 'Munizioni'], ['armatura', 'Armatura'], ['scudo', 'Scudo'], ['anello', 'Anello'],
    ['bacchetta', 'Bacchetta'], ['bastone', 'Bastone'], ['verga', 'Verga'], ['pozione', 'Pozione'], ['pergamena', 'Pergamena'],
    ['meraviglioso', 'Oggetto meraviglioso'], ['altro', 'Altro'],
  ];
  const RARITA_OGG = [['normale', 'Oggetto normale (non magico)'], ['magico', 'Oggetto magico'], ['minore', 'Artefatto minore'], ['maggiore', 'Artefatto maggiore']];
  // Durezza e PF per 2,5 cm di spessore
  const SOSTANZE = { 'Carta o stoffa': [0, 2], Corda: [0, 2], Vetro: [1, 1], Ghiaccio: [0, 3], 'Cuoio o pelle': [2, 5], Legno: [5, 10], Pietra: [8, 15], 'Ferro o acciaio': [10, 30], Mithral: [15, 30], Adamantio: [20, 40] };
  // Armi e scudi comuni (taglia Media): [durezza, PF]
  const FORME_ARMA = { 'Lama leggera': [10, 2], 'Lama a una mano': [10, 5], 'Lama a due mani': [10, 10], 'Arma leggera con impugnatura di metallo': [10, 10], 'Arma a una mano con impugnatura di metallo': [10, 20], 'Arma leggera con impugnatura': [5, 2], 'Arma a una mano con impugnatura': [5, 5], 'Arma a due mani con impugnatura': [5, 10], 'Arma da tiro': [5, 5] };
  const FORME_SCUDO = { Buckler: [10, 5], 'Scudo leggero di legno': [5, 7], 'Scudo pesante di legno': [5, 15], 'Scudo leggero di metallo': [10, 10], 'Scudo pesante di metallo': [10, 20], 'Scudo torre': [5, 20] };
  const ORDINE_TAGLIE = ['Piccolissima', 'Minuta', 'Minuscola', 'Piccola', 'Media', 'Grande', 'Enorme', 'Mastodontica', 'Colossale'];
  // Attivazione dei poteri: fattore × livello incantesimo × LI
  const ATTIVAZIONI = [['continuo', 'Continuo o ad uso', 2000], ['comando', 'Parola di comando', 1800], ['cariche', '50 cariche (attivazione)', 750], ['uso', 'Uso singolo, ad uso (pozione)', 50], ['completamento', 'Uso singolo, completamento (pergamena)', 25]];
  const DURATE_POTERE = [['', 'durata normale'], ['round', 'in round (×4)'], ['1min', '1 min/livello (×2)'], ['10min', '10 min/livello (×1,5)'], ['24h', '24 ore o più (×½)']];
  const NUOVA_CREAZIONE = () => ({
    id: uid(), nome: '', categoria: 'meraviglioso', rarita: 'magico', li: '', livelloCreazione: '', creatore: '',
    potenziamento: '', capacita: [], poteri: [], effetti: [], slot: true, richiedeAbilita: false, richiedeClasse: false,
    prezzoBase: '', prezzoManuale: '', componenti: '', peso: '', bonusBase: '', forma: '', sostanza: '', spessore: '', taglia: 'Media',
    pfAttuali: '', note: '', collegato: '',
  });
  const capacitaPer = (cat, x) => (cat === 'arma' ? (x.distanza ? CAP_MAGICHE.distanza : CAP_MAGICHE.mischia) : cat === 'munizioni' ? CAP_MAGICHE.munizioni : cat === 'armatura' ? CAP_MAGICHE.armatura : cat === 'scudo' ? CAP_MAGICHE.scudo : []);
  const fmtMo = (v) => `${Math.round(v).toLocaleString('it-IT')} mo`;
  const LIV_INC = (v) => (n(v) === 0 && String(v).trim() === '0' ? 0.5 : n(v)); // gli incantesimi di livello 0 valgono metà

  // Prezzo di un effetto della scheda secondo la tabella del wiki
  function prezzoEffetto(e) {
    const b = Math.abs(n(e.valore));
    if (!b) return 0;
    const t = e.tipo || 'senza tipo';
    if (CARS.includes(e.bersaglio) && t === 'potenziamento') return b * b * 1000;
    if (e.bersaglio === 'ca') {
      if (t === 'deviazione') return b * b * 2000;
      if (t === 'potenziamento arm. naturale' || t === 'armatura naturale') return b * b * 2000;
      if (t === 'armatura') return b * b * 1000;
      return b * b * 2500;
    }
    if (['ts', 'tempra', 'riflessi', 'volonta'].includes(e.bersaglio)) return b * b * (t === 'resistenza' ? 1000 : 2000);
    if (e.bersaglio === 'abilita' || String(e.bersaglio).startsWith('abil:')) return b * b * 100;
    if (e.bersaglio === 'colpire' || e.bersaglio === 'danni') return b * b * 2000;
    return b * b * 2000;
  }
  function prezzoPotere(pw, li) {
    const att = ATTIVAZIONI.find((a) => a[0] === pw.attivazione) || ATTIVAZIONI[0];
    let v = LIV_INC(pw.livInc) * Math.max(1, n(li)) * att[2];
    if (pw.attivazione === 'continuo') v *= { round: 4, '1min': 2, '10min': 1.5, '24h': 0.5 }[pw.durata] || 1;
    // Cariche al giorno: dividere per (5 / cariche)
    const cg = n(pw.cariche);
    if (['continuo', 'comando'].includes(pw.attivazione) && cg > 0 && cg < 5) v /= 5 / cg;
    if (pw.attivazione === 'cariche' && cg > 0 && cg !== 50) v *= cg / 50;
    return v + n(pw.componente) * (pw.attivazione === 'cariche' ? Math.max(1, cg || 50) : pw.attivazione === 'continuo' ? 100 : 1);
  }

  // Valori calcolati dell'oggetto creato: bonus totale, LI minimo, prezzo, costo di creazione, durezza, PF, TS
  function calcolaCreazione(x) {
    const cat = x.categoria;
    // Potenziamento massimo +5; solo gli artefatti arrivano a +6
    const artefatto = x.rarita === 'minore' || x.rarita === 'maggiore';
    const pot = Math.max(0, Math.min(artefatto ? 6 : 5, n(x.potenziamento)));
    const caps = (x.capacita || []).map((nome) => capacitaPer(cat, x).find((c) => c[0] === nome)).filter(Boolean);
    const bonusCap = caps.reduce((a, c) => a + c[1], 0);
    const fissoCap = caps.reduce((a, c) => a + c[2], 0);
    const bonusTot = pot + bonusCap;
    const armaArmatura = ['arma', 'munizioni', 'armatura', 'scudo'].includes(cat);
    const avvisi = [];
    if (!artefatto && n(x.potenziamento) > 5) avvisi.push('Il potenziamento +6 è riservato agli artefatti: per un oggetto magico vale al massimo +5.');
    if (armaArmatura && !artefatto && bonusTot > 10) avvisi.push('Il bonus totale (potenziamento + capacità) non può superare +10.');
    if (armaArmatura && bonusCap > 0 && pot < 1) avvisi.push('Le capacità speciali richiedono almeno un potenziamento +1.');
    let prezzo = 0;
    let nonMagico = 0; // parte del prezzo che si paga per intero anche nella creazione (oggetto base, qualità perfetta)
    let dettaglio = [];
    if (x.rarita === 'normale') {
      prezzo = n(x.prezzoBase);
    } else if (armaArmatura) {
      const perfetta = cat === 'arma' ? 300 : cat === 'munizioni' ? 6 : 150;
      const molt = cat === 'arma' || cat === 'munizioni' ? 2000 : 1000;
      const magia = bonusTot * bonusTot * molt + fissoCap;
      prezzo = n(x.prezzoBase) + perfetta + magia;
      nonMagico = n(x.prezzoBase) + perfetta;
      dettaglio = [`base ${fmtMo(n(x.prezzoBase))}`, `perfett${cat === 'arma' ? 'a' : 'o'} ${fmtMo(perfetta)}`, `bonus +${bonusTot}² × ${molt.toLocaleString('it-IT')} = ${fmtMo(bonusTot * bonusTot * molt)}`, fissoCap ? `capacità a prezzo fisso ${fmtMo(fissoCap)}` : ''];
      if (cat === 'munizioni') dettaglio.push('prezzo per 50 munizioni');
    } else if (['pozione', 'pergamena', 'bacchetta'].includes(cat)) {
      const pw = x.poteri[0] || {};
      const fatt = { pozione: 50, pergamena: 25, bacchetta: 750 }[cat];
      prezzo = LIV_INC(pw.livInc) * Math.max(1, n(x.li)) * fatt + n(pw.componente) * (cat === 'bacchetta' ? 50 : 1);
      dettaglio = [`livello incantesimo ${pw.livInc || '?'} × LI ${x.li || '?'} × ${fatt}`];
      if (!x.poteri.length) avvisi.push(`Aggiungi l'incantesimo ${cat === 'pozione' ? 'della pozione' : cat === 'pergamena' ? 'della pergamena' : 'della bacchetta'} tra i poteri.`);
    } else {
      // Effetti con bonus + poteri: si sommano; negli oggetti con slot ogni capacità in più costa +50%, senza slot tutto ×2
      const voci = [...(x.effetti || []).map(prezzoEffetto), ...(x.poteri || []).map((pw) => prezzoPotere(pw, x.li))].filter((v) => v > 0).sort((a, b) => b - a);
      prezzo = voci.reduce((a, v, i) => a + (i === 0 || !x.slot ? v : v * 1.5), 0);
      if (!x.slot) prezzo *= 2;
      prezzo += n(x.prezzoBase);
      nonMagico = n(x.prezzoBase);
      dettaglio = voci.length ? [`${voci.length} capacità${x.slot ? (voci.length > 1 ? ' (le aggiuntive +50%)' : '') : ' · senza slot ×2'}`] : [];
      if (cat === 'bastone') avvisi.push('I bastoni seguono le formule solo in parte: controlla il prezzo con il master.');
    }
    if (!artefatto && x.rarita !== 'normale') {
      if (x.richiedeAbilita) { prezzo *= 0.9; dettaglio.push('richiede un\'abilità −10%'); }
      if (x.richiedeClasse) { prezzo *= 0.7; dettaglio.push('richiede classe/allineamento −30%'); }
    }
    if (x.prezzoManuale !== '' && x.prezzoManuale != null) { prezzo = n(x.prezzoManuale); dettaglio = ['prezzo deciso a mano']; }
    // Costo di creazione: metà della parte magica + per intero l'oggetto base, la qualità perfetta e le componenti
    const base = Math.min(nonMagico, prezzo);
    const costo = x.rarita === 'normale' ? prezzo : (prezzo - base) / 2 + base + n(x.componenti);
    // LI minimo: armi e armature 3 × bonus di potenziamento (consiglio, si può scrivere a mano)
    const liMin = armaArmatura ? 3 * bonusTot : 0;

    // Durezza e punti ferita
    const molTaglia = 2 ** (ORDINE_TAGLIE.indexOf(x.taglia || 'Media') - 4);
    let durezza = null;
    let pf = null;
    let origine = '';
    if (cat === 'arma' && FORME_ARMA[x.forma]) { [durezza, pf] = FORME_ARMA[x.forma]; origine = x.forma; } else if (cat === 'scudo' && FORME_SCUDO[x.forma]) { [durezza, pf] = FORME_SCUDO[x.forma]; origine = x.forma; } else if (cat === 'armatura') {
      durezza = SOSTANZE[x.sostanza]?.[0] ?? null;
      pf = n(x.bonusBase) * 5;
      origine = `bonus armatura ${n(x.bonusBase)} × 5`;
    } else if (SOSTANZE[x.sostanza]) {
      const sp = Math.max(0.5, n(x.spessore) || 2.5);
      durezza = SOSTANZE[x.sostanza][0];
      pf = Math.max(1, Math.round(SOSTANZE[x.sostanza][1] * sp / 2.5));
      origine = `${x.sostanza}, ${String(sp).replace('.', ',')} cm`;
    }
    // Una sostanza scelta per armi e scudi ne cambia la durezza (es. legno 5, mithral 15, adamantio 20)
    if ((cat === 'arma' || cat === 'scudo') && SOSTANZE[x.sostanza] && durezza != null) durezza = SOSTANZE[x.sostanza][0];
    if (pf != null && cat !== 'armatura') pf = Math.max(1, Math.round(pf * molTaglia));
    if (armaArmatura && pot && durezza != null) { durezza += 2 * pot; pf += 10 * pot; }
    const ts = x.rarita !== 'normale' && n(x.li) ? 2 + Math.floor(n(x.li) / 2) : null;
    const pfAtt = x.pfAttuali === '' || x.pfAttuali == null ? pf : n(x.pfAttuali);
    const stato = artefatto ? 'indistruttibile' : pf == null ? '' : pfAtt <= 0 ? 'distrutto' : pfAtt <= pf / 2 ? 'rotto' : 'integro';
    return { pot, bonusCap, bonusTot, caps, prezzo, costo, dettaglio: dettaglio.filter(Boolean), avvisi, liMin, durezza, pf, pfAtt, origine, ts, stato, artefatto };
  }

  // Oggetti che crescono con il livello del personaggio (reliquie): righe raggiunte e prossima
  const livelloPersonaggio = (d) => d.classi.reduce((a, cl) => a + n(cl.livello), 0);
  function poteriCrescita(d, x) {
    const liv = livelloPersonaggio(d);
    const righe = (x.livelli || []).filter((r) => n(r.livello)).slice().sort((a, b) => n(a.livello) - n(b.livello));
    return { liv, attivi: righe.filter((r) => n(r.livello) <= liv), prossimi: righe.filter((r) => n(r.livello) > liv) };
  }
  const testoRiga = (r) => [r.testo, r.bersaglio && n(r.valore) ? `${n(r.valore) > 0 ? '+' : ''}${n(r.valore)} ${(BERSAGLI.find((b) => b[0] === r.bersaglio)?.[1] || r.bersaglio.replace(/^abil:/, '')).toLowerCase()}${r.tipo && r.tipo !== 'senza tipo' ? ` (${r.tipo})` : ''}` : '',
    n(r.resistenza) && ENERGIE.some(([k]) => r['en_' + k]) ? `resistenza ${ENERGIE.filter(([k]) => r['en_' + k]).map(([, nome]) => nome.toLowerCase()).join(', ')} ${n(r.resistenza)}` : ''].filter(Boolean).join(' · ') || '—';
  // Riassunto per la scheda: poteri attivi (il più alto di ogni bonus dello stesso tipo vale da solo) e prossimo potere
  function riassuntoCrescita(d, x) {
    if (!x?.crescita || !(x.livelli || []).length) return '';
    const { liv, attivi, prossimi } = poteriCrescita(d, x);
    const testi = attivi.filter((r) => r.testo && !(r.bersaglio && n(r.valore)) && !n(r.resistenza)).map((r) => r.testo);
    return `<div class="off-crescita-riassunto"><span class="muto">Al ${liv}° livello:</span> ${attivi.length ? esc([...new Set(testi)].join(', ') || 'bonus e resistenze attivi sulla scheda') : 'nessun potere ancora'}${prossimi[0] ? ` <span class="muto">· prossimo al ${n(prossimi[0].livello)}°: ${esc(testoRiga(prossimi[0]))}</span>` : ''}</div>`;
  }

  // Tiene allineata la voce della scheda (arma, armatura/scudo o oggetto) all'oggetto creato
  function sincronizzaCreazione(d, x) {
    const cv = calcolaCreazione(x);
    const nome = x.nome || 'Oggetto senza nome';
    const togliCollegato = () => {
      if (!x.collegato) return;
      d.armi = d.armi.filter((a) => a.id !== x.collegato);
      d.armature = d.armature.filter((a) => a.id !== x.collegato);
      const o = d.oggetti.find((y) => y.id === x.collegato);
      if (o?.bonusId) d.bonus = d.bonus.filter((b) => b.id !== o.bonusId);
      d.oggetti = d.oggetti.filter((y) => y.id !== x.collegato);
      x.collegato = '';
    };
    const lista = x.categoria === 'arma' ? 'armi' : ['armatura', 'scudo'].includes(x.categoria) ? 'armature' : 'oggetti';
    let voce = x.collegato ? d[lista].find((y) => y.id === x.collegato) : null;
    if (x.collegato && !voce) togliCollegato(); // ha cambiato categoria: si ricrea nella lista giusta
    if (!voce) {
      voce = { ...NUOVI[lista](), creazioneId: x.id };
      if (lista === 'oggetti') voce.dove = x.slot && x.rarita !== 'normale' ? 'indossato' : 'zaino';
      d[lista].push(voce);
      x.collegato = voce.id;
    }
    voce.nome = nome;
    voce.creazioneId = x.id;
    if (x.peso !== '' && x.peso != null) voce.peso = n(x.peso);
    const mat = { Mithral: 'Mithral', Adamantio: 'Adamantio' }[x.sostanza] || '';
    if (lista === 'armi') {
      voce.potenziamento = cv.pot ? String(cv.pot) : '';
      voce.perfetta = x.rarita !== 'normale';
      if (mat) voce.materiale = mat;
      voce.tipo = x.distanza ? 'distanza' : voce.tipo || 'mischia';
    } else if (lista === 'armature') {
      voce.tipo = x.categoria === 'scudo' ? 'scudo' : 'armatura';
      if (x.bonusBase !== '' && x.bonusBase != null) voce.bonus = n(x.bonusBase);
      voce.potenziamento = cv.pot ? String(cv.pot) : '';
      voce.perfetta = x.rarita !== 'normale';
      if (mat) voce.materiale = mat;
    } else {
      voce.note = [CATEGORIE_OGG.find((c) => c[0] === x.categoria)?.[1], RARITA_OGG.find((r) => r[0] === x.rarita)?.[1]].filter(Boolean).join(' · ');
      // Effetti sulla scheda: un bonus collegato, attivo se l'oggetto è indossato
      const eff = [...(x.effetti || []).filter((e) => e.bersaglio && n(e.valore)),
        ...(x.crescita ? (x.livelli || []).filter((r) => r.bersaglio && n(r.valore)).map((r) => ({ id: r.id, bersaglio: r.bersaglio, valore: r.valore, tipo: r.tipo, livMin: n(r.livello) })) : [])];
      let b = voce.bonusId ? d.bonus.find((y) => y.id === voce.bonusId) : null;
      if (eff.length) {
        if (!b) { b = { id: uid(), nome, attivo: (voce.dove || 'indossato') === 'indossato', effetti: [] }; d.bonus.push(b); voce.bonusId = b.id; }
        b.nome = nome;
        b.effetti = eff.map((e) => ({ id: e.id || uid(), bersaglio: e.bersaglio, valore: n(e.valore), tipo: e.tipo || 'senza tipo', ...(e.livMin ? { livMin: e.livMin } : {}) }));
      } else if (b) { d.bonus = d.bonus.filter((y) => y.id !== b.id); voce.bonusId = ''; }
    }
  }

  let officinaAperta = null; // id dell'oggetto creato aperto nell'editor
  // =====================================================================
  // Eroi mitici (wiki «Eroi Mitici» e «Mitici/<Percorso>»; dati in src/pf1-mitici.js)
  // =====================================================================
  const MITICI = window.PF1_MITICI || { universali: [], percorsi: {} };
  // Capacità mitiche base, categoria per categoria (riassunto delle regole; il testo completo si legge dal wiki)
  const BASE_MITICHE = [
    [1, 'Duro da Uccidere', 'Str', 'sotto 0 PF si stabilizza da solo; muore solo a PF negativi pari al doppio della COS'],
    [1, 'Impulso', 'Sop', '1 uso del potere mitico: aggiunge il dado di impulso a un d20 appena tirato (azione immediata)'],
    [1, 'Potere Mitico', 'Sop', 'usi al giorno pari a 3 + 2 × categoria'],
    [2, 'Iniziativa Incredibile', 'Str', '+categoria all\'Iniziativa; 1 uso (azione gratuita): un\'azione standard in più nel turno, non per lanciare incantesimi, massimo 1 per round'],
    [3, 'Recupero', 'Str', 'PF al massimo dopo 8 ore di riposo; 1 uso + 1 ora di riposo: metà dei PF massimi e i privilegi a usi giornalieri (non il potere mitico)'],
    [4, 'Impulso +1d8', 'Sop', 'il dado di impulso diventa 1d8'],
    [5, 'Tiri Salvezza Mitici', 'Str', 'un TS superato contro un effetto non mitico annulla anche gli effetti parziali'],
    [6, 'Forza di Volontà', 'Str', '1 uso (azione immediata): ritira un tuo d20 o fa ritirare un d20 a una creatura non mitica; vale il secondo risultato'],
    [7, 'Impulso +1d10', 'Sop', 'il dado di impulso diventa 1d10'],
    [8, 'Inarrestabile', 'Str', '1 uso (azione gratuita, anche a inizio turno): termina una condizione come accecato, confuso, nauseato, paralizzato, spaventato, stordito…'],
    [9, 'Immortale', 'Sop', 'se ucciso torna in vita dopo 24 ore, salvo colpo di grazia o critico di una creatura mitica (al 10° solo con un artefatto)'],
    [10, 'Eroe Leggendario', 'Sop', 'recupera 1 uso del potere mitico ogni ora; impulso 1d12'],
  ];
  // Titolo della sezione sul wiki (gli impulsi potenziati sono descritti in «Impulso»)
  const titoloBase = (nome) => nome.replace(/ \+1d\d+$/, '');
  const CAT_CAR = [2, 4, 6, 8, 10]; // +2 a una caratteristica
  const CIMENTI = [0, 0, 1, 2, 2, 3, 3, 4, 4, 5, 5]; // cimenti per raggiungere la categoria (indice = categoria)
  const paginaPercorso = (nome) => `Mitici/${nome}`;
  // Talento Doppio Percorso (Mitico): un secondo percorso, con il suo privilegio di 1° categoria e le sue capacità
  const haDoppioPercorso = (d) => d.capacita.some((x) => /^doppio percorso\b/.test(norm(x.nome || '')));
  const secondoPercorso = (d) => (haDoppioPercorso(d) && MITICI.percorsi[d.mitico.percorso2] && d.mitico.percorso2 !== d.mitico.percorso ? d.mitico.percorso2 : '');
  const percorsiDi = (d) => [d.mitico.percorso, secondoPercorso(d)].filter((x) => MITICI.percorsi[x]);
  // Capacità per nome: nei percorsi del personaggio (quello principale e l'eventuale secondo) o tra le universali
  const capacitaMitica = (percorsi, nome) => [].concat(percorsi).map((k) => (MITICI.percorsi[k]?.capacita || []).find((x) => x.nome === nome)).find(Boolean)
    || MITICI.universali.find((x) => x.nome === nome) || null;
  // Pagina del wiki di una capacità: quella del percorso che la contiene (o la pagina generale per le universali)
  const paginaCapacita = (percorsi, nome) => {
    const k = [].concat(percorsi).find((x) => (MITICI.percorsi[x]?.capacita || []).some((c) => c.nome === nome) || MITICI.percorsi[x]?.primo?.opzioni.some((o) => o.nome === nome) || MITICI.percorsi[x]?.decimo?.nome === nome);
    return k ? paginaPercorso(k) : 'Eroi_Mitici';
  };
  const universale = (nome) => MITICI.universali.some((x) => x.nome === nome);
  const quanteScelte = (d, nome) => (d.mitico.scelte || []).filter((x) => x.nome === nome).length;
  // Quante volte si può prendere una capacità alla categoria attuale
  function limiteMitica(x, g) {
    if (x.nome === 'Talento Mitico Extra') return Math.max(1, Math.floor(g / 2));
    if (x.nome === 'Oggetto Leggendario') return 1 + (g >= 3 ? 1 : 0) + (g >= 6 ? 1 : 0);
    if (x.nome === 'Fonte Divina') return 1 + (g >= 6 ? 1 : 0) + (g >= 9 ? 1 : 0);
    return x.volte >= 99 ? 10 : x.volte;
  }
  const talentoMitico = (x) => /\(Mitico\)\s*$/i.test(x.nome || '') || !!TALENTI.talento(x.nome)?.tipi?.includes('Mitico');
  // Riassunto numerico del mitico (usato da calcola e dalla sezione)
  function datiMitici(d) {
    const m = d.mitico;
    const g = Math.max(0, Math.min(10, n(m.grado)));
    const conta = (nome) => (m.scelte || []).filter((x) => x.nome === nome).length;
    return {
      g,
      max: g > 0 ? 3 + 2 * g + 2 * conta('Potere Mitico Extra') : 0,
      impeto: g >= 10 ? '1d12' : g >= 7 ? '1d10' : g >= 4 ? '1d8' : '1d6',
      capacitaDovute: g, // una capacità di percorso per categoria
      talentiDovuti: Math.ceil(g / 2) + conta('Talento Mitico Extra'),
      incMitici: g * conta('Incantesimi Mitici'),
    };
  }
  // Effetti sulla scheda: +2 alle caratteristiche (2°, 4°… e Potenziare Caratteristica), Iniziativa Incredibile
  function effettiMitici(d) {
    const m = d.mitico;
    const g = Math.max(0, Math.min(10, n(m.grado)));
    if (!g) return [];
    const out = [];
    for (const cat of CAT_CAR) if (cat <= g && CARS.includes(m.car?.[cat])) out.push({ ...E(m.car[cat], 2), fonte: `Categoria mitica ${cat}°` });
    (m.scelte || []).filter((x) => x.nome === 'Potenziare Caratteristica' && CARS.includes(x.car)).forEach((x, i) => out.push({ ...E(x.car, 2), fonte: `Potenziare Caratteristica ${i + 1}` }));
    if (g >= 2) out.push({ ...E('iniz', g), fonte: 'Iniziativa Incredibile (mitico)' });
    return out;
  }
  // Testo di una capacità dal wiki: la sezione con quel titolo, o la voce di elenco che inizia con quel nome
  const estraiMitica = (nome) => (doc) => {
    const c = doc.querySelector('#mw-content-text .mw-parser-output') || doc.querySelector('#mw-content-text');
    const chiave = norm(nome);
    const testa = (el) => (/^H[1-6]$/.test(el.tagName) ? el : el.classList?.contains('mw-heading') ? el.querySelector('h1,h2,h3,h4,h5,h6') : null);
    const tit = (h) => norm((h.querySelector('.mw-headline')?.textContent || h.textContent).replace(/\[modifica.*$/i, '').replace(/\s*\([^)]*\)\s*$/, ''));
    const figli = [...(c?.children || [])];
    const i = figli.findIndex((el) => { const h = testa(el); return h && tit(h) === chiave; });
    if (i >= 0) {
      const liv = Number(testa(figli[i]).tagName[1]);
      const out = [];
      for (const el of figli.slice(i + 1)) {
        const h = testa(el);
        if (h && Number(h.tagName[1]) <= liv) break;
        if (el.tagName === 'TABLE' || el.classList.contains('golarion-box')) continue;
        const t = el.textContent.replace(/\[modifica[^\]]*\]/gi, '').replace(/[ \t\r]+/g, ' ').trim();
        if (t) out.push(h ? `— ${t} —` : t);
      }
      return out.join('\n\n');
    }
    const li = [...(c?.querySelectorAll('li') || [])].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).find((t) => norm(t).startsWith(chiave + ' (') || norm(t).startsWith(chiave + ':'));
    return li || '';
  };
  const TIPI_MIT = { Str: 'Straordinaria (Str)', Sop: 'Soprannaturale (Sop)', Mag: 'Magica (Mag)' };
  const infoMitica = (nome, pagina, tipo) => `<button class="btn-mini" data-azione="pf1-mit-info" data-nome="${esc(nome)}" data-pagina="${esc(pagina)}" data-tipo="${esc(tipo || '')}" title="Descrizione dal wiki">i</button>`;

  function sezioneMitica(p, d, c) {
    const id = p.id;
    const m = d.mitico;
    const dm = datiMitici(d);
    const g = dm.g;
    const per = MITICI.percorsi[m.percorso];
    const pagina = m.percorso ? paginaPercorso(m.percorso) : '';
    const { num, sel } = aiutanti(p, c);
    const testa = `<div class="pf-riga">
        <label>Categoria mitica ${num('mitico|grado', m.grado, 'min="0" max="10" data-ridisegna-pf1')}</label>
        <label>Percorso ${sel('mitico|percorso', [['', '—'], ...PERCORSI.map((x) => [x, x])], m.percorso, 'data-ridisegna-pf1')}</label>
        ${m.percorso ? `${infoMitica(m.percorso, pagina, '')}<span class="muto">+${PF_MITICI[m.percorso]} PF per categoria (+${g * PF_MITICI[m.percorso]} ora)</span>` : ''}
      </div>`;
    if (!g) return `${testa}<p class="muto pf-aiuto">Un personaggio diventa mitico al momento dell'ascensione (lo decide il GM): sceglie un percorso e ottiene la 1° categoria. Le categorie successive si raggiungono completando i cimenti.</p>${pannelloCimenti(p, d, dm)}`;

    // ---- Potere mitico e impulso ----
    const potere = `<div class="pf-riga mit-potere"><span>Potere mitico <b>${dm.max}</b> al giorno</span><span class="pf-pallini">${pallMitici(p, c)}</span>
        <span>Impulso <b>${dm.impeto}</b> ${`<button class="btn-dado" data-azione="pf1-tira" data-id="${id}" data-tiro="impeto" title="Tira: Impulso">🎲</button>`}</span>
        <span class="muto">Duro da uccidere: muore a <b>−${2 * (c.punteggio.COS ?? 10)}</b> PF</span>
        ${g >= 2 ? `<span class="muto">Iniziativa +${g} (già sommata)</span>` : ''}</div>`;

    // ---- Capacità base, categoria per categoria ----
    const righeBase = Array.from({ length: 10 }, (_, i) => {
      const cat = i + 1;
      const voci = BASE_MITICHE.filter((b) => b[0] === cat);
      const carSel = CAT_CAR.includes(cat) ? `<select data-pf1="mitico|car|${cat}" data-id="${id}" data-ridisegna-pf1 ${cat > g ? 'disabled' : ''}>${opz([['', '— +2 a… —'], ...CARS.map((s) => [s, `+2 ${NOMI_CAR[s]}`])], m.car?.[cat] || '')}</select>` : '';
      const talento = cat % 2 === 1 ? '<span class="mit-tal">talento mitico</span>' : '';
      return `<tr class="${cat <= g ? 'raggiunta' : 'futura'}${cat === g ? ' attuale' : ''}">
        <td><b>${cat}°</b></td>
        <td>${voci.map((b) => `<span class="mit-base" title="${esc(b[3])}">${esc(b[1])} ${infoMitica(titoloBase(b[1]), 'Eroi_Mitici', b[2])}</span>`).join(' ')}
          ${voci.length ? `<div class="muto mit-riass">${voci.map((b) => esc(b[3])).join(' · ')}</div>` : ''}</td>
        <td>${carSel}${talento}${CAT_CAR.includes(cat) && cat <= g && !m.car?.[cat] ? ' <span class="oltre">⚠ da scegliere</span>' : ''}</td>
        <td class="muto">${cat === 1 ? 'ascensione' : `${CIMENTI[cat]} ciment${CIMENTI[cat] > 1 ? 'i' : 'o'}`}</td></tr>`;
    }).join('');
    const base = `<h4>Capacità mitiche base</h4>
      <div class="prog-scorri"><table class="mit-tab"><thead><tr><th>Cat.</th><th>Capacità</th><th>Caratteristica / talento</th><th>Per salire</th></tr></thead><tbody>${righeBase}</tbody></table></div>`;

    // ---- Privilegi del percorso: scelta di 1° categoria e capacità di 10° ----
    const primo = per?.primo ? `<div class="mit-privilegio"><b>${esc(per.primo.nome)}</b> <small class="muto">(1° categoria, scelta definitiva)</small>
        <div class="mit-opzioni">${per.primo.opzioni.map((o) => `<label class="riv${m.primo === o.nome ? ' presa' : ''}"><input type="radio" name="mit-primo-${id}" data-pf1="mitico|primo" data-id="${id}" value="${esc(o.nome)}" data-ridisegna-pf1 ${m.primo === o.nome ? 'checked' : ''}>
          <span>${esc(o.nome)} <small class="muto">(${esc(o.tipo)})</small>${o.req.length ? `<small class="oltre"> ${esc(o.req.join(' '))}</small>` : ''}</span>${infoMitica(o.nome, pagina, o.tipo)}</label>`).join('')}</div>
        ${!m.primo ? '<p class="oltre pf-aiuto">⚠ Scegli una delle opzioni.</p>' : ''}</div>` : '';
    const decimo = per?.decimo ? `<div class="mit-privilegio ${g >= 10 ? '' : 'futura'}"><b>${esc(per.decimo.nome)}</b> <small class="muto">(${esc(per.decimo.tipo)}, ${g >= 10 ? 'ottenuto' : 'alla 10° categoria'})</small> ${infoMitica(per.decimo.nome, pagina, per.decimo.tipo)}</div>` : '';
    // ---- Talento Doppio Percorso: secondo percorso e il suo privilegio di 1° categoria (non quello di 10°) ----
    let doppio = '';
    if (haDoppioPercorso(d)) {
      const p2 = secondoPercorso(d);
      const per2 = MITICI.percorsi[p2];
      const pag2 = p2 ? paginaPercorso(p2) : '';
      doppio = `<div class="mit-privilegio mit-doppio"><b>Doppio Percorso</b> <small class="muto">(talento mitico: un secondo percorso, scelta definitiva)</small>
          <button class="btn-mini" data-azione="pf1-info-talento" data-nome="Doppio Percorso (Mitico)" title="Descrizione dal wiki">i</button>
          <div class="pf-riga"><label>Secondo percorso <select data-pf1="mitico|percorso2" data-id="${id}" data-ridisegna-pf1>${opz([['', '— scegli —'], ...PERCORSI.filter((x) => x !== m.percorso).map((x) => [x, x])], p2)}</select></label>
            ${p2 ? infoMitica(p2, pag2, '') : ''}</div>
          ${!p2 ? '<p class="oltre pf-aiuto">⚠ Scegli il secondo percorso: deve essere diverso da quello dell\'ascensione.</p>' : ''}
          ${per2?.primo ? `<div><b>${esc(per2.primo.nome)}</b> <small class="muto">(1° categoria del secondo percorso)</small>
            <div class="mit-opzioni">${per2.primo.opzioni.map((o) => `<label class="riv${m.primo2 === o.nome ? ' presa' : ''}"><input type="radio" name="mit-primo2-${id}" data-pf1="mitico|primo2" data-id="${id}" value="${esc(o.nome)}" data-ridisegna-pf1 ${m.primo2 === o.nome ? 'checked' : ''}>
              <span>${esc(o.nome)} <small class="muto">(${esc(o.tipo)})</small>${o.req.length ? `<small class="oltre"> ${esc(o.req.join(' '))}</small>` : ''}</span>${infoMitica(o.nome, pag2, o.tipo)}</label>`).join('')}</div>
            ${!m.primo2 ? '<p class="oltre pf-aiuto">⚠ Scegli una delle opzioni.</p>' : ''}</div>` : ''}
          ${p2 ? `<p class="muto pf-aiuto">Le capacità di percorso si possono scegliere dalle liste di ${esc(m.percorso)} e ${esc(p2)} (e dalle universali). Il privilegio di 10° categoria resta solo quello di ${esc(m.percorso)}.</p>` : ''}
        </div>`;
    }
    const privilegi = per ? `<h4>Privilegi del percorso: ${esc(m.percorso)}</h4>${primo}${decimo}${doppio}` : '<p class="oltre pf-aiuto">⚠ Scegli il percorso mitico.</p>';

    // ---- Capacità di percorso scelte ----
    const scelte = m.scelte || [];
    const percorsi = percorsiDi(d);
    const prese = scelte.map((s) => {
      const x = capacitaMitica(percorsi, s.nome);
      const uni = universale(s.nome);
      const pag = paginaCapacita(percorsi, s.nome);
      const daSecondo = !uni && secondoPercorso(d) && !(per?.capacita || []).some((c) => c.nome === s.nome);
      const sotto = s.nome === 'Potenziare Caratteristica'
        ? `<select data-pf1="mitico|scelte#${s.id}|car" data-id="${id}" data-ridisegna-pf1>${opz([['', '— caratteristica —'], ...CARS.filter((k) => k === s.car || !scelte.some((y) => y !== s && y.nome === s.nome && y.car === k)).map((k) => [k, `+2 ${NOMI_CAR[k]}`])], s.car || '')}</select>`
        : `<input data-pf1="mitico|scelte#${s.id}|dettaglio" data-id="${id}" value="${esc(s.dettaglio || '')}" placeholder="scelta / note (es. piano, scuola, nemico…)">`;
      return `<li class="mit-presa"><span><b>${esc(s.nome)}</b> <small class="muto">(${esc(x?.tipo || '')}${uni ? ', universale' : ''}${daSecondo ? `, ${esc(secondoPercorso(d))}` : ''}${x ? `, ${x.cat}° cat.` : ''}${s.cat ? `, presa alla ${s.cat}°` : ''})</small>
          ${x?.req?.length ? `<div class="muto mit-req">Requisito: ${esc(x.req.join(' '))}</div>` : ''}</span>
        ${sotto}${infoMitica(s.nome, pag, x?.tipo)}
        <button class="btn-x" data-azione="pf1-mit-togli" data-id="${id}" data-elem="${s.id}" title="Togli (la scelta normalmente non si cambia)">×</button></li>`;
    }).join('');
    const disponibile = (x) => x.cat <= g && quanteScelte(d, x.nome) < limiteMitica(x, g);
    const gruppo = (titolo, lista) => {
      const voci = lista.filter(disponibile);
      return voci.length ? `<optgroup label="${esc(titolo)}">${voci.map((x) => `<option value="${esc(x.nome)}">${esc(x.nome)} (${esc(x.tipo)})${x.req.length ? ' *' : ''}${quanteScelte(d, x.nome) ? ` — già ${quanteScelte(d, x.nome)}` : ''}</option>`).join('')}</optgroup>` : '';
    };
    const opzioni = percorsi.flatMap((k) => [1, 3, 6].map((cat) => gruppo(`${k} · ${cat}° categoria`, MITICI.percorsi[k].capacita.filter((x) => x.cat === cat)))).join('')
      + [1, 3, 6].map((cat) => gruppo(`Universali · ${cat}° categoria`, MITICI.universali.filter((x) => x.cat === cat))).join('');
    const nCap = scelte.length;
    const capacita = `<h4>Capacità di percorso <small class="${nCap > dm.capacitaDovute ? 'oltre' : 'muto'}">${nCap} / ${dm.capacitaDovute}</small>
        <small class="muto">una per categoria, dal percorso o universali · quelle di 3° e 6° categoria si sbloccano a quella categoria · * = ha un requisito</small></h4>
      ${prese ? `<ul class="mit-prese">${prese}</ul>` : '<p class="muto">Nessuna capacità di percorso scelta.</p>'}
      ${nCap < dm.capacitaDovute ? `<p class="oltre pf-aiuto">⚠ ${dm.capacitaDovute - nCap} capacità da scegliere.</p>` : ''}
      <div class="pf-riga"><select id="mit-scelta-${id}" class="pf-largo"><option value="">— scegli una capacità —</option>${opzioni}</select>
        <button class="btn-piccolo" data-azione="pf1-mit-prendi" data-id="${id}">Prendi</button>
        <button class="btn-mini" data-azione="pf1-mit-info-scelta" data-id="${id}" title="Leggi la descrizione della capacità scelta prima di prenderla">i</button></div>`;

    // ---- Talenti e incantesimi mitici ----
    const talMit = d.capacita.filter(talentoMitico);
    const talenti = `<h4>Talenti mitici <small class="${talMit.length > dm.talentiDovuti ? 'oltre' : 'muto'}">${talMit.length} / ${dm.talentiDovuti}</small></h4>
      <p class="muto pf-aiuto">Uno alla 1° categoria e uno ogni 2 (3°, 5°, 7°, 9°)${quanteScelte(d, 'Talento Mitico Extra') ? `, più ${quanteScelte(d, 'Talento Mitico Extra')} da Talento Mitico Extra` : ''}; al posto di un talento mitico si può prendere un talento normale. Si aggiungono nella sezione «Talenti e capacità» (filtro: solo mitici).
        ${talMit.length ? `<br>Presi: ${talMit.map((x) => esc(x.nome)).join(', ')}` : ''}</p>`;
    const incMit = dm.incMitici ? `<h4>Incantesimi mitici <small class="${(m.incantesimi || []).length > dm.incMitici ? 'oltre' : 'muto'}">${(m.incantesimi || []).length} / ${dm.incMitici}</small></h4>
      <p class="muto pf-aiuto">Pari alla categoria per ogni volta che si è presa «Incantesimi Mitici»; serve saper lanciare la versione normale. Si spende potere mitico per potenziarli.</p>
      ${(m.incantesimi || []).map((s) => `<div class="pf-riga"><input class="pf-largo" list="pf1-incantesimi-mitici" data-pf1="mitico|incantesimi#${s.id}|nome" data-id="${id}" value="${esc(s.nome || '')}" placeholder="Incantesimo" data-ridisegna-pf1>
        ${s.nome ? infoMitica(s.nome, `Incantesimi/${s.nome.replace(/ /g, '_')}`, '') : ''}
        <button class="btn-x" data-azione="pf1-mit-inc-togli" data-id="${id}" data-elem="${s.id}" title="Togli">×</button></div>`).join('')}
      <div class="pf-piede"><button class="btn-piccolo" data-azione="pf1-mit-inc" data-id="${id}">+ Incantesimo mitico</button></div>
      <datalist id="pf1-incantesimi-mitici">${d.incantatori.flatMap((inc) => (inc.incantesimi || []).map((s) => s.nome)).filter((v, i, a) => v && a.indexOf(v) === i).map((v) => `<option value="${esc(v)}">`).join('')}</datalist>` : '';

    return `${testa}${potere}${base}${privilegi}${capacita}${talenti}${incMit}${pannelloCimenti(p, d, dm)}
      <p class="muto pf-aiuto">Regole da Golarion Insider («Eroi Mitici» e pagine dei percorsi): le descrizioni complete si aprono con «i».</p>`;
  }
  // Cimenti: quanti ne servono per la prossima categoria, contatore e registro
  function pannelloCimenti(p, d, dm) {
    const id = p.id;
    const m = d.mitico;
    const g = dm.g;
    if (g >= 10) return '<h4>Cimenti</h4><p class="muto">Categoria massima raggiunta (10°).</p>';
    const serve = g === 0 ? 0 : CIMENTI[g + 1];
    const fatti = n(m.cimenti);
    const registro = (m.registro || []).map((r) => `<li><small class="muto">${r.cat ? `per la ${r.cat}°` : ''}</small> ${esc(r.testo)} <button class="btn-x" data-azione="pf1-mit-cim-togli" data-id="${id}" data-elem="${r.id}" title="Togli">×</button></li>`).join('');
    return `<h4>Cimenti ${g ? `<small class="muto">per la ${g + 1}° categoria: ${fatti} / ${serve}</small>` : ''}</h4>
      ${g ? `<div class="pf-riga mit-cimenti">
        <span class="pf-pallini">${Array.from({ length: serve }, (_, i) => `<span class="pallino${i < fatti ? ' pieno' : ''}"></span>`).join('')}</span>
        <input id="mit-cim-${id}" class="pf-largo" placeholder="Cimento completato (es. sconfitto il drago di Sandpoint)">
        <button class="btn-piccolo" data-azione="pf1-mit-cimento" data-id="${id}">+ Cimento</button>
        ${fatti >= serve ? `<button class="primario" data-azione="pf1-mit-sali" data-id="${id}">⬆ Sali alla ${g + 1}° categoria</button>` : ''}
      </div>` : '<p class="muto pf-aiuto">La 1° categoria si ottiene all\'ascensione: imposta la categoria a 1.</p>'}
      ${registro ? `<ul class="mit-registro">${registro}</ul>` : ''}
      <p class="muto pf-aiuto">Il GM decide cosa vale come cimento e può cambiarne il numero.</p>`;
  }

  // =====================================================================
  // Resistenze: energia, incantesimi (RI) e fortificazione contro critici e attacchi furtivi
  // Regole (wiki): fortificazione leggera 25%, moderata 50%, pesante 75%; resistenza all'energia 10 (migliorata 20,
  // superiore 30) per attacco; RI 13–19 dalle armature. Né la RI né le resistenze allo stesso tipo si sommano: vale la più alta.
  // =====================================================================
  const ENERGIE = [['acido', 'Acido', '🧪'], ['elettricita', 'Elettricità', '⚡'], ['freddo', 'Freddo', '❄️'], ['fuoco', 'Fuoco', '🔥'], ['sonoro', 'Sonoro', '🔊']];
  const FORTIFICAZIONI = [[25, 'Leggera (25%)'], [50, 'Moderata (50%)'], [75, 'Pesante (75%)'], [100, 'Totale (immune ai critici)']];
  const TIPI_RES = [...ENERGIE.map(([k, nome]) => [k, `Resistenza: ${nome.toLowerCase()}`]), ['ri', 'Resistenza agli incantesimi (RI)'], ['fortificazione', 'Fortificazione']];
  // Fonti automatiche: armature e scudi indossati, creati nell'officina o con la capacità scritta nel nome
  function fontiAutomatiche(d) {
    const out = [];
    // Resistenze all'energia date dalla razza (razze del master)
    for (const [tipo, valore, tratto] of razzaDi(d)?.resistenze || []) out.push({ id: `auto-razza-${tipo}`, nome: `${tratto} (razza)`, tipo, valore, auto: true });
    // Mastro Chimico con Mutageno Draconico, in forma mutagena: resistenza 20 all'energia del drago scelto
    const drago = livMC(d) && d.alchimista?.mutageno?.attivo && avanzatoMC(d, 'Mutageno Draconico') ? DRAGHI_MC.find((x) => x[0] === d.chimico?.drago) : null;
    if (drago) out.push({ id: 'auto-mc-drago', nome: `Mutageno Draconico (${drago[0]})`, tipo: drago[1], valore: 20, auto: true });
    // Bonus di classe preferita che danno resistenza all'energia (il tipo si sceglie nella sezione «Classe preferita»)
    for (const p of prefPrese(d).filter((x) => x.x.e?.tipo === 'resistenza' && x.tot)) {
      const tipo = p.x.e.energia || p.scelta;
      if (ENERGIE.some((e) => e[0] === tipo)) out.push({ id: `auto-pref-${p.classe}-${p.i}`, nome: `Classe preferita (${p.classe})`, tipo, valore: p.tot, auto: true });
    }
    for (const x of (d.creazioni || []).filter((y) => y.crescita)) {
      const o = d.oggetti.find((y) => y.creazioneId === x.id);
      const indossato = o && (window.Luoghi ? window.Luoghi.tipoDi(o.dove, d).k : o.dove) === 'indossato';
      if (!indossato) continue;
      for (const [k] of ENERGIE) {
        const v = Math.max(0, ...poteriCrescita(d, x).attivi.filter((r) => r['en_' + k]).map((r) => n(r.resistenza)));
        if (v) out.push({ id: `auto-cr-${x.id}-${k}`, nome: x.nome || 'oggetto', tipo: k, valore: v, auto: true });
      }
    }
    for (const a of d.armature.filter((x) => x.indossata)) {
      const x = a.creazioneId ? (d.creazioni || []).find((y) => y.id === a.creazioneId) : null;
      const caps = [...(x?.capacita || []), a.nome || ''];
      const nome = a.nome || x?.nome || 'armatura';
      const visti = new Set();
      for (const c of caps) {
        const t = norm(c);
        let m;
        if ((m = t.match(/fortificazione\s*\(?(leggera|moderata|media|pesante)/))) {
          const v = { leggera: 25, moderata: 50, media: 50, pesante: 75 }[m[1]];
          if (!visti.has('f')) out.push({ id: `auto-f-${a.id}`, nome, tipo: 'fortificazione', valore: v, auto: true });
          visti.add('f');
        }
        if ((m = t.match(/resistenza agli incantesimi\s*\(?(\d+)/))) {
          if (!visti.has('ri')) out.push({ id: `auto-ri-${a.id}`, nome, tipo: 'ri', valore: Number(m[1]), auto: true });
          visti.add('ri');
        }
        if (/resistenza all'energia/.test(t) && x && !visti.has('e')) {
          visti.add('e');
          const v = /superiore/.test(t) ? 30 : /migliorata/.test(t) ? 20 : 10;
          out.push({ id: `auto-e-${a.id}`, nome, tipo: ENERGIE.some((e) => e[0] === x.energia) ? x.energia : '', valore: v, auto: true, creazione: x.id });
        }
      }
    }
    return out;
  }
  // Totali: per ogni tipo vale la fonte più alta (le immunità battono tutto)
  function resistenzeDi(d) {
    const fonti = [...fontiAutomatiche(d), ...(d.resistenze?.fonti || [])];
    const migliore = (tipo) => {
      const tutte = fonti.filter((f) => f.tipo === tipo);
      const immune = tutte.find((f) => f.immune);
      if (immune) return { valore: Infinity, immune: true, fonte: immune.nome, tutte };
      const top = tutte.reduce((a, f) => (n(f.valore) > n(a?.valore) ? f : a), null);
      return { valore: top ? n(top.valore) : 0, immune: false, fonte: top?.nome || '', tutte };
    };
    const energia = Object.fromEntries(ENERGIE.map(([k]) => [k, migliore(k)]));
    const ri = migliore('ri');
    const fort = migliore('fortificazione');
    return { fonti, energia, ri, fort: { ...fort, valore: Math.min(100, fort.valore) } };
  }
  const testoRes = (r) => (r.immune ? 'immune' : r.valore ? String(r.valore) : '—');
  function sezioneResistenze(p, d, c) {
    const id = p.id;
    const R = resistenzeDi(d);
    const chip = (icona, nome, r, suffisso = '') => `<div class="res-chip${r.immune || r.valore ? ' attiva' : ''}" title="${esc(r.fonte ? `da ${r.fonte}${r.tutte.length > 1 ? ` (${r.tutte.length} fonti: vale la più alta)` : ''}` : 'nessuna fonte')}">
        <span>${icona} ${esc(nome)}</span><b>${r.immune ? 'immune' : r.valore ? `${r.valore}${suffisso}` : '—'}</b></div>`;
    const riassunto = `<div class="res-griglia">
        ${ENERGIE.map(([k, nome, ic]) => chip(ic, nome, R.energia[k])).join('')}
        ${chip('✨', 'RI', R.ri)}
        ${chip('🛡', 'Fortificazione', R.fort, '%')}
      </div>
      ${R.fort.valore ? `<div class="pf-riga res-fort"><span>Quando subisci un <b>colpo critico</b> o un <b>attacco furtivo</b>: con ${R.fort.valore >= 100 ? 'fortificazione totale è sempre negato' : `${R.fort.valore}% di probabilità viene negato e il danno si tira normalmente`}.</span>
        ${R.fort.valore < 100 ? `<button class="btn-piccolo" data-azione="pf1-fortificazione" data-id="${id}">🎲 Tira la fortificazione (d%)</button>` : ''}</div>` : ''}
      <p class="muto pf-aiuto">Resistenza all'energia: ignora quel numero di danni del tipo per ogni attacco. RI: chi lancia un incantesimo su di te deve fare 1d20 + livello dell'incantatore almeno pari alla RI${R.ri.valore ? ` (${R.ri.valore})` : ''}. Fonti dello stesso tipo non si sommano: vale la più alta.</p>`;
    const auto = R.fonti.filter((f) => f.auto).map((f) => `<div class="pf-riga res-fonte auto">
        <span class="res-auto">automatica</span><b>${esc(f.nome)}</b>
        <span>${f.tipo === 'fortificazione' ? `Fortificazione ${f.valore}%` : f.tipo === 'ri' ? `RI ${f.valore}` : `Resistenza all'energia ${f.valore}`}</span>
        ${f.creazione ? `<label>tipo <select data-pf1="creazioni#${f.creazione}|energia" data-id="${id}" data-ridisegna-pf1>${opz([['', '— quale energia? —'], ...ENERGIE.map(([k, nome]) => [k, nome])], f.tipo)}</select></label>${!f.tipo ? '<span class="oltre">⚠ scegli il tipo</span>' : ''}` : ''}
      </div>`).join('');
    const manuali = (d.resistenze.fonti || []).map((f) => {
      const P = (k) => `resistenze|fonti#${f.id}|${k}`;
      const energia = ENERGIE.some((e) => e[0] === f.tipo);
      return `<div class="pf-riga res-fonte">
        <input class="pf-largo" data-pf1="${P('nome')}" data-id="${id}" value="${esc(f.nome || '')}" placeholder="Fonte (es. razza, incantesimo, anello)">
        <select data-pf1="${P('tipo')}" data-id="${id}" data-ridisegna-pf1>${opz(TIPI_RES, f.tipo)}</select>
        ${f.tipo === 'fortificazione'
          ? `<select data-pf1="${P('valore')}" data-id="${id}" data-tipo="numero" data-ridisegna-pf1>${opz(FORTIFICAZIONI.map(([v, t]) => [v, t]), n(f.valore) || 25)}</select>`
          : `<label>${f.tipo === 'ri' ? 'RI' : 'Valore'} <input type="number" class="pf-corto" min="0" data-pf1="${P('valore')}" data-id="${id}" data-tipo="numero" value="${esc(f.valore ?? '')}" data-ridisegna-pf1 ${f.immune ? 'disabled' : ''}></label>`}
        ${energia ? `<label class="pf-chk"><input type="checkbox" data-pf1="${P('immune')}" data-id="${id}" ${f.immune ? 'checked' : ''} data-ridisegna-pf1> immunità</label>` : ''}
        <button class="btn-x" data-azione="pf1-rimuovi" data-id="${id}" data-lista="resistenze|fonti" data-elem="${f.id}" title="Togli">×</button></div>`;
    }).join('');
    return `${riassunto}
      ${auto ? `<h4>Dall'equipaggiamento indossato</h4>${auto}` : ''}
      <h4>Altre fonti</h4>${manuali || '<p class="muto">Nessuna: aggiungi razza, incantesimi (es. Resistere all\'Energia), oggetti, capacità di classe…</p>'}
      <div class="pf-piede"><button class="btn-piccolo" data-azione="pf1-res-aggiungi" data-id="${id}">+ Resistenza</button>
        <span class="muto">Le armature e gli scudi indossati con Fortificazione, Resistenza agli Incantesimi o Resistenza all'Energia (creati nell'officina o con la capacità nel nome) si contano da soli.</span></div>`;
  }

  // Immagine di un oggetto creato: salvata ridotta dentro i dati (data URL)
  const immagineOk = (s) => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(s);
  function sezioneOfficina(p, d, c) {
    const id = p.id;
    const { num, campo, sel, chk } = aiutanti(p, c);
    const lista = d.creazioni || [];
    const STATI_OGG = { integro: 'integro', rotto: '⚠ rotto', distrutto: '✖ distrutto', indistruttibile: '♾ indistruttibile' };
    const schede = lista.map((x) => {
      const cv = calcolaCreazione(x);
      const aperta = officinaAperta === x.id;
      const catNome = CATEGORIE_OGG.find((k) => k[0] === x.categoria)?.[1] || '';
      const titolo = `${esc(x.nome || 'Oggetto senza nome')}${cv.bonusTot && ['arma', 'munizioni', 'armatura', 'scudo'].includes(x.categoria) ? ` <small>+${cv.pot}${cv.bonusCap ? ` (tot. +${cv.bonusTot})` : ''}</small>` : ''}`;
      const riassunto = `<div class="off-testa">
          ${immagineOk(x.immagine) ? `<button class="off-mini" data-azione="pf1-off-immagine-vedi" data-id="${id}" data-off="${x.id}" title="Ingrandisci"><img src="${x.immagine}" alt=""></button>` : ''}
          <span class="off-cat">${esc(catNome)}</span><b class="off-nome">${titolo}</b>
          <span class="off-rar off-${x.rarita}">${esc(RARITA_OGG.find((r) => r[0] === x.rarita)?.[1] || '')}</span>
          <span class="muto">${cv.artefatto ? 'non acquistabile' : `prezzo <b>${fmtMo(cv.prezzo)}</b>${x.rarita !== 'normale' ? ` · costo di creazione ${fmtMo(cv.costo)}` : ''}`}</span>
          ${cv.durezza != null || cv.artefatto ? `<span class="muto">${cv.artefatto ? '' : `durezza <b>${cv.durezza ?? '—'}</b> · PF <b>${cv.pfAtt ?? '—'}/${cv.pf ?? '—'}</b> · `}<span class="off-stato off-${cv.stato}">${STATI_OGG[cv.stato] || ''}</span></span>` : ''}
          <button class="btn-piccolo" data-azione="pf1-off-apri" data-id="${id}" data-off="${x.id}">${aperta ? 'Chiudi' : '✏️ Modifica'}</button>
          <button class="btn-x" data-azione="pf1-off-togli" data-id="${id}" data-off="${x.id}" title="Elimina l'oggetto creato">×</button>
        </div>`;
      if (!aperta) return `<div class="off-scheda">${riassunto}${riassuntoCrescita(d, x)}</div>`;
      const P = (k) => `creazioni#${x.id}|${k}`;
      const armaArmatura = ['arma', 'munizioni', 'armatura', 'scudo'].includes(x.categoria);
      const spell = ['pozione', 'pergamena', 'bacchetta'].includes(x.categoria);
      const disponibili = capacitaPer(x.categoria, x).filter((k) => !(x.capacita || []).includes(k[0]));
      const capHtml = armaArmatura ? `<h4>Potenziamento e capacità speciali</h4>
        <div class="pf-riga">
          <label title="${cv.artefatto ? 'Gli artefatti possono arrivare a +6' : 'Massimo +5 (+6 solo per gli artefatti)'}">Potenziamento ${sel(P('potenziamento'), cv.artefatto || n(x.potenziamento) > 5 ? OPZ_MAGIA_ART : OPZ_MAGIA, x.potenziamento ?? '', 'data-ridisegna-pf1')}</label>
          ${x.categoria === 'arma' ? `<label class="pf-chk">${chk(P('distanza'), x.distanza, 'data-ridisegna-pf1')} arma a distanza</label>` : ''}
          ${x.categoria === 'armatura' ? `<label title="Bonus di armatura dell'armatura normale (es. cotta di maglia 6)">Bonus armatura base ${num(P('bonusBase'), x.bonusBase, 'min="0" data-ridisegna-pf1')}</label>` : ''}
          ${x.categoria === 'scudo' ? `<label title="Bonus di scudo normale (es. scudo pesante 2)">Bonus scudo base ${num(P('bonusBase'), x.bonusBase, 'min="0" data-ridisegna-pf1')}</label>` : ''}
          <span class="muto">bonus totale <b class="${cv.bonusTot > 10 ? 'oltre' : ''}">+${cv.bonusTot}</b> / +10</span>
        </div>
        <div class="off-caps">${cv.caps.map((k) => `<span class="chip">${esc(k[0])} <small>${k[1] ? `+${k[1]}` : fmtMo(k[2])}</small><button class="chip-x" data-azione="pf1-off-cap-togli" data-id="${id}" data-off="${x.id}" data-nome="${esc(k[0])}" title="Togli">×</button></span>`).join('') || '<span class="muto">Nessuna capacità speciale.</span>'}</div>
        <div class="pf-riga"><select id="off-cap-${x.id}"><option value="">— aggiungi capacità speciale (${disponibili.length}) —</option>${[1, 2, 3, 4, 5, 0].map((b) => {
          const voci = disponibili.filter((k) => k[1] === b);
          return voci.length ? `<optgroup label="${b ? `Bonus +${b}` : 'Prezzo fisso'}">${voci.map((k) => `<option value="${esc(k[0])}">${esc(k[0])}${b ? '' : ` (${fmtMo(k[2])})`}</option>`).join('')}</optgroup>` : '';
        }).join('')}</select>
          <button class="btn-piccolo" data-azione="pf1-off-cap" data-id="${id}" data-off="${x.id}">Aggiungi</button>
          <button class="btn-mini" data-azione="pf1-off-cap-info" data-off="${x.id}" data-cat="${x.categoria}" title="Descrizione della capacità scelta dal wiki">i</button></div>` : '';
      const effHtml = !armaArmatura && !spell ? `<h4>Effetti sulla scheda <small class="muto">bonus che l'oggetto dà a chi lo indossa</small></h4>
        ${(x.effetti || []).map((e, i) => `<div class="pf-riga">
          ${sel(`creazioni#${x.id}|effetti|${i}|bersaglio`, [['', '— a cosa —'], ...BERSAGLI.map((b) => [b[0], b[1]]), ...ctx.regDi(p).abilita.map((a) => ['abil:' + a.nome, 'Abilità: ' + a.nome])], e.bersaglio || '', 'data-ridisegna-pf1')}
          <label>Valore ${num(`creazioni#${x.id}|effetti|${i}|valore`, e.valore, 'data-ridisegna-pf1')}</label>
          ${sel(`creazioni#${x.id}|effetti|${i}|tipo`, TIPI_BONUS.map((t) => [t, t]), e.tipo || 'senza tipo', 'data-ridisegna-pf1')}
          <span class="muto">${prezzoEffetto(e) ? fmtMo(prezzoEffetto(e)) : ''}</span>
          <button class="btn-x" data-azione="pf1-off-riga-togli" data-id="${id}" data-off="${x.id}" data-lista="effetti" data-i="${i}" title="Togli">×</button></div>`).join('')}
        <div class="pf-piede"><button class="btn-piccolo" data-azione="pf1-off-riga" data-id="${id}" data-off="${x.id}" data-lista="effetti">+ Effetto</button>
          <span class="muto">es. Anello di protezione: CA +2 deviazione · Mantello della resistenza: TS +1 resistenza</span></div>` : '';
      // Oggetti che crescono con il livello di chi li porta (reliquie): una riga per livello, con potere, bonus e resistenze
      const opzBersagli = [['', '— nessun bonus —'], ...BERSAGLI.filter((b) => !SPECIALI.has(b[0])).map((b) => [b[0], b[1]]), ...ctx.regDi(p).abilita.map((a) => ['abil:' + a.nome, 'Abilità: ' + a.nome])];
      const cr = poteriCrescita(d, x);
      const crescitaHtml = !armaArmatura && !spell ? `<h4>Cresce con il livello <small class="muto">poteri che si risvegliano quando chi lo porta sale di livello (reliquie)</small></h4>
        <label class="pf-chk">${chk(P('crescita'), x.crescita, 'data-ridisegna-pf1')} l'oggetto acquisisce poteri con il livello del personaggio</label>
        ${x.crescita ? `<div class="off-crescita">
          ${(x.livelli || []).map((r, i) => {
            const L = (k) => `creazioni#${x.id}|livelli|${i}|${k}`;
            const attivo = n(r.livello) && n(r.livello) <= cr.liv;
            return `<div class="off-cr-riga${attivo ? ' attiva' : ''}">
              <label class="off-cr-liv" title="Livello (o DV) del personaggio da cui vale">${num(L('livello'), r.livello, 'min="1" max="20" class="pf-corto" data-ridisegna-pf1')}°</label>
              ${campo(L('testo'), r.testo, 'placeholder="Potere (es. Eludere, Sostentamento, Accumula Incantesimi 10)" class="pf-largo off-cr-testo"')}
              <span class="off-cr-bonus">${sel(L('bersaglio'), opzBersagli, r.bersaglio || '', 'data-ridisegna-pf1')}
                ${r.bersaglio ? `<label>+${num(L('valore'), r.valore, 'class="pf-corto" data-ridisegna-pf1')}</label>${sel(L('tipo'), TIPI_BONUS.map((t) => [t, t]), r.tipo || 'senza tipo', 'data-ridisegna-pf1')}` : ''}</span>
              <span class="off-cr-res" title="Resistenza all'energia data da questa riga">res.
                ${ENERGIE.map(([k, nome, ic]) => `<label class="pf-chk" title="${nome}">${chk(L('en_' + k), r['en_' + k], 'data-ridisegna-pf1')}${ic}</label>`).join('')}
                ${num(L('resistenza'), r.resistenza, 'min="0" class="pf-corto" placeholder="5" data-ridisegna-pf1')}</span>
              <span class="off-cr-stato">${attivo ? '✓ attivo' : 'non ancora'}</span>
              <button class="btn-x" data-azione="pf1-off-riga-togli" data-id="${id}" data-off="${x.id}" data-lista="livelli" data-i="${i}" title="Togli">×</button></div>`;
          }).join('') || '<p class="muto">Nessun potere: aggiungi una riga per ogni livello.</p>'}
          <div class="pf-piede"><button class="btn-piccolo" data-azione="pf1-off-riga" data-id="${id}" data-off="${x.id}" data-lista="livelli">+ Livello</button>
            <span class="muto">Livello del personaggio ora: <b>${cr.liv}</b>. Valgono le righe fino a quel livello; tra bonus dello stesso tipo (es. resistenza ai TS +1, +2, +3) e tra resistenze alla stessa energia conta il più alto. Bonus e resistenze valgono quando l'oggetto è indossato.</span></div>
        </div>` : ''}` : '';
      const potHtml = `<h4>${spell ? 'Incantesimo contenuto' : 'Poteri'} <small class="muto">${spell ? '' : 'capacità magiche dell\'oggetto'}</small></h4>
        ${(x.poteri || []).map((pw, i) => `<div class="off-potere">
          <div class="pf-riga">
            ${campo(`creazioni#${x.id}|poteri|${i}|nome`, pw.nome, `placeholder="${spell ? 'Incantesimo (es. Cura Ferite Leggere)' : 'Nome del potere o incantesimo'}" class="pf-largo" list="pf1-incantesimi-nomi"`)}
            <label>Liv. incantesimo ${num(`creazioni#${x.id}|poteri|${i}|livInc`, pw.livInc, 'min="0" max="9" data-ridisegna-pf1')}</label>
            ${spell ? '' : `<label>Attivazione ${sel(`creazioni#${x.id}|poteri|${i}|attivazione`, ATTIVAZIONI.slice(0, 3).map((a) => [a[0], a[1]]), pw.attivazione || 'continuo', 'data-ridisegna-pf1')}</label>
            <label title="Cariche o usi al giorno (vuoto = illimitato)">${pw.attivazione === 'cariche' ? 'Cariche' : 'Usi/giorno'} ${num(`creazioni#${x.id}|poteri|${i}|cariche`, pw.cariche, 'min="0" data-ridisegna-pf1')}</label>
            ${(pw.attivazione || 'continuo') === 'continuo' ? `<label>${sel(`creazioni#${x.id}|poteri|${i}|durata`, DURATE_POTERE, pw.durata || '', 'data-ridisegna-pf1')}</label>` : ''}`}
            <label title="Costo della componente materiale dell'incantesimo (mo)">Componente ${num(`creazioni#${x.id}|poteri|${i}|componente`, pw.componente, 'min="0" data-ridisegna-pf1')}</label>
            ${spell ? '' : `<span class="muto">${fmtMo(prezzoPotere(pw, x.li))}</span>`}
            <button class="btn-x" data-azione="pf1-off-riga-togli" data-id="${id}" data-off="${x.id}" data-lista="poteri" data-i="${i}" title="Togli">×</button>
          </div>
          ${campo(`creazioni#${x.id}|poteri|${i}|descrizione`, pw.descrizione, 'placeholder="Cosa fa, come si attiva…" class="off-descr"')}
        </div>`).join('')}
        ${spell && x.poteri.length ? '' : `<div class="pf-piede"><button class="btn-piccolo" data-azione="pf1-off-riga" data-id="${id}" data-off="${x.id}" data-lista="poteri">+ ${spell ? 'Incantesimo' : 'Potere'}</button></div>`}`;
      const formeOpz = x.categoria === 'arma' ? Object.keys(FORME_ARMA) : x.categoria === 'scudo' ? Object.keys(FORME_SCUDO) : [];
      const durHtml = `<h4>Durezza e punti ferita</h4>
        ${cv.artefatto ? '<p class="muto pf-aiuto">Gli artefatti non si distruggono con i mezzi normali: ognuno ha un modo specifico per essere distrutto (scrivilo nelle note).</p>' : `<div class="pf-riga">
          ${formeOpz.length ? `<label>Forma ${sel(P('forma'), [['', '— scegli —'], ...formeOpz.map((f) => [f, f])], x.forma || '', 'data-ridisegna-pf1')}</label>` : ''}
          <label title="${x.categoria === 'armatura' ? 'La durezza delle armature dipende dal materiale' : 'Materiale (cambia la durezza)'}">Materiale ${sel(P('sostanza'), [['', '—'], ...Object.keys(SOSTANZE).map((s) => [s, s])], x.sostanza || '', 'data-ridisegna-pf1')}</label>
          ${!formeOpz.length && x.categoria !== 'armatura' ? `<label title="Spessore in cm (i PF delle sostanze sono per 2,5 cm)">Spessore cm ${num(P('spessore'), x.spessore, 'step="0.5" min="0" placeholder="2,5" data-ridisegna-pf1')}</label>` : ''}
          ${x.categoria !== 'armatura' ? `<label>Taglia ${sel(P('taglia'), ORDINE_TAGLIE.map((t) => [t, t]), x.taglia || 'Media', 'data-ridisegna-pf1')}</label>` : ''}
          <span>Durezza <b>${cv.durezza ?? '—'}</b> · PF <b>${cv.pf ?? '—'}</b></span>
          <label>PF attuali ${num(P('pfAttuali'), x.pfAttuali, `min="0" placeholder="${cv.pf ?? ''}" data-ridisegna-pf1`)}</label>
          <span class="off-stato off-${cv.stato}">${STATI_OGG[cv.stato] || ''}</span>
        </div>
        <p class="muto pf-aiuto">${esc(cv.origine)}${cv.pot && armaArmatura ? ` · +${2 * cv.pot} durezza e +${10 * cv.pot} PF per il potenziamento +${cv.pot}` : ''}${x.categoria !== 'armatura' && (x.taglia || 'Media') !== 'Media' ? ' · PF moltiplicati o divisi per 2 per ogni taglia di differenza dalla Media' : ''} · a metà PF o meno l'oggetto è rotto, a 0 è distrutto${cv.ts != null ? ` · TS dell'oggetto magico <b>+${cv.ts}</b> (2 + ½ LI)` : ''}</p>`}`;
      return `<div class="off-scheda aperta">${riassunto}
        <div class="off-editor">
          <div class="off-immagine">
            <button class="off-img-box" data-azione="pf1-off-immagine" data-id="${id}" data-off="${x.id}" title="${immagineOk(x.immagine) ? 'Cambia immagine' : 'Aggiungi un\'immagine dell\'oggetto'}">
              ${immagineOk(x.immagine) ? `<img src="${x.immagine}" alt="">` : '<span>🖼<br><small>Aggiungi immagine</small></span>'}</button>
            ${immagineOk(x.immagine) ? `<button class="btn-mini" data-azione="pf1-off-immagine-togli" data-id="${id}" data-off="${x.id}" title="Togli l'immagine">×</button>` : ''}
          </div>
          <div class="pf-riga">
            <label class="off-largo">Nome ${campo(P('nome'), x.nome, 'placeholder="es. Lama del Crepuscolo" class="pf-largo" data-ridisegna-pf1')}</label>
            <label>Tipo ${sel(P('categoria'), CATEGORIE_OGG, x.categoria, 'data-ridisegna-pf1')}</label>
            <label>Natura ${sel(P('rarita'), RARITA_OGG, x.rarita, 'data-ridisegna-pf1')}</label>
          </div>
          <div class="pf-riga">
            ${x.rarita !== 'normale' ? `<label title="Livello dell'incantatore con cui è stato fatto">LI ${num(P('li'), x.li, `min="1" max="20" placeholder="${cv.liMin || ''}" data-ridisegna-pf1`)}</label>` : ''}
            <label title="Livello del personaggio quando l'ha creato">Creato al livello ${num(P('livelloCreazione'), x.livelloCreazione, 'min="1" max="20"')}</label>
            <label>Creato da ${campo(P('creatore'), x.creatore, 'placeholder="PG o master"')}</label>
            <label>Peso kg ${num(P('peso'), x.peso, 'step="0.1" min="0" data-ridisegna-pf1')}</label>
            ${!armaArmatura && !spell && x.rarita !== 'normale' ? `<label class="pf-chk" title="Occupa uno slot del corpo (anello, testa, collo…): se no, il prezzo raddoppia">${chk(P('slot'), x.slot, 'data-ridisegna-pf1')} occupa uno slot</label>` : ''}
          </div>
          ${cv.liMin && x.rarita !== 'normale' && n(x.li) < cv.liMin ? `<p class="oltre pf-aiuto">LI minimo consigliato per un bonus +${cv.bonusTot}: ${cv.liMin}.</p>` : ''}
          ${x.rarita === 'normale' ? '' : capHtml + effHtml + crescitaHtml + potHtml}
          ${durHtml}
          <h4>Prezzo e costo</h4>
          <div class="pf-riga">
            <label title="${armaArmatura ? 'Prezzo dell\'arma/armatura normale' : 'Valore aggiunto (es. gemme, oggetto di base)'}">Prezzo base ${num(P('prezzoBase'), x.prezzoBase, 'min="0" data-ridisegna-pf1')} mo</label>
            ${x.rarita !== 'normale' && !cv.artefatto ? `<label class="pf-chk">${chk(P('richiedeAbilita'), x.richiedeAbilita, 'data-ridisegna-pf1')} richiede un'abilità (−10%)</label>
            <label class="pf-chk">${chk(P('richiedeClasse'), x.richiedeClasse, 'data-ridisegna-pf1')} solo per una classe o un allineamento (−30%)</label>
            <label title="Componenti materiali aggiuntive spese nella creazione">Componenti extra ${num(P('componenti'), x.componenti, 'min="0" data-ridisegna-pf1')} mo</label>` : ''}
            <label title="Lascia vuoto per il calcolo automatico">Prezzo deciso a mano ${num(P('prezzoManuale'), x.prezzoManuale, 'min="0" placeholder="auto" data-ridisegna-pf1')}</label>
          </div>
          <div class="off-prezzo">${cv.artefatto ? '<b>Artefatto</b>: non si può comprare né creare con i mezzi dei mortali.' : `Prezzo di mercato <b>${fmtMo(cv.prezzo)}</b>${x.rarita !== 'normale' ? ` · costo di creazione <b>${fmtMo(cv.costo)}</b> (metà della parte magica + oggetto base e componenti) · vendita ${fmtMo(cv.prezzo / 2)}` : ''}`}
            ${cv.dettaglio.length ? `<div class="muto">${esc(cv.dettaglio.join(' · '))}</div>` : ''}
            ${cv.avvisi.map((a) => `<div class="oltre">${esc(a)}</div>`).join('')}</div>
          <label class="off-note">Note e descrizione ${`<textarea data-pf1="${P('note')}" data-id="${id}" rows="3" placeholder="Aspetto, storia, come si distrugge (artefatti)…">${esc(x.note || '')}</textarea>`}</label>
          <p class="muto pf-aiuto">L'oggetto compare anche ${x.categoria === 'arma' ? 'tra gli Attacchi (con il potenziamento)' : ['armatura', 'scudo'].includes(x.categoria) ? 'tra Armature e scudi (con il potenziamento alla CA)' : 'nell\'Equipaggiamento; i suoi effetti diventano un bonus attivo quando è indossato'}.</p>
        </div></div>`;
    }).join('');
    return `<p class="muto pf-aiuto">Crea armi, armature, anelli, bacchette, bastoni e altri oggetti magici: prezzo, costo di creazione, durezza e punti ferita si calcolano con le regole del manuale (wiki Golarion Insider).</p>
      ${schede || '<p class="muto">Nessun oggetto creato.</p>'}
      <div class="pf-piede"><button class="primario" data-azione="pf1-off-nuovo" data-id="${id}">⚒ Crea un oggetto</button></div>
      ${lista.some((x) => x.id === officinaAperta) ? `<datalist id="pf1-incantesimi-nomi">${[...INCANTESIMI.values()].map((v) => `<option value="${esc(v.nome)}">`).join('')}</datalist>` : ''}`;
  }

  // ---- Fattucchiere: fatture, fatture maggiori e superiori ----
  // Dati: window.PF1_FATTURE = [nome, tipo, categoria, livello minimo, fatture richieste, limite 24 ore]
  const FATTURE = (window.PF1_FATTURE || []).map(([nome, tipo, categoria, livello, richieste, volta24]) =>
    ({ nome, tipo, categoria, livello: Math.max(livello, categoria === 'maggiore' ? 10 : categoria === 'superiore' ? 18 : 1), richieste, volta24: !!volta24 }));
  const CATEGORIE_FATTURA = [['fattura', 'Fatture', 1], ['maggiore', 'Fatture maggiori', 10], ['superiore', 'Fatture superiori', 18]];
  const fatturaDi = (nome) => FATTURE.find((f) => f.nome === nome);
  // Valori che dipendono dal livello, calcolati per le fatture più usate (il resto si legge con «i»)
  function notaFattura(nome, liv, int) {
    const durata = 1 + (liv >= 8 ? 1 : 0) + (liv >= 16 ? 1 : 0);
    switch (nome) {
      case 'Malocchio': return `−${liv >= 8 ? 4 : 2} a CA, prove, attacchi, TS o abilità (a scelta), ${Math.max(1, 3 + int)} round (1 se supera Volontà) · 9 m`;
      case 'Sfortuna': return `tira due volte e prende il peggiore per ${durata} round · Volontà nega · 9 m`;
      case 'Fortuna': return `ritira e prende il migliore per ${durata} round · 9 m`;
      case 'Volo': return ['Caduta Morbida a volontà, +4 razziale a Volare', liv >= 3 ? 'Levitazione 1/giorno' : '', liv >= 5 ? `Volare ${liv} minuti al giorno` : ''].filter(Boolean).join(' · ');
      case 'Unghie': return 'armi naturali 1d3 (1d2 se Piccolo), attacchi secondari';
      case 'Calderone': return 'talento bonus Mescere Pozioni, +4 cognitivo ad Artigianato (alchimia)';
      default: return '';
    }
  }
  function sezioneFattucchiere(p, d, c) {
    const id = p.id;
    const f = d.fattucchiere;
    if (!Array.isArray(f.fatture)) f.fatture = [];
    const liv = livelloClasse(d, 'Fattucchiere');
    const int = c.m.INT;
    const cd = 10 + Math.floor(liv / 2) + int;
    const extraTalenti = d.capacita.filter((x) => norm(x.nome || '') === norm('Fattura Extra')).length;
    const disponibili = 1 + Math.floor(liv / 2) + n(f.extra) + extraTalenti;
    const scelte = f.fatture;
    const motivoNo = (x) => {
      const out = [];
      if (x.livello > liv) out.push(`dal ${x.livello}° livello`);
      const mancano = x.richieste.filter((r) => !scelte.includes(r));
      if (mancano.length) out.push(`richiede ${mancano.join(', ')}`);
      return out;
    };
    // Fatture scelte: elenco per la scheda, con CD e valori al livello attuale
    const prese = scelte.map((nome) => {
      const x = fatturaDi(nome);
      if (!x) return '';
      const nota = notaFattura(nome, liv, int);
      return `<li><b>${esc(nome)}</b> <small class="muto">(${esc(x.tipo || '—')}${x.categoria !== 'fattura' ? ', ' + (x.categoria === 'maggiore' ? 'maggiore' : 'superiore') : ''})</small>
          ${x.volta24 ? '<small class="fat-24" title="Lo stesso bersaglio non può esserne influenzato di nuovo per 24 ore">1 volta / 24 h per bersaglio</small>' : ''}
          ${nota ? `<div class="muto fat-nota">${esc(nota)}</div>` : ''}
          <button class="btn-mini" data-azione="pf1-info-fattura" data-nome="${esc(nome)}" title="Descrizione dal wiki">i</button></li>`;
    }).join('');
    const filtro = f.filtro || 'disponibili';
    const griglie = CATEGORIE_FATTURA.map(([cat, titolo, dal]) => {
      const voci = FATTURE.filter((x) => x.categoria === cat).filter((x) => scelte.includes(x.nome) || filtro === 'tutte' || !motivoNo(x).length).map((x) => {
        const presa = scelte.includes(x.nome);
        const no = motivoNo(x);
        return `<label class="riv alc-scop${no.length && !presa ? ' non-ancora' : ''}${presa ? ' presa' : ''}">
          <input type="checkbox" ${presa ? 'checked' : ''} data-azione="pf1-fattura" data-id="${id}" data-nome="${esc(x.nome)}">
          <span>${esc(x.nome)} <small class="muto">(${esc(x.tipo || '—')})${no.length ? ` <i class="alc-no">${esc(no.join('; '))}</i>` : ''}</small></span>
          <button class="btn-mini" data-azione="pf1-info-fattura" data-nome="${esc(x.nome)}" title="Descrizione dal wiki">i</button></label>`;
      }).join('');
      if (!voci) return liv >= dal || filtro === 'tutte' ? '' : `<p class="muto pf-aiuto">${titolo}: dal ${dal}° livello (al posto di una fattura).</p>`;
      return `<h4>${titolo}${cat !== 'fattura' ? ` <small class="muto">dal ${dal}° livello, al posto di una fattura</small>` : ''}</h4><div class="riv-griglia alc-griglia">${voci}</div>`;
    }).join('');
    return `<div class="alc-pannello">
        <h4>🧹 Fatture scelte <small class="${scelte.length > disponibili ? 'oltre' : 'muto'}">${scelte.length} / ${disponibili}</small>
          <small class="muto">CD ${cd} (10 + ½ livello + INT) · azione standard, non provoca attacchi di opportunità</small></h4>
        ${prese ? `<ul class="fat-prese">${prese}</ul>` : '<p class="muto">Nessuna fattura scelta: spuntale qui sotto.</p>'}
      </div>
      <div class="pf-riga">
        <label>Mostra <select data-pf1="fattucchiere|filtro" data-id="${id}" data-ridisegna-pf1>${opz([['disponibili', 'Solo quelle che posso prendere'], ['tutte', 'Tutte (anche non ancora disponibili)']], filtro)}</select></label>
        <label title="Talento Fattura Extra (contato da solo se è tra i talenti) o altre fonti">Fatture extra <input type="number" data-pf1="fattucchiere|extra" data-id="${id}" data-tipo="numero" value="${esc(f.extra)}" min="0"></label>
        ${extraTalenti ? `<small class="muto">+${extraTalenti} dal talento Fattura Extra</small>` : ''}
        <small class="muto">una al 1° livello, poi al 2° e ogni 2 livelli</small>
      </div>
      ${griglie}`;
  }

  // ---- Energia divina e capacità a usi giornalieri ----
  function risorseDivine(d, c) {
    const out = [];
    const ch = livelloClasse(d, 'Chierico');
    if (ch > 0) out.push({ chiave: 'incanalare', nome: 'Incanalare Energia', usi: 3 + c.m.CAR, dadi: Math.ceil(ch / 2), cd: 10 + Math.floor(ch / 2) + c.m.CAR, incanala: true, pagina: 'Chierico' });
    const pal = livelloClasse(d, 'Paladino');
    if (pal >= 2) out.push({ chiave: 'mani', nome: 'Imposizione delle Mani', usi: Math.floor(pal / 2) + c.m.CAR, dadi: Math.floor(pal / 2), pagina: 'Paladino',
      incanalaDa: pal >= 4 ? { dadi: Math.ceil(pal / 2), cd: 10 + Math.floor(pal / 2) + c.m.CAR, nome: 'Incanalare Energia Positiva' } : null });
    const anti = livelloClasse(d, 'Antipaladino');
    if (anti >= 2) out.push({ chiave: 'corruzione', nome: 'Tocco di Corruzione', usi: Math.floor(anti / 2) + c.m.CAR, dadi: Math.floor(anti / 2), pagina: 'Antipaladino',
      incanalaDa: anti >= 4 ? { dadi: Math.ceil(anti / 2), cd: 10 + Math.floor(anti / 2) + c.m.CAR, nome: 'Incanalare Energia Negativa' } : null });
    const sg = livelloClasse(d, 'Sacerdote Guerriero');
    if (sg >= 2) {
      const dadi = 1 + Math.floor((sg - 2) / 3);
      out.push({ chiave: 'fervore', nome: 'Fervore', usi: Math.floor(sg / 2) + c.m.SAG, dadi, pagina: 'Sacerdote_Guerriero',
        incanalaDa: sg >= 4 ? { dadi, cd: 10 + Math.floor(sg / 2) + c.m.SAG, nome: 'Incanalare Energia' } : null });
    }
    const or = livelloClasse(d, 'Oracolo');
    if (or > 0 && d.oracolo.mistero === 'Vita' && (d.oracolo.rivelazioni || []).includes('Incanalare')) {
      out.push({ chiave: 'incanalareOracolo', nome: 'Incanalare (Mistero della Vita)', usi: 1 + c.m.CAR, dadi: Math.ceil(or / 2), cd: 10 + Math.floor(or / 2) + c.m.CAR, incanala: true, pagina: 'Mistero_della_Vita' });
    }
    return out.map((r) => ({ ...r, usi: Math.max(0, r.usi), usati: n(d.energia.usati[r.chiave]) }));
  }
  // Energia positiva o negativa: dalla scelta del giocatore, altrimenti dall'allineamento della divinità
  function tipoEnergia(d) {
    if (d.energia.tipo) return d.energia.tipo;
    const al = divinitaDi(d)?.allineamento || '';
    return al.endsWith('M') ? 'negativa' : 'positiva';
  }
  function sezioneEnergia(p, d, c) {
    const id = p.id;
    const tipo = tipoEnergia(d);
    const righe = risorseDivine(d, c).map((r) => `<div class="energia">
        <div class="pf-riga">
          <b class="energia-nome">${esc(r.nome)}</b>
          <span class="muto">${r.usi} al giorno · ${r.dadi}d6${r.cd ? ' · CD ' + r.cd : ''}</span>
          <span class="pf-pallini">${pallini(r.usi, r.usati, `data-azione="pf1-energia-pallino" data-id="${id}" data-chiave="${r.chiave}"`)}</span>
        </div>
        <div class="pf-riga">
          <button class="btn-piccolo" data-azione="pf1-energia" data-id="${id}" data-chiave="${r.chiave}" data-modo="usa">🎲 ${r.incanala ? 'Incanala' : 'Usa'} (${r.dadi}d6)</button>
          ${r.incanalaDa ? `<button class="btn-piccolo" data-azione="pf1-energia" data-id="${id}" data-chiave="${r.chiave}" data-modo="incanala">🎲 ${esc(r.incanalaDa.nome)} (2 usi, ${r.incanalaDa.dadi}d6, CD ${r.incanalaDa.cd})</button>` : ''}
        </div>
      </div>`).join('');
    return `<div class="pf-riga"><label>Energia incanalata <select data-pf1="energia|tipo" data-id="${id}" data-ridisegna-pf1>
        ${opz([['', `automatica (${tipo})`], ['positiva', 'positiva — cura i vivi, ferisce i non morti'], ['negativa', 'negativa — ferisce i vivi, cura i non morti']], d.energia.tipo)}</select></label></div>
      ${righe}`;
  }
  function usaEnergia(p, chiave, modo) {
    const d = dati(p);
    const r = risorseDivine(d, calcola(p, ctx.regDi(p))).find((x) => x.chiave === chiave);
    if (!r) return;
    const costo = modo === 'incanala' ? 2 : 1;
    if (r.usati + costo > r.usi) { ctx.toast(`${esc(r.nome)}: usi esauriti per oggi`, 'errore'); return; }
    d.energia.usati[chiave] = r.usati + costo;
    const dadi = modo === 'incanala' ? r.incanalaDa.dadi : r.dadi;
    const nome = modo === 'incanala' ? r.incanalaDa.nome : r.nome;
    const tipo = tipoEnergia(d);
    ctx.salva();
    ctx.eseguiTiro(`${dadi}d6`, `${p.nome} · ${nome}${r.incanala || modo === 'incanala' ? ' (' + tipo + ')' : ''}`);
    ctx.render();
  }

  // Danni (prima sui PF temporanei) e cure (fino al massimo) per un PG con scheda PF1
  function modificaPf(p, delta) {
    const d = dati(p);
    const c = calcola(p, ctx.regDi(p));
    let att = c.pfAtt;
    if (delta < 0) {
      let danno = -delta;
      const temp = n(d.pf.temp);
      if (temp > 0) { const assorbiti = Math.min(temp, danno); d.pf.temp = temp - assorbiti || ''; danno -= assorbiti; }
      att -= danno;
    } else {
      att += delta;
      if (c.pfMax > 0) att = Math.min(c.pfMax, att);
    }
    d.pf.attuali = att;
  }

  // =====================================================================
  // Modifica dei dati
  // =====================================================================
  // Percorsi tipo "classi#<id>|livello" o "abil|Acrobazia|gradi": '|' separa i livelli,
  // "lista#id" seleziona l'elemento con quell'id dentro un array.
  function trova(radice, percorso) {
    const parti = percorso.split('|');
    let o = radice;
    for (let i = 0; i < parti.length - 1; i++) {
      const s = parti[i];
      if (s.includes('#')) {
        const [k, id] = s.split('#');
        o = (o[k] || []).find((x) => x.id === id);
      } else {
        if (o[s] == null || typeof o[s] !== 'object') o[s] = {};
        o = o[s];
      }
      if (!o) return null;
    }
    return [o, parti[parti.length - 1]];
  }
  function valoreDa(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.dataset.tipo === 'numero') return el.value === '' ? '' : Number(el.value);
    return el.value;
  }

  function applicaScheda(el) {
    const p = ctx.personaggio(el.dataset.id);
    if (!p) return;
    const t = trova(dati(p), el.dataset.pf1);
    if (!t) return;
    t[0][t[1]] = valoreDa(el);
    // Cambiando dominio, il sottodominio scelto prima non vale più
    if (/^fede\|slot\|\d+\|dominio$/.test(el.dataset.pf1)) t[0].sotto = '';
    // Scegliendo la razza: taglia, velocità e nome nei dati di testo; la scelta della caratteristica va rifatta
    if (el.dataset.pf1 === 'razza|nome') {
      const r = RAZZE[t[0].nome];
      t[0].scelta = '';
      t[0].alternativi = [];
      if (r) {
        dati(p).taglia = TAGLIE.some((x) => x[0] === r.taglia) ? r.taglia : 'Media';
        p.campi = p.campi || {};
        p.campi.Razza = r.nome;
        p.campi['Velocità'] = `${String(r.velocita).replace('.', ',')} m`;
      }
    }
    // Famiglio: il bonus che dà al padrone diventa un bonus attivo della scheda
    const famM = el.dataset.pf1.match(/^compagni#([^|]+)\|specie$/);
    if (famM) {
      const d = dati(p);
      const x = d.compagni.find((y) => y.id === famM[1]);
      if (x?.tipo === 'famiglio') {
        if (x.bonusId) d.bonus = d.bonus.filter((b) => b.id !== x.bonusId);
        x.bonusId = '';
        const fam = COMP.famigli.find((f) => norm(f[0]) === norm(x.specie || ''));
        const eff = fam ? effettiFamiglio(fam[1], ctx.regDi(p).abilita) : [];
        if (eff.length) {
          const b = { id: uid(), nome: `Famiglio: ${fam[0]}`, attivo: true, effetti: eff.map((e) => ({ id: uid(), ...e })) };
          d.bonus.push(b);
          x.bonusId = b.id;
        }
      }
    }
    // Oggetto magico spostato: il suo bonus vale solo se è indossato
    const doveM = el.dataset.pf1.match(/^oggetti#([^|]+)\|dove$/);
    if (doveM) {
      const d = dati(p);
      const o = d.oggetti.find((y) => y.id === doveM[1]);
      const b = o?.bonusId ? d.bonus.find((x) => x.id === o.bonusId) : null;
      if (b) b.attivo = (window.Luoghi ? window.Luoghi.tipoDi(o.dove, d).k : o.dove) === 'indossato';
    }
    // Oggetto creato nell'officina: la voce collegata della scheda segue le modifiche
    const crM = el.dataset.pf1.match(/^creazioni#([^|]+)\|/);
    if (crM) {
      const d = dati(p);
      const x = d.creazioni.find((y) => y.id === crM[1]);
      if (x) sincronizzaCreazione(d, x);
    }
    // Cambiando scuola arcana, sottoscuola e scuole opposte vanno riscelte
    if (el.dataset.pf1 === 'mago|scuola') { t[0].sotto = ''; t[0].opposte = ['', '']; }
    // Togliendo la tabella automatica, gli slot partono dai valori della tabella (poi si modificano a mano)
    if (/^incantatori#[^|]+\|auto$/.test(el.dataset.pf1) && !t[0].auto) {
      const inc = t[0];
      const k = nomeClasse(inc.classe);
      const lv = livelloClasse(dati(p), k);
      inc.slot = inc.slot || {};
      for (let L = 0; L <= 9; L++) {
        inc.slot[L] = inc.slot[L] || {};
        inc.slot[L].base = TABELLE.alGiorno(k, lv, L);
      }
      inc.livello = Math.max(0, lv - (CL_MENO_3.has(k) ? 3 : 0));
    }
    p.modificato = Date.now();
    ctx.salva();
    aggiorna(p);
  }

  // Scelta della classe: menu a tendina con le classi in elenco; una classe fuori elenco si scrive a mano
  // (con il pulsante per tornare all'elenco)
  function sceltaClasse(cl, id) {
    const k = nomeClasse(cl.nome);
    if (cl.nome && !k) {
      return `<input class="pf-largo" data-pf1="classi#${cl.id}|nome" data-id="${id}" value="${esc(cl.nome)}" placeholder="Nome della classe">
        <button class="btn-mini" data-azione="pf1-classe-elenco" data-id="${id}" data-cl="${cl.id}" title="Scegli una classe dall'elenco">📋 Elenco</button>`;
    }
    const nomi = Object.keys(CLASSI).sort((a, b) => a.localeCompare(b, 'it'));
    const gruppo = (titolo, lista) => `<optgroup label="${titolo}">${lista.map((x) => `<option value="${esc(x)}"${x === k ? ' selected' : ''}>${esc(x)}</option>`).join('')}</optgroup>`;
    return `<select class="pf-largo" data-pf1="classi#${cl.id}|nome" data-id="${id}">
        <option value=""${k ? '' : ' selected'}>— scegli la classe —</option>
        ${gruppo('Classi', nomi.filter((x) => !CLASSI[x].prestigio))}
        ${gruppo('Classi di prestigio', nomi.filter((x) => CLASSI[x].prestigio))}
        <option value="Classe personalizzata">✎ Altra classe (personalizzata)…</option>
      </select>`;
  }

  function cambioScheda(el) {
    const percorso = el.dataset.pf1;
    const p = ctx.personaggio(el.dataset.id);
    if (!p) return;
    // Scrivendo il nome di una classe nota, ne applica progressione e abilità di classe
    if (/^classi#[^|]+\|nome$/.test(percorso)) {
      const [cl] = trova(dati(p), percorso);
      const k = nomeClasse(cl.nome);
      if (k) Object.assign(cl, progressione(k));
      ctx.salva();
      ctx.render();
      return;
    }
    // Campi che cambiano la struttura della pagina (pallini degli slot, ecc.)
    if (/\|slot\|\d\|base$|\|preparati$|^mitico\|(grado|percorso)$|^incantatori#[^|]+\|(tipo|car)$|^armi#[^|]+\|tipo$/.test(percorso)) ctx.render();
  }

  // =====================================================================
  // Vista della scheda completa
  // =====================================================================
  const chiuse = new Set(['talenti']); // sezioni chiuse dall'utente (l'elenco dei talenti parte chiuso)

  // ---- Elenco dei talenti del wiki con ricerca e filtri (filtri in memoria, non salvati) ----
  const filtriTalenti = { testo: '', tipo: '', pre: '', manuale: '', stato: '', mitici: 'no' };
  const MAX_TALENTI = 150;
  const ICONA_STATO = { ok: ['✔', 'Prerequisiti soddisfatti'], forse: ['?', 'Qualche prerequisito va verificato a mano'], no: ['✖', 'Prerequisiti non soddisfatti'] };
  function listaTalentiHtml(p) {
    if (!p) return '';
    const d = dati(p);
    const c = calcola(p, ctx.regDi(p));
    const f = filtriTalenti;
    const q = norm(f.testo.trim());
    const qp = norm(f.pre.trim());
    const presi = new Set(d.capacita.map((x) => norm(x.nome)));
    const filtrati = [];
    for (const t of TALENTI.voci) {
      const mitico = t.tipi.includes('Mitico');
      if (f.mitici === 'no' && mitico) continue;
      if (f.mitici === 'solo' && !mitico) continue;
      if (f.tipo && !t.tipi.includes(f.tipo)) continue;
      if (f.manuale && t.manuale !== f.manuale) continue;
      if (q && !norm(t.nome).includes(q) && !norm(t.en).includes(q)) continue;
      if (qp && !norm(t.prerequisiti).includes(qp)) continue;
      const s = statoTalento(t, p, d, c);
      if (f.stato === 'acquisibili' && s.stato === 'no') continue;
      if (f.stato === 'ok' && s.stato !== 'ok') continue;
      if (f.stato === 'no' && s.stato !== 'no') continue;
      filtrati.push([t, s]);
    }
    const righe = filtrati.slice(0, MAX_TALENTI).map(([t, s]) => {
      const preso = presi.has(norm(t.nome));
      const pre = s.req.length ? s.req.map((r) => `<span class="pre-${r.esito === true ? 'ok' : r.esito === false ? 'no' : 'forse'}">${esc(r.testo)}</span>`).join(', ') : '<span class="muto">nessuno</span>';
      const mancano = s.req.filter((r) => r.esito === false).map((r) => r.testo).join(', ');
      return `<div class="tal-riga tal-${s.stato}${preso ? ' presa' : ''}">
        <span class="tal-stato" title="${ICONA_STATO[s.stato][1]}">${ICONA_STATO[s.stato][0]}</span>
        <div class="tal-corpo">
          <div><b>${esc(t.nome)}</b> ${t.en ? `<small class="muto">${esc(t.en)}</small>` : ''} <small class="tal-tipi">${esc(t.tipi.join(', '))}</small>${preso ? ' <small class="tal-preso">già preso</small>' : ''}</div>
          <div class="tal-pre"><span class="muto">Prerequisiti:</span> ${pre}</div>
        </div>
        <button class="btn-mini" data-azione="pf1-info-talento" data-nome="${esc(t.nome)}" title="Descrizione dal wiki">i</button>
        <button class="btn-piccolo" data-azione="pf1-prendi-talento" data-id="${p.id}" data-nome="${esc(t.nome)}" ${s.stato === 'no' ? `disabled title="Manca: ${esc(mancano)}"` : 'title="Aggiungi ai talenti del personaggio"'}>+ Prendi</button>
      </div>`;
    }).join('');
    const conta = `<p class="muto tal-conta">${filtrati.length} talenti${filtrati.length > MAX_TALENTI ? ` · ne mostro ${MAX_TALENTI}: restringi la ricerca` : ''}</p>`;
    return conta + (righe || '<p class="muto">Nessun talento con questi filtri.</p>');
  }
  // Menu dei talenti che il personaggio può prendere ora (prerequisiti soddisfatti o da verificare), con il tasto Prendi
  // ---- Talento Incantesimi Aggiuntivi: 1 incantesimo conosciuto in più (di un livello che si lancia),
  //      oppure 2 di almeno un livello sotto il massimo. Solo per incantatori spontanei; si può prendere più volte. ----
  const NOME_INC_AGGIUNTIVI = 'Incantesimi Aggiuntivi';
  let incAgg = null; // { pg, inc, modo: 'uno'|'due', scelte: [{ livello, nome }] }
  // Livello più alto che l'incantatore sa lanciare (con almeno un incantesimo al giorno)
  const livMaxLancio = (ci) => Math.max(-1, ...(ci?.livelli || []).filter((l) => l.base !== '' && !l.troppoAlto && (l.tot > 0 || l.L === 0)).map((l) => l.L));
  // Talenti con una scelta (un'abilità o un'arma): il nome diventa «Abilità Focalizzata (Furtività)» o
  // «Arma Focalizzata (Spada Lunga)», ed è da quel nome che la scheda calcola i bonus. Si possono prendere più volte,
  // ogni volta su una scelta diversa; i gradini superiori solo sulle armi che hanno già quelli prima (prerequisiti).
  const TALENTI_CON_SCELTA = {
    'abilita focalizzata': { tipo: 'abilita', testo: '+3 all\'abilità scelta, +6 con almeno 10 gradi' },
    'arma focalizzata': { tipo: 'arma', testo: '+1 ai tiri per colpire con l\'arma scelta' },
    'arma focalizzata superiore': { tipo: 'arma', testo: 'un altro +1 ai tiri per colpire con l\'arma scelta', richiede: ['Arma Focalizzata'] },
    'arma specializzata': { tipo: 'arma', testo: '+2 ai danni con l\'arma scelta', richiede: ['Arma Focalizzata'] },
    'arma specializzata superiore': { tipo: 'arma', testo: 'un altro +2 ai danni con l\'arma scelta', richiede: ['Arma Focalizzata', 'Arma Focalizzata Superiore', 'Arma Specializzata'] },
    'critico migliorato': { tipo: 'arma', testo: 'raddoppia l\'intervallo di minaccia dell\'arma scelta (es. 19-20 diventa 17-20)' },
    'competenza nelle armi esotiche': { tipo: 'arma', testo: 'nessuna penalità di −4 con l\'arma esotica scelta', soloEsotiche: true },
    'incantesimi focalizzati': { tipo: 'scuola', testo: '+1 alla CD dei tiri salvezza contro gli incantesimi della scuola scelta' },
    'incantesimi focalizzati superiore': { tipo: 'scuola', testo: 'un altro +1 alla CD degli incantesimi della scuola scelta', richiede: ['Incantesimi Focalizzati'] },
  };
  // Testi della finestra per tipo di scelta
  const PAROLE_SCELTA = {
    abilita: { domanda: 'Su quale abilità?', voce: 'l\'abilità', una: 'un\'abilità', richiesti: 'Abilità con i talenti richiesti' },
    arma: { domanda: 'Con quale arma?', voce: 'l\'arma', una: 'un\'arma', richiesti: 'Armi con i talenti richiesti' },
    scuola: { domanda: 'Su quale scuola di magia?', voce: 'la scuola', una: 'una scuola', richiesti: 'Scuole con i talenti richiesti' },
  };
  // Incantesimi Focalizzati (e Superiore) sulla scuola di un incantesimo: +1 alla CD per ciascuno
  const focusScuola = (d, scuola) => ['Incantesimi Focalizzati', 'Incantesimi Focalizzati Superiore']
    .filter((t) => scuola && sceltePer(d, t).some((x) => norm(String(scuola)).startsWith(norm(x)))).length;
  const talentoConScelta = (nome) => TALENTI_CON_SCELTA[norm(nome)] || null;
  // Scelte già fatte per un talento (es. le armi di «Arma Focalizzata (…)»)
  const sceltePer = (d, nomeTalento) => d.capacita.filter((x) => baseTalento(x.nome || '') === norm(nomeTalento)).map((x) => sceltaTalento(x.nome)).filter(Boolean);
  // Abilità selezionabili: quelle del regolamento, con tutti i tipi di Artigianato, Professione e Intrattenere
  function abilitaPerTalento(p) {
    const r = ctx.regDi(p);
    return (r?.abilita || []).flatMap((a) => (ABIL_SPECIALIZZATE[a.nome] ? ABIL_SPECIALIZZATE[a.nome].map((t) => `${a.nome} (${t})`) : [a.nome]));
  }
  // Nome base di un'arma della scheda: senza potenziamento né «perfetta» («Spada lunga +1» → «Spada lunga»)
  const armaBase = (nome) => String(nome || '').replace(/\s*\+\d+\s*$/, '').replace(/\s+perfett[oa]\s*$/i, '').trim();
  // Gruppi di scelte del talento: [[titolo, [valori]]]
  function scelteTalento(p, t) {
    const d = dati(p);
    const spec = talentoConScelta(t.nome);
    const gia = new Set(sceltePer(d, t.nome).map(norm));
    const libera = (x) => !gia.has(norm(x));
    // Gradini superiori: solo le scelte (armi, scuole) su cui ci sono già tutti i talenti richiesti
    if (spec.richiede) {
      const ok = sceltePer(d, spec.richiede[0]).filter((x) => spec.richiede.every((r) => sceltePer(d, r).some((y) => norm(y) === norm(x))));
      return [[PAROLE_SCELTA[spec.tipo].richiesti, [...new Set(ok)].filter(libera)]].filter(([, l]) => l.length);
    }
    if (spec.tipo === 'abilita') return [['Abilità', abilitaPerTalento(p).filter(libera)]].filter(([, l]) => l.length);
    if (spec.tipo === 'scuola') return [['Scuole', SCUOLE_INC.filter((x) => x !== 'Universale').filter(libera)]].filter(([, l]) => l.length);
    const esotica = (x) => EQUIP.armi.some((v) => v[1] === 'Armi Esotiche' && norm(v[0]) === norm(x));
    const mie = [...new Set(d.armi.map((a) => armaBase(a.nome)).filter(Boolean))].filter((x) => !spec.soloEsotiche || esotica(x));
    const gruppi = [['Le armi del personaggio', mie.filter(libera)]];
    for (const cat of spec.soloEsotiche ? ['Armi Esotiche'] : ['Armi Semplici', 'Armi da Guerra', 'Armi Esotiche', 'Armi da Fuoco']) {
      gruppi.push([cat, EQUIP.armi.filter((v) => v[1] === cat && !mie.some((m) => norm(m) === norm(v[0]))).map((v) => v[0]).filter(libera)]);
    }
    return gruppi.filter(([, l]) => l.length);
  }
  function apriSceltaTalento(p, t) {
    document.getElementById('st-overlay')?.remove();
    const d = dati(p);
    const spec = talentoConScelta(t.nome);
    const gruppi = scelteTalento(p, t);
    const gia = sceltePer(d, t.nome);
    const P = PAROLE_SCELTA[spec.tipo];
    if (!gruppi.length) {
      ctx.toast(spec.richiede ? `Per <b>${esc(t.nome)}</b> serve prima ${esc(spec.richiede.join(', '))} sulla stessa ${spec.tipo === 'scuola' ? 'scuola' : 'arma'}` : `<b>${esc(t.nome)}</b> è già preso su tutte le scelte possibili`, 'errore');
      return;
    }
    const gradi = (a) => n(d.abil[a]?.gradi);
    const opzione = (x) => `<option value="${esc(x)}">${esc(x)}${spec.tipo === 'abilita' && gradi(x) ? ` (${gradi(x)} gradi)` : ''}</option>`;
    const ov = document.createElement('div');
    ov.id = 'st-overlay';
    ov.innerHTML = `<div class="info-box ia-box" role="dialog" aria-label="${esc(t.nome)}">
      <div class="info-testa"><h2>${esc(t.nome)}</h2><button class="btn-x" data-azione="pf1-scelta-talento-annulla" title="Annulla">×</button></div>
      <div class="info-corpo">
        <p class="muto">${esc(spec.testo[0].toUpperCase() + spec.testo.slice(1))}. Puoi prenderlo più volte, ogni volta su ${P.una} diversa${gia.length ? ` (già preso su: ${esc(gia.join(', '))})` : ''}.</p>
        <div class="pf-riga"><label class="pf-largo">${P.domanda} <select id="st-abilita"><option value="">— scegli ${P.voce} —</option>
          ${gruppi.length === 1 ? gruppi[0][1].map(opzione).join('') : gruppi.map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(opzione).join('')}</optgroup>`).join('')}</select></label></div>
        <div class="pf-piede"><button class="primario" data-azione="pf1-scelta-talento-ok" data-id="${p.id}" data-nome="${esc(t.nome)}">Prendi il talento</button><button data-azione="pf1-scelta-talento-annulla">Annulla</button></div>
      </div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  }
  function prendiTalentoConScelta(p, t, scelta) {
    const d = dati(p);
    const nome = `${t.nome} (${scelta})`;
    if (d.capacita.some((x) => norm(x.nome) === norm(nome))) { ctx.toast(`<b>${esc(nome)}</b> c'è già`, 'errore'); return false; }
    d.capacita.push({ id: uid(), nome, tipo: 'Talento', descrizione: '' });
    ctx.salva();
    ctx.render();
    const spec = talentoConScelta(t.nome);
    const bonus = n(d.abil[scelta]?.gradi) >= 10 ? 6 : 3;
    ctx.toast(`🎖 <b>${esc(nome)}</b> aggiunto ai talenti · ${spec.tipo === 'abilita' ? `${esc(scelta)} +${bonus}${bonus === 3 ? ' (+6 con 10 gradi)' : ''}` : esc(spec.testo)}`);
    return true;
  }
  function apriIncAggiuntivi(p) {
    const d = dati(p);
    const spontanei = d.incantatori.filter((x) => x.tipo === 'spontanei');
    if (!spontanei.length) { ctx.toast(`<b>${NOME_INC_AGGIUNTIVI}</b> si può prendere solo con una classe che lancia incantesimi spontanei (es. Stregone, Oracolo, Bardo): aggiungila prima negli Incantesimi`, 'errore'); return; }
    incAgg = { pg: p.id, inc: spontanei[0].id, modo: 'uno', scelte: [{ livello: '', nome: '' }, { livello: '', nome: '' }] };
    disegnaIncAggiuntivi();
  }
  function disegnaIncAggiuntivi() {
    document.getElementById('ia-overlay')?.remove();
    if (!incAgg) return;
    const p = ctx.personaggio(incAgg.pg);
    if (!p) { incAgg = null; return; }
    const d = dati(p);
    const c = calcola(p, ctx.regDi(p));
    const inc = d.incantatori.find((x) => x.id === incAgg.inc);
    const ci = c.incantatori.find((x) => x.id === inc?.id);
    const max = livMaxLancio(ci);
    const tetto = incAgg.modo === 'due' ? max - 1 : max;
    const codice = inc ? listaDi(inc) : '';
    const noti = new Set((inc?.incantesimi || []).map((s) => norm(s.nome)));
    const quanti = incAgg.modo === 'due' ? 2 : 1;
    const righe = incAgg.scelte.slice(0, quanti).map((sc, i) => {
      const L = sc.livello === '' ? '' : Number(sc.livello);
      const elenco = L === '' || !codice ? [] : [...INCANTESIMI.values()].filter((v) => v.livelli[codice] === L && !noti.has(norm(v.nome))).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
      return `<div class="ia-riga"><b>${quanti > 1 ? `${i + 1}°` : ''} incantesimo</b>
        <label>Livello <select data-ia="livello" data-i="${i}"><option value="">—</option>${Array.from({ length: Math.max(0, tetto + 1) }, (_, k) => `<option value="${k}"${L === k ? ' selected' : ''}>${k}°</option>`).join('')}</select></label>
        <label class="ia-nome">Incantesimo <input data-ia="nome" data-i="${i}" list="ia-elenco-${i}" value="${esc(sc.nome)}" placeholder="${L === '' ? 'scegli prima il livello' : `${elenco.length} incantesimi di ${L}° livello`}" ${L === '' ? 'disabled' : ''}></label>
        <datalist id="ia-elenco-${i}">${elenco.map((v) => `<option value="${esc(v.nome)}">${esc(v.base)}</option>`).join('')}</datalist></div>`;
    }).join('');
    const ov = document.createElement('div');
    ov.id = 'ia-overlay';
    ov.innerHTML = `<div class="info-box ia-box" role="dialog" aria-label="${NOME_INC_AGGIUNTIVI}">
      <div class="info-testa"><h2>${NOME_INC_AGGIUNTIVI}</h2><button class="btn-x" data-azione="ia-annulla" title="Annulla">×</button></div>
      <div class="info-corpo">
        <p class="muto">Aggiunge agli incantesimi conosciuti, oltre a quelli della classe: <b>un</b> incantesimo di un livello che sai lanciare, oppure <b>due</b> incantesimi di almeno un livello inferiore al più alto che sai lanciare. La scelta non si può cambiare.</p>
        <div class="pf-riga">
          ${d.incantatori.filter((x) => x.tipo === 'spontanei').length > 1 ? `<label>Classe <select data-ia="inc">${d.incantatori.filter((x) => x.tipo === 'spontanei').map((x) => `<option value="${x.id}"${x.id === incAgg.inc ? ' selected' : ''}>${esc(x.classe)}</option>`).join('')}</select></label>` : `<span>Classe: <b>${esc(inc?.classe || '')}</b></span>`}
          <span class="muto">livello più alto che lanci: <b>${max >= 0 ? max + '°' : '—'}</b></span>
        </div>
        <div class="ia-modi">
          <label class="pf-chk"><input type="radio" name="ia-modo" data-ia="modo" value="uno" ${incAgg.modo === 'uno' ? 'checked' : ''}> 1 incantesimo (fino al ${Math.max(0, max)}° livello)</label>
          <label class="pf-chk"><input type="radio" name="ia-modo" data-ia="modo" value="due" ${incAgg.modo === 'due' ? 'checked' : ''} ${max < 1 ? 'disabled title="Serve saper lanciare almeno incantesimi di 1° livello"' : ''}> 2 incantesimi (fino al ${Math.max(0, max - 1)}° livello)</label>
        </div>
        ${max < 0 ? '<p class="oltre">Questa classe non lancia ancora incantesimi.</p>' : righe}
        <div class="pf-piede"><button class="primario" data-azione="ia-conferma" ${max < 0 ? 'disabled' : ''}>Prendi il talento</button><button data-azione="ia-annulla">Annulla</button></div>
      </div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) { incAgg = null; ov.remove(); } });
    // Le scelte nel riquadro aggiornano lo stato e ridisegnano (il nome dell'incantesimo no: si perderebbe il cursore)
    ov.addEventListener('change', (e) => {
      const el = e.target.closest('[data-ia]');
      if (!el || !incAgg) return;
      const k = el.dataset.ia;
      if (k === 'inc') { incAgg.inc = el.value; incAgg.scelte = incAgg.scelte.map(() => ({ livello: '', nome: '' })); }
      else if (k === 'modo') incAgg.modo = el.value;
      else if (k === 'livello') { incAgg.scelte[Number(el.dataset.i)] = { livello: el.value, nome: '' }; }
      else if (k === 'nome') { incAgg.scelte[Number(el.dataset.i)].nome = el.value; return; }
      disegnaIncAggiuntivi();
    });
    ov.addEventListener('input', (e) => { const el = e.target.closest('[data-ia="nome"]'); if (el && incAgg) incAgg.scelte[Number(el.dataset.i)].nome = el.value; });
  }

  // ---- Scoperte Arcane del Mago (src/pf1-scoperte-arcane.js): si prendono al posto di un talento (normale o bonus) ----
  // [nome, tipo, livello minimo da mago, talenti richiesti, più volte]
  const SCOPERTE_ARCANE = window.PF1_SCOPERTE_ARCANE || [];
  const scopertaArcana = (nome) => SCOPERTE_ARCANE.find((x) => norm(x[0]) === norm(nome)) || null;
  const scopertePrese = (d, nome) => d.capacita.filter((x) => norm(x.scoperta || '') === norm(nome)).length;
  // Opzioni del sottomenu: disponibili (livello e talenti soddisfatti) e non ancora disponibili (disattivate, con il motivo)
  function opzioniScoperteArcane(d) {
    const mago = livelloClasse(d, 'Mago');
    if (!mago || !SCOPERTE_ARCANE.length) return '';
    const voci = SCOPERTE_ARCANE.filter(([nome, , , , piu]) => piu || !scopertePrese(d, nome)).map(([nome, tipo, liv, talenti]) => {
      const manca = [mago < liv ? `mago di ${liv}° livello` : '', ...talenti.filter((t) => !haTalento(d, t))].filter(Boolean);
      return `<option value="SA:${esc(nome)}"${manca.length ? ` disabled title="Serve: ${esc(manca.join(', '))}"` : ''}>${esc(nome)}${tipo ? ` (${tipo})` : ''} · mago ${liv}°${manca.length ? ` — serve ${esc(manca.join(', '))}` : ''}</option>`;
    });
    return voci.length ? `<optgroup label="Scoperte arcane del mago (al posto di un talento)">${voci.join('')}</optgroup>` : '';
  }
  function prendiScopertaArcana(p, nome) {
    const s = scopertaArcana(nome);
    if (!s) return;
    const d = dati(p);
    const [base, tipo, liv, talenti, piu] = s;
    const mago = livelloClasse(d, 'Mago');
    const manca = [mago < liv ? `mago di ${liv}° livello` : '', ...talenti.filter((t) => !haTalento(d, t))].filter(Boolean);
    if (manca.length) { ctx.toast(`Non puoi prendere <b>${esc(base)}</b>: serve ${esc(manca.join(', '))}`, 'errore'); return; }
    const gia = scopertePrese(d, base);
    if (gia && !piu) { ctx.toast(`<b>${esc(base)}</b> c'è già`, 'errore'); return; }
    d.capacita.push({ id: uid(), nome: `${base}${tipo ? ` (${tipo})` : ''}${gia ? ` ${gia + 1}` : ''}`, tipo: 'Scoperta arcana', scoperta: base, descrizione: '' });
    ctx.salva();
    ctx.render();
    ctx.toast(`🔮 Scoperta arcana <b>${esc(base)}</b> aggiunta al posto di un talento${piu ? ' · si può prendere più volte, ogni volta su una scelta diversa (scrivila nella descrizione)' : ''}`);
  }
  // Descrizione dal wiki: la sezione della scoperta nella pagina Mago/Scoperte_Arcane
  const estraiScoperta = (nome) => (doc) => {
    const titoli = [...doc.querySelectorAll('#mw-content-text h3')];
    const h = titoli.find((x) => norm(x.textContent).startsWith(norm(nome)));
    if (!h) return '';
    const parti = [];
    for (let el = h.nextElementSibling; el && !/^H[23]$/.test(el.tagName); el = el.nextElementSibling) { const t = el.textContent.replace(/\s+/g, ' ').trim(); if (t) parti.push(t); }
    return parti.join('\n\n');
  };
  function infoScopertaArcana(nome) {
    const s = scopertaArcana(nome);
    if (!s) return;
    apriInfo(s[0], `<div class="info-fatti">${fatto('Tipo', 'Scoperta arcana del mago, al posto di un talento')}${fatto('Prerequisiti', [`mago di ${s[2]}° livello`, ...s[3]].join(', '))}${fatto('Più volte', s[4] ? 'sì, su scelte diverse' : '')}${fatto('Manuale', 'Guida del Giocatore Avanzata')}</div>`,
      'Mago/Scoperte_Arcane', estraiScoperta(s[0]));
  }
  function sceltaTalentoHtml(p, idSel, soloTipo = '') {
    const d = dati(p);
    const c = calcola(p, ctx.regDi(p));
    // Incantesimi Aggiuntivi si può prendere più volte: resta nell'elenco anche se già preso
    const presi = new Set(d.capacita.map((x) => norm(x.nome)).filter((x) => x !== norm(NOME_INC_AGGIUNTIVI)));
    const ok = [], forse = [];
    for (const t of TALENTI.voci) {
      if (t.tipi.includes('Mitico') || presi.has(norm(t.nome))) continue;
      if (soloTipo && !t.tipi.includes(soloTipo)) continue;
      const s = statoTalento(t, p, d, c);
      if (s.stato === 'ok') ok.push(t); else if (s.stato === 'forse') forse.push(t);
    }
    const opzioni = (l) => l.map((t) => `<option value="${esc(t.nome)}">${esc(t.nome)}${t.tipi.length ? ` (${esc(t.tipi.join(', '))})` : ''}</option>`).join('');
    return `<span class="tal-scelta"><select id="${idSel}"><option value="">— scegli tra ${ok.length + forse.length} talenti acquisibili —</option>
      ${ok.length ? `<optgroup label="Prerequisiti soddisfatti">${opzioni(ok)}</optgroup>` : ''}${forse.length ? `<optgroup label="Prerequisiti da verificare a mano">${opzioni(forse)}</optgroup>` : ''}${soloTipo ? '' : opzioniScoperteArcane(d)}</select>
      <button class="btn-mini" data-azione="pf1-talento-scelto" data-id="${p.id}" data-sel="${idSel}" title="Descrizione dal wiki" data-solo-info="1">i</button>
      <button class="btn-piccolo" data-azione="pf1-talento-scelto" data-id="${p.id}" data-sel="${idSel}">+ Prendi</button></span>`;
  }
  function sezioneTalenti(p) {
    const f = filtriTalenti;
    const s = (k, lista, v) => `<select data-filtro-talenti="${k}">${opz(lista, v)}</select>`;
    return `<div class="tal-filtri">
        <label>Nome <input type="search" data-filtro-talenti="testo" value="${esc(f.testo)}" placeholder="italiano o originale"></label>
        <label>Tipo ${s('tipo', [['', 'tutti'], ...TALENTI.tipi.filter((t) => t !== 'Mitico').map((t) => [t, t])], f.tipo)}</label>
        <label>Prerequisiti <input type="search" data-filtro-talenti="pre" value="${esc(f.pre)}" placeholder="es. Schivare, Forza"></label>
        <label>Manuale ${s('manuale', [['', 'tutti'], ...TALENTI.manuali.map((m) => [m, m])], f.manuale)}</label>
        <label>Mostra ${s('stato', [['', 'tutti'], ['acquisibili', 'acquisibili (anche da verificare)'], ['ok', 'solo con prerequisiti soddisfatti'], ['no', 'solo non acquisibili']], f.stato)}</label>
        <label>Mitici ${s('mitici', [['no', 'esclusi'], ['si', 'inclusi'], ['solo', 'solo mitici']], f.mitici)}</label>
      </div>
      <p class="muto pf-aiuto"><span class="pre-ok">verde</span> = soddisfatto, <span class="pre-no">rosso</span> = manca, <span class="pre-forse">giallo</span> = da verificare a mano (privilegi di classe, scelte particolari…). Un talento con un prerequisito mancante si vede ma non si può prendere.</p>
      <div id="elenco-talenti" data-pg="${p.id}">${chiuse.has('talenti') ? '' : listaTalentiHtml(p)}</div>`;
  }
  const bonusAperti = new Set(); // bonus con l'editor degli effetti aperto
  document.addEventListener('toggle', (e) => {
    const el = e.target;
    if (el.classList?.contains('pf-sez') || el.dataset?.sez === 'talenti') { if (el.open) chiuse.delete(el.dataset.sez); else chiuse.add(el.dataset.sez); }
    // L'elenco dei talenti si costruisce solo quando lo si apre
    if (el.dataset?.sez === 'talenti' && el.open) {
      const box = el.querySelector('#elenco-talenti');
      if (box && !box.innerHTML.trim()) box.innerHTML = listaTalentiHtml(ctx.personaggio(box.dataset.pg));
    }
  }, true);

  function aiutanti(p, c) {
    const v = mappa(c);
    const id = p.id;
    const campo = (percorso, valore, extra = '') => `<input data-pf1="${esc(percorso)}" data-id="${id}" value="${esc(valore ?? '')}" ${extra}>`;
    return {
      v,
      k: (chiave) => `<span data-calc="${esc(chiave)}">${esc(v[chiave] ?? '')}</span>`,
      campo,
      num: (percorso, valore, extra = '') => campo(percorso, valore, `type="number" data-tipo="numero" ${extra}`),
      chk: (percorso, valore, extra = '') => `<input type="checkbox" data-pf1="${esc(percorso)}" data-id="${id}" ${valore ? 'checked' : ''} ${extra}>`,
      sel: (percorso, lista, valore, extra = '') => `<select data-pf1="${esc(percorso)}" data-id="${id}" ${extra}>${opz(lista, valore)}</select>`,
      dado: (tiro, titolo) => `<button class="btn-dado" data-azione="pf1-tira" data-id="${id}" data-tiro="${esc(tiro)}" title="Tira: ${esc(titolo)}">🎲</button>`,
      togli: (lista, elem, extra = '') => `<button class="btn-x" data-azione="pf1-rimuovi" data-id="${id}" data-lista="${esc(lista)}" data-elem="${esc(elem)}" ${extra} title="Rimuovi">×</button>`,
      aggiungi: (lista, testo) => `<button class="btn-piccolo" data-azione="pf1-aggiungi" data-id="${id}" data-lista="${lista}">+ ${testo}</button>`,
    };
  }

  // Libro degli incantesimi / formulario / famiglio: cosa contiene, per livello, con preparazione rapida
  function vistaLibro(p, inc, libro, elenco, codice, togli) {
    const id = p.id;
    const d = dati(p);
    const voci = inc.libro || [];
    const [nomeLibro, cosa] = libro;
    const preparati = new Map((inc.incantesimi || []).map((s) => [norm(s.nome), n(s.preparati)]));
    const livelli = [...new Set(voci.map((s) => n(s.livello)))].sort((a, b) => a - b);
    const righe = livelli.map((L) => `<div class="pf-libro-liv"><b>${L}°</b><div class="pf-libro-voci">${voci.filter((s) => n(s.livello) === L)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')).map((s) => {
        const v = incantesimoDi(s.nome);
        const prep = preparati.get(norm(s.nome)) || 0;
        return `<span class="pf-libro-voce${prep ? ' preparato' : ''}">${esc(s.nome)}${v ? ` <small class="muto" title="${esc(v.scuola)}">${esc(v.base)}</small><button class="btn-mini" data-azione="pf1-info-inc" data-nome="${esc(v.nome)}" title="Descrizione dal wiki">i</button>` : ''}
          <button class="btn-mini pf-libro-prep" data-azione="pf1-libro-prepara" data-id="${id}" data-inc="${inc.id}" data-libro="${s.id}" title="Prepara una copia per oggi${prep ? ` (già preparate: ${prep})` : ''}">${prep ? `✔${prep > 1 ? ` ${prep}` : ''}` : 'prep'}</button>${togli(`incantatori#${inc.id}|libro`, s.id)}</span>`;
      }).join('')}</div></div>`).join('');
    const mago = nomeClasse(inc.classe) === 'Mago';
    const opposte = mago ? (d.mago.opposte || []).filter(Boolean) : [];
    const trucchetti = mago ? elenco.filter((v) => v.livelli[codice] === 0 && !opposte.includes(v.base) && !voci.some((s) => norm(s.nome) === norm(v.nome))).length : 0;
    const aiuto = mago ? 'Al 1° livello: tutti i trucchetti (tranne le scuole opposte), 3 incantesimi di 1° livello più il mod. di INT; a ogni nuovo livello 2 incantesimi gratuiti. Si preparano solo quelli scritti nel libro, tranne Lettura del Magico.'
      : cosa === 'formule' ? 'Si preparano solo le formule del formulario; si aggiungono come un mago aggiunge incantesimi al suo libro.'
        : cosa === 'incantesimi custoditi' ? 'Il famiglio custodisce gli incantesimi del fattucchiere: si preparano solo quelli che conosce.'
          : 'Si preparano solo gli incantesimi scritti nel libro.';
    return `<div class="pf-libro">
      <div class="pf-riga"><b>📖 ${esc(nomeLibro)}</b> <span class="muto">${voci.length} ${esc(cosa)}</span>
        <button class="btn-piccolo" data-azione="pf1-apri-grimorio" data-id="${id}" data-inc="${inc.id}" title="Apre il libro in una finestra a parte, da sfogliare con i segnalibri">📖 Apri il libro</button>
        ${trucchetti ? `<button class="btn-piccolo" data-azione="pf1-libro-trucchetti" data-id="${id}" data-inc="${inc.id}" title="Scrive nel libro tutti i trucchetti da mago che mancano, esclusi quelli delle scuole opposte">+ tutti i trucchetti (${trucchetti})</button>` : ''}</div>
      <p class="muto pf-aiuto">${aiuto} «prep» prepara una copia per oggi; nell'«Elenco del wiki» qui sotto il tasto 📖 lo scrive qui.</p>
      ${righe || '<p class="muto">Ancora vuoto.</p>'}
      <form class="riga-form pf-form" data-form="pf1-libro" autocomplete="off">
        <input type="hidden" name="pg" value="${id}"><input type="hidden" name="inc" value="${inc.id}">
        <input name="nome" placeholder="Scrivi nel ${esc(nomeLibro.toLowerCase())}…" required${elenco.length ? ` list="elenco-inc-${inc.id}"` : ''}>
        <input name="livello" type="number" min="0" max="9" value="1" aria-label="Livello" title="Se è nell'elenco della classe, il livello viene preso da lì">
        <button>Scrivi</button>
      </form>
    </div>`;
  }

  // ---- Il libro degli incantesimi in una finestra a parte: pagine, segnalibri di stoffa da 0° a 9° ----
  const grimorio = { livello: null, incantesimo: null }; // pagina aperta (resta mentre la finestra si aggiorna)
  const testiGrimorio = new Map(); // nome incantesimo -> testo dal wiki (letto una volta)
  const NOMI_LIVELLO = ['Trucchetti', 'Primo livello', 'Secondo livello', 'Terzo livello', 'Quarto livello', 'Quinto livello', 'Sesto livello', 'Settimo livello', 'Ottavo livello', 'Nono livello'];
  // Incantesimi mitici scelti nella sezione Mitico (capacità «Incantesimi Mitici»): si riconoscono per nome
  const incMitici = (d) => (n(d.mitico?.grado) > 0 ? new Set((d.mitico.incantesimi || []).map((s) => norm(s.nome || '')).filter(Boolean)) : new Set());
  const SEGNO_MITICO = '<span class="inc-mitico" title="Incantesimo mitico: puoi spendere potere mitico quando lo lanci per la versione potenziata">✦ mitico</span>';
  const NOTA_MITICO = `<div class="grim-dati grim-mitico"><div>✦ <i>Conosci la versione mitica</i>: quando lo lanci puoi spendere usi del potere mitico per potenziarlo.
    <a href="https://aonprd.com/MythicSpells.aspx" target="_blank" rel="noopener">Elenco degli incantesimi mitici (inglese) ↗</a></div></div>`;
  function vistaGrimorio(p, incId) {
    if (!p) return '<p class="vuoto">Personaggio non trovato.</p>';
    const d = dati(p);
    const c = calcola(p, ctx.regDi(p));
    const inc = d.incantatori.find((x) => x.id === incId) || d.incantatori.find((x) => libroDi(x));
    if (!inc) return '<p class="vuoto">Questo personaggio non ha un libro degli incantesimi.</p>';
    const ci = c.incantatori.find((x) => x.id === inc.id);
    const [nomeLibro, cosa] = libroDi(inc) || ['Libro degli incantesimi', 'incantesimi'];
    document.title = `${nomeLibro} — ${p.nome}`;
    const voci = inc.libro || [];
    const mitici = incMitici(d);
    const accessibili = new Set((ci?.livelli || []).filter((l) => l.base !== '').map((l) => l.L));
    // "M" = segnalibro degli incantesimi mitici (di ogni livello)
    const perLivello = (L) => voci.filter((s) => (L === 'M' ? mitici.has(norm(s.nome)) : n(s.livello) === L))
      .sort((a, b) => (L === 'M' ? n(a.livello) - n(b.livello) : 0) || a.nome.localeCompare(b.nome, 'it'));
    // Pagina aperta: quella scelta, altrimenti il primo livello con qualcosa scritto
    if (grimorio.livello == null || grimorio.p !== p.id || (grimorio.livello === 'M' && !mitici.size)) {
      grimorio.p = p.id;
      grimorio.livello = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((L) => perLivello(L).length) ?? 0;
      grimorio.incantesimo = null;
    }
    const L = grimorio.livello;
    const lista = perLivello(L);
    const preparati = new Map((inc.incantesimi || []).map((s) => [norm(s.nome), n(s.preparati)]));
    const slot = L === 'M' ? null : ci?.livelli.find((l) => l.L === L);
    const nastri = Array.from({ length: 10 }, (_, k) => {
      const quanti = perLivello(k).length;
      return `<button class="grim-nastro nastro-${k}${k === L ? ' aperto' : ''}${accessibili.has(k) ? '' : ' lontano'}${quanti ? '' : ' vuoto'}" data-azione="grim-livello" data-l="${k}" title="${NOMI_LIVELLO[k]}: ${quanti} ${esc(cosa)}${accessibili.has(k) ? '' : ' (livello non ancora accessibile)'}">
        <span class="stoffa"><b>${k}°</b>${quanti ? `<small>${quanti}</small>` : ''}</span></button>`;
    }).join('') + (mitici.size ? `<button class="grim-nastro nastro-mitico${L === 'M' ? ' aperto' : ''}" data-azione="grim-livello" data-l="M" title="Incantesimi mitici: ${perLivello('M').length}">
        <span class="stoffa"><b>✦</b><small>${perLivello('M').length}</small></span></button>` : '');
    const elenco = lista.map((s) => {
      const v = incantesimoDi(s.nome);
      const prep = preparati.get(norm(s.nome)) || 0;
      return `<button class="grim-voce${grimorio.incantesimo === s.nome ? ' scelta' : ''}${mitici.has(norm(s.nome)) ? ' mitica' : ''}" data-azione="grim-inc" data-nome="${esc(s.nome)}">
        <span class="grim-voce-nome">${esc(s.nome)}${L === 'M' ? ` <small>(${n(s.livello)}°)</small>` : ''}</span>
        ${mitici.has(norm(s.nome)) && L !== 'M' ? SEGNO_MITICO : ''}
        ${v ? `<small class="grim-scuola">${esc(v.base)}</small>` : ''}
        ${prep ? `<span class="grim-prep" title="Preparat${prep > 1 ? 'e' : 'a'} oggi">${'✦'.repeat(Math.min(prep, 5))}</span>` : ''}
      </button>`;
    }).join('');
    // Incantesimi mitici scelti ma non scritti in questo libro
    const fuori = L === 'M' ? (d.mitico.incantesimi || []).filter((s) => s.nome && !voci.some((x) => norm(x.nome) === norm(s.nome))).map((s) => s.nome) : [];
    const sinistra = L === 'M'
      ? `<div class="grim-intestazione"><div class="grim-capolettera">✦</div>
          <div><h2>Incantesimi mitici</h2><div class="grim-sotto">${lista.length} scritt${lista.length === 1 ? 'o' : 'i'} in questo ${esc(nomeLibro.toLowerCase())} · si potenziano spendendo potere mitico</div></div></div>
        <div class="grim-fregio">❦</div>
        <div class="grim-elenco">${elenco || '<p class="grim-vuota">Nessuno degli incantesimi mitici scelti è scritto in questo libro.</p>'}</div>
        ${fuori.length ? `<p class="grim-vuota">Scelti come mitici ma non scritti qui: ${esc(fuori.join(', '))}.</p>` : ''}`
      : `<div class="grim-intestazione"><div class="grim-capolettera">${L}</div>
        <div><h2>${NOMI_LIVELLO[L]}</h2><div class="grim-sotto">${lista.length} ${esc(cosa)}${slot && slot.base !== '' ? ` · ${slot.tot ?? slot.base} al giorno` : accessibili.has(L) ? '' : ' · non ancora accessibile'}</div></div></div>
      <div class="grim-fregio">❦</div>
      <div class="grim-elenco">${elenco || `<p class="grim-vuota">Nessun incantesimo di questo livello è scritto nel ${esc(nomeLibro.toLowerCase())}.</p>`}</div>`;
    // Pagina destra: l'incantesimo scelto, oppure il frontespizio
    const scelto = grimorio.incantesimo && lista.find((s) => s.nome === grimorio.incantesimo);
    const v = scelto ? incantesimoDi(scelto.nome) : null;
    const listeNomi = v ? Object.entries(v.livelli).map(([cod, liv]) => `${INC_DATI.liste[cod] || cod} ${liv}`).join(', ') : '';
    const testo = scelto ? testiGrimorio.get(norm(scelto.nome)) : null;
    const destra = scelto
      ? `<h2 class="grim-titolo">${esc(scelto.nome)}</h2>
        ${v ? `<div class="grim-dati"><div><i>Scuola</i> ${esc(v.scuola)}</div><div><i>Livello</i> ${esc(listeNomi)}</div></div>` : ''}
        ${preparati.get(norm(scelto.nome)) ? `<div class="grim-dati"><div><i>Preparato oggi</i> ${preparati.get(norm(scelto.nome))} ${preparati.get(norm(scelto.nome)) > 1 ? 'volte' : 'volta'}</div></div>` : ''}
        ${mitici.has(norm(scelto.nome)) ? NOTA_MITICO : ''}
        <div class="grim-fregio">❧</div>
        <div class="grim-testo" id="grim-testo">${testo == null ? '<p class="grim-carica">Sfoglio le pagine del wiki…</p>' : testo ? testo.split(/\n{2,}/).map((x) => `<p>${esc(x)}</p>`).join('') : '<p class="grim-carica">Nessuna descrizione trovata: il testo è nel wiki.</p>'}</div>`
      : `<div class="grim-frontespizio">
          <div class="grim-fregio grande">✠</div>
          <h1>${esc(nomeLibro)}</h1>
          <div class="grim-di">di</div>
          <h2>${esc(p.nome)}</h2>
          <div class="grim-fregio">❦</div>
          <p>${esc(nomeClasse(inc.classe) || inc.classe)} · livello dell'incantatore ${ci?.cl ?? '?'}</p>
          <p>${voci.length} ${esc(cosa)} scritti</p>
          ${mitici.size ? `<p class="grim-mitici-front">✦ ${perLivello('M').length} incantesim${perLivello('M').length === 1 ? 'o' : 'i'} mitic${perLivello('M').length === 1 ? 'o' : 'i'} (segnalibro ✦)</p>` : ''}
          <p class="grim-consiglio">Scegli un segnalibro in alto e un incantesimo dalla pagina di sinistra.</p>
        </div>`;
    if (scelto && testo == null) caricaTestoGrimorio(scelto.nome);
    return `<div class="grimorio">
      <div class="grim-libro">
        <div class="grim-nastri">${nastri}</div>
        <div class="grim-pagina grim-sinistra">${sinistra}</div>
        <div class="grim-dorso" aria-hidden="true"></div>
        <div class="grim-pagina grim-destra">${destra}<div class="grim-numero">${L === 'M' ? '✦' : L * 2 + 2}</div></div>
      </div>
      <p class="grim-nota">Il libro si aggiorna da solo quando modifichi la scheda; le preparazioni si fanno nella scheda del personaggio.</p>
    </div>`;
  }
  // ---- Breviario del chierico (e degli altri incantatori divini che preparano): la memorizzazione del giorno ----
  const breviario = { livello: null, incantesimo: null, filtro: '', p: null };
  const NOMI_PREGHIERA = ['Orazioni', 'Preghiere di 1° livello', 'Preghiere di 2° livello', 'Preghiere di 3° livello', 'Preghiere di 4° livello', 'Preghiere di 5° livello', 'Preghiere di 6° livello', 'Preghiere di 7° livello', 'Preghiere di 8° livello', 'Preghiere di 9° livello'];
  const ROMANI = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  // Incantatori divini che preparano ogni giorno da tutta la lista (non da un libro)
  const haBreviario = (inc) => inc.tipo === 'preparati' && !libroDi(inc) && CLASSI_DIVINE.has(nomeClasse(inc.classe));
  function vistaBreviario(p, incId) {
    if (!p) return '<p class="vuoto">Personaggio non trovato.</p>';
    const d = dati(p);
    const c = calcola(p, ctx.regDi(p));
    const inc = d.incantatori.find((x) => x.id === incId) || d.incantatori.find(haBreviario);
    if (!inc) return '<p class="vuoto">Questo personaggio non prepara incantesimi divini.</p>';
    const ci = c.incantatori.find((x) => x.id === inc.id);
    const classe = nomeClasse(inc.classe) || inc.classe;
    const dio = d.fede?.divinita || '';
    document.title = `Breviario — ${p.nome}`;
    const codice = listaDi(inc);
    const elenco = codice ? [...INCANTESIMI.values()].filter((v) => v.livelli[codice] !== undefined) : [];
    const accessibili = (ci?.livelli || []).filter((l) => l.base !== '').map((l) => l.L);
    if (breviario.livello == null || breviario.p !== p.id) { breviario.p = p.id; breviario.livello = accessibili.includes(1) ? 1 : 0; breviario.incantesimo = null; }
    const L = breviario.livello;
    const slot = ci?.livelli.find((x) => x.L === L);
    const preparati = (inc.incantesimi || []).filter((s) => n(s.livello) === L);
    const normali = preparati.filter((s) => s.note !== 'dominio');
    const diDominio = preparati.filter((s) => s.note === 'dominio');
    const usati = normali.reduce((a, s) => a + n(s.preparati), 0);
    const totNormali = slot ? Math.max(0, n(slot.tot) - n(slot.dominio)) : 0;
    const attr = `data-remoto data-id="${p.id}" data-inc="${inc.id}"`;
    // Incantesimi di dominio di questo livello (uno per dominio)
    const domini = L > 0 ? slotFede(d).filter((sc) => sc.classe === classe && sc.incantesimi && sc.scelta.dominio).map((sc) => ({ dominio: sc.scelta.sotto || sc.scelta.dominio, nome: incantesimiSlot(sc)[L - 1] })).filter((x) => x.nome) : [];
    const nastri = Array.from({ length: 10 }, (_, k) => {
      const s2 = ci?.livelli.find((x) => x.L === k);
      const prep = (inc.incantesimi || []).filter((x) => n(x.livello) === k).reduce((a, x) => a + n(x.preparati), 0);
      const ok = accessibili.includes(k);
      return `<button class="grim-nastro sacro-${k}${k === L ? ' aperto' : ''}${ok ? '' : ' lontano'}" data-azione="brev-livello" data-l="${k}" title="${NOMI_PREGHIERA[k]}${ok ? `: ${prep}/${s2?.tot ?? 0} preparate` : ' (non ancora concesse)'}">
        <span class="stoffa"><b>${ROMANI[k]}</b>${ok ? `<small>${prep}/${s2?.tot ?? 0}</small>` : ''}</span></button>`;
    }).join('');
    const mitici = incMitici(d);
    const rigaPreparata = (s) => {
      const restanti = n(s.preparati) - n(s.lanciati);
      return `<div class="brev-prep${restanti <= 0 && L > 0 ? ' esaurita' : ''}${mitici.has(norm(s.nome)) ? ' mitica' : ''}">
        <button class="brev-nome" data-azione="brev-inc" data-nome="${esc(s.nome)}">${esc(s.nome)}</button>${mitici.has(norm(s.nome)) ? SEGNO_MITICO : ''}
        <span class="brev-copie" title="Copie preparate (barrate quelle già lanciate)">${Array.from({ length: n(s.preparati) }, (_, i) => `<i class="${i < n(s.lanciati) ? 'spenta' : ''}">✦</i>`).join('')}</span>
        ${L > 0 ? `<button class="brev-tasto" data-azione="brev-lancia" ${attr} data-sp="${s.id}" ${restanti <= 0 ? 'disabled' : ''} title="Lancia una copia">Lancia</button>` : ''}
        ${n(s.lanciati) ? `<button class="brev-tasto" data-azione="brev-ripristina" ${attr} data-sp="${s.id}" title="Annulla l'ultimo lancio">↺</button>` : ''}
        <button class="brev-tasto meno" data-azione="brev-togli" ${attr} data-sp="${s.id}" title="Togli una copia preparata">−</button>
      </div>`;
    };
    const sinistra = `<div class="brev-intestazione"><div class="brev-raggiera">${ROMANI[L]}</div>
        <h2>${NOMI_PREGHIERA[L]}</h2>
        <div class="grim-sotto">${!accessibili.includes(L) ? 'non ancora concesse dalla divinità' : L === 0 ? `${slot?.tot ?? 0} orazioni preparate, si lanciano a volontà` : `${usati} di ${totNormali} preparate${slot?.dominio ? ' · +1 di dominio' : ''}`} · CD ${slot?.cd ?? '—'}</div></div>
      <div class="brev-fregio">✠</div>
      <h3 class="brev-titoletto">Memorizzate per oggi</h3>
      ${normali.map(rigaPreparata).join('') || '<p class="grim-vuota">Nessuna preghiera ancora: sceglile dalla pagina a destra.</p>'}
      ${L > 0 && slot?.dominio ? `<h3 class="brev-titoletto">Slot di dominio</h3>
        ${diDominio.map(rigaPreparata).join('') || `<div class="brev-domini">${domini.map((x) => `<button class="brev-dominio" data-azione="brev-prepara" ${attr} data-nome="${esc(x.nome)}" data-livello="${L}" data-dominio="1" title="Prepara nello slot di dominio">☀ ${esc(x.nome)} <small>(${esc(x.dominio)})</small></button>`).join('') || '<p class="grim-vuota">Scegli i domini nella scheda (Divinità e domini).</p>'}</div>`}` : ''}
      ${usati > totNormali && L > 0 ? `<p class="brev-avviso">Hai preparato ${usati - totNormali} preghier${usati - totNormali > 1 ? 'e' : 'a'} in più degli slot disponibili.</p>` : ''}`;
    // Pagina destra: la lista della divinità (da sfogliare e preparare) o la preghiera scelta
    const scelta = breviario.incantesimo ? incantesimoDi(breviario.incantesimo) : null;
    const testo = scelta ? testiGrimorio.get(norm(scelta.nome)) : null;
    if (scelta && testo == null) caricaTestoGrimorio(scelta.nome);
    const filtro = norm(breviario.filtro || '');
    const voci = elenco.filter((v) => v.livelli[codice] === L && (!filtro || norm(v.nome).includes(filtro))).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    const destra = scelta
      ? `<button class="brev-indietro" data-azione="brev-inc" data-nome="">← torna all'elenco</button>
        <h2 class="grim-titolo brev-titolo">${esc(scelta.nome)}</h2>
        <div class="grim-dati"><div><i>Scuola</i> ${esc(scelta.scuola)}</div><div><i>Livello</i> ${esc(Object.entries(scelta.livelli).map(([cod, liv]) => `${INC_DATI.liste[cod] || cod} ${liv}`).join(', '))}</div></div>
        ${mitici.has(norm(scelta.nome)) ? NOTA_MITICO : ''}
        ${scelta.livelli[codice] === L && accessibili.includes(L) ? `<div class="brev-centro"><button class="brev-prepara grande" data-azione="brev-prepara" ${attr} data-nome="${esc(scelta.nome)}" data-livello="${L}">✠ Prepara per oggi</button></div>` : ''}
        <div class="brev-fregio">✠</div>
        <div class="grim-testo" id="grim-testo">${testo == null ? '<p class="grim-carica">Sfoglio le pagine sacre…</p>' : testo ? testo.split(/\n{2,}/).map((x) => `<p>${esc(x)}</p>`).join('') : '<p class="grim-carica">Descrizione non disponibile qui (solo nell\'app).</p>'}</div>`
      : `<h2 class="brev-lista-titolo">Le preghiere concesse</h2>
        <div class="grim-sotto brev-centro">${voci.length} incantesimi di ${L === 0 ? 'livello 0' : `${L}° livello`} della lista ${esc(INC_DATI.liste[codice] || classe)}</div>
        <input class="brev-cerca" data-brev-filtro placeholder="Cerca una preghiera…" value="${esc(breviario.filtro || '')}">
        <div class="brev-lista">${voci.map((v) => {
          const gia = preparati.find((s) => norm(s.nome) === norm(v.nome));
          return `<div class="brev-voce${gia ? ' presa' : ''}${mitici.has(norm(v.nome)) ? ' mitica' : ''}">
            <button class="brev-nome" data-azione="brev-inc" data-nome="${esc(v.nome)}">${esc(v.nome)}</button>${mitici.has(norm(v.nome)) ? SEGNO_MITICO : ''}
            <small class="grim-scuola">${esc(v.base)}</small>
            ${accessibili.includes(L) ? `<button class="brev-prepara" data-azione="brev-prepara" ${attr} data-nome="${esc(v.nome)}" data-livello="${L}" title="Prepara per oggi${gia ? ` (già ${gia.preparati})` : ''}">${gia ? `✦${n(gia.preparati) > 1 ? n(gia.preparati) : ''} +` : '+'}</button>` : ''}
          </div>`;
        }).join('') || '<p class="grim-vuota">Nessuna preghiera trovata.</p>'}</div>`;
    return `<div class="grimorio sacro">
      <div class="grim-libro">
        <div class="grim-nastri">${nastri}</div>
        <div class="grim-pagina grim-sinistra"><div class="brev-cornice">${sinistra}</div></div>
        <div class="grim-dorso" aria-hidden="true"></div>
        <div class="grim-pagina grim-destra"><div class="brev-cornice">${destra}</div></div>
      </div>
      <p class="grim-nota">✠ Breviario di ${esc(p.nome)}${dio ? `, servitore di ${esc(dio)}` : ''} · ${esc(classe)}, livello dell'incantatore ${ci?.cl ?? '?'} · le scelte vengono scritte nella scheda del personaggio.</p>
    </div>`;
  }

  function caricaTestoGrimorio(nome) {
    const chiave = norm(nome);
    if (testiGrimorio.has(chiave) || testiGrimorio.has('…' + chiave)) return;
    testiGrimorio.set('…' + chiave, true);
    const v = incantesimoDi(nome);
    let motivo = '';
    ctx.wiki(paginaWiki(v?.pagina || `Incantesimi/${nome}`))
      .then((html) => estraiIncantesimo(new DOMParser().parseFromString(html, 'text/html')))
      .catch((e) => { motivo = String(e?.message || e); return null; })
      .then((t) => {
        // Se il wiki non ha risposto (verifica anti-bot, rete) non si memorizza nulla: si riprova la volta dopo
        if (t !== null) testiGrimorio.set(chiave, t || '');
        testiGrimorio.delete('…' + chiave);
        const box = document.getElementById('grim-testo');
        if (box && grimorio.incantesimo && norm(grimorio.incantesimo) === chiave) {
          box.innerHTML = t ? t.split(/\n{2,}/).map((x) => `<p>${esc(x)}</p>`).join('')
            : /verifica/i.test(motivo) ? '<p class="grim-carica">Il wiki ora chiede una verifica anti-bot: la descrizione si legge sul sito, nel browser.</p>'
              : /solo nell/i.test(motivo) ? '<p class="grim-carica">Descrizione non disponibile qui (solo nell\'app): usa il pulsante «i» nella scheda.</p>'
                : '<p class="grim-carica">Descrizione non disponibile in questo momento: il testo è sul wiki.</p>';
        }
      });
  }

  function vistaScheda(p, r) {
    const d = dati(p);
    const c = calcola(p, r);
    const id = p.id;
    const { k, campo, num, chk, sel, dado, togli, aggiungi } = aiutanti(p, c);
    const sezione = (chiave, titolo, corpo, extraTesta = '') => `<details class="pannello pf-sez" data-sez="${chiave}" ${chiuse.has(chiave) ? '' : 'open'}>
        <summary><h3>${titolo}</h3>${extraTesta}</summary>${corpo}</details>`;

    // Classi
    const classi = d.classi.map((cl) => `<div class="pf-riga">
        ${sceltaClasse(cl, id)}
        ${GIOCATORE ? `<span class="pf-liv-fisso" title="Nella scheda del giocatore i livelli si prendono uno alla volta con «⬆ Sali di livello»">Livello <b>${n(cl.livello)}</b></span>`
          : `<label>Livello ${num(`classi#${cl.id}|livello`, cl.livello, 'min="1" max="20"')}</label>
        <span class="pf-liv-btn"><button class="btn-mini" data-azione="pf1-classe-liv" data-id="${id}" data-cl="${cl.id}" data-d="-1" title="Togli un livello di ${esc(cl.nome || 'questa classe')}">−</button><button class="btn-mini" data-azione="pf1-classe-liv" data-id="${id}" data-cl="${cl.id}" data-d="1" title="Aggiungi un livello (senza la procedura di salita)">+</button></span>`}
        <label>DV ${sel(`classi#${cl.id}|dv`, [6, 8, 10, 12].map((x) => [x, 'd' + x]), cl.dv, 'data-tipo="numero"')}</label>
        <label>BAB ${sel(`classi#${cl.id}|bab`, [['pieno', 'pieno'], ['3/4', '¾'], ['1/2', '½']], cl.bab)}</label>
        <label class="pf-chk" title="Tempra buona">${chk(`classi#${cl.id}|tempra`, cl.tempra)} Tem</label>
        <label class="pf-chk" title="Riflessi buoni">${chk(`classi#${cl.id}|riflessi`, cl.riflessi)} Rif</label>
        <label class="pf-chk" title="Volontà buona">${chk(`classi#${cl.id}|volonta`, cl.volonta)} Vol</label>
        <label class="pf-chk" title="Classe di prestigio: TS buoni +1 al 1° livello invece di +2">${chk(`classi#${cl.id}|prestigio`, cl.prestigio)} Prestigio</label>
        <label title="Gradi di abilità per livello (senza INT)">Gradi/liv ${num(`classi#${cl.id}|gradi`, cl.gradi)}</label>
        ${!cl.nome || nomeClasse(cl.nome) ? '' : '<span class="muto" title="Classe non in elenco: imposta tu progressione e abilità di classe">personalizzata</span>'}
        <button class="btn-piccolo pf-togli-classe" data-azione="pf1-classe-togli" data-id="${id}" data-cl="${cl.id}" title="Togli questa classe con tutti i suoi livelli">🗑 Togli classe</button>
      </div>`).join('');
    const corpoClassi = `${classi || '<p class="muto">Nessuna classe. Aggiungine una: i valori si calcolano da soli.</p>'}
      <div class="pf-piede">${GIOCATORE && d.classi.length ? '<span class="muto">Le altre classi (multiclasse) si aggiungono con «⬆ Sali di livello».</span>' : aggiungi('classi', 'Classe')}<span class="muto">Livello totale <b>${k('liv')}</b> · BAB <b>${k('bab')}</b></span>
        <label>Taglia ${sel('taglia', TAGLIE.map((t) => [t[0], t[0]]), d.taglia, 'data-ridisegna-pf1')}</label></div>
`;

    // Bonus attivabili
    const opzBersagli = (scelto) => `${opz(BERSAGLI, scelto)}<optgroup label="Una sola abilità">${opz(abilitaScheda(r, d).filter((a) => !a.nascosta).map((a) => ['abil:' + a.nome, a.nome]), scelto)}</optgroup>`;
    // Effetti scartati dalle regole di cumulo, per bonus: "superato da…"
    const scartati = new Map();
    for (const r of c.cumuli) for (const x of r.voci) if (!x.conta && x.fonteId) {
      if (!scartati.has(x.fonteId)) scartati.set(x.fonteId, []);
      scartati.get(x.fonteId).push(`${r.etichetta} ${segno(x.v)} ${x.tipo}: ${x.motivo}`);
    }
    const bonus = d.bonus.map((b) => {
      const aperto = bonusAperti.has(b.id);
      const via = scartati.get(b.id);
      const effetti = (b.effetti || []).map((e) => `<div class="pf-riga">
          <select data-pf1="bonus#${b.id}|effetti#${e.id}|bersaglio" data-id="${id}" data-ridisegna-pf1>${opzBersagli(e.bersaglio)}</select>
          ${SPECIALI.has(e.bersaglio) ? '<span class="muto">calcolato dal BAB</span>'
            : `${sel(`bonus#${b.id}|effetti#${e.id}|tipo`, TIPI_BONUS.map((x) => [x, x]), e.tipo, 'data-ridisegna-pf1')}
               ${num(`bonus#${b.id}|effetti#${e.id}|valore`, e.valore, 'data-ridisegna-pf1')}`}
          ${togli(`bonus#${b.id}|effetti`, e.id)}
        </div>`).join('');
      return `<div class="pf-bonus${b.attivo ? ' attivo' : ''}">
        <div class="pf-riga">
          <label class="pf-chk" title="Attivo">${chk(`bonus#${b.id}|attivo`, b.attivo, 'data-ridisegna-pf1')}</label>
          ${aperto ? `<input class="pf-largo" data-pf1="bonus#${b.id}|nome" data-id="${id}" value="${esc(b.nome)}">` : `<b class="pf-bonus-nome">${esc(b.nome)}</b>`}
          <span class="muto pf-bonus-riass">${esc(riassuntoBonus(b)) || 'nessun effetto'}</span>
          ${via ? `<span class="oltre pf-scartato" title="${esc(via.join('\n'))}">⚠ ${via.length === (b.effetti || []).length ? 'non conta' : 'in parte non conta'}</span>` : ''}
          <button class="btn-piccolo" data-azione="pf1-espandi" data-bonus="${b.id}">${aperto ? 'Chiudi' : 'Modifica'}</button>
          ${togli('bonus', b.id)}
        </div>
        ${aperto ? `<div class="pf-effetti">${effetti}<button class="btn-piccolo" data-azione="pf1-aggiungi-effetto" data-id="${id}" data-bonus="${b.id}">+ Effetto</button></div>` : ''}
      </div>`;
    }).join('');
    // Tabella del cumulo: per ogni valore toccato, i bonus che contano e quelli scartati
    const righeCumulo = c.cumuli.map((r) => `<tr><th>${esc(r.etichetta)}</th><td class="cum-tot">${segno(r.totale)}</td><td>${r.voci.map((x) => `<span class="cum-voce${x.conta ? '' : ' scartato'}${x.v < 0 ? ' penalita' : ''}" title="${esc(x.conta ? (x.v < 0 ? 'Penalità: si somma sempre' : CUMULABILI.has(x.tipo) ? `${x.tipo}: si somma con gli altri` : `${x.tipo}: è il più alto del suo tipo`) : x.motivo)}">${esc(x.fonte || '—')} ${segno(x.v)} <small>${esc(x.tipo)}</small></span>`).join(' ')}</td></tr>`).join('');
    const corpoBonus = `<p class="muto pf-aiuto">Spunta un bonus per attivarlo: la scheda ricalcola tutto. Bonus dello stesso tipo (morale, fortuna, potenziamento, cognitivo, sacro…) non si sommano: vale solo il più alto. Si sommano invece <b>schivare</b>, <b>circostanza</b> e <b>senza tipo</b>, ma non due volte dalla stessa fonte. Le penalità si sommano sempre. Puoi usarli anche per oggetti sempre attivi (es. Cintura +2 alla FOR, potenziamento).</p>
      ${bonus || '<p class="muto">Nessun bonus.</p>'}`;
    const tabellaCumulo = righeCumulo ? `<h4>Come si sommano <small class="muto">barrati = non contano (passa sopra per il motivo)</small></h4><div class="prog-scorri"><table class="cum-tabella"><tbody>${righeCumulo}</tbody></table></div>` : '';
    const corpoBonusPiede = `
      <div class="pf-piede">
        <select id="pf1-preset-bonus" aria-label="Bonus predefinito">${opz(Object.keys(PRESET_BONUS).map((x) => [x, x]))}</select>
        <button class="btn-piccolo" data-azione="pf1-aggiungi-bonus" data-id="${id}">+ Aggiungi dall'elenco</button>
        <button class="btn-piccolo" data-azione="pf1-aggiungi-bonus" data-id="${id}" data-vuoto="1">+ Bonus personalizzato</button>
      </div>`;

    // Caratteristiche
    const car = CARS.map((s) => {
      const kk = r.caratteristiche.find((x) => x.sigla === s);
      const val = p.caratteristiche?.[s] ?? kk?.predefinito ?? 10;
      return `<div class="car">
        <div class="car-sigla">${s}</div>
        <div class="car-valori"><input type="number" value="${esc(val)}" data-bind="personaggio" data-id="${id}" data-sez="caratteristiche" data-chiave="${s}" data-tipo="numero" aria-label="${esc(kk?.nome || s)}">
          <span class="car-eff">${k('eff:' + s)}</span></div>
        <div class="car-mod">${k('mod:' + s)}</div>
        <div class="car-nome">${esc(kk?.nome || s)}</div>
        <div class="car-prova" title="Prove di caratteristica, con il bonus degli oggetti e dei bonus attivi">${k('prova:' + s)}</div>
        ${dado('car:' + s, kk?.nome || s)}
      </div>`;
    }).join('');

    // Difese e combattimento
    const pc = d.pfCalc;
    // Tiri salvezza: totale, componenti, bonus situazionali
    const tsRighe = TS.map(([k2, nome, carTs]) => {
      const t = c.ts[k2];
      const cond = t.cond.map((x) => `<div class="ts-cond">
          <span>${esc(x.testo || '(situazionale)')} <small class="muto">${segno(x.valore)} ${esc(x.tipo)}${x.tratto ? ` · ${esc(x.tratto)}` : ''}</small></span>
          <b>${k(`tsc:${k2}:${x.id}`)}</b>${x.guadagno === 0 && x.valore > 0 ? '<small class="muto" title="Lo stesso tipo è già coperto da un bonus attivo più alto">non si somma</small>' : ''}
          ${dado(`tsc:${k2}|${x.id}`, `${nome} ${x.testo}`)}</div>`).join('');
      return `<div class="ts-blocco">
        <div class="ts-testa"><span class="ts-nome">${nome}</span> <small class="muto">${esc(carTs)}</small><b class="ts-tot">${k('ts:' + k2)}</b>${dado('ts:' + k2, nome)}</div>
        <div class="ts-dett"><span title="Dalle classi (buono o scarso)">base <b>${k('tsb:' + k2)}</b></span>
          <span>${esc(carTs)} <b>${k('tscar:' + k2)}</b></span>
          <span title="Bonus attivi della sezione Bonus, già cumulati secondo le regole">bonus <b>${k('tsbon:' + k2)}</b></span>
          <label>varie ${num(`ts|${k2}|varie`, d.ts[k2]?.varie)}</label></div>
        ${cond}
      </div>`;
    }).join('');
    const condRighe = (d.tsCond || []).map((x) => `<div class="pf-riga">
        <input class="pf-largo" list="pf1-ts-situazioni" data-pf1="tsCond#${x.id}|testo" data-id="${id}" value="${esc(x.testo)}" placeholder="es. contro veleni" data-ridisegna-pf1>
        ${num(`tsCond#${x.id}|valore`, x.valore, 'data-ridisegna-pf1')}
        ${sel(`tsCond#${x.id}|tipo`, TIPI_BONUS.map((t) => [t, t]), x.tipo, 'data-ridisegna-pf1')}
        ${sel(`tsCond#${x.id}|ts`, [['tutti', 'tutti i TS'], ...TS.map(([kk, nn]) => [kk, nn])], x.ts, 'data-ridisegna-pf1')}
        ${togli('tsCond', x.id)}</div>`).join('');
    const corpoTs = `<div class="ts-griglia">${tsRighe}</div>
      <h4>Bonus situazionali <small class="muto">valgono solo in certe situazioni: ogni tiro salvezza mostra il totale con e senza</small></h4>
      ${condRazza(d).length ? `<p class="muto pf-aiuto">Dalla razza (aggiunti da soli, tolti se un tratto alternativo li sostituisce): ${condRazza(d).map((x) => `<b>${esc(x.tratto)}</b> ${segno(x.valore)} ${esc(x.tipo)} ${esc(x.testo)}${x.ts !== 'tutti' ? ` (${esc(TS.find((t) => t[0] === x.ts)?.[1] || x.ts)})` : ''}`).join(' · ')}</p>` : ''}
      ${condRighe || '<p class="muto">Nessun bonus aggiunto a mano. Esempi: +2 contro ammaliamenti da un oggetto, +4 contro paura da un talento.</p>'}
      <div class="pf-piede">${aggiungi('tsCond', 'Bonus situazionale')}</div>
      <datalist id="pf1-ts-situazioni">${['contro veleni', 'contro incantesimi e capacità magiche', 'contro paura', 'contro ammaliamenti', 'contro illusioni', 'contro malattie',
        'contro effetti di influenza mentale', 'contro sonno', 'contro paralisi e stordimento', 'contro trappole', 'contro effetti di morte', 'contro energia negativa'].map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;
    const difese = `<div class="pf-griglia">
        <div class="pf-box">
          <div class="pf-etich">Punti ferita</div>
          <div class="pf-pf">${num('pf|attuali', d.pf.attuali, `class="pf-grande" placeholder="${esc(c.pfMax)}" title="Vuoto = al massimo"`)} <span class="muto">/</span>
            ${pc.auto ? `<b class="pf-max">${k('pfmax')}</b>` : num('pf|max', d.pf.max, 'placeholder="max"')}</div>
          <div class="pf-mini"><label>Temporanei ${num('pf|temp', d.pf.temp)}</label><label>Non letali ${num('pf|nonLetali', d.pf.nonLetali)}</label></div>
          <label class="pf-chk pf-mini">${chk('pfCalc|auto', pc.auto, 'data-ridisegna-pf1')} Calcola il massimo da solo</label>
          ${pc.auto ? `<div class="pf-mini">
              <label>Dopo il 1° liv. ${sel('pfCalc|metodo', [['media', 'media (dado/2+1)'], ['massimo', 'massimo']], pc.metodo)}</label>
              <label title="Livelli in cui hai scelto +1 PF come bonus di classe preferita">Classe preferita ${num('pfCalc|preferita', pc.preferita, 'min="0"')}</label>
              <label class="pf-chk" title="Talento Robustezza: +3, o +1 per livello oltre il 3°">${chk('pfCalc|robustezza', pc.robustezza)} Robustezza</label>
              <label>Varie ${num('pfCalc|varie', pc.varie)}</label>
            </div>
            <div class="pf-nota">${k('pfdett')}</div>` : ''}
        </div>
        <div class="pf-box">
          <div class="pf-etich">Classe armatura</div>
          <div class="pf-valore">${k('ca')}</div>
          <div class="muto">Contatto <b>${k('contatto')}</b> · Impreparato <b>${k('sorpresa')}</b></div>
          <div class="pf-mini"><label>Naturale ${num('ca|naturale', d.ca.naturale)}</label><label>Deviazione ${num('ca|deviazione', d.ca.deviazione)}</label><label>Schivare ${num('ca|schivare', d.ca.schivare)}</label><label>Varie ${num('ca|varie', d.ca.varie)}</label></div>
          <div class="pf-nota">${k('caNota')}</div>
        </div>
        <div class="pf-box">
          <div class="pf-etich">Iniziativa ${dado('init', 'Iniziativa')}</div>
          <div class="pf-valore">${k('init')}</div>
          <div class="pf-mini"><label>Varie ${num('iniz|varie', d.iniz.varie)}</label></div>
          <div class="pf-etich pf-spazio">Manovre ${dado('bmc', 'BMC')}</div>
          <div>BMC <b>${k('bmc')}</b> · DMC <b>${k('dmc')}</b></div>
          <div class="pf-mini"><label>BMC varie ${num('bmc|varie', d.bmc.varie)}</label><label>DMC varie ${num('dmc|varie', d.dmc.varie)}</label></div>
        </div>
      </div>`;

    // Attacchi
    const armi = d.armi.map((a) => `<div class="pf-arma">
        <div class="pf-riga">
          <input class="pf-largo" data-pf1="armi#${a.id}|nome" data-id="${id}" value="${esc(a.nome)}" placeholder="Arma">
          <label>${sel(`armi#${a.id}|tipo`, [['mischia', 'Mischia'], ['distanza', 'Distanza']], a.tipo)}</label>
          ${a.tipo === 'mischia' ? `<label class="pf-chk" title="Usa DES per colpire (Arma Accurata)">${chk(`armi#${a.id}|accurata`, a.accurata)} Accurata</label>` : ''}
          <label>Bonus colpire ${num(`armi#${a.id}|bonus`, a.bonus)}</label>
          ${togli('armi', a.id)}
        </div>
        <div class="pf-riga">
          <label>Danni ${campo(`armi#${a.id}|danni`, a.danni, 'placeholder="1d8" class="pf-corto"')}</label>
          <label>FOR ai danni ${sel(`armi#${a.id}|carDanni`, [['FOR', '×1'], ['FOR15', '×1½ (due mani)'], ['FOR05', '×½ (secondaria)'], ['nessuno', 'nessuna']], a.carDanni)}</label>
          <label>Bonus danni ${num(`armi#${a.id}|bonusDanni`, a.bonusDanni)}</label>
          <label>Critico ${campo(`armi#${a.id}|critico`, a.critico, 'placeholder="19-20/×2" class="pf-corto"')}</label>
          <label>Peso ${num(`armi#${a.id}|peso`, a.peso, 'step="0.5"')} kg</label>
        </div>
        <div class="pf-riga pf-magia">${controlliMagia('armi', a, chk, sel)}</div>
        <div class="pf-arma-tiri">
          <span>Colpire <b>${k(`arma:${a.id}:colpo`)}</b> ${dado('colpo:' + a.id, 'attacco')}</span>
          <span>Danni <b>${k(`arma:${a.id}:danni`)}</b> ${dado('danni:' + a.id, 'danni')}</span>
        </div>
      </div>`).join('');

    // Abilità
    const abil = abilitaScheda(r, d).map((a) => {
      const s = d.abil[a.nome] || {};
      const daCl = c.daClasse.get(a.padre || a.nome);
      const spunta = daCl
        ? `<input type="checkbox" checked disabled title="Abilità di classe (${esc(daCl.join(', '))})">`
        : chk(`abil|${a.nome}|classe`, s.classe, 'title="Abilità di classe extra (tratto, talento…)"');
      // Famiglia (Artigianato, Professione): riga di testa con il menu dei tipi
      const tipi = a.famiglia ? ABIL_SPECIALIZZATE[a.nome].filter((t) => !(d.sottoAbil?.[a.nome] || []).some((x) => norm(x) === norm(t))) : [];
      const menu = a.famiglia ? `<div class="abil-tipi">
          <input list="tipi-${esc(norm(a.nome))}-${id}" id="sottoabil-${esc(norm(a.nome))}-${id}" placeholder="+ tipo di ${esc(a.nome.toLowerCase())}…" class="abil-tipo-in">
          <datalist id="tipi-${esc(norm(a.nome))}-${id}">${tipi.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
          <button class="btn-mini" data-azione="pf1-sottoabil" data-id="${id}" data-padre="${esc(a.nome)}" title="Aggiungi questo tipo, con i suoi gradi">+</button>
        </div>` : '';
      if (a.nascosta) {
        return `<div class="pf-abil abil-famiglia"><label class="pf-chk">${spunta}</label>
          <span class="abil-nome">${esc(a.nome)} <small class="muto">${esc(a.car)} · ogni tipo ha i suoi gradi</small></span>${menu}</div>`;
      }
      return `<div class="pf-abil${a.padre ? ' abil-tipo' : ''}${a.famiglia ? ' abil-famiglia' : ''}">
        <label class="pf-chk">${a.padre ? (daCl ? '<input type="checkbox" checked disabled title="Di classe come la famiglia">' : spunta) : spunta}</label>
        <span class="abil-nome">${a.padre ? `↳ ${esc(a.tipo)}` : esc(a.nome)} <small class="muto">${esc(a.car)}${a.famiglia && !a.nascosta && (d.sottoAbil?.[a.nome] || []).length ? ' · senza tipo' : ''}</small></span>
        <b class="pf-tot">${k('abil:' + a.nome)}</b>
        <label title="Gradi">gr ${num(`abil|${a.nome}|gradi`, s.gradi, 'min="0"')}</label>
        <label title="Bonus vari">var ${num(`abil|${a.nome}|varie`, s.varie)}</label>
        ${dado('abil:' + a.nome, a.nome)}
        ${a.padre ? `<button class="btn-x" data-azione="pf1-sottoabil-togli" data-id="${id}" data-padre="${esc(a.padre)}" data-tipo="${esc(a.tipo)}" title="Togli questo tipo${n(s.gradi) ? ` (e i suoi ${n(s.gradi)} gradi)` : ''}">×</button>` : ''}
        ${menu}
      </div>`;
    }).join('');
    const testaAbil = `<span class="pf-sommario${c.gradiSpesi > c.gradiDisp ? ' oltre' : ''}" data-gradi-avviso>Gradi ${k('gradi')} · max ${k('gradiMax')} per abilità</span>`;
    const corpoAbil = `<p class="muto pf-aiuto">Le abilità di classe si spuntano da sole in base alle classi (spunta grigia); quelle extra da tratti o talenti le spunti tu. Totale = gradi + caratteristica + 3 (se di classe con almeno 1 grado) + varie + bonus attivi − penalità dell'armatura (FOR e DES).</p>
      <div class="pf-griglia-abil">${abil}</div>
      <div class="pf-piede"><label>Gradi extra (classe preferita, ecc.) ${num('gradiExtra', d.gradiExtra)}</label></div>`;

    // Talenti e capacità
    const gruppi = TIPI_CAPACITA.map((tipo) => {
      const voci = d.capacita.filter((x) => (x.tipo || 'Altro') === tipo);
      if (!voci.length) return '';
      return `<h4>${tipo} <small class="muto">${voci.length}</small></h4>` + voci.map((x) => {
        // Talenti del wiki: descrizione e avviso se i prerequisiti non sono (più) soddisfatti
        const t = tipo === 'Talento' ? TALENTI.talento(x.nome) || TALENTI.talento(x.nome.replace(/\s*\([^)]*\)\s*$/, '')) : null;
        let nota = '';
        if (t) {
          // Il talento stesso non conta come requisito di sé: si verifica senza di lui
          const senza = { ...d, capacita: d.capacita.filter((y) => y.id !== x.id) };
          const s = statoTalento(t, p, senza, c);
          const manca = s.req.filter((r) => r.esito === false).map((r) => r.testo).join(', ');
          nota = `<button class="btn-mini" data-azione="pf1-info-talento" data-nome="${esc(t.nome)}" title="Descrizione dal wiki">i</button>
            ${s.stato === 'no' ? `<span class="oltre" title="Prerequisiti non soddisfatti: ${esc(manca)}">⚠ manca ${esc(manca)}</span>` : ''}`;
        }
        // Scoperta arcana del mago: descrizione dal wiki
        const sa = tipo === 'Scoperta arcana' && scopertaArcana(x.scoperta || x.nome.replace(/\s*\((Str|Sop|Mag)\).*$|\s+\d+$/, ''));
        if (sa) nota = `<button class="btn-mini" data-azione="pf1-info-scoperta-arcana" data-nome="${esc(sa[0])}" title="Descrizione dal wiki">i</button>`;
        return `<div class="pf-cap">
          <div class="pf-riga">
            <input class="pf-largo" data-pf1="capacita#${x.id}|nome" data-id="${id}" value="${esc(x.nome)}">
            ${nota}
            ${sel(`capacita#${x.id}|tipo`, TIPI_CAPACITA.map((t) => [t, t]), x.tipo, 'data-ridisegna-pf1')}
            ${togli('capacita', x.id)}
          </div>
          <textarea rows="2" data-pf1="capacita#${x.id}|descrizione" data-id="${id}" placeholder="Effetto, prerequisiti, usi al giorno…">${esc(x.descrizione || '')}</textarea>
        </div>`;
      }).join('');
    }).join('');
    // Privilegi di classe presi da soli dalle tabelle di progressione e dagli archetipi scelti
    const auto = privilegiAutomatici(d);
    const perClasse = [...new Set(auto.map((x) => x.classe))].map((k) => `<div class="priv-classe"><span class="muto">${esc(k)}:</span> ${auto.filter((x) => x.classe === k)
      .map((x) => `<span class="priv${x.sostituito ? ' sostituito' : ''}${x.fonte !== 'classe' ? ' da-archetipo' : ''}" title="${esc(`${x.livello ? x.livello + '° livello' : ''}${x.fonte !== 'classe' ? ' · archetipo ' + x.fonte : ''}${x.sostituito ? ' · sostituito dall\'archetipo' : ''}`)}">${esc(x.nome)}</span>`).join(', ')}</div>`).join('');
    const corpoCap = `${perClasse ? `<h4>Privilegi di classe <small class="muto">dalle tabelle di progressione</small></h4>${perClasse}` : ''}
      ${gruppi || '<p class="muto">Nessun talento o capacità.</p>'}
      <form class="riga-form pf-form" data-form="pf1-capacita" autocomplete="off">
        <input type="hidden" name="pg" value="${id}">
        <input name="nome" placeholder="Nome del talento (scrivi per cercare tra i talenti del wiki) o della capacità" list="pf1-talenti-wiki" required>
        <select name="tipo">${opz(TIPI_CAPACITA.map((t) => [t, t]), 'Talento')}</select>
        <button>Aggiungi</button>
      </form>
      ${datalistFisso('pf1-talenti-wiki', () => TALENTI.voci.map((t) => `<option value="${esc(t.nome)}">${esc(t.tipi.join(', '))}</option>`).join(''))}
      <div class="pf-riga tal-rapida"><b>Scegli un talento:</b> ${sceltaTalentoHtml(p, `cap-talento-${id}`)}</div>
      <details class="pf-elenco-inc tal-dentro" data-sez="talenti" ${chiuse.has('talenti') ? '' : 'open'}><summary><b>📜 Elenco completo dei talenti del wiki</b> <small class="muto">${TALENTI.voci.length} talenti, con ricerca, filtri e prerequisiti</small></summary>${sezioneTalenti(p)}</details>`;

    // Incantesimi
    const incantatori = d.incantatori.map((inc) => {
      const ci = c.incantatori.find((x) => x.id === inc.id);
      const spontaneo = inc.tipo === 'spontanei';
      const incantesimi = inc.incantesimi || [];
      const ultimo = Math.max(0, ...ci.livelli.filter((l) => l.base !== '').map((l) => l.L), ...incantesimi.map((s) => n(s.livello)));
      const haTabella = !!TABELLE.classi[nomeClasse(inc.classe)];
      const mostraConosciuti = ci.auto && spontaneo;
      // Con la tabella automatica si mostrano i livelli già disponibili più il prossimo
      const ultimoVisibile = ci.auto ? Math.max(ultimo, ...ci.livelli.filter((l) => l.base !== '').map((l) => l.L)) : ultimo + 1;
      const righeSlot = ci.livelli.filter((l) => l.L <= Math.min(9, ultimoVisibile)).map((l) => `<div class="pf-slot${l.troppoAlto ? ' bloccato' : ''}"${l.troppoAlto ? ` title="Serve ${esc(inc.car)} ${10 + l.L} per lanciare incantesimi di ${l.L}° livello"` : ''}>
          <b>${l.L}°</b>
          ${ci.auto ? `<span class="pf-base" title="Dalla tabella della classe">${k(`inc:${inc.id}:base:${l.L}`)}</span>`
            : num(`incantatori#${inc.id}|slot|${l.L}|base`, l.base, 'min="0" placeholder="—" title="Incantesimi al giorno dalla tabella di classe (vuoto = livello non disponibile)"')}
          <span title="Bonus per caratteristica alta (tabella del wiki)">${k(`inc:${inc.id}:bonus:${l.L}`)}</span>
          <b title="Totale al giorno">${k(`inc:${inc.id}:tot:${l.L}`)}</b>
          <span title="CD">CD ${k(`inc:${inc.id}:cd:${l.L}`)}</span>
          <span class="pf-pallini">${l.troppoAlto ? `<span class="oltre">serve ${esc(inc.car)} ${10 + l.L}</span>` : usoSlot(p, inc, ci, l)}
            ${mostraConosciuti && l.conosciuti !== '' ? `<span class="${l.noti > l.conosciuti ? 'oltre' : 'muto'}" title="Incantesimi conosciuti: nell'elenco / massimo">conosciuti ${l.noti}/${l.conosciuti}</span>` : ''}</span>
        </div>`).join('');
      const perLivello = [...new Set(incantesimi.map((s) => n(s.livello)))].sort((a, b) => a - b).map((L) => `<h4>Livello ${L}</h4>` +
        incantesimi.filter((s) => n(s.livello) === L).map((s) => {
          const v = incantesimoDi(s.nome);
          return `<div class="pf-riga pf-incantesimo">
          <input class="pf-largo" data-pf1="incantatori#${inc.id}|incantesimi#${s.id}|nome" data-id="${id}" value="${esc(s.nome)}">
          ${s.nome && incMitici(d).has(norm(s.nome)) ? SEGNO_MITICO : ''}
          ${libroDi(inc) && s.nome && !nelLibro(inc, s.nome) ? `<small class="oltre" title="Non è scritto nel ${esc(libroDi(inc)[0].toLowerCase())}: non si può preparare">non nel ${libroDi(inc)[0] === 'Famiglio' ? 'famiglio' : libroDi(inc)[0] === 'Formulario' ? 'formulario' : 'libro'}</small>` : ''}
          ${v ? `<small class="pf-scuola" title="${esc(v.scuola)}">${esc(v.base)}</small><button class="btn-mini" data-azione="pf1-info-inc" data-nome="${esc(v.nome)}" title="Descrizione dal wiki">i</button>` : ''}
          ${(() => { const f = v ? focusScuola(d, v.scuola) : 0; const cdL = ci.livelli.find((l) => l.L === n(s.livello))?.cd; return f && cdL ? `<small class="pf-cd-foc" title="CD dei tiri salvezza con Incantesimi Focalizzati${f > 1 ? ' e Superiore' : ''} (+${f})">CD ${cdL + f}</small>` : ''; })()}
          ${spontaneo ? '' : `<label title="Copie preparate">prep ${num(`incantatori#${inc.id}|incantesimi#${s.id}|preparati`, s.preparati, 'min="0"')}</label><span class="muto">lanciati ${n(s.lanciati)}</span>`}
          ${!spontaneo && nomeClasse(inc.classe) === 'Mago' && d.mago.scuola && d.mago.scuola !== 'Universale' ? `<label class="pf-chk" title="Incantesimo di una scuola opposta: ogni copia preparata occupa 2 slot">${chk(`incantatori#${inc.id}|incantesimi#${s.id}|opposta`, s.opposta, 'data-ridisegna-pf1')} opp.</label>` : ''}
          ${campo(`incantatori#${inc.id}|incantesimi#${s.id}|note`, s.note, 'placeholder="note (scuola, effetto…)" class="pf-largo"')}
          <button class="btn-piccolo" data-azione="pf1-lancia" data-id="${id}" data-inc="${inc.id}" data-inc-sp="${s.id}">Lancia</button>
          ${togli(`incantatori#${inc.id}|incantesimi`, s.id)}
        </div>`;
        }).join('')).join('');
      // Elenco della classe dal wiki: suggerimenti nel campo nome e consultazione per livello e scuola
      const codice = listaDi(inc);
      // Tutta la lista della classe (0°–9°) da consultare; si aggiungono solo i livelli già accessibili
      const elenco = (codice ? [...INCANTESIMI.values()].filter((v) => v.livelli[codice] !== undefined) : [])
        .sort((a, b) => a.livelli[codice] - b.livelli[codice] || a.nome.localeCompare(b.nome, 'it'));
      const elencoOk = elencoClasse(inc, ci);
      const opposte = nomeClasse(inc.classe) === 'Mago' ? (d.mago.opposte || []).filter(Boolean) : [];
      const libro = libroDi(inc);
      const giaNoti = new Set((libro ? inc.libro || [] : incantesimi).map((s) => norm(s.nome)));
      const livMax = Math.max(0, ...elenco.map((v) => v.livelli[codice]));
      const livMin = Math.min(...elenco.map((v) => v.livelli[codice]));
      const sfoglia = inc.sfoglia ?? '';
      const voci = sfoglia === '' ? [] : elenco.filter((v) => v.livelli[codice] === Number(sfoglia) && (!inc.sfogliaScuola || v.base === inc.sfogliaScuola));
      // Fattucchiere: incantesimi del patrono · Sciamano: incantesimi della magia dello spirito
      const kInc = nomeClasse(inc.classe);
      const livK = kInc ? livelloClasse(d, kInc) : 0;
      const accessibili = livelliAccessibili(inc, ci);
      const bottoneSpeciale = (nome, L, nota, ok) => {
        const v = incantesimoDi(nome);
        const preso = giaNoti.has(norm(v?.nome || nome));
        return `<span class="pf-speciale${preso ? ' presa' : ''}${ok ? '' : ' non-ancora'}">${esc(v?.nome || nome)}
          ${v ? `<button class="btn-mini" data-azione="pf1-info-inc" data-nome="${esc(v.nome)}" title="Descrizione dal wiki">i</button>` : ''}
          ${ok && !preso ? `<button class="btn-mini" data-azione="pf1-aggiungi-speciale" data-id="${id}" data-inc="${inc.id}" data-nome="${esc(v?.nome || nome)}" data-livello="${L}" data-nota="${esc(nota)}" title="Aggiungi agli incantesimi di ${L}° livello">+</button>` : ''}</span>`;
      };
      let speciale = '';
      if (kInc === 'Fattucchiere') {
        const P = window.PF1_PATRONI || {};
        const voci = P[inc.patrono] || [];
        speciale = `<div class="pf-elenco-inc"><div class="pf-riga"><b>Patrono</b>
            ${sel(`incantatori#${inc.id}|patrono`, [['', '— scegli —'], ...Object.keys(P).map((x) => [x, x])], inc.patrono || '', 'data-ridisegna-pf1')}
            ${voci.length ? `<button class="btn-piccolo" data-azione="pf1-patrono-tutti" data-id="${id}" data-inc="${inc.id}" title="Aggiunge tutti gli incantesimi del patrono già concessi al tuo livello (quelli a scelta li scegli tu)">Aggiungi i concessi</button>` : ''}</div>
          ${voci.map(([N, nomi, nota]) => `<div class="pf-voce-inc${livK >= N ? '' : ' non-ancora'}"><span class="muto">${N}° liv · inc. ${Math.ceil(N / 2)}°</span>
            <span>${nomi.split('/').map((x) => bottoneSpeciale(x.trim(), Math.ceil(N / 2), 'patrono', livK >= N)).join(' o ')}${nota ? ` <small class="muto">(${esc(nota)})</small>` : ''}</span></div>`).join('')}</div>`;
      }
      if (kInc === 'Sciamano') {
        const S = window.PF1_SPIRITI || {};
        const voci = S[inc.spirito] || [];
        speciale = `<div class="pf-elenco-inc"><div class="pf-riga"><b>Spirito</b>
            ${sel(`incantatori#${inc.id}|spirito`, [['', '— scegli —'], ...Object.keys(S).map((x) => [x, x])], inc.spirito || '', 'data-ridisegna-pf1')}
            <span class="muto">Magia dello spirito: uno slot in più per livello, solo per l'incantesimo dello spirito.</span></div>
          ${voci.map(([L, nome, nota]) => `<div class="pf-voce-inc${accessibili.has(L) ? '' : ' non-ancora'}"><span class="muto">${L}°</span>
            <span>${bottoneSpeciale(nome, L, 'spirito', accessibili.has(L))}${nota ? ` <small class="muto">(${esc(nota)})</small>` : ''}</span></div>`).join('')}</div>`;
      }
      const versione = nomeClasse(inc.classe) === 'Convocatore'
        ? `<label class="pf-chk" title="Il Convocatore rivisitato (Pathfinder Unchained) ha una lista di incantesimi sua">${chk(`incantatori#${inc.id}|rivisitato`, inc.rivisitato, 'data-ridisegna-pf1')} Convocatore rivisitato</label>` : '';
      const corpoElenco = !codice ? '' : !elenco.length ? `<div class="pf-elenco-inc"><div class="pf-riga"><b>Elenco del wiki</b> ${versione}
          <span class="muto">Nessun livello di incantesimi ancora accessibile per ${esc(inc.classe)} a questo livello.</span></div></div>` : `<div class="pf-elenco-inc">
          <div class="pf-riga"><b>Elenco del wiki</b> ${versione}
            <label>Livello ${sel(`incantatori#${inc.id}|sfoglia`, [['', '— chiuso —'], ...Array.from({ length: livMax - livMin + 1 }, (_, i) => [String(livMin + i), `${livMin + i}°${accessibili.has(livMin + i) ? '' : ' (non ancora)'}`])], sfoglia, 'data-ridisegna-pf1')}</label>
            ${sfoglia !== '' ? `<label>Scuola ${sel(`incantatori#${inc.id}|sfogliaScuola`, [['', 'tutte'], ...SCUOLE_INC.map((s) => [s, s])], inc.sfogliaScuola || '', 'data-ridisegna-pf1')}</label>
              <span class="muto">${voci.length} incantesimi</span>` : `<span class="muto">${elenco.length} incantesimi per ${esc(INC_DATI.liste[codice] || inc.classe)} (0°–${livMax}°)</span>`}
          </div>
          ${sfoglia !== '' && !accessibili.has(Number(sfoglia)) ? `<p class="muto pf-aiuto">Incantesimi di ${sfoglia}° livello: da consultare, non ancora ${libro ? 'da scrivere nel ' + esc(libro[0].toLowerCase()) : 'da aggiungere'} (serve un livello di classe più alto).</p>` : ''}
          ${voci.length ? `<div class="pf-voci-inc">${voci.map((v) => {
            const preso = giaNoti.has(norm(v.nome));
            const opp = opposte.includes(v.base);
            const ok = accessibili.has(v.livelli[codice]);
            return `<div class="pf-voce-inc${preso ? ' presa' : ''}${ok ? '' : ' non-ancora'}">
              <button class="btn-mini" data-azione="pf1-aggiungi-inc" data-id="${id}" data-inc="${inc.id}" data-nome="${esc(v.nome)}" data-livello="${v.livelli[codice]}" title="${!ok ? 'Livello non ancora accessibile' : libro ? (preso ? 'Già nel ' + esc(libro[0].toLowerCase()) : 'Scrivi nel ' + esc(libro[0].toLowerCase())) : preso ? 'Già nell\'elenco: aggiungine un\'altra copia' : 'Aggiungi'}" ${!ok || (libro && preso) ? 'disabled' : ''}>${libro ? '📖' : '+'}</button>
              <span>${esc(v.nome)}</span>
              <small class="muto" title="${esc(v.scuola)}">${esc(v.base)}${opp ? ' · <span class="oltre">opposta</span>' : ''}</small>
              <button class="btn-mini" data-azione="pf1-info-inc" data-nome="${esc(v.nome)}" title="Descrizione dal wiki">i</button>
            </div>`;
          }).join('')}</div>` : ''}
        </div>`;
      const datalist = elencoOk.length ? `<datalist id="elenco-inc-${inc.id}">${elencoOk.map((v) => `<option value="${esc(v.nome)}">${v.livelli[codice]}° · ${esc(v.base)}</option>`).join('')}</datalist>` : '';
      return `<div class="pf-inc">
        <div class="pf-riga">
          <input class="pf-largo" data-pf1="incantatori#${inc.id}|classe" data-id="${id}" value="${esc(inc.classe)}" placeholder="Classe">
          <label>Caratteristica ${sel(`incantatori#${inc.id}|car`, CARS.map((s) => [s, s]), inc.car)}</label>
          ${ci.auto ? `<span title="Calcolato dal livello di classe${CL_MENO_3.has(nomeClasse(inc.classe)) ? ' − 3' : ''}">Liv. incantatore <b>${k(`inc:${inc.id}:cl`)}</b></span>`
            : `<label>Liv. incantatore ${num(`incantatori#${inc.id}|livello`, inc.livello)}</label>`}
          ${haTabella ? `<label class="pf-chk" title="Incantesimi al giorno e conosciuti presi dalla tabella della classe (Golarion Insider)">${chk(`incantatori#${inc.id}|auto`, inc.auto, 'data-ridisegna-pf1')} Tabella del wiki</label>` : ''}
          <label>${sel(`incantatori#${inc.id}|tipo`, [['preparati', 'Prepara'], ['spontanei', 'Spontaneo']], inc.tipo)}</label>
          <span>Concentrazione <b>${k(`inc:${inc.id}:conc`)}</b> ${dado('conc:' + inc.id, 'Concentrazione')}</span>
          ${togli('incantatori', inc.id, 'data-conferma="1"')}
        </div>
        <div class="pf-slot pf-slot-testa"><span>Liv</span><span>Base</span><span>Bonus</span><span>Tot</span><span>CD</span><span>${spontaneo ? 'Usati' : ''}</span></div>
        ${righeSlot}
        ${libro ? vistaLibro(p, inc, libro, elenco, codice, togli) : ''}
        ${haBreviario(inc) ? `<div class="pf-riga brev-apri"><button class="btn-piccolo" data-azione="pf1-apri-breviario" data-id="${id}" data-inc="${inc.id}" title="Apre il breviario in una finestra a parte: scegli e memorizza le preghiere del giorno">✠ Apri il breviario</button>
          <span class="muto">memorizza le preghiere del giorno sfogliando un libro sacro</span></div>` : ''}
        ${libro && incantesimi.length ? '<h4 class="pf-titolo-prep">Preparati oggi</h4>' : ''}
        ${perLivello}
        <form class="riga-form pf-form" data-form="pf1-incantesimo" autocomplete="off">
          <input type="hidden" name="pg" value="${id}"><input type="hidden" name="inc" value="${inc.id}">
          <input name="nome" placeholder="Nome dell'incantesimo${elenco.length ? ' (suggerimenti dall\'elenco della classe)' : ''}" required${elenco.length ? ` list="elenco-inc-${inc.id}"` : ''}>
          <input name="livello" type="number" min="0" max="9" value="1" aria-label="Livello" title="Se l'incantesimo è nell'elenco della classe, il livello viene preso da lì">
          <button>${libro ? 'Prepara' : 'Aggiungi incantesimo'}</button>
        </form>
        ${datalist}
        ${speciale}
        ${corpoElenco}
      </div>`;
    }).join('');
    // Classi di prestigio che fanno avanzare gli incantesimi: a quale classe vanno i loro livelli
    const vociPrest = vociIncPrestigio(d);
    const rigaPrest = vociPrest.length ? `<div class="pf-riga inc-prestigio"><b>Livelli da classi di prestigio</b>
      ${vociPrest.map((x) => `<label>${esc(x.cl.nome)}${x.tipo ? ` (${x.tipo})` : ''}: +${x.livelli} a
        ${x.adatti.length ? `<select data-pf1="classi#${x.cl.id}|incPrestigio|${x.k}" data-id="${id}" data-ridisegna-pf1>${opz(x.adatti.map((inc) => [inc.id, inc.classe || '?']), x.dest)}</select>` : `<i class="oltre">nessuna classe da incantatore ${x.tipo} adatta</i>`}</label>`).join('')}
      <small class="muto">contano per incantesimi al giorno, conosciuti e livello dell'incantatore (con «Tabella del wiki»)</small></div>` : '';
    const corpoInc = `${rigaPrest}${incantatori || '<p class="muto">Nessuna classe da incantatore.</p>'}
      <div class="pf-piede">${aggiungi('incantatori', 'Classe da incantatore')}<span class="muto">Con «Tabella del wiki» gli incantesimi al giorno (e i conosciuti per gli spontanei) seguono la classe e il livello; i bonus per caratteristica vengono dalla tabella delle caratteristiche. Toglila per inserire i valori a mano.</span></div>`;

    // Equipaggiamento
    const armature = d.armature.map((a) => {
      const ae = armaturaEffettiva(a);
      const cambia = n(a.potenziamento) || a.perfetta || a.materiale;
      return `<div class="pf-armatura"><div class="pf-riga">
        <label class="pf-chk" title="Indossata">${chk(`armature#${a.id}|indossata`, a.indossata)}</label>
        <input class="pf-largo" data-pf1="armature#${a.id}|nome" data-id="${id}" value="${esc(a.nome)}" placeholder="Armatura o scudo">
        ${sel(`armature#${a.id}|tipo`, [['armatura', 'Armatura'], ['scudo', 'Scudo']], a.tipo)}
        <label>CA ${num(`armature#${a.id}|bonus`, a.bonus)}</label>
        <label>DES max ${num(`armature#${a.id}|desMax`, a.desMax)}</label>
        <label>Penalità ${num(`armature#${a.id}|penalita`, a.penalita)}</label>
        <label>Fall. % ${num(`armature#${a.id}|fallimento`, a.fallimento)}</label>
        <label>Peso ${num(`armature#${a.id}|peso`, a.peso, 'step="0.5"')}</label>
        ${togli('armature', a.id)}
      </div>
      <div class="pf-riga pf-magia">${controlliMagia('armature', a, chk, sel)}
        ${cambia ? `<span class="muto">effettivi: CA <b>${segno(ae.bonus)}</b> · DES max <b>${ae.desMax === '' || ae.desMax == null ? '—' : segno(ae.desMax)}</b> · penalità <b>${ae.penalita ? '−' + ae.penalita : '0'}</b> · fall. <b>${ae.fallimento}%</b> · peso <b>${kg(ae.peso)} kg</b></span>` : ''}</div></div>`;
    }).join('');
    const L = window.Luoghi;
    const rigaOggetto = (o) => {
      const ow = oggettoDi(o.nome);
      const b = o.bonusId ? d.bonus.find((x) => x.id === o.bonusId) : null;
      const creato = o.creazioneId ? (d.creazioni || []).find((x) => x.id === o.creazioneId) : null;
      return `<div class="pf-riga luogo-riga">
        ${immagineOk(creato?.immagine) ? `<button class="off-mini" data-azione="pf1-off-immagine-vedi" data-id="${id}" data-off="${creato.id}" title="Immagine dell'oggetto"><img src="${creato.immagine}" alt=""></button>` : ''}
        <input class="pf-largo" data-pf1="oggetti#${o.id}|nome" data-id="${id}" value="${esc(o.nome)}" placeholder="Oggetto">${creato?.crescita ? riassuntoCrescita(d, creato) : ''}
        ${ow ? `<button class="btn-mini" data-azione="pf1-info-oggetto" data-nome="${esc(ow[0])}" title="Descrizione dal wiki">i</button>` : ''}
        ${b ? `<label class="pf-chk" title="Bonus attivo (${esc(riassuntoBonus(b))})">${chk(`bonus#${b.id}|attivo`, b.attivo, 'data-ridisegna-pf1')} attivo</label>` : ''}
        <label>Qtà ${num(`oggetti#${o.id}|qta`, o.qta, 'min="0"')}</label>
        <label>Peso cad. ${num(`oggetti#${o.id}|peso`, o.peso, 'step="0.1"')}</label>
        <label title="Valore di un pezzo in monete d'oro (per la vendita)">Valore ${num(`oggetti#${o.id}|valore`, o.valore, `min="0" step="0.01" class="pf-corto" placeholder="${L?.valoreDi(o) || 'mo'}" data-ridisegna-pf1`)}</label>
        ${campo(`oggetti#${o.id}|note`, o.note, 'placeholder="note" class="pf-largo"')}
        ${L ? L.vendita(o, id, 'pf1') : ''}
        ${L ? `<label class="luogo-dove" title="Dove si trova">${`<select data-pf1="oggetti#${o.id}|dove" data-id="${id}" data-ridisegna-pf1>${L.opzioni(L.luogo(o, d), d)}</select>`}</label>` : ''}
        ${!L || L.tipoDi(L.luogo(o, d), d).k === 'indossato' ? (() => {
          const auto = slotAuto(o, d);
          const nomeAuto = auto === 'anello' ? 'Anello' : SLOT_CORPO.find((s) => s[0] === auto)?.[1] || '';
          return `<label class="pf-slot" title="Slot del corpo occupato dall'oggetto indossato">slot <select data-pf1="oggetti#${o.id}|slot" data-id="${id}" data-ridisegna-pf1>
            ${opz([['', nomeAuto ? `auto (${nomeAuto})` : '— nessuno —'], ['anello', 'Anello'], ...SLOT_CORPO.filter(([k]) => !/^anello/.test(k)).map(([k, nm]) => [k, nm]), ['nessuno', 'senza slot']], o.slot || '')}</select></label>`;
        })() : ''}
        ${togli('oggetti', o.id)}
      </div>`;
    };
    const oggetti = L
      ? L.sezione({
        oggetti: d.oggetti, riga: rigaOggetto, unita: 'kg', dati: d, pg: id, sistema: 'pf1',
        peso: (o) => n(o.peso) * (o.qta === '' || o.qta == null ? 1 : n(o.qta)),
        aggiungi: (k) => `<button class="btn-mini" data-azione="pf1-aggiungi" data-id="${id}" data-lista="oggetti" data-dove="${k}" title="Aggiungi un oggetto qui">+</button>`,
        // Armature indossate e armi: si gestiscono nelle loro sezioni, qui sono ricordate sotto "Indossato"
        extra: (k) => {
          if (k !== 'indossato') return '';
          const fissi = [...d.armature.filter((a) => a.indossata && a.nome).map((a) => `🛡 ${esc(a.nome)}`), ...d.armi.filter((a) => a.nome).map((a) => `⚔ ${esc(a.nome)}`)];
          return fissi.length ? `<div class="luogo-fissi" title="Armi e armature indossate (si modificano nelle loro sezioni)">${fissi.map((x) => `<span class="luogo-fisso">${x}</span>`).join('')}</div>` : '';
        },
      })
      : d.oggetti.map(rigaOggetto).join('');
    const corpoEquip = `<h4>Oggetti magici indossati</h4>${schemaSlot(d)}
      ${livelloClasse(d, 'Alchimista') ? sezioneBombe(p, d, c) : ''}<h4>Armature e scudi</h4>${armature || '<p class="muto">Nessuna.</p>'}
      <div class="pf-piede">${aggiungi('armature', 'Armatura o scudo')}${sceltaEquip(p, 'armature')}</div>
      <h4>Oggetti <small class="muto">per luogo · il peso conta solo per ciò che porti addosso (indossato, zaino, faretra, porta pergamene)</small></h4>${oggetti || '<p class="muto">Nessun oggetto.</p>'}
      <div class="pf-piede">${aggiungi('oggetti', 'Oggetto (nello zaino)')}
        <span class="pf-dal-wiki">oggetto magico dal wiki: <input id="scelta-oggetto-${id}" list="pf1-oggetti-magici" placeholder="scrivi per cercare (${OGGETTI.length})" class="pf-largo">
          <button class="btn-piccolo" data-azione="pf1-oggetto-wiki" data-id="${id}">Aggiungi</button>
          <button class="btn-mini" data-azione="pf1-info-oggetto" data-campo="scelta-oggetto-${id}" title="Descrizione dal wiki dell'oggetto scritto">i</button></span>
        ${MERCI.length ? `<span class="pf-dal-wiki">equipaggiamento comune: <input id="scelta-merce-${id}" list="pf1-merci" placeholder="corda, tenda, razioni, cavallo… (${MERCI.length})" class="pf-largo">
          <button class="btn-piccolo" data-azione="pf1-merce" data-id="${id}">Aggiungi</button>
          <button class="btn-mini" data-azione="pf1-info-merce" data-campo="scelta-merce-${id}" title="Costo, peso e descrizione dal wiki">i</button></span>
        ${datalistFisso('pf1-merci', () => MERCI.map((x) => `<option value="${esc(x[1])}">${esc([x[0], x[2], x[3] !== '' ? `${String(x[3]).replace('.', ',')} kg` : ''].filter(Boolean).join(' · '))}</option>`).join(''))}` : ''}
        ${datalistFisso('pf1-oggetti-magici', () => OGGETTI.map((o) => `<option value="${esc(o[0])}">${esc(`${o[2]} · ${o[3]}`)}</option>`).join(''))}</div>
      <h4>Monete</h4>
      <div class="pf-riga"><label>mp ${num('monete|mp', d.monete.mp, 'min="0"')}</label><label>mo ${num('monete|mo', d.monete.mo, 'min="0"')}</label><label>ma ${num('monete|ma', d.monete.ma, 'min="0"')}</label><label>mr ${num('monete|mr', d.monete.mr, 'min="0"')}</label><span class="muto">valore ${k('monete')}</span></div>
      <p class="pf-carico">Peso trasportato <b>${k('peso')}</b> · carico ${k('carico')}</p>`;

    // Mitico
    const corpoMitico = sezioneMitica(p, d, c);

    return `<div class="pf-scheda" data-pf1-scheda="${id}">
      <div class="pf-barra">
        <span class="muto">Bonus attivi: <b class="pf-attivi">${k('bonusAttivi')}</b></span>
        <a class="bottone" href="#/personaggio/${id}/tavolo">📋 Vista da tavolo</a>
        <button data-azione="pf1-riposo" data-id="${id}" title="Recupera PF pari al livello, slot di incantesimo e potere mitico">🌙 Riposo (8 ore)</button>
        ${(() => {
          if (!GIOCATORE) return `<button class="primario" data-azione="pf1-livello-apri" data-id="${id}" title="Avanzamento guidato al livello successivo">⬆ Sali di livello</button>`;
          const manca = mancaPerSalire(p, d, c);
          return manca.length ? `<button class="primario" disabled title="Completa prima il livello attuale">⬆ Sali di livello</button>`
            : `<button class="primario" data-azione="pf1-livello-apri" data-id="${id}" title="Avanzamento guidato al livello successivo">⬆ Sali di livello</button>`;
        })()}
      </div>
      ${GIOCATORE && salita?.pgId !== id ? (() => { const manca = mancaPerSalire(p, d, c); return manca.length ? `<div class="pannello pf-da-completare"><b>${d.classi.length ? `Per completare il ${c.liv}° livello` : 'Per iniziare'}</b>${d.classi.length ? ' (poi potrai salire al successivo)' : ''}:<ul>${manca.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''; })() : ''}
      ${salita?.pgId === id ? sezioneSalita(p, d, c, r) : ''}
      ${sezione('razza', 'Razza', sezioneRazza(p, d, c))}
      ${sezione('classi', 'Classi e livelli', corpoClassi)}
      ${sezione('preferita', 'Classe preferita', sezionePreferite(p, d), prefPrese(d).length ? `<small class="muto">${prefPrese(d).length} bonus razziali</small>` : '')}
      ${sezione('avanzamento', 'Riepilogo dell\'avanzamento', sezioneAvanzamento(p, d, c), (() => { const m = controlloAumenti(d, c).mancanti.length; return m ? `<small class="oltre">⚠ ${m} aument${m > 1 ? 'i' : 'o'} mancant${m > 1 ? 'i' : 'e'}</small>` : d.avanzamento.length ? `<small class="muto">${d.avanzamento.filter((r) => r.tipo === 'livello').length} livelli registrati</small>` : ''; })())}
      ${sezione('prestigio', 'Classi di prestigio', sezionePrestigio(p, d, c), d.classi.some((cl) => CLASSI[nomeClasse(cl.nome)]?.prestigio) ? '<small class="muto">in corso</small>' : '')}
      ${(() => { const s = sezioneArchetipi(p, d); return s ? sezione('archetipi', 'Archetipi', s) : ''; })()}
      ${sezione('fede', 'Divinità e domini', sezioneFede(p, d, c))}
      ${livelloClasse(d, 'Oracolo') ? sezione('oracolo', 'Mistero dell\'Oracolo', sezioneOracolo(p, d)) : ''}
      ${livelloClasse(d, 'Alchimista') ? sezione('alchimista', 'Alchimia: bombe, mutageno e scoperte', sezioneAlchimista(p, d, c)) : ''}
      ${livMA(d) ? sezione('mistificatore', 'Mistificatore Arcano', sezioneMistificatore(p, d, c), `<small class="muto">attacco furtivo +${attaccoFurtivoDadi(d)}d6</small>`) : ''}
      ${livMC(d) ? sezione('chimico', 'Mastro Chimico: forma mutagena e mutageni avanzati', sezioneChimico(p, d, c), d.alchimista?.mutageno?.attivo ? `<small class="pf-etichetta">${esc(datiChimico(d).alterEgo || 'forma mutagena')}</small>` : '') : ''}
      ${livelloClasse(d, 'Fattucchiere') ? sezione('fattucchiere', 'Fatture del Fattucchiere', sezioneFattucchiere(p, d, c)) : ''}
      ${livMS(d) ? sezione('maestro', 'Maestro del Sapere: segreti e sapienza', sezioneMaestro(p, d, c, r), `<small class="muto">${d.maestro.segreti.length}/${segretiDisponibiliMS(livMS(d))} segreti</small>`) : ''}
      ${livelloClasse(d, 'Mago') ? sezione('mago', 'Scuola arcana', sezioneMago(p, d, c)) : ''}
      ${livelloClasse(d, 'Stregone') ? sezione('stirpe', 'Stirpe dello stregone', sezioneStirpe(p, d, c), stirpeDi(d) ? `<small class="muto">${esc(stirpeDi(d).nome)}${d.stregone.tipo ? ` (${esc(d.stregone.tipo)})` : ''}</small>` : '<small class="oltre">da scegliere</small>') : ''}
      ${risorseDivine(d, c).length ? sezione('energia', 'Poteri divini', sezioneEnergia(p, d, c)) : ''}
      ${sezione('bonus', 'Bonus e condizioni', corpoBonus + corpoBonusPiede + tabellaCumulo)}
      ${sezione('caratteristiche', 'Caratteristiche', `<div class="griglia-car">${car}</div>`)}
      ${sezione('ts', 'Tiri salvezza', corpoTs, `<span class="ts-sommario">${TS.map(([k2, nome]) => `${nome.slice(0, 3)} <b>${k('ts:' + k2)}</b>`).join(' · ')}</span>`)}
      ${sezione('difese', 'Difese', difese)}
      ${(() => { const R = resistenzeDi(d); const att = [...ENERGIE.filter(([k]) => R.energia[k].immune || R.energia[k].valore).map(([k, nome]) => `${nome.toLowerCase()} ${testoRes(R.energia[k])}`), R.ri.valore ? `RI ${R.ri.valore}` : '', R.fort.valore ? `fortificazione ${R.fort.valore}%` : ''].filter(Boolean);
        return sezione('resistenze', 'Resistenze e fortificazione', sezioneResistenze(p, d, c), att.length ? `<small class="muto">${esc(att.join(' · '))}</small>` : ''); })()}
      ${sezione('attacchi', 'Attacchi', `${armi || '<p class="muto">Nessuna arma.</p>'}<div class="pf-piede">${aggiungi('armi', 'Arma')}${sceltaEquip(p, 'armi')}</div>`)}
      ${sezione('abilita', 'Abilità', corpoAbil, testaAbil)}
      ${sezione('capacita', 'Talenti e capacità', corpoCap)}
      ${sezione('incantesimi', 'Incantesimi', corpoInc)}
      ${sezione('compagni', 'Compagni', sezioneCompagni(p, d, c, r, { chk, sel, num, campo, togli }), d.compagni.length ? `<small class="muto">${d.compagni.length}</small>` : '')}
      ${sezione('mitico', 'Mitico', corpoMitico, c.mitico.grado ? `<small class="muto">${esc(d.mitico.percorso || 'percorso?')} ${c.mitico.grado}° categoria</small>` : '')}
      ${d.classi.some((cl) => (window.PF1_PROGRESSIONE || {})[nomeClasse(cl.nome)]) ? sezione('progressione', 'Progressione di classe', sezioneProgressione(d)) : ''}
      ${sezione('officina', 'Oggetti magici creati', sezioneOfficina(p, d, c), d.creazioni.length ? `<small class="muto">${d.creazioni.length}</small>` : '')}
      ${sezione('equip', 'Equipaggiamento', corpoEquip)}
    </div>`;
  }

  // Pallini degli slot (spontanei) o conteggio dei preparati
  function usoSlot(p, inc, ci, l) {
    const spontaneo = inc.tipo === 'spontanei';
    if (l.L === 0 && l.base !== '') return '<span class="muto">a volontà</span>';
    if (spontaneo && l.tot > 0) {
      return Array.from({ length: l.tot }, (_, i) => `<button class="pallino${i < l.usati ? ' pieno' : ''}" data-azione="pf1-slot" data-id="${p.id}" data-inc="${inc.id}" data-livello="${l.L}" data-indice="${i}" title="Slot ${i + 1}"></button>`).join('');
    }
    if (!spontaneo && l.tot > 0) {
      // Un incantesimo di una scuola opposta occupa due slot
      const prep = (inc.incantesimi || []).filter((s) => n(s.livello) === l.L).reduce((a, s) => a + n(s.preparati) * (s.opposta ? 2 : 1), 0);
      return `<span class="${prep > l.tot ? 'oltre' : 'muto'}">preparati ${prep}/${l.tot}</span>`;
    }
    return '';
  }
  function pallMitici(p, c) {
    const usati = n(dati(p).mitico.usati);
    return Array.from({ length: c.mitico.max }, (_, i) => `<button class="pallino${i < usati ? ' pieno' : ''}" data-azione="pf1-mitico" data-id="${p.id}" data-indice="${i}"></button>`).join('');
  }

  // =====================================================================
  // Vista da tavolo: riepilogo compatto e stampabile
  // =====================================================================
  function vistaTavolo(p, r) {
    const d = dati(p);
    const c = calcola(p, r);
    const id = p.id;
    const { k, dado } = aiutanti(p, c);
    const classi = d.classi.map((cl) => `${cl.nome} ${cl.livello}`).join(' / ');
    const sotto = [p.campi?.Razza, classi, c.mitico.grado ? `Categoria mitica ${c.mitico.grado}${d.mitico.percorso ? ' (' + d.mitico.percorso + ')' : ''}` : '', p.campi?.Allineamento]
      .filter(Boolean).map(esc).join(' · ');

    const bonus = d.bonus.map((b) => `<button class="chip-bonus${b.attivo ? ' attivo' : ''}" data-azione="pf1-bonus" data-id="${id}" data-bonus="${b.id}" title="${esc(riassuntoBonus(b))}">${esc(b.nome)}</button>`).join('');
    const ts = TS.map(([k2, nome]) => `<div class="tav-riga"><span>${nome}</span><b>${k('ts:' + k2)}</b>${dado('ts:' + k2, nome)}</div>`
      + c.ts[k2].cond.map((x) => `<div class="tav-riga tav-sotto"><span>${esc(x.testo || 'situazionale')}</span><b>${k(`tsc:${k2}:${x.id}`)}</b>${dado(`tsc:${k2}|${x.id}`, `${nome} ${x.testo}`)}</div>`).join('')).join('');
    const armi = d.armi.map((a) => `<tr><td>${esc(a.nome || 'Arma')}</td><td><b>${k(`arma:${a.id}:colpo`)}</b> ${dado('colpo:' + a.id, 'attacco')}</td><td>${k(`arma:${a.id}:danni`)} ${dado('danni:' + a.id, 'danni')}</td></tr>`).join('');
    const abil = abilitaScheda(r, d).filter((a) => !a.nascosta).map((a) => {
      const s = d.abil[a.nome] || {};
      const addestrata = n(s.gradi) > 0;
      return `<div class="tav-abil${addestrata ? '' : ' non-addestrata'}"><span>${c.diClasse[a.nome] ? '●' : '○'} ${esc(a.nome)}</span><b>${k('abil:' + a.nome)}</b>${dado('abil:' + a.nome, a.nome)}</div>`;
    }).join('');
    const incantesimi = d.incantatori.map((inc) => {
      const ci = c.incantatori.find((x) => x.id === inc.id);
      const lista = inc.incantesimi || [];
      const livelli = ci.livelli.filter((l) => l.base !== '' || lista.some((s) => n(s.livello) === l.L)).map((l) => {
        const sp = lista.filter((s) => n(s.livello) === l.L).map((s) => {
          const rimasti = inc.tipo === 'preparati' && l.L > 0 ? ` <small>(${Math.max(0, n(s.preparati) - n(s.lanciati))}/${n(s.preparati)})</small>` : '';
          return `<button class="tav-sp" data-azione="pf1-lancia" data-id="${id}" data-inc="${inc.id}" data-inc-sp="${s.id}" title="Lancia">${esc(s.nome)}${rimasti}</button>`;
        }).join('');
        return `<div class="tav-liv"><b>${l.L}°</b> <span class="muto">CD ${l.cd}</span> <span class="pf-pallini">${usoSlot(p, inc, ci, l)}</span><div class="tav-sp-lista">${sp}</div></div>`;
      }).join('');
      return `<div class="tav-inc"><div class="tav-inc-testa"><b>${esc(inc.classe || 'Incantatore')}</b> <span class="muto">Liv. ${esc(inc.livello)} · Concentrazione ${segno(ci.conc)}</span> ${dado('conc:' + inc.id, 'Concentrazione')}</div>${livelli}</div>`;
    }).join('');
    const talenti = TIPI_CAPACITA.map((tipo) => {
      const voci = d.capacita.filter((x) => (x.tipo || 'Altro') === tipo);
      return voci.length ? `<div class="tav-cap"><b>${tipo}:</b> ${voci.map((x) => `<span title="${esc(x.descrizione || '')}">${esc(x.nome)}</span>`).join(', ')}</div>` : '';
    }).join('');

    const dio = divinitaDi(d);
    const slotScelti = slotFede(d).filter((sc) => sc.scelta.dominio);
    const fedeTavolo = (dio ? `<div class="tav-cap"><b>Divinità:</b> ${esc(dio.nome)} (${esc(dio.allineamento)}) · arma preferita ${esc(dio.arma || '—')}
        <button class="btn-piccolo no-stampa" data-azione="pf1-info-divinita" data-nome="${esc(dio.nome)}">ℹ</button></div>` : '')
      + slotScelti.map((sc) => {
        const ben = FEDE.benedizioni[sc.scelta.dominio];
        const poteri = sc.tipo === 'benedizione'
          ? (ben ? [ben.minore, ...(sc.livello >= 10 ? [ben.maggiore] : [])].map(esc).join(', ') : '')
          : poteriSlot(sc).filter((pt) => pt.livello <= sc.livello).map((pt) => esc(pt.nome)).join(', ');
        return `<div class="tav-cap"><b>${sc.tipo === 'benedizione' ? 'Benedizione' : 'Dominio'} ${esc(sc.scelta.dominio)}${sc.scelta.sotto ? ' (' + esc(sc.scelta.sotto) + ')' : ''}:</b> ${poteri || '<span class="muto">—</span>'}
          ${sc.tipo === 'dominio' ? `<button class="btn-piccolo no-stampa" data-azione="pf1-info-dominio" data-nome="${esc(sc.scelta.dominio)}" data-sotto="${esc(sc.scelta.sotto || '')}">📖</button>` : ''}</div>`;
      }).join('')
      + (() => {
        const o = d.oracolo;
        if (!livelloClasse(d, 'Oracolo') || !o.mistero) return '';
        return `<div class="tav-cap"><b>Mistero ${esc(o.mistero)}</b>${o.maledizione ? ` · maledizione ${esc(o.maledizione)}` : ''}${(o.rivelazioni || []).length ? ': ' + o.rivelazioni.map(esc).join(', ') : ''}</div>`;
      })();
    // Risorse divine con pallini e tiri, utili al tavolo
    const sg = slotFede(d).find((s) => s.tipo === 'benedizione');
    const energia = risorseDivine(d, c).map((r) => `<div class="tav-energia">
        <b>${esc(r.nome)}</b> <span class="muto">${r.dadi}d6${r.cd ? ' · CD ' + r.cd : ''}</span>
        <span class="pf-pallini">${pallini(r.usi, r.usati, `data-azione="pf1-energia-pallino" data-id="${id}" data-chiave="${r.chiave}"`)}</span>
        <button class="btn-piccolo no-stampa" data-azione="pf1-energia" data-id="${id}" data-chiave="${r.chiave}" data-modo="usa">🎲</button>
        ${r.incanalaDa ? `<button class="btn-piccolo no-stampa" data-azione="pf1-energia" data-id="${id}" data-chiave="${r.chiave}" data-modo="incanala" title="${esc(r.incanalaDa.nome)}">Incanala</button>` : ''}
      </div>`).join('') + (sg ? `<div class="tav-energia"><b>Benedizioni</b> <span class="muto">CD ${10 + Math.floor(sg.livello / 2) + c.m.SAG}</span>
        <span class="pf-pallini">${pallini(3 + Math.floor(sg.livello / 2), n(d.fede.usiBenedizioni), `data-azione="pf1-uso-benedizione" data-id="${id}"`)}</span></div>` : '');

    // Scuola arcana del mago, con gli usi dei poteri
    const livMago = livelloClasse(d, 'Mago');
    const scuolaTav = livMago && SCUOLE[d.mago.scuola] ? `<div class="tav-cap"><b>Scuola ${esc(d.mago.scuola)}</b>${d.mago.sotto ? ' (' + esc(d.mago.sotto) + ')' : ''}${d.mago.opposte.filter(Boolean).length || SCUOLE[d.mago.scuola].opposto ? ` · opposte: ${esc([SCUOLE[d.mago.scuola].opposto, ...d.mago.opposte].filter(Boolean).join(', '))}` : ''}
        <button class="btn-piccolo no-stampa" data-azione="pf1-info-scuola" data-id="${id}">📖</button></div>`
      + poteriScuola(d).filter((pt) => pt.livello <= livMago).map((pt) => {
        const usi = usiPotere(pt, c, livMago);
        return `<div class="tav-energia"><b>${esc(pt.nome)}</b> <span class="muto">(${esc(pt.tipo)})</span>
          ${usi ? `<span class="pf-pallini">${pallini(usi, n(d.mago.usati[pt.nome]), `data-azione="pf1-uso-scuola" data-id="${id}" data-nome="${esc(pt.nome)}"`)}</span> <small class="muto">${pt.uso === 'round' ? 'round' : 'volte'}</small>` : ''}</div>`;
      }).join('') : '';

    return `<div class="briciole no-stampa"><a href="#/personaggio/${id}">← Scheda completa</a></div>
      <div class="tavolo" data-pf1-scheda="${id}">
        <header class="tav-testa">
          <div class="tav-titolo">${p.immagine && ctx.ritratto ? `<span class="ritratto ritratto-tavolo">${ctx.ritratto(p)}</span>` : ''}
            <div><h1>${esc(p.nome)}</h1><div class="muto">${sotto}</div></div></div>
          <div class="no-stampa tav-azioni">
            <button data-azione="pf1-riposo" data-id="${id}">🌙 Riposo</button>
            <button data-azione="pf1-stampa">🖨 Stampa</button>
            <button data-azione="pf1-pdf" data-id="${id}" title="Salva questa scheda come file PDF (con il ritratto)">📄 Esporta PDF</button>
          </div>
        </header>
        ${d.bonus.length ? `<div class="tav-bonus"><span class="muto">Bonus:</span> ${bonus}</div>` : ''}
        <div class="tav-griglia">
          <div class="tav-box tav-pf">
            <div class="pf-etich">Punti ferita</div>
            <div class="tav-grande">${c.pfAtt}<small> / ${c.pfMax || '?'}</small></div>
            ${n(d.pf.temp) ? `<div>Temporanei <b>${n(d.pf.temp)}</b></div>` : ''}${n(d.pf.nonLetali) ? `<div>Non letali <b>${n(d.pf.nonLetali)}</b></div>` : ''}
            <div class="no-stampa tav-pf-azioni"><input type="number" class="mini tav-quanti" min="0" placeholder="0" aria-label="Quantità">
              <button data-azione="pf1-pf" data-id="${id}" data-segno="-1">Danno</button><button data-azione="pf1-pf" data-id="${id}" data-segno="1">Cura</button></div>
          </div>
          <div class="tav-box"><div class="pf-etich">Classe armatura</div><div class="tav-grande">${k('ca')}</div><div class="muto">Contatto ${k('contatto')} · Impreparato ${k('sorpresa')}</div></div>
          <div class="tav-box"><div class="pf-etich">Tiri salvezza</div>${ts}</div>
          <div class="tav-box">
            <div class="tav-riga"><span>Iniziativa</span><b>${k('init')}</b>${dado('init', 'Iniziativa')}</div>
            <div class="tav-riga"><span>BAB</span><b>${k('bab')}</b></div>
            <div class="tav-riga"><span>BMC</span><b>${k('bmc')}</b>${dado('bmc', 'BMC')}</div>
            <div class="tav-riga"><span>DMC</span><b>${k('dmc')}</b></div>
            ${p.campi?.['Velocità'] ? `<div class="tav-riga"><span>Velocità</span><b>${esc(p.campi['Velocità'])}</b></div>` : ''}
          </div>
          <div class="tav-box"><div class="pf-etich">Caratteristiche</div>
            <div class="tav-car">${CARS.map((s) => `<div><span class="muto">${s}</span> <b>${c.punteggio[s]}</b> <small>(${segno(c.m[s])})</small></div>`).join('')}</div>
          </div>
        </div>
        ${armi ? `<h2>Attacchi</h2><table class="tav-tabella"><thead><tr><th>Arma</th><th>Colpire</th><th>Danni (critico)</th></tr></thead><tbody>${armi}</tbody></table>` : ''}
        ${c.mitico.grado > 0 ? `<h2>Mitico</h2><div class="pf-riga"><span>Potere mitico</span><span class="pf-pallini">${pallMitici(p, c)}</span><span>Impulso <b>${c.mitico.impeto}</b></span>${dado('impeto', 'Impulso')}</div>` : ''}
        ${incantesimi ? `<h2>Incantesimi</h2>${incantesimi}` : ''}
        <h2>Abilità <small class="muto">● di classe · in grigio senza gradi</small></h2>
        <div class="tav-abilita">${abil}</div>
        ${scuolaTav ? `<h2>Scuola arcana</h2>${scuolaTav}` : ''}
        ${energia ? `<h2>Poteri divini</h2>${energia}` : ''}
        ${fedeTavolo ? `<h2>Divinità e domini</h2>${fedeTavolo}` : ''}
        ${talenti ? `<h2>Talenti e capacità</h2>${talenti}` : ''}
        ${(() => {
          // Resistenze, oggetti indossati per slot ed equipaggiamento portato (utili soprattutto sulla scheda stampata)
          const R = resistenzeDi(d);
          const res = [...ENERGIE.filter(([k2]) => R.energia[k2].immune || R.energia[k2].valore).map(([k2, nome]) => `${nome} ${testoRes(R.energia[k2])}`),
            R.ri.valore ? `RI ${R.ri.valore}` : '', R.fort.valore ? `Fortificazione ${R.fort.valore}%` : ''].filter(Boolean);
          const slot = slotIndossati(d);
          const indossati = SLOT_CORPO.filter(([k2]) => slot[k2].length).map(([k2, nome]) => `<div class="tav-slot"><span>${esc(nome)}</span><b>${esc(slot[k2].join(', '))}</b></div>`).join('');
          const L = window.Luoghi;
          const portati = d.oggetti.filter((o) => (!L || L.porta(o, d)) && o.nome && (!L || L.tipoDi(L.luogo(o, d), d).k !== 'indossato' || !slotAuto(o, d) && !o.slot));
          const mon = ['mp', 'mo', 'ma', 'mr'].filter((x) => n(d.monete[x])).map((x) => `${n(d.monete[x]).toLocaleString('it-IT')} ${x}`).join(' · ');
          return `${res.length ? `<h2>Resistenze</h2><div class="tav-cap">${esc(res.join(' · '))}</div>` : ''}
            ${indossati ? `<h2>Oggetti magici indossati</h2><div class="tav-slot-griglia">${indossati}</div>` : ''}
            ${portati.length || mon ? `<h2>Equipaggiamento</h2>
              ${portati.length ? `<div class="tav-equip">${portati.map((o) => `<span>${esc(o.nome)}${n(o.qta) > 1 ? ` <small>×${n(o.qta)}</small>` : ''}</span>`).join('')}</div>` : ''}
              <div class="tav-cap">${mon ? `<b>Monete:</b> ${mon} · ` : ''}<b>Peso portato:</b> ${k('peso')} · carico ${k('carico')}</div>` : ''}`;
        })()}
        <div class="tav-piede solo-stampa">Cronache del Master · ${esc(p.nome)} · ${new Date().toLocaleDateString('it-IT')}</div>
      </div>`;
  }

  // =====================================================================
  // Tiri dalla scheda
  // =====================================================================
  function tira(p, chiave) {
    const r = ctx.regDi(p);
    const c = calcola(p, r);
    const [tipo, arg] = chiave.split(/:(.*)/s);
    const nomeCar = (s) => r.caratteristiche.find((x) => x.sigla === s)?.nome || s;
    const tiro = (bonus, et) => ctx.eseguiTiro('1d20' + fmtMod(bonus), `${p.nome} · ${et}`);
    if (tipo === 'car') return tiro(c.m[arg] + n(c.proveCar), nomeCar(arg) + (n(c.proveCar) ? ' (prova)' : ''));
    if (tipo === 'ts') return tiro(c.ts[arg].tot, TS.find((x) => x[0] === arg)[1]);
    if (tipo === 'tsc') {
      const [k, id] = arg.split('|');
      const x = c.ts[k]?.cond.find((y) => y.id === id);
      if (x) return tiro(x.tot, `${TS.find((y) => y[0] === k)[1]} ${x.testo || '(situazionale)'}`);
    }
    if (tipo === 'init') return tiro(c.init, 'Iniziativa');
    if (tipo === 'bmc') return tiro(c.bmc, 'Manovra (BMC)');
    if (tipo === 'abil') return tiro(c.abil[arg] ?? 0, arg);
    if (tipo === 'conc') { const inc = c.incantatori.find((x) => x.id === arg); return tiro(inc?.conc ?? 0, 'Concentrazione'); }
    if (tipo === 'impeto') return ctx.eseguiTiro(c.mitico.impeto, `${p.nome} · Impulso mitico`);
    if (tipo === 'furtivo') { const dd = attaccoFurtivoDadi(dati(p)); return dd ? ctx.eseguiTiro(`${dd}d6`, `${p.nome} · Attacco furtivo`) : null; }
    if (tipo === 'bomba') {
      // "bomba:colpo" / "bomba:danni" (tipo scelto nel pannello) oppure "bomba:colpo:Bomba Acida" (borsello delle bombe)
      const [cosa, quale] = arg.split(/:(.*)/s);
      const b = bombaDi(dati(p), c, quale === undefined ? undefined : quale);
      const nome = b.tipo || 'Bomba';
      if (cosa === 'colpo') return tiro(b.colpo, `${nome} (contatto a distanza)`);
      return ctx.eseguiTiro(b.danni, `${p.nome} · danni ${nome} (${b.energia}; spargimento ${b.spargimento}, Riflessi CD ${b.cd})`);
    }
    const arma = c.armi.find((a) => a.id === arg);
    const nomeArma = dati(p).armi.find((a) => a.id === arg)?.nome || 'arma';
    if (tipo === 'colpo' && arma) return tiro(arma.colpo, `${nomeArma} (critico ${arma.critico})`);
    if (tipo === 'danni' && arma) return ctx.eseguiTiro(arma.danni, `${p.nome} · danni ${nomeArma}`);
    return null;
  }

  // =====================================================================
  // Azioni e moduli
  // =====================================================================
  const NUOVI = {
    classi: () => nuovaClasse('', 1),
    armi: () => ({ id: uid(), nome: '', tipo: 'mischia', accurata: false, bonus: '', danni: '1d8', carDanni: 'FOR', bonusDanni: '', critico: '20/×2', peso: '' }),
    armature: () => ({ id: uid(), nome: '', tipo: 'armatura', bonus: '', desMax: '', penalita: '', fallimento: '', peso: '', indossata: true }),
    oggetti: () => ({ id: uid(), nome: '', qta: 1, peso: '', note: '', dove: 'zaino' }),
    tsCond: () => ({ id: uid(), testo: '', valore: 2, tipo: 'senza tipo', ts: 'tutti' }),
    incantatori: (p) => {
      const cl = dati(p).classi.find((x) => CLASSI[nomeClasse(x.nome)]?.inc);
      const [car, tipo] = cl ? CLASSI[nomeClasse(cl.nome)].inc : ['INT', 'preparati'];
      const k = cl ? nomeClasse(cl.nome) : '';
      return { id: uid(), classe: k, car, tipo, livello: cl ? n(cl.livello) : 1, auto: !!TABELLE.classi[k], slot: { 0: { base: '' }, 1: { base: '' } }, incantesimi: [] };
    },
  };

  const azioni = {
    'pf1-aggiungi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const lista = el.dataset.lista;
      const nuovo = NUOVI[lista](p);
      if (el.dataset.dove) nuovo.dove = el.dataset.dove; // "+" di un luogo dell'equipaggiamento
      dati(p)[lista].push(nuovo);
      ctx.salva();
      ctx.render();
    },
    'pf1-classe-liv'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const cl = d.classi.find((x) => x.id === el.dataset.cl);
      if (!cl) return;
      if (GIOCATORE) { ctx.toast('Nella scheda del giocatore i livelli si prendono uno alla volta con «⬆ Sali di livello»', 'errore'); return; }
      const nuovo = n(cl.livello) + Number(el.dataset.d);
      if (nuovo < 1) { azioni['pf1-classe-togli'](el); return; }
      if (nuovo > 20) return;
      // Togliendo un livello si toglie anche la sua voce nel registro (se era l'ultima di quella classe)
      if (Number(el.dataset.d) < 0) {
        const i = d.avanzamento.map((r, j) => [r, j]).reverse().find(([r]) => r.tipo === 'livello' && nomeClasse(r.classe) === nomeClasse(cl.nome) && r.livClasse === n(cl.livello))?.[1];
        if (i !== undefined) d.avanzamento.splice(i, 1);
      }
      cl.livello = nuovo;
      ctx.salva();
      ctx.render();
      ctx.toast(`<b>${esc(cl.nome || 'Classe')}</b> ora di livello ${nuovo}`);
    },
    'pf1-arte-tipi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p) return;
      const d = dati(p);
      d.sottoAbil = d.sottoAbil || {};
      const lista = d.sottoAbil.Intrattenere = d.sottoAbil.Intrattenere || [];
      for (const t of ['Canto', 'Oratoria', d.razza.strumento].filter(Boolean)) if (!lista.some((x) => norm(x) === norm(t))) lista.push(t);
      ctx.salva();
      ctx.render();
    },
    'pf1-classe-elenco'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const cl = p && dati(p).classi.find((x) => x.id === el.dataset.cl);
      if (!cl) return;
      cl.nome = '';
      ctx.salva();
      ctx.render();
    },
    'pf1-classe-togli'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const i = d.classi.findIndex((x) => x.id === el.dataset.cl);
      if (i < 0) return;
      const cl = d.classi[i];
      if (!confirm(`Togliere la classe ${cl.nome || 'senza nome'} (livello ${n(cl.livello)})? Gli incantesimi, i talenti e le caratteristiche già scelti restano sulla scheda.`)) return;
      d.classi.splice(i, 1);
      ctx.salva();
      ctx.render();
      ctx.toast(`🗑 Classe <b>${esc(cl.nome || 'senza nome')}</b> tolta`);
    },
    'pf1-rimuovi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (el.dataset.conferma && !confirm('Rimuovere questa classe da incantatore con tutti i suoi incantesimi?')) return;
      // la lista può essere annidata, es. "incantatori#id|incantesimi": trova() restituisce l'array stesso
      const t = trova(dati(p), el.dataset.lista + '|x');
      const arr = t?.[0];
      if (!Array.isArray(arr)) return;
      const i = arr.findIndex((x) => x.id === el.dataset.elem);
      // Un oggetto magico tolto si porta via il bonus che aveva creato
      const legato = i >= 0 ? arr[i].bonusId : null;
      // Incantesimi Aggiuntivi tolto: se ne vanno anche gli incantesimi conosciuti che aveva aggiunto
      if (i >= 0 && el.dataset.lista === 'capacita' && arr[i].incAggiuntivi) {
        for (const inc of dati(p).incantatori) inc.incantesimi = (inc.incantesimi || []).filter((s) => s.talentoId !== arr[i].id);
      }
      if (i >= 0) arr.splice(i, 1);
      if (legato && (el.dataset.lista === 'oggetti' || el.dataset.lista === 'compagni')) dati(p).bonus = dati(p).bonus.filter((b) => b.id !== legato);
      ctx.salva();
      ctx.render();
    },
    'pf1-tira'(el) { const p = ctx.personaggio(el.dataset.id); if (p) tira(p, el.dataset.tiro); },
    'pf1-slot'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const inc = dati(p).incantatori.find((x) => x.id === el.dataset.inc);
      const L = el.dataset.livello;
      inc.slot[L] = inc.slot[L] || { base: '' };
      const i = Number(el.dataset.indice);
      inc.slot[L].usati = n(inc.slot[L].usati) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    'pf1-mitico'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const i = Number(el.dataset.indice);
      d.mitico.usati = n(d.mitico.usati) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    'pf1-lancia'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const inc = d.incantatori.find((x) => x.id === el.dataset.inc);
      const sp = inc.incantesimi.find((x) => x.id === el.dataset.incSp);
      const L = n(sp.livello);
      const ci = calcola(p, ctx.regDi(p)).incantatori.find((x) => x.id === inc.id);
      const cd = ci.livelli[L]?.cd ?? '';
      const nome = esc(sp.nome || 'Incantesimo');
      if (L === 0) { ctx.toast(`✨ <b>${nome}</b> lanciato (a volontà) · CD ${cd}`); return; }
      if (inc.tipo === 'spontanei') {
        const tot = ci.livelli[L]?.tot || 0;
        inc.slot[L] = inc.slot[L] || { base: '' };
        if (n(inc.slot[L].usati) >= tot) { ctx.toast(`Nessuno slot di ${L}° livello rimasto`, 'errore'); return; }
        inc.slot[L].usati = n(inc.slot[L].usati) + 1;
        ctx.toast(`✨ <b>${nome}</b> lanciato · CD ${cd} · slot di ${L}° rimasti: ${tot - inc.slot[L].usati}`);
      } else {
        if (n(sp.lanciati) >= n(sp.preparati)) { ctx.toast(`<b>${nome}</b>: nessuna copia preparata rimasta`, 'errore'); return; }
        sp.lanciati = n(sp.lanciati) + 1;
        ctx.toast(`✨ <b>${nome}</b> lanciato · CD ${cd} · copie rimaste: ${n(sp.preparati) - sp.lanciati}`);
      }
      ctx.salva();
      ctx.render();
    },
    'pf1-riposo'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const c = calcola(p, ctx.regDi(p));
      let testoPf = '';
      if (c.pfMax > 0 && d.pf.attuali !== '' && d.pf.attuali != null) {
        const prima = n(d.pf.attuali);
        // Recupero (mitico, dalla 3° categoria): dopo 8 ore di riposo i PF tornano al massimo
        d.pf.attuali = c.mitico.grado >= 3 ? c.pfMax : Math.min(c.pfMax, prima + Math.max(1, c.liv));
        testoPf = `PF ${prima} → ${d.pf.attuali}, `;
      }
      d.pf.nonLetali = '';
      for (const inc of d.incantatori) {
        for (const L of Object.keys(inc.slot || {})) inc.slot[L].usati = 0;
        for (const s of inc.incantesimi || []) s.lanciati = 0;
      }
      d.mitico.usati = 0;
      d.energia.usati = {};
      d.fede.usiBenedizioni = 0;
      d.mago.usati = {};
      d.alchimista.bombeUsate = 0;
      if (d.chimico) { d.chimico.mutareUsati = 0; d.chimico.soffioUsato = false; }
      if (d.mistificatore) d.mistificatore = { estemporanei: 0, mistificati: 0, invisibile: 0 };
      if (d.stregone) d.stregone.usati = {};
      ctx.salva();
      ctx.render();
      ctx.toast(`🌙 Riposo: ${testoPf}slot di incantesimo, poteri divini e potere mitico recuperati`);
    },
    'pf1-pf'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const q = n(el.closest('.tav-pf').querySelector('.tav-quanti').value);
      if (!p || !q) return;
      modificaPf(p, Number(el.dataset.segno) * q);
      ctx.salva();
      ctx.render();
    },
    'pf1-bonus'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const b = dati(p).bonus.find((x) => x.id === el.dataset.bonus);
      if (!b) return;
      b.attivo = !b.attivo;
      ctx.salva();
      ctx.render();
    },
    'pf1-espandi'(el) {
      const id = el.dataset.bonus;
      if (bonusAperti.has(id)) bonusAperti.delete(id); else bonusAperti.add(id);
      ctx.render();
    },
    'pf1-aggiungi-bonus'(el) {
      const p = ctx.personaggio(el.dataset.id);
      let b;
      if (el.dataset.vuoto) {
        b = { id: uid(), nome: 'Nuovo bonus', attivo: false, effetti: [{ id: uid(), ...E('colpire', 1, 'morale') }] };
        bonusAperti.add(b.id);
      } else {
        const nome = document.getElementById('pf1-preset-bonus').value;
        b = { id: uid(), nome, attivo: false, effetti: PRESET_BONUS[nome].map((e) => ({ id: uid(), ...e })) };
      }
      dati(p).bonus.push(b);
      ctx.salva();
      ctx.render();
    },
    'pf1-aggiungi-effetto'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const b = dati(p).bonus.find((x) => x.id === el.dataset.bonus);
      b.effetti = b.effetti || [];
      b.effetti.push({ id: uid(), ...E('colpire', 1, 'morale') });
      ctx.salva();
      ctx.render();
    },
    'pf1-stampa'() { window.print(); },
    async 'pf1-pdf'(el) {
      const p = ctx.personaggio(el.dataset.id);
      try {
        const file = await ctx.pdf(p?.nome || 'scheda');
        if (file) ctx.toast(`📄 Scheda salvata in PDF: <b>${esc(file)}</b>`);
      } catch (e) {
        ctx.toast(`PDF non creato: ${esc(e.message)}. In alternativa usa Stampa → "Salva come PDF".`, 'errore');
      }
    },
    'pf1-chiudi-info'() { document.getElementById('info-overlay')?.remove(); },
    'pf1-info-razza'(el) {
      const r = RAZZE[el.dataset.nome];
      if (!r) return;
      apriInfo(r.nome, `<div class="info-fatti">
          ${fatto('Caratteristiche', Object.entries(r.car).map(([s, v]) => `${NOMI_CAR[s]} ${segno(v)}`).join(', ') || (r.scelta ? `+${r.scelta} a una caratteristica a scelta` : ''))}
          ${fatto('Taglia', r.taglia)}${fatto('Velocità', String(r.velocita).replace('.', ',') + ' m')}
          ${r.testi ? r.testi.map(([t, x]) => fatto(t, x)).join('') : fatto('Tratti', r.tratti.join(', '))}
        </div>`, r.pagina, estraiRazza);
    },
    'pf1-uso-benedizione'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const i = Number(el.dataset.indice);
      d.fede.usiBenedizioni = n(d.fede.usiBenedizioni) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    'pf1-energia-pallino'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const i = Number(el.dataset.indice);
      d.energia.usati[el.dataset.chiave] = n(d.energia.usati[el.dataset.chiave]) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    'pf1-energia'(el) { const p = ctx.personaggio(el.dataset.id); if (p) usaEnergia(p, el.dataset.chiave, el.dataset.modo); },
    'pf1-uso-scuola'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const i = Number(el.dataset.indice);
      d.mago.usati[el.dataset.nome] = n(d.mago.usati[el.dataset.nome]) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    'pf1-info-scuola'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const sc = SCUOLE[d.mago.scuola];
      if (!sc) return;
      const poteri = poteriScuola(d);
      apriInfo(`Scuola: ${sc.nome}${d.mago.sotto ? ' · ' + d.mago.sotto : ''}`, `<div class="info-fatti">
          ${fatto('Poteri', poteri.map((pt) => `${pt.nome} (${pt.tipo}${pt.livello > 1 ? ', dal ' + pt.livello + '°' : ''})`).join(' · '))}
          ${fatto('Scuola opposta', sc.opposto)}
        </div>`, 'Mago/Scuole_Arcane', estraiScuola(sc.nome, d.mago.sotto, sc.elementale));
    },
    'pf1-alternativo'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const lista = d.razza.alternativi;
      const i = lista.indexOf(el.dataset.nome);
      if (i >= 0) lista.splice(i, 1); else lista.push(el.dataset.nome);
      // La velocità nel campo di testo segue il tratto alternativo (es. Arti Lunghi, Lesto di Piedi)
      const v = velocitaRazza(d);
      if (v) { p.campi = p.campi || {}; p.campi['Velocità'] = metri(v); }
      ctx.salva();
      ctx.render();
    },
    'pf1-info-alternativo'(el) {
      const r = RAZZE[el.dataset.razza];
      const a = r?.alternativi.find((x) => x.nome === el.dataset.nome);
      if (!a) return;
      apriInfo(`${a.nome} (${r.nome})`, `<div class="info-fatti">
          ${fatto('Sostituisce', a.sostituiti.join(', ') || 'vedi descrizione')}
          ${fatto('Bonus', a.bonus.map((b) => `${b.bersaglio.replace(/^abil:/, '')} ${segno(b.valore)}`).join(', '))}
          ${fatto('Velocità', a.velocita ? metri(a.velocita) : '')}
        </div>`, r.pagina, (doc) => {
        // Voce dell'elenco "Tratti Razziali Alternativi" che inizia col nome del tratto
        const voci = [...doc.querySelectorAll('#mw-content-text li, #mw-content-text p')].map((x) => x.textContent.replace(/\s+/g, ' ').trim());
        const chiave = norm(a.nome.replace(/\s*\(.*\)$/, ''));
        return voci.find((t) => norm(t).startsWith(chiave + ':') || norm(t).startsWith(chiave + ' (')) || voci.find((t) => norm(t).startsWith(chiave)) || '';
      });
    },
    'pf1-rivelazione'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const lista = d.oracolo.rivelazioni = d.oracolo.rivelazioni || [];
      const i = lista.indexOf(el.dataset.nome);
      if (i >= 0) lista.splice(i, 1); else lista.push(el.dataset.nome);
      ctx.salva();
      ctx.render();
    },
    // ---- Officina degli oggetti magici ----
    'pf1-off-nuovo'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const x = NUOVA_CREAZIONE();
      d.creazioni.push(x);
      officinaAperta = x.id;
      ctx.salva();
      ctx.render();
      setTimeout(() => document.querySelector('.off-scheda.aperta input')?.focus(), 50);
    },
    'pf1-off-apri'(el) { officinaAperta = officinaAperta === el.dataset.off ? null : el.dataset.off; ctx.render(); },
    // Immagine dell'oggetto creato: scelta dal computer e ridotta (lato lungo 400 px)
    async 'pf1-off-immagine'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const x = p && dati(p).creazioni.find((y) => y.id === el.dataset.off);
      if (!x || !ctx.scegliImmagine) return;
      try {
        const img = await ctx.scegliImmagine(400);
        if (!img) return;
        x.immagine = img;
        ctx.salva();
        ctx.render();
        ctx.toast(`🖼 Immagine di <b>${esc(x.nome || 'oggetto')}</b> aggiornata`);
      } catch (e) { ctx.toast(esc(e.message), 'errore'); }
    },
    'pf1-off-immagine-togli'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const x = p && dati(p).creazioni.find((y) => y.id === el.dataset.off);
      if (!x || !confirm(`Togliere l'immagine di ${x.nome || 'questo oggetto'}?`)) return;
      delete x.immagine;
      ctx.salva();
      ctx.render();
    },
    'pf1-off-immagine-vedi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const x = p && dati(p).creazioni.find((y) => y.id === el.dataset.off);
      if (!x || !immagineOk(x.immagine)) return;
      apriInfo(x.nome || 'Oggetto', `<div class="off-img-grande"><img src="${x.immagine}" alt="${esc(x.nome || '')}"></div>${x.note ? `<p>${esc(x.note)}</p>` : ''}`, '');
    },
    // ---- Stirpe dello stregone ----
    'pf1-uso-stirpe'(el) {
      const s = dati(ctx.personaggio(el.dataset.id)).stregone;
      const k = el.dataset.chiave;
      const i = Number(el.dataset.indice);
      s.usati[k] = n(s.usati[k]) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    'pf1-info-stirpe'(el, e) {
      e?.stopPropagation?.();
      const st = STIRPI.find((x) => x.nome === el.dataset.stirpe);
      const pt = st?.poteri.find((x) => x.nome === el.dataset.nome);
      if (!pt) return;
      apriInfo(`${pt.nome} (stirpe ${st.nome})`, `<div class="info-fatti">
          ${fatto('Tipo', TIPI_MIT[pt.tipo] || pt.tipo)}${fatto('Livello', `${pt.liv}° livello da stregone`)}
          ${fatto('Usi', { '3+CAR': '3 + modificatore di Carisma al giorno', liv: 'pari al livello da stregone', 'round=liv': 'round al giorno pari al livello da stregone', 1: '1 al giorno', 2: '2 al giorno', 3: '3 al giorno' }[pt.usi] || '')}
        </div>`, 'Stregone/Stirpi', estraiPotereStirpe(st.nome, pt.nome));
    },
    // ---- Mistificatore Arcano: usi giornalieri (clic sull'ultimo pieno = lo libera) ----
    'pf1-ma-usi'(el) {
      const m = datiMistificatore(dati(ctx.personaggio(el.dataset.id)));
      const k = el.dataset.campo;
      const i = Number(el.dataset.indice);
      m[k] = n(m[k]) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    // ---- Mastro Chimico ----
    'pf1-mc-usi'(el) {
      const ch = datiChimico(dati(ctx.personaggio(el.dataset.id)));
      const i = Number(el.dataset.indice);
      ch.mutareUsati = n(ch.mutareUsati) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    // Mutare: assume la forma mutagena senza bere il mutageno (un uso giornaliero)
    'pf1-mc-muta'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const ch = datiChimico(d);
      const usi = mutareGiorno(livMC(d));
      if (n(ch.mutareUsati) >= usi) { ctx.toast('Usi di Mutare finiti per oggi', 'errore'); return; }
      if (d.alchimista?.mutageno?.attivo) return;
      ch.mutareUsati = n(ch.mutareUsati) + 1;
      ch.soffioUsato = false;
      azioni['pf1-alc-mutageno'](el);
      if (ch.avanzati.includes('Cambiamento Ristoratore')) ctx.toast('Cambiamento Ristoratore: tira 1d8 + livello per i PF recuperati');
    },
    // Tornare alla forma normale prima della fine costa un altro uso di Mutare
    'pf1-mc-torna'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const ch = datiChimico(d);
      const usi = mutareGiorno(livMC(d));
      if (n(ch.mutareUsati) >= usi) { ctx.toast('Serve un uso di Mutare per tornare prima: aspetta la fine della durata', 'errore'); return; }
      ch.mutareUsati = n(ch.mutareUsati) + 1;
      azioni['pf1-alc-mutageno'](el);
    },
    'pf1-mc-avanzato'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const ch = datiChimico(d);
      const nome = el.dataset.nome;
      const i = ch.avanzati.indexOf(nome);
      if (i >= 0) {
        if (!confirm(`Togliere il mutageno avanzato «${nome}»? La scelta normalmente non si cambia.`)) { ctx.render(); return; }
        ch.avanzati.splice(i, 1);
        if (nome === 'Mutageno Draconico') ch.drago = '';
      } else {
        const x = AVANZATI_MC.find((y) => y[0] === nome);
        const no = x ? motivoNoAvanzato(d, x) : ['sconosciuto'];
        if (no.length) { ctx.toast(`«${esc(nome)}» richiede: ${esc(no.join('; '))}`, 'errore'); ctx.render(); return; }
        if (ch.avanzati.length >= Math.floor(livMC(d) / 2)) { ctx.toast('Hai già tutti i mutageni avanzati del tuo livello', 'errore'); ctx.render(); return; }
        ch.avanzati.push(nome);
      }
      ctx.salva();
      ctx.render();
    },
    'pf1-mc-soffio'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const ch = datiChimico(d);
      const drago = DRAGHI_MC.find((x) => x[0] === ch.drago);
      if (!drago || ch.soffioUsato) return;
      ch.soffioUsato = true;
      ctx.salva();
      ctx.eseguiTiro('8d8', `${p.nome} · Soffio (${drago[1] === 'elettricita' ? 'elettricità' : drago[1]})`);
      ctx.render();
    },
    // ---- Resistenze ----
    'pf1-res-aggiungi'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      d.resistenze.fonti = d.resistenze.fonti || [];
      d.resistenze.fonti.push({ id: uid(), nome: '', tipo: 'fuoco', valore: 10, immune: false });
      ctx.salva();
      ctx.render();
    },
    // Fortificazione: d% minore o uguale alla probabilità = critico (o attacco furtivo) negato
    'pf1-fortificazione'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const R = resistenzeDi(dati(p));
      if (!R.fort.valore) return;
      const t = ctx.eseguiTiro('1d100', `${p.nome} · Fortificazione ${R.fort.valore}%`);
      if (!t) return;
      const negato = t.totale <= R.fort.valore;
      ctx.toast(negato ? `🛡 <b>${t.totale}</b> su ${R.fort.valore}%: il colpo critico / attacco furtivo è <b>negato</b>, il danno si tira normalmente`
        : `💥 <b>${t.totale}</b> su ${R.fort.valore}%: la fortificazione non basta, il colpo critico / attacco furtivo va a segno`, negato ? '' : 'errore');
    },
    // ---- Mitico ----
    'pf1-mit-info'(el, e) {
      e?.stopPropagation?.();
      const nome = el.dataset.nome;
      const pagina = el.dataset.pagina || 'Eroi_Mitici';
      const p = ctx.personaggio(document.querySelector('[data-pf1-scheda]')?.dataset.pf1Scheda);
      const x = p ? capacitaMitica(percorsiDi(dati(p)), nome) : MITICI.universali.find((y) => y.nome === nome);
      const base = BASE_MITICHE.find((b) => titoloBase(b[1]) === nome);
      apriInfo(nome, `<div class="info-fatti">
          ${fatto('Tipo', TIPI_MIT[el.dataset.tipo] || el.dataset.tipo)}
          ${x ? fatto('Categoria minima', `${x.cat}°`) : ''}${x ? fatto('Requisito', x.req.join(' ')) : ''}
          ${x && x.volte > 1 ? fatto('Si può prendere', x.volte >= 99 ? 'più volte (vedi il testo)' : `fino a ${x.volte} volte`) : ''}
          ${base ? fatto('In breve', base[3]) : ''}
        </div>`, pagina.replace(/ /g, '_'), pagina.startsWith('Incantesimi/') ? (doc) => blocchiTesto(doc).filter((t) => t.length > 60).slice(0, 4).join('\n\n') : estraiMitica(nome));
    },
    'pf1-mit-info-scelta'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const nome = document.getElementById(`mit-scelta-${el.dataset.id}`)?.value;
      if (!p || !nome) { ctx.toast('Scegli prima una capacità dall\'elenco', 'errore'); return; }
      const percorsi = percorsiDi(dati(p));
      const x = capacitaMitica(percorsi, nome);
      const finto = { dataset: { nome, pagina: paginaCapacita(percorsi, nome), tipo: x?.tipo || '' } };
      azioni['pf1-mit-info'](finto);
    },
    'pf1-mit-prendi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const nome = document.getElementById(`mit-scelta-${el.dataset.id}`)?.value;
      const x = nome && capacitaMitica(percorsiDi(d), nome);
      if (!x) { ctx.toast('Scegli una capacità dall\'elenco', 'errore'); return; }
      const g = datiMitici(d).g;
      if (x.cat > g) { ctx.toast(`«${esc(nome)}» si può scegliere dalla ${x.cat}° categoria`, 'errore'); return; }
      if (quanteScelte(d, nome) >= limiteMitica(x, g)) { ctx.toast(`«${esc(nome)}» è già stata presa il numero massimo di volte`, 'errore'); return; }
      if (d.mitico.scelte.length >= g && !confirm(`Hai già ${d.mitico.scelte.length} capacità di percorso (una per categoria: ${g}). Aggiungerla comunque?`)) return;
      if (x.req.length && !confirm(`Requisito di «${nome}»:\n${x.req.join('\n')}\n\nLo soddisfi?`)) return;
      d.mitico.scelte.push({ id: uid(), nome, cat: g, car: '', dettaglio: '' });
      ctx.salva();
      ctx.render();
      ctx.toast(`✨ Capacità mitica: <b>${esc(nome)}</b>`);
    },
    'pf1-mit-togli'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const s = d.mitico.scelte.find((x) => x.id === el.dataset.elem);
      if (!s || !confirm(`Togliere «${s.nome}»? Le capacità di percorso normalmente non si cambiano.`)) return;
      d.mitico.scelte = d.mitico.scelte.filter((x) => x !== s);
      ctx.salva();
      ctx.render();
    },
    'pf1-mit-inc'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      d.mitico.incantesimi.push({ id: uid(), nome: '' });
      ctx.salva();
      ctx.render();
    },
    'pf1-mit-inc-togli'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      d.mitico.incantesimi = d.mitico.incantesimi.filter((x) => x.id !== el.dataset.elem);
      ctx.salva();
      ctx.render();
    },
    'pf1-mit-cimento'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const testo = (document.getElementById(`mit-cim-${el.dataset.id}`)?.value || '').trim() || 'Cimento completato';
      const g = datiMitici(d).g;
      d.mitico.cimenti = n(d.mitico.cimenti) + 1;
      d.mitico.registro.push({ id: uid(), testo, cat: g + 1, quando: Date.now() });
      ctx.salva();
      ctx.render();
      const serve = CIMENTI[g + 1] || 0;
      ctx.toast(d.mitico.cimenti >= serve ? `🏆 Cimenti completati: puoi salire alla <b>${g + 1}° categoria</b>` : `🏆 Cimento annotato (${d.mitico.cimenti}/${serve})`);
    },
    'pf1-mit-cim-togli'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const r = d.mitico.registro.find((x) => x.id === el.dataset.elem);
      if (!r) return;
      d.mitico.registro = d.mitico.registro.filter((x) => x !== r);
      // Se era un cimento verso la prossima categoria, il contatore scende
      if (r.cat === datiMitici(d).g + 1) d.mitico.cimenti = Math.max(0, n(d.mitico.cimenti) - 1);
      ctx.salva();
      ctx.render();
    },
    'pf1-mit-sali'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const g = datiMitici(d).g;
      const serve = CIMENTI[g + 1];
      if (g >= 10 || n(d.mitico.cimenti) < serve) return;
      d.mitico.grado = g + 1;
      d.mitico.cimenti = n(d.mitico.cimenti) - serve;
      ctx.salva();
      ctx.render();
      const nuovo = g + 1;
      const cosa = ['una capacità di percorso', CAT_CAR.includes(nuovo) ? '+2 a una caratteristica' : 'un talento mitico', ...BASE_MITICHE.filter((b) => b[0] === nuovo).map((b) => b[1])];
      ctx.toast(`✨ <b>${nuovo}° categoria mitica</b>: ${esc(cosa.join(', '))}, +${PF_MITICI[d.mitico.percorso] || 0} PF`);
    },
    'pf1-off-togli'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const x = d.creazioni.find((y) => y.id === el.dataset.off);
      if (!x) return;
      const collegato = [...d.armi, ...d.armature, ...d.oggetti].find((y) => y.id === x.collegato);
      if (!confirm(`Eliminare «${x.nome || 'oggetto senza nome'}» dagli oggetti creati?${collegato ? '\n\nViene tolto anche dalla scheda (attacchi, armature o equipaggiamento).' : ''}`)) return;
      if (collegato) {
        d.armi = d.armi.filter((a) => a.id !== x.collegato);
        d.armature = d.armature.filter((a) => a.id !== x.collegato);
        if (collegato.bonusId) d.bonus = d.bonus.filter((b) => b.id !== collegato.bonusId);
        d.oggetti = d.oggetti.filter((a) => a.id !== x.collegato);
      }
      d.creazioni = d.creazioni.filter((y) => y !== x);
      ctx.salva();
      ctx.render();
    },
    'pf1-off-cap'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const x = d.creazioni.find((y) => y.id === el.dataset.off);
      const nome = document.getElementById(`off-cap-${el.dataset.off}`)?.value;
      if (!x || !nome) return;
      x.capacita = [...new Set([...(x.capacita || []), nome])];
      sincronizzaCreazione(d, x);
      ctx.salva();
      ctx.render();
    },
    'pf1-off-cap-togli'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const x = d.creazioni.find((y) => y.id === el.dataset.off);
      if (!x) return;
      x.capacita = (x.capacita || []).filter((k) => k !== el.dataset.nome);
      sincronizzaCreazione(d, x);
      ctx.salva();
      ctx.render();
    },
    'pf1-off-cap-info'(el) {
      const nome = document.getElementById(`off-cap-${el.dataset.off}`)?.value;
      if (!nome) { ctx.toast('Scegli prima una capacità dall\'elenco'); return; }
      const pagina = ['armatura', 'scudo'].includes(el.dataset.cat) ? 'Armature_Magiche' : 'Armi_Magiche';
      apriInfo(nome, '', pagina, (doc) => {
        const righe = blocchiTesto(doc);
        const i = righe.findIndex((r) => norm(r) === norm(nome) || norm(r).startsWith(norm(nome) + ':'));
        if (i < 0) return '';
        return righe[i].length > nome.length + 5 ? righe[i] : righe.slice(i + 1, i + 3).join('\n\n');
      });
    },
    'pf1-off-riga'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const x = d.creazioni.find((y) => y.id === el.dataset.off);
      if (!x) return;
      const lista = el.dataset.lista;
      x[lista] = x[lista] || [];
      if (lista === 'livelli') {
        // Prossimo livello libero (dopo l'ultimo scritto)
        const ultimo = Math.max(0, ...x.livelli.map((r) => n(r.livello)));
        x.livelli.push({ id: uid(), livello: Math.min(20, ultimo + 1), testo: '', bersaglio: '', valore: '', tipo: 'senza tipo', resistenza: '' });
      } else x[lista].push(lista === 'effetti' ? { id: uid(), bersaglio: '', valore: '', tipo: 'senza tipo' } : { id: uid(), nome: '', livInc: '', attivazione: 'continuo', cariche: '', durata: '', componente: '', descrizione: '' });
      ctx.salva();
      ctx.render();
    },
    'pf1-off-riga-togli'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const x = d.creazioni.find((y) => y.id === el.dataset.off);
      if (!x) return;
      x[el.dataset.lista].splice(Number(el.dataset.i), 1);
      sincronizzaCreazione(d, x);
      ctx.salva();
      ctx.render();
    },
    'pf1-scoperta'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const a = datiAlchimista(d);
      const nome = el.dataset.nome;
      const i = a.scoperte.indexOf(nome);
      if (i >= 0) {
        const dipendenti = a.scoperte.filter((x) => scopertaDi(x)?.richieste.includes(nome));
        if (dipendenti.length && !confirm(`${nome} è richiesta da ${dipendenti.join(', ')}. Toglierla comunque?`)) { ctx.render(); return; }
        a.scoperte.splice(i, 1);
        if (a.tipoBomba === nome) a.tipoBomba = '';
        if (/^Cognatogeno$/.test(nome) && a.mutageno.tipo === 'cognatogeno' && !a.mutageno.attivo) { a.mutageno.tipo = 'mutageno'; a.mutageno.car = ['FOR', 'DES', 'COS']; }
      } else a.scoperte.push(nome);
      ctx.salva();
      ctx.render();
    },
    'pf1-fattura'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const f = d.fattucchiere;
      if (!Array.isArray(f.fatture)) f.fatture = [];
      f.collegati = f.collegati || {};
      const nome = el.dataset.nome;
      const i = f.fatture.indexOf(nome);
      if (i >= 0) {
        const dipendenti = f.fatture.filter((x) => fatturaDi(x)?.richieste.includes(nome));
        if (dipendenti.length && !confirm(`${nome} è richiesta da ${dipendenti.join(', ')}. Toglierla comunque?`)) { ctx.render(); return; }
        f.fatture.splice(i, 1);
        // Toglie anche ciò che la fattura aveva aggiunto alla scheda
        const col = f.collegati[nome];
        if (col?.bonusId) d.bonus = d.bonus.filter((b) => b.id !== col.bonusId);
        if (col?.armaId) d.armi = d.armi.filter((a) => a.id !== col.armaId);
        delete f.collegati[nome];
      } else {
        f.fatture.push(nome);
        // Effetti fissi sulla scheda
        if (nome === 'Volo') {
          const b = { id: uid(), nome: 'Fattura: Volo', attivo: true, effetti: [{ id: uid(), ...E('abil:Volare', 4, 'razziale') }] };
          d.bonus.push(b);
          f.collegati[nome] = { bonusId: b.id };
        }
        if (nome === 'Unghie') {
          const piccolo = /Piccol|Minuscol|Minut/i.test(d.taglia);
          const a = { ...NUOVI.armi(), nome: 'Unghie (fattura, secondario)', danni: piccolo ? '1d2' : '1d3', bonus: -5, carDanni: 'FOR05' };
          d.armi.push(a);
          f.collegati[nome] = { armaId: a.id };
        }
      }
      ctx.salva();
      ctx.render();
    },
    'pf1-info-fattura'(el, e) {
      e?.stopPropagation?.();
      const x = fatturaDi(el.dataset.nome);
      if (!x) return;
      apriInfo(`Fattura: ${x.nome}`, `<div class="info-fatti">
          ${fatto('Tipo', x.tipo === 'Sop' ? 'Soprannaturale (Sop)' : x.tipo === 'Str' ? 'Straordinaria (Str)' : x.tipo === 'Mag' ? 'Magica (Mag)' : '')}
          ${fatto('Categoria', x.categoria === 'maggiore' ? 'Fattura maggiore (dal 10° livello)' : x.categoria === 'superiore' ? 'Fattura superiore (dal 18° livello)' : 'Fattura')}
          ${fatto('Richiede', x.richieste.join(', '))}
          ${fatto('Limite', x.volta24 ? 'Lo stesso bersaglio non può esserne influenzato di nuovo per 24 ore' : '')}
        </div>`, 'Fattucchiere', (doc) => {
        const voci = [...doc.querySelectorAll('#mw-content-text li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
        const chiave = norm(x.nome);
        return voci.find((t) => norm(t).startsWith(chiave + ' (') || norm(t).startsWith(chiave + ':')) || '';
      });
    },
    'pf1-bomba-lancia'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const a = datiAlchimista(d);
      const b = bombaDi(d, calcola(p, ctx.regDi(p)), el.dataset.tipo);
      if (n(a.bombeUsate) >= b.usi) { ctx.toast('Bombe del giorno finite', 'errore'); return; }
      a.bombeUsate = n(a.bombeUsate) + 1;
      ctx.salva();
      tira(p, `bomba:colpo:${el.dataset.tipo}`);
      setTimeout(() => { tira(p, `bomba:danni:${el.dataset.tipo}`); ctx.render(); }, 700);
    },
    'pf1-alc-bomba'(el) {
      const a = datiAlchimista(dati(ctx.personaggio(el.dataset.id)));
      const i = Number(el.dataset.indice);
      a.bombeUsate = n(a.bombeUsate) === i + 1 ? i : i + 1;
      ctx.salva();
      ctx.render();
    },
    'pf1-alc-mutageno'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const a = datiAlchimista(d);
      const mu = a.mutageno;
      if (mu.attivo) {
        d.bonus = d.bonus.filter((b) => b.id !== mu.bonusId);
        mu.attivo = false;
        mu.bonusId = '';
        if (d.chimico) d.chimico.soffioUsato = false;
        ctx.toast(livMC(d) ? 'Forma mutagena terminata: torni alla forma normale' : 'Effetto del mutageno terminato');
      } else {
        if (!a.scoperte.includes('Cognatogeno')) mu.tipo = 'mutageno';
        const grado = gradoMutageno(a, mu.tipo, d);
        const nomeMu = `${mu.tipo === 'cognatogeno' ? 'Cognatogeno' : 'Mutageno'}${grado === 3 ? ' Superiore' : grado === 2 ? ' Maggiore' : ''}`;
        const b = { id: uid(), nome: nomeMu, attivo: true, effetti: effettiMutageno(a, d) };
        d.bonus.push(b);
        mu.attivo = true;
        mu.bonusId = b.id;
        ctx.toast(`🧪 <b>${esc(nomeMu)}</b> attivo: ${esc(riassuntoBonus(b))}`);
      }
      ctx.salva();
      ctx.render();
    },
    'pf1-info-scoperta'(el, e) {
      e?.stopPropagation?.();
      const s = scopertaDi(el.dataset.nome);
      if (!s) return;
      apriInfo(`Scoperta: ${s.nome}`, `<div class="info-fatti">
          ${fatto('Beneficio', s.beneficio)}
          ${fatto('Livello minimo', s.livello ? s.livello + '°' : '')}
          ${fatto('Scoperte richieste', s.richieste.join(', '))}
          ${fatto('Razza', s.razza)}${fatto('Altri prerequisiti', s.altro)}
          ${fatto('Modifica della bomba', s.asterisco ? 'Sì (*): non si cumula con altre scoperte con asterisco' : '')}
          ${fatto('Fonte', s.fonte)}${fatto('Nome inglese', s.inglese)}
        </div>`, s.inglese ? '' : 'Alchimista/Scoperte', (doc) => {
        const corpo = doc.querySelector('#mw-content-text');
        if (!corpo) return '';
        const el2 = [...corpo.querySelectorAll('h2, h3, p, li, dd, dt')].filter((x) => !x.closest('#toc, .toc, table'));
        const pulito = (x) => x.textContent.replace(/\[modifica[^\]]*\]/gi, '').replace(/\s+/g, ' ').trim();
        const i = el2.findIndex((x) => x.tagName === 'H2' && norm(pulito(x)) === norm(s.sezione));
        if (i < 0) return '';
        const fine = el2.findIndex((x, k) => k > i && x.tagName === 'H2');
        return el2.slice(i + 1, fine > i ? fine : undefined).map(pulito).filter(Boolean).join('\n\n');
      }, s.link || 'pf1');
    },
    'pf1-info-benedizione'(el) {
      const b = FEDE.benedizioni[el.dataset.nome];
      if (!b) return;
      apriInfo(`Benedizione: ${el.dataset.nome}`, `<div class="info-fatti">${fatto('Potere minore (1°)', b.minore)}${fatto('Potere maggiore (10°)', b.maggiore)}</div>`,
        'Sacerdote_Guerriero/Benedizioni', (doc) => {
          const righe = blocchiTesto(doc);
          const i = righe.findIndex((r) => /^Benedizione/.test(r) && norm(r).endsWith(norm(el.dataset.nome)));
          if (i < 0) return '';
          const fine = righe.findIndex((r, k) => k > i && /^Benedizione /.test(r) && r.length < 45);
          return righe.slice(i + 1, fine > i ? fine : i + 5).join('\n\n');
        });
    },
    'pf1-info-mistero'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      const mis = FEDE.misteri[d.oracolo.mistero];
      if (!mis) return;
      const scelte = d.oracolo.rivelazioni || [];
      apriInfo(`Mistero: ${mis.nome}`, `<div class="info-fatti">
          ${fatto('Abilità di classe', mis.abil.join(', '))}
          ${fatto('Incantesimi bonus', mis.incantesimi.map((s) => `${s.nome || '?'} (${s.livello}°)`).join(', '))}
          ${fatto('Rivelazioni scelte', scelte.join(', '))}
        </div>`, mis.pagina, (doc) => {
          const righe = blocchiTesto(doc);
          // Testo delle rivelazioni scelte; se nessuna è scelta, l'inizio della pagina
          const mie = righe.filter((r) => scelte.some((s) => r.startsWith(s + ' (')));
          return (mie.length ? mie : righe.filter((r) => r.length > 80).slice(0, 3)).join('\n\n');
        });
    },
    'pf1-info-maledizione'(el) {
      const nome = el.dataset.nome;
      apriInfo(`Maledizione: ${nome}`, '', 'Oracolo', (doc) => blocchiTesto(doc).filter((r) => norm(r).startsWith(norm(nome)) && /:/.test(r.slice(0, nome.length + 3))).slice(0, 1).join('\n\n'));
    },
    'pf1-info-divinita'(el) {
      const dio = FEDE.divinita[el.dataset.nome];
      if (!dio) return;
      apriInfo(dio.nome, `<div class="info-fatti">
          ${fatto('Rango', dio.rango)}${fatto('Titoli', dio.titoli)}${fatto('Allineamento', dio.allineamento)}
          ${fatto('Sfere di influenza', dio.sfere)}${fatto('Adoratori', dio.adoratori)}${fatto('Allineamenti dei chierici', dio.chierici.join(', '))}
          ${fatto('Domini', dio.domini.join(', '))}${fatto('Sottodomini', dio.sottodomini.join(', '))}
          ${fatto('Arma preferita', dio.arma)}${fatto('Simbolo', dio.simbolo)}${fatto('Animale sacro', dio.animale)}
          ${fatto('Colori sacri', dio.colori)}${fatto('Dimora', dio.dimora)}
        </div>`, dio.pagina, estraiDivinita);
    },
    'pf1-info-dominio'(el) {
      const dom = FEDE.domini[el.dataset.nome];
      if (!dom) return;
      const sub = dom.sottodomini[el.dataset.sotto];
      const poteri = dom.poteri.map((pt) => sub?.poteri.find((x) => x.sostituisce === pt.nome) || pt);
      const inc = dom.incantesimi.map((s, i) => sub?.incantesimi[i + 1] || s);
      apriInfo(`Dominio: ${dom.nome}${sub ? ' · ' + sub.nome : ''}`, `<div class="info-fatti">
          ${fatto('Poteri', poteri.map((pt) => `${pt.nome} (${pt.tipo}${pt.livello > 1 ? ', dal ' + pt.livello + '°' : ''})`).join(' · '))}
          ${fatto('Incantesimi', inc.map((s, i) => `${i + 1}° ${s}`).join(' · '))}
        </div>`, dom.pagina, estraiDominio(sub?.nome));
    },
    'pf1-arma-divinita'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const dio = divinitaDi(dati(p));
      if (!dio?.arma) return;
      // "Mazza Leggera o Mazza Pesante", "Falchion (Kukri)": si prende la prima
      const nome = dio.arma.split(/\s+o\s+|\s*\(/)[0].trim();
      // Valori dalla tabella delle armi del wiki, se c'è; altrimenti dalla tabella delle armi preferite
      const w = EQUIP.armi.find((x) => norm(x[0]) === norm(nome));
      const s = w ? null : FEDE.armi[nome];
      const { gittata, ...daWiki } = w ? daTabellaArma(w, dati(p).taglia) : { gittata: '' };
      dati(p).armi.push({ ...NUOVI.armi(), nome, ...daWiki, ...(s ? { danni: s[0], critico: s[1], tipo: s[2], carDanni: s[3] } : {}) });
      ctx.salva();
      ctx.render();
      ctx.toast(`⚔ <b>${esc(nome)}</b> aggiunta agli attacchi${s || w ? '' : ' (inserisci danni e critico)'}`);
    },
    'pf1-aggiungi-speciale'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const inc = dati(p).incantatori.find((x) => x.id === el.dataset.inc);
      if (!inc) return;
      // Fattucchiere: gli incantesimi del patrono vanno nel famiglio (si preparano poi da lì)
      if (libroDi(inc)) {
        scriviNelLibro(inc, el.dataset.nome, Number(el.dataset.livello));
        ctx.salva(); ctx.render();
        ctx.toast(`📖 <b>${esc(el.dataset.nome)}</b> aggiunto al ${esc(libroDi(inc)[0].toLowerCase())} (${esc(el.dataset.nota)})`);
        return;
      }
      aggiungiIncantesimo(p, inc, el.dataset.nome, Number(el.dataset.livello));
      inc.incantesimi[inc.incantesimi.length - 1].note = el.dataset.nota;
      ctx.salva();
      ctx.render();
      ctx.toast(`✨ <b>${esc(el.dataset.nome)}</b> aggiunto (${esc(el.dataset.nota)}, ${el.dataset.livello}° livello)`);
    },
    'pf1-patrono-tutti'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const inc = d.incantatori.find((x) => x.id === el.dataset.inc);
      const voci = (window.PF1_PATRONI || {})[inc?.patrono] || [];
      const liv = livelloClasse(d, 'Fattucchiere');
      const libro = libroDi(inc);
      const noti = new Set((libro ? inc.libro || [] : inc.incantesimi || []).map((s) => norm(s.nome)));
      let aggiunti = 0;
      for (const [N, nomi] of voci) {
        if (N > liv || nomi.includes('/')) continue; // quelli "a scelta" li sceglie il giocatore
        const nome = incantesimoDi(nomi)?.nome || nomi;
        if (noti.has(norm(nome))) continue;
        if (libro) scriviNelLibro(inc, nome, Math.ceil(N / 2));
        else { aggiungiIncantesimo(p, inc, nome, Math.ceil(N / 2)); inc.incantesimi[inc.incantesimi.length - 1].note = 'patrono'; }
        aggiunti++;
      }
      ctx.salva();
      ctx.render();
      ctx.toast(aggiunti ? `✨ Aggiunti ${aggiunti} incantesimi del patrono` : 'Nessun nuovo incantesimo del patrono da aggiungere');
    },
    'pf1-livello-apri'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      if (GIOCATORE) {
        const manca = mancaPerSalire(p, d, calcola(p, ctx.regDi(p)));
        if (manca.length) { ctx.toast(`Completa prima il livello attuale: ${esc(manca.join('; '))}`, 'errore'); return; }
      }
      apriSalita(p, d.classi[0]?.id || 'Guerriero');
      ctx.render();
      document.querySelector('.salita')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    'pf1-livello-chiudi'() { salita = null; ctx.render(); },
    // Tipo di Artigianato o Professione (es. Artigianato (Alchimia)): una nuova abilità con i suoi gradi
    'pf1-sottoabil'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p) return;
      const d = dati(p);
      const padre = el.dataset.padre;
      const campo = document.getElementById(`sottoabil-${norm(padre)}-${p.id}`);
      let tipo = (campo?.value || '').trim().replace(/[()|#]/g, '');
      if (!tipo) { ctx.toast(`Scrivi o scegli il tipo di ${padre.toLowerCase()}`, 'errore'); return; }
      tipo = ABIL_SPECIALIZZATE[padre].find((t) => norm(t) === norm(tipo)) || tipo.charAt(0).toUpperCase() + tipo.slice(1);
      d.sottoAbil = d.sottoAbil || {};
      const lista = d.sottoAbil[padre] = d.sottoAbil[padre] || [];
      if (lista.some((t) => norm(t) === norm(tipo))) { ctx.toast(`${esc(padre)} (${esc(tipo)}) c'è già`); return; }
      lista.push(tipo);
      lista.sort((a, b) => a.localeCompare(b, 'it'));
      ctx.salva();
      ctx.render();
      ctx.toast(`🛠 Aggiunta <b>${esc(padre)} (${esc(tipo)})</b>: assegna i suoi gradi`);
    },
    'pf1-sottoabil-togli'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p) return;
      const d = dati(p);
      const { padre, tipo } = el.dataset;
      const chiave = `${padre} (${tipo})`;
      const gradi = n(d.abil[chiave]?.gradi);
      if (gradi && !confirm(`Togliere ${chiave}? I suoi ${gradi} gradi tornano disponibili.`)) return;
      d.sottoAbil[padre] = (d.sottoAbil[padre] || []).filter((t) => t !== tipo);
      delete d.abil[chiave];
      ctx.salva();
      ctx.render();
    },
    async 'pf1-apri-grimorio'(el) {
      try { await ctx.apriLibro(el.dataset.id, el.dataset.inc); } catch (e) { ctx.toast(`Libro non aperto: ${esc(e.message)}`, 'errore'); }
    },
    // ---- Breviario: navigazione (nella sua finestra) e memorizzazione (eseguita dalla finestra principale) ----
    'brev-livello'(el) { breviario.livello = Number(el.dataset.l); breviario.incantesimo = null; ctx.render(); },
    'brev-inc'(el) { breviario.incantesimo = el.dataset.nome || null; ctx.render(); },
    async 'pf1-apri-breviario'(el) {
      try { await ctx.apriLibro(el.dataset.id, el.dataset.inc, 'breviario'); } catch (e) { ctx.toast(`Breviario non aperto: ${esc(e.message)}`, 'errore'); }
    },
    'brev-prepara'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const inc = p && dati(p).incantatori.find((x) => x.id === el.dataset.inc);
      if (!inc) return;
      const L = Number(el.dataset.livello);
      const dominio = el.dataset.dominio === '1';
      inc.incantesimi = inc.incantesimi || [];
      const gia = inc.incantesimi.find((s) => norm(s.nome) === norm(el.dataset.nome) && n(s.livello) === L && (s.note === 'dominio') === dominio);
      if (gia) gia.preparati = n(gia.preparati) + 1;
      else inc.incantesimi.push({ id: uid(), nome: el.dataset.nome, livello: L, preparati: 1, lanciati: 0, note: dominio ? 'dominio' : '' });
      ctx.salva();
      ctx.render();
      ctx.toast(`✠ <b>${esc(el.dataset.nome)}</b> preparato${dominio ? ' nello slot di dominio' : ''}`);
    },
    'brev-togli'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const inc = p && dati(p).incantatori.find((x) => x.id === el.dataset.inc);
      const s = inc?.incantesimi?.find((x) => x.id === el.dataset.sp);
      if (!s) return;
      s.preparati = n(s.preparati) - 1;
      if (n(s.lanciati) > s.preparati) s.lanciati = s.preparati;
      if (s.preparati <= 0) inc.incantesimi = inc.incantesimi.filter((x) => x !== s);
      ctx.salva();
      ctx.render();
    },
    'brev-lancia'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const inc = p && dati(p).incantatori.find((x) => x.id === el.dataset.inc);
      const s = inc?.incantesimi?.find((x) => x.id === el.dataset.sp);
      if (!s) return;
      azioni['pf1-lancia']({ dataset: { id: p.id, inc: inc.id, incSp: s.id } });
    },
    'brev-ripristina'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const inc = p && dati(p).incantatori.find((x) => x.id === el.dataset.inc);
      const s = inc?.incantesimi?.find((x) => x.id === el.dataset.sp);
      if (!s || !n(s.lanciati)) return;
      s.lanciati = n(s.lanciati) - 1;
      ctx.salva();
      ctx.render();
    },
    'grim-livello'(el) { grimorio.livello = el.dataset.l === 'M' ? 'M' : Number(el.dataset.l); grimorio.incantesimo = null; ctx.render(); },
    'grim-inc'(el) { grimorio.incantesimo = grimorio.incantesimo === el.dataset.nome ? null : el.dataset.nome; ctx.render(); },
    'pf1-av-partenza'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p) return;
      apriSalita(p, '');
      salita = null;
      ctx.salva();
      ctx.render();
      ctx.toast('📌 Stato attuale registrato come punto di partenza dell\'avanzamento');
    },
    // +1 a una caratteristica non preso al 4°, 8°, 12°… (livello aggiunto senza la procedura guidata)
    'pf1-aumento-mancante'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p) return;
      const d = dati(p);
      const car = document.getElementById(`av-car-${el.dataset.liv}-${p.id}`)?.value;
      if (!car) { ctx.toast('Scegli la caratteristica da aumentare', 'errore'); return; }
      p.caratteristiche = p.caratteristiche || {};
      const k = ctx.regDi(p).caratteristiche.find((x) => x.sigla === car);
      const base = p.caratteristiche[car];
      p.caratteristiche[car] = (base === '' || base == null ? n(k?.predefinito ?? 10) : n(base)) + 1;
      const liv = Number(el.dataset.liv);
      const voce = d.avanzamento.find((r) => r.tipo === 'livello' && r.livTot === liv);
      if (voce) voce.car = car; else d.avanzamento.push({ id: uid(), tipo: 'aumento', livTot: liv, car, quando: Date.now() });
      d.avanzamento.sort((a, b) => (a.tipo === 'partenza' ? -1 : b.tipo === 'partenza' ? 1 : a.livTot - b.livTot));
      ctx.salva();
      ctx.render();
      ctx.toast(`+1 a <b>${esc(NOMI_CAR[car])}</b> per il ${liv}° livello`);
    },
    'pf1-prestigio-vedi'(el) {
      const d = dati(ctx.personaggio(el.dataset.id));
      d.prestigio.vista = d.prestigio.vista === el.dataset.nome ? '' : el.dataset.nome;
      ctx.salva();
      ctx.render();
      if (d.prestigio.vista) document.querySelector('.pres-scheda')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    // Apre l'avanzamento guidato con la classe di prestigio già scelta
    'pf1-prestigio-prendi'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const nome = el.dataset.nome;
      const esistente = d.classi.find((x) => nomeClasse(x.nome) === nome);
      if (!esistente) {
        const req = requisitiPrestigio(nome, p, d, calcola(p, ctx.regDi(p)));
        const daVerificare = req.filter((r) => r.esito === null).map((r) => `• ${r.etichetta}: ${r.testo}`);
        if (daVerificare.length && !confirm(`Prima di prendere ${nome}, verifica con il master questi requisiti:\n\n${daVerificare.join('\n')}\n\nLi soddisfi?`)) return;
      }
      apriSalita(p, esistente ? esistente.id : nome);
      ctx.render();
      document.querySelector('.salita')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    'pf1-prestigio-info'(el) {
      const nome = el.dataset.nome;
      const x = PRESTIGIO[nome];
      if (!x) return;
      apriInfo(`Classe di prestigio: ${nome}`, `<div class="info-fatti">
          ${fatto('Dado vita', x.dv ? 'd' + x.dv : '')}${fatto('Bonus di attacco base', BAB_TESTO[x.bab] || x.bab)}
          ${fatto('TS buoni', x.ts.split('').map((s) => TS_NOMI[s]).join(', '))}${fatto('Gradi per livello', x.gradi ? `${x.gradi} + INT` : '')}
          ${fatto('Fonte', x.fonte)}${x.nota ? fatto('Differenza', x.nota) : ''}
        </div>`, x.pagina || nome.replace(/ /g, '_'), (doc) => {
        // Introduzione e privilegi di classe (titolo + testo), senza tabelle
        const righe = blocchiTesto(doc);
        const i = righe.findIndex((r) => /^Privilegi di Classe/i.test(r));
        const intro = righe.slice(0, i > 0 ? i : 6).filter((r) => r.length > 60 && !/^(Ruolo|Allineamento|Dado Vita|Per aspirare)/i.test(r)).slice(0, 2);
        const privilegi = i > 0 ? righe.slice(i + 1).filter((r) => !/^Competenza nelle Armi/i.test(r)) : [];
        return [...intro, ...privilegi].join('\n\n');
      });
    },
    'pf1-livello-conferma'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p || !salita) return;
      const d = dati(p);
      const c = calcola(p, ctx.regDi(p));
      const a = anteprimaSalita(p, d, c);
      if (a.livTot > 20) return;
      if (a.caratteristica && !salita.car) { ctx.toast('Scegli prima la caratteristica da aumentare', 'errore'); return; }
      // Livello di classe (o nuova classe con progressione e abilità di classe)
      let cl = a.esistente;
      if (cl) cl.livello = n(cl.livello) + 1;
      else { cl = nuovaClasse(a.k || salita.classe, 1); d.classi.push(cl); }
      // Classe preferita e caratteristica
      if (salita.preferita === 'pf') d.pfCalc.preferita = n(d.pfCalc.preferita) + 1;
      if (salita.preferita === 'gradi') d.gradiExtra = n(d.gradiExtra) + 1;
      // Bonus di classe preferita alternativo della razza: un livello in più su quell'opzione
      const alt = String(salita.preferita || '').match(/^alt:(\d+)$/);
      if (alt && a.k && opzioniPreferite(d, a.k)[Number(alt[1])]) {
        d.preferitaAlt = d.preferitaAlt || {};
        const kk = chiavePref(a.k, Number(alt[1]));
        d.preferitaAlt[kk] = n(d.preferitaAlt[kk]) + 1;
      }
      if (a.caratteristica) {
        p.caratteristiche = p.caratteristiche || {};
        const k = ctx.regDi(p).caratteristiche.find((x) => x.sigla === salita.car);
        const base = p.caratteristiche[salita.car];
        p.caratteristiche[salita.car] = (base === '' || base == null ? n(k?.predefinito ?? 10) : n(base)) + 1;
      }
      // Nuova classe da incantatore: la sua voce negli incantesimi, con la tabella del wiki
      const k = nomeClasse(cl.nome);
      if (k && CLASSI[k]?.inc && !d.incantatori.some((x) => nomeClasse(x.classe) === k)) {
        const [car, tipo] = CLASSI[k].inc;
        d.incantatori.push({ id: uid(), classe: k, car, tipo, livello: 1, auto: !!TABELLE.classi[k], slot: { 0: { base: '' }, 1: { base: '' } }, incantesimi: [] });
      }
      // PF: se calcolati a mano, si aggiunge il guadagno ai PF massimi
      if (!d.pfCalc.auto && d.pf.max !== '') d.pf.max = n(d.pf.max) + a.pf;
      // Registro dell'avanzamento: tutte le scelte di questo livello (talenti e gradi si leggono poi dalle istantanee)
      d.avanzamento.push({
        id: uid(), tipo: 'livello', livTot: a.livTot, classe: k || cl.nome, livClasse: cl.livello, quando: Date.now(),
        pf: a.pf, dv: CLASSI[k]?.dv || n(cl.dv) || 8, metodoPf: d.pfCalc.metodo, cos: c.m.COS, preferita: salita.preferita || '',
        car: a.caratteristica ? salita.car : '', gradiDisponibili: a.gradi, talentiPrevisti: (a.talento ? 1 : 0) + a.talentiBonus,
        privilegi: a.privilegi.filter((x) => !x.sostituito).map((x) => x.nome), incantesimi: a.incantesimi,
        prima: salita.istantanea || istantanea(d),
      });
      p.campi = p.campi || {};
      p.campi.Livello = String(c.liv + 1);
      const promemoria = [`${a.gradi} gradi di abilità`, a.talento ? '1 talento' : '', a.talentiBonus ? `${a.talentiBonus} talento bonus` : '', a.incantesimi.length ? 'nuovi incantesimi' : ''].filter(Boolean).join(', ');
      salita = null;
      ctx.salva();
      ctx.render();
      ctx.toast(`⬆ <b>${esc(p.nome)}</b> è ora di ${c.liv + 1}° livello (${esc(k || cl.nome)} ${cl.livello}°). Da scegliere: ${esc(promemoria)}`);
    },
    'pf1-aggiungi-compagno'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const tipo = el.dataset.tipo;
      dati(p).compagni.push({ id: uid(), tipo, nome: '', specie: '', forma: tipo === 'eidolon' ? Object.keys(COMP.forme)[0] || '' : '', livello: '', carExtra: {}, carBase: {}, pfAttuali: '', note: '' });
      ctx.salva();
      ctx.render();
    },
    'pf1-oggetto-wiki'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const campo = document.getElementById(`scelta-oggetto-${el.dataset.id}`);
      const o = oggettoDi(campo?.value || '');
      if (!p || !o) { ctx.toast('Scrivi o scegli un oggetto magico dall\'elenco', 'errore'); return; }
      const d = dati(p);
      const [nome, , slot, prezzo, peso] = o;
      const voce = { ...NUOVI.oggetti(), nome, peso: numeroDa(peso), note: [slot && slot !== 'Nessuno' ? `slot ${slot}` : '', prezzo].filter(Boolean).join(' · ') };
      const eff = effettiOggetto(nome);
      if (eff) {
        const b = { id: uid(), nome, attivo: true, effetti: eff.effetti.map((e) => ({ id: uid(), ...e })) };
        d.bonus.push(b);
        voce.bonusId = b.id;
        voce.dove = 'indossato'; // un oggetto magico con bonus si considera indossato
      }
      d.oggetti.push(voce);
      ctx.salva();
      ctx.render();
      ctx.toast(`✨ <b>${esc(nome)}</b> aggiunto${eff ? ` · bonus attivo: ${esc(riassuntoBonus({ effetti: eff.effetti }))}${eff.nota ? ` (${esc(eff.nota)})` : ''}` : ''}`);
    },
    'pf1-merce'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const x = merceDi(document.getElementById(`scelta-merce-${el.dataset.id}`)?.value);
      if (!p || !x) { ctx.toast("Scrivi o scegli un oggetto dall'elenco dell'equipaggiamento", 'errore'); return; }
      const [gruppo, nome, costo, peso, dettagli, valore] = x;
      // Animali, trasporti e alloggi non si portano addosso: «A casa», così il loro peso non conta
      const fuori = /^(Animali|Trasporti|Alloggi)/.test(gruppo);
      dati(p).oggetti.push({ ...NUOVI.oggetti(), nome, peso: peso === '' ? '' : peso, valore, dove: fuori ? 'casa' : 'zaino',
        note: [valore === '' && costo ? `costo ${costo}` : '', dettagli].filter(Boolean).join(' · ') });
      ctx.salva();
      ctx.render();
      ctx.toast(`🎒 <b>${esc(nome)}</b> aggiunto agli oggetti${costo ? ` (${esc(costo)})` : ''}`);
    },
    'pf1-info-merce'(el) {
      const x = merceDi(document.getElementById(el.dataset.campo)?.value);
      if (!x) { ctx.toast("Scrivi o scegli un oggetto dall'elenco dell'equipaggiamento", 'errore'); return; }
      apriInfo(x[1], `<div class="info-fatti">${fatto('Gruppo', x[0])}${fatto('Costo', x[2])}${fatto('Peso', x[3] !== '' ? `${String(x[3]).replace('.', ',')} kg` : '')}${fatto('Regole', x[4])}${fatto('Manuale', x[6] || 'Manuale di Gioco')}</div>`,
        x[7], estraiMerce(x[1]));
    },
    'pf1-info-oggetto'(el) {
      const nome = el.dataset.nome || document.getElementById(el.dataset.campo)?.value || '';
      const o = oggettoDi(nome);
      if (!o) { ctx.toast('Scrivi o scegli un oggetto magico dall\'elenco', 'errore'); return; }
      const eff = effettiOggetto(o[0]);
      apriInfo(o[0], `<div class="info-fatti">${fatto('Tipo', o[1])}${fatto('Slot', o[2])}${fatto('Prezzo', o[3])}${fatto('Peso', o[4] !== '—' ? o[4] : '')}${fatto('Manuale', o[5])}${fatto('Bonus nella scheda', eff ? riassuntoBonus({ effetti: eff.effetti }) : '')}</div>`,
        paginaWiki(o[6] || o[0]), estraiIncantesimo);
    },
    'pf1-equip-wiki'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const lista = el.dataset.lista;
      const nome = document.getElementById(`scelta-${lista}-${el.dataset.id}`)?.value;
      const v = EQUIP[lista].find((x) => x[0] === nome);
      if (!p || !v) { ctx.toast('Scegli prima un oggetto dalla tendina', 'errore'); return; }
      const d = dati(p);
      const { gittata, ...valori } = lista === 'armi' ? daTabellaArma(v, d.taglia) : { ...daTabellaArmatura(v), gittata: '' };
      d[lista].push({ ...NUOVI[lista](), ...valori });
      ctx.salva();
      ctx.render();
      ctx.toast(`${lista === 'armi' ? '⚔' : '🛡'} <b>${esc(nome)}</b> aggiunt${lista === 'armi' ? 'a agli attacchi' : 'a all\'equipaggiamento'}${gittata ? ` · gittata ${esc(gittata)}` : ''}${v[1] === 'Attacchi Naturali' ? (v[2] === 'Secondario' ? ' · attacco naturale secondario: −5 per colpire e ½ FOR ai danni' : ' · attacco naturale primario') + ' (con un solo attacco naturale: FOR × 1,5, da scegliere a mano)' : ''}`);
    },
    'pf1-info-equip'(el) {
      const lista = el.dataset.lista;
      const nome = document.getElementById(`scelta-${lista}-${el.dataset.id}`)?.value;
      const v = EQUIP[lista].find((x) => x[0] === nome);
      if (!v) { ctx.toast('Scegli prima un oggetto dalla tendina', 'errore'); return; }
      const fatti = lista === 'armi'
        ? [['Categoria', `${v[1]} · ${v[2]}`], ['Costo', v[3]], ['Danni (P / M)', `${v[4]} / ${v[5]}`], ['Critico', v[6]], ['Gittata', v[7]], ['Peso', v[8]], ['Tipo', v[9]], ['Speciale', v[10]]]
        : [['Gruppo', v[1]], ['Costo', v[2]], ['Bonus', v[3]], ['Bonus DES max', v[4]], ['Penalità alla prova', v[5]], ['Fallimento incantesimi', v[6]], ['Velocità (9 m / 6 m)', `${v[7]} / ${v[8]}`], ['Peso', v[9]]];
      // Attacchi naturali: danni per tutte le taglie e la pagina delle regole
      if (v[1] === 'Attacchi Naturali') {
        const perTaglia = TAGLIE_NATURALI.map((t, i) => (v[11][i] ? `${t} ${v[11][i]}` : '')).filter(Boolean).join(' · ');
        apriInfo(nome, `<div class="info-fatti">${fatto('Tipo di attacco', v[2] === 'Secondario' ? 'Secondario: BAB −5, metà FOR ai danni' : 'Primario: BAB pieno, FOR piena ai danni')}${fatto('Danni per taglia', perTaglia)}${fatto('Tipo di danno', v[9])}${fatto('Un solo attacco naturale', 'BAB pieno e FOR × 1,5 ai danni')}</div>`,
          'Attacchi_Naturali', estraiIncantesimo);
        return;
      }
      apriInfo(nome, `<div class="info-fatti">${fatti.map(([k, x]) => fatto(k, x && x !== '—' ? x : '')).join('')}</div>`,
        paginaWiki(`${lista === 'armi' ? 'Armi' : 'Armature'}/${nome}`), estraiIncantesimo);
    },
    'pf1-archetipo'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const cl = dati(p).classi.find((x) => x.id === el.dataset.classe);
      if (!cl) return;
      const lista = cl.archetipi = cl.archetipi || [];
      const i = lista.indexOf(el.dataset.nome);
      if (i >= 0) lista.splice(i, 1);
      else {
        const nuovo = archetipoDi(cl, el.dataset.nome);
        const contro = sceltiClasse(cl).map((s) => [s[0], conflittoArchetipi(nuovo, s)]).find((x) => x[1]);
        if (contro) { ctx.toast(`<b>${esc(el.dataset.nome)}</b> non si combina con ${esc(contro[0])}: entrambi cambiano ${esc(contro[1])}`, 'errore'); ctx.render(); return; }
        lista.push(el.dataset.nome);
      }
      ctx.salva();
      ctx.render();
    },
    'pf1-info-archetipo'(el) {
      const a = (ARCHETIPI[el.dataset.classe] || []).find((x) => x[0] === el.dataset.nome);
      if (!a) return;
      apriInfo(`${a[0]} (${el.dataset.classe})`, `<div class="info-fatti">${a[1].map(([nome, L, sost, tipo]) => fatto(`${L ? L + '° ' : ''}${nome}`, sost ? `${tipo === 'm' ? 'modifica' : 'sostituisce'} ${sost}` : '—')).join('')}</div>`,
        paginaArchetipi(el.dataset.classe, a[0], a[2]), estraiArchetipo(a[0], a[2] ? 'H3' : 'H2'));
    },
    // Maestro del Sapere: prende o toglie un segreto (togliendolo si toglie anche ciò che aveva dato)
    'ms-segreto'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const ms = d.maestro;
      const nome = el.dataset.nome;
      const s = segretoMS(nome);
      if (!s) return;
      const i = ms.segreti.indexOf(nome);
      if (i >= 0) {
        if (!confirm(`Togliere il segreto «${nome}»? La scelta dei segreti normalmente non si cambia.`)) { ctx.render(); return; }
        ms.segreti.splice(i, 1);
        if (s[3] === 'gradi') ms.padronanza = '';
        if (s[3] === 'talento') d.capacita = d.capacita.filter((x) => x.segretoMS !== 'talento');
        if (s[3] === 'robustezza') d.capacita = d.capacita.filter((x) => x.segretoMS !== 'robustezza');
      } else {
        const liv = livMS(d);
        const c = calcola(p, ctx.regDi(p));
        if (s[0] > liv + c.m.INT) { ctx.toast(`«${esc(nome)}» richiede livello + INT almeno ${s[0]}`, 'errore'); ctx.render(); return; }
        if (ms.segreti.length >= segretiDisponibiliMS(liv)) { ctx.toast(`Hai già tutti i segreti del tuo livello (${segretiDisponibiliMS(liv)})`, 'errore'); ctx.render(); return; }
        ms.segreti.push(nome);
        if (s[3] === 'robustezza') d.capacita.push({ id: uid(), nome: 'Robustezza', tipo: 'Talento', descrizione: `Talento bonus (segreto Salute segreta, ${MS})`, segretoMS: 'robustezza' });
      }
      ctx.salva();
      ctx.render();
    },
    'ms-talento'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const input = el.closest('.ms-extra')?.querySelector('[data-ms-talento]');
      const t = TALENTI.talento((input?.value || '').trim());
      if (!t) { ctx.toast('Scrivi il nome di un talento dell\'elenco', 'errore'); return; }
      const s = statoTalento(t, p, d, calcola(p, ctx.regDi(p)));
      if (s.stato === 'no') { ctx.toast(`Non puoi prendere <b>${esc(t.nome)}</b>: manca ${esc(s.req.filter((r) => r.esito === false).map((r) => r.testo).join(', '))}`, 'errore'); return; }
      d.capacita.push({ id: uid(), nome: t.nome, tipo: 'Talento', descrizione: `Talento bonus (segreto Conoscenza pratica, ${MS})`, segretoMS: 'talento' });
      ctx.salva();
      ctx.render();
      ctx.toast(`📚 <b>${esc(t.nome)}</b> aggiunto ai talenti`);
    },
    'ia-annulla'() { incAgg = null; document.getElementById('ia-overlay')?.remove(); },
    'ia-conferma'() {
      if (!incAgg) return;
      const p = ctx.personaggio(incAgg.pg);
      const d = dati(p);
      const inc = d.incantatori.find((x) => x.id === incAgg.inc);
      const ci = calcola(p, ctx.regDi(p)).incantatori.find((x) => x.id === inc?.id);
      if (!inc) return;
      const max = livMaxLancio(ci);
      const tetto = incAgg.modo === 'due' ? max - 1 : max;
      const quanti = incAgg.modo === 'due' ? 2 : 1;
      const codice = listaDi(inc);
      const scelte = [];
      for (const sc of incAgg.scelte.slice(0, quanti)) {
        const L = sc.livello === '' ? NaN : Number(sc.livello);
        const v = incantesimoDi(sc.nome);
        if (Number.isNaN(L) || !sc.nome.trim()) { ctx.toast(`Scegli livello e nome di ${quanti > 1 ? 'entrambi gli incantesimi' : 'un incantesimo'}`, 'errore'); return; }
        if (L > tetto) { ctx.toast(`Livello troppo alto: al massimo ${tetto}°`, 'errore'); return; }
        if (v && codice && v.livelli[codice] !== undefined && v.livelli[codice] !== L) { ctx.toast(`<b>${esc(v.nome)}</b> per ${esc(inc.classe)} è di ${v.livelli[codice]}° livello, non di ${L}°`, 'errore'); return; }
        scelte.push({ nome: v ? v.nome : sc.nome.trim(), livello: L });
      }
      if (quanti === 2 && norm(scelte[0].nome) === norm(scelte[1].nome)) { ctx.toast('Scegli due incantesimi diversi', 'errore'); return; }
      const talento = { id: uid(), nome: NOME_INC_AGGIUNTIVI, tipo: 'Talento', incAggiuntivi: { inc: inc.id, scelte },
        descrizione: `${inc.classe}: ${scelte.map((s) => `${s.nome} (${s.livello}°)`).join(', ')}` };
      d.capacita.push(talento);
      inc.incantesimi = inc.incantesimi || [];
      for (const s of scelte) inc.incantesimi.push({ id: uid(), nome: s.nome, livello: s.livello, preparati: '', lanciati: 0, note: NOME_INC_AGGIUNTIVI, talentoId: talento.id });
      incAgg = null;
      document.getElementById('ia-overlay')?.remove();
      ctx.salva();
      ctx.render();
      ctx.toast(`🎖 <b>${NOME_INC_AGGIUNTIVI}</b>: ${esc(scelte.map((s) => `${s.nome} (${s.livello}°)`).join(', '))} tra gli incantesimi conosciuti di ${esc(inc.classe)}`);
    },
    'pf1-prendi-talento'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const t = TALENTI.talento(el.dataset.nome);
      if (!p || !t) return;
      const d = dati(p);
      const s = statoTalento(t, p, d, calcola(p, ctx.regDi(p)));
      if (s.stato === 'no') { ctx.toast(`Non puoi prendere <b>${esc(t.nome)}</b>: manca ${esc(s.req.filter((r) => r.esito === false).map((r) => r.testo).join(', '))}`, 'errore'); return; }
      // Incantesimi Aggiuntivi: prima si sceglie cosa si aggiunge (classe, livello, incantesimi)
      if (norm(t.nome) === norm(NOME_INC_AGGIUNTIVI)) { apriIncAggiuntivi(p); return; }
      // Abilità Focalizzata: si chiede l'abilità (se non arriva già scelta, es. dai talenti della stirpe)
      if (talentoConScelta(t.nome)) {
        const gia = el.dataset.scelta && scelteTalento(p, t).flatMap(([, l]) => l).find((a) => norm(a) === norm(el.dataset.scelta));
        if (gia) prendiTalentoConScelta(p, t, gia); else apriSceltaTalento(p, t);
        return;
      }
      d.capacita.push({ id: uid(), nome: t.nome, tipo: 'Talento', descrizione: '' });
      ctx.salva();
      ctx.render();
      const scelta = /\((?:arma|abilit|scuola|scelt)/i.test(t.prerequisiti) || /Focalizzat|Specializzazione|Critico Migliorato|Competenza/i.test(t.nome);
      ctx.toast(`🎖 <b>${esc(t.nome)}</b> aggiunto ai talenti${s.stato === 'forse' ? ' · controlla i prerequisiti in giallo' : ''}${scelta ? ' · scrivi la scelta tra parentesi, es. (spada lunga)' : ''}${/^doppio percorso/.test(norm(t.nome)) ? ' · scegli il secondo percorso nella sezione Mitico' : ''}`);
    },
    'pf1-scelta-talento-ok'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const t = TALENTI.talento(el.dataset.nome);
      const abil = document.getElementById('st-abilita')?.value;
      if (!p || !t) return;
      if (!abil) { ctx.toast('Scegli prima l\'abilità', 'errore'); return; }
      if (prendiTalentoConScelta(p, t, abil)) document.getElementById('st-overlay')?.remove();
    },
    'pf1-scelta-talento-annulla'() { document.getElementById('st-overlay')?.remove(); },
    'pf1-info-scoperta-arcana'(el) { infoScopertaArcana(el.dataset.nome); },
    'pf1-talento-scelto'(el) {
      const nome = document.getElementById(el.dataset.sel)?.value;
      if (!nome) { ctx.toast('Scegli prima un talento dal menu', 'errore'); return; }
      // Scoperta arcana del mago (sottomenu dei talenti)
      if (nome.startsWith('SA:')) {
        if (el.dataset.soloInfo) infoScopertaArcana(nome.slice(3)); else prendiScopertaArcana(ctx.personaggio(el.dataset.id), nome.slice(3));
        return;
      }
      if (el.dataset.soloInfo) azioni['pf1-info-talento']({ dataset: { nome } });
      else azioni['pf1-prendi-talento']({ dataset: { id: el.dataset.id, nome } });
    },
    'pf1-info-talento'(el) {
      const t = TALENTI.talento(el.dataset.nome);
      if (!t) return;
      apriInfo(t.nome, `<div class="info-fatti">${fatto('Tipo', t.tipi.join(', '))}${fatto('Prerequisiti', t.prerequisiti || 'nessuno')}${fatto('Nome originale', t.en)}${fatto('Manuale', t.manuale)}</div>`,
        paginaWiki(t.pagina), estraiIncantesimo);
    },
    'pf1-aggiungi-inc'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const inc = dati(p).incantatori.find((x) => x.id === el.dataset.inc);
      if (!inc) return;
      const libro = libroDi(inc);
      if (libro) {
        scriviNelLibro(inc, el.dataset.nome, Number(el.dataset.livello));
        ctx.salva();
        ctx.render();
        ctx.toast(`📖 <b>${esc(el.dataset.nome)}</b> scritto nel ${esc(libro[0].toLowerCase())}`);
        return;
      }
      aggiungiIncantesimo(p, inc, el.dataset.nome, Number(el.dataset.livello));
      ctx.salva();
      ctx.render();
      ctx.toast(`✨ <b>${esc(el.dataset.nome)}</b> aggiunto agli incantesimi di ${el.dataset.livello}° livello`);
    },
    'pf1-libro-prepara'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const inc = dati(p).incantatori.find((x) => x.id === el.dataset.inc);
      const s = inc?.libro?.find((x) => x.id === el.dataset.libro);
      if (!s) return;
      const gia = (inc.incantesimi || []).find((x) => norm(x.nome) === norm(s.nome));
      if (gia) gia.preparati = n(gia.preparati) + 1;
      else aggiungiIncantesimo(p, inc, s.nome, n(s.livello));
      ctx.salva();
      ctx.render();
      ctx.toast(`✨ <b>${esc(s.nome)}</b> preparato${gia ? ` (${gia.preparati} copie)` : ''}`);
    },
    'pf1-libro-trucchetti'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const inc = d.incantatori.find((x) => x.id === el.dataset.inc);
      const codice = inc && listaDi(inc);
      if (!codice) return;
      const opposte = (d.mago?.opposte || []).filter(Boolean);
      let quanti = 0;
      for (const v of INCANTESIMI.values()) if (v.livelli[codice] === 0 && !opposte.includes(v.base) && scriviNelLibro(inc, v.nome, 0)) quanti++;
      ctx.salva();
      ctx.render();
      ctx.toast(`📖 ${quanti} trucchetti scritti nel libro`);
    },
    'pf1-info-inc'(el) {
      const v = incantesimoDi(el.dataset.nome);
      if (!v) return;
      apriInfo(v.nome, `<div class="info-fatti">${fatto('Scuola', v.scuola)}${fatto('Livello', livelliTesto(v))}</div>`, paginaWiki(v.pagina), estraiIncantesimo);
    },
    'pf1-prepara-dominio'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const d = dati(p);
      const inc = d.incantatori.find((x) => nomeClasse(x.classe) === el.dataset.classe);
      if (!inc) { ctx.toast(`Aggiungi prima la classe da incantatore (${esc(el.dataset.classe)}) nella sezione Incantesimi`, 'errore'); return; }
      inc.incantesimi = inc.incantesimi || [];
      inc.incantesimi.push({ id: uid(), nome: el.dataset.nome, livello: Number(el.dataset.livello), preparati: inc.tipo === 'preparati' ? 1 : '', lanciati: 0, note: 'dominio' });
      ctx.salva();
      ctx.render();
      ctx.toast(`✨ <b>${esc(el.dataset.nome)}</b> aggiunto agli incantesimi di ${el.dataset.livello}° livello`);
    },
  };

  const moduli = {
    'pf1-capacita'(f) {
      const p = ctx.personaggio(f.get('pg'));
      // Un talento del wiki scritto a mano segue le stesse regole dell'elenco: senza prerequisiti non si prende
      const t = f.get('tipo') === 'Talento' ? TALENTI.talento(f.get('nome')) || TALENTI.talento(f.get('nome').replace(/\s*\([^)]*\)\s*$/, '')) : null;
      if (t) {
        const s = statoTalento(t, p, dati(p), calcola(p, ctx.regDi(p)));
        if (s.stato === 'no') { ctx.toast(`Non puoi prendere <b>${esc(t.nome)}</b>: manca ${esc(s.req.filter((r) => r.esito === false).map((r) => r.testo).join(', '))}`, 'errore'); return; }
        if (norm(t.nome) === norm(NOME_INC_AGGIUNTIVI)) { apriIncAggiuntivi(p); return; }
      }
      dati(p).capacita.push({ id: uid(), nome: f.get('nome').trim(), tipo: f.get('tipo'), descrizione: '' });
      ctx.salva();
      ctx.render();
    },
    'pf1-incantesimo'(f) {
      const p = ctx.personaggio(f.get('pg'));
      const inc = dati(p).incantatori.find((x) => x.id === f.get('inc'));
      // Se il nome è nell'elenco della classe, nome esatto e livello vengono dal wiki
      const v = incantesimoDi(f.get('nome'));
      const L = v?.livelli[listaDi(inc)];
      // Un incantesimo della lista di un livello non ancora accessibile non si aggiunge
      if (L !== undefined) {
        const ci = calcola(p, ctx.regDi(p)).incantatori.find((x) => x.id === inc.id);
        if (!livelliAccessibili(inc, ci).has(L)) {
          ctx.toast(`<b>${esc(v.nome)}</b> è di ${L}° livello per ${esc(inc.classe)}: non ancora accessibile`, 'errore');
          return;
        }
      }
      const nome = v && L !== undefined ? v.nome : f.get('nome').trim();
      // Chi ha un libro prepara solo quello che c'è scritto
      const libro = libroDi(inc);
      if (libro && !nelLibro(inc, nome)) { ctx.toast(`<b>${esc(nome)}</b> non è nel ${esc(libro[0].toLowerCase())}: scrivilo prima lì`, 'errore'); return; }
      aggiungiIncantesimo(p, inc, nome, L !== undefined ? L : Math.min(9, Math.max(0, n(f.get('livello')))));
      ctx.salva();
      ctx.render();
    },
    'pf1-libro'(f) {
      const p = ctx.personaggio(f.get('pg'));
      const inc = dati(p).incantatori.find((x) => x.id === f.get('inc'));
      if (!inc) return;
      const v = incantesimoDi(f.get('nome'));
      const L = v?.livelli[listaDi(inc)];
      if (L !== undefined) {
        const ci = calcola(p, ctx.regDi(p)).incantatori.find((x) => x.id === inc.id);
        if (!livelliAccessibili(inc, ci).has(L)) { ctx.toast(`<b>${esc(v.nome)}</b> è di ${L}° livello per ${esc(inc.classe)}: non ancora accessibile`, 'errore'); return; }
      }
      const nome = v && L !== undefined ? v.nome : f.get('nome').trim();
      if (scriviNelLibro(inc, nome, L !== undefined ? L : Math.min(9, Math.max(0, n(f.get('livello')))))) {
        ctx.salva();
        ctx.render();
      } else ctx.toast(`<b>${esc(nome)}</b> è già nel ${esc(libroDi(inc)[0].toLowerCase())}`);
    },
  };
  function scriviNelLibro(inc, nome, livello) {
    inc.libro = inc.libro || [];
    if (inc.libro.some((s) => norm(s.nome) === norm(nome))) return false;
    inc.libro.push({ id: uid(), nome, livello });
    return true;
  }

  // =====================================================================
  // Tracker di combattimento (per qualsiasi regolamento; con PF1 legge la scheda)
  // =====================================================================
  function incontroDi(c) {
    if (!c.incontro) c.incontro = { round: 0, attivo: null, combattenti: [] };
    c.incontro.sistema = sistemaDi(c);
    return c.incontro;
  }
  function info(cb) {
    if (cb.pgId) {
      const p = ctx.personaggio(cb.pgId);
      if (p) {
        const r = ctx.regDi(p);
        const tipo = p.tipo === 'PG' ? 'PG' : 'PNG';
        // I PNG usano la scheda PF1 solo se è compilata (almeno una classe); altrimenti valori scritti nel tracker
        if (r.scheda === 'pf1' && (tipo === 'PG' || p.pf1?.classi?.length)) {
          const c = calcola(p, r);
          return { nome: p.nome, pg: true, tipo, scheda: 'pf1', p, c, modIniz: c.init, ca: c.ca, pfMax: c.pfMax, pf: c.pfAtt };
        }
        // Starfinder: CAE/CAC, Punti Stamina e Punti Ferita dalla scheda (src/sf.js)
        // D&D 5e: CA, PF (e temporanei), tiri salvezza e armi dalla scheda (src/dnd.js)
        // Pathfinder 2: CA, PF, TS, Percezione per l'iniziativa, colpi e Morente/Ferito dalla scheda (src/pf2.js)
        if (r.scheda === 'pf2' && ctx.pf2 && (tipo === 'PG' || p.pf2?.classe)) {
          const s = ctx.pf2().infoCombattimento(p);
          return { nome: p.nome, pg: true, tipo, scheda: 'pf2', p, s, modIniz: s.modIniz, ca: s.ca, pfMax: s.pfMax, pf: s.pfAtt };
        }
        if (r.scheda === 'dnd' && ctx.dnd && (tipo === 'PG' || p.dnd?.classi?.length)) {
          const s = ctx.dnd().infoCombattimento(p);
          return { nome: p.nome, pg: true, tipo, scheda: 'dnd', p, s, modIniz: s.modIniz, ca: s.ca, pfMax: s.pfMax, pf: s.pfAtt };
        }
        if (r.scheda === 'sf' && ctx.sf && (tipo === 'PG' || p.sf?.classi?.length)) {
          const s = ctx.sf().infoCombattimento(p);
          return { nome: p.nome, pg: true, tipo, scheda: 'sf', p, s, modIniz: s.modIniz, ca: s.cae, cac: s.cac, pfMax: s.pfMax, pf: s.pfAtt, psMax: s.psMax, ps: s.psAtt };
        }
        return { nome: p.nome, pg: true, tipo, scheda: false, p, modIniz: n(cb.modIniz), ca: cb.ca, pfMax: n(cb.pfMax), pf: n(cb.pf) };
      }
    }
    return { nome: cb.nome || '?', pg: false, scheda: false, modIniz: n(cb.modIniz), ca: cb.ca, pfMax: n(cb.pfMax), pf: n(cb.pf) };
  }
  const valIniz = (cb) => (cb.iniz === '' || cb.iniz == null ? -Infinity : n(cb.iniz));
  // A terra: PG e PNG con scheda sono inabili/morenti, gli altri sconfitti
  const statoPf = (i, cb) => (i.pf <= 0 && (i.pfMax > 0 || cb.pf !== '') ? (i.scheda || i.tipo === 'PG' ? (i.pf === 0 ? 'Inabile' : 'Morente') : 'Sconfitto') : '');
  // Salute "a parole" per lo schermo dei giocatori (i PF dei mostri restano segreti)
  function salute(i) {
    if (!(i.pfMax > 0)) return '';
    const r = i.pf / i.pfMax;
    return r >= 1 ? 'Illeso' : r > 0.5 ? 'Ferito' : r > 0.25 ? 'Gravemente ferito' : r > 0 ? 'In fin di vita' : 'A terra';
  }
  // Barra della vita per i giocatori: nessun numero, solo lunghezza e colore
  // (verde oltre metà, gialla fino a un quarto, rossa sotto, nera a 0 o meno)
  function barraVita(i, perc) {
    if (!(i.pfMax > 0)) return '';
    const r = i.pf / i.pfMax;
    const colore = i.pf <= 0 ? 'nera' : r > 0.5 ? 'verde' : r > 0.25 ? 'gialla' : 'rossa';
    // Starfinder: sopra la barra dei PF una barra azzurra dei Punti Stamina (anche lei senza numeri)
    const ps = i.psMax > 0 ? `<div class="sch-vita sch-vita-ps" title="Stamina"><span style="width:${Math.max(0, Math.min(100, (i.ps / i.psMax) * 100))}%"></span></div>` : '';
    return `${ps}<div class="sch-vita sch-vita-${colore}" title="${esc(salute(i))}"><span style="width:${i.pf <= 0 ? 100 : Math.max(3, perc)}%"></span></div>`;
  }
  // ---- Schermo del tracker per i giocatori (seconda finestra, sola lettura) ----
  function immagineCb(cb, i) {
    if (i.p?.immagine && ctx.ritratto) return ctx.ritratto(i.p);
    if (cb.immagine && /^data:image\//.test(cb.immagine)) return `<img src="${cb.immagine}" alt="">`;
    const iniz = String(i.nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');
    return `<span class="ritratto-iniziali">${cb.mostro ? '👹' : esc(iniz)}</span>`;
  }
  // ---- Musica dello scontro (per campagna): file copiati nella cartella dati, link audio diretti, link esterni (YouTube, Spotify…) ----
  const ESTERNI = /youtube\.com|youtu\.be|spotify\.com|soundcloud\.com|deezer\.com|music\.apple\.com|tabletopaudio|bandcamp/i;
  const suono = { audio: null, campagna: null, brano: null };
  const musicaDi = (c) => { c.musica = c.musica || { brani: [], volume: 0.6, ripeti: 'lista' }; return c.musica; };
  function lettore() {
    if (suono.audio) return suono.audio;
    const a = document.createElement('audio');
    a.preload = 'auto';
    a.addEventListener('ended', () => {
      const c = suono.campagna && ctx.campagna(suono.campagna);
      if (!c) return;
      const m = musicaDi(c);
      if (m.ripeti === 'brano') { a.currentTime = 0; a.play().catch(() => {}); return; }
      const suonabili = m.brani.filter((b) => b.tipo !== 'esterno');
      const i = suonabili.findIndex((b) => b.id === suono.brano);
      const prossimo = suonabili[i + 1] || (m.ripeti === 'lista' ? suonabili[0] : null);
      if (prossimo) suona(c, prossimo); else { suono.brano = null; ridisegnaMusica(); }
    });
    a.addEventListener('error', () => { if (suono.brano) ctx.toast('🎵 Impossibile riprodurre il brano: il file non c\'è più o il link non è un file audio', 'errore'); });
    a.addEventListener('play', () => ridisegnaMusica());
    a.addEventListener('pause', () => ridisegnaMusica());
    document.body.appendChild(a);
    suono.audio = a;
    return a;
  }
  function suona(c, b) {
    const a = lettore();
    suono.campagna = c.id;
    suono.brano = b.id;
    // I file copiati nella cartella dati si salvano per nome: l'indirizzo si ricostruisce su ogni PC
    a.src = ctx.urlMusica ? ctx.urlMusica(b) : b.url;
    a.volume = Math.max(0, Math.min(1, Number(musicaDi(c).volume ?? 0.6)));
    a.play().catch(() => ctx.toast('🎵 Il brano non si avvia: controlla il file o il link', 'errore'));
    ridisegnaMusica();
  }
  // Aggiorna solo il riquadro della musica (senza ridisegnare la pagina)
  function ridisegnaMusica() {
    const box = document.getElementById('box-musica');
    const c = box && ctx.campagna(box.dataset.camp);
    if (c) box.outerHTML = sezioneMusica(c, `data-camp="${c.id}"`);
  }
  function sezioneMusica(c, attr) {
    const m = musicaDi(c);
    const a = suono.audio;
    const mia = suono.campagna === c.id && a && suono.brano;
    const inCorso = mia ? m.brani.find((b) => b.id === suono.brano) : null;
    const suonando = mia && !a.paused;
    const brani = m.brani.map((b) => {
      const attuale = inCorso?.id === b.id;
      const icona = b.tipo === 'esterno' ? '↗' : attuale && suonando ? '🔊' : '▶';
      return `<span class="chip brano${attuale ? ' attuale' : ''}${b.temporaneo ? ' muto' : ''}" title="${esc(b.tipo === 'esterno' ? 'Si apre nel browser: ' + b.url : b.tipo === 'link' ? b.url : b.temporaneo ? 'File valido solo fino alla chiusura (anteprima)' : 'File copiato nella cartella dati')}">
        <button class="btn-mini" data-azione="inc-musica-play" ${attr} data-brano="${b.id}" title="${b.tipo === 'esterno' ? 'Apri nel browser' : 'Suona'}">${icona}</button>${esc(b.nome)}
        <button class="chip-x" data-azione="inc-musica-x" ${attr} data-brano="${b.id}" title="Togli dalla lista">×</button></span>`;
    }).join(' ');
    return `<div class="inc-musica" id="box-musica" data-camp="${c.id}">
      <div class="pf-riga"><b>🎵 Musica</b>
        ${inCorso ? `<span class="musica-ora">${suonando ? 'In riproduzione' : 'In pausa'}: <b>${esc(inCorso.nome)}</b></span>` : '<span class="muto">ferma</span>'}
        <button class="btn-piccolo" data-azione="inc-musica-prec" ${attr} title="Brano precedente">⏮</button>
        <button class="btn-piccolo" data-azione="inc-musica-pausa" ${attr} title="${suonando ? 'Pausa' : 'Suona'}">${suonando ? '⏸' : '▶'}</button>
        <button class="btn-piccolo" data-azione="inc-musica-succ" ${attr} title="Brano successivo">⏭</button>
        <button class="btn-piccolo" data-azione="inc-musica-stop" ${attr} title="Ferma">⏹</button>
        <label title="Volume">🔉 <input type="range" min="0" max="1" step="0.05" value="${esc(m.volume ?? 0.6)}" data-musica-volume="${c.id}"></label>
        <label>Ripeti <select data-musica-ripeti="${c.id}">${opz([['lista', 'tutta la lista'], ['brano', 'il brano'], ['no', 'no']], m.ripeti)}</select></label></div>
      <div class="pf-riga">${brani || '<span class="muto">Nessun brano: aggiungi un file audio o un link.</span>'}</div>
      <div class="pf-riga">
        <button class="btn-piccolo" data-azione="inc-musica-file" ${attr}>+ File audio</button>
        <input type="url" class="pf-largo" id="musica-link-${c.id}" placeholder="oppure incolla un link (mp3, YouTube, Spotify…)">
        <button class="btn-piccolo" data-azione="inc-musica-link" ${attr}>+ Link</button>
        <span class="muto pf-mini">I link YouTube e Spotify si aprono nel browser; i file e i link diretti a un file audio suonano qui.</span></div>
    </div>`;
  }

  // ---- Volo nel tracker: chi vola (incantesimo, ali, levitazione) e a che altezza è in ogni round ----
  const MODI_VOLO = { volare: ['🪽', 'Volare'], ali: ['🦅', 'Ali'], levitazione: ['🎈', 'Levitazione'], altro: ['☁️', 'In volo'] };
  const roundCorrente = (inc) => (inc.fase === 'sorpresa' ? 0 : n(inc.round));
  const fmtM = (v) => `${String(Math.round(n(v) * 10) / 10).replace('.', ',')} m`;
  // Altezza a inizio round precedente (per mostrare se sale o scende)
  function variazioneVolo(cb, inc) {
    const v = cb.volo;
    if (!v) return null;
    const r = roundCorrente(inc);
    const prima = Object.keys(v.storia || {}).map(Number).filter((k) => k < r).sort((a, b) => b - a)[0];
    if (prima === undefined) return null;
    const d = n(v.altezza) - n(v.storia[prima]);
    return { d, round: prima };
  }
  function registraAltezza(inc, cb) {
    const v = cb.volo;
    if (!v) return;
    v.altezza = Math.max(0, Math.round(n(v.altezza) * 10) / 10);
    v.storia = v.storia || {};
    v.storia[roundCorrente(inc)] = v.altezza;
    if (!inc.fase) return;
    // Nel registro una sola riga per partecipante e round (l'ultima altezza)
    const testo = `${MODI_VOLO[v.modo]?.[0] || '🪽'} ${nomeCb(cb)} è a ${fmtM(v.altezza)} di altezza`;
    const prefisso = `${nomeCb(cb)} è a `;
    const stessa = (inc.registro || []).find((x) => x.round === roundCorrente(inc) && x.testo.slice(x.testo.indexOf(' ') + 1).startsWith(prefisso));
    if (stessa) stessa.testo = testo;
    else annota(inc, testo);
  }
  function chipVolo(cb, inc, grande = false) {
    const v = cb.volo;
    if (!v) return '';
    const [ic, nome] = MODI_VOLO[v.modo] || MODI_VOLO.altro;
    const varr = variazioneVolo(cb, inc);
    const freccia = varr && varr.d ? ` <small class="volo-delta">${varr.d > 0 ? '▲' : '▼'} ${fmtM(Math.abs(varr.d))}</small>` : '';
    return `<span class="chip chip-volo${grande ? ' grande' : ''}" title="${esc(nome)}: altezza in questo round${varr ? ` (round ${varr.round || 'di sorpresa'}: ${fmtM(v.storia[varr.round])})` : ''}">${ic} ${esc(nome)} · <b>${fmtM(v.altezza)}</b>${freccia}</span>`;
  }
  function voloTracker(cb, inc, attr) {
    const v = cb.volo;
    if (!v) {
      return `<div class="comb-volo"><select class="inc-volo-sel" aria-label="Tipo di volo">${Object.entries(MODI_VOLO).map(([k, [ic, nome]]) => `<option value="${k}">${ic} ${k === 'volare' ? 'Volare (incantesimo)' : k === 'ali' ? 'Vola con le ali' : nome}</option>`).join('')}</select>
        <button class="btn-piccolo" data-azione="inc-volo" ${attr} data-cb="${cb.id}" title="Segna che sta volando: l'altezza appare anche sullo schermo dei giocatori">In volo</button></div>`;
    }
    const varr = variazioneVolo(cb, inc);
    return `<div class="comb-volo in-volo">${chipVolo(cb, inc)}
      <button class="btn-mini" data-azione="inc-altezza" ${attr} data-cb="${cb.id}" data-d="-1.5" title="Scende di 1,5 m">▼</button>
      <label>Altezza <input type="number" step="1.5" min="0" class="mini" value="${esc(v.altezza)}" data-inc="combattenti#${cb.id}|volo|altezza" ${attr} data-tipo="numero"> m</label>
      <button class="btn-mini" data-azione="inc-altezza" ${attr} data-cb="${cb.id}" data-d="1.5" title="Sale di 1,5 m">▲</button>
      ${varr ? `<small class="muto">round ${varr.round || 'sorpresa'}: ${fmtM(v.storia[varr.round])}</small>` : ''}
      ${v.modo === 'levitazione' ? '<small class="muto" title="Levitazione: solo su e giù, fino a 6 m per round con un\'azione di movimento">solo su/giù, 6 m/round</small>' : ''}
      <button class="btn-piccolo" data-azione="inc-atterra" ${attr} data-cb="${cb.id}" title="Torna a terra">Atterra</button></div>`;
  }

  // ---- Schermo dei giocatori: dati già filtrati (nascosti, sconosciuti, niente numeri dei PF) e disegno ----
  // datiSchermo serve sia alla finestra locale (con immagini) sia ai telefoni dei giocatori (sessione dal vivo, senza immagini).
  function datiSchermo(c, { immagini = true } = {}) {
    const inc = incontroDi(c);
    const visibile = (cb) => cb && !cb.nascosto;
    const nomeVisto = (cb, i) => (cb.ignoto ? 'Creatura misteriosa' : i.nome);
    const ordine = ordineTurno(inc).filter(visibile);
    const attivoTutto = inc.combattenti.find((x) => x.id === inc.attivo);
    const attivo = visibile(attivoTutto) ? attivoTutto : null;
    const iA = attivo ? ordine.indexOf(attivo) : -1;
    const prossimo = attivo ? ordine[iA + 1] || ordine[0] : null;
    const carte = inc.combattenti.filter(visibile).map((cb) => {
      const i = info(cb);
      const r = i.pfMax > 0 ? i.pf / i.pfMax : null;
      const vita = i.pfMax > 0 ? {
        perc: i.pf <= 0 ? 100 : Math.max(3, Math.min(100, Math.round(r * 100))), colore: i.pf <= 0 ? 'nera' : r > 0.5 ? 'verde' : r > 0.25 ? 'gialla' : 'rossa',
        titolo: salute(i), ps: i.psMax > 0 ? Math.max(0, Math.min(100, Math.round((i.ps / i.psMax) * 100))) : null,
      } : null;
      const ignoto = !!cb.ignoto;
      return {
        id: cb.id, pgId: cb.pgId || '', iniz: cb.iniz === '' || cb.iniz == null ? '' : String(cb.iniz), nome: nomeVisto(cb, i),
        badge: i.pg ? i.tipo : ignoto ? '?' : cb.mostro ? 'Mostro' : 'PNG', badgePg: i.pg && i.tipo === 'PG',
        img: immagini && !ignoto ? immagineCb(cb, i) : '', iniziali: ignoto ? '❓' : cb.mostro ? '👹' : String(i.nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join(''),
        attivo: cb.id === inc.attivo, aTerra: !!statoPf(i, cb), sorpreso: inc.fase === 'sorpresa' && cb.consapevole === false, impreparato: impreparato(inc, cb),
        condizioni: (cb.condizioni || []).map((x) => ({ nome: String(x.nome), durata: x.durata === '' || x.durata == null ? '' : String(x.durata),
          titolo: inc.sistema === 'pf1' ? EFFETTI_CONDIZIONI[norm(String(x.nome).replace(/\s+\d+$/, ''))] || '' : '' })),
        effetti: (inc.effetti || []).filter((ef) => ef.bersagli.includes(cb.id)).map((ef) => ({ nome: String(ef.nome), rimanenti: ef.rimanenti === '' || ef.rimanenti == null ? '' : String(ef.rimanenti) })),
        voloHtml: immagini && cb.volo ? chipVolo(cb, inc, true) : '', vita,
      };
    });
    const azioni = attivo ? azioniDi(inc).filter(([k]) => inc.fase !== 'sorpresa' || k !== 'movimento')
      .map(([k, nome]) => [inc.fase === 'sorpresa' && k === 'standard' ? 'Standard o movimento' : nome, !!(attivo.azioni || {})[k]]) : [];
    return {
      campagna: String(c.nome || ''), fase: inc.fase || '', round: Number(inc.round) || 0,
      attivo: attivo ? { id: attivo.id, pgId: attivo.pgId || '', nome: nomeVisto(attivo, info(attivo)), img: immagini && !attivo.ignoto ? immagineCb(attivo, info(attivo)) : '',
        iniziali: carte.find((x) => x.id === attivo.id)?.iniziali || '?', azioni } : null,
      prossimo: prossimo && prossimo !== attivo ? nomeVisto(prossimo, info(prossimo)) : '',
      scena: immagini && inc.scena && /^data:image\//.test(inc.scena) ? inc.scena : '',
      messaggio: String(inc.messaggio || ''),
      tiri: inc.tiriPubblici ? (inc.tiriSchermo || []).slice(0, 5) : [],
      carte,
    };
  }
  // Disegno dello schermo. fidato = dati prodotti da questa finestra (immagini e HTML del volo ammessi);
  // dai telefoni dei giocatori arrivano dalla sessione dal vivo e si usano solo come testo.
  let turnoAnnunciato = null;
  function renderSchermo(s, { fidato = true, scena = '', mioPg = '' } = {}) {
    if (!s) return '<div class="schermo"><p class="vuoto">In attesa del master…</p></div>';
    const imgScena = fidato ? s.scena : scena && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(scena) ? scena : '';
    const ritratto = (x) => (fidato && x.img ? x.img : `<span class="ritratto-iniziali">${esc(x.iniziali || '?')}</span>`);
    const carte = (s.carte || []).map((x) => `<div class="sch-carta${x.attivo ? ' attivo' : ''}${x.aTerra ? ' a-terra' : ''}${x.sorpreso ? ' sorpreso' : ''}${mioPg && x.pgId === mioPg ? ' mio' : ''}">
        <div class="sch-iniz">${x.iniz === '' ? '—' : esc(x.iniz)}</div>
        <span class="ritratto sch-img">${ritratto(x)}</span>
        <div class="sch-corpo">
          <div class="sch-nome">${esc(x.nome)} <span class="badge ${x.pgId ? (x.badgePg ? 'badge-pg' : '') : 'badge-mostro'}">${esc(x.badge)}</span>
            ${x.sorpreso ? '<span class="badge badge-sorpreso">sorpreso</span>' : ''}${x.impreparato ? '<span class="badge badge-impreparato">impreparato</span>' : ''}</div>
          ${fidato && x.voloHtml ? `<div class="sch-chips sch-volo">${x.voloHtml}</div>` : ''}
          ${x.condizioni?.length ? `<div class="sch-chips sch-condizioni">${x.condizioni.map((k) => `<span class="chip sch-cond" title="${esc(k.titolo)}">${esc(k.nome)}${k.durata ? ` <b>${esc(k.durata)} r</b>` : ''}</span>`).join('')}</div>` : ''}
          ${x.vita ? `${x.vita.ps != null ? `<div class="sch-vita sch-vita-ps" title="Stamina"><span style="width:${Number(x.vita.ps) || 0}%"></span></div>` : ''}<div class="sch-vita sch-vita-${['verde', 'gialla', 'rossa', 'nera'].includes(x.vita.colore) ? x.vita.colore : 'verde'}" title="${esc(x.vita.titolo)}"><span style="width:${Number(x.vita.perc) || 0}%"></span></div>` : ''}
          ${x.effetti?.length ? `<div class="sch-chips">${x.effetti.map((ef) => `<span class="chip chip-effetto">✨ ${esc(ef.nome)}${ef.rimanenti ? ` <b>${esc(ef.rimanenti)} r</b>` : ''}</span>`).join('')}</div>` : ''}
        </div>
      </div>`).join('');
    const a = s.attivo;
    const tiri = (s.tiri || []).length ? `<aside class="sch-tiri"><h3>🎲 Tiri</h3>${s.tiri.map((t) => `<div class="sch-tiro"><span>${esc(t.etichetta || t.espr)}</span><b>${esc(t.totale)}</b></div>`).join('')}</aside>` : '';
    // Fuori dallo scontro: modalità scena (immagine a tutto schermo) o attesa
    const inScontro = !!s.fase;
    const scenaGrande = !inScontro && imgScena;
    // Annuncio del turno: solo quando cambia (e non alla prima apertura)
    const chiave = inScontro && a ? `${s.round}:${a.id}` : null;
    if (chiave && turnoAnnunciato !== null && chiave !== turnoAnnunciato) {
      const mio = mioPg && a.pgId === mioPg;
      setTimeout(() => annunciaTurno(mio ? 'È il tuo turno!' : `Tocca a ${a.nome}`, mio || !mioPg), 0);
    }
    turnoAnnunciato = chiave ?? turnoAnnunciato ?? '';
    setTimeout(() => document.querySelector('.sch-carta.attivo')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50);
    return `<div class="schermo${scenaGrande ? ' modo-scena' : ''}" style="--sch-scala:${scalaSchermo()}">
      <header class="sch-testa">
        <div class="sch-round">${s.fase === 'sorpresa' ? 'Round di sorpresa' : inScontro ? `Round ${s.round}` : scenaGrande ? esc(s.campagna) : 'In attesa dello scontro'}</div>
        ${inScontro && a ? `<div class="sch-turno"><span class="ritratto sch-img-grande">${ritratto(a)}</span>
          <div><div class="muto">Tocca a</div><div class="sch-turno-nome">${esc(a.nome)}</div>
          ${s.prossimo ? `<div class="muto">poi ${esc(s.prossimo)}</div>` : ''}
          <div class="sch-azioni">${(a.azioni || []).map(([nome, usata]) => `<span class="sch-azione${usata ? ' usata' : ''}">${esc(nome)}</span>`).join('')}</div></div></div>` : ''}
        ${scenaGrande ? '' : `<div class="muto sch-camp">${esc(s.campagna)}</div>`}
        <div class="sch-scala"><button class="btn-mini" data-azione="sch-scala" data-d="-1" title="Testo più piccolo">A−</button><button class="btn-mini" data-azione="sch-scala" data-d="1" title="Testo più grande">A+</button></div>
      </header>
      ${s.messaggio ? `<div class="sch-messaggio">📢 ${esc(s.messaggio)}</div>` : ''}
      ${imgScena ? `<div class="sch-scena${scenaGrande ? ' grande' : ''}"><img src="${imgScena}" alt="Scena"></div>` : ''}
      ${scenaGrande ? '' : `<div class="sch-corpo-lista"><div class="sch-lista">${carte || '<p class="vuoto">Nessuno in combattimento.</p>'}</div>${tiri}</div>`}
    </div>`;
  }
  // Grandezza del testo dello schermo (per la TV): resta in questo dispositivo
  function scalaSchermo() { try { return Math.min(2, Math.max(0.7, Number(localStorage.getItem('schermo-scala')) || 1)); } catch { return 1; } }
  // «Tocca a…» a tutto schermo per qualche secondo, con un breve suono
  function annunciaTurno(testo, suona) {
    document.getElementById('sch-annuncio')?.remove();
    const el = document.createElement('div');
    el.id = 'sch-annuncio';
    el.textContent = testo;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
    if (!suona) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ac = new Ctx();
      [[660, 0], [880, 0.16]].forEach(([f, t]) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ac.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.35);
        o.connect(g).connect(ac.destination);
        o.start(ac.currentTime + t);
        o.stop(ac.currentTime + t + 0.4);
      });
      setTimeout(() => ac.close(), 1000);
    } catch { /* audio non disponibile */ }
  }
  function vistaSchermo(c) {
    if (!c) return '<p class="vuoto">Campagna non trovata.</p>';
    return renderSchermo(datiSchermo(c));
  }
  // Tiri pubblici: se nello scontro di una campagna è attivo «tiri sullo schermo», il tiro appena fatto va sullo schermo
  function tiroSulloSchermo(campagne, tiro) {
    const c = campagne.find((x) => x.incontro?.tiriPubblici && x.incontro.fase);
    if (!c || !tiro) return;
    const inc = c.incontro;
    inc.tiriSchermo = [{ etichetta: String(tiro.etichetta || '').slice(0, 80), espr: String(tiro.espr || ''), totale: String(tiro.totale) }, ...(inc.tiriSchermo || [])].slice(0, 5);
  }
  // ---- Mostri del bestiario (dati in src/pf1-mostri.js) ----
  // Più i mostri ufficiali non ancora tradotti su Golarion Insider (src/pf1-mostri-extra.js, da d20pfsrd)
  const MOSTRI = [...(window.PF1_MOSTRI || []), ...(window.PF1_MOSTRI_EXTRA || [])];
  // Bestiario per regolamento: mostri PF1 o alieni di Starfinder (src/sf-alieni.js, stesso schema)
  const bestiario = (sistema) => (sistema === 'sf' ? window.SF_ALIENI || [] : sistema === 'dnd' ? window.DND_MOSTRI || [] : sistema === 'pf2' ? window.PF2_MOSTRI || [] : MOSTRI);
  const mostroDi = (nome, sistema) => bestiario(sistema).find((m) => norm(m[0]) === norm(nome || ''))
    || ((sistema || 'pf1') === 'pf1' ? mostroPersonalizzato(nome) : null) || null;
  const sistemaDi = (c) => ({ pf1: 'pf1', sf: 'sf', dnd: 'dnd', pf2: 'pf2' }[ctx.regDi({ campagnaId: c.id }).scheda] || '');
  // Bonus attivabili di un personaggio con scheda (PF1 o Starfinder): servono a condizioni ed effetti dello scontro
  function bonusDi(p) {
    const sc = ctx.regDi(p).scheda;
    if (sc === 'pf1') return dati(p).bonus;
    if (sc === 'sf' && ctx.sf) return ctx.sf().bonusDi(p);
    return null;
  }
  function togliBonus(p, id) {
    const l = p ? bonusDi(p) : null;
    if (!l) return;
    const i = l.findIndex((b) => b.id === id);
    if (i >= 0) l.splice(i, 1);
  }
  const CONDIZIONI_DND = ['Accecato', 'Afferrato', 'Affascinato', 'Assordato', 'Avvelenato', 'Incapacitato', 'Invisibile', 'Paralizzato', 'Pietrificato', 'Privo di sensi', 'Prono', 'Spaventato', 'Stordito', 'Trattenuto', 'Indebolimento'];
  // D&D nel tracker: CA, PF temporanei, i sei tiri salvezza, armi (Maiusc/Ctrl per vantaggio/svantaggio) e tiri contro la morte
  const CONDIZIONI_PF2 = ['Abbagliato', 'Accecato', 'Accelerato', 'Affascinato', 'Affaticato', 'Afferrato', 'Assordato', 'Condannato 1', 'Confuso', 'Controllato', 'Danno Persistente', 'Immobilizzato', 'Impreparato', 'In Fuga', 'Indebolito 1', 'Inosservato', 'Invisibile', 'Maldestro 1', 'Nascosto', 'Nauseato 1', 'Non Individuato', 'Occultato', 'Paralizzato', 'Pietrificato', 'Privo di Sensi', 'Prono', 'Rallentato 1', 'Risucchiato 1', 'Sbigottito 1', 'Spaventato 1', 'Spaventato 2', 'Stordito 1', 'Trattenuto'];
  // PE dell'incontro in PF2: dipendono dal livello del mostro rispetto al livello del gruppo
  const PE_PF2 = { '-4': 10, '-3': 15, '-2': 20, '-1': 30, 0: 40, 1: 60, 2: 80, 3: 120, 4: 160 };
  function minacciaPf2(inc) {
    const liv = inc.combattenti.filter((cb) => cb.pgId).map((cb) => n(ctx.personaggio(cb.pgId)?.pf2?.livello)).filter(Boolean);
    if (!liv.length) return null;
    const gruppo = Math.round(liv.reduce((a, b) => a + b, 0) / liv.length);
    let pe = 0;
    for (const cb of inc.combattenti) {
      if (!cb.mostro) continue;
      const m = mostroDi(cb.mostro, 'pf2');
      if (!m) continue;
      const diff = n(m[1]) - gruppo;
      pe += diff < -4 ? 0 : diff > 4 ? 160 + (diff - 4) * 40 : PE_PF2[diff];
    }
    // Soglie per 4 personaggi, corrette di 10/15/20/30/40 per ogni personaggio in più o in meno
    const k = liv.length - 4;
    const soglie = [['Banale', 40 + 10 * k], ['Bassa', 60 + 15 * k], ['Moderata', 80 + 20 * k], ['Severa', 120 + 30 * k], ['Estrema', 160 + 40 * k]];
    const minaccia = [...soglie].reverse().find(([, s]) => pe >= s)?.[0] || 'Banale';
    return { pe, gruppo, pg: liv.length, minaccia, soglie };
  }
  // Pathfinder 2 nel tracker: CA, TS, colpi con i tre attacchi del turno, Morente e Ferito, tutti tirabili
  function schedaPf2Combattimento(i) {
    const { p, s } = i;
    const tasto = (tiro, testo, titolo) => `<button class="btn-piccolo comb-tiro" data-azione="pf2-tira" data-id="${p.id}" data-tiro="${esc(tiro)}" title="Tira: ${esc(titolo)}">${testo}</button>`;
    const ts = [['tem', 'Tem', 'Tempra'], ['rif', 'Rif', 'Riflessi'], ['vol', 'Vol', 'Volontà']].map(([k, b, nome]) => tasto('ts:' + k, `${b} ${segno(s.ts[nome])}`, nome)).join('');
    const armi = s.armi.map((a) => `<span class="comb-colpi">${esc(a.nome)} ${(a.colpi.length ? a.colpi : [a.colpo]).map((x, k) => tasto(`colpo:${a.id}:${k}`, segno(x), `${a.nome}, ${k + 1}° attacco`)).join('')}${a.danni ? tasto('danni:' + a.id, esc(a.danni), `danni ${a.nome}`) : ''}</span>`).join('');
    const morte = s.morente ? `<span class="oltre">Morente ${s.morente}</span> <button class="btn-piccolo comb-tiro" data-azione="pf2-recupero" data-id="${p.id}" title="Prova di recupero: CD 10 + Morente">🎲 recupero</button>` : '';
    return `<div class="comb-scheda">
      <span class="muto">CA</span> <b>${s.ca}</b> <small class="muto">Percezione ${segno(s.modIniz)}</small>${s.temp ? ` <small class="muto">PF temporanei ${s.temp}</small>` : ''} ${morte}${s.ferito ? ` <small class="oltre">Ferito ${s.ferito}</small>` : ''}
      <span class="comb-gruppo">${ts}</span>
      ${armi ? `<span class="comb-gruppo">${armi}</span>` : ''}
      ${s.condizioni.length ? `<small class="muto">Condizioni: ${esc(s.condizioni.join(', '))}</small>` : ''}
    </div>`;
  }
  function schedaDndCombattimento(i) {
    const { p, s } = i;
    const tasto = (tiro, testo, titolo) => `<button class="btn-piccolo comb-tiro" data-azione="dnd-tira" data-id="${p.id}" data-tiro="${esc(tiro)}" title="Tira: ${esc(titolo)} (Maiusc = vantaggio, Ctrl = svantaggio)">${testo}</button>`;
    const ts = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'].map((k) => tasto('ts:' + k, `${k} ${segno(s.ts[k])}`, `TS ${k}`)).join('');
    const armi = s.armi.map((a) => `${tasto('colpo:' + a.id, `${esc(a.nome)} ${segno(a.colpo)}`, `attacco con ${a.nome}`)}${a.danni ? tasto('danni:' + a.id, esc(a.danni), `danni ${a.nome}`) : ''}`).join('');
    const morte = s.pfAtt <= 0 ? `<span class="oltre">a terra · tiri contro la morte</span> <button class="btn-piccolo comb-tiro" data-azione="dnd-tira-morte" data-id="${p.id}">🎲 morte</button>` : '';
    return `<div class="comb-scheda">
      <span class="muto">CA</span> <b>${s.ca}</b>${s.temp ? ` <small class="muto">PF temporanei ${s.temp}</small>` : ''} ${morte}
      <span class="comb-gruppo">${ts}</span>
      ${armi ? `<span class="comb-gruppo">${armi}</span>` : ''}
      ${s.condizioni.length ? `<small class="muto">Condizioni: ${esc(s.condizioni.join(', '))}</small>` : ''}
    </div>`;
  }
  // Starfinder nel tracker: CAE/CAC, PS/PF/PR, TS e armi della scheda, tirabili
  function schedaSfCombattimento(i) {
    const { p, s } = i;
    const tasto = (tiro, testo, titolo) => `<button class="btn-piccolo comb-tiro" data-azione="sf-tira" data-id="${p.id}" data-tiro="${esc(tiro)}" title="Tira: ${esc(titolo)}">${testo}</button>`;
    const ts = [['tempra', 'Tem'], ['riflessi', 'Rif'], ['volonta', 'Vol']].map(([k, nome]) => tasto('ts:' + k, `${nome} ${segno(s.ts[k])}`, nome)).join('');
    const armi = s.armi.map((a) => `${tasto('colpo:' + a.id, `${esc(a.nome)} ${segno(a.colpo)}`, `attacco con ${a.nome}`)}${a.danni ? tasto('danni:' + a.id, esc(a.danni), `danni ${a.nome}`) : ''}`).join('');
    return `<div class="comb-scheda">
      <span class="muto">CAE</span> <b>${s.cae}</b> <span class="muto">CAC</span> <b>${s.cac}</b> <small class="muto">manovre ${s.cac + 8} · PS ${s.psAtt}/${s.psMax} · PR ${s.prAtt}/${s.prMax}</small>
      <span class="comb-gruppo">${ts}</span>
      ${armi ? `<span class="comb-gruppo">${armi}</span>` : ''}
      ${s.bonusAttivi.length ? `<small class="muto">Bonus attivi: ${esc(s.bonusAttivi.join(', '))}</small>` : ''}
    </div>`;
  }
  // "Spada Corta +2 (1d4/19-20), morso +1 (1d3)" -> attacchi tirabili
  function attacchiMostro(testo) {
    return [...String(testo || '').matchAll(/([^,;()]+?)\s+([+-]\d+(?:\/[+-]\d+)*)\s*\(([^)]*)\)/g)].map((m) => {
      const danni = (m[3].match(/^\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)/) || [])[1]?.replace(/\s/g, '') || '';
      return { nome: m[1].replace(/^(?:o|e)\s+/i, '').trim(), bonus: m[2], primo: Number(m[2].split('/')[0]), danni, dettaglio: m[3] };
    });
  }
  // Immagini dei mostri: prese una volta dal wiki (prima illustrazione della pagina), rimpicciolite e salvate sul combattente
  const immaginiMostri = new Map(); // nome mostro -> data URL (o '' se il wiki non ne ha)
  function riduciDataUrl(url, lato = 96) {
    return new Promise((ok, ko) => {
      const img = new Image();
      img.onerror = () => ko(new Error('immagine non leggibile'));
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
      img.src = url;
    });
  }
  async function immagineMostro(m, sistema = 'pf1') {
    const chiave = `${sistema}:${m[0]}`;
    if (immaginiMostri.has(chiave)) return immaginiMostri.get(chiave);
    immaginiMostri.set(chiave, ''); // segna il tentativo: niente richieste ripetute
    try {
      if (sistema === 'dnd') return ''; // le immagini del wiki Fandom stanno su un altro dominio
      const sito = sistema === 'sf' ? 'sf' : sistema === 'pf2' ? 'pf2' : 'pf1';
      const html = await ctx.wiki(paginaWiki(m[22] || m[0]), sito);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const src = [...doc.querySelectorAll('#mw-content-text img')].map((i) => i.getAttribute('src') || '').find((s) => /^\/images\//.test(s));
      if (!src) return '';
      const url = await riduciDataUrl(await ctx.wikiImmagine(src.split('?')[0], sito));
      immaginiMostri.set(chiave, url);
      return url;
    } catch { return ''; }
  }
  // Dopo il disegno del tracker: carica le immagini mancanti e le inserisce senza ridisegnare la pagina
  function caricaImmaginiMostri(c) {
    const inc = incontroDi(c);
    for (const cb of inc.combattenti) {
      if (!cb.mostro || cb.immagine) continue;
      const m = mostroDi(cb.mostro, cb.sistema);
      if (m?.personalizzato) continue; // i mostri creati non hanno una pagina nel wiki
      const chiave = `${cb.sistema || 'pf1'}:${m?.[0]}`;
      if (!m || (immaginiMostri.has(chiave) && !immaginiMostri.get(chiave))) continue;
      immagineMostro(m, cb.sistema).then((url) => {
        if (!url) return;
        let cambiato = false;
        for (const x of inc.combattenti) if (x.mostro === m[0] && !x.immagine) { x.immagine = url; cambiato = true; }
        if (!cambiato) return;
        ctx.salva();
        document.querySelectorAll(`[data-img-mostro="${CSS.escape(m[0])}"]`).forEach((el) => { el.innerHTML = `<img src="${url}" alt="">`; });
      });
    }
  }
  function schedaMostro(cb, m, attr) {
    const tiro = (espr, etich, testo) => `<button class="btn-piccolo comb-tiro" data-azione="inc-tira" data-espr="${esc(espr)}" data-etich="${esc(`${cb.nome} · ${etich}`)}">${testo}</button>`;
    const [nome, gs, pe, tipo, taglia, , , perc, ca, contatto, impreparato, , dv, ts, difese, vel, mischia, distanza, , , bmc, dmc] = m;
    const sf = cb.sistema === 'sf';
    const dnd = cb.sistema === 'dnd';
    if (cb.sistema === 'pf2') {
      const ts2 = ['Tem', 'Rif', 'Vol'].map((k, i) => (ts[i] == null ? '' : tiro(`1d20${fmtMod(ts[i])}`, k, `${k} ${segno(ts[i])}`))).join('');
      const colpi = [...attacchiMostro(mischia), ...attacchiMostro(distanza)].map((a) => `<span class="comb-colpi">${esc(a.nome)} ${a.bonus.split('/').map((b, k) => tiro(`1d20${fmtMod(Number(b))}`, `${a.nome} (${k + 1}° attacco)`, b)).join('')}${a.danni ? tiro(a.danni, `danni ${a.nome}`, esc(a.dettaglio)) : ''}</span>`).join('');
      return `<div class="comb-scheda">
      <small class="muto">Livello ${esc(gs)} · ${esc(taglia)} · ${esc(tipo)}</small>
      <span class="muto">CA</span> <b>${ca}</b> <small class="muto">${perc !== '' ? `Percezione ${segno(perc)}` : ''}${vel ? ` · ${esc(vel)}` : ''}</small>
      <span class="comb-gruppo">${ts2}</span>
      ${colpi ? `<span class="comb-gruppo">${colpi}</span>` : ''}
      ${difese ? `<small class="muto">${esc(difese)}</small>` : ''}
      <button class="btn-mini" data-azione="inc-info-mostro" data-nome="${esc(nome)}" data-sistema="pf2" title="Blocco statistiche dal wiki">i</button>
    </div>`;
    }
    // D&D: tiri salvezza su tutte e sei le caratteristiche
    const nomiTs = dnd ? ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'] : ['Tem', 'Rif', 'Vol'];
    const tsBtn = nomiTs.map((k, i) => (ts[i] == null ? '' : tiro(`1d20${fmtMod(ts[i])}`, k, `${k} ${segno(ts[i])}`))).join('');
    const att = [...attacchiMostro(mischia), ...attacchiMostro(distanza)].map((a) => `${tiro(`1d20${fmtMod(a.primo)}`, a.nome, `${esc(a.nome)} ${esc(a.bonus)}`)}${a.danni ? tiro(a.danni, `danni ${a.nome}`, esc(a.dettaglio)) : ''}`).join('');
    // Starfinder: CAE/CAC e ruolo (nel campo "impreparato" dello schema PF1)
    const difesa = dnd
      ? `<span class="muto">CA</span> <b>${ca}</b> <small class="muto">${perc !== '' ? `Percezione passiva ${n(perc) + 10}` : ''}${vel ? ` · ${esc(vel)}` : ''}${dv ? ` · PF ${esc(dv)}` : ''}</small>`
      : sf
      ? `<span class="muto">CAE</span> <b>${ca}</b> <span class="muto">CAC</span> <b>${contatto}</b> <small class="muto">manovre ${n(contatto) + 8}${impreparato ? ` · ${esc(impreparato)}` : ''}${perc !== '' ? ` · Percezione ${segno(perc)}` : ''}${vel ? ` · ${esc(vel)}` : ''}</small>`
      : `<span class="muto">CA</span> <b>${ca}</b> <small class="muto">contatto ${contatto} · impreparato ${impreparato}${dmc !== '' ? ` · BMC ${segno(bmc)} · DMC ${dmc}` : ''}${perc !== '' ? ` · Percezione ${segno(perc)}` : ''}${vel ? ` · ${esc(vel)}` : ''}</small>`;
    return `<div class="comb-scheda">
      <small class="muto">GS ${esc(gs)} · ${esc(pe)} PE · ${esc(taglia)} ${esc(tipo)}${dv && !dnd ? ` · DV ${esc(dv)}` : ''}</small>
      ${difesa}
      <span class="comb-gruppo">${tsBtn}</span>
      ${att ? `<span class="comb-gruppo">${att}</span>` : ''}
      ${difese ? `<small class="muto">${esc(difese)}</small>` : ''}
      <button class="btn-mini" data-azione="inc-info-mostro" data-nome="${esc(nome)}" data-sistema="${esc(cb.sistema || 'pf1')}" title="Blocco statistiche dal wiki">i</button>
    </div>`;
  }
  // Riga compatta dei valori della scheda PF1 nel tracker: TS, CA completa, attacchi e bonus attivi, tutti tirabili
  function schedaInCombattimento(i) {
    const { p, c } = i;
    const d = dati(p);
    const tasto = (tiro, testo, titolo) => `<button class="btn-piccolo comb-tiro" data-azione="pf1-tira" data-id="${p.id}" data-tiro="${esc(tiro)}" title="Tira: ${esc(titolo)}">${testo}</button>`;
    const ts = TS.map(([k, nome]) => tasto('ts:' + k, `${nome.slice(0, 3)} ${segno(c.ts[k].tot)}`, nome)).join('');
    const armi = d.armi.map((a) => {
      const x = c.armi.find((y) => y.id === a.id);
      return x ? `${tasto('colpo:' + a.id, `${esc(a.nome || 'Arma')} ${x.sequenza}`, `attacco con ${a.nome || 'arma'}`)}${tasto('danni:' + a.id, esc(x.danni), `danni ${a.nome || 'arma'}`)}` : '';
    }).join('');
    return `<div class="comb-scheda">
      <span class="muto">CA</span> <b>${c.ca}</b> <small class="muto">contatto ${c.contatto} · impreparato ${c.sorpresa} · DMC ${c.dmc}</small>
      <span class="comb-gruppo">${ts}</span>
      ${armi ? `<span class="comb-gruppo">${armi}</span>` : ''}
      ${c.bonusAttivi.length ? `<small class="muto">Bonus attivi: ${esc(c.bonusAttivi.join(', '))}</small>` : ''}
    </div>`;
  }
  // Condizioni con effetti numerici: aggiunte a un PG con scheda PF1 diventano un bonus attivo, tolte spariscono
  const CONDIZIONI_EFFETTI = {
    scosso: () => PRESET_BONUS.Scosso, spaventato: () => PRESET_BONUS.Scosso, 'in preda al panico': () => PRESET_BONUS.Scosso,
    infermo: () => PRESET_BONUS.Infermo, affaticato: () => PRESET_BONUS.Affaticato, esausto: () => PRESET_BONUS.Esausto,
    intralciato: () => [E('colpire', -2), E('DES', -4)], prono: () => [E('colpire', -4)],
    accecato: () => [E('ca', -2)], stordito: () => [E('ca', -2)], 'in lotta': () => [E('colpire', -2), E('DES', -4)],
    abbagliato: () => [E('colpire', -1)], assordato: () => [E('iniz', -4)], accovacciato: () => [E('ca', -2)], immobilizzato: () => [E('ca', -4)],
    'livelli negativi': () => [E('colpire', -1), E('ts', -1), E('abilita', -1), E('bmc', -1), E('dmc', -1)],
  };
  function collegaCondizione(cb, cond) {
    const p = cb.pgId ? ctx.personaggio(cb.pgId) : null;
    // D&D: la condizione si spunta sulla scheda (le sue regole le applica il master)
    if (p?.pf2 && ctx.regDi(p).scheda === 'pf2') {
      const d = p.pf2; d.condizioni = d.condizioni || [];
      if (!d.condizioni.includes(cond.nome)) { d.condizioni.push(cond.nome); cond.pf2Nome = cond.nome; }
      return true;
    }
    if (p?.dnd && ctx.regDi(p).scheda === 'dnd') {
      const nome = CONDIZIONI_DND.find((x) => norm(x) === norm(cond.nome));
      if (!nome || nome === 'Indebolimento') return false;
      const d = p.dnd; d.condizioni = d.condizioni || [];
      if (!d.condizioni.includes(nome)) { d.condizioni.push(nome); cond.dndNome = nome; }
      return true;
    }
    const lista = p ? bonusDi(p) : null;
    if (!lista) return false;
    const eff = CONDIZIONI_EFFETTI[norm(cond.nome)]?.();
    if (!eff) return false;
    const b = { id: uid(), nome: `${cond.nome} (combattimento)`, attivo: true, effetti: eff.map((e) => ({ id: uid(), ...e })) };
    lista.push(b);
    cond.bonusId = b.id;
    return true;
  }
  function scollegaCondizione(cb, cond) {
    if (cond.pf2Nome && cb.pgId) { const d = ctx.personaggio(cb.pgId)?.pf2; if (d) d.condizioni = (d.condizioni || []).filter((x) => x !== cond.pf2Nome); return; }
    if (cond.dndNome && cb.pgId) { const d = ctx.personaggio(cb.pgId)?.dnd; if (d) d.condizioni = (d.condizioni || []).filter((x) => x !== cond.dndNome); return; }
    const p = cond.bonusId && cb.pgId ? ctx.personaggio(cb.pgId) : null;
    if (p) togliBonus(p, cond.bonusId);
  }
  function ordina(inc) {
    inc.combattenti.sort((a, b) => valIniz(b) - valIniz(a) || info(b).modIniz - info(a).modIniz || info(a).nome.localeCompare(info(b).nome));
  }

  function vistaIncontro(c) {
    const inc = incontroDi(c);
    setTimeout(() => caricaImmaginiMostri(c), 0);
    const presenti = new Set(inc.combattenti.map((x) => x.pgId).filter(Boolean));
    const daAggiungere = ctx.personaggiDi(c.id).filter((p) => p.tipo === 'PG' && !presenti.has(p.id));
    const attr = `data-camp="${c.id}"`;
    const righe = inc.combattenti.map((cb) => {
      const i = info(cb);
      const perc = i.pfMax > 0 ? Math.max(0, Math.min(100, (i.pf / i.pfMax) * 100)) : 0;
      const stato = statoPf(i, cb);
      const effettiCond = (nome) => (inc.sistema === 'pf1' ? EFFETTI_CONDIZIONI[norm(String(nome).replace(/\s+\d+$/, ''))] || '' : '');
      const condizioni = (cb.condizioni || []).map((x) => `<span class="chip chip-cond" title="${esc(effettiCond(x.nome))}">${esc(x.nome)}${inc.sistema === 'pf1' || inc.sistema === 'pf2' ? `<button class="btn-mini" data-azione="inc-cond-info" data-nome="${esc(x.nome)}" data-sistema="${esc(inc.sistema || 'pf1')}" title="Cosa comporta (dal wiki)">i</button>` : ''}${x.durata !== '' && x.durata != null ? ` <small>${x.durata} r</small>` : ''}<button class="chip-x" data-azione="inc-cond-x" ${attr} data-cb="${cb.id}" data-cond="${x.id}" title="Rimuovi">×</button></span>`).join('');
      const modificabile = !i.scheda;
      // Impreparato finché non agisce; sorpreso se non è consapevole durante il round di sorpresa
      const impr = impreparato(inc, cb);
      const sorpreso = (inc.fase === 'sorpresa' && cb.consapevole === false) || !!cb.sorpresoDnd;
      const mo = cb.mostro ? mostroDi(cb.mostro, cb.sistema) : null;
      // In Starfinder l'impreparato ha −2 alla CA invece di perdere la DES
      const caImpr = impr ? (i.scheda === 'pf1' ? i.c.sorpresa : i.scheda === 'sf' ? `${i.ca - 2}/${i.cac - 2}` : mo && cb.sistema !== 'sf' ? mo[10] : '') : '';
      const stati = `${sorpreso ? '<span class="badge badge-sorpreso" title="Non agisce nel round di sorpresa">sorpreso</span>' : ''}${impr ? `<span class="badge badge-impreparato" title="Non ha ancora agito: niente bonus di DES alla CA${caImpr !== '' ? ` (CA ${caImpr})` : ''}">impreparato${caImpr !== '' ? ` · CA ${caImpr}` : ''}</span>` : ''}`;
      return `<div class="comb${cb.id === inc.attivo ? ' attivo' : ''}${stato ? ' a-terra' : ''}${sorpreso ? ' sorpreso' : ''}" data-cb="${cb.id}">
        <input class="comb-iniz" type="number" value="${esc(cb.iniz ?? '')}" data-inc="combattenti#${cb.id}|iniz" ${attr} data-tipo="numero" title="Iniziativa" placeholder="—">
        <div class="comb-nome">
          ${i.pg ? `${i.p?.immagine && ctx.ritratto ? `<span class="ritratto ritratto-mini">${ctx.ritratto(i.p)}</span>` : ''}<a href="#/personaggio/${cb.pgId}${i.scheda === 'pf1' ? '/tavolo' : ''}">${esc(i.nome)}</a> <span class="badge ${i.tipo === 'PG' ? 'badge-pg' : ''}">${i.tipo}</span>`
            : `<div class="comb-nome-riga">${cb.mostro ? `<span class="ritratto ritratto-mostro" data-img-mostro="${esc(cb.mostro)}">${cb.immagine && /^data:image\//.test(cb.immagine) ? `<img src="${cb.immagine}" alt="">` : '<span class="ritratto-iniziali">👹</span>'}</span>` : ''}<input value="${esc(cb.nome)}" data-inc="combattenti#${cb.id}|nome" ${attr} class="comb-nome-in"> <span class="badge badge-mostro">${cb.mostro ? 'Mostro' : 'PNG'}</span></div>`}
          <div class="comb-sotto">Iniz ${modificabile ? `<input type="number" class="mini" value="${esc(cb.modIniz ?? '')}" data-inc="combattenti#${cb.id}|modIniz" ${attr} data-tipo="numero">` : segno(i.modIniz)}
            · CA ${modificabile ? `<input type="number" class="mini" value="${esc(cb.ca ?? '')}" data-inc="combattenti#${cb.id}|ca" ${attr} data-tipo="numero">` : i.scheda === 'sf' ? `<b>${i.ca}</b>/<b>${i.cac}</b> <small class="muto">CAE/CAC</small>` : `<b>${i.ca}</b>`}
            ${modificabile ? `· PF max <input type="number" class="mini" value="${esc(cb.pfMax ?? '')}" data-inc="combattenti#${cb.id}|pfMax" ${attr} data-tipo="numero">` : ''} ${stati}
            <span class="comb-schermo">
              <button class="btn-mini${cb.nascosto ? ' acceso' : ''}" data-azione="inc-nascondi" ${attr} data-cb="${cb.id}" title="${cb.nascosto ? 'Nascosto: non compare sullo schermo dei giocatori. Clicca per rivelarlo' : 'Nascondilo dallo schermo dei giocatori (imboscata, invisibile)'}">${cb.nascosto ? '🙈 nascosto' : '👁'}</button>
              ${i.pg ? '' : `<button class="btn-mini${cb.ignoto ? ' acceso' : ''}" data-azione="inc-ignoto" ${attr} data-cb="${cb.id}" title="${cb.ignoto ? 'Sullo schermo compare come «Creatura misteriosa». Clicca quando i personaggi lo identificano' : 'Mostralo come «Creatura misteriosa» finché non viene identificato'}">${cb.ignoto ? '❓ sconosciuto' : '❓'}</button>`}
            </span></div>
        </div>
        <div class="comb-pf">
          <div class="barra-pf"><span style="width:${perc}%"></span></div>
          ${i.psMax > 0 ? `<div class="muto">PS <b>${i.ps}</b> / ${i.psMax}</div>` : ''}<div>${i.psMax > 0 ? 'PF ' : ''}<b>${i.pf}</b> / ${i.pfMax || '?'} ${stato ? `<b class="stato-pf">${stato}</b>` : ''}</div>
        </div>
        <div class="comb-azioni">
          <input type="number" class="inc-quanti mini" min="0" placeholder="0" aria-label="Quantità">
          <button data-azione="inc-pf" data-segno="-1" ${attr} data-cb="${cb.id}">Danno</button>
          <button data-azione="inc-pf" data-segno="1" ${attr} data-cb="${cb.id}">Cura</button>
        </div>
        ${i.scheda === 'pf1' ? schedaInCombattimento(i) : i.scheda === 'sf' ? schedaSfCombattimento(i) : i.scheda === 'dnd' ? schedaDndCombattimento(i) : i.scheda === 'pf2' ? schedaPf2Combattimento(i) : cb.mostro && mostroDi(cb.mostro, cb.sistema) ? schedaMostro(cb, mostroDi(cb.mostro, cb.sistema), attr) : ''}
        ${inc.fase ? pulsantiAzioni(inc, cb, attr) : ''}
        ${voloTracker(cb, inc, attr)}
        <div class="comb-cond">${condizioni}
          <select class="inc-cond-sel" title="Condizione dal wiki"><option value="">+ condizione…</option>${(inc.sistema === 'dnd' ? CONDIZIONI_DND : inc.sistema === 'pf2' ? CONDIZIONI_PF2 : CONDIZIONI).map((x) => `<option value="${esc(x)}" title="${esc(effettiCond(x))}">${esc(x)}</option>`).join('')}</select>
          <input class="inc-cond-nome" list="pf1-condizioni" placeholder="o scrivi">
          <input class="inc-cond-durata mini" type="number" min="1" placeholder="round">
          <button class="btn-piccolo" data-azione="inc-cond" ${attr} data-cb="${cb.id}">+</button>
          ${(cb.condizioni || []).map((x) => effettiCond(x.nome) ? `<div class="cond-effetto"><b>${esc(x.nome)}</b>: ${esc(effettiCond(x.nome))}</div>` : '').join('')}
        </div>
        <button class="btn-x" data-azione="inc-rimuovi" ${attr} data-cb="${cb.id}" title="Togli dal combattimento">×</button>
      </div>`;
    }).join('');
    const attivo = inc.combattenti.find((x) => x.id === inc.attivo);
    return `<div class="inc-barra">
        <div class="inc-round">${inc.fase === 'sorpresa' ? '<b>Round di sorpresa</b>' : `Round <b>${inc.round || '—'}</b>`}${attivo ? `<div class="muto inc-turno-di">turno di <b>${esc(nomeCb(attivo))}</b></div>` : ''}</div>
        ${inc.fase ? `<button class="primario" data-azione="inc-turno" ${attr}>Turno successivo →</button>` : `<button class="primario" data-azione="inc-prepara" ${attr}>⚔ Inizia lo scontro</button>`}
        <button data-azione="inc-iniziativa" ${attr}>🎲 Tira iniziativa mancanti</button>
        <button class="pericolo" data-azione="inc-termina" ${attr}>Termina incontro</button>
        <button data-azione="inc-schermo" ${attr} title="Apre il tracker in una seconda finestra da spostare su un altro monitor per i giocatori">🖥 Schermo giocatori</button>
        <button data-azione="inc-scena" ${attr} title="Immagine o mappa mostrata sullo schermo dei giocatori sopra l'ordine di iniziativa">🖼 ${inc.scena ? 'Cambia scena' : 'Immagine di scena'}</button>
        ${inc.scena ? `<button class="btn-piccolo" data-azione="inc-scena-x" ${attr} title="Togli l'immagine di scena">× scena</button>` : ''}
      </div>
      <div class="inc-barra inc-schermo-extra">
        <span class="muto">Schermo giocatori:</span>
        <input id="inc-msg-${c.id}" class="pf-largo" value="${esc(inc.messaggio || '')}" placeholder="Messaggio da mostrare (es. «Il ponte crolla tra 2 round!»)">
        <button class="btn-piccolo" data-azione="inc-messaggio" ${attr}>📢 Mostra</button>
        ${inc.messaggio ? `<button class="btn-piccolo" data-azione="inc-messaggio-x" ${attr}>× messaggio</button>` : ''}
        <button class="btn-piccolo${inc.tiriPubblici ? ' acceso' : ''}" data-azione="inc-tiri-pubblici" ${attr} title="Durante lo scontro i tiri che fai (anche dei mostri) compaiono sullo schermo dei giocatori">🎲 Tiri sullo schermo: <b>${inc.tiriPubblici ? 'sì' : 'no'}</b></button>
      </div>
      ${ctx.pannelloDalVivo ? ctx.pannelloDalVivo(c) : ''}
      ${sezioneMusica(c, attr)}
      ${sezioneScontro(c, inc, attr)}
      ${pngDa(c).length ? `<div class="inc-pg"><span class="muto">PNG della campagna:</span>
        <select id="inc-png-${c.id}">${opz(pngDa(c).map((p) => [p.id, p.nome + (p.immagine ? ' 🖼' : '')]))}</select>
        <button class="btn-piccolo" data-azione="inc-png" ${attr}>+ Aggiungi PNG</button></div>` : ''}
      ${daAggiungere.length ? `<div class="inc-pg"><span class="muto">Aggiungi:</span> ${daAggiungere.map((p) => `<button class="btn-piccolo" data-azione="inc-pg" ${attr} data-pg="${p.id}">+ ${esc(p.nome)}</button>`).join('')}
        ${daAggiungere.length > 1 ? `<button class="btn-piccolo" data-azione="inc-pg" ${attr} data-pg="*">+ Tutti i PG</button>` : ''}</div>` : ''}
      ${compagniDa(c).length ? `<div class="inc-pg"><span class="muto">Compagni:</span> <button class="btn-piccolo" data-azione="inc-compagni" ${attr}>+ Compagni dei PG (${compagniDa(c).length})</button></div>` : ''}
      <form class="riga-form inc-mostro" data-form="inc-mostro" autocomplete="off">
        <input type="hidden" name="camp" value="${c.id}">
        <input name="nome" list="pf1-bestiario" placeholder="Mostro o PNG (es. Goblin): scrivi per cercare nel bestiario" required>
        <label>Quanti <input name="qta" type="number" min="1" max="30" value="1"></label>
        <label title="Per i mostri del bestiario si riempiono da soli: lascia vuoto">Iniz <input name="modIniz" type="number" placeholder="auto"></label>
        <label title="Per i mostri del bestiario si riempiono da soli: lascia vuoto">CA <input name="ca" type="number" placeholder="auto"></label>
        <label title="Vuoto = PF medi del bestiario; un'espressione (es. 2d8+4) si tira">PF <input name="pf" placeholder="medi o 2d8+4"></label>
        <label class="pf-chk" title="Tira i dadi vita del bestiario per ogni mostro invece dei PF medi"><input type="checkbox" name="tira"> tira i PF</label>
        <button>Aggiungi</button>
      </form>
      ${(() => {
        if (inc.sistema === 'pf2') {
          const x = minacciaPf2(inc);
          return x && x.pe ? `<p class="muto inc-pe">PE dell'incontro: <b>${x.pe}</b> (gruppo di ${x.pg} PG di livello ${x.gruppo}) · minaccia <b>${x.minaccia}</b> <small>(${x.soglie.map(([nn, s]) => `${nn.toLowerCase()} ${s}`).join(', ')})</small></p>` : '';
        }
        const pe = inc.combattenti.reduce((a, cb) => a + (cb.mostro ? n(mostroDi(cb.mostro, cb.sistema)?.[2]) : 0), 0);
        const pg = inc.combattenti.filter((cb) => cb.pgId).length;
        return pe ? `<p class="muto inc-pe">PE dei mostri in combattimento: <b>${pe.toLocaleString('it-IT')}</b>${pg ? ` · a testa (${pg} PG): <b>${Math.floor(pe / pg).toLocaleString('it-IT')}</b>` : ''}</p>` : '';
      })()}
      ${sistemaDi(c) ? `<datalist id="pf1-bestiario">${bestiario(sistemaDi(c)).map((m) => `<option value="${esc(m[0])}">${sistemaDi(c) === 'pf2' ? 'Liv' : 'GS'} ${esc(m[1])} · ${esc(m[3])}</option>`).join('')}</datalist>` : ''}
      <div class="lista-comb">${righe || '<p class="vuoto">Nessuno in combattimento. Aggiungi i PG e i mostri, poi tira l\'iniziativa.</p>'}</div>
      <datalist id="pf1-condizioni">${(inc.sistema === 'dnd' ? CONDIZIONI_DND : inc.sistema === 'pf2' ? CONDIZIONI_PF2 : CONDIZIONI).map((x) => `<option value="${x}">`).join('')}</datalist>`;
  }

  // PNG della campagna non ancora nello scontro
  function pngDa(c) {
    const presenti = new Set(incontroDi(c).combattenti.map((x) => x.pgId).filter(Boolean));
    return ctx.personaggiDi(c.id).filter((p) => p.tipo === 'PNG' && !presenti.has(p.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }
  // Compagni (animale, famiglio, eidolon) dei PG con scheda PF1 non ancora in combattimento
  function compagniDa(c) {
    const inc = incontroDi(c);
    const presenti = new Set(inc.combattenti.map((x) => x.compagnoId).filter(Boolean));
    const out = [];
    for (const p of ctx.personaggiDi(c.id).filter((x) => x.tipo === 'PG')) {
      const r = ctx.regDi(p);
      if (r.scheda !== 'pf1') continue;
      const d = dati(p);
      for (const x of d.compagni || []) if (!presenti.has(x.id)) out.push({ p, d, r, x });
    }
    return out;
  }

  // ---- Motore dello scontro: sorpresa, round, turni, effetti a durata, registro ----
  let preparaScontro = null; // id della campagna con il pannello "Inizia lo scontro" aperto
  const nomeCb = (cb) => info(cb).nome;
  function annota(inc, testo) {
    inc.registro = inc.registro || [];
    inc.registro.push({ round: inc.fase === 'sorpresa' ? 0 : n(inc.round), testo });
  }
  // Nel round di sorpresa agiscono solo i consapevoli
  const ordineTurno = (inc) => (inc.fase === 'sorpresa' ? inc.combattenti.filter((cb) => cb.consapevole !== false) : inc.combattenti);
  // In D&D non esiste la condizione di impreparato (la sorpresa fa saltare il primo turno)
  const impreparato = (inc, cb) => !!inc.fase && !cb.agito && inc.sistema !== 'dnd' && inc.sistema !== 'pf2';
  function tiraIniziative(inc) {
    const tirati = [];
    for (const cb of inc.combattenti) {
      if (cb.iniz !== '' && cb.iniz != null) continue;
      const i = info(cb);
      cb.iniz = Dadi.tira('1d20').totale + i.modIniz;
      tirati.push(`${i.nome} ${cb.iniz}`);
    }
    return tirati;
  }
  // Collega/scollega i bonus di un effetto (es. Benedizione) alle schede dei PG bersaglio
  function collegaEffetto(inc, ef) {
    const preset = Object.keys(PRESET_BONUS).find((k) => norm(k) === norm(ef.nome));
    if (!preset) return 0;
    ef.bonus = ef.bonus || {};
    let quanti = 0;
    for (const id of ef.bersagli) {
      const cb = inc.combattenti.find((x) => x.id === id);
      const p = cb?.pgId ? ctx.personaggio(cb.pgId) : null;
      const lista = p ? bonusDi(p) : null;
      if (!lista) continue;
      const b = { id: uid(), nome: `${preset} (scontro)`, attivo: true, effetti: PRESET_BONUS[preset].map((e) => ({ id: uid(), ...e })) };
      lista.push(b);
      ef.bonus[id] = b.id;
      quanti++;
    }
    return quanti;
  }
  function scollegaEffetto(inc, ef) {
    for (const [cbId, bId] of Object.entries(ef.bonus || {})) {
      const cb = inc.combattenti.find((x) => x.id === cbId);
      const p = cb?.pgId ? ctx.personaggio(cb.pgId) : null;
      if (p) togliBonus(p, bId);
    }
  }
  function terminaEffetto(inc, ef, motivo) {
    scollegaEffetto(inc, ef);
    // Finisce un volo magico: chi è ancora in aria va avvisato (Volare: scende lentamente; Levitazione: cade)
    for (const cb of inc.combattenti) {
      if (cb.volo?.efId !== ef.id) continue;
      if (n(cb.volo.altezza) > 0) {
        inc.avvisi = inc.avvisi || [];
        inc.avvisi.push({ id: uid(), efId: `volo-${ef.id}-${cb.id}`, tipo: 'scaduto', round: n(inc.round),
          testo: `${nomeCb(cb)} non è più sotto ${ef.nome} ed è a ${fmtM(cb.volo.altezza)} di altezza${cb.volo.modo === 'volare' && inc.sistema !== 'dnd' ? ' — con Volare scende di 18 m per round per 1d6 round, poi cade' : ' — cade!'}` });
        cb.volo.efId = '';
      } else delete cb.volo;
    }
    inc.effetti = (inc.effetti || []).filter((x) => x !== ef);
    annota(inc, `✨ Termina ${ef.nome}${motivo ? ` (${motivo})` : ''}`);
  }
  // ---- Azioni del turno: standard, movimento, veloce, immediata, attacchi di opportunità ----
  const AZIONI = [['standard', 'Standard'], ['movimento', 'Movimento'], ['veloce', 'Veloce'], ['immediata', 'Immediata']];
  const AZIONI_DND = [['azione', 'Azione'], ['bonus', 'Azione bonus'], ['movimento', 'Movimento'], ['reazione', 'Reazione']];
  const AZIONI_PF2 = [['a1', '◆ 1'], ['a2', '◆ 2'], ['a3', '◆ 3'], ['reazione', 'Reazione']];
  const azioniDi = (inc) => inc.sistema === 'dnd' ? AZIONI_DND : inc.sistema === 'pf2' ? AZIONI_PF2 : AZIONI;
  // Attacchi di opportunità per round: 1, più il mod. di DES con Riflessi in Combattimento
  function maxAdo(cb) {
    const i = info(cb);
    if (i.scheda !== 'pf1') return 1;
    const rc = dati(i.p).capacita.some((x) => norm(x.nome).startsWith('riflessi in combattimento'));
    return 1 + (rc ? Math.max(0, i.c.m.DES) : 0);
  }
  // A inizio turno tutto torna disponibile; un'azione immediata usata fuori turno consuma la veloce di questo turno
  function nuoveAzioni(cb) {
    if (cb.sistemaDnd) return { azione: false, bonus: false, movimento: false, reazione: false };
    if (cb.sistemaPf2) return { a1: false, a2: false, a3: false, reazione: false };
    const fuori = !!cb.azioni?.immediataFuori;
    return { standard: false, movimento: false, veloce: fuori, immediata: fuori, immediataFuori: false, ado: 0 };
  }
  function pulsantiAzioni(inc, cb, attr) {
    const a = cb.azioni || nuoveAzioni({});
    const suo = inc.attivo === cb.id;
    const sorpresa = inc.fase === 'sorpresa';
    const tastoDnd = (k, nome, titolo, disattivo) => `<button class="azione-turno${a[k] ? ' usata' : ''}" data-azione="inc-azione" ${attr} data-cb="${cb.id}" data-k="${k}" title="${esc(titolo)}" ${disattivo ? 'disabled' : ''}>${a[k] ? '✔ ' : ''}${nome}</button>`;
    if (inc.sistema === 'pf2') return `<div class="comb-turno">
      ${[1, 2, 3].map((x) => tastoDnd('a' + x, `◆ ${x}`, `${x}ª azione del turno (Colpire, Muoversi, Lanciare un Incantesimo…)`, !suo)).join('')}
      ${tastoDnd('reazione', 'Reazione', 'Reazione: una per round, torna disponibile all\'inizio del proprio turno', false)}
    </div>`;
    if (inc.sistema === 'dnd') return `<div class="comb-turno">
      ${tastoDnd('azione', 'Azione', 'Azione (attacco, lancio, Scatto, Disimpegno, Schivata…)', !suo)}
      ${tastoDnd('bonus', 'Azione bonus', 'Azione bonus (solo se un privilegio o incantesimo la concede)', !suo)}
      ${tastoDnd('movimento', 'Movimento', 'Movimento fino alla velocità', !suo)}
      ${tastoDnd('reazione', 'Reazione', 'Reazione (es. attacco di opportunità): una per round, torna disponibile all\'inizio del proprio turno', !!cb.sorpresoDnd)}
    </div>`;
    const max = maxAdo(cb);
    const tasto = (k, nome, titolo, disattivo = false) => `<button class="azione-turno${a[k] ? ' usata' : ''}" data-azione="inc-azione" ${attr} data-cb="${cb.id}" data-k="${k}" title="${esc(titolo)}" ${disattivo ? 'disabled' : ''}>${a[k] ? '✔ ' : ''}${nome}</button>`;
    return `<div class="comb-turno">
      ${tasto('standard', 'Standard', sorpresa ? 'Round di sorpresa: standard OPPURE movimento' : 'Azione standard', !suo)}
      ${tasto('movimento', 'Movimento', sorpresa ? 'Round di sorpresa: standard OPPURE movimento' : 'Azione di movimento', !suo)}
      <button class="azione-turno${a.standard && a.movimento ? ' usata' : ''}" data-azione="inc-azione" ${attr} data-cb="${cb.id}" data-k="completo" title="Azione di round completo (usa standard e movimento)" ${!suo || sorpresa ? 'disabled' : ''}>Round completo</button>
      ${tasto('veloce', 'Veloce', 'Azione veloce (una per turno; esclude l\'immediata)', !suo)}
      ${tasto('immediata', 'Immediata', suo ? 'Azione immediata: nel proprio turno conta come la veloce' : 'Azione immediata fuori turno: consuma la veloce del prossimo turno')}
      <span class="azione-ado${a.ado >= max ? ' usata' : ''}" title="Attacchi di opportunità in questo round">AdO <b>${a.ado}/${max}</b>
        <button class="btn-mini" data-azione="inc-ado" ${attr} data-cb="${cb.id}" data-d="1" ${a.ado >= max ? 'disabled' : ''}>+</button><button class="btn-mini" data-azione="inc-ado" ${attr} data-cb="${cb.id}" data-d="-1" ${a.ado <= 0 ? 'disabled' : ''}>−</button></span>
    </div>`;
  }
  function avviaTurno(inc, cb) {
    inc.attivo = cb.id;
    cb.agito = true; // da qui non è più impreparato
    cb.azioni = nuoveAzioni({ ...cb, sistemaDnd: inc.sistema === 'dnd', sistemaPf2: inc.sistema === 'pf2' });
    // PF2: Rallentato e Stordito tolgono azioni a inizio turno (lo stordimento si consuma)
    let perse = 0;
    if (inc.sistema === 'pf2') {
      for (const x of cb.condizioni || []) {
        const m = String(x.nome).match(/^(rallentato|stordito)\s*(\d+)?$/i);
        if (!m) continue;
        const v = n(m[2]) || 1;
        if (/rallentato/i.test(m[1])) perse += v;
        else { const via = Math.min(3 - perse, v); perse += via; x.nome = v - via > 0 ? `Stordito ${v - via}` : ''; }
      }
      cb.condizioni = (cb.condizioni || []).filter((x) => x.nome !== '' || (scollegaCondizione(cb, x), false));
      perse = Math.min(3, perse);
      for (let k = 1; k <= perse; k++) cb.azioni['a' + k] = true;
    }
    // D&D: chi è sorpreso non può muoversi né agire nel suo primo turno, né reagire finché il turno non finisce
    const sorpresoDnd = inc.sistema === 'dnd' && cb.sorpresoDnd;
    if (sorpresoDnd) { cb.azioni = { azione: true, bonus: true, movimento: true, reazione: true }; annota(inc, `😲 ${nomeCb(cb)} è sorpreso: salta il turno`); }
    // Chi vola: l'altezza a inizio turno resta nello storico del round (per vedere se sale o scende)
    if (cb.volo) { cb.volo.storia = cb.volo.storia || {}; if (cb.volo.storia[roundCorrente(inc)] === undefined) cb.volo.storia[roundCorrente(inc)] = n(cb.volo.altezza); }
    const finite = [];
    cb.condizioni = (cb.condizioni || []).filter((x) => {
      if (x.durata === '' || x.durata == null) return true;
      x.durata = n(x.durata) - 1;
      if (x.durata <= 0) { finite.push(x.nome); scollegaCondizione(cb, x); annota(inc, `${nomeCb(cb)}: finisce ${x.nome}`); return false; }
      return true;
    });
    // Le durate degli incantesimi si contano sul turno di chi li ha lanciati.
    // Avvisi (che restano finché non si chiudono) solo per le durate espresse in round.
    const inScadenza = [];
    for (const ef of [...(inc.effetti || [])]) {
      if (ef.lanciatoreId !== cb.id || ef.rimanenti === '' || ef.rimanenti == null) continue;
      ef.rimanenti = n(ef.rimanenti) - 1;
      const inRound = ef.inRound !== false;
      if (ef.rimanenti <= 0) {
        if (inRound) { finite.push(ef.nome); avvisaEffetto(inc, ef, 'scaduto'); }
        terminaEffetto(inc, ef, 'durata finita');
      } else if (inRound && ef.rimanenti === 1) { inScadenza.push(ef.nome); avvisaEffetto(inc, ef, 'ultimo'); }
    }
    const nome = esc(nomeCb(cb));
    ctx.toast(`⚔ ${inc.fase === 'sorpresa' ? 'Round di sorpresa · ' : `Round ${inc.round} · `}turno di <b>${nome}</b>${sorpresoDnd ? '<br>😲 Sorpreso: non può muoversi né agire in questo turno' : ''}${inc.fase === 'sorpresa' ? '<br>Solo un\'azione standard o di movimento' : ''}${perse ? `<br>⏳ ${perse} azion${perse > 1 ? 'i' : 'e'} in meno (Rallentato/Stordito)` : ''}${finite.length ? `<br>⏰ Scaduto: ${finite.map(esc).join(', ')}` : ''}${inScadenza.length ? `<br>⚠ Ultimo round: ${inScadenza.map(esc).join(', ')}` : ''}`);
  }
  // Avvisi di scadenza degli incantesimi in round: restano in cima al tracker finché il master non li chiude
  function avvisaEffetto(inc, ef, tipo) {
    const lanc = inc.combattenti.find((x) => x.id === ef.lanciatoreId);
    const su = (ef.bersagli || []).map((id) => inc.combattenti.find((x) => x.id === id)).filter(Boolean).map(nomeCb);
    inc.avvisi = (inc.avvisi || []).filter((a) => a.efId !== ef.id); // l'avviso nuovo sostituisce quello di "ultimo round"
    inc.avvisi.push({
      id: uid(), efId: ef.id, tipo, round: n(inc.round),
      testo: tipo === 'scaduto'
        ? `${ef.nome} è scaduto${su.length ? ` (su ${su.join(', ')})` : ''}${lanc ? ` — lanciato da ${nomeCb(lanc)}` : ''}`
        : `${ef.nome}: ultimo round${su.length ? ` su ${su.join(', ')}` : ''} — scade all'inizio del prossimo turno di ${lanc ? nomeCb(lanc) : 'chi l\'ha lanciato'}`,
    });
  }
  // Durata in round letta dal testo "Durata" del wiki, con il livello dell'incantatore
  function roundDaDurata(testo, li) {
    const t = norm(testo);
    let m;
    // valore e unità come scritti (round, minuti, ore), più l'equivalente in round per il conteggio
    const r = (valore, unita, nota = testo) => ({ round: valore * ({ round: 1, minuti: 10, ore: 600 }[unita]), valore, unita, nota });
    if ((m = t.match(/(\d+)\s*round\s*\/\s*livell/))) return r(n(m[1]) * li, 'round');
    if ((m = t.match(/(\d+)\s*min(?:ut[oi])?\.?\s*\/\s*livell/))) return r(n(m[1]) * li, 'minuti');
    if ((m = t.match(/(\d+)\s*or[ae]\s*\/\s*livell/))) return r(n(m[1]) * li, 'ore');
    // Durate a dadi (es. "1d4+1 round"): si tirano
    if ((m = t.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*round/))) {
      try { return r(Math.max(1, Dadi.tira(m[1].replace(/\s/g, '')).totale), 'round', `${testo} (tirato)`); } catch { return { round: '', nota: testo }; }
    }
    if ((m = t.match(/(\d+)\s*round/))) return r(n(m[1]), 'round');
    if ((m = t.match(/(\d+)\s*minut/))) return r(n(m[1]), 'minuti');
    if ((m = t.match(/(\d+)\s*or[ae]\b/))) return r(n(m[1]), 'ore');
    return { round: '', nota: testo };
  }
  // Livello dell'incantatore di un combattente: dalla scheda per i PG (la classe che conosce l'incantesimo, se c'è)
  function liDi(cb, nomeInc) {
    const p = cb?.pgId ? ctx.personaggio(cb.pgId) : null;
    if (!p || ctx.regDi(p).scheda !== 'pf1') return 0;
    const d = dati(p);
    const c = calcola(p, ctx.regDi(p));
    const v = incantesimoDi(nomeInc);
    const adatto = d.incantatori.find((inc) => v && v.livelli[listaDi(inc)] !== undefined);
    const ci = adatto ? c.incantatori.find((x) => x.id === adatto.id) : null;
    return ci ? ci.cl : Math.max(0, ...c.incantatori.map((x) => x.cl));
  }
  function sezioneScontro(c, inc, attr) {
    // Pannello di preparazione: chi è consapevole dei nemici
    if (preparaScontro === c.id && !inc.fase) {
      return `<div class="pannello inc-prepara"><h3>⚔ Inizia lo scontro</h3>
        <p class="muto">Spunta chi è <b>consapevole</b> dei nemici. Se qualcuno non lo è, c'è un <b>round di sorpresa</b> in cui agiscono solo i consapevoli (un'azione standard o di movimento). Le iniziative mancanti si tirano da sole.</p>
        <div class="riv-griglia">${inc.combattenti.map((cb) => `<label class="riv"><input type="checkbox" data-azione="inc-consapevole" ${attr} data-cb="${cb.id}" ${cb.consapevole !== false ? 'checked' : ''}> ${esc(nomeCb(cb))}</label>`).join('')}</div>
        <div class="pf-piede"><button class="primario" data-azione="inc-avvia" ${attr}>⚔ Avvia lo scontro</button><button data-azione="inc-prepara-chiudi" ${attr}>Annulla</button></div></div>`;
    }
    if (!inc.fase) return '';
    // Effetti attivi e modulo per un nuovo effetto
    const effetti = (inc.effetti || []).map((ef) => {
      const lanc = inc.combattenti.find((x) => x.id === ef.lanciatoreId);
      const su = ef.bersagli.map((id) => inc.combattenti.find((x) => x.id === id)).filter(Boolean).map(nomeCb);
      const inRound = ef.inRound !== false;
      const r = ef.rimanenti === '' || ef.rimanenti == null ? null : n(ef.rimanenti);
      const durata = r == null ? '∞' : inRound ? `${r} r` : r >= 600 ? `~${Math.ceil(r / 600)} h` : `~${Math.ceil(r / 10)} min`;
      return `<span class="chip chip-effetto${inRound && r === 1 ? ' in-scadenza' : ''}" title="${esc(ef.nota || '')}${inRound && r === 1 ? ' — ultimo round' : !inRound && r != null ? ' — durata lunga: nessun avviso di scadenza' : ''}">✨ <b>${esc(ef.nome)}</b>${lanc ? ` <small>da ${esc(nomeCb(lanc))}</small>` : ''}${su.length ? ` <small>su ${esc(su.join(', '))}</small>` : ''}
        <b class="chip-durata">${inRound && r === 1 ? '⚠ ' : ''}${durata}</b>${Object.keys(ef.bonus || {}).length ? ' <small title="Bonus attivo sulle schede dei PG bersaglio">📋</small>' : ''}
        <button class="chip-x" data-azione="inc-effetto-x" ${attr} data-ef="${ef.id}" title="Termina l'effetto">×</button></span>`;
    }).join('');
    const opzLanc = inc.combattenti.map((cb) => [cb.id, nomeCb(cb)]);
    const registro = inc.registro || [];
    const perRound = [...new Set(registro.map((x) => x.round))].map((r) => `<div class="reg-round"><b>${r === 0 ? 'Sorpresa' : `Round ${r}`}</b><ul>${registro.filter((x) => x.round === r).map((x) => `<li>${esc(x.testo)}</li>`).join('')}</ul></div>`).join('');
    const avvisi = (inc.avvisi || []).map((a) => `<div class="inc-avviso ${a.tipo}">
        <span>${a.tipo === 'scaduto' ? '⏰' : '⚠'} ${esc(a.testo)} <small class="muto">(round ${a.round || '—'})</small></span>
        <button class="chip-x" data-azione="inc-avviso-x" ${attr} data-avv="${a.id}" title="Chiudi l'avviso">×</button></div>`).join('');
    return `<div class="inc-effetti">
        ${avvisi ? `<div class="inc-avvisi">${avvisi}${(inc.avvisi || []).length > 1 ? `<button class="btn-piccolo" data-azione="inc-avviso-x" ${attr} data-avv="" title="Chiude tutti gli avvisi">Chiudi tutti</button>` : ''}</div>` : ''}
        <div class="inc-effetti-lista">${effetti || '<span class="muto">Nessun effetto a durata attivo.</span>'}</div>
        <details class="inc-nuovo-effetto"><summary>✨ Aggiungi incantesimo o effetto a durata</summary>
          <form class="riga-form" data-form="inc-effetto" autocomplete="off">
            <input type="hidden" name="camp" value="${c.id}">
            <label>Lanciato da <select name="lanciatore">${opz(opzLanc, inc.attivo)}</select></label>
            <input name="nome" list="pf1-effetti" placeholder="Incantesimo o effetto (es. Benedizione)" required>
            <label title="Livello dell'incantatore: per i PG si prende dalla scheda">LI <input name="li" type="number" min="0" class="mini" placeholder="auto"></label>
            <label title="Solo gli effetti in round danno l'avviso di scadenza">Durata <input name="durata" type="number" min="1" class="mini" placeholder="∞">
              <select name="unita"><option value="round">round</option><option value="minuti">minuti</option><option value="ore">ore</option></select></label>
            <button type="button" class="btn-piccolo" data-azione="inc-durata-wiki" ${attr} title="Legge la durata dal wiki e la calcola dal livello dell'incantatore">📖 dal wiki</button>
            <span class="muto inc-durata-nota"></span>
            <div class="inc-bersagli"><span class="muto">Bersagli:</span> ${inc.combattenti.map((cb) => `<label class="pf-chk"><input type="checkbox" name="bersagli" value="${cb.id}"> ${esc(nomeCb(cb))}</label>`).join('')}</div>
            <button class="primario">Aggiungi effetto</button>
          </form>
        </details>
        <details class="inc-registro"><summary>📜 Registro dello scontro <small class="muto">(${registro.length})</small></summary>
          ${perRound || '<p class="muto">Ancora vuoto.</p>'}
          ${registro.length ? `<div class="pf-piede"><button class="btn-piccolo" data-azione="inc-registro-diario" ${attr}>📜 Copia nel diario della sessione</button></div>` : ''}
        </details>
      </div>
      <datalist id="pf1-effetti">${Object.keys(PRESET_BONUS).map((k) => `<option value="${esc(k)}">bonus sulla scheda</option>`).join('')}${[...INCANTESIMI.values()].map((v) => `<option value="${esc(v.nome)}">`).join('')}</datalist>`;
  }

  const cbDa = (el) => {
    const c = ctx.campagna(el.dataset.camp);
    const inc = incontroDi(c);
    return { c, inc, cb: inc.combattenti.find((x) => x.id === el.dataset.cb) };
  };

  Object.assign(azioni, {
    'inc-pg'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const inc = incontroDi(c);
      const presenti = new Set(inc.combattenti.map((x) => x.pgId));
      const pgs = ctx.personaggiDi(c.id).filter((p) => p.tipo === 'PG' && !presenti.has(p.id) && (el.dataset.pg === '*' || p.id === el.dataset.pg));
      for (const p of pgs) inc.combattenti.push({ id: uid(), pgId: p.id, iniz: '', modIniz: 0, ca: '', pfMax: '', pf: '', condizioni: [] });
      ordina(inc);
      ctx.salva();
      ctx.render();
    },
    // Maiusc = vantaggio, Ctrl = svantaggio (2d20, il più alto o il più basso)
    'inc-tira'(el, e) {
      const modo = e?.shiftKey ? 'kh1' : e?.ctrlKey ? 'kl1' : '';
      const espr = modo ? el.dataset.espr.replace(/^1d20/, `2d20${modo}`) : el.dataset.espr;
      ctx.eseguiTiro(espr, el.dataset.etich + (modo === 'kh1' ? ' (vantaggio)' : modo === 'kl1' ? ' (svantaggio)' : ''));
    },
    'inc-png'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const inc = incontroDi(c);
      const id = document.getElementById(`inc-png-${c.id}`)?.value;
      const p = id ? ctx.personaggio(id) : null;
      if (!p) return;
      inc.combattenti.push({ id: uid(), pgId: p.id, iniz: '', modIniz: 0, ca: '', pfMax: '', pf: '', condizioni: [] });
      if (inc.fase) annota(inc, `${p.nome} entra nello scontro`);
      ordina(inc);
      ctx.salva();
      ctx.render();
    },
    async 'inc-schermo'(el) {
      try { await ctx.apriSchermo(el.dataset.camp); } catch (e) { ctx.toast(`Schermo non aperto: ${esc(e.message)}`, 'errore'); }
    },
    'inc-azione'(el) {
      const { inc, cb } = cbDa(el);
      if (!cb) return;
      const a = cb.azioni = cb.azioni || nuoveAzioni({});
      const k = el.dataset.k;
      const suo = inc.attivo === cb.id;
      if (k === 'completo') { const v = !(a.standard && a.movimento); a.standard = v; a.movimento = v; }
      else if ((k === 'standard' || k === 'movimento') && inc.fase === 'sorpresa') { const v = !a[k]; a.standard = v; a.movimento = v; }
      else if (k === 'immediata') {
        a.immediata = !a.immediata;
        if (suo) a.veloce = a.immediata;
        else a.immediataFuori = a.immediata;
      } else if (k === 'veloce') { a.veloce = !a.veloce; a.immediata = a.veloce; }
      else a[k] = !a[k];
      ctx.salva();
      ctx.render();
    },
    'inc-ado'(el) {
      const { cb } = cbDa(el);
      if (!cb) return;
      const a = cb.azioni = cb.azioni || nuoveAzioni({});
      a.ado = Math.max(0, Math.min(maxAdo(cb), n(a.ado) + Number(el.dataset.d)));
      ctx.salva();
      ctx.render();
    },
    async 'inc-scena'(el) {
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      try {
        const url = await ctx.scegliImmagine(1280);
        if (!url) return;
        inc.scena = url;
        ctx.salva();
        ctx.render();
        ctx.toast('🖼 Immagine di scena pronta sullo schermo dei giocatori');
      } catch (e) { ctx.toast(esc(e.message), 'errore'); }
    },
    async 'inc-musica-file'(el) {
      const c = ctx.campagna(el.dataset.camp);
      try {
        const scelti = await ctx.scegliMusica();
        if (!scelti?.length) return;
        const m = musicaDi(c);
        for (const s of scelti) m.brani.push({ id: uid(), nome: s.nome, ...(s.file ? { file: s.file } : { url: s.url }), tipo: 'file', ...(s.temporaneo ? { temporaneo: true } : {}) });
        ctx.salva();
        ridisegnaMusica();
        ctx.toast(`🎵 ${scelti.length} bran${scelti.length > 1 ? 'i aggiunti' : 'o aggiunto'}`);
      } catch (e) { ctx.toast(esc(e.message), 'errore'); }
    },
    'inc-musica-link'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const campo = document.getElementById(`musica-link-${c.id}`);
      const url = (campo?.value || '').trim();
      if (!/^https?:\/\/\S+$/i.test(url)) { ctx.toast('Incolla un link che inizi con http:// o https://', 'errore'); return; }
      let nome = url;
      try { const u = new URL(url); nome = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.hostname).replace(/\.[a-z0-9]{2,4}$/i, '') || u.hostname; if (ESTERNI.test(u.hostname)) nome = `${u.hostname.replace(/^www\./, '')}${u.searchParams.get('v') ? ' · ' + u.searchParams.get('v') : ''}`; } catch { /* resta il link */ }
      musicaDi(c).brani.push({ id: uid(), nome, url, tipo: ESTERNI.test(url) ? 'esterno' : 'link' });
      ctx.salva();
      ridisegnaMusica();
    },
    'inc-musica-play'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const b = musicaDi(c).brani.find((x) => x.id === el.dataset.brano);
      if (!b) return;
      if (b.tipo === 'esterno') { window.open(b.url, '_blank', 'noopener'); return; }
      if (suono.brano === b.id && suono.audio && suono.campagna === c.id) { if (suono.audio.paused) suono.audio.play().catch(() => {}); else suono.audio.pause(); return; }
      suona(c, b);
    },
    'inc-musica-pausa'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const a = suono.audio;
      if (a && suono.brano && suono.campagna === c.id) { if (a.paused) a.play().catch(() => {}); else a.pause(); return; }
      const primo = musicaDi(c).brani.find((b) => b.tipo !== 'esterno');
      if (primo) suona(c, primo); else ctx.toast('Aggiungi prima un file audio o un link diretto', 'errore');
    },
    'inc-musica-stop'() { if (suono.audio) { suono.audio.pause(); suono.audio.currentTime = 0; } suono.brano = null; ridisegnaMusica(); },
    'inc-musica-succ'(el) { cambiaBrano(el, 1); },
    'inc-musica-prec'(el) { cambiaBrano(el, -1); },
    'inc-musica-x'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const m = musicaDi(c);
      if (suono.brano === el.dataset.brano && suono.audio) { suono.audio.pause(); suono.brano = null; }
      m.brani = m.brani.filter((b) => b.id !== el.dataset.brano);
      ctx.salva();
      ridisegnaMusica();
    },
    'inc-scena-x'(el) {
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      delete inc.scena;
      ctx.salva();
      ctx.render();
    },
    // ---- Schermo dei giocatori: nascosti, sconosciuti, messaggio, tiri pubblici, grandezza del testo ----
    'inc-nascondi'(el) {
      const cb = incontroDi(ctx.campagna(el.dataset.camp)).combattenti.find((x) => x.id === el.dataset.cb);
      if (!cb) return;
      cb.nascosto = !cb.nascosto;
      ctx.salva();
      ctx.render();
    },
    'inc-ignoto'(el) {
      const cb = incontroDi(ctx.campagna(el.dataset.camp)).combattenti.find((x) => x.id === el.dataset.cb);
      if (!cb) return;
      cb.ignoto = !cb.ignoto;
      ctx.salva();
      ctx.render();
    },
    'inc-messaggio'(el) {
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      inc.messaggio = String(document.getElementById(`inc-msg-${el.dataset.camp}`)?.value || '').trim().slice(0, 200);
      ctx.salva();
      ctx.render();
      ctx.toast(inc.messaggio ? '📢 Messaggio sullo schermo dei giocatori' : 'Messaggio tolto');
    },
    'inc-messaggio-x'(el) {
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      delete inc.messaggio;
      ctx.salva();
      ctx.render();
    },
    'inc-tiri-pubblici'(el) {
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      inc.tiriPubblici = !inc.tiriPubblici;
      if (!inc.tiriPubblici) delete inc.tiriSchermo;
      ctx.salva();
      ctx.render();
    },
    'sch-scala'(el) {
      const v = Math.round(Math.min(2, Math.max(0.7, scalaSchermo() + 0.1 * Number(el.dataset.d))) * 10) / 10;
      try { localStorage.setItem('schermo-scala', String(v)); } catch { /* niente */ }
      document.querySelector('.schermo')?.style.setProperty('--sch-scala', v);
    },
    // ---- Editor dei mostri personalizzati ----
    'mc-crea'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p) return;
      p.creatoMostro = NUOVO_MOSTRO();
      ctx.salva();
      ctx.render();
    },
    'mc-elimina'(el) {
      const p = ctx.personaggio(el.dataset.id);
      if (!p?.creatoMostro || !confirm('Togliere le statistiche create per questo mostro?')) return;
      delete p.creatoMostro;
      ctx.salva();
      ctx.render();
    },
    'mc-ts'(el) {
      const p = ctx.personaggio(el.dataset.id);
      const x = p?.creatoMostro;
      if (!x) return;
      const max = CM.TIPI[x.tipo]?.ts;
      const l = (x.tsScelti || []).filter((k) => k !== el.dataset.k);
      if (!(x.tsScelti || []).includes(el.dataset.k)) l.push(el.dataset.k);
      x.tsScelti = typeof max === 'number' ? l.slice(-max) : l;
      ctx.salva();
      ctx.render();
    },
    'mc-taglia'(el) {
      const x = ctx.personaggio(el.dataset.id)?.creatoMostro;
      if (!x) return;
      const tg = CM.TAGLIE[x.taglia] || CM.TAGLIE.Media;
      x.car = { ...x.car, FOR: tg[2], DES: tg[3], COS: x.tipo === 'Costrutto' || x.tipo === 'Non Morto' ? '' : tg[4] };
      ctx.salva();
      ctx.render();
    },
    'mc-aggiungi'(el) {
      const x = ctx.personaggio(el.dataset.id)?.creatoMostro;
      if (!x) return;
      const lista = el.dataset.lista;
      x[lista] = x[lista] || [];
      x[lista].push(lista === 'attacchi' ? { id: uid(), nome: '', tipo: 'mischia', dadi: '1d6', bonusColpire: '', bonusDanni: '', secondario: false } : { id: uid(), nome: '', ts: 'Riflessi', car: 'COS' });
      ctx.salva();
      ctx.render();
    },
    'mc-togli'(el) {
      const x = ctx.personaggio(el.dataset.id)?.creatoMostro;
      if (!x) return;
      x[el.dataset.lista].splice(Number(el.dataset.i), 1);
      ctx.salva();
      ctx.render();
    },
    'inc-info-mostro'(el) {
      const sf = el.dataset.sistema === 'sf';
      const dnd = el.dataset.sistema === 'dnd';
      const pf2 = el.dataset.sistema === 'pf2';
      const m = mostroDi(el.dataset.nome, el.dataset.sistema);
      if (!m) return;
      const car = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'].map((k, i) => `${k} ${m[18][i] == null ? '—' : sf || dnd || pf2 ? segno(m[18][i]) : m[18][i]}`).join(', ');
      apriInfo(m[0], `<div class="info-fatti">${pf2 ? fatto('Livello', String(m[1])) : fatto('GS / PE', `${m[1]} / ${m[2]}`)}${fatto('Tipo', `${m[4]} ${m[3]} · ${m[5]}`)}${sf ? fatto('Ruolo', m[10]) : ''}
        ${fatto('CA', dnd || pf2 ? String(m[8]) : sf ? `CAE ${m[8]}, CAC ${m[9]}` : `${m[8]}, contatto ${m[9]}, impreparato ${m[10]}`)}
        ${pf2 ? fatto('Percezione', segno(m[7] || 0)) : ''}${fatto('PF', sf || pf2 ? String(m[11]) : `${m[11]} (${m[12]})`)}${fatto('TS', el.dataset.sistema === 'dnd' ? ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'].map((k, i) => `${k} ${segno(m[13][i] ?? 0)}`).join(', ') : `Tem ${segno(m[13][0] ?? 0)}, Rif ${segno(m[13][1] ?? 0)}, Vol ${segno(m[13][2] ?? 0)}`)}${fatto('Difese', m[14])}
        ${fatto('Velocità', m[15])}${fatto('Mischia', m[16])}${fatto('Distanza', m[17])}${fatto(sf || dnd || pf2 ? 'Modificatori di caratteristica' : 'Caratteristiche', car)}${dnd && m[23] ? fatto('Fonte', `${m[23]} (descrizione e capacità sul manuale)`) : ''}${sf || dnd || pf2 ? '' : fatto('BAB / BMC / DMC', `${segno(m[19] || 0)} / ${segno(m[20] || 0)} / ${m[21]}`)}</div>`,
        m.personalizzato ? '' : paginaWiki(m[22] || m[0]), (doc) => {
          // Descrizione del mostro: i paragrafi di testo della pagina, senza il blocco statistiche
          const righe = blocchiTesto(doc).filter((r) => r.length > 60 && !/^(PE|Iniziativa|CA|PF|Tiri Salvezza|Velocità|Mischia|Caratteristiche|Talenti|Abilità)\b/.test(r));
          return righe.slice(0, 8).join('\n\n');
        }, { sf: 'sf', dnd: 'dnd', pf2: 'pf2' }[el.dataset.sistema] || 'pf1');
    },
    'inc-compagni'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const inc = incontroDi(c);
      for (const { p, d, r, x } of compagniDa(c)) {
        const s = calcolaCompagno(d, calcola(p, r), x);
        const tipo = TIPI_COMPAGNO.find((t) => t[0] === x.tipo)?.[1] || 'Compagno';
        const pf = x.pfAttuali === '' || x.pfAttuali == null ? s.pf : n(x.pfAttuali);
        inc.combattenti.push({ id: uid(), compagnoId: x.id, nome: `${x.nome || x.specie || tipo} (${p.nome})`, iniz: '', modIniz: s.iniz, ca: s.ca, pfMax: s.pf, pf, condizioni: [] });
      }
      ordina(inc);
      ctx.salva();
      ctx.render();
    },
    'inc-iniziativa'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const inc = incontroDi(c);
      const tirati = [];
      for (const cb of inc.combattenti) {
        if (cb.iniz !== '' && cb.iniz != null) continue;
        const i = info(cb);
        cb.iniz = Dadi.tira('1d20').totale + i.modIniz;
        tirati.push(`${esc(i.nome)} ${cb.iniz}`);
      }
      if (!tirati.length) { ctx.toast("Tutti hanno già l'iniziativa. Per ritirarla, svuota il campo."); return; }
      ordina(inc);
      ctx.salva();
      ctx.render();
      ctx.toast(`🎲 Iniziativa: ${tirati.join(' · ')}`);
    },
    'inc-prepara'(el) {
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      if (!inc.combattenti.length) { ctx.toast('Aggiungi prima PG, PNG e mostri allo scontro', 'errore'); return; }
      preparaScontro = el.dataset.camp;
      ctx.render();
    },
    'inc-prepara-chiudi'() { preparaScontro = null; ctx.render(); },
    'inc-consapevole'(el) {
      const { cb } = cbDa(el);
      if (cb) cb.consapevole = cb.consapevole === false;
      ctx.salva();
      ctx.render();
    },
    'inc-avvia'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const inc = incontroDi(c);
      const tirati = tiraIniziative(inc);
      ordina(inc);
      for (const cb of inc.combattenti) { cb.agito = false; cb.azioni = nuoveAzioni({ sistemaDnd: inc.sistema === 'dnd', sistemaPf2: inc.sistema === 'pf2' }); delete cb.sorpresoDnd; }
      inc.registro = [];
      inc.avvisi = [];
      inc.effetti = inc.effetti || [];
      const consapevoli = inc.combattenti.filter((cb) => cb.consapevole !== false);
      const sorpresi = inc.combattenti.filter((cb) => cb.consapevole === false);
      if (!consapevoli.length) { ctx.toast('Almeno qualcuno deve essere consapevole per iniziare', 'errore'); return; }
      if (sorpresi.length && inc.sistema === 'dnd') {
        // D&D 5e: niente round di sorpresa, i sorpresi perdono il loro primo turno
        inc.fase = 'normale';
        inc.round = 1;
        for (const cb of sorpresi) cb.sorpresoDnd = true;
        annota(inc, `Inizio dello scontro. Iniziativa: ${inc.combattenti.map((cb) => `${nomeCb(cb)} ${cb.iniz}`).join(', ')}`);
        annota(inc, `Sorpresi (saltano il primo turno, niente reazioni fino ad allora): ${sorpresi.map(nomeCb).join(', ')}`);
      } else if (sorpresi.length && inc.sistema === 'pf2') {
        inc.fase = 'normale';
        inc.round = 1;
        annota(inc, `Inizio dello scontro. Iniziativa: ${inc.combattenti.map((cb) => `${nomeCb(cb)} ${cb.iniz}`).join(', ')}`);
        annota(inc, `Ignari: ${sorpresi.map(nomeCb).join(', ')} (in PF2 non c'è round di sorpresa: chi tende l'imboscata tira l'iniziativa con Furtività)`);
      } else if (sorpresi.length) {
        inc.fase = 'sorpresa';
        inc.round = 0;
        annota(inc, `Inizio dello scontro. Iniziativa: ${inc.combattenti.map((cb) => `${nomeCb(cb)} ${cb.iniz}`).join(', ')}`);
        annota(inc, `Round di sorpresa: agiscono ${consapevoli.map(nomeCb).join(', ')}; sorpresi ${sorpresi.map(nomeCb).join(', ')}`);
      } else {
        inc.fase = 'normale';
        inc.round = 1;
        annota(inc, `Inizio dello scontro (nessuna sorpresa). Iniziativa: ${inc.combattenti.map((cb) => `${nomeCb(cb)} ${cb.iniz}`).join(', ')}`);
      }
      preparaScontro = null;
      avviaTurno(inc, ordineTurno(inc)[0]);
      ctx.salva();
      ctx.render();
      if (tirati.length) setTimeout(() => ctx.toast(`🎲 Iniziativa tirata: ${tirati.map(esc).join(' · ')}`), 1600);
    },
    'inc-turno'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const inc = incontroDi(c);
      if (!inc.combattenti.length) { ctx.toast('Aggiungi prima qualcuno al combattimento', 'errore'); return; }
      if (!inc.fase) {
        // Scontro iniziato con una versione precedente: si continua normalmente
        if (inc.attivo) inc.fase = 'normale';
        else { preparaScontro = c.id; ctx.render(); return; }
      }
      ordina(inc);
      const lista = ordineTurno(inc);
      const i = lista.findIndex((x) => x.id === inc.attivo);
      let prossimo = lista[i + 1];
      // D&D: finito il turno da sorpreso, la reazione torna disponibile
      const prec = lista[i];
      if (prec?.sorpresoDnd) { delete prec.sorpresoDnd; if (prec.azioni) prec.azioni.reazione = false; }
      // PF2: alla fine del proprio turno Spaventato scende di 1 (wiki, Condizioni)
      if (inc.sistema === 'pf2' && prec) {
        for (const x of [...(prec.condizioni || [])]) {
          const m = String(x.nome).match(/^spaventato\s*(\d+)?$/i);
          if (!m) continue;
          const v = (n(m[1]) || 1) - 1;
          scollegaCondizione(prec, x);
          if (v > 0) { x.nome = `Spaventato ${v}`; collegaCondizione(prec, x); } else { prec.condizioni = prec.condizioni.filter((y) => y !== x); annota(inc, `${nomeCb(prec)}: non è più spaventato`); }
        }
      }
      if (!prossimo) {
        // Fine del round: dal round di sorpresa si passa al round 1, poi si conta
        inc.round = inc.fase === 'sorpresa' ? 1 : n(inc.round) + 1;
        inc.fase = 'normale';
        annota(inc, `— Inizia il round ${inc.round} —`);
        prossimo = inc.combattenti[0];
      }
      avviaTurno(inc, prossimo);
      ctx.salva();
      ctx.render();
    },
    'inc-termina'(el) {
      const c = ctx.campagna(el.dataset.camp);
      const inc = incontroDi(c);
      if (!confirm("Terminare l'incontro? I mostri vengono tolti; i PF dei PG restano sulle schede, condizioni ed effetti dello scontro spariscono.")) return;
      if ((inc.registro || []).length && confirm('Copiare il registro dello scontro nel diario della sessione prima di chiuderlo?')) copiaRegistro(c);
      for (const cb of inc.combattenti) for (const x of cb.condizioni || []) scollegaCondizione(cb, x);
      for (const ef of inc.effetti || []) scollegaEffetto(inc, ef);
      c.incontro = { round: 0, attivo: null, combattenti: [] };
      preparaScontro = null;
      ctx.salva();
      ctx.render();
    },
    'inc-effetto-x'(el) {
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      const ef = (inc.effetti || []).find((x) => x.id === el.dataset.ef);
      if (ef) terminaEffetto(inc, ef, 'interrotto');
      ctx.salva();
      ctx.render();
    },
    async 'inc-durata-wiki'(el) {
      const f = el.closest('form');
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      const v = incantesimoDi(f.nome.value);
      const nota = f.querySelector('.inc-durata-nota');
      if (!v) { nota.textContent = 'Non è un incantesimo dell\'elenco: scrivi la durata a mano.'; return; }
      const cb = inc.combattenti.find((x) => x.id === f.lanciatore.value);
      const li = n(f.li.value) || liDi(cb, v.nome);
      nota.textContent = 'Leggo la durata dal wiki…';
      try {
        const doc = new DOMParser().parseFromString(await ctx.wiki(paginaWiki(v.pagina)), 'text/html');
        const testo = (doc.querySelector('#mw-content-text')?.textContent || '').replace(/\s+/g, ' ');
        const durata = (testo.match(/Durata\s*:?\s*(.+?)(?=Tiro Salvezza|Resistenza agli Incantesimi|Descrizione|$)/i) || [])[1]?.trim() || '';
        if (!durata) { nota.textContent = 'Durata non trovata nella pagina: scrivila a mano.'; return; }
        const r = roundDaDurata(durata, li);
        if (r.round) { f.durata.value = r.valore; f.unita.value = r.unita; }
        if (!f.li.value && li) f.li.value = li;
        nota.textContent = `Durata: ${durata}${/livell/i.test(durata) ? ` (LI ${li || '?'})` : ''}${r.round ? ` → ${r.valore} ${r.unita}${r.unita !== 'round' ? ` (${r.round} round, senza avviso di scadenza)` : ''}` : ' → durata non a tempo: lascia vuoto o scrivila tu'}`;
      } catch (e) {
        nota.textContent = `Wiki non raggiungibile (${e.message}): scrivi la durata a mano.`;
      }
    },
    'inc-avviso-x'(el) {
      const inc = incontroDi(ctx.campagna(el.dataset.camp));
      inc.avvisi = el.dataset.avv ? (inc.avvisi || []).filter((a) => a.id !== el.dataset.avv) : [];
      ctx.salva();
      ctx.render();
    },
    'inc-registro-diario'(el) {
      const c = ctx.campagna(el.dataset.camp);
      copiaRegistro(c);
    },
    'inc-rimuovi'(el) {
      const { inc, cb } = cbDa(el);
      if (!cb) return;
      if (inc.attivo === cb.id) {
        const i = inc.combattenti.indexOf(cb);
        const altro = inc.combattenti[i + 1] || inc.combattenti[0];
        inc.attivo = altro && altro !== cb ? altro.id : null;
      }
      for (const x of cb.condizioni || []) scollegaCondizione(cb, x);
      // Gli effetti che aveva lanciato finiscono; da quelli che lo avevano come bersaglio esce
      for (const ef of [...(inc.effetti || [])]) {
        if (ef.lanciatoreId === cb.id) terminaEffetto(inc, ef, `${nomeCb(cb)} lascia lo scontro`);
        else if (ef.bersagli.includes(cb.id)) {
          const bId = ef.bonus?.[cb.id];
          const p = cb.pgId && bId ? ctx.personaggio(cb.pgId) : null;
          if (p) togliBonus(p, bId);
          ef.bersagli = ef.bersagli.filter((x) => x !== cb.id);
        }
      }
      if (inc.fase) annota(inc, `${nomeCb(cb)} lascia lo scontro`);
      inc.combattenti.splice(inc.combattenti.indexOf(cb), 1);
      ctx.salva();
      ctx.render();
    },
    'inc-pf'(el) {
      const { cb } = cbDa(el);
      const q = n(el.closest('.comb').querySelector('.inc-quanti').value);
      if (!cb || !q) return;
      const i = info(cb);
      const delta = Number(el.dataset.segno) * q;
      if (i.scheda === 'pf1') modificaPf(i.p, delta);
      // Starfinder: il danno toglie prima i Punti Stamina, poi i Punti Ferita; la cura va ai PF
      else if (i.scheda === 'sf') ctx.sf().danno(i.p, Math.abs(delta), delta < 0 ? -1 : 1);
      else if (i.scheda === 'dnd') ctx.dnd().danno(i.p, Math.abs(delta), delta < 0 ? -1 : 1);
      else if (i.scheda === 'pf2') ctx.pf2().danno(i.p, Math.abs(delta), delta < 0 ? -1 : 1);
      else {
        let nuovo = i.pf + delta;
        if (delta > 0 && i.pfMax > 0) nuovo = Math.min(nuovo, i.pfMax);
        cb.pf = nuovo;
      }
      const { inc } = cbDa(el);
      if (inc.fase) {
        const dopo = info(cb).pf;
        annota(inc, `${i.nome} ${delta < 0 ? `subisce ${-delta} danni` : `recupera ${delta} PF`} (PF ${dopo}${i.pfMax ? '/' + i.pfMax : ''})${dopo <= 0 && i.pf > 0 ? ' — a terra!' : ''}`);
      }
      ctx.salva();
      ctx.render();
    },
    'inc-cond'(el) {
      const { cb } = cbDa(el);
      const riga = el.closest('.comb');
      const nome = riga.querySelector('.inc-cond-nome').value.trim() || riga.querySelector('.inc-cond-sel')?.value || '';
      if (!cb || !nome) return;
      const durata = riga.querySelector('.inc-cond-durata').value;
      cb.condizioni = cb.condizioni || [];
      const cond = { id: uid(), nome, durata: durata === '' ? '' : Math.max(1, n(durata)) };
      const collegata = collegaCondizione(cb, cond);
      cb.condizioni.push(cond);
      const { inc } = cbDa(el);
      if (inc.fase) annota(inc, `${info(cb).nome}: ${nome}${cond.durata ? ` (${cond.durata} round)` : ''}`);
      ctx.salva();
      ctx.render();
      if (collegata) ctx.toast(`<b>${esc(nome)}</b>: penalità applicate alla scheda di ${esc(info(cb).nome)}`);
    },
    'inc-volo'(el) {
      const { inc, cb } = cbDa(el);
      if (!cb) return;
      const modo = el.closest('.comb-volo')?.querySelector('.inc-volo-sel')?.value || 'volare';
      cb.volo = { modo, altezza: 0, storia: {} };
      registraAltezza(inc, cb);
      ctx.salva();
      ctx.render();
    },
    'inc-altezza'(el) {
      const { inc, cb } = cbDa(el);
      if (!cb?.volo) return;
      cb.volo.altezza = n(cb.volo.altezza) + Number(el.dataset.d);
      registraAltezza(inc, cb);
      ctx.salva();
      ctx.render();
    },
    'inc-atterra'(el) {
      const { inc, cb } = cbDa(el);
      if (!cb?.volo) return;
      if (inc.fase) annota(inc, `${nomeCb(cb)} atterra${n(cb.volo.altezza) ? ` (era a ${fmtM(cb.volo.altezza)})` : ''}`);
      delete cb.volo;
      ctx.salva();
      ctx.render();
    },
    'inc-cond-info'(el) {
      const nome = el.dataset.nome;
      const pf2 = el.dataset.sistema === 'pf2';
      const breve = pf2 ? '' : EFFETTI_CONDIZIONI[norm(String(nome).replace(/\s+\d+$/, ''))] || '';
      apriInfo(nome, breve ? `<div class="info-fatti">${fatto('In breve', breve)}</div>` : '', paginaWiki(pf2 ? String(nome).replace(/\s+\d+$/, '') : paginaCondizione(nome)), estraiIncantesimo, pf2 ? 'pf2' : 'pf1');
    },
    'inc-cond-x'(el) {
      const { cb } = cbDa(el);
      if (!cb) return;
      for (const x of (cb.condizioni || []).filter((y) => y.id === el.dataset.cond)) scollegaCondizione(cb, x);
      cb.condizioni = (cb.condizioni || []).filter((x) => x.id !== el.dataset.cond);
      ctx.salva();
      ctx.render();
    },
  });

  function cambiaBrano(el, verso) {
    const c = ctx.campagna(el.dataset.camp);
    const l = musicaDi(c).brani.filter((b) => b.tipo !== 'esterno');
    if (!l.length) return;
    const i = l.findIndex((b) => b.id === suono.brano);
    suona(c, l[(i + verso + l.length) % l.length] || l[0]);
  }
  // Copia il registro dello scontro in fondo al diario dell'ultima sessione della campagna
  function copiaRegistro(c) {
    const reg = incontroDi(c).registro || [];
    if (!reg.length) { ctx.toast('Il registro è vuoto'); return; }
    const righe = [];
    let corrente = null;
    for (const x of reg) {
      if (x.round !== corrente) { corrente = x.round; righe.push(x.round === 0 ? 'Round di sorpresa' : `Round ${x.round}`); }
      if (!/^— Inizia il round/.test(x.testo)) righe.push(`- ${x.testo}`);
    }
    const s = ctx.aggiungiAlDiario(c.id, `⚔ Scontro\n${righe.join('\n')}`);
    ctx.toast(s ? `📜 Registro copiato nel diario della sessione <b>${esc(s)}</b>` : 'Registro non copiato', s ? '' : 'errore');
  }

  // Nuovo effetto a durata (incantesimo o altro) lanciato da un combattente su uno o più bersagli
  moduli['inc-effetto'] = (f) => {
    const c = ctx.campagna(f.get('camp'));
    const inc = incontroDi(c);
    const nome = f.get('nome').trim();
    if (!nome) return;
    const durata = f.get('durata');
    const unita = ['minuti', 'ore'].includes(f.get('unita')) ? f.get('unita') : 'round';
    const v = incantesimoDi(nome);
    // Si conta sempre in round; "inRound" = durata espressa in round, l'unica che dà l'avviso di scadenza
    const ef = { id: uid(), nome: v ? v.nome : nome, lanciatoreId: f.get('lanciatore'), bersagli: f.getAll('bersagli'),
      rimanenti: durata === '' || durata == null ? '' : Math.max(1, n(durata)) * ({ round: 1, minuti: 10, ore: 600 }[unita]), inRound: unita === 'round' && durata !== '' && durata != null, bonus: {} };
    inc.effetti = inc.effetti || [];
    inc.effetti.push(ef);
    if (ef.inRound && ef.rimanenti === 1) avvisaEffetto(inc, ef, 'ultimo');
    // Volare / Levitazione: i bersagli risultano in volo (altezza da segnare)
    const modoVolo = /^(volare|volo|volare superiore|volare di massa)$/.test(norm(ef.nome)) ? 'volare' : /^levitazione$/.test(norm(ef.nome)) ? 'levitazione' : '';
    if (modoVolo) {
      for (const id of ef.bersagli) {
        const cb = inc.combattenti.find((x) => x.id === id);
        if (!cb) continue;
        if (!cb.volo) { cb.volo = { modo: modoVolo, altezza: 0, storia: {} }; registraAltezza(inc, cb); }
        cb.volo.efId = ef.id;
      }
    }
    const collegati = collegaEffetto(inc, ef);
    const lanc = inc.combattenti.find((x) => x.id === ef.lanciatoreId);
    const su = ef.bersagli.map((id) => inc.combattenti.find((x) => x.id === id)).filter(Boolean).map(nomeCb);
    annota(inc, `✨ ${lanc ? nomeCb(lanc) : '?'} lancia ${ef.nome}${su.length ? ` su ${su.join(', ')}` : ''} (${ef.rimanenti === '' ? 'durata libera' : `${durata} ${unita}`})`);
    ctx.salva();
    ctx.render();
    if (collegati) ctx.toast(`✨ <b>${esc(ef.nome)}</b>: bonus attivo sulla scheda di ${collegati} PG, si spegne da solo alla scadenza`);
  };

  moduli['inc-mostro'] = (f) => {
    const c = ctx.campagna(f.get('camp'));
    const inc = incontroDi(c);
    const nome = f.get('nome').trim();
    const qta = Math.min(30, Math.max(1, n(f.get('qta')) || 1));
    // Mostro del bestiario: iniziativa, CA e PF dal blocco statistiche (se non scritti a mano)
    const sistema = sistemaDi(c);
    const m = sistema ? mostroDi(nome, sistema) : null;
    const dadiVita = m?.[12] && /\d+d\d+/.test(m[12]) ? m[12].match(/\d+d\d+(?:\s*[+-]\s*\d+)?/)[0].replace(/\s/g, '') : '';
    const espr = String(f.get('pf') || '').trim() || (m && f.get('tira') && dadiVita ? dadiVita : '');
    for (let i = 0; i < qta; i++) {
      let pf = m && !espr ? n(m[11]) : '';
      if (espr) {
        try { pf = /d/i.test(espr) ? Math.max(1, Dadi.tira(espr).totale) : n(espr); } catch (e) { ctx.toast(esc(e.message), 'errore'); return; }
      }
      const vuoto = (k) => f.get(k) === '' || f.get(k) == null;
      inc.combattenti.push({
        id: uid(), nome: qta > 1 ? `${m ? m[0] : nome} ${i + 1}` : m ? m[0] : nome, mostro: m ? m[0] : '', sistema: m ? sistema : '', iniz: '',
        modIniz: vuoto('modIniz') ? (m ? n(m[6]) : 0) : n(f.get('modIniz')),
        ca: vuoto('ca') ? (m ? m[8] : '') : n(f.get('ca')), pfMax: pf, pf, condizioni: [],
      });
    }
    ordina(inc);
    ctx.salva();
    ctx.render();
  };

  function applicaIncontro(el) {
    const c = ctx.campagna(el.dataset.camp);
    if (!c) return;
    const t = trova(incontroDi(c), el.dataset.inc);
    if (!t) return;
    t[0][t[1]] = valoreDa(el);
    // Cambiando i PF massimi di un mostro non ancora ferito, adegua anche quelli attuali
    if (t[1] === 'pfMax' && (t[0].pf === '' || t[0].pf == null)) t[0].pf = t[0].pfMax;
    ctx.salva();
  }

  // Aggiunge al regolamento PF1 le Conoscenze mancanti nelle versioni precedenti
  function migraRegolamento(r) {
    const nomi = new Set(r.abilita.map((a) => a.nome));
    let aggiunte = false;
    for (const nome of KT) if (!nomi.has(nome)) { r.abilita.push({ nome, car: 'INT', predefinito: '' }); aggiunte = true; }
    if (aggiunte) r.abilita.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }

  // =====================================================================
  // Interfaccia verso app.js
  // =====================================================================
  // ---- Mostri personalizzati (regole «Creazione Mostri» del wiki, dati in src/pf1-creazione-mostri.js) ----
  const CM = window.PF1_CREAZIONE_MOSTRI || null;
  const NUOVO_MOSTRO = () => ({
    gs: '1', tipo: 'Umanoide', taglia: 'Media', dv: '', ruolo: 'combattente', allineamento: '', velocita: '', difese: '', tesoro: 'medio',
    car: { FOR: 10, DES: 10, COS: 10, INT: 10, SAG: 10, CAR: 10 }, tsScelti: [], naturale: '', armatura: '', scudo: '', deviazione: '',
    attacchi: [{ id: uid(), nome: 'Schianto', tipo: 'mischia', dadi: '1d6', bonusColpire: '', bonusDanni: '', secondario: false }],
    capacita: [],
  });
  const valoreGs = (g) => (g === '1/2' ? 0.5 : n(g));
  const mediaDadi = (espr) => {
    const m = String(espr || '').replace(/\s/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!m) return n(espr);
    return Math.floor((n(m[1]) || 1) * (CM?.MEDIA_DADO[n(m[2])] ?? (n(m[2]) + 1) / 2)) + n(m[3]);
  };
  function calcolaMostroCreato(x, nome = '') {
    const T = CM.TIPI[x.tipo] || CM.TIPI.Umanoide;
    const st = CM.STATISTICHE[x.gs] || CM.STATISTICHE['1'];
    const iGs = Math.max(0, CM.GS.indexOf(x.gs));
    const tabDv = CM.DV_PER_TIPO[x.tipo] || CM.DV_PER_TIPO.Umanoide;
    const dvSugg = tabDv[Math.min(20, iGs)];
    const dv = Math.max(1, n(x.dv) || dvSugg);
    const car = x.car || {};
    const senza = (s) => car[s] === '' || car[s] == null || car[s] === '—';
    const mod = (s) => (senza(s) ? 0 : Math.floor((n(car[s]) - 10) / 2));
    const tg = CM.TAGLIE[x.taglia] || CM.TAGLIE.Media;
    const modTaglia = tg[5];
    // PF: media del dado per DV + COS (i non morti usano il Carisma, i costrutti non hanno Costituzione)
    const modPf = x.tipo === 'Non Morto' ? mod('CAR') : x.tipo === 'Costrutto' ? 0 : mod('COS');
    const pf = Math.max(1, Math.floor(dv * CM.MEDIA_DADO[T.dado]) + dv * modPf);
    const bab = T.bab === 'veloce' ? dv : T.bab === 'medio' ? Math.floor((dv * 3) / 4) : Math.floor(dv / 2);
    const buoni = typeof T.ts === 'number' ? (x.tsScelti || []).slice(0, T.ts) : T.ts.split('').filter(Boolean);
    const tsBase = (k) => (buoni.includes(k) ? 2 + Math.floor(dv / 2) : Math.floor(dv / 3));
    const ts = { T: tsBase('T') + (x.tipo === 'Non Morto' ? mod('CAR') : mod('COS')), R: tsBase('R') + mod('DES'), V: tsBase('V') + mod('SAG') };
    const ca = 10 + mod('DES') + n(x.naturale) + n(x.armatura) + n(x.scudo) + n(x.deviazione) + modTaglia;
    const contatto = 10 + mod('DES') + n(x.deviazione) + modTaglia;
    const impreparato = ca - Math.max(0, mod('DES'));
    // Attacchi: mischia con FOR, distanza con DES; i secondari hanno −5 e metà FOR ai danni
    const attacchi = (x.attacchi || []).map((a) => {
      const dist = a.tipo === 'distanza';
      const colpo = bab + (dist ? mod('DES') : mod('FOR')) + modTaglia + n(a.bonusColpire) - (a.secondario ? 5 : 0);
      const bDanni = a.bonusDanni !== '' && a.bonusDanni != null ? n(a.bonusDanni) : dist ? 0 : a.secondario ? Math.floor(mod('FOR') / 2) : mod('FOR');
      const dadi = String(a.dadi || '1d4').replace(/\s/g, '');
      const espr = `${dadi}${bDanni ? (bDanni > 0 ? '+' : '') + bDanni : ''}`;
      return { ...a, colpo, espr, media: Math.max(1, mediaDadi(dadi) + bDanni) };
    });
    const danni = attacchi.reduce((t, a) => t + a.media, 0);
    const migliore = attacchi.length ? Math.max(...attacchi.map((a) => a.colpo)) : null;
    const cdDi = (k) => 10 + Math.floor(dv / 2) + mod(k || 'COS');
    const capacita = (x.capacita || []).map((k) => ({ ...k, cd: k.ts ? cdDi(k.car) : null }));
    const cdMax = capacita.filter((k) => k.cd != null).reduce((t, k) => Math.max(t, k.cd), 0) || null;
    const conInt = !senza('INT') && n(car.INT) > 0;
    const talenti = conInt ? 1 + Math.floor((dv - 1) / 2) : 0;
    const gradi = conInt ? Math.max(1, T.gradi + mod('INT')) * dv : 0;
    const peMo = CM.PE_MO[x.gs] || CM.PE_MO['1'];
    const velSugg = ['Piccolissima', 'Minuta', 'Minuscola', 'Piccola'].includes(x.taglia) ? '6 m' : ['Grande', 'Enorme', 'Mastodontica', 'Colossale'].includes(x.taglia) ? '12 m' : '9 m';
    // Confronto con le linee guida del GS
    const g = valoreGs(x.gs);
    const avvisi = [];
    if (tg[0] !== '' && g < tg[0]) avvisi.push(`Una creatura ${x.taglia} di solito ha almeno GS ${tg[0]}.`);
    if (tg[1] !== '' && g > tg[1]) avvisi.push(`Una creatura ${x.taglia} di solito non supera GS ${tg[1]}.`);
    if (Math.abs(ca - st.ca) > 5) avvisi.push(`La CA si discosta di più di 5 dalla media (${st.ca}): il GS potrebbe essere sbagliato.`);
    const confr = (valore, atteso, tolleranza) => {
      if (valore == null) return { stato: '', diff: '' };
      const d = valore - atteso;
      return { stato: Math.abs(d) <= tolleranza ? 'ok' : Math.abs(d) <= tolleranza * 2 ? 'vicino' : 'lontano', diff: d };
    };
    const attAtteso = x.ruolo === 'incantatore' ? st.attMin : st.attMagg;
    const confronti = [
      ['Punti ferita', pf, `${st.pf}`, confr(pf, st.pf, Math.max(3, Math.round(st.pf * 0.15)))],
      ['Classe Armatura', ca, `${st.ca}`, confr(ca, st.ca, 1)],
      [x.ruolo === 'incantatore' ? 'Attacco (minore)' : 'Attacco (maggiore)', migliore, `${attAtteso >= 0 ? '+' : ''}${attAtteso}`, confr(migliore, attAtteso, 1)],
      ['Danno medio (tutti gli attacchi)', attacchi.length ? danni : null, `${st.danniBasso}–${st.danniAlto}`, attacchi.length ? (danni >= st.danniBasso && danni <= st.danniAlto ? { stato: 'ok', diff: 0 } : confr(danni, danni < st.danniBasso ? st.danniBasso : st.danniAlto, Math.max(2, Math.round(st.danniAlto * 0.1)))) : { stato: '', diff: '' }],
      [x.ruolo === 'incantatore' ? 'CD capacità (primaria)' : 'CD capacità (secondaria)', cdMax, `${x.ruolo === 'incantatore' ? st.cdPrim : st.cdSec}`, confr(cdMax, x.ruolo === 'incantatore' ? st.cdPrim : st.cdSec, 1)],
      ...['T', 'R', 'V'].map((k) => [`TS ${{ T: 'Tempra', R: 'Riflessi', V: 'Volontà' }[k]} (${buoni.includes(k) ? 'buono' : 'scarso'})`, ts[k], `${buoni.includes(k) ? st.tsBuono : st.tsScarso}`, confr(ts[k], buoni.includes(k) ? st.tsBuono : st.tsScarso, 1)]),
    ];
    const s = (v) => (v >= 0 ? `+${v}` : String(v));
    const stringa = (lista) => lista.map((a) => `${a.nome || 'attacco'} ${s(a.colpo)} (${a.espr})`).join(', ');
    const bmc = bab + mod('FOR') - modTaglia;
    const dmc = 10 + bab + mod('FOR') + mod('DES') - modTaglia;
    const pfEspr = `${dv}d${T.dado}${dv * modPf ? (dv * modPf > 0 ? '+' : '') + dv * modPf : ''}`;
    // Stesso formato dei mostri del bestiario: così tracker e scheda li usano allo stesso modo
    const riga = [nome, x.gs, peMo[0], x.tipo, x.taglia, x.allineamento || '', mod('DES'), 0, ca, contatto, impreparato, pf, pfEspr,
      [ts.T, ts.R, ts.V], x.difese || '', x.velocita || velSugg, stringa(attacchi.filter((a) => a.tipo !== 'distanza')), stringa(attacchi.filter((a) => a.tipo === 'distanza')),
      ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'].map((k) => (senza(k) ? null : n(car[k]))), bab, bmc, dmc, ''];
    riga.personalizzato = true;
    return { T, st, dv, dvSugg, pf, bab, ts, buoni, ca, contatto, impreparato, attacchi, danni, migliore, capacita, cdDi, talenti, gradi, peMo, velSugg, avvisi, confronti, bmc, dmc, modTaglia, mod, riga, pfEspr };
  }
  // I mostri creati nelle schede valgono come voci del bestiario (dopo quelli ufficiali)
  function mostroPersonalizzato(nome) {
    if (!CM || !nome) return null;
    const p = (ctx.mostriCreati?.() || []).find((x) => norm(x.nome) === norm(nome));
    return p ? calcolaMostroCreato(p.creatoMostro, p.nome).riga : null;
  }

  function editorMostro(p) {
    if (!CM) return '<p class="muto">Regole di creazione non caricate.</p>';
    const x = p.creatoMostro;
    const v = calcolaMostroCreato(x, p.nome);
    const id = p.id;
    const M = (perc, val, extra = '') => `<input data-mc="${esc(perc)}" data-id="${id}" value="${esc(val ?? '')}" ${extra}>`;
    const N = (perc, val, extra = '') => M(perc, val, `type="number" data-tipo="numero" ${extra}`);
    const S = (perc, lista, val) => `<select data-mc="${esc(perc)}" data-id="${id}">${opz(lista, val)}</select>`;
    const s = (n2) => (n2 >= 0 ? `+${n2}` : String(n2));
    const T = v.T;
    const sceltaTs = typeof T.ts === 'number' ? `<div class="pf-riga"><span class="muto">TS buoni (${T.ts === 2 ? 'due' : 'uno'} a scelta):</span>${['T', 'R', 'V'].map((k) => `<label class="pf-chk"><input type="checkbox" data-azione="mc-ts" data-id="${id}" data-k="${k}" ${(x.tsScelti || []).includes(k) ? 'checked' : ''}> ${{ T: 'Tempra', R: 'Riflessi', V: 'Volontà' }[k]}</label>`).join('')}</div>` : '';
    const car = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'].map((k) => `<label class="mc-car"><span>${k}</span>${M(`car|${k}`, x.car?.[k], 'class="mini" placeholder="—" title="Vuoto o — = nessun punteggio"')}<small class="muto">${x.car?.[k] === '' || x.car?.[k] == null ? '' : s(v.mod(k))}</small></label>`).join('');
    const attacchi = (x.attacchi || []).map((a, i) => {
      const r = v.attacchi[i];
      return `<div class="pf-riga mc-riga">
        ${M(`attacchi|${i}|nome`, a.nome, 'placeholder="Nome (es. Morso)" class="pf-largo"')}
        ${S(`attacchi|${i}|tipo`, [['mischia', 'Mischia'], ['distanza', 'Distanza']], a.tipo)}
        <label>Danni ${M(`attacchi|${i}|dadi`, a.dadi, 'class="pf-corto" placeholder="1d6"')}</label>
        <label title="Vuoto = FOR (mischia) o nulla (distanza)">Bonus danni ${N(`attacchi|${i}|bonusDanni`, a.bonusDanni, 'class="mini" placeholder="auto"')}</label>
        <label title="Talenti, armi magiche…">Bonus colpire ${N(`attacchi|${i}|bonusColpire`, a.bonusColpire, 'class="mini" placeholder="0"')}</label>
        <label class="pf-chk" title="Attacco naturale secondario: −5 a colpire, metà FOR ai danni"><input type="checkbox" data-mc="attacchi|${i}|secondario" data-id="${id}" ${a.secondario ? 'checked' : ''}> secondario</label>
        <b>${s(r.colpo)} (${esc(r.espr)})</b> <small class="muto">media ${r.media}</small>
        <button class="btn-x" data-azione="mc-togli" data-id="${id}" data-lista="attacchi" data-i="${i}" title="Togli">×</button></div>`;
    }).join('');
    const capacita = (x.capacita || []).map((k, i) => `<div class="pf-riga mc-riga">
        ${M(`capacita|${i}|nome`, k.nome, 'placeholder="Capacità speciale (es. Arma a soffio 6d6 fuoco)" class="pf-largo"')}
        <label>TS ${S(`capacita|${i}|ts`, [['', 'nessuno'], ['Tempra', 'Tempra'], ['Riflessi', 'Riflessi'], ['Volontà', 'Volontà']], k.ts || '')}</label>
        <label title="Caratteristica della CD (di solito COS o CAR)">CD su ${S(`capacita|${i}|car`, ['COS', 'CAR', 'INT', 'SAG', 'DES', 'FOR'].map((c2) => [c2, c2]), k.car || 'COS')}</label>
        ${v.capacita[i].cd != null ? `<b>CD ${v.capacita[i].cd}</b>` : ''}
        <button class="btn-x" data-azione="mc-togli" data-id="${id}" data-lista="capacita" data-i="${i}" title="Togli">×</button></div>`).join('');
    const confronti = v.confronti.map(([voce, valore, atteso, c2]) => `<tr class="mc-${c2.stato}">
        <td>${esc(voce)}</td><td><b>${valore == null ? '—' : esc(String(valore))}</b></td><td>${esc(atteso)}</td>
        <td>${c2.stato === 'ok' ? '✓ in linea' : c2.stato === 'vicino' ? `≈ ${c2.diff > 0 ? '+' : ''}${c2.diff}` : c2.stato === 'lontano' ? `⚠ ${c2.diff > 0 ? '+' : ''}${c2.diff}` : ''}</td></tr>`).join('');
    const tg = CM.TAGLIE[x.taglia] || CM.TAGLIE.Media;
    return `<div class="mc-editor">
      <div class="pf-riga">
        <label>GS ${S('gs', CM.GS.map((g) => [g, g]), x.gs)}</label>
        <label>Tipo ${S('tipo', Object.keys(CM.TIPI).map((t) => [t, t]), x.tipo)}</label>
        <label>Taglia ${S('taglia', Object.keys(CM.TAGLIE).map((t) => [t, t]), x.taglia)}</label>
        <label title="Combattente: si confronta con l'attacco maggiore e la CD secondaria; incantatore: attacco minore e CD primaria">Ruolo ${S('ruolo', [['combattente', 'Combatte con le armi'], ['incantatore', 'Usa incantesimi/capacità']], x.ruolo)}</label>
        <label>Dadi Vita ${N('dv', x.dv, `class="mini" min="1" placeholder="${v.dvSugg}"`)}</label>
        <span class="muto">d${T.dado} · BAB ${T.bab} (${s(v.bab)}) · suggeriti ${v.dvSugg} DV per un ${esc(x.tipo)} di GS ${esc(x.gs)}</span>
        <label>Allineamento ${M('allineamento', x.allineamento, 'class="pf-corto" placeholder="es. CM"')}</label>
      </div>
      <h4>Caratteristiche <button class="btn-mini" data-azione="mc-taglia" data-id="${id}" title="FOR ${tg[2]}, DES ${tg[3]}, COS ${tg[4]}">valori base per ${esc(x.taglia)}</button></h4>
      <div class="mc-car-griglia">${car}</div>
      ${sceltaTs}
      <h4>Difese</h4>
      <div class="pf-riga">
        <label>Armatura naturale ${N('naturale', x.naturale, 'class="mini" min="0"')}</label>
        <label>Armatura ${N('armatura', x.armatura, 'class="mini" min="0"')}</label>
        <label>Scudo ${N('scudo', x.scudo, 'class="mini" min="0"')}</label>
        <label>Deviazione ${N('deviazione', x.deviazione, 'class="mini" min="0"')}</label>
        <span>CA <b>${v.ca}</b>, contatto ${v.contatto}, impreparato ${v.impreparato} · PF <b>${v.pf}</b> (${esc(v.pfEspr)}) · TS Tem ${s(v.ts.T)}, Rif ${s(v.ts.R)}, Vol ${s(v.ts.V)}</span>
      </div>
      <div class="pf-riga"><label class="pf-largo">Difese speciali ${M('difese', x.difese, 'placeholder="RD 5/magia, resistenza al fuoco 10, immunità…" class="pf-largo"')}</label>
        <label>Velocità ${M('velocita', x.velocita, `class="pf-corto" placeholder="${v.velSugg}"`)}</label></div>
      <h4>Attacchi <small class="muto">danno medio totale ${v.danni}</small></h4>
      ${attacchi || '<p class="muto">Nessun attacco.</p>'}
      <div class="pf-piede"><button class="btn-piccolo" data-azione="mc-aggiungi" data-id="${id}" data-lista="attacchi">+ Attacco</button></div>
      <h4>Capacità speciali <small class="muto">CD = 10 + ½ DV + caratteristica</small></h4>
      ${capacita}
      <div class="pf-piede"><button class="btn-piccolo" data-azione="mc-aggiungi" data-id="${id}" data-lista="capacita">+ Capacità</button></div>
      <h4>Confronto con le linee guida per GS ${esc(x.gs)}</h4>
      <table class="mc-confronto"><thead><tr><th>Statistica</th><th>Il tuo mostro</th><th>Media GS ${esc(x.gs)}</th><th></th></tr></thead><tbody>${confronti}</tbody></table>
      ${v.avvisi.map((a) => `<p class="oltre pf-aiuto">⚠ ${esc(a)}</p>`).join('')}
      <div class="mc-riepilogo">
        <span>Iniziativa <b>${s(v.mod('DES'))}</b></span><span>BAB <b>${s(v.bab)}</b></span><span>BMC <b>${s(v.bmc)}</b> · DMC <b>${v.dmc}</b></span>
        <span>Talenti <b>${v.talenti}</b></span><span>Gradi di abilità <b>${v.gradi}</b></span>
        <span>PE <b>${v.peMo[0].toLocaleString('it-IT')}</b></span>
        <span>Tesoro ${S('tesoro', [['lento', 'lento'], ['medio', 'medio'], ['veloce', 'veloce']], x.tesoro || 'medio')} <b>${v.peMo[{ lento: 1, medio: 2, veloce: 3 }[x.tesoro || 'medio']].toLocaleString('it-IT')} mo</b></span>
      </div>
      <p class="muto pf-aiuto">Abilità di classe del tipo ${esc(x.tipo)}: ${esc(T.abil)}. Le medie per GS sono indicative: un mostro forte in un campo (es. il danno) di solito è più debole in un altro. Il mostro è usabile nello scontro con queste statistiche.</p>
    </div>`;
  }

  // Mostro della campagna (scheda di tipo «Mostro») mandato nello scontro: dal bestiario, con il suo nome
  function aggiungiMostro(c, p, qta = 1) {
    const inc = incontroDi(c);
    const sistema = sistemaDi(c);
    const m = sistema ? mostroDi(p.mostro || p.nome, sistema) : null;
    const quanti = Math.min(30, Math.max(1, n(qta) || 1));
    for (let i = 0; i < quanti; i++) {
      const pf = m ? n(m[11]) : '';
      inc.combattenti.push({
        id: uid(), nome: quanti > 1 ? `${p.nome} ${i + 1}` : p.nome, mostro: m ? m[0] : '', sistema: m ? sistema : '', iniz: '',
        modIniz: m ? n(m[6]) : 0, ca: m ? m[8] : '', pfMax: pf, pf, condizioni: [], schedaMostro: p.id,
      });
    }
    ordina(inc);
    ctx.salva();
    return quanti;
  }

  return {
    CAMPI_CALCOLATI,
    bestiario: (c) => (sistemaDi(c) ? bestiario(sistemaDi(c)) : []),
    mostroDi: (nome, c) => (sistemaDi(c) ? mostroDi(nome, sistemaDi(c)) : null),
    sistemaDi,
    aggiungiMostro,
    editorMostro,
    creaMostroVuoto: NUOVO_MOSTRO,
    iniziativa: (p) => calcola(p, ctx.regDi(p)).init,
    // Calcoli completi della scheda (usati dalle prove in prove/)
    calcola: (p) => calcola(p, ctx.regDi(p)),
    requisitiPrestigio: (nome, p) => requisitiPrestigio(nome, p, dati(p), calcola(p, ctx.regDi(p))),
    vistaScheda,
    vistaTavolo,
    vistaIncontro,
    vistaSchermo,
    // Schermo dei giocatori: dati (anche per la sessione dal vivo), disegno, tiri pubblici
    datiSchermo, renderSchermo, tiroSulloSchermo,
    // Sessione dal vivo (app.js): PF del personaggio come li vede il tracker, e una riga nel registro dello scontro in corso
    pfDalVivo: (pgId) => { try { const i = info({ pgId }); return { pf: i.pf, pfMax: i.pfMax, ps: i.ps, psMax: i.psMax }; } catch { return null; } },
    annotaDalVivo: (c, testo) => { const inc = c.incontro; if (inc?.fase) annota(inc, testo); },
    vistaGrimorio,
    vistaBreviario,
    migraRegolamento,
    azioni,
    moduli,
    // restituisce true se l'evento riguardava il modulo
    input(el) {
      // Ricerca nel breviario: ridisegna e rimette il cursore nel campo
      if (el.dataset.brevFiltro !== undefined) {
        breviario.filtro = el.value;
        const pos = el.selectionStart;
        ctx.render();
        const nuovo = document.querySelector('[data-brev-filtro]');
        if (nuovo) { nuovo.focus(); nuovo.setSelectionRange(pos, pos); }
        return true;
      }
      // Campi dell'editor dei mostri personalizzati
      if (el.dataset.mc) {
        const x = ctx.personaggio(el.dataset.id)?.creatoMostro;
        const t = x ? trova(x, el.dataset.mc) : null;
        if (t) { t[0][t[1]] = el.type === 'checkbox' ? el.checked : valoreDa(el); ctx.salva(); }
        return true;
      }
      if (el.dataset.musicaVolume) {
        const c = ctx.campagna(el.dataset.musicaVolume);
        musicaDi(c).volume = Number(el.value);
        if (suono.audio && suono.campagna === c.id) suono.audio.volume = Number(el.value);
        ctx.salva();
        return true;
      }
      if (el.dataset.musicaRipeti) { musicaDi(ctx.campagna(el.dataset.musicaRipeti)).ripeti = el.value; ctx.salva(); return true; }
      // Scelte del pannello "Sali di livello" (in memoria fino alla conferma)
      if (el.dataset.salita) {
        if (salita) salita[el.dataset.salita] = el.value;
        if (el.dataset.salita === 'classe' && salita) salita.car = salita.car || '';
        ctx.render();
        return true;
      }
      // Filtri dell'elenco talenti: ridisegna solo l'elenco, così il campo non perde il fuoco
      if (el.dataset.filtroTalenti) {
        filtriTalenti[el.dataset.filtroTalenti] = el.value;
        const box = document.getElementById('elenco-talenti');
        if (box) box.innerHTML = listaTalentiHtml(ctx.personaggio(box.dataset.pg));
        return true;
      }
      if (el.dataset.pf1) { applicaScheda(el); return true; }
      if (el.dataset.inc && el.dataset.camp) { applicaIncontro(el); return true; }
      // caratteristiche (binding generico) dentro una scheda PF1: ricalcola
      const sch = el.closest('[data-pf1-scheda]');
      if (sch) { const p = ctx.personaggio(sch.dataset.pf1Scheda); if (p) aggiorna(p); }
      return false;
    },
    change(el) {
      if (el.dataset.mc) {
        // Le scelte (GS, tipo, taglia…) cambiano i valori suggeriti: si ridisegna
        if (el.tagName === 'SELECT' || el.type === 'checkbox') {
          const x = ctx.personaggio(el.dataset.id)?.creatoMostro;
          const t = x ? trova(x, el.dataset.mc) : null;
          if (t) { t[0][t[1]] = el.type === 'checkbox' ? el.checked : valoreDa(el); ctx.salva(); }
        }
        ctx.render();
        return true;
      }
      if (el.dataset.musicaVolume || el.dataset.musicaRipeti) return true;
      if (el.dataset.filtroTalenti || el.dataset.salita) return true;
      if (el.dataset.pf1) {
        if (el.dataset.ridisegnaPf1 !== undefined) { ctx.render(); return true; }
        cambioScheda(el);
        return true;
      }
      if (el.dataset.inc && el.dataset.camp) {
        if (el.dataset.inc.endsWith('|iniz')) { ordina(incontroDi(ctx.campagna(el.dataset.camp))); ctx.salva(); }
        // Altezza scritta a mano: entra nello storico del round e nel registro
        const voloM = el.dataset.inc.match(/^combattenti#([^|]+)\|volo\|altezza$/);
        if (voloM) {
          const inc = incontroDi(ctx.campagna(el.dataset.camp));
          const cb = inc.combattenti.find((x) => x.id === voloM[1]);
          if (cb) { registraAltezza(inc, cb); ctx.salva(); }
        }
        ctx.render();
        return true;
      }
      return false;
    },
  };
};
