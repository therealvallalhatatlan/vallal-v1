// app/nyitott-muhely/page.tsx
import { LIVE_ENABLED } from '@/lib/live/events';
import NyitottMuhelyClient from '@/components/live/NyitottMuhelyClient';

export default function NyitottMuhelyPage() {
  if (!LIVE_ENABLED) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-2xl font-bold mb-4">A közvetítés jelenleg nem aktív.</div>
        <div className="text-lg text-gray-400">Kérjük, nézz vissza később!</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center">
      <NyitottMuhelyClient />
    </main>
  );
}
