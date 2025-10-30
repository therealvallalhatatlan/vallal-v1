'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'
import type { Metadata } from 'next'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Basic validation
    if (!email || !password || !confirmPassword) {
      setError('Minden mező kitöltése kötelező')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('A jelszavak nem egyeznek')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('A jelszó legalább 6 karakter hosszú legyen')
      setLoading(false)
      return
    }

    try {
      // Check if email exists in public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .single()

      if (userError && userError.code !== 'PGRST116') {
        throw userError
      }

      if (!userData) {
        setError('Nem vagy jogosult a regisztrációra')
        setLoading(false)
        return
      }

      // Email exists, proceed with signup
      const { error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      setSuccess('Regisztráció sikeres! Ellenőrizd az email-ed a megerősítő linkért.')
      
    } catch (err: any) {
      setError(err.message || 'Váratlan hiba történt')
    } finally {
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
            Regisztráció
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Csak meghívott felhasználók regisztrálhatnak
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
              placeholder="Legalább 6 karakter"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-zinc-300 mb-2">
              Jelszó megerősítése
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
              placeholder="Jelszó újra"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-md">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-lime-900/20 border border-lime-600/50 rounded-md">
              <p className="text-lime-300 text-sm">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-lime-600 hover:bg-lime-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold transition-colors"
          >
            {loading ? 'Regisztráció...' : 'Regisztráció'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-zinc-400">
            Már van fiókod?{' '}
            <Link href="/login" className="text-lime-400 hover:text-lime-300">
              Bejelentkezés
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
