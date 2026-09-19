const VERSION = 'agewell-shell-v2';
const SHELL = `${VERSION}-shell`;

function scopeRoot() {
  return new URL('./', self.registration.scope);
}

function isApiRequest(url) {
  return (
    url.pathname === '/api' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/api/')
  );
}

function staticAssetUrls(indexUrl, html) {
  const urls = new Set([indexUrl.toString()]);
  const assetPattern = /\b(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi;
  let match;

  while ((match = assetPattern.exec(html)) !== null) {
    const assetUrl = new URL(match[1], indexUrl);
    // Only precache build assets in this app's scope. In particular, do not
    // follow external fonts or accidentally cache another path on the host.
    if (
      assetUrl.origin === self.location.origin &&
      assetUrl.pathname.startsWith(scopeRoot().pathname) &&
      !isApiRequest(assetUrl)
    ) {
      urls.add(assetUrl.toString());
    }
  }

  return [...urls];
}

function isCacheableStaticAsset(url) {
  const rootPath = scopeRoot().pathname;
  const relativePath = url.pathname.slice(rootPath.length);
  return (
    relativePath.startsWith('assets/') ||
    /\.(?:js|css|png|jpe?g|svg|webp|gif|woff2?)$/i.test(relativePath)
  );
}

async function precacheShell() {
  const root = scopeRoot();
  const indexResponse = await fetch(root.toString(), { cache: 'no-store' });
  if (!indexResponse.ok) throw new Error(`Unable to precache app shell: ${indexResponse.status}`);

  const html = await indexResponse.clone().text();
  const cache = await caches.open(SHELL);
  await cache.put(root.toString(), indexResponse);

  // Cache each asset independently: one optional asset failing should not
  // prevent the HTML, generated JS, and generated CSS from being available.
  await Promise.allSettled(
    staticAssetUrls(root, html)
      .filter((url) => url !== root.toString())
      .map(async (url) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) await cache.put(url, response);
      }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('agewell-shell-') && key !== SHELL).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(scopeRoot().toString())),
    );
    return;
  }

  // Vite development modules use source paths such as /src/App.tsx. Never
  // cache those; only cache immutable build assets and static media.
  if (
    ['script', 'style', 'image', 'font'].includes(request.destination) &&
    isCacheableStaticAsset(url)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(SHELL).then((cache) => cache.put(request, copy));
        return response;
      })),
    );
  }
});