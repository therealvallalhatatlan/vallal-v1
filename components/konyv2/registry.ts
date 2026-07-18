import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { Konyv2UiType } from '@/data/konyv2Novellak'
import type { Konyv2PageProps } from './props'

export type { Konyv2PageProps }

/**
 * Maps each UI type to a lazily-loaded component.
 * Each import is a separate Vercel/webpack chunk — no cross-page JS bleed.
 */
export const uiRegistry: Record<Konyv2UiType, ComponentType<Konyv2PageProps>> = {
  'text-heavy':      dynamic(() => import('./types/TextHeavy'))      as ComponentType<Konyv2PageProps>,
  'fullscreen-video': dynamic(() => import('./types/FullscreenVideo')) as ComponentType<Konyv2PageProps>,
  'glitch-gallery':  dynamic(() => import('./types/GlitchGallery'))  as ComponentType<Konyv2PageProps>,
  'terminal-os':     dynamic(() => import('./types/TerminalOs'))     as ComponentType<Konyv2PageProps>,
  'darknet-link':    dynamic(() => import('./types/DarknetLink'))    as ComponentType<Konyv2PageProps>,
  'balaton':         dynamic(() => import('./types/Balaton'))        as ComponentType<Konyv2PageProps>,
  'pali':            dynamic(() => import('./types/Pali'))           as ComponentType<Konyv2PageProps>,
  'szamuraj':        dynamic(() => import('./types/Szamuraj'))       as ComponentType<Konyv2PageProps>,
}
