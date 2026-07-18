import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { konyv2Novellak } from '@/data/konyv2Novellak'
import { uiRegistry } from '@/components/konyv2/registry'
import { BackLink } from '@/components/konyv2/BackLink'
import { SupportersTicker } from '@/components/supporters/SupportersTicker'
import { SUPPORTER_NAMES } from '@/data/supporters'

export const runtime = 'nodejs'

interface PageProps {
  params: Promise<{ 'novella-slug': string }>
}

export function generateStaticParams() {
  return konyv2Novellak.map((e) => ({ 'novella-slug': e.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { 'novella-slug': slug } = await params
  const entry = konyv2Novellak.find((e) => e.slug === slug)
  if (!entry) return {}

  return {
    title: `${entry.title} | Vállalhatatlan`,
    alternates: {
      canonical: `https://vallalhatatlan.online/konyv-2/${slug}`,
    },
    openGraph: {
      title: `${entry.title} | Vállalhatatlan`,
      url: `https://vallalhatatlan.online/konyv-2/${slug}`,
    },
  }
}

async function loadContent(slug: string): Promise<string | null> {
  const filePath = path.join(process.cwd(), 'content', 'konyv2', `${slug}.txt`)
  const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
  if (raw === null) return null
  return matter(raw).content.replace(/\s+$/u, '') || null
}

export default async function Konyv2NovellaPage({ params }: PageProps) {
  const { 'novella-slug': slug } = await params
  const entry = konyv2Novellak.find((e) => e.slug === slug)
  if (!entry) notFound()

  const content = await loadContent(slug)
  const Component = uiRegistry[entry.uiType]

  return (
    <>
      <BackLink />
      <Component
        slug={entry.slug}
        title={entry.title}
        content={content}
        props={entry.props}
      />

      <section className="relative z-20 pb-14 sm:pb-16">
        <div className="relative left-1/2 w-screen -translate-x-1/2 sm:left-auto sm:w-full sm:translate-x-0 sm:mx-auto sm:max-w-[30.5rem]">
          <SupportersTicker names={SUPPORTER_NAMES} label="Tamogatok nevei" className="bg-black/70" />
        </div>
      </section>
    </>
  )
}
