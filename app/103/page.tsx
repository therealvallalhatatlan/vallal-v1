"use client";
import BookAuctionCounter from "../../components/BookAuctionCounter";
import { useState } from "react";

export default function Book103Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBuy = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/book103", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Hiba történt a fizetési oldal indításakor.");
      }
    } catch (err) {
      setError("Hiba történt a fizetési oldal indításakor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-2 py-6 relative overflow-hidden z-20">
      {/* Fullscreen háttérvideó */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
        style={{ minHeight: '100dvh', minWidth: '100vw', objectFit: 'cover', objectPosition: 'center' }}
      >
        <source src="/videos/105.mp4" type="video/mp4" />
      </video>
      {/* Tartalom overlay - VHS/Y2K stílus */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        .vhs-card {
          font-family: 'VT323', monospace;
          background: transparent;
          border-radius: 1.2em;
          box-shadow: none;
          /* border: 2.5px solid #00fff7; */
          /* border-bottom: 6px solid #bfff00; */
          /* border-right: 4px solid #bfff00; */
          overflow: hidden;
          position: relative;
        }
        .vhs-glitch {
          position: relative;
          display: inline-block;
        }
        .vhs-glitch::before, .vhs-glitch::after {
          content: attr(data-text);
          position: absolute;
          left: 0; top: 0;
          width: 100%;
          overflow: hidden;
          opacity: 0.7;
          pointer-events: none;
        }
        .vhs-glitch::before {
          color: #00fff7;
          z-index: 2;
          transform: translate(1.5px, 0.5px) skewX(-2deg);
          mix-blend-mode: lighten;
          animation: glitch1 1.2s infinite linear alternate-reverse;
        }
        .vhs-glitch::after {
          color: #ff00c8;
          z-index: 1;
          transform: translate(-1.5px, -0.5px) skewX(2deg);
          mix-blend-mode: lighten;
          animation: glitch2 1.1s infinite linear alternate-reverse;
        }
        @keyframes glitch1 {
          0% { clip-path: inset(0 0 80% 0); }
          20% { clip-path: inset(0 0 60% 0); }
          40% { clip-path: inset(0 0 40% 0); }
          60% { clip-path: inset(0 0 20% 0); }
          80% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 0 80% 0); }
        }
        @keyframes glitch2 {
          0% { clip-path: inset(80% 0 0 0); }
          20% { clip-path: inset(60% 0 0 0); }
          40% { clip-path: inset(40% 0 0 0); }
          60% { clip-path: inset(20% 0 0 0); }
          80% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(80% 0 0 0); }
        }
        .vhs-label {
          font-size: 2.1rem;
          color: #bfff00;
          letter-spacing: 0.12em;
          text-shadow: 0 2px 12px #00fff7, 0 1px 0 #222, 0 0 2px #fff;
        }
        .vhs-sub {
          font-size: 0.95rem;
          color: #00fff7;
          letter-spacing: 0.08em;
          margin-left: 0.5em;
          text-shadow: 0 1px 8px #00fff7, 0 0 2px #fff;
        }
        .vhs-desc {
          font-size: 1.3rem;
          color: #fff;
          margin-top: 0.7em;
          margin-bottom: 0.7em;
          text-align: left;
          text-shadow: 0 1px 8px #00fff7, 0 0 2px #fff;
        }
        .vhs-cta {
          background: linear-gradient(90deg, #bfff00 60%, #00fff7 100%);
          color: #181818;
          font-size: 1.5rem;
          font-family: 'VT323', monospace;
          border-radius: 0.7em;
          border: none;
          box-shadow: 0 2px 24px 0 #00fff7a0, 0 0 0 2px #bfff00;
          text-shadow: 0 1px 8px #fff, 0 0 2px #00fff7;
          letter-spacing: 0.12em;
          margin-top: 1.2em;
          margin-bottom: 0.2em;
          padding: 0.7em 0;
          width: 100%;
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
        }
        .vhs-cta:active, .vhs-cta:focus {
          background: #00fff7;
          color: #181818;
          box-shadow: 0 2px 32px 0 #bfff00a0, 0 0 0 2px #00fff7;
        }
      `}</style>
      <div
        className="w-full max-w-md mx-auto vhs-card p-5 sm:p-8 flex flex-col gap-6 z-10 relative"
        style={{
          aspectRatio: '1.618 / 1',
          minHeight: '340px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div className="flex items-center mb-2">
          <span className="vhs-label vhs-glitch" data-text="#103">#103</span>
          <span className="vhs-sub vhs-glitch" data-text="Egyedi, dedikált példány, fix áron">Egyedi, dedikált példány</span>
        </div>
        <div className="vhs-desc">
          A csomag ára: <span style={{ color: '#bfff00', fontWeight: 700 }}>10.000 Ft</span>.<br />
          Benne egy olyan írás ami máshol nem jelent meg. Sok mindenre fény derül.
        </div>
        <button
          id="buy-btn"
          onClick={handleBuy}
          disabled={loading}
          className="vhs-cta"
        >
          {loading ? "Vásárlás indítása..." : "Vásárlás"}
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </div>
    </main>
  );
}
