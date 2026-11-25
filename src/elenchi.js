'use strict';
// Suggerimenti dei campi di testo con un elenco (<input list="…"> + <datalist>), fatti in casa.
// L'elenco nativo del browser si apre solo in certi casi e sui tablet e telefoni funziona male: qui ogni campo con
// un elenco mostra, mentre si scrive, le voci che contengono il testo, in un riquadro che si sceglie col dito o col mouse.
// Il campo resta libero: si può sempre scrivere un valore che non è nell'elenco.
(function () {
  const MAX = 40; // voci mostrate al massimo (le altre: si restringe scrivendo)
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let box = null;
  let campo = null;
  let voci = [];
  let sel = -1;

  // Toglie l'elenco nativo (così il browser non apre il suo) e ricorda quale datalist usare
  function converti(radice) {
    const campi = radice.matches?.('input[list]') ? [radice] : [...(radice.querySelectorAll?.('input[list]') || [])];
    for (const inp of campi) { inp.dataset.elenco = inp.getAttribute('list'); inp.removeAttribute('list'); inp.setAttribute('autocomplete', 'off'); }
  }

  function riquadro() {
    if (box) return box;
    box = document.createElement('div');
    box.id = 'elenco-sugg';
    box.hidden = true;
    box.setAttribute('role', 'listbox');
    // Toccare il riquadro non deve togliere il fuoco al campo
    box.addEventListener('mousedown', (e) => e.preventDefault());
    box.addEventListener('click', (e) => { const el = e.target.closest('[data-i]'); if (el) scegli(Number(el.dataset.i)); });
    document.body.appendChild(box);
    return box;
  }

  function opzioni(inp) {
    const dl = document.getElementById(inp.dataset.elenco || '');
    return dl ? [...dl.options].map((o) => ({ v: o.value, t: (o.textContent || o.label || '').trim() })).filter((o) => o.v) : [];
  }

  function aggiorna() {
    if (!campo) return;
    const q = norm(campo.value);
    const tutte = opzioni(campo);
    let trovate = q ? tutte.filter((o) => norm(o.v).includes(q) || (o.t && norm(o.t).includes(q))) : tutte;
    if (q) trovate = [...trovate.filter((o) => norm(o.v).startsWith(q)), ...trovate.filter((o) => !norm(o.v).startsWith(q))];
    // Se il campo contiene già esattamente una voce e non ce ne sono altre, non serve il riquadro
    if (trovate.length === 1 && norm(trovate[0].v) === q) trovate = [];
    voci = trovate.slice(0, MAX);
    sel = -1;
    disegna(trovate.length);
  }

  function disegna(totale) {
    const b = riquadro();
    if (!campo || !voci.length) { b.hidden = true; return; }
    b.innerHTML = voci.map((o, i) => `<div class="sugg${i === sel ? ' sel' : ''}" data-i="${i}" role="option">${esc(o.v)}${o.t && o.t !== o.v ? ` <small class="muto">${esc(o.t)}</small>` : ''}</div>`).join('')
      + (totale > voci.length ? `<div class="sugg-aiuto">altre ${totale - voci.length} voci: scrivi per restringere</div>` : '');
    b.hidden = false;
    posiziona();
  }

  // Sotto il campo, oppure sopra se sotto non c'è posto; largo almeno quanto il campo
  function posiziona() {
    if (!box || box.hidden || !campo) return;
    const r = campo.getBoundingClientRect();
    if (!r.width && !r.height) { chiudi(); return; } // campo sparito (pagina ridisegnata)
    const largo = Math.min(Math.max(r.width, 240), window.innerWidth - 16);
    box.style.width = largo + 'px';
    box.style.left = Math.max(8, Math.min(r.left, window.innerWidth - largo - 8)) + 'px';
    const sotto = window.innerHeight - r.bottom - 8;
    const sopra = r.top - 8;
    const giu = sotto >= 180 || sotto >= sopra;
    box.style.maxHeight = Math.max(120, Math.min(320, giu ? sotto : sopra)) + 'px';
    box.style.top = giu ? r.bottom + 2 + 'px' : '';
    box.style.bottom = giu ? '' : window.innerHeight - r.top + 2 + 'px';
  }

  function scegli(i) {
    const o = voci[i];
    if (!o || !campo) return;
    const c = campo;
    c.value = o.v;
    chiudi();
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function chiudi() {
    if (box) box.hidden = true;
    campo = null;
    voci = [];
  }

  function evidenzia(nuovo) {
    sel = Math.max(-1, Math.min(voci.length - 1, nuovo));
    box?.querySelectorAll('.sugg').forEach((el, i) => el.classList.toggle('sel', i === sel));
    box?.querySelector('.sugg.sel')?.scrollIntoView({ block: 'nearest' });
  }

  function avvia() {
    converti(document.body);
    // I campi nuovi (ogni volta che una pagina viene ridisegnata) perdono subito l'elenco nativo
    new MutationObserver((mut) => { for (const m of mut) for (const n of m.addedNodes) if (n.nodeType === 1) converti(n); })
      .observe(document.body, { childList: true, subtree: true });
    document.addEventListener('focusin', (e) => {
      const t = e.target;
      if (t.matches?.('input[list]')) converti(t);
      if (t.matches?.('input[data-elenco]')) { campo = t; aggiorna(); } else if (campo && t !== campo) chiudi();
    });
    document.addEventListener('input', (e) => { if (e.target === campo) aggiorna(); });
    // Con il fuoco già nel campo, un tocco riapre l'elenco chiuso
    document.addEventListener('click', (e) => { if (e.target.matches?.('input[data-elenco]') && (!box || box.hidden)) { campo = e.target; aggiorna(); } });
    document.addEventListener('focusout', (e) => { if (e.target === campo) setTimeout(() => { if (document.activeElement !== campo) chiudi(); }, 120); });
    document.addEventListener('keydown', (e) => {
      if (e.target !== campo || !box || box.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); evidenzia(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); evidenzia(sel - 1); }
      else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); e.stopPropagation(); scegli(sel); }
      else if (e.key === 'Escape') { e.stopPropagation(); chiudi(); }
    }, true);
    window.addEventListener('scroll', posiziona, true);
    window.addEventListener('resize', posiziona);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
