import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  RefreshCw, 
  Search, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  X, 
  SlidersHorizontal,
  Upload,
  Edit2,
  Check,
  Lock,
  History,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
  ShieldCheck,
  Calendar
} from "lucide-react";
import { DriverDetails } from "../../types";
import { fetchHissabSummarySheet, clearSheetCache, SHEET_NAME_HISSAB_SUMMARY } from "../../lib/sheets";
import { updateHissabSummaryCell, insertHissabSummaryRecordsAtTop, getColumnLetter } from "../../lib/googleSheets";
import {
  getGoogleAuthState,
  onGoogleAuthStateChange,
  requestGoogleOAuthSignIn,
  GoogleAuthState,
  getValidAccessToken
} from "../../lib/googleAuth";

interface AdminHissabSummaryProps {
  accessToken?: string | null;
  currentAdminDriver?: DriverDetails | null;
}

interface RowRecord {
  sheetRowIndex: number; // 1-based index in Google Sheet (Header = 1, First Data Row = 2)
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

export interface UploadSuccessDetail {
  targetSheet: string;
  csvRows: number;
  validRows: number;
  newRecords: number;
  duplicates: number;
  rowsWritten: number;
}

/**
 * EXACT 39 Headers of the Hissab Summary Google Sheet
 */
export const EXPECTED_HISSAB_SUMMARY_HEADERS = [
  "Car Number",
  "Car Model",
  "Start Date",
  "End Date",
  "Days",
  "Lease Amount",
  "Rental Amount",
  "Insurance Cover",
  "Partner ETM",
  "Partner Name",
  "ETM ID",
  "Driver Name",
  "Uber Rev",
  "Uber Cash",
  "Uber Toll",
  "Regulatory Adjustment",
  "Driver Tip",
  "Acceptance Rate",
  "Cancellation Rate",
  "Online Hours",
  "Uber Trips",
  "Uber Incentive",
  "QC Incentive",
  "Penalty",
  "RTO Fine",
  "Double Driver Charge",
  "Adjustment",
  "Half day adj",
  "Repair adj",
  "Servicing adj",
  "Ola Security",
  "Ola Bank Transfer",
  "Ola toll adj",
  "Ola Starting Balance",
  "Ola Ending Balance",
  "ND Penalty",
  "Kuber Amount",
  "Car QR Code Amount",
  "OS"
];

/**
 * Editable Financial Columns (Numeric Values Only)
 */
export const EDITABLE_FINANCIAL_COLUMNS = new Set([
  "Lease Amount",
  "Rental Amount",
  "Insurance Cover",
  "Uber Rev",
  "Uber Cash",
  "Uber Toll",
  "Regulatory Adjustment",
  "Driver Tip",
  "Uber Incentive",
  "QC Incentive",
  "Penalty",
  "RTO Fine",
  "Double Driver Charge",
  "Adjustment",
  "Half day adj",
  "Repair adj",
  "Servicing adj",
  "Ola Security",
  "Ola Bank Transfer",
  "Ola toll adj",
  "Ola Starting Balance",
  "Ola Ending Balance",
  "ND Penalty",
  "Kuber Amount",
  "Car QR Code Amount",
  "OS"
]);

/**
 * Formats a Date object to standard DD/MM/YYYY string
 */
export function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses any date representation into a midnight Date object (hours/minutes/seconds = 0)
 * Supports DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, ISO timestamps, text month names
 */
export function parseDateToCalendarMidnight(val: any): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return new Date(val.getFullYear(), val.getMonth(), val.getDate(), 0, 0, 0, 0);
  }
  const s = String(val).trim();
  if (!s || s === "-" || s === "N/A" || s === "null" || s === "undefined") return null;

  // 1. Check YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day, 0, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 0, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Check DD Mon YYYY like "10 Aug 2026" or "10-Aug-2026"
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const textMonthMatch = s.match(/^(\d{1,2})[-\s/]+([a-zA-Z]{3,9})[-\s/]+(\d{2,4})/);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const monStr = textMonthMatch[2].toLowerCase().substring(0, 3);
    let year = parseInt(textMonthMatch[3], 10);
    if (year < 100) year += 2000;
    if (monStr in monthNames) {
      const d = new Date(year, monthNames[monStr], day, 0, 0, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 4. Fallback to standard JS Date parsing
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }

  return null;
}

/**
 * Parses user input filter string into a start and end Date range
 * Supports "10/08/2026 – 16/08/2026", "10/08/2026 - 16/08/2026", "10/08/2026 to 16/08/2026", "10/08/2026"
 */
export function parseDateRangeFromFilter(filterStr: string): { start: Date; end: Date } | null {
  if (!filterStr || !filterStr.trim()) return null;
  const s = filterStr.trim();

  // Match en-dash –, em-dash —, hyphen surrounded by spaces or "to", commas, semicolons
  const separators = /[\u2013\u2014–]|(?:\s+to\s+)|(?:\s+-\s+)|(?:\s*;\s*)|(?:\s*,\s*)/i;
  const parts = s.split(separators).map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const start = parseDateToCalendarMidnight(parts[0]);
    const end = parseDateToCalendarMidnight(parts[1]);
    if (start && end) {
      return start.getTime() <= end.getTime() ? { start, end } : { start: end, end: start };
    }
    if (start && !end) {
      return { start, end: start };
    }
    if (!start && end) {
      return { start: end, end };
    }
  } else if (parts.length === 1) {
    const single = parseDateToCalendarMidnight(parts[0]);
    if (single) {
      return { start: single, end: single };
    }
  }

  return null;
}

interface DateRangePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

/**
 * Interactive Date Range Calendar Dropdown Component
 */
