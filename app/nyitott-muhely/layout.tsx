// app/nyitott-muhely/layout.tsx
import { ReactNode } from 'react';

export default function NyitottMuhelyLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="antialiased overflow-x-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}
