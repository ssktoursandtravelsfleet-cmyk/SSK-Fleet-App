import React, { useState, useEffect } from "react";
import { Wallet, Menu, Info, CreditCard, Clock, CheckCircle, AlertTriangle, Calendar, Loader2, X, QrCode, User, Copy, Check } from "lucide-react";
import { PaymentRecord, DriverDetails } from "../types";
import PullToRefresh from "./PullToRefresh";

const RECEIVER_UPI_ID = "khedekarsatish28pari-1@oksbi";

export function formatAndValidateUpiAmount(input: string | number): {
  isValid: boolean;
  formattedAmount: string;
  numericAmount: number;
  error?: string;
} {
  if (input === null || input === undefined) {
    return { isValid: false, formattedAmount: "", numericAmount: 0, error: "Payment amount is required." };
  }

  const cleaned = String(input).replace(/[₹,$\s]/g, "").trim();
  const num = parseFloat(cleaned);

  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, formattedAmount: "", numericAmount: 0, error: "Please enter a valid numeric payment amount." };
  }

  if (num <= 0) {
    return { isValid: false, formattedAmount: "", numericAmount: 0, error: "Payment amount must be greater than ₹0." };
  }

  const rounded = Math.round(num * 100) / 100;
  const formattedAmount = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);

  return {
    isValid: true,
    formattedAmount,
    numericAmount: rounded,
  };
}

