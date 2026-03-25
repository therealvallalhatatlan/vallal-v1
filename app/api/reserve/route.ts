import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { reserveCopy } from '../../../lib/reservations';
import type { ReservationRequest, ReservationResponse } from '../../../types/reservations';

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

    const body: ReservationRequest = await request.json();
    const result = await reserveCopy(body.copy_number, sessionId);

    return Response.json(result);
  } catch (error) {
    console.error('Error reserving copy:', error);
    const errorResponse: ReservationResponse = { success: false, error: 'Failed to reserve copy' };
    return Response.json(errorResponse, { status: 500 });
  }
}