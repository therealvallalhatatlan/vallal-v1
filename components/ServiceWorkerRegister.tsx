// components/ServiceWorkerRegister.tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    // csak productionban érdemes regisztrálni
    if (process.env.NODE_ENV !== "production") {
      // ha lokálon is akarod, ezt kiveheted
      console.log("SW csak productionban aktiválódik");
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        console.log("Service worker regisztrálva:", reg.scope);

        // ha már van waiting worker, jelezzük a UI-nak
        if (reg.waiting) {
          window.dispatchEvent(new CustomEvent('sw:update-available'));
        }

        // ha updatefound, figyeljük az állapotot
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              // ha van vezérlő, akkor ez update (nem első install)
              if (navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('sw:update-available'));
              }
            }
          });
        });

        // ha a controller változik (új SW aktiválódott), jelezzük a UI-nak
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.dispatchEvent(new CustomEvent('sw:controller-changed'));
        });
      })
      .catch((err) => {
        console.error("Service worker reg hiba:", err);
      });

    // Fogadjuk a UI kéréseit (pl. skip waiting)
    const onSkipWaiting = () => {
      if (!registration) return;
      if (registration.waiting) {
        try {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch (err) {
          console.warn('skipWaiting postMessage hiba', err);
        }
      }
    };

    window.addEventListener('sw:skip-waiting', onSkipWaiting);

    return () => {
      window.removeEventListener('sw:skip-waiting', onSkipWaiting);
    };
  }, []);

  return null;
}
