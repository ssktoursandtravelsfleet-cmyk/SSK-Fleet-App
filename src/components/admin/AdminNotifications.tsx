import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Bell,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Users,
  Smartphone
} from "lucide-react";
import { AdminDriverItem } from "../../types";

interface AdminNotificationsProps {
  drivers: AdminDriverItem[];
  onSendNotification: (
    title: string,
    message: string,
    type: "info" | "warning" | "success" | "danger",
    targetDriver?: string
  ) => Promise<void>;
  isProcessing?: boolean;
}

export default function AdminNotifications({
  drivers = [],
  onSendNotification,
  isProcessing = false
}: AdminNotificationsProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notifType, setNotifType] = useState<"info" | "warning" | "success" | "danger">("info");
  const [targetDriver, setTargetDriver] = useState<string>("ALL");
  const [channel, setChannel] = useState<"APP" | "WHATSAPP" | "IMPORTANT">("APP");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      alert("Please fill in both subject and message content.");
      return;
    }

    try {
      if (channel === "WHATSAPP") {
        // Open WhatsApp Web API link for selected driver or general WhatsApp broadcast
        const cleanMobile = targetDriver !== "ALL" ? targetDriver.replace(/\D/g, "") : "";
        const encodedText = encodeURIComponent(`*${title}*\n\n${message}\n\n_SSK Driver Fleet Operations_`);
        const waUrl = cleanMobile
          ? `https://wa.me/91${cleanMobile}?text=${encodedText}`
          : `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(waUrl, "_blank");
      }

      await onSendNotification(title, message, notifType, targetDriver);
      setSuccessMsg(`Broadcast notification dispatched successfully via ${channel}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setTitle("");
      setMessage("");
    } catch (err: any) {
      alert("Failed to send notification: " + (err?.message || "Unknown error"));
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
            Broadcast app alerts, WhatsApp messages, or urgent notices to drivers.
          </p>
        </div>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSend} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 max-w-2xl">
        {/* Channel Selection */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">Notification Channel</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "APP", label: "In-App Push Alert", icon: Smartphone },
              { id: "WHATSAPP", label: "WhatsApp Message", icon: MessageSquare },
              { id: "IMPORTANT", label: "Important Notice", icon: AlertTriangle }
            ].map((ch) => {
              const Icon = ch.icon;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id as any)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                    channel === ch.id
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
          <label className="text-xs font-bold text-slate-700 block mb-1">Target Recipient</label>
          <select
            value={targetDriver}
            onChange={(e) => setTargetDriver(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E88E5]"
          >
            <option value="ALL">📢 All Active Fleet Drivers ({drivers.length})</option>
            {drivers.map((d, idx) => (
              <option key={`${d.id}-${d.mobile || idx}`} value={d.mobile || d.etmId}>
                👤 {d.name} ({d.mobile}) - ETM: {d.etmId || "N/A"}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Type */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Alert Level</label>
          <div className="flex items-center gap-2">
            {[
              { id: "info", label: "Information", color: "bg-blue-100 text-blue-800" },
              { id: "warning", label: "Warning / Due", color: "bg-amber-100 text-amber-800" },
              { id: "success", label: "Success / Payment", color: "bg-emerald-100 text-emerald-800" },
              { id: "danger", label: "Urgent Action", color: "bg-rose-100 text-rose-800" }
            ].map((tp) => (
              <button
                key={tp.id}
                type="button"
                onClick={() => setNotifType(tp.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  notifType === tp.id ? `${tp.color} ring-2 ring-slate-800` : "bg-slate-100 text-slate-500"
                }`}
              >
                {tp.label}
              </button>
            ))}
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
          className="w-full py-3 bg-[#0D47A1] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>Dispatch Broadcast Notice</span>
        </button>
      </form>
    </div>
  );
}
