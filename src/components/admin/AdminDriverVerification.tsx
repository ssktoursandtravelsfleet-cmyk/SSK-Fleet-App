import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  Car,
  Calendar,
  X,
  ShieldCheck,
  Search,
  Filter,
  Check,
  AlertCircle
} from "lucide-react";
import { AdminDriverItem } from "../../types";
import { formatVehicleNumber } from "../../lib/sheets";
import { getVerificationStatus } from "../../lib/googleSheets";

interface AdminDriverVerificationProps {
  drivers: AdminDriverItem[];
  onApproveDriver: (driver: AdminDriverItem) => Promise<void>;
  onRejectDriver: (driver: AdminDriverItem, reason?: string) => Promise<void>;
  isProcessing?: boolean;
}

export default function AdminDriverVerification({
  drivers = [],
  onApproveDriver,
  onRejectDriver,
  isProcessing = false
}: AdminDriverVerificationProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const pendingCount = drivers.filter(d => getVerificationStatus(d) === "Pending").length;
  const approvedCount = drivers.filter(d => getVerificationStatus(d) === "Approved").length;
  const rejectedCount = drivers.filter(d => getVerificationStatus(d) === "Rejected").length;

  // Filter drivers: pending, approved, rejected, all
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch =
      (driver.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.mobile || "").includes(searchTerm) ||
      (driver.etmId && driver.etmId.toLowerCase().includes(searchTerm.toLowerCase()));

    const status = getVerificationStatus(driver);

    if (statusFilter === "PENDING") return matchesSearch && status === "Pending";
    if (statusFilter === "APPROVED") return matchesSearch && status === "Approved";
    if (statusFilter === "REJECTED") return matchesSearch && status === "Rejected";
    return matchesSearch;
  });

  const handleApprove = async (driver: AdminDriverItem) => {
    try {
      await onApproveDriver(driver);
      setActionSuccess("Driver Approved Successfully");
      setStatusFilter("APPROVED");
      setTimeout(() => setActionSuccess(null), 4000);
      setSelectedDriver(null);
    } catch (err: any) {
      alert("Google Sheets Update Error: " + (err?.message || String(err)));
    }
  };

  const handleReject = async () => {
    if (!selectedDriver) return;
    try {
      await onRejectDriver(selectedDriver, rejectReason);
      setActionSuccess("Driver Rejected Successfully");
      setStatusFilter("REJECTED");
      setTimeout(() => setActionSuccess(null), 4000);
      setShowRejectModal(false);
      setSelectedDriver(null);
      setRejectReason("");
    } catch (err: any) {
      alert("Google Sheets Update Error: " + (err?.message || String(err)));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen text-[#333333]">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#0D47A1]" />
            <h2 className="text-base sm:text-lg font-bold text-[#0D47A1]">Driver Registration Verification</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Approve newly registered drivers so they can immediately log in and operate.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full">
            {pendingCount} Pending Verification
          </span>
        </div>
      </div>

      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </motion.div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search driver name, mobile number, ETM ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1E88E5]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {[
            { id: "PENDING", label: `PENDING (${pendingCount})` },
            { id: "APPROVED", label: `APPROVED (${approvedCount})` },
            { id: "REJECTED", label: `REJECTED (${rejectedCount})` },
            { id: "ALL", label: `ALL (${drivers.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? "bg-[#0D47A1] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">No driver registrations found</p>
            <p className="text-[11px] text-slate-400">Try adjusting your filter or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3">Driver Name</th>
                  <th className="p-3">Mobile Number</th>
                  <th className="p-3">ETM ID</th>
                  <th className="p-3">Vehicle Number</th>
                  <th className="p-3">Registration Date</th>
                  <th className="p-3">Verification Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDrivers.map((driver, idx) => {
                  const status = getVerificationStatus(driver);
                  const isPending = status === "Pending";
                  const isApproved = status === "Approved";
                  const isRejected = status === "Rejected";

                  const cleanEtm = driver.etmId && !["UNASSIGNED", "N/A", "NULL", "UNDEFINED"].includes(driver.etmId.toUpperCase()) ? driver.etmId : "";

                  return (
                    <tr key={`${driver.id}-${driver.mobile || idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{driver.name || "Driver"}</td>
                      <td className="p-3 font-mono text-slate-600">{driver.mobile}</td>
                      <td className="p-3 font-bold text-[#0D47A1]">{cleanEtm || "-"}</td>
                      <td className="p-3 font-semibold text-slate-800">{formatVehicleNumber(driver.vehicleNumber || driver.vehicleModel || "")}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{driver.registrationDate || "N/A"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                            isPending
                              ? "bg-amber-100 text-amber-800"
                              : isApproved
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedDriver(driver)}
                            className="p-1.5 rounded-lg bg-blue-50 text-[#0D47A1] hover:bg-blue-100 transition-colors"
                            title="View Driver Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(driver)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                                title="Approve Driver"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedDriver(driver);
                                  setShowRejectModal(true);
                                }}
                                disabled={isProcessing}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                                title="Reject Driver"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Driver View Details Modal */}
      <AnimatePresence>
        {selectedDriver && !showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0D47A1]" />
                  <h3 className="text-base font-extrabold text-[#0D47A1]">Driver Registration Profile</h3>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Driver Name</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedDriver.name}</p>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Mobile Number</p>
                  <p className="font-bold text-slate-900 font-mono text-sm mt-0.5">{selectedDriver.mobile}</p>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">ETM ID</p>
                  <p className="font-bold text-[#0D47A1] font-mono text-sm mt-0.5">{selectedDriver.etmId && !["UNASSIGNED", "N/A", "NULL", "UNDEFINED"].includes(selectedDriver.etmId.toUpperCase()) ? selectedDriver.etmId : ""}</p>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Vehicle Assigned</p>
                  <p className="font-bold text-slate-900 mt-0.5">{formatVehicleNumber(selectedDriver.vehicleNumber)}</p>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Aadhaar Number</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedDriver.aadhaarNumber || "Not Provided"}</p>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">PAN Number</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedDriver.panNumber || "Not Provided"}</p>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Driving License</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedDriver.dlNumber || "Not Provided"}</p>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close
                </button>

                {getVerificationStatus(selectedDriver) === "Pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedDriver)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Approve & Activate
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {showRejectModal && selectedDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-600 border-b pb-3">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-rose-600">Reject Driver Application</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                You are rejecting registration for <span className="font-bold">{selectedDriver.name}</span> ({selectedDriver.mobile}).
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Reason for rejection (Optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="E.g. Incomplete documentation, invalid license, or mismatch in details..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 h-24"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
