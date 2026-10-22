import Link from 'next/link'
import type { Konyv3Link } from '@/data/konyv3Bejegyzesek'

const BOOK_ORDER_HREF = '/konyv-2'
const CONTACT_HREF = '/kapcsolat'

function FooterLink({ label, href, external = false }: Konyv3Link) {
  const className =
    'inline-flex min-h-11 items-center border-b border-white/15 py-2 text-sm text-white/65 transition-colors hover:border-lime-200/60 hover:text-lime-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/70'

  if (external || href.startsWith('https://') || href.startsWith('http://')) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noreferrer noopener"
      >
        {label}<span aria-hidden="true" className="ml-2 text-white/30">↗</span>
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {label}<span aria-hidden="true" className="ml-2 text-white/30">↗</span>
    </Link>
  )
}

export function ReadingFooter({ links = [] }: { links?: Konyv3Link[] }) {
  return (
    <footer
      aria-label="Kapcsolódó oldalak"
      className="mt-14 border-t border-white/10 pt-6 sm:mt-16 sm:pt-7"
    >
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
        További kapcsolódások
      </p>

      <nav className="flex flex-col items-start gap-1">
        <FooterLink label="Könyv megrendelése" href={BOOK_ORDER_HREF} />
        <FooterLink label="Kapcsolat Vállalhatatlannal" href={CONTACT_HREF} />
        {links.map((link, index) => (
          <FooterLink key={`${link.href}-${index}`} {...link} />
        ))}
      </nav>

      <p className="mt-8 font-mono text-[10px] tracking-wide text-white/25">
        VÁLLALHATATLAN · KÖNYV III.
      </p>
    </footer>
  )
}
