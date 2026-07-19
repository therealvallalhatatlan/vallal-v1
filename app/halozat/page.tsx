import type { Metadata } from 'next'
import MapViewClient from '@/components/matrica/MapViewClient'
import MatricaNav from '@/components/matrica/MatricaNav'

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
      <MatricaNav />
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapViewClient />
      </div>
    </main>
  )
}