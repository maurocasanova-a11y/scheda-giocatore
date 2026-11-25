'use strict';
// Funzionamento senza connessione: i file della scheda restano nel telefono. Versione 20261125142458
const CACHE = 'cronache-giocatore-20261125142458';
const FILE = ["./","./icone/apple-touch-icon.png","./icone/icona-192.png","./icone/icona-512.png","./icone/icona-mascherabile-512.png","./index.html","./manifest.webmanifest","./src/app.js","./src/caratteri.css","./src/dadi.js","./src/dal-vivo-config.js","./src/dal-vivo.js","./src/dnd-contenuti.js","./src/dnd-dati.js","./src/dnd-manuale.js","./src/dnd-mostri.js","./src/dnd.js","./src/fonts/alegreya-400-latin-ext.woff2","./src/fonts/alegreya-400-latin.woff2","./src/fonts/alegreya-400i-latin-ext.woff2","./src/fonts/alegreya-400i-latin.woff2","./src/fonts/alegreya-500-latin-ext.woff2","./src/fonts/alegreya-500-latin.woff2","./src/fonts/alegreya-700-latin-ext.woff2","./src/fonts/alegreya-700-latin.woff2","./src/fonts/cinzel-500-latin-ext.woff2","./src/fonts/cinzel-500-latin.woff2","./src/fonts/cinzel-700-latin-ext.woff2","./src/fonts/cinzel-700-latin.woff2","./src/fonts/exo2-400-latin-ext.woff2","./src/fonts/exo2-400-latin.woff2","./src/fonts/exo2-400i-latin-ext.woff2","./src/fonts/exo2-400i-latin.woff2","./src/fonts/exo2-600-latin-ext.woff2","./src/fonts/exo2-600-latin.woff2","./src/fonts/orbitron-500-latin.woff2","./src/fonts/orbitron-700-latin.woff2","./src/giocatore.js","./src/img/sagoma-slot.webp","./src/luoghi.js","./src/olografico.css","./src/pf1-archetipi.js","./src/pf1-capacita-magiche.js","./src/pf1-compagni.js","./src/pf1-creazione-mostri.js","./src/pf1-equip.js","./src/pf1-fatture.js","./src/pf1-fede.js","./src/pf1-incantesimi.js","./src/pf1-mitici.js","./src/pf1-mostri.js","./src/pf1-oggetti.js","./src/pf1-patroni.js","./src/pf1-preferite.js","./src/pf1-prestigio.js","./src/pf1-progressione.js","./src/pf1-razze-ts.js","./src/pf1-razze.js","./src/pf1-scoperte.js","./src/pf1-stirpi.js","./src/pf1-tabelle.js","./src/pf1-talenti-dati.js","./src/pf1-talenti.js","./src/pf1.js","./src/pf2-contenuti.js","./src/pf2-dati.js","./src/pf2-mostri.js","./src/pf2.js","./src/pwa.js","./src/regolamenti.js","./src/sf-alieni.js","./src/sf-contenuti.js","./src/sf-dati.js","./src/sf.js","./src/stile.css","./src/tema.css"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith('cronache-giocatore-') && n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
