import { ImageResponse } from 'next/og'
import { formatKonyv3Date, getKonyv3Entry } from '@/data/konyv3Bejegyzesek'

export const runtime = 'edge'
export const alt = 'Vállalhatatlan — Könyv III. bejegyzés'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

interface OgImageProps {
  params: Promise<{ id: string }>
}

export default async function Image({ params }: OgImageProps) {
  const { id } = await params
  const entry = getKonyv3Entry(id)
  const title = entry?.title || 'Vállalhatatlan'
  const date = entry ? formatKonyv3Date(entry.date) : 'Könyv III.'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '76px 84px 66px',
          position: 'relative',
          overflow: 'hidden',
          color: '#f4f4f5',
          background: 'radial-gradient(900px 450px at 82% 0%, rgba(163, 230, 53, 0.14), transparent 60%), linear-gradient(145deg, #050507 0%, #0c0c0c 58%, #111318 100%)',
          fontFamily: 'Georgia, Times New Roman, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 4px)',
            opacity: 0.28,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 128, height: 3, background: '#a3e635', marginBottom: 28 }} />
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#bef264',
              marginBottom: 24,
            }}
          >
            Vallalhatatlan / Konyv III.
          </div>
          <div
            style={{
              maxWidth: 980,
              fontSize: title.length > 36 ? 58 : 78,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              fontWeight: 700,
              color: '#f4f4f5',
              textWrap: 'balance',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 20, letterSpacing: '0.08em', color: '#d4d4d8' }}>
              /konyv-3/{id}
            </div>
            <div style={{ fontSize: 18, color: '#a1a1aa' }}>{date}</div>
          </div>
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '13px 16px',
              fontSize: 16,
              letterSpacing: '0.08em',
              color: '#e4e4e7',
            }}
          >
            VALLALHATATLAN.ONLINE
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
