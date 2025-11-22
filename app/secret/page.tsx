// app/secret/page.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'

const PASSWORD = 'cici'           // itt tudod átírni
const COOKIE_NAME = 'vallalhatatlan_pass'
const COOKIE_VALUE_OK = 'ok'
const COOKIE_MAX_AGE_DAYS = 7     // ennyi napig maradjon bent a cookie

export default function SecretPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from = searchParams.get('from') || '/'

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = value.trim()

    if (!trimmed) {
      setError('Adj meg egy jelszót.')
      return
    }

    if (trimmed !== PASSWORD) {
      setError('Hibás jelszó. Tipp: nem Caps Lock a hibás.')
      return
    }

    setLoading(true)

    // Egyszerű frontendes cookie – nem banki szintű védelem, de erre bőven elég
    const maxAgeSec = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
    document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE_OK}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`

    // Visszairányítunk oda, ahonnan jött
    router.push(from)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-zinc-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,.7)] p-6 md:p-8 space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            VÁLLALHATATLAN // ACCESS
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Titkos szoba
          </h1>
          <p className="text-xs md:text-sm text-zinc-400">
            Ezek az aloldalak csak azoknak elérhetők, akik ismerik a jelszót.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-xs font-medium text-zinc-300"
            >
              Jelszó
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-2xl border border-zinc-700 bg-black/70 px-3 py-2.5 text-sm outline-none ring-0 focus:border-lime-500 focus:ring-1 focus:ring-lime-500/60 transition-colors"
              placeholder="Írd be a jelszót…"
            />
            {error && (
              <p className="text-xs text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-lime-600 bg-lime-600 text-black text-sm font-semibold py-2.5 hover:bg-lime-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Beléptetés…' : 'Belépés'}
          </button>
        </form>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          A belépés után a böngésződ egy sütit kap, így egy ideig nem kell újra
          beírnod a jelszót. Ha törlöd a sütiket, újra kérni fogja.
        </p>
      </div>
    </main>
  )
}
