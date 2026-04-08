// app/nyitott-muhely/layout.tsx
import { ReactNode } from 'react';
import { Crimson_Pro, Inter } from 'next/font/google';

const crimson = Crimson_Pro({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans-reader',
});

export default function NyitottMuhelyLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${crimson.variable} ${inter.variable} antialiased overflow-x-hidden`}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}
