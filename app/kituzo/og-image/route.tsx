import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  // Példa: lekérdezési paraméterekből lehetne dinamikus szöveget generálni
  // const { searchParams } = new URL(request.url);
  // const title = searchParams.get("title") || "Vállalhatatlan kitűző";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          fontSize: 56,
          fontWeight: "bold",
          letterSpacing: -2,
        }}
      >
        <img
          src="https://vallalhatatlan.online/img/logo.png"
          width={120}
          height={120}
          style={{ marginBottom: 32 }}
        />
        <span style={{ fontSize: 48, color: "#a3e635", marginBottom: 16 }}>
          Vállalhatatlan kitűző
        </span>
        <span style={{ fontSize: 32, color: "#fff" }}>
          Egyedi badge, csak neked!
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
