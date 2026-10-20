"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type DistributionMapDrop = {
  id: string
  product_name: string
  city: string
  district: string | null
  map_lat: number
  map_lng: number
  distance_band: string | null
}

type UserLocation = {
  lat: number
  lng: number
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

function createDropMarker(drop: DistributionMapDrop, onSelect: (drop: DistributionMapDrop) => void) {
  const button = document.createElement("button")
  button.type = "button"
  button.setAttribute("aria-label", drop.product_name + " könyvlelőhely, adatlap megnyitása")
  button.className = "distribution-map-drop"
  button.style.cssText = ["position:relative","width:58px","height:58px","padding:0","border:0","background:transparent","cursor:pointer","display:flex","align-items:center","justify-content:center","-webkit-tap-highlight-color:transparent"].join(";")
  const halo = document.createElement("span")
  halo.className = "distribution-map-drop__halo"
  halo.setAttribute("aria-hidden", "true")
  const icon = document.createElement("span")
  icon.className = "distribution-map-drop__hex"
  icon.setAttribute("aria-hidden", "true")
  icon.innerHTML = '<svg viewBox="0 0 40 40" width="38" height="38" fill="none"><path d="M20 2.5 35.15 11.25v17.5L20 37.5 4.85 28.75v-17.5L20 2.5Z" fill="#11150C" stroke="#D9F99D" stroke-width="1.4"/><path d="M11.5 13.5c3.1-1.6 5.9-1.4 8.5.6v13.1c-2.6-2-5.4-2.2-8.5-.6V13.5Z" fill="#BEF264" fill-opacity=".16" stroke="#D9F99D" stroke-width="1.2" stroke-linejoin="round"/><path d="M28.5 13.5c-3.1-1.6-5.9-1.4-8.5.6v13.1c2.6-2 5.4-2.2 8.5-.6V13.5Z" fill="#BEF264" fill-opacity=".16" stroke="#D9F99D" stroke-width="1.2" stroke-linejoin="round"/><path d="M20 14v13" stroke="#F7FEE7" stroke-opacity=".85" stroke-width="1"/><path d="M13.8 17.3 17 18M13.8 20.4 17 21.1M26.2 17.3 23 18M26.2 20.4 23 21.1" stroke="#BEF264" stroke-width="1" stroke-linecap="round"/></svg>'
  const core = document.createElement("span")
  core.className = "distribution-map-drop__core"
  core.setAttribute("aria-hidden", "true")
  button.append(halo, icon, core)
  button.addEventListener("click", (event) => { event.stopPropagation(); onSelect(drop) })
  return button
}

function applyDistributionMapTheme(map: mapboxgl.Map) {
  const style = map.getStyle()
  if (!style?.layers) return

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase()
    const sourceLayer = String((layer as { "source-layer"?: string })["source-layer"] || "").toLowerCase()

    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#020202")
        continue
      }

      if (layer.type === "fill-extrusion" && (id.includes("building") || sourceLayer === "building")) {
        map.setPaintProperty(layer.id, "fill-extrusion-color", "#101010")
        map.setPaintProperty(layer.id, "fill-extrusion-opacity", 0.72)
        continue
      }

      if (layer.type === "fill") {
        if (id.includes("building") || sourceLayer === "building") {
          map.setPaintProperty(layer.id, "fill-color", "#111111")
          map.setPaintProperty(layer.id, "fill-opacity", 0.74)
        } else if (id.includes("water") || sourceLayer === "water") {
          map.setPaintProperty(layer.id, "fill-color", "#050505")
          map.setPaintProperty(layer.id, "fill-opacity", 0.9)
        } else if (
          id.includes("land") ||
          id.includes("park") ||
          id.includes("green") ||
          id.includes("landuse") ||
          sourceLayer === "landuse" ||
          sourceLayer === "landcover"
        ) {
          map.setPaintProperty(layer.id, "fill-color", "#030303")
          map.setPaintProperty(layer.id, "fill-opacity", 1)
        }
        continue
      }

      if (layer.type === "line") {
        if (
          id.includes("road") ||
          id.includes("street") ||
          id.includes("motorway") ||
          id.includes("trunk") ||
          id.includes("primary") ||
          id.includes("secondary") ||
          id.includes("tertiary") ||
          sourceLayer === "road"
        ) {
          const isMajorRoad =
            id.includes("motorway") ||
            id.includes("trunk") ||
            id.includes("primary")

          map.setPaintProperty(
            layer.id,
            "line-color",
            isMajorRoad ? "#4a4a4a" : "#303030",
          )
          map.setPaintProperty(
            layer.id,
            "line-opacity",
            isMajorRoad ? 0.9 : 0.72,
          )
        } else if (
          id.includes("boundary") ||
          sourceLayer === "admin"
        ) {
          map.setPaintProperty(layer.id, "line-color", "#202020")
          map.setPaintProperty(layer.id, "line-opacity", 0.55)
        }
        continue
      }

      if (layer.type === "symbol") {
        if ("text-color" in (layer.paint || {})) {
          map.setPaintProperty(layer.id, "text-color", "#4b4b4b")
        }
        if ("text-halo-color" in (layer.paint || {})) {
          map.setPaintProperty(layer.id, "text-halo-color", "#020202")
          map.setPaintProperty(layer.id, "text-halo-width", 1)
          map.setPaintProperty(layer.id, "text-opacity", 0.72)
        }
        if ("icon-opacity" in (layer.paint || {})) {
          map.setPaintProperty(layer.id, "icon-opacity", 0.48)
        }
      }
    } catch {
      // Some Mapbox layers expose different paint capabilities. Keep the base
      // style layer untouched when a property cannot be overridden safely.
    }
  }
}

