// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = 'https://vallalhatatlan.online';
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      // Explicit AI-bot allow policy
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}