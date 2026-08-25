import { Suspense } from 'react'
import type { Metadata } from 'next'
import MatricaNav from '@/components/matrica/MatricaNav'
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
      <Suspense fallback={null}>
        <MatricaNav />
      </Suspense>
      <MapViewClient />
    </main>
  )
}