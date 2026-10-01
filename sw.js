/* Hatos Datos — funcionamiento sin señal.
   La página se guarda en el teléfono la primera vez que se abre con internet.
   Con señal: trae la versión nueva (si tarda más de 6 s, usa la guardada).
   Sin señal: abre la versión guardada. */
const CACHE = 'hatos-datos-v1';
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js',
             'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(
    ['./', ...CDN].map(u => c.add(new Request(u, {mode: u.startsWith('http') ? 'no-cors' : 'same-origin'})).catch(() => {}))
  )));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function conTiempo(p, ms){ return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej('timeout'), ms))]); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const propio = url.origin === location.origin;

  if (req.mode === 'navigate' || (propio && /\/($|index\.html$)/.test(url.pathname))) {
    const red = fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => { c.put(req, cp.clone()); c.put('./', cp); }); } return r; });
    e.respondWith(conTiempo(red, 6000).catch(() =>
      caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./')).then(r => r || red)));
    return;
  }
  // librerías y tipografías: primero lo guardado, si no hay se descarga y se guarda
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
