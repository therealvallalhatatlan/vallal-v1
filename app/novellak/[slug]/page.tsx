import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { storiesMeta } from '@/app/reader/storiesMeta';
import { getAllStories } from '@/lib/content';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NovellaHeader } from './NovellaHeader';
import { NovellaCover } from './NovellaCover';
import { NovellaMeta } from './NovellaMeta';
import { NovellaContent } from './NovellaContent';

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return storiesMeta
    .filter((s) => s.type !== 'cover')
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = storiesMeta.find((s) => s.slug === slug);
  if (!meta) return {};

  return {
    title: meta.title,
    description: `${meta.title} — novella a Vállalhatatlan gyűjteményből.`,
    alternates: {
      canonical: `https://vallalhatatlan.online/novellak/${slug}`,
    },
    openGraph: {
      title: `${meta.title} | Vállalhatatlan`,
      description: `${meta.title} — novella a Vállalhatatlan gyűjteményből.`,
      url: `https://vallalhatatlan.online/novellak/${slug}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(meta.title)}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${meta.title} | Vállalhatatlan`,
      images: [`/api/og?title=${encodeURIComponent(meta.title)}`],
    },
  };
}

export default async function NovellaPage({ params }: PageProps) {
  const { slug } = await params;
  const meta = storiesMeta.find((s) => s.slug === slug);
  if (!meta || meta.type === 'cover') notFound();

  // content/stories/{slug}.txt
  const stories = await getAllStories();
  const story = stories.find((s) => s.id === slug) ?? null;

  // cover image is optional — only shown if public/covers/{slug}.jpg exists
  const coverPath = path.join(process.cwd(), 'public', 'covers', `${slug}.jpg`);
  const hasCover = await fs.access(coverPath).then(() => true).catch(() => false);
  const coverSrc = hasCover ? `/covers/${slug}.jpg` : null;

  return (
    <div className="min-h-screen" style={{ background: '#0c0c0c' }}>
      <NovellaHeader
        backHref="/novellak"
        readingTime={meta.readingTime}
        title={meta.title}
      />

      <article className="pb-24">
        <NovellaCover src={coverSrc} alt={meta.title} />

        <div className="mx-auto max-w-[680px] px-5">
          <NovellaMeta
            title={meta.title}
            order={meta.order}
            readingTime={meta.readingTime}
          />
          <NovellaContent text={story?.text ?? null} />
        </div>
      </article>
    </div>
  );
}
