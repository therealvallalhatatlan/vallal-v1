import { NextRequest, NextResponse } from "next/server";

import { getPreorderCampaignSummaryBySlug } from "@/lib/shop/preorderServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const summary = await getPreorderCampaignSummaryBySlug(slug);

    if (!summary) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}