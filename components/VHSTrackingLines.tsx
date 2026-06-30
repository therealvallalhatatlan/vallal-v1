"use client";

export default function VHSTrackingLines() {
  return (
    <div className="fixed inset-0 pointer-events-none z-51 overflow-hidden">
      {/* VHS tracking line 1 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-15 animate-vhs-track-1" />
      
      {/* VHS tracking line 2 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-300 to-transparent opacity-10 animate-vhs-track-2" style={{animationDelay: "0.8s"}} />
      
      {/* VHS tracking line 3 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-10 animate-vhs-track-1" style={{animationDelay: "1.5s"}} />
    </div>
  );
}
