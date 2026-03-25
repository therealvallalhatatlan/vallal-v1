import { fetchCopies } from '../../../lib/reservations';
import type { InventoryResponse } from '../../../types/reservations';

export async function GET(): Promise<Response> {
  try {
    const copies = await fetchCopies();
    const response: InventoryResponse = { copies };
    return Response.json(response);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return Response.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}