import { NextResponse } from "next/server";

const COOKIE_NAME = process.env.SECRET_ACCESS_COOKIE_NAME ?? "secret_access";

export async function POST(req: Request) {
  const { password } = await req.json();

  const sharedPassword = process.env.SECRET_SHARED_PASSWORD;
  if (!sharedPassword) {
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  if (password !== sharedPassword) {
    return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set(COOKIE_NAME, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 nap
  });

  return res;
}