function DateRangePicker({
  value,
  onChange,
  placeholder = "Filter Date (DD/MM/YYYY)..."
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedRange = useMemo(() => parseDateRangeFromFilter(value), [value]);

  const [rangeStart, setRangeStart] = useState<Date | null>(() => parsedRange?.start || null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => parsedRange?.end || null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Viewing month in the calendar popover
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (parsedRange?.start) {
      return new Date(parsedRange.start.getFullYear(), parsedRange.start.getMonth(), 1);
    }
    return new Date();
  });

  // Sync internal state when external value changes
  useEffect(() => {
    const pr = parseDateRangeFromFilter(value);
    if (pr) {
      setRangeStart(pr.start);
      setRangeEnd(pr.end);
      setViewDate(new Date(pr.start.getFullYear(), pr.start.getMonth(), 1));
    } else if (!value.trim()) {
      setRangeStart(null);
      setRangeEnd(null);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (clickedDate: Date) => {
    const normalized = parseDateToCalendarMidnight(clickedDate);
    if (!normalized) return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      // First click: select start date
      setRangeStart(normalized);
      setRangeEnd(null);
    } else {
      // Second click: select end date and apply
      let start = rangeStart;
      let end = normalized;
      if (end.getTime() < start.getTime()) {
        const temp = start;
        start = end;
        end = temp;
      }
      setRangeStart(start);
      setRangeEnd(end);
      const formatted = `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(end)}`;
      onChange(formatted);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setHoverDate(null);
    onChange("");
    setIsOpen(false);
  };

  // Quick preset shortcuts
  const handlePresetThisWeek = () => {
    const today = new Date();
    const day = today.getDay(); // 0: Sun, 1: Mon...
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setRangeStart(monday);
    setRangeEnd(sunday);
    setViewDate(new Date(monday.getFullYear(), monday.getMonth(), 1));
    onChange(`${formatDateDDMMYYYY(monday)} – ${formatDateDDMMYYYY(sunday)}`);
    setIsOpen(false);
  };

  const handlePresetLastWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diffToPrevMonday = today.getDate() - day - 6 + (day === 0 ? -6 : 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diffToPrevMonday, 0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setRangeStart(monday);
    setRangeEnd(sunday);
    setViewDate(new Date(monday.getFullYear(), monday.getMonth(), 1));
    onChange(`${formatDateDDMMYYYY(monday)} – ${formatDateDDMMYYYY(sunday)}`);
    setIsOpen(false);
  };

  const handlePresetThisMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 0, 0, 0);

    setRangeStart(start);
    setRangeEnd(end);
    setViewDate(new Date(start.getFullYear(), start.getMonth(), 1));
    onChange(`${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(end)}`);
    setIsOpen(false);
  };

  // Build calendar matrix
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Monday first: 0: Mon, ... 6: Sun
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isStart: boolean;
      isEnd: boolean;
      isInRange: boolean;
    }[] = [];

    const todayMid = parseDateToCalendarMidnight(new Date())?.getTime() || 0;

    const sTime = rangeStart?.getTime() || null;
    const eTime = rangeEnd?.getTime() || (rangeStart && hoverDate ? hoverDate.getTime() : null);
    const effectiveStart = sTime && eTime ? Math.min(sTime, eTime) : sTime;
    const effectiveEnd = sTime && eTime ? Math.max(sTime, eTime) : (rangeEnd ? rangeEnd.getTime() : sTime);

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i, 0, 0, 0, 0);
      const dTime = d.getTime();
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dTime === todayMid,
        isStart: sTime !== null && dTime === sTime,
        isEnd: rangeEnd !== null && dTime === rangeEnd.getTime(),
        isInRange: effectiveStart !== null && effectiveEnd !== null && dTime >= effectiveStart && dTime <= effectiveEnd
      });
    }

    // Current month
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const d = new Date(year, month, dayNum, 0, 0, 0, 0);
      const dTime = d.getTime();
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: dTime === todayMid,
        isStart: sTime !== null && dTime === sTime,
        isEnd: rangeEnd !== null && dTime === rangeEnd.getTime(),
        isInRange: effectiveStart !== null && effectiveEnd !== null && dTime >= effectiveStart && dTime <= effectiveEnd
      });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i, 0, 0, 0, 0);
      const dTime = d.getTime();
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dTime === todayMid,
        isStart: sTime !== null && dTime === sTime,
        isEnd: rangeEnd !== null && dTime === rangeEnd.getTime(),
        isInRange: effectiveStart !== null && effectiveEnd !== null && dTime >= effectiveStart && dTime <= effectiveEnd
      });
    }

    return days;
  }, [viewDate, rangeStart, rangeEnd, hoverDate]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full pl-8 pr-7 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between cursor-pointer truncate"
        >
          <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0 pointer-events-none" />
          <span className={`truncate font-medium ${value ? "text-slate-800 dark:text-white font-semibold" : "text-slate-400"}`}>
            {value || placeholder}
          </span>
        </button>

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Clear date filter"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl p-3 space-y-3">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
            <button
              type="button"
              onClick={handlePresetThisWeek}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={handlePresetLastWeek}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Last Week
            </button>
            <button
              type="button"
              onClick={handlePresetThisMonth}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              This Month
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-auto px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
            <div>Su</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {calendarDays.map((day, idx) => {
              const isSelectedEndpoint = day.isStart || day.isEnd;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateClick(day.date)}
                  onMouseEnter={() => {
                    if (rangeStart && !rangeEnd) {
                      setHoverDate(day.date);
                    }
                  }}
                  className={`relative py-1.5 text-xs font-semibold transition-colors cursor-pointer flex flex-col items-center justify-center ${
                    !day.isCurrentMonth
                      ? "text-slate-300 dark:text-slate-600"
                      : "text-slate-700 dark:text-slate-200"
                  } ${
                    isSelectedEndpoint
                      ? "bg-blue-600 text-white font-bold rounded-lg z-10 shadow-xs"
                      : day.isInRange
                      ? "bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 rounded-none font-bold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  }`}
                >
                  <span>{day.date.getDate()}</span>
                  {day.isToday && !isSelectedEndpoint && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Helper / Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium truncate">
              {rangeStart && !rangeEnd
                ? "Select end date..."
                : rangeStart && rangeEnd
                ? `${formatDateDDMMYYYY(rangeStart)} – ${formatDateDDMMYYYY(rangeEnd)}`
                : "Click start date"}
            </span>
            {rangeStart && !rangeEnd && (
              <button
                type="button"
                onClick={() => {
                  setRangeEnd(rangeStart);
                  const formatted = `${formatDateDDMMYYYY(rangeStart)} – ${formatDateDDMMYYYY(rangeStart)}`;
                  onChange(formatted);
                  setIsOpen(false);
                }}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                Single Day
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Normalizes dates for comparison (DD/MM/YYYY or YYYY-MM-DD to standard DD/MM/YYYY)
 */
function normalizeDateStr(rawStr: any): string {
  if (!rawStr) return "";
  const s = String(rawStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.split("T")[0].split("-");
    return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    const parts = s.split("/");
    return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
  }
  return s.toLowerCase();
}

/**
 * Normalizes header string for comparison: trims whitespace, collapses inner whitespace, converts to lowercase
 */
export function normalizeHeader(h: any): string {
  if (h === null || h === undefined) return "";
  return String(h).trim().replace(/\s+/g, " ").toLowerCase();
}

export interface UploadErrorDetail {
  targetSheet: string;
  csvRows: number;
  validRows: number;
  rowsWritten: number;
  reason: string;
}

/**
 * Constructs a unique matching key for a row: Car Number + Start Date + End Date + ETM ID
 */
function buildRecordKey(rowValues: string[], headers: string[]): string {
  if (!rowValues || !headers || headers.length === 0) return "";

  const getColVal = (name: string) => {
    const targetNorm = normalizeHeader(name);
    const idx = headers.findIndex((h) => normalizeHeader(h) === targetNorm);
    return idx >= 0 && rowValues[idx] !== undefined ? String(rowValues[idx]).trim() : "";
  };

  const carNum = getColVal("Car Number").toUpperCase().replace(/\s+/g, "");
  const startDate = normalizeDateStr(getColVal("Start Date"));
  const endDate = normalizeDateStr(getColVal("End Date"));
  const etmId = getColVal("ETM ID").toUpperCase().replace(/\s+/g, "");

  if (!carNum && !startDate && !endDate && !etmId) return "";
  return `${carNum}|${startDate}|${endDate}|${etmId}`;
}

/**
 * Format cell display safely for the UI
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
 * Simple CSV parser supporting quoted commas and linebreaks
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
        i++;
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
      if (currentRow.some((c) => c !== "")) {
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
    if (currentRow.some((c) => c !== "")) {
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

  // Search & Specific Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDriverName, setFilterDriverName] = useState<string>("all");
  const [filterEtmId, setFilterEtmId] = useState<string>("all");
  const [filterCarNumber, setFilterCarNumber] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterPartnerEtm, setFilterPartnerEtm] = useState<string>("all");
  const [filterPartnerName, setFilterPartnerName] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Sync Metadata
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedMobileRowIndex, setExpandedMobileRowIndex] = useState<number | null>(null);

  // Inline Financial Cell Editing
  const [editingCell, setEditingCell] = useState<{
    sheetRowIndex: number;
    colIndex: number;
    colName: string;
    currentValue: string;
    editValue: string;
  } | null>(null);
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);

  // Notifications
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
  const [newRecordCount, setNewRecordCount] = useState<number>(0);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip" | "insert_all">("update");
  const [isUploadingCsv, setIsUploadingCsv] = useState<boolean>(false);
  const [csvUploadMessage, setCsvUploadMessage] = useState<string>("");
  const [uploadErrorDetails, setUploadErrorDetails] = useState<UploadErrorDetail | null>(null);
  const [uploadSuccessDetails, setUploadSuccessDetails] = useState<UploadSuccessDetail | null>(null);

  // Google OAuth State Tracking
  const [googleAuth, setGoogleAuth] = useState<GoogleAuthState>(getGoogleAuthState());
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onGoogleAuthStateChange((state) => {
      setGoogleAuth(state);
    });
    return () => unsub();
  }, []);

  const handleConnectGoogle = async () => {
    try {
      setIsConnectingGoogle(true);
      const res = await requestGoogleOAuthSignIn({ prompt: "select_account" });
      setToast({
        type: "success",
        text: `Google account connected successfully${res.email ? ` (${res.email})` : ""}!`
      });
    } catch (err: any) {
      console.error("Google Auth connection error:", err);
      setToast({
        type: "error",
        text: err?.message || "Failed to connect Google account."
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Permissions check
  const isUserAuthorized = useMemo(() => {
    if (!currentAdminDriver) return true;
    const role = (currentAdminDriver.role || currentAdminDriver.Role || currentAdminDriver.User_Type || "").toLowerCase();
    const permissions = (currentAdminDriver.Permissions || "").toLowerCase();
    if (role.includes("viewer") || permissions.includes("read_only") || permissions.includes("view_only")) {
      return false;
    }
    return true;
  }, [currentAdminDriver]);

  // Load data directly from Google Sheet tab "Hissab Summary" ONLY
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const sheetData = await fetchHissabSummarySheet(accessToken, forceRefresh);
      if (Array.isArray(sheetData) && sheetData.length > 0) {
        setRawRows(sheetData);
      } else {
        setRawRows([]);
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Error loading Google Sheet 'Hissab Summary':", err);
      setError("Unable to load Hissab Summary from Google Sheet. Please try Sync / Refresh.");
      setRawRows([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Refresh every 2 minutes
    const interval = setInterval(() => {
      loadData(true);
    }, 120000);

    return () => clearInterval(interval);
  }, [accessToken]);

  // Toast Auto Dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Active headers loaded from Google Sheet or fallback to EXPECTED_HISSAB_SUMMARY_HEADERS
  const headers = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return EXPECTED_HISSAB_SUMMARY_HEADERS;
    const firstRow = rawRows[0].map((h) => (h ? String(h).trim() : ""));
    // If first row has valid column names, use them; otherwise use EXPECTED_HISSAB_SUMMARY_HEADERS
    if (firstRow.filter(Boolean).length > 0) {
      return firstRow;
    }
    return EXPECTED_HISSAB_SUMMARY_HEADERS;
  }, [rawRows]);

  // Data records preserving 1-based Google Sheet row index (Header = Row 1, Data Starts = Row 2)
  const dataRecords = useMemo<RowRecord[]>(() => {
    if (!rawRows || rawRows.length <= 1) return [];
    const list: RowRecord[] = [];
    for (let i = 1; i < rawRows.length; i++) {
      const rowArr = rawRows[i];
      if (rowArr && Array.isArray(rowArr) && rowArr.some((c) => c !== null && c !== undefined && String(c).trim() !== "")) {
        list.push({
          sheetRowIndex: i + 1,
          values: rowArr
        });
      }
    }
    return list;
  }, [rawRows]);

  // Distinct filter options extracted dynamically
  const filterOptions = useMemo(() => {
    const getColIdx = (name: string) =>
      headers.findIndex((h) => h.trim().toLowerCase() === name.trim().toLowerCase());

    const driverNameIdx = getColIdx("Driver Name");
    const etmIdIdx = getColIdx("ETM ID");
    const carNumIdx = getColIdx("Car Number");
    const partnerEtmIdx = getColIdx("Partner ETM");
    const partnerNameIdx = getColIdx("Partner Name");

    const getUnique = (colIdx: number) => {
      if (colIdx < 0) return [];
      const set = new Set<string>();
      dataRecords.forEach((r) => {
        const val = r.values[colIdx] ? String(r.values[colIdx]).trim() : "";
        if (val) set.add(val);
      });
      return Array.from(set).sort();
    };

    return {
      driverNames: getUnique(driverNameIdx),
      etmIds: getUnique(etmIdIdx),
      carNumbers: getUnique(carNumIdx),
      partnerEtms: getUnique(partnerEtmIdx),
      partnerNames: getUnique(partnerNameIdx)
    };
  }, [headers, dataRecords]);

  // Filter records based on search and specific column filters
  const filteredRecords = useMemo(() => {
    let result = dataRecords;

    const getColIdx = (name: string) =>
      headers.findIndex((h) => h.trim().toLowerCase() === name.trim().toLowerCase());

    const driverNameIdx = getColIdx("Driver Name");
    const etmIdIdx = getColIdx("ETM ID");
    const carNumIdx = getColIdx("Car Number");
    const startDateIdx = getColIdx("Start Date");
    const endDateIdx = getColIdx("End Date");
    const partnerEtmIdx = getColIdx("Partner ETM");
    const partnerNameIdx = getColIdx("Partner Name");

    // Global Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((rec) =>
        rec.values.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
      );
    }

    // Driver Name Filter
    if (filterDriverName !== "all" && driverNameIdx >= 0) {
      result = result.filter((rec) => {
        const val = rec.values[driverNameIdx] ? String(rec.values[driverNameIdx]).trim() : "";
        return val.toLowerCase() === filterDriverName.toLowerCase();
      });
    }

    // ETM ID Filter
    if (filterEtmId !== "all" && etmIdIdx >= 0) {
      result = result.filter((rec) => {
        const val = rec.values[etmIdIdx] ? String(rec.values[etmIdIdx]).trim() : "";
        return val.toLowerCase() === filterEtmId.toLowerCase();
      });
    }

    // Car Number Filter
    if (filterCarNumber !== "all" && carNumIdx >= 0) {
      result = result.filter((rec) => {
        const val = rec.values[carNumIdx] ? String(rec.values[carNumIdx]).trim() : "";
        return val.toLowerCase() === filterCarNumber.toLowerCase();
      });
    }

    // Inclusive Date Range Filter
    if (filterDate.trim()) {
      const parsedRange = parseDateRangeFromFilter(filterDate);

      if (parsedRange) {
        const { start: rangeStart, end: rangeEnd } = parsedRange;
        const rangeStartMs = rangeStart.getTime();
        const rangeEndMs = rangeEnd.getTime();

        result = result.filter((rec) => {
          const startVal = startDateIdx >= 0 && rec.values[startDateIdx] ? rec.values[startDateIdx] : "";
          const endVal = endDateIdx >= 0 && rec.values[endDateIdx] ? rec.values[endDateIdx] : "";

          const recStart = parseDateToCalendarMidnight(startVal);
          const recEnd = parseDateToCalendarMidnight(endVal);

          // 1. If both Start Date and End Date exist in the row (e.g. weekly period or date span)
          if (recStart && recEnd) {
            const minD = recStart.getTime() <= recEnd.getTime() ? recStart.getTime() : recEnd.getTime();
            const maxD = recStart.getTime() <= recEnd.getTime() ? recEnd.getTime() : recStart.getTime();
            return minD <= rangeEndMs && maxD >= rangeStartMs;
          }

          // 2. If only Start Date exists
          if (recStart) {
            return recStart.getTime() >= rangeStartMs && recStart.getTime() <= rangeEndMs;
          }

          // 3. If only End Date exists
          if (recEnd) {
            return recEnd.getTime() >= rangeStartMs && recEnd.getTime() <= rangeEndMs;
          }

          // 4. Check any column whose header contains "date"
          for (let c = 0; c < rec.values.length; c++) {
            const h = headers[c] ? normalizeHeader(headers[c]) : "";
            if (h.includes("date") && rec.values[c]) {
              const d = parseDateToCalendarMidnight(rec.values[c]);
              if (d && d.getTime() >= rangeStartMs && d.getTime() <= rangeEndMs) {
                return true;
              }
            }
          }

          // 5. Fallback substring matching if dates were unparseable text
          const q = filterDate.trim().toLowerCase();
          const sStr = String(startVal).toLowerCase();
          const eStr = String(endVal).toLowerCase();
          return sStr.includes(q) || eStr.includes(q);
        });
      } else {
        // Fallback search when filter text is not a formatted date range
        const qDate = filterDate.trim().toLowerCase();
        result = result.filter((rec) => {
          const startVal = startDateIdx >= 0 && rec.values[startDateIdx] ? String(rec.values[startDateIdx]).trim().toLowerCase() : "";
          const endVal = endDateIdx >= 0 && rec.values[endDateIdx] ? String(rec.values[endDateIdx]).trim().toLowerCase() : "";
          return startVal.includes(qDate) || endVal.includes(qDate);
        });
      }
    }

    // Partner ETM Filter
    if (filterPartnerEtm !== "all" && partnerEtmIdx >= 0) {
      result = result.filter((rec) => {
        const val = rec.values[partnerEtmIdx] ? String(rec.values[partnerEtmIdx]).trim() : "";
        return val.toLowerCase() === filterPartnerEtm.toLowerCase();
      });
    }

    // Partner Name Filter
    if (filterPartnerName !== "all" && partnerNameIdx >= 0) {
      result = result.filter((rec) => {
        const val = rec.values[partnerNameIdx] ? String(rec.values[partnerNameIdx]).trim() : "";
        return val.toLowerCase() === filterPartnerName.toLowerCase();
      });
    }

    return result;
  }, [
    dataRecords,
    headers,
    searchQuery,
    filterDriverName,
    filterEtmId,
    filterCarNumber,
    filterDate,
    filterPartnerEtm,
    filterPartnerName
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterDriverName,
    filterEtmId,
    filterCarNumber,
    filterDate,
    filterPartnerEtm,
    filterPartnerName,
    itemsPerPage
  ]);

  // Handle Save Financial Value Edit to Google Sheet
  const handleSaveCellEdit = async () => {
    if (!editingCell) return;

    const trimmedEditVal = editingCell.editValue.trim();

    // Numeric Validation for financial amounts
    if (trimmedEditVal !== "") {
      const cleanNumStr = trimmedEditVal.replace(/,/g, "");
      if (isNaN(Number(cleanNumStr))) {
        setToast({
          type: "error",
          text: `Invalid amount entered for ${editingCell.colName}. Please enter a valid number.`
        });
        return;
      }
    }

    // Store clean numeric string in Google Sheet (no currency symbols)
    const valToWrite = trimmedEditVal === "" ? "" : String(Number(trimmedEditVal.replace(/,/g, "")));

    setIsSavingCell(true);

    try {
      await updateHissabSummaryCell(
        editingCell.sheetRowIndex,
        editingCell.colIndex,
        valToWrite,
        accessToken
      );

      // Update local state row ONLY AFTER Google Sheet write succeeds
      setRawRows((prev) => {
        const next = [...prev];
        if (next[editingCell.sheetRowIndex - 1]) {
          const targetRow = [...next[editingCell.sheetRowIndex - 1]];
          targetRow[editingCell.colIndex] = valToWrite;
          next[editingCell.sheetRowIndex - 1] = targetRow;
        }
        return next;
      });

      // Add to Audit Trail
      const newAudit: AuditLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleString(),
        user: currentAdminDriver?.name || "Admin User",
        rowNumber: editingCell.sheetRowIndex,
        colName: editingCell.colName,
        prevVal: editingCell.currentValue,
        newVal: valToWrite
      };
      setAuditTrail((prev) => [newAudit, ...prev]);

      setToast({
        type: "success",
        text: `Saved successfully to Google Sheet (Row ${editingCell.sheetRowIndex}, Column ${editingCell.colName})`
      });

      setEditingCell(null);
    } catch (err: any) {
      console.error("Google Sheet write failed:", err);
      setToast({
        type: "error",
        text: err?.message || "Unable to save changes to Google Sheet."
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
    setUploadErrorDetails(null);

    console.log("[HISSAB CSV] File selected:", file.name, `(${file.size} bytes)`);

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsed = parseCsvContent(text);
      if (parsed.length === 0) {
        setToast({ type: "error", text: "The selected CSV file is empty." });
        return;
      }

      const rawCsvHeaders = parsed[0].map((h) => (h ? h.trim() : ""));
      const rawCsvData = parsed.slice(1);

      console.log("[HISSAB CSV] Raw CSV Headers:", rawCsvHeaders);
      console.log("[HISSAB CSV] Raw CSV Data Row Count:", rawCsvData.length);

      setCsvHeaders(rawCsvHeaders);
      setCsvRawRows(rawCsvData);

      const targetSheetHeaders = headers.length > 0 ? headers : EXPECTED_HISSAB_SUMMARY_HEADERS;
      const csvHeaderNorms = rawCsvHeaders.map(normalizeHeader);

      // Validate required columns against exact EXPECTED_HISSAB_SUMMARY_HEADERS
      const missing = EXPECTED_HISSAB_SUMMARY_HEADERS.filter(
        (reqH) => !csvHeaderNorms.includes(normalizeHeader(reqH))
      );

      const extra = rawCsvHeaders.filter(
        (csvH) => !targetSheetHeaders.some((sh) => normalizeHeader(sh) === normalizeHeader(csvH))
      );

      setMissingHeaders(missing);
      setExtraHeaders(extra);

      // Map CSV rows to match target headers order exactly
      const mapped: string[][] = rawCsvData.map((csvRow) => {
        return targetSheetHeaders.map((sheetH) => {
          const normSheetH = normalizeHeader(sheetH);
          const matchIdx = rawCsvHeaders.findIndex(
            (ch) => normalizeHeader(ch) === normSheetH
          );
          if (matchIdx >= 0 && csvRow[matchIdx] !== undefined) {
            return String(csvRow[matchIdx]).trim();
          }
          return "";
        });
      });

      setCsvMappedRows(mapped);

      console.log("[HISSAB CSV] Mapped Row Count:", mapped.length);
      console.log("[HISSAB CSV] Validation Missing Headers:", missing.length > 0 ? missing : "None");
      console.log("[HISSAB CSV] Validation Extra Headers:", extra.length > 0 ? extra : "None");

      // Check duplicates using primary key: Car Number + Start Date + End Date + ETM ID
      const existingKeySet = new Set<string>();
      dataRecords.forEach((r) => {
        const k = buildRecordKey(r.values, targetSheetHeaders);
        if (k) existingKeySet.add(k);
      });

      let dupes = 0;
      let newRecords = 0;

      mapped.forEach((mRow) => {
        const k = buildRecordKey(mRow, targetSheetHeaders);
        if (k && existingKeySet.has(k)) {
          dupes++;
        } else {
          newRecords++;
        }
      });

      setDuplicateCount(dupes);
      setNewRecordCount(newRecords);

      console.log("[HISSAB CSV] Key Matching Breakdown:", { newRecords, duplicates: dupes });
    };

    reader.readAsText(file);
  };

  // Handle Confirm CSV Upload
  const handleConfirmCsvUpload = async () => {
    if (!csvMappedRows.length) return;
    if (missingHeaders.length > 0) {
      setToast({
        type: "error",
        text: "Cannot upload CSV with missing required columns. Please fix the missing columns."
      });
      return;
    }

    setIsUploadingCsv(true);
    setUploadErrorDetails(null);
    setUploadSuccessDetails(null);
    setCsvUploadMessage("Checking Google OAuth authorization...");

    const targetSheetHeaders = headers.length > 0 ? headers : EXPECTED_HISSAB_SUMMARY_HEADERS;

    console.log("[HISSAB CSV] Target Sheet Name:", SHEET_NAME_HISSAB_SUMMARY);
    console.log("[HISSAB CSV] Duplicate Strategy:", duplicateStrategy);

    try {
      // Step 1: Ensure Google OAuth Access Token
      let activeToken = accessToken || (await getValidAccessToken());
      if (!activeToken) {
        setCsvUploadMessage("Authenticating with Google OAuth to authorize Google Sheet write...");
        const authResult = await requestGoogleOAuthSignIn({ prompt: "select_account" });
        activeToken = authResult.accessToken;
      }

      if (!activeToken) {
        throw new Error("Google OAuth access token missing. Please sign in with Google to perform sheet updates.");
      }

      setCsvUploadMessage("Processing records and detecting duplicates...");

      const existingKeyMap = new Map<string, number>();
      const existingDataRowsCopy = dataRecords.map((r) => [...r.values]);

      dataRecords.forEach((r, idx) => {
        const k = buildRecordKey(r.values, targetSheetHeaders);
        if (k) {
          existingKeyMap.set(k, idx);
        }
      });

      const newRecordsToInsertAtTop: string[][] = [];
      let updatedRecordsCount = 0;
      let skippedRecordsCount = 0;
      let insertedNewCount = 0;

      csvMappedRows.forEach((csvRow) => {
        const k = buildRecordKey(csvRow, targetSheetHeaders);

        if (k && existingKeyMap.has(k)) {
          if (duplicateStrategy === "update") {
            const existingIdx = existingKeyMap.get(k)!;
            const targetRow = [...existingDataRowsCopy[existingIdx]];

            csvRow.forEach((val, cIdx) => {
              if (val !== undefined && val !== null && String(val).trim() !== "") {
                targetRow[cIdx] = val;
              }
            });

            existingDataRowsCopy[existingIdx] = targetRow;
            updatedRecordsCount++;
          } else if (duplicateStrategy === "skip") {
            skippedRecordsCount++;
          } else {
            newRecordsToInsertAtTop.push(csvRow);
            insertedNewCount++;
          }
        } else {
          newRecordsToInsertAtTop.push(csvRow);
          insertedNewCount++;
        }
      });

      const combinedMatrix = [targetSheetHeaders, ...newRecordsToInsertAtTop, ...existingDataRowsCopy];
      const endColLetter = getColumnLetter(Math.max(targetSheetHeaders.length - 1, 0));
      const range = `'${SHEET_NAME_HISSAB_SUMMARY}'!A1:${endColLetter}${combinedMatrix.length}`;

      console.log("[HISSAB CSV] Google Sheet Write Request:", {
        sheetName: SHEET_NAME_HISSAB_SUMMARY,
        range,
        targetHeadersCount: targetSheetHeaders.length,
        newRecordsToInsertAtTopCount: newRecordsToInsertAtTop.length,
        updatedRecordsCount,
        skippedRecordsCount,
        totalCombinedMatrixRows: combinedMatrix.length
      });

      setCsvUploadMessage(`Writing ${insertedNewCount} new records to top of Google Sheet tab '${SHEET_NAME_HISSAB_SUMMARY}'...`);

      const writeResponse = await insertHissabSummaryRecordsAtTop(
        targetSheetHeaders,
        newRecordsToInsertAtTop,
        existingDataRowsCopy,
        activeToken
      );

      console.log("[HISSAB CSV] Google Sheet Write Response:", writeResponse);

      // MANDATORY Post-Write Verification Readback
      setCsvUploadMessage("Verifying Google Sheet write output...");
      clearSheetCache();
      const reFetchedData = await fetchHissabSummarySheet(activeToken, true);

      console.log("[HISSAB CSV] Post-Write Verification Re-Fetched Rows Count:", reFetchedData ? reFetchedData.length : 0);

      if (!reFetchedData || reFetchedData.length < combinedMatrix.length - 2) {
        const verifyError = `Google Sheet write verification failed. Re-fetched row count (${reFetchedData?.length || 0}) is less than expected minimum (${combinedMatrix.length}).`;
        console.error("[HISSAB CSV] Verification Failed:", verifyError);
        throw new Error(verifyError);
      }

      console.log("[HISSAB CSV] Verification Result: SUCCESS!");

      const totalRowsWritten = insertedNewCount + updatedRecordsCount;
      const successDetail: UploadSuccessDetail = {
        targetSheet: SHEET_NAME_HISSAB_SUMMARY,
        csvRows: csvRawRows.length,
        validRows: csvMappedRows.length,
        newRecords: insertedNewCount,
        duplicates: duplicateCount,
        rowsWritten: totalRowsWritten
      };

      setUploadSuccessDetails(successDetail);

      setToast({
        type: "success",
        text: `CSV Upload Successful: ${insertedNewCount} new records added at top, ${updatedRecordsCount} existing records updated${skippedRecordsCount > 0 ? `, ${skippedRecordsCount} duplicates skipped` : ""}. Verification passed.`
      });

      await loadData(true);
    } catch (err: any) {
      const errMsg = err?.message || String(err) || "Unknown error occurred writing database records.";
      console.error("[HISSAB CSV] Pipeline Failure Error:", err);

      setUploadErrorDetails({
        targetSheet: SHEET_NAME_HISSAB_SUMMARY,
        csvRows: csvRawRows.length,
        validRows: csvMappedRows.length,
        rowsWritten: 0,
        reason: errMsg
      });

      setToast({
        type: "error",
        text: `CSV upload failed. ${errMsg}`
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
              ? "bg-emerald-900/95 text-emerald-100 border-emerald-500/50 backdrop-blur-md"
              : "bg-rose-900/95 text-rose-100 border-rose-500/50 backdrop-blur-md"
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  Hissab Summary
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Live Ledger
                  </span>
                  {!isUserAuthorized && (
                    <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/40 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Read-Only
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Live updated records and financial reconciliation ledger
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Cloud Sync Connection Badge */}
            <div className={`px-3 py-2 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
              googleAuth.isAuthenticated
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${googleAuth.isAuthenticated ? "bg-emerald-500 shadow-xs" : "bg-amber-500 animate-pulse"}`} />
              <span className="hidden sm:inline">
                {googleAuth.isAuthenticated
                  ? `Cloud Sync: ${googleAuth.userEmail || "Connected"}`
                  : "Cloud Sync: Not Connected"}
              </span>
              <span className="sm:hidden">
                {googleAuth.isAuthenticated ? "Connected" : "Not Connected"}
              </span>
              {!googleAuth.isAuthenticated && (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="ml-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer flex items-center gap-1"
                >
                  {isConnectingGoogle && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{isConnectingGoogle ? "Connecting..." : "Sign In"}</span>
                </button>
              )}
            </div>

            {lastRefreshed && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden lg:inline-block mr-1">
                Synced: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}

            {/* Audit History */}
            {auditTrail.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAuditModal(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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

        {/* Filters Grid Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Search & Specific Column Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {/* Global Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all columns..."
                className="w-full pl-8 pr-7 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter by Driver Name */}
            <div>
              <select
                value={filterDriverName}
                onChange={(e) => setFilterDriverName(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Driver Name: All</option>
                {filterOptions.driverNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Filter by ETM ID */}
            <div>
              <select
                value={filterEtmId}
                onChange={(e) => setFilterEtmId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ETM ID: All</option>
                {filterOptions.etmIds.map((etm) => (
                  <option key={etm} value={etm}>{etm}</option>
                ))}
              </select>
            </div>

            {/* Filter by Car Number */}
            <div>
              <select
                value={filterCarNumber}
                onChange={(e) => setFilterCarNumber(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Car Number: All</option>
                {filterOptions.carNumbers.map((car) => (
                  <option key={car} value={car}>{car}</option>
                ))}
              </select>
            </div>

            {/* Filter by Date */}
            <div>
              <DateRangePicker
                value={filterDate}
                onChange={(val) => setFilterDate(val)}
                placeholder="Filter Date (DD/MM/YYYY)..."
              />
            </div>

            {/* Filter by Partner Name */}
            <div>
              <select
                value={filterPartnerName}
                onChange={(e) => setFilterPartnerName(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Partner: All</option>
                {filterOptions.partnerNames.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-medium">Active Records:</span>
              <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">
                {filteredRecords.length}
              </span>
              <span>/ {dataRecords.length} total</span>
            </div>

            {(searchQuery || filterDriverName !== "all" || filterEtmId !== "all" || filterCarNumber !== "all" || filterDate || filterPartnerEtm !== "all" || filterPartnerName !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterDriverName("all");
                  setFilterEtmId("all");
                  setFilterCarNumber("all");
                  setFilterDate("");
                  setFilterPartnerEtm("all");
                  setFilterPartnerName("all");
                }}
                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connection Error Banner */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-5 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-extrabold">Connection Error</h4>
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300 mt-0.5">
                Unable to load Hissab Summary records. Please try Sync / Refresh.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Sync / Refresh
          </button>
        </div>
      )}

      {/* Main Table View */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-48 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
          <p className="text-center text-xs font-bold text-slate-400 py-2">
            Loading live Hissab Summary data...
          </p>
        </div>
      ) : dataRecords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            No Hissab Summary data available.
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Hissab Summary records are currently empty or unavailable.
          </p>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="mt-5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync / Refresh
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          {/* Horizontally Scrollable Table for all 39 columns */}
          <div className="hidden md:block overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[3200px]">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-3 w-16 text-center text-slate-400 font-mono sticky left-0 z-20 bg-slate-100 dark:bg-slate-800">Row #</th>
                  {headers.map((header, colIdx) => {
                    const isFinancial = EDITABLE_FINANCIAL_COLUMNS.has(header);
                    return (
                      <th
                        key={colIdx}
                        className={`py-3.5 px-4 whitespace-nowrap font-extrabold ${
                          isFinancial ? "text-right text-blue-700 dark:text-blue-300" : "text-left"
                        }`}
                      >
                        {header || `Column ${colIdx + 1}`}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="py-8 text-center text-slate-400 font-medium">
                      No records match your active search or filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => {
                    const sheetRow = record.sheetRowIndex;

                    return (
                      <tr
                        key={sheetRow}
                        className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-900 dark:even:bg-slate-800/20"
                      >
                        {/* Sheet Row Index */}
                        <td className="py-3 px-3 text-center text-[11px] font-mono font-bold text-slate-400 sticky left-0 z-10 bg-white dark:bg-slate-900">
                          {sheetRow}
                        </td>

                        {headers.map((header, colIdx) => {
                          const rawValue = record.values[colIdx] ?? "";
                          const cellText = formatCellDisplay(rawValue);
                          const isFinancial = EDITABLE_FINANCIAL_COLUMNS.has(header);
                          const isCurrentlyEditing =
                            editingCell?.sheetRowIndex === sheetRow && editingCell?.colIndex === colIdx;

                          return (
                            <td
                              key={colIdx}
                              className={`py-3 px-4 whitespace-nowrap ${
                                isFinancial ? "text-right font-mono font-bold text-slate-900 dark:text-slate-100" : "font-medium"
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
                                    title="Save Changes"
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
                                <div className={`group flex items-center gap-2 ${isFinancial ? "justify-end" : "justify-start"}`}>
                                  <span>{cellText}</span>

                                  {/* Edit Financial Amount Button */}
                                  {isFinancial && isUserAuthorized && (
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

          {/* Mobile Card Layout */}
          <div className="block md:hidden p-4 space-y-3">
            {paginatedRecords.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">
                No records match active search/filters.
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
                          const isFinancial = EDITABLE_FINANCIAL_COLUMNS.has(header);
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
                                  {isFinancial && isUserAuthorized && (
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
                    Upload CSV to Hissab Summary
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Target Module: <span className="font-bold text-slate-700 dark:text-slate-300">Hissab Summary Ledger</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvFile(null);
                  setCsvMappedRows([]);
                  setMissingHeaders([]);
                  setExtraHeaders([]);
                  setUploadErrorDetails(null);
                  setUploadSuccessDetails(null);
                }}
                disabled={isUploadingCsv}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cloud Authorization Banner inside Modal */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
              googleAuth.isAuthenticated
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${googleAuth.isAuthenticated ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                <span className="font-semibold">
                  {googleAuth.isAuthenticated
                    ? `Cloud Sync Authorized${googleAuth.userEmail ? ` (${googleAuth.userEmail})` : ""}`
                    : "Cloud Authorization: Required for writing updates"}
                </span>
              </div>
              {!googleAuth.isAuthenticated && (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isConnectingGoogle && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Upload Pipeline Success Display */}
            {uploadSuccessDetails ? (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-800 p-5 rounded-2xl text-emerald-900 dark:text-emerald-100 space-y-3">
                  <div className="flex items-center gap-2 font-black text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span>CSV Upload & Ledger Sync Successful!</span>
                  </div>

                  <p className="text-xs text-emerald-800 dark:text-emerald-200">
                    All valid records have been verified and synced to the database at the top.
                  </p>

                  <div className="text-xs space-y-1.5 font-mono text-emerald-800 dark:text-emerald-200 bg-white/70 dark:bg-black/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                    <p><span className="font-bold text-slate-700 dark:text-slate-300">Target Module:</span> Hissab Summary</p>
                    <p><span className="font-bold text-slate-700 dark:text-slate-300">Total CSV Rows:</span> {uploadSuccessDetails.csvRows}</p>
                    <p><span className="font-bold text-slate-700 dark:text-slate-300">Valid Mapped Rows:</span> {uploadSuccessDetails.validRows}</p>
                    <p><span className="font-bold text-slate-700 dark:text-slate-300">New Records Inserted at Top:</span> {uploadSuccessDetails.newRecords}</p>
                    <p><span className="font-bold text-slate-700 dark:text-slate-300">Duplicates Handled:</span> {uploadSuccessDetails.duplicates}</p>
                    <p><span className="font-bold text-emerald-700 dark:text-emerald-300">Total Rows Written / Verified:</span> {uploadSuccessDetails.rowsWritten}</p>
                    <p><span className="font-bold text-emerald-700 dark:text-emerald-300">Data Verification:</span> PASSED ✓</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCsvModal(false);
                      setCsvFile(null);
                      setCsvMappedRows([]);
                      setMissingHeaders([]);
                      setExtraHeaders([]);
                      setUploadErrorDetails(null);
                      setUploadSuccessDetails(null);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Done & Close</span>
                  </button>
                </div>
              </div>
            ) : !csvFile ? (
              /* File Selection Box */
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3 hover:border-emerald-500 transition-colors">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <label htmlFor="csv-file-input" className="cursor-pointer text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline">
                    Click to select CSV File
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts .csv file with Hissab Summary headers
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
              /* CSV Validation & Metrics Preview */
              <div className="space-y-4 text-xs">
                {/* Upload Pipeline Failure Display */}
                {uploadErrorDetails && (
                  <div className="bg-rose-50 dark:bg-rose-950/90 border border-rose-300 dark:border-rose-800 p-4 rounded-2xl text-rose-900 dark:text-rose-100 space-y-2.5 animate-fade-in">
                    <div className="flex items-center gap-2 font-black text-xs text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>CSV Upload Failed: Unable to write records</span>
                    </div>
                    <div className="text-[11px] space-y-1 font-mono text-rose-800 dark:text-rose-200 bg-white/60 dark:bg-black/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">Target Module:</span> Hissab Summary</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">Total CSV Rows:</span> {uploadErrorDetails.csvRows}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">Valid Mapped Rows:</span> {uploadErrorDetails.validRows}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">Rows Written:</span> {uploadErrorDetails.rowsWritten}</p>
                      <p className="font-bold text-rose-700 dark:text-rose-300 mt-2 pt-1 border-t border-rose-200 dark:border-rose-800">
                        Reason: <span className="font-normal text-rose-900 dark:text-rose-100">{uploadErrorDetails.reason}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Missing Columns Error Display */}
                {missingHeaders.length > 0 ? (
                  <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 p-4 rounded-2xl text-rose-900 dark:text-rose-200 space-y-2">
                    <div className="flex items-center gap-2 font-black text-xs text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>CSV upload cannot continue.</span>
                    </div>
                    <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                      Missing required Hissab Summary columns:
                    </p>
                    <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5 text-rose-800 dark:text-rose-300 max-h-32 overflow-y-auto pl-1">
                      {missingHeaders.map((mh) => (
                        <li key={mh}>{mh}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>All required Hissab Summary columns matched successfully!</span>
                  </div>
                )}

                {/* Extra Columns Note (Safely Ignored) */}
                {extraHeaders.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl text-slate-600 dark:text-slate-300 text-[11px]">
                    <span className="font-bold">Extra CSV Columns (will be ignored safely): </span>
                    <span>{extraHeaders.join(", ")}</span>
                  </div>
                )}

                {/* Stat Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total CSV Rows</span>
                    <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{csvRawRows.length}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Valid Mapped</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">{csvMappedRows.length}</span>
                  </div>
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-2xl border border-blue-200 dark:border-blue-800 text-center">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block">New Records</span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono">{newRecordCount}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800 text-center">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block">Duplicate Rows</span>
                    <span className="text-sm font-black text-amber-700 dark:text-amber-300 font-mono">{duplicateCount}</span>
                  </div>
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block">Matched Headers</span>
                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 font-mono">{EXPECTED_HISSAB_SUMMARY_HEADERS.length - missingHeaders.length} / {EXPECTED_HISSAB_SUMMARY_HEADERS.length}</span>
                  </div>
                </div>

                {/* Duplicate Strategy Policy Option */}
                {duplicateCount > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                      Duplicate Record Handling Strategy (Matching Key: Car Number + Start Date + End Date + ETM ID):
                    </span>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs font-medium">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="dupeStrategy"
                          checked={duplicateStrategy === "update"}
                          onChange={() => setDuplicateStrategy("update")}
                        />
                        <span>Update existing matching record (Recommended)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="dupeStrategy"
                          checked={duplicateStrategy === "skip"}
                          onChange={() => setDuplicateStrategy("skip")}
                        />
                        <span>Skip duplicates</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Insertion Policy Notice */}
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 text-xs font-medium space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    Insertion Policy:
                  </p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    New CSV records will be inserted <span className="font-bold uppercase underline">at the TOP</span> of the ledger. Existing records will remain preserved below.
                  </p>
                </div>

                {/* Data Preview */}
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

                {/* Status Indicator */}
                {isUploadingCsv && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 rounded-2xl border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-center space-y-2">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin text-emerald-600" />
                    <p className="font-bold text-xs">{csvUploadMessage}</p>
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvFile(null);
                      setCsvMappedRows([]);
                      setMissingHeaders([]);
                      setExtraHeaders([]);
                    }}
                    disabled={isUploadingCsv}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    Select Different File
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCsvUpload}
                    disabled={isUploadingCsv || missingHeaders.length > 0 || csvMappedRows.length === 0}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isUploadingCsv && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Confirm & Upload Records</span>
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
