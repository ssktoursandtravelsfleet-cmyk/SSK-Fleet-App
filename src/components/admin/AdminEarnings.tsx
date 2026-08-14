import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  RefreshCw,
  Search,
  Download,
  Filter,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Car,
  User,
  Hash,
  Coins
} from "lucide-react";
import { fetchDailyHissabEarningsSheet } from "../../lib/sheets";
import { formatVehicleNumber } from "../../lib/sheets";

interface AdminEarningsProps {
  accessToken?: string | null;
}

interface SortConfig {
  colIndex: number;
  direction: "asc" | "desc";
}

/**
 * Format numeric currency cell for Indian numbering format
 */
function formatCurrency(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === "") return "₹0";
  const str = String(val).replace(/[^0-9.-]/g, "").trim();
  if (!str || str === "-" || str === ".") return "₹0";
  const num = Number(str);
  if (isNaN(num)) return String(val);
  if (num < 0) {
    return `-₹${Math.abs(num).toLocaleString("en-IN")}`;
  }
  return `₹${num.toLocaleString("en-IN")}`;
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
function parseNum(val: string | undefined | null): number {
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9.-]/g, "").trim();
  if (!clean || clean === "-" || clean === ".") return 0;
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Determine if a column header represents financial/currency data
 */
function isCurrencyHeader(headerStr: string): boolean {
  const h = String(headerStr || "").toLowerCase();
  return (
    h.includes("rent") ||
    h.includes("earning") ||
    h.includes("earnings") ||
    h.includes("cash") ||
    h.includes("tip") ||
    h.includes("toll") ||
    h.includes("pass") ||
    h.includes("payout") ||
    h.includes("recovery") ||
    h.includes("o/s") ||
    h.includes("os") ||
    h.includes("outstanding") ||
    h.includes("insurance") ||
    h.includes("amount")
  );
}

/**
 * Helper to get clean, proportional column width classes matching source structure
 */
function getColumnWidthClass(colIdx: number, headerName: string): string {
  const h = String(headerName || "").toLowerCase();
  
  if (h.includes("ssk id") || h.includes("sskid") || colIdx === 0) {
    return "w-28 min-w-[100px]";
  }
  if (h.includes("etm") || colIdx === 1) {
    return "w-28 min-w-[100px]";
  }
  if (h.includes("name") || h.includes("driver") || colIdx === 2) {
    return "w-52 min-w-[190px]";
  }
  if (h.includes("car") || h.includes("vehicle") || colIdx === 3) {
    return "w-36 min-w-[130px]";
  }
  if (h.includes("days") || colIdx === 4 || colIdx === 5) {
    return "w-32 min-w-[115px]";
  }
  if (h.includes("trip") || colIdx === 6) {
    return "w-24 min-w-[85px]";
  }
  if (h.includes("rent") || colIdx === 7 || colIdx === 8) {
    return "w-36 min-w-[130px]";
  }
  if (h.includes("insurance") || colIdx === 9) {
    return "w-32 min-w-[115px]";
  }
  if (h.includes("total earnings") || colIdx === 10) {
    return "w-40 min-w-[145px]";
  }
  if (h.includes("cash") || colIdx === 11) {
    return "w-36 min-w-[135px]";
  }
  if (h.includes("tip") || colIdx === 12) {
    return "w-28 min-w-[95px]";
  }
  if (h.includes("toll") || colIdx === 13) {
    return "w-32 min-w-[110px]";
  }
  if (h.includes("pass") || colIdx === 14) {
    return "w-32 min-w-[115px]";
  }
  if (h.includes("payout") || colIdx === 15) {
    return "w-40 min-w-[145px]";
  }
  if (h.includes("recovery") || colIdx === 16 || colIdx === 17) {
    return "w-36 min-w-[130px]";
  }
  if (h.includes("o/s") || h.includes("os") || colIdx === 18) {
    return "w-40 min-w-[145px]";
  }

  return "min-w-[120px]";
}

