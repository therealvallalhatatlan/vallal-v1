'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

type Props = {
  showHomeLink?: boolean
}

export function AuthHeader({ showHomeLink = true }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [canDrop, setCanDrop] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // Check if user can drop
        const { data: userProfile } = await supabase
          .from('users')
          .select('can_drop')
          .eq('email', user.email)
          .single()
        
        setCanDrop(!!userProfile?.can_drop)
      }
      
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (!session?.user) {
        setCanDrop(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <header className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="text-lime-400">Betöltés...</div>
      </header>
    )
  }

  return (
    <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-black/80 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        {showHomeLink && (
          <Link 
            href="/"
            className="text-2xl font-black italic tracking-[-0.04em] text-lime-400 hover:text-lime-300 transition-colors"
          >
            Vállalhatatlan
          </Link>
        )}
        
        {user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link 
              href="/profile"
              className="text-zinc-300 hover:text-lime-400 transition-colors"
            >
              Profil
            </Link>
            {canDrop && (
              <Link 
                href="/drop"
                className="text-zinc-300 hover:text-lime-400 transition-colors"
              >
                Drop
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
            >
              Kijelentkezés
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/login"
              className="px-3 py-1 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm transition-colors"
            >
              Bejelentkezés
            </Link>
            <Link
              href="/signup"
              className="px-3 py-1 rounded-md bg-lime-600 hover:bg-lime-500 text-black text-sm font-medium transition-colors"
            >
              Regisztráció
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
