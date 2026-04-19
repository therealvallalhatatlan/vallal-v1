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

  const quote = truncate(stripMarkup(rawQ), 280);
  const shadow = rawS ? truncate(stripMarkup(rawS), 120) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "white",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          position: "relative",
          padding: "80px 96px 80px 112px",
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
            marginBottom: "44px",
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
            fontSize: quote.length > 160 ? "26px" : quote.length > 80 ? "32px" : "40px",
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.92)",
            margin: 0,
            fontWeight: 400,
            maxWidth: "920px",
            wordBreak: "break-word",
          }}
        >
          {quote}
        </p>

        {/* Shadow text — V.'s inner thought */}
        {shadow && (
          <p
            style={{
              marginTop: "28px",
              fontSize: "18px",
              lineHeight: 1.6,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.3)",
              maxWidth: "760px",
              borderLeft: "2px solid rgba(255,255,255,0.1)",
              paddingLeft: "16px",
              margin: "28px 0 0 0",
              wordBreak: "break-word",
            }}
          >
            {shadow}
          </p>
        )}

        {/* Bottom right: site name */}
        <div
          style={{
            position: "absolute",
            bottom: "44px",
            right: "64px",
            fontSize: "11px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.18)",
          }}
        >
          vallalhatatlan.online
        </div>

        {/* Bottom left: subtle quote mark watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            left: "64px",
            fontSize: "120px",
            lineHeight: 1,
            color: "rgba(163, 230, 53, 0.05)",
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
