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
  button.setAttribute("aria-label", drop.product_name + " hozzávetőleges lelőhely")
  button.className = "distribution-map-pulse"
  button.style.cssText = [
    "position:relative","width:92px","height:92px","padding:0","border:0",
    "background:transparent","cursor:pointer","display:flex",
    "align-items:center","justify-content:center",
  ].join(";")

  const pulse = document.createElement("span")
  pulse.style.cssText = [
    "position:absolute","left:50%","top:50%","width:46px","height:46px",
    "margin-left:-23px","margin-top:-23px","border-radius:999px",
    "border:1px solid rgba(190,242,100,.42)",
    "background:rgba(163,230,53,.045)",
    "box-shadow:0 0 0 1px rgba(190,242,100,.08),0 0 28px rgba(163,230,53,.12)",
    "animation:distributionDropPulse 2.2s ease-out infinite",
  ].join(";")

  button.append(pulse)
  button.addEventListener("click", (event) => {
    event.stopPropagation()
    onSelect(drop)
  })

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
  el.style.cssText = [
    "width:22px","height:22px","border-radius:999px",
    "background:radial-gradient(circle at 30% 30%,#f7fee7 0%,#bef264 42%,#4d7c0f 100%)",
    "border:2px solid rgba(255,255,255,.95)",
    "box-shadow:0 0 0 7px rgba(163,230,53,.18),0 0 28px rgba(163,230,53,.34)",
  ].join(";")
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
      style.textContent = `@keyframes distributionDropPulse {
  0%,100% { transform:scale(.92); opacity:.72; }
  50% { transform:scale(1.08); opacity:1; }
}
@media (prefers-reduced-motion: reduce) {
  .distribution-map-pulse { animation:none !important; }
}`
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
