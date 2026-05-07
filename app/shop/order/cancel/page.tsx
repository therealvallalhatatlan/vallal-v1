import Link from "next/link";

export default function ShopOrderCancelPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-neutral-900/90 rounded-2xl shadow-xl p-10 flex flex-col gap-8 items-center">
        <div className="text-6xl text-red-400 mb-2">✕</div>
        <h1 className="text-3xl font-black text-red-400 mb-2 text-center">Order cancelled</h1>
        <p className="text-lg text-neutral-300 text-center">Your payment was cancelled. No charges have been made. You can try again or return to the shop.</p>
        <Link href="/shop" className="mt-6 px-6 py-3 bg-lime-400 text-black font-black rounded-full text-lg shadow hover:bg-lime-300 transition-all">Back to shop</Link>
      </div>
    </main>
  );
}
