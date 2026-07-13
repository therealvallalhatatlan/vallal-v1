import type { Metadata } from "next";

import DeadDropApp from "@/components/dead-drops/DeadDropApp";
import {
  DROP_SELECT_FIELDS,
  normalizeDeadDropRow,
} from "@/lib/deadDrops";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = {
  title: "Dead Drop Feed",
  description: "Valos ideju dead-drop statuszfeed es anonim proof-of-find bekuldes.",
};

export const dynamic = "force-dynamic";

export default async function DeadDropPage() {
  const db = supabaseAdmin();

  const [{ data: activeDrops }, { data: claimedDrops }] = await Promise.all([
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

  return (
    <DeadDropApp
      initialActiveDrops={(activeDrops || []).map((row) => normalizeDeadDropRow(row as Record<string, unknown>))}
      initialClaimedDrops={(claimedDrops || []).map((row) => normalizeDeadDropRow(row as Record<string, unknown>))}
    />
  );
}