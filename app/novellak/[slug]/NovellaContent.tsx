'use client';

import { motion } from 'framer-motion';

interface NovellaContentProps {
  text: string | null;
}

function renderParagraph(para: string, key: number) {
  const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Detect dialogue block: any line starting with - or —
  const isDialogue = lines.some((l) => /^[-—]/.test(l));

  const content = lines.map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ));

  if (isDialogue) {
    return (
      <p
        key={key}
        className="novella-dialogue"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.1875rem',
          lineHeight: 1.78,
          letterSpacing: '0.008em',
          color: '#d8d4cc',
          paddingLeft: '1.1rem',
          borderLeft: '2px solid rgba(255,255,255,0.07)',
          marginTop: '1.5rem',
          fontStyle: 'italic',
        }}
      >
        {content}
      </p>
    );
  }

  return (
    <p
      key={key}
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.1875rem',
        lineHeight: 1.78,
        letterSpacing: '0.008em',
        color: '#ddd9d1',
        marginTop: '1.6rem',
      }}
    >
      {content}
    </p>
  );
}

export function NovellaContent({ text }: NovellaContentProps) {
  if (!text) {
    return (
      <p
        className="py-16 text-center text-sm"
        style={{ color: '#555' }}
      >
        A novella tartalma nem elérhető.
      </p>
    );
  }

  // Split on double+ newlines to get paragraphs
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      aria-label="Novella szöveg"
    >
      {/* CSS reading progress bar */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          zIndex: 50,
          background: 'rgba(163,230,53,0.65)',
          transformOrigin: 'left',
          /* @ts-expect-error: CSS scroll-timeline is non-standard */
          animationTimeline: 'scroll(root)',
          animationName: 'reading-progress',
          animationDuration: '1ms',
          animationTimingFunction: 'linear',
          animationFillMode: 'both',
          transform: 'scaleX(0)',
        }}
      />
      <style>{`
        @keyframes reading-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      <div>
        {paragraphs.map((para, i) => renderParagraph(para, i))}
      </div>

      {/* End mark */}
      <div
        className="mt-16 flex items-center gap-4"
        aria-hidden="true"
      >
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span
          className="text-[11px] uppercase tracking-[0.3em]"
          style={{ color: 'rgba(163,230,53,0.4)' }}
        >
          vége
        </span>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </motion.section>
  );
}
