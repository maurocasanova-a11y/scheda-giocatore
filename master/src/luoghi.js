'use strict';
// Dove si trova l'equipaggiamento del personaggio: comune a tutte le schede (PF1, PF2, D&D 5e, Starfinder).
// "porta" = conta per peso/ingombro del personaggio. Borsa conservante e buco portatile sono spazi
// extradimensionali: il loro contenuto non pesa (pesa solo la borsa, che è un oggetto a sé).
// Ogni tipo di luogo può avere più copie con il nome dato dal giocatore (es. "Borsa del mago", "Casa a Sandpoint"):
// stanno nei dati della scheda in luoghiExtra [{ id, tipo, nome }]; i nomi dei luoghi di base in luoghiNomi { tipo: nome }.
(function () {
  const LISTA = [
    { k: 'indossato', nome: 'Indossato', icona: '🧥', porta: true, nota: 'addosso al personaggio' },
    { k: 'zaino', nome: 'Zaino', icona: '🎒', porta: true, nota: 'portato con sé' },
    { k: 'faretra', nome: 'Faretra', icona: '🏹', porta: true, nota: 'frecce e quadrelle a portata di mano' },
    { k: 'pergamene', nome: 'Porta pergamene', icona: '📜', porta: true, nota: 'pergamene e mappe arrotolate' },
    { k: 'borsa', nome: 'Borsa conservante', icona: '👝', porta: false, nota: 'spazio extradimensionale: il contenuto non pesa' },
    { k: 'buco', nome: 'Buco portatile', icona: '🕳️', porta: false, nota: 'spazio extradimensionale: il contenuto non pesa' },
    { k: 'cavallo', nome: 'Sul cavallo', icona: '🐎', porta: false, nota: 'lo porta la cavalcatura' },
    { k: 'casa', nome: 'A casa', nomeSf: 'Casa', icona: '🏠', porta: false, nota: 'lasciato a casa' },
    { k: 'castello', nome: 'Al castello', icona: '🏰', porta: false, nota: 'custodito al castello' },
    { k: 'semipiano', nome: 'Semipiano', icona: '🌀', porta: false, nota: 'nel semipiano personale' },
    // Starfinder (wiki «Equipaggiamento»): conta il volume di ciò che si porta e si indossa
    { k: 'astronave', nome: 'Astronave', icona: '🚀', porta: false, nota: 'a bordo dell\'astronave: non conta nel volume portato', solo: 'sf' },
  ];
  // Luoghi di ciascun regolamento: Starfinder ha solo zaino (tutto ciò che si porta), casa e astronave
  const TIPI_SISTEMA = { sf: ['zaino', 'casa', 'astronave'] };
  const lista = (sistema) => (TIPI_SISTEMA[sistema] ? LISTA.filter((l) => TIPI_SISTEMA[sistema].includes(l.k)) : LISTA.filter((l) => !l.solo));
  const PER_K = new Map(LISTA.map((l) => [l.k, l]));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const extra = (d) => (Array.isArray(d?.luoghiExtra) ? d.luoghiExtra : []);
  // Tutti i luoghi del personaggio: per ogni tipo quello di base e poi le sue copie
  const istanze = (d, sistema) => lista(sistema).flatMap((l) => [
    { id: l.k, tipo: l, nome: d?.luoghiNomi?.[l.k] || (sistema === 'sf' && l.nomeSf) || l.nome, base: true },
    ...extra(d).filter((x) => x.tipo === l.k).map((x) => ({ id: x.id, tipo: l, nome: x.nome || l.nome, base: false })),
  ]);
  // Luogo di un oggetto: quelli creati prima di questa funzione stanno nello zaino (o indossati, se danno un bonus).
  // Un luogo che il regolamento non ha (es. "indossato" in una vecchia scheda Starfinder) diventa lo zaino se era
  // portato addosso, altrimenti la casa.
  function luogo(o, d, sistema) {
    const ok = lista(sistema).map((l) => l.k);
    const id = PER_K.has(o?.dove) || extra(d).some((x) => x.id === o?.dove) ? o.dove : o?.bonusId && ok.includes('indossato') ? 'indossato' : 'zaino';
    const k = PER_K.has(id) ? id : extra(d).find((x) => x.id === id)?.tipo;
    if (ok.includes(k)) return id;
    return PER_K.get(k)?.porta === false ? (ok.includes('casa') ? 'casa' : 'zaino') : 'zaino';
  }
  const tipoDi = (id, d) => PER_K.get(id) || PER_K.get(extra(d).find((x) => x.id === id)?.tipo) || PER_K.get('zaino');
  const porta = (o, d, sistema) => tipoDi(luogo(o, d, sistema), d).porta;
  // ---- Borsa conservante (Pathfinder 1, wiki «Borsa Conservante»): il tipo decide peso della borsa e limiti del contenuto ----
  const TIPI_BORSA = {
    I: { peso: 7.5, limite: 125, volume: '810 dm³', prezzo: 2500 },
    II: { peso: 12.5, limite: 250, volume: '1.890 dm³', prezzo: 5000 },
    III: { peso: 17.5, limite: 500, volume: '4.050 dm³', prezzo: 7400 },
    IV: { peso: 30, limite: 750, volume: '6.750 dm³', prezzo: 10000 },
  };
  const conTipiBorsa = (sistema) => sistema === 'pf1';
  const tipoBorsa = (d, id) => (TIPI_BORSA[d?.borseTipi?.[id]] ? d.borseTipi[id] : '');
  const kg = (v) => `${String(Math.round(v * 10) / 10).replace('.', ',')} kg`;
  const opzTipiBorsa = (sel) => `<option value="">— che tipo? —</option>${Object.entries(TIPI_BORSA).map(([k, t]) =>
    `<option value="${k}"${k === sel ? ' selected' : ''}>Tipo ${k} (contiene ${t.limite} kg, pesa ${kg(t.peso)})</option>`).join('')}`;
  // Peso delle borse conservanti di cui si è scelto il tipo: la borsa la porta il personaggio (il contenuto no)
  const pesoBorse = (d) => istanze(d, 'pf1').filter((i) => i.tipo.k === 'borsa').reduce((a, i) => a + (TIPI_BORSA[tipoBorsa(d, i.id)]?.peso || 0), 0);
  // Riga in testa a una borsa: scelta del tipo, limiti, contenuto rispetto al limite
  function testaBorsa(d, id, tot, attr) {
    const k = tipoBorsa(d, id);
    const t = TIPI_BORSA[k];
    const scelta = `<label class="borsa-tipo${k ? '' : ' da-scegliere'}">Tipo <select data-borsa-tipo="${esc(id)}" ${attr}>${opzTipiBorsa(k)}</select></label>`;
    if (!t) return `<div class="borsa-info chiedi">${scelta} <span>⚠ Che tipo di borsa conservante è? Il tipo decide quanto pesa la borsa e quanto può contenere.</span></div>`;
    const oltre = tot > t.limite;
    return `<div class="borsa-info${oltre ? ' oltre' : ''}">${scelta}
      <span>contenuto <b>${kg(tot)}</b> / ${t.limite} kg · volume massimo ${t.volume} · la borsa pesa ${kg(t.peso)} (contata nel peso portato) · ${String(t.prezzo).replace(/\B(?=(\d{3})+$)/g, '.')} mo</span>
      ${oltre ? '<b class="borsa-rotta">⚠ Sovraccarica: una borsa conservante sovraccaricata si rompe e il contenuto è perso per sempre!</b>' : ''}</div>`;
  }
  const opzioni = (sel, d, sistema) => istanze(d, sistema).map((i) => `<option value="${esc(i.id)}"${i.id === sel ? ' selected' : ''}>${i.tipo.icona} ${esc(i.nome)}</option>`).join('');

  // Sezione completa divisa per luogo.
  //   oggetti: lista; riga(o): html di una riga; aggiungi(id): bottone "+ Oggetto" per quel luogo;
  //   peso(o): peso/ingombro di una riga (facoltativo); unita: 'kg', 'ingombro'…; extra(id): html in testa a un luogo;
  //   dati: i dati della scheda (copie dei luoghi); pg, sistema: per creare, rinominare e togliere i luoghi (azioni in app.js)
  function sezione({ oggetti, riga, aggiungi, peso, unita = '', extra: testaExtra, dati, pg = '', sistema = '' }) {
    const attr = `data-id="${esc(pg)}" data-sistema="${esc(sistema)}"`;
    const tutte = istanze(dati, sistema);
    const gruppi = tutte.map((i, pos) => {
      const l = i.tipo;
      const dentro = oggetti.filter((o) => luogo(o, dati, sistema) === i.id);
      const testa = testaExtra ? testaExtra(i.id) : '';
      const tot = peso ? dentro.reduce((a, o) => a + (Number(peso(o)) || 0), 0) : 0;
      const totTesto = peso && tot > 0 ? `${Math.round(tot * 10) / 10} ${unita}` : '';
      const nome = pg ? `<input class="luogo-nome" value="${esc(i.nome)}" data-luogo-nome="${esc(i.id)}" ${attr} title="Il nome lo scegli tu" aria-label="Nome del luogo">` : `<b>${esc(i.nome)}</b>`;
      // Ultima copia di un tipo: lì sotto si può crearne un'altra
      const ultima = !tutte.slice(pos + 1).some((x) => x.tipo === l);
      return `<div class="luogo luogo-${l.k}${i.base ? '' : ' luogo-copia'}${dentro.length || testa ? '' : ' vuoto'}">
        <div class="luogo-testa"><span class="luogo-icona">${l.icona}</span>${nome}
          <small class="muto">${dentro.length ? `${dentro.length} oggett${dentro.length === 1 ? 'o' : 'i'}` : 'vuoto'}${totTesto ? ` · ${totTesto}${l.porta ? '' : ' (non conta)'}` : ''}</small>
          <span class="luogo-azioni">${aggiungi(i.id)}
            ${!i.base && pg ? `<button class="btn-mini" data-azione="luogo-togli" ${attr} data-luogo="${esc(i.id)}" title="Elimina questo luogo${dentro.length ? ` (i suoi ${dentro.length} oggetti tornano in «${esc(tutte.find((x) => x.id === l.k).nome)}»)` : ''}">×</button>` : ''}</span></div>
        ${l.porta || !i.base ? '' : `<div class="luogo-nota muto">${esc(l.nota)}</div>`}
        ${l.k === 'borsa' && conTipiBorsa(sistema) && pg ? testaBorsa(dati, i.id, tot, attr) : ''}
        ${testa}
        ${dentro.map(riga).join('')}
        ${ultima && pg ? `<details class="luogo-altro"><summary>⊕ un altro luogo «${esc(l.nome.toLowerCase())}»</summary>
          <input class="luogo-altro-nome" placeholder="Nome (es. ${esc({ borsa: 'Borsa del mago', casa: sistema === 'sf' ? 'Alloggio su Absalom' : 'Casa a Sandpoint', cavallo: 'Mulo da soma', castello: 'Rocca di famiglia', astronave: 'Navetta di scorta', zaino: 'Zaino tattico' }[l.k] || `${l.nome} 2`)})">
          ${l.k === 'borsa' && conTipiBorsa(sistema) ? `<select class="luogo-altro-tipo" aria-label="Tipo di borsa">${opzTipiBorsa('')}</select>` : ''}
          <button class="btn-piccolo" data-azione="luogo-nuovo" ${attr} data-tipo="${l.k}">Crea</button></details>` : ''}
      </div>`;
    }).join('');
    return `<div class="luoghi">${gruppi}</div>`;
  }
  // ---- Vendita di un oggetto: valore in monete (campo "valore" o prezzo scritto nelle note, es. "2.000 mo") ----
  const valoreDi = (o) => {
    if (o?.valore !== '' && o?.valore != null && Number(o.valore) > 0) return Number(o.valore);
    const m = String(o?.note || '').match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?\s*(?:mo|cr|crediti)\b/i);
    return m ? Number(m[1].replace(/\./g, '')) + (m[2] ? Number(`0.${m[2]}`) : 0) : 0;
  };
  let venditaAperta = null; // oggetto di cui è aperto il riquadro di vendita
  const arrotonda = (v) => Math.round(v * 100) / 100;
  function vendita(o, pg, sistema) {
    const valuta = sistema === 'sf' ? 'crediti' : 'mo';
    const v = valoreDi(o);
    if (!v) return '';
    const qta = Math.max(1, Number(o.qta) || 1);
    const attr = `data-id="${esc(pg)}" data-sistema="${esc(sistema)}" data-ogg="${esc(o.id)}"`;
    if (venditaAperta !== o.id) return `<button class="btn-piccolo luogo-vendi" data-azione="oggetto-vendi-apri" data-ogg="${esc(o.id)}" title="Vendi: valore ${v.toLocaleString('it-IT')} ${valuta}${qta > 1 ? ' l\'uno' : ''}">💰 Vendi</button>`;
    // Starfinder: gli oggetti venduti dai PG valgono di solito il 10% del prezzo; le merci di scambio il 100%
    const sf = sistema === 'sf';
    const quota = sf ? 0.1 : 0.5;
    return `<div class="vendita">
      <b>💰 Vendita</b>
      ${qta > 1 ? `<label>quanti <input type="number" class="mini vendita-qta" min="1" max="${qta}" value="${qta}"> di ${qta}</label>` : ''}
      <label>venduto a <input type="number" class="vendita-prezzo" min="0" step="0.01" value="${arrotonda(v * qta * quota)}" data-valore="${v}"> ${valuta}</label>
      ${sf ? `<span class="vendita-quote"><button class="btn-mini" data-azione="oggetto-vendi-scambio" data-quota="0.1" title="Oggetto normale: 10% del prezzo">10%</button><button class="btn-mini" data-azione="oggetto-vendi-scambio" data-quota="1" title="Merce di scambio: 100% del prezzo">100% merce di scambio</button></span>` : ''}
      <small class="muto">valore ${v.toLocaleString('it-IT')} ${valuta}${qta > 1 ? ' l\'uno' : ''}; ${sf ? 'di solito si vende al 10% (merci di scambio al 100%)' : 'di solito si vende alla metà'}</small>
      <button class="btn-piccolo primario" data-azione="oggetto-vendi" ${attr}>Conferma la vendita</button>
      <button class="btn-piccolo" data-azione="oggetto-vendi-annulla">Annulla</button>
    </div>`;
  }
  const apriVendita = (id) => { venditaAperta = id || null; };
  // ---- Volume (Starfinder): numero, "L" = leggero (10 leggeri = 1 volume, le frazioni non contano), "—" trascurabile ----
  // Restituisce { interi, leggeri } per una quantità di oggetti con quel volume
  function volumeDi(testo, qta = 1) {
    const t = String(testo ?? '').trim().toUpperCase().replace(',', '.');
    const q = Math.max(0, Number(qta) || 0);
    if (t === 'L' || /^L\b/.test(t)) return { interi: 0, leggeri: q };
    const v = Number(t.match(/^\d+(\.\d+)?/)?.[0] || 0);
    return { interi: v * q, leggeri: 0 };
  }
  window.Luoghi = { LISTA, lista, volumeDi, luogo, porta, opzioni, sezione, istanze, tipoDi, valoreDi, vendita, apriVendita, TIPI_BORSA, conTipiBorsa, pesoBorse };
})();
