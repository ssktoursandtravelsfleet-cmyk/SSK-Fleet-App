import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, CheckCircle, Database } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
}

export default function PullToRefresh({ onRefresh, children, syncState }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Syncing latest data...");
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Status logs for realistic feel
  const statuses = [
    "Syncing latest data...",
    "Establishing handshake with SSK Travels Cloud...",
    "Querying active Uber, Ola & Rapido APIs...",
    "Updating daily fuel credits and outstanding balance...",
    "Validating RTO compliance documents...",
    "Consolidating ledger entries..."
  ];

  useEffect(() => {
    if (isRefreshing) {
      let step = 0;
      setSyncStatus(statuses[0]);
      const interval = setInterval(() => {
        step++;
        if (step < statuses.length) {
          setSyncStatus(statuses[step]);
        }
      }, 350);

      return () => clearInterval(interval);
    }
  }, [isRefreshing]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Only allow pull to refresh if we are at the top of the container scroll
    if (container.scrollTop === 0 && !isRefreshing) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0) {
      // Apply a resistance formula to make the pull feel natural
      const distance = Math.min(diff * 0.4, 80);
      setPullDistance(distance);
      
      // Prevent default scrolling behaviour when pulling
      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= 55) {
      triggerRefresh();
    } else {
      // Snap back
      setPullDistance(0);
    }
  };

  // Support Mouse Dragging as well for desktop previews
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop === 0 && !isRefreshing) {
      setStartY(e.clientY);
      setIsPulling(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.clientY;
    const diff = currentY - startY;

    if (diff > 0) {
      const distance = Math.min(diff * 0.4, 80);
      setPullDistance(distance);
    }
  };

  const handleMouseUp = () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= 55) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setPullDistance(60);

    try {
      await onRefresh();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("Refresh failed", err);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col overflow-y-auto no-scrollbar relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Pull down indicator bar */}
      <div 
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-75 overflow-hidden z-40"
        style={{ 
          height: `${pullDistance}px`,
          top: "0px",
          opacity: pullDistance > 10 ? 1 : 0
        }}
      >
        <div className="bg-[#0D47A1] text-white py-1.5 px-4 rounded-full shadow-lg border border-white/15 flex items-center gap-2 text-[10px] font-bold">
          <RefreshCw 
            className={`w-3 h-3 text-[#1E88E5] ${isRefreshing ? "animate-spin" : ""}`} 
            style={{ transform: `rotate(${pullDistance * 6}deg)` }}
          />
          <span>{pullDistance >= 55 ? "Release to Sync" : "Pull down to sync..."}</span>
        </div>
      </div>

      {/* Syncing Overlay screen */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#08182D]/95 z-50 flex flex-col items-center justify-center p-6 text-white text-center pointer-events-auto"
          >
            <div className="relative mb-5">
              <div className="w-16 h-16 border-4 border-[#1E88E5]/20 border-t-[#1E88E5] rounded-full animate-spin"></div>
              <Database className="w-6 h-6 text-[#1E88E5] absolute inset-0 m-auto" />
            </div>

            <h3 className="text-sm font-black uppercase tracking-wider text-white">SSK Database Sync</h3>
            <p className="text-[10px] text-blue-100 font-bold max-w-[240px] mt-2.5 h-10 leading-relaxed font-mono">
              {syncStatus}
            </p>

            <span className="text-[8px] uppercase tracking-widest text-slate-400 mt-6 font-bold">
              SSK Fleet Server v4.1.2
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Success Banner */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 10 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute left-1/2 -translate-x-1/2 bg-[#00C853] text-white px-4 py-2 rounded-full shadow-xl z-50 flex items-center gap-2 text-[10px] font-extrabold border border-white/10 pointer-events-none"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>SSK Fleet Synchronized!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Error Banner */}
      <AnimatePresence>
        {showError && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 10 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-2 rounded-full shadow-xl z-50 flex items-center gap-2 text-[10px] font-extrabold border border-white/10 pointer-events-none"
          >
            <span>⚠️ Unable to sync</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Small subtle Tap-to-Sync Pill at the very top of pages for convenience if drag fails */}
      <div className="w-full flex justify-center py-1.5 bg-[#0D47A1]/5 border-b border-slate-100 shrink-0 text-center select-none">
        <button
          onClick={triggerRefresh}
          className="text-[9px] font-bold text-slate-400 hover:text-[#1E88E5] transition-all flex items-center gap-1 bg-white border border-slate-100 py-0.5 px-3 rounded-full shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
          id="tap-to-sync-btn"
        >
          <RefreshCw className={`w-2.5 h-2.5 text-[#1E88E5] ${syncState === 'syncing' || isRefreshing ? 'animate-spin' : ''}`} />
          <span>
            {syncState === 'syncing' || isRefreshing
              ? "Syncing latest data..."
              : syncState === 'failed'
              ? "Unable to sync"
              : "Swipe down or Tap to Sync Database"}
          </span>
        </button>
      </div>

      {children}
    </div>
  );
}
