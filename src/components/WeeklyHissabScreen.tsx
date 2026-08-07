import React, { useEffect, useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  FileText,
  Loader2
} from "lucide-react";
import { DriverDetails } from "../types";
import { fetchMsgFormatSheet } from "../lib/sheets";

interface WeeklyHissabScreenProps {
  driver: DriverDetails;
  weeklyHissabRow?: string[];
  weeklyHissabHeaders?: string[];
  weeklyHissabRows?: string[][];
  allWeeklyRows?: string[][];
  msgFormatRows?: string[][];
  accessToken?: string | null;
  onBackToDashboard: () => void;
  onNavigateToPayment?: () => void;
}

function normalizeStr(str: string): string {
  return String(str || "").toLowerCase().replace(/[\s_()-]+/g, "");
}

/**
 * Locate exact Column G (ETM ID) value in a row.
 * Column G is index 6 in 0-indexed array.
 */
function extractColumnG_ETM(row: string[], headers: string[] = []): string {
  if (!row || row.length === 0) return "";

  // Check header for "ETM" column index if headers exist
  if (headers && headers.length > 0) {
    for (let i = 0; i < headers.length; i++) {
      const hNorm = normalizeStr(headers[i]);
      if (hNorm === "etm" || hNorm === "etmid" || hNorm.includes("etm")) {
        if (row[i] && String(row[i]).trim()) {
          return String(row[i]).trim();
        }
      }
    }
  }

  // Column G is index 6 (0-indexed)
  if (row.length > 6 && row[6]) {
    const val = String(row[6]).trim();
    if (val) return val;
  }

  // Search first 12 columns for ETM string pattern
  for (let i = 0; i < Math.min(row.length, 12); i++) {
    const cell = String(row[i] || "").trim();
    if (/^ETM\d+/i.test(cell)) {
      return cell;
    }
  }

  return "";
}

/**
 * Locate the exact text message in Column Y of a sheet row.
 * Column Y is index 24 (0-indexed).
 */
function extractColumnYText(row: string[], headers: string[] = []): string {
  if (!row || row.length === 0) return "";

  // 1. Check Column Y index 24 directly if present
  if (row.length > 24 && row[24] && String(row[24]).trim().length > 5) {
    return String(row[24]).trim();
  }

  // 2. Check header name for Msg / Message / Format / WhatsApp / Column Y
  if (headers && headers.length > 0) {
    for (let i = 0; i < headers.length; i++) {
      const hNorm = normalizeStr(headers[i]);
      if (hNorm.includes("msg") || hNorm.includes("message") || hNorm.includes("format") || hNorm.includes("whatsapp")) {
        if (row[i] && String(row[i]).trim().length > 5) {
          return String(row[i]).trim();
        }
      }
    }
  }

  // 3. Search backwards in row for longest cell containing key statement text
  for (let i = row.length - 1; i >= 0; i--) {
    const cell = String(row[i] || "").trim();
    if (
      cell.includes("RENT & EARNINGS") ||
      cell.includes("Rent Details") ||
      cell.includes("Current Total O/s") ||
      cell.includes("Total Rent:") ||
      cell.includes("Working Days:") ||
      cell.includes("Earnings Details")
    ) {
      return cell;
    }
  }

  // 4. Fallback: return longest cell containing text colons/linebreaks
  let longestCell = "";
  for (let i = 0; i < row.length; i++) {
    const cell = String(row[i] || "").trim();
    if (cell.length > longestCell.length && (cell.includes(":") || cell.includes("\n"))) {
      longestCell = cell;
    }
  }

  return longestCell;
}

/**
 * Format date ranges into clean labels like "06 Jul – 12 Jul", "13 Jul – 19 Jul", "20 Jul – 26 Jul"
 */
