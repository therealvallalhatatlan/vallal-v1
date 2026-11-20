import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, isAdminEmail, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ cellId: string }> },
) {
  const token = parseBearerToken(request.headers);
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { cellId } = await context.params;
  if (!isUuid(cellId)) return NextResponse.json({ error: "invalid_cell_id" }, { status: 400 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: existing, error: lookupError } = await db
    .from("distribution_cells")
    .select("id, pickup_enabled, pickup_public_name, pickup_area, pickup_description, pickup_sort_order")
    .eq("id", cellId)
    .maybeSingle();

  if (lookupError) {
    console.error("[admin/distribution/cells] pickup settings lookup failed", lookupError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: "cell_not_found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (typeof body.pickup_enabled === "boolean") updates.pickup_enabled = body.pickup_enabled;

  for (const [key, limit] of [
    ["pickup_public_name", 100],
    ["pickup_area", 120],
    ["pickup_description", 400],
  ] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string" || body[key].length > limit) {
        return NextResponse.json({ error: "invalid_" + key }, { status: 400 });
      }
      updates[key] = body[key].trim() || null;
    }
  }

  if (body.pickup_sort_order !== undefined) {
    const sortOrder = Number(body.pickup_sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
      return NextResponse.json({ error: "invalid_pickup_sort_order" }, { status: 400 });
    }
    updates.pickup_sort_order = sortOrder;
  }

  const enabled = typeof updates.pickup_enabled === "boolean"
    ? updates.pickup_enabled
    : existing.pickup_enabled;
  const publicName = typeof updates.pickup_public_name === "string"
    ? updates.pickup_public_name
    : existing.pickup_public_name;
  const area = typeof updates.pickup_area === "string"
    ? updates.pickup_area
    : existing.pickup_area;

  if (enabled && (!publicName?.trim() || !area?.trim())) {
    return NextResponse.json(
      { error: "pickup_public_name_and_area_required" },
      { status: 400 },
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  const { data: cell, error: updateError } = await db
    .from("distribution_cells")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", cellId)
    .select("id, code, name, city, status, pickup_enabled, pickup_public_name, pickup_area, pickup_description, pickup_sort_order")
    .single();

  if (updateError || !cell) {
    console.error("[admin/distribution/cells] pickup settings update failed", updateError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cell });
}
