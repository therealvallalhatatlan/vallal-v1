import type { ReactNode } from 'react';
import BgVideo from '@/components/BgVideo';

export default function GyontatoszekLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-transparent">
      {/* Background video for gyontatoszek only */}
      <BgVideo mp4="/videos/video1.mp4" className="w-full h-full object-cover opacity-80 fixed inset-0 z-0" />

      {/* Page content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        {children}
      </div>
    </div>
  );
}
