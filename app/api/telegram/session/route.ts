import { NextRequest, NextResponse } from "next/server";

import { createTelegramMiniAppSessionToken, TELEGRAM_MINI_APP_SESSION_COOKIE } from "@/lib/security/telegramMiniAppSession";
import { validateTelegramInitData } from "@/lib/security/telegram";

export const dynamic = "force-dynamic";

type SessionBootstrapBody = {
  initData?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SessionBootstrapBody;
    const initData = String(body.initData ?? "").trim();

    if (!initData) {
      return NextResponse.json({ error: "missing_init_data" }, { status: 400 });
    }

    const validation = validateTelegramInitData(initData);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const sessionToken = await createTelegramMiniAppSessionToken({
      userId: validation.payload.user.id,
      authDate: validation.payload.authDate,
      chatInstance: validation.payload.chatInstance,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: TELEGRAM_MINI_APP_SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60,
    });
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  } catch (error) {
    console.error('[telegram.session] bootstrap failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'session_bootstrap_failed' }, { status: 500 });
  }
}