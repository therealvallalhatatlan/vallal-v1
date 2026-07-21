import type { Metadata } from 'next'
import MapViewClient from '@/components/matrica/MapViewClient'
import MatricaNav from '@/components/matrica/MatricaNav'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Halozat',
  description: 'Keresd meg az elrejtett matricakat Budapesten.',
}

export default function HalozatPage() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        background: '#09090b',
      }}
    >
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 4000 }}>
        <Navigation />
      </div>
      <MatricaNav showOnlineUsersBar={false} />
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapViewClient />
      </div>
    </main>
  )
}