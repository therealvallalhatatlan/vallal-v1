"use client";

import { SendHorizonal } from 'lucide-react';
import type { KeyboardEvent, RefObject } from 'react';
import { MAX_GYONTATAS_MESSAGE_LENGTH } from '@/lib/gyontatoszek/types';

interface ComposerProps {
  value: string;
  sending: boolean;
  loading: boolean;
  error: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function Composer({
  value,
  sending,
  loading,
  error,
  textareaRef,
  onChange,
  onSubmit,
  onKeyDown,
}: ComposerProps) {
  const isDisabled = sending || loading;

  return (
    <div className="border-t border-white/8 bg-gradient-to-t from-black via-black/95 to-black/70 px-3 pb-3 pt-3 md:px-6 md:pb-5">
      <div className="mx-auto max-w-4xl">
        <div className="retro-composer rounded-[26px] bg-white/[0.03] p-2 shadow-[0_-12px_40px_rgba(0,0,0,0.22)] ring-1 ring-white/8 backdrop-blur-xl">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={MAX_GYONTATAS_MESSAGE_LENGTH}
              disabled={isDisabled}
              rows={1}
              placeholder="Írj ide"
              className="max-h-48 min-h-[52px] flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[15px] leading-6 text-neutral-100 outline-none placeholder:text-neutral-500"
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={isDisabled || !value.trim()}
              aria-label="Kuldes"
              className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-lime-300/90 text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between px-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <span>Enter kuld • Shift+Enter uj sor</span>
            <span>
              {value.length}/{MAX_GYONTATAS_MESSAGE_LENGTH}
            </span>
          </div>
        </div>

        {error ? <p className="mt-2 px-2 text-sm text-rose-400">{error}</p> : null}
      </div>
    </div>
  );
}
