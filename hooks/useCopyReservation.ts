'use client';

import { useEffect, useRef, useState } from 'react';
import type { BookCopy } from '@/types/reservations';
import { copyReservationApi } from '@/lib/copyReservationApi';

interface UseCopyReservationState {
  copies: BookCopy[];
  loading: boolean;
  error: string | null;
}

interface UseCopyReservationActions {
  fetchInventory: () => Promise<void>;
  createCheckout: (copyNumber: number) => Promise<string>;
}

export function useCopyReservation(): UseCopyReservationState & UseCopyReservationActions {
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInventory = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await copyReservationApi.fetchInventory();
      setCopies(data);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inventory';
      setError(message);
      setLoading(false);
    }
  };

  const createCheckout = async (copyNumber: number): Promise<string> => {
    return copyReservationApi.createCheckout(copyNumber);
  };

  // Inventory polling every 5 seconds
  useEffect(() => {
    fetchInventory();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await copyReservationApi.fetchInventory();
        setCopies(data);
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    copies,
    loading,
    error,
    fetchInventory,
    createCheckout,
  };
}
