// app/music/layout.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

export const runtime = 'nodejs'

export default async function MusicLayout({ children }: { children: ReactNode }) {
  // Next 15: cookies() is async
  const jar = await cookies()
  const ok = jar.get('music_ok')?.value === '1'
  const errMsg = jar.get('music_err')?.value || ''
  const okMsg = jar.get('music_ok_msg')?.value || ''

  // Server Action: ellenőrzi a választ, süti + üzenet beállítás
  async function verify(formData: FormData) {
    'use server'
    const ans = String(formData.get('answer') || '').trim().toLowerCase()

    if (ans === 'cici') {
      const okChoices = [
        'wow. képben vagy látom! jó szórakozást bro!',
        'cici. jó, mi? CICI hahaha',
        'zseni vagy és MŰVELT !!',
        'ez az! ilyen olvasó kell ide is. r/vallalhatatlan/',
        'tűpontos! indulhat a zene. r/vallalhatatlan/',
      ]
      const pick = okChoices[Math.floor(Math.random() * okChoices.length)]

      const c = await cookies()
      // belépési jogosultság 30 napra
      c.set('music_ok', '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/music',
        maxAge: 60 * 60 * 24 * 30,
      })
      // rövid életű siker-üzenet (kliens oldalon olvasható)
      c.set('music_ok_msg', pick, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/music',
        maxAge: 15, // elég 15s; a UI 1.5s loader + 4s üzenet alatt felhasználja
      })
      // esetleges korábbi hiba törlése
      c.set('music_err', '', { path: '/music', maxAge: 0 })

      // NEM azonnal /music/1 → előbb a /music layout jelenjen meg a loaderrel
      redirect('/music')
    }

    // rossz válasz → véletlen hibaüzenet
    const wrongChoices = [
      'á dehogy. egy négy betűből álló szót kell kitalálnod amiből két-két betű ugyanazz... baszki. r/vallalhatatlan/',
      '?? nem olvastad ezek szerint. keress rá kérlek, így most nem vagy képben. r/vallalhatatlan/',
      'nem ez, próbáld újra. egy pultosról van szó. r/vallalhatatlan/',
      'majdnem! de nem talált. tipp: 2 betű ismétlődik. r/vallalhatatlan/',
      'nope. lapozz vissza a novellához... r/vallalhatatlan/',
    ]
    const pickWrong = wrongChoices[Math.floor(Math.random() * wrongChoices.length)]

    const c = await cookies()
    c.set('music_err', pickWrong, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/music',
    })

    redirect('/music') // maradunk a beléptetőn
  }

  // 1) Nincs jogosultság → kérdés + hiba, ha volt
  if (!ok) {
    return (
      <main className="max-w-md mx-auto p-6 text-zinc-100">
        <h1 className="text-2xl font-semibold mb-4">Belépés</h1>
        <p className="text-sm text-zinc-400 mb-4">
          Kérdés: <em>hogy hívták Agresszív Laci pultosát?</em>
        </p>

        <form action={verify} className="space-y-2">
          <input
            name="answer"
            type="text"
            placeholder="válasz…"
            className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500"
            autoFocus
          />
          {errMsg ? (
            <p className="text-xs text-red-400 mt-1">{errMsg}</p>
          ) : (
            <p className="text-xs text-zinc-500 mt-1">Kis- vagy nagybetű mindegy.</p>
          )}
          <button
            type="submit"
            className="mt-2 px-4 py-2 rounded-md bg-lime-600 hover:bg-lime-500 text-black font-semibold"
          >
            Belépek
          </button>
        </form>
      </main>
    )
  }

  // 2) Már jogosult, és VAN friss success üzenet → előbb loader, aztán üzenet, majd redirect /music/1
  if (okMsg) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-zinc-100">
        {/* Loader (először ez látszik ~1.5s-ig) */}
        <div id="loader" className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-zinc-700 border-t-lime-400 animate-spin" />
          <p className="text-sm text-zinc-400">beléptetés…</p>
        </div>

        {/* Üzenet (csak a loader után jelenik meg ~4s-ig) */}
        <div
          id="okmsg"
          className="hidden max-w-md text-center rounded-xl border border-lime-400/40 bg-zinc-900/90 px-4 py-3 text-lime-200 shadow-lg backdrop-blur-sm"
        >
          {okMsg}
        </div>

        {/* Időzítés: 1.5s loader → 4s üzenet → átirányítás /music/1 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var loader = document.getElementById('loader');
                var ok = document.getElementById('okmsg');
                // 1) 1.5s loader
                setTimeout(function(){
                  if (loader) loader.style.display = 'none';
                  if (ok) ok.style.display = 'block';
                  // 2) 4s üzenet, aztán redirect
                  setTimeout(function(){
                    window.location.href = '/music/1';
                  }, 4000);
                }, 1500);
              })();
            `,
          }}
        />
      </main>
    )
  }

  // 3) Jogosult és nincs friss üzenet → sima tartalom
  return <>{children}</>
}
