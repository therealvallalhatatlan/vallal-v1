"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type FulfillmentLocation = {
  id: string;
  orderId: string;
  source: "orders" | "shop_orders";
  orderReference: string;
  productLabel: string;
  fulfillmentStatus: string;
  orderStatus: string;
  lat: number;
  lng: number;
  pickupPoint: string | null;
  pickupInstructions: string | null;
  proposedPickupAt: string | null;
  locationReleasedAt: string | null;
  updatedAt: string;
  href: string;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function makeMarkerElement(location: FulfillmentLocation) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "admin-fulfillment-map-marker";
  marker.setAttribute("aria-label", `Dead-drop helyszín, rendelés ${location.orderReference}`);
  marker.style.cssText = [
    "position:relative",
    "width:38px",
    "height:38px",
    "border:1px solid rgba(217,249,157,.9)",
    "border-radius:50%",
    "background:rgba(190,242,100,.12)",
    "box-shadow:0 0 0 6px rgba(190,242,100,.08),0 0 22px rgba(190,242,100,.18)",
    "cursor:pointer",
  ].join(";");

  const core = document.createElement("span");
  core.style.cssText = [
    "position:absolute",
    "width:8px",
    "height:8px",
    "border-radius:50%",
    "background:#d9f99d",
    "top:50%",
    "left:50%",
    "transform:translate(-50%,-50%)",
  ].join(";");
  marker.append(core);
  return marker;
}

function makePopupContent(location: FulfillmentLocation) {
  const root = document.createElement("div");
  root.style.cssText = "min-width:190px;max-width:260px;color:#f4f4f4;font-family:Arial,sans-serif";

  const eyebrow = document.createElement("p");
  eyebrow.textContent = `RENDELÉS ${location.orderReference}`;
  eyebrow.style.cssText = "margin:0 0 6px;color:#a3e635;font-size:10px;letter-spacing:.12em;font-weight:700";

  const heading = document.createElement("p");
  heading.textContent = location.productLabel || "Könyvrendelés";
  heading.style.cssText = "margin:0 0 6px;font-size:13px;font-weight:700;overflow-wrap:anywhere";

  const status = document.createElement("p");
  status.textContent = location.fulfillmentStatus === "received" ? "Átvéve" : "Helyszín megosztva";
  status.style.cssText = "margin:0 0 10px;color:#a1a1aa;font-size:11px";

  const link = document.createElement("a");
  link.href = location.href;
  link.textContent = "Rendelés megnyitása →";
  link.style.cssText = "color:#d9f99d;font-size:11px;text-decoration:underline;text-underline-offset:3px";

  root.append(eyebrow, heading, status, link);
  return root;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AdminFulfillmentMap({ token }: { token: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const [locations, setLocations] = useState<FulfillmentLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : undefined, [token]);

  useEffect(() => {
    let active = true;
    async function loadLocations() {
      if (!headers) {
        setLoading(false);
        setError("Jelentkezz be admin/editor jogosultsággal.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/order-fulfillment/map", {
          headers,
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = payload?.error === "fulfillment_map_unavailable"
            ? "A kézbesítési térkép adatforrása még nincs aktiválva. A szükséges adatbázis-migrációt előbb ellenőrzött módon kell alkalmazni."
            : payload?.error || "A kézbesítési térkép betöltése nem sikerült.";
          throw new Error(message);
        }
        if (active) setLocations(Array.isArray(payload.locations) ? payload.locations : []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Ismeretlen hiba");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadLocations();
    return () => { active = false; };
  }, [headers]);

  useEffect(() => {
    if (loading || error || !containerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) {
      setError("Hiányzik a NEXT_PUBLIC_MAPBOX_TOKEN térképkonfiguráció.");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [19.0402, 47.4979],
      zoom: 5.5,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const bounds = new mapboxgl.LngLatBounds();
      for (const location of locations) {
        if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) continue;
        bounds.extend([location.lng, location.lat]);
        const popup = new mapboxgl.Popup({ offset: 18, closeButton: true }).setDOMContent(makePopupContent(location));
        const marker = new mapboxgl.Marker({ element: makeMarkerElement(location), anchor: "center" })
          .setLngLat([location.lng, location.lat])
          .setPopup(popup)
          .addTo(map);
        markerRefs.current.push(marker);
      }

      if (locations.length > 1 && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 72, maxZoom: 12, duration: 0 });
      } else if (locations.length === 1) {
        map.jumpTo({ center: [locations[0].lng, locations[0].lat], zoom: 13 });
      }
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [loading, error, locations]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded border border-white/15 bg-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-lime-200/60">PRIVÁT / ADMIN</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Feloldott dead-drop helyszínek</h2>
          </div>
          <span className="border border-lime-200/25 px-3 py-1 text-xs text-lime-100">{locations.length} helyszín</span>
        </div>

        {error ? <div role="alert" className="m-4 border border-amber-300/25 bg-amber-300/[0.04] p-3 text-sm leading-relaxed text-amber-100/80">{error}</div> : null}
        {loading ? <div className="p-6 text-sm text-white/50">Helyszínek betöltése…</div> : null}
        {!loading && !error ? <div ref={containerRef} className="h-[60vh] min-h-[380px] w-full bg-black" /> : null}
        {!loading && !error && locations.length === 0 ? (
          <p className="border-t border-white/10 p-4 text-xs leading-relaxed text-white/45">
            Még nincs olyan dead-drop rendelés, amelynél a vásárló már elfogadta az időpontot, és az admin feloldotta a helyszínt.
          </p>
        ) : null}
      </section>

      <section className="rounded border border-white/15 bg-black/30">
        <div className="border-b border-white/10 p-4">
          <h2 className="text-sm font-semibold text-white">Helyszínek listája</h2>
        </div>
        {locations.length === 0 ? (
          <p className="p-4 text-xs text-white/40">Nincs megjeleníthető helyszín.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {locations.map((location) => (
              <div key={location.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-lime-200">#{location.orderReference}</p>
                  <p className="mt-1 break-words text-sm text-white">{location.productLabel}</p>
                  <p className="mt-1 text-xs text-white/40">{location.fulfillmentStatus === "received" ? "Átvéve" : "Helyszín megosztva"} · Frissítve: {formatDate(location.updatedAt)}</p>
                  {location.pickupPoint ? <p className="mt-1 text-xs text-white/50">{location.pickupPoint}</p> : null}
                </div>
                <Link href={location.href} className="shrink-0 text-xs text-lime-200 underline underline-offset-4">
                  Rendelés megnyitása →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="text-[10px] leading-relaxed text-zinc-600">
        A térkép csak az adminnak feloldott átadási helyszíneket mutatja. Csomagcímek és vásárlói lakcímek nem kerülnek rá.
      </p>
    </div>
  );
}