function parseAndFormatWeekLabel(row: string[], msgText: string, rowIndex: number, totalRows: number): string {
  // Check first few columns for explicit week date string
  for (let i = 0; i < Math.min(row.length, 4); i++) {
    const cellVal = String(row[i] || "").trim();
    if (!cellVal) continue;

    if (/^[0-9]{1,2}\s+[A-Za-z]{3,9}\s*[–\-—to]+\s*[0-9]{1,2}\s+[A-Za-z]{3,9}/i.test(cellVal)) {
      return cellVal.replace(/\s*[\-—to]+\s*/i, " – ");
    }

    const ddmmyyyyMatch = cellVal.match(/^([0-9]{1,2})[\/\.]([0-9]{1,2})(?:[\/\.][0-9]{2,4})?\s*[–\-—to]+\s*([0-9]{1,2})[\/\.]([0-9]{1,2})(?:[\/\.][0-9]{2,4})?/i);
    if (ddmmyyyyMatch) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const d1 = parseInt(ddmmyyyyMatch[1], 10);
      const m1 = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const d2 = parseInt(ddmmyyyyMatch[3], 10);
      const m2 = parseInt(ddmmyyyyMatch[4], 10) - 1;
      if (m1 >= 0 && m1 < 12 && m2 >= 0 && m2 < 12) {
        const str1 = `${d1.toString().padStart(2, "0")} ${months[m1]}`;
        const str2 = `${d2.toString().padStart(2, "0")} ${months[m2]}`;
        return `${str1} – ${str2}`;
      }
    }
  }

  // Attempt to extract week date range from Column Y message text if present
  if (msgText) {
    const match = msgText.match(/📅?\s*(?:Week|Period|Date|Hissab\s*Period)\s*:\s*([^\n\r]+)/i);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length > 3) {
        return extracted;
      }
    }

    const textDateMatch = msgText.match(/([0-9]{1,2}\s+[A-Za-z]{3}\s*[–\-—to]+\s*[0-9]{1,2}\s+[A-Za-z]{3})/i);
    if (textDateMatch && textDateMatch[1]) {
      return textDateMatch[1].replace(/\s*[\-—to]+\s*/i, " – ").trim();
    }
  }

  return generateFallbackWeekLabel(rowIndex, totalRows);
}

function generateFallbackWeekLabel(rowIndex: number, totalRows: number): string {
  const today = new Date();
  const weeksBack = totalRows - 1 - rowIndex;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - weeksBack * 7 - 6);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const formatOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const startStr = startDate.toLocaleDateString("en-IN", formatOpts);
  const endStr = endDate.toLocaleDateString("en-IN", formatOpts);

  return `${startStr} – ${endStr}`;
}

