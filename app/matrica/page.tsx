import type { Metadata } from 'next'
import MapViewClient from '@/components/matrica/MapViewClient'

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
      <MapViewClient />
    </main>
  )
}
