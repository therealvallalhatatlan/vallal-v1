import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createCheckoutSession, getSiteUrl } from "@/lib/stripe";

type FilmSupportRequest = {
  novellaSlug: string;
  novellaTitle: string;
  amount: number;
  supporterName?: string | null;
};

type ApiResponse = {
  success: boolean;
  url?: string;
  error?: string;
};

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 500000;

function validateRequest(body: FilmSupportRequest): string | null {
  if (!body.novellaSlug || !body.novellaTitle) {
    return "Novella slug és cím szükséges.";
  }
  if (!Number.isFinite(body.amount) || body.amount < MIN_AMOUNT || body.amount > MAX_AMOUNT) {
    return `A támogatásnak ${MIN_AMOUNT}–${MAX_AMOUNT} Ft közé kell esnie.`;
  }
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: FilmSupportRequest = await request.json();
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json<ApiResponse>({ success: false, error: validationError }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error: insertError } = await supabase
      .from("film_supports")
      .insert([
        {
          novella_slug: body.novellaSlug,
          novella_title: body.novellaTitle,
          supporter_name: body.supporterName,
          amount: body.amount,
          currency: "huf",
          metadata: {
            project: "film_crowdfunding",
          },
        },
      ])
      .select("id")
      .single();

    if (insertError || !data) {
      console.error("film_support insert failed", insertError);
      return NextResponse.json<ApiResponse>({ success: false, error: "Nem sikerült elmenteni a támogatást." }, { status: 500 });
    }

    const metadata = {
      support_id: data.id,
      novella_slug: body.novellaSlug,
      novella_title: body.novellaTitle,
      supporter_name: body.supporterName || "",
    };

    const session = await createCheckoutSession({
      amount: body.amount,
      currency: "huf",
      successUrl: `${getSiteUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${getSiteUrl()}/cancelled`,
      productName: `Vállalhatatlan pilot – ${body.novellaTitle}`,
      metadata,
    });

    const { error: updateError } = await supabase
      .from("film_supports")
      .update({ stripe_session_id: session.sessionId, metadata: { ...metadata, stripe_session_id: session.sessionId } })
      .eq("id", data.id);

    if (updateError) {
      console.warn("film_supports stripe update failed", updateError);
    }

    return NextResponse.json<ApiResponse>({ success: true, url: session.url });
  } catch (error) {
    console.error("film support route error", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Sikertelen kérés" }, { status: 500 });
  }
}