function createUserMarker() {
  const el = document.createElement("div")
  el.className = "distribution-map-user"
  el.setAttribute("role", "img")
  el.setAttribute("aria-label", "A te hozzávetőleges pozíciód")
  const orbit = document.createElement("span"); orbit.className = "distribution-map-user__orbit"; orbit.setAttribute("aria-hidden", "true")
  const sweep = document.createElement("span"); sweep.className = "distribution-map-user__sweep"; sweep.setAttribute("aria-hidden", "true")
  const core = document.createElement("span"); core.className = "distribution-map-user__core"; core.setAttribute("aria-hidden", "true")
  core.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none"><circle cx="12" cy="12" r="3.3" fill="#F7FEE7"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" stroke="#F7FEE7" stroke-width="1.5" stroke-linecap="round"/></svg>'
  el.append(orbit, sweep, core)
  return el
}

export default function DistributionMap({
  drops,
  userLocation,
  onSelectDrop,
}: {
  drops: DistributionMapDrop[]
  userLocation: UserLocation | null
  onSelectDrop: (drop: DistributionMapDrop) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const dropMarkersRef = useRef<mapboxgl.Marker[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const hasInitialFitRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof document !== "undefined" && !document.getElementById("distribution-drop-map-style")) {
      const style = document.createElement("style")
      style.id = "distribution-drop-map-style"
      style.textContent = [
        "@keyframes distributionDropHalo { 0% { transform:scale(.72); opacity:0; } 22% { opacity:.5; } 72% { opacity:.13; } 100% { transform:scale(1.42); opacity:0; } }",
        "@keyframes distributionDropBreathe { 0%,100% { transform:scale(.97); filter:drop-shadow(0 0 5px rgba(190,242,100,.12)); } 50% { transform:scale(1.035); filter:drop-shadow(0 0 10px rgba(190,242,100,.3)); } }",
        "@keyframes distributionUserOrbit { 0% { transform:scale(.82) rotate(0deg); opacity:.5; } 55% { opacity:1; } 100% { transform:scale(1.12) rotate(180deg); opacity:.7; } }",
        "@keyframes distributionUserSweep { 0% { transform:rotate(0deg); opacity:.8; } 100% { transform:rotate(360deg); opacity:.8; } }",
        ".distribution-map-drop { isolation:isolate; }",
        ".distribution-map-drop__halo { position:absolute; inset:5px; border:1px solid rgba(217,249,157,.62); clip-path:polygon(25% 3%,75% 3%,97% 50%,75% 97%,25% 97%,3% 50%); background:rgba(190,242,100,.035); animation:distributionDropHalo 3s cubic-bezier(.16,.72,.32,1) infinite; }",
        ".distribution-map-drop__hex { position:relative; z-index:1; display:flex; align-items:center; justify-content:center; width:42px; height:42px; transition:transform .24s ease, filter .24s ease; filter:drop-shadow(0 0 8px rgba(190,242,100,.24)); animation:distributionDropBreathe 3.6s ease-in-out infinite; }",
        ".distribution-map-drop:hover .distribution-map-drop__hex,.distribution-map-drop:focus-visible .distribution-map-drop__hex { transform:scale(1.12); filter:drop-shadow(0 0 13px rgba(217,249,157,.5)); }",
        ".distribution-map-drop:focus-visible { outline:2px solid #F7FEE7; outline-offset:2px; border-radius:8px; }",
        ".distribution-map-drop__core { position:absolute; bottom:1px; width:3px; height:3px; border-radius:50%; background:#F7FEE7; box-shadow:0 0 7px #BEF264; }",
        ".distribution-map-user { position:relative; width:56px; height:56px; display:flex; align-items:center; justify-content:center; }",
        ".distribution-map-user__orbit { position:absolute; inset:4px; border:1px dashed rgba(217,249,157,.95); border-radius:50%; box-shadow:0 0 0 1px rgba(190,242,100,.08),inset 0 0 12px rgba(190,242,100,.06); animation:distributionUserOrbit 4.8s cubic-bezier(.42,0,.58,1) infinite alternate; }",
        ".distribution-map-user__sweep { position:absolute; inset:0; border-radius:50%; background:conic-gradient(from 0deg,transparent 0deg,transparent 285deg,rgba(190,242,100,.03) 318deg,rgba(217,249,157,.3) 356deg,transparent 360deg); animation:distributionUserSweep 7s linear infinite; }",
        ".distribution-map-user__core { position:relative; z-index:1; width:27px; height:27px; display:flex; align-items:center; justify-content:center; border:1.5px solid #F7FEE7; border-radius:50%; background:radial-gradient(circle at 35% 25%,#D9F99D 0%,#84CC16 48%,#365314 100%); box-shadow:0 0 0 4px rgba(190,242,100,.12),0 0 20px rgba(163,230,53,.45); }",
        "@media (prefers-reduced-motion: reduce) { .distribution-map-drop__halo,.distribution-map-drop__hex,.distribution-map-user__orbit,.distribution-map-user__sweep { animation:none !important; } .distribution-map-drop__hex { filter:drop-shadow(0 0 8px rgba(190,242,100,.24)); } }"
      ].join("\n")
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    if (!MAPBOX_TOKEN) {
      setMapError("A térképhez hiányzik a Mapbox konfiguráció.")
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [19.04, 47.4979],
      zoom: 11.5,
      attributionControl: false,
      localFontFamily: false as unknown as string,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right")
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left")

    const resize = () => {
      map.resize()
      map.triggerRepaint()
    }

    map.on("load", () => {
      applyDistributionMapTheme(map)
      resize()
      requestAnimationFrame(resize)
      setMapReady(true)
    })

    map.on("error", (event) => {
      console.error("[DistributionMap] map error", event)
    })

    mapRef.current = map

    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => requestAnimationFrame(resize))
      : null
    observer?.observe(containerRef.current)

    return () => {
      observer?.disconnect()
      dropMarkersRef.current.forEach((marker) => marker.remove())
      dropMarkersRef.current = []
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    dropMarkersRef.current.forEach((marker) => marker.remove())
    dropMarkersRef.current = drops.map((drop) => {
      const element = createDropMarker(drop, onSelectDrop)
      return new mapboxgl.Marker({ element, anchor: "center" })
        .setLngLat([drop.map_lng, drop.map_lat])
        .addTo(map)
    })

    if (!hasInitialFitRef.current && drops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat])
      drops.forEach((drop) => bounds.extend([drop.map_lng, drop.map_lat]))
      map.fitBounds(bounds, { padding: 72, maxZoom: 14.5, duration: 850 })
      hasInitialFitRef.current = true
    }
  }, [drops, mapReady, onSelectDrop, userLocation])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    if (!userLocation) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    const position: [number, number] = [userLocation.lng, userLocation.lat]

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(position)
    } else {
      userMarkerRef.current = new mapboxgl.Marker({
        element: createUserMarker(),
        anchor: "center",
      }).setLngLat(position).addTo(map)
    }

    if (!hasInitialFitRef.current) {
      const bounds = new mapboxgl.LngLatBounds()
      bounds.extend(position)
      drops.forEach((drop) => bounds.extend([drop.map_lng, drop.map_lat]))
      map.fitBounds(bounds, { padding: 72, maxZoom: 14.5, duration: 850 })
      hasInitialFitRef.current = true
    }
  }, [drops, mapReady, userLocation])

  useEffect(() => {
    hasInitialFitRef.current = false
  }, [drops.length])

  if (mapError) {
    return (
      <div className="flex h-[460px] items-center justify-center bg-[#09090b] px-6 text-center text-sm text-zinc-500 sm:h-[540px]">
        {mapError}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-[460px] w-full bg-[#09090b] sm:h-[540px]"
      aria-label="Aktív Vállalhatatlan dead drop lelőhelyek térképe"
    />
  )
}
