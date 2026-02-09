"use client"

import { useState, useEffect } from "react"
import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/Badge"
import { Progress } from "@/components/Progress"
import { validateAdminKey, toggleSystemMode, getSystemControlHistory } from "@/lib/actions"
import { COUNTERS_MOCK } from "@/lib/mocks"

type SystemMode = 'SAFE' | 'READ_ONLY';

type HistoryEntry = {
  mode: string;
  changed_at: string;
  changed_by: string;
  previous_mode: string | null;
};

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [counters, setCounters] = useState(COUNTERS_MOCK)
  const [tempCounters, setTempCounters] = useState(COUNTERS_MOCK)
  
  // Kill switch state
  const [systemMode, setSystemMode] = useState<SystemMode>('SAFE');
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load saved counters from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("demo-admin-counters")
    if (saved) {
      const parsedCounters = JSON.parse(saved)
      setCounters(parsedCounters)
      setTempCounters(parsedCounters)
    }
  }, [])
  
  // Fetch system mode and history when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSystemStatus();
      fetchHistory();
    }
  }, [isAuthenticated]);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const data = await response.json();
        setSystemMode(data.mode);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const result = await getSystemControlHistory();
      if (result.success && result.history) {
        setHistory(result.history);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleToggleMode = async () => {
    setShowConfirmDialog(false);
    setIsTogglingMode(true);
    
    try {
      const result = await toggleSystemMode(systemMode);
      if (result.success && result.mode) {
        setSystemMode(result.mode);
        await fetchHistory(); // Refresh history
        alert(`System mode changed to ${result.mode}`);
      } else {
        alert(`Failed to toggle mode: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling mode:', error);
      alert('Failed to toggle system mode');
    } finally {
      setIsTogglingMode(false);
    }
  };

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
      <Container className="py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-green-400 mb-2">Admin Access</h1>
                <p className="text-green-300/60">Enter admin key to continue</p>
              </div>

              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Admin key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isValidating && handleLogin()}
                  disabled={isValidating}
                  className="bg-gray-800/50 border-gray-600 text-green-400"
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
          </Card>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-12">
      <div className="space-y-8">
        {/* Demo warning banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
              DEMO
            </Badge>
            <p className="text-yellow-400 font-medium">Demo admin – changes not persistent across sessions</p>
          </div>
        </div>

        <Card>
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

          {/* Kill Switch Control */}
          <div className="space-y-6 mb-8 pb-8 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-green-300 mb-1">Kill Switch Control</h2>
                <p className="text-sm text-green-300/60">
                  Emergency control to disable writes across the entire system
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={systemMode === 'SAFE' 
                  ? 'border-green-500 text-green-400 bg-green-500/10' 
                  : 'border-amber-500 text-amber-400 bg-amber-500/10'
                }
              >
                {systemMode}
              </Badge>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-medium text-green-300 mb-1">Current Mode</div>
                  <div className="text-2xl font-bold text-green-400">
                    {systemMode === 'SAFE' ? '✓ Normal Operation' : '⚠ Read-Only Mode'}
                  </div>
                </div>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isTogglingMode}
                  className={systemMode === 'SAFE' 
                    ? 'bg-amber-500 text-black hover:bg-amber-400' 
                    : 'bg-green-500 text-black hover:bg-green-400'
                  }
                >
                  {isTogglingMode 
                    ? 'Toggling...' 
                    : systemMode === 'SAFE' 
                      ? 'Activate Read-Only' 
                      : 'Deactivate Read-Only'
                  }
                </Button>
              </div>

              {systemMode === 'READ_ONLY' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-amber-300 text-sm">
                    <strong>Active restrictions:</strong> Login disabled, all write operations blocked (posts, purchases, messages, mutations). Users can browse only.
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-xl font-bold text-green-400 mb-4">
                    Confirm Mode Change
                  </h3>
                  <p className="text-green-300/80 mb-6">
                    {systemMode === 'SAFE' 
                      ? 'This will activate READ_ONLY mode, blocking all write operations and login. Only you (admin) will be able to perform writes.'
                      : 'This will restore normal operation. All users will be able to post, purchase, and authenticate again.'
                    }
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleToggleMode}
                      className={systemMode === 'SAFE' 
                        ? 'bg-amber-500 text-black hover:bg-amber-400' 
                        : 'bg-green-500 text-black hover:bg-green-400'
                      }
                    >
                      Confirm
                    </Button>
                    <Button
                      onClick={() => setShowConfirmDialog(false)}
                      variant="outline"
                      className="border-gray-600"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            <div>
              <h3 className="text-lg font-medium text-green-300 mb-3">Recent Changes</h3>
              {isLoadingHistory ? (
                <p className="text-green-300/60 text-sm">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-green-300/60 text-sm">No changes recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 10).map((entry, idx) => (
                    <div 
                      key={idx} 
                      className="bg-gray-800/30 rounded px-4 py-2 text-sm border border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-green-300">
                          {entry.previous_mode ? `${entry.previous_mode} → ` : ''}
                          <strong>{entry.mode}</strong>
                        </span>
                        <span className="text-green-300/60">
                          {new Date(entry.changed_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-green-300/60 mt-1">
                        by {entry.changed_by}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Counter Management */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-green-300">Campaign Counters</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-300">Total Goal</label>
                <Input
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
                <Input
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
        </Card>

        {/* Preview Card */}
        <Card>
          <h2 className="text-xl font-semibold text-green-300 mb-4">Live Preview</h2>
          <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-green-400 mb-4">Community Support</h3>

            <Progress
              value={counters.totalPreorders}
              max={counters.totalGoal}
              label="Preorders Progress"
              className="mb-4"
            />

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
        </Card>
      </div>
    </Container>
  )
}
