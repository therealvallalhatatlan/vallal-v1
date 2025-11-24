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

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("Service worker regisztrálva:", reg.scope);
      })
      .catch((err) => {
        console.error("Service worker reg hiba:", err);
      });
  }, []);

  return null;
}
