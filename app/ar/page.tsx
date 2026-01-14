/// <reference path="../../types/aframe.d.ts" />
'use client'

import { useEffect, useState } from 'react'

export default function ARPage() {
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if scripts are already loaded
    if (typeof window !== 'undefined' && (window as any).AFRAME) {
      setScriptsLoaded(true)
      return
    }

    // Load A-Frame
    const aframeScript = document.createElement('script')
    aframeScript.src = 'https://aframe.io/releases/1.4.2/aframe.min.js'
    aframeScript.async = true

    // Load AR.js
    const arjsScript = document.createElement('script')
    arjsScript.src = 'https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js'
    arjsScript.async = true

    // Handle script loading
    let aframeLoaded = false
    let arjsLoaded = false

    const checkBothLoaded = () => {
      if (aframeLoaded && arjsLoaded) {
        setScriptsLoaded(true)
      }
    }

    aframeScript.onload = () => {
      aframeLoaded = true
      checkBothLoaded()
    }

    arjsScript.onload = () => {
      arjsLoaded = true
      checkBothLoaded()
    }

    aframeScript.onerror = () => {
      setError('Failed to load A-Frame. Please check your internet connection.')
    }

    arjsScript.onerror = () => {
      setError('Failed to load AR.js. Please check your internet connection.')
    }

    // Append scripts in order
    document.head.appendChild(aframeScript)
    
    // Wait for A-Frame to load before loading AR.js
    aframeScript.onload = () => {
      aframeLoaded = true
      document.head.appendChild(arjsScript)
      checkBothLoaded()
    }

    // Cleanup function
    return () => {
      // Note: We don't remove scripts on unmount to prevent issues with A-Frame
      // A-Frame and AR.js can cause issues if removed and re-added
    }
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Error Loading AR</h1>
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-white text-black rounded hover:bg-gray-200 transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!scriptsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-lg">Loading AR Experience...</p>
          <p className="text-sm text-gray-400 mt-2">Please allow camera access when prompted</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full">
      <a-scene
        embedded
        arjs="sourceType: webcam; debugUIEnabled: false; trackingMethod: best;"
        vr-mode-ui="enabled: false"
        renderer="logarithmicDepthBuffer: true; precision: medium;"
      >
        <a-marker preset="hiro" emitevents={true}>
          <a-entity position="0 0.5 0">
            <a-text
              value="CICI"
              align="center"
              color="#00ffff"
              width={2}
              position="0 0 0"
              rotation="-90 0 0"
            >
              <a-animation
                attribute="rotation"
                from="-90 0 0"
                to="-90 360 0"
                dur={4000}
                repeat="indefinite"
                easing="linear"
              />
            </a-text>
          </a-entity>
        </a-marker>

        <a-entity camera="" />
      </a-scene>

      {/* Instructions overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-lg text-center backdrop-blur-sm z-10">
        <p className="text-sm font-medium">Point your camera at the Hiro marker</p>
        <a
          href="https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300 underline mt-1 inline-block"
        >
          Download marker here
        </a>
      </div>
    </div>
  )
}
