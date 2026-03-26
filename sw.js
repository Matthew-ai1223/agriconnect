const CACHE_NAME = 'myfarmai-v1.4-install-popup-schedule';

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

// Push Notifications
self.addEventListener('push', (event) => {
    let data = {};
    try {
        if (event.data) data = event.data.json();
    } catch (e) {
        data = {};
    }

    const title = data.title || 'MyFarmAI';
    const body = data.body || 'New update available.';
    const url = data.url || '/';

    const options = {
        body,
        tag: data.type || 'myfarmai-update',
        data: { url },
        // Use your app icon if available
        icon: '/images/icon-192.png',
        badge: '/images/icon-192.png'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification?.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
});
