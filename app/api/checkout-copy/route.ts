import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { createCheckoutForCopy } from '../../../lib/reservations';
import type { CheckoutCopyRequest, CheckoutCopyResponse } from '../../../types/reservations';
import { getUserFromToken, parseBearerToken } from '@/lib/auth';
import { buildCheckoutMetadata } from '@/lib/stripeAttribution';

export async function POST(request: Request): Promise<Response> {
  try {
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('reservation_session_id')?.value;

    if (!sessionId) {
      sessionId = randomUUID();
      // Set cookie for future requests
      cookieStore.set('reservation_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    const body: CheckoutCopyRequest = await request.json();
    const token = parseBearerToken(request.headers);
    const authenticatedUser = token ? await getUserFromToken(token) : null;
    const deliveryMethod = body.delivery_method ?? 'dead-drop';
    const checkoutMetadata = await buildCheckoutMetadata(
      request as import('next/server').NextRequest,
      {
        copy_number: String(body.copy_number),
        project: 'vallalhatatlan',
        type: 'numbered_copy',
        product_id: 'numbered_copy',
        delivery_method: deliveryMethod,
      },
      {
        cartSummary: 'numbered-copy#' + String(body.copy_number) + 'x1|delivery:' + deliveryMethod,
        userUuid: authenticatedUser?.id ?? null,
      },
    );

    const result = await createCheckoutForCopy(
      body.copy_number,
      sessionId,
      deliveryMethod,
      authenticatedUser?.id ?? null,
      checkoutMetadata,
    );

    return Response.json(result);
  } catch (error) {
    console.error('Error creating checkout for copy:', error);
    const errorResponse: CheckoutCopyResponse = { success: false, error: 'Failed to create checkout' };
    return Response.json(errorResponse, { status: 500 });
  }
}