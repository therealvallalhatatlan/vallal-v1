"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';



export default function ConfessionalPanel() {
  const [confession, setConfession] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    setError(null);
    try {
      const res = await fetch('/api/gyontatoszek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confession }),
      });
      if (!res.ok) {
        setError('Hiba történt. Próbáld újra.');
        setLoading(false);
        return;
      }
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let aiText = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          aiText += decoder.decode(value, { stream: true });
          setResponse(aiText);
        }
        setResponse(aiText);
      } else {
        const data = await res.json();
        setResponse(data.response || 'Nincs válasz.');
      }
    } catch {
      setError('Hiba történt. Próbáld újra.');
    }
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="w-full max-w-lg bg-black/0 border border-neutral-800/0 rounded-xl p-8 flex flex-col items-center gap-6"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-100 tracking-widest mb-2 glitch-text">
        Gyónd meg a nyúlnak.
      </h1>
      <p className="text-neutral-400 text-center text-base mb-4">
        Írd le, mit cipelsz.<br/>Itt névtelenül beszélhetsz. A nyúl nem lepődik meg semmin.
      </p>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <textarea
          className="w-full min-h-[120px] max-h-60 bg-black/80 border border-neutral-700 rounded p-3 text-neutral-200 text-lg font-mono resize-none focus:outline-none focus:border-fuchsia-700 placeholder:text-neutral-500"
          placeholder="Írd le a bűnöd, titkod, vagy terhed..."
          value={confession}
          onChange={e => setConfession(e.target.value)}
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !confession.trim()}
          className="w-full py-3 rounded bg-lime-400 text-black font-bold tracking-widest text-lg shadow-md hover:bg-lime-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Küldés...' : 'Mehet a nyúlnak'}
        </button>
      </form>
      <div className="w-full min-h-[60px] mt-2 text-gray-200 font-mono text-[1.5rem] md:text-[2.25rem] whitespace-pre-line animate-pulse">
        {error ? <span className="text-red-400">{error}</span> : response}
      </div>
    </motion.div>
  );
}
