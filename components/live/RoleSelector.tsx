// components/live/RoleSelector.tsx
'use client';
import { useState } from 'react';
import { Event } from '../../lib/live/events';
import LiveRoom from './LiveRoom';

export default function RoleSelector({ event }: { event: Event }) {
  const [step, setStep] = useState<'form' | 'room'>('form');
  const [role, setRole] = useState<'viewer' | 'participant' | 'admin'>('viewer');
  const [displayName, setDisplayName] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }
    setStep('room');
  }

  if (step === 'room') {
    return (
      <LiveRoom event={event} role={role} displayName={displayName} keyProp={key} />
    );
  }

  return (
    <form className="w-full max-w-sm mx-auto mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Display Name</span>
        <input
          className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={32}
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Role</span>
        <select
          className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          value={role}
          onChange={e => setRole(e.target.value as any)}
        >
          <option value="viewer">Viewer (watch only)</option>
          <option value="participant">Participant (camera/mic)</option>
          <option value="admin">Admin (moderation)</option>
        </select>
      </label>
      {(role === 'participant' || role === 'admin') && (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Access Key</span>
          <input
            className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
            value={key}
            onChange={e => setKey(e.target.value)}
            required
          />
        </label>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
      >
        Join Event
      </button>
    </form>
  );
}
