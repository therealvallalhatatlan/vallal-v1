import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReaderPageClient from "@/app/reader/ReaderPageClient";
import { storiesMeta } from "@/app/reader/storiesMeta";

type ReaderSlugPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ReaderSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = storiesMeta.find((item) => item.slug === slug);

  if (!story) {
    return {};
  }

  return {
    title: `${story.title} | Reader`,
    description: `${story.title} a Vállalhatatlan readerben.`,
  };
}

export default async function ReaderSlugPage({ params }: ReaderSlugPageProps) {
  const { slug } = await params;
  const story = storiesMeta.find((item) => item.slug === slug);

  if (!story) {
    notFound();
  }

  return <ReaderPageClient initialSlug={slug} requestedPath={`/reader/${slug}`} />;
}