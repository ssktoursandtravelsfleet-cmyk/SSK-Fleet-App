import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Search,
  Lock,
  User,
  ShieldCheck,
  FileText,
  RefreshCw,
  Edit2,
  ExternalLink,
  Upload,
  Save,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Phone,
  Building,
  MapPin,
  Check
} from "lucide-react";
import { AdminDriverItem } from "../../types";
import {
  DocumentVerificationRecord,
  fetchDocumentsVerificationRecords,
  updateDocumentsVerificationRecord
} from "../../lib/googleSheets";

interface AdminDocumentVerificationProps {
  drivers?: AdminDriverItem[];
  onVerifyDocumentStatus?: (
    driverMobileOrEtm: string,
    status: "Verified" | "Rejected",
    remarks?: string
  ) => Promise<void>;
  isProcessing?: boolean;
  accessToken?: string | null;
  userRole?: string;
}

export default function AdminDocumentVerification({
  drivers = [],
  onVerifyDocumentStatus,
  isProcessing = false,
  accessToken = null,
  userRole = "Super Admin"
}: AdminDocumentVerificationProps) {
  const [records, setRecords] = useState<DocumentVerificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterDocStatus, setFilterDocStatus] = useState<"ALL" | "COMPLETE" | "PENDING">("ALL");
  
  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Modals
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    driverName: string;
    etmId: string;
    url: string;
  } | null>(null);

  const [editingRecord, setEditingRecord] = useState<DocumentVerificationRecord | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  // Role authorization check
  const normalizedRole = (userRole || "").trim().toLowerCase();
  const isAuthorized =
    normalizedRole.includes("super admin") ||
    normalizedRole.includes("admin") ||
    normalizedRole === "superadmin";

  // Load records directly from Google Sheet tab: Documents_Verification
  const loadData = async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const docRecords = await fetchDocumentsVerificationRecords(accessToken);
      if (docRecords && docRecords.length > 0) {
        setRecords(docRecords);
      } else {
        // Fallback to drivers prop if Documents_Verification sheet returns 0 rows
        const fallbackRecords: DocumentVerificationRecord[] = drivers.map((d: any, index) => ({
          rowIndex: index + 2,
          driverId: d.id || d.Driver_ID || `DRV-${index + 1}`,
          etmId: d.etmId || d.ETM || "",
          driverName: d.name || d.Name || "",
          mobileNumber: d.mobile || d.phone || d.Mobile_Number || "",
          profilePhotoUrl: d.profilePhotoUrl || "",
          aadhaarFrontUrl: d.aadhaarFrontUrl || "",
          aadhaarBackUrl: d.aadhaarBackUrl || "",
          aadhaarNumber: d.aadhaarNumber || "",
          panCardUrl: d.panCardUrl || "",
          panNumber: d.panNumber || "",
          dlFrontUrl: d.dlFrontUrl || "",
          dlBackUrl: d.dlBackUrl || "",
          dlNumber: d.dlNumber || "",
          addressProofText: d.address || "",
          addressProofPhotoUrl: d.addressPhotoUrl || "",
          bankPassbookUrl: d.bankPassbookUrl || ""
        }));
        setRecords(fallbackRecords);
      }
    } catch (err: any) {
      console.error("Error loading Documents_Verification sheet:", err);
      setErrorMsg("Unable to load Documents Verification data. Please try again.");
      
      // Load fallback drivers if sheet fetch threw error
      if (drivers && drivers.length > 0) {
        const fallbackRecords: DocumentVerificationRecord[] = drivers.map((d: any, index) => ({
          rowIndex: index + 2,
          driverId: d.id || d.Driver_ID || `DRV-${index + 1}`,
          etmId: d.etmId || d.ETM || "",
          driverName: d.name || d.Name || "",
          mobileNumber: d.mobile || d.phone || d.Mobile_Number || "",
          profilePhotoUrl: d.profilePhotoUrl || "",
          aadhaarFrontUrl: d.aadhaarFrontUrl || "",
          aadhaarBackUrl: d.aadhaarBackUrl || "",
          aadhaarNumber: d.aadhaarNumber || "",
          panCardUrl: d.panCardUrl || "",
          panNumber: d.panNumber || "",
          dlFrontUrl: d.dlFrontUrl || "",
          dlBackUrl: d.dlBackUrl || "",
          dlNumber: d.dlNumber || "",
          addressProofText: d.address || "",
          addressProofPhotoUrl: d.addressPhotoUrl || "",
          bankPassbookUrl: d.bankPassbookUrl || ""
        }));
        setRecords(fallbackRecords);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  // Helper to check if string is valid non-empty document URL
  const isValidUrl = (url?: string): boolean => {
    if (!url) return false;
    const str = url.trim();
    if (!str || str.toLowerCase() === "not uploaded" || str.toLowerCase() === "n/a" || str.toLowerCase() === "null") return false;
    return str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:image/") || str.startsWith("data:application/");
  };

  // Filter records based on search and status
  const filteredRecords = records.filter(r => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      (r.driverId && r.driverId.toLowerCase().includes(searchLower)) ||
      (r.etmId && r.etmId.toLowerCase().includes(searchLower)) ||
      (r.driverName && r.driverName.toLowerCase().includes(searchLower)) ||
      (r.mobileNumber && r.mobileNumber.includes(searchLower));

    const totalUploadedDocs = [
      r.profilePhotoUrl,
      r.aadhaarFrontUrl,
      r.aadhaarBackUrl,
      r.panCardUrl,
      r.dlFrontUrl,
      r.dlBackUrl,
      r.addressProofPhotoUrl,
      r.bankPassbookUrl
    ].filter(isValidUrl).length;

    if (filterDocStatus === "COMPLETE") return matchesSearch && totalUploadedDocs >= 6;
    if (filterDocStatus === "PENDING") return matchesSearch && totalUploadedDocs < 6;
    return matchesSearch;
  });

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const currentRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // File upload handler converting file to base64 permanent URL
  const handleFileUpload = (field: keyof DocumentVerificationRecord, file: File) => {
    if (!editingRecord) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Url = reader.result as string;
      setEditingRecord(prev => prev ? { ...prev, [field]: base64Url } : null);
    };
    reader.onerror = () => {
      alert("Failed to read selected file.");
    };
  };

  // Save changes handler with strict role verification
  const handleSaveChanges = async () => {
    if (!editingRecord) return;
    
    if (!isAuthorized) {
      alert("Permission Denied: Only Admin or Super Admin can edit document verification data.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateDocumentsVerificationRecord(editingRecord, userRole, accessToken);
      if (res.success) {
        setSuccessMsg("Saved successfully to Documents_Verification!");
        // Update local state record
        setRecords(prev => prev.map(r => r.rowIndex === editingRecord.rowIndex ? editingRecord : r));
        setEditingRecord(null);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg("Changes could not be saved to Documents_Verification: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Render Document Button or Badge
  const renderDocCell = (
    title: string,
    url: string,
    driverName: string,
    etmId: string
  ) => {
    if (isValidUrl(url)) {
      return (
        <button
          onClick={() => setPreviewDoc({ title, driverName, etmId, url })}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-900 transition-colors cursor-pointer shadow-2xs"
          title={`View ${title}`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
        Not Uploaded
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen text-[#333333]">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-blue-950 flex items-center gap-2">
                Document Verification Module
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                  Verification Registry
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Manage, inspect, and edit all 16 driver document verification records.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          {!isAuthorized && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>View Only Mode</span>
            </div>
          )}

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Sync / Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Action Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-950">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Driver ID, ETM ID, Name, or Mobile Number..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterDocStatus}
            onChange={e => {
              setFilterDocStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">All Records ({records.length})</option>
            <option value="COMPLETE">Documents Uploaded (≥6)</option>
            <option value="PENDING">Pending Documents (&lt;6)</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-700 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Fetching driver verification records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No driver document records found.</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or refresh records.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table view (scrollable containing ALL 16 columns) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1700px]">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-3">Driver ID (A)</th>
                    <th className="py-3 px-3">ETM ID (B)</th>
                    <th className="py-3 px-3">Driver Name (C)</th>
                    <th className="py-3 px-3">Mobile No (D)</th>
                    <th className="py-3 px-3">Profile Photo (E)</th>
                    <th className="py-3 px-3">Aadhaar Front (F)</th>
                    <th className="py-3 px-3">Aadhaar Back (G)</th>
                    <th className="py-3 px-3">Aadhaar No (H)</th>
                    <th className="py-3 px-3">PAN Photo (I)</th>
                    <th className="py-3 px-3">PAN No (J)</th>
                    <th className="py-3 px-3">DL Front (K)</th>
                    <th className="py-3 px-3">DL Back (L)</th>
                    <th className="py-3 px-3">DL No (M)</th>
                    <th className="py-3 px-3">Address Proof (N)</th>
                    <th className="py-3 px-3">Addr Proof Photo (O)</th>
                    <th className="py-3 px-3">Bank Passbook (P)</th>
                    <th className="py-3 px-3 text-center sticky right-0 bg-slate-100 shadow-l shadow-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentRecords.map((r, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr key={r.rowIndex} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 font-mono text-[11px]">
                          {r.driverId || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-900 font-mono text-[11px]">
                          {r.etmId || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {r.driverName || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {r.mobileNumber || <span className="text-slate-300">-</span>}
                        </td>
                        {/* Profile Photo (E) */}
                        <td className="py-3 px-3">
                          {renderDocCell("Profile Photo", r.profilePhotoUrl, r.driverName, r.etmId)}
                        </td>
                        {/* Aadhaar Front (F) */}
                        <td className="py-3 px-3">
                          {renderDocCell("Aadhaar Card (Front)", r.aadhaarFrontUrl, r.driverName, r.etmId)}
                        </td>
                        {/* Aadhaar Back (G) */}
                        <td className="py-3 px-3">
                          {renderDocCell("Aadhaar Card (Back)", r.aadhaarBackUrl, r.driverName, r.etmId)}
                        </td>
                        {/* Aadhaar No (H) */}
                        <td className="py-3 px-3 font-mono text-slate-700 text-[11px]">
                          {r.aadhaarNumber || <span className="text-slate-300">-</span>}
                        </td>
                        {/* PAN Photo (I) */}
                        <td className="py-3 px-3">
                          {renderDocCell("PAN Card", r.panCardUrl, r.driverName, r.etmId)}
                        </td>
                        {/* PAN No (J) */}
                        <td className="py-3 px-3 font-mono text-slate-700 text-[11px]">
                          {r.panNumber || <span className="text-slate-300">-</span>}
                        </td>
                        {/* DL Front (K) */}
                        <td className="py-3 px-3">
                          {renderDocCell("Driving Licence (Front)", r.dlFrontUrl, r.driverName, r.etmId)}
                        </td>
                        {/* DL Back (L) */}
                        <td className="py-3 px-3">
                          {renderDocCell("Driving Licence (Back)", r.dlBackUrl, r.driverName, r.etmId)}
                        </td>
                        {/* DL No (M) */}
                        <td className="py-3 px-3 font-mono text-slate-700 text-[11px]">
                          {r.dlNumber || <span className="text-slate-300">-</span>}
                        </td>
                        {/* Address Proof (N) */}
                        <td className="py-3 px-3 max-w-[180px] truncate text-slate-600 text-[11px]" title={r.addressProofText}>
                          {r.addressProofText || <span className="text-slate-300">-</span>}
                        </td>
                        {/* Addr Proof Photo (O) */}
                        <td className="py-3 px-3">
                          {renderDocCell("Address Proof Document", r.addressProofPhotoUrl, r.driverName, r.etmId)}
                        </td>
                        {/* Bank Passbook (P) */}
                        <td className="py-3 px-3">
                          {renderDocCell("Bank Passbook / Cheque", r.bankPassbookUrl, r.driverName, r.etmId)}
                        </td>
                        {/* Actions */}
                        <td className="py-3 px-3 text-center sticky right-0 bg-white group-hover:bg-blue-50/90 transition-colors shadow-l border-l border-slate-100">
                          {isAuthorized ? (
                            <button
                              onClick={() => setEditingRecord({ ...r })}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              title="Edit Row Data & Replace Documents"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingRecord({ ...r })}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="View Complete Row Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
              <div>
                Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> of{" "}
                <span className="font-bold text-slate-900">{filteredRecords.length}</span> records
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-bold text-blue-900 bg-white rounded-lg border border-slate-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            >
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="min-w-0 pr-2">
                  <h3 className="text-sm font-extrabold text-blue-300 truncate">{previewDoc.title}</h3>
                  <p className="text-xs text-slate-400 font-medium truncate">
                    Driver: <span className="text-white font-bold">{previewDoc.driverName || "N/A"}</span> | ETM ID:{" "}
                    <span className="text-blue-300 font-mono">{previewDoc.etmId || "N/A"}</span>
                  </p>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body / Document Image Display */}
              <div className="p-4 sm:p-6 flex-1 overflow-auto bg-slate-950 flex items-center justify-center min-h-[300px]">
                {imgErrorMap[previewDoc.url] ? (
                  <div className="text-center p-8 space-y-2 text-slate-400">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">Document unavailable or link format invalid.</p>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline pt-2 font-bold"
                    >
                      <span>Try opening directly</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    onError={() => setImgErrorMap(prev => ({ ...prev, [previewDoc.url]: true }))}
                    className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-xl border border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
                  <span>Open in New Tab</span>
                </a>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT & REPLACE DOCUMENT MODAL */}
      <AnimatePresence>
        {editingRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={() => !isSaving && setEditingRecord(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            >
              {/* Modal Header */}
              <div className="p-4 bg-blue-900 text-white flex items-center justify-between border-b border-blue-800">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      {isAuthorized ? "Edit Document Verification Details" : "Driver Verification Details"}
                    </h3>
                    <p className="text-[11px] text-blue-200 font-medium">
                      Row #{editingRecord.rowIndex} | Driver: {editingRecord.driverName} ({editingRecord.etmId})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !isSaving && setEditingRecord(null)}
                  disabled={isSaving}
                  className="p-1.5 rounded-full hover:bg-blue-800 text-blue-200 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6 text-xs">
                {/* Driver Identifiers Section */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-700" />
                    <span>Basic Details (Columns A-D)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driver ID (Col A)</label>
                      <input
                        type="text"
                        disabled={!isAuthorized || isSaving}
                        value={editingRecord.driverId}
                        onChange={e => setEditingRecord({ ...editingRecord, driverId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ETM ID (Col B)</label>
                      <input
                        type="text"
                        disabled={!isAuthorized || isSaving}
                        value={editingRecord.etmId}
                        onChange={e => setEditingRecord({ ...editingRecord, etmId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-blue-950 font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driver Name (Col C)</label>
                      <input
                        type="text"
                        disabled={!isAuthorized || isSaving}
                        value={editingRecord.driverName}
                        onChange={e => setEditingRecord({ ...editingRecord, driverName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Mobile Number (Col D)</label>
                      <input
                        type="text"
                        disabled={!isAuthorized || isSaving}
                        value={editingRecord.mobileNumber}
                        onChange={e => setEditingRecord({ ...editingRecord, mobileNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Document Numbers Section */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                    <span>ID Proof Numbers & Address (Columns H, J, M, N)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Aadhaar No (Col H)</label>
                      <input
                        type="text"
                        disabled={!isAuthorized || isSaving}
                        value={editingRecord.aadhaarNumber}
                        onChange={e => setEditingRecord({ ...editingRecord, aadhaarNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">PAN Card No (Col J)</label>
                      <input
                        type="text"
                        disabled={!isAuthorized || isSaving}
                        value={editingRecord.panNumber}
                        onChange={e => setEditingRecord({ ...editingRecord, panNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driving Licence No (Col M)</label>
                      <input
                        type="text"
                        disabled={!isAuthorized || isSaving}
                        value={editingRecord.dlNumber}
                        onChange={e => setEditingRecord({ ...editingRecord, dlNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Address Proof Text (Col N)</label>
                    <textarea
                      rows={2}
                      disabled={!isAuthorized || isSaving}
                      value={editingRecord.addressProofText}
                      onChange={e => setEditingRecord({ ...editingRecord, addressProofText: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Document Files / Photo Replacement Section */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-700" />
                      Document Attachments (Replace Photos)
                    </span>
                    {!isAuthorized && <span className="text-[10px] text-amber-700 font-bold">View Only</span>}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "Profile Photo (Col E)", field: "profilePhotoUrl" as const },
                      { label: "Aadhaar Card Front (Col F)", field: "aadhaarFrontUrl" as const },
                      { label: "Aadhaar Card Back (Col G)", field: "aadhaarBackUrl" as const },
                      { label: "PAN Card Photo (Col I)", field: "panCardUrl" as const },
                      { label: "DL Front (Col K)", field: "dlFrontUrl" as const },
                      { label: "DL Back (Col L)", field: "dlBackUrl" as const },
                      { label: "Address Proof Photo (Col O)", field: "addressProofPhotoUrl" as const },
                      { label: "Bank Passbook (Col P)", field: "bankPassbookUrl" as const }
                    ].map(docItem => {
                      const currentUrl = editingRecord[docItem.field];
                      const hasDoc = isValidUrl(currentUrl);

                      return (
                        <div key={docItem.field} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{docItem.label}</span>
                            {hasDoc ? (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({
                                  title: docItem.label,
                                  driverName: editingRecord.driverName,
                                  etmId: editingRecord.etmId,
                                  url: currentUrl
                                })}
                                className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">Not Uploaded</span>
                            )}
                          </div>

                          {isAuthorized && (
                            <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer text-[11px] font-bold text-slate-700 transition-colors">
                              <Upload className="w-3.5 h-3.5 text-blue-700" />
                              <span>{hasDoc ? "Replace Document File" : "Upload Document File"}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                disabled={isSaving}
                                onChange={e => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(docItem.field, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingRecord(null)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                {isAuthorized && (
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
