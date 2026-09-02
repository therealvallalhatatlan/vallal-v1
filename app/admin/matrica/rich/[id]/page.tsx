'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionGuard } from '@/hooks/useSessionGuard'
import RichContentEditor from '@/components/matrica/RichContentEditor'
import { DEFAULT_RICH_CONTENT, type RichContentDocument } from '@/lib/matrica'
import type { StickerSpot, VirtualSpotContentType } from '@/lib/matrica'

const STATUS = {
  IDLE: 'IDLE',
  DIRTY: 'DIRTY',
  SAVING: 'SAVING',
  SAVED: 'SAVED',
  ERROR: 'ERROR',
} as const

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#09090b',
  color: '#f4f4f5',
  padding: 'calc(var(--matrica-header-offset, 90px) + 16px) 20px 32px',
  fontFamily: 'inherit',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginBottom: 24,
}

const statusStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  color: '#a3a3a3',
}

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  ...{
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid rgba(200,169,126,0.45)',
    background: disabled ? 'rgba(255,255,255,0.04)' : '#c8a97e',
    color: disabled ? '#6b7280' : '#101418',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.2em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textTransform: 'uppercase' as const,
  },
  ...{ width: 'fit-content' },
})

export default function RichContentPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { session, loading } = useSessionGuard()
  const accessToken = session?.access_token ?? ''
  const [spot, setSpot] = useState<StickerSpot | null>(null)
  const [loadingSpot, setLoadingSpot] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<typeof STATUS[keyof typeof STATUS]>(STATUS.IDLE)
  const editorRef = useRef<{ getDocument: () => RichContentDocument | null; markSaved: () => void } | null>(null)

  const canEdit = Boolean(spot && session?.user?.id && (spot.creator_id === session.user.id))

  useEffect(() => {
    if (!accessToken || loading) return
    setLoadingSpot(true)
    fetch('/api/admin/matrica/spots', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((payload) => {
        const target = payload?.spots?.find((item: StickerSpot) => item.id === id)
        if (!target) {
          setError('Nem található ez a spot.')
          return
        }
        if (target.type !== 'virtual' || target.content_type !== 'rich') {
          setError('Ez a spot nem Rich Content típusú.')
          return
        }
        setSpot(target)
        setStatus(STATUS.SAVED)
      })
      .catch((err) => {
        console.error('[rich-content page] fetch error', err)
        setError('Nem sikerült betölteni a spotot.')
      })
      .finally(() => setLoadingSpot(false))
  }, [accessToken, id, loading])

  const initialDocument = useMemo<RichContentDocument>(() => {
    if (spot?.rich_content && typeof spot.rich_content === 'object') {
      return spot.rich_content as RichContentDocument
    }
    return DEFAULT_RICH_CONTENT
  }, [spot])

  const handleDirtyChange = (dirty: boolean) => {
    setStatus(dirty ? STATUS.DIRTY : STATUS.SAVED)
  }

  const handleSave = async () => {
    if (!editorRef.current || status === STATUS.SAVING) return
    const document = editorRef.current.getDocument()
    if (!document) {
      setError('Az editor nem érhető el.')
      setStatus(STATUS.ERROR)
      return
    }
    setStatus(STATUS.SAVING)
    try {
      const res = await fetch('/api/admin/matrica/rich-content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ spotId: id, document }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        const message = payload?.error || 'Mentés sikertelen.'
        setError(message)
        setStatus(STATUS.ERROR)
        return
      }
      setError(null)
      setStatus(STATUS.SAVED)
      editorRef.current.markSaved()
    } catch (err) {
      console.error('[rich-content save] error', err)
      setError('Mentés sikertelen.')
      setStatus(STATUS.ERROR)
    }
  }

  const statusLabel = () => {
    if (status === STATUS.SAVING) return 'MENTÉS...'
    if (status === STATUS.SAVED) return 'MENTVE'
    if (status === STATUS.DIRTY) return 'NEM MENTETT MÓDOSÍTÁS'
    if (status === STATUS.ERROR) return 'HIBA'
    return 'NINCS MÓDOSÍTÁS'
  }

  if (!session && !loading) {
    router.replace('/auth?from=/admin/matrica/rich/' + id)
    return null
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button
          type="button"
          onClick={() => router.push('/admin/matrica')}
          style={{
            background: 'none',
            border: 'none',
            color: '#f3f4f6',
            letterSpacing: '0.3em',
            fontSize: 12,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          ← VISSZA
        </button>
        <h2 style={{ margin: '0', fontSize: 20, fontWeight: 700 }}>RICH CONTENT</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#a3a3a3' }}>{spot?.title ?? 'Betöltés...'}</p>
        <span style={statusStyle}>● {statusLabel()}</span>
      </div>
      {error ? (
        <p style={{ color: '#fecaca', margin: '0 0 24px', padding: '12px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.35)' }}>
          {error}
        </p>
      ) : null}
      {loadingSpot || !spot ? (
        <p>Betöltés…</p>
      ) : (
        <>
          <RichContentEditor
            ref={editorRef}
            spotId={id}
            accessToken={accessToken}
            initialDocument={initialDocument}
            onDirtyChange={handleDirtyChange}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.18em', color: '#a3a3a3' }}>● {statusLabel()}</span>
            <button type="button" style={buttonStyle(status !== STATUS.DIRTY)} onClick={handleSave} disabled={status !== STATUS.DIRTY}>
              {status === STATUS.SAVING ? 'MENTÉS...' : 'MENTÉS'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}