// Regolamenti precaricati al primo avvio. Sono solo un punto di partenza:
// ogni voce si può modificare dalla pagina "Regolamenti" dell'app.
(function () {
  const parti = (s) => s.split('|').map((t) => t.trim());
  const num = (v) => (v === undefined || v === '' ? '' : Number(v));
  const lista = (s) => s.split(';').map((t) => t.trim()).filter(Boolean);
  const car = (s) => lista(s).map((x) => { const [sigla, nome, pred] = parti(x); return { sigla, nome: nome || sigla, predefinito: num(pred) }; });
  const abil = (s) => lista(s).map((x) => { const [nome, c, pred] = parti(x); return { nome, car: c || '', predefinito: num(pred) }; });
  const ris = (s) => lista(s).map((x) => { const [nome, max] = parti(x); return { nome, max: num(max) }; });

  const SEI = 'FOR|Forza|10;DES|Destrezza|10;COS|Costituzione|10;INT|Intelligenza|10;SAG|Saggezza|10;CAR|Carisma|10';

  window.REGOLAMENTI_PREDEFINITI = [
    {
      id: 'dnd5e',
      nome: 'D&D 5ª edizione',
      scheda: 'dnd',
      modalita: 'd20',
      dado: '1d20',
      descrizione: 'Dungeons & Dragons, quinta edizione.',
      campi: lista('Specie / Razza;Classe;Livello;Background;Allineamento;Classe Armatura;Velocità;Bonus di competenza'),
      caratteristiche: car(SEI),
      abilita: abil('Acrobazia|DES;Addestrare Animali|SAG;Arcano|INT;Atletica|FOR;Furtività|DES;Indagare|INT;Inganno|CAR;Intimidire|CAR;Intrattenere|CAR;Intuizione|SAG;Medicina|SAG;Natura|INT;Percezione|SAG;Persuasione|CAR;Rapidità di Mano|DES;Religione|INT;Sopravvivenza|SAG;Storia|INT'),
      risorse: ris('Punti Ferita;Punti Ferita temporanei;Dadi Vita;Ispirazione'),
      note: 'Prova: 1d20 + modificatore di caratteristica (+ bonus di competenza se competente) contro una CD.\nVantaggio: 2d20kh1 · Svantaggio: 2d20kl1.\nNella scheda, per le abilità annota il bonus totale.',
    },
    {
      id: 'pf1',
      nome: 'Pathfinder 1ª edizione',
      scheda: 'pf1',
      modalita: 'd20',
      dado: '1d20',
      descrizione: 'Pathfinder Gioco di Ruolo, prima edizione.',
      campi: lista('Razza;Classe;Livello;Allineamento;Divinità;Classe Armatura;BAB;Tempra;Riflessi;Volontà;Velocità'),
      caratteristiche: car(SEI),
      abilita: abil('Acrobazia|DES;Addestrare Animali|CAR;Artista della Fuga|DES;Artigianato|INT;Camuffare|CAR;Cavalcare|DES;Conoscenze (arcane)|INT;Conoscenze (dungeon)|INT;Conoscenze (geografia)|INT;Conoscenze (ingegneria)|INT;Conoscenze (locali)|INT;Conoscenze (natura)|INT;Conoscenze (nobiltà)|INT;Conoscenze (piani)|INT;Conoscenze (religioni)|INT;Conoscenze (storia)|INT;Diplomazia|CAR;Disattivare Congegni|DES;Furtività|DES;Guarire|SAG;Intimidire|CAR;Intrattenere|CAR;Intuizione|SAG;Linguistica|INT;Nuotare|FOR;Percezione|SAG;Professione|SAG;Raggirare|CAR;Rapidità di Mano|DES;Sapienza Magica|INT;Scalare|FOR;Sopravvivenza|SAG;Utilizzare Congegni Magici|CAR;Valutare|INT;Volare|DES'),
      risorse: ris('Punti Ferita;Danni non letali'),
      note: 'Prova: 1d20 + gradi + modificatore di caratteristica + bonus vari contro CD.\nNella scheda, per le abilità annota il bonus totale.',
    },
    {
      id: 'pf2',
      nome: 'Pathfinder 2ª edizione',
      scheda: 'pf2',
      modalita: 'd20mod',
      dado: '1d20',
      descrizione: 'Pathfinder seconda edizione.',
      campi: lista('Ascendenza;Retaggio;Background;Classe;Livello;Classe Armatura;Tempra;Riflessi;Volontà;Percezione;Velocità'),
      caratteristiche: car('FOR|Forza|0;DES|Destrezza|0;COS|Costituzione|0;INT|Intelligenza|0;SAG|Saggezza|0;CAR|Carisma|0'),
      abilita: abil('Acrobazia|DES;Arcano|INT;Artigianato|INT;Atletica|FOR;Diplomazia|CAR;Esibizione|CAR;Furtività|DES;Furto|DES;Inganno|CAR;Intimidire|CAR;Medicina|SAG;Natura|SAG;Occultismo|INT;Religione|SAG;Società|INT;Sopravvivenza|SAG;Conoscenze (specifiche)|INT'),
      risorse: ris('Punti Ferita;Punti Eroe|3;Punti Focus'),
      note: 'Prova: 1d20 + modificatore + competenza contro CD.\nCompetenza: addestrato +2, esperto +4, maestro +6, leggendario +8 (più il livello).\nGradi di successo: superare la CD di 10 o più = successo critico; mancarla di 10 o più = fallimento critico. Un 20 naturale migliora il risultato di un grado, un 1 naturale lo peggiora.',
    },
    {
      id: 'starfinder',
      nome: 'Starfinder',
      scheda: 'sf',
      modalita: 'd20',
      dado: '1d20',
      descrizione: 'Starfinder, prima edizione.',
      campi: lista('Razza;Tema;Classe;Livello;Allineamento;CA Energia (CAE);CA Cinetica (CAC);Tempra;Riflessi;Volontà;Velocità'),
      caratteristiche: car(SEI),
      abilita: abil('Acrobazia|DES;Atletica|FOR;Camuffare|CAR;Computer|INT;Cultura|INT;Diplomazia|CAR;Furtività|DES;Ingegneria|INT;Intimidire|CAR;Intuizione|SAG;Medicina|INT;Misticismo|SAG;Percezione|SAG;Pilotare|DES;Professione|INT;Raggirare|CAR;Rapidità di Mano|DES;Scienze Biologiche|INT;Scienze Fisiche|INT;Sopravvivenza|SAG'),
      risorse: ris('Stamina;Punti Ferita;Punti Determinazione'),
      note: 'Prova: 1d20 + gradi + modificatore + bonus contro CD.\nI danni intaccano prima la Stamina, poi i Punti Ferita.',
    },
  ];
})();
