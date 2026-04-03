import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Digitális Gyóntatószék | Vállalhatatlan',
  description: 'Lépj be a sötét, digitális gyóntatószékbe és Vállalhatatlan feloldoz téged',
  openGraph: {
    title: 'Digitális Gyóntatószék | Vállalhatatlan',
    description: 'Bánd meg bűneidet és szüless újra!',
    url: 'https://www.vallalhatatlan.online/gyontatoszek',
    images: [
      {
        url: '/og-gyontatoszek.png', // vagy .jpg, .webp
        width: 1200,
        height: 630,
        alt: 'Húsvéti Gyóntatószék – Vállalhatatlan',
      },
    ],
    type: 'website',
  },
  // Twitter card (opcionális)
  twitter: {
    card: 'summary_large_image',
    title: 'Digitális Gyóntatószék | Vállalhatatlan',
    description: 'Lépj be a sötét, digitális gyóntatószékbe és Vállalhatatlan feloldoz téged.',
    images: ['/og-gyontatoszek.png'],
  },
};