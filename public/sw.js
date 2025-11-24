// public/sw.js

// Nagyon minimál SW – csak azért létezik, hogy a PWA feltétele teljesüljön.

self.addEventListener("install", (event) => {
  // azonnal aktiválódhat
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // későbbi cache-takarítás stb. ide jöhetne
  console.log("Vallalhatatlan Reader service worker aktiválva");
});

// Nem kezelünk fetch-et, mindent a hálózat intéz
