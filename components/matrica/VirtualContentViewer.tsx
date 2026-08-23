'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StickerSpot, VirtualSpotContentType } from '@/lib/matrica'

interface Props {
  spot: StickerSpot
  contentUrl: string
  onClose: () => void
}

const CONTENT_LABELS: Record<VirtualSpotContentType, string> = {
  video: 'VIDEÓ',
  audio: 'HANG',
  image: 'KÉP',
  text: 'SZÖVEG',
  link: 'LINK',
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function VirtualContentViewer({ spot, contentUrl, onClose }: Props) {
  const contentType = (spot.content_type ?? 'video') as VirtualSpotContentType
  const typeLabel = CONTENT_LABELS[contentType] ?? 'DIGITÁLIS'
  const accentColor = '#c084fc'

  const [textContent, setTextContent] = useState<string | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  const iframeTimeoutRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [iframeFailed, setIframeFailed] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioCurrent, setAudioCurrent] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

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
    const audio = audioRef.current
    if (!audio || contentType !== 'audio') return

    const handleLoadedMetadata = () => setAudioDuration(audio.duration || 0)
    const handleTimeUpdate = () => setAudioCurrent(audio.currentTime || 0)
    const handlePlay = () => setAudioPlaying(true)
    const handlePause = () => setAudioPlaying(false)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handlePause)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handlePause)
    }
  }, [contentUrl, contentType])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      void audio.play().catch(() => {
        setAudioPlaying(false)
      })
    } else {
      audio.pause()
    }
  }, [])

  const handleSeek = useCallback((value: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = value
    setAudioCurrent(value)
  }, [])

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
              borderRadius: 18,
              objectFit: 'contain',
              background: '#020204',
            }}
          />
        )

      case 'audio':
        return (
          <div
            style={{
              width: '100%',
              maxWidth: 760,
              margin: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
            }}
          >
            <audio ref={audioRef} src={contentUrl} preload="metadata" />

            <div
              style={{
                width: 108,
                height: 108,
                borderRadius: '50%',
                border: '1px solid rgba(192,132,252,0.45)',
                background: 'radial-gradient(circle, rgba(192,132,252,0.18), rgba(192,132,252,0.03) 62%, transparent 63%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accentColor,
                fontSize: 34,
                boxShadow: '0 0 48px rgba(192,132,252,0.18)',
              }}
            >
              {audioPlaying ? 'Ⅱ' : '▶'}
            </div>

            <button
              type="button"
              onClick={toggleAudio}
              style={{
                minWidth: 180,
                borderRadius: 16,
                border: '1px solid rgba(192,132,252,0.72)',
                background: 'rgba(192,132,252,0.13)',
                color: '#f4f4f5',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.16em',
                padding: '13px 22px',
                cursor: 'pointer',
              }}
            >
              {audioPlaying ? 'SZÜNET' : 'LEJÁTSZÁS'}
            </button>

            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono-tech)', fontSize: 12, color: '#9ca3af', minWidth: 40 }}>
                {formatTime(audioCurrent)}
              </span>

              <input
                type="range"
                min={0}
                max={audioDuration || 1}
                step={0.1}
                value={Math.min(audioCurrent, audioDuration || 0)}
                onChange={(event) => handleSeek(Number(event.target.value))}
                style={{ flex: 1, accentColor, cursor: 'pointer' }}
              />

              <span style={{ fontFamily: 'var(--font-mono-tech)', fontSize: 12, color: '#9ca3af', minWidth: 40, textAlign: 'right' }}>
                {formatTime(audioDuration)}
              </span>
            </div>
          </div>
        )

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
              borderRadius: 18,
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
              maxWidth: 980,
              height: '100%',
              overflowY: 'auto',
              padding: '28px clamp(18px, 4vw, 56px)',
              borderRadius: 18,
              background: 'rgba(15,16,19,0.7)',
              color: '#f4f4f5',
              fontSize: 'clamp(16px, 1.5vw, 20px)',
              lineHeight: 1.72,
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
                  borderRadius: 18,
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
                  borderRadius: 18,
                  border: '1px solid rgba(192,132,252,0.35)',
                  background: 'rgba(192,132,252,0.07)',
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
                    borderRadius: 14,
                    border: '1px solid rgba(192,132,252,0.65)',
                    background: 'rgba(192,132,252,0.14)',
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

      default:
        return null
    }
  }, [
    contentType,
    contentUrl,
    textLoading,
    textError,
    textContent,
    toggleAudio,
    audioPlaying,
    audioCurrent,
    audioDuration,
    handleSeek,
    handleIframeLoad,
    handleIframeError,
    spot.title,
  ])

  return (
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
          width: 'min(1280px, calc(100vw - 20px))',
          height: 'calc(100dvh - var(--matrica-header-offset, 90px) - 10px)',
          maxHeight: 'calc(100dvh - var(--matrica-header-offset, 90px) - 10px)',
          margin: '8px auto 0',
          background: 'rgba(5,6,9,0.99)',
          borderRadius: 24,
          border: '1px solid rgba(192,132,252,0.22)',
          boxShadow: '0 45px 140px rgba(0,0,0,0.68)',
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
            minHeight: 72,
            padding: '14px 76px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: 'rgba(5,5,8,0.96)',
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
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.03)',
              color: '#f4f4f5',
              fontSize: 26,
              lineHeight: 1,
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            ×
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.28em',
                fontWeight: 800,
                color: '#bef264',
              }}
            >
              DIGITÁLIS SPOT
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: accentColor,
                letterSpacing: '0.05em',
              }}
            >
              {typeLabel}
            </span>
            <span
              style={{
                maxWidth: '55vw',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#9ca3af',
                fontSize: 12,
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
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
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
            padding: '10px',
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
              borderRadius: 18,
              background: 'rgba(12,12,14,0.88)',
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.52)',
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              padding: 10,
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
            padding: '9px 18px 12px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
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
}
