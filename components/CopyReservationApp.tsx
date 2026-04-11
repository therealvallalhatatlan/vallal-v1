'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useCopyReservation } from '@/hooks/useCopyReservation';
import { formatCopyNumber } from '@/lib/copyFormatting';
import { CopyGrid } from './CopyGrid';
import { Button } from './ui/button';

export function CopyReservationApp() {
  const {
    copies,
    loading,
    error,
    createCheckout,
  } = useCopyReservation();

  const [selectedCopy, setSelectedCopy] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const totalCopies = copies.length || 100;
  const soldCount = copies.filter((c) => c.status === 'sold').length;
  const reservedCount = copies.filter((c) => c.status === 'reserved').length;
  const availableCount = copies.filter((c) => c.status === 'available').length;

  const promotionStart = useMemo(() => new Date(Date.now() - 8 * 60 * 60 * 1000), []);
  const [promotionElapsedSeconds, setPromotionElapsedSeconds] = useState(
    Math.floor((Date.now() - promotionStart.getTime()) / 1000),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPromotionElapsedSeconds(Math.floor((Date.now() - promotionStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [promotionStart]);

  const elapsedHours = Math.floor(promotionElapsedSeconds / 3600);
  const elapsedMinutes = Math.floor((promotionElapsedSeconds % 3600) / 60);
  const promotionElapsed =
    elapsedHours > 0 ? `${elapsedHours} órája` : `${elapsedMinutes} perce`;

  const scrollToGrid = () => {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // When a copy in the grid is clicked: toggle selection (or deselect if same)
  // Sold copies are ignored by CopyGrid already
  const handleSelectCopy = (copyNumber: number) => {
    setCheckoutError(null);
    setSelectedCopy((prev) => (prev === copyNumber ? null : copyNumber));
  };

  const handleCheckout = async () => {
    if (!selectedCopy) {
      setCheckoutError('Először válassz egy sorszámot.');
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      const checkoutUrl = await createCheckout(selectedCopy);
      window.location.href = checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nem sikerült továbblépni a fizetéshez';
      setCheckoutError(message);
      setCheckoutLoading(false);
    }
  };

  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">

          {/* Book cover */}
          <div className="relative mx-auto w-full max-w-xs md:max-w-none">
            <div className="pointer-events-none absolute -inset-10 rounded-full bg-lime-400/8 blur-3xl" />
            <Image
              src="/vallalhatatlan2.png"
              alt="Vállalhatatlan – Második könyv borítója"
              width={480}
              height={680}
              className="relative z-10 w-full rounded-lg shadow-[0_32px_80px_rgba(0,0,0,0.85)]"
              priority
            />
          </div>

          {/* Hero text */}
          <div className="flex flex-col gap-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {['Limitált kiadás', '100 sorszámozott példány', 'Csak itt'].map((label) => (
                <span
                  key={label}
                  className="inline-block rounded border border-lime-400/30 px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-lime-400/80"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Title */}
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-600">
                Második évad
              </p>
              <h1 className="text-5xl font-black uppercase leading-none tracking-tighter text-white sm:text-6xl lg:text-7xl">
                Vállal&shy;hatatlan 2
              </h1>
            </div>

            {/* Hook */}
            <p className="max-w-md text-lg leading-relaxed italic text-zinc-300">
Különleges, 100 darabos, limitált kiadás <br/> <span className="text-lime-400">Kőteleky Aywee</span> borítótervével.

            </p>

            <div className="h-px bg-gradient-to-r from-zinc-700 to-transparent" />

            {/* Meta */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <MetaItem label="Megjelenés" value="Május közepe" />
              <MetaItem label="Terjesztés" value="Dead drop" />
              <MetaItem label="Előrendelés indult" value={promotionElapsed} accent />
              <MetaItem label="Elérhető" value={`${availableCount} / ${totalCopies} példány`} />
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={scrollToGrid}
                className="flex-1 rounded-lg bg-lime-400 px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-lime-300 active:bg-lime-500"
              >
                Válassz példányt
              </button>
              <button
                onClick={() => setShowOverlay(true)}
                className="flex-1 rounded-lg border border-zinc-700 px-5 py-3.5 text-sm font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
              >
                Miről szól?
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── COPY SELECTION ───────────────────────────────────────────── */}
      <section ref={gridRef} className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-zinc-600">
              Válassz sorszámot
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              {soldCount > 0
                ? <>{totalCopies - soldCount} példány maradt</>
                : <>Mind a {totalCopies} példány elérhető</>}
            </h2>
            {reservedCount > 0 && (
              <p className="mt-1 text-xs text-zinc-600">
                {reservedCount} most valaki más kezében van
              </p>
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 text-xs text-zinc-600">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
              Szabad
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
              Elkelt
            </span>
          </div>
        </div>

        <CopyGrid
          copies={copies}
          reservedCopy={null}
          loading={loading}
          onSelectCopy={handleSelectCopy}
        />
      </section>

      {/* ── SELECTED COPY PANEL ──────────────────────────────────────── */}
      {selectedCopy !== null && (
        <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-lime-400/20 bg-zinc-950 p-6 shadow-[0_0_48px_rgba(163,230,53,0.05)]">
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-lime-400/60">
              Kiválasztott példány
            </p>
            <p className="font-mono text-6xl font-black leading-none tracking-tighter text-lime-300">
              #{formatCopyNumber(selectedCopy)}
            </p>
            <p className="mt-3 text-xs text-zinc-600">
              Kattints a „Tovább a fizetéshez" gombra a megvásárláshoz.
            </p>
          </div>
        </section>
      )}

      {/* ── ERRORS ───────────────────────────────────────────────────── */}
      {(error || checkoutError) && (
        <section className="mx-auto max-w-6xl space-y-2 px-4 pb-4 sm:px-6 lg:px-8">
          {[error, checkoutError].filter(Boolean).map((msg, i) => (
            <div
              key={i}
              className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400"
            >
              {msg}
            </div>
          ))}
        </section>
      )}

      {/* ── CHECKOUT ACTION ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <Button
          onClick={handleCheckout}
          disabled={checkoutLoading || selectedCopy === null}
          size="lg"
          className="h-14 w-full rounded-xl bg-lime-400 text-sm font-bold uppercase tracking-widest text-black transition-all duration-200 hover:bg-lime-300 active:bg-lime-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checkoutLoading
            ? 'Készítjük a fizetési oldalt...'
            : selectedCopy !== null
              ? `Tovább a fizetéshez — #${formatCopyNumber(selectedCopy)}`
              : 'Válassz egy sorszámot'}
        </Button>
      </section>

      {/* ── INFO SECTIONS ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 h-px bg-zinc-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoCard
            index="01"
            title="Miről szól?"
            text="Internetkávézó, 2002. Autótolvajok, stricik, hackerek és elveszett figurák — mind a pult előtt, mind a hátunk mögött. Pixi, Wes, Isu és Vállalhatatlan. Reggelig próbálunk túlélni."
          />
          <InfoCard
            index="02"
            title="Mit kapsz?"
            text="100 sorszámozott, egyedi példányt. Dead drop kalanddal, zenével, vizuális kiegészítőkkel — ahogy az első évadnál. A sorsod dönti el, hová kerül a könyved."
          />
          <InfoCard
            index="03"
            title="Hogy működik?"
            text="Fizetsz. Kapsz egy GPS-koordinátát. Egy titkos ponton megtalálod a könyved. Nincs futár, nincs csomagpont — csak te és a városnak az a sarka."
          />
        </div>
      </section>

      {/* ── MODAL ────────────────────────────────────────────────────── */}
      {showOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setShowOverlay(false)}
        >
          <div
            className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowOverlay(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Bezárás"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-lime-400">
              A második évad
            </p>
            <h2 className="mb-2 text-2xl font-black leading-tight text-white">
              Egy internetkávézóban játszódik.
            </h2>

            <div className="space-y-4 text-md leading-relaxed text-zinc-400">
              <p>
                Ne valami unalmas, normális helyre gondolj.
                Ez a 2000-es évek eleje. Az internet még nem unalmas. Még nem
                munka, ügyintézés, algoritmikus agybaszás. Vadnyugat volt.
              </p>
              <p>
                Tíz után eltűntek a normális emberek, és megérkeztek azok, akik
                tényleg használni akarták a hálózatot. Autótolvajok, stricik,
                kurvák, hackerek, drogdílerek, speedes futárok, félőrült zsenik
                és elveszett figurák.
              </p>
              <p>
                A pult mögött ott állunk mi: Pixi, Wes, Isu és én,
                Vállalhatatlan. Próbálunk túlélni reggelig, miközben a világ
                fenekestől felfordul körülöttünk.
              </p>
            </div>

            <div className="my-6 h-px bg-zinc-800" />

            <div className="mb-6 grid grid-cols-2 gap-4 text-xs">
              {(
                [
                  ['Megjelenés', 'Május közepe'],
                  ['Terjesztés', 'Dead drop'],
                  ['Példányok', '100 sorszámozott'],
                  ['Ár', '15 000 Ft'],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="mb-0.5 font-mono uppercase tracking-widest text-zinc-600">
                    {label}
                  </p>
                  <p className="font-medium text-zinc-300">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowOverlay(false);
                scrollToGrid();
              }}
              className="w-full rounded-lg bg-lime-400 px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-lime-300"
            >
              Válassz példányt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function MetaItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="mb-0.5 font-mono text-xs uppercase tracking-widest text-zinc-600">{label}</p>
      <p className={accent ? 'font-medium text-lime-400' : 'font-medium text-zinc-300'}>{value}</p>
    </div>
  );
}

function InfoCard({
  index,
  title,
  text,
}: {
  index: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-5">
      <p className="mb-3 font-mono text-xs text-zinc-700">{index}</p>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-zinc-300">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-600">{text}</p>
    </div>
  );
}
