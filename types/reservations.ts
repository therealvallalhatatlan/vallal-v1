export type CopyStatus = 'available' | 'reserved' | 'sold';

export interface BookCopy {
  id: string;
  copy_number: number;
  status: CopyStatus;
  reserved_until: string | null;
  reserved_by_session: string | null;
  stripe_checkout_session_id: string | null;
  price_override: number | null;
  order_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationRequest {
  copy_number: number;
}

export interface CheckoutCopyRequest {
  copy_number: number;
}

export interface CheckoutCopyResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ReservationResponse {
  success: boolean;
  copy?: BookCopy;
  error?: string;
}

export interface InventoryResponse {
  copies: BookCopy[];
}