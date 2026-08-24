'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  src: string
  className?: string
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'playing' | 'paused' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const reset = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setCurrentTime(0)
    setDuration(0)
    setErrorMessage(null)
    setStatus('loading')
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    reset()
    audio.src = src
    audio.preload = 'metadata'
    audio.load()

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
      setStatus('ready')
    }
    const onCanPlay = () => setStatus(audio.paused ? 'ready' : 'playing')
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0)
    const onPlay = () => setStatus('playing')
    const onPause = () => setStatus('paused')
    const onEnded = () => {
      setCurrentTime(audio.duration || 0)
      setStatus('paused')
    }
    const onError = () => {
      const code = audio.error?.code
      const message =
        code === MediaError.MEDIA_ERR_ABORTED
          ? 'A lejátszás megszakadt.'
          : code === MediaError.MEDIA_ERR_NETWORK
            ? 'Hálózati hiba. A hangfájl nem tölthető be.'
            : code === MediaError.MEDIA_ERR_DECODE
              ? 'A hangfájl nem dekódolható ebben a böngészőben.'
              : code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
                ? 'A hangformátum vagy a forrás nem támogatott.'
                : 'A hangfájl nem játszható le.'
      setErrorMessage(message)
      setStatus('error')
    }
    const onStalled = () => setErrorMessage('A letöltés megakadt. Próbáld újra.')

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    audio.addEventListener('stalled', onStalled)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('stalled', onStalled)
    }
  }, [src, reset])

  const toggle = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.paused) {
      audio.pause()
      return
    }

    setErrorMessage(null)
    try {
      await audio.play()
    } catch (error) {
      console.error('[AudioPlayer] play() failed:', error)
      setErrorMessage(error instanceof Error ? error.message : 'A lejátszás nem indítható el.')
      setStatus('error')
    }
  }, [])

  const retry = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setErrorMessage(null)
    setStatus('loading')
    audio.load()
    void audio.play().catch((error) => {
      console.error('[AudioPlayer] retry failed:', error)
      setErrorMessage(error instanceof Error ? error.message : 'A lejátszás nem indítható el.')
      setStatus('error')
    })
  }, [])

  const seek = useCallback((value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
  }, [])

  const isPlaying = status === 'playing'
  const isLoading = status === 'loading'
  const progressMax = duration > 0 ? duration : 1

  return (
    <div
      className={className}
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
        boxSizing: 'border-box',
      }}
    >
      <audio ref={audioRef} preload="metadata" />

      <button
        type="button"
        onClick={() => void toggle()}
        disabled={isLoading}
        aria-label={isPlaying ? 'Szünet' : 'Lejátszás'}
        style={{
          width: 108,
          height: 108,
          borderRadius: '50%',
          border: '1px solid rgba(217,249,157,0.28)',
          background: 'rgba(163,230,53,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d9f99d',
          fontSize: 34,
          boxShadow: '0 0 48px rgba(163,230,53,0.12)',
          cursor: isLoading ? 'wait' : 'pointer',
          opacity: isLoading ? 0.55 : 1,
        }}
      >
        {isLoading ? '…' : isPlaying ? 'Ⅱ' : '▶'}
      </button>

      <button
        type="button"
        onClick={() => void toggle()}
        disabled={isLoading}
        style={{
          minWidth: 180,
          borderRadius: 16,
          border: '1px solid rgba(217,249,157,0.46)',
          background: 'rgba(163,230,53,0.06)',
          color: '#f4f4f5',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.16em',
          padding: '13px 22px',
          cursor: isLoading ? 'wait' : 'pointer',
        }}
      >
        {isLoading ? 'BETÖLTÉS' : isPlaying ? 'SZÜNET' : 'LEJÁTSZÁS'}
      </button>

      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono-tech)', fontSize: 12, color: '#9ca3af', minWidth: 40 }}>
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={progressMax}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          disabled={!duration}
          aria-label="Lejátszási pozíció"
          style={{ flex: 1, accentColor: '#d9f99d', cursor: duration ? 'pointer' : 'default' }}
        />
        <span style={{ fontFamily: 'var(--font-mono-tech)', fontSize: 12, color: '#9ca3af', minWidth: 40, textAlign: 'right' }}>
          {formatTime(duration)}
        </span>
      </div>

      {errorMessage ? (
        <div
          style={{
            width: '100%',
            border: '1px solid rgba(248,113,113,0.32)',
            background: 'rgba(127,29,29,0.12)',
            padding: '12px 14px',
            boxSizing: 'border-box',
            color: '#fca5a5',
            fontFamily: 'var(--font-mono-tech)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 800, letterSpacing: '0.12em', marginBottom: 4 }}>HANGLEJÁTSZÁSI HIBA</div>
          <div>{errorMessage}</div>
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: 10,
              border: '1px solid rgba(252,165,165,0.35)',
              background: 'transparent',
              color: '#fca5a5',
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ÚJRAPRÓBÁLÁS
          </button>
        </div>
      ) : null}
    </div>
  )
}
