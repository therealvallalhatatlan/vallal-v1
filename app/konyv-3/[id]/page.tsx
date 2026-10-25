import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import Konyv3Experience from '@/components/konyv3/Konyv3Experience'
import { formatKonyv3Date, getKonyv3Entry, konyv3Bejegyzesek } from '@/data/konyv3Bejegyzesek'

export const runtime = 'nodejs'
export const dynamicParams = true

interface PageProps {
  params: Promise<{ id: string }>
}

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://vallalhatatlan.online'
  return raw.replace(/\/$/, '')
}

export function generateStaticParams() {
  return konyv3Bejegyzesek.map((entry) => ({ id: entry.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const entry = getKonyv3Entry(id)
  if (!entry) return {}

  const pageUrl = `${siteOrigin()}/konyv-3/${encodeURIComponent(entry.id)}`
  const ogImageUrl = `${pageUrl}/opengraph-image`
  const description = `${entry.title} · ${formatKonyv3Date(entry.date)} · Vállalhatatlan, harmadik könyv.`

  return {
    title: entry.title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'article',
      title: entry.title,
      description,
      url: pageUrl,
      publishedTime: new Date(`${entry.date}T12:00:00.000Z`).toISOString(),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: entry.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.title,
      description,
      images: [ogImageUrl],
    },
  }
}

async function loadContent(id: string): Promise<string | null> {
  const filePath = path.join(process.cwd(), 'content', 'konyv3', `${id}.txt`)
  const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
  if (raw === null) return null
  return matter(raw).content.replace(/\s+$/u, '') || null
}

export default async function Konyv3EntryPage({ params }: PageProps) {
  const { id } = await params
  const entry = getKonyv3Entry(id)
  if (!entry) notFound()

  const content = await loadContent(entry.id)

  return <Konyv3Experience entry={entry} content={content} />
}
