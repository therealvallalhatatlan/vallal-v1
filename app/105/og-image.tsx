import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #181818 80%, #222233 100%)",
          fontFamily: 'VT323, monospace',
          color: "#bfff00",
          letterSpacing: "0.08em",
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute",
          top: 40,
          left: 60,
          fontSize: 48,
          color: "#bfff00",
          textShadow: "0 2px 12px #00fff7, 0 1px 0 #222, 0 0 2px #fff",
        }}>
          #105
        </div>
        <div style={{
          position: "absolute",
          top: 50,
          right: 60,
          fontSize: 28,
          color: "#00fff7",
          textShadow: "0 1px 8px #00fff7, 0 0 2px #fff",
        }}>
          Egyedi, dedikált példány
        </div>
        <div style={{
          marginTop: 120,
          fontSize: 36,
          color: "#fff",
          textAlign: "center",
          textShadow: "0 1px 8px #00fff7, 0 0 2px #fff",
        }}>
          A könyv és a dead drop kaland ára minden percben 100 forinttal drágul, az induló ár:
        </div>
        <div style={{
          marginTop: 60,
          fontSize: 90,
          color: "#bfff00",
          textShadow: "0 2px 16px #bfff00, 0 1px 0 #222",
          fontFamily: 'Share Tech Mono, monospace',
        }}>
          5000 Ft
        </div>
        <div style={{
          position: "absolute",
          bottom: 40,
          right: 60,
          fontSize: 32,
          color: "#fff",
          opacity: 0.7,
        }}>
          vallalhatatlan.online
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "VT323",
          data: await fetch(
            "https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2hsY.woff2"
          ).then((res) => res.arrayBuffer()),
          style: "normal",
        },
        {
          name: "Share Tech Mono",
          data: await fetch(
            "https://fonts.gstatic.com/s/sharetechmono/v16/J7aHnp1uDWRBEqV98dVQztYldFcLow.woff2"
          ).then((res) => res.arrayBuffer()),
          style: "normal",
        },
      ],
    }
  );
}
