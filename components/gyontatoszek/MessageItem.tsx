"use client";

import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import type { GyontatasMessage } from '@/lib/gyontatoszek/types';

interface MessageItemProps {
  message: GyontatasMessage;
  isStreaming?: boolean;
  thcLevel?: number;
  preThoughts?: string[];
  shadowText?: string;
  onShare?: (body: string, shadow?: string) => void;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Erratic ADHD half-thoughts shown while V is "typing"
const ADHD_THOUGHTS = [
  '...ezt a fost',
  '...várj',
  '...szóval izé',
  '... beszarok',
  '...eldől a fasz',
  '...ööö',
   '...hoppá',
  '...ööö',
  '...siess',
  '...kukát kivittem?',
  '...jaja de',
  '...faszomatmár',
  '...félbeszakít bazdmeg',
  '...hm hm',
   '...plöm pölöm',
   '...miafasz',
    '...ja értem',
  '...nem jut eszembe',
  '...fogd meg ezt',
  '...pillanat',
  '...szart se',
  '...hol van?',
  '...jó jó',
   '...mér ott nézed',
   '...gondolkodom',
  '...ezaz',
  '...figyelj már',
  '...várjál már',
];

function ErraticThinkingDots({ thoughts }: { thoughts?: string[] }) {
  const pool = thoughts && thoughts.length > 0 ? thoughts : ADHD_THOUGHTS;
  const [index, setIndex] = useState(() => Math.floor(Math.random() * pool.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setVisible(false);
      timeout = setTimeout(() => {
        setIndex((prev) => (prev + Math.floor(Math.random() * 4) + 1) % pool.length);
        setVisible(true);
        timeout = setTimeout(cycle, 700 + Math.random() * 700);
      }, 180);
    };
    timeout = setTimeout(cycle, 600 + Math.random() * 500);
    return () => clearTimeout(timeout);
  }, [pool.length]);

  return (
    <span
      className="font-mono text-[15px] text-lime-300/55 transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {pool[index]}
    </span>
  );
}

// Parse V's message body for ~~strikethrough~~ and [[tangential notes]]
function parseVBody(body: string): React.ReactNode {
  const regex = /~~([\s\S]+?)~~|\[\[([\s\S]+?)\]\]/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{body.slice(lastIndex, match.index)}</span>);
    }

    if (match[1] !== undefined) {
      // ~~strikethrough~~ — something V reconsidered mid-sentence
      nodes.push(
        <span
          key={key++}
          className="line-through decoration-red-400/50 text-neutral-500/60"
          aria-label={`[áthúzva: ${match[1]}]`}
        >
          {match[1]}
        </span>,
      );
    } else if (match[2] !== undefined) {
      // [[tangential note]] — an aside V couldn't hold back
      nodes.push(
        <span key={key++} className="text-[0.86em] italic text-neutral-500/65">
          {' '}[[{match[2]}]]
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    nodes.push(<span key={key++}>{body.slice(lastIndex)}</span>);
  }

  return nodes.length > 0 ? <>{nodes}</> : <>{body}</>;
}

function MessageItemComponent({ message, isStreaming = false, thcLevel = 0, preThoughts, shadowText, onShare }: MessageItemProps) {
  const isUser = message.sender_role === 'user';
  const isOptimistic = (message.metadata as Record<string, unknown> | null | undefined)?.optimistic === true;
  const doScramble = !isUser && thcLevel > 0.7 && isOptimistic;
  const isShadowPhase = !message.body && isStreaming && !isUser && !!shadowText;
  const [downloading, setDownloading] = useState(false);

  const showShareBtn = !isUser && !isStreaming && !!message.body && !!onShare;

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 10,
        ...(doScramble ? { filter: 'blur(5px)', letterSpacing: '0.18em' } : {}),
      }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: 'normal' }}
      transition={{ duration: doScramble ? 0.72 : 0.18, ease: 'easeOut' }}
      className={isUser ? 'ml-auto w-full max-w-[78%] md:max-w-[70%]' : 'group w-full max-w-[92%] md:max-w-[82%]'}
    >
      <div
        className={
          isUser
            ? 'rounded-[22px] bg-white/[0.04] px-4 py-3 text-neutral-200 ring-1 ring-white/6'
            : 'rounded-[24px] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent px-4 py-4 text-neutral-50'
        }
      >
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          <span className={isUser ? 'text-neutral-500' : 'text-lime-300/70'}>{isUser ? 'Te' : 'V'}</span>
          <span>{formatTimestamp(message.created_at)}</span>
        </div>

        {!isUser && shadowText && message.body ? (
          <details open={isStreaming} className="group mb-3">
            <summary className="cursor-pointer list-none text-[10px] text-neutral-600 transition hover:text-neutral-500 group-open:text-lime-300/40">
              V fej&eacute;ben &middot;&#9658;
            </summary>
            <p className="mt-1.5 border-l border-neutral-700/60 pl-2.5 text-sm italic leading-7 text-neutral-500/70">
              {shadowText}
            </p>
          </details>
        ) : null}

        <div
          className={
            isUser
              ? 'whitespace-pre-wrap text-[17px] leading-8 text-neutral-200/90 md:text-[19px] md:leading-9'
              : 'whitespace-pre-wrap text-[17px] leading-8 text-neutral-100 md:text-[19px] md:leading-9'
          }
        >
          {!message.body && isStreaming && !isUser ? (
            isShadowPhase ? (
              <span className="text-[15px] italic leading-8 text-neutral-500/60 transition-opacity duration-200">
                {shadowText}
              </span>
            ) : (
              <ErraticThinkingDots thoughts={preThoughts} />
            )
          ) : isUser ? (
            message.body
          ) : (
            parseVBody(message.body)
          )}
        </div>

        {!isUser && message.safety_flag && !isStreaming && (
          <div className="mt-4">
            <a
              href="https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-lime-300/10 px-5 py-2.5 text-[13px] font-medium text-lime-200 ring-1 ring-lime-300/25 transition hover:bg-lime-300/20 hover:ring-lime-300/40"
            >
              Megveszem a könyvet →
            </a>
          </div>
        )}

        {showShareBtn && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={downloading}
              title="Kártya letöltése"
              onClick={async () => {
                if (downloading) return;
                setDownloading(true);
                try {
                  await onShare!(message.body, shadowText);
                } finally {
                  setDownloading(false);
                }
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500 opacity-0 transition-all duration-200 hover:border-lime-300/25 hover:text-lime-300/70 group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-wait sm:opacity-0 max-sm:opacity-100"
            >
              {downloading ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-lime-300/40 border-t-transparent" />
              ) : (
                <Download size={11} />
              )}
              <span>kártya</span>
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export const MessageItem = memo(MessageItemComponent);

