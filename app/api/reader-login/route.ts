// app/api/reader-login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const password = formData.get("password");
  const redirectTo = (formData.get("redirectTo") as string) || "/reader";

  const expected = process.env.READER_ACCESS_PASSWORD;

  if (!expected) {
    console.error("Hiányzik a READER_ACCESS_PASSWORD env változó.");
    return NextResponse.json(
      { error: "Belépés ideiglenesen nem lehetséges, hiányzó konfiguráció." },
      { status: 500 }
    );
  }

  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json(
      { error: "Hibás jelszó. Ellenőrizd, vagy kérj újat." },
      { status: 401 }
    );
  }

  const url = new URL(redirectTo, req.url);

  const res = NextResponse.redirect(url);

  // Brutál egyszerű session – csak azt tároljuk, hogy "átment a jelszó"
  res.cookies.set("reader_session", "granted", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 nap
  });

  return res;
}
