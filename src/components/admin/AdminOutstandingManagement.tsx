import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Receipt,
  Search,
  RefreshCw,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Clock,
  X,
  PlusCircle,
  MinusCircle
} from "lucide-react";
import { AdminDriverItem } from "../../types";

interface AdminOutstandingManagementProps {
  drivers: AdminDriverItem[];
  onUpdateOutstanding: (
    driverMobileOrEtm: string,
    amount: number,
    type: "DEDUCT" | "ADD" | "SET"
  ) => Promise<void>;
  onRefresh: () => void;
  isProcessing?: boolean;
}

export default function AdminOutstandingManagement({
  drivers = [],
  onUpdateOutstanding,
  onRefresh,
  isProcessing = false
}: AdminOutstandingManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverItem | null>(null);
  const [updateAmount, setUpdateAmount] = useState<string>("");
  const [updateType, setUpdateType] = useState<"DEDUCT" | "ADD" | "SET">("DEDUCT");

  const formatCurrencyDisplay = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) {
      return "₹0";
    }
    const num = Number(val);
    if (num < 0) {
      return `-₹${Math.abs(num).toLocaleString("en-IN")}`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const totalCurrentOutstanding = drivers.reduce((acc, d) => acc + (d.currentOutstanding || 0), 0);
  const totalWeeklyOutstanding = drivers.reduce((acc, d) => acc + (d.weeklyOutstanding || 0), 0);
  const totalOutstanding = drivers.reduce((acc, d) => acc + (d.totalOutstanding !== undefined ? d.totalOutstanding : ((d.currentOutstanding || 0) + (d.weeklyOutstanding || 0))), 0);

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.mobile.includes(searchTerm) ||
    (d.etmId && d.etmId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApplyUpdate = async () => {
    if (!selectedDriver || !updateAmount) return;
    const amountNum = Number(updateAmount);
    if (isNaN(amountNum)) {
      alert("Please enter a valid numeric amount.");
      return;
    }

    try {
      await onUpdateOutstanding(selectedDriver.mobile || selectedDriver.etmId, amountNum, updateType);
      alert(`Outstanding updated for ${selectedDriver.name}!`);
      setSelectedDriver(null);
      setUpdateAmount("");
    } catch (err: any) {
      alert("Failed to update outstanding: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen text-[#333333]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-700" />
            <h2 className="text-base sm:text-lg font-bold text-amber-900">Fleet Outstanding & Dues Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor current dues, record driver payments, and sync outstanding logs with Google Sheets.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Dues</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase text-slate-400">Current Outstanding</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatCurrencyDisplay(totalCurrentOutstanding)}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase text-slate-400">Weekly Outstanding</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{formatCurrencyDisplay(totalWeeklyOutstanding)}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase text-slate-400">Total Cumulative Dues</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{formatCurrencyDisplay(totalOutstanding)}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search driver by name, mobile number, or ETM ID..."
          className="w-full text-xs font-medium focus:outline-none bg-transparent"
        />
      </div>

      {/* Driver Outstanding List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3">Driver Name</th>
                <th className="p-3">Mobile Number</th>
                <th className="p-3">ETM ID</th>
                <th className="p-3 text-right">Current Outstanding</th>
                <th className="p-3 text-right">Weekly Outstanding</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredDrivers.map((driver, idx) => (
                <tr key={`${driver.id}-${driver.mobile || idx}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-bold text-slate-900">{driver.name}</td>
                  <td className="p-3 font-mono text-slate-600">{driver.mobile}</td>
                  <td className="p-3 font-bold text-[#0D47A1]">{driver.etmId || "N/A"}</td>
                  <td className="p-3 text-right font-extrabold text-amber-700">
                    {formatCurrencyDisplay(driver.currentOutstanding)}
                  </td>
                  <td className="p-3 text-right font-bold text-indigo-700">
                    {formatCurrencyDisplay(driver.weeklyOutstanding)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedDriver(driver);
                        setUpdateAmount(String(driver.currentOutstanding || ""));
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors"
                    >
                      Update Dues
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Outstanding Modal */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-extrabold text-amber-900">
                  Update Outstanding: {selectedDriver.name}
                </h3>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Update Action</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "DEDUCT", label: "Mark Paid (-)" },
                    { id: "ADD", label: "Add Due (+)" },
                    { id: "SET", label: "Set Total (=)" }
                  ].map((act) => (
                    <button
                      key={act.id}
                      onClick={() => setUpdateType(act.id as any)}
                      className={`py-2 text-[11px] font-bold rounded-xl transition-all ${
                        updateType === act.id
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={updateAmount}
                  onChange={(e) => setUpdateAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyUpdate}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Save Outstanding Change
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
