import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Bell,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Smartphone
} from "lucide-react";
import { AdminDriverItem } from "../../types";

interface AdminNotificationsProps {
  drivers: AdminDriverItem[];
  onSendNotification: (
    title: string,
    message: string,
    alertLevel: string,
    targetDriverId: string,
    targetDriverEtm: string,
    targetDriverName: string,
    mobileNumber: string,
    channel: string
  ) => Promise<{ success: boolean; message: string } | void>;
  isProcessing?: boolean;
}

export default function AdminNotifications({
  drivers = [],
  onSendNotification,
  isProcessing = false
}: AdminNotificationsProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [alertLevel, setAlertLevel] = useState<string>("Information");
  const [targetDriver, setTargetDriver] = useState<string>("ALL");
  const [channel, setChannel] = useState<string>("In-App Push Alert");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!title.trim() || !message.trim()) {
      setErrorMsg("Please fill in both notice header and message content.");
      return;
    }

    try {
      const selectedDriverObj = targetDriver === "ALL"
        ? null
        : drivers.find((d) => (d.id || d.etmId || d.mobile) === targetDriver || d.id === targetDriver || d.etmId === targetDriver || d.mobile === targetDriver);

      const targetDriverId = targetDriver === "ALL" ? "ALL" : (selectedDriverObj?.id || selectedDriverObj?.etmId || "DRV-" + (selectedDriverObj?.mobile || ""));
      const targetDriverEtm = targetDriver === "ALL" ? "ALL" : (selectedDriverObj?.etmId || selectedDriverObj?.id || "N/A");
      const targetDriverName = targetDriver === "ALL" ? "All Fleet Drivers" : (selectedDriverObj?.name || "Fleet Driver");
      const mobileNumber = targetDriver === "ALL" ? "ALL" : (selectedDriverObj?.mobile || "");

      if (channel === "WhatsApp Message") {
        const cleanMobile = mobileNumber !== "ALL" ? mobileNumber.replace(/\D/g, "") : "";
        const encodedText = encodeURIComponent(`*${title}*\n\n${message}\n\n_SSK Driver Fleet Operations_`);
        const waUrl = cleanMobile
          ? `https://wa.me/91${cleanMobile}?text=${encodedText}`
          : `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(waUrl, "_blank");
      }

      const res = await onSendNotification(
        title.trim(),
        message.trim(),
        alertLevel,
        targetDriverId,
        targetDriverEtm,
        targetDriverName,
        mobileNumber,
        channel
      );

      if (res && res.success === false) {
        setErrorMsg(res.message || "Notification could not be saved. Please try again.");
        return;
      }

      const outputMsg = (res && typeof res === "object" && "message" in res && typeof res.message === "string")
        ? res.message
        : (targetDriver !== "ALL" ? `Notification sent successfully to ${targetDriverName} (${targetDriverEtm}).` : "Notification broadcasted successfully to All Fleet Drivers.");

      setSuccessMsg(outputMsg);
      setTitle("");
      setMessage("");
    } catch (err: any) {
      console.error("Dispatch notification error:", err);
      setErrorMsg(err?.message || "Notification could not be saved. Please try again.");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen text-[#333333]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-700" />
            <h2 className="text-base sm:text-lg font-bold text-amber-900">Fleet Notifications & Broadcasts</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dispatch app alerts, WhatsApp messages, or urgent notices directly to driver accounts and log to Notifications Sheet.
          </p>
        </div>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs"
        >
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs"
        >
          <XCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSend} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 max-w-2xl">
        {/* Channel Selection */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">Notification Channel</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "In-App Push Alert", label: "In-App Push Alert", icon: Smartphone },
              { id: "WhatsApp Message", label: "WhatsApp Message", icon: MessageSquare },
              { id: "Important Notice", label: "Important Notice", icon: AlertTriangle }
            ].map((ch) => {
              const Icon = ch.icon;
              const isSelected = channel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#0D47A1] text-white border-[#0D47A1] shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Driver Selection */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Target Driver Recipient</label>
          <select
            value={targetDriver}
            onChange={(e) => setTargetDriver(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E88E5]"
          >
            <option value="ALL">📢 All Active Fleet Drivers ({drivers.length})</option>
            {drivers.map((d, idx) => {
              const driverVal = d.id || d.etmId || d.mobile || `driver-${idx}`;
              return (
                <option key={`${driverVal}-${idx}`} value={driverVal}>
                  👤 {d.name} ({d.mobile}) - Driver ID: {d.id || "N/A"} - ETM: {d.etmId || "N/A"}
                </option>
              );
            })}
          </select>
        </div>

        {/* Severity Type */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Alert Level</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "Information", label: "Information", color: "bg-blue-100 text-blue-800" },
              { id: "Warning / Due", label: "Warning / Due", color: "bg-amber-100 text-amber-800" },
              { id: "Success / Payment", label: "Success / Payment", color: "bg-emerald-100 text-emerald-800" },
              { id: "Urgent Action", label: "Urgent Action", color: "bg-rose-100 text-rose-800" }
            ].map((tp) => {
              const isSelected = alertLevel === tp.id;
              return (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => setAlertLevel(tp.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected ? `${tp.color} ring-2 ring-slate-800 shadow-xs` : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {tp.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Notice Header / Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g. Weekly Hissab Published / Vehicle Inspection Alert..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E88E5]"
            required
          />
        </div>

        {/* Message Input */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Detailed Message Content</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write clear instructions or notice content for the driver..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1E88E5] h-28"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3 bg-[#0D47A1] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>Dispatch Broadcast Notice</span>
        </button>
      </form>
    </div>
  );
}
