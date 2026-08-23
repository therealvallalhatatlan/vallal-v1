import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ContactBody = {
  name: string;
  email: string;
  role?: string;
  message?: string;
};

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;
const emailTo = process.env.EMAIL_TO;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body: ContactBody = await request.json();

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 160) : "";
    const role = typeof body.role === "string" ? body.role.trim().slice(0, 120) : null;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : null;

    if (!name || !email) {
      return NextResponse.json({ ok: false, error: "Missing name or email" }, { status: 400 });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.from("vmfi_contacts").insert([
      {
        name,
        email,
        role,
        message,
      },
    ]);

    if (error) {
      console.error("vmfi contact insert error", error);
      return NextResponse.json({ ok: false, error: "DB_INSERT_FAILED" }, { status: 500 });
    }

    if (!resendApiKey || !emailFrom || !emailTo) {
      return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: emailFrom,
        to: [emailTo],
        replyTo: email,
        subject: "Új VMFI jelentkezés",
        text: `Név: ${name}\nEmail: ${email}\n Szerep: ${role ?? "-"}\n\nÜzenet:\n${message ?? "-"}`,
      });
    } catch (emailError) {
      console.error("VMFI email send failed", emailError);
      return NextResponse.json({ ok: false, error: "EMAIL_SEND_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("vmfi contact route error", err);
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
  }
}
