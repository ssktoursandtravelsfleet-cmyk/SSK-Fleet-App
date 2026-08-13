import React, { useState, useEffect, useMemo } from "react";
import { 
  RefreshCw, 
  Search, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  X, 
  SlidersHorizontal,
  Upload,
  Edit2,
  Save,
  Check,
  Lock,
  ShieldAlert,
  History,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle
} from "lucide-react";
import { DriverDetails } from "../../types";
import { fetchHissabSummarySheet } from "../../lib/sheets";
import { updateHissabSummaryCell, insertHissabSummaryRecordsAtTop } from "../../lib/googleSheets";

interface AdminHissabSummaryProps {
  accessToken?: string | null;
  currentAdminDriver?: DriverDetails | null;
}

interface RowRecord {
  sheetRowIndex: number; // 1-based index in Google Sheet
  values: string[];
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  rowNumber: number;
  colName: string;
  prevVal: string;
  newVal: string;
}

/**
 * Format date display safely without altering raw value
 */
function formatCellDisplay(val: any): string {
  if (val === null || val === undefined) return "-";
  const str = String(val).trim();
  if (str === "") return "-";

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
 * Identify if a column is a financial / amount column
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
    h.includes("pay") ||
    h.includes("fare") ||
    h.includes("charge") ||
    h.includes("fine") ||
    h.includes("collection") ||
    h.includes("cash")
  );
}

/**
 * Simple CSV parser handling quotes and commas
 */
function parseCsvContent(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c !== "")) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c !== "")) {
      lines.push(currentRow);
    }
  }

  return lines;
}

