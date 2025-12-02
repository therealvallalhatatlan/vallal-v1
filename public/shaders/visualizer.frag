#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_imgA;
uniform sampler2D u_imgB;
uniform sampler2D u_noise;

uniform float u_time;
uniform float u_mixAmount;   // 0 = A, 1 = B

// Effect controls (from presets)
uniform float u_glitch;      // 0–1: random offset jitter
uniform float u_dispScale;   // displacement intensity
uniform float u_rgbSplit;    // channel separation
uniform float u_tintHue;     // color shift
uniform float u_vignette;    // darkness on edges

/* --------------------------------------------
   Utils
-------------------------------------------- */

vec3 hueShift(vec3 color, float hue) {
    float angle = hue * 6.28318; // 2PI
    float s = sin(angle), c = cos(angle);

    mat3 m = mat3(
        0.299 + 0.701*c + 0.168*s,
        0.587 - 0.587*c + 0.330*s,
        0.114 - 0.114*c - 0.497*s,

        0.299 - 0.299*c - 0.328*s,
        0.587 + 0.413*c + 0.035*s,
        0.114 - 0.114*c + 0.292*s,

        0.299 - 0.300*c + 1.250*s,
        0.587 - 0.588*c - 1.050*s,
        0.114 + 0.886*c - 0.203*s
    );
    return clamp(color * m, 0.0, 1.0);
}

float vignette(vec2 uv, float strength) {
    float d = distance(uv, vec2(0.5));
    float v = smoothstep(0.8, strength + 0.8, d); 
    return 1.0 - v;
}

/* --------------------------------------------
   Main shader
-------------------------------------------- */

void main() {
    // Base UV
    vec2 uv = v_uv;

    // Noise texture warped by time (for displacement)
    float n = texture(u_noise, uv * 2.0 + vec2(u_time * 0.1, 0.0)).r;

    // Displacement
    vec2 disp = (vec2(n) - 0.5) * u_dispScale;
    uv += disp;

    // Glitch jitter
    float glitchR = (fract(sin(dot(uv * 120.0, vec2(12.9898, 78.233))) * 43758.5453123));
    float jitter = (glitchR - 0.5) * u_glitch * 0.1;

    uv.x += jitter;

    // RGB channel splitting
    vec2 r_uv = uv + vec2(u_rgbSplit, 0.0);
    vec2 g_uv = uv;
    vec2 b_uv = uv - vec2(u_rgbSplit, 0.0);

    // Sample two images with split channels
    vec3 colA = vec3(
        texture(u_imgA, r_uv).r,
        texture(u_imgA, g_uv).g,
        texture(u_imgA, b_uv).b
    );

    vec3 colB = vec3(
        texture(u_imgB, r_uv).r,
        texture(u_imgB, g_uv).g,
        texture(u_imgB, b_uv).b
    );

    // Mix images
    vec3 col = mix(colA, colB, u_mixAmount);

    // Hue shift
    col = hueShift(col, u_tintHue);

    // Vignette
    float v = vignette(v_uv, u_vignette);
    col *= v;

    outColor = vec4(col, 1.0);
}
