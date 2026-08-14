import React, { useState } from "react";
import { 
  Menu, 
  PhoneCall, 
  MessageSquare, 
  Mail, 
  Clock, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  CheckCircle2, 
  ShieldAlert,
  Copy,
  Check,
  Info
} from "lucide-react";
import { DriverDetails, DriverDocumentRecord } from "../types";
import PullToRefresh from "./PullToRefresh";
import { submitSupportTicket } from "../lib/sheets";
import { DISPLAY_VERSION, APP_VERSION } from "../lib/version";

interface HelpSupportScreenProps {
  driver: DriverDetails | null;
  documentRecord?: DriverDocumentRecord | null;
  loggedMobile: string;
  accessToken?: string | null;
  onOpenDrawer: () => void;
  onRefresh?: () => Promise<void>;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
  triggerPushNotification?: (title: string, message: string, type: "success" | "warning" | "info") => void;
}

export default function HelpSupportScreen({
  driver,
  documentRecord,
  loggedMobile,
  accessToken,
  onOpenDrawer,
  onRefresh = async () => {},
  syncState,
  triggerPushNotification
}: HelpSupportScreenProps) {
  // FAQ state for expanding items
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // Form state for ticket reporting
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Copy state feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Extract driver identity
  const driverName = driver?.name || driver?.Driver_Name || documentRecord?.driverName || "Driver Partner";
  const etmId = driver?.etm || documentRecord?.etmId || "N/A";
  const mobileNo = loggedMobile || driver?.phone || documentRecord?.mobileNumber || "N/A";

  const faqs = [
    {
      question: "How do I upload my documents?",
      answer: "Go to the Profile or Onboarding screen, select the document you want to upload (Aadhaar, PAN, DL, Profile Photo), take a clear photo or attach a document file, and click Submit. Your documents are uploaded securely and locked after verification."
    },
    {
      question: "How do I pay outstanding dues?",
      answer: "Navigate to the Payment screen from the left menu or dashboard. Choose your preferred quick amount or enter a custom amount, select UPI or QR Code payment method, and complete the payment. Your payment log updates automatically."
    },
    {
      question: "My vehicle is not showing.",
      answer: "Vehicle information is loaded live from fleet records using your ETM ID or registered mobile number. If no vehicle is currently assigned to you, 'Car Not Allotted' will be shown. Please contact your Fleet Manager for vehicle allotment."
    },
    {
      question: "Weekly Hissab is not available.",
      answer: "Weekly Hissab statements are compiled every Monday after weekly trips and cash collections are calculated. If your statement is not visible, pull down on the screen to refresh or contact support."
    },
    {
      question: "Login problem.",
      answer: "Ensure you enter your registered 10-digit mobile number or valid ETM ID. Verify that you have network connectivity. If you do not receive the OTP, try requesting via WhatsApp or contact Branch Support."
    },
    {
      question: "Payment not updated.",
      answer: "Payments are synced live with our database. In case of network delay, pull down to refresh on the Dashboard or Payment screen to trigger a fresh sync."
    },
    {
      question: "Vehicle allotment issue.",
      answer: "Vehicle allotments and replacements are handled directly by the Branch Office. As soon as a vehicle is assigned to your driver ID in the system, it will reflect on your Vehicle screen automatically."
    }
  ];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert("Please enter a subject for your report.");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description of the issue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitSupportTicket({
        driverName,
        etmId,
        mobileNumber: mobileNo,
        subject: subject.trim(),
        description: description.trim()
      }, accessToken);

      if (res.success) {
        setSubmitSuccess(true);
        setSubject("");
        setDescription("");
        if (triggerPushNotification) {
          triggerPushNotification(
            "Ticket Submitted ✅",
            "Your complaint/support ticket has been recorded in Support_Tickets.",
            "success"
          );
        }
      } else {
        alert(res.message || "Failed to submit ticket. Please try again.");
      }
    } catch (err) {
      console.error("Support ticket error:", err);
      alert("Error submitting ticket. Please check your network and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F4F6F9] dark:bg-slate-950 text-[#333333] dark:text-slate-100 relative overflow-hidden transition-colors duration-200">
      {/* Top Bar Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-3.5 flex items-center justify-between shadow-xs select-none relative shrink-0 transition-colors duration-200">
        <button
          onClick={onOpenDrawer}
          className="lg:hidden p-1 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-[#0A2540] dark:text-slate-100 cursor-pointer"
          title="Open Menu"
          id="btn-open-menu-help"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-extrabold text-[#0A2540] dark:text-white flex items-center gap-1.5 mx-auto lg:mx-0">
          <span>🛟</span> Help & Support
        </h2>
        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-[#0A2540] dark:text-blue-300 font-extrabold text-[10px] border border-blue-200/80 dark:border-blue-800 shrink-0">
          {DISPLAY_VERSION}
        </span>
      </div>

      <PullToRefresh onRefresh={onRefresh} syncState={syncState}>
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-5 max-w-4xl lg:max-w-5xl mx-auto w-full">

          {/* 1. Contact Support Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                <HeadsetsIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0A2540] dark:text-white leading-tight">📞 Contact Support</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-bold">Get in touch with SSK Fleet team</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 pt-1">
              {/* Branch Support Call */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded-xl shrink-0">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Branch Support Number</p>
                      <p className="text-base font-black text-slate-900 font-mono truncate">+91 79772 42151</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy("+917977242151", "branch")}
                    className="p-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-600 rounded-xl border border-slate-200 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
                    title="Copy Number"
                  >
                    {copiedKey === "branch" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] text-emerald-700 font-extrabold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[11px] text-slate-600">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  href="tel:+917977242151"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call Now</span>
                </a>
              </div>

              {/* WhatsApp Support */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-[#25D366]/20 text-[#128C7E] rounded-xl shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">WhatsApp Support</p>
                      <p className="text-base font-black text-slate-900 font-mono truncate">+91 79772 42151</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy("+917977242151", "whatsapp")}
                    className="p-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-600 rounded-xl border border-slate-200 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
                    title="Copy Number"
                  >
                    {copiedKey === "whatsapp" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] text-emerald-700 font-extrabold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[11px] text-slate-600">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  href={`https://wa.me/917977242151?text=${encodeURIComponent(`Hello SSK Fleet Support, I am ${driverName} (ETM: ${etmId}, Mobile: ${mobileNo}). I need assistance.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open WhatsApp Chat</span>
                </a>
              </div>

              {/* Email Support */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Support</p>
                      <p className="text-xs font-black text-slate-900 truncate">ssktoursandtravelsfleet@gmail.com</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy("ssktoursandtravelsfleet@gmail.com", "email")}
                    className="p-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-600 rounded-xl border border-slate-200 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
                    title="Copy Email"
                  >
                    {copiedKey === "email" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] text-emerald-700 font-extrabold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[11px] text-slate-600">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  href={`mailto:ssktoursandtravelsfleet@gmail.com?subject=${encodeURIComponent(`SSK Fleet Support - Driver ${driverName} (${etmId})`)}`}
                  className="w-full py-2.5 bg-[#0A2540] hover:bg-[#08182D] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open Email App</span>
                </a>
              </div>

              {/* Office Timing */}
              <div className="flex items-center gap-3 p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">📍 Office Timing</p>
                  <p className="text-xs font-black text-amber-950">Monday – Sunday | 07:00 AM to 10:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Emergency Support Section */}
          <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-950 leading-tight">🚨 Emergency Helpline</h3>
                  <p className="text-[11px] font-extrabold text-rose-700">24/7 Accident & Breakdown Assistance</p>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-rose-900 leading-relaxed">
              In case of accident, sudden vehicle breakdown, or emergency on road, contact our emergency helpline immediately.
            </p>

            <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-rose-200 flex flex-col gap-3">
              <div className="flex items-center justify-between min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Helpline Number</span>
                  <span className="text-lg font-mono font-black text-rose-950 truncate">+91 94931 14000</span>
                </div>
                <button
                  onClick={() => handleCopy("+919493114000", "emergency")}
                  className="p-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 rounded-xl border border-rose-200 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
                  title="Copy Number"
                >
                  {copiedKey === "emergency" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] text-emerald-700 font-extrabold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-rose-700" />
                      <span className="text-[11px] text-rose-800 font-extrabold">Copy</span>
                    </>
                  )}
                </button>
              </div>

              <a
                href="tel:+919493114000"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Now</span>
              </a>
            </div>
          </div>

          {/* 3. Frequently Asked Questions (Expandable Cards) */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0A2540] leading-tight">❓ Frequently Asked Questions</h3>
                <p className="text-xs text-slate-400 font-bold">Quick solutions to common queries</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {faqs.map((faq, idx) => {
                const isExpanded = expandedFaqIndex === idx;
                return (
                  <div 
                    key={idx}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isExpanded 
                        ? "bg-blue-50/40 border-blue-200 shadow-2xs" 
                        : "bg-slate-50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <button
                      onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                      className="w-full text-left p-3.5 flex items-center justify-between gap-3 font-extrabold text-xs text-[#0A2540] cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-blue-600 font-black">•</span>
                        {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 text-xs text-slate-600 leading-relaxed font-medium border-t border-blue-100/60 pt-2.5">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Report an Issue / Submit Complaint Form */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0A2540] leading-tight">💬 Report an Issue</h3>
                <p className="text-xs text-slate-400 font-bold">Submit a complaint or support ticket</p>
              </div>
            </div>

            {/* Driver Identity Card Banner */}
            <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 flex items-center justify-between text-xs font-bold text-blue-900">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase block">Submitting As</span>
                <span>{driverName}</span>
              </div>
              <div className="text-right font-mono text-[11px] text-blue-800">
                <span>ETM: {etmId}</span>
                <span className="block text-[10px] text-blue-600">{mobileNo}</span>
              </div>
            </div>

            {submitSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your support ticket has been submitted successfully! We will respond shortly.</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Earnings discrepancy, App login issue, Vehicle allotment"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0A2540] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Description *
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your issue or query in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0A2540] focus:bg-white transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#0A2540] hover:bg-[#08182D] active:scale-95 disabled:opacity-60 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Ticket...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Submit Complaint Ticket</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* About & Version Information Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100 dark:border-slate-800 space-y-3 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0A2540] dark:text-white uppercase tracking-wider">About SSK Travels App</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Driver Fleet Companion</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[#0A2540] text-white rounded-full text-xs font-black">
                {DISPLAY_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              SSK Travels Fleet Application enables seamless driver partner operations, weekly Hissab reconciliation, live vehicle allotments, and direct branch support ticketing.
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Build Release: v{APP_VERSION}</span>
              <span>© SSK Travels Fleet</span>
            </div>
          </div>

        </div>
      </PullToRefresh>
    </div>
  );
}

function HeadsetsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 11V18A2 2 0 0 0 5 20H7A2 2 0 0 0 9 18V14A2 2 0 0 0 7 12H4.5" />
      <path d="M21 11V18A2 2 0 0 1 19 20H17A2 2 0 0 1 15 18V14A2 2 0 0 1 17 12H19.5" />
      <path d="M3 14V11A9 9 0 0 1 21 11V14" />
      <path d="M12 20H15" />
    </svg>
  );
}
