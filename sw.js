// ============================================================
// Service Worker — English Family PWA
// Cache toàn bộ app để dùng offline
// ============================================================

const CACHE_NAME = 'english-family-v1';

// Các file cần cache để dùng offline
const CACHE_URLS = [
  './ENGLISH_APP.html',
  './manifest.json',
];

// Các domain external được cache (fonts, icons)
const CACHE_EXTERNAL = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

// ── Cài đặt: cache file khi lần đầu mở app ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app files...');
      return cache.addAll(CACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Kích hoạt: xóa cache cũ ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: trả về từ cache nếu offline ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Gemini API: không cache, luôn gọi thật (cần mạng)
  if (url.hostname.includes('googleapis.com') && url.pathname.includes('generateContent')) {
    return; // để trình duyệt xử lý bình thường
  }

  // Fonts Google: cache lại
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // File local: Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('./ENGLISH_APP.html');
        }
      });
    })
  );
});

// ── Nhận thông báo cập nhật ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
