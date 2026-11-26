'use strict';
// Creazione dei mostri (Pathfinder 1) — tabelle dalla pagina «Creazione Mostri» di golarion.altervista.org
(function () {
  const GS = ['1/2', ...Array.from({ length: 25 }, (_, i) => String(i + 1))];
  // Statistiche dei mostri per GS: [PF, CA, attacco maggiore, attacco minore, danno alto, danno basso, CD primaria, CD secondaria, TS buono, TS scarso]
  const RIGHE = [
    [10, 11, 1, 0, 4, 3, 11, 8, 3, 0], [15, 12, 2, 1, 7, 5, 12, 9, 4, 1], [20, 14, 4, 3, 10, 7, 13, 9, 5, 1], [30, 15, 6, 4, 13, 9, 14, 10, 6, 2],
    [40, 17, 8, 6, 16, 12, 15, 10, 7, 3], [55, 18, 10, 7, 20, 15, 15, 11, 8, 4], [70, 19, 12, 8, 25, 18, 16, 11, 9, 5], [85, 20, 13, 10, 30, 22, 17, 12, 10, 6],
    [100, 21, 15, 11, 35, 26, 18, 12, 11, 7], [115, 23, 17, 12, 40, 30, 18, 13, 12, 8], [130, 24, 18, 13, 45, 33, 19, 13, 13, 9], [145, 25, 19, 14, 50, 37, 20, 14, 14, 10],
    [160, 27, 21, 15, 55, 41, 21, 15, 15, 11], [180, 28, 22, 16, 60, 45, 21, 15, 16, 12], [200, 29, 23, 17, 65, 48, 22, 16, 17, 12], [220, 30, 24, 18, 70, 52, 23, 16, 18, 13],
    [240, 31, 26, 19, 80, 60, 24, 17, 19, 14], [270, 32, 27, 20, 90, 67, 24, 18, 20, 15], [300, 33, 28, 21, 100, 75, 25, 18, 20, 16], [330, 34, 29, 22, 110, 82, 26, 19, 21, 16],
    [370, 36, 30, 23, 120, 90, 27, 20, 22, 17], [400, 37, 31, 24, 130, 98, 27, 20, 23, 18], [440, 39, 32, 25, 140, 105, 28, 21, 23, 18], [480, 40, 33, 26, 150, 113, 29, 22, 24, 19],
    [520, 42, 35, 27, 165, 124, 30, 23, 25, 20], [560, 43, 36, 28, 180, 135, 30, 24, 26, 21],
  ];
  const STATISTICHE = Object.fromEntries(GS.map((g, i) => {
    const [pf, ca, attMagg, attMin, danniAlto, danniBasso, cdPrim, cdSec, tsBuono, tsScarso] = RIGHE[i];
    return [g, { pf, ca, attMagg, attMin, danniAlto, danniBasso, cdPrim, cdSec, tsBuono, tsScarso }];
  }));
  // Dadi Vita medi per tipo, GS da 1/2 a 20
  const DV_PER_TIPO = {
    Aberrazione: [1, 2, 3, 4, 5, 7, 9, 10, 12, 14, 15, 16, 17, 19, 20, 22, 24, 26, 28, 30, 34],
    Animale: [1, 2, 3, 4, 5, 7, 9, 10, 12, 14, 15, 16, 17, 19, 20, 22, 24, 26, 28, 30, 34],
    'Bestia Magica': [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 18, 19, 20, 21, 23, 25, 28, 31],
    Costrutto: [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 18, 19, 20, 21, 23, 25, 28, 31],
    Drago: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 21, 23, 25, 29],
    Esterno: [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 18, 19, 20, 21, 23, 25, 28, 31],
    Folletto: [2, 3, 4, 5, 6, 8, 10, 12, 13, 15, 17, 18, 20, 22, 23, 25, 26, 28, 31, 33, 37],
    Melma: [1, 2, 3, 4, 5, 7, 9, 10, 12, 14, 15, 16, 17, 19, 20, 22, 24, 26, 28, 30, 34],
    'Non Morto': [1, 2, 3, 4, 5, 7, 9, 10, 12, 14, 15, 16, 17, 19, 20, 22, 24, 26, 28, 30, 34],
    Parassita: [1, 2, 3, 4, 5, 7, 9, 10, 12, 14, 15, 16, 17, 19, 20, 22, 24, 26, 28, 30, 32],
    Umanoide: [1, 2, 3, 4, 5, 7, 9, 10, 12, 14, 15, 16, 17, 19, 20, 22, 24, 26, 28, 30, 34],
    'Umanoide Mostruoso': [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 18, 19, 20, 21, 23, 25, 28, 31],
    Vegetale: [1, 2, 3, 4, 5, 7, 9, 10, 12, 14, 15, 16, 17, 19, 20, 22, 24, 26, 28, 30, 34],
  };
  // Statistiche per tipo: dado vita, BAB (veloce/medio/lento), TS buoni (T/R/V; numero = "a scelta"), gradi per DV, abilità di classe
  const TIPI = {
    Aberrazione: { dado: 8, bab: 'medio', ts: 'V', gradi: 4, abil: 'Acrobazia, Artista della Fuga, Conoscenze (una a scelta), Furtività, Intimidire, Nuotare, Percezione, Sapienza Magica, Scalare, Sopravvivenza, Volare' },
    Animale: { dado: 8, bab: 'medio', ts: 'TR', gradi: 2, abil: 'Acrobazia, Furtività, Nuotare, Percezione, Scalare, Volare' },
    'Bestia Magica': { dado: 10, bab: 'veloce', ts: 'TR', gradi: 2, abil: 'Acrobazia, Furtività, Nuotare, Percezione, Scalare, Volare' },
    Costrutto: { dado: 10, bab: 'veloce', ts: '', gradi: 2, abil: 'nessuna' },
    Drago: { dado: 12, bab: 'veloce', ts: 'TRV', gradi: 6, abil: 'Artigianato, Conoscenze (tutte), Diplomazia, Furtività, Guarire, Intimidire, Intuizione, Linguistica, Nuotare, Percezione, Raggirare, Sapienza Magica, Scalare, Sopravvivenza, Utilizzare Congegni Magici, Valutare, Volare' },
    Esterno: { dado: 10, bab: 'veloce', ts: 2, gradi: 6, abil: 'Artigianato, Conoscenze (piani), Furtività, Intuizione, Percezione, Raggirare' },
    Folletto: { dado: 6, bab: 'lento', ts: 'RV', gradi: 6, abil: 'Artigianato, Artista della Fuga, Camuffare, Conoscenze (geografia), Conoscenze (locali), Conoscenze (natura), Diplomazia, Furtività, Intrattenere, Intuizione, Nuotare, Percezione, Raggirare, Rapidità di Mano, Scalare, Utilizzare Congegni Magici, Volare' },
    Melma: { dado: 8, bab: 'medio', ts: '', gradi: 2, abil: 'nessuna' },
    'Non Morto': { dado: 8, bab: 'medio', ts: 'V', gradi: 4, abil: 'Camuffare, Conoscenze (arcane), Conoscenze (religioni), Furtività, Intimidire, Intuizione, Percezione, Sapienza Magica, Scalare, Volare' },
    Parassita: { dado: 8, bab: 'medio', ts: 'T', gradi: 2, abil: 'nessuna' },
    Umanoide: { dado: 8, bab: 'medio', ts: 1, gradi: 2, abil: 'Addestrare Animali, Artigianato, Cavalcare, Guarire, Professione, Scalare, Sopravvivenza' },
    'Umanoide Mostruoso': { dado: 10, bab: 'medio', ts: 'RV', gradi: 4, abil: 'Artigianato, Cavalcare, Furtività, Intimidire, Nuotare, Percezione, Scalare, Sopravvivenza, Volare' },
    Vegetale: { dado: 8, bab: 'medio', ts: 'T', gradi: 2, abil: 'Furtività, Percezione' },
  };
  // Taglia: [GS minimo, GS massimo, FOR base, DES base, COS base, modificatore di taglia a CA e attacco]
  const TAGLIE = {
    Piccolissima: ['', 2, 1, 18, 8, 8], Minuta: ['', 4, 1, 16, 8, 4], Minuscola: ['', 6, 2, 14, 8, 2], Piccola: ['', '', 6, 12, 8, 1], Media: ['', '', 10, 10, 10, 0],
    Grande: [2, '', 18, 8, 14, -1], Enorme: [4, '', 26, 6, 18, -2], Mastodontica: [6, '', 34, 6, 22, -4], Colossale: [8, '', 42, 6, 26, -8],
  };
  // PE e tesoro (mo, avanzamento lento/medio/veloce) per GS
  const PE_MO = {
    '1/8': [50, 20, 35, 50], '1/6': [65, 30, 45, 65], '1/4': [100, 40, 65, 100], '1/3': [135, 55, 85, 135], '1/2': [200, 85, 130, 200],
    1: [400, 170, 260, 400], 2: [600, 350, 550, 800], 3: [800, 550, 800, 1200], 4: [1200, 750, 1150, 1700], 5: [1600, 1000, 1550, 2300],
    6: [2400, 1350, 2000, 3000], 7: [3200, 1750, 2600, 3900], 8: [4800, 2200, 3350, 5000], 9: [6400, 2850, 4250, 6400], 10: [9600, 3650, 5450, 8200],
    11: [12800, 4650, 7000, 10500], 12: [19200, 6000, 9000, 13500], 13: [25600, 7750, 11600, 17500], 14: [38400, 10000, 15000, 22000], 15: [51200, 13000, 19500, 29000],
    16: [76800, 16500, 25000, 38000], 17: [102400, 22000, 32000, 48000], 18: [153600, 28000, 41000, 62000], 19: [204800, 35000, 53000, 79000], 20: [307200, 44000, 67000, 100000],
    21: [409600, 56000, 84000, 126000], 22: [615000, 70000, 105000, 158000], 23: [820000, 88000, 132000, 198000], 24: [1230000, 110000, 165000, 248000], 25: [1640000, 138000, 208000, 312000],
  };
  window.PF1_CREAZIONE_MOSTRI = { GS, STATISTICHE, DV_PER_TIPO, TIPI, TAGLIE, PE_MO, MEDIA_DADO: { 4: 2.5, 6: 3.5, 8: 4.5, 10: 5.5, 12: 6.5, 20: 10.5 } };
})();