export default function WeeklyHissabScreen({
  driver,
  msgFormatRows = [],
  accessToken,
  onBackToDashboard,
  onNavigateToPayment
}: WeeklyHissabScreenProps) {
  const [localMsgFormatRows, setLocalMsgFormatRows] = useState<string[][]>(msgFormatRows || []);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFetchingWeek, setIsFetchingWeek] = useState<boolean>(false);
  const [selectedWeekId, setSelectedWeekId] = useState<string>("");

  const rawETM = (driver?.etm || driver?.id || "").trim();
  const cleanETM = normalizeStr(rawETM);
  const driverMobile10 = (driver?.phone || "").replace(/\D/g, "").slice(-10);

  useEffect(() => {
    if (msgFormatRows && msgFormatRows.length > 0) {
      setLocalMsgFormatRows(msgFormatRows);
    }
  }, [msgFormatRows]);

  const loadMsgFormatData = async () => {
    setIsRefreshing(true);
    try {
      const rows = await fetchMsgFormatSheet(accessToken);
      if (rows && rows.length > 0) {
        setLocalMsgFormatRows(rows);
      }
    } catch (err) {
      console.warn("Failed to refresh Msg Format sheet:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!localMsgFormatRows || localMsgFormatRows.length === 0) {
      loadMsgFormatData();
    }
  }, []);

  const rowsPool = useMemo(() => {
    if (localMsgFormatRows && localMsgFormatRows.length > 0) return localMsgFormatRows;
    if (msgFormatRows && msgFormatRows.length > 0) return msgFormatRows;
    return [];
  }, [localMsgFormatRows, msgFormatRows]);

  const { headers, dataRows } = useMemo(() => {
    if (!rowsPool || rowsPool.length === 0) return { headers: [], dataRows: [] };

    const firstRow = rowsPool[0] || [];
    const isHeader = firstRow.some((cell) => {
      const c = normalizeStr(String(cell || ""));
      return ["etm", "mobile", "driver", "rent", "earning", "outstanding", "week", "date", "pass", "uber", "vehicle"].some((k) => c.includes(k));
    });

    if (isHeader) {
      const hdrs = firstRow.map((h) => String(h || "").trim());
      return { headers: hdrs, dataRows: rowsPool.slice(1) };
    }

    return { headers: [], dataRows: rowsPool };
  }, [rowsPool]);

  // Match driver row using: Step 1 = Column G (ETM ID), Step 2 (fallback) = Mobile Number
  const matchedDriverRows = useMemo(() => {
    if (!dataRows || dataRows.length === 0) return [];

    const matches: { row: string[]; rowIndex: number; columnYText: string }[] = [];

    // Step 1: Match ETM ID with Column G (index 6) or header ETM
    if (cleanETM) {
      dataRows.forEach((row, idx) => {
        const etmFromColG = extractColumnG_ETM(row, headers);
        const colYText = extractColumnYText(row, headers);
        const normColY = normalizeStr(colYText);

        const isEtmMatchInColG = normalizeStr(etmFromColG) === cleanETM;
        const isEtmMatchInColY = normColY.includes(cleanETM);
        const isEtmMatchInRow = row.some((cell, cIdx) => cIdx <= 12 && normalizeStr(String(cell || "")) === cleanETM);

        if (isEtmMatchInColG || isEtmMatchInColY || isEtmMatchInRow) {
          matches.push({
            row,
            rowIndex: idx + (headers.length > 0 ? 2 : 1),
            columnYText: colYText
          });
        }
      });
    }

    if (matches.length > 0) return matches;

    // Step 2: Fallback to Mobile Number Match
    if (driverMobile10 && driverMobile10.length >= 5) {
      dataRows.forEach((row, idx) => {
        const colYText = extractColumnYText(row, headers);
        const hasMobileMatch = row.some((cell, cellIdx) => {
          if (cellIdx > 12) return false;
          const digits = String(cell || "").replace(/\D/g, "");
          return digits === driverMobile10 || digits.endsWith(driverMobile10);
        });

        if (hasMobileMatch) {
          matches.push({
            row,
            rowIndex: idx + (headers.length > 0 ? 2 : 1),
            columnYText: colYText
          });
        }
      });
    }

    return matches;
  }, [dataRows, cleanETM, driverMobile10, headers]);

  // Generate dynamic week options from matched rows
  const weekOptions = useMemo(() => {
    if (!matchedDriverRows || matchedDriverRows.length === 0) return [];

    return matchedDriverRows.map((item, idx) => {
      const weekLabel = parseAndFormatWeekLabel(item.row, item.columnYText, idx, matchedDriverRows.length);
      return {
        id: `week-${idx}`,
        weekLabel,
        row: item.row,
        rowIndex: item.rowIndex,
        columnYText: item.columnYText
      };
    });
  }, [matchedDriverRows]);

  useEffect(() => {
    if (weekOptions.length > 0 && !selectedWeekId) {
      setSelectedWeekId(weekOptions[weekOptions.length - 1].id);
    }
  }, [weekOptions, selectedWeekId]);

  const selectedWeekObj = useMemo(() => {
    if (!weekOptions || weekOptions.length === 0) return null;
    return weekOptions.find((w) => w.id === selectedWeekId) || weekOptions[weekOptions.length - 1];
  }, [weekOptions, selectedWeekId]);

  // Re-fetch Column Y message on week selection change
  const handleWeekSelect = async (newWeekId: string) => {
    setSelectedWeekId(newWeekId);
    setIsFetchingWeek(true);
    try {
      const rows = await fetchMsgFormatSheet(accessToken);
      if (rows && rows.length > 0) {
        setLocalMsgFormatRows(rows);
      }
    } catch (err) {
      console.warn("Failed to re-fetch Msg Format sheet for week selection:", err);
    } finally {
      setIsFetchingWeek(false);
    }
  };

  // Exact Column Y statement text
  const columnYMessageText = useMemo(() => {
    if (!selectedWeekObj) return "";
    return selectedWeekObj.columnYText || extractColumnYText(selectedWeekObj.row, headers);
  }, [selectedWeekObj, headers]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-[#333333] dark:text-slate-100 overflow-y-auto transition-colors duration-200" id="weekly-hissab-screen">
      {/* Top Header */}
      <div className="sticky top-0 bg-[#08182D] text-white px-5 py-4 flex items-center gap-4 z-10 shadow-md border-b border-slate-800">
        <button 
          onClick={onBackToDashboard}
          className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          id="btn-back-to-dashboard"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-base font-black tracking-tight">Weekly Hissab</h1>
          <p className="text-[10px] text-blue-300 font-bold tracking-wider uppercase">Account Statement</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={loadMsgFormatData}
            disabled={isRefreshing || isFetchingWeek}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Refresh Sheet Statement"
            id="btn-refresh-msg-format"
          >
            <RefreshCw className={`w-4 h-4 ${(isRefreshing || isFetchingWeek) ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 px-4 sm:px-6 py-6 max-w-4xl lg:max-w-5xl mx-auto w-full space-y-5 pb-24">
        
        {/* Dynamic Weekly Date Range Filter Dropdown */}
        {weekOptions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-black uppercase tracking-wide text-slate-800">Select Week</span>
            </div>

            <div className="relative flex-1 max-w-[190px]">
              <select
                id="weekly-hissab-filter"
                value={selectedWeekId}
                onChange={(e) => handleWeekSelect(e.target.value)}
                disabled={isFetchingWeek}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2 pl-3 pr-8 rounded-xl text-xs font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer disabled:opacity-60"
              >
                {weekOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.weekLabel}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                {isFetchingWeek ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Display Exact Column Y Statement Text */}
        {isFetchingWeek ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center flex flex-col items-center justify-center shadow-xs space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-xs font-bold text-slate-600">Fetching Column Y statement for selected week...</p>
          </div>
        ) : columnYMessageText ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3" id="weekly-hissab-statement-card">
            <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-900 tracking-tight">Weekly Hissab Statement</span>
              </div>
              {selectedWeekObj?.weekLabel && (
                <span className="text-[11px] font-extrabold bg-blue-600 text-white px-2.5 py-1 rounded-lg shadow-2xs">
                  {selectedWeekObj.weekLabel}
                </span>
              )}
            </div>

            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-line break-words select-text">
              {columnYMessageText}
            </div>

            {onNavigateToPayment && (
              <button
                onClick={onNavigateToPayment}
                className="w-full bg-[#0D47A1] hover:bg-[#1E88E5] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                id="btn-weekly-hissab-pay-now"
              >
                <span>Pay Dues via UPI (9702291761-2@ybl)</span>
              </button>
            )}
          </div>
        ) : (
          /* Error Handling: If no record exists for the selected week */
          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center flex flex-col items-center justify-center shadow-md">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-full mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">No Weekly Hissab Available</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-xs">
              Statement record is not available in Msg Format for ETM ID: <span className="font-bold text-slate-700">{rawETM.toUpperCase() || "N/A"}</span> or Mobile: <span className="font-bold text-slate-700">{driverMobile10 || "N/A"}</span>.
            </p>
            <button
              onClick={onBackToDashboard}
              className="mt-6 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 px-5 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
              id="btn-weekly-hissab-fallback-home"
            >
              Back to Home
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
