'use client';

import { useEffect, useRef, useState } from 'react';
import type { BookCopy } from '@/types/reservations';
import { copyReservationApi } from '@/lib/copyReservationApi';

interface UseCopyReservationState {
  copies: BookCopy[];
  reservedCopy: BookCopy | null;
  remainingSeconds: number;
  loading: boolean;
  polling: boolean;
  error: string | null;
  reserveError: string | null;
}

interface UseCopyReservationActions {
  fetchInventory: () => Promise<void>;
  reserveCopy: (copyNumber: number) => Promise<void>;
  proceedToCheckout: () => Promise<string>;
  clearReservation: () => void;
  releaseReservation: () => Promise<void>;
  setReserveError: (error: string | null) => void;
}

export function useCopyReservation(): UseCopyReservationState & UseCopyReservationActions {
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [reservedCopy, setReservedCopy] = useState<BookCopy | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch inventory
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

  // Reserve a copy
  const reserveCopy = async (copyNumber: number) => {
    try {
      setReserveError(null);
      const copy = await copyReservationApi.reserveCopy(copyNumber);
      setReservedCopy(copy);

      // Calculate remaining time
      if (copy.reserved_until) {
        const expiresAt = new Date(copy.reserved_until).getTime();
        const now = Date.now();
        const secondsRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setRemainingSeconds(secondsRemaining);
      }

      // Refresh inventory to show updated status
      await fetchInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reserve copy';
      setReserveError(message);
    }
  };

  // Create checkout session
  const proceedToCheckout = async (): Promise<string> => {
    if (!reservedCopy) {
      throw new Error('No copy reserved');
    }
    return copyReservationApi.createCheckout(reservedCopy.copy_number);
  };

  // Clear reservation
  const clearReservation = () => {
    setReservedCopy(null);
    setRemainingSeconds(0);
  };

  // Release reservation via API
  const releaseReservation = async () => {
    try {
      await copyReservationApi.releaseCopy();
      clearReservation();
      // Refresh inventory after release
      await fetchInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to release copy';
      setReserveError(message);
    }
  };

  // Set up countdown timer
  useEffect(() => {
    if (!reservedCopy || remainingSeconds <= 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          return 0; // Just reach 0, don't clear the reservation
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [reservedCopy, remainingSeconds]);

  // Set up inventory polling every 5 seconds when not loading
  useEffect(() => {
    fetchInventory(); // Initial fetch

    pollIntervalRef.current = setInterval(async () => {
      setPolling(true);
      try {
        const data = await copyReservationApi.fetchInventory();
        setCopies(data);
      } catch (err) {
        console.error('Polling error:', err);
      } finally {
        setPolling(false);
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
    reservedCopy,
    remainingSeconds,
    loading,
    polling,
    error,
    reserveError,
    fetchInventory,
    reserveCopy,
    proceedToCheckout,
    clearReservation,
    releaseReservation,
    setReserveError,
  };
}
