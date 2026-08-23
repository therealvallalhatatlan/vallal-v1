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
  const [iframeFailed, setIframeFailed] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
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
          throw new Error('A szöveg tartalom nem érhető el.')
        }
        return res.text()
      })
      .then((text) => {
        if (cancelled) return
        setTextContent(text)
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return
        setTextError(error?.message || 'Nem sikerült betölteni a szöveget.')
      })
      .finally(() => {
        if (!cancelled) {
          setTextLoading(false)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [contentUrl, contentType])

  useEffect(() => {
    if (contentType !== 'link') return

    setIframeFailed(false)
    setIframeLoaded(false)
    if (iframeTimeoutRef.current) {
      window.clearTimeout(iframeTimeoutRef.current)
    }

    iframeTimeoutRef.current = window.setTimeout(() => {
      setIframeFailed(true)
    }, 3200)

    return () => {
      if (iframeTimeoutRef.current) {
        window.clearTimeout(iframeTimeoutRef.current)
      }
    }
  }, [contentUrl, contentType])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

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
  }, [contentUrl])

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      void audio.play()
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
    setIframeLoaded(true)
    setIframeFailed(false)
    if (iframeTimeoutRef.current) {
      window.clearTimeout(iframeTimeoutRef.current)
      iframeTimeoutRef.current = null
    }
  }, [])

  const handleIframeError = useCallback(() => {
    setIframeFailed(true)
    if (iframeTimeoutRef.current) {
      window.clearTimeout(iframeTimeoutRef.current)
      iframeTimeoutRef.current = null
    }
  }, [])

  const showIframe = contentType === 'link' && !iframeFailed
  const showIframeFallback = contentType === 'link' && iframeFailed

  const renderContent = useMemo(() => {
    switch (contentType) {
      case 'video':
        return (
          <video
            src={contentUrl}
            controls
            playsInline
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 18,
              objectFit: 'contain',
            }}
          />
        )
      case 'audio':
        return (
          <div
            style={{
              width: '100%',
              maxWidth: 720,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <audio ref={audioRef} src={contentUrl} preload="metadata" />
            <button
              type="button"
              onClick={toggleAudio}
              style={{
                alignSelf: 'flex-start',
                borderRadius: 14,
                border: `1px solid rgba(192,132,252,0.65)`,
                background: 'rgba(192,132,252,0.12)',
                color: '#f4f4f5',
                fontSize: 13,
                fontWeight: 700,
                padding: '10px 18px',
                cursor: 'pointer',
              }}
            >
              {audioPlaying ? 'SZÜNET' : 'LEJÁTSZÁS'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono-tech)', fontSize: 12, color: '#9ca3af' }}>{formatTime(audioCurrent)}</span>
              <input
                type="range"
                min={0}
                max={audioDuration || 1}
                step={0.1}
                value={Math.min(audioCurrent, audioDuration || 0)}
                onChange={(event) => handleSeek(Number(event.target.value))}
                style={{
                  flex: 1,
                  accentColor,
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono-tech)', fontSize: 12, color: '#9ca3af' }}>{formatTime(audioDuration)}</span>
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
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: 18,
            }}
          />
        )
      case 'text':
        if (textLoading) {
          return <span style={{ color: '#9ca3af' }}>Tartalom betöltése…</span>
        }
        if (textError) {
          return <span style={{ color: '#f87171' }}>{textError}</span>
        }
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              padding: '18px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.04)',
              background: 'rgba(15,16,19,0.7)',
              color: '#f4f4f5',
              fontSize: 15,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
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
            {showIframe ? (
              <iframe
                title={spot.title}
                src={contentUrl}
                loading="lazy"
                style={{
                  flex: 1,
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
                  borderRadius: 18,
                  border: '1px solid rgba(249,115,22,0.35)',
                  background: 'rgba(249,115,22,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: 16,
                  gap: 10,
                }}
              >
                <div style={{ color: '#f59e0b', fontWeight: 700 }}>EZ A TARTALOM KÜLSŐ OLDALON NYÍLIK MEG</div>
                <span style={{ color: '#d4d4d8', fontSize: 14 }}>Ha az iframe nem tölthető, használd a külső ablakot.</span>
              </div>
            )}
            {showIframeFallback ? (
              <button
                type="button"
                onClick={() => window.open(contentUrl, '_blank', 'noopener,noreferrer')}
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(249,115,22,0.6)',
                  background: 'rgba(249,115,22,0.18)',
                  color: '#f4f4f5',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                MEGNYITÁS KÜLSŐ ABLAKBAN
              </button>
            ) : null}
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
    showIframe,
    showIframeFallback,
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
        background: 'rgba(4, 4, 7, 0.92)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          width: 'min(1200px, calc(100vw - 48px))',
          height: 'min(92vh, 860px)',
          background: 'rgba(5, 6, 9, 0.98)',
          borderRadius: 32,
          border: `1px solid rgba(192, 132, 252, 0.2)`,
          boxShadow: '0 45px 140px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
          }}
        >
          <button
            type="button"
            aria-label="Bezárás"
            onClick={onClose}
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.02)',
              color: '#f4f4f5',
              fontSize: 26,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.3em', fontWeight: 700, color: '#bef264' }}>DIGITÁLIS SPOT</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: accentColor }}>{typeLabel}</span>
          </div>

          {contentType === 'link' ? (
            <button
              type="button"
              onClick={() => window.open(contentUrl, '_blank', 'noopener,noreferrer')}
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: '#f4f4f5',
                fontSize: 12,
                fontWeight: 700,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              KÜLSŐ MEGNYITÁS
            </button>
          ) : (
            <span style={{ width: 108 }} />
          )}
        </header>

        <div style={{ flex: 1, padding: '22px 26px', display: 'flex', overflow: 'hidden' }}>
          <div
            style={{
              flex: 1,
              borderRadius: 22,
              background: 'rgba(12, 12, 14, 0.85)',
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            {renderContent}
          </div>
        </div>

        <footer
          style={{
            padding: '14px 26px 20px',
            borderTop: '1px solid rgba(255,255,255,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: '0.3em', color: '#9ca3af' }}>DIGITÁLIS NODE</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>{spot.title}</span>
        </footer>
      </div>
    </div>
  )
}