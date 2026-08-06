import type { Metadata } from 'next'
import ZarojelVideoClient from './ZarojelVideoClient'

export const metadata: Metadata = {
  title: 'Zárójel',
  description: 'Teljes képernyős, videó-alapú Zárójel élmény.',
}

export default function ZarojelPage() {
  return <ZarojelVideoClient />
}