interface PaymentScreenProps {
  payments: PaymentRecord[];
  outstandingAmount?: number;
  onRefresh: () => Promise<void>;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
  onOpenDrawer: () => void;
  triggerNotification: (title: string, message: string, type: "success" | "warning" | "info") => void;
  onSubmitPayment: (paymentType: string, amount: number) => Promise<boolean>;
  loggedMobile: string;
  driver?: DriverDetails;
  initialPaymentData?: {
    paymentType: string;
    amount: number;
  } | null;
  onClearInitialPaymentData?: () => void;
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
  driver,
  initialPaymentData,
  onClearInitialPaymentData,
}: PaymentScreenProps) {
  // Convert amount into numeric value:
  const amount = Number(
    String(outstandingAmount !== undefined ? outstandingAmount : 0)
      .replace(/[₹,\s]/g, "")
  );

  const driverName = driver?.name || driver?.Driver_Name || driver?.Name || "Fleet Driver";
  const driverEtm = driver?.etm || (driver as any)?.etmId || (driver as any)?.ETM || "N/A";
  const mobileNo = loggedMobile || driver?.phone || "N/A";

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

  // Helper to parse date/time to milliseconds for accurate sorting
  const parseDateTime = (dtStr: string): number => {
    if (!dtStr) return 0;
    const clean = dtStr.trim();
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
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<string>("Current Outstanding");
  const [enteredAmount, setEnteredAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initialPaymentData when passed from Dashboard
  useEffect(() => {
    if (initialPaymentData) {
      if (initialPaymentData.paymentType) {
        setPaymentType(initialPaymentData.paymentType);
      }
      if (initialPaymentData.amount !== undefined && initialPaymentData.amount > 0) {
        setEnteredAmount(String(initialPaymentData.amount));
      } else {
        setEnteredAmount(String(Math.abs(amount) || 0));
      }
      setModalOpen(true);
    } else {
      setEnteredAmount(String(Math.abs(amount) || 0));
    }
  }, [initialPaymentData, outstandingAmount]);

  const handlePayRent = () => {
    setPaymentType("Weekly Rent");
    setEnteredAmount(String(Math.abs(amount) || 0));
    setModalOpen(true);
  };

  const handlePayDues = () => {
    if (amount >= 0 && !initialPaymentData) {
      triggerNotification(
        "No Outstanding Dues 🌿",
        "Your account is completely up to date. No payment is required.",
        "success"
      );
      return;
    }
    setPaymentType("Current Outstanding");
    setEnteredAmount(String(Math.abs(amount) || 0));
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setModalOpen(false);
    setQrModalOpen(false);
    if (onClearInitialPaymentData) {
      onClearInitialPaymentData();
    }
  };

  const [copied, setCopied] = useState(false);

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(RECEIVER_UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      triggerNotification(
        "UPI ID Copied 📋",
        `UPI ID ${RECEIVER_UPI_ID} copied to clipboard. Paste it in your UPI app to pay.`,
        "success"
      );
    } catch (e) {
      triggerNotification(
        "Copy UPI ID",
        `Receiver UPI ID: ${RECEIVER_UPI_ID}`,
        "info"
      );
    }
  };

  const handleSelectPaymentMethod = async (methodName: string) => {
    const { isValid, formattedAmount, numericAmount, error } = formatAndValidateUpiAmount(
      enteredAmount || Math.abs(amount) || 0
    );

    if (!isValid) {
      triggerNotification("Invalid Amount ⚠️", error || "Please enter a valid payment amount.", "warning");
      return;
    }

    if (methodName === "QR Code") {
      setQrModalOpen(true);
      return;
    }

    if (methodName === "Copy UPI ID") {
      await handleCopyUpiId();
      return;
    }

    // Exact standard UPI format requested: upi://pay?pa=khedekarsatish28pari-1@oksbi&pn=SSK%20Fleet&am={AMOUNT}&cu=INR
    const upiLink = `upi://pay?pa=${RECEIVER_UPI_ID}&pn=SSK%20Fleet&am=${formattedAmount}&cu=INR`;

    try {
      window.location.href = upiLink;
      window.open(upiLink, "_self");
    } catch (e) {
      console.warn("UPI deep linking issue:", e);
    }

    triggerNotification(
      `Redirecting to ${methodName} 📲`,
      `Opening UPI app for ₹${formattedAmount}. If app does not open, use Copy UPI ID or QR Code.`,
      "info"
    );

    // Record payment into Google Sheets
    setIsSubmitting(true);
    const success = await onSubmitPayment(paymentType, numericAmount);
    setIsSubmitting(false);

    if (success) {
      setModalOpen(false);
      if (onClearInitialPaymentData) {
        onClearInitialPaymentData();
      }
    }
  };

  const handleConfirmQrPayment = async () => {
    const { isValid, numericAmount, error } = formatAndValidateUpiAmount(
      enteredAmount || Math.abs(amount) || 0
    );

    if (!isValid) {
      triggerNotification("Invalid Amount ⚠️", error || "Please enter a valid payment amount.", "warning");
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmitPayment(paymentType, numericAmount);
    setIsSubmitting(false);

    if (success) {
      setQrModalOpen(false);
      setModalOpen(false);
      if (onClearInitialPaymentData) {
        onClearInitialPaymentData();
      }
    }
  };

  const handleShowHistory = () => {
    const historySection = document.getElementById("payment-history-section");
    if (historySection) {
      historySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const currentValidation = formatAndValidateUpiAmount(enteredAmount || Math.abs(amount) || 0);
  const validAmountStr = currentValidation.isValid ? currentValidation.formattedAmount : "0";

  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    `upi://pay?pa=${RECEIVER_UPI_ID}&pn=SSK%20Fleet&am=${validAmountStr}&cu=INR`
  )}`;

  return (
    <div className="flex-1 flex flex-col bg-[#F4F6F9] dark:bg-slate-950 text-[#333333] dark:text-slate-100 relative overflow-hidden transition-colors duration-200">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs select-none relative shrink-0 transition-colors duration-200">
        <button
          onClick={onOpenDrawer}
          className="lg:hidden p-1 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-[#0A2540] dark:text-slate-100 cursor-pointer"
          title="Open Menu"
          id="btn-open-menu-payment"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-extrabold text-[#0A2540] dark:text-white mx-auto lg:mx-0">Payment & Dues</h2>
        <div className="w-8 lg:hidden" />
      </div>

      <PullToRefresh onRefresh={onRefresh} syncState={syncState}>
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-4 pb-20 max-w-4xl lg:max-w-5xl mx-auto w-full">
          {/* Main Summary Card */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100/50 dark:border-slate-800 flex flex-col transition-colors duration-200">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="bg-[#0A2540] dark:bg-blue-900 p-3 rounded-2xl flex items-center justify-center shrink-0">
                <Wallet className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-extrabold text-[#0A2540] dark:text-white leading-none mb-1">My Account</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-bold leading-none">Registered driver payment portal</p>
              </div>
            </div>

            {/* Driver Details Summary Card */}
            <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-3.5 mb-4 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between text-[#0A2540] dark:text-blue-200 font-bold">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <User className="w-3.5 h-3.5" /> Driver Name:
                </span>
                <span className="font-extrabold text-sm text-[#0A2540] dark:text-white">{driverName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                <span>Driver ETM ID:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{driverEtm}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                <span>Mobile Number:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{mobileNo}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-3 mb-5">
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-slate-100 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0A2540] dark:text-white">
                  Choose Payment Method
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Select your preferred UPI app or QR Code</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Driver Details Card in Modal */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-2xl p-3.5 flex flex-col gap-1.5 text-xs text-left">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                <span className="font-medium text-slate-500">Driver Name:</span>
                <span className="font-extrabold text-[#0A2540] dark:text-white">{driverName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                <span className="font-medium text-slate-500">Driver ETM ID:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-100">{driverEtm}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                <span className="font-medium text-slate-500">Mobile Number:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{mobileNo}</span>
              </div>
            </div>

            {/* Payment For Selector & Amount Input */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Payment For
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-[#0A2540] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540]"
                >
                  <option value="Current Outstanding">Current Outstanding</option>
                  <option value="Last Week Outstanding">Last Week Outstanding</option>
                  <option value="Total Outstanding">Total Outstanding</option>
                  <option value="Weekly Rent">Weekly Rent</option>
                  <option value="Dues">Dues</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Amount to Pay (₹)</span>
                  <span className="text-[10px] text-emerald-600 font-bold lowercase">Editable</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#0A2540] dark:text-white">₹</span>
                  <input
                    type="number"
                    value={enteredAmount}
                    onChange={(e) => setEnteredAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-base font-black text-[#0A2540] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540]"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Cards */}
            <div className="flex flex-col gap-2.5 pt-1">
              {/* 1. Google Pay */}
              <button
                onClick={() => handleSelectPaymentMethod("Google Pay")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0 p-2 shadow-2xs">
                    <svg viewBox="0 0 24 24" className="w-7 h-7">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">Google Pay</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Pay instantly using Google Pay</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 group-hover:bg-[#0A2540] dark:group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-400 dark:text-slate-300">
                  <span className="text-xs font-bold">➔</span>
                </div>
              </button>

              {/* 2. PhonePe */}
              <button
                onClick={() => handleSelectPaymentMethod("PhonePe")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-white text-base font-black italic tracking-tighter">pe</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">PhonePe</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Pay instantly using PhonePe</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 group-hover:bg-[#0A2540] dark:group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-400 dark:text-slate-300">
                  <span className="text-xs font-bold">➔</span>
                </div>
              </button>

              {/* 3. Paytm */}
              <button
                onClick={() => handleSelectPaymentMethod("Paytm")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#002E6E] flex items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-[#00BAF2] text-xs font-black tracking-tight">Paytm</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">Paytm</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Pay instantly using Paytm app</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 group-hover:bg-[#0A2540] dark:group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-400 dark:text-slate-300">
                  <span className="text-xs font-bold">➔</span>
                </div>
              </button>

              {/* 4. BHIM UPI */}
              <button
                onClick={() => handleSelectPaymentMethod("BHIM")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-white text-[11px] font-black tracking-tighter">BHIM</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">BHIM UPI</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Pay instantly using BHIM app</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 group-hover:bg-[#0A2540] dark:group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-400 dark:text-slate-300">
                  <span className="text-xs font-bold">➔</span>
                </div>
              </button>

              {/* 5. Amazon Pay UPI */}
              <button
                onClick={() => handleSelectPaymentMethod("Amazon Pay")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#232F3E] flex items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-[#FF9900] text-[10px] font-black tracking-tighter">amazon</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">Amazon Pay UPI</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Pay using Amazon Pay UPI</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 group-hover:bg-[#0A2540] dark:group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-400 dark:text-slate-300">
                  <span className="text-xs font-bold">➔</span>
                </div>
              </button>

              {/* 6. Copy UPI ID */}
              <button
                onClick={() => handleSelectPaymentMethod("Copy UPI ID")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                    {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {copied ? "UPI ID Copied!" : "Copy UPI ID"}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium font-mono">
                      {RECEIVER_UPI_ID}
                    </span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 group-hover:bg-[#0A2540] dark:group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-400 dark:text-slate-300">
                  <span className="text-xs font-bold">📋</span>
                </div>
              </button>

              {/* 7. QR Code */}
              <button
                onClick={() => handleSelectPaymentMethod("QR Code")}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center shrink-0 shadow-2xs text-[#0A2540] dark:text-white">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">Scan QR Code</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Scan QR with any UPI app</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 group-hover:bg-[#0A2540] dark:group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-400 dark:text-slate-300">
                  <span className="text-xs font-bold">➔</span>
                </div>
              </button>
            </div>

            {isSubmitting && (
              <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center rounded-3xl z-10 gap-2">
                <Loader2 className="w-8 h-8 text-[#0A2540] dark:text-blue-400 animate-spin" />
                <span className="text-xs font-extrabold text-[#0A2540] dark:text-white">Recording payment...</span>
                <span className="text-[10px] text-slate-400 font-medium">Updating Google Sheets</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal Overlay */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 border border-slate-100 dark:border-slate-800 relative">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-[#0A2540] dark:text-white mt-1">
              Scan QR Code to Pay
            </h3>

            <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100 my-1">
              <img
                src={upiQrUrl}
                alt="UPI QR Code"
                className="w-48 h-48 object-contain rounded-lg"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3.5 w-full text-center flex flex-col gap-1.5 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payment For: {paymentType}</span>
              <span className="text-2xl font-black text-[#0A2540] dark:text-white">
                ₹{validAmountStr}
              </span>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700 text-xs">
                <span className="text-slate-500 font-medium">Receiver:</span>
                <strong className="text-[#0A2540] dark:text-white font-extrabold">SSK Fleet</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">UPI VPA:</span>
                <button
                  onClick={handleCopyUpiId}
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold font-mono hover:underline cursor-pointer"
                >
                  <span>{RECEIVER_UPI_ID}</span>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={handleConfirmQrPayment}
              disabled={isSubmitting}
              className="w-full bg-[#0A2540] hover:bg-[#123456] text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Payment...</span>
                </>
              ) : (
                <span>I Have Completed Payment</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
