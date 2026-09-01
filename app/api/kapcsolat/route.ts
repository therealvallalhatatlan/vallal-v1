import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;
const emailTo = "therealvallalhatatlan@gmail.com";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 160) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    if (!resendApiKey || !emailFrom) {
      return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: emailFrom,
      to: [emailTo],
      replyTo: email,
      subject: `Kapcsolat: ${name}`,
      text: `Név: ${name}\nEmail: ${email}\n\nÜzenet:\n${message}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Kapcsolat email error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
