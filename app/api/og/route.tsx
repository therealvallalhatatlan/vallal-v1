// app/api/og/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vállalhatatlan – OG";
export const contentType = "image/png";

// Helper: safe get visuals from /public/playlists/[slug].json
async function getVisuals(origin: string, slug?: string): Promise<string[]> {
  if (!slug) return [];
  try {
    const url = `${origin}/playlists/${encodeURIComponent(slug)}.json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    const arr: unknown = json?.visuals;
    if (Array.isArray(arr)) {
      return arr
        .filter((x): x is string => typeof x === "string" && x.length > 0)
        .map((x) => (x.startsWith("http") ? x : `${origin}${x.startsWith("/") ? "" : "/"}${x}`));
    }
    return [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const title = searchParams.get("title") || "Vállalhatatlan";
  const slug = searchParams.get("slug") || undefined;

  const visuals = (await getVisuals(origin, slug)).slice(0, 2);
  // if only one found or none, we still build glitch from the first (or fallback)
  const primary =
    visuals[0] ||
    `${origin}/img/visuals/noise-01.jpg`; // fallback that exists in your public dir (adjust if needed)
  const secondary =
    visuals[1] ||
    `${origin}/img/visuals/noise-02.jpg`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "black",
          color: "white",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        }}
      >
        {/* BACKGROUND: secondary visual faint + grain */}
        <img
          src={secondary}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.3,
            filter: "contrast(1.1) saturate(1.1) blur(0.3px)",
          }}
        />

        {/* GLITCH STACK from primary (three layers with RGB shift + bars) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            opacity: 0.95,
          }}
        >
          {/* base */}
          <img
            src={primary}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "contrast(1.15) saturate(1.2)",
            }}
          />
          {/* cyan channel offset */}
          <img
            src={primary}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "translateX(-4px)",
              mixBlendMode: "screen" as any,
              opacity: 0.55,
              filter: "hue-rotate(180deg) saturate(2)",
            }}
          />
          {/* red channel offset */}
          <img
            src={primary}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "translateX(3px)",
              mixBlendMode: "screen" as any,
              opacity: 0.45,
              filter: "hue-rotate(330deg) saturate(2)",
            }}
          />

          {/* Horizontal glitch bars (clip rectangles) */}
          {Array.from({ length: 12 }).map((_, i) => {
            const top = 10 + i * 48;
            const h = 18 + ((i * 7) % 10);
            const dx = i % 2 === 0 ? -6 : 6;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: dx,
                  top,
                  width: "100%",
                  height: h,
                  backdropFilter: "contrast(1.6) saturate(1.6) brightness(1.1)",
                  background:
                    i % 3 === 0
                      ? "rgba(163,230,53,0.05)"
                      : "rgba(0,0,0,0.08)",
                }}
              />
            );
          })}

          {/* subtle scanlines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0, rgba(0,0,0,.25) 1px, transparent 1px, transparent 3px)",
              opacity: 0.6,
            }}
          />
        </div>

        {/* TITLE BOX */}
        <div
          style={{
            position: "relative",
            padding: "24px 32px",
            borderRadius: 16,
            border: "1px solid rgba(163,230,53,.4)",
            background:
              "linear-gradient( to bottom, rgba(0,0,0,.7), rgba(0,0,0,.45) )",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,.4) inset, 0 10px 40px rgba(0,0,0,.5)",
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "rgb(190, 242, 100)",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Vállalhatatlan
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: -1,
              color: "white",
              textShadow:
                "2px 0 #ff0000, -2px 0 #00ffff, 0 0 14px rgba(163,230,53,.65)",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          {slug && (
            <div
              style={{
                marginTop: 10,
                color: "rgba(190,242,100,.85)",
                fontSize: 20,
                fontFamily: "inherit",
              }}
            >
              /{slug}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
