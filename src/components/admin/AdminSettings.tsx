import React, { useState, useEffect } from "react";
import { Settings, Database, RefreshCw, Sun, Moon, Info, ShieldCheck } from "lucide-react";
import { DISPLAY_VERSION, APP_VERSION } from "../../lib/version";

interface AdminSettingsProps {
  onRefreshAll: () => void;
  isRefreshing?: boolean;
}

export default function AdminSettings({ onRefreshAll, isRefreshing = false }: AdminSettingsProps) {
  const spreadsheetId = "1S2x_1I3fT4yD-4B-a...";

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem("ssk_dark_mode");
      if (savedTheme !== null) {
        return savedTheme === "true";
      }
      return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ssk_dark_mode", String(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.warn("Dark mode error:", e);
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 dark:bg-slate-950 min-h-screen text-[#333333] dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Admin Console Settings & Preferences</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Google Sheets database parameters, API connection status, and application dark mode customization.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0D47A1] dark:text-blue-300 font-extrabold text-xs shadow-xs border border-blue-200 dark:border-blue-800">
          {DISPLAY_VERSION}
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-w-2xl">
        {/* Settings Version Card */}
        <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-[#0D47A1] dark:text-blue-300 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Application Settings Version</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Defined in package.json manifest</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-[#0D47A1] text-white rounded-xl text-xs font-black shadow-xs">
            {DISPLAY_VERSION}
          </span>
        </div>

        {/* Dark Mode Card */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-100/80 dark:border-slate-700/80 flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-100 text-blue-700'
            }`}>
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Global Dark Mode</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                {isDarkMode ? 'Dark theme is active across all screens' : 'Switch to dark theme'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            role="switch"
            aria-checked={isDarkMode}
            title="Toggle Dark Mode"
          >
            <span className="sr-only">Toggle dark mode</span>
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
                isDarkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {isDarkMode ? (
                <Moon className="w-3.5 h-3.5 text-blue-900" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-200 dark:border-blue-900">
          <Database className="w-6 h-6 text-[#0D47A1] dark:text-blue-400 shrink-0" />
          <div>
            <h3 className="font-extrabold text-xs text-[#0D47A1] dark:text-blue-300">Connected Google Spreadsheet</h3>
            <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">ID: {spreadsheetId}</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl">
            <span className="font-bold text-slate-700 dark:text-slate-200">Firebase Authentication</span>
            <span className="px-2.5 py-1 font-bold text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              Active / Connected
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl">
            <span className="font-bold text-slate-700 dark:text-slate-200">Google Sheets OAuth Scope</span>
            <span className="px-2.5 py-1 font-bold text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              Read / Write Granted
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl">
            <span className="font-bold text-slate-700 dark:text-slate-200">Admin Role Enforcement</span>
            <span className="px-2.5 py-1 font-bold text-[10px] rounded-full bg-blue-100 dark:bg-blue-950 text-[#0D47A1] dark:text-blue-300">
              Strict Role-Based Access
            </span>
          </div>
        </div>

        <button
          onClick={onRefreshAll}
          disabled={isRefreshing}
          className="w-full py-2.5 bg-[#0D47A1] text-white font-bold text-xs rounded-xl hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Force Sync All Sheets & Cache</span>
        </button>

        {/* About Section */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">About SSK Travels Fleet App</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold">
                {DISPLAY_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Enterprise Fleet Operations Management Portal. Facilitates driver verification, document lock controls, vehicle allotment, weekly Hissab reconciliation, and live Google Sheets database synchronization.
            </p>
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
              <span>Package Build v{APP_VERSION}</span>
              <span>© {new Date().getFullYear()} SSK Travels</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
