import React, { useState, useEffect, useMemo } from "react";
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Hash, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  DollarSign,
  Globe,
  Send,
  X,
  Check
} from "lucide-react";
import { fetchWeeklyHissabSheet } from "../../lib/sheets";
import {
  publishWeekStatus,
  fetchAllPublishedWeeks,
  getWeekKey,
  PublishedWeekRecord
} from "../../lib/publishedWeeksService";

interface AdminWeeklyHissabProps {
  accessToken?: string | null;
}

/**
 * Format string or numeric value into clean DD/MM/YYYY date if applicable
 */
function formatDateCell(val: string): string {
  if (!val || !val.trim()) return "-";
  const str = val.trim();
  
  // If already in DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}$/.test(str)) {
    return str.replace(/[\.-]/g, "/");
  }

  // If ISO date like 2026-08-07
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  return str;
}

/**
 * Helper to test if a string represents a numeric value
 */
function isNumericVal(val: string): boolean {
  if (!val || !val.trim()) return false;
  const clean = val.replace(/[^0-9.-]/g, "").trim();
  if (!clean || clean === "-" || clean === ".") return false;
  return !isNaN(Number(clean));
}

/**
 * Helper to parse a raw string value into number
 */
function parseNum(val: string): number {
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9.-]/g, "").trim();
  if (!clean || clean === "-" || clean === ".") return 0;
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Determine if a column is monetary/currency based on header name
 */
function isCurrencyHeader(headerStr: string): boolean {
  const h = String(headerStr || "").toLowerCase();
  return (
    h.includes("amount") ||
    h.includes("charge") ||
    h.includes("revenue") ||
    h.includes("cash") ||
    h.includes("toll") ||
    h.includes("penalty") ||
    h.includes("fine") ||
    h.includes("pass") ||
    h.includes("cover") ||
    h.includes("adjustment") ||
    h.includes("fee") ||
    h.includes("recovery") ||
    h.includes("outstanding") ||
    h.includes("rent") ||
    h.includes("hissab") ||
    h.includes("total") ||
    h.includes("os") ||
    h.includes("due") ||
    h.includes("balance") ||
    h.includes("price") ||
    h.includes("payout") ||
    h.includes("earning") ||
    h.includes("incentive")
  );
}

/**
 * Format currency number cleanly with ₹ symbol and commas
 */
function formatCurrencyCell(val: string | number): { text: string; isNegative: boolean; isZero: boolean } {
  const num = typeof val === "number" ? val : parseNum(val);
  if (num === 0) return { text: "₹0", isNegative: false, isZero: true };
  
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  return {
    text: isNegative ? `-₹${formatted}` : `₹${formatted}`,
    isNegative,
    isZero: false
  };
}

