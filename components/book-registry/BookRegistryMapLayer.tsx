"use client";

import { useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";

type Props = { map: mapboxgl.Map };

type BookMarker = {
  id: string;
  editionCode: string;
  editionTitle: string;
  serialLabel: string;
  lat: number;
  lng: number;
};

export default function BookRegistryMapLayer({ map }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setCount(null);
      return;
    }
    let cancelled = false;
    const markers: mapboxgl.Marker[] = [];

    async function load() {
      try {
        const response = await fetch("/api/book-registry/map", { cache: "no-store" });
        if (!response.ok) throw new Error("map unavailable");
        const body = await response.json();
        const books: BookMarker[] = Array.isArray(body.copies) ? body.copies : [];
        if (cancelled) return;

        for (const book of books) {
          if (!Number.isFinite(book.lat) || !Number.isFinite(book.lng)) continue;
          const button = document.createElement("button");
          button.type = "button";
          button.setAttribute("aria-label", book.editionTitle + " " + book.serialLabel);
          button.title = book.editionTitle + " · " + book.serialLabel;
          button.style.cssText = "width:22px;height:22px;border-radius:999px;border:1px solid rgba(217,249,157,.95);background:rgba(163,230,53,.25);box-shadow:0 0 0 6px rgba(163,230,53,.13),0 0 22px rgba(163,230,53,.38);cursor:pointer;";
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const popup = document.createElement("div");
            popup.style.cssText = "font-family:monospace;min-width:150px;";
            const title = document.createElement("div");
            title.textContent = book.editionTitle;
            title.style.cssText = "font-size:12px;color:#a1a1aa;margin-bottom:5px;";
            const serial = document.createElement("strong");
            serial.textContent = book.serialLabel;
            serial.style.cssText = "font-size:16px;color:#365314;";
            const note = document.createElement("div");
            note.textContent = "Hozzávetőleges hely";
            note.style.cssText = "font-size:11px;color:#52525b;margin-top:5px;";
            popup.append(title, serial, note);
            new mapboxgl.Popup({ closeButton: true, offset: 14, maxWidth: "220px" })
              .setLngLat([book.lng, book.lat])
              .setDOMContent(popup)
              .addTo(map);
          });

          markers.push(new mapboxgl.Marker({ element: button, anchor: "center" })
            .setLngLat([book.lng, book.lat])
            .addTo(map));
        }
        if (!cancelled) {
          setCount(books.length);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setCount(null);
        }
      }
    }
    void load();

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
    };
  }, [enabled, map]);

  return (
    <div style={{ position: "absolute", zIndex: 30, top: 12, right: 12, maxWidth: "min(240px, calc(100vw - 24px))" }}>
      <button
        type="button"
        onClick={() => setEnabled((value) => !value)}
        aria-pressed={enabled}
        style={{
          display: "flex", alignItems: "center", gap: 8, borderRadius: 8,
          border: enabled ? "1px solid rgba(190,242,100,.5)" : "1px solid rgba(255,255,255,.16)",
          background: "rgba(9,9,11,.9)", color: enabled ? "#ecfccb" : "#d4d4d8",
          padding: "9px 11px", fontSize: 12, fontWeight: 700, backdropFilter: "blur(8px)",
        }}
      >
        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 99, background: enabled ? "#a3e635" : "#71717a" }} />
        Könyvpéldányok {enabled ? "be" : "ki"}
        {enabled && count !== null ? <span style={{ opacity: .65 }}>({count})</span> : null}
      </button>
      {error && enabled ? <p role="status" style={{ marginTop: 6, borderRadius: 6, background: "rgba(9,9,11,.9)", padding: 7, fontSize: 11, color: "#fda4af" }}>A könyvréteg most nem tölthető be.</p> : null}
    </div>
  );
}
