import { NextResponse } from "next/server";
import { whitelistEmails } from "@/data/whitelistEmails";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  const exists = whitelistEmails.has(normalized);

  return NextResponse.json({ ok: exists });
}
