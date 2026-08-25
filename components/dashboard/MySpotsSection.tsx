'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LocationSpotType, SpotStatus, SpotType } from '@/lib/matrica'

type MySpot = {
  id: string
  title: string | null
  description: string | null
  image_url: string | null
  image_urls: string[] | null
  status: SpotStatus | null
  spot_type: SpotType | null
  type: LocationSpotType | null
  created_at: string
}

const LOCATION_LABELS: Record<LocationSpotType, string> = {
  physical: 'FIZIKAI',
  virtual: 'DIGITÁLIS',
}

const STATUS_LABELS: Record<SpotStatus, string> = {
  active: 'Aktív',
  empty: 'Elfogyott',
  archived: 'Archivált',
}

const SPOT_TYPE_LABELS: Record<SpotType, string> = {
  free: 'Ingyenes',
  paid: 'Fizetős',
}

const formatTimestamp = (value: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const extractThumbnail = (spot: MySpot): string | null => {
  if (spot.image_url) return spot.image_url
  if (Array.isArray(spot.image_urls) && spot.image_urls.length > 0) {
    return spot.image_urls[0]
  }
  return null
}

type Props = {
  token: string | null | undefined
}

export default function MySpotsSection({ token }: Props) {
  const [spots, setSpots] = useState<MySpot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [actionPending, setActionPending] = useState<Record<string, boolean>>({})
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const refreshSpots = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (!token) {
      setSpots([])
      setError('Bejelentkezés szükséges.')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let isMounted = true

    setLoading(true)
    setError(null)

    fetch('/api/matrica/my-spots?type=hidden', {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `HTTP ${response.status}`)
        }
        return response.json() as Promise<{ ok: boolean; spots?: MySpot[] }>
      })
      .then((payload) => {
        if (!isMounted) return
        setSpots(payload.spots ?? [])
      })
      .catch((err) => {
        if (!isMounted) return
        if ((err as Error)?.name === 'AbortError') return
        console.error('[MySpotsSection] fetch error', err)
        setError(err instanceof Error ? err.message : 'Hiba történt a spotok betöltésekor.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [refreshKey, token])

  const archiveSpot = useCallback(
    async (spotId: string) => {
      if (!token) return
      setActionPending((prev) => ({ ...prev, [spotId]: true }))
      try {
        const response = await fetch('/api/admin/matrica/spots', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: spotId, status: 'archived' }),
        })
        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `HTTP ${response.status}`)
        }
        refreshSpots()
      } catch (err) {
        console.error('[MySpotsSection] archive error', err)
      setError(err instanceof Error ? err.message : 'Nem sikerült archiválni a spotot.')
      } finally {
        setActionPending((prev) => ({ ...prev, [spotId]: false }))
      }
    },
    [refreshSpots, token],
  )

  const openEditDialog = useCallback((spot: MySpot) => {
    setEditingSpotId(spot.id)
    setEditTitle(spot.title ?? '')
    setEditDescription(spot.description ?? '')
    setEditError(null)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditingSpotId(null)
    setEditError(null)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!token || !editingSpotId) return
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) {
      setEditError('A cím nem lehet üres.')
      return
    }
    setEditLoading(true)
    setEditError(null)
    try {
      const response = await fetch('/api/matrica/my-spots', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingSpotId,
          title: trimmedTitle,
          description: editDescription.trim(),
        }),
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `HTTP ${response.status}`)
      }
      refreshSpots()
      closeEditDialog()
    } catch (err) {
    console.error('[MySpotsSection] edit error', err)
    setEditError(err instanceof Error ? err.message : 'Mentés közben hiba történt.')
    } finally {
      setEditLoading(false)
    }
  }, [closeEditDialog, editDescription, editTitle, editingSpotId, refreshSpots, token])

  return (
    <section className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">MY SPOTS</p>
        <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          {spots.length} pont
        </span>
      </div>
      {loading ? (
        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">betöltés…</p>
      ) : error ? (
        <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400">{error}</p>
      ) : spots.length === 0 ? (
        <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Még nem hoztál létre szpotot.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {spots.map((spot) => {
            const thumbnail = extractThumbnail(spot)
            const statusLabel = spot.status ? STATUS_LABELS[spot.status] : 'ISMERETLEN'
            const typeLabel = spot.type ? LOCATION_LABELS[spot.type] : 'ISMERETLEN'
            const spotTypeLabel = spot.spot_type ? SPOT_TYPE_LABELS[spot.spot_type] : '—'
            const isArchived = spot.status === 'archived'
            return (
              <article key={spot.id} className="flex flex-col gap-3 rounded border border-zinc-900/70 bg-black/30 p-3 sm:flex-row">
                <div className="flex h-20 w-full items-stretch justify-center rounded border border-zinc-900 sm:w-20">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={spot.title ?? 'Szpot borító'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                      Nincs kép
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 text-[11px] uppercase tracking-[0.3em] sm:px-3">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-100">{spot.title ?? 'Cím nélküli'}</p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    {typeLabel} · {spotTypeLabel}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400">{statusLabel}</p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                    Létrehozva: {formatTimestamp(spot.created_at)}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => openEditDialog(spot)}
                    className="rounded border border-zinc-900/80 bg-zinc-900/60 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-zinc-200 transition-colors hover:border-zinc-500 sm:w-28"
                  >
                    EDIT
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveSpot(spot.id)}
                    disabled={isArchived || actionPending[spot.id]}
                    className="rounded border border-amber-600/60 bg-amber-600/10 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-amber-200 transition-all disabled:border-zinc-800 disabled:text-zinc-500"
                  >
                    {actionPending[spot.id] ? 'Archiválás…' : 'ARCHIVE'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editingSpotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded border border-zinc-900 bg-zinc-950 p-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.35em] text-zinc-200">Spot szerkesztése</h3>
            <label className="mt-4 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">Cím</label>
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="mt-1 w-full rounded border border-zinc-800 bg-black/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
            />
            <label className="mt-3 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">Leírás</label>
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-zinc-800 bg-black/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
            />
            {editError && <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-rose-400">{editError}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                disabled={editLoading}
                onClick={closeEditDialog}
                className="rounded border border-zinc-900/80 bg-zinc-900/60 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-zinc-400 transition-colors hover:border-zinc-500"
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={editLoading}
                onClick={saveEdit}
                className="rounded border border-emerald-500/80 bg-emerald-500/10 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-emerald-300 transition-colors hover:border-emerald-500"
              >
                {editLoading ? 'Mentés…' : 'Mentés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}