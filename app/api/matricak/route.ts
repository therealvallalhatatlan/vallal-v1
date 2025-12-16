import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;
const emailTo = process.env.EMAIL_TO || emailFrom;

if (!resendApiKey || !emailFrom || !emailTo) {
  // eslint-disable-next-line no-console
  console.warn("Resend env vars missing: RESEND_API_KEY, EMAIL_FROM, EMAIL_TO");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body.name || "").toString().trim().slice(0, 120);
    const email = (body.email || "").toString().trim().slice(0, 160);
    const message = (body.message || "").toString().trim().slice(0, 2000);

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    if (!resendApiKey || !emailFrom || !emailTo) {
      return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: emailFrom,
      to: [emailTo],
      subject: "Új matrica kérés",
      replyTo: email,
      text: `Név: ${name}\nEmail: ${email}\n\nÜzenet:\n${message}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Matricak email error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}