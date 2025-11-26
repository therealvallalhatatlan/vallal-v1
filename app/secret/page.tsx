// app/secret/page.tsx
"use client";

import { Suspense, FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PASSWORD = "cici";
const COOKIE_NAME = "vallalhatatlan_pass";
const COOKIE_VALUE_OK = "ok";
const COOKIE_MAX_AGE_DAYS = 7;

export default function SecretPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SecretPageInner />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-zinc-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-4">
        <p className="text-xs text-zinc-500">Betöltés…</p>
      </div>
    </main>
  );
}

function SecretPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = searchParams.get("from") || "/reader";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim() !== PASSWORD) {
      setError("Hibás jelszó. Tipp: nem Caps Lock a hibás.");
      return;
    }

    setLoading(true);

    const maxAgeSec = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE_OK}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;

    router.push(from);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-black text-zinc-100 px-4 py-10">
      
      {/* HÁTTÉR */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.18] bg-[radial-gradient(circle_at_0_0,#22c55e_0,transparent_55%),radial-gradient(circle_at_100%_100%,#38bdf8_0,transparent_55%)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,rgba(39,39,42,.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,39,42,.4)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="relative w-full max-w-6xl">
        {/* *** FONTOS: Mobilon sorban lefelé → Login, Feature, Purchase *** */}
        <div className="grid gap-8 lg:grid-cols-3 items-start">

          {/* === 1. LOGIN DOBOZ – MOBILON LEGELŐL === */}
          <LoginBox
            password={password}
            setPassword={setPassword}
            error={error}
            loading={loading}
            handleSubmit={handleSubmit}
          />

          {/* === 2. FEATUREK === */}
          <FeatureBox />

          {/* === 3. MEGVÁSÁRLÁS === */}
          <PurchaseBox />
        </div>
      </div>
    </main>
  );
}

/* --------------------------
   LOGIN DOBOZ
---------------------------*/
function LoginBox({
  password,
  setPassword,
  error,
  loading,
  handleSubmit,
}: {
  password: string;
  setPassword: (v: string) => void;
  error: string | null;
  loading: boolean;
  handleSubmit: (e: FormEvent) => void;
}) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,.7)] p-6 md:p-7 space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          BELÉPÉS
        </p>
        <h2 className="text-xl font-semibold tracking-tight">Digitális verzió</h2>
        <p className="text-xs text-zinc-400">
          Ha már kaptál jelszót, itt tudsz belépni.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">Jelszó</label>
          <input
            type="password"
            value={password}
            autoComplete="off"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Írd be a jelszót…"
            className="w-full rounded-2xl border border-zinc-700 bg-black/70 px-3 py-2.5 text-sm outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/60 transition"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl border border-lime-600 bg-lime-600 text-black text-sm font-semibold py-2.5 hover:bg-lime-500 disabled:opacity-60 transition-colors"
        >
          {loading ? "Beléptetés…" : "Belépés a digitális verzióba"}
        </button>
      </form>

      <p className="text-[11px] text-zinc-500">
        A böngésződ eltárolja, így pár napig nem kell újra beírnod.
      </p>
    </section>
  );
}

/* --------------------------
   FEATURE BOX
---------------------------*/
function FeatureBox() {
  return (
    <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md p-6 md:p-8 shadow-[0_0_60px_rgba(0,0,0,.8)] flex flex-col gap-6">
      <header className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          VÁLLALHATATLAN // DIGITÁLIS KIADÁS
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <span className="text-lime-400">Vállalhatatlan</span> — digitális olvasó app
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          A limitált példányszámú könyv teljes szövege egy modern, interaktív
          online readerben – csak meghívottaknak.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-[11px] text-zinc-300">
        <Tag>30+ novella</Tag>
        <Tag>Story playlist</Tag>
        <Tag>Pszichedelikus Effekt™</Tag>
        <Tag>Progress tracking</Tag>
        <Tag>Micro-SFX</Tag>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm text-zinc-300">
        <Feature icon="A" title="Állítható betűméret">
          Olvasd úgy, ahogy kényelmes – mobilon és nagy kijelzőn is.
        </Feature>
        <Feature icon="✹" title="Pszichedelikus Effekt™">
          Subtilis glitch és CRT vibrálás – pont annyi zaj, amennyi kell.
        </Feature>
        <Feature icon="☰" title="Könyvjelző & progress">
          Jegyzi, hol tartasz, mit olvastál végig.
        </Feature>
        <Feature icon="♪" title="Story-alapú playlistek">
          Minden novella mellé saját hangulat-tracklist.
        </Feature>
        <Feature icon="⌁" title="Micro-interakciós hangok">
          Halk futurisztikus SFX — teljesen opcionális.
        </Feature>
        <Feature icon="◼" title="Ikonról indítható app (PWA)">
          Minimal, gyors, offline-barát.
        </Feature>
      </div>

      <p className="text-[11px] text-zinc-500">
        A digitális verzió kísérleti tér – először itt jelennek meg az új
        effektek, funkciók és bónusz tartalmak.
      </p>
    </section>
  );
}

/* --------------------------
   PURCHASE BOX
---------------------------*/
function PurchaseBox() {
  return (
    <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md shadow-[0_0_60px_rgba(0,0,0,.7)] p-6 md:p-7 space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          MEGVÁSÁRLÁS
        </p>
        <h2 className="text-xl font-semibold tracking-tight">Digitális hozzáférés</h2>
        <p className="text-xs text-zinc-400">Egyszeri díj, élethosszig hozzáférés.</p>
      </header>

      <div className="space-y-3">
        <p className="text-4xl font-semibold text-zinc-100">2500 Huf</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          • Azonnali hozzáférés  
          <br />• Teljes digitális könyv  
          <br />• Story-playlistek  
          <br />• Pszich. Effekt™  
          <br />• Jövőbeli frissítések  
        </p>
      </div>

      <a
        href="https://buy.stripe.com/14A14ndjk9MYdcH3038Ra0j"
        className="block w-full text-center rounded-2xl border border-lime-600 bg-lime-600 text-black text-sm font-semibold py-2.5 hover:bg-lime-500 transition"
      >
        Hozzáférés megvásárlása →
      </a>

      <p className="text-[11px] text-zinc-600">
        A vásárlás után automatikusan kapod a jelszót.  
        Ha már rendelkezel fizikai könyvvel: ingyenes.
      </p>
    </section>
  );
}

/* -------------------- KIEGÉSZÍTŐ KOMPONENSEK -------------------- */

function Feature({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center text-[13px]">
          {icon}
        </span>
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-zinc-500">{children}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-700/80 bg-zinc-900/70 px-3 py-1">
      {children}
    </span>
  );
}
