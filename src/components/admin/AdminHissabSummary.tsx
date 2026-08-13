import React, { useState, useEffect, useMemo } from "react";
import { 
  RefreshCw, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  User, 
  Hash, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  X,
  SlidersHorizontal
} from "lucide-react";
import { fetchHissabSummarySheet } from "../../lib/sheets";

interface AdminHissabSummaryProps {
  accessToken?: string | null;
}

/**
 * Clean & preserve exact values from Google Sheet "Hissab Summary"
 */
function formatCellDisplay(val: any): string {
  if (val === null || val === undefined) return "-";
  const str = String(val).trim();
  if (str === "") return "-";

  // Check if string is ISO date or standard date representation like YYYY-MM-DD
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
 * Check if a string looks like a currency/financial column header
 */
function isAmountHeader(headerName: string): boolean {
  if (!headerName) return false;
  const h = headerName.toLowerCase();
  return (
    h.includes("amount") ||
    h.includes("hissab") ||
    h.includes("earning") ||
    h.includes("payout") ||
    h.includes("net") ||
    h.includes("total") ||
    h.includes("incentive") ||
    h.includes("penalty") ||
    h.includes("deduction") ||
    h.includes("fuel") ||
    h.includes("advance") ||
    h.includes("balance") ||
    h.includes("outstanding") ||
    h.includes("rent") ||
    h.includes("pay")
  );
}

export default function AdminHissabSummary({ accessToken }: AdminHissabSummaryProps) {
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<{ colIndex: number; value: string }>({
    colIndex: -1,
    value: "all"
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedMobileRowIndex, setExpandedMobileRowIndex] = useState<number | null>(null);

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const sheetData = await fetchHissabSummarySheet(accessToken, forceRefresh);
      if (Array.isArray(sheetData)) {
        setRawRows(sheetData);
      } else {
        setRawRows([]);
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Error loading Google Sheet 'Hissab Summary':", err);
      setError("Unable to load Hissab Summary data. Please try again.");
      setRawRows([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Auto refresh periodically (every 2 minutes)
    const interval = setInterval(() => {
      loadData(true);
    }, 120000);

    return () => clearInterval(interval);
  }, [accessToken]);

  // Headers are Row 1 of Hissab Summary sheet
  const headers = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];
    return rawRows[0].map((h) => (h ? String(h).trim() : ""));
  }, [rawRows]);

  // Filter out completely blank rows from data rows
  const validDataRows = useMemo(() => {
    if (!rawRows || rawRows.length <= 1) return [];
    return rawRows.slice(1).filter((row) => {
      if (!row || !Array.isArray(row)) return false;
      return row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
    });
  }, [rawRows]);

  // Identify index of potential filterable columns (e.g. Week, Status, Vehicle No, Driver Name)
  const filterableColumns = useMemo(() => {
    if (!headers.length) return [];
    return headers
      .map((header, index) => {
        const uniqueVals = Array.from(
          new Set(
            validDataRows
              .map((r) => (r[index] ? String(r[index]).trim() : ""))
              .filter((v) => v !== "")
          )
        );
        return {
          index,
          name: header,
          uniqueValues: uniqueVals
        };
      })
      .filter((col) => col.uniqueValues.length > 1 && col.uniqueValues.length <= 50);
  }, [headers, validDataRows]);

  // Apply search & column filters
  const filteredRows = useMemo(() => {
    let result = validDataRows;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((row) =>
        row.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
      );
    }

    // Column filter
    if (selectedColumnFilter.colIndex >= 0 && selectedColumnFilter.value !== "all") {
      result = result.filter((row) => {
        const val = row[selectedColumnFilter.colIndex]
          ? String(row[selectedColumnFilter.colIndex]).trim()
          : "";
        return val.toLowerCase() === selectedColumnFilter.value.toLowerCase();
      });
    }

    return result;
  }, [validDataRows, searchTerm, selectedColumnFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  Hissab Summary
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Google Sheet Tab: Hissab Summary
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Single source of truth loaded directly from Google Sheet tab <span className="font-bold text-slate-700 dark:text-slate-300">"Hissab Summary"</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons & Sync Status */}
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline-block">
                Last synced: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading || isRefreshing}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Sync / Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Driver ID, ETM ID, Name, Vehicle, Date..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dynamic Column Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {filterableColumns.length > 0 && (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={
                    selectedColumnFilter.colIndex >= 0
                      ? `${selectedColumnFilter.colIndex}:${selectedColumnFilter.value}`
                      : "all"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "all") {
                      setSelectedColumnFilter({ colIndex: -1, value: "all" });
                    } else {
                      const [idxStr, ...vParts] = val.split(":");
                      setSelectedColumnFilter({
                        colIndex: Number(idxStr),
                        value: vParts.join(":")
                      });
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                >
                  <option value="all">Filter by column...</option>
                  {filterableColumns.map((col) =>
                    col.uniqueValues.map((val) => (
                      <option key={`${col.index}:${val}`} value={`${col.index}:${val}`}>
                        {col.name}: {val}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Total Count Badge */}
            <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0 flex items-center gap-1.5 ml-auto">
              <span>Rows:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">
                {filteredRows.length}
              </span>
              {validDataRows.length !== filteredRows.length && (
                <span className="text-[10px] text-slate-400 font-normal">
                  (of {validDataRows.length})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-5 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-extrabold">Connection Issue</h4>
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300 mt-0.5">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        /* Loading Skeleton */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-48 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-24 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
          <p className="text-center text-xs font-bold text-slate-400 py-2">
            Loading live data from Google Sheet "Hissab Summary"...
          </p>
        </div>
      ) : validDataRows.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            No Hissab Summary data available.
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            The Google Sheet tab <span className="font-semibold text-slate-600 dark:text-slate-300">"Hissab Summary"</span> does not contain any valid records at this moment.
          </p>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="mt-5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Again
          </button>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center text-slate-400">#</th>
                  {headers.map((header, colIdx) => (
                    <th
                      key={colIdx}
                      className={`py-3.5 px-4 whitespace-nowrap font-extrabold ${
                        isAmountHeader(header) ? "text-right" : "text-left"
                      }`}
                    >
                      {header || `Col ${colIdx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="py-8 text-center text-slate-400 font-medium">
                      No records match your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-900 dark:even:bg-slate-800/20"
                    >
                      <td className="py-3 px-4 text-center text-[10px] font-mono text-slate-400 font-bold">
                        {rowIndex + 1}
                      </td>
                      {headers.map((header, colIdx) => {
                        const rawCell = row[colIdx];
                        const cellText = formatCellDisplay(rawCell);
                        const isAmt = isAmountHeader(header);

                        return (
                          <td
                            key={colIdx}
                            className={`py-3 px-4 whitespace-nowrap ${
                              isAmt ? "text-right font-mono font-bold text-slate-900 dark:text-white" : "font-medium"
                            }`}
                          >
                            {cellText}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="block md:hidden p-4 space-y-3">
            {filteredRows.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">
                No records match your search filter.
              </div>
            ) : (
              filteredRows.map((row, rowIndex) => {
                const isExpanded = expandedMobileRowIndex === rowIndex;

                // Pick primary display values for card header
                const primaryCol1 = headers[0] ? `${headers[0]}: ${row[0] || "-"}` : `Row #${rowIndex + 1}`;
                const primaryCol2 = headers[1] ? `${headers[1]}: ${row[1] || "-"}` : "";
                const primaryCol3 = headers[2] ? `${headers[2]}: ${row[2] || "-"}` : "";

                return (
                  <div
                    key={rowIndex}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                      <span className="text-[10px] font-mono font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md">
                        Record #{rowIndex + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMobileRowIndex(isExpanded ? null : rowIndex)
                        }
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? "Collapse" : "View Full Row"}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {row.slice(0, 4).map((cellVal, colIdx) => (
                        <div key={colIdx}>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">
                            {headers[colIdx] || `Col ${colIdx + 1}`}
                          </span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 truncate block">
                            {formatCellDisplay(cellVal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Expandable all fields */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-1 gap-2 text-xs animate-fade-in">
                        {headers.map((header, colIdx) => (
                          <div
                            key={colIdx}
                            className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/50 last:border-none"
                          >
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {header || `Column ${colIdx + 1}`}
                            </span>
                            <span className="font-mono font-extrabold text-slate-900 dark:text-white text-right ml-2">
                              {formatCellDisplay(row[colIdx])}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Showing {filteredRows.length} valid rows</span>
            <span className="font-mono text-[11px]">Source: Google Sheet "Hissab Summary"</span>
          </div>
        </div>
      )}
    </div>
  );
}
