"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const images = [
  { src: "/1.png", alt: "Kitűző 1" },
  { src: "/2.png", alt: "Kitűző 2" },
  { src: "/3.png", alt: "Kitűző 3" },
];

export default function KituzokPage() {
  const [current, setCurrent] = useState(0);
  const next = () => setCurrent((c) => (c + 1) % images.length);
  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);

  return (
    <>

      {/* Bal felső sarokban a logó */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 50 }}>
        <Link href="/">
          <Image
            src="/img/logo.png"
            alt="Vállalhatatlan logó"
            width={64}
            height={64}
            priority
            style={{ objectFit: "contain" }}
          />
        </Link>
      </div>

      <main className="bg-black flex flex-col items-center justify-center min-h-screen py-12 px-4">
        <Image
          src="/11.png"
          alt="Vállalhatatlan kitűző"
          width={322}
          height={259}
          className="mb-4 rounded-lg shadow-lg object-contain"
        />
        <h1 className="text-white text-4xl font-bold mb-4">Vállalhatatlan kitűző</h1>
        <Image
          src="/12.png"
          alt="Vállalhatatlan kitűző"
          width={300}
          height={300}
          className="mb-4 rounded-lg shadow-lg object-contain"
        />
        <div className="mb-2 text-3xl font-medium text-green-600/50">Ár: <span className="text-green-600 font-bold">1000 Ft</span></div>
        <p className="text-center max-w-xl text-2xl mb-6 text-gray-400">
          Bán Viki-féle Vállalhatatlan kitűzők basszátok meg!
        </p>
        <Link
          href="https://buy.stripe.com/cNi3cv7Z0cZaa0veIL8Ra0p"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-lime-400 hover:bg-lime-500 text-black uppercase font-semibold py-3 px-8 rounded-lg text-xl transition-colors shadow"
        >
          Kitűzőt kérek!
        </Link>
      </main>

      <div className="w-screen max-w-none h-[61.8vh] min-h-[180px] overflow-hidden">
        <video
          src="/videos/kituzo.mp4"
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Kitűzők videó háttér"
        />
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      </div>
    </>
  );
}
