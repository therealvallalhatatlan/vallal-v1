"use client";

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { GyontatasMessage } from '@/lib/gyontatoszek/types';

interface MessageItemProps {
  message: GyontatasMessage;
  isStreaming?: boolean;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessageItemComponent({ message, isStreaming = false }: MessageItemProps) {
  const isUser = message.sender_role === 'user';

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={isUser ? 'ml-auto w-full max-w-[78%] md:max-w-[70%]' : 'w-full max-w-[92%] md:max-w-[82%]'}
    >
      <div
        className={isUser ? 'rounded-[22px] bg-white/[0.04] px-4 py-3 text-neutral-200 ring-1 ring-white/6' : 'rounded-[24px] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent px-4 py-4 text-neutral-50'}
      >
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          <span className={isUser ? 'text-neutral-500' : 'text-lime-300/70'}>{isUser ? 'Te' : 'V'}</span>
          <span>{formatTimestamp(message.created_at)}</span>
        </div>

        <div
          className={isUser ? 'whitespace-pre-wrap text-[17px] leading-8 text-neutral-200/90 md:text-[19px] md:leading-9' : 'whitespace-pre-wrap text-[17px] leading-8 text-neutral-100 md:text-[19px] md:leading-9'}
        >
          {message.body || (isStreaming && !isUser ? <span className="inline-flex gap-1 text-lime-300/70"><span>•</span><span>•</span><span>•</span></span> : null)}
        </div>
      </div>
    </motion.article>
  );
}

export const MessageItem = memo(MessageItemComponent);
