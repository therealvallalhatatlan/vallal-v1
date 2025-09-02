import { headers } from 'next/headers'
import crypto from 'crypto'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { getAllStories, Story } from '../../lib/content'

export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams?: { source?: string }
}) {
  // read headers
  const hdrs = await headers()
  const userAgent = hdrs.get('user-agent') ?? null
  const xff = hdrs.get('x-forwarded-for') ?? null
  const xRealIp = hdrs.get('x-real-ip') ?? null
  const ip = (xff ? xff.split(',')[0].trim() : xRealIp) ?? ''

  // pick random story
  const stories: Story[] = await getAllStories().catch(() => [])
  const story = stories.length > 0 ? stories[Math.floor(Math.random() * stories.length)] : null

  // attempt DB insert (fail-safe)
  try {
    if (story) {
      const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null
      await supabaseAdmin()
        .from('story_reads')
        .insert({
          story_id: story.id,
          source: searchParams?.source ?? null,
          user_agent: userAgent,
          ip_hash: ipHash,
        })
    }
  } catch (err) {
    // swallow errors to preserve render
  }

  const sourceParam = searchParams?.source ?? '-'
  const totalStories = stories.length

  // render
  return (
    <main
      // black background, neon green mono font; include Tailwind classes if available as fallback
      className="min-h-screen p-8 flex items-start justify-center bg-black text-neon-green font-mono"
      style={{
        backgroundColor: '#000',
        color: '#39FF14',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Segoe UI Mono", "Noto Mono", monospace',
      }}
    >
      <article style={{ maxWidth: '68ch' }}>
        <div
          style={{
            fontSize: '0.8rem',
            opacity: 0.9,
            marginBottom: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#39FF14',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Segoe UI Mono", "Noto Mono", monospace',
          }}
        >
          {`LEVEL ONE • STORIES:${stories.length} • SOURCE:${sourceParam}`}
        </div>

        {stories.length === 0 ? (
          // Graceful message when no stories are present
          <div style={{ color: '#6e9e65' }}>System offline. No stories found.</div>
        ) : story ? (
          <>
            <h1
              style={{
                marginTop: 0,
                marginBottom: '0.5rem',
                color: '#39FF14',
                fontSize: '2.2rem', // nagyobb title
              }}
            >
              {story.title}
            </h1>
            <div
              className="whitespace-pre-wrap"
              style={{
                whiteSpace: 'pre-wrap',
                color: '#89c37e', // új szín a szövegnek
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Segoe UI Mono", "Noto Mono", monospace',
              }}
            >
              {story.text}
            </div>
          </>
        ) : (
          // Fallback: should not normally be reached because stories.length===0 handled above,
          // but keep a safe fallback message.
          <div style={{ color: '#39FF14' }}>System offline. No stories found.</div>
        )}
      </article>
    </main>
  )
}
