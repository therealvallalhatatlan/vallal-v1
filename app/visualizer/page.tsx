// app/visualizer/page.tsx
"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type BlendMode =
  | "source-over"
  | "lighter"
  | "screen"
  | "multiply"
  | "overlay"
  | "darken"
  | "lighten"
  | "difference";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function VisualizerPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading…</div>}>
      <VisualizerContent />
    </Suspense>
  );
}

function VisualizerContent() {
  const search = useSearchParams();
  const q1 = search.get("img1");
  const q2 = search.get("img2");

  const defaultA = "/img/visuals/noise-05.jpg";
  const defaultB = "/img/visuals/noise-50.png";

  const [imageA, setImageA] = useState(q1 || defaultA);
  const [imageB, setImageB] = useState(q2 || defaultB);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);

  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([]);
  const [playing, setPlaying] = useState(true);

  // --- USER TARGET CONTROLS (what UI sets) ---
  const [targetGlitch, setTargetGlitch] = useState(0.6); // 0..1 (tamed)
  const [targetGrain, setTargetGrain] = useState(0.08); // 0..0.25
  const [targetSlices, setTargetSlices] = useState(8); // 2..24
  const [targetRgbShift, setTargetRgbShift] = useState(0.06); // 0..0.12
  const [targetVignette, setTargetVignette] = useState(0.12); // 0..0.3
  const [targetScaleOffset, setTargetScaleOffset] = useState(0.01); // -0.06..0.06
  const [targetRotationDeg, setTargetRotationDeg] = useState(1); // -6..6
  const [blendMode, setBlendMode] = useState<BlendMode>("difference");
  const [noiseOverlay, setNoiseOverlay] = useState(true);
  const [tintHue, setTintHue] = useState(0); // degrees
  const [speed, setSpeed] = useState(1.0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 99999));
  const [autoshift, setAutoshift] = useState(true);

  // --- SMOOTHED RUNTIME VALUES (interpolated each frame) ---
  const cur = useRef({
    glitch: targetGlitch,
    grain: targetGrain,
    slices: targetSlices,
    rgbShift: targetRgbShift,
    vignette: targetVignette,
    scaleOffset: targetScaleOffset,
    rotation: targetRotationDeg,
    speed,
  });

  // preload images (keep order)
  useEffect(() => {
    let cancelled = false;
    setLoadedImgs([]);
    const imgs: HTMLImageElement[] = [];
    [imageA, imageB].forEach((src, idx) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      (img as any).decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.onload = () => {
        if (cancelled) return;
        imgs[idx] = img;
        // only set when both attempted to load so array order stable
        setLoadedImgs(() => imgs.filter(Boolean) as HTMLImageElement[]);
      };
      img.onerror = () => {
        if (cancelled) return;
        const fallback = idx === 0 ? defaultA : defaultB;
        if (src !== fallback) {
          img.src = fallback;
        }
      };
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [imageA, imageB, seed]);

  // canvas sizing
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      const rect = c.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
      if (!ctxRef.current) ctxRef.current = c.getContext("2d");
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // drawing loop (smoothed / less destructive)
  useEffect(() => {
    cancelAnim();
    if (!playing) return;
    const c = canvasRef.current;
    const ctx = ctxRef.current;
    if (!c || !ctx) return;

    // seeded pseudo-rand for stable-looking glitches
    let rndState = seed || 1;
    const rnd = () => {
      rndState = (rndState * 9301 + 49297) % 233280;
      return rndState / 233280;
    };

    const draw = () => {
      const W = c.width;
      const H = c.height;
      ctx.clearRect(0, 0, W, H);

      const t = Date.now() / 1000;
      // smooth parameters toward target (slow lerp)
      const smooth = 0.08;
      cur.current.glitch = lerp(cur.current.glitch, targetGlitch, smooth);
      cur.current.grain = lerp(cur.current.grain, targetGrain, smooth);
      cur.current.slices = Math.round(lerp(cur.current.slices, targetSlices, smooth));
      cur.current.rgbShift = lerp(cur.current.rgbShift, targetRgbShift, smooth);
      cur.current.vignette = lerp(cur.current.vignette, targetVignette, smooth);
      cur.current.scaleOffset = lerp(cur.current.scaleOffset, targetScaleOffset, smooth);
      cur.current.rotation = lerp(cur.current.rotation, targetRotationDeg, smooth);
      cur.current.speed = lerp(cur.current.speed, speed, smooth);

      const glitch = Math.max(0, Math.min(1.0, cur.current.glitch));
      const grain = Math.max(0, Math.min(0.3, cur.current.grain));
      const slices = Math.max(2, Math.min(40, cur.current.slices));
      const rgbShift = Math.max(0, Math.min(0.14, cur.current.rgbShift));
      const vign = Math.max(0, Math.min(0.5, cur.current.vignette));
      const scaleOff = Math.max(-0.2, Math.min(0.2, cur.current.scaleOffset));
      const rot = Math.max(-12, Math.min(12, cur.current.rotation));
      const spd = Math.max(0.2, Math.min(2.0, cur.current.speed));

      // gentle background tint
      if (tintHue !== 0) {
        ctx.fillStyle = `hsla(${tintHue}, 30%, 6%, 0.08)`;
        ctx.fillRect(0, 0, W, H);
      } else {
        // subtle paper texture base
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, W, H);
      }

      // draw two layers with subtle transforms
      loadedImgs.forEach((img, idx) => {
        if (!img || !img.complete) return;
        // cover scale but keep small differential between layers
        const coverScale =
          Math.max(W / img.naturalWidth, H / img.naturalHeight) *
          (1 + (idx === 0 ? scaleOff : -scaleOff) * 0.6);
        const sw = img.naturalWidth * coverScale;
        const sh = img.naturalHeight * coverScale;

        // controlled movement
        const phase = t * (0.12 + idx * 0.04) * spd;
        const ox = Math.sin(phase * (0.6 + idx * 0.2)) * 8 * glitch * (idx === 0 ? 1 : -1);
        const oy = Math.cos(phase * (0.8 + idx * 0.3)) * 8 * glitch * (idx === 0 ? -1 : 1);

        ctx.save();
        ctx.translate(W / 2 + ox, H / 2 + oy);
        // small rotation that is smoothed and gentle
        const rads = ((rot * Math.PI) / 180) * (idx === 0 ? 1 : -0.8);
        ctx.rotate(rads * (autoshift ? (Math.sin(t * 0.06 + idx) * 0.1 + 0.95) : 1));
        ctx.globalCompositeOperation = idx % 2 ? "lighter" : blendMode;
        try {
          ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
        } catch (e) {
          // ignore draw errors
        }
        ctx.restore();
      });

      // softened sliced glitch: smaller offsets and less frequent
      const sliceFreq = Math.max(2, Math.floor(slices * (0.7 + glitch * 0.3)));
      for (let i = 0; i < sliceFreq; i++) {
        if (Math.random() > 0.9 - glitch * 0.15) continue;
        const y = Math.floor((H / sliceFreq) * i + (rnd() - 0.5) * 3);
        const h = Math.max(2, Math.floor(H / (sliceFreq * (1 + rnd() * 0.4))));
        const offset = (rnd() - 0.5) * 20 * glitch; // reduce maximum offset
        try {
          const id = ctx.getImageData(0, y, W, h);
          // soft put: use integer small offset and alpha blend to avoid harsh seams
          ctx.globalAlpha = 0.95;
          ctx.putImageData(id, Math.floor(offset), y);
          ctx.globalAlpha = 1;
        } catch {}
      }

      // occasional light RGB micro-shift but inexpensive: sample small region
      if (Math.random() < 0.06 * glitch) {
        try {
          // operate on a downsized temporary canvas to reduce cost
          const tw = Math.max(64, Math.floor(W / 4));
          const th = Math.max(64, Math.floor(H / 4));
          const tmp = document.createElement("canvas");
          tmp.width = tw;
          tmp.height = th;
          const tctx = tmp.getContext("2d");
          if (tctx) {
            tctx.drawImage(c, 0, 0, tw, th);
            const imgd = tctx.getImageData(0, 0, tw, th);
            const data = imgd.data;
            const copy = new Uint8ClampedArray(data);
            const sx = Math.max(-4, Math.min(4, Math.floor((rnd() - 0.5) * 8 * rgbShift)));
            const sy = Math.max(-2, Math.min(2, Math.floor((rnd() - 0.5) * 4 * rgbShift)));
            for (let y = 0; y < th; y++) {
              for (let x = 0; x < tw; x++) {
                const i = (y * tw + x) * 4;
                const jx = Math.max(0, Math.min(tw - 1, x + sx));
                const jy = Math.max(0, Math.min(th - 1, y + sy));
                const j = (jy * tw + jx) * 4;
                data[i] = copy[j]; // shift R channel only lightly
              }
            }
            tctx.putImageData(imgd, 0, 0);
            // upscale back with slight globalComposite to blend
            ctx.globalAlpha = 0.18 * rgbShift;
            ctx.drawImage(tmp, 0, 0, W, H);
            ctx.globalAlpha = 1;
          }
        } catch {}
      }

      // noise overlay (lighter, not heavy)
      if (noiseOverlay) {
        const alpha = 0.035 * grain;
        ctx.globalAlpha = alpha;
        const noiseCount = Math.floor(160 * grain);
        for (let i = 0; i < noiseCount; i++) {
          const x = Math.floor(rnd() * W);
          const y = Math.floor(rnd() * H);
          const s = Math.max(1, Math.floor(rnd() * 2));
          const g = Math.floor(rnd() * 255);
          ctx.fillStyle = `rgba(${g},${g},${g},${0.85 * alpha})`;
          ctx.fillRect(x, y, s, s);
        }
        ctx.globalAlpha = 1;
      }

      // subtle scanlines
      ctx.globalAlpha = 0.03 * grain;
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, y, W, 1);
      }
      ctx.globalAlpha = 1;

      // vignette
      ctx.fillStyle = `rgba(0,0,0,${vign})`;
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, W * 0.62, H * 0.62, 0, 0, Math.PI * 2);
      ctx.fill("evenodd");

      rafRef.current = requestAnimationFrame(draw);
    };

    const timer = setTimeout(() => (rafRef.current = requestAnimationFrame(draw)), 30);
    return () => {
      clearTimeout(timer);
      cancelAnim();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadedImgs,
    playing,
    targetGlitch,
    targetGrain,
    targetSlices,
    targetRgbShift,
    targetVignette,
    targetScaleOffset,
    targetRotationDeg,
    blendMode,
    noiseOverlay,
    tintHue,
    speed,
    seed,
    autoshift,
  ]);

  function cancelAnim() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  // screenshot -> download canvas png
  const handleScreenshot = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const data = c.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = data;
      a.download = `visualizer-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error("Screenshot failed", e);
    }
  }, []);

  const handleRandomize = useCallback(() => {
    // set moderate randomized targets (not extreme)
    setSeed(Math.floor(Math.random() * 99999));
    setTargetGlitch(0.3 + Math.random() * 0.7);
    setTargetGrain(0.02 + Math.random() * 0.18);
    setTargetSlices(4 + Math.floor(Math.random() * 16));
    setTargetRgbShift(Math.random() * 0.09);
    setTargetVignette(0.03 + Math.random() * 0.22);
    setTargetRotationDeg(Math.floor(Math.random() * 8) - 4);
    setTargetScaleOffset((Math.random() - 0.5) * 0.06);
    setTintHue(Math.floor(Math.random() * 40) - 20);
    setBlendMode((["difference", "overlay", "lighter", "screen", "multiply"] as BlendMode[])[Math.floor(Math.random() * 5)]);
  }, []);

  const handleSwapImages = useCallback(() => {
    setImageA((prev) => {
      setImageB(prev);
      return imageB;
    });
  }, [imageB]);

  // keyboard shortcuts: space to pause/play, s for screenshot, r for randomize, w swap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key.toLowerCase() === "s") {
        handleScreenshot();
      } else if (e.key.toLowerCase() === "r") {
        handleRandomize();
      } else if (e.key.toLowerCase() === "w") {
        handleSwapImages();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleScreenshot, handleRandomize, handleSwapImages]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      {/* top controls */}
      <div className="absolute top-4 right-4 z-60 flex gap-3 items-center">
        <div className="rounded-full bg-black/56 border border-white/10 px-3 py-2 text-xs flex items-center gap-2 backdrop-blur-sm">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="px-2 py-1 rounded-md bg-white/6 hover:bg-white/12 transition"
            title="Play / Pause (Space)"
          >
            {playing ? "⏸" : "⏵"}
          </button>
          <button
            onClick={handleScreenshot}
            className="px-2 py-1 rounded-md bg-white/6 hover:bg-white/12 transition"
            title="Screenshot (S)"
          >
            📷
          </button>
          <button
            onClick={handleRandomize}
            className="px-2 py-1 rounded-md bg-white/6 hover:bg-white/12 transition"
            title="Randomize (R)"
          >
            🎲
          </button>
          <button
            onClick={handleSwapImages}
            className="px-2 py-1 rounded-md bg-white/6 hover:bg-white/12 transition"
            title="Swap images (W)"
          >
            🔁
          </button>
        </div>
      </div>

      {/* left controls */}
      <div className="absolute left-4 top-4 z-60 w-64 rounded-lg bg-black/42 border border-white/6 p-3 text-xs space-y-2 backdrop-blur-sm">
        <div className="mb-1 text-neutral-300 font-medium">Vizualizáció</div>

        <label className="text-[11px] text-neutral-400 flex justify-between">
          Glitch <span className="text-neutral-300">{targetGlitch.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={targetGlitch}
          onChange={(e) => setTargetGlitch(Number(e.target.value))}
          className="w-full"
        />

        <label className="text-[11px] text-neutral-400 flex justify-between">
          Grain <span className="text-neutral-300">{targetGrain.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={0.25}
          step={0.005}
          value={targetGrain}
          onChange={(e) => setTargetGrain(Number(e.target.value))}
          className="w-full"
        />

        <label className="text-[11px] text-neutral-400 flex justify-between">
          Slices <span className="text-neutral-300">{targetSlices}</span>
        </label>
        <input
          type="range"
          min={2}
          max={24}
          step={1}
          value={targetSlices}
          onChange={(e) => setTargetSlices(Number(e.target.value))}
          className="w-full"
        />

        <label className="text-[11px] text-neutral-400 flex justify-between">
          RGB shift <span className="text-neutral-300">{targetRgbShift.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={0.12}
          step={0.005}
          value={targetRgbShift}
          onChange={(e) => setTargetRgbShift(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* right controls */}
      <div className="absolute right-4 top-4 z-60 w-56 rounded-lg bg-black/42 border border-white/6 p-3 text-xs space-y-2 backdrop-blur-sm">
        <div className="mb-1 text-neutral-300 font-medium">Tweakek</div>

        <label className="text-[11px] text-neutral-400 flex justify-between">
          Vignette <span className="text-neutral-300">{targetVignette.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={0.3}
          step={0.005}
          value={targetVignette}
          onChange={(e) => setTargetVignette(Number(e.target.value))}
          className="w-full"
        />

        <label className="text-[11px] text-neutral-400 flex justify-between">
          Rotation <span className="text-neutral-300">{targetRotationDeg}°</span>
        </label>
        <input
          type="range"
          min={-6}
          max={6}
          step={1}
          value={targetRotationDeg}
          onChange={(e) => setTargetRotationDeg(Number(e.target.value))}
          className="w-full"
        />

        <label className="text-[11px] text-neutral-400 flex justify-between">
          Scale offset <span className="text-neutral-300">{targetScaleOffset.toFixed(3)}</span>
        </label>
        <input
          type="range"
          min={-0.08}
          max={0.08}
          step={0.002}
          value={targetScaleOffset}
          onChange={(e) => setTargetScaleOffset(Number(e.target.value))}
          className="w-full"
        />

        <label className="text-[11px] text-neutral-400 flex justify-between">
          Speed <span className="text-neutral-300">{speed.toFixed(2)}x</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* bottom-left utilities */}
      <div className="absolute left-4 bottom-4 z-60 w-72 rounded-lg bg-black/42 border border-white/6 p-3 text-xs flex flex-col gap-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const url = prompt("Image A URL", imageA) || imageA;
              setImageA(url);
            }}
            className="px-2 py-1 rounded bg-white/6 hover:bg-white/10"
          >
            Edit A
          </button>
          <button
            onClick={() => {
              const url = prompt("Image B URL", imageB) || imageB;
              setImageB(url);
            }}
            className="px-2 py-1 rounded bg-white/6 hover:bg-white/10"
          >
            Edit B
          </button>

          <button
            onClick={() => {
              setNoiseOverlay((v) => !v);
            }}
            className="px-2 py-1 rounded bg-white/6 hover:bg-white/10"
          >
            {noiseOverlay ? "Noise ON" : "Noise OFF"}
          </button>

          <button
            onClick={() => setAutoshift((v) => !v)}
            className="px-2 py-1 rounded bg-white/6 hover:bg-white/10"
            title="Auto subtle movement"
          >
            {autoshift ? "Auto" : "Manual"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-neutral-400">Blend</label>
          <select
            value={blendMode}
            onChange={(e) => setBlendMode(e.target.value as BlendMode)}
            className="bg-black/40 border border-white/6 rounded px-2 py-1 text-xs"
          >
            <option value="difference">difference</option>
            <option value="overlay">overlay</option>
            <option value="lighter">lighter</option>
            <option value="screen">screen</option>
            <option value="multiply">multiply</option>
            <option value="source-over">source-over</option>
          </select>

          <label className="text-[11px] text-neutral-400">Hue</label>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={tintHue}
            onChange={(e) => setTintHue(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              handleScreenshot();
            }}
            className="flex-1 px-3 py-2 rounded bg-lime-600 text-black font-semibold"
          >
            Screenshot
          </button>
          <button
            onClick={() => {
              setSeed(Math.floor(Math.random() * 99999));
            }}
            className="px-3 py-2 rounded bg-white/6"
            title="Reseed"
          >
            Reseed
          </button>
        </div>

        <div className="text-[10px] text-neutral-500">
          Tips: Space=play/pause, S=screenshot, R=randomize, W=swap images. Use gentle values for best screenshots.
        </div>
      </div>

      {/* canvas container */}
      <div className="flex-1 w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ display: "block" }}
        />
      </div>

      {/* footer instruction */}
      <div className="absolute bottom-4 right-4 z-60 text-xs text-neutral-400 bg-black/30 px-3 py-1 rounded-md border border-white/8">
        Use query params ?img1=/path.jpg&amp;img2=/path2.jpg or edit via buttons.
      </div>
    </div>
  );
}
