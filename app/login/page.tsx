'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic validation
    if (!email || !password) {
      setError('Email és jelszó megadása kötelező')
      setLoading(false)
      return
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      })

      if (authError) {
        setError('Hibás email vagy jelszó')
        setLoading(false)
        return
      }

      // Success - redirect to profile
      router.push('/profile')
      
    } catch (err: any) {
      setError(err.message || 'Váratlan hiba történt')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block mb-4">
            <span className="text-2xl font-black italic tracking-[-0.04em] text-lime-400 hover:text-lime-300 transition-colors">
              Vállalhatatlan
            </span>
          </Link>
          <h1 className="text-3xl font-black italic tracking-[-0.04em] text-lime-400">
            Bejelentkezés
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Lépj be a fiókodba
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-300 mb-2">
              Email cím
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
              placeholder="email@example.com"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-zinc-300 mb-2">
              Jelszó
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
              placeholder="Jelszó"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-md">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-lime-600 hover:bg-lime-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold transition-colors"
          >
            {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-zinc-400">
            Nincs még fiókod?{' '}
            <Link href="/signup" className="text-lime-400 hover:text-lime-300">
              Regisztráció
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
