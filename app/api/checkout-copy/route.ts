import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { createCheckoutForCopy } from '../../../lib/reservations';
import type { CheckoutCopyRequest, CheckoutCopyResponse } from '../../../types/reservations';

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
    const result = await createCheckoutForCopy(body.copy_number, sessionId);

    return Response.json(result);
  } catch (error) {
    console.error('Error creating checkout for copy:', error);
    const errorResponse: CheckoutCopyResponse = { success: false, error: 'Failed to create checkout' };
    return Response.json(errorResponse, { status: 500 });
  }
}