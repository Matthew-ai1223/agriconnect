const CACHE_NAME = 'myfarmai-v1.3-install-popup-reshow';

// Install Event - skip waiting immediately
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

// Activate Event - Clear ALL old caches so no stale data remains
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                console.log('Removing Cache:', key);
                return caches.delete(key);
            }));
        })
    );
    return self.clients.claim();
});

// Fetch Event - Network-only strategy, meaning we never save or return cached data
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch((err) => {
            console.log('Network request failed and caching is disabled.', err);
            // We just let it fail naturally since we have disabled offline cache
        })
    );
});
