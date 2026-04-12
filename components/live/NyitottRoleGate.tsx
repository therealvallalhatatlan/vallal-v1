'use client';
// components/live/NyitottRoleGate.tsx
// Role selection form: viewer (public) or broadcaster (requires key)
import { useState } from 'react';
import type { Role } from '@/lib/live/auth';

type Props = {
  onJoin: (role: Role, token: string, wsUrl: string, displayName: string) => void;
};

export default function NyitottRoleGate({ onJoin }: Props) {
  const [role, setRole] = useState<Role>('viewer');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          displayName: displayName.trim() || 'Vendég',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Hiba történt.');
        return;
      }
      onJoin(role, data.token, data.wsUrl, displayName.trim() || 'Vendég');
    } catch {
      setError('Nem sikerült csatlakozni. Próbáld újra!');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto mt-16 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Nyitott Műhely</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-300">Szerepkör</span>
          <select
            className="px-3 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none"
            value={role}
            onChange={e => setRole(e.target.value as Role)}
          >
            <option value="viewer">Néző</option>
            <option value="broadcaster">Közvetítő</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-300">
            Megjelenített név <span className="text-gray-500 font-normal">(opcionális)</span>
          </span>
          <input
            className="px-3 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Vendég"
            maxLength={32}
          />
        </label>


        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="bg-white text-black font-bold py-2 px-4 rounded hover:bg-gray-200 disabled:opacity-50 transition"
        >
          {loading ? 'Csatlakozás…' : 'Csatlakozás'}
        </button>
      </form>
    </div>
  );
}
