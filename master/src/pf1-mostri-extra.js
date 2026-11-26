'use strict';
// Mostri ufficiali di Pathfinder 1 che non sono (ancora) su Golarion Insider: presi da d20pfsrd.com (testo inglese, Paizo),
// con il nome originale quando non esiste una traduzione italiana. Solo i dati per il combattimento, stesso schema di src/pf1-mostri.js:
// [nome, GS, PE, tipo, taglia, allineamento, iniziativa, Percezione, CA, contatto, impreparato, PF, dadi vita, [Tem, Rif, Vol],
//  difese (RD, RI, immunità…), velocità, mischia, distanza, [FOR, DES, COS, INT, SAG, CAR], BAB, BMC, DMC, pagina wiki ('' = nome)]
window.PF1_MOSTRI_EXTRA = [
  // Petrifern (Ultimate Wilderness): https://www.d20pfsrd.com/bestiary/monster-listings/plants/petrifern/
  ['Petrifern', '1/6', 65, 'Vegetale', 'Minuto', 'N', -1, -2, 15, 13, 15, 5, '1d8+1', [3, -1, -2],
    'vista cieca 9 m; autopietrificazione (azione standard: +5 armatura naturale, resistenza 10 a freddo e fuoco, prende 10 a Furtività, ma non può muoversi né agire; si annulla con un\'azione standard); secrezione tossica (1 volta al giorno, a chi lo tocca: Infermo per 1d4 round, Tempra CD 11 nega); immunità Tratti dei Vegetali',
    '6 m', 'schianto +0 (1d2-4)', '', [2, 9, 13, null, 6, 9], 0, -5, 1, ''],
];
