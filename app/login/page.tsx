"use client"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("sending")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus("sent")
      } else if (res.status === 429) {
        setStatus("error")
        setErrorMsg("Too many requests. Please try again later.")
      } else {
        const j = await res.json().catch(() => null)
        setStatus("error")
        setErrorMsg(j?.error || "Failed to send magic link.")
      }
    } catch (err) {
      setStatus("error")
      setErrorMsg("Network error. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Sign in</h1>
        {status === "sent" ? (
          <div className="p-4 bg-green-900/10 border border-green-700/20 rounded">
            Check your email for the sign-in link.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full p-2 rounded bg-black border border-green-700"
                placeholder="you@example.com"
              />
            </label>
            {errorMsg && <div className="text-sm text-red-400">{errorMsg}</div>}
            <button
              type="submit"
              className="w-full py-3 bg-green-400 text-black font-semibold rounded"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
