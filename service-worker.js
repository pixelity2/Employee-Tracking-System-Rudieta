const CACHE = 'rudieta-v1';
const assets = [
  '/', '/index.html', '/employee.html', '/admin.html',
  '/app.css', '/app.js', '/employee.js', '/admin.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(assets)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});