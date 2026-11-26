'use strict';
// Astronavi di Starfinder: costruzione (struttura, sistemi, armi, Punti Costruzione e UNE), statistiche calcolate,
// equipaggio con i bonus presi dalle schede dei personaggi, combattimento (Punti Scafo, scudi per quadrante, danni critici).
// Dati in src/sf-astronavi-dati.js (wiki Absalom Outsider). app.js chiama window.creaAstronavi(ctx).
window.creaAstronavi = function creaAstronavi(ctx) {
  const A = window.SF_ASTRONAVI || { categorie: [], taglie: [], strutture: {}, armi: [], critici: [] };
  const { esc } = ctx;
  const n = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? 0 : Number(v));
  const segno = (v) => (v >= 0 ? '+' : '') + v;
  const WIKI = 'https://starfinder.altervista.org/wiki/';
  const ARCHI = ['prua', 'babordo', 'tribordo', 'poppa', 'torretta'];
  const QUADRANTI = ['prua', 'babordo', 'tribordo', 'poppa'];
  const CLASSI = ['leggera', 'pesante', 'principale', 'spinale'];
  const STATI = ['operativo', 'difettoso', 'malfunzionante', 'fuori uso'];
  const PENALITA = [0, -2, -4, null]; // null = l'azione fallisce
  // Sistemi colpiti dai critici (stesso ordine della tabella) e ruolo che ne subisce la condizione
  const SISTEMI = [['supporto', 'Supporto vitale', 'capitano'], ['sensori', 'Sensori', 'scientifici'], ['armi', "Sistemi d'arma", 'artiglieri'], ['motori', 'Motori', 'pilota'], ['nucleo', 'Nucleo energetico', 'ingegneri']];
  const RUOLI = [
    ['capitano', 'Capitano', false], ['pilota', 'Pilota', false], ['ingegneri', 'Ingegneri', true], ['artiglieri', 'Artiglieri', true],
    ['scientifici', 'Ufficiali scientifici', true], ['magici', 'Ufficiali magici', true], ['primi', 'Primi ufficiali', true],
  ];

  // ---- Dati della nave ----
  const nuova = (campagnaId, nome = 'Nuova astronave') => ({
    id: ctx.uid(), campagnaId, nome, categoria: '1', struttura: '', nucleo: '', propulsori: '', armatura: '', computer: '', difese: '', motoreDeriva: '',
    quartieri: '', sensori: '', scudi: '', paratie: '', scafo: '', comparti: [], sicurezza: [], altri: [], supporti: [], scudiQuad: {},
    equipaggio: { capitano: '', pilota: '', ingegneri: [], artiglieri: [], scientifici: [], magici: [], primi: [] },
    combattimento: { danni: 0, temp: null, scudi: null, critici: {} }, note: '',
    png: { attivo: false, superiore: 'pilota' }, // equipaggio PNG standard (navi del master)
  });
  const normalizza = (v) => {
    const base = nuova(v.campagnaId, v.nome);
    for (const k of Object.keys(base)) if (v[k] === undefined) v[k] = base[k];
    for (const [k] of RUOLI) if (v.equipaggio[k] === undefined) v.equipaggio[k] = base.equipaggio[k];
    return v;
  };
  const struttura = (v) => A.strutture[v.struttura] || null;
  const taglia = (v) => { const s = struttura(v); return A.taglie.find((t) => t[0] === s?.taglia) || null; };
  const catTaglia = (v) => taglia(v)?.[2] || 1;
  const trovaIn = (lista, nome) => (A[lista] || []).find((x) => x[0] === nome) || null;
  const numCategoria = (s) => ({ '¼': 0.25, '⅓': 1 / 3, '½': 0.5 }[s] ?? n(s));
  // Costo in Punti Costruzione: numero, [n, 'taglia'] = n × categoria di taglia; un testo (es. «Speciale») non si conta
  const pc = (c, v) => (typeof c === 'number' ? c : Array.isArray(c) ? c[0] * catTaglia(v) : 0);
  const COSTO = { nuclei: 3, propulsori: 5, armature: 4, computer: 4, difese: 3, motoriDeriva: 4, quartieri: 1, sensori: 3, scudi: 6, paratie: 2, scafo: 2 };
  const UNE = { propulsori: 4, computer: 3, difese: 2, scudi: 5 };
  const CAMPI = [['nucleo', 'nuclei', 'Nucleo energetico'], ['propulsori', 'propulsori', 'Propulsori'], ['armatura', 'armature', 'Armatura'], ['computer', 'computer', 'Computer'],
    ['difese', 'difese', 'Contromisure difensive'], ['scudi', 'scudi', 'Scudi'], ['sensori', 'sensori', 'Sensori'], ['motoreDeriva', 'motoriDeriva', 'Motore Deriva'],
    ['quartieri', 'quartieri', "Quartieri dell'equipaggio"], ['paratie', 'paratie', 'Paratie rinforzate'], ['scafo', 'scafo', 'Scafo irrobustito']];
  const MULTI = [['comparti', 'comparti', 'Comparti adattabili'], ['sicurezza', 'sicurezza', 'Sicurezza'], ['altri', 'altri', 'Altri sistemi']];

  // Supporti per le armi: dalla struttura, più quelli aggiunti o migliorati (Costruire le Astronavi, «Nuovi supporti per le armi»)
  function supportiDaStruttura(v) {
    const s = struttura(v);
    const vecchi = v.supporti || [];
    const out = [];
    for (const arco of ARCHI) {
      (s?.supporti[arco] || []).forEach((classe, i) => {
        const prima = vecchi.filter((x) => x.arco === arco && x.orig)[i];
        out.push({ id: prima?.id || ctx.uid(), arco, classe: prima?.classe || classe, orig: classe, arma: prima?.arma || '' });
      });
    }
    return [...out, ...vecchi.filter((x) => !x.orig)];
  }
  const costoMiglioria = (da, a, arco) => {
    let c = 0;
    if (CLASSI.indexOf(da) < 1 && CLASSI.indexOf(a) >= 1) c += arco === 'torretta' ? 6 : 4;
    if (CLASSI.indexOf(da) < 2 && CLASSI.indexOf(a) >= 2) c += 5;
    return c;
  };
  const costoSupporto = (s) => (s.orig ? 0 : s.arco === 'torretta' ? 5 : 3) + costoMiglioria(s.orig || 'leggera', s.classe, s.arco);
  const maxPerArco = (v) => (catTaglia(v) <= 2 ? 2 : catTaglia(v) <= 4 ? 3 : 4);
  const armaDi = (nome) => A.armi.find((a) => a[2] === nome) || null;

  // ---- Calcoli ----
  function calcola(v, personaggi = []) {
    normalizza(v);
    const s = struttura(v);
    const t = taglia(v);
    const ct = catTaglia(v);
    const riga = A.categorie.find((r) => r[0] === v.categoria) || A.categorie.find((r) => r[0] === '1') || ['1', 55, false];
    const cat = numCategoria(riga[0]);
    const pcTotali = riga[1];
    const aumenti = A.categorie.filter((r) => r[2] && numCategoria(r[0]) <= cat).length;
    const sel = Object.fromEntries(CAMPI.map(([k, lista]) => [k, trovaIn(lista, v[k])]));
    const multi = Object.fromEntries(MULTI.map(([k, lista]) => [k, (v[k] || []).map((x) => trovaIn(lista, x)).filter(Boolean)]));
    // Punti Costruzione spesi
    const voci = [];
    if (s) voci.push(['Struttura ' + v.struttura, s.costo]);
    for (const [k, lista, et] of CAMPI) if (sel[k]) voci.push([et, pc(sel[k][COSTO[lista]], v), typeof sel[k][COSTO[lista]] === 'string' ? sel[k][COSTO[lista]] : '']);
    for (const [k, , et] of MULTI) for (const x of multi[k]) voci.push([`${et}: ${x[0]}`, pc(x[x.length - 1], v), typeof x[x.length - 1] === 'string' ? x[x.length - 1] : '']);
    const supporti = v.supporti || [];
    for (const sp of supporti) {
      const a = armaDi(sp.arma);
      if (a) voci.push([`${sp.arma} (${sp.arco})`, a[7]]);
      const cs = costoSupporto(sp);
      if (cs) voci.push([`Supporto ${sp.classe} (${sp.arco}) ${sp.orig ? 'migliorato' : 'aggiunto'}`, cs]);
    }
    const pcSpesi = voci.reduce((x, y) => x + y[1], 0);
    // Energia (UNE): prodotte dal nucleo, consumate dai sistemi
    const uneNucleo = sel.nucleo?.[2] || 0;
    const consumi = [];
    for (const [k, lista, et] of CAMPI) if (sel[k] && UNE[lista] !== undefined && sel[k][UNE[lista]]) consumi.push([et, sel[k][UNE[lista]]]);
    for (const [k, , et] of MULTI) for (const x of multi[k]) if (n(x[1])) consumi.push([`${et}: ${x[0]}`, n(x[1])]);
    for (const sp of supporti) { const a = armaDi(sp.arma); if (a?.[6]) consumi.push([sp.arma, a[6]]); }
    const uneUsate = consumi.reduce((x, y) => x + y[1], 0);
    // Difese e movimento
    const arm = sel.armatura;
    const pen = (testo, re) => n((String(testo || '').match(re) || [])[1] || 0);
    const penAB = pen(arm?.[3], /(-\d+)\s*AB/);
    const virataArm = pen(arm?.[3], /\+(\d+)\s*distanza di virata/);
    const deflettore = String(sel.scudi?.[4] || '');
    const pilota = membro(v.equipaggio.pilota, personaggi);
    const pngAttivo = !!v.png?.attivo;
    const gradiPilota = pilota ? pilota.gradi('Pilotare') : pngAttivo ? Math.max(1, Math.floor(numCategoria(v.categoria))) : 0;
    const mt = t?.[3] || 0;
    const ca = 10 + (arm?.[1] || 0) + mt + gradiPilota + pen(deflettore, /\+(\d+)\s*CA/);
    const ab = 10 + (sel.difese?.[1] || 0) + mt + gradiPilota + penAB + pen(deflettore, /\+(\d+)\s*AB/);
    const psMax = s ? s.ps + s.incremento * aumenti : 0;
    const scBonus = sel.scafo ? pc(sel.scafo[1], v) : 0;
    const scudiTot = sel.scudi?.[1] || 0;
    // Problemi di costruzione
    const avvisi = [];
    if (!s) avvisi.push('scegli la struttura base');
    if (pcSpesi > pcTotali) avvisi.push(`Punti Costruzione superati: ${pcSpesi}/${pcTotali}`);
    if (sel.nucleo && t && !sel.nucleo[1].includes(t[1])) avvisi.push(`il nucleo ${sel.nucleo[0]} non è per astronavi ${t[0].toLowerCase()} (${sel.nucleo[1].join(', ')})`);
    if (!sel.nucleo && s) avvisi.push('manca il nucleo energetico');
    if (sel.propulsori && t && sel.propulsori[1] !== t[1]) avvisi.push(`i propulsori ${sel.propulsori[0]} non sono per astronavi ${t[0].toLowerCase()}`);
    if (!sel.propulsori && s) avvisi.push('mancano i propulsori');
    if (uneUsate > uneNucleo) avvisi.push(`energia: i sistemi chiedono ${uneUsate} UNE, il nucleo ne produce ${uneNucleo} (tutti insieme non funzionano)`);
    if (sel.motoreDeriva && uneNucleo < sel.motoreDeriva[2]) avvisi.push(`il motore Deriva ${sel.motoreDeriva[0]} richiede un nucleo da almeno ${sel.motoreDeriva[2]} UNE`);
    const maxDeriva = A.taglie.find((x) => x[0] === sel.motoreDeriva?.[3]);
    if (maxDeriva && ct > maxDeriva[2]) avvisi.push(`il motore Deriva ${sel.motoreDeriva[0]} va solo su astronavi fino a ${maxDeriva[0].toLowerCase()}`);
    if (s && multi.comparti.length > s.comparti) avvisi.push(`comparti adattabili: ${multi.comparti.length} su ${s.comparti} disponibili`);
    for (const arco of ARCHI) { const k = supporti.filter((x) => x.arco === arco).length; if (k > maxPerArco(v)) avvisi.push(`${arco}: ${k} supporti, al massimo ${maxPerArco(v)} per una nave ${t?.[0].toLowerCase() || ''}`); }
    for (const sp of supporti) {
      const a = armaDi(sp.arma);
      if (a && CLASSI.indexOf(a[0]) > CLASSI.indexOf(sp.classe)) avvisi.push(`${sp.arma} (${a[0]}) non entra in un supporto ${sp.classe}`);
      if (sp.classe === 'pesante' && ct < 3) avvisi.push('armi pesanti solo su astronavi Medie o più grandi');
      if (sp.classe === 'principale' && (ct < 5 || sp.arco === 'torretta')) avvisi.push('armi principali solo su astronavi Enormi o più grandi, e mai in torretta');
    }
    const c = {
      s, t, cat, ct, pcTotali, pcSpesi, voci, uneNucleo, uneUsate, consumi, ca, ab, psMax, sd: s?.sd || 0, sc: (s?.sc || 0) + scBonus,
      velocita: sel.propulsori?.[2] || 0, pilotareNave: (s?.pilotare || 0) + (sel.propulsori?.[3] || 0), virata: (s?.virata || 0) + virataArm,
      scudiTot, scudiNome: sel.scudi?.[0] || '', tempMax: arm?.[2] || 0, computer: sel.computer, sensori: sel.sensori, avvisi, sel, gradiPilota,
    };
    c.equipaggio = equipaggio(v, c, personaggi);
    return c;
  }

  // Un membro dell'equipaggio: il personaggio con le sue prove calcolate dalla scheda di Starfinder
  function membro(id, personaggi) {
    const p = personaggi.find((x) => x.id === id);
    if (!p) return null;
    let c = null;
    try { c = ctx.sfCalcola(p); } catch { c = null; }
    if (!c) return { p, nome: p.nome, tot: () => 0, gradi: () => 0, bab: 0, des: 0 };
    return {
      p, nome: p.nome, bab: c.bab || 0, des: c.m?.DES || 0,
      tot: (a) => c.abil?.[a]?.tot ?? 0,
      gradi: (a) => Math.min(c.liv || 0, n(p.sf?.abil?.[a]?.gradi) + n(c.abil?.[a]?.gratis)),
    };
  }
  // Bonus di ogni ruolo (prove di base; il computer aggiunge il bonus di un nodo a una prova per round)
  function equipaggio(v, c, personaggi) {
    const crit = v.combattimento.critici || {};
    const nucleo = n(crit.nucleo);
    const penNucleo = nucleo === 2 ? -2 : nucleo >= 3 ? -4 : 0;
    const penSist = (k) => PENALITA[n(crit[k])];
    const mods = (sistema, suNucleo = false) => { const p = penSist(sistema); return p === null ? null : p + (suNucleo ? 0 : penNucleo); };
    const out = [];
    const aggiungi = (ruolo, id, prove) => { const m = membro(id, personaggi); if (m) out.push({ ruolo, id, nome: m.nome, prove: prove(m) }); };
    const conPen = (val, pen) => (pen === null ? null : val + pen);
    aggiungi('capitano', v.equipaggio.capitano, (m) => ['Diplomazia', 'Intimidire', 'Raggirare'].map((a) => [a, conPen(m.tot(a), mods('supporto'))]));
    aggiungi('pilota', v.equipaggio.pilota, (m) => [['Pilotare', conPen(m.tot('Pilotare') + c.pilotareNave, mods('motori'))]]);
    for (const id of v.equipaggio.ingegneri) aggiungi('ingegneri', id, (m) => [['Ingegneria', conPen(m.tot('Ingegneria'), mods('nucleo', true))]]);
    for (const id of v.equipaggio.artiglieri) aggiungi('artiglieri', id, (m) => [['Artiglieria', conPen(Math.max(m.bab, m.gradi('Pilotare')) + m.des, mods('armi'))]]);
    for (const id of v.equipaggio.scientifici) aggiungi('scientifici', id, (m) => [['Computer', conPen(m.tot('Computer') + (c.sensori?.[2] || 0), mods('sensori'))]]);
    for (const id of v.equipaggio.magici) aggiungi('magici', id, (m) => [['Misticismo', conPen(m.tot('Misticismo'), penNucleo)]]);
    for (const id of v.equipaggio.primi) aggiungi('primi', id, (m) => ['Acrobazia', 'Atletica'].map((a) => [a, conPen(m.tot(a), penNucleo)]));
    // Equipaggio PNG standard (Costruire le Astronavi): artiglieria, abilità buona e una abilità superiore dalla categoria
    if (v.png?.attivo) {
      const t = (A.equipaggioPng || []).find((r) => r[0] === v.categoria) || (A.equipaggioPng || []).find((r) => r[0] === '1') || ['1', 5, 5, 10];
      const abil = (ruolo) => (v.png.superiore === ruolo ? t[3] : t[2]);
      const png = (ruolo, prove) => { if (!out.some((x) => x.ruolo === ruolo)) out.push({ ruolo, id: 'png-' + ruolo, nome: 'Equipaggio PNG', png: true, prove }); };
      png('capitano', ['Diplomazia', 'Intimidire', 'Raggirare'].map((a) => [a, conPen(abil('capitano'), mods('supporto'))]));
      png('pilota', [['Pilotare', conPen(abil('pilota') + c.pilotareNave, mods('motori'))]]);
      png('ingegneri', [['Ingegneria', conPen(abil('ingegneri'), mods('nucleo', true))]]);
      png('artiglieri', [['Artiglieria', conPen(t[1], mods('armi'))]]);
      png('scientifici', [['Computer', conPen(abil('scientifici') + (c.sensori?.[2] || 0), mods('sensori'))]]);
    }
    return out;
  }

  // ---- Vista ----
  const opz = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const costoTesto = (c, v) => (typeof c === 'number' ? `${c} PC` : Array.isArray(c) ? `${c[0]}×${catTaglia(v)} = ${c[0] * catTaglia(v)} PC` : String(c));
  const campo = (v, k, val, extra = '') => `<input data-nv="${k}" data-id="${v.id}" value="${esc(val ?? '')}" ${extra}>`;

  function vista(v, { personaggi = [], sola = false } = {}) {
    normalizza(v);
    const c = calcola(v, personaggi);
    const id = v.id;
    const dis = sola ? ' disabled' : '';
    const sel = (k, lista, etichetta, filtro = () => true) => {
      const voci = (A[lista] || []).filter(filtro);
      return `<label class="nv-sistema"><span>${esc(etichetta)}</span><select data-nv="${k}" data-id="${id}" data-ridisegna${dis}><option value="">— nessuno —</option>${voci.map((x) => {
        const cost = x[COSTO[lista]];
        return `<option value="${esc(x[0])}"${x[0] === v[k] ? ' selected' : ''}>${esc(x[0])} · ${esc(costoTesto(cost, v))}</option>`;
      }).join('')}</select></label>`;
    };
    const t = c.t;
    const sistemi = CAMPI.map(([k, lista, et]) => sel(k, lista, et, lista === 'nuclei' && t ? (x) => x[1].includes(t[1]) : lista === 'propulsori' && t ? (x) => x[1] === t[1] : () => true)).join('');
    const multi = MULTI.map(([k, lista, et]) => `<div class="nv-multi"><b>${esc(et)}</b>${k === 'comparti' && c.s ? ` <small class="muto">(${v.comparti.length}/${c.s.comparti})</small>` : ''}
        ${v[k].map((nome, i) => `<span class="chip">${esc(nome)}${sola ? '' : ` <button class="chip-x" data-azione="nv-togli-multi" data-id="${id}" data-chiave="${k}" data-i="${i}" title="Togli">×</button>`}</span>`).join(' ')}
        ${sola ? '' : `<select data-nv-aggiungi="${k}" data-id="${id}"><option value="">+ aggiungi…</option>${opz((A[lista] || []).map((x) => [x[0], `${x[0]} · ${costoTesto(x[x.length - 1], v)}`]), '')}</select>`}</div>`).join('');
    // Armi per arco
    const armiArco = ARCHI.map((arco) => {
      const sp = v.supporti.filter((x) => x.arco === arco);
      if (!sp.length && sola) return '';
      return `<div class="nv-arco"><b>${arco === 'torretta' ? 'Torretta' : 'Arco di ' + arco}</b>
        ${sp.map((x) => {
          const a = armaDi(x.arma);
          const scelta = A.armi.filter((w) => CLASSI.indexOf(w[0]) <= CLASSI.indexOf(x.classe) && w[0] !== 'spinale');
          return `<div class="nv-supporto"><span class="badge">${esc(x.classe)}${x.orig ? '' : ' · nuovo'}${x.orig && x.classe !== x.orig ? ' · migliorato' : ''}</span>
            ${sola ? `<b>${esc(x.arma || '— vuoto —')}</b>` : `<select data-nv-supporto="${x.id}" data-id="${id}"><option value="">— vuoto —</option>${CLASSI.filter((k) => scelta.some((w) => w[0] === k)).map((k) => `<optgroup label="Armi ${k === 'leggera' ? 'leggere' : k === 'pesante' ? 'pesanti' : 'principali'}">${scelta.filter((w) => w[0] === k).map((w) => `<option value="${esc(w[2])}"${w[2] === x.arma ? ' selected' : ''}>${esc(w[2])} (${esc(w[1])}) · ${w[7]} PC</option>`).join('')}</optgroup>`).join('')}</select>`}
            ${a ? `<small class="muto">${esc([a[1], a[3] && `gittata ${a[3].toLowerCase()}`, a[4] && `velocità ${a[4]}`, `danni ${a[5]}`, `${a[6]} UNE`, a[8]].filter(Boolean).join(' · '))}</small>` : ''}
            ${sola ? '' : `${x.classe === 'leggera' && c.ct >= 3 ? `<button class="btn-mini" data-azione="nv-migliora" data-id="${id}" data-sp="${x.id}" title="Migliora a supporto pesante (${x.arco === 'torretta' ? 6 : 4} PC)">⬆ pesante</button>` : ''}${x.classe === 'pesante' && c.ct >= 5 && x.arco !== 'torretta' ? `<button class="btn-mini" data-azione="nv-migliora" data-id="${id}" data-sp="${x.id}" title="Migliora a supporto principale (5 PC)">⬆ principale</button>` : ''}${!x.orig || x.classe !== x.orig ? `<button class="btn-mini" data-azione="nv-togli-supporto" data-id="${id}" data-sp="${x.id}" title="${x.orig ? 'Riporta il supporto com\'era' : 'Togli il supporto aggiunto'}">↺</button>` : ''}`}
          </div>`;
        }).join('') || '<span class="muto">nessun supporto</span>'}
        ${sola || !c.s ? '' : `<button class="btn-mini" data-azione="nv-nuovo-supporto" data-id="${id}" data-arco="${arco}" title="Nuovo supporto per arma leggera (${arco === 'torretta' ? 5 : 3} PC)">+ supporto</button>`}</div>`;
    }).join('');
    // Equipaggio: scelta dei personaggi della campagna per ogni ruolo
    const pgs = personaggi.filter((p) => p.sf);
    const nome = (pid) => pgs.find((p) => p.id === pid)?.nome || '?';
    const ruoli = RUOLI.map(([k, et, molti]) => {
      const scelti = molti ? v.equipaggio[k] : v.equipaggio[k] ? [v.equipaggio[k]] : [];
      const prove = c.equipaggio.filter((x) => x.ruolo === k);
      return `<div class="nv-ruolo"><b>${esc(et)}</b>
        ${prove.map((x) => `<span class="chip">${esc(x.nome)}: ${x.prove.map(([a, b]) => `${esc(a)} <b>${b === null ? 'fallisce' : segno(b)}</b>`).join(', ')}${sola || x.png ? '' : ` <button class="chip-x" data-azione="nv-togli-ruolo" data-id="${id}" data-ruolo="${k}" data-pg="${x.id}" title="Togli dal ruolo">×</button>`}</span>`).join(' ')}
        ${scelti.filter((pid) => !prove.some((x) => x.id === pid)).map((pid) => `<span class="chip muto">${esc(nome(pid))}</span>`).join(' ')}
        ${sola || (!molti && scelti.length) ? '' : `<select data-nv-ruolo="${k}" data-id="${id}"><option value="">+ assegna…</option>${opz(pgs.filter((p) => !scelti.includes(p.id)).map((p) => [p.id, p.nome]), '')}</select>`}</div>`;
    }).join('');
    // Combattimento
    const cb = v.combattimento;
    const scudi = statoScudi(v, c);
    const psAtt = c.psMax - n(cb.danni);
    const temp = cb.temp ?? c.tempMax;
    const critiProssimo = c.sc ? (Math.floor(n(cb.danni) / c.sc) + 1) * c.sc : 0;
    const crit = cb.critici || {};
    const statoSist = ([k, et]) => {
      const val = n(crit[k]);
      return `<label class="nv-crit stato-${val}"><span>${esc(et)}</span>${sola ? `<b>${STATI[val]}</b>` : `<select data-nv="combattimento|critici|${k}" data-id="${id}" data-numero data-ridisegna>${opz(STATI.map((s, i) => [i, s]), val)}</select>`}</label>`;
    };
    const quad = QUADRANTI.map((q) => `<div class="nv-quad"><span>${q}</span><b>${scudi[q]}</b><small class="muto">/ ${scudiDistribuiti(v, c)[q]}</small>
        ${sola ? '' : `<span><button class="btn-mini" data-azione="nv-scudo" data-id="${id}" data-q="${q}" data-d="-1" title="−1 punto scudo">−</button><button class="btn-mini" data-azione="nv-scudo" data-id="${id}" data-q="${q}" data-d="1" title="+1 punto scudo">+</button></span>`}</div>`).join('');
    const combattimento = `<div class="nv-combattimento">
        <div class="nv-ps ${psAtt <= 0 ? 'oltre' : ''}"><span class="muto">Punti Scafo</span> <b>${psAtt}</b> / ${c.psMax}
          ${c.tempMax ? ` · <span class="muto">PS temporanei (armatura ablativa)</span> <b>${temp}</b> / ${c.tempMax}` : ''}
          · <span class="muto">Soglia critica</span> ${c.sc}${c.sd ? ` · <span class="muto">Soglia danni</span> ${c.sd}` : ''}
          ${psAtt <= 0 ? `<span class="oltre"> · ${-psAtt >= c.psMax ? 'DISTRUTTA' : 'DISATTIVATA'}</span>` : ''}
          <small class="muto">· prossimo critico a ${critiProssimo} danni</small></div>
        <div class="barra-pf"><span style="width:${Math.max(0, Math.min(100, (psAtt / (c.psMax || 1)) * 100))}%"></span></div>
        ${sola ? '' : `<div class="pf-riga nv-colpo"><label>Colpo da <input type="number" min="0" id="nv-danno-${id}" class="pf-corto" placeholder="danni"></label>
          <label>sul quadrante <select id="nv-quad-${id}">${opz(QUADRANTI.map((q) => [q, q]), 'prua')}</select></label>
          <label class="pf-chk"><input type="checkbox" id="nv-venti-${id}"> 20 naturale</label>
          <button class="btn-piccolo" data-azione="nv-colpo" data-id="${id}">💥 Applica</button>
          <button class="btn-piccolo" data-azione="nv-critico" data-id="${id}" title="Tira il d% sulla tabella dei danni critici e peggiora il sistema colpito">🎲 Danno critico</button>
          <button class="btn-piccolo" data-azione="nv-ripara" data-id="${id}" title="Fine combattimento: scafo, scudi e sistemi tornano a posto">🔧 Ripristina tutto</button></div>`}
        <div class="nv-scudi"><span class="muto">Scudi${c.scudiNome ? ` (${esc(c.scudiNome)}, ${c.scudiTot})` : ' — nessuno'}</span>${c.scudiTot ? quad : ''}
          ${!sola && c.scudiTot ? `<button class="btn-mini" data-azione="nv-scudi-pieni" data-id="${id}" title="Riporta gli scudi alla distribuzione scelta">↺ scudi pieni</button>` : ''}</div>
        <div class="nv-sistemi">${SISTEMI.map(statoSist).join('')}</div>
        <p class="muto pf-aiuto">Difettoso −2, malfunzionante −4 (niente azioni al limite), fuori uso: le azioni falliscono. Nucleo malfunzionante −2 e fuori uso −4 anche a tutte le altre azioni. Le penalità sono già nelle prove dell'equipaggio.</p>
      </div>`;
    const distribuzione = c.scudiTot && !sola ? `<div class="pf-riga nv-distribuzione"><span class="muto">Distribuzione degli scudi (somma ${c.scudiTot}):</span>${QUADRANTI.map((q) => `<label>${q} ${campo(v, 'scudiQuad|' + q, scudiDistribuiti(v, c)[q], 'type="number" min="0" class="pf-corto" data-numero data-ridisegna')}</label>`).join('')}
        ${QUADRANTI.reduce((x, q) => x + scudiDistribuiti(v, c)[q], 0) !== c.scudiTot ? '<span class="oltre">la somma non torna</span>' : ''}</div>` : '';
    const strutture = Object.entries(A.strutture);
    return `<div class="nv-scheda" data-nave="${id}">
      <div class="pf-riga">
        <label>Nome ${campo(v, 'nome', v.nome, `class="pf-largo"${dis}`)}</label>
        <label>Categoria <select data-nv="categoria" data-id="${id}" data-ridisegna${dis}>${opz(A.categorie.map((r) => [r[0], `${r[0]} (${r[1]} PC)`]), v.categoria)}</select></label>
        <label>Struttura <select data-nv="struttura" data-id="${id}" data-ridisegna${dis}><option value="">— scegli —</option>${A.taglie.map((tg) => `<optgroup label="${esc(tg[0])}">${opz(strutture.filter(([, s]) => s.taglia === tg[0]).map(([k, s]) => [k, `${k} · ${s.costo} PC`]), v.struttura)}</optgroup>`).join('')}</select></label>
        <a class="btn-piccolo" href="${WIKI}Costruire_le_Astronavi" target="_blank" rel="noopener">📖 costruire</a>
        <a class="btn-piccolo" href="${WIKI}Combattimento_tra_Astronavi" target="_blank" rel="noopener">📖 combattimento</a>
      </div>
      ${c.avvisi.length ? `<div class="pannello pf-da-completare"><b>Da sistemare</b><ul>${c.avvisi.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="nv-statistiche">
        <div class="pf-box"><div class="pf-etich">CA</div><div class="pf-valore">${c.ca}</div><div class="pf-mini muto">10 + armatura + taglia + gradi del pilota in Pilotare (${c.gradiPilota})</div></div>
        <div class="pf-box"><div class="pf-etich">AB</div><div class="pf-valore">${c.ab}</div><div class="pf-mini muto">10 + contromisure + taglia + gradi del pilota</div></div>
        <div class="pf-box"><div class="pf-etich">Punti Scafo</div><div class="pf-valore">${c.psMax}</div><div class="pf-mini muto">SC ${c.sc}${c.sd ? ` · SD ${c.sd}` : ''}</div></div>
        <div class="pf-box"><div class="pf-etich">Velocità</div><div class="pf-valore">${c.velocita}</div><div class="pf-mini muto">esagoni · ${esc(c.s?.manovrabilita || '—')} (virata ${c.virata}) · Pilotare ${segno(c.pilotareNave)}</div></div>
        <div class="pf-box"><div class="pf-etich">Punti Costruzione</div><div class="pf-valore ${c.pcSpesi > c.pcTotali ? 'oltre' : ''}">${c.pcSpesi} / ${c.pcTotali}</div><div class="pf-mini muto">categoria ${esc(v.categoria)}</div></div>
        <div class="pf-box"><div class="pf-etich">Energia</div><div class="pf-valore ${c.uneUsate > c.uneNucleo ? 'oltre' : ''}">${c.uneUsate} / ${c.uneNucleo}</div><div class="pf-mini muto">UNE usate / prodotte</div></div>
      </div>
      ${c.s ? `<p class="muto pf-aiuto">${esc(c.s.taglia)}${c.t ? ` (${esc(c.t[4])}, CA e AB ${segno(c.t[3])})` : ''} · equipaggio ${c.s.eqMin}–${c.s.eqMax} · comparti adattabili ${c.s.comparti} · fonte: ${esc(c.s.fonte)}</p>` : ''}
      <details class="pannello pf-sez" open><summary><h3>Combattimento</h3></summary>${combattimento}</details>
      <details class="pannello pf-sez" open><summary><h3>Equipaggio</h3></summary>${sola ? '' : `<div class="pf-riga"><label class="pf-chk"><input type="checkbox" data-nv="png|attivo" data-id="${id}" data-bool data-ridisegna ${v.png?.attivo ? 'checked' : ''}> Equipaggio PNG standard</label>${v.png?.attivo ? `<label>abilità superiore del <select data-nv="png|superiore" data-id="${id}" data-ridisegna>${opz([['pilota', 'pilota'], ['capitano', 'capitano'], ['ingegneri', 'ingegnere'], ['scientifici', 'ufficiale scientifico']], v.png.superiore)}</select></label>` : ''}<small class="muto">per le navi del master: i ruoli senza personaggio hanno i bonus del Manuale per la categoria (gradi = categoria)</small></div>`}<div class="nv-ruoli">${ruoli}</div>
        <p class="muto pf-aiuto">Prove dalla scheda di ogni personaggio. Artiglieria: BAB o gradi in Pilotare (il più alto) + DES. Pilota: Pilotare + manovrabilità e propulsori. Scientifico: Computer + sensori.${c.computer?.[1] ? ` Il computer (${esc(c.computer[0])}) dà +${c.computer[1]} a ${c.computer[2]} prov${c.computer[2] === 1 ? 'a' : 'e'} per round, da aggiungere quando si usa.` : ''}</p></details>
      <details class="pannello pf-sez" open><summary><h3>Armi</h3></summary>${armiArco || '<p class="muto">Scegli la struttura per vedere i supporti.</p>'}</details>
      <details class="pannello pf-sez"${sola ? '' : ' open'}><summary><h3>Sistemi</h3></summary><div class="nv-sistemi-scelta">${sola ? CAMPI.filter(([k]) => v[k]).map(([k, , et]) => `<div><span class="muto">${esc(et)}</span> ${esc(v[k])}</div>`).join('') : sistemi}</div>${multi}${distribuzione}</details>
      <details class="pannello pf-sez"><summary><h3>Punti Costruzione ed energia</h3></summary>
        <table class="nv-conti"><tr><th>Voce</th><th>PC</th></tr>${c.voci.map(([nm, x, nota]) => `<tr><td>${esc(nm)}${nota ? ` <small class="muto">(${esc(nota)}: da contare a mano)</small>` : ''}</td><td>${x}</td></tr>`).join('')}<tr><th>Totale</th><th>${c.pcSpesi} / ${c.pcTotali}</th></tr></table>
        <table class="nv-conti"><tr><th>Sistema</th><th>UNE</th></tr>${c.consumi.map(([nm, x]) => `<tr><td>${esc(nm)}</td><td>${x}</td></tr>`).join('')}<tr><th>Totale</th><th>${c.uneUsate} / ${c.uneNucleo}</th></tr></table></details>
      <label class="nv-note">Note ${sola ? `<p>${esc(v.note || '')}</p>` : `<textarea data-nv="note" data-id="${id}" rows="3">${esc(v.note || '')}</textarea>`}</label>
    </div>`;
  }

  // Scudi: distribuzione scelta (somma = totale) e punti attuali per quadrante
  function scudiDistribuiti(v, c) {
    const tot = c.scudiTot;
    const q = v.scudiQuad || {};
    if (QUADRANTI.some((k) => q[k] !== undefined && q[k] !== '')) return Object.fromEntries(QUADRANTI.map((k) => [k, n(q[k])]));
    const base = Math.floor(tot / 4);
    return { prua: tot - base * 3, babordo: base, tribordo: base, poppa: base };
  }
  function statoScudi(v, c) {
    const cb = v.combattimento;
    if (!cb.scudi) cb.scudi = scudiDistribuiti(v, c);
    return Object.fromEntries(QUADRANTI.map((k) => [k, n(cb.scudi[k])]));
  }

  // ---- Modifiche ----
  function scrivi(v, percorso, valore) {
    const parti = percorso.split('|');
    let o = v;
    for (const k of parti.slice(0, -1)) { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
    o[parti[parti.length - 1]] = valore;
  }
  const naveDa = (el) => ctx.nave(el.dataset.id || el.closest('[data-nave]')?.dataset.nave);
  function applica(el) {
    const v = naveDa(el);
    if (!v) return false;
    const val = el.dataset.bool !== undefined ? el.checked : el.dataset.numero !== undefined ? n(el.value) : el.value;
    scrivi(v, el.dataset.nv, val);
    if (el.dataset.nv === 'struttura') v.supporti = supportiDaStruttura(v);
    if (el.dataset.nv === 'scudi') { v.scudiQuad = {}; v.combattimento.scudi = null; }
    if (el.dataset.nv.startsWith('scudiQuad|')) v.combattimento.scudi = null;
    if (el.dataset.nv === 'armatura') v.combattimento.temp = null;
    ctx.salva();
    return true;
  }

  const azioni = {
    'nv-togli-multi'(el) { const v = naveDa(el); v[el.dataset.chiave].splice(Number(el.dataset.i), 1); ctx.salva(); ctx.render(); },
    'nv-togli-ruolo'(el) {
      const v = naveDa(el);
      const k = el.dataset.ruolo;
      if (Array.isArray(v.equipaggio[k])) v.equipaggio[k] = v.equipaggio[k].filter((x) => x !== el.dataset.pg); else v.equipaggio[k] = '';
      ctx.salva(); ctx.render();
    },
    'nv-nuovo-supporto'(el) { const v = naveDa(el); v.supporti.push({ id: ctx.uid(), arco: el.dataset.arco, classe: 'leggera', orig: null, arma: '' }); ctx.salva(); ctx.render(); },
    'nv-migliora'(el) { const v = naveDa(el); const s = v.supporti.find((x) => x.id === el.dataset.sp); if (s) s.classe = CLASSI[CLASSI.indexOf(s.classe) + 1]; ctx.salva(); ctx.render(); },
    'nv-togli-supporto'(el) {
      const v = naveDa(el);
      const s = v.supporti.find((x) => x.id === el.dataset.sp);
      if (!s) return;
      if (s.orig) { s.classe = s.orig; if (armaDi(s.arma) && CLASSI.indexOf(armaDi(s.arma)[0]) > CLASSI.indexOf(s.classe)) s.arma = ''; } else v.supporti = v.supporti.filter((x) => x !== s);
      ctx.salva(); ctx.render();
    },
    'nv-scudo'(el) {
      const v = naveDa(el);
      const c = calcola(v, ctx.personaggiDi(v.campagnaId));
      const sc = statoScudi(v, c);
      v.combattimento.scudi[el.dataset.q] = Math.max(0, sc[el.dataset.q] + Number(el.dataset.d));
      ctx.salva(); ctx.render();
    },
    'nv-scudi-pieni'(el) { const v = naveDa(el); v.combattimento.scudi = null; ctx.salva(); ctx.render(); },
    'nv-ripara'(el) { const v = naveDa(el); v.combattimento = { danni: 0, temp: null, scudi: null, critici: {} }; ctx.salva(); ctx.render(); ctx.toast('🔧 Astronave riparata: scafo, scudi e sistemi tornano a posto'); },
    // Un colpo: prima gli scudi del quadrante, poi i PS temporanei dell'armatura ablativa, poi lo scafo; i critici quando lo scafo
    // supera un multiplo della soglia critica (o con un 20 naturale, se lo scafo viene danneggiato)
    'nv-colpo'(el) {
      const v = naveDa(el);
      const danno = n(document.getElementById(`nv-danno-${v.id}`)?.value);
      const q = document.getElementById(`nv-quad-${v.id}`)?.value || 'prua';
      const venti = document.getElementById(`nv-venti-${v.id}`)?.checked;
      if (danno <= 0) { ctx.toast('Scrivi i danni del colpo', 'errore'); return; }
      ctx.toast(colpisci(v, danno, q, venti));
    },
  };
  // Applica un colpo alla nave e restituisce il resoconto (testo per l'avviso)
  function colpisci(v, danno, q, venti) {
    {
      const c = calcola(v, ctx.personaggiDi(v.campagnaId));
      const sc = statoScudi(v, c);
      let resto = danno;
      const suScudi = Math.min(sc[q], resto);
      v.combattimento.scudi[q] = sc[q] - suScudi;
      resto -= suScudi;
      const temp = v.combattimento.temp ?? c.tempMax;
      const suTemp = Math.min(temp, resto);
      v.combattimento.temp = temp - suTemp;
      resto -= suTemp;
      const prima = n(v.combattimento.danni);
      v.combattimento.danni = prima + resto;
      const critici = resto > 0 ? (c.sc ? Math.floor(v.combattimento.danni / c.sc) - Math.floor(prima / c.sc) : 0) + (venti ? 1 : 0) : 0;
      ctx.salva(); ctx.render();
      return `💥 ${esc(v.nome)}: ${danno} danni a ${q} — ${suScudi} sugli scudi${suTemp ? `, ${suTemp} sull'armatura ablativa` : ''}, ${resto} allo scafo${critici ? ` — <b>${critici} danno critico</b>: premi «🎲 Danno critico» nella sua scheda` : ''}`;
    }
  }
  const azioni2 = {
    'nv-critico'(el) {
      const v = naveDa(el);
      const crit = v.combattimento.critici = v.combattimento.critici || {};
      const tiro = Math.floor(Math.random() * 100) + 1;
      let i = SISTEMI.findIndex((s, k) => tiro >= A.critici[k][0] && tiro <= A.critici[k][1]);
      if (i < 0) i = 0;
      // Se il sistema è già fuori uso si passa al successivo; in fondo alla lista è ferito un membro dell'equipaggio
      let giri = 0;
      while (n(crit[SISTEMI[i][0]]) >= 3 && giri < SISTEMI.length) { i += 1; giri += 1; if (i >= SISTEMI.length) break; }
      if (i >= SISTEMI.length || giri >= SISTEMI.length) { ctx.toast(`🎲 d% ${tiro}: tutti i sistemi sono fuori uso — un membro dell'equipaggio a caso subisce i danni del colpo`); return; }
      const [k, et] = SISTEMI[i];
      crit[k] = Math.min(3, n(crit[k]) + 1);
      ctx.salva(); ctx.render();
      ctx.toast(`🎲 d% ${tiro}: <b>${esc(et)}</b> ora è <b>${STATI[crit[k]]}</b>${k === 'armi' ? ' (tira a caso un arco con armi: vale per le sue armi)' : ''}`);
    },
  };

  Object.assign(azioni, azioni2);
  const migliore = (c, ruolo) => { const x = c.equipaggio.filter((e) => e.ruolo === ruolo).map((e) => e.prove[0][1]).filter((b) => b !== null); return x.length ? Math.max(...x) : null; };
  function prova(v, ruolo) { const c = calcola(v, ctx.personaggiDi(v.campagnaId)); return migliore(c, ruolo); }
  // Danni di un'arma: «2d6», «4d4 × 10», «1d10 × 10 + 5»…
  function tiraDanni(espr) {
    const t = String(espr || '').replace(/\s+/g, '').replace(/[×x]/g, '*');
    const m = t.match(/^(\d+d\d+)(?:\*(\d+))?(?:\+(\d+))?/i);
    if (!m) return null;
    const r = window.Dadi.tira(m[1]);
    const tot = r.totale * (m[2] ? Number(m[2]) : 1) + (m[3] ? Number(m[3]) : 0);
    return { totale: tot, testo: `${m[1]}${m[2] ? ` × ${m[2]}` : ''}${m[3] ? ` + ${m[3]}` : ''} = ${tot}` };
  }
  return {
    nuova, normalizza, calcola, vista, azioni, supportiDaStruttura, colpisci, prova, tiraDanni, numCategoria,
    input(el) {
      if (el.dataset.nv && el.tagName !== 'SELECT') { applica(el); return true; }
      return false;
    },
    change(el) {
      if (el.dataset.nv) { applica(el); if (el.dataset.ridisegna !== undefined || el.tagName === 'SELECT') ctx.render(); return true; }
      if (el.dataset.nvAggiungi) { const v = naveDa(el); if (v && el.value) { v[el.dataset.nvAggiungi].push(el.value); ctx.salva(); ctx.render(); } return true; }
      if (el.dataset.nvRuolo) {
        const v = naveDa(el);
        if (v && el.value) { const k = el.dataset.nvRuolo; if (Array.isArray(v.equipaggio[k])) v.equipaggio[k].push(el.value); else v.equipaggio[k] = el.value; ctx.salva(); ctx.render(); }
        return true;
      }
      if (el.dataset.nvSupporto) { const v = naveDa(el); const s = v?.supporti.find((x) => x.id === el.dataset.nvSupporto); if (s) { s.arma = el.value; ctx.salva(); ctx.render(); } return true; }
      return false;
    },
  };
};
