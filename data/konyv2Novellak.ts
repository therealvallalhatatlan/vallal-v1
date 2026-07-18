/**
 * Single source of truth for /konyv-2/[novella-slug] pages.
 *
 * Each entry maps a URL slug to a UI type and optional per-page props.
 * The UI type determines which component is rendered — see components/konyv2/registry.ts.
 *
 * To add a new page:
 *   1. Add the slug to novellak.txt (one per line)
 *   2. Add an entry here with the correct uiType
 *   3. Ensure a matching content file exists at content/konyv2/{slug}.txt (optional)
 *   4. Run `pnpm check:registry` to verify consistency
 */

export type Konyv2UiType = 'text-heavy' | 'fullscreen-video' | 'glitch-gallery' | 'terminal-os' | 'darknet-link' | 'pali' | 'balaton' | 'szamuraj'

export interface Konyv2Entry {
  slug: string
  title: string
  uiType: Konyv2UiType
  /**
   * UI-type-specific props forwarded directly to the component.
   * Shape is defined by each component — see components/konyv2/types/*.tsx.
   * Example for fullscreen-video: { videoSrc: '/videos/intro.mp4' }
   */
  props?: Record<string, unknown>
}

export const konyv2Novellak: Konyv2Entry[] = [
  {
    slug: 'private-link-netcafe',
    title: 'Private Link Netcafe',
    uiType: 'terminal-os',
  },
  {
    slug: 'video-oldal',
    title: 'Videó oldal',
    uiType: 'fullscreen-video',
    props: { videoSrc: null }, // replace with actual video path, e.g. '/videos/video-oldal.mp4'
  },
  {
    slug: 'szoveg-oldal',
    title: 'Szöveg oldal',
    uiType: 'text-heavy',
  },
  {
    slug: 'galeria-oldal',
    title: 'Galéria',
    uiType: 'glitch-gallery',
  },

  // ── Book 2 novellas — uiType: 'text-heavy' placeholder; update each when the page is designed ──
  { slug: 'prezentacio-szamurajkarddal', title: 'Prezentáció Szamurájkarddal',         uiType: 'szamuraj' },
  { slug: 'ejszaka-minden-megvaltozik',  title: 'Éjszaka minden megváltozik',           uiType: 'text-heavy' },
  { slug: 'meg-hat-ora',                 title: 'Még hat óra',                          uiType: 'text-heavy' },
  { slug: 'a-golya',                     title: 'A Gólya',                              uiType: 'text-heavy' },
  { slug: 'fel-kene-ebredjek',           title: 'Fel kéne ébredjek lassan',             uiType: 'text-heavy' },
  { slug: 'azazel',                      title: 'Azazel',                               uiType: 'text-heavy' },
  { slug: 'a-pali-aki',                  title: 'A Pali, aki a legdurvább orgiákat rendezi a városban',                       uiType: 'pali' },
  { slug: 'nem-all-fol',                 title: 'Nem áll föl a Kábós fasza',            uiType: 'text-heavy' },
  { slug: 'sokkal-okosabban',            title: 'Sokkal okosabban',                     uiType: 'text-heavy' },
  { slug: 'arnyekforgalom',              title: 'Árnyékforgalom',                       uiType: 'text-heavy' },
  { slug: 'kurvajok-vagyunk',            title: 'Kurvajók vagyunk',                     uiType: 'text-heavy' },
  { slug: 'kreativ-teszteles',           title: 'Kreatív tesztelés',                    uiType: 'text-heavy' },
  { slug: 'tavaszi-muszak',              title: 'Tavaszi műszak',                       uiType: 'text-heavy' },
  { slug: 'hianyzo-csavarok',            title: 'Hiányzó Csavarok',                     uiType: 'text-heavy' },
  { slug: 'a-balatonnal',                title: 'A Balatonnál',                         uiType: 'balaton' },
  { slug: 'korinthus-127',               title: 'Korinthus 1:27',                       uiType: 'text-heavy' },
  { slug: 'utolso-nap-utopiaban',        title: 'Utolsó nap utópiában',                 uiType: 'text-heavy' },
  { slug: 'mintazat',                    title: 'Mintázat',                             uiType: 'text-heavy' },
  { slug: 'nyitva-vagyunk',              title: 'Nyitva vagyunk',                       uiType: 'text-heavy' },
  { slug: 'ejszakai-muszak',             title: 'Éjszakai Műszak',                      uiType: 'text-heavy' },
  { slug: 'a-helyszineles',              title: 'A Helyszínelés',                       uiType: 'text-heavy' },
  { slug: 'kilepo',                      title: 'Kilépő',                               uiType: 'text-heavy' },
  { slug: 'uregi-nyul',                  title: 'Üregi nyúl',                           uiType: 'text-heavy' },
  { slug: 'stoned',                      title: 'Stoned',                               uiType: 'text-heavy' },
  { slug: 'sophie',                      title: 'Sophie',                               uiType: 'text-heavy' },
  { slug: 'rossz-vilagban',              title: 'Rossz világban',                       uiType: 'text-heavy' },
  { slug: 'masodik-fazis',               title: 'Második fázis',                        uiType: 'text-heavy' },
  { slug: 'probaido',                    title: 'Próbaidő',                             uiType: 'text-heavy' },
  { slug: 'identitaszavar',              title: 'Identitászavar',                       uiType: 'text-heavy' },
  { slug: 'kvantumkiserlet',             title: 'Kvantumkísérlet',                      uiType: 'text-heavy' },
  { slug: 'fekete-lyuk',                 title: 'Fekete lyuk',                          uiType: 'text-heavy' },
  { slug: 'ne-gyere-haza',               title: 'Ne gyere haza',                        uiType: 'text-heavy' },
  { slug: 'buntudat-expressz',           title: 'Bűntudat Expressz',                    uiType: 'text-heavy' },
  { slug: 'most-kezd-csak',              title: 'Most kezd csak szétesni minden',       uiType: 'text-heavy' },
  { slug: 'szia-nagyi',                  title: 'Szia Nagyi',                           uiType: 'text-heavy' },
  { slug: 'masodik-fazis-2',             title: 'Második Fázis (2)',                    uiType: 'text-heavy' },
  { slug: 'szarnyashajo',                title: 'Szárnyashajó',                         uiType: 'text-heavy' },
  { slug: 'exodus',                      title: 'Exodus',                               uiType: 'text-heavy' },
  { slug: 'zombihalozat',                title: 'Zombihálózat',                         uiType: 'text-heavy' },
]
