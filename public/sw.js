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
