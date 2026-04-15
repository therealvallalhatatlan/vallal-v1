import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'V3 | Vállalhatatlan',
  description: 'A V3 felület új helye a Vállalhatatlan oldalon.',
  openGraph: {
    title: 'V3 | Vállalhatatlan',
    description: 'A V3 felület új helye a Vállalhatatlan oldalon.',
    url: 'https://www.vallalhatatlan.online/v3',
    images: [
      {
        url: '/og-gyontatoszek.png',
        width: 1200,
        height: 630,
        alt: 'V3 – Vállalhatatlan',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'V3 | Vállalhatatlan',
    description: 'A V3 felület új helye a Vállalhatatlan oldalon.',
    images: ['/og-gyontatoszek.png'],
  },
};
