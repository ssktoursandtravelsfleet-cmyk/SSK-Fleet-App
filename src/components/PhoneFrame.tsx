import React, { useEffect } from "react";

interface PhoneFrameProps {
  children: React.ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  useEffect(() => {
    // Attempt to request true full-screen immersive mode on launch if desired
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 overflow-x-hidden">
      <div className="flex-1 w-full flex flex-col relative overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
