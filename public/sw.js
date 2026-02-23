const CACHE_NAME = "tapaar-v1";

// Install: just activate immediately
self.addEventListener("install", (event) => {
    self.skipWaiting();
});

// Activate: clear old caches and take control immediately
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: Network-first strategy
// Always try the network. Only fall back to cache for navigation requests.
self.addEventListener("fetch", (event) => {
    // Skip non-GET requests
    if (event.request.method !== "GET") return;

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Skip API/data routes
    const url = new URL(event.request.url);
    if (url.pathname.startsWith("/api/")) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache successful responses for offline fallback
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed — serve from cache if available
                return caches.match(event.request);
            })
    );
});
