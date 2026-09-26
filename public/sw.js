/* Emprego Fácil MZ — service worker
 * - Assets estáticos versionados (/_next/static, ícones): cache-first.
 * - Páginas públicas: network-first com cópia em cache para uso offline.
 * - Área privada (/meu-espaco, /admin, /api, /entrar...): NUNCA em cache (dados pessoais).
 */
const VERSION = "efmz-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

const PUBLIC_PAGES = ["/", "/cv-modelos", "/kits", "/conselhos", "/contactos", "/privacidade", "/termos"];
const PRIVATE_PREFIXES = ["/meu-espaco", "/admin", "/api", "/entrar", "/registar", "/recuperar-senha", "/redefinir-senha"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isPublicPage(pathname) {
  return PUBLIC_PAGES.includes(pathname) || pathname.startsWith("/kits/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE_PREFIXES.some((p) => url.pathname.startsWith(p))) return;
  // Pedidos RSC do Next.js (navegação no cliente) seguem sempre para a rede.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && isPublicPage(url.pathname)) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
  }
});
