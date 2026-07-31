import React, { useEffect } from "react";

interface PhoneFrameProps {
  children: React.ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  useEffect(() => {
    // Attempt to request true full-screen immersive mode on launch
    const requestFullscreen = () => {
      try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if ((docEl as any).webkitRequestFullscreen) {
          (docEl as any).webkitRequestFullscreen().catch(() => {});
        } else if ((docEl as any).msRequestFullscreen) {
          (docEl as any).msRequestFullscreen().catch(() => {});
        }
      } catch (e) {
        // Ignore fullscreen policy restriction errors
      }
    };

    requestFullscreen();

    // Trigger on first user touch/click if browser blocks auto-fullscreen on launch
    const handleUserInteraction = () => {
      requestFullscreen();
    };

    window.addEventListener("touchstart", handleUserInteraction, { once: true });
    window.addEventListener("click", handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
    };
  }, []);

  return (
    <div className="w-full flex justify-center items-center py-0 min-h-screen bg-slate-900 md:bg-slate-950 transition-colors duration-300">
      {/* Phone container starting directly at the top edge with NO status bar - Medium Screen Size */}
      <div className="relative w-full max-w-[480px] h-full min-h-screen md:min-h-[860px] md:h-[860px] bg-slate-900 md:rounded-[44px] md:shadow-2xl md:border-[8px] md:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ring-1 ring-white/10">
        
        {/* Screen Content Wrapper - extends directly from the very top edge */}
        <div className="flex-1 w-full flex flex-col relative overflow-hidden bg-slate-50">
          {children}
        </div>

        {/* Bottom Home Indicator Line (only on medium screens and up) */}
        <div className="hidden md:flex w-full bg-transparent justify-center py-2 shrink-0 z-40 absolute bottom-0 left-0 right-0 pointer-events-none">
          <div className="w-32 h-1 bg-white/40 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
