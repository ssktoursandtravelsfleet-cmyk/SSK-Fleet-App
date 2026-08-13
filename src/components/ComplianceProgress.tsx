import React, { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, FileText } from "lucide-react";

export interface DocumentStatusItem {
  id: string;
  name: string;
  fullName?: string;
  status: "verified" | "pending" | "missing" | "rejected" | "warning" | "expired";
  documentNo?: string;
  subText?: string;
}

interface ComplianceProgressProps {
  title?: string;
  subtitle?: string;
  items: DocumentStatusItem[];
  isLocked?: boolean;
  onUploadClick?: (docId: string) => void;
  className?: string;
}

export function ComplianceProgress({
  title = "Compliance Completion Status",
  subtitle = "Based on verified vs. pending document records",
  items,
  isLocked = false,
  onUploadClick,
  className = ""
}: ComplianceProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const total = items.length;
  if (total === 0) return null;

  const verifiedCount = items.filter(
    (item) => item.status === "verified"
  ).length;

  const pendingCount = items.filter(
    (item) => item.status === "pending" || item.status === "warning" || item.status === "expired"
  ).length;

  const missingCount = items.filter(
    (item) => item.status === "missing" || item.status === "rejected"
  ).length;

  const completionPercentage = Math.round((verifiedCount / total) * 100);

  // SVG Circular progress bar parameters
  const size = 110;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  // Determine theme color based on percentage
  let statusBadge = {
    label: "Fully Compliant",
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    gradientStart: "#10B981",
    gradientEnd: "#059669",
    textColor: "text-emerald-600 dark:text-emerald-400",
    icon: ShieldCheck
  };

  if (completionPercentage < 100 && completionPercentage >= 50) {
    statusBadge = {
      label: "Pending Verification",
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      gradientStart: "#F59E0B",
      gradientEnd: "#D97706",
      textColor: "text-amber-600 dark:text-amber-400",
      icon: Clock
    };
  } else if (completionPercentage < 50) {
    statusBadge = {
      label: "Action Required",
      color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      gradientStart: "#EF4444",
      gradientEnd: "#DC2626",
      textColor: "text-rose-600 dark:text-rose-400",
      icon: ShieldAlert
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 transition-all duration-300 ${className}`}
      id="compliance-progress-card"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 ${statusBadge.textColor}`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              {title}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${statusBadge.color}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* Main Body: Circular Progress Bar + Summary Stats */}
      <div className="py-5 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Left: Circular Progress Graphic */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="relative w-[110px] h-[110px] flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
              <defs>
                <linearGradient id="complianceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={statusBadge.gradientStart} />
                  <stop offset="100%" stopColor={statusBadge.gradientEnd} />
                </linearGradient>
              </defs>
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress Bar */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="url(#complianceGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Inner Circular Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-2xl font-black font-mono tracking-tight ${statusBadge.textColor}`}>
                {completionPercentage}%
              </span>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                Completed
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {verifiedCount}
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase">
                / {total} Verified
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {verifiedCount === total
                ? "All documents verified and compliant."
                : `${total - verifiedCount} document${total - verifiedCount > 1 ? "s" : ""} pending or missing.`}
            </p>
          </div>
        </div>

        {/* Right: Quick Breakdown Cards */}
        <div className="grid grid-cols-3 gap-2.5 w-full sm:w-auto flex-1 max-w-sm">
          {/* Verified Stat Box */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Verified</span>
            </div>
            <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
              {verifiedCount}
            </span>
          </div>

          {/* Pending Stat Box */}
          <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-2xl p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Pending</span>
            </div>
            <span className="text-lg font-black font-mono text-amber-700 dark:text-amber-300">
              {pendingCount}
            </span>
          </div>

          {/* Missing Stat Box */}
          <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 rounded-2xl p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400 mb-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Missing</span>
            </div>
            <span className="text-lg font-black font-mono text-rose-700 dark:text-rose-300">
              {missingCount}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Document Breakdown Toggle */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            Document Status Breakdown ({verifiedCount}/{total})
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Itemized list */}
        {isExpanded && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in">
            {items.map((item) => {
              const isItemVerified = item.status === "verified";
              const isItemPending = item.status === "pending" || item.status === "warning" || item.status === "expired";

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                    isItemVerified
                      ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40"
                      : isItemPending
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40"
                      : "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 truncate block">
                        {item.fullName || item.name}
                      </span>
                    </div>
                    {item.subText && (
                      <span className="text-[10px] text-slate-400 font-mono block truncate">
                        {item.subText}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {isItemVerified ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    ) : isItemPending ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" /> Missing
                      </span>
                    )}

                    {!isItemVerified && !isLocked && onUploadClick && (
                      <button
                        onClick={() => onUploadClick(item.id)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline ml-1 cursor-pointer"
                      >
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
