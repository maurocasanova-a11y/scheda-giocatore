'use strict';
// D&D 5ª edizione (regole 2014): fatti di regola dal Manuale del Giocatore (edizione italiana), solo dati, nessuna descrizione.
// Hanno la precedenza sui dati presi dal wiki (src/dnd-dati.js): classi con tabelle di progressione complete, razze, background.
(function () {
  const ASI = 'Aumento dei Punteggi di Caratteristica';
  const comp = (L) => `+${2 + Math.floor((L - 1) / 4)}`;
  const trattino = (v) => (v === undefined || v === null || v === '' ? '—' : String(v));
  // Slot per livello d'incantesimo: incantatori completi (bardo, chierico, druido, mago, stregone) e a metà (paladino, ranger)
  const PIENO = [[2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
  const META = [[], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];
  const slot = (tab, L, quanti) => Array.from({ length: quanti }, (_, i) => trattino(tab[L - 1][i]));
  const LIV9 = ['1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°'];
  const LIV5 = ['1°', '2°', '3°', '4°', '5°'];
  const per3 = (a, b, c) => (L) => (L >= 10 ? c : L >= 4 ? b : a); // trucchetti: 1-3, 4-9, 10-20
  // Costruisce la tabella: privilegi (20 righe) e colonne extra calcolate per livello
  function tabella(colonne, privilegi, extra) {
    return { colonne, righe: privilegi.map((p, i) => extra(i + 1, p || '—')) };
  }

  const classi = {
    Barbaro: {
      dado: 12, ts: ['FOR', 'COS'], quante: 2, abil: ['Addestrare Animali', 'Atletica', 'Intimidire', 'Natura', 'Percezione', 'Sopravvivenza'],
      armature: 'Armature leggere, armature medie, scudi', armi: 'Armi semplici, armi da guerra', attrezzi: 'Nessuno', sotto: 3,
      sottoclassi: ['Cammino del Berserker', 'Cammino del Combattente Totemico'],
      ...tabella(['Bonus di Competenza', 'Privilegi', 'Ire', "Danni dell'Ira"], [
        'Ira, Difesa Senza Armatura', 'Attacco Irruento, Percezione del Pericolo', 'Cammino Primordiale', ASI, 'Attacco Extra, Movimento Veloce',
        'Privilegio del Cammino', 'Istinto Ferino', ASI, 'Critico Brutale (1 dado)', 'Privilegio del Cammino', 'Ira Implacabile', ASI, 'Critico Brutale (2 dadi)',
        'Privilegio del Cammino', 'Ira Persistente', ASI, 'Critico Brutale (3 dadi)', 'Potenza Indomabile', ASI, 'Campione Primordiale',
      ], (L, p) => [comp(L), p, L === 20 ? 'Illimitate' : String(L >= 17 ? 6 : L >= 12 ? 5 : L >= 6 ? 4 : L >= 3 ? 3 : 2), L >= 16 ? '+4' : L >= 9 ? '+3' : '+2']),
    },
    Bardo: {
      dado: 8, ts: ['DES', 'CAR'], quante: 3, abil: null, // tre a scelta, qualsiasi
      armature: 'Armature leggere', armi: 'Armi semplici, balestre a mano, spade corte, spade lunghe, stocchi', attrezzi: 'Tre strumenti musicali a scelta', sotto: 3,
      sottoclassi: ['Collegio della Sapienza', 'Collegio del Valore'],
      ...tabella(['Bonus di Competenza', 'Privilegi', 'Trucchetti Conosciuti', 'Incantesimi Conosciuti', ...LIV9], [
        'Incantesimi, Ispirazione Bardica (d6)', 'Factotum, Canto di Riposo (d6)', 'Collegio Bardico, Maestria', ASI, 'Ispirazione Bardica (d8), Fonte di Ispirazione',
        'Controfascino, Privilegio del Collegio Bardico', '', ASI, 'Canto di Riposo (d8)', 'Ispirazione Bardica (d10), Maestria, Segreti Magici', '', ASI,
        'Canto di Riposo (d10)', 'Segreti Magici, Privilegio del Collegio Bardico', 'Ispirazione Bardica (d12)', ASI, 'Canto di Riposo (d12)', 'Segreti Magici', ASI, 'Ispirazione Superiore',
      ], (L, p) => [comp(L), p, String(per3(2, 3, 4)(L)), String([4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22][L - 1]), ...slot(PIENO, L, 9)]),
    },
    Chierico: {
      dado: 8, ts: ['SAG', 'CAR'], quante: 2, abil: ['Intuizione', 'Medicina', 'Persuasione', 'Religione', 'Storia'],
      armature: 'Armature leggere, armature medie, scudi', armi: 'Armi semplici', attrezzi: 'Nessuno', sotto: 1,
      sottoclassi: ['Dominio della Conoscenza', 'Dominio della Guerra', "Dominio dell'Inganno", 'Dominio della Luce', 'Dominio della Natura', 'Dominio della Tempesta', 'Dominio della Vita'],
      ...tabella(['Bonus di Competenza', 'Privilegi', 'Trucchetti Conosciuti', ...LIV9], [
        'Incantesimi, Dominio Divino', 'Incanalare Divinità (1/riposo), Privilegio del Dominio Divino', '', ASI, 'Distruggere Non Morti (GS 1/2)',
        'Incanalare Divinità (2/riposo), Privilegio del Dominio Divino', '', `${ASI}, Distruggere Non Morti (GS 1), Privilegio del Dominio Divino`, '', 'Intervento Divino',
        'Distruggere Non Morti (GS 2)', ASI, '', 'Distruggere Non Morti (GS 3)', '', ASI, 'Distruggere Non Morti (GS 4), Privilegio del Dominio Divino',
        'Incanalare Divinità (3/riposo)', ASI, 'Intervento Divino Migliorato',
      ], (L, p) => [comp(L), p, String(per3(3, 4, 5)(L)), ...slot(PIENO, L, 9)]),
    },
    Druido: {
      dado: 8, ts: ['INT', 'SAG'], quante: 2, abil: ['Addestrare Animali', 'Arcano', 'Intuizione', 'Medicina', 'Natura', 'Percezione', 'Religione', 'Sopravvivenza'],
      armature: 'Armature leggere, armature medie, scudi (non di metallo)', armi: 'Bastoni ferrati, dardi, falcetti, fionde, giavellotti, lance, mazze, pugnali, randelli, scimitarre', attrezzi: 'Borsa da erborista', sotto: 2,
      sottoclassi: ['Circolo della Terra', 'Circolo della Luna'],
      ...tabella(['Bonus di Competenza', 'Privilegi', 'Trucchetti Conosciuti', ...LIV9], [
        'Druidico, Incantesimi', 'Forma Selvatica, Circolo Druidico', '', `Forma Selvatica Migliorata, ${ASI}`, '', 'Privilegio del Circolo Druidico', '',
        `Forma Selvatica Migliorata, ${ASI}`, '', 'Privilegio del Circolo Druidico', '', ASI, '', 'Privilegio del Circolo Druidico', '', ASI, '',
        'Corpo Senza Tempo, Incantesimi Bestiali', ASI, 'Arcidruido',
      ], (L, p) => [comp(L), p, String(per3(2, 3, 4)(L)), ...slot(PIENO, L, 9)]),
    },
    Guerriero: {
      dado: 10, ts: ['FOR', 'COS'], quante: 2, abil: ['Acrobazia', 'Addestrare Animali', 'Atletica', 'Intimidire', 'Intuizione', 'Percezione', 'Sopravvivenza', 'Storia'],
      armature: 'Tutte le armature, scudi', armi: 'Armi semplici, armi da guerra', attrezzi: 'Nessuno', sotto: 3,
      sottoclassi: ['Campione', 'Maestro di Battaglia', 'Cavaliere Mistico'],
      ...tabella(['Bonus di Competenza', 'Privilegi'], [
        'Stile di Combattimento, Recuperare Energie', 'Azione Impetuosa (un utilizzo)', 'Archetipo Marziale', ASI, 'Attacco Extra', ASI, "Privilegio dell'Archetipo Marziale",
        ASI, 'Indomito (un utilizzo)', "Privilegio dell'Archetipo Marziale", 'Attacco Extra (2)', ASI, 'Indomito (due utilizzi)', ASI, "Privilegio dell'Archetipo Marziale",
        ASI, 'Azione Impetuosa (due utilizzi), Indomito (tre utilizzi)', "Privilegio dell'Archetipo Marziale", ASI, 'Attacco Extra (3)',
      ], (L, p) => [comp(L), p]),
    },
    Ladro: {
      dado: 8, ts: ['DES', 'INT'], quante: 4, abil: ['Acrobazia', 'Atletica', 'Furtività', 'Indagare', 'Inganno', 'Intimidire', 'Intrattenere', 'Intuizione', 'Percezione', 'Persuasione', 'Rapidità di Mano'],
      armature: 'Armature leggere', armi: 'Armi semplici, balestre a mano, spade corte, spade lunghe, stocchi', attrezzi: 'Arnesi da scasso', sotto: 3,
      sottoclassi: ['Ladro', 'Assassino', 'Mistificatore Arcano'],
      ...tabella(['Bonus di Competenza', 'Attacco Furtivo', 'Privilegi'], [
        'Maestria, Attacco Furtivo, Gergo Ladresco', 'Azione Scaltra', 'Archetipo Ladresco', ASI, 'Schivata Prodigiosa', 'Maestria', 'Elusione', ASI,
        "Privilegio dell'Archetipo Ladresco", ASI, 'Dote Affidabile', ASI, "Privilegio dell'Archetipo Ladresco", 'Percezione Cieca', 'Mente Sfuggente', ASI,
        "Privilegio dell'Archetipo Ladresco", 'Inafferrabile', ASI, 'Colpo di Fortuna',
      ], (L, p) => [comp(L), `${Math.ceil(L / 2)}d6`, p]),
    },
    Mago: {
      dado: 6, ts: ['INT', 'SAG'], quante: 2, abil: ['Arcano', 'Indagare', 'Intuizione', 'Medicina', 'Religione', 'Storia'],
      armature: 'Nessuna', armi: 'Balestre leggere, bastoni ferrati, dardi, fionde, pugnali', attrezzi: 'Nessuno', sotto: 2,
      sottoclassi: ['Scuola di Abiurazione', 'Scuola di Ammaliamento', 'Scuola di Divinazione', 'Scuola di Evocazione', 'Scuola di Illusione', 'Scuola di Invocazione', 'Scuola di Necromanzia', 'Scuola di Trasmutazione'],
      ...tabella(['Bonus di Competenza', 'Privilegi', 'Trucchetti Conosciuti', ...LIV9], [
        'Incantesimi, Recupero Arcano', 'Tradizione Arcana', '', ASI, '', 'Privilegio della Tradizione Arcana', '', ASI, '', 'Privilegio della Tradizione Arcana', '', ASI, '',
        'Privilegio della Tradizione Arcana', '', ASI, '', 'Maestria negli Incantesimi', ASI, 'Incantesimi Personali',
      ], (L, p) => [comp(L), p, String(per3(3, 4, 5)(L)), ...slot(PIENO, L, 9)]),
    },
    Monaco: {
      dado: 8, ts: ['FOR', 'DES'], quante: 2, abil: ['Acrobazia', 'Atletica', 'Furtività', 'Intuizione', 'Religione', 'Storia'],
      armature: 'Nessuna', armi: 'Armi semplici, spade corte', attrezzi: 'Un tipo di strumenti da artigiano o uno strumento musicale', sotto: 3,
      sottoclassi: ['Via della Mano Aperta', "Via dell'Ombra", 'Via dei Quattro Elementi'],
      ...tabella(['Bonus di Competenza', 'Arti Marziali', 'Punti Ki', 'Movimento Senza Armatura', 'Privilegi'], [
        'Difesa Senza Armatura, Arti Marziali', 'Ki, Movimento Senza Armatura', 'Tradizione Monastica, Deviare Proiettili', `${ASI}, Caduta Lenta`, 'Attacco Extra, Colpo Stordente',
        'Colpi Ki Potenziati, Privilegio della Tradizione Monastica', 'Elusione, Mente Lucida', ASI, 'Movimento Senza Armatura Migliorato', 'Purezza del Corpo',
        'Privilegio della Tradizione Monastica', ASI, 'Lingua del Sole e della Luna', 'Anima Adamantina', 'Corpo Senza Tempo', ASI, 'Privilegio della Tradizione Monastica',
        'Corpo Vuoto', ASI, 'Perfezione Interiore',
      ], (L, p) => [comp(L), L >= 17 ? '1d10' : L >= 11 ? '1d8' : L >= 5 ? '1d6' : '1d4', L >= 2 ? String(L) : '—', L >= 18 ? '+9 m' : L >= 14 ? '+7,5 m' : L >= 10 ? '+6 m' : L >= 6 ? '+4,5 m' : L >= 2 ? '+3 m' : '—', p]),
    },
    Paladino: {
      dado: 10, ts: ['SAG', 'CAR'], quante: 2, abil: ['Atletica', 'Intimidire', 'Intuizione', 'Medicina', 'Persuasione', 'Religione'],
      armature: 'Tutte le armature, scudi', armi: 'Armi semplici, armi da guerra', attrezzi: 'Nessuno', sotto: 3,
      sottoclassi: ['Giuramento di Devozione', 'Giuramento degli Antichi', 'Giuramento di Vendetta'],
      ...tabella(['Bonus di Competenza', 'Privilegi', ...LIV5], [
        'Percezione del Divino, Imposizione delle Mani', 'Stile di Combattimento, Incantesimi, Punizione Divina', 'Salute Divina, Giuramento Sacro', ASI, 'Attacco Extra',
        'Aura di Protezione', 'Privilegio del Giuramento Sacro', ASI, '', 'Aura di Coraggio', 'Punizione Divina Migliorata', ASI, '', 'Tocco Purificatore',
        'Privilegio del Giuramento Sacro', ASI, '', 'Aure Migliorate', ASI, 'Privilegio del Giuramento Sacro',
      ], (L, p) => [comp(L), p, ...slot(META, L, 5)]),
    },
    Ranger: {
      dado: 10, ts: ['FOR', 'DES'], quante: 3, abil: ['Addestrare Animali', 'Atletica', 'Furtività', 'Indagare', 'Intuizione', 'Natura', 'Percezione', 'Sopravvivenza'],
      armature: 'Armature leggere, armature medie, scudi', armi: 'Armi semplici, armi da guerra', attrezzi: 'Nessuno', sotto: 3,
      sottoclassi: ['Cacciatore', 'Signore delle Bestie'],
      ...tabella(['Bonus di Competenza', 'Privilegi', 'Incantesimi Conosciuti', ...LIV5], [
        'Nemico Prescelto, Esploratore Nato', 'Stile di Combattimento, Incantesimi', 'Archetipo Ranger, Consapevolezza Primordiale', ASI, 'Attacco Extra',
        'Nemico Prescelto Migliorato, Esploratore Nato Migliorato', "Privilegio dell'Archetipo Ranger", `${ASI}, Andatura sul Territorio`, '',
        'Esploratore Nato Migliorato, Nascondersi in Piena Vista', "Privilegio dell'Archetipo Ranger", ASI, '', 'Nemico Prescelto Migliorato, Svanire',
        "Privilegio dell'Archetipo Ranger", ASI, '', 'Sensi Ferini', ASI, 'Sterminatore di Nemici',
      ], (L, p) => [comp(L), p, L >= 2 ? String(Math.floor((L + 1) / 2) + (L >= 2 ? 1 : 0)) : '—', ...slot(META, L, 5)]),
    },
    Stregone: {
      dado: 6, ts: ['COS', 'CAR'], quante: 2, abil: ['Arcano', 'Inganno', 'Intimidire', 'Intuizione', 'Persuasione', 'Religione'],
      armature: 'Nessuna', armi: 'Balestre leggere, bastoni ferrati, dardi, fionde, pugnali', attrezzi: 'Nessuno', sotto: 1,
      sottoclassi: ['Discendenza Draconica', 'Magia Selvaggia'],
      ...tabella(['Bonus di Competenza', 'Punti Stregoneria', 'Privilegi', 'Trucchetti Conosciuti', 'Incantesimi Conosciuti', ...LIV9], [
        'Incantesimi, Origine Stregonesca', 'Fonte di Magia', 'Metamagia', ASI, '', "Privilegio dell'Origine Stregonesca", '', ASI, '', 'Metamagia', '', ASI, '',
        "Privilegio dell'Origine Stregonesca", '', ASI, 'Metamagia', "Privilegio dell'Origine Stregonesca", ASI, 'Ripristino Stregonesco',
      ], (L, p) => [comp(L), L >= 2 ? String(L) : '—', p, String(per3(4, 5, 6)(L)), String([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15][L - 1]), ...slot(PIENO, L, 9)]),
    },
    Warlock: {
      dado: 8, ts: ['SAG', 'CAR'], quante: 2, abil: ['Arcano', 'Indagare', 'Inganno', 'Intimidire', 'Natura', 'Religione', 'Storia'],
      armature: 'Armature leggere', armi: 'Armi semplici', attrezzi: 'Nessuno', sotto: 1,
      sottoclassi: ['Il Signore Fatato', "L'Immondo", 'Il Grande Antico'],
      ...tabella(['Bonus di Competenza', 'Privilegi', 'Trucchetti Conosciuti', 'Incantesimi Conosciuti', 'Slot Incantesimo', 'Livello degli Slot', 'Suppliche Conosciute'], [
        'Patrono Ultraterreno, Magia del Patto', 'Suppliche Occulte', 'Dono del Patto', ASI, '', 'Privilegio del Patrono Ultraterreno', '', ASI, '',
        'Privilegio del Patrono Ultraterreno', 'Arcanum Mistico (6° livello)', ASI, 'Arcanum Mistico (7° livello)', 'Privilegio del Patrono Ultraterreno',
        'Arcanum Mistico (8° livello)', ASI, 'Arcanum Mistico (9° livello)', '', ASI, "Maestro dell'Occulto",
      ], (L, p) => [comp(L), p, String(per3(2, 3, 4)(L)), String([2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15][L - 1]),
        String(L >= 17 ? 4 : L >= 11 ? 3 : L >= 2 ? 2 : 1), `${Math.min(5, Math.ceil(L / 2))}°`, L >= 2 ? String([0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8][L - 1]) : '—']),
    },
  };

  // Razze (capitolo 2). car: aumenti; scelta: +1 a N altri punteggi; abil: competenze automatiche; abilScelta: abilità a scelta;
  // vel in metri; sotto: sottorazze (per il dragonide: la discendenza draconica)
  const dragone = (danno, soffio, ts) => ({ car: {}, tratti: [`Soffio: ${soffio}, TS su ${ts}, danni da ${danno}`, `Resistenza ai danni da ${danno}`], danno });
  const razze = {
    Dragonide: { car: { FOR: 2, CAR: 1 }, scelta: 0, taglia: 'Media', vel: 9, tratti: ['Discendenza Draconica', 'Arma a Soffio', 'Resistenza ai Danni'], etichettaSotto: 'Discendenza draconica',
      sotto: {
        'Drago Argento': dragone('freddo', 'cono di 4,5 m', 'Costituzione'), 'Drago Bianco': dragone('freddo', 'cono di 4,5 m', 'Costituzione'),
        'Drago Blu': dragone('fulmine', 'linea di 1,5 per 9 m', 'Destrezza'), 'Drago Bronzo': dragone('fulmine', 'linea di 1,5 per 9 m', 'Destrezza'),
        'Drago Nero': dragone('acido', 'linea di 1,5 per 9 m', 'Destrezza'), 'Drago Oro': dragone('fuoco', 'cono di 4,5 m', 'Destrezza'),
        'Drago Ottone': dragone('fuoco', 'linea di 1,5 per 9 m', 'Destrezza'), 'Drago Rame': dragone('acido', 'linea di 1,5 per 9 m', 'Destrezza'),
        'Drago Rosso': dragone('fuoco', 'cono di 4,5 m', 'Destrezza'), 'Drago Verde': dragone('veleno', 'cono di 4,5 m', 'Costituzione'),
      } },
    Elfo: { car: { DES: 2 }, scelta: 0, taglia: 'Media', vel: 9, abil: ['Percezione'], tratti: ['Scurovisione', 'Sensi Acuti', 'Retaggio Fatato', 'Trance'],
      sotto: {
        'Elfo Alto': { car: { INT: 1 }, tratti: ['Addestramento nelle Armi Elfiche', 'Trucchetto', 'Linguaggio Extra'], armi: ['Spada Corta', 'Spada Lunga', 'Arco Corto', 'Arco Lungo'] },
        'Elfo dei Boschi': { car: { SAG: 1 }, vel: 10.5, tratti: ['Addestramento nelle Armi Elfiche', 'Piede Lesto', 'Maschera della Selva'], armi: ['Spada Corta', 'Spada Lunga', 'Arco Corto', 'Arco Lungo'] },
        'Elfo Oscuro (Drow)': { car: { CAR: 1 }, tratti: ['Scurovisione Superiore', 'Sensibilità alla Luce del Sole', 'Magia Drow', 'Addestramento nelle Armi Drow'], armi: ['Spada Corta', 'Stocco', 'Balestra a Mano'] },
      } },
    Gnomo: { car: { INT: 2 }, scelta: 0, taglia: 'Piccola', vel: 7.5, tratti: ['Scurovisione', 'Astuzia Gnomesca'],
      sotto: {
        'Gnomo delle Foreste': { car: { DES: 1 }, tratti: ['Illusionista Nato', 'Parlare con le Piccole Bestie'] },
        'Gnomo delle Rocce': { car: { COS: 1 }, tratti: ["Conoscenze dell'Artefice", 'Inventore'] },
      } },
    Halfling: { car: { DES: 2 }, scelta: 0, taglia: 'Piccola', vel: 7.5, tratti: ['Fortunato', 'Coraggioso', 'Agilità Halfling'],
      sotto: {
        Piedelesto: { car: { CAR: 1 }, tratti: ['Furtività Innata'] },
        Tozzo: { car: { COS: 1 }, tratti: ['Resilienza dei Tozzi'] },
      } },
    Mezzelfo: { car: { CAR: 2 }, scelta: 2, abilScelta: 2, taglia: 'Media', vel: 9, tratti: ['Scurovisione', 'Retaggio Fatato', 'Versatilità nelle Abilità'], sotto: {} },
    Mezzorco: { car: { FOR: 2, COS: 1 }, scelta: 0, taglia: 'Media', vel: 9, abil: ['Intimidire'], tratti: ['Scurovisione', 'Minaccioso', 'Tenacia Implacabile', 'Attacchi Selvaggi'], sotto: {} },
    Nano: { car: { COS: 2 }, scelta: 0, taglia: 'Media', vel: 7.5, pesante: true, tratti: ['Scurovisione', 'Resilienza Nanica', 'Addestramento da Combattimento Nanico', 'Competenza negli Strumenti', 'Esperto Minatore'],
      armi: ['Ascia', 'Ascia da Battaglia', 'Martello da Guerra', 'Martello Leggero'],
      sotto: {
        'Nano delle Colline': { car: { SAG: 1 }, tratti: ['Robustezza Nanica'] },
        'Nano delle Montagne': { car: { FOR: 2 }, tratti: ['Addestramento nelle Armature Naniche'], armature: ['leggera', 'media'] },
      } },
    Tiefling: { car: { INT: 1, CAR: 2 }, scelta: 0, taglia: 'Media', vel: 9, tratti: ['Scurovisione', 'Resistenza Infernale', 'Eredità Infernale'], sotto: {} },
    Umano: { car: { FOR: 1, DES: 1, COS: 1, INT: 1, SAG: 1, CAR: 1 }, scelta: 0, taglia: 'Media', vel: 9, tratti: [], sotto: {} },
    'Umano (variante)': { car: {}, scelta: 2, abilScelta: 1, talento: 1, taglia: 'Media', vel: 9, tratti: ['Abilità', 'Talento'], sotto: {} },
  };

  // Background (capitolo 4): abilità, strumenti, linguaggi a scelta, privilegio
  const background = {
    Accolito: { abil: ['Intuizione', 'Religione'], strumenti: '', lingue: 2, privilegio: 'Rifugio dei Fedeli' },
    'Artigiano di Gilda': { abil: ['Intuizione', 'Persuasione'], strumenti: 'un tipo di strumenti da artigiano', lingue: 1, privilegio: 'Appartenenza alla Gilda' },
    Ciarlatano: { abil: ['Inganno', 'Rapidità di Mano'], strumenti: 'arnesi da falsario, trucchi per il camuffamento', lingue: 0, privilegio: 'Falsa Identità' },
    Criminale: { abil: ['Furtività', 'Inganno'], strumenti: 'arnesi da scasso, un tipo di gioco', lingue: 0, privilegio: 'Contatto Criminale' },
    Eremita: { abil: ['Medicina', 'Religione'], strumenti: 'borsa da erborista', lingue: 1, privilegio: 'Scoperta' },
    'Eroe Popolare': { abil: ['Addestrare Animali', 'Sopravvivenza'], strumenti: 'un tipo di strumenti da artigiano, veicoli (terrestri)', lingue: 0, privilegio: 'Ospitalità Rurale' },
    Forestiero: { abil: ['Atletica', 'Sopravvivenza'], strumenti: 'un tipo di strumento musicale', lingue: 1, privilegio: 'Viandante' },
    Intrattenitore: { abil: ['Acrobazia', 'Intrattenere'], strumenti: 'trucchi per il camuffamento, un tipo di strumento musicale', lingue: 0, privilegio: 'A Grande Richiesta' },
    Marinaio: { abil: ['Atletica', 'Percezione'], strumenti: 'strumenti da navigatore, veicoli (acquatici)', lingue: 0, privilegio: 'Passaggio via Nave' },
    Monello: { abil: ['Furtività', 'Rapidità di Mano'], strumenti: 'arnesi da scasso, trucchi per il camuffamento', lingue: 0, privilegio: 'Segreti Cittadini' },
    Nobile: { abil: ['Persuasione', 'Storia'], strumenti: 'un tipo di gioco', lingue: 1, privilegio: 'Posizione Privilegiata' },
    Sapiente: { abil: ['Arcano', 'Storia'], strumenti: '', lingue: 2, privilegio: 'Ricercatore' },
    Soldato: { abil: ['Atletica', 'Intimidire'], strumenti: 'un tipo di gioco, veicoli (terrestri)', lingue: 0, privilegio: 'Grado Militare' },
  };

  window.DND_MANUALE = { classi, razze, background };
})();
