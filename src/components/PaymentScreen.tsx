import React, { useState } from "react";
import { Wallet, Menu, Info, CreditCard, Clock, CheckCircle, AlertTriangle, Calendar, Loader2, X } from "lucide-react";
import { PaymentRecord } from "../types";
import PullToRefresh from "./PullToRefresh";

interface PaymentScreenProps {
  payments: PaymentRecord[];
  outstandingAmount?: number;
  onRefresh: () => Promise<void>;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
  onOpenDrawer: () => void;
  triggerNotification: (title: string, message: string, type: "success" | "warning" | "info") => void;
  onSubmitPayment: (paymentType: string, amount: number) => Promise<boolean>;
  loggedMobile: string;
}

export default function PaymentScreen({
  payments,
  outstandingAmount,
  onRefresh,
  syncState,
  onOpenDrawer,
  triggerNotification,
  onSubmitPayment,
  loggedMobile,
}: PaymentScreenProps) {
  // Convert amount into numeric value as requested:
  const amount = Number(
    String(outstandingAmount !== undefined ? outstandingAmount : 0)
      .replace(/[₹,\s]/g, "")
  );

  let bannerTitle = "";
  let bannerMessage = "";
  let statusLabel = "";
  let statusColorClass = "";
  let bannerBgClass = "";
  let bannerTextClass = "";
  let bannerBorderClass = "";
  let bannerIconColorClass = "";

  if (amount < 0) {
    bannerTitle = "OUTSTANDING DUES AVAILABLE";
    bannerMessage = "Pending payment amount: ₹" + Math.abs(amount).toLocaleString("en-IN");
    statusLabel = "Pending";
    statusColorClass = "text-rose-600 bg-rose-50 border-rose-200";
    bannerBgClass = "bg-rose-50";
    bannerTextClass = "text-rose-900/80";
    bannerBorderClass = "border-rose-100";
    bannerIconColorClass = "text-rose-600";
  } else if (amount > 0) {
    bannerTitle = "ACCOUNT IN CREDIT";
    bannerMessage = "Available balance: ₹" + amount.toLocaleString("en-IN");
    statusLabel = "Paid";
    statusColorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
    bannerBgClass = "bg-emerald-50";
    bannerTextClass = "text-emerald-900/80";
    bannerBorderClass = "border-emerald-100";
    bannerIconColorClass = "text-emerald-600";
  } else {
    bannerTitle = "NO OUTSTANDING DUES";
    bannerMessage = "Your account is fully settled";
    statusLabel = "Paid";
    statusColorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
    bannerBgClass = "bg-emerald-50";
    bannerTextClass = "text-emerald-900/80";
    bannerBorderClass = "border-emerald-100";
    bannerIconColorClass = "text-emerald-600";
  }

  // Debugging logs as requested:
  console.log("Raw amount:", outstandingAmount);
  console.log("Parsed amount:", amount);
  console.log("Payment status:", statusLabel);

  // Helper to parse date/time to milliseconds for accurate sorting
  const parseDateTime = (dtStr: string): number => {
    if (!dtStr) return 0;
    const clean = dtStr.trim();
    // Match "DD/MM/YYYY HH:MM AM/PM"
    const dmyMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1]);
      const month = parseInt(dmyMatch[2]) - 1;
      const year = parseInt(dmyMatch[3]);
      let hour = parseInt(dmyMatch[4]);
      const minute = parseInt(dmyMatch[5]);
      const ampm = dmyMatch[6].toUpperCase();
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      return new Date(year, month, day, hour, minute).getTime();
    }
    const t = Date.parse(clean);
    return isNaN(t) ? 0 : t;
  };

  const paidPayments = [...payments]
    .filter(p => p && p.status && typeof p.status === "string" && p.status.toLowerCase() === "paid")
    .sort((a, b) => parseDateTime(b.date) - parseDateTime(a.date));

  const lastPayment = paidPayments.length > 0 ? paidPayments[0] : null;
  const lastPaymentAmount = lastPayment ? lastPayment.amount : 0;

  // Modal State for Payment Submission
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"Rent" | "Dues">("Rent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePayRent = () => {
    setModalType("Rent");
    setModalOpen(true);
  };

  const handlePayDues = () => {
    if (amount >= 0) {
      triggerNotification(
        "No Outstanding Dues 🌿",
        "Your account is completely up to date. No payment is required.",
        "success"
      );
      return;
    }
    setModalType("Dues");
    setModalOpen(true);
  };

  const handleSelectPaymentMethod = async (methodName: string) => {
    const payAmount = Math.abs(amount);
    
    // Generate UPI payment link: upi://pay?pa=omkarsonawane740@okaxis&pn=SSK Travels&am=PAY_AMOUNT&cu=INR
    const upiLink = `upi://pay?pa=omkarsonawane740@okaxis&pn=${encodeURIComponent("SSK Travels")}&am=${payAmount}&cu=INR`;
    
    console.log(`Payment via ${methodName}. Initiating deep link...`);
    
    // Open Google Pay, PhonePe, Paytm or generic UPI
    if (methodName !== "UPI ID") {
      try {
        window.open(upiLink, "_self");
        // Fallback standard navigation
        window.location.href = upiLink;
      } catch (e) {
        console.warn("UPI deep linking is not supported on this platform/device:", e);
      }
    } else {
      // For UPI ID, we copy it to clipboard as well for convenience!
      try {
        await navigator.clipboard.writeText("omkarsonawane740@okaxis");
        triggerNotification(
          "UPI ID Copied! 📋",
          "omkarsonawane740@okaxis copied to clipboard. Paste it in your UPI app.",
          "success"
        );
      } catch (err) {
        console.warn("Failed to copy UPI ID:", err);
      }
    }

    // Immediately record payment into sheet Payment Log and auto-refresh without page reload
    setIsSubmitting(true);
    const typeLabel = modalType === "Rent" ? "Rent" : "Dues";
    const success = await onSubmitPayment(typeLabel, payAmount);
    setIsSubmitting(false);
    if (success) {
      setModalOpen(false);
    }
  };

  const handleShowHistory = () => {
    const historySection = document.getElementById("payment-history-section");
    if (historySection) {
      historySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F4F6F9] dark:bg-slate-950 text-[#333333] dark:text-slate-100 relative overflow-hidden transition-colors duration-200">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs select-none relative shrink-0 transition-colors duration-200">
        <button
          onClick={onOpenDrawer}
          className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-[#0A2540] dark:text-slate-100 cursor-pointer"
          title="Open Menu"
          id="btn-open-menu-payment"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-extrabold text-[#0A2540] dark:text-white">Payment</h2>
        <div className="w-8" />
      </div>

      <PullToRefresh onRefresh={onRefresh} syncState={syncState}>
        <div className="p-4 flex-1 flex flex-col gap-4 pb-20">
          {/* Main Summary Card */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100/50 dark:border-slate-800 flex flex-col transition-colors duration-200">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="bg-[#0A2540] dark:bg-blue-900 p-3 rounded-2xl flex items-center justify-center shrink-0">
                <Wallet className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-extrabold text-[#0A2540] dark:text-white leading-none mb-1">My Account</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-bold leading-none">Your registered payment details</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-4 mb-5">
              {/* Total Outstanding */}
              <div className="bg-[#FAFBFD] dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col items-center text-center">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
                  TOTAL OUTSTANDING AMOUNT
                </span>
                <span className="text-3xl font-black text-[#0A2540] dark:text-white">
                  ₹{Math.abs(amount).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Grid for Last Paid & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAFBFD] dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-2xl p-3.5 flex flex-col items-center text-center">
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">
                    LAST PAYMENT
                  </span>
                  <span className="text-lg font-extrabold text-slate-700 dark:text-slate-200">
                    ₹{lastPaymentAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-[#FAFBFD] dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1.5">
                    PAYMENT STATUS
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide ${statusColorClass}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handlePayRent}
                  className="bg-[#0A2540] hover:bg-[#123456] active:scale-98 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-pay-rent"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Rent</span>
                </button>
                <button
                  onClick={handlePayDues}
                  className="bg-white hover:bg-slate-50 border border-slate-200 active:scale-98 text-[#0A2540] font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-pay-dues"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Pay Dues</span>
                </button>
              </div>
              <button
                onClick={handleShowHistory}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-98 text-slate-600 font-extrabold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="btn-view-history"
              >
                <span>View Payment History</span>
              </button>
            </div>
          </div>

          {/* Payment History Section */}
          <div id="payment-history-section" className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100/50 flex flex-col flex-1">
            <h4 className="text-sm font-extrabold text-[#0A2540] mb-4">Payment History</h4>

            {payments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400">No payment records available</p>
                <p className="text-[10px] text-slate-300 mt-1">We couldn't find any transaction history for your mobile number.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                {payments.map((p) => {
                  const isPaid = p && p.status && typeof p.status === "string" && p.status.toLowerCase() === "paid";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/70 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
                          isPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {isPaid ? <CheckCircle className="w-4.5 h-4.5" /> : <AlertTriangle className="w-4.5 h-4.5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700 leading-tight">
                            {p.paymentType || "Regular Payment"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {p.date || "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <span className="text-sm font-black text-[#0A2540]">
                          ₹{p.amount.toLocaleString("en-IN")}
                        </span>
                        <span className={`text-[9px] font-black uppercase mt-0.5 ${
                          isPaid ? "text-emerald-600" : "text-amber-500"
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Payment Status Banner */}
          <div className={`border rounded-2xl p-4 flex items-start gap-3 shadow-2xs ${bannerBgClass} ${bannerBorderClass}`}>
            {statusLabel === "Pending" ? (
              <AlertTriangle className={`w-5.5 h-5.5 ${bannerIconColorClass} shrink-0 mt-0.5`} />
            ) : (
              <CheckCircle className={`w-5.5 h-5.5 ${bannerIconColorClass} shrink-0 mt-0.5`} />
            )}
            <div className="flex flex-col">
              <span className={`text-xs font-black uppercase tracking-wider ${bannerIconColorClass}`}>
                {bannerTitle}
              </span>
              <p className={`text-xs font-bold leading-relaxed mt-0.5 ${bannerTextClass}`}>
                {bannerMessage}
              </p>
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Choose Payment Method Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0A2540]">
                Choose Payment Method
              </h3>
              <button
                onClick={() => !isSubmitting && setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-normal -mt-1">
              Recording {modalType} payment for mobile: <strong className="text-[#0A2540]">{loggedMobile}</strong>
            </p>

            <div className="bg-[#FAFBFD] border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
                Amount to Pay ({modalType})
              </span>
              <span className="text-2xl font-black text-[#0A2540]">
                ₹{Math.abs(amount).toLocaleString("en-IN")}
              </span>
              <p className="text-[10px] text-slate-400 font-bold mt-1">
                UPI: omkarsonawane740@okaxis
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Google Pay */}
              <button
                onClick={() => handleSelectPaymentMethod("Google Pay")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 active:scale-98 border border-slate-100 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-3xs">
                    <span className="text-xs font-black text-blue-600">GPay</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black text-slate-700">Google Pay</span>
                    <span className="text-[9px] text-slate-400 font-bold">Pay instantly using Google Pay</span>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-slate-200/50 group-hover:bg-[#0A2540] flex items-center justify-center transition-colors">
                  <span className="text-white text-xs">➔</span>
                </div>
              </button>

              {/* PhonePe */}
              <button
                onClick={() => handleSelectPaymentMethod("PhonePe")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 active:scale-98 border border-slate-100 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-3xs">
                    <span className="text-xs font-black text-indigo-600">Pe</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black text-slate-700">PhonePe</span>
                    <span className="text-[9px] text-slate-400 font-bold">Pay instantly using PhonePe</span>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-slate-200/50 group-hover:bg-[#0A2540] flex items-center justify-center transition-colors">
                  <span className="text-white text-xs">➔</span>
                </div>
              </button>

              {/* Paytm */}
              <button
                onClick={() => handleSelectPaymentMethod("Paytm")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 active:scale-98 border border-slate-100 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-3xs">
                    <span className="text-xs font-black text-cyan-500">Paytm</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black text-slate-700">Paytm</span>
                    <span className="text-[9px] text-slate-400 font-bold">Pay instantly using Paytm app</span>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-slate-200/50 group-hover:bg-[#0A2540] flex items-center justify-center transition-colors">
                  <span className="text-white text-xs">➔</span>
                </div>
              </button>

              {/* UPI ID */}
              <button
                onClick={() => handleSelectPaymentMethod("UPI ID")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 active:scale-98 border border-slate-100 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-3xs">
                    <span className="text-xs font-black text-emerald-600">UPI</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black text-slate-700">UPI ID</span>
                    <span className="text-[9px] text-slate-400 font-bold">Copy UPI: omkarsonawane740@okaxis</span>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-slate-200/50 group-hover:bg-[#0A2540] flex items-center justify-center transition-colors">
                  <span className="text-white text-xs">➔</span>
                </div>
              </button>
            </div>

            {isSubmitting && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center rounded-3xl z-10 gap-2">
                <Loader2 className="w-8 h-8 text-[#0A2540] animate-spin" />
                <span className="text-xs font-extrabold text-[#0A2540]">Recording payment...</span>
                <span className="text-[10px] text-slate-400 font-medium">Updating Google Sheets</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
