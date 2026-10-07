import { Suspense } from 'react'
import type { Metadata } from 'next'
import MatricaNav from '@/components/matrica/MatricaNav'
import MapViewClient from '@/components/matrica/MapViewClient'
import DistributionDropView from '@/components/matrica/DistributionDropView'

export const metadata: Metadata = {
  title: 'Halozat',
  description: 'A Vállalhatatlan hálózata.',
}

export default async function HalozatPage({
  searchParams,
}: {
  searchParams: Promise<{ distribution_drop?: string | string[] }>
}) {
  const params = await searchParams
  const dropId = Array.isArray(params.distribution_drop)
    ? params.distribution_drop[0]
    : params.distribution_drop

  if (dropId) {
    return <DistributionDropView dropId={dropId} />
  }

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
