import type { Metadata } from 'next'
import MapViewClient from '@/components/matrica/MapViewClient'
import MatricaNav from '@/components/matrica/MatricaNav'

export const metadata: Metadata = {
  title: 'Matrica vadászat',
  description: 'Keresd meg az elrejtett matricákat Budapesten.',
}

export default function MatricaPage() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        background: '#09090b',
      }}
    >
      <MatricaNav />
      {/* Push map content below nav */}
      <div style={{ position: 'absolute', inset: '52px 0 0 0' }}>
        <MapViewClient />
      </div>
    </main>
  )
}
