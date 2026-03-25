'use client';

import { useState } from 'react';
import { useCopyReservation } from '@/hooks/useCopyReservation';
import { formatCountdown, formatCopyNumber } from '@/lib/copyFormatting';
import { CopyGrid } from './CopyGrid';
import { Button } from './ui/button';
import { Badge } from './Badge';
import { cn } from '@/lib/utils';

export function CopyReservationApp() {
  const {
    copies,
    reservedCopy,
    remainingSeconds,
    loading,
    error,
    reserveError,
    reserveCopy,
    proceedToCheckout,
    releaseReservation,
    setReserveError,
  } = useCopyReservation();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const totalCopies = copies.length || 100;
  const soldCount = copies.filter((c) => c.status === 'sold').length;
  const reservedCount = copies.filter((c) => c.status === 'reserved').length;
  const availableCount = copies.filter((c) => c.status === 'available').length;
  const isReservationExpired = Boolean(reservedCopy && remainingSeconds === 0);
  const isReserved = !!reservedCopy && !isReservationExpired;
  const reservationProgress = Math.max(0, Math.min(1, remainingSeconds / 600));

  const handleSelectCopy = async (copyNumber: number) => {
    if (reservedCopy && reservedCopy.copy_number === copyNumber) {
      await handleRelease();
      return;
    }

    if (reservedCopy) {
      setReserveError('Már van aktív foglalásod, előbb válaszd le vagy fejezd be.');
      return;
    }

    await reserveCopy(copyNumber);
  };

  const handleCheckout = async () => {
    if (!reservedCopy) {
      setCheckoutError('Először válassz és foglalj le egy példányt.');
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      const checkoutUrl = await proceedToCheckout();
      window.location.href = checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nem sikerült továbblépni a fizetéshez';
      setCheckoutError(message);
      setCheckoutLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!reservedCopy) {
      setReserveError('Nincs lemondandó foglalás.');
      return;
    }

    try {
      setReleaseLoading(true);
      await releaseReservation();
      setReleaseLoading(false);
    } catch {
      setReleaseLoading(false);
    }
  };

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-black/0" />
      <div className="relative z-10 rounded-3xl bg-slate-950/0 p-6 ">
        <div className="space-y-5">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white md:text-6xl">
              Második Könyv
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-slate-300 md:text-base">
              100 számozott példány készül belőle. Válassz egy számot - a rendszer 5 percre lefoglalja neked.
              Sikeres fizetés után a példány a tiéd. Várható érkezés: Május közepe.
            </p>
            <button
              onClick={() => setShowOverlay(true)}
              className="text-lime-400 hover:text-lime-300 underline text-sm md:text-base"
            >
              Miről szól a második könyv?
            </button>
            <div className="border-t border-neutral-400 mt-2 pt-2 flex flex-wrap justify-center gap-3 text-sm text-slate-200">
              <span className="font-semibold text-lime-300">Még {availableCount} példány elérhető</span>
              <span className="text-slate-400">{totalCopies}-ból {soldCount} már elkelt</span>
              <span className="text-slate-400">{reservedCount} foglalás alatt</span>
            </div>
          </div>


          <div className="rounded-2xl bg-black/0 p-0 md:p-0">
            <CopyGrid
              copies={copies}
              reservedCopy={reservedCopy}
              loading={loading}
              onSelectCopy={handleSelectCopy}
            />
          </div>

          {isReserved && reservedCopy && (
            <div className="rounded-2xl border border-lime-400/40 bg-black/80 p-4 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
              <h2 className="text-lg font-bold text-lime-300">Kiválasztott példány</h2>
              <p className="mt-1 text-2xl font-black text-white tracking-widest">#{formatCopyNumber(reservedCopy.copy_number)}</p>
              <p className="mt-1 text-sm text-slate-300">Foglalás lejár: {formatCountdown(remainingSeconds)}</p>
              <p className="mt-2 text-sm text-slate-300">Ezt a számot 5 percig tartjuk neked. Utána újra elérhetővé válik.</p>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-lime-400 transition-all duration-500" style={{ width: `${reservationProgress * 100}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-black/80 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {reserveError && (
            <div className="rounded-lg border border-destructive/30 bg-black/80 p-3 text-sm text-destructive">
              {reserveError}
            </div>
          )}

          {checkoutError && (
            <div className="rounded-lg border border-destructive/30 bg-black/80 p-3 text-sm text-destructive">
              {checkoutError}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleCheckout}
              disabled={checkoutLoading || !reservedCopy || isReservationExpired}
              size="lg"
              className="flex-1 bg-lime-400 text-black hover:from-cyan-400 hover:to-blue-400"
            >
              {checkoutLoading
                ? 'Fizetés készítése...'
                : reservedCopy
                  ? `Tovább a fizetéshez - #${formatCopyNumber(reservedCopy.copy_number)}`
                  : 'Válassz egy példányt először'}
            </Button>
            <Button
              onClick={handleRelease}
              disabled={releaseLoading || !reservedCopy}
              variant="outline"
              size="lg"
              className="flex-1 border-emerald-300/70 text-emerald-200 hover:bg-emerald-500/10"
            >
              {releaseLoading ? 'Felszabadítás...' : 'Másik számot választok'}
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-300">
            <div className="flex items-center gap-2 rounded-xl border border-slate-700/0 bg-slate-900/0 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-lime-400" />
              <span>Szabad</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-yellow-600/0 bg-yellow-950/0 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-yellow-300" />
              <span>Foglalás alatt</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-destructive/0 bg-destructive/0 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>Elkelt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for book description */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative mx-4 max-w-lg  border-lime-400/0 bg-slate-900/0 p-6 shadow-2xl">
            <button
              onClick={() => setShowOverlay(false)}
              className="absolute right-4 -top-4 text-slate-400 hover:text-white"
              aria-label="Bezárás"
            >
              ✕
            </button>
            <h2 className="mb-4 text-2xl font-bold text-lime-400">A második évad egy internetkávézóban játszódik.</h2>
            <div className="space-y-4 text-slate-300">
              <p>
                De ne valami békés, nyugis helyre gondolj, ahol e-mailt írnak a nagymamának.
Ez a 2000-es évek eleje. Az internet még nem unalmas. Még nem munka, ügyintézés meg algoritmikus agyrohasztás. Vadnyugat volt.
              </p>
              <p>
                Tíz után eltűnnek a normális emberek, és megérkeznek azok, akik tényleg használni akarják a hálózatot. 
                Autótolvajok, stricik, kurvák, hackerek, drogdílerek, speedes futárok, félőrült zsenik és elveszett figurák. 
                A pult mögött pedig ott állunk mi: Pixi, Wes, Isu és én, próbálunk túlélni reggelig.
              </p>
              <p>
                Várható megjelenés: Május közepe. <br/> <br/>
                A könyv 100 számozott példányban jelenik meg, és csak itt lehet megvásárolni.
                Dead drop kalanddal, zenével, vizuállal, ahogy az első résznél megszokhattátok.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
