'use strict';
// Talenti di PF1: elenco (da src/pf1-talenti-dati.js) e lettura dei prerequisiti scritti sul wiki
// in requisiti controllabili sulla scheda (caratteristiche, BAB, talenti, gradi, livelli, razza, incantesimi).
// Quello che non si riesce a leggere (privilegi di classe, allineamento…) resta "da verificare".
(function () {
  const norm = (s) => String(s).replace(/­/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
  const voci = (window.PF1_TALENTI_DATI || []).map(([nome, en, tipi, prerequisiti, manuale, pagina]) => ({
    nome, en, tipi: tipi ? tipi.split(', ') : [], prerequisiti, manuale, pagina: pagina || `Talenti/${nome}`,
  }));
  const perNome = new Map(voci.map((t) => [norm(t.nome), t]));
  const razze = new Map(Object.keys(window.PF1_RAZZE || {}).map((r) => [norm(r), r]));
  const CAR = { forza: 'FOR', for: 'FOR', destrezza: 'DES', des: 'DES', costituzione: 'COS', cos: 'COS', intelligenza: 'INT', int: 'INT', saggezza: 'SAG', sag: 'SAG', carisma: 'CAR', car: 'CAR' };

  // Divide alle virgole e ai punti e virgola che non sono tra parentesi
  function dividi(testo) {
    const out = [];
    let liv = 0, cur = '';
    for (const ch of testo) {
      if (ch === '(') liv++;
      if (ch === ')') liv = Math.max(0, liv - 1);
      if ((ch === ',' || ch === ';') && liv === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.replace(/^\s*(e|ed|oppure)\s+/i, '').replace(/[.\s]+$/, '').trim()).filter(Boolean);
  }

  // Un singolo requisito
  function atomo(s) {
    const t = s.trim().replace(/[.]+$/, '');
    const n = norm(t);
    let m;
    if ((m = n.match(/^(forza|destrezza|costituzione|intelligenza|saggezza|carisma|for|des|cos|int|sag|car)\.?\s+(\d+)(\s*\+|\s+o superiore)?$/))) return { k: 'car', c: CAR[m[1]], v: +m[2] };
    if ((m = n.match(/^(?:bonus di attacco base|bab)\s*\+?\s*(\d+)(\s+o superiore)?$/))) return { k: 'bab', v: +m[1] };
    if ((m = n.match(/^(?:(\d+)\s*[°º]?\s*(?:categoria|grado) mitic[oa]|(?:categoria|grado) mitic[oa]\s*(\d+))/))) return { k: 'mitico', v: +(m[1] || m[2]) };
    if ((m = n.match(/^(?:livello (?:di |dell'|del )?incantatore|li)\s*(\d+)\s*[°º]?(?:\s+o superiore)?$/))) return { k: 'li', v: +m[1] };
    if ((m = n.match(/^(?:livello del personaggio\s*(\d+)|(\d+)\s*[°º]\s*livello del personaggio|personaggio di (\d+)\s*[°º]\s*livello)/))) return { k: 'liv', v: +(m[1] || m[2] || m[3]) };
    if ((m = t.match(/^(.+?)\s+(\d+)\s+grad[oi]$/i)) || (m = t.match(/^(\d+)\s+grad[oi]\s+(?:in|di)\s+(.+)$/i))) {
      const [abil, v] = /^\d+$/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
      return { k: 'gradi', abil: abil.trim(), v: +v };
    }
    if ((m = t.match(/^(.+?)\s+di\s+(\d+)\s*[°º]\s*livello$/i)) || (m = t.match(/^(?:livello\s+)?(\d+)\s*[°º]?\s*(?:livello\s+)?(?:da|di|come)\s+(.+)$/i))) {
      const [nome, v] = /^\d+$/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
      if (/incantatore/i.test(nome)) return { k: 'li', v: +v };
      if (/personaggio/i.test(nome)) return { k: 'liv', v: +v };
      if (/scelto|selezionato|preso/i.test(nome)) return { k: 'testo', testo: t };
      if (/incantesim/i.test(nome)) return { k: 'inc', tipo: /arcani/i.test(nome) && !/divini/i.test(nome) ? 'arcani' : /divini/i.test(nome) && !/arcani/i.test(nome) ? 'divini' : '', L: +v };
      return { k: 'classe', nome: nome.trim(), v: +v };
    }
    if ((m = n.match(/^(\d+)\s*[°º]?\s*livello (?:di |dell')?incantatore$/))) return { k: 'li', v: +m[1] };
    if ((m = n.match(/^(\d+)\s+(?:o piu\s+)?dadi vita$/))) return { k: 'liv', v: +m[1] };
    if ((m = n.match(/^capacita di lanciare incantesimi( arcani| divini)?(?: di (\d+)\s*[°º] livello)?$/))) return { k: 'inc', tipo: (m[1] || '').trim(), L: +(m[2] || 0) };
    if ((m = t.match(/^privilegi[oi] di classe\s+(.+)$/i))) return { k: 'priv', nome: m[1].trim() };
    if ((m = t.match(/^tratt[oi] razzial[ei]\s+(.+)$/i))) return { k: 'tratto', nome: m[1].trim() };
    if ((m = n.match(/^allineamento\s+(.+)$/))) return { k: 'allin', testo: m[1] };
    if ((m = n.match(/^taglia\s+(minuscola|piccolissima|minuta|piccola|media|grande|enorme|mastodontica|colossale)(?:\s+o\s+(superiore|inferiore))?$/))) return { k: 'taglia', taglia: m[1], verso: m[2] || '' };
    if ((m = t.match(/^(.+?)\s+(\d+)\s*[°º]\s*livello$/i)) && !/incantatore|personaggio/i.test(m[1])) return { k: 'classe', nome: m[1].trim(), v: +m[2] };
    if (razze.has(n)) return { k: 'razza', nome: razze.get(n) };
    if (perNome.has(n)) return { k: 'tal', nome: perNome.get(n).nome, param: '' };
    if ((m = t.match(/^(.+?)\s*\(([^)]*)\)$/)) && perNome.has(norm(m[1]))) return { k: 'tal', nome: perNome.get(norm(m[1])).nome, param: m[2].trim() };
    return { k: 'testo', testo: t };
  }

  // Prerequisiti di un talento: elenco di requisiti, ognuno soddisfatto da una delle sue alternative
  const cache = new Map();
  function requisiti(talento) {
    if (cache.has(talento.nome)) return cache.get(talento.nome);
    const out = dividi((talento.prerequisiti || '').replace(/­/g, '')).map((pezzo) => {
      // "Intelligenza o Carisma 13": il punteggio vale per entrambe
      const dc = norm(pezzo).match(/^(forza|destrezza|costituzione|intelligenza|saggezza|carisma) o (forza|destrezza|costituzione|intelligenza|saggezza|carisma) (\d+)$/);
      if (dc) return { testo: pezzo, alt: [{ k: 'car', c: CAR[dc[1]], v: +dc[3] }, { k: 'car', c: CAR[dc[2]], v: +dc[3] }] };
      // "o superiore", "o inferiore", "o più" non separano alternative
      const alt = pezzo.split(/\s+o\s+(?!superiore|inferiore|più|piu|maggiore)|\s+oppure\s+/i).map(atomo);
      // Se un'alternativa non si legge, il pezzo intero resta un requisito da verificare a mano
      return { testo: pezzo, alt: alt.some((a) => a.k === 'testo') && alt.length > 1 ? [{ k: 'testo', testo: pezzo }] : alt };
    });
    // I talenti mitici richiedono almeno la 1ª categoria mitica
    if (talento.tipi.includes('Mitico') && !out.some((r) => r.alt.some((a) => a.k === 'mitico'))) out.push({ testo: '1ª categoria mitica', alt: [{ k: 'mitico', v: 1 }] });
    cache.set(talento.nome, out);
    return out;
  }

  const tipi = [...new Set(voci.flatMap((t) => t.tipi))].sort((a, b) => a.localeCompare(b, 'it'));
  const manuali = [...new Set(voci.map((t) => t.manuale).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  window.PF1_TALENTI = { voci, perNome, norm, requisiti, tipi, manuali, talento: (nome) => perNome.get(norm(nome)) || null };
})();
