const CACHE_NAME = "immerse-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/auth/signin",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // @ts-ignore
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // @ts-ignore
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API routes: network first, fallback to offline response
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET API responses
          if (response.ok && request.method === "GET") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return (
            caches.match(request).then((cached) => {
              if (cached) return cached;
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "You are offline. Please check your connection.",
                }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json" },
                }
              );
            }) ||
            new Response(
              JSON.stringify({
                success: false,
                error: "You are offline. Please check your connection.",
              }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        })
    );
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// Handle push notifications
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    // @ts-ignore
    self.registration.showNotification(data.title || "Immerse", {
      body: data.body || "You have a new notification",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: data.url || "/dashboard",
    })
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    // @ts-ignore
    self.clients.openWindow(event.notification.data || "/dashboard")
  );
});
