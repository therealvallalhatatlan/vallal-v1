import { ImageResponse } from "next/og";
import {
  products,
  SHARED_TSHIRT_PREORDER_GOAL,
} from "@/lib/shop/products";

export const runtime = "edge";
export const alt = "Vállalhatatlan Shop";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

const pinCount = products.filter((product) => product.type === "pin").length;
const tshirtCount = products.filter(
  (product) => product.type === "men-shirt" || product.type === "women-shirt"
).length;
const minPrice = Math.min(...products.map((product) => product.price));
const maxPrice = Math.max(...products.map((product) => product.price));

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#050505",
          color: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top left, rgba(163,230,53,0.26), transparent 35%), radial-gradient(circle at bottom right, rgba(255,255,255,0.08), transparent 30%), linear-gradient(135deg, #050505 0%, #0e0e0e 45%, #111111 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 1px, transparent 1px, transparent 18px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 1px, transparent 1px, transparent 18px)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "56px 64px 48px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxWidth: "760px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    border: "1px solid rgba(163,230,53,0.45)",
                    background: "rgba(163,230,53,0.12)",
                    color: "#bef264",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Vállalhatatlan
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "rgba(245,245,245,0.75)",
                    fontSize: 24,
                  }}
                >
                  Shop drop
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 76,
                  lineHeight: 1,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  marginBottom: "18px",
                }}
              >
                Pólók, kitűzők, vállalhatatlan cuccok.
              </div>

              <div
                style={{
                  display: "flex",
                  maxWidth: "700px",
                  color: "rgba(245,245,245,0.82)",
                  fontSize: 30,
                  lineHeight: 1.3,
                }}
              >
                Limitált merch a shopban, közös póló előrendeléssel és azonnal vihető badge-ekkel.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: "12px",
                minWidth: "240px",
              }}
            >
              {[
                { label: "Póló", value: String(tshirtCount) },
                { label: "Kitűző", value: String(pinCount) },
                { label: "Előr. cél", value: `${SHARED_TSHIRT_PREORDER_GOAL} db` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "18px 20px",
                    borderRadius: "24px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 22,
                      color: "rgba(245,245,245,0.68)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 40,
                      fontWeight: 800,
                      color: "#bef264",
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderRadius: "999px",
                  background: "rgba(163,230,53,0.14)",
                  border: "1px solid rgba(163,230,53,0.28)",
                  color: "#d9f99d",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                Ár: {minPrice} - {maxPrice} Ft
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(245,245,245,0.84)",
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                /shop
              </div>
            </div>

            <div
              style={{
                display: "flex",
                width: "220px",
                height: "8px",
                borderRadius: "999px",
                background: "linear-gradient(90deg, rgba(163,230,53,0.2) 0%, #a3e635 100%)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}