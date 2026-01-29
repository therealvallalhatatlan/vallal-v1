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
  const defaultB = "/img/visuals/noise-2026.png";

  const [imageA, setImageA] = useState(q1 || defaultA);
  const [imageB, setImageB] = useState(q2 || defaultB);
  const [showImagePicker, setShowImagePicker] = useState<"A" | "B" | null>(null);
  const [imageInputValue, setImageInputValue] = useState("");
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"effects" | "images" | "export">("effects");
  const [dragOver, setDragOver] = useState<"A" | "B" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const hiddenImageHostRef = useRef<HTMLDivElement | null>(null);

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

  // NEW EFFECTS
  const [targetBloom, setTargetBloom] = useState(0);
  const [targetMotionBlur, setTargetMotionBlur] = useState(0);
  const [targetRipple, setTargetRipple] = useState(0);
  const [targetEcho, setTargetEcho] = useState(0);
  const [targetPixelation, setTargetPixelation] = useState(0);
  const [targetKaleidoscope, setTargetKaleidoscope] = useState(0);
  const [audioReactive, setAudioReactive] = useState(false);
  const [audioSensitivity, setAudioSensitivity] = useState(1.0);
  
  // Audio-reactive state
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  
  // Echo/trail frame buffer
  const prevFramesRef = useRef<ImageData[]>([]);

  // Image positioning state
  const [imageFitA, setImageFitA] = useState<'cover' | 'contain'>('cover');
  const [imageFitB, setImageFitB] = useState<'cover' | 'contain'>('cover');
  const [imagePositionXA, setImagePositionXA] = useState<'left' | 'center' | 'right'>('center');
  const [imagePositionXB, setImagePositionXB] = useState<'left' | 'center' | 'right'>('center');
  const [imagePositionYA, setImagePositionYA] = useState<'top' | 'center' | 'bottom'>('center');
  const [imagePositionYB, setImagePositionYB] = useState<'top' | 'center' | 'bottom'>('center');

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
      bloom: 0.3,
      motionBlur: 0.15,
      ripple: 0,
      echo: 0.2,
      pixelation: 0,
      kaleidoscope: 0,
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
      bloom: 0.1,
      motionBlur: 0,
      ripple: 0,
      echo: 0,
      pixelation: 0,
      kaleidoscope: 0,
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
      bloom: 0.5,
      motionBlur: 0.2,
      ripple: 0.1,
      echo: 0.25,
      pixelation: 0,
      kaleidoscope: 0,
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
      bloom: 0,
      motionBlur: 0.1,
      ripple: 0,
      echo: 0.3,
      pixelation: 0.05,
      kaleidoscope: 0,
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
    setTargetBloom(preset.bloom);
    setTargetMotionBlur(preset.motionBlur);
    setTargetRipple(preset.ripple);
    setTargetEcho(preset.echo);
    setTargetPixelation(preset.pixelation);
    setTargetKaleidoscope(preset.kaleidoscope);
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
    bloom: targetBloom,
    motionBlur: targetMotionBlur,
    ripple: targetRipple,
    echo: targetEcho,
    pixelation: targetPixelation,
    kaleidoscope: targetKaleidoscope,
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
    const appended: HTMLImageElement[] = [];

    // Ensure we have an offscreen host so GIFs keep animating while drawn to canvas
    if (!hiddenImageHostRef.current && typeof document !== "undefined") {
      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.top = "-9999px";
      host.style.left = "-9999px";
      host.style.width = "1px";
      host.style.height = "1px";
      host.style.opacity = "0";
      host.style.overflow = "hidden";
      host.style.pointerEvents = "none";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
      hiddenImageHostRef.current = host;
    }
    const host = hiddenImageHostRef.current;
    [imageA, imageB].forEach((src, idx) => {
      const img = new Image();
      // Only set crossOrigin for external URLs, not for data URLs
      if (!src.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      (img as any).decoding = "async";
      img.referrerPolicy = "no-referrer";
      if (host) {
        img.style.position = "absolute";
        img.style.top = "0";
        img.style.left = "0";
        img.style.maxWidth = "none";
        img.style.maxHeight = "none";
        img.style.width = "auto";
        img.style.height = "auto";
        host.appendChild(img);
        appended.push(img);
      }
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
      appended.forEach((img) => img.remove());
    };
  }, [imageA, imageB, seed]);

  // Audio-reactive setup
  useEffect(() => {
    if (!audioReactive) {
      // Clean up audio context if disabled
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    // Setup audio context and microphone
    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch (err) {
        console.error('Failed to access microphone:', err);
        setAudioReactive(false);
        alert('Could not access microphone. Please grant permission.');
      }
    };

    setupAudio();

    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioReactive]);

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
      cur.current.bloom = lerp(cur.current.bloom, targetBloom, smooth);
      cur.current.motionBlur = lerp(cur.current.motionBlur, targetMotionBlur, smooth);
      cur.current.ripple = lerp(cur.current.ripple, targetRipple, smooth);
      cur.current.echo = lerp(cur.current.echo, targetEcho, smooth);
      cur.current.pixelation = lerp(cur.current.pixelation, targetPixelation, smooth);
      cur.current.kaleidoscope = lerp(cur.current.kaleidoscope, targetKaleidoscope, smooth);
      
      // Get audio data if audio-reactive is enabled
      let audioEnergy = 0;
      let bassEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;
      if (audioReactive && analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        const data = dataArray;
        
        // Calculate frequency band energies
        const bassRange = [2, 30];
        const midRange = [31, 90];
        const highRange = [91, 256];
        
        const getAvg = (start: number, end: number) => {
          let sum = 0;
          for (let i = start; i <= Math.min(end, data.length - 1); i++) {
            sum += data[i];
          }
          return sum / (end - start + 1) / 255;
        };
        
        bassEnergy = getAvg(bassRange[0], bassRange[1]);
        midEnergy = getAvg(midRange[0], midRange[1]);
        highEnergy = getAvg(highRange[0], highRange[1]);
        audioEnergy = (bassEnergy * 0.5 + midEnergy * 0.3 + highEnergy * 0.2) * audioSensitivity;
      }
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

        const isImageA = idx === 0;
        const fit = isImageA ? imageFitA : imageFitB;
        const posX = isImageA ? imagePositionXA : imagePositionXB;
        const posY = isImageA ? imagePositionYA : imagePositionYB;

        // Calculate scale based on fit mode
        let scale: number;
        if (fit === 'cover') {
          scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        } else {
          scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
        }
        
        // Apply scale offset for layering effect
        scale *= (1 + (isImageA ? scaleOff : -scaleOff) * 0.6);

        const sw = img.naturalWidth * scale;
        const sh = img.naturalHeight * scale;

        // Calculate position offsets based on alignment
        let alignX = 0;
        if (posX === 'left') alignX = -(W - sw) / 2;
        if (posX === 'right') alignX = (W - sw) / 2;

        let alignY = 0;
        if (posY === 'top') alignY = -(H - sh) / 2;
        if (posY === 'bottom') alignY = (H - sh) / 2;

        // controlled movement
        const phase = t * (0.12 + idx * 0.04) * spd;
        const ox = Math.sin(phase * (0.6 + idx * 0.2)) * 8 * glitch * (isImageA ? 1 : -1);
        const oy = Math.cos(phase * (0.8 + idx * 0.3)) * 8 * glitch * (isImageA ? -1 : 1);

        ctx.save();
        ctx.translate(W / 2 + ox + alignX, H / 2 + oy + alignY);
        // small rotation that is smoothed and gentle
        const rads = ((rot * Math.PI) / 180) * (isImageA ? 1 : -0.8);
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

      // === NEW EFFECTS ===
      
      // Pixelation effect
      const pixelation = cur.current.pixelation + (audioReactive ? audioEnergy * 0.3 : 0);
      if (pixelation > 0.01) {
        try {
          const pixelSize = Math.max(1, Math.floor(2 + pixelation * 48));
          const smallW = Math.max(1, Math.floor(W / pixelSize));
          const smallH = Math.max(1, Math.floor(H / pixelSize));
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = smallW;
          tempCanvas.height = smallH;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(c, 0, 0, smallW, smallH);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, 0, 0, W, H);
            ctx.imageSmoothingEnabled = true;
          }
        } catch {}
      }

      // Ripple distortion effect
      const ripple = cur.current.ripple + (audioReactive ? bassEnergy * 0.4 : 0);
      if (ripple > 0.01) {
        try {
          const imgData = ctx.getImageData(0, 0, W, H);
          const data = imgData.data;
          const copy = new Uint8ClampedArray(data);
          const amplitude = ripple * 20;
          const frequency = 0.02 + ripple * 0.03;
          const centerX = W / 2;
          const centerY = H / 2;
          
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const dx = x - centerX;
              const dy = y - centerY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const wave = Math.sin(distance * frequency - t * 2) * amplitude;
              
              const sourceX = Math.floor(x + (dx / distance) * wave);
              const sourceY = Math.floor(y + (dy / distance) * wave);
              
              if (sourceX >= 0 && sourceX < W && sourceY >= 0 && sourceY < H) {
                const targetIdx = (y * W + x) * 4;
                const sourceIdx = (sourceY * W + sourceX) * 4;
                data[targetIdx] = copy[sourceIdx];
                data[targetIdx + 1] = copy[sourceIdx + 1];
                data[targetIdx + 2] = copy[sourceIdx + 2];
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {}
      }

      // Kaleidoscope effect
      const kaleidoscope = cur.current.kaleidoscope + (audioReactive ? midEnergy * 0.5 : 0);
      if (kaleidoscope > 0.01) {
        try {
          const segments = Math.max(2, Math.floor(3 + kaleidoscope * 9));
          const angleStep = (Math.PI * 2) / segments;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = W;
          tempCanvas.height = H;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(c, 0, 0);
            ctx.clearRect(0, 0, W, H);
            
            for (let i = 0; i < segments; i++) {
              ctx.save();
              ctx.translate(W / 2, H / 2);
              ctx.rotate(angleStep * i);
              ctx.scale(i % 2 ? 1 : -1, 1);
              ctx.globalAlpha = 0.7 + kaleidoscope * 0.3;
              ctx.drawImage(tempCanvas, -W / 2, -H / 2);
              ctx.restore();
            }
            ctx.globalAlpha = 1;
          }
        } catch {}
      }

      // Bloom/glow effect
      const bloom = cur.current.bloom + (audioReactive ? highEnergy * 0.6 : 0);
      if (bloom > 0.01) {
        try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = W;
          tempCanvas.height = H;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(c, 0, 0);
            const blurAmount = Math.floor(2 + bloom * 28);
            ctx.filter = `blur(${blurAmount}px) brightness(1.3)`;
            ctx.globalAlpha = 0.4 + bloom * 0.4;
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.filter = 'none';
          }
        } catch {}
      }

      // Motion blur effect (using echo frames)
      const motionBlur = cur.current.motionBlur + (audioReactive ? audioEnergy * 0.25 : 0);
      if (motionBlur > 0.01) {
        try {
          const currentFrame = ctx.getImageData(0, 0, W, H);
          const blurFrames = Math.min(3, Math.floor(1 + motionBlur * 4));
          
          if (prevFramesRef.current.length >= blurFrames) {
            ctx.globalAlpha = 0.3 + motionBlur * 0.5;
            for (let i = 0; i < blurFrames && i < prevFramesRef.current.length; i++) {
              ctx.putImageData(prevFramesRef.current[i], 0, 0);
            }
            ctx.globalAlpha = 1;
          }
          
          prevFramesRef.current.unshift(currentFrame);
          if (prevFramesRef.current.length > blurFrames) {
            prevFramesRef.current = prevFramesRef.current.slice(0, blurFrames);
          }
        } catch {}
      }

      // Echo/trail effect
      const echo = cur.current.echo + (audioReactive ? audioEnergy * 0.3 : 0);
      if (echo > 0.01 && prevFramesRef.current.length > 0) {
        try {
          ctx.globalAlpha = 0.15 + echo * 0.35;
          ctx.globalCompositeOperation = 'lighten';
          for (let i = 0; i < Math.min(3, prevFramesRef.current.length); i++) {
            ctx.putImageData(prevFramesRef.current[i], 0, 0);
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        } catch {}
      }

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
    targetBloom,
    targetMotionBlur,
    targetRipple,
    targetEcho,
    targetPixelation,
    targetKaleidoscope,
    audioReactive,
    audioSensitivity,
    blendMode,
    noiseOverlay,
    tintHue,
    speed,
    seed,
    autoshift,
    imageFitA,
    imageFitB,
    imagePositionXA,
    imagePositionXB,
    imagePositionYA,
    imagePositionYB,
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
    
    // Randomize new effects
    setTargetBloom(Math.random() * 0.6);
    setTargetMotionBlur(Math.random() * 0.5);
    setTargetRipple(Math.random() * 0.4);
    setTargetEcho(Math.random() * 0.5);
    setTargetPixelation(Math.random() * 0.3);
    setTargetKaleidoscope(Math.random() * 0.4);
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
    <div className="fixed inset-0 z-50 flex bg-black text-white">
      {/* Canvas - Full Screen Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />

      {/* Toggle Button - Always Visible */}
      <button
        onClick={() => setToolbarOpen(!toolbarOpen)}
        className={`fixed top-6 z-70 w-14 h-14 rounded-full bg-black/95 border-2 border-lime-400 hover:bg-lime-400/10 transition-all duration-300 flex items-center justify-center text-lime-400 hover:scale-110 backdrop-blur-xl shadow-lg shadow-lime-400/20 ${
          toolbarOpen ? "right-[21.5rem]" : "right-6"
        }`}
        title={toolbarOpen ? "Close Toolbar" : "Open Toolbar"}
      >
        <span className="text-2xl">{toolbarOpen ? "✕" : "⚙"}</span>
      </button>

      {/* Bottom Toolbar - Fixed at Bottom */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-60 transition-all duration-300 ${
        toolbarOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      }`}>
        <div className="rounded-full bg-black/95 border border-lime-400/30 px-6 py-3 text-sm flex items-center gap-3 backdrop-blur-xl">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="px-4 py-2 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center gap-2 border border-lime-400/30 hover:border-lime-400 text-xs"
            title="Play / Pause (Space)"
          >
            {playing ? "⏸" : "▶"} {playing ? "Pause" : "Play"}
          </button>
          
          <div className="h-8 w-px bg-lime-400/20"></div>
          
          <button
            onClick={handleScreenshot}
            className="px-4 py-2 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center gap-2 border border-lime-400/30 hover:border-lime-400 text-xs"
            title="Screenshot (S)"
          >
            📷 Screenshot
          </button>
          
          <button
            onClick={handleExportGif}
            disabled={!!exporting}
            className="px-4 py-2 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center gap-2 border border-lime-400/30 hover:border-lime-400 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
            title="Export GIF"
          >
            {exporting === "gif" ? "⏳ Exporting..." : "🎨 GIF"}
          </button>
          
          <button
            onClick={handleRecordWebm}
            disabled={!!exporting}
            className="px-4 py-2 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center gap-2 border border-lime-400/30 hover:border-lime-400 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
            title="Export Video"
          >
            {exporting === "webm" ? "⏳ Recording..." : "🎞 Video"}
          </button>

          <div className="h-8 w-px bg-lime-400/20"></div>

          <button
            onClick={handleRandomize}
            className="px-4 py-2 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center gap-2 border border-lime-400/30 hover:border-lime-400 text-xs"
            title="Randomize (R)"
          >
            🎲 Random
          </button>
        </div>
      </div>

      {/* Main Sidebar */}
      <div className={`absolute right-0 top-0 h-full w-80 bg-black/95 border-l border-lime-400/30 backdrop-blur-xl transition-all duration-300 flex flex-col ${
        toolbarOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Tab Navigation */}
        <div className="flex border-b border-lime-400/30 shrink-0">
          <button
            onClick={() => setActiveTab("effects")}
            className={`flex-1 px-4 py-3 text-xs font-medium transition ${
              activeTab === "effects"
                ? "bg-lime-400/10 text-lime-400 border-b-2 border-lime-400"
                : "text-neutral-500 hover:text-lime-400 hover:bg-lime-400/5"
            }`}
          >
            ✨ Effects
          </button>
          <button
            onClick={() => setActiveTab("images")}
            className={`flex-1 px-4 py-3 text-xs font-medium transition ${
              activeTab === "images"
                ? "bg-lime-400/10 text-lime-400 border-b-2 border-lime-400"
                : "text-neutral-500 hover:text-lime-400 hover:bg-lime-400/5"
            }`}
          >
            🖼️ Images
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex-1 px-4 py-3 text-xs font-medium transition ${
              activeTab === "export"
                ? "bg-lime-400/10 text-lime-400 border-b-2 border-lime-400"
                : "text-neutral-500 hover:text-lime-400 hover:bg-lime-400/5"
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
              <div className="space-y-3 bg-black/40 rounded-lg p-3 border border-lime-400/20">
                <h3 className="text-xs font-semibold text-lime-400 flex items-center gap-2">⚡ Glitch Effects</h3>
                
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
              <div className="space-y-3 bg-black/40 rounded-lg p-3 border border-lime-400/20">
                <h3 className="text-xs font-semibold text-lime-400 flex items-center gap-2">🎨 Visual Effects</h3>
                
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
              <div className="space-y-3 bg-black/40 rounded-lg p-3 border border-lime-400/20">
                <h3 className="text-xs font-semibold text-lime-400 flex items-center gap-2">🔄 Transform</h3>
                
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
              <div className="space-y-3 bg-black/40 rounded-lg p-3 border border-lime-400/20">
                <h3 className="text-xs font-semibold text-lime-400 flex items-center gap-2">🌈 Blend & Color</h3>
                
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

              {/* NEW EFFECTS Group */}
              <div className="space-y-3 bg-black/40 rounded-lg p-3 border border-lime-400/20">
                <h3 className="text-xs font-semibold text-lime-400 flex items-center gap-2">
                  ✨ Advanced Effects
                </h3>
                
                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Bloom/Glow <span className="text-white font-mono">{targetBloom.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={targetBloom}
                    onChange={(e) => setTargetBloom(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Motion Blur <span className="text-white font-mono">{targetMotionBlur.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={targetMotionBlur}
                    onChange={(e) => setTargetMotionBlur(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Ripple Distortion <span className="text-white font-mono">{targetRipple.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={targetRipple}
                    onChange={(e) => setTargetRipple(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Echo/Trail <span className="text-white font-mono">{targetEcho.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={targetEcho}
                    onChange={(e) => setTargetEcho(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Pixelation <span className="text-white font-mono">{targetPixelation.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={targetPixelation}
                    onChange={(e) => setTargetPixelation(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                    Kaleidoscope <span className="text-white font-mono">{targetKaleidoscope.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={targetKaleidoscope}
                    onChange={(e) => setTargetKaleidoscope(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Audio-Reactive Group */}
              <div className="space-y-3 bg-black/40 rounded-lg p-3 border border-lime-400/20">
                <h3 className="text-xs font-semibold text-lime-400 flex items-center gap-2">
                  🎵 Audio Reactive
                </h3>
                
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-neutral-400">Enable Microphone</label>
                  <button
                    onClick={() => setAudioReactive((v) => !v)}
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition ${
                      audioReactive ? "bg-lime-400/20 text-lime-400 border-lime-400" : "bg-black/50 text-neutral-500 border-neutral-700 hover:border-lime-400/50"
                    }`}
                  >
                    {audioReactive ? "ON" : "OFF"}
                  </button>
                </div>

                {audioReactive && (
                  <div>
                    <label className="text-[11px] text-neutral-400 flex justify-between mb-1">
                      Sensitivity <span className="text-white font-mono">{audioSensitivity.toFixed(2)}x</span>
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={audioSensitivity}
                      onChange={(e) => setAudioSensitivity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

                <p className="text-[10px] text-neutral-500 leading-relaxed">
                  {audioReactive 
                    ? "🎤 Effects respond to audio input. Higher sensitivity = stronger reactions."
                    : "Enable to modulate effects based on microphone input (bass, mid, high frequencies)."}
                </p>
              </div>

              {/* Presets */}
              <div className="space-y-3 bg-black/40 rounded-lg p-3 border border-lime-400/20">
                <h3 className="text-xs font-semibold text-lime-400">⚙️ Presets</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => applyPreset("glitchHeavy")}
                    className="px-3 py-2 rounded bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition text-xs font-medium border border-lime-400/30 hover:border-lime-400"
                  >
                    Glitch Heavy
                  </button>
                  <button
                    onClick={() => applyPreset("subtle")}
                    className="px-3 py-2 rounded bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition text-xs font-medium border border-lime-400/30 hover:border-lime-400"
                  >
                    Subtle
                  </button>
                  <button
                    onClick={() => applyPreset("cyberpunk")}
                    className="px-3 py-2 rounded bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition text-xs font-medium border border-lime-400/30 hover:border-lime-400"
                  >
                    Cyberpunk
                  </button>
                  <button
                    onClick={() => applyPreset("retro")}
                    className="px-3 py-2 rounded bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition text-xs font-medium border border-lime-400/30 hover:border-lime-400"
                  >
                    Retro VHS
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "images" && (
            <>
              {/* Image A */}
              <div 
                className={`space-y-3 bg-black/40 rounded-lg p-4 border transition-all ${
                  dragOver === "A" ? "border-lime-400 bg-lime-400/10" : "border-lime-400/20"
                }`}
                onDragOver={(e) => handleDragOver(e, "A")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "A")}
              >
                <h3 className="text-sm font-semibold text-lime-400 flex items-center gap-2">
                  🖼️ Image A
                  {dragOver === "A" && <span className="text-xs text-lime-300">(Drop here)</span>}
                </h3>
                
                {loadedImgs[0] && (
                  <div className="aspect-video bg-black rounded overflow-hidden border border-white/20">
                    <img 
                      src={imageA} 
                      alt="Image A Preview" 
                      style={{
                        objectFit: imageFitA,
                        objectPosition: `${imagePositionXA} ${imagePositionYA}`,
                      }}
                      className="w-full h-full"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setImageInputValue(imageA);
                    setShowImagePicker("A");
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium text-sm border border-lime-400/30 hover:border-lime-400"
                >
                  Change Image A
                </button>

                {/* Position Controls for Image A */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="space-y-2">
                    <label className="text-xs text-lime-400/80 uppercase tracking-wider block">Object Fit</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImageFitA('cover')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs transition-all ${
                          imageFitA === 'cover'
                            ? 'bg-lime-400 text-black font-semibold'
                            : 'bg-lime-400/10 text-lime-400/70 hover:bg-lime-400/20'
                        }`}
                      >
                        Cover
                      </button>
                      <button
                        onClick={() => setImageFitA('contain')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs transition-all ${
                          imageFitA === 'contain'
                            ? 'bg-lime-400 text-black font-semibold'
                            : 'bg-lime-400/10 text-lime-400/70 hover:bg-lime-400/20'
                        }`}
                      >
                        Contain
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-lime-400/80 uppercase tracking-wider block">Horizontal</label>
                    <div className="flex gap-2">
                      {(['left', 'center', 'right'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setImagePositionXA(pos)}
                          className={`flex-1 px-3 py-1.5 rounded text-xs capitalize transition-all ${
                            imagePositionXA === pos
                              ? 'bg-lime-400 text-black font-semibold'
                              : 'bg-lime-400/10 text-lime-400/70 hover:bg-lime-400/20'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-lime-400/80 uppercase tracking-wider block">Vertical</label>
                    <div className="flex gap-2">
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setImagePositionYA(pos)}
                          className={`flex-1 px-3 py-1.5 rounded text-xs capitalize transition-all ${
                            imagePositionYA === pos
                              ? 'bg-lime-400 text-black font-semibold'
                              : 'bg-lime-400/10 text-lime-400/70 hover:bg-lime-400/20'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-500">
                  Drag & drop JPG/PNG/GIF (animated) or click to browse
                </p>
              </div>

              {/* Image B */}
              <div 
                className={`space-y-3 bg-black/40 rounded-lg p-4 border transition-all ${
                  dragOver === "B" ? "border-lime-400 bg-lime-400/10" : "border-lime-400/20"
                }`}
                onDragOver={(e) => handleDragOver(e, "B")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "B")}
              >
                <h3 className="text-sm font-semibold text-lime-400 flex items-center gap-2">
                  🖼️ Image B
                  {dragOver === "B" && <span className="text-xs text-lime-300">(Drop here)</span>}
                </h3>
                
                {loadedImgs[1] && (
                  <div className="aspect-video bg-black rounded overflow-hidden border border-white/20">
                    <img 
                      src={imageB} 
                      alt="Image B Preview" 
                      style={{
                        objectFit: imageFitB,
                        objectPosition: `${imagePositionXB} ${imagePositionYB}`,
                      }}
                      className="w-full h-full"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setImageInputValue(imageB);
                    setShowImagePicker("B");
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium text-sm border border-lime-400/30 hover:border-lime-400"
                >
                  Change Image B
                </button>

                {/* Position Controls for Image B */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="space-y-2">
                    <label className="text-xs text-lime-400/80 uppercase tracking-wider block">Object Fit</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImageFitB('cover')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs transition-all ${
                          imageFitB === 'cover'
                            ? 'bg-lime-400 text-black font-semibold'
                            : 'bg-lime-400/10 text-lime-400/70 hover:bg-lime-400/20'
                        }`}
                      >
                        Cover
                      </button>
                      <button
                        onClick={() => setImageFitB('contain')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs transition-all ${
                          imageFitB === 'contain'
                            ? 'bg-lime-400 text-black font-semibold'
                            : 'bg-lime-400/10 text-lime-400/70 hover:bg-lime-400/20'
                        }`}
                      >
                        Contain
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-lime-400/80 uppercase tracking-wider block">Horizontal</label>
                    <div className="flex gap-2">
                      {(['left', 'center', 'right'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setImagePositionXB(pos)}
                          className={`flex-1 px-3 py-1.5 rounded text-xs capitalize transition-all ${
                            imagePositionXB === pos
                              ? 'bg-lime-400 text-black font-semibold'
                              : 'bg-lime-400/10 text-lime-400/70 hover:bg-lime-400/20'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-lime-400/80 uppercase tracking-wider block">Vertical</label>
                    <div className="flex gap-2">
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setImagePositionYB(pos)}
                          className={`flex-1 px-3 py-1.5 rounded text-xs capitalize transition-all ${
                            imagePositionYB === pos
                              ? 'bg-lime-400 text-black font-semibold'
                              : 'bg-lime-400/10 text-lime-400/70 hover:bg-lime-400/20'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-500">
                  Drag & drop JPG/PNG/GIF (animated) or click to browse
                </p>
              </div>

              <button
                onClick={handleSwapImages}
                className="w-full px-4 py-2.5 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium text-sm border border-lime-400/30 hover:border-lime-400"
              >
                🔁 Swap Images A ⇄ B
              </button>
            </>
          )}

          {activeTab === "export" && (
            <>
              <div className="space-y-4">
                <div className="bg-black/40 rounded-lg p-4 border border-lime-400/20">
                  <h3 className="text-sm font-semibold text-lime-400 mb-3">📷 Screenshot</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Capture the current frame as a high-quality PNG image
                  </p>
                  <button
                    onClick={handleScreenshot}
                    className="w-full px-4 py-3 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center justify-center gap-2 border border-lime-400/30 hover:border-lime-400"
                  >
                    📷 Take Screenshot
                  </button>
                  <p className="text-xs text-neutral-500 mt-2">Keyboard: Press <kbd className="px-1 py-0.5 bg-lime-400/10 border border-lime-400/20 rounded text-lime-400">S</kbd></p>
                </div>

                <div className="bg-black/40 rounded-lg p-4 border border-lime-400/20">
                  <h3 className="text-sm font-semibold text-lime-400 mb-3">🎨 Export GIF</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Record 8 frames at 10fps (512px, optimized for web)
                  </p>
                  <button
                    onClick={handleExportGif}
                    disabled={!!exporting}
                    className="w-full px-4 py-3 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center justify-center gap-2 border border-lime-400/30 hover:border-lime-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {exporting === "gif" ? "⏳ Exporting..." : "🎨 Export as GIF"}
                  </button>
                </div>

                <div className="bg-black/40 rounded-lg p-4 border border-lime-400/20">
                  <h3 className="text-sm font-semibold text-lime-400 mb-3">🎞 Export Video</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Record ~0.8s WebM video at 12fps (720px, high quality)
                  </p>
                  <button
                    onClick={handleRecordWebm}
                    disabled={!!exporting}
                    className="w-full px-4 py-3 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center justify-center gap-2 border border-lime-400/30 hover:border-lime-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {exporting === "webm" ? "⏳ Recording..." : "🎞 Export as Video"}
                  </button>
                </div>

                <div className="bg-black/40 rounded-lg p-4 border border-lime-400/20">
                  <h3 className="text-sm font-semibold text-lime-400 mb-3">🎲 Randomize</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Generate random effect parameters for inspiration
                  </p>
                  <button
                    onClick={handleRandomize}
                    className="w-full px-4 py-3 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition font-medium flex items-center justify-center gap-2 border border-lime-400/30 hover:border-lime-400"
                  >
                    🎲 Randomize All
                  </button>
                  <p className="text-xs text-neutral-500 mt-2">Keyboard: Press <kbd className="px-1 py-0.5 bg-lime-400/10 border border-lime-400/20 rounded text-lime-400">R</kbd></p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-lime-400/20 bg-black/80 shrink-0">
          <p className="text-[10px] text-lime-400 text-center">
            Space: Play/Pause • S: Screenshot • R: Random • W: Swap
          </p>
        </div>
      </div>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="bg-black/95 rounded-xl p-6 w-full max-w-md border border-lime-400/30">
            <h3 className="text-lg font-semibold mb-4 text-lime-400">
              Select Image {showImagePicker}
            </h3>
            
            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2 text-lime-400">
                Upload Local File
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, showImagePicker);
                }}
                className="w-full text-sm text-lime-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-lime-400/30 file:text-sm file:font-medium file:bg-lime-400/10 file:text-lime-400 hover:file:bg-lime-400/20 file:cursor-pointer"
              />
            </div>

            {/* URL Input */}
            <div className="mb-6">
              <label className="block text-xs font-medium mb-2 text-lime-400">
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
                placeholder="https://example.com/image.gif or /img/local.png"
                className="w-full px-3 py-2 border border-lime-400/30 rounded text-sm bg-black/60 text-lime-400 placeholder:text-neutral-600 focus:outline-none focus:border-lime-400"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Supports: JPG / PNG / GIF (animated), via http(s), relative paths, or data URLs
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImagePicker(null);
                  setImageInputValue("");
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-black/50 text-neutral-400 hover:bg-lime-400/10 hover:text-lime-400 transition border border-neutral-700 hover:border-lime-400/50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUrlInput(imageInputValue, showImagePicker)}
                className="flex-1 px-4 py-2 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition border border-lime-400/30 hover:border-lime-400 font-medium text-sm"
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
