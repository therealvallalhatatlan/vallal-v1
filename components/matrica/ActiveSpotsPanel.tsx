'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { StickerSpot } from '@/lib/matrica'
import { getDistanceMeters } from '@/lib/matrica'

interface UserLocation {
  lat: number
  lng: number
}

interface Props {
  isOpen: boolean
  spots: StickerSpot[]
  userLocation: UserLocation | null
  isMobile: boolean
  bottomOffset: number
  layout?: 'overlay' | 'inline'
  unlockingSpotId: string | null
  onClose: () => void
  onSelectSpot: (spot: StickerSpot) => void
  onStartRoute: (spot: StickerSpot) => void
  onClaimFound?: (spot: StickerSpot) => void
  claimingSpotId?: string | null
  canEditSpots?: boolean
  canEditSpot?: (spot: StickerSpot) => boolean
  onSaveSpot?: (spotId: string, updates: { title: string; description: string; price_huf: number }) => Promise<StickerSpot | void>
  onDeleteSpot?: (spotId: string) => Promise<void>
  userFoundCount?: number | null
}

type SpotsTab = 'all' | 'physical' | 'virtual'


function getVirtualContentLabel(contentType?: StickerSpot['content_type']): string {
  switch (contentType) {
    case 'video': return 'VIDEÓ'
    case 'audio': return 'HANG'
    case 'image': return 'KÉP'
    case 'text': return 'SZÖVEG'
    case 'link': return 'LINK'
    default: return 'DIGITÁLIS'
  }
}

function isPaidLockedSpot(spot: StickerSpot): boolean {
  return spot.spot_type === 'paid' && !!spot.is_locked
}

function formatDistance(distanceMeters: number | null): string {
  if (distanceMeters === null) return '--'
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`
  return `${(distanceMeters / 1000).toFixed(1)} km`
}

export default function ActiveSpotsPanel({
  isOpen,
  spots,
  userLocation,
  isMobile,
  bottomOffset,
  layout = 'overlay',
  unlockingSpotId,
  onClose,
  onSelectSpot,
  onStartRoute,
  onClaimFound,
  claimingSpotId = null,
  canEditSpots = false,
  canEditSpot,
  onSaveSpot,
  onDeleteSpot,
  userFoundCount = null,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'physical' | 'virtual'>('all')
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriceHuf, setEditPriceHuf] = useState('0')
  const [savingSpotId, setSavingSpotId] = useState<string | null>(null)
  const [deletingSpotId, setDeletingSpotId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [adminMenuSpotId, setAdminMenuSpotId] = useState<string | null>(null)

  const sortedSpots = useMemo(() => {
    return spots
      .filter((spot) => typeof spot.lat === 'number' && typeof spot.lng === 'number')
      .map((spot) => ({
        spot,
        distance: userLocation
          ? getDistanceMeters(userLocation.lat, userLocation.lng, spot.lat, spot.lng)
          : null,
      }))
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
  }, [spots, userLocation])

  const physicalSpots = useMemo(
    () => sortedSpots.filter(({ spot }) => spot.type !== 'virtual'),
    [sortedSpots],
  )

  const virtualSpots = useMemo(
    () => sortedSpots.filter(({ spot }) => spot.type === 'virtual'),
    [sortedSpots],
  )

  const visibleSpots =
    activeTab === 'physical' ? physicalSpots : activeTab === 'virtual' ? virtualSpots : sortedSpots

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const container = scrollRef.current
    if (!container) return
    container.scrollBy({
      left: direction * Math.max(280, container.clientWidth * 0.72),
      behavior: 'smooth',
    })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
    setEditingSpotId(null)
    setEditError(null)
    setAdminMenuSpotId(null)
  }, [activeTab])

  useEffect(() => {
    if (!isOpen) setAdminMenuSpotId(null)
  }, [isOpen])

  if (!isOpen) return null

  const physicalCount = physicalSpots.length
  const virtualCount = virtualSpots.length
  const allCount = sortedSpots.length

  const panelTitle = layout === 'inline' ? 'AKTÍV HELYEK' : 'AKTÍV HELYEK'
  const activeCountLabel = `${visibleSpots.length} elérhető hely`

  const renderTypeIcon = (spot: StickerSpot, size = 22) => {
    const virtual = spot.type === 'virtual'
    const contentType = spot.content_type
    const stroke = 'currentColor'
    const common = {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      'aria-hidden': true as const,
    }

    if (!virtual) {
      return (
        <svg {...common}>
          <path d="M12 21s7-6.1 7-11.2A7 7 0 0 0 5 9.8C5 14.9 12 21 12 21Z" stroke={stroke} strokeWidth="1.7" />
          <circle cx="12" cy="9.8" r="2.2" stroke={stroke} strokeWidth="1.7" />
        </svg>
      )
    }

    switch (contentType) {
      case 'video':
        return (
          <svg {...common}>
            <rect x="3" y="5" width="13" height="14" rx="2" stroke={stroke} strokeWidth="1.7" />
            <path d="m16 10 5-3v10l-5-3" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="m8 9 4 3-4 3V9Z" fill={stroke} stroke="none" />
          </svg>
        )
      case 'audio':
        return (
          <svg {...common}>
            <path d="M8 18.5V8.8L17 6v9.5" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="2.5" stroke={stroke} strokeWidth="1.7" />
            <circle cx="15" cy="15" r="2.5" stroke={stroke} strokeWidth="1.7" />
          </svg>
        )
      case 'image':
        return (
          <svg {...common}>
            <rect x="3" y="4" width="18" height="16" rx="2" stroke={stroke} strokeWidth="1.7" />
            <circle cx="8" cy="9" r="1.6" stroke={stroke} strokeWidth="1.5" />
            <path d="m5.5 18 4.5-4.5 3 3 2-2 3.5 3.5" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      case 'text':
        return (
          <svg {...common}>
            <path d="M5 6h14M7 11h10M7 16h7" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        )
      case 'link':
      default:
        return (
          <svg {...common}>
            <path d="m8.8 15.2-1.1 1.1a3.5 3.5 0 0 1-5-5l2-2a3.5 3.5 0 0 1 5-0.1" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
            <path d="m15.2 8.8 1.1-1.1a3.5 3.5 0 0 1 5 5l-2 2a3.5 3.5 0 0 1-5 .1" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
            <path d="m8 12 8-2" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        )
    }
  }

  const renderTab = (value: 'all' | 'physical' | 'virtual', label: string, count: number) => {
    const active = activeTab === value
    return (
      <button
        type="button"
        onClick={() => setActiveTab(value)}
        aria-pressed={active}
        style={{
          flex: '0 0 auto',
          border: 0,
          borderRadius: 0,
          borderBottom: active ? '2px solid #f4f4f5' : '2px solid transparent',
          background: 'transparent',
          color: active ? '#f4f4f5' : '#777b84',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.08em',
          padding: '10px 12px 9px',
          cursor: 'pointer',
          transition: 'color 120ms ease, border-color 120ms ease',
        }}
      >
        {label} <span style={{ color: active ? '#bef264' : '#5d616a' }}>{count}</span>
      </button>
    )
  }

  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            color: '#f4f4f5',
            fontSize: isMobile ? 17 : 19,
            fontWeight: 900,
            letterSpacing: '0.06em',
            lineHeight: 1.1,
          }}
        >
          {panelTitle}
        </div>
        <div
          style={{
            marginTop: 4,
            color: '#777b84',
            fontSize: 11,
            fontFamily: 'var(--font-mono-tech)',
            letterSpacing: '0.05em',
          }}
        >
          {activeCountLabel}
          {typeof userFoundCount === 'number' && userFoundCount > 0 ? (
            <span style={{ marginLeft: 8, color: '#a1a1aa' }}>· {userFoundCount} felfedezve</span>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginTop: 10,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {renderTab('all', 'MIND', allCount)}
          {renderTab('physical', 'FIZIKAI', physicalCount)}
          {renderTab('virtual', 'DIGITÁLIS', virtualCount)}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Bezárás"
        style={{
          width: 42,
          height: 42,
          flex: '0 0 auto',
          border: 0,
          borderRadius: 0,
          background: 'transparent',
          color: '#b8bcc4',
          cursor: 'pointer',
          fontSize: 24,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -4,
        }}
      >
        ×
      </button>
    </div>
  )

  const cardsRow = (
    <div style={{ position: 'relative', minHeight: 0 }}>
      {!isMobile && visibleSpots.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Előző helyek"
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              width: 34,
              height: 54,
              border: 0,
              borderRight: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(7,8,11,0.92)',
              color: '#d7dae0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Következő helyek"
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              width: 34,
              height: 54,
              border: 0,
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(7,8,11,0.92)',
              color: '#d7dae0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ›
          </button>
        </>
      ) : null}

      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none' as CSSProperties['msOverflowStyle'],
          padding: '2px 34px 0',
        }}
      >
        {!visibleSpots.length ? (
          <div
            style={{
              width: '100%',
              padding: '22px 4px 20px',
              color: '#6f737d',
              fontSize: 13,
              fontFamily: 'var(--font-mono-tech)',
            }}
          >
            {activeTab === 'physical'
              ? 'Nincs aktív fizikai hely.'
              : activeTab === 'virtual'
                ? 'Nincs aktív digitális tartalom.'
                : 'Nincs aktív hely.'}
          </div>
        ) : (
          visibleSpots.map(({ spot, distance }) => {
            const locked = isPaidLockedSpot(spot)
            const canEditThisSpot = canEditSpot ? canEditSpot(spot) : canEditSpots
            const isEditing = canEditThisSpot && editingSpotId === spot.id
            const adminOpen = canEditThisSpot && adminMenuSpotId === spot.id
            const isClaiming = claimingSpotId === spot.id
            const virtual = spot.type === 'virtual'
            const contentLabel = virtual
              ? getVirtualContentLabel(spot.content_type)
              : 'HELYSZÍN'
            const distanceLabel = formatDistance(distance)

            let claimLabel = 'MEGTALÁLTAM'
            if (isClaiming) claimLabel = 'RÖGZÍTÉS…'
            else if (locked) claimLabel = 'FELOLDÁS SZÜKSÉGES'
            else if (spot.remaining_quantity <= 0 && !virtual) claimLabel = 'ELFOGYOTT'
            else if (distance === null) claimLabel = 'HELYZET SZÜKSÉGES'
            else if (distance > spot.radius_claim) claimLabel = `MENJ KÖZELEBB · ${Math.round(distance)} M`

            const claimDisabled =
              !onClaimFound ||
              locked ||
              isClaiming ||
              (!virtual && spot.remaining_quantity <= 0) ||
              distance === null ||
              (distance !== null && distance > spot.radius_claim)

            return (
              <article
                key={spot.id}
                onClick={() => onSelectSpot(spot)}
                style={{
                  position: 'relative',
                  flex: '0 0 auto',
                  scrollSnapAlign: 'start',
                  width: isMobile ? 'min(84vw, 390px)' : 'min(420px, 42vw)',
                  minHeight: 86,
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: '42px minmax(0,1fr) auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 14px',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c8cbd1',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  {renderTypeIcon(spot)}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#f4f4f5',
                        fontSize: isMobile ? 15 : 16,
                        fontWeight: 850,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {spot.title}
                    </span>
                    {locked ? (
                      <span
                        style={{
                          flex: '0 0 auto',
                          color: '#777b84',
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                        }}
                      >
                        ZÁRT
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      marginTop: 4,
                      minWidth: 0,
                      color: '#777b84',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono-tech)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>{virtual ? 'DIGITÁLIS' : 'FIZIKAI'}</span>
                    <span style={{ color: '#454851' }}>·</span>
                    <span>{contentLabel}</span>
                    <span style={{ color: '#454851' }}>·</span>
                    <span>{distanceLabel}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#c7cad1',
                    fontSize: 18,
                  }}
                >
                  <span aria-hidden="true">→</span>
                  {canEditThisSpot ? (
                    <button
                      type="button"
                      aria-label="Admin műveletek"
                      onClick={(event) => {
                        event.stopPropagation()
                        setAdminMenuSpotId((current) => (current === spot.id ? null : spot.id))
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        border: 0,
                        background: 'transparent',
                        color: '#737780',
                        cursor: 'pointer',
                        fontSize: 18,
                      }}
                    >
                      ⋯
                    </button>
                  ) : null}
                </div>

                {adminOpen ? (
                  <div
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      gap: 8,
                      paddingTop: 4,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {!isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSpotId(spot.id)
                            setEditTitle(spot.title || '')
                            setEditDescription(spot.description || '')
                            setEditPriceHuf(String(typeof spot.price_huf === 'number' ? Math.max(0, Math.floor(spot.price_huf)) : 0))
                            setEditError(null)
                            setAdminMenuSpotId(null)
                          }}
                          style={actionButtonStyle}
                        >
                          SZERKESZTÉS
                        </button>
                        {onDeleteSpot ? (
                          <button
                            type="button"
                            disabled={deletingSpotId === spot.id}
                            onClick={async () => {
                              const confirmed = window.confirm('Biztosan törlöd ezt a spotot? Ez nem visszavonható.')
                              if (!confirmed) return
                              setDeletingSpotId(spot.id)
                              setEditError(null)
                              try {
                                await onDeleteSpot(spot.id)
                                setAdminMenuSpotId(null)
                              } catch (error) {
                                setEditError(error instanceof Error ? error.message : 'Nem sikerült törölni a szpotot.')
                              } finally {
                                setDeletingSpotId(null)
                              }
                            }}
                            style={actionButtonStyle}
                          >
                            {deletingSpotId === spot.id ? 'TÖRLÉS…' : 'TÖRLÉS'}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <div style={{ width: '100%', display: 'grid', gap: 8 }}>
                        <input
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          placeholder="Cím"
                          style={fieldStyle}
                        />
                        <textarea
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          rows={2}
                          placeholder="Leírás"
                          style={fieldStyle}
                        />
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={editPriceHuf}
                          onChange={(event) => setEditPriceHuf(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          placeholder="Ár HUF"
                          style={fieldStyle}
                        />
                        {editError ? <div style={{ color: '#a1a1aa', fontSize: 11 }}>{editError}</div> : null}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            disabled={savingSpotId === spot.id}
                            onClick={async (event) => {
                              event.stopPropagation()
                              if (!onSaveSpot) return
                              const parsedPriceHuf = Number(editPriceHuf)
                              if (!Number.isFinite(parsedPriceHuf) || parsedPriceHuf < 0) {
                                setEditError('Az ár nem lehet negatív szám.')
                                return
                              }
                              setSavingSpotId(spot.id)
                              setEditError(null)
                              try {
                                await onSaveSpot(spot.id, {
                                  title: editTitle.trim(),
                                  description: editDescription.trim(),
                                  price_huf: Math.floor(parsedPriceHuf),
                                })
                                setEditingSpotId(null)
                                setAdminMenuSpotId(null)
                              } catch (error) {
                                setEditError(error instanceof Error ? error.message : 'Nem sikerült menteni a szpotot.')
                              } finally {
                                setSavingSpotId(null)
                              }
                            }}
                            style={actionButtonStyle}
                          >
                            {savingSpotId === spot.id ? 'MENTÉS…' : 'MENTÉS'}
                          </button>
                          <button
                            type="button"
                            disabled={savingSpotId === spot.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              setEditingSpotId(null)
                              setEditError(null)
                              setAdminMenuSpotId(null)
                            }}
                            style={actionButtonStyle}
                          >
                            MÉGSE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })
        )}
      </div>
    </div>
  )

  const panelSurface = (
    <section
      role="dialog"
      aria-modal={layout !== 'inline'}
      aria-label="Aktív helyek"
      style={{
        width: '100%',
        background: '#07080b',
        color: '#f4f4f5',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 -18px 40px rgba(0,0,0,0.38)',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '12px 0 10px' : '14px 0 12px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ padding: '0 16px' }}>
        {header}
      </div>
      {cardsRow}
    </section>
  )

  if (layout === 'inline') {
    return panelSurface
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.24)',
          zIndex: 44,
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: bottomOffset,
          width: '100vw',
          zIndex: 45,
        }}
      >
        {panelSurface}
      </div>
      <style jsx>{`
        div[role='dialog']::-webkit-scrollbar { display: none; }
        @media (max-width: 900px) {
          div[role='dialog'] { padding-right: 0 !important; }
        }
      `}</style>
    </>
  )
}

const actionButtonStyle: CSSProperties = {
  flex: 1,
  minHeight: 34,
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 0,
  background: 'rgba(255,255,255,0.04)',
  color: '#d7dae0',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.08em',
  padding: '7px 10px',
  cursor: 'pointer',
}

const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 0,
  background: '#0b0c10',
  color: '#f4f4f5',
  fontSize: 12,
  padding: '9px 10px',
  outline: 'none',
  boxSizing: 'border-box',
}