export default function AdminWeeklyHissab({
  accessToken
}: AdminWeeklyHissabProps) {
  const [rawSheetRows, setRawSheetRows] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters state
  const [selectedWeek, setSelectedWeek] = useState<string>("ALL");
  const [driverSearch, setDriverSearch] = useState<string>("");
  const [etmSearch, setEtmSearch] = useState<string>("");
  const [dateSearch, setDateSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Publishing state
  const [publishedMap, setPublishedMap] = useState<Record<string, PublishedWeekRecord>>({});
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string>("");
  const [publishErrorMessage, setPublishErrorMessage] = useState<string>("");

  // Fetch published weeks status from Firestore
  const loadPublishedWeeks = async () => {
    const map = await fetchAllPublishedWeeks();
    setPublishedMap(map);
  };

  // Load live data directly ONLY from Weekly_Hissab sheet tab
  const loadWeeklyData = async () => {
    setIsRefreshing(true);
    try {
      await loadPublishedWeeks();
      const liveData = await fetchWeeklyHissabSheet(accessToken);
      if (liveData && liveData.length > 0) {
        setRawSheetRows(liveData);
      } else {
        setRawSheetRows([]);
      }
    } catch (err) {
      console.warn("Failed to fetch live Weekly_Hissab sheet:", err);
      setRawSheetRows([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeeklyData();
  }, [accessToken]);

  // Check if current selected week is published
  const currentWeekKey = useMemo(() => {
    if (!selectedWeek || selectedWeek === "ALL") return "";
    return getWeekKey(selectedWeek);
  }, [selectedWeek]);

  const isCurrentWeekPublished = useMemo(() => {
    if (!currentWeekKey) return false;
    return !!publishedMap[currentWeekKey]?.published;
  }, [currentWeekKey, publishedMap]);

  const handleOpenPublishModal = () => {
    if (!selectedWeek || selectedWeek === "ALL") return;
    setPublishErrorMessage("");
    setShowConfirmModal(true);
  };

  const handleConfirmPublish = async () => {
    if (!selectedWeek || selectedWeek === "ALL") return;
    setIsPublishing(true);
    setPublishErrorMessage("");
    
    try {
      const result = await publishWeekStatus(selectedWeek, "Admin");
      if (result.success && result.record) {
        setPublishedMap((prev) => ({
          ...prev,
          [result.record!.weekKey]: result.record!
        }));
        setPublishSuccessMessage(`Weekly Hissab published successfully for ${selectedWeek}. Drivers can now view this week's Hissab.`);
        setShowConfirmModal(false);
        setTimeout(() => setPublishSuccessMessage(""), 6000);
      } else {
        setPublishErrorMessage(result.message || "Failed to publish Weekly Hissab.");
      }
    } catch (err: any) {
      setPublishErrorMessage(err?.message || "An unexpected error occurred while publishing.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Extract headers and data rows (truncated at Final OS, filtering out completely blank rows)
  const { headers, dataRows } = useMemo(() => {
    if (!rawSheetRows || rawSheetRows.length === 0) return { headers: [], dataRows: [] };

    const rawHeaders = rawSheetRows[0].map((h) => String(h || "").trim());

    // Find "Final OS" or "Total Outstanding" column index
    let finalOsIdx = -1;
    rawHeaders.forEach((h, i) => {
      const norm = h.toLowerCase().replace(/[\s_()-]+/g, "");
      if (
        norm === "finalos" ||
        norm.includes("finalos") ||
        norm === "totaloutstanding" ||
        norm === "finaloutstanding"
      ) {
        finalOsIdx = i;
      }
    });

    let maxCols = rawHeaders.length;
    if (finalOsIdx !== -1) {
      maxCols = finalOsIdx + 1;
    }

    const head = rawHeaders.slice(0, maxCols);

    const data = rawSheetRows
      .slice(1)
      .map((r) => r.slice(0, maxCols))
      .filter((r) => {
        // Filter completely blank rows (must have at least one non-empty cell)
        const hasContent = r.some((c) => {
          const val = String(c || "").trim();
          return val.length > 0 && val !== "-";
        });
        return hasContent;
      });

    return { headers: head, dataRows: data };
  }, [rawSheetRows]);

  // Find column indices dynamically
  const colIndices = useMemo(() => {
    let etmIdx = -1;
    let nameIdx = -1;
    let startDateIdx = -1;
    let endDateIdx = -1;
    let weekIdx = -1;
    let statusIdx = -1;
    let totalOsIdx = -1;
    let rentIdx = -1;

    headers.forEach((h, i) => {
      const norm = h.toLowerCase().replace(/[\s_()-]+/g, "");
      if (norm === "etmid" || norm === "etm" || (norm.includes("etm") && etmIdx === -1)) etmIdx = i;
      if (norm === "drivername" || norm === "driver" || norm === "name" || (norm.includes("driver") && nameIdx === -1)) nameIdx = i;
      if (norm.includes("startdate") || (norm.includes("start") && norm.includes("date"))) startDateIdx = i;
      if (norm.includes("enddate") || (norm.includes("end") && norm.includes("date"))) endDateIdx = i;
      if (norm === "week" || norm.includes("weekperiod") || norm.includes("hissabweek")) weekIdx = i;
      if (norm === "status" || norm.includes("paymentstatus") || norm.includes("hissabstatus")) statusIdx = i;
      if (norm.includes("totaloutstanding") || norm.includes("currentweekoutstanding") || norm.includes("totalos")) totalOsIdx = i;
      if (norm.includes("rental") || norm.includes("rentalamount") || norm.includes("rent")) rentIdx = i;
    });

    // Fallbacks if ETM or Name not found by text, stick first 2 columns
    const stickyCol1 = etmIdx !== -1 ? etmIdx : 0;
    const stickyCol2 = nameIdx !== -1 ? nameIdx : 1;

    return {
      etmIdx,
      nameIdx,
      stickyCol1,
      stickyCol2,
      startDateIdx,
      endDateIdx,
      weekIdx,
      statusIdx,
      totalOsIdx,
      rentIdx
    };
  }, [headers]);

  // Extract unique Week Selector options from data
  const weekOptions = useMemo(() => {
    const setOptions = new Set<string>();
    dataRows.forEach((row) => {
      // Try weekIdx
      if (colIndices.weekIdx !== -1 && row[colIndices.weekIdx]) {
        const wVal = String(row[colIndices.weekIdx]).trim();
        if (wVal) setOptions.add(wVal);
      }
      // Try Start Date - End Date combination
      else if (colIndices.startDateIdx !== -1 && row[colIndices.startDateIdx]) {
        const sDate = String(row[colIndices.startDateIdx]).trim();
        const eDate = colIndices.endDateIdx !== -1 ? String(row[colIndices.endDateIdx]).trim() : "";
        if (sDate && eDate) setOptions.add(`${sDate} – ${eDate}`);
        else if (sDate) setOptions.add(sDate);
      } else if (row[0] && row[1]) {
        // Fallback to first two columns if dates
        const c0 = String(row[0]).trim();
        const c1 = String(row[1]).trim();
        if (c0 && c1 && (c0.includes("/") || c0.includes("-"))) {
          setOptions.add(`${c0} – ${c1}`);
        }
      }
    });

    return Array.from(setOptions);
  }, [dataRows, colIndices]);

  // Extract unique Status options from data
  const statusOptions = useMemo(() => {
    if (colIndices.statusIdx === -1) return [];
    const setOpt = new Set<string>();
    dataRows.forEach((row) => {
      const val = String(row[colIndices.statusIdx] || "").trim();
      if (val) setOpt.add(val);
    });
    return Array.from(setOpt);
  }, [dataRows, colIndices]);

  // Filter data rows based on filter state
  const filteredRows = useMemo(() => {
    return dataRows.filter((row) => {
      // 1. Week Filter
      if (selectedWeek !== "ALL") {
        const rowWeek = colIndices.weekIdx !== -1 ? String(row[colIndices.weekIdx] || "").trim() : "";
        const sDate = colIndices.startDateIdx !== -1 ? String(row[colIndices.startDateIdx] || "").trim() : "";
        const eDate = colIndices.endDateIdx !== -1 ? String(row[colIndices.endDateIdx] || "").trim() : "";
        const comboWeek = sDate && eDate ? `${sDate} – ${eDate}` : sDate;

        if (rowWeek !== selectedWeek && comboWeek !== selectedWeek && !row.join(" ").includes(selectedWeek)) {
          return false;
        }
      }

      // 2. Driver Name Filter
      if (driverSearch.trim()) {
        const query = driverSearch.trim().toLowerCase();
        const driverNameVal = colIndices.nameIdx !== -1 ? String(row[colIndices.nameIdx] || "").toLowerCase() : "";
        const rowFullStr = row.join(" ").toLowerCase();
        if (!driverNameVal.includes(query) && !rowFullStr.includes(query)) {
          return false;
        }
      }

      // 3. ETM ID Filter
      if (etmSearch.trim()) {
        const query = etmSearch.trim().toLowerCase();
        const etmVal = colIndices.etmIdx !== -1 ? String(row[colIndices.etmIdx] || "").toLowerCase() : "";
        if (!etmVal.includes(query)) {
          return false;
        }
      }

      // 4. Date Filter
      if (dateSearch.trim()) {
        const query = dateSearch.trim().toLowerCase();
        const sDate = colIndices.startDateIdx !== -1 ? String(row[colIndices.startDateIdx] || "").toLowerCase() : "";
        const eDate = colIndices.endDateIdx !== -1 ? String(row[colIndices.endDateIdx] || "").toLowerCase() : "";
        const rowText = row.slice(0, 4).join(" ").toLowerCase();
        if (!sDate.includes(query) && !eDate.includes(query) && !rowText.includes(query)) {
          return false;
        }
      }

      // 5. Status Filter
      if (statusFilter !== "ALL" && colIndices.statusIdx !== -1) {
        const stVal = String(row[colIndices.statusIdx] || "").trim().toLowerCase();
        if (stVal !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [dataRows, selectedWeek, driverSearch, etmSearch, dateSearch, statusFilter, colIndices]);

  // Compute Summary Statistics
  const summaryStats = useMemo(() => {
    let totalRental = 0;
    let totalOutstanding = 0;

    filteredRows.forEach((row) => {
      if (colIndices.rentIdx !== -1 && row[colIndices.rentIdx]) {
        totalRental += parseNum(row[colIndices.rentIdx]);
      }
      let osVal: number | null = null;
      if (colIndices.totalOsIdx !== -1 && row[colIndices.totalOsIdx]) {
        osVal = parseNum(row[colIndices.totalOsIdx]);
      } else {
        // Fallback search last column for outstanding
        const lastVal = row[row.length - 1];
        if (lastVal && isNumericVal(lastVal)) {
          osVal = parseNum(lastVal);
        }
      }
      if (osVal !== null && !isNaN(osVal) && osVal < 0) {
        totalOutstanding += Math.abs(osVal);
      }
    });

    return {
      totalRows: filteredRows.length,
      totalRental,
      totalOutstanding
    };
  }, [filteredRows, colIndices]);

  const hasActiveFilters = 
    selectedWeek !== "ALL" || 
    driverSearch.trim() !== "" || 
    etmSearch.trim() !== "" || 
    dateSearch.trim() !== "" || 
    statusFilter !== "ALL";

  const clearAllFilters = () => {
    setSelectedWeek("ALL");
    setDriverSearch("");
    setEtmSearch("");
    setDateSearch("");
    setStatusFilter("ALL");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-[#333333] dark:text-slate-100 p-3 sm:p-5 lg:p-6 space-y-5 transition-colors duration-200">
      
      {/* 1. Header & Live Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#0A2540] dark:text-white tracking-tight">
              Weekly Hissab Master Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Live updated records and partner ledger reconciliation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Publish Weekly Hissab Button */}
          {selectedWeek !== "ALL" ? (
            isCurrentWeekPublished ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Published ✓</span>
              </div>
            ) : (
              <button
                onClick={handleOpenPublishModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                id="btn-admin-publish-weekly-hissab"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Publish Weekly Hissab</span>
              </button>
            )
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-semibold rounded-xl">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Select a Week to Publish</span>
            </div>
          )}

          <button
            onClick={loadWeeklyData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D47A1] hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-60"
            id="btn-admin-refresh-weekly-hissab"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-200" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Sync Live Records"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {publishSuccessMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{publishSuccessMessage}</span>
          </div>
          <button
            onClick={() => setPublishSuccessMessage("")}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowConfirmModal(false)}
              disabled={isPublishing}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0A2540] dark:text-white">
                  Publish Weekly Hissab?
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Confirm publishing for selected week period
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Selected Week:</span>
                <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-lg">
                  {selectedWeek}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Matching Drivers:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {summaryStats.totalRows} drivers listed
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Are you sure you want to publish Weekly Hissab for <span className="font-bold text-slate-900 dark:text-white">{selectedWeek}</span>? Once published, drivers will immediately be able to view their Hissab statements for this week period in the Driver App.
            </p>

            {publishErrorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{publishErrorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isPublishing}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Publish Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Statements Listed</p>
            <p className="text-2xl font-black text-[#0A2540] dark:text-white mt-0.5">{summaryStats.totalRows} <span className="text-xs font-bold text-slate-400">records</span></p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
            <Hash className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Weekly Rental</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">₹{summaryStats.totalRental.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Net Outstanding</p>
            <p className={`text-2xl font-black mt-0.5 ${summaryStats.totalOutstanding > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              ₹{summaryStats.totalOutstanding.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Multi-Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Ledger Filters</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Filter 1: Week Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Week Period</label>
            <div className="relative">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 py-2 pl-2.5 pr-8 rounded-xl text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="ALL">All Weeks</option>
                {weekOptions.map((w, idx) => (
                  <option key={idx} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <Calendar className="pointer-events-none absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Filter 2: Driver Name Search */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Driver Name</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 py-2 pl-8 pr-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Filter 3: ETM ID Search */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">ETM ID</label>
            <div className="relative">
              <input
                type="text"
                placeholder="E.g. ETM029..."
                value={etmSearch}
                onChange={(e) => setEtmSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 py-2 pl-8 pr-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Hash className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Filter 4: Date Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Date Filter</label>
            <div className="relative">
              <input
                type="text"
                placeholder="DD/MM/YYYY or date..."
                value={dateSearch}
                onChange={(e) => setDateSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 py-2 pl-8 pr-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Filter 5: Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 py-2 pl-2.5 pr-8 rounded-xl text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                {statusOptions.map((st, idx) => (
                  <option key={idx} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <CheckCircle2 className="pointer-events-none absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

        </div>
      </div>

      {/* 4. Main Spreadsheet Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1">
        
        {/* Table Container with Horizontal & Vertical Scroll */}
        <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[350px] relative w-full scrollbar-thin">
          
          {isLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Loading live Weekly Hissab records...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">No Weekly Hissab records found</p>
              <p className="text-xs text-slate-500">Try clearing or adjusting your search filters above.</p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs font-sans">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-20 bg-[#08182D] text-white shadow-xs select-none">
                <tr className="divide-x divide-slate-800">
                  {headers.map((headerText, colIdx) => {
                    const isSticky1 = colIdx === colIndices.stickyCol1;
                    const isSticky2 = colIdx === colIndices.stickyCol2;
                    const isEtmCol = colIndices.etmIdx !== -1 && colIdx === colIndices.etmIdx;
                    const isNameCol = colIndices.nameIdx !== -1 && colIdx === colIndices.nameIdx;
                    const isCur = isCurrencyHeader(headerText);

                    return (
                      <th
                        key={colIdx}
                        className={`p-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap bg-[#08182D] ${
                          isSticky1
                            ? "sticky left-0 z-30 shadow-md min-w-[110px]"
                            : isSticky2
                            ? "sticky left-[110px] z-30 shadow-md min-w-[150px]"
                            : "min-w-[120px]"
                        } ${isCur ? "text-right" : "text-left"}`}
                      >
                        {headerText}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {filteredRows.map((row, rowIdx) => {
                  return (
                    <tr
                      key={rowIdx}
                      className="even:bg-slate-50/60 dark:even:bg-slate-800/40 odd:bg-white dark:odd:bg-slate-900 hover:bg-blue-50/80 dark:hover:bg-blue-950/50 transition-colors divide-x divide-slate-200/60 dark:divide-slate-800/60"
                    >
                      {headers.map((headerText, colIdx) => {
                        const cellRaw = String(row[colIdx] || "").trim();
                        const isSticky1 = colIdx === colIndices.stickyCol1;
                        const isSticky2 = colIdx === colIndices.stickyCol2;
                        const isEtmCol = colIndices.etmIdx !== -1 && colIdx === colIndices.etmIdx;
                        const isNameCol = colIndices.nameIdx !== -1 && colIdx === colIndices.nameIdx;
                        const isCur = isCurrencyHeader(headerText);
                        const isDate =
                          headerText.toLowerCase().includes("date") ||
                          /^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}$/.test(cellRaw) ||
                          /^\d{4}-\d{2}-\d{2}/.test(cellRaw);

                        // Formatting cell display
                        let displayVal = cellRaw;
                        let cellClass = "text-slate-800 dark:text-slate-200";

                        if (isCur && isNumericVal(cellRaw)) {
                          const formatted = formatCurrencyCell(cellRaw);
                          displayVal = formatted.text;
                          if (formatted.isNegative) {
                            cellClass = "text-red-600 dark:text-red-400 font-bold font-mono";
                          } else if (!formatted.isZero) {
                            cellClass = "text-emerald-700 dark:text-emerald-400 font-semibold font-mono";
                          } else {
                            cellClass = "text-slate-400 font-mono";
                          }
                        } else if (isDate) {
                          displayVal = formatDateCell(cellRaw);
                          cellClass = "text-slate-600 dark:text-slate-400 text-center font-mono";
                        } else if (isEtmCol) {
                          cellClass = "font-black text-[#0A2540] dark:text-blue-300 tracking-wide text-center";
                        } else if (isNameCol) {
                          cellClass = "font-extrabold text-slate-900 dark:text-white";
                        }

                        return (
                          <td
                            key={colIdx}
                            className={`p-3 whitespace-nowrap text-xs ${cellClass} ${
                              isSticky1
                                ? "sticky left-0 z-10 bg-inherit shadow-md min-w-[110px]"
                                : isSticky2
                                ? "sticky left-[110px] z-10 bg-inherit shadow-md min-w-[150px]"
                                : ""
                            } ${isCur ? "text-right" : isDate || isEtmCol ? "text-center" : "text-left"}`}
                          >
                            {displayVal || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer / Pagination stats */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredRows.length}</strong> of <strong className="text-slate-800 dark:text-slate-200">{dataRows.length}</strong> records
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            System Status: Live Synchronized
          </span>
        </div>

      </div>

    </div>
  );
}
