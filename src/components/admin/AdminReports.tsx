import React, { useState } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Calendar,
  Users,
  Car,
  Receipt,
  CheckCircle2,
  Filter
} from "lucide-react";
import { AdminDriverItem, AdminVehicleItem } from "../../types";
import { formatVehicleNumber } from "../../lib/sheets";

interface AdminReportsProps {
  drivers: AdminDriverItem[];
  vehicles?: AdminVehicleItem[];
}

type ReportType = "DRIVER" | "VEHICLE" | "OUTSTANDING" | "VERIFICATION";
type WeekFilter = "CURRENT_WEEK" | "PREVIOUS_WEEK" | "LAST_2_WEEKS" | "LAST_4_WEEKS" | "CUSTOM";

export default function AdminReports({ drivers = [], vehicles = [] }: AdminReportsProps) {
  const [reportType, setReportType] = useState<ReportType>("DRIVER");
  const [weekFilter, setWeekFilter] = useState<WeekFilter>("CURRENT_WEEK");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

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

  // Helper to compute date boundaries for Week Selector
  const getDateRange = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (weekFilter === "CUSTOM" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (weekFilter === "PREVIOUS_WEEK") {
      const day = today.getDay();
      const diffToPrevMonday = today.getDate() - day - 6 + (day === 0 ? -6 : 1);
      const start = new Date(today.getFullYear(), today.getMonth(), diffToPrevMonday);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (weekFilter === "LAST_2_WEEKS") {
      const start = new Date();
      start.setDate(today.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    }

    if (weekFilter === "LAST_4_WEEKS") {
      const start = new Date();
      start.setDate(today.getDate() - 28);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    }

    // CURRENT_WEEK
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
    start.setHours(0, 0, 0, 0);
    return { start, end: today };
  };

  const { start: filterStart, end: filterEnd } = getDateRange();

  // Helper to filter drivers based on date
  const filterByDate = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    return d >= filterStart && d <= filterEnd;
  };

  const filteredDrivers = drivers.filter(d => filterByDate(d.registrationDate));

  // Export CSV
  const exportToExcelCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportType === "DRIVER") {
      headers = ["Driver Name", "Mobile Number", "ETM ID", "Vehicle Number", "Registration Date", "Status"];
      rows = filteredDrivers.map(d => [
        `"${d.name.replace(/"/g, '""')}"`,
        `"${d.mobile}"`,
        `"${d.etmId || ""}"`,
        `"${formatVehicleNumber(d.vehicleNumber)}"`,
        `"${d.registrationDate || ""}"`,
        `"${d.status}"`
      ]);
    } else if (reportType === "VEHICLE") {
      headers = ["Vehicle Number", "Vehicle Model", "Assigned Driver Name", "ETM ID", "Status"];
      rows = vehicles.map(v => [
        `"${v.vehicleNumber}"`,
        `"${v.model || v.vehicleType || ""}"`,
        `"${v.assignedDriverName || ""}"`,
        `"${v.assignedDriverEtm || ""}"`,
        `"${v.status}"`
      ]);
    } else if (reportType === "OUTSTANDING") {
      headers = ["Driver Name", "Mobile Number", "ETM ID", "Current Outstanding (INR)", "Last Week Outstanding (INR)", "Total Outstanding (INR)"];
      rows = filteredDrivers.map(d => [
        `"${d.name.replace(/"/g, '""')}"`,
        `"${d.mobile}"`,
        `"${d.etmId || ""}"`,
        d.currentOutstanding || 0,
        d.weeklyOutstanding || 0,
        d.totalOutstanding || (d.currentOutstanding || 0) + (d.weeklyOutstanding || 0)
      ]);
    } else if (reportType === "VERIFICATION") {
      headers = ["Driver Name", "Mobile Number", "ETM ID", "Verification Status", "Document Status", "Registration Date"];
      rows = filteredDrivers.map(d => [
        `"${d.name.replace(/"/g, '""')}"`,
        `"${d.mobile}"`,
        `"${d.etmId || ""}"`,
        `"${d.status}"`,
        `"${d.documentStatus}"`,
        `"${d.registrationDate || ""}"`
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSK_${reportType}_Report_${weekFilter}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable PDF
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SSK Fleet Report - ${reportType} (${weekFilter})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #0D47A1; margin-bottom: 5px; }
            p { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #0D47A1; color: white; }
          </style>
        </head>
        <body>
          <h1>SSK Fleet ${reportType} Report</h1>
          <p>Filter: <strong>${weekFilter}</strong> | Generated on: ${new Date().toLocaleString("en-IN")}</p>
          <table>
            <thead>
              <tr>
                ${reportType === "DRIVER" ? "<th>Name</th><th>Mobile</th><th>ETM ID</th><th>Vehicle</th><th>Status</th>" : ""}
                ${reportType === "VEHICLE" ? "<th>Vehicle No</th><th>Model</th><th>Assigned Driver</th><th>ETM ID</th><th>Status</th>" : ""}
                ${reportType === "OUTSTANDING" ? "<th>Name</th><th>Mobile</th><th>ETM ID</th><th>Current Outstanding</th><th>Last Week Outstanding</th>" : ""}
                ${reportType === "VERIFICATION" ? "<th>Name</th><th>Mobile</th><th>ETM ID</th><th>Status</th><th>Doc Status</th>" : ""}
              </tr>
            </thead>
            <tbody>
              ${filteredDrivers.map(d => `
                <tr>
                  <td>${d.name}</td>
                  <td>${d.mobile}</td>
                  <td>${d.etmId || ""}</td>
                  ${reportType === "DRIVER" ? `<td>${formatVehicleNumber(d.vehicleNumber)}</td><td>${d.status}</td>` : ""}
                  ${reportType === "OUTSTANDING" ? `<td>${formatCurrencyDisplay(d.currentOutstanding)}</td><td>${formatCurrencyDisplay(d.weeklyOutstanding)}</td>` : ""}
                  ${reportType === "VERIFICATION" ? `<td>${d.status}</td><td>${d.documentStatus}</td>` : ""}
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen text-[#333333]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base sm:text-lg font-bold text-emerald-900">Fleet Analytics & Category Reports</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter fleet reports by custom week ranges and export to Excel, CSV, or PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={exportToExcelCSV}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={exportToPDF}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-[#0D47A1] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Report Category Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
        {[
          { id: "DRIVER", label: "Driver Report", icon: Users },
          { id: "VEHICLE", label: "Vehicle Report", icon: Car },
          { id: "OUTSTANDING", label: "Outstanding Report", icon: Receipt },
          { id: "VERIFICATION", label: "Verification Report", icon: CheckCircle2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as ReportType)}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isActive
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Week Selector Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Select Time Range:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "CURRENT_WEEK", label: "Current Week" },
            { id: "PREVIOUS_WEEK", label: "Previous Week" },
            { id: "LAST_2_WEEKS", label: "Last 2 Weeks" },
            { id: "LAST_4_WEEKS", label: "Last 4 Weeks" },
            { id: "CUSTOM", label: "Custom Date Range" }
          ].map((wf) => (
            <button
              key={wf.id}
              onClick={() => setWeekFilter(wf.id as WeekFilter)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                weekFilter === wf.id
                  ? "bg-[#0D47A1] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {wf.label}
            </button>
          ))}
        </div>

        {weekFilter === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Report Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">
            {reportType} Log ({weekFilter})
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            {reportType === "VEHICLE" ? vehicles.length : filteredDrivers.length} Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                {reportType === "DRIVER" && (
                  <>
                    <th className="p-3">Driver Name</th>
                    <th className="p-3">Mobile</th>
                    <th className="p-3">ETM ID</th>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Reg Date</th>
                    <th className="p-3">Status</th>
                  </>
                )}
                {reportType === "VEHICLE" && (
                  <>
                    <th className="p-3">Vehicle Number</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Assigned Driver</th>
                    <th className="p-3">ETM ID</th>
                    <th className="p-3">Status</th>
                  </>
                )}
                {reportType === "OUTSTANDING" && (
                  <>
                    <th className="p-3">Driver Name</th>
                    <th className="p-3">Mobile</th>
                    <th className="p-3">ETM ID</th>
                    <th className="p-3 text-right">Current Outstanding</th>
                    <th className="p-3 text-right">Last Week Outstanding</th>
                    <th className="p-3 text-right">Total Outstanding</th>
                  </>
                )}
                {reportType === "VERIFICATION" && (
                  <>
                    <th className="p-3">Driver Name</th>
                    <th className="p-3">Mobile</th>
                    <th className="p-3">ETM ID</th>
                    <th className="p-3">Driver Verification Status</th>
                    <th className="p-3">Document Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {reportType === "VEHICLE"
                ? vehicles.map((v, idx) => (
                    <tr key={`${v.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{v.vehicleNumber}</td>
                      <td className="p-3">{v.model || v.vehicleType || "EV"}</td>
                      <td className="p-3 font-bold text-[#0D47A1]">{v.assignedDriverName || "Unassigned"}</td>
                      <td className="p-3 font-mono text-slate-600">{v.assignedDriverEtm || "N/A"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))
                : filteredDrivers.map((d, idx) => (
                    <tr key={`${d.id}-${d.mobile || idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{d.name}</td>
                      <td className="p-3 font-mono text-slate-600">{d.mobile}</td>
                      <td className="p-3 font-bold text-[#0D47A1]">{d.etmId || "N/A"}</td>

                      {reportType === "DRIVER" && (
                        <>
                          <td className="p-3 font-mono">{formatVehicleNumber(d.vehicleNumber)}</td>
                          <td className="p-3 font-mono text-slate-500">{d.registrationDate || "N/A"}</td>
                          <td className="p-3 font-bold text-emerald-700">{d.status}</td>
                        </>
                      )}

                      {reportType === "OUTSTANDING" && (
                        <>
                          <td className="p-3 text-right font-extrabold text-amber-700">
                            {formatCurrencyDisplay(d.currentOutstanding)}
                          </td>
                          <td className="p-3 text-right font-bold text-indigo-700">
                            {formatCurrencyDisplay(d.weeklyOutstanding)}
                          </td>
                          <td className="p-3 text-right font-black text-rose-700">
                            {formatCurrencyDisplay(d.totalOutstanding !== undefined ? d.totalOutstanding : ((d.currentOutstanding || 0) + (d.weeklyOutstanding || 0)))}
                          </td>
                        </>
                      )}

                      {reportType === "VERIFICATION" && (
                        <>
                          <td className="p-3 font-bold text-indigo-700">{d.status}</td>
                          <td className="p-3 font-bold text-emerald-700">{d.documentStatus}</td>
                        </>
                      )}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
