/**
 * Shared props interface for all /konyv-2 UI-type components.
 * Lives in its own file to avoid circular imports between registry.ts and the type components.
 */
export interface Konyv2PageProps {
  slug: string
  title: string
  /** Raw text content from content/konyv2/{slug}.txt, or null if the file doesn't exist. */
  content: string | null
  /** UI-type-specific extra props defined per entry in data/konyv2Novellak.ts. */
  props?: Record<string, unknown>
}
