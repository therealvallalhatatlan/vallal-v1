import type { Metadata } from 'next'
import MapViewClient from '@/components/matrica/MapViewClient'

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
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#09090b',
      }}
    >
      <MapViewClient />
    </main>
  )
}