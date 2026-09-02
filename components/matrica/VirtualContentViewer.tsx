'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RichContentDocument, StickerSpot, VirtualSpotContentType } from '@/lib/matrica'
import AudioPlayer from './AudioPlayer'
import RichContentRenderer from './RichContentRenderer'

interface Props {
  spot: StickerSpot
  contentUrl: string
  contentType: VirtualSpotContentType
  richContent?: RichContentDocument | null
  onClose: () => void
}

const CONTENT_LABELS: Record<VirtualSpotContentType, string> = {
  video: 'VIDEÓ',
  audio: 'HANG',
  image: 'KÉP',
  text: 'SZÖVEG',
  link: 'LINK',
  rich: 'RICH CONTENT',
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function VirtualContentViewer({ spot, contentUrl, contentType, richContent, onClose }: Props) {
  const typeLabel = CONTENT_LABELS[contentType] ?? 'DIGITÁLIS'
  const accentColor = '#d9f99d'
  const [portalReady, setPortalReady] = useState(false)

  const [textContent, setTextContent] = useState<string | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  const iframeTimeoutRef = useRef<number | null>(null)

  const [iframeFailed, setIframeFailed] = useState(false)

  useEffect(() => {
    setPortalReady(true)
    return () => setPortalReady(false)
  }, [])

  useEffect(() => {
    if (contentType !== 'text') return

    const controller = new AbortController()
    let cancelled = false

    setTextLoading(true)
    setTextError(null)
    setTextContent(null)

    void fetch(contentUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error('A szöveges tartalom nem érhető el.')
        }
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setTextContent(text)
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return
        setTextError(error instanceof Error ? error.message : 'Nem sikerült betölteni a szöveget.')
      })
      .finally(() => {
        if (!cancelled) setTextLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [contentUrl, contentType])

  useEffect(() => {
    if (contentType !== 'link') return

    setIframeFailed(false)

    if (iframeTimeoutRef.current !== null) {
      window.clearTimeout(iframeTimeoutRef.current)
    }

    iframeTimeoutRef.current = window.setTimeout(() => {
      setIframeFailed(true)
      iframeTimeoutRef.current = null
    }, 3500)

    return () => {
      if (iframeTimeoutRef.current !== null) {
        window.clearTimeout(iframeTimeoutRef.current)
        iframeTimeoutRef.current = null
      }
    }
  }, [contentUrl, contentType])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleIframeLoad = useCallback(() => {
    setIframeFailed(false)
    if (iframeTimeoutRef.current !== null) {
      window.clearTimeout(iframeTimeoutRef.current)
      iframeTimeoutRef.current = null
    }
  }, [])

  const handleIframeError = useCallback(() => {
    setIframeFailed(true)
    if (iframeTimeoutRef.current !== null) {
      window.clearTimeout(iframeTimeoutRef.current)
      iframeTimeoutRef.current = null
    }
  }, [])

  const renderContent = useMemo(() => {
    switch (contentType) {
      case 'video':
        return (
          <video
            src={contentUrl}
            controls
            playsInline
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              borderRadius: 0,
              objectFit: 'contain',
              background: '#020204',
            }}
          />
        )

      case 'audio':
        return <AudioPlayer src={contentUrl} />

      case 'image':
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contentUrl}
            alt={spot.title}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: 0,
            }}
          />
        )

      case 'text':
        if (textLoading) {
          return (
            <div style={{ color: '#9ca3af', fontSize: 16 }}>
              Tartalom betöltése…
            </div>
          )
        }

        if (textError) {
          return (
            <div style={{ color: '#f87171', fontSize: 16 }}>
              {textError}
            </div>
          )
        }

        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              padding: '8px 24px 32px',
              background: 'transparent',
              color: '#f4f4f5',
              fontSize: 'clamp(19px, 2vw, 25px)',
              lineHeight: 1.78,
              whiteSpace: 'pre-wrap',
              boxSizing: 'border-box',
            }}
          >
            {textContent ?? 'Nincs megjeleníthető szöveges tartalom.'}
          </div>
        )

      case 'link':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {!iframeFailed ? (
              <iframe
                title={spot.title}
                src={contentUrl}
                loading="lazy"
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: 0,
                  border: 'none',
                  borderRadius: 0,
                  background: '#030712',
                }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: 220,
                  borderRadius: 0,
                  border: '1px solid rgba(217,249,157,0.24)',
                  background: 'rgba(163,230,53,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: 24,
                  gap: 12,
                }}
              >
                <div style={{ color: accentColor, fontWeight: 800, fontSize: 16 }}>
                  A TARTALOM KÜLSŐ OLDALON NYÍLIK MEG
                </div>
                <span style={{ color: '#d4d4d8', fontSize: 14 }}>
                  Ez az oldal nem engedi a beágyazást.
                </span>
                <button
                  type="button"
                  onClick={() => window.open(contentUrl, '_blank', 'noopener,noreferrer')}
                  style={{
                    borderRadius: 0,
                    border: '1px solid rgba(217,249,157,0.46)',
                    background: 'rgba(163,230,53,0.06)',
                    color: '#f4f4f5',
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '11px 18px',
                    cursor: 'pointer',
                  }}
                >
                  MEGNYITÁS KÜLSŐ ABLAKBAN
                </button>
              </div>
            )}
          </div>
        )

      case 'rich':
        if (!richContent) {
          return <div style={{ color: '#f87171', fontSize: 16 }}>Rich Content nem elérhető.</div>
        }
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              padding: '8px 24px 32px',
              color: '#f4f4f5',
              fontSize: 'clamp(18px, 1.8vw, 24px)',
              lineHeight: 1.6,
              boxSizing: 'border-box',
            }}
          >
            <RichContentRenderer content={richContent} />
          </div>
        )

      default:
        return null
    }
  }, [
    contentType,
    contentUrl,
    textLoading,
    textError,
    textContent,
    handleIframeLoad,
    handleIframeError,
    spot.title,
    richContent,
  ])

  const viewer = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,4,7,0.94)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 0,
        paddingTop: 'var(--matrica-header-offset, 90px)',
        backdropFilter: 'blur(12px)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100dvh - var(--matrica-header-offset, 90px))',
          maxHeight: 'calc(100dvh - var(--matrica-header-offset, 90px))',
          margin: 0,
          background: 'rgba(5,5,8,0.98)',
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <header
          style={{
            position: 'relative',
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 92,
            padding: '18px 72px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(5,5,8,0.98)',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            aria-label="Bezárás"
            onClick={onClose}
            style={{
              position: 'absolute',
              left: 14,
              top: 12,
              width: 46,
              height: 46,
              borderRadius: 0,
              border: 'none',
              background: 'rgba(255,255,255,0.04)',
              color: '#f4f4f5',
              fontSize: 26,
              lineHeight: 1,
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            ×
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, minWidth: 0, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: 'var(--font-mono-tech)' }}>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  fontWeight: 800,
                  color: '#d4d4d8',
                  textTransform: 'uppercase',
                }}
              >
                DIGITÁLIS SZPOT
              </span>
              <span style={{ color: '#71717a', fontSize: 10 }}> / </span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  fontWeight: 800,
                  color: '#d4d4d8',
                  textTransform: 'uppercase',
                }}
              >
                {typeLabel}
              </span>
            </div>
            <span
              style={{
                maxWidth: 'calc(100% - 48px)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#f4f4f5',
                fontSize: 'clamp(20px, 2.2vw, 28px)',
                lineHeight: 1.15,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                textAlign: 'center',
              }}
            >
              {spot.title}
            </span>
          </div>

          {contentType === 'link' ? (
            <button
              type="button"
              onClick={() => window.open(contentUrl, '_blank', 'noopener,noreferrer')}
              style={{
                position: 'absolute',
                right: 14,
                top: 12,
                borderRadius: 0,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'transparent',
                color: '#f4f4f5',
                fontSize: 11,
                fontWeight: 800,
                padding: '9px 12px',
                cursor: 'pointer',
              }}
            >
              KÜLSŐ MEGNYITÁS
            </button>
          ) : null}
        </header>

        <main
          style={{
            flex: 1,
            minHeight: 0,
            padding: 0,
            display: 'flex',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              borderRadius: 0,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              padding: 0,
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {renderContent}
          </div>
        </main>

        <footer
          style={{
            flex: '0 0 auto',
            minHeight: 28,
            padding: '7px 24px 9px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.24em',
              color: '#9ca3af',
            }}
          >
            DIGITÁLIS NODE
          </span>
        </footer>
      </div>

      <style jsx>{`
        @media (max-width: 700px) {
          div[role='dialog'] {
            padding-top: var(--matrica-header-offset, 72px) !important;
          }
        }
      `}</style>
    </div>
  )

  return portalReady ? createPortal(viewer, document.body) : null
}