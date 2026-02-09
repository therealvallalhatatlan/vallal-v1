'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type SystemMode = 'SAFE' | 'READ_ONLY' | null;

export default function StatusBanner() {
  const [mode, setMode] = useState<SystemMode>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Initial fetch
    fetchSystemMode();
    
    // Poll every 30 seconds to stay in sync
    const interval = setInterval(fetchSystemMode, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchSystemMode() {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const data = await response.json();
        setMode(data.mode);
      }
    } catch (error) {
      console.error('[StatusBanner] Failed to fetch system mode:', error);
      // Don't show banner if we can't fetch status
      setMode(null);
    }
  }

  if (!mounted || !mode) {
    return null;
  }

  const isSafe = mode === 'SAFE';
  const bannerConfig = isSafe
    ? {
        bg: 'bg-green-600/0',
        text: 'text-white',
        icon: '✓',
        message: 'Operator in control',
      }
    : {
        bg: 'bg-amber-500/95',
        text: 'text-black',
        icon: '⚠',
        message: 'Read-only safety mode enabled',
      };

  const banner = (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 ${bannerConfig.bg} ${bannerConfig.text} px-4 py-2 text-center text-sm font-medium shadow-lg backdrop-blur-sm pointer-events-none`}
      style={{ marginTop: 0 }}
    >
      <span className="mr-2" role="img" aria-label={isSafe ? 'Safe' : 'Warning'}>
        {bannerConfig.icon}
      </span>
      {bannerConfig.message}
    </div>
  );

  // Use portal to render at document body level
  return createPortal(banner, document.body);
}
