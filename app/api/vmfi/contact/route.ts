import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ContactBody = {
  name: string;
  email: string;
  role?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body: ContactBody = await request.json();

    if (!body?.name || !body?.email) {
      return NextResponse.json({ ok: false, error: "Missing name or email" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.from("vmfi_contacts").insert([
      {
        name: body.name,
        email: body.email,
        role: body.role || null,
        message: body.message || null,
      },
    ]);

    if (error) {
      console.error("vmfi contact insert error", error);
      return NextResponse.json({ ok: false, error: "DB_INSERT_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("vmfi contact route error", err);
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
  }
}
