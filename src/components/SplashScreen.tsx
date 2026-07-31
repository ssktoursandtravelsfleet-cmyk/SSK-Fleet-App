import React, { useEffect } from "react";
import { motion } from "motion/react";
import SSKLogo from "./SSKLogo";

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
      className="flex-1 flex flex-col items-center justify-between p-8 bg-[#08182D] text-white relative overflow-hidden select-none"
    >
      {/* Subtle ambient light source inside dark background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#D5A144]/5 blur-3xl rounded-full pointer-events-none" />

      {/* Spacer top */}
      <div />

      {/* Center Animated Logo and Brand Name */}
      <div className="flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 70,
            damping: 15,
            delay: 0.2
          }}
          className="relative mb-6"
        >
          {/* Outer glowing halo */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-4 bg-[#D5A144]/15 rounded-full blur-xl pointer-events-none"
          />
          <SSKLogo size={220} className="relative z-10" />
        </motion.div>

        {/* Brand Name Text with dynamic delay */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
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
