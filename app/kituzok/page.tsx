"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const images = [
  { src: "/kituzo1.jpg", alt: "Kitűző 1" },
  { src: "/kituzo2.jpg", alt: "Kitűző 2" },
  { src: "/kituzo3.jpg", alt: "Kitűző 3" },
];

export default function KituzokPage() {
  const [current, setCurrent] = useState(0);
  const next = () => setCurrent((c) => (c + 1) % images.length);
  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-12 px-4">
      <h1 className="text-4xl font-bold mb-4">Vallalhatatlan Kitűzők</h1>
      <div className="relative w-80 h-80 mb-4 flex items-center justify-center">
        <button
          aria-label="Előző"
          onClick={prev}
          className="absolute left-0 z-10 bg-gray-200 hover:bg-gray-300 rounded-full p-2 shadow"
        >
          ◀
        </button>
        <Image
          src={images[current].src}
          alt={images[current].alt}
          width={320}
          height={320}
          className="rounded shadow-lg object-contain"
        />
        <button
          aria-label="Következő"
          onClick={next}
          className="absolute right-0 z-10 bg-gray-200 hover:bg-gray-300 rounded-full p-2 shadow"
        >
          ▶
        </button>
      </div>
      <div className="mb-2 text-lg font-medium">Ár: <span className="text-green-600 font-bold">1000 Ft</span></div>
      <p className="text-center max-w-xl mb-6 text-gray-700">
        Limitált kiadású, egyedi vallalhatatlan kitűzők. Tökéletes ajándék, vagy saját magadnak, hogy megmutasd, mire vagy büszke. Minden vásárlással a projektet támogatod.
      </p>
      <Link
        href="https://buy.stripe.com/test_4gwcNw0nA0gQb5KcMM"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-xl transition-colors shadow"
      >
        Kitűzőt kérek!
      </Link>
    </main>
  );
}
