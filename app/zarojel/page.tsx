import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Zárójel',
  description: 'Belépés a Hálózat kiállításmegnyitóhoz.',
}

export default function ZarojelPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(200,169,126,0.12), transparent 30%), linear-gradient(180deg, #050608 0%, #09090b 55%, #050608 100%)',
        color: '#f4f4f5',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: 'clamp(18px, 4vw, 40px)',
        }}
      >
        <section
          className="zarojel-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            gap: 'clamp(18px, 3vw, 32px)',
            alignItems: 'center',
            minHeight: 'calc(100vh - clamp(36px, 8vw, 80px))',
          }}
        >
          <div
            className="zarojel-media"
            style={{
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(200,169,126,0.22)',
              borderRadius: 24,
              background: 'linear-gradient(180deg, rgba(8,10,12,0.96), rgba(4,6,8,0.96))',
              boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              minHeight: 320,
            }}
          >
            <img
              src="/zarojel.jpg"
              alt="Zárójel"
              style={{
                width: '100%',
                height: '100%',
                minHeight: 320,
                objectFit: 'cover',
                display: 'block',
                filter: 'saturate(0.92) contrast(1.04)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.52) 100%)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: 16,
                bottom: 16,
                right: 16,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', color: '#c8a97e', fontWeight: 700 }}>KIÁLLÍTÁSMEGNYITÓ</div>
                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: '#fff' }}>Belépés a Hálózat világába</div>
              </div>
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(5,7,9,0.72)',
                  color: '#d4d4d8',
                  fontSize: 12,
                }}
              >
                /halozat
              </div>
            </div>
          </div>

          <article
            className="zarojel-copy"
            style={{
              border: '1px solid rgba(200,169,126,0.22)',
              borderRadius: 24,
              background: 'linear-gradient(180deg, rgba(10,12,15,0.96), rgba(5,7,9,0.98))',
              boxShadow: '0 24px 64px rgba(0,0,0,0.48)',
              padding: 'clamp(20px, 4vw, 34px)',
              maxWidth: 560,
              justifySelf: 'center',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.16em', color: '#c8a97e', fontWeight: 700 }}>VÁLLALHATATLAN // ZÁRÓJEL</div>
            <h1 style={{ margin: '10px 0 14px', fontSize: 'clamp(30px, 5vw, 48px)', lineHeight: 1.02, fontWeight: 800 }}>
              Üdv a kiállításmegnyitón
            </h1>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: '#d4d4d8' }}>
              A /halozat egy helyalapú, rejtőzködős tér, ahol a szpotok körül mozogsz, közelebb mész,
              megnyitod a tartalmat, és ha ott vagy a helyszínen, jelölheted is a találatot.
              A belépés után emaillel vagy Google-fiókkal tudsz azonosítani, hogy megkapd a saját nézetedet,
              a közeli pontokat és a teljes játékélményt.
            </p>

            <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
              <div style={{ color: '#f3e9d8', fontSize: 13, lineHeight: 1.6 }}>
                A Hálózatban a felfedezés, a mozgás és a közösségi jelenlét találkozik. Ez az a felület,
                ahol a szpotok életre kelnek, és ahol a kiállítás nem csak nézhető, hanem bejárható is.
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link
                href="/auth?from=/halozat&next=/halozat"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 50,
                  borderRadius: 14,
                  border: '1px solid rgba(200,169,126,0.42)',
                  background: 'rgba(200,169,126,0.16)',
                  color: '#f3e9d8',
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: '0.01em',
                  textDecoration: 'none',
                }}
              >
                Belépés emaillel vagy Google-fiókkal
              </Link>

              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#a1a1aa' }}>
                A belépés után automatikusan a /halozat oldalra érkezel vissza.
              </p>
            </div>
          </article>
        </section>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .zarojel-layout {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
            align-items: stretch !important;
          }

          .zarojel-media {
            min-height: 280px !important;
          }

          .zarojel-copy {
            max-width: none !important;
            justify-self: stretch !important;
          }
        }
      `}</style>
    </main>
  )
}