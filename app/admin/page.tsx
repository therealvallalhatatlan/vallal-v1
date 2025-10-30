"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
// Simple mock data since external dependencies are missing
const COUNTERS_MOCK = {
  totalGoal: 100,
  totalPreorders: 42,
}

async function validateAdminKey(key: string): Promise<boolean> {
  // Simple validation - replace with real logic
  return key === "telikabat"
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [counters, setCounters] = useState(COUNTERS_MOCK)
  const [tempCounters, setTempCounters] = useState(COUNTERS_MOCK)

  // Load saved counters from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("demo-admin-counters")
    if (saved) {
      const parsedCounters = JSON.parse(saved)
      setCounters(parsedCounters)
      setTempCounters(parsedCounters)
    }
  }, [])

  const handleLogin = async () => {
    setIsValidating(true)
    try {
      const isValid = await validateAdminKey(adminKey)
      if (isValid) {
        setIsAuthenticated(true)
      } else {
        alert("Incorrect admin key")
      }
    } catch (error) {
      console.error("Admin validation error:", error)
      alert("Authentication failed")
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = () => {
    setCounters(tempCounters)
    localStorage.setItem("demo-admin-counters", JSON.stringify(tempCounters))
    alert("Counters saved successfully!")
  }

  const progressPercent = Math.round((counters.totalPreorders / counters.totalGoal) * 100)

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-green-400 mb-2">Admin Access</h1>
              <p className="text-green-300/60">Enter admin key to continue</p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                placeholder="Admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isValidating && handleLogin()}
                disabled={isValidating}
                className="w-full px-3 py-2 rounded-md bg-gray-800/50 border border-gray-600 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Button
                onClick={handleLogin}
                disabled={isValidating}
                className="w-full bg-green-400 text-black hover:bg-green-300 disabled:opacity-50"
              >
                {isValidating ? "Validating..." : "Access Admin Panel"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="space-y-8">
        {/* Demo warning banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2">
            <span className="px-2 py-1 border border-yellow-500/50 text-yellow-400 rounded text-xs">
              DEMO
            </span>
            <p className="text-yellow-400 font-medium">Demo admin – changes not persistent across sessions</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-green-400">Admin Panel</h1>
            <Button
              onClick={() => setIsAuthenticated(false)}
              variant="outline"
              className="border-gray-600 text-green-300 hover:bg-gray-800"
            >
              Logout
            </Button>
          </div>

          {/* Counter Management */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-green-300">Campaign Counters</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-300">Total Goal</label>
                <input
                  type="number"
                  value={tempCounters.totalGoal}
                  onChange={(e) =>
                    setTempCounters((prev) => ({
                      ...prev,
                      totalGoal: Number.parseInt(e.target.value) || 0,
                    }))
                  }
                  className="bg-gray-800/50 border-gray-600 text-green-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-green-300">Total Preorders</label>
                <input
                  type="number"
                  value={tempCounters.totalPreorders}
                  onChange={(e) =>
                    setTempCounters((prev) => ({
                      ...prev,
                      totalPreorders: Number.parseInt(e.target.value) || 0,
                    }))
                  }
                  className="bg-gray-800/50 border-gray-600 text-green-400"
                />
              </div>
            </div>

            <Button onClick={handleSave} className="bg-green-400 text-black hover:bg-green-300">
              Save Changes
            </Button>
          </div>
        </div>

        {/* Preview Card */}
        <div>
          <h2 className="text-xl font-semibold text-green-300 mb-4">Live Preview</h2>
          <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-green-400 mb-4">Community Support</h3>

            <div className="mb-4">
              <div className="h-2.5 bg-green-600 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">{counters.totalPreorders}</div>
                <div className="text-green-300/60 text-sm">Preorders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{counters.totalGoal}</div>
                <div className="text-green-300/60 text-sm">Goal</div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <span className="text-lg font-semibold text-green-400">{progressPercent}% funded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
