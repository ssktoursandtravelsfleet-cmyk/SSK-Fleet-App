import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  ChevronRight,
  Car,
  AlertTriangle,
  Wallet,
  Fuel,
  TrendingUp,
  CreditCard,
  UserCheck,
  CheckCircle2,
  X,
  Menu,
  Info
} from "lucide-react";
import { DriverDetails, NotificationItem, VehicleDocument, TransactionItem } from "../types";
import { mockVehicleDetails } from "../data";
import PullToRefresh from "./PullToRefresh";

interface DashboardScreenProps {
  driver: DriverDetails;
  notifications: NotificationItem[];
  documents: VehicleDocument[];
  transactions: TransactionItem[];
  onNavigateToTab: (tab: "dashboard" | "vehicle") => void;
  onNavigateToPayment?: (data: { paymentType: string; amount: number }) => void;
  onMarkNotificationRead: (id: string) => void;
  onRefresh: () => Promise<void>;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
  onOpenDrawer: () => void;
  outstandingAmount?: number | string;
  lastWeekOutstanding?: number | string;
  weeklyRent?: number | string;
  currentOutstanding?: number | string;
  totalOutstanding?: number | string;
}

export default function DashboardScreen({
  driver,
  notifications,
  documents,
  transactions,
  onNavigateToTab,
  onNavigateToPayment,
  onMarkNotificationRead,
  onRefresh,
  syncState,
  onOpenDrawer,
  outstandingAmount,
  lastWeekOutstanding,
  weeklyRent: weeklyRentProp,
  currentOutstanding,
  totalOutstanding: totalOutstandingProp,
}: DashboardScreenProps) {
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  // Custom states matching requested financials
  const [lastWeekOutstandingAmt, setLastWeekOutstandingAmt] = useState<number | string>(lastWeekOutstanding !== undefined ? lastWeekOutstanding : 0);
  const [weeklyRentAmt, setWeeklyRentAmt] = useState<number | string>(weeklyRentProp !== undefined ? weeklyRentProp : 0);
  const [currentOutstandingAmt, setCurrentOutstandingAmt] = useState<number | string>(currentOutstanding !== undefined ? currentOutstanding : 0);
  const [totalOutstandingAmt, setTotalOutstandingAmt] = useState<number | string>(
    totalOutstandingProp !== undefined ? totalOutstandingProp : (outstandingAmount !== undefined ? outstandingAmount : 0)
  );

  // Sync outstanding amounts when props change
  React.useEffect(() => {
    if (lastWeekOutstanding !== undefined) {
      setLastWeekOutstandingAmt(lastWeekOutstanding);
    }
  }, [lastWeekOutstanding]);

  React.useEffect(() => {
    if (weeklyRentProp !== undefined) {
      setWeeklyRentAmt(weeklyRentProp);
    }
  }, [weeklyRentProp]);

  React.useEffect(() => {
    if (currentOutstanding !== undefined) {
      setCurrentOutstandingAmt(currentOutstanding);
    }
  }, [currentOutstanding]);

  React.useEffect(() => {
    if (totalOutstandingProp !== undefined) {
      setTotalOutstandingAmt(totalOutstandingProp);
    } else if (outstandingAmount !== undefined) {
      setTotalOutstandingAmt(outstandingAmount);
    }
  }, [totalOutstandingProp, outstandingAmount]);

  // Unread notifications count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Warning document check (e.g. PUC warning)
  const warningDocs = documents.filter((doc) => doc.status === "warning" || doc.status === "expired");

  // Debug logs
  React.useEffect(() => {
    console.log("Dashboard Driver ETM:", driver?.etm);
    console.log("Dashboard Driver Mobile:", driver?.phone);
    console.log("Dashboard Last Week OS:", lastWeekOutstandingAmt);
    console.log("Dashboard Rent:", weeklyRentAmt);
    console.log("Dashboard Current OS:", currentOutstandingAmt);
    console.log("Dashboard Total OS:", totalOutstandingAmt);
  }, [driver, lastWeekOutstandingAmt, weeklyRentAmt, currentOutstandingAmt, totalOutstandingAmt]);

  const getStatusDisplay = () => {
    const s = (driver.Status || driver.status || "").trim();
    if (!s) return "Unknown";
    const lower = s.toLowerCase();
    if (lower === "active") return "🟢 Active";
    if (lower === "inactive") return "🔴 Inactive";
    if (lower === "suspended") return "🟠 Suspended";
    return s;
  };

  const parseRawVal = (val: number | string | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === "number") return val;
    const clean = String(val).replace(/[^0-9.-]/g, "").trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const isPayable = (val: number | string | undefined): boolean => {
    return parseRawVal(val) < 0;
  };

  const getPayableAmt = (val: number | string | undefined): number => {
    const raw = parseRawVal(val);
    return raw < 0 ? Math.abs(raw) : 0;
  };

  const handlePayNow = (paymentType: string, val: number | string | undefined) => {
    const amt = getPayableAmt(val);
    if (onNavigateToPayment) {
      onNavigateToPayment({ paymentType, amount: amt });
    } else {
      onNavigateToTab("dashboard");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FA] dark:bg-slate-950 relative overflow-hidden text-[#333333] dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. Header Profile & Online Toggle */}
      <div className="bg-[#0D47A1] dark:bg-slate-900 text-white px-5 sm:px-8 pt-5 pb-6 lg:rounded-3xl shadow-md shrink-0 relative border-b border-white/10 lg:m-6 lg:mb-2">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDrawer}
              className="lg:hidden p-1.5 hover:bg-white/10 active:scale-95 rounded-lg transition-all text-white cursor-pointer -ml-1 mr-1"
              title="Open Menu"
              id="btn-open-menu-dashboard"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <div>
              <p className="text-[10px] sm:text-xs text-blue-200 font-semibold tracking-wider uppercase leading-none">Welcome Back</p>
              <h3 className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight text-white mt-1 leading-none">{driver.Name || driver.Driver_Name || driver.name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20 shadow-sm inline-flex items-center gap-1"
              id="status-badge-dashboard"
            >
              {getStatusDisplay()}
            </span>

            {/* Notifications Icon */}
            <button
              onClick={() => setShowNotificationsPanel(true)}
              className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              id="header-notifications-btn"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[8px] font-black rounded-full flex items-center justify-center border-2 border-[#0D47A1]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Registered Vehicle Info Overlay */}
        <div
          onClick={() => onNavigateToTab("vehicle")}
          className="mt-4 bg-white/10 rounded-2xl p-3.5 border border-white/10 flex justify-between items-center cursor-pointer hover:bg-white/15 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {driver.vehicleRegistration || mockVehicleDetails.model}
              </h4>
              <p className="text-[10px] text-blue-100 font-medium mt-0.5 uppercase tracking-wider">
                {mockVehicleDetails.fuelType}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[9px] font-mono font-bold bg-[#1E88E5] text-white px-2 py-0.5 rounded border border-white/20">
              {driver.vehicleRegistration || mockVehicleDetails.registrationNo}
            </span>
          </div>
        </div>

        {/* Driver Profile Metadata Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2 bg-black/15 rounded-xl p-2.5 border border-white/5 shadow-inner">
          <div className="text-center">
            <span className="text-[8px] text-blue-200 block font-bold uppercase tracking-wider">Name</span>
            <span className="text-[10px] text-white font-extrabold truncate max-w-full block mt-0.5" title={driver.Name || driver.Driver_Name || driver.name}>
              {driver.Name || driver.Driver_Name || driver.name}
            </span>
          </div>
          <div className="text-center border-x border-white/10">
            <span className="text-[8px] text-blue-200 block font-bold uppercase tracking-wider">Vehicle</span>
            <span className="text-[10px] text-white font-extrabold truncate max-w-full block mt-0.5" title={driver.vehicleRegistration || "N/A"}>
              {driver.vehicleRegistration || "N/A"}
            </span>
          </div>
          <div className="text-center">
            <span className="text-[8px] text-blue-200 block font-bold uppercase tracking-wider">ETM</span>
            <span className="text-[10px] text-white font-extrabold truncate max-w-full block mt-0.5" title={driver.etm || "N/A"}>
              {driver.etm || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* PullToRefresh Wrapper */}
      <PullToRefresh onRefresh={onRefresh} syncState={syncState}>
        <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-24 flex-1 max-w-7xl mx-auto w-full">
        
        {/* Inactive Account Information Banner */}
        {(driver.Status || driver.status || "").trim().toLowerCase() === "inactive" && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/60 rounded-xl flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <Info className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200">Account Notice</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug font-semibold">
                Your account is currently inactive, but you can continue using the app.
              </p>
            </div>
          </div>
        )}

        {/* Compliance Warning Badge */}
        {warningDocs.length > 0 && (
          <div className="mb-4 bg-rose-50 border border-rose-100 rounded-2xl p-3 flex items-start justify-between shadow-xs">
            <div className="flex gap-2.5">
              <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-800">Action Required</p>
                <p className="text-[10px] text-rose-600 mt-0.5 leading-relaxed font-semibold">
                  Emission Certificate (PUC) needs renewal. Please upload renewed proof to keep your route active.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab("vehicle")}
              className="shrink-0 ml-1.5 text-[9px] bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2 rounded-lg transition-all self-center cursor-pointer"
            >
              Upload
            </button>
          </div>
        )}

        {/* 3. Stats Grid Section */}
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
          Financial & Operational Dashboard
        </h4>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Last Week Outstanding */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-7 h-7 bg-amber-50 dark:bg-amber-900/40 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-extrabold uppercase">
                Dues
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold leading-tight">Last Week OS</p>
              {typeof lastWeekOutstandingAmt === "string" ? (
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5 truncate">{lastWeekOutstandingAmt}</h3>
              ) : (
                <h3 className="text-base font-black text-slate-800 dark:text-white mt-0.5 truncate">₹{Math.abs(lastWeekOutstandingAmt).toLocaleString("en-IN")}</h3>
              )}
            </div>
            {isPayable(lastWeekOutstandingAmt) && (
              <button
                onClick={() => handlePayNow("Last Week Outstanding", lastWeekOutstandingAmt)}
                className="w-full bg-[#0D47A1] hover:bg-[#1E88E5] text-white text-[9px] font-bold py-1.5 rounded-lg transition-all mt-2 cursor-pointer"
                id="btn-pay-last-week-outstanding"
              >
                Pay Now
              </button>
            )}
          </div>

          {/* Weekly Rent */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-7 h-7 bg-rose-50 dark:bg-rose-900/40 rounded-lg flex items-center justify-center text-rose-600 dark:text-rose-400">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-1 py-0.5 rounded font-extrabold uppercase">
                Rent
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold leading-tight">Weekly Rent</p>
              {typeof weeklyRentAmt === "string" ? (
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5 truncate">{weeklyRentAmt}</h3>
              ) : (
                <h3 className="text-base font-black text-slate-800 dark:text-white mt-0.5 truncate">₹{Math.abs(weeklyRentAmt).toLocaleString("en-IN")}</h3>
              )}
            </div>
            {isPayable(weeklyRentAmt) ? (
              <button
                onClick={() => handlePayNow("Weekly Rent", weeklyRentAmt)}
                className="w-full bg-[#0D47A1] hover:bg-[#1E88E5] text-white text-[9px] font-bold py-1.5 rounded-lg transition-all mt-2 cursor-pointer"
                id="btn-pay-rent"
              >
                Pay Lease
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-[#00C853] py-1 mt-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                <CheckCircle2 className="w-3 h-3" /> Settled
              </div>
            )}
          </div>

          {/* Current Outstanding */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-7 h-7 bg-amber-50 dark:bg-amber-900/40 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-extrabold uppercase">
                Dues
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold leading-tight">Current OS</p>
              {typeof currentOutstandingAmt === "string" ? (
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5 truncate">{currentOutstandingAmt}</h3>
              ) : (
                <h3 className="text-base font-black text-slate-800 dark:text-white mt-0.5 truncate">₹{Math.abs(currentOutstandingAmt).toLocaleString("en-IN")}</h3>
              )}
            </div>
            {isPayable(currentOutstandingAmt) && (
              <button
                onClick={() => handlePayNow("Current Outstanding", currentOutstandingAmt)}
                className="w-full bg-[#0D47A1] hover:bg-[#1E88E5] text-white text-[9px] font-bold py-1.5 rounded-lg transition-all mt-2 cursor-pointer"
                id="btn-pay-current-outstanding"
              >
                Pay Now
              </button>
            )}
          </div>

          {/* Total Outstanding Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0D47A1] rounded-2xl p-3.5 text-white shadow-xs flex items-center justify-between col-span-3 mt-1">
            <div>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Total Outstanding</p>
              {typeof totalOutstandingAmt === "string" ? (
                <h3 className="text-sm font-semibold text-rose-300 mt-0.5">{totalOutstandingAmt}</h3>
              ) : (
                <h3 className="text-xl font-black text-white mt-0.5">₹{Math.abs(totalOutstandingAmt).toLocaleString("en-IN")}</h3>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isPayable(totalOutstandingAmt) && (
                <button
                  onClick={() => handlePayNow("Total Outstanding", totalOutstandingAmt)}
                  className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                  id="btn-pay-total-outstanding"
                >
                  <span>Pay Now</span>
                </button>
              )}
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10 shrink-0">
                <Wallet className="w-4.5 h-4.5 text-amber-300" />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Notifications List Summary */}
        <div className="flex justify-between items-center mb-2 px-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recent System Notifications
          </h4>
          <button
            onClick={() => setShowNotificationsPanel(true)}
            className="text-[10px] font-extrabold text-[#1E88E5] hover:underline cursor-pointer"
          >
            See All ({unreadCount})
          </button>
        </div>

        <div className="space-y-2">
          {notifications.slice(0, 2).map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                onMarkNotificationRead(notif.id);
                setShowNotificationsPanel(true);
              }}
              className={`p-3 rounded-2xl border flex gap-2.5 transition-all cursor-pointer ${
                notif.read
                  ? "bg-white border-slate-100 text-slate-600 opacity-80"
                  : "bg-blue-50/50 border-blue-100 text-slate-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  notif.type === "warning"
                    ? "bg-amber-500"
                    : notif.type === "danger"
                    ? "bg-rose-500"
                    : notif.type === "success"
                    ? "bg-[#00C853]"
                    : "bg-[#1E88E5]"
                }`}
              ></span>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className={`text-xs font-bold ${notif.read ? "text-slate-600" : "text-slate-800"}`}>
                    {notif.title}
                  </h4>
                  <span className="text-[9px] text-slate-400 font-semibold">{notif.time}</span>
                </div>
                <p className="text-[10px] mt-0.5 leading-relaxed text-slate-500 line-clamp-1">
                  {notif.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PullToRefresh>

      {/* Dynamic Slide-Over Notification Center Panel */}
      <AnimatePresence>
        {showNotificationsPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 z-50 flex justify-end"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-[85%] bg-white h-full flex flex-col shadow-2xl relative"
            >
              {/* Notif Center Header */}
              <div className="bg-[#0D47A1] text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#1E88E5]" />
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider">Driver Notifications</h3>
                    <p className="text-[9px] text-blue-200 font-medium">SSK Fleet Official Alerts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => notifications.forEach((n) => onMarkNotificationRead(n.id))}
                      className="text-[9px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg border border-white/20 transition-all cursor-pointer"
                    >
                      Mark All Read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationsPanel(false)}
                    className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer"
                    id="notif-close-btn"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Notif Center List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Bell className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">No active notices</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.read;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className={`p-3.5 rounded-2xl border transition-all relative cursor-pointer ${
                          isUnread
                            ? "bg-blue-50/60 border-blue-200 text-slate-800 shadow-xs ring-1 ring-blue-100"
                            : "bg-slate-50/50 border-slate-100 text-slate-500"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Alert Level Pill */}
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                notif.type === "warning"
                                  ? "bg-amber-100 text-amber-800"
                                  : notif.type === "danger"
                                  ? "bg-rose-100 text-rose-800"
                                  : notif.type === "success"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {notif.type === "warning"
                                ? "Warning"
                                : notif.type === "danger"
                                ? "Urgent"
                                : notif.type === "success"
                                ? "Success"
                                : "Notice"}
                            </span>

                            {/* Channel Pill if present */}
                            {notif.channel && (
                              <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">
                                {notif.channel}
                              </span>
                            )}
                          </div>

                          {/* Read / Unread Badge */}
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                              isUnread
                                ? "bg-red-500 text-white animate-pulse"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {isUnread ? "Unread" : "Read"}
                          </span>
                        </div>

                        {/* Title & Message */}
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                          {notif.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          {notif.type === "danger" && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          {notif.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed font-medium">
                          {notif.message}
                        </p>

                        {/* Timestamp & Sender */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2.5 font-bold pt-2 border-t border-slate-100">
                          <span>{notif.time || notif.createdAt}</span>
                          {notif.createdBy && <span>By: {notif.createdBy}</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
