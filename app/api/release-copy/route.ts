import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { releaseCopy } from '../../../lib/reservations';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('reservation_session_id')?.value;

    if (!sessionId) {
      // If no session, nothing to release
      return Response.json({ success: true });
    }

    const result = await releaseCopy(sessionId);
    
    if (!result.success) {
      return Response.json(result, { status: 400 });
    }
    
    return Response.json(result);
  } catch (error) {
    console.error('Error releasing copy:', error);
    return Response.json(
      { success: false, error: 'Failed to release copy' },
      { status: 500 }
    );
  }
}
