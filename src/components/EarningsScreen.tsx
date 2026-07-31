import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Search,
  CheckCircle,
  Coins,
  TrendingUp,
  Info,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Download,
  Menu
} from "lucide-react";
import { PartnerEarning, TransactionItem } from "../types";
import PullToRefresh from "./PullToRefresh";

interface EarningsScreenProps {
  transactions: TransactionItem[];
  onRefresh: () => Promise<void>;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
  driverPhone?: string;
  onOpenDrawer: () => void;
}

// Support helper to parse date strings back to Date objects robustly
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

const normalizeMobile = (phone: string): string => {
  return phone.replace(/\D/g, '').slice(-10);
};

export default function EarningsScreen({
  transactions: initialTransactions,
  onRefresh,
  syncState,
  driverPhone,
  onOpenDrawer,
}: EarningsScreenProps) {
  // Tabs: Today, This Week
  const [activeTab, setActiveTab] = useState<"Today" | "This Week">("Today");
  const [partnerFilter, setPartnerFilter] = useState<"All" | "Uber" | "Ola" | "Rapido" | "Cash">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const loggedMobile = driverPhone || "";
  const loggedNorm = normalizeMobile(loggedMobile);

  // Filter rows by logged-in driver mobile number
  const matchedRows = useMemo(() => {
    return initialTransactions.filter((tx) => {
      const num = tx.number || "";
      const rowNorm = normalizeMobile(num);
      return loggedNorm ? rowNorm === loggedNorm : true;
    });
  }, [initialTransactions, loggedNorm]);

  // Find latest available date from the matched rows
  const maxDateObj = useMemo(() => {
    let maxObj: Date | null = null;
    matchedRows.forEach((row) => {
      const txDate = parseTxDate(row.date);
      if (txDate) {
        if (!maxObj || txDate > maxObj) {
          maxObj = txDate;
        }
      }
    });
    return maxObj;
  }, [matchedRows]);

  // Format latest available date as DD/MM/YYYY
  const latestDateFormatted = useMemo(() => {
    if (!maxDateObj) return "";
    const d = String(maxDateObj.getDate()).padStart(2, "0");
    const m = String(maxDateObj.getMonth() + 1).padStart(2, "0");
    const y = maxDateObj.getFullYear();
    return `${d}/${m}/${y}`;
  }, [maxDateObj]);

  // Filter transactions that fall into the selected timeframe dynamically
  const timeframeFilteredTransactions = useMemo(() => {
    return matchedRows.filter((tx) => {
      const txDate = parseTxDate(tx.date);
      if (!txDate) return false;

      if (activeTab === "Today") {
        if (!maxDateObj) return false;
        return txDate.getDate() === maxDateObj.getDate() &&
               txDate.getMonth() === maxDateObj.getMonth() &&
               txDate.getFullYear() === maxDateObj.getFullYear();
      } else { // "This Week"
        const today = new Date();
        const day = today.getDay(); // 0 (Sun) - 6 (Sat)
        const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return txDate >= monday && txDate <= sunday;
      }
    });
  }, [matchedRows, activeTab, maxDateObj]);

  // Find todayRows and weekRows specifically for debugging log
  const todayRowsForLog = useMemo(() => {
    if (!maxDateObj) return [];
    return matchedRows.filter((row) => {
      const txDate = parseTxDate(row.date);
      if (!txDate) return false;
      return txDate.getDate() === maxDateObj.getDate() &&
             txDate.getMonth() === maxDateObj.getMonth() &&
             txDate.getFullYear() === maxDateObj.getFullYear();
    });
  }, [matchedRows, maxDateObj]);

  const weekRowsForLog = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return matchedRows.filter((row) => {
      const txDate = parseTxDate(row.date);
      if (!txDate) return false;
      return txDate >= monday && txDate <= sunday;
    });
  }, [matchedRows]);

  // Log selected filter and row counts as requested
  useEffect(() => {
    const rows = initialTransactions;
    const todayRows = todayRowsForLog;
    const weekRows = weekRowsForLog;
    console.log("Logged mobile:", loggedMobile);
    console.log("Sheet rows:", rows);
    console.log("Matched mobile rows:", matchedRows);
    console.log("Today rows:", todayRows);
    console.log("Week rows:", weekRows);
  }, [loggedMobile, initialTransactions, matchedRows, todayRowsForLog, weekRowsForLog]);

  // 1. Dynamic calculation based on activeTab (using the filtered transactions)
  const earningsData = useMemo(() => {
    // We want the total for percentages to be the sum of Total Earning (Column D)
    const totalForTab = timeframeFilteredTransactions.reduce((sum, tx) => sum + (tx.totalEarning || 0), 0);

    const partnersList = [
      { key: "Uber", label: "Uber Sub", color: "#000000", valueField: "uberSub" },
      { key: "Ola", label: "Tip + Toll", color: "#99CC33", valueField: "tipAndToll" },
      { key: "Cash", label: "Cash Collected", color: "#1E88E5", valueField: "cashCollected" },
      { key: "Rapido", label: "Total Earning", color: "#FFC000", valueField: "totalEarning" },
    ];

    return partnersList.map((item) => {
      const amount = timeframeFilteredTransactions.reduce((sum, tx) => {
        const val = tx[item.valueField as keyof typeof tx];
        return sum + (typeof val === "number" ? val : 0);
      }, 0);
      const tripsCount = timeframeFilteredTransactions.reduce((sum, tx) => {
        const val = tx[item.valueField as keyof typeof tx];
        if ((typeof val === "number" ? val : 0) !== 0) {
          return sum + (tx.trip || 0);
        }
        return sum;
      }, 0);
      const percentage = totalForTab > 0 ? Math.round((amount / totalForTab) * 100) : 0;
      
      return {
        partner: item.key as "Uber" | "Ola" | "Rapido" | "Cash",
        label: item.label,
        amount,
        tripsCount,
        percentage,
        color: item.color,
      };
    });
  }, [timeframeFilteredTransactions]);

  const totalEarnings = useMemo(() => {
    return timeframeFilteredTransactions.reduce((sum, tx) => sum + (tx.totalEarning || 0), 0);
  }, [timeframeFilteredTransactions]);

  const totalTrips = useMemo(() => {
    return timeframeFilteredTransactions.reduce((sum, tx) => sum + (tx.trip || 0), 0);
  }, [timeframeFilteredTransactions]);

  // 2. Filtered transactions for the ledger history list section
  const filteredTransactions = useMemo(() => {
    return timeframeFilteredTransactions.filter((tx) => {
      // Partner Filter
      let matchesPartner = true;
      if (partnerFilter === "Uber") {
        matchesPartner = (tx.uberSub || 0) !== 0;
      } else if (partnerFilter === "Ola") {
        matchesPartner = (tx.tipAndToll || 0) !== 0;
      } else if (partnerFilter === "Cash") {
        matchesPartner = (tx.cashCollected || 0) !== 0;
      } else if (partnerFilter === "Rapido") {
        matchesPartner = (tx.totalEarning || 0) !== 0;
      }

      // Search Query Filter
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        tx.tripId.toLowerCase().includes(q) ||
        (tx.etm || "").toLowerCase().includes(q) ||
        (tx.name || "").toLowerCase().includes(q) ||
        tx.amount.toString().includes(q) ||
        tx.partner.toLowerCase().includes(q) ||
        (tx.totalEarning || 0).toString().includes(q) ||
        (tx.cashCollected || 0).toString().includes(q) ||
        (tx.tipAndToll || 0).toString().includes(q) ||
        (tx.uberSub || 0).toString().includes(q);

      return matchesPartner && matchesSearch;
    });
  }, [timeframeFilteredTransactions, partnerFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FA] dark:bg-slate-950 text-[#333333] dark:text-slate-100 relative overflow-hidden transition-colors duration-200">
      <PullToRefresh onRefresh={onRefresh} syncState={syncState}>
      
      {/* 1. Header Banner */}
      <div className="bg-[#0D47A1] dark:bg-slate-900 text-white px-5 pt-4 pb-6 rounded-b-[32px] shadow-md shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onOpenDrawer}
            className="p-1.5 hover:bg-white/10 active:scale-95 rounded-lg transition-all text-white cursor-pointer -ml-1"
            title="Open Menu"
            id="btn-open-menu-earnings"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
          <h2 className="text-base font-extrabold tracking-tight text-white">Earnings Ledger</h2>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] text-blue-100 font-medium font-sans">Track your synchronized platform tallies from Ola, Uber & Rapido.</p>
          </div>
          {matchedRows.length > 0 && matchedRows[0].name && (
            <div className="bg-white/10 px-3 py-1 rounded-xl border border-white/10 text-right">
              <span className="text-[8px] uppercase tracking-wider text-blue-200 block font-bold">Driver Name</span>
              <span className="text-xs font-black text-white font-sans">{matchedRows[0].name}</span>
            </div>
          )}
        </div>

        {/* Today, This Week Tabs */}
        <div className="mt-4 bg-[#08182D]/60 p-1 rounded-xl flex relative">
          {(["Today", "This Week"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center py-2 text-[10px] font-extrabold rounded-lg transition-all z-10 relative cursor-pointer ${
                activeTab === tab ? "text-[#0D47A1] bg-white shadow-xs font-black" : "text-blue-100/75 hover:text-white"
              }`}
            >
              {tab === "Today" ? (latestDateFormatted ? `Last Day: ${latestDateFormatted}` : "Today") : tab}
            </button>
          ))}
        </div>

        {/* 2. Total Earnings Card */}
        <div className="mt-5 bg-white dark:bg-slate-900 text-[#333333] dark:text-slate-100 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center relative overflow-hidden">
          {/* Accent Blue Stripe */}
          <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1E88E5] rounded-l-2xl"></span>
          
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-400 block font-sans">
              {activeTab === "Today" ? (latestDateFormatted ? `Last Day: ${latestDateFormatted}` : "Today") : "This Week"} Total Revenue
            </span>
            <h3 className="text-xl font-black text-[#0D47A1] dark:text-blue-300 mt-1 font-sans">
              ₹{totalEarnings.toLocaleString("en-IN")}
            </h3>
            <span className="text-[9px] text-[#00C853] font-bold block mt-1 flex items-center gap-0.5 font-sans">
              <TrendingUp className="w-3.5 h-3.5" /> +12.4% vs previous {activeTab === "Today" ? "day" : "week"}
            </span>
          </div>

          <div className="text-right border-l border-slate-100 dark:border-slate-800 pl-4">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Total Rides</span>
            <span className="text-lg font-black text-[#333333] dark:text-white mt-0.5 block font-sans">{totalTrips}</span>
            <span className="text-[9px] text-slate-400 font-medium block mt-1 font-mono">
              Avg: ₹{totalTrips > 0 ? (totalEarnings / totalTrips).toFixed(0) : "0"}/ride
            </span>
          </div>
        </div>
      </div>

      {/* 3. Partner Platform breakdown */}
      <div className="p-4 shrink-0">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1 font-sans">
          Partner Revenue Synchronization ({activeTab === "Today" ? (latestDateFormatted ? `Last Day: ${latestDateFormatted}` : "Today") : "This Week"})
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {earningsData.map((plat) => (
            <div
              key={plat.partner}
              onClick={() => setPartnerFilter(plat.partner as any)}
              className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border cursor-pointer hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between h-[105px] ${
                partnerFilter === plat.partner
                  ? "border-[#1E88E5] ring-2 ring-[#1E88E5]/10 shadow-xs"
                  : "border-slate-100 dark:border-slate-800 shadow-xs"
              }`}
            >
              <div className="flex justify-between items-center">
                <span
                  className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-sans"
                  style={{
                    backgroundColor: `${plat.color}15`,
                    color: plat.partner === "Cash" ? "#1E88E5" : plat.color,
                    border: `1px solid ${plat.color}25`,
                  }}
                >
                  {plat.label || plat.partner}
                </span>
                <span className="text-[9.5px] text-slate-400 font-extrabold font-mono">{plat.percentage}%</span>
              </div>

              <div className="mt-2">
                <h3 className="text-base font-black text-[#0D47A1] dark:text-blue-300 font-sans">₹{plat.amount.toLocaleString("en-IN")}</h3>
                <p className="text-[9.5px] text-slate-400 font-bold font-sans">{plat.tripsCount} Active Records</p>
              </div>

              {/* Progress bar line */}
              <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${plat.percentage}%`,
                    backgroundColor: plat.color,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Transactions Ledger History List */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-2.5 px-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
            Ride Settlement History ({filteredTransactions.length})
          </h4>
          {partnerFilter !== "All" && (
            <button
              onClick={() => setPartnerFilter("All")}
              className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md cursor-pointer font-sans"
            >
              Clear Filter: {
                partnerFilter === "Uber" ? "Uber Sub" :
                partnerFilter === "Ola" ? "Tip + Toll" :
                partnerFilter === "Cash" ? "Cash Collected" : "Total Earning"
              }
            </button>
          )}
        </div>

        {/* Search Panel */}
        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs mb-3.5 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ETM, Name, Amount..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent font-medium"
              id="transaction-search-input"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {[
              { key: "All", label: "All Records" },
              { key: "Uber", label: "Uber Sub" },
              { key: "Ola", label: "Tip + Toll" },
              { key: "Cash", label: "Cash Coll." },
              { key: "Rapido", label: "Total Earning" }
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPartnerFilter(opt.key as any)}
                className={`py-1.5 px-3.5 rounded-lg text-[9px] font-bold shrink-0 transition-all border cursor-pointer font-sans ${
                  partnerFilter === opt.key
                    ? "bg-[#1E88E5] text-white border-[#1E88E5]"
                    : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                }`}
                id={`filter-tab-${opt.key}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Ledger Log Cards */}
        <div className="space-y-2.5 pb-6">
          {syncState === "syncing" ? (
            <div className="bg-white rounded-2xl py-8 px-4 border border-slate-100 text-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E88E5] mx-auto mb-3"></div>
              <p className="text-sm font-bold text-slate-500 font-sans">Loading earnings...</p>
            </div>
          ) : matchedRows.length === 0 ? (
            <div className="bg-white rounded-2xl py-8 px-4 border border-slate-100 text-center text-slate-400">
              <Coins className="w-9 h-9 stroke-1 mx-auto mb-1 text-slate-300" />
              <p className="text-sm font-bold text-slate-500 font-sans">No records found for this mobile number</p>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">There are no earnings or transactions loaded from Google Sheets for this phone number.</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-2xl py-8 px-4 border border-slate-100 text-center text-slate-400">
              <Coins className="w-9 h-9 stroke-1 mx-auto mb-1 text-slate-300" />
              <p className="text-sm font-bold text-slate-500 font-sans">No earnings data found</p>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">Try modifying filters or switching tabs.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3.5 transition-all hover:border-slate-200"
              >
                {/* Header Row */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2.5 items-center">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D47A1] border border-blue-100 flex items-center justify-center font-black text-xs font-mono">
                      ETM
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-800 font-sans">Daily Settlement</h4>
                        <span className="text-[9px] bg-blue-50 text-[#0D47A1] font-bold px-1.5 py-0.5 rounded font-mono">
                          {tx.etm || tx.tripId || "N/A"}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5 font-sans">
                        {tx.date}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-slate-400 block uppercase tracking-wider text-[8px]">Total Earning</span>
                    <span className="text-sm font-black text-[#0D47A1] font-mono">₹{(tx.totalEarning ?? tx.amount).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Subtallies breakdown grid */}
                <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-slate-50 text-center bg-slate-50/50 p-2 rounded-xl">
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Trips</span>
                    <span className="text-xs font-black text-slate-700 font-mono">{tx.trip ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Cash Coll.</span>
                    <span className="text-xs font-black text-slate-700 font-mono">₹{(tx.cashCollected ?? 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Tip + Toll</span>
                    <span className="text-xs font-black text-slate-700 font-mono">₹{(tx.tipAndToll ?? 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider font-sans">Uber Sub</span>
                    <span className="text-xs font-black text-slate-700 font-mono">₹{(tx.uberSub ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PullToRefresh>
  </div>
  );
}
