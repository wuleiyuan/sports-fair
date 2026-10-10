/**
 * v2.3.3 — Service Worker
 *
 * 策略：
 *   1. 静态资源 (HTML/JS/CSS/SVG/images) — stale-while-revalidate
 *      优先返回 cache，后台异步更新 cache，下次访问拿到新版本
 *   2. JSON 数据 (activities.json / health_stats.json / training_advice.json)
 *      — cache-first + 24h TTL
 *      离线时直接用本地缓存，运动数据 24h 内基本不变
 *   3. /api/* — network-only（LLM 调用不能 cache 死）
 *   4. 其他 — network-first，失败 fallback 到 cache
 *
 * 版本：sports-fair-v2.3.3
 * 升级时改 CACHE_VERSION 即可触发旧 cache 清理
 *
 * v2.3.1 (2026-09-29): 升级版本号强制清旧 cache。
 *   现象：用户报告 activities.json 缓存了 09-15 数据, 但 git 上的 cron sync
 *   commit (434c16f) 早在 09-28 推上去了。原因是 SW 的 cache-first + 24h TTL
 *   把 stale 数据封住了, 即使 Vercel 重新 build + 部署新 bundle 也救不回
 *   老 SW 的缓存。bump CACHE_VERSION 让 SW 检测到版本不匹配 → 删除整个
 *   STATIC_CACHE + DATA_CACHE → 下次 fetch 拿到最新数据。
 *
 * v2.3.3 (2026-10-10): 再次 bump — 上一轮 292de9e (v2.3.2) 后用户反馈页面
 *   卡片仍是白色。诊断：Vercel CDN 边缘缓存 + 浏览器 SW 双重持有旧 CSS。
 *   bump 到 v2.3.3 强制 SW detect version mismatch → 清整个 STATIC/DATA CACHE
 *   → 下次 fetch 拿到 14:02 重 build 的新 CSS（含 --color-activity-card:
 *   #f5f5f7 + --k-card-bg: #f5f5f7）。
 */
const CACHE_VERSION = 'sports-fair-v2.3.3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/images/favicon.png',
  '/images/favicon-1024.png', // v2.5.26: 1024x1024 主图
  '/images/og-image.png',
];

const DATA_URL_PATTERNS = [
  /\/activities\.json/,
  /\/health_stats\.json/,
  /\/training_advice\.json/,
  /\/training_load\.json/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DATA_CACHE)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET
  if (request.method !== 'GET') return;

  // API 请求：network-only (LLM 调用)
  if (url.pathname.startsWith('/api/')) {
    return; // 默认浏览器行为
  }

  // JSON 数据：cache-first + 后台更新
  if (DATA_URL_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // 同源静态资源：stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // 网络挂了，离线时返回 cached
      if (cachedResponse) return cachedResponse;
      return new Response('Offline', { status: 503 });
    });

  return cachedResponse || fetchPromise;
}