export default function AdminEarnings({ accessToken }: AdminEarningsProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters and controls
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<"ALL" | "WITH_EARNINGS" | "WITH_PAYOUT" | "WITH_OS">("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Load Daily Earnings data
  const loadData = async (force: boolean = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await fetchDailyHissabEarningsSheet(accessToken, force);
      
      // Strictly guarantee max 19 columns (A:S)
      const safeHeaders = (result.headers || []).slice(0, 19);
      const safeRows = (result.rows || []).map(row => (row || []).slice(0, 19));

      setHeaders(safeHeaders);
      setRawRows(safeRows);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Error loading daily earnings data:", err);
      setError(err?.message || "Failed to load Earnings data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [accessToken]);

  // Find column indices dynamically based on header names (with fallback indices)
  const colIndices = useMemo(() => {
    const findIdx = (keywords: string[], fallback: number): number => {
      const idx = headers.findIndex(h => {
        const lower = h.toLowerCase();
        return keywords.some(k => lower.includes(k));
      });
      return idx !== -1 ? idx : Math.min(fallback, headers.length - 1);
    };

    return {
      sskId: findIdx(["ssk id", "sskid", "id"], 0),
      etm: findIdx(["etm"], 1),
      name: findIdx(["name", "driver"], 2),
      carNo: findIdx(["car no", "car", "vehicle"], 3),
      totalEarnings: findIdx(["total earnings", "total earning", "earning"], 10),
      uberCash: findIdx(["uber cash", "cash"], 11),
      tip: findIdx(["tip"], 12),
      toll: findIdx(["toll"], 13),
      onlinePayout: findIdx(["driver online payout", "online payout", "payout"], 15),
      recovery: findIdx(["total recovery", "recovery"], 17),
      currentOs: findIdx(["current total o/s", "total o/s", "o/s", "os"], 18),
      workedDays: findIdx(["worked days", "uber worked days"], 5),
      trips: findIdx(["trip", "trips"], 6)
    };
  }, [headers]);

  // Aggregate KPI summary stats strictly based on specific column rules
  const kpiStats = useMemo(() => {
    let totalDrivers = 0;
    let totalEarnings = 0;
    let totalCash = 0;
    let totalOnlinePayout = 0;
    let totalRecovery = 0;
    let totalOs = 0;
    let totalTrips = 0;

    rawRows.forEach(row => {
      // 1. DRIVERS: Count only rows where Column A has a non-empty value
      const colAVal = row[0] !== undefined ? String(row[0] ?? "").trim() : "";
      if (colAVal.length > 0) {
        totalDrivers++;
      }

      // Total Earnings: Column K (index 10)
      const earnIdx = colIndices.totalEarnings >= 0 ? colIndices.totalEarnings : 10;
      if (row[earnIdx]) {
        totalEarnings += parseNum(row[earnIdx]);
      }

      // Uber Cash: Column L (index 11)
      const cashIdx = colIndices.uberCash >= 0 ? colIndices.uberCash : 11;
      if (row[cashIdx]) {
        totalCash += parseNum(row[cashIdx]);
      }

      // Online Payout: Column P (index 15)
      const payoutIdx = colIndices.onlinePayout >= 0 ? colIndices.onlinePayout : 15;
      if (row[payoutIdx]) {
        totalOnlinePayout += parseNum(row[payoutIdx]);
      }

      // 2. TOTAL RECOVERY: Calculate strictly from Column R (index 17)
      const recoveryIdx = colIndices.recovery >= 0 ? colIndices.recovery : 17;
      if (row[recoveryIdx]) {
        totalRecovery += parseNum(row[recoveryIdx]);
      }

      // 3. TOTAL O/S: Calculate strictly from Column S (index 18) - ONLY NEGATIVE VALUES
      const osIdx = colIndices.currentOs >= 0 ? colIndices.currentOs : 18;
      if (row[osIdx]) {
        const val = parseNum(row[osIdx]);
        if (val < 0) {
          totalOs += val;
        }
      }

      // Trips: Column G (index 6)
      const tripIdx = colIndices.trips >= 0 ? colIndices.trips : 6;
      if (row[tripIdx]) {
        totalTrips += parseNum(row[tripIdx]);
      }
    });

    return {
      totalDrivers,
      totalEarnings,
      totalCash,
      totalOnlinePayout,
      totalRecovery,
      totalOs,
      totalTrips
    };
  }, [rawRows, colIndices]);

  // Filtered & Sorted rows
  const filteredAndSortedRows = useMemo(() => {
    let result = [...rawRows];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(row => {
        return row.some(cell => String(cell || "").toLowerCase().includes(q));
      });
    }

    // Quick category filters
    if (filterType === "WITH_EARNINGS" && colIndices.totalEarnings >= 0) {
      result = result.filter(row => parseNum(row[colIndices.totalEarnings]) > 0);
    } else if (filterType === "WITH_PAYOUT" && colIndices.onlinePayout >= 0) {
      result = result.filter(row => parseNum(row[colIndices.onlinePayout]) > 0);
    } else if (filterType === "WITH_OS" && colIndices.currentOs >= 0) {
      result = result.filter(row => parseNum(row[colIndices.currentOs]) !== 0);
    }

    // Sorting
    if (sortConfig !== null) {
      const { colIndex, direction } = sortConfig;
      result.sort((a, b) => {
        const valA = a[colIndex] || "";
        const valB = b[colIndex] || "";

        const numA = parseNum(valA);
        const numB = parseNum(valB);

        const isBothNumeric = isNumericVal(valA) && isNumericVal(valB);

        if (isBothNumeric) {
          return direction === "asc" ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [rawRows, searchTerm, filterType, sortConfig, colIndices]);

  // Pagination calculation
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredAndSortedRows.length / (pageSize || 25));
  const paginatedRows = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedRows;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  // Adjust page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, pageSize]);

  // Handle header sorting click
  const handleSort = (colIndex: number) => {
    if (sortConfig && sortConfig.colIndex === colIndex) {
      if (sortConfig.direction === "asc") {
        setSortConfig({ colIndex, direction: "desc" });
      } else {
        setSortConfig(null); // Reset sort
      }
    } else {
      setSortConfig({ colIndex, direction: "asc" });
    }
  };

  // Export data to CSV
  const handleExportCSV = () => {
    if (headers.length === 0 || rawRows.length === 0) return;

    const safeExportHeaders = headers.slice(0, 19);
    const csvHeaderLine = safeExportHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(",");
    
    const csvDataLines = filteredAndSortedRows.map(row => {
      const safeRow = row.slice(0, 19);
      while (safeRow.length < safeExportHeaders.length) safeRow.push("");
      return safeRow.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [csvHeaderLine, ...csvDataLines].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daily_Earnings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-[#0A3880] p-6 rounded-2xl text-white shadow-md border border-blue-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <TrendingUp className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Daily Earnings</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Live Data
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Daily earnings and driver performance records
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lastUpdated && (
            <span className="text-[11px] text-blue-200/80 hidden sm:inline-block">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-medium text-white transition-all border border-white/15 disabled:opacity-50 cursor-pointer"
            title="Refresh Earnings Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isLoading || rawRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Drivers</span>
            <UsersIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">{kpiStats.totalDrivers.toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-slate-500">Total Active Drivers</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Earnings</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700">₹{kpiStats.totalEarnings.toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-slate-500">Total Gross Earnings</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Uber Cash</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {kpiStats.totalCash < 0 ? `-₹${Math.abs(kpiStats.totalCash).toLocaleString("en-IN")}` : `₹${kpiStats.totalCash.toLocaleString("en-IN")}`}
          </div>
          <div className="text-[10px] text-slate-500">Collected Cash</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Online Payout</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-indigo-700">₹{kpiStats.totalOnlinePayout.toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-slate-500">Net Online Payout</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Recovery</span>
            <RefreshCw className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-purple-700">₹{kpiStats.totalRecovery.toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-slate-500">Total Recovery</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total O/S</span>
            <FileSpreadsheet className="w-4 h-4 text-rose-600" />
          </div>
          <div className={`text-lg font-bold ${kpiStats.totalOs < 0 ? "text-rose-600" : "text-slate-900"}`}>
            {kpiStats.totalOs < 0 ? `-₹${Math.abs(kpiStats.totalOs).toLocaleString("en-IN")}` : "₹0"}
          </div>
          <div className="text-[10px] text-slate-500">Current Balance</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Driver, ETM, SSk ID, Car Number..."
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter chips & Page Size selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                filterType === "ALL" ? "bg-white text-[#0A3880] shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({rawRows.length})
            </button>
            <button
              onClick={() => setFilterType("WITH_EARNINGS")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                filterType === "WITH_EARNINGS" ? "bg-white text-[#0A3880] shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Earnings &gt; 0
            </button>
            <button
              onClick={() => setFilterType("WITH_PAYOUT")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                filterType === "WITH_PAYOUT" ? "bg-white text-[#0A3880] shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Payout &gt; 0
            </button>
            <button
              onClick={() => setFilterType("WITH_OS")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                filterType === "WITH_OS" ? "bg-white text-[#0A3880] shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              With O/S
            </button>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs py-1 px-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Loading state */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-600">Loading daily earnings data...</p>
            <p className="text-xs text-slate-400">Fetching driver performance & hissab records</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Failed to load earnings data</h3>
            <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadData(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : rawRows.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No earnings records found</h3>
            <p className="text-xs text-slate-500">No daily earnings data is available at this time.</p>
          </div>
        ) : (
          <div>
            {/* Scrollable Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200">
                    <th className="px-3.5 py-3 text-[11px] font-bold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-100 z-10 w-12 text-center">
                      #
                    </th>
                    {headers.slice(0, 19).map((header, idx) => {
                      const isSorted = sortConfig?.colIndex === idx;
                      const widthClass = getColumnWidthClass(idx, header);
                      return (
                        <th
                          key={idx}
                          onClick={() => handleSort(idx)}
                          className={`px-3.5 py-3 text-[11px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-200/80 transition-colors select-none group ${widthClass}`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate">{header}</span>
                            <span className="text-slate-400 group-hover:text-slate-700 shrink-0">
                              {isSorted ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length + 1} className="py-12 text-center text-slate-500">
                        No records match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, rowIdx) => {
                      const absoluteIndex = pageSize === -1 ? rowIdx + 1 : (currentPage - 1) * pageSize + rowIdx + 1;
                      return (
                        <tr
                          key={rowIdx}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          {/* Row Number */}
                          <td className="px-3.5 py-2.5 text-[11px] font-mono text-slate-400 sticky left-0 bg-white group-hover:bg-blue-50/40 z-10 text-center">
                            {absoluteIndex}
                          </td>

                          {/* Columns A through S */}
                          {headers.slice(0, 19).map((headerName, colIdx) => {
                            const rawVal = row[colIdx] ?? "";
                            const isCurrency = isCurrencyHeader(headerName);
                            const num = parseNum(rawVal);
                            const widthClass = getColumnWidthClass(colIdx, headerName);

                            // Custom cell rendering based on column type
                            let cellContent: React.ReactNode = rawVal;

                            if (colIdx === colIndices.sskId && rawVal) {
                              cellContent = (
                                <span className="font-mono font-semibold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                                  {rawVal}
                                </span>
                              );
                            } else if (colIdx === colIndices.etm && rawVal) {
                              cellContent = (
                                <span className="font-mono font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                  {rawVal}
                                </span>
                              );
                            } else if (colIdx === colIndices.name && rawVal) {
                              cellContent = (
                                <span className="font-medium text-slate-900">
                                  {rawVal}
                                </span>
                              );
                            } else if (colIdx === colIndices.carNo && rawVal) {
                              cellContent = (
                                <span className="font-mono font-semibold text-slate-800">
                                  {formatVehicleNumber(rawVal) || rawVal}
                                </span>
                              );
                            } else if (isCurrency && isNumericVal(rawVal)) {
                              if (colIdx === colIndices.totalEarnings) {
                                cellContent = (
                                  <span className="font-semibold text-emerald-700">
                                    {formatCurrency(num)}
                                  </span>
                                );
                              } else if (colIdx === colIndices.onlinePayout) {
                                cellContent = (
                                  <span className="font-semibold text-indigo-700">
                                    {formatCurrency(num)}
                                  </span>
                                );
                              } else if (colIdx === colIndices.currentOs) {
                                cellContent = (
                                  <span className={`font-semibold ${num < 0 ? "text-rose-600" : "text-slate-800"}`}>
                                    {formatCurrency(num)}
                                  </span>
                                );
                              } else if (num < 0) {
                                cellContent = (
                                  <span className="text-rose-600 font-medium">
                                    {formatCurrency(num)}
                                  </span>
                                );
                              } else {
                                cellContent = (
                                  <span className="text-slate-700 font-medium">
                                    {formatCurrency(num)}
                                  </span>
                                );
                              }
                            }

                            return (
                              <td
                                key={colIdx}
                                className={`px-3.5 py-2.5 text-slate-700 whitespace-nowrap ${widthClass}`}
                              >
                                {cellContent !== "" && cellContent !== null && cellContent !== undefined ? (
                                  cellContent
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900">
                    {Math.min(currentPage * pageSize, filteredAndSortedRows.length)}
                  </span>{" "}
                  of <span className="font-semibold text-slate-900">{filteredAndSortedRows.length}</span> entries
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 3 + i;
                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            currentPage === pageNum
                              ? "bg-[#0A3880] text-white shadow-2xs"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

