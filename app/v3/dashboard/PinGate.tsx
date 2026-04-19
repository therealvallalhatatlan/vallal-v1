'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PinGate() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError('Helytelen PIN.');
      }
    } catch {
      setError('Hálózati hiba.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-lime-300/60">Admin · V3</p>
        <h1 className="text-lg text-neutral-100">Dashboard PIN</h1>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          autoFocus
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-lime-400/40"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pin}
          className="rounded-lg bg-lime-400/10 py-2 text-sm font-medium text-lime-200 transition hover:bg-lime-400/20 disabled:opacity-50"
        >
          {loading ? 'Ellenőrzés...' : 'Belépés'}
        </button>
      </form>
    </div>
  );
}
