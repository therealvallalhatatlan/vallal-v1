'use client'

import dynamic from 'next/dynamic'

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
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapView />
    </div>
  )
}
