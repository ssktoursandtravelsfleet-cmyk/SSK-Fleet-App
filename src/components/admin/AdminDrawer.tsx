import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  LayoutDashboard,
  UserCheck,
  FileCheck,
  Users,
  Car,
  TrendingUp,
  Receipt,
  Calendar,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { AdminScreen } from "../../types";
import { DISPLAY_VERSION } from "../../lib/version";
import SSKLogo from "../SSKLogo";

interface AdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: AdminScreen;
  onSelectScreen: (screen: AdminScreen) => void;
  onLogout: () => void;
  adminName?: string;
  adminMobile?: string;
  pendingDriverCount?: number;
  pendingDocCount?: number;
}

export default function AdminDrawer({
  isOpen,
  onClose,
  activeScreen,
  onSelectScreen,
  onLogout,
  adminName = "Admin Console",
  adminMobile = "Fleet Operations",
  pendingDriverCount = 0,
  pendingDocCount = 0
}: AdminDrawerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: AdminScreen.DASHBOARD,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: AdminScreen.DRIVER_VERIFICATION,
      label: "Driver Verification",
      icon: UserCheck,
      badge: pendingDriverCount > 0 ? pendingDriverCount : null
    },
    {
      id: AdminScreen.DOCUMENT_VERIFICATION,
      label: "Document Verification",
      icon: FileCheck,
      badge: pendingDocCount > 0 ? pendingDocCount : null
    },
    {
      id: AdminScreen.DRIVERS,
      label: "Drivers",
      icon: Users,
      badge: null
    },
    {
      id: AdminScreen.VEHICLES,
      label: "Vehicles",
      icon: Car,
      badge: null
    },
    {
      id: AdminScreen.EARNINGS,
      label: "Earnings",
      icon: TrendingUp,
      badge: null
    },
    {
      id: AdminScreen.OUTSTANDING,
      label: "Outstanding",
      icon: Receipt,
      badge: null
    },
    {
      id: AdminScreen.WEEKLY_HISSAB,
      label: "Weekly Hissab",
      icon: Calendar,
      badge: null
    },
    {
      id: AdminScreen.REPORTS,
      label: "Reports",
      icon: BarChart3,
      badge: null
    },
    {
      id: AdminScreen.NOTIFICATIONS,
      label: "Notifications",
      icon: Bell,
      badge: null
    },
    {
      id: AdminScreen.SETTINGS,
      label: "Settings",
      icon: Settings,
      badge: null
    }
  ];

  return (
    <>
      {/* Permanent Desktop Sidebar (lg screens >= 1024px) */}
      <aside
        className={`hidden lg:flex flex-col bg-[#0D47A1] text-white sticky top-0 h-screen transition-all duration-300 z-30 border-r border-blue-900 shrink-0 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Desktop Header */}
        <div className="p-4 bg-[#0A3880] flex items-center justify-between border-b border-blue-800 shrink-0 h-16">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <SSKLogo className="w-9 h-9 shrink-0 drop-shadow-md" />
              <div className="min-w-0">
                <h3 className="font-extrabold text-xs leading-tight text-white truncate">{adminName}</h3>
                <p className="text-[10px] text-blue-200 font-medium truncate">{adminMobile}</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <SSKLogo className="w-9 h-9 shrink-0 drop-shadow-md" />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-blue-800 text-blue-200 hover:text-white transition-colors cursor-pointer ml-1"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectScreen(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
                } py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-[#0D47A1] font-bold shadow-sm"
                    : "text-blue-100 hover:bg-blue-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#0D47A1]" : "text-blue-300"}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {item.badge !== null && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-sm shrink-0 ${
                      isCollapsed ? "absolute top-1 right-1" : ""
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop Footer */}
        <div className="p-3 border-t border-blue-800 bg-[#0A3880] space-y-2 shrink-0">
          <button
            onClick={onLogout}
            title={isCollapsed ? "Log Out Admin" : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? "justify-center px-2" : "gap-3 px-3.5"
            } py-2.5 rounded-xl text-rose-200 hover:bg-rose-600/20 hover:text-rose-100 font-semibold text-xs transition-colors cursor-pointer`}
          >
            <LogOut className="w-4 h-4 text-rose-300 shrink-0" />
            {!isCollapsed && <span>Log Out Admin</span>}
          </button>
          {!isCollapsed && (
            <div className="text-center text-[10px] font-mono text-blue-300/80 pt-0.5">
              SSK Fleet Portal • {DISPLAY_VERSION}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile / Tablet Overlay Drawer (< lg screens) */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Drawer Sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-[#0D47A1] text-white z-50 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 bg-[#0A3880] flex items-center justify-between border-b border-blue-800">
                <div className="flex items-center gap-3">
                  <SSKLogo className="w-10 h-10 shrink-0 drop-shadow-md" />
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-white">{adminName}</h3>
                    <p className="text-[10px] text-blue-200 font-medium">{adminMobile}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-blue-800 text-blue-200 hover:text-white transition-colors cursor-pointer"
                  title="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu List */}
              <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 no-scrollbar">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectScreen(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-white text-[#0D47A1] font-bold shadow-sm"
                          : "text-blue-100 hover:bg-blue-800/60 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? "text-[#0D47A1]" : "text-blue-300"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && item.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-sm">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer / Logout */}
              <div className="p-3 border-t border-blue-800 bg-[#0A3880] space-y-2">
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-200 hover:bg-rose-600/20 hover:text-rose-100 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-300" />
                  <span>Log Out Admin</span>
                </button>
                <div className="text-center text-[10px] font-mono text-blue-300/80 pt-1">
                  SSK Fleet Portal • {DISPLAY_VERSION}
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
