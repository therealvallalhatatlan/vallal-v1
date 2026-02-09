'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'reader_pwa_install:dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function ReaderPWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showInAppBrowserWarning, setShowInAppBrowserWarning] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    // Check if previously dismissed
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) {
        return; // Still within dismiss period
      }
    }

    const ua = navigator.userAgent;
    
    // Detection functions
    const isMobile = () => window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(ua);
    const isIOS = () => /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = () => /Android/i.test(ua);
    const isInAppBrowser = () => /FBAN|FBAV|Instagram|Twitter|Messenger|WhatsApp|Line|GSA|wv\)/i.test(ua);
    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    // Don't show if already installed
    if (isStandalone()) {
      return;
    }

    // Only show on mobile
    if (!isMobile()) {
      return;
    }

    // Handle in-app browser
    if (isInAppBrowser()) {
      // Wait for user engagement (scroll)
      const handleScroll = () => {
        if (window.scrollY > 100) {
          setShowInAppBrowserWarning(true);
          window.removeEventListener('scroll', handleScroll);
        }
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }

    // Handle scroll trigger for engagement
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 30 || window.scrollY > 500) {
        setHasScrolled(true);
        window.removeEventListener('scroll', handleScroll);
      }
    };

    // Also trigger after 20 seconds
    const timer = setTimeout(() => {
      setHasScrolled(true);
    }, 20000);

    window.addEventListener('scroll', handleScroll);

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      clearTimeout(timer);
    };
  }, []);

  // Show prompt after user has scrolled/engaged
  useEffect(() => {
    if (hasScrolled) {
      const ua = navigator.userAgent;
      const isIOS = () => /iPhone|iPad|iPod/i.test(ua);
      const isAndroid = () => /Android/i.test(ua);

      if (isIOS() || (isAndroid() && deferredPrompt)) {
        setShowPrompt(true);
      }
    }
  }, [hasScrolled, deferredPrompt]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShowPrompt(false);
    setShowInAppBrowserWarning(false);
  };

  const handleInstallClick = async () => {
    const ua = navigator.userAgent;
    const isIOS = () => /iPhone|iPad|iPod/i.test(ua);

    if (isIOS()) {
      // Show iOS modal
      setShowIOSModal(true);
    } else if (deferredPrompt) {
      // Android/Chrome - trigger native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      }
      setDeferredPrompt(null);
    }
  };

  const handleOpenInBrowser = () => {
    // Copy current URL to clipboard
    navigator.clipboard.writeText(window.location.href);
    alert('Link másolva! Nyisd meg Safari vagy Chrome böngészőben.');
  };

  // In-app browser warning
  if (showInAppBrowserWarning) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-lime-500 text-black rounded-lg shadow-2xl p-4 flex items-start gap-3">
          <ExternalLink className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold mb-1">Nyisd meg külső böngészőben</p>
            <p className="text-black/80">
              A teljes élményhez nyisd meg ezt az oldalt Safari vagy Chrome böngészőben.
            </p>
            <button
              onClick={handleOpenInBrowser}
              className="mt-2 text-xs font-semibold underline"
            >
              Link másolása
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-black/10 rounded"
            aria-label="Bezárás"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Installation Modal
  if (showIOSModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in">
        <div className="bg-neutral-900 text-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-lime-400">App telepítése</h3>
            <button
              onClick={() => {
                setShowIOSModal(false);
                handleDismiss();
              }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4 text-sm">
            <p className="text-neutral-300">
              Telepítsd a Vállalhatatlan Reader alkalmazást a kezdőképernyődre:
            </p>
            
            <ol className="space-y-3 list-decimal list-inside text-neutral-300">
              <li>
                Nyomd meg a <span className="font-semibold text-white">Megosztás</span> gombot{' '}
                <span className="inline-block px-2 py-1 bg-blue-500 text-white rounded text-xs">
                  ⎋
                </span>{' '}
                (Safari alján)
              </li>
              <li>
                Görgess le és válaszd a{' '}
                <span className="font-semibold text-white">"Hozzáadás a kezdőképernyőhöz"</span> opciót
              </li>
              <li>
                Nyomd meg a <span className="font-semibold text-white">Hozzáadás</span> gombot
              </li>
            </ol>

            <div className="mt-6 p-4 bg-lime-500/10 border border-lime-500/30 rounded-lg">
              <p className="text-xs text-lime-300">
                💡 Ezután az alkalmazás elérhető lesz a kezdőképernyődről, akár offline is.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowIOSModal(false);
              handleDismiss();
            }}
            className="mt-6 w-full py-3 bg-lime-500 hover:bg-lime-400 text-black font-semibold rounded-lg transition-colors"
          >
            Értem
          </button>
        </div>
      </div>
    );
  }

  // FAB (Floating Action Button)
  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
      <div className="relative">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-neutral-800 text-white text-xs rounded-lg shadow-xl animate-in slide-in-from-bottom-2">
          <p className="font-semibold mb-1">Telepítsd az alkalmazást!</p>
          <p className="text-neutral-300">Gyorsabb hozzáférés, offline olvasás.</p>
          <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-neutral-800"></div>
        </div>

        {/* Main FAB */}
        <button
          onClick={handleInstallClick}
          className="group relative w-14 h-14 bg-lime-500 hover:bg-lime-400 text-black rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          aria-label="Alkalmazás telepítése"
        >
          <Download className="w-6 h-6" />
        </button>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-neutral-700 hover:bg-neutral-600 text-white rounded-full shadow flex items-center justify-center text-xs transition-colors"
          aria-label="Bezárás"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
