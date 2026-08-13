import React from "react";
import { Menu, RefreshCw, ShieldCheck, UserCheck, Bell, ChevronLeft } from "lucide-react";
import { AdminScreen } from "../../types";

interface AdminHeaderProps {
  onOpenDrawer: () => void;
  activeScreen: AdminScreen;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onSwitchToDriverView?: () => void;
  titleOverride?: string;
}

export default function AdminHeader({
  onOpenDrawer,
  activeScreen,
  onRefresh,
  isRefreshing = false,
  onSwitchToDriverView,
  titleOverride
}: AdminHeaderProps) {
  const getScreenTitle = (screen: AdminScreen) => {
    switch (screen) {
      case AdminScreen.DASHBOARD:
        return "Admin Dashboard";
      case AdminScreen.DOCUMENT_VERIFICATION:
        return "Document Verification";
      case AdminScreen.DRIVERS:
        return "Driver Management";
      case AdminScreen.VEHICLES:
        return "Vehicle Management";
      case AdminScreen.EARNINGS:
        return "Earnings Summary";
      case AdminScreen.OUTSTANDING:
        return "Outstanding Management";
      case AdminScreen.WEEKLY_HISSAB:
        return "Weekly Hissab Admin";
      case AdminScreen.HISSAB_SUMMARY:
        return "Hissab Summary";
      case AdminScreen.REPORTS:
        return "Reports & Analytics";
      case AdminScreen.NOTIFICATIONS:
        return "Send Notifications";
      case AdminScreen.SETTINGS:
        return "Admin Settings";
      default:
        return "Admin Panel";
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0D47A1] text-white shadow-md border-b border-blue-900 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenDrawer}
          className="p-2 rounded-xl bg-blue-800/80 hover:bg-blue-700 text-white transition-colors focus:outline-none"
          title="Open admin navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/ssk_logo.png"
            alt="SSK Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-none text-white">
              {titleOverride || getScreenTitle(activeScreen)}
            </h1>
            <p className="text-[10px] text-blue-200 font-medium tracking-wide mt-0.5">
              SSK Fleet Admin Panel
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Switch to Driver View button if available */}
        {onSwitchToDriverView && (
          <button
            onClick={onSwitchToDriverView}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-800/80 hover:bg-blue-700 text-blue-100 text-[11px] font-semibold transition-colors"
            title="Switch to Driver View"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-200" />
            <span>Driver Mode</span>
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-blue-800/80 hover:bg-blue-700 text-white transition-colors focus:outline-none disabled:opacity-50"
          title="Refresh sheet data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-300" : "text-blue-100"}`} />
        </button>
      </div>
    </header>
  );
}
