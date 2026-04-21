import Image from 'next/image';

interface NovellaCoverProps {
  src: string | null;
  alt: string;
}

export function NovellaCover({ src, alt }: NovellaCoverProps) {
  if (!src) return null;
  return (
    <div className="relative mb-10 aspect-[4/3] w-full overflow-hidden sm:aspect-[16/7]">
      <Image
        src={src}
        alt={alt}
        fill
        priority={false}
        className="object-cover"
        sizes="(max-width: 680px) 100vw, 680px"
        onError={() => {/* gracefully hidden via CSS below */}}
      />
      {/* Bottom fade into page background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: 'linear-gradient(to bottom, transparent, #0c0c0c)',
        }}
      />
    </div>
  );
}
