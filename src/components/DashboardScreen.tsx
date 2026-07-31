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
  Menu
} from "lucide-react";
import { DriverDetails, NotificationItem, VehicleDocument, TransactionItem } from "../types";
import { mockVehicleDetails } from "../data";
import PullToRefresh from "./PullToRefresh";

interface DashboardScreenProps {
  driver: DriverDetails;
  notifications: NotificationItem[];
  documents: VehicleDocument[];
  transactions: TransactionItem[];
  onNavigateToTab: (tab: "dashboard" | "earnings" | "vehicle") => void;
  onMarkNotificationRead: (id: string) => void;
  onRefresh: () => Promise<void>;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
  onOpenDrawer: () => void;
  outstandingAmount?: number | string;
  lastWeekOutstanding?: number | string;
  weeklyRent?: number | string;
  currentOutstanding?: number | string;
  totalOutstanding?: number | string;
  lastDayEarnings?: number;
}

export default function DashboardScreen({
  driver,
  notifications,
  documents,
  transactions,
  onNavigateToTab,
  onMarkNotificationRead,
  onRefresh,
  syncState,
  onOpenDrawer,
  outstandingAmount,
  lastWeekOutstanding,
  weeklyRent: weeklyRentProp,
  currentOutstanding,
  totalOutstanding: totalOutstandingProp,
  lastDayEarnings,
}: DashboardScreenProps) {
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [payModal, setPayModal] = useState<{ show: boolean; type: "last_week_outstanding" | "current_outstanding" | "rent" | null }>({
    show: false,
    type: null,
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const parseTxDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1];
      const year = parseInt(parts[2], 10);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIdx = months.indexOf(monthStr);
      if (monthIdx !== -1 && !isNaN(day) && !isNaN(year)) {
        return new Date(year, monthIdx, day);
      }
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const fallbackLastDayEarnings = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayTx = transactions.filter((tx) => {
      const txDate = parseTxDate(tx.date);
      if (!txDate) return false;
      txDate.setHours(0, 0, 0, 0);
      return txDate.getTime() === yesterday.getTime();
    });

    if (yesterdayTx.length > 0) {
      return yesterdayTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    }

    const groupedByDate: { [key: string]: { dateObj: Date; amount: number } } = {};
    
    transactions.forEach((tx) => {
      const txDate = parseTxDate(tx.date);
      if (!txDate) return;
      txDate.setHours(0, 0, 0, 0);
      const key = txDate.getTime().toString();
      if (!groupedByDate[key]) {
        groupedByDate[key] = { dateObj: txDate, amount: 0 };
      }
      groupedByDate[key].amount += tx.amount || 0;
    });

    const sortedGrouped = Object.values(groupedByDate).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    if (sortedGrouped.length > 0) {
      return sortedGrouped[0].amount;
    }

    return 0;
  }, [transactions]);

  const finalLastDayEarnings = lastDayEarnings !== undefined ? lastDayEarnings : fallbackLastDayEarnings;
  
  // Custom states matching requested financials
  const [earningsToday, setEarningsToday] = useState(2350);
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

  const triggerPayment = (type: "last_week_outstanding" | "current_outstanding" | "rent") => {
    setPayModal({ show: true, type });
    setPaymentSuccess(false);
  };

  const handleConfirmPayment = () => {
    setPaymentSuccess(true);
    setTimeout(() => {
      let paidAmt = 0;
      if (payModal.type === "last_week_outstanding") {
        paidAmt = typeof lastWeekOutstandingAmt === "number" ? Math.abs(lastWeekOutstandingAmt) : 0;
        setLastWeekOutstandingAmt(0);
      } else if (payModal.type === "current_outstanding") {
        paidAmt = typeof currentOutstandingAmt === "number" ? Math.abs(currentOutstandingAmt) : 0;
        setCurrentOutstandingAmt(0);
      } else if (payModal.type === "rent") {
        paidAmt = typeof weeklyRentAmt === "number" ? Math.abs(weeklyRentAmt) : 0;
        setWeeklyRentAmt(0);
      }
      setPayModal({ show: false, type: null });
      setPaymentSuccess(false);

      // Success Toast
      const toast = document.createElement("div");
      toast.className = "absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#00C853] text-white text-xs px-5 py-3 rounded-full shadow-xl z-50 flex items-center gap-2 font-bold border border-white/10 animate-bounce";
      toast.innerHTML = `✓ Payment of ₹${paidAmt} processed successfully`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FA] dark:bg-slate-950 relative overflow-hidden text-[#333333] dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. Header Profile & Online Toggle */}
      <div className="bg-[#0D47A1] dark:bg-slate-900 text-white px-5 pt-4 pb-6 rounded-b-[32px] shadow-md shrink-0 relative border-b border-white/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDrawer}
              className="p-1.5 hover:bg-white/10 active:scale-95 rounded-lg transition-all text-white cursor-pointer -ml-1 mr-1"
              title="Open Menu"
              id="btn-open-menu-dashboard"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <div>
              <p className="text-[10px] text-blue-200 font-semibold tracking-wider uppercase leading-none">Welcome Back</p>
              <h3 className="text-sm font-extrabold tracking-tight text-white mt-1 leading-none">{driver.Name || driver.Driver_Name || driver.name}</h3>
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

      {/* Main Stats Scroll Area wrapped in PullToRefresh */}
      <PullToRefresh onRefresh={onRefresh} syncState={syncState}>
        <div className="px-4 pt-2 pb-24 flex-1">
        
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

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Today's Earnings Card */}
          <div
            onClick={() => onNavigateToTab("earnings")}
            className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#1E88E5]/30 hover:shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-[#1E88E5] dark:text-blue-400">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <span className="text-[9px] bg-blue-50 dark:bg-blue-900/40 text-[#1E88E5] dark:text-blue-300 px-1.5 py-0.5 rounded font-extrabold uppercase">
                Last Day
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold leading-none">Last Day Earnings</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">₹{finalLastDayEarnings.toLocaleString("en-IN")}</h3>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToTab("earnings");
              }}
              className="w-full bg-[#1E88E5]/5 dark:bg-blue-500/10 hover:bg-[#1E88E5]/10 text-[9px] font-bold text-[#1E88E5] dark:text-blue-300 py-1.5 rounded-lg transition-all mt-2.5 cursor-pointer text-center block border border-[#1E88E5]/10 dark:border-blue-500/20"
            >
              View History
            </button>
          </div>

          {/* Last Week Outstanding */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/40 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <span className="text-[9px] bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-extrabold uppercase">
                Dues
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold leading-none">Last Week Outstanding</p>
              {typeof lastWeekOutstandingAmt === "string" ? (
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">{lastWeekOutstandingAmt}</h3>
              ) : (
                <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">₹{Math.abs(lastWeekOutstandingAmt).toLocaleString("en-IN")}</h3>
              )}
            </div>
            {typeof lastWeekOutstandingAmt === "number" && lastWeekOutstandingAmt < 0 && (
              <button
                onClick={() => triggerPayment("last_week_outstanding")}
                className="w-full bg-[#0D47A1] hover:bg-[#1E88E5] text-white text-[9px] font-bold py-1.5 rounded-lg transition-all mt-2.5 cursor-pointer"
                id="btn-pay-last-week-outstanding"
              >
                Pay Now
              </button>
            )}
          </div>

          {/* Weekly Rent */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 bg-rose-50 dark:bg-rose-900/40 rounded-lg flex items-center justify-center text-rose-600 dark:text-rose-400">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
              <span className="text-[9px] bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-extrabold uppercase">
                Rent
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold leading-none">Weekly Rent</p>
              {typeof weeklyRentAmt === "string" ? (
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">{weeklyRentAmt}</h3>
              ) : (
                <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">₹{Math.abs(weeklyRentAmt).toLocaleString("en-IN")}</h3>
              )}
            </div>
            {typeof weeklyRentAmt === "number" && weeklyRentAmt > 0 ? (
              <button
                onClick={() => triggerPayment("rent")}
                className="w-full bg-[#0D47A1] hover:bg-[#1E88E5] text-white text-[9px] font-bold py-1.5 rounded-lg transition-all mt-2.5 cursor-pointer"
                id="btn-pay-rent"
              >
                Pay Lease
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-[#00C853] py-1.5 mt-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settled
              </div>
            )}
          </div>

          {/* Current Outstanding */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/40 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <span className="text-[9px] bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-extrabold uppercase">
                Dues
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold leading-none">Current Outstanding</p>
              {typeof currentOutstandingAmt === "string" ? (
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">{currentOutstandingAmt}</h3>
              ) : (
                <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">₹{Math.abs(currentOutstandingAmt).toLocaleString("en-IN")}</h3>
              )}
            </div>
            {typeof currentOutstandingAmt === "number" && currentOutstandingAmt < 0 && (
              <button
                onClick={() => triggerPayment("current_outstanding")}
                className="w-full bg-[#0D47A1] hover:bg-[#1E88E5] text-white text-[9px] font-bold py-1.5 rounded-lg transition-all mt-2.5 cursor-pointer"
                id="btn-pay-current-outstanding"
              >
                Pay Now
              </button>
            )}
          </div>

          {/* Total Outstanding Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0D47A1] rounded-2xl p-3.5 text-white shadow-xs flex items-center justify-between col-span-2 mt-1">
            <div>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Total Outstanding</p>
              {typeof totalOutstandingAmt === "string" ? (
                <h3 className="text-sm font-semibold text-rose-300 mt-0.5">{totalOutstandingAmt}</h3>
              ) : (
                <h3 className="text-xl font-black text-white mt-0.5">₹{Math.abs(totalOutstandingAmt).toLocaleString("en-IN")}</h3>
              )}
            </div>
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10">
              <Wallet className="w-5 h-5 text-amber-300" />
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
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">SSK Notification Core</h3>
                </div>
                <button
                  onClick={() => setShowNotificationsPanel(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer"
                  id="notif-close-btn"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Notif Center List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Bell className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">No active notices</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => onMarkNotificationRead(notif.id)}
                      className={`p-3 rounded-2xl border transition-all relative cursor-pointer ${
                        notif.read
                          ? "bg-slate-50/50 border-slate-100 text-slate-500"
                          : "bg-blue-50/30 border-blue-100 text-slate-800 shadow-xs"
                      }`}
                    >
                      {!notif.read && (
                        <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-[#1E88E5] rounded-full"></span>
                      )}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {notif.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            {notif.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium">
                            {notif.message}
                          </p>
                          <span className="text-[8px] text-slate-400 mt-2 block font-bold uppercase tracking-wider">
                            {notif.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Processing Interactive Overlay */}
      <AnimatePresence>
        {payModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-5 shadow-2xl w-full max-w-[320px] text-center"
            >
              <h3 className="text-sm font-bold text-slate-800">
                Confirm Fleet Settlement
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Authorized via SSK Tours & Travels Bank API
              </p>

              <div className="my-5 bg-[#F5F7FA] rounded-2xl p-4 border border-slate-100">
                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">
                  Amount to Deduct
                </span>
                <span className="text-2xl font-black text-[#0D47A1] mt-1 block">
                  ₹{payModal.type === "last_week_outstanding" 
                    ? (typeof lastWeekOutstandingAmt === "number" ? Math.abs(lastWeekOutstandingAmt).toFixed(2) : String(lastWeekOutstandingAmt))
                    : payModal.type === "current_outstanding" 
                    ? (typeof currentOutstandingAmt === "number" ? Math.abs(currentOutstandingAmt).toFixed(2) : String(currentOutstandingAmt))
                    : (typeof weeklyRentAmt === "number" ? Math.abs(weeklyRentAmt).toFixed(2) : String(weeklyRentAmt))}
                </span>
                <span className="text-[9px] bg-blue-50 text-[#0D47A1] px-2 py-0.5 rounded-md font-extrabold mt-2 inline-block">
                  {payModal.type === "last_week_outstanding" 
                    ? "Last Week Outstanding" 
                    : payModal.type === "current_outstanding" 
                    ? "Current Outstanding" 
                    : "Weekly Vehicle Rent"}
                </span>
              </div>

              {paymentSuccess ? (
                <div className="flex flex-col items-center justify-center py-3">
                  <div className="w-8 h-8 border-2 border-[#1E88E5] border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-[10px] text-slate-600 font-bold animate-pulse">
                    Securing bank connection...
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPayModal({ show: false, type: null })}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="flex-1 bg-[#1E88E5] hover:bg-[#0D47A1] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    Pay Now
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
