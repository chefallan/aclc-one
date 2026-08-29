/**
 * Two rules decide everything in here, and both were learned from the same
 * bug report: "when we restart the PC we have to sign in again."
 *
 *   1. A page is never served from the cache. HTML carries who you are. The
 *      old worker pre-cached "/", "/dashboard" and "/auth/signin" on install
 *      and then answered every navigation from that cache first, so a shell
 *      captured on one visit was replayed on the next cold start — including
 *      the signed-out one captured before anybody had signed in. The session
 *      cookie was valid the whole time; the page just wasn't asked for.
 *
 *   2. An API reply is never written to the cache. These are shared lab
 *      machines. One student's timetable, grades or attendance must not be
 *      handed to whoever sits down next, and a Cache Storage bucket is shared
 *      by every account that uses the browser.
 *
 * That leaves the cache doing the one job it can do safely: build output and
 * icons, which are content-addressed or fixed, and identical for everyone.
 */
const CACHE_NAME = "immerse-v2";

/**
 * Nothing is pre-cached. Every URL the old list held was either a page (rule
 * 1) or, in the case of the icons, a path that does not exist yet — and
 * cache.addAll rejects the whole install if any single entry fails.
 */
self.addEventListener("install", () => {
  // Take over from the previous worker straight away, so a device still
  // running the version that cached pages gets this one on the next load
  // rather than the next time every tab is closed.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        // This is also the repair: it deletes "immerse-v1", and with it the
        // stale sign-in page that was being served as the dashboard.
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

/** Build output and icons: fixed content, same for every account. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

/**
 * A page request, in either of its two forms. A full navigation is
 * mode === "navigate"; a client-side route change asks for the same page as an
 * RSC payload, which is not a navigation but carries exactly as much identity.
 */
function isPageRequest(request, url) {
  return (
    request.mode === "navigate" ||
    request.destination === "document" ||
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1"
  );
}

const OFFLINE_JSON = () =>
  new Response(
    JSON.stringify({ success: false, error: "You are offline. Please check your connection." }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );

const OFFLINE_PAGE = () =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Offline</title>` +
      `<style>body{font-family:system-ui,sans-serif;margin:0;min-height:100dvh;display:grid;place-items:center;` +
      `background:#faf7f7;color:#241b1d;padding:1.5rem;text-align:center}p{color:#6b5c60;max-width:24rem}</style>` +
      `<div><h1>You're offline</h1><p>ACLC One needs a connection to show your account. ` +
      `Reconnect and reload this page.</p></div>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Rule 1 — always from the network, never stored.
  if (isPageRequest(request, url)) {
    event.respondWith(fetch(request).catch(() => OFFLINE_PAGE()));
    return;
  }

  // Rule 2 — always from the network, never stored.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => OFFLINE_JSON()));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            // A redirect stored here would be replayed for every later
            // request, which is how the sign-in page ended up cached under an
            // icon's URL. Cross-origin was already ruled out above.
            if (response.ok && !response.redirected) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Anything else — the manifest, a favicon, an uploaded photo — goes to the
  // network untouched. Not caching it costs a request; caching it wrongly
  // costs someone else's data.
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "ACLC One", {
      body: data.body || "You have a new notification",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: data.url || "/dashboard",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data || "/dashboard"));
});
