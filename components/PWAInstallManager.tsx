"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * PWAInstallManager
 * - Handles beforeinstallprompt for Android/Chrome (stores the event and shows a friendly banner)
 * - Shows an iOS guide modal and a small banner for iOS users
 * - Detects in-app browsers and shows a 'Open in external browser' suggestion
 *
 * Usage: import and render near the top of your RootLayout (body element)
 *
 * Notes:
 * - Ensure you have manifest.webmanifest and a working service worker (you said it's PWA).
 * - This component is intentionally self-contained (no redux etc).
 */

/* ---------- small UA helpers ---------- */
const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";
const isAndroid = () => /Android/i.test(ua);
const isIOS = () => /iPhone|iPad|iPod/i.test(ua);
const isInAppBrowser = () =>
  /FBAN|FBAV|Instagram|Twitter|Messenger|WhatsApp|Line|GSA|wv\)/i.test(ua);

/* ---------- localStorage keys ---------- */
const LS_PREFIX = "pwa_install_v1:";
const LS_HIDE_BANNER = LS_PREFIX + "hideBannerAt";
const LS_HIDE_IOS_GUIDE = LS_PREFIX + "hideIosGuideAt";

/* ---------- iOS Guide component (inline to keep single file easy to drop) ---------- */
function IosInstallGuide({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 max-w-lg w-full bg-black p-5 text-zinc-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-lime-300">Telepítés iOS-re</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Bezárás"
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <ol className="mt-4 list-decimal ml-5 text-sm text-gray-300 space-y-2">
          <li>
            Nyomd meg a <strong>Megosztás</strong> ikont (alsó sáv - négyzet + nyíl).
          </li>
          <li>
            Görgess jobbra a megjelenő menüben, és válaszd az{" "}
            <strong>Add to Home Screen / Hozzáadás a Főképernyőhöz</strong> opciót.
          </li>
          <li>
            Átnevezheted az ikont (pl. "Reader") — majd Add / Hozzáadás.
          </li>
        </ol>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700"
          >
            Ok, köszi
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */
export default function PWAInstallManager({
  dismissForDays = 3,
}: {
  dismissForDays?: number;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showInAppBanner, setShowInAppBanner] = useState(false);
  const promptRef = useRef<any | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check localStorage - if recently dismissed, don't show
    try {
      const hideAt = parseInt(localStorage.getItem(LS_HIDE_BANNER) || "0", 10);
      if (hideAt && Date.now() - hideAt < dismissForDays * 24 * 60 * 60 * 1000) {
        // respect previous dismissal
      } else {
        // attach beforeinstallprompt listener for Android/Chrome
        const handler = (e: Event) => {
          const evt = e as any;
          evt.preventDefault(); // prevent auto prompt
          promptRef.current = evt;
          setDeferredPrompt(evt);
          // show only if not in-app browser; if in-app, show in-app instructions instead
          if (isInAppBrowser()) {
            setShowInAppBanner(true);
          } else if (isAndroid()) {
            setShowAndroidBanner(true);
          } else if (isIOS()) {
            // iOS won't fire beforeinstallprompt; we show a small banner instead
            setShowIosGuide(true);
          }
        };

        window.addEventListener("beforeinstallprompt", handler);

        // fallback: if no beforeinstallprompt fired but user is iOS
        if (!deferredPrompt && isIOS()) {
          // only show iOS guide if not dismissed
          const hideIosAt = parseInt(localStorage.getItem(LS_HIDE_IOS_GUIDE) || "0", 10);
          if (!hideIosAt || Date.now() - hideIosAt > dismissForDays * 24 * 60 * 60 * 1000) {
            setShowIosGuide(true);
          }
        }

        // also detect if we are inside an in-app browser (whenever)
        if (isInAppBrowser()) {
          setShowInAppBanner(true);
        }

        return () => {
          window.removeEventListener("beforeinstallprompt", handler);
        };
      }
    } catch (err) {
      // localStorage might throw in privacy modes — ignore and continue
      // still attach event
      const handler = (e: Event) => {
        const evt = e as any;
        evt.preventDefault();
        promptRef.current = evt;
        setDeferredPrompt(evt);
        if (isInAppBrowser()) setShowInAppBanner(true);
        else if (isAndroid()) setShowAndroidBanner(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for service worker update events from ServiceWorkerRegister
  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true);
    const onControllerChanged = () => {
      if (applyingUpdate) {
        try {
          // when controller changes, reload to activate new content
          window.location.reload();
        } catch {}
      }
    };

    window.addEventListener('sw:update-available', onUpdate as EventListener);
    window.addEventListener('sw:controller-changed', onControllerChanged as EventListener);

    return () => {
      window.removeEventListener('sw:update-available', onUpdate as EventListener);
      window.removeEventListener('sw:controller-changed', onControllerChanged as EventListener);
    };
  }, [applyingUpdate]);

  const handleApplyUpdate = () => {
    setApplyingUpdate(true);
    // ask ServiceWorkerRegister to tell waiting SW to skipWaiting
    try {
      window.dispatchEvent(new CustomEvent('sw:skip-waiting'));
    } catch (err) {
      // fallback: try posting directly to registration via message (ServiceWorkerRegister handles this)
    }
  };

  const handleSkipUpdate = () => {
    setUpdateAvailable(false);
  };

  /* ---------- actions ---------- */
  const handleAndroidInstall = async () => {
    const evt = promptRef.current || deferredPrompt;
    if (!evt) {
      // fallback: open in external browser (some webviews will interpret target _blank to open external)
      window.open(window.location.href, "_blank", "noopener,noreferrer");
      dismissAll();
      return;
    }
    try {
      evt.prompt();
      const choice = await evt.userChoice;
      // userChoice: { outcome: 'accepted' | 'dismissed' }
      if (choice && choice.outcome === "accepted") {
        // installed; hide banner
        dismissAll();
      } else {
        // dismissed — don't bug them for short time
        dismissTemporarily();
      }
    } catch (err) {
      // fallback
      console.warn("PWA install prompt failed", err);
      window.open(window.location.href, "_blank", "noopener,noreferrer");
      dismissAll();
    }
  };

  const openIosGuide = () => {
    setShowIosGuide(true);
  };

  const openInExternal = () => {
    try {
      const w = window.open(window.location.href, "_blank", "noopener,noreferrer");
      if (!w) {
        // popup blocked — fallback to copying
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
        alert("Link kimásolva — illeszd be Chrome vagy Safari címsorába.");
      }
    } catch {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
    dismissAll();
  };

  const dismissTemporarily = (days = 1) => {
    try {
      localStorage.setItem(LS_HIDE_BANNER, String(Date.now() - (dismissForDays - days) * 24 * 60 * 60 * 1000));
    } catch {}
    setShowAndroidBanner(false);
    setShowInAppBanner(false);
  };

  const dismissAll = () => {
    try {
      localStorage.setItem(LS_HIDE_BANNER, String(Date.now()));
    } catch {}
    setShowAndroidBanner(false);
    setShowInAppBanner(false);
    setShowIosGuide(false);
  };

  const dismissIosGuide = () => {
    try {
      localStorage.setItem(LS_HIDE_IOS_GUIDE, String(Date.now()));
    } catch {}
    setShowIosGuide(false);
  };

  /* ---------- render ---------- */
  return (
    <>
      {/* Android install banner */}
      {showAndroidBanner && (
        <div
          className="fixed left-0 right-0 bottom-0 z-50 mx-auto max-w-md"
          style={{ pointerEvents: "auto", touchAction: "manipulation" }}
        >
          <div className="bg-black px-3 py-3 text-xs text-zinc-100 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <strong className="block text-lime-100 text-[12px] leading-tight">Telepíthető alkalmazás</strong>
            </div>
            <button
              onClick={handleAndroidInstall}
              className="shrink-0 rounded-md bg-lime-100 px-2.5 py-1.5 text-[11px] font-bold text-black"
            >
              Telepítés
            </button>
            <button
              onClick={() => dismissTemporarily(1)}
              aria-label="Később"
              className="shrink-0 px-1.5 py-1 text-gray-500 hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* in-app browser banner */}
      {showInAppBanner && (
        <div
          className="fixed left-2 right-2 bottom-2 z-50 mx-auto max-w-md"
          style={{ pointerEvents: "auto", touchAction: "manipulation" }}
        >
          <div className="rounded-lg border border-white/10 bg-neutral-950/90 px-3 py-2 shadow-2xl backdrop-blur-md text-xs text-white flex items-center gap-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-lime-500 flex items-center justify-center font-bold text-black">↗</div>

            <div className="min-w-0 flex-1">
              <strong className="block text-lime-300 text-[11px] leading-tight">Nyisd meg böngészőben</strong>
              <span className="block text-[10px] text-gray-400 leading-tight mt-0.5 truncate">Teljes funkcionalitás Chrome vagy Safari alatt.</span>
            </div>
            <button onClick={openIosGuide} className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-300">
              Hogyan?
            </button>
            <button onClick={() => dismissTemporarily(1)} aria-label="Később" className="shrink-0 px-1.5 py-1 text-gray-500 hover:text-gray-200">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* iOS guide is rendered as modal */}
      <IosInstallGuide open={showIosGuide} onClose={dismissIosGuide} />

      {/* Update available banner (from service worker) */}
      {updateAvailable && (
        <div className="fixed left-4 right-4 bottom-20 z-50 max-w-3xl mx-auto">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/95 p-4 shadow-lg backdrop-blur-sm text-sm text-white flex items-center justify-between gap-3">
            <div className="flex-1">
              <strong className="text-lime-300">Frissítés elérhető</strong>
              <p className="text-xs text-gray-300 mt-1">Új verzió elérhető — frissíts a legújabb tartalomhoz.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleApplyUpdate}
                className="rounded-md bg-lime-500 px-3 py-2 text-xs font-semibold text-black"
              >
                {applyingUpdate ? 'Alkalmazás...' : 'Frissítés'}
              </button>

              <button
                onClick={handleSkipUpdate}
                className="rounded-md bg-neutral-800 px-3 py-2 text-xs text-gray-200"
              >
                Később
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
