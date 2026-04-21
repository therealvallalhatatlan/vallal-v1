interface NovellaMetaProps {
  title: string;
  order: number;
  readingTime: number;
}

export function NovellaMeta({ title, order, readingTime }: NovellaMetaProps) {
  return (
    <div className="mb-10 mt-8">
      {/* Supertitle */}
      <p
        className="mb-4 text-[11px] uppercase tracking-[0.35em]"
        style={{ color: 'rgba(163,230,53,0.55)' }}
      >
        Vállalhatatlan · {String(order).padStart(2, '0')}
      </p>

      {/* Title */}
      <h1
        className="text-[2.1rem] font-semibold leading-[1.18] tracking-[-0.01em] text-[#ede9e0] sm:text-[2.6rem]"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {title}
      </h1>

      {/* Divider + reading time */}
      <div className="mt-5 flex items-center gap-4">
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
        {readingTime > 0 && (
          <span className="text-[12px] text-neutral-600">{readingTime} perc olvasás</span>
        )}
      </div>
    </div>
  );
}
