// Motore dei dadi. Notazione supportata (termini sommati o sottratti):
//   2d6+3      dadi e costanti
//   d20, d%    un dado (d% = d100)
//   4d6kh3     tieni i 3 più alti (kl = più bassi)
//   6d10>=6    riserva: conta i dadi con risultato >= 6
(function () {
  function casuale(facce) {
    // Estrazione senza sbilanciamento tramite il generatore crittografico.
    const buf = new Uint32Array(1);
    const limite = Math.floor(0x100000000 / facce) * facce;
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limite);
    return (x % facce) + 1;
  }

  function tira(input) {
    let s = String(input || '').toLowerCase().replace(/\s+/g, '').replace(/d%/g, 'd100');
    if (!s) throw new Error("Scrivi un'espressione, es. 1d20+5");
    if (!/^[+-]/.test(s)) s = '+' + s;
    const termini = s.match(/[+-][^+-]+/g);
    if (!termini || termini.join('') !== s) throw new Error('Espressione non valida');
    if (termini.length > 20) throw new Error('Troppi termini (massimo 20)');

    const parti = [];
    let totale = 0;
    let riserva = false;
    for (const t of termini) {
      const segno = t[0] === '-' ? -1 : 1;
      const corpo = t.slice(1);
      const m = corpo.match(/^(\d*)d(\d+)(?:(kh|kl)(\d+)|>=(\d+))?$/);
      if (m) {
        const n = m[1] === '' ? 1 : parseInt(m[1], 10);
        const facce = parseInt(m[2], 10);
        if (n < 1 || n > 200) throw new Error('Da 1 a 200 dadi per termine');
        if (facce < 2 || facce > 1000) throw new Error('Il dado deve avere da 2 a 1000 facce');
        const valori = Array.from({ length: n }, () => ({ v: casuale(facce) }));
        let sub = 0;
        let mod = '';
        if (m[3]) {
          const k = parseInt(m[4], 10);
          if (k < 1 || k > n) throw new Error(`Puoi tenere da 1 a ${n} dadi`);
          const ordinati = valori.map((x, i) => i).sort((a, b) => m[3] === 'kh' ? valori[b].v - valori[a].v : valori[a].v - valori[b].v);
          ordinati.slice(k).forEach((i) => { valori[i].scartato = true; });
          sub = valori.filter((x) => !x.scartato).reduce((a, x) => a + x.v, 0);
          mod = m[3] + k;
        } else if (m[5]) {
          const soglia = parseInt(m[5], 10);
          valori.forEach((x) => { x.successo = x.v >= soglia; });
          sub = valori.filter((x) => x.successo).length;
          mod = '>=' + soglia;
          riserva = true;
        } else {
          sub = valori.reduce((a, x) => a + x.v, 0);
        }
        valori.forEach((x) => { x.max = x.v === facce; x.min = x.v === 1; });
        parti.push({ tipo: 'dadi', segno, n, facce, mod, valori, sub });
        totale += segno * sub;
      } else if (/^\d+$/.test(corpo)) {
        const v = parseInt(corpo, 10);
        parti.push({ tipo: 'num', segno, v });
        totale += segno * v;
      } else {
        throw new Error(`Termine non valido: «${corpo}»`);
      }
    }
    return { espr: String(input).trim(), totale, parti, riserva };
  }

  window.Dadi = { tira };
})();
