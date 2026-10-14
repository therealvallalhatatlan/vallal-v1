"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type Props = {
  initialLat: number | null;
  initialLng: number | null;
  onChange: (lat: number, lng: number) => void;
};

const coarse = (n: number) => Math.round(n * 100) / 100;

export default function BookRegistryLocationPicker({ initialLat, initialLng, onChange }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const changeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { changeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!container.current || map.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;
    const instance = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [initialLng ?? 19.04, initialLat ?? 47.49],
      zoom: initialLat !== null && initialLng !== null ? 10 : 9,
      attributionControl: false,
    });
    const setPoint = (lat: number, lng: number) => {
      const roundedLat = coarse(lat);
      const roundedLng = coarse(lng);
      if (marker.current) marker.current.setLngLat([roundedLng, roundedLat]);
      else marker.current = new mapboxgl.Marker({ color: "#a3e635" }).setLngLat([roundedLng, roundedLat]).addTo(instance);
      changeRef.current(roundedLat, roundedLng);
    };
    instance.on("load", () => {
      setReady(true);
      if (initialLat !== null && initialLng !== null) {
        setPoint(initialLat, initialLng);
        instance.setCenter([coarse(initialLng), coarse(initialLat)]);
      }
    });
    instance.on("click", (event) => { setError(""); setPoint(event.lngLat.lat, event.lngLat.lng); });
    map.current = instance;
    return () => { instance.remove(); map.current = null; marker.current = null; };
  // The initial coordinates only seed the picker.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    if (!navigator.geolocation) { setError("A böngésző nem támogatja a helymeghatározást."); return; }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = coarse(position.coords.latitude);
        const lng = coarse(position.coords.longitude);
        if (marker.current) marker.current.setLngLat([lng, lat]);
        else if (map.current) marker.current = new mapboxgl.Marker({ color: "#a3e635" }).setLngLat([lng, lat]).addTo(map.current);
        map.current?.flyTo({ center: [lng, lat], zoom: 10, duration: 700 });
        changeRef.current(lat, lng);
        setLocating(false);
      },
      (e) => { setError(e.code === 1 ? "A helymeghatározást letiltottad." : "A helyed most nem határozható meg."); setLocating(false); },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border border-zinc-800">
        <div ref={container} className="h-[280px] w-full bg-zinc-950" />
        {!TOKEN ? <div className="absolute inset-0 grid place-items-center bg-black/90 p-4 text-center text-sm text-red-300">Hiányzik a NEXT_PUBLIC_MAPBOX_TOKEN beállítás.</div> : null}
        <button type="button" onClick={locate} disabled={!ready || locating} className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/80 px-3 py-2 text-xs font-semibold text-zinc-100 backdrop-blur disabled:opacity-50">
          {locating ? "Hely keresése…" : "Hozzávetőleges helyem"}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">Kattints a térképre vagy használd a helymeghatározást. A rendszer két tizedesjegyre kerekíti a pontot, így pontos lakcím helyett csak hozzávetőleges pozíció kerülhet a térképre.</p>
      {error ? <p role="alert" className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
