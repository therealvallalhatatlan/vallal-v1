// app/api/og/gyonta/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

// Strip ~~...~~ markup and [[...]] tangential notes from V.'s message
function stripMarkup(text: string): string {
  return text
    .replace(/~~([\s\S]+?)~~/g, "$1")
    .replace(/\[\[[\s\S]+?\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Pick font sizes so total content fits within ~420px usable height
// Usable = 630 - 80top - 80bottom - 76 header = ~394px; leave 20px buffer
function pickSizes(quoteLen: number, shadowLen: number): { qSize: number; sSize: number } {
  const total = quoteLen + shadowLen;
  if (total <= 80)  return { qSize: 40, sSize: 20 };
  if (total <= 160) return { qSize: 34, sSize: 18 };
  if (total <= 260) return { qSize: 28, sSize: 16 };
  if (total <= 380) return { qSize: 24, sSize: 15 };
  if (total <= 520) return { qSize: 20, sSize: 14 };
  if (total <= 700) return { qSize: 17, sSize: 13 };
  return { qSize: 15, sSize: 12 };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQ = searchParams.get("q") ?? "";
  const rawS = searchParams.get("s") ?? "";

  const quote = stripMarkup(rawQ);
  const shadow = rawS ? stripMarkup(rawS) : null;

  const { qSize, sSize } = pickSizes(quote.length, shadow?.length ?? 0);

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
          padding: "52px 88px 64px 104px",
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
            fontSize: `${qSize}px`,
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
          <p
            style={{
              marginTop: "20px",
              fontSize: `${sSize}px`,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.3)",
              maxWidth: "860px",
              borderLeft: "2px solid rgba(255,255,255,0.1)",
              paddingLeft: "16px",
              margin: "20px 0 0 0",
              wordBreak: "break-word",
              flexShrink: 0,
            }}
          >
            {shadow}
          </p>
        )}

        {/* Bottom right: site name */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            right: "56px",
            fontSize: "11px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.18)",
          }}
        >
          vallalhatatlan.online
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