export default function AdminHissabSummary({
  accessToken,
  currentAdminDriver
}: AdminHissabSummaryProps) {
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<{ colIndex: number; value: string }>({
    colIndex: -1,
    value: "all"
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Sync state
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedMobileRowIndex, setExpandedMobileRowIndex] = useState<number | null>(null);

  // Inline Cell Editing
  const [editingCell, setEditingCell] = useState<{
    sheetRowIndex: number;
    colIndex: number;
    colName: string;
    currentValue: string;
    editValue: string;
  } | null>(null);
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);

  // Notifications / Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Audit Log
  const [auditTrail, setAuditTrail] = useState<AuditLog[]>([]);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  // CSV Upload Modal States
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMappedRows, setCsvMappedRows] = useState<string[][]>([]);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [extraHeaders, setExtraHeaders] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "insert_all">("skip");
  const [isUploadingCsv, setIsUploadingCsv] = useState<boolean>(false);
  const [csvUploadMessage, setCsvUploadMessage] = useState<string>("");

  // Check permissions (Admin/Super Admin only)
  const isUserAuthorized = useMemo(() => {
    if (!currentAdminDriver) return true; // Default admin mode inside Admin Panel
    const role = (currentAdminDriver.role || currentAdminDriver.Role || currentAdminDriver.User_Type || "").toLowerCase();
    const permissions = (currentAdminDriver.Permissions || "").toLowerCase();
    if (role.includes("viewer") || permissions.includes("read_only") || permissions.includes("view_only")) {
      return false;
    }
    return true;
  }, [currentAdminDriver]);

  // Load data directly from Google Sheet "Hissab Summary" ONLY
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
      setError("Unable to load Hissab Summary. Please check the Google Sheet connection and try again.");
      setRawRows([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Auto refresh periodically every 2 minutes
    const interval = setInterval(() => {
      loadData(true);
    }, 120000);

    return () => clearInterval(interval);
  }, [accessToken]);

  // Show Toast Auto Dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Extract Row 1 as Headers
  const headers = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];
    return rawRows[0].map((h) => (h ? String(h).trim() : ""));
  }, [rawRows]);

  // Map data rows preserving exact 1-based Google Sheet row index
  const dataRecords = useMemo<RowRecord[]>(() => {
    if (!rawRows || rawRows.length <= 1) return [];
    const list: RowRecord[] = [];
    for (let i = 1; i < rawRows.length; i++) {
      const rowArr = rawRows[i];
      // Filter out completely blank rows
      if (rowArr && Array.isArray(rowArr) && rowArr.some((c) => c !== null && c !== undefined && String(c).trim() !== "")) {
        list.push({
          sheetRowIndex: i + 1, // Google Sheet 1-based row index (Header = 1, Data Starts = 2)
          values: rowArr
        });
      }
    }
    return list;
  }, [rawRows]);

  // Dynamic filterable columns
  const filterableColumns = useMemo(() => {
    if (!headers.length) return [];
    return headers
      .map((header, index) => {
        const uniqueVals = Array.from(
          new Set(
            dataRecords
              .map((r) => (r.values[index] ? String(r.values[index]).trim() : ""))
              .filter((v) => v !== "")
          )
        );
        return {
          index,
          name: header,
          uniqueValues: uniqueVals
        };
      })
      .filter((col) => col.uniqueValues.length > 1 && col.uniqueValues.length <= 60);
  }, [headers, dataRecords]);

  // Filtered rows
  const filteredRecords = useMemo(() => {
    let result = dataRecords;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((rec) =>
        rec.values.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
      );
    }

    if (selectedColumnFilter.colIndex >= 0 && selectedColumnFilter.value !== "all") {
      result = result.filter((rec) => {
        const val = rec.values[selectedColumnFilter.colIndex]
          ? String(rec.values[selectedColumnFilter.colIndex]).trim()
          : "";
        return val.toLowerCase() === selectedColumnFilter.value.toLowerCase();
      });
    }

    return result;
  }, [dataRecords, searchTerm, selectedColumnFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedColumnFilter, itemsPerPage]);

  // Handle Save Amount Edit to Google Sheet
  const handleSaveCellEdit = async () => {
    if (!editingCell) return;
    setIsSavingCell(true);

    try {
      await updateHissabSummaryCell(
        editingCell.sheetRowIndex,
        editingCell.colIndex,
        editingCell.editValue,
        accessToken
      );

      // Update local state row ONLY after Google Sheet write succeeds
      setRawRows((prev) => {
        const next = [...prev];
        const targetRow = [...(next[editingCell.sheetRowIndex - 1] || [])];
        targetRow[editingCell.colIndex] = editingCell.editValue;
        next[editingCell.sheetRowIndex - 1] = targetRow;
        return next;
      });

      // Log Audit Entry
      const newAudit: AuditLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleString(),
        user: currentAdminDriver?.name || "Admin User",
        rowNumber: editingCell.sheetRowIndex,
        colName: editingCell.colName,
        prevVal: editingCell.currentValue,
        newVal: editingCell.editValue
      };
      setAuditTrail((prev) => [newAudit, ...prev]);

      setToast({
        type: "success",
        text: `Saved successfully to Google Sheet (Row ${editingCell.sheetRowIndex}, Column ${editingCell.colName})`
      });

      setEditingCell(null);
    } catch (err: any) {
      console.error("Failed to update Google Sheet cell:", err);
      setToast({
        type: "error",
        text: "Unable to save changes to Google Sheets. Please check your connection and try again."
      });
    } finally {
      setIsSavingCell(false);
    }
  };

  // Handle CSV File Selection
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsed = parseCsvContent(text);
      if (parsed.length === 0) {
        setToast({ type: "error", text: "The selected CSV file is empty." });
        return;
      }

      const rawCsvHeaders = parsed[0];
      const rawCsvData = parsed.slice(1);

      setCsvHeaders(rawCsvHeaders);
      setCsvRawRows(rawCsvData);

      // Check header match against Google Sheet headers
      const sheetHeaderNorm = headers.map((h) => h.toLowerCase().trim());
      const csvHeaderNorm = rawCsvHeaders.map((h) => h.toLowerCase().trim());

      const missing = headers.filter((h) => !csvHeaderNorm.includes(h.toLowerCase().trim()));
      const extra = rawCsvHeaders.filter((h) => !sheetHeaderNorm.includes(h.toLowerCase().trim()));

      setMissingHeaders(missing);
      setExtraHeaders(extra);

      // Map CSV rows to match Google Sheet header column order exactly
      const mapped: string[][] = rawCsvData.map((csvRow) => {
        return headers.map((sheetH) => {
          const matchIdx = rawCsvHeaders.findIndex(
            (ch) => ch.trim().toLowerCase() === sheetH.trim().toLowerCase()
          );
          if (matchIdx >= 0 && csvRow[matchIdx] !== undefined) {
            return csvRow[matchIdx];
          }
          return "";
        });
      });

      setCsvMappedRows(mapped);

      // Duplicate check (by driver/etm/date/week or row string)
      let dupes = 0;
      const existingSignatures = new Set(
        dataRecords.map((r) => r.values.map((v) => String(v).trim()).join("|"))
      );

      mapped.forEach((mRow) => {
        const sig = mRow.map((v) => String(v).trim()).join("|");
        if (existingSignatures.has(sig)) {
          dupes++;
        }
      });

      setDuplicateCount(dupes);
    };

    reader.readAsText(file);
  };

  // Handle Confirm CSV Upload (INSERT AT TOP)
  const handleConfirmCsvUpload = async () => {
    if (!csvMappedRows.length) return;
    setIsUploadingCsv(true);
    setCsvUploadMessage("Inserting new CSV records at TOP of Google Sheet 'Hissab Summary'...");

    try {
      // Filter out duplicates if duplicateStrategy is 'skip'
      let rowsToInsert = csvMappedRows;
      if (duplicateStrategy === "skip") {
        const existingSignatures = new Set(
          dataRecords.map((r) => r.values.map((v) => String(v).trim()).join("|"))
        );
        rowsToInsert = csvMappedRows.filter((mRow) => {
          const sig = mRow.map((v) => String(v).trim()).join("|");
          return !existingSignatures.has(sig);
        });
      }

      if (rowsToInsert.length === 0) {
        setToast({ type: "error", text: "No new non-duplicate records to insert." });
        setIsUploadingCsv(false);
        return;
      }

      // Existing data rows array (excluding header)
      const existingDataRows = dataRecords.map((rec) => rec.values);

      // Execute Google Sheet Range Write: Insert new rows at TOP (below Row 1 header)
      await insertHissabSummaryRecordsAtTop(
        headers,
        rowsToInsert,
        existingDataRows,
        accessToken
      );

      setToast({
        type: "success",
        text: `CSV uploaded successfully. ${rowsToInsert.length} new records added at the TOP of Hissab Summary.`
      });

      // Close modal and refresh live sheet data
      setShowCsvModal(false);
      setCsvFile(null);
      setCsvMappedRows([]);
      await loadData(true);
    } catch (err: any) {
      console.error("CSV upload error:", err);
      setToast({
        type: "error",
        text: "CSV upload failed. No existing Hissab Summary data was changed."
      });
    } finally {
      setIsUploadingCsv(false);
      setCsvUploadMessage("");
    }
  };

  return (
    <div className="space-y-6 pb-12 relative">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-bounce-short ${
            toast.type === "success"
              ? "bg-emerald-900/90 text-emerald-100 border-emerald-500/50 backdrop-blur-md"
              : "bg-rose-900/90 text-rose-100 border-rose-500/50 backdrop-blur-md"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <p className="text-xs font-bold leading-relaxed">{toast.text}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-auto text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                    Google Sheet: Hissab Summary
                  </span>
                  {!isUserAuthorized && (
                    <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/40 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Read-Only
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Single source of truth loaded directly from Google Sheet tab <span className="font-bold text-slate-700 dark:text-slate-300">"Hissab Summary"</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons & Sync Status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {lastRefreshed && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden lg:inline-block mr-1">
                Synced: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}

            {/* Audit History Button */}
            {auditTrail.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAuditModal(true)}
                className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-4 h-4 text-slate-500" />
                <span>Audit Logs ({auditTrail.length})</span>
              </button>
            )}

            {/* Sync / Refresh Button */}
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading || isRefreshing}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Sync / Refresh"}</span>
            </button>

            {/* Upload CSV Button */}
            {isUserAuthorized && (
              <button
                type="button"
                onClick={() => setShowCsvModal(true)}
                disabled={loading}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
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

          {/* Dynamic Column Filter & Pagination Info */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
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

            {/* Total Row Count Badge */}
            <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0 flex items-center gap-1.5">
              <span>Valid Rows:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">
                {filteredRecords.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Error Banner */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-5 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-extrabold">Connection Failed</h4>
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

      {/* Main Content Table & Cards */}
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
      ) : dataRecords.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            No Hissab Summary data available.
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            The Google Sheet tab <span className="font-semibold text-slate-600 dark:text-slate-300">"Hissab Summary"</span> does not contain any valid records.
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
          {/* Desktop Responsive Table */}
          <div className="hidden md:block overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-3 w-16 text-center text-slate-400 font-mono">Row #</th>
                  {headers.map((header, colIdx) => (
                    <th
                      key={colIdx}
                      className={`py-3.5 px-4 whitespace-nowrap font-extrabold ${
                        isAmountHeader(header) ? "text-right" : "text-left"
                      }`}
                    >
                      {header || `Column ${colIdx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="py-8 text-center text-slate-400 font-medium">
                      No records match your search query or column filter.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => {
                    const sheetRow = record.sheetRowIndex; // Exact Google Sheet 1-based row index

                    return (
                      <tr
                        key={sheetRow}
                        className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-900 dark:even:bg-slate-800/20"
                      >
                        {/* Sheet Row Index Badge */}
                        <td className="py-3 px-3 text-center text-[11px] font-mono font-bold text-slate-400">
                          {sheetRow}
                        </td>

                        {headers.map((header, colIdx) => {
                          const rawValue = record.values[colIdx] ?? "";
                          const cellText = formatCellDisplay(rawValue);
                          const isAmt = isAmountHeader(header);
                          const isCurrentlyEditing =
                            editingCell?.sheetRowIndex === sheetRow && editingCell?.colIndex === colIdx;

                          return (
                            <td
                              key={colIdx}
                              className={`py-3 px-4 whitespace-nowrap ${
                                isAmt ? "text-right font-mono font-bold" : "font-medium"
                              }`}
                            >
                              {isCurrentlyEditing ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <input
                                    type="text"
                                    value={editingCell.editValue}
                                    onChange={(e) =>
                                      setEditingCell({
                                        ...editingCell,
                                        editValue: e.target.value
                                      })
                                    }
                                    disabled={isSavingCell}
                                    className="px-2.5 py-1 rounded-lg border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs w-28 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveCellEdit}
                                    disabled={isSavingCell}
                                    className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                                    title="Save to Google Sheet"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    disabled={isSavingCell}
                                    className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className={`group flex items-center gap-2 ${isAmt ? "justify-end" : "justify-start"}`}>
                                  <span>{cellText}</span>

                                  {/* Edit Amount Button */}
                                  {isAmt && isUserAuthorized && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingCell({
                                          sheetRowIndex: sheetRow,
                                          colIndex: colIdx,
                                          colName: header,
                                          currentValue: rawValue,
                                          editValue: rawValue
                                        })
                                      }
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                      title={`Edit ${header} (Row ${sheetRow})`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
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

          {/* Mobile Responsive Cards */}
          <div className="block md:hidden p-4 space-y-3">
            {paginatedRecords.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">
                No records match your search filter.
              </div>
            ) : (
              paginatedRecords.map((record) => {
                const sheetRow = record.sheetRowIndex;
                const isExpanded = expandedMobileRowIndex === sheetRow;

                return (
                  <div
                    key={sheetRow}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                      <span className="text-[10px] font-mono font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-0.5 rounded-md">
                        Sheet Row #{sheetRow}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMobileRowIndex(isExpanded ? null : sheetRow)
                        }
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? "Collapse" : "Full View"}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {record.values.slice(0, 4).map((cellVal, colIdx) => (
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

                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2 text-xs animate-fade-in">
                        {headers.map((header, colIdx) => {
                          const rawVal = record.values[colIdx] ?? "";
                          const isAmt = isAmountHeader(header);
                          const isEditing = editingCell?.sheetRowIndex === sheetRow && editingCell?.colIndex === colIdx;

                          return (
                            <div
                              key={colIdx}
                              className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/50 last:border-none"
                            >
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {header || `Column ${colIdx + 1}`}
                              </span>

                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingCell.editValue}
                                    onChange={(e) =>
                                      setEditingCell({
                                        ...editingCell,
                                        editValue: e.target.value
                                      })
                                    }
                                    className="px-2 py-0.5 rounded border border-blue-500 bg-white dark:bg-slate-800 font-mono text-xs w-24 text-right"
                                  />
                                  <button
                                    onClick={handleSaveCellEdit}
                                    disabled={isSavingCell}
                                    className="p-1 bg-emerald-600 text-white rounded"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingCell(null)}
                                    disabled={isSavingCell}
                                    className="p-1 bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                                    {formatCellDisplay(rawVal)}
                                  </span>
                                  {isAmt && isUserAuthorized && (
                                    <button
                                      onClick={() =>
                                        setEditingCell({
                                          sheetRowIndex: sheetRow,
                                          colIndex: colIdx,
                                          colName: header,
                                          currentValue: rawVal,
                                          editValue: rawVal
                                        })
                                      }
                                      className="p-1 text-slate-400 hover:text-blue-600"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Table Footer Pagination */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="font-medium text-slate-400 ml-2">
                Showing {paginatedRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800 dark:text-slate-200 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    Upload CSV to "Hissab Summary"
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Target Sheet: <span className="font-bold text-slate-700 dark:text-slate-300">Google Sheet → Hissab Summary</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvFile(null);
                  setCsvMappedRows([]);
                }}
                disabled={isUploadingCsv}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CSV File Selection */}
            {!csvFile ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3 hover:border-emerald-500 transition-colors">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <label htmlFor="csv-file-input" className="cursor-pointer text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline">
                    Click to select CSV File
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format: .csv file with matching column headers
                  </p>
                </div>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              /* CSV Preview & Validation */
              <div className="space-y-4 text-xs">
                {/* Header Validation Banner */}
                {missingHeaders.length > 0 || extraHeaders.length > 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Header Mismatch Warning</span>
                    </div>
                    {missingHeaders.length > 0 && (
                      <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                        Missing Sheet Columns (will be left empty): <span className="font-bold">{missingHeaders.join(", ")}</span>
                      </p>
                    )}
                    {extraHeaders.length > 0 && (
                      <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                        Extra CSV Columns (will be omitted): <span className="font-bold">{extraHeaders.join(", ")}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Headers match the Google Sheet 'Hissab Summary' tab perfectly!</span>
                  </div>
                )}

                {/* Stat Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total CSV Rows</span>
                    <span className="text-base font-black text-slate-800 dark:text-white font-mono">{csvRawRows.length}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Valid Mapped Rows</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">{csvMappedRows.length}</span>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800 text-center">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block">Duplicates Found</span>
                    <span className="text-base font-black text-amber-700 dark:text-amber-300 font-mono">{duplicateCount}</span>
                  </div>
                </div>

                {/* Duplicate Strategy Option */}
                {duplicateCount > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Duplicate Rows Action:</span>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="dupeStrategy"
                          checked={duplicateStrategy === "skip"}
                          onChange={() => setDuplicateStrategy("skip")}
                        />
                        <span>Skip duplicate records</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="dupeStrategy"
                          checked={duplicateStrategy === "insert_all"}
                          onChange={() => setDuplicateStrategy("insert_all")}
                        />
                        <span>Insert all records</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Important Notice */}
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 text-xs font-medium space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    Insertion Order Policy:
                  </p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    New CSV records will be inserted <span className="font-bold uppercase underline">at the TOP</span> of the Google Sheet (immediately below the Row 1 Header). All existing old records will be preserved underneath.
                  </p>
                </div>

                {/* Mapped CSV Data Preview Table */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-x-auto max-h-48">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2 w-8">#</th>
                        {headers.slice(0, 6).map((h, i) => (
                          <th key={i} className="p-2 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {csvMappedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-slate-400">{idx + 1}</td>
                          {row.slice(0, 6).map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 whitespace-nowrap">{cell || "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Progress / Status Indicator */}
                {isUploadingCsv && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 rounded-2xl border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-center space-y-2">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin text-emerald-600" />
                    <p className="font-bold text-xs">{csvUploadMessage}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvFile(null);
                      setCsvMappedRows([]);
                    }}
                    disabled={isUploadingCsv}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    Select Different File
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCsvUpload}
                    disabled={isUploadingCsv || csvMappedRows.length === 0}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isUploadingCsv && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Confirm & Upload to Google Sheet</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-black text-slate-800 dark:text-white">
                <History className="w-5 h-5 text-blue-600" />
                <span>Amount Edit Audit Logs</span>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {auditTrail.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>{log.user}</span>
                    <span className="font-mono">{log.timestamp}</span>
                  </div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    Row <span className="font-bold text-blue-600">{log.rowNumber}</span>, Column <span className="font-bold">{log.colName}</span>
                  </p>
                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    Changed: <span className="line-through text-rose-500 mr-2">{log.prevVal}</span>
                    <span className="font-bold text-emerald-600">{log.newVal}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
