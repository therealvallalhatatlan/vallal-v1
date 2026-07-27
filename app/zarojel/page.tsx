import type { Metadata } from 'next'
import ZarojelTerminalClient from './ZarojelTerminalClient'

export const metadata: Metadata = {
  title: 'Zárójel',
  description: 'Belépés a Hálózat kiállításmegnyitóhoz.',
}

export default function ZarojelPage() {
  return <ZarojelTerminalClient />
}