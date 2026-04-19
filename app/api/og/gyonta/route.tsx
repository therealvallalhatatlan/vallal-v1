// app/api/og/gyonta/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

// Strip ~~...~~ markup and [[...]] tangential notes from V.'s message
function stripMarkup(text: string): string {
  return text
    .replace(/~~([\s\S]+?)~~/g, "$1")
    .replace(/\[\[[\s\S]+?\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQ = searchParams.get("q") ?? "";
  const rawS = searchParams.get("s") ?? "";

  const quote = truncate(stripMarkup(rawQ), 260);
  const shadow = rawS ? truncate(stripMarkup(rawS), 400) : null;

  // Adaptive quote font size based on length
  const quoteFontSize = quote.length > 180 ? "24px" : quote.length > 100 ? "29px" : "36px";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          background: "#0a0a0a",
          color: "white",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          position: "relative",
          padding: "60px 96px 80px 112px",
          overflow: "hidden",
        }}
      >
        {/* Left lime border accent */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "5px",
            background: "rgba(163, 230, 53, 0.75)",
          }}
        />

        {/* Top: V. label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "32px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "13px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "rgba(163, 230, 53, 0.75)",
            }}
          >
            V.
          </span>
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.2)",
            }}
          >
            Vállalhatatlan
          </span>
        </div>

        {/* Quote */}
        <p
          style={{
            fontSize: quoteFontSize,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.92)",
            margin: 0,
            fontWeight: 400,
            maxWidth: "980px",
            wordBreak: "break-word",
            flexShrink: 0,
          }}
        >
          {quote}
        </p>

        {/* Shadow text — V.'s inner thought */}
        {shadow && (
          <div
            style={{
              marginTop: "24px",
              borderLeft: "2px solid rgba(255,255,255,0.12)",
              paddingLeft: "18px",
              maxWidth: "900px",
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.65,
                fontStyle: "italic",
                color: "rgba(255,255,255,0.28)",
                margin: 0,
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {shadow}
            </p>
          </div>
        )}

        {/* Bottom right: site name */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "64px",
            fontSize: "11px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.15)",
          }}
        >
          vallalhatatlan.online
        </div>

        {/* Bottom left: subtle quote mark watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "64px",
            fontSize: "110px",
            lineHeight: 1,
            color: "rgba(163, 230, 53, 0.04)",
            fontFamily: "serif",
          }}
        >
          "
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
