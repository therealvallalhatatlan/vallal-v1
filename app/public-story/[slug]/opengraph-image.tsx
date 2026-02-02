import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vállalhatatlan - Public Story";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default async function Image({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // Humanize the slug to get the title (same logic as in the API)
  const title = decodeURIComponent(slug)
    .replace(/^\d+-/, "")
    .replace(/-/g, " ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Grain texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,.03) 2px, rgba(255,255,255,.03) 4px)",
          }}
        />

        {/* Logo/Brand */}
        <div
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: "#a3e635",
            marginBottom: 40,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Vállalhatatlan
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: "#e5e5e5",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.2,
            padding: "0 60px",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#a3e635",
            marginTop: 40,
            opacity: 0.8,
          }}
        >
          10 perces hozzáférés
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, transparent 0%, #a3e635 50%, transparent 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
