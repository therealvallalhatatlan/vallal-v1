/**
 * lib/matrica.ts
 * Shared types and utilities for the sticker hunt feature.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SpotStatus = 'active' | 'empty' | 'archived'
export type ClaimStatus = 'pending' | 'accepted' | 'rejected'

export interface StickerSpot {
  id: string
  title: string
  description: string | null
  image_url: string | null
  lat: number
  lng: number
  radius_visibility: number
  radius_claim: number
  total_quantity: number
  remaining_quantity: number
  status: SpotStatus
  created_at: string
}

export interface Claim {
  id: string
  user_id: string
  spot_id: string
  status: ClaimStatus
  user_image_url: string | null
  comment: string | null
  created_at: string
}

// ─── Geo helpers ──────────────────────────────────────────────────────────────

/**
 * Approximate a geographic circle as a GeoJSON Polygon.
 * Used to draw radius overlays on Mapbox maps.
 *
 * @param lng    Centre longitude
 * @param lat    Centre latitude
 * @param radiusMeters  Circle radius in metres
 * @param steps  Number of polygon vertices (higher = smoother)
 */
export function geoCirclePolygon(
  lng: number,
  lat: number,
  radiusMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  const latRad = (lat * Math.PI) / 180

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dlat = (radiusMeters / 111_320) * Math.sin(angle)
    const dlng = (radiusMeters / (111_320 * Math.cos(latRad))) * Math.cos(angle)
    coords.push([lng + dlng, lat + dlat])
  }

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  }
}

// ─── Distance utility ─────────────────────────────────────────────────────────

const EARTH_RADIUS_METERS = 6_371_000

/**
 * Returns the great-circle distance between two coordinates in metres
 * using the Haversine formula.
 */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}
