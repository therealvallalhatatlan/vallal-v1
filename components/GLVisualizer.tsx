"use client";

import { useEffect, useRef, useState } from "react";

/* -----------------------------------------------
   Utility: load shader file from /public/shaders/
------------------------------------------------- */
async function loadText(path: string) {
  const res = await fetch(path);
  return res.text();
}

/* -----------------------------------------------
   Utility: create shader
------------------------------------------------- */
function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader error:", gl.getShaderInfoLog(shader));
    throw new Error("Shader compile failed");
  }

  return shader;
}

/* -----------------------------------------------
   Utility: create program
------------------------------------------------- */
function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string) {
  const program = gl.createProgram();
  if (!program) throw new Error("Cannot create program");

  const vs = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    throw new Error("Program link failed");
  }

  return program;
}

/* -----------------------------------------------
   Utility: load image as texture
------------------------------------------------- */
function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
  return new Promise((resolve) => {
    const tex = gl.createTexture()!;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      resolve(tex);
    };

    img.src = url;
  });
}

/* -----------------------------------------------
   Presets for effects
------------------------------------------------- */
const PRESETS = {
  neon: {
    u_glitch: 0.28,
    u_dispScale: 0.22,
    u_rgbSplit: 0.018,
    u_tintHue: 0.9,
    u_vignette: 0.14,
    u_mixAmount: 0.5,
  },
  vhs: {
    u_glitch: 0.09,
    u_dispScale: 0.05,
    u_rgbSplit: 0.006,
    u_tintHue: -0.25,
    u_vignette: 0.1,
    u_mixAmount: 0.38,
  },
  shatter: {
    u_glitch: 0.6,
    u_dispScale: 0.36,
    u_rgbSplit: 0.032,
    u_tintHue: 0.0,
    u_vignette: 0.28,
    u_mixAmount: 0.55,
  },
};

type UniformState = typeof PRESETS.neon;

export default function GLVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number | null>(null);

  const [uniforms, setUniforms] = useState<UniformState>(PRESETS.neon);

  /* Simple UI: switch between the 2 images */
  const [mix, setMix] = useState(0.0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }
    glRef.current = gl;

    let cancelled = false;
    let running = true;
    let vao: WebGLVertexArrayObject | null = null;
    let buf: WebGLBuffer | null = null;
    let texA: WebGLTexture | null = null;
    let texB: WebGLTexture | null = null;
    let texNoise: WebGLTexture | null = null;
    let start = performance.now();

    const stop = () => {
      running = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const onVis = () => {
      if (document.hidden) {
        stop();
      } else {
        if (!cancelled) {
          running = true;
          start = performance.now();
          rafRef.current = requestAnimationFrame(render);
        }
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };

    const render = () => {
      if (cancelled || !running) return;
      const t = (performance.now() - start) / 1000;

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const program = programRef.current;
      if (!program) return;
      gl.useProgram(program);

      // Bind textures
      if (texA) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texA);
      }
      if (texB) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texB);
      }
      if (texNoise) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texNoise);
      }

      // Uniforms
      gl.uniform1f(gl.getUniformLocation(program, "u_time"), t);
      gl.uniform1f(gl.getUniformLocation(program, "u_mixAmount"), mix);

      Object.entries(uniforms).forEach(([key, v]) => {
        const loc = gl.getUniformLocation(program, key);
        if (loc) gl.uniform1f(loc, v as number);
      });

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };

    (async () => {
      /* Load shaders */
      const vert = await loadText("/shaders/visualizer.vert");
      const frag = await loadText("/shaders/visualizer.frag");

      if (cancelled) return;

      const program = createProgram(gl, vert, frag);
      programRef.current = program;

      gl.useProgram(program);

      /* Fullscreen quad setup */
      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
      ]);

      vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);

      buf = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const loc = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      /* Load textures */
      texA = await loadTexture(gl, "/img/visuals/noise-17.jpg");
      texB = await loadTexture(gl, "/img/visuals/noise-18.jpg");
      texNoise = await loadTexture(gl, "/img/visuals/noise-map.png");

      if (cancelled) return;

      // Bind texture units
      gl.uniform1i(gl.getUniformLocation(program, "u_imgA"), 0);
      gl.uniform1i(gl.getUniformLocation(program, "u_imgB"), 1);
      gl.uniform1i(gl.getUniformLocation(program, "u_noise"), 2);

      resize();
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", onVis);
      rafRef.current = requestAnimationFrame(render);
    })();

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);

      try {
        if (texA) gl.deleteTexture(texA);
        if (texB) gl.deleteTexture(texB);
        if (texNoise) gl.deleteTexture(texNoise);
        if (buf) gl.deleteBuffer(buf);
        if (vao) gl.deleteVertexArray(vao);
        if (programRef.current) gl.deleteProgram(programRef.current);
      } catch {
        // ignore
      }
    };
  }, []);

  /* UI handler: apply preset */
  const applyPreset = (p: keyof typeof PRESETS) => {
    setUniforms(PRESETS[p]);
  };

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-black/50 text-white p-3 rounded-lg space-y-2 backdrop-blur">
        <div className="font-bold text-sm">Presets</div>

        <div className="flex gap-2">
          {Object.keys(PRESETS).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p as keyof typeof PRESETS)}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="pt-2">
          <label className="text-xs">Mix (A/B kép)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={mix}
            onChange={(e) => setMix(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="pt-2 text-xs opacity-70">
          Screenshot → jobb klikk → "Save image".  
          (Ha kell külön Hi-Res export gomb is, megírom.)
        </div>
      </div>
    </div>
  );
}
