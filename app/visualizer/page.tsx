// app/visualizer/page.tsx
"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

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
  const q1 = search?.get("img1");
  const q2 = search?.get("img2");

  const defaultA = "/img/visuals/noise-54.jpg";
  const defaultB = "/img/visuals/noise-2027.png";

  const [imageA, setImageA] = useState(q1 || defaultA);
  const [imageB, setImageB] = useState(q2 || defaultB);
  const [showImagePicker, setShowImagePicker] = useState<"A" | "B" | null>(null);
  const [imageInputValue, setImageInputValue] = useState("");
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<"effects" | "images" | "export">("effects");
  const [dragOver, setDragOver] = useState<"A" | "B" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);

  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([]);
  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState<null | "gif" | "webm">(null);

  // --- USER TARGET CONTROLS (what UI sets) ---
  const [targetGlitch, setTargetGlitch] = useState(0.6);
  const [targetGrain, setTargetGrain] = useState(0.08);
  const [targetSlices, setTargetSlices] = useState(8);
  const [targetRgbShift, setTargetRgbShift] = useState(1);
  const [targetVignette, setTargetVignette] = useState(0.12);
  const [targetScaleOffset, setTargetScaleOffset] = useState(0.01);
  const [targetRotationDeg, setTargetRotationDeg] = useState(1);
  const [targetSaturation, setTargetSaturation] = useState(1);
  const [blendMode, setBlendMode] = useState<BlendMode>("difference");
  const [noiseOverlay, setNoiseOverlay] = useState(true);
  const [tintHue, setTintHue] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 99999));
  const [autoshift, setAutoshift] = useState(true);

  // Preset configurations
  const presets = {
    glitchHeavy: {
      name: "Glitch Heavy",
      glitch: 0.8,
      grain: 0.15,
      slices: 16,
      rgbShift: 0.08,
      vignette: 0.2,
      scaleOffset: 0.04,
      rotation: 3,
      saturation: 1.2,
      blendMode: "difference" as BlendMode,
    },
    subtle: {
      name: "Subtle",
      glitch: 0.2,
      grain: 0.03,
      slices: 4,
      rgbShift: 0.01,
      vignette: 0.05,
      scaleOffset: 0.005,
      rotation: 0,
      saturation: 1.0,
      blendMode: "overlay" as BlendMode,
    },
    cyberpunk: {
      name: "Cyberpunk",
      glitch: 0.7,
      grain: 0.12,
      slices: 12,
      rgbShift: 0.06,
      vignette: 0.25,
      scaleOffset: 0.02,
      rotation: 2,
      saturation: 1.8,
      blendMode: "screen" as BlendMode,
    },
    retro: {
      name: "Retro VHS",
      glitch: 0.5,
      grain: 0.2,
      slices: 8,
      rgbShift: 0.04,
      vignette: 0.15,
      scaleOffset: 0.01,
      rotation: 1,
      saturation: 0.8,
      blendMode: "multiply" as BlendMode,
    },
  };

  const applyPreset = useCallback((presetKey: keyof typeof presets) => {
    const preset = presets[presetKey];
    setTargetGlitch(preset.glitch);
    setTargetGrain(preset.grain);
    setTargetSlices(preset.slices);
    setTargetRgbShift(preset.rgbShift);
    setTargetVignette(preset.vignette);
    setTargetScaleOffset(preset.scaleOffset);
    setTargetRotationDeg(preset.rotation);
    setTargetSaturation(preset.saturation);
    setBlendMode(preset.blendMode);
  }, []);

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
    saturation: targetSaturation,
  });

  // Handle file upload
  const handleFileUpload = useCallback((file: File, target: "A" | "B") => {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (target === "A") {
        setImageA(dataUrl);
      } else {
        setImageB(dataUrl);
      }
      setShowImagePicker(null);
    };
    reader.onerror = () => {
      alert("Error reading file");
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent, target: "A" | "B") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(target);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, target: "A" | "B") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0], target);
    }
  }, [handleFileUpload]);

  // Handle URL input
  const handleUrlInput = useCallback((url: string, target: "A" | "B") => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      alert("Please enter a valid URL");
      return;
    }
    
    // Basic URL validation
    if (!trimmedUrl.startsWith("data:") && !trimmedUrl.startsWith("/") && !trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      alert("Please enter a valid URL (starting with http://, https://, or /)");
      return;
    }
    
    if (target === "A") {
      setImageA(trimmedUrl);
    } else {
      setImageB(trimmedUrl);
    }
    setShowImagePicker(null);
    setImageInputValue("");
  }, []);

  // preload images (keep order)
  useEffect(() => {
    let cancelled = false;
    setLoadedImgs([]);
    const imgs: HTMLImageElement[] = [];
    [imageA, imageB].forEach((src, idx) => {
      const img = new Image();
      // Only set crossOrigin for external URLs, not for data URLs
      if (!src.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
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
        console.error(`Failed to load image ${idx === 0 ? "A" : "B"}: ${src.substring(0, 100)}`);
        
        // If it's an external URL and direct loading failed, try using proxy
        if (src.startsWith("http://") || src.startsWith("https://")) {
          console.log(`Attempting to load via proxy: ${src.substring(0, 100)}`);
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
          if (img.src !== proxyUrl) {
            img.src = proxyUrl;
            return;
          }
        }
        
        // Final fallback to default images
        const fallback = idx === 0 ? defaultA : defaultB;
        if (src !== fallback && img.src !== fallback) {
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
      cur.current.saturation = lerp(cur.current.saturation, targetSaturation, smooth);

      const glitch = Math.max(0, Math.min(1.0, cur.current.glitch));
      const grain = Math.max(0, Math.min(0.3, cur.current.grain));
      const slices = Math.max(2, Math.min(40, cur.current.slices));
      const rgbShift = Math.max(0, Math.min(0.14, cur.current.rgbShift));
      const vign = Math.max(0, Math.min(0.5, cur.current.vignette));
      const scaleOff = Math.max(-0.2, Math.min(0.2, cur.current.scaleOffset));
      const rot = Math.max(-12, Math.min(12, cur.current.rotation));
      const spd = Math.max(0.2, Math.min(2.0, cur.current.speed));
      const sat = Math.max(0, Math.min(2.5, cur.current.saturation));

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
        ctx.filter = `saturate(${sat})`;
        try {
          ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
        } catch (e) {
          // ignore draw errors
        }
        ctx.restore();
      });
      ctx.filter = "none";

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
    targetSaturation,
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

  function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  function getDownscaleDims(srcW: number, srcH: number, maxSize: number) {
    const maxDim = Math.max(1, Math.max(srcW, srcH));
    const scale = Math.min(1, maxSize / maxDim);
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    return { w, h };
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

  const handleExportGif = useCallback(async () => {
    if (exporting) return;
    const srcCanvas = canvasRef.current;
    if (!srcCanvas) return;

    const frames = 8;
    const fps = 10;
    const maxSize = 512;
    const delay = Math.round(1000 / fps);
    const captureIntervalMs = delay;
    const maxColors = 64;
    const format: "rgb444" = "rgb444";

    setExporting("gif");
    try {
      const { w, h } = getDownscaleDims(srcCanvas.width, srcCanvas.height, maxSize);

      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
      if (!tctx) throw new Error("No 2D context for GIF export");

      const gif = GIFEncoder();
      let palette: any = null;

      for (let i = 0; i < frames; i++) {
        await nextFrame();
        tctx.clearRect(0, 0, w, h);
        tctx.drawImage(srcCanvas, 0, 0, w, h);

        const imgData = tctx.getImageData(0, 0, w, h);
        const rgba = imgData.data;

        if (i === 0) {
          palette = quantize(rgba, maxColors, { format });
        }
        const index = applyPalette(rgba, palette, format);

        gif.writeFrame(index, w, h, {
          delay,
          dispose: 2,
          ...(i === 0 ? { palette, repeat: 0 } : {}),
        });

        if (i < frames - 1) await sleep(captureIntervalMs);
      }

      gif.finish();
      const bytes = gif.bytes();
      const blob = new Blob([bytes], { type: "image/gif" });
      downloadBlob(blob, `visualizer-${Date.now()}.gif`);
    } catch (e) {
      console.error("GIF export failed", e);
      alert("GIF export failed. Check console for details.");
    } finally {
      setExporting(null);
    }
  }, [exporting]);

  const handleRecordWebm = useCallback(async () => {
    if (exporting) return;
    const srcCanvas = canvasRef.current;
    if (!srcCanvas) return;
    if (typeof MediaRecorder === "undefined") {
      alert("WebM recording is not supported in this browser.");
      return;
    }

    const fps = 12;
    const maxSize = 720;
    const frames = 10;
    const durationMs = Math.max(200, Math.round((frames / fps) * 1000));

    setExporting("webm");
    try {
      const { w, h } = getDownscaleDims(srcCanvas.width, srcCanvas.height, maxSize);
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = w;
      exportCanvas.height = h;
      const ectx = exportCanvas.getContext("2d");
      if (!ectx) throw new Error("No 2D context for WebM export");

      let copying = true;
      const copyTick = () => {
        if (!copying) return;
        ectx.drawImage(srcCanvas, 0, 0, w, h);
        requestAnimationFrame(copyTick);
      };
      copyTick();

      const stream = exportCanvas.captureStream(fps);

      const preferredTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
      const mimeType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const videoBitsPerSecond = w >= 720 || h >= 720 ? 2_500_000 : 1_200_000;
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const stopped = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error("MediaRecorder error"));
      });

      recorder.start();
      await sleep(durationMs);
      recorder.stop();
      await stopped;

      copying = false;
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      downloadBlob(blob, `visualizer-${Date.now()}.webm`);
    } catch (e) {
      console.error("WebM record failed", e);
      alert("WebM export failed. Check console for details.");
    } finally {
      setExporting(null);
    }
  }, [exporting]);

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
    setTargetSaturation(0.8 + Math.random() * 0.9);
    setTintHue(Math.floor(Math.random() * 40) - 20);
    setBlendMode((["difference", "overlay", "lighter", "screen", "multiply"] as BlendMode[])[Math.floor(Math.random() * 5)]);
  }, []);

  const handleSwapImages = useCallback(() => {
    setImageA((prev) => {
      setImageB(prev);
      return imageB;
    });
  }, [imageB]);

  // Mouse activity tracking - hide controls after 2 seconds of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseenter", handleMouseMove);
    
    // Initial timeout
    handleMouseMove();
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseenter", handleMouseMove);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

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
    <div className="fixed inset-0 z-50 flex bg-black text-white">
      {/* Canvas - Full Screen Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />

      {/* Bottom Toolbar - Fixed at Bottom */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-60 transition-all duration-300 ${
        showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}>
        <div className="rounded-full bg-black/80 border border-white/20 px-6 py-3 text-sm flex items-center gap-3 backdrop-blur-md shadow-2xl">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition font-medium flex items-center gap-2"
            title="Play / Pause (Space)"
          >
            {playing ? "⏸" : "▶"} {playing ? "Pause" : "Play"}
          </button>
          
          <div className="h-8 w-px bg-white/20"></div>
          
          <button
            onClick={handleScreenshot}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium flex items-center gap-2"
            title="Screenshot (S)"
          >
            📷 Screenshot
          </button>
          
          <button
            onClick={handleExportGif}
            disabled={!!exporting}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export GIF"
          >
            {exporting === "gif" ? "⏳ Exporting..." : "🎨 Export GIF"}
          </button>
          
          <button
            onClick={handleRecordWebm}
            disabled={!!exporting}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Video"
          >
            {exporting === "webm" ? "⏳ Recording..." : "🎞 Export Video"}
          </button>

          <div className="h-8 w-px bg-white/20"></div>

          <button
            onClick={handleRandomize}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium flex items-center gap-2"
            title="Randomize (R)"
          >
            🎲 Randomize
          </button>
        </div>
      </div>

      {/* Main Sidebar */}
      <div className={`absolute right-0 top-0 h-full w-80 bg-black/90 border-l border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-300 flex flex-col ${
        showControls ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab("effects")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === "effects"
                ? "bg-white/10 text-white border-b-2 border-white"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            ✨ Effects
          </button>
          <button
            onClick={() => setActiveTab("images")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === "images"
                ? "bg-white/10 text-white border-b-2 border-white"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            🖼️ Images
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === "export"
                ? "bg-white/10 text-white border-b-2 border-white"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            💾 Export
          </button>
        </div>

        {/* Tab Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4 pb-24">
          {activeTab === "effects" && (
            <>
              {/* Glitch Effects Group */}
              <div className="space-y-3 bg-white/5 rounded-lg p-3 border border-white/10">
                <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">Glitch Effects</h3>
                
                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Glitch Intensity <span className="text-white font-mono">{targetGlitch.toFixed(2)}</span>
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
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Slices <span className="text-white font-mono">{targetSlices}</span>
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
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    RGB Shift <span className="text-white font-mono">{targetRgbShift.toFixed(2)}</span>
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
              </div>

              {/* Visual Effects Group */}
              <div className="space-y-3 bg-white/5 rounded-lg p-3 border border-white/10">
                <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">Visual Effects</h3>
                
                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Grain <span className="text-white font-mono">{targetGrain.toFixed(2)}</span>
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
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Vignette <span className="text-white font-mono">{targetVignette.toFixed(2)}</span>
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
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Saturation <span className="text-white font-mono">{targetSaturation.toFixed(2)}x</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2.5}
                    step={0.05}
                    value={targetSaturation}
                    onChange={(e) => setTargetSaturation(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Transform Group */}
              <div className="space-y-3 bg-white/5 rounded-lg p-3 border border-white/10">
                <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">Transform</h3>
                
                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Rotation <span className="text-white font-mono">{targetRotationDeg}°</span>
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
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Scale Offset <span className="text-white font-mono">{targetScaleOffset.toFixed(3)}</span>
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
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Speed <span className="text-white font-mono">{speed.toFixed(2)}x</span>
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
              </div>

              {/* Blend & Color Group */}
              <div className="space-y-3 bg-white/5 rounded-lg p-3 border border-white/10">
                <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">Blend & Color</h3>
                
                <div>
                  <label className="text-[11px] text-neutral-400 mb-1 block">Blend Mode</label>
                  <select
                    value={blendMode}
                    onChange={(e) => setBlendMode(e.target.value as BlendMode)}
                    className="w-full bg-black/40 border border-white/20 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="difference">Difference</option>
                    <option value="overlay">Overlay</option>
                    <option value="lighter">Lighter</option>
                    <option value="screen">Screen</option>
                    <option value="multiply">Multiply</option>
                    <option value="source-over">Source Over</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Hue Shift <span className="text-white font-mono">{tintHue}°</span>
                  </label>
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

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setNoiseOverlay((v) => !v)}
                    className={`flex-1 px-3 py-2 rounded text-xs font-medium transition ${
                      noiseOverlay ? "bg-white/20 text-white" : "bg-white/5 text-neutral-400 hover:bg-white/10"
                    }`}
                  >
                    Noise {noiseOverlay ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => setAutoshift((v) => !v)}
                    className={`flex-1 px-3 py-2 rounded text-xs font-medium transition ${
                      autoshift ? "bg-white/20 text-white" : "bg-white/5 text-neutral-400 hover:bg-white/10"
                    }`}
                  >
                    Auto {autoshift ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "images" && (
            <>
              {/* Image A */}
              <div 
                className={`space-y-3 bg-white/5 rounded-lg p-4 border-2 transition-all ${
                  dragOver === "A" ? "border-blue-500 bg-blue-500/10" : "border-white/10"
                }`}
                onDragOver={(e) => handleDragOver(e, "A")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "A")}
              >
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  🖼️ Image A
                  {dragOver === "A" && <span className="text-xs text-blue-400">(Drop here)</span>}
                </h3>
                
                {loadedImgs[0] && (
                  <div className="aspect-video bg-black rounded overflow-hidden border border-white/20">
                    <img 
                      src={imageA} 
                      alt="Image A Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setImageInputValue(imageA);
                    setShowImagePicker("A");
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition font-medium text-sm"
                >
                  Change Image A
                </button>

                <p className="text-xs text-neutral-500">
                  Drag & drop an image here or click to browse
                </p>
              </div>

              {/* Image B */}
              <div 
                className={`space-y-3 bg-white/5 rounded-lg p-4 border-2 transition-all ${
                  dragOver === "B" ? "border-blue-500 bg-blue-500/10" : "border-white/10"
                }`}
                onDragOver={(e) => handleDragOver(e, "B")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "B")}
              >
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  🖼️ Image B
                  {dragOver === "B" && <span className="text-xs text-blue-400">(Drop here)</span>}
                </h3>
                
                {loadedImgs[1] && (
                  <div className="aspect-video bg-black rounded overflow-hidden border border-white/20">
                    <img 
                      src={imageB} 
                      alt="Image B Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setImageInputValue(imageB);
                    setShowImagePicker("B");
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition font-medium text-sm"
                >
                  Change Image B
                </button>

                <p className="text-xs text-neutral-500">
                  Drag & drop an image here or click to browse
                </p>
              </div>

              <button
                onClick={handleSwapImages}
                className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium text-sm"
              >
                🔁 Swap Images A ⇄ B
              </button>
            </>
          )}

          {activeTab === "export" && (
            <>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">Screenshot</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Capture the current frame as a high-quality PNG image
                  </p>
                  <button
                    onClick={handleScreenshot}
                    className="w-full px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    📷 Take Screenshot
                  </button>
                  <p className="text-xs text-neutral-500 mt-2">Keyboard: Press <kbd className="px-1 py-0.5 bg-white/10 rounded">S</kbd></p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">Export GIF</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Record 8 frames at 10fps (512px, optimized for web)
                  </p>
                  <button
                    onClick={handleExportGif}
                    disabled={!!exporting}
                    className="w-full px-4 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting === "gif" ? "⏳ Exporting..." : "🎨 Export as GIF"}
                  </button>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">Export Video</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Record ~0.8s WebM video at 12fps (720px, high quality)
                  </p>
                  <button
                    onClick={handleRecordWebm}
                    disabled={!!exporting}
                    className="w-full px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting === "webm" ? "⏳ Recording..." : "🎞 Export as Video"}
                  </button>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">Randomize</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Generate random effect parameters for inspiration
                  </p>
                  <button
                    onClick={handleRandomize}
                    className="w-full px-4 py-3 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    🎲 Randomize All
                  </button>
                  <p className="text-xs text-neutral-500 mt-2">Keyboard: Press <kbd className="px-1 py-0.5 bg-white/10 rounded">R</kbd></p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10 bg-black/50 shrink-0">
          <p className="text-[10px] text-neutral-500 text-center">
            Space: Play/Pause • S: Screenshot • R: Random • W: Swap
          </p>
        </div>
      </div>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-neutral-900 rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/20">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Select Image {showImagePicker}
            </h3>
            
            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-neutral-300">
                Upload Local File
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, showImagePicker);
                }}
                className="w-full text-sm text-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 file:cursor-pointer"
              />
            </div>

            {/* URL Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-neutral-300">
                Or Enter Image URL
              </label>
              <input
                type="text"
                value={imageInputValue}
                onChange={(e) => setImageInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUrlInput(imageInputValue, showImagePicker);
                  }
                }}
                placeholder="https://example.com/image.jpg or /img/local.png"
                className="w-full px-3 py-2 border border-white/20 rounded text-sm bg-black/40 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Supports: http://, https://, relative paths, or data URLs
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImagePicker(null);
                  setImageInputValue("");
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUrlInput(imageInputValue, showImagePicker)}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium"
              >
                Apply URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
