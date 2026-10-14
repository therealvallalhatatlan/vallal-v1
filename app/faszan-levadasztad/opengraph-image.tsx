import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Faszán levadásztad! Vállalhatatlan vadászati jelentés"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#030504",
          color: "#f4f4f5",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage: "linear-gradient(rgba(163,230,53,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.075) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div style={{
          position: "absolute",
          inset: 24,
          border: "2px solid #395a24",
          display: "flex",
        }} />
        <div style={{
          position: "absolute",
          top: 24,
          left: 24,
          width: 48,
          height: 48,
          borderTop: "4px solid #b6ff6b",
          borderLeft: "4px solid #b6ff6b",
          display: "flex",
        }} />
        <div style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderBottom: "4px solid #b6ff6b",
          borderRight: "4px solid #b6ff6b",
          display: "flex",
        }} />
        <div style={{
          position: "absolute",
          left: 55,
          top: 54,
          display: "flex",
          color: "#b9ef79",
          fontSize: 20,
          letterSpacing: 7,
        }}>V. / HÁLÓZAT</div>

        <div style={{
          position: "absolute",
          right: 90,
          top: 70,
          width: 250,
          height: 360,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.98,
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 61,
            width: 58,
            height: 180,
            borderRadius: 60,
            background: "#d8dece",
            border: "4px solid #efffdc",
            transform: "rotate(-8deg)",
            display: "flex",
          }} />
          <div style={{
            position: "absolute",
            top: -4,
            right: 48,
            width: 60,
            height: 186,
            borderRadius: 60,
            background: "#d8dece",
            border: "4px solid #efffdc",
            transform: "rotate(8deg)",
            display: "flex",
          }} />
          <div style={{
            position: "absolute",
            top: 132,
            left: 35,
            width: 190,
            height: 190,
            borderRadius: "50%",
            background: "#d8dece",
            border: "5px solid #efffdc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              position: "absolute",
              top: 73,
              left: 25,
              width: 140,
              height: 13,
              display: "flex",
              background: "linear-gradient(90deg, #11150d 0%, #11150d 42%, transparent 42%, transparent 58%, #11150d 58%, #11150d 100%)",
              clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)",
            }} />
            <div style={{
              position: "absolute",
              left: 56,
              bottom: 42,
              width: 74,
              height: 26,
              display: "flex",
              borderBottom: "4px solid #6f7c65",
              borderRadius: "0 0 50% 50%",
            }} />
          </div>
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 26,
            width: 210,
            height: 90,
            background: "#f1f4e9",
            border: "3px solid #c6d1bb",
            clipPath: "polygon(24% 0, 76% 0, 100% 100%, 0 100%)",
            display: "flex",
          }} />
        </div>

        <div style={{
          position: "absolute",
          left: 64,
          top: 170,
          width: 720,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ color: "#a3e635", fontSize: 19, letterSpacing: 6, display: "flex" }}>
            MŰVELET SIKERES / ZSÁKMÁNY BIZTOSÍTVA
          </div>
          <div style={{
            marginTop: 38,
            display: "flex",
            flexDirection: "column",
            fontSize: 83,
            lineHeight: 0.99,
            fontWeight: 900,
            letterSpacing: -3,
            textTransform: "uppercase",
            color: "#eaffd1",
            textShadow: "5px 4px 0 #385b20",
          }}>
            <span>FASZÁN</span>
            <span style={{ color: "#d9f99d" }}>LEVADÁSZTAD!</span>
          </div>
          <div style={{ marginTop: 26, fontSize: 27, color: "#f4f4f5", display: "flex" }}>
            Ügyes vagy, tudsz róla?
          </div>
          <div style={{ marginTop: 34, fontSize: 18, color: "#8f9b88", letterSpacing: 3, display: "flex" }}>
            VALLALHATATLAN.ONLINE
          </div>
        </div>

        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 10,
          display: "flex",
          background: "linear-gradient(90deg, #a3e635, #67e8f9, #f0abfc, #a3e635)",
        }} />
      </div>
    ),
    { ...size },
  )
}
