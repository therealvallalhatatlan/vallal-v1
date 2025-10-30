'use client'

import { useState } from 'react'

export default function DropPage() {
  const [hasAccess, setHasAccess] = useState(false)
  const [password, setPassword] = useState('')
  const [accessError, setAccessError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  // Main form state
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [message, setMessage] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [gettingGPS, setGettingGPS] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState('')

  const handleUnlock = async () => {
    setAccessError('')
    setUnlocking(true)

    try {
      const res = await fetch('/api/check-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()

      if (data.allowed) {
        setHasAccess(true)
      } else {
        setAccessError('Access denied')
      }
    } catch (err) {
      setAccessError('Error checking password')
    } finally {
      setUnlocking(false)
    }
  }

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported')
      return
    }

    setGettingGPS(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString())
        setLongitude(position.coords.longitude.toString())
        setGettingGPS(false)
      },
      (error) => {
        console.error('GPS error:', error)
        alert('GPS failed: ' + error.message)
        setGettingGPS(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult('')

    try {
      const formData = new FormData()
      formData.append('password', password)
      formData.append('latitude', latitude)
      formData.append('longitude', longitude)
      formData.append('message', message)
      formData.append('recipientEmail', recipientEmail)

      if (files) {
        Array.from(files).forEach((file, index) => {
          formData.append(`image_${index}`, file)
        })
      }

      const res = await fetch('/api/drop', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        setResult('Drop sent.')
        // Clear form
        setLatitude('')
        setLongitude('')
        setMessage('')
        setRecipientEmail('')
        setFiles(null)
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setResult('Error.')
      }
    } catch (err) {
      setResult('Error.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!hasAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="max-w-md w-full space-y-4">
          <h1 className="text-3xl font-black italic tracking-[-0.04em] text-lime-400 text-center">
            Drop Access
          </h1>
          
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              disabled={unlocking}
            />
            
            <button
              onClick={handleUnlock}
              disabled={unlocking || !password}
              className="w-full py-2 px-4 rounded-md bg-lime-600 hover:bg-lime-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold"
            >
              {unlocking ? 'Checking...' : 'Unlock'}
            </button>

            {accessError && (
              <p className="text-red-400 text-sm text-center">{accessError}</p>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-black italic tracking-[-0.04em] text-lime-400 text-center">
          Drop Form
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* GPS */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGetGPS}
              disabled={gettingGPS}
              className="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-semibold"
            >
              {gettingGPS ? 'Getting GPS...' : 'Get GPS'}
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Latitude"
                className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
              />
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Longitude"
                className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Photos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Drop message..."
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
            />
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Recipient Email</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
              required
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-500 text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !recipientEmail}
            className="w-full py-2 px-4 rounded-md bg-lime-600 hover:bg-lime-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold"
          >
            {submitting ? 'Sending...' : 'Send Drop'}
          </button>

          {result && (
            <p className={`text-sm text-center ${result.includes('Error') ? 'text-red-400' : 'text-lime-400'}`}>
              {result}
            </p>
          )}
        </form>
      </div>
    </main>
  )
}
