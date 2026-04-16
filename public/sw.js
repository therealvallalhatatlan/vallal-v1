const VERSION = 'v1'

// public/sw.js

// Nagyon minimál SW – csak azért létezik, hogy a PWA feltétele teljesüljön.

self.addEventListener("install", (event) => {
  // azonnal aktiválódhat
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // későbbi cache-takarítás stb. ide jöhetne
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      console.log("Vallalhatatlan Reader service worker aktiválva");
      // informáljuk a klienseket, hogy az új SW aktív
      const all = await self.clients.matchAll({ type: 'window' });
      for (const client of all) {
        client.postMessage({ type: 'SW_ACTIVATED' });
      }
    })()
  );
});

// Nem kezelünk fetch-et, mindent a hálózat intéz

// handle skip waiting posts from page
self.addEventListener('message', (event) => {
  if (!event.data) return;
  try {
    const data = event.data;
    if (data && data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  } catch (err) {
    // ignore
  }
});

// --- Web Push ---

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'V.', body: '...', url: '/v3' };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'V.', {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url ?? '/v3' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/v3';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

