/* 활동 결과 제출함 - Service Worker
 * index.html을 수정한 뒤에는 아래 CACHE_VERSION 숫자를 꼭 올리세요.
 * (올리지 않으면 학생 기기에 옛 화면이 남을 수 있습니다)
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `submit-box-${CACHE_VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.ico',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Supabase(DB·스토리지) 요청과 GET이 아닌 요청은 절대 캐시하지 않음
  if (req.method !== 'GET' || url.hostname.endsWith('.supabase.co')) return;

  // 화면(HTML)은 네트워크 우선 → 새 버전이 바로 반영, 오프라인이면 캐시
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 아이콘·폰트 등 정적 자원은 캐시 우선
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && (url.origin === location.origin || url.hostname.includes('gstatic') || url.hostname.includes('googleapis'))) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
