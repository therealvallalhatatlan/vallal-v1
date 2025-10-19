// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { listSlugs } from '@/lib/playlistIndex';
import { readdir } from 'fs/promises';
import { join } from 'path';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://vallalhatatlan.online';

  // (A) Build-time listing from public/playlists (Node.js runtime). Falls back to (B) below.
  async function getSlugsFromPublic(): Promise<string[]> {
    try {
      const dir = join(process.cwd(), 'public', 'playlists');
      const files = await readdir(dir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace(/\.json$/i, ''));
    } catch {
      return [];
    }
  }

  const fsSlugs = await getSlugsFromPublic();
  // (B) Runtime fallback: use existing helper (e.g. Supabase/index), if fs listing is empty.
  const fallbackSlugs = fsSlugs.length ? fsSlugs : (await listSlugs().catch(() => [] as string[]));

  const musicPages = Array.from({ length: Math.max(1, fallbackSlugs.length) }, (_, i) => `${base}/music/${i + 1}`);

  // Static URLs (include /music index explicitly)
  const staticUrls: MetadataRoute.Sitemap = [
    '', '/music', '/konyv', '/novellak', '/projektek', '/rolunk'
  ].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : (p === '/music' ? 0.8 : 0.7),
  }));

  // Dynamic URLs from slugs and paginated music pages
  const dynamicUrls: MetadataRoute.Sitemap = [
    ...musicPages.map((u) => ({
      url: u,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...fallbackSlugs.map((s) => ({
      url: `${base}/${encodeURIComponent(s)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];

  return [
    ...staticUrls,
    ...dynamicUrls,
  ];
}