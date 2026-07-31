import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileCheck,
  CheckCircle,
  XCircle,
  Eye,
  Maximize2,
  X,
  Search,
  MessageSquare,
  Check,
  Lock,
  User,
  ShieldCheck,
  FileText
} from "lucide-react";
import { AdminDriverItem } from "../../types";

interface AdminDocumentVerificationProps {
  drivers: AdminDriverItem[];
  onVerifyDocumentStatus: (
    driverMobileOrEtm: string,
    status: "Verified" | "Rejected",
    remarks?: string
  ) => Promise<void>;
  isProcessing?: boolean;
}

export default function AdminDocumentVerification({
  drivers = [],
  onVerifyDocumentStatus,
  isProcessing = false
}: AdminDocumentVerificationProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverItem | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);
  const [docRemarks, setDocRemarks] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filter drivers that have uploaded document records
  const driversWithDocs = drivers.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.mobile.includes(searchTerm) ||
      (d.etmId && d.etmId.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch && (d.aadhaarFrontUrl || d.panCardUrl || d.dlFrontUrl || d.profilePhotoUrl || d.bankPassbookUrl);
  });

  const getDocList = (driver: AdminDriverItem) => [
    { title: "Profile Photo", url: driver.profilePhotoUrl, number: "N/A" },
    { title: "Aadhaar Card (Front)", url: driver.aadhaarFrontUrl, number: driver.aadhaarNumber },
    { title: "Aadhaar Card (Back)", url: driver.aadhaarBackUrl, number: driver.aadhaarNumber },
    { title: "PAN Card", url: driver.panCardUrl, number: driver.panNumber },
    { title: "Driving License (Front)", url: driver.dlFrontUrl, number: driver.dlNumber },
    { title: "Driving License (Back)", url: driver.dlBackUrl, number: driver.dlNumber },
    { title: "Bank Passbook / Cheque", url: driver.bankPassbookUrl, number: "Bank Document" },
    { title: "Police Verification", url: driver.policeVerificationUrl, number: "Verification Cert" }
  ];

  const handleVerify = async (driver: AdminDriverItem, status: "Verified" | "Rejected") => {
    try {
      const remark = docRemarks[driver.id] || "";
      await onVerifyDocumentStatus(driver.mobile || driver.etmId, status, remark);
      setActionMessage(`Documents for ${driver.name} marked as ${status}!`);
      setTimeout(() => setActionMessage(null), 3000);
      setSelectedDriver(null);
    } catch (err: any) {
      alert("Failed to update document status: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen text-[#333333]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-purple-700" />
            <h2 className="text-base sm:text-lg font-bold text-purple-900">Driver Document & KYC Verification</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect uploaded ID proofs, license cards, bank documents, and police verification reports.
          </p>
        </div>
      </div>

      {actionMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-purple-700" />
          <span>{actionMessage}</span>
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search driver by name, mobile, or ETM ID..."
          className="w-full text-xs font-medium focus:outline-none bg-transparent"
        />
      </div>

      {/* Drivers List with Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {driversWithDocs.map((driver, idx) => {
          const docList = getDocList(driver).filter(d => Boolean(d.url));
          const isVerified = driver.documentStatus === "Verified" || driver.documentStatus === "Approved";

          return (
            <motion.div
              key={`${driver.id}-${driver.mobile || idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{driver.name}</h3>
                  <p className="text-[11px] font-mono text-slate-500">{driver.mobile} • {driver.etmId || "No ETM"}</p>
                </div>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                    isVerified ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {driver.documentStatus || "Pending"}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Uploaded Documents:</span>
                <span className="font-extrabold text-[#0D47A1]">{docList.length} files</span>
              </div>

              <button
                onClick={() => setSelectedDriver(driver)}
                className="w-full py-2 bg-[#0D47A1] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Review All Documents ({docList.length})</span>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Full Document Inspector Modal */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-4xl w-full p-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#0D47A1]">
                    Document Inspection: {selectedDriver.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Mobile: {selectedDriver.mobile} | ETM: {selectedDriver.etmId || "N/A"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of Documents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {getDocList(selectedDriver).map((doc) => {
                  if (!doc.url) return null;
                  return (
                    <div key={doc.title} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-800">{doc.title}</p>
                        {doc.number && doc.number !== "N/A" && (
                          <p className="text-[10px] font-mono text-slate-500 mb-2">{doc.number}</p>
                        )}
                        <div
                          onClick={() => setFullscreenImage({ url: doc.url!, title: doc.title })}
                          className="relative group cursor-pointer overflow-hidden rounded-lg bg-slate-200 h-32 flex items-center justify-center border border-slate-300"
                        >
                          <img
                            src={doc.url}
                            alt={doc.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1">
                            <Maximize2 className="w-4 h-4" />
                            <span>Tap Fullscreen</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Remarks Textarea */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Verification Remarks / Notes
                </label>
                <input
                  type="text"
                  value={docRemarks[selectedDriver.id] || ""}
                  onChange={(e) =>
                    setDocRemarks((prev) => ({ ...prev, [selectedDriver.id]: e.target.value }))
                  }
                  placeholder="Enter notes (e.g. Verified Aadhaar & DL match registered name)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1E88E5]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={() => handleVerify(selectedDriver, "Rejected")}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Reject Documents</span>
                </button>
                <button
                  onClick={() => handleVerify(selectedDriver, "Verified")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Verify KYC</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image View Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <span className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
                {fullscreenImage.title}
              </span>
              <button
                onClick={() => setFullscreenImage(null)}
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/40"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.title}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
