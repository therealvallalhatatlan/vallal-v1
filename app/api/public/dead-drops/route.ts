import { NextResponse } from "next/server";

import {
  DROP_SELECT_FIELDS,
  normalizeDeadDropRow,
} from "@/lib/deadDrops";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = supabaseAdmin();

    const [{ data: activeDrops, error: activeError }, { data: claimedDrops, error: claimedError }] =
      await Promise.all([
        db
          .from("drops")
          .select(DROP_SELECT_FIELDS)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        db
          .from("drops")
          .select(DROP_SELECT_FIELDS)
          .eq("status", "claimed")
          .order("claimed_at", { ascending: false })
          .limit(24),
      ]);

    if (activeError || claimedError) {
      console.error("[dead-drops] fetch error", activeError || claimedError);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      activeDrops: (activeDrops || []).map((row) => normalizeDeadDropRow(row as Record<string, unknown>)),
      claimedDrops: (claimedDrops || []).map((row) => normalizeDeadDropRow(row as Record<string, unknown>)),
    });
  } catch (error) {
    console.error("[dead-drops] server error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}