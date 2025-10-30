'use client'

import { useState, useEffect } from 'react'
import { AuthHeader } from '@/components/AuthHeader'
import { supabase } from '@/lib/supabase-client'

export default function DropPage() {
  const [user, setUser] = useState<any>(null)
  const [canDrop, setCanDrop] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        window.location.href = '/login'
        return
      }

      setUser(user)

      // Check if user can drop
      const { data: userProfile } = await supabase
        .from('users')
        .select('can_drop')
        .eq('email', user.email)
        .single()

      setCanDrop(!!userProfile?.can_drop)
      setLoading(false)
    }

    checkAuth()
  }, [])

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolokáció nem támogatott a böngésződben')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setError('')
      },
      (error) => {
        setError('Nem sikerült megszerezni a pozíciót: ' + error.message)
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !canDrop) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // Basic validation
      if (!message.trim()) {
        setError('Üzenet megadása kötelező')
        return
      }

      let imageUrl = null
      
      // Upload image if provided
      if (image) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('drops')
          .upload(fileName, image)

        if (uploadError) {
          throw uploadError
        }

        imageUrl = uploadData.path
      }

      // Submit drop data
      const { error: insertError } = await supabase
        .from('drops')
        .insert({
          user_email: user.email,
          message: message.trim(),
          latitude: location?.lat || null,
          longitude: location?.lng || null,
          image_url: imageUrl,
          status: 'pending'
        })

      if (insertError) {
        throw insertError
      }

      setSuccess('Drop sikeresen beküldve! Köszönjük.')
      setMessage('')
      setLocation(null)
      setImage(null)
      
    } catch (err: any) {
      setError(err.message || 'Hiba történt a beküldés során')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-lime-400">Betöltés...</div>
      </main>
    )
  }

  if (!canDrop) {
    return (
      <div className="min-h-screen bg-black">
        <AuthHeader />
        <main className="flex items-center justify-center px-4 py-8">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl text-lime-400">Nincs jogosultság</h1>
            <p className="text-zinc-400">
              Jelenleg nem vagy jogosult drop beküldésére.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <AuthHeader />
      <main className="px-4 py-8">
        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="message" className="block text-sm text-zinc-300 mb-2">
                Üzenet *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
                placeholder="Írj pár szót a dropról..."
                rows={4}
                disabled={submitting}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">
                GPS pozíció
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={getLocation}
                  className="w-full px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                  disabled={submitting}
                >
                  📍 Jelenlegi pozíció meghatározása
                </button>
                {location && (
                  <p className="text-xs text-lime-400">
                    Pozíció: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="image" className="block text-sm text-zinc-300 mb-2">
                Kép (opcionális)
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
                disabled={submitting}
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
              disabled={submitting || !message.trim()}
              className="w-full py-2 px-4 rounded-md bg-lime-600 hover:bg-lime-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold transition-colors"
            >
              {submitting ? 'Küldés...' : 'Drop beküldése'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
