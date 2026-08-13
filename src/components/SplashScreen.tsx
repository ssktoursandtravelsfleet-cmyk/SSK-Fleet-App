import React, { useEffect } from "react";
import { motion } from "motion/react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="flex-1 flex flex-col items-center justify-between p-8 pt-[max(2rem,env(safe-area-inset-top,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))] bg-[#08182D] text-white relative overflow-hidden select-none min-h-screen"
    >
      {/* Spacer top */}
      <div />

      {/* Center Brand Name & Logo */}
      <div className="flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mb-4"
        >
          <img
            src="/ssk_logo.png"
            alt="SSK Tours & Travels Logo"
            className="w-36 h-36 object-contain drop-shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D5A144] to-amber-200 uppercase font-sans">
            SSK TOURS & TRAVELS
          </h1>
          <p className="text-[10px] text-amber-200/60 font-bold uppercase tracking-[0.25em] mt-2">
            Fleet Management Portal
          </p>
        </motion.div>
      </div>

      {/* Footer Powered By & Progress Indicator */}
      <div className="w-full max-w-[200px] flex flex-col items-center gap-4">
        {/* Progress bar simulation */}
        <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.8, ease: "linear" }}
            className="h-full bg-gradient-to-r from-amber-400 to-[#D5A144]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-[9px] font-bold text-slate-400 tracking-wider uppercase text-center"
        >
          Secured SSK Cloud Ecosystem
        </motion.div>
      </div>
    </motion.div>
  );
}
