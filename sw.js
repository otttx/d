/* دفتر الدرجات: عامل الخدمة، يحفظ نسخة من البرنامج ليعمل دون إنترنت.
   بيانات الطلاب لا تمر من هنا؛ هي محفوظة في ذاكرة المتصفح على الجهاز. */
const CACHE = 'daftar-9aa9abed1a';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(SHELL.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('daftar-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* الصفحة: من الشبكة أولاً لتصل التحديثات، ومن النسخة المحفوظة عند انقطاع الإنترنت أو بطئه */
async function page(request) {
  const cache = await caches.open(CACHE);
  const net = fetch(request).then(res => {
    if (res && res.ok && res.type === 'basic') cache.put('./index.html', res.clone());
    return res;
  });
  try {
    const res = await Promise.race([net, new Promise(r => setTimeout(r, 3500, null))]);
    if (res && (res.ok || res.type === 'opaqueredirect')) return res;
  } catch (e) { /* دون اتصال */ }
  const hit = (await cache.match('./index.html')) || (await cache.match('./'));
  return hit || net;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { event.respondWith(page(req)); return; }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
