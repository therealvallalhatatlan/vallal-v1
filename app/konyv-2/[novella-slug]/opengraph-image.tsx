import { ImageResponse } from 'next/og'
import { konyv2Novellak } from '@/data/konyv2Novellak'

export const runtime = 'edge'
export const alt = 'Vállalhatatlan — Könyv 2 novella'
export const contentType = 'image/png'
export const size = {
  width: 1200,
  height: 630,
}

interface OgImageProps {
  params: Promise<{ 'novella-slug': string }>
}

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://vallalhatatlan.online'
  return raw.replace(/\/$/, '')
}

function cleanTitle(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

export default async function Image({ params }: OgImageProps) {
  const { 'novella-slug': slug } = await params
  const entry = konyv2Novellak.find((item) => item.slug === slug)
  const title = cleanTitle(entry?.title || 'Vállalhatatlan')
  const isBalaton = slug === 'a-balatonnal'
  const origin = siteOrigin()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: isBalaton
            ? 'radial-gradient(1200px 500px at 90% 10%, rgba(233, 129, 63, 0.24), transparent 58%), linear-gradient(145deg, #05070b 0%, #0a0f19 44%, #0f1723 100%)'
            : 'radial-gradient(920px 420px at 82% 10%, rgba(132, 204, 22, 0.14), transparent 62%), linear-gradient(145deg, #050507 0%, #0d1117 58%, #0a0a0a 100%)',
          color: '#f6f7f9',
          fontFamily: 'Georgia, Times New Roman, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)',
            opacity: 0.2,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(95deg, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.5) 38%, rgba(0,0,0,0.26) 76%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 82,
            width: 152,
            height: 2,
            background: isBalaton ? '#dca56f' : '#a3e635',
            opacity: 0.95,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '78px 84px 66px 84px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
                fontSize: 22,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: isBalaton ? '#f2d1a5' : '#bef264',
                opacity: 0.9,
              }}
            >
              Vallalhatatlan / Konyv 2
            </div>

            <div
              style={{
                maxWidth: 820,
                fontSize: isBalaton ? 94 : 82,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                fontWeight: 700,
                color: '#f3f5f7',
                textWrap: 'balance',
                textShadow: isBalaton
                  ? '0 10px 32px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 218, 190, 0.2)'
                  : '0 10px 28px rgba(0, 0, 0, 0.55)',
              }}
            >
              {title}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
                color: '#d4d4d8',
              }}
            >
              <div style={{ fontSize: 21, letterSpacing: '0.08em', opacity: 0.9 }}>
                /konyv-2/{slug}
              </div>
              <div style={{ fontSize: 18, opacity: 0.72 }}>
                Budapest underground chronicles
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(8, 10, 14, 0.5)',
                backdropFilter: 'blur(1px)',
              }}
            >
              <img
                src={`${origin}/og.png`}
                width={54}
                height={54}
                style={{ objectFit: 'cover' }}
                alt=""
              />
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontSize: 16,
                  color: '#f4f4f5',
                }}
              >
                vallalhatatlan.online
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
