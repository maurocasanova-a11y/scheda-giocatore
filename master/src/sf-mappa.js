'use strict';
// Mappa a esagoni del combattimento tra astronavi (Starfinder): posizione e orientamento delle navi, movimento con le virate
// (distanza tra le virate dalla manovrabilità), archi di fuoco, gittate e quadrante colpito. Lo stato sta nella campagna
// (campagna.battaglia). Regole: wiki Absalom Outsider, «Combattimento tra Astronavi». app.js chiama window.creaMappaSpaziale(ctx).
window.creaMappaSpaziale = function creaMappaSpaziale(ctx) {
  const { esc } = ctx;
  const A = window.SF_ASTRONAVI || { armi: [] };
  // ---- Geometria (esagoni «a punta in su», coordinate assiali q, r) ----
  // Direzioni in senso orario sullo schermo: 0 = est, 1 = sud-est, 2 = sud-ovest, 3 = ovest, 4 = nord-ovest, 5 = nord-est
  const DIREZIONI = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const ANGOLI = [0, 60, 120, 180, 240, 300];
  const distanza = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  const pixel = (q, r, lato = 1) => [lato * Math.sqrt(3) * (q + r / 2), lato * 1.5 * r];
  // Archi di una nave (orientata verso dir) che contengono l'esagono b: prua ±60°, tribordo 60–120° a destra, poppa,
  // babordo a sinistra. Gli esagoni sulle linee di confine stanno in due archi.
  function archi(a, b) {
    if (a.q === b.q && a.r === b.r) return ['prua', 'babordo', 'tribordo', 'poppa'];
    const [ax, ay] = pixel(a.q, a.r);
    const [bx, by] = pixel(b.q, b.r);
    let rel = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI - ANGOLI[a.dir];
    rel = ((rel + 540) % 360) - 180; // tra -180 e 180, positivo = a destra (tribordo)
    const e = 0.01;
    const out = [];
    if (Math.abs(rel) <= 60 + e) out.push('prua');
    if (rel >= 60 - e && rel <= 120 + e) out.push('tribordo');
    if (Math.abs(rel) >= 120 - e) out.push('poppa');
    if (rel <= -60 + e && rel >= -120 - e) out.push('babordo');
    return out;
  }
  const INCREMENTI = { corta: 5, media: 10, lunga: 20 };
  // Penalità di gittata: −2 per ogni incremento oltre il primo
  function gittata(nomeGittata, dist) {
    const t = String(nomeGittata || '').toLowerCase();
    if (/esagon/.test(t)) { const max = Number((t.match(/\d+/) || [1])[0]); return dist <= max ? { ok: true, pen: 0 } : { ok: false, pen: 0 }; }
    const inc = INCREMENTI[t];
    if (!inc) return { ok: true, pen: 0 };
    const oltre = Math.max(0, Math.ceil(dist / inc) - 1);
    return { ok: true, pen: oltre ? -2 * oltre : 0 };
  }

  // ---- Dati ----
  const battaglia = (c) => { c.battaglia = c.battaglia || { round: 1, pedine: [], sel: '', sposta: false }; return c.battaglia; };
  const nave = (p) => (p.naveId ? ctx.nave(p.naveId) : null);
  function statPedina(p) {
    const v = nave(p);
    const mod = p.mod || {};
    if (v) {
      const k = ctx.calcolaNave(v);
      return { nome: v.nome, vel: k.velocita, virata: k.virata, man: k.s?.manovrabilita || '', ca: k.ca + (mod.ca || 0), ab: k.ab + (mod.ab || 0), v,
        pil: ctx.prova(v, 'pilota'), art: ctx.prova(v, 'artiglieri'), cat: ctx.numCategoria(v.categoria), taglia: k.ct, ps: k.psMax - Number(v.combattimento?.danni || 0), psMax: k.psMax };
    }
    const num = (x) => (x === '' || x == null ? '' : Number(x));
    return { nome: p.nome || 'Nemico', vel: Number(p.vel) || 0, virata: Number(p.virata) || 0, man: p.man || '', ca: p.ca === '' || p.ca == null ? '' : num(p.ca) + (mod.ca || 0),
      ab: p.ab === '' || p.ab == null ? '' : num(p.ab) + (mod.ab || 0), v: null, pil: num(p.pil), art: num(p.art), cat: 1, taglia: 1,
      ps: p.ps === '' || p.ps == null ? '' : num(p.ps) - Number(p.danni || 0), psMax: num(p.ps) };
  }
  // Armi della pedina: [arco, nome, classe, gittata]
  function armiDi(p) {
    const v = nave(p);
    if (!v) return p.danniArma ? [['torretta', 'Armi del nemico', '', 'media', 'fuoco diretto', p.danniArma]] : [];
    return (v.supporti || []).filter((s) => s.arma).map((s) => { const a = A.armi.find((x) => x[2] === s.arma); return [s.arco, s.arma, a?.[0] || '', a?.[3] || '', a?.[1] || '', a?.[5] || '']; });
  }
  const libero = (b, q, r, tranne) => !b.pedine.some((p) => p !== tranne && p.q === q && p.r === r);
  function postoLibero(b) {
    for (let k = 0; k < 200; k++) { const q = (k % 6) * 3, r = Math.floor(k / 6) * 2; if (libero(b, q, r)) return [q, r]; }
    return [0, 0];
  }
  // Movimento: avanti di un esagono; virate solo dopo la distanza tra le virate (manovrabilità perfetta: 2 per esagono)
  function avanti(p) {
    const [dq, dr] = DIREZIONI[p.dir];
    p.q += dq; p.r += dr;
    p.mossi = (p.mossi || 0) + 1;
    p.daVirata = (p.daVirata || 0) + 1;
    p.virateQui = 0;
  }
  function puoVirare(p, virata) {
    if (p.virataLibera) return ''; // virare sul posto: orientamento libero in questo round
    if (virata <= 0) return (p.virateQui || 0) < 2 ? '' : 'con manovrabilità perfetta si vira al massimo 2 volte per esagono';
    const manca = virata - (p.daVirata || 0);
    return manca > 0 ? `prima di virare deve muoversi ancora di ${manca} esagon${manca === 1 ? 'o' : 'i'}` : '';
  }
  function vira(p, verso) {
    p.dir = (p.dir + (verso > 0 ? 1 : 5)) % 6;
    p.daVirata = 0;
    p.virateQui = (p.virateQui || 0) + 1;
  }
  const ricorda = (p) => { p.storia = [...(p.storia || []), JSON.stringify({ q: p.q, r: p.r, dir: p.dir, mossi: p.mossi || 0, daVirata: p.daVirata || 0, virateQui: p.virateQui || 0 })].slice(-30); };

  // Manovre azzardate (Combattimento tra Astronavi): [chiave, nome, CD base (+ 1,5 × categoria), 0 = senza prova]
  const MANOVRE = [['evasione', 'Evasione', 10], ['indietro', 'Indietro tutta', 10], ['spinta', 'Spinta e inversione', 15], ['scivolaS', 'Scivolamento a babordo', 10],
    ['scivolaD', 'Scivolamento a tribordo', 10], ['sulPosto', 'Virare sul posto', 0], ['avvitamento', 'Avvitamento', 10], ['radente', 'Volo radente', 15], ['speronamento', 'Velocità di speronamento', 15]];
  const d20 = () => window.Dadi.tira('1d20').totale;
  // Muove di n esagoni in una direzione senza cambiare orientamento
  const sposta = (p, dir, n) => { for (let i = 0; i < n; i++) { const [dq, dr] = DIREZIONI[dir]; p.q += dq; p.r += dr; } p.mossi = (p.mossi || 0) + n; };
  // Esegue una manovra: restituisce il resoconto. Il movimento si fa da solo dove la regola è precisa.
  function manovra(p, st, k, tiro) {
    const [, nome, cdBase] = MANOVRE.find((x) => x[0] === k);
    const cd = cdBase ? cdBase + Math.floor(1.5 * st.cat) : 0;
    const tot = cdBase ? tiro + (Number(st.pil) || 0) : 0;
    const ok = !cdBase || tot >= cd;
    const male = cdBase && tot <= cd - 5;
    const meta = Math.floor(st.vel / 2);
    const esito = cdBase ? `Pilotare ${tiro} + ${Number(st.pil) || 0} = ${tot} contro CD ${cd}: ${ok ? 'riuscita' : male ? 'fallita di 5 o più' : 'fallita'}` : 'senza prova';
    p.mod = p.mod || {};
    let fatto = '';
    if (k === 'evasione') {
      if (ok) { p.mod = { ca: 2, ab: 2, nota: '+2 CA e AB (evasione)' }; fatto = 'si muove normalmente con +2 a CA e AB fino al prossimo round'; }
      else if (male) { p.mod = { ca: -2, ab: -2, nota: '−2 CA e AB (evasione fallita)' }; fatto = 'si muove normalmente, ma −2 a CA e AB'; }
      else fatto = 'si muove normalmente';
    } else if (k === 'indietro') {
      if (ok) { sposta(p, (p.dir + 3) % 6, meta); fatto = `indietreggia di ${meta} esagoni senza virare`; }
      else if (male) { p.mod = { ca: -4, ab: -4, nota: '−4 CA e AB (indietro tutta fallita)' }; fatto = 'non si muove e prende −4 a CA e AB'; }
      else { sposta(p, (p.dir + 3) % 6, 1); fatto = 'indietreggia di 1 solo esagono'; }
    } else if (k === 'spinta') {
      sposta(p, p.dir, meta);
      if (ok) { p.dir = (p.dir + 3) % 6; fatto = `avanza di ${meta} esagoni e si gira di 180°`; } else fatto = `avanza di ${meta} esagoni ma non si gira`;
    } else if (k === 'scivolaS' || k === 'scivolaD') {
      if (ok) { sposta(p, (p.dir + (k === 'scivolaS' ? 5 : 1)) % 6, st.vel); fatto = `scivola di ${st.vel} esagoni verso prua-${k === 'scivolaS' ? 'babordo' : 'tribordo'} senza cambiare orientamento`; }
      else { sposta(p, p.dir, meta); fatto = `avanza di ${meta} esagoni e non può virare`; }
    } else if (k === 'sulPosto') {
      p.virataLibera = true;
      const pen = st.virata >= 4 ? -4 : st.virata === 3 ? -2 : 0;
      if (pen) p.mod = { ca: pen, ab: pen, nota: `${pen} CA e AB (virata sul posto)` };
      fatto = `non si muove e può virare a piacere (usa ↶ ↷)${pen ? `; ${pen} a CA e AB` : ''}`;
    } else if (k === 'avvitamento') {
      if (st.taglia > 4) return `${nome}: solo per astronavi Grandi o più piccole`;
      sposta(p, p.dir, meta);
      if (ok) { p.mod = { nota: 'avvitamento: babordo e tribordo scambiati in artiglieria' }; fatto = `avanza di ${meta} esagoni capovolta: nella fase di artiglieria babordo e tribordo si scambiano`; }
      else { p.mod = { ca: -4, ab: -4, nota: '−4 CA e AB (avvitamento fallito)' }; fatto = `avanza di ${meta} esagoni senza capovolgersi, −4 a CA e AB`; }
    } else if (k === 'radente') {
      fatto = ok ? 'si muove normalmente e può attraversare l\'esagono di un nemico senza colpo gratuito; poi spara a quel nemico come a 1 esagono, su un quadrante a scelta' : 'si muove come previsto, ma senza i vantaggi (e il nemico attraversato può sparare il colpo gratuito)';
      if (ok) p.mod = { nota: 'volo radente riuscito' };
    } else if (k === 'speronamento') {
      fatto = ok ? 'distanza tra le virate +2 (massimo 4): muovi a piena velocità attraverso il nemico e fai una prova di artiglieria contro la sua CA (danni da collisione: vedi il wiki)' : 'manovra fallita: movimento normale';
      if (ok) p.mod = { nota: 'speronamento: virata +2' };
    }
    p.manovra = k;
    return `🎲 ${nome}: ${esito} — ${fatto}`;
  }

  // ---- Vista ----
  const COLORI_ARCO = { prua: 'arco-prua', tribordo: 'arco-tribordo', poppa: 'arco-poppa', babordo: 'arco-babordo' };
  function vista(c, { sola = false } = {}) {
    const b = battaglia(c);
    const cid = c.id;
    const lato = 20;
    // In sola lettura (giocatori) la scelta della nave resta solo su quello schermo
    const idSel = sola ? selLocale : b.sel;
    const sel = b.pedine.find((p) => p.id === idSel) || null;
    // Area: tutte le pedine con un margine (almeno 21 × 15 esagoni)
    const qs = b.pedine.map((p) => p.q + Math.floor(p.r / 2)), rs = b.pedine.map((p) => p.r);
    const r0 = Math.min(0, ...rs) - 3, r1 = Math.max(14, ...rs) + 3;
    const c0 = Math.min(0, ...qs) - 3, c1 = Math.max(20, ...qs) + 3;
    const raggio = sel ? Math.min(12, Math.max(6, ...armiDi(sel).map((a) => INCREMENTI[String(a[3]).toLowerCase()] || 1))) : 0;
    const esagoni = [];
    for (let r = r0; r <= r1; r++) {
      for (let col = c0; col <= c1; col++) {
        const q = col - Math.floor(r / 2);
        const [x, y] = pixel(q, r, lato);
        let classe = '';
        if (sel && distanza(sel, { q, r }) <= raggio && !(sel.q === q && sel.r === r)) {
          const ar = archi(sel, { q, r });
          classe = `${COLORI_ARCO[ar[0]]}${ar.length > 1 ? ' confine' : ''}`;
        }
        const punti = [...Array(6)].map((_, i) => { const ang = ((60 * i - 30) * Math.PI) / 180; return `${(x + lato * Math.cos(ang)).toFixed(1)},${(y + lato * Math.sin(ang)).toFixed(1)}`; }).join(' ');
        esagoni.push(`<polygon class="mp-es ${classe}" points="${punti}"${sola ? '' : ` data-azione="mp-esagono" data-camp="${cid}" data-q="${q}" data-r="${r}"`}/>`);
      }
    }
    const pedine = b.pedine.map((p) => {
      const st = statPedina(p);
      const [x, y] = pixel(p.q, p.r, lato);
      const ang = ANGOLI[p.dir];
      return `<g class="mp-pedina ${p.lato === 'nemico' ? 'nemico' : 'alleato'}${p.id === idSel ? ' sel' : ''}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"${sola ? ` data-azione="mp-guarda" data-p="${p.id}"` : ` data-azione="mp-seleziona" data-camp="${cid}" data-p="${p.id}"`}>
        <circle r="${lato * 0.78}"/><polygon class="mp-prua" points="${lato * 0.72},0 ${-lato * 0.42},${-lato * 0.42} ${-lato * 0.2},0 ${-lato * 0.42},${lato * 0.42}" transform="rotate(${ang})"/>
        <text y="${lato * 1.45}">${esc(st.nome.length > 12 ? st.nome.slice(0, 11) + '…' : st.nome)}</text></g>`;
    }).join('');
    const minX = pixel(c0 - Math.floor(r0 / 2) - 1, r0, lato)[0], maxX = pixel(c1 - Math.floor(r1 / 2) + 1, r1, lato)[0];
    const vbx = Math.min(minX, pixel(c0 - Math.floor(r1 / 2), r1, lato)[0]) - lato, vby = pixel(0, r0, lato)[1] - lato * 1.2;
    const w = Math.max(maxX, pixel(c1 - Math.floor(r0 / 2), r0, lato)[0]) + lato - vbx, h = pixel(0, r1, lato)[1] + lato * 2.2 - vby;
    const svg = `<div class="mp-scorri"><svg class="mp-mappa" viewBox="${vbx.toFixed(0)} ${vby.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" role="img" aria-label="Mappa del combattimento tra astronavi">${esagoni.join('')}${pedine}</svg></div>`;
    // Pannello della nave scelta
    let pannello = '<p class="muto">Tocca una nave sulla mappa per sceglierla: si vedono i suoi archi di fuoco e chi può colpire.</p>';
    if (sel) {
      const st = statPedina(sel);
      const blocco = puoVirare(sel, st.virata);
      const armi = armiDi(sel);
      const altre = b.pedine.filter((x) => x !== sel).map((o) => {
        const d = distanza(sel, o);
        const mieiArchi = archi(sel, o);
        const suoQuadrante = archi(o, sel);
        const utili = armi.map((a, i) => [a, i]).filter(([a]) => a[0] === 'torretta' || mieiArchi.includes(a[0])).map(([a, i]) => {
          const g = gittata(a[3], d);
          const sparata = (sel.sparate || []).includes(i);
          const tasto = !sola && g.ok && st.art !== null && st.art !== '' ? ` <button class="btn-mini" data-azione="mp-spara" data-camp="${cid}" data-a="${o.id}" data-i="${i}"${sparata ? ' disabled title="Già sparato in questo round"' : ` title="Spara: d20 ${st.art >= 0 ? '+' : ''}${st.art}${g.pen ? ` ${g.pen}` : ''} contro ${a[4] === 'tracciante' ? 'AB' : 'CA'}"`}>🎯</button>` : '';
          return g.ok ? `${esc(a[1])} ${g.pen ? `<b>${g.pen}</b>` : '<b>+0</b>'}${tasto}` : `<s>${esc(a[1])}</s>`;
        });
        const so = statPedina(o);
        return `<tr><td><b>${esc(so.nome)}</b>${so.ca !== '' ? ` <small class="muto">CA ${so.ca} · AB ${so.ab}${so.ps !== '' ? ` · PS ${so.ps}/${so.psMax}` : ''}</small>` : ''}</td><td>${d}</td><td>${mieiArchi.join(' / ')}</td><td>${suoQuadrante.join(' / ')}</td><td>${utili.join(', ') || '<span class="muto">nessuna arma in quell\'arco</span>'}</td></tr>`;
      }).join('');
      pannello = `<div class="mp-pannello">
        <div class="pf-riga"><b>${esc(st.nome)}</b> <span class="muto">velocità ${st.vel} · ${esc(st.man || 'manovrabilità ?')} (virata ${st.virata}) · mossi ${sel.mossi || 0}/${st.vel}${(sel.mossi || 0) > st.vel ? ' <span class="oltre">oltre la velocità</span>' : ''}${st.pil !== null && st.pil !== '' ? ` · Pilotare ${st.pil >= 0 ? '+' : ''}${st.pil}` : ''}${st.art !== null && st.art !== '' ? ` · artiglieria ${st.art >= 0 ? '+' : ''}${st.art}` : ''}</span>${sel.mod?.nota ? ` <span class="chip">${esc(sel.mod.nota)}</span>` : ''}</div>
        ${sola ? '' : `<div class="barra-azioni">
          <button data-azione="mp-vira" data-camp="${cid}" data-d="-1" title="Vira di 60° a sinistra"${blocco ? ' disabled' : ''}>↶ Vira a sinistra</button>
          <button class="primario" data-azione="mp-avanti" data-camp="${cid}" title="Avanti di un esagono">⬆ Avanti</button>
          <button data-azione="mp-vira" data-camp="${cid}" data-d="1" title="Vira di 60° a destra"${blocco ? ' disabled' : ''}>↷ Vira a destra</button>
          <button data-azione="mp-annulla" data-camp="${cid}" title="Annulla l'ultima mossa"${sel.storia?.length ? '' : ' disabled'}>↺ Annulla</button>
          <button data-azione="mp-sposta" data-camp="${cid}" class="${b.sposta ? 'attivo' : ''}" title="Poi tocca un esagono vuoto: la nave ci va direttamente (per piazzarla)">📍 ${b.sposta ? 'Tocca un esagono…' : 'Piazza'}</button>
          <button data-azione="mp-lato" data-camp="${cid}" title="Alleata o nemica">${sel.lato === 'nemico' ? '🔴 nemica' : '🔵 alleata'}</button>
          <button class="btn-cestino" data-azione="mp-togli" data-camp="${cid}" title="Togli dalla mappa">🗑</button></div>
          ${blocco ? `<p class="muto pf-aiuto">Virata: ${esc(blocco)}.</p>` : ''}
          <div class="pf-riga mp-manovre"><label>Manovra azzardata <select id="mp-manovra-${cid}">${MANOVRE.map(([k, nome, cd]) => `<option value="${k}">${esc(nome)}${cd ? ` (CD ${cd + Math.floor(1.5 * st.cat)})` : ''}</option>`).join('')}</select></label>
            <button data-azione="mp-manovra" data-camp="${cid}"${sel.manovra ? ' disabled title="Una manovra per round"' : ''}>🎲 Tenta</button>
            <small class="muto">la prova di Pilotare si tira da sola${st.pil === '' || st.pil === null ? ' (scrivi il bonus di Pilotare del nemico)' : ''}; il movimento si fa da solo dove si può</small></div>`}
        ${altre ? `<table class="nv-conti mp-tabella"><tr><th>Bersaglio</th><th>Distanza</th><th>Nel mio arco</th><th>Suo quadrante colpito</th><th>Armi (penalità di gittata)</th></tr>${altre}</table>
          <p class="muto pf-aiuto">Gittata: corta 5, media 10, lunga 20 esagoni; −2 per ogni incremento oltre il primo. Le armi in torretta sparano in tutti gli archi. Se il bersaglio sta su un confine si sceglie uno dei due archi.</p>` : ''}
      </div>`;
    }
    // Aggiunta delle pedine
    const navi = ctx.navi(cid).filter((v) => !b.pedine.some((p) => p.naveId === v.id));
    const aggiunte = sola ? '' : `<div class="pf-riga mp-aggiungi">
        ${navi.length ? `<label>Nave della campagna <select id="mp-nave-${cid}">${navi.map((v) => `<option value="${esc(v.id)}">${esc(v.nome)}</option>`).join('')}</select></label>
          <button class="btn-piccolo" data-azione="mp-aggiungi-nave" data-camp="${cid}">+ Sulla mappa</button>` : ''}
        <form class="riga-form" data-form="mp-nemico" data-camp="${cid}" autocomplete="off"><input name="nome" placeholder="Nemico rapido (nome)" required>
          <label>vel. <input name="vel" type="number" min="0" value="8" class="pf-corto"></label>
          <label>CA <input name="ca" type="number" class="pf-corto" value="14"></label><label>AB <input name="ab" type="number" class="pf-corto" value="14"></label>
          <label>PS <input name="ps" type="number" class="pf-corto" value="40"></label><label>Pilotare <input name="pil" type="number" class="pf-corto" value="7"></label>
          <label>artiglieria <input name="art" type="number" class="pf-corto" value="6"></label><label>danni <input name="danni" class="pf-corto" value="3d6"></label>
          <label>virata <select name="virata">${[[0, 'perfetta (0)'], [1, 'buona (1)'], [2, 'media (2)'], [3, 'scarsa (3)'], [4, 'maldestra (4)']].map(([v, t]) => `<option value="${v}"${v === 2 ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <button class="btn-piccolo">+ Nemico</button></form></div>`;
    return `<div class="mp" data-mappa="${cid}">
      <div class="pf-riga"><h3>🗺 Mappa del combattimento</h3><span class="muto">round <b>${b.round}</b></span>
        ${sola ? '' : `<button data-azione="mp-round" data-camp="${cid}" title="Nuovo round: si azzerano i movimenti">▶ Nuovo round</button>
        <button class="btn-mini" data-azione="mp-svuota" data-camp="${cid}" title="Togli tutte le navi dalla mappa">Svuota</button>`}
        <span class="mp-legenda"><i class="arco-prua"></i>prua <i class="arco-tribordo"></i>tribordo <i class="arco-poppa"></i>poppa <i class="arco-babordo"></i>babordo</span></div>
      ${aggiunte}
      ${b.pedine.length ? svg : '<p class="muto">Nessuna nave sulla mappa: aggiungi le astronavi della campagna o un nemico rapido.</p>'}
      ${b.pedine.length ? pannello : ''}
    </div>`;
  }

  // ---- Azioni ----
  let selLocale = '';
  const camp = (el) => ctx.campagna(el.dataset.camp);
  const fatto = () => { ctx.salva(); ctx.render(); };
  const azioni = {
    'mp-guarda'(el) { selLocale = selLocale === el.dataset.p ? '' : el.dataset.p; ctx.render(); },
    'mp-seleziona'(el) { const b = battaglia(camp(el)); b.sel = b.sel === el.dataset.p ? '' : el.dataset.p; b.sposta = false; fatto(); },
    'mp-esagono'(el) {
      const b = battaglia(camp(el));
      const q = Number(el.dataset.q), r = Number(el.dataset.r);
      const sel = b.pedine.find((p) => p.id === b.sel);
      if (sel && b.sposta) {
        if (!libero(b, q, r, sel)) { ctx.toast('Lì c\'è già un\'altra nave', 'errore'); return; }
        ricorda(sel); sel.q = q; sel.r = r; b.sposta = false; fatto();
        return;
      }
      const qui = b.pedine.find((p) => p.q === q && p.r === r);
      b.sel = qui ? qui.id : '';
      fatto();
    },
    'mp-avanti'(el) {
      const b = battaglia(camp(el));
      const p = b.pedine.find((x) => x.id === b.sel);
      if (!p) return;
      ricorda(p); avanti(p);
      const st = statPedina(p);
      if (!libero(b, p.q, p.r, p)) ctx.toast('Si può attraversare l\'esagono di un\'altra nave, ma non fermarsi lì (e una nave nemica può sparare un colpo gratuito alla poppa)');
      else if (p.mossi > st.vel) ctx.toast(`Oltre la velocità (${st.vel}): serve una manovra o un'azione che la aumenti`, 'errore');
      fatto();
    },
    'mp-vira'(el) {
      const b = battaglia(camp(el));
      const p = b.pedine.find((x) => x.id === b.sel);
      if (!p) return;
      const blocco = puoVirare(p, statPedina(p).virata);
      if (blocco) { ctx.toast(`Non può ancora virare: ${blocco}`, 'errore'); return; }
      ricorda(p); vira(p, Number(el.dataset.d)); fatto();
    },
    'mp-annulla'(el) {
      const b = battaglia(camp(el));
      const p = b.pedine.find((x) => x.id === b.sel);
      const s = p?.storia?.pop();
      if (s) { Object.assign(p, JSON.parse(s)); fatto(); }
    },
    'mp-manovra'(el) {
      const b = battaglia(camp(el));
      const p = b.pedine.find((x) => x.id === b.sel);
      const k = document.getElementById(`mp-manovra-${el.dataset.camp}`)?.value;
      if (!p || !k) return;
      const st = statPedina(p);
      ricorda(p);
      const testo = manovra(p, st, k, d20());
      fatto();
      ctx.toast(testo);
    },
    // Attacco: d20 + artiglieria + gittata contro CA (fuoco diretto) o AB (traccianti); se colpisce, danni sul quadrante rivolto all'attaccante
    'mp-spara'(el) {
      const b = battaglia(camp(el));
      const p = b.pedine.find((x) => x.id === b.sel);
      const o = b.pedine.find((x) => x.id === el.dataset.a);
      const i = Number(el.dataset.i);
      const arma = p && armiDi(p)[i];
      if (!p || !o || !arma) return;
      const st = statPedina(p), so = statPedina(o);
      const d = distanza(p, o);
      const g = gittata(arma[3], d);
      const contro = arma[4] === 'tracciante' ? 'AB' : 'CA';
      const dif = contro === 'AB' ? so.ab : so.ca;
      const tiro = d20();
      const tot = tiro + (Number(st.art) || 0) + g.pen;
      p.sparate = [...(p.sparate || []), i];
      const quad = archi(o, p)[0];
      let testo = `🎯 ${esc(st.nome)} → ${esc(so.nome)} con ${esc(arma[1])}: d20 ${tiro} ${Number(st.art) >= 0 ? '+' : ''}${Number(st.art) || 0}${g.pen ? ` ${g.pen}` : ''} = <b>${tot}</b>`;
      if (dif === '' || dif == null) { testo += ` (scrivi CA e AB del bersaglio per sapere se colpisce)`; fatto(); ctx.toast(testo); return; }
      if (tot < dif && tiro !== 20) { testo += ` contro ${contro} ${dif}: mancato`; fatto(); ctx.toast(testo); return; }
      const danni = ctx.tiraDanni(arma[5]);
      if (!danni) { testo += ` contro ${contro} ${dif}: <b>colpito</b> sul quadrante ${quad} (danni «${esc(arma[5])}» da tirare a mano)`; fatto(); ctx.toast(testo); return; }
      testo += ` contro ${contro} ${dif}: <b>colpito</b>${tiro === 20 ? ' (20 naturale)' : ''}, danni ${esc(danni.testo)} sul quadrante ${quad}`;
      if (so.v) testo += `<br>${ctx.colpisci(so.v, danni.totale, quad, tiro === 20)}`;
      else { o.danni = Number(o.danni || 0) + danni.totale; testo += so.psMax !== '' ? ` — PS ${so.psMax - o.danni}/${so.psMax}` : ''; }
      fatto();
      ctx.toast(testo);
    },
    'mp-sposta'(el) { const b = battaglia(camp(el)); b.sposta = !b.sposta; ctx.render(); },
    'mp-lato'(el) { const b = battaglia(camp(el)); const p = b.pedine.find((x) => x.id === b.sel); if (p) { p.lato = p.lato === 'nemico' ? 'alleato' : 'nemico'; fatto(); } },
    'mp-togli'(el) { const b = battaglia(camp(el)); b.pedine = b.pedine.filter((x) => x.id !== b.sel); b.sel = ''; fatto(); },
    'mp-round'(el) {
      const b = battaglia(camp(el));
      b.round += 1;
      for (const p of b.pedine) { p.mossi = 0; p.daVirata = 0; p.virateQui = 0; p.storia = []; p.sparate = []; p.manovra = ''; p.mod = {}; p.virataLibera = false; }
      fatto();
      ctx.toast(`▶ Round ${b.round}: ingegneria, manovra (chi ha la prova di Pilotare più bassa muove per primo), artiglieria`);
    },
    'mp-svuota'(el) { const c = camp(el); if (!confirm('Togliere tutte le navi dalla mappa?')) return; c.battaglia = { round: 1, pedine: [], sel: '', sposta: false }; fatto(); },
    'mp-aggiungi-nave'(el) {
      const c = camp(el);
      const b = battaglia(c);
      const id = document.getElementById(`mp-nave-${c.id}`)?.value;
      if (!id) return;
      const [q, r] = postoLibero(b);
      const p = { id: ctx.uid(), naveId: id, lato: 'alleato', q, r, dir: 0, mossi: 0, daVirata: 0, virateQui: 0 };
      b.pedine.push(p); b.sel = p.id; fatto();
    },
  };
  const moduli = {
    'mp-nemico'(d, form) {
      const c = ctx.campagna(form.dataset.camp);
      if (!c) return;
      const b = battaglia(c);
      const [q, r] = postoLibero(b);
      const MAN = ['perfetta', 'buona', 'media', 'scarsa', 'maldestra'];
      const virata = Number(d.get('virata')) || 0;
      const num = (k) => (d.get(k) === '' || d.get(k) == null ? '' : Number(d.get(k)));
      const p = { id: ctx.uid(), nome: String(d.get('nome') || 'Nemico').slice(0, 40), vel: Number(d.get('vel')) || 0, virata, man: MAN[virata], lato: 'nemico', q, r, dir: 3, mossi: 0, daVirata: 0, virateQui: 0,
        ca: num('ca'), ab: num('ab'), ps: num('ps'), pil: num('pil'), art: num('art'), danniArma: String(d.get('danni') || '').slice(0, 30), danni: 0 };
      b.pedine.push(p); b.sel = p.id; fatto();
    },
  };
  return { vista, azioni, moduli, geometria: { distanza, archi, gittata, avanti, vira, puoVirare, manovra, MANOVRE, DIREZIONI } };
};
