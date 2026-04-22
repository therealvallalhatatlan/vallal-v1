'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionGuard } from '@/hooks/useSessionGuard'

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#09090b',
        color: '#71717a',
        fontSize: 14,
      }}
    >
      Térkép betöltése…
    </div>
  ),
})

export default function MapViewClient() {
  const router = useRouter()
  const { session, loading } = useSessionGuard()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/auth?from=/matrica')
    }
  }, [loading, session, router])

  if (loading || !session) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#09090b',
          color: '#71717a',
          fontSize: 14,
        }}
      >
        {loading ? 'Betöltés…' : null}
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapView />
    </div>
  )
}
