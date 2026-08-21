"use client"
import { usePathname } from 'next/navigation'
import Navigation from './Navigation'

export default function LayoutNavigationGuard() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <Navigation hideHeader />
}