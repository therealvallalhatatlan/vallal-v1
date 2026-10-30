import type { InventoryResponse, ReservationResponse, CheckoutCopyResponse, BookCopy, CheckoutDeliveryMethod } from '@/types/reservations';
import type { FoxpostPickupPoint } from '@/types/foxpost';

export const copyReservationApi = {
  async fetchInventory(): Promise<BookCopy[]> {
    const response = await fetch('/api/inventory');
    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }
    const data: InventoryResponse = await response.json();
    return data.copies;
  },

  async reserveCopy(copyNumber: number): Promise<BookCopy> {
    const response = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy_number: copyNumber }),
    });
    const data: ReservationResponse = await response.json();
    if (!data.success || !data.copy) {
      throw new Error(data.error || 'Failed to reserve copy');
    }
    return data.copy;
  },

  async createCheckout(
    copyNumber: number,
    deliveryMethod: CheckoutDeliveryMethod,
    pickupPoint: FoxpostPickupPoint | null,
  ): Promise<string> {
    const response = await fetch('/api/checkout-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        copy_number: copyNumber,
        delivery_method: deliveryMethod,
        ...(deliveryMethod === 'automata' && pickupPoint ? { pickup_point: pickupPoint } : {}),
      }),
    });
    const data: CheckoutCopyResponse = await response.json();
    if (!data.success || !data.url) {
      throw new Error(data.error || 'Failed to create checkout');
    }
    return data.url;
  },

  async releaseCopy(): Promise<void> {
    const response = await fetch('/api/release-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to release copy');
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to release copy');
    }
  },
};
