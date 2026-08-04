import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Search,
  Eye,
  Edit,
  UserX,
  UserCheck,
  Car,
  Calendar,
  Receipt,
  TrendingUp,
  X,
  ShieldCheck,
  Save,
  Phone,
  AlertCircle
} from "lucide-react";
import { AdminDriverItem, AdminVehicleItem } from "../../types";
import { formatVehicleNumber } from "../../lib/sheets";

interface AdminDriverManagementProps {
  drivers: AdminDriverItem[];
  vehicles: AdminVehicleItem[];
  onUpdateDriver: (driverId: string, updatedFields: Partial<AdminDriverItem>) => Promise<void>;
  onAssignVehicle: (driverMobileOrEtm: string, vehicleNumber: string) => Promise<void>;
  onToggleStatus: (driverMobileOrEtm: string, newStatus: "Active" | "Suspended") => Promise<void>;
  isProcessing?: boolean;
}

export default function AdminDriverManagement({
  drivers = [],
  vehicles = [],
  onUpdateDriver,
  onAssignVehicle,
  onToggleStatus,
  isProcessing = false
}: AdminDriverManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverItem | null>(null);
  const [activeTab, setActiveTab] = useState<"PROFILE" | "EDIT" | "VEHICLE" | "FINANCES">("PROFILE");

  // Edit fields state
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editEtm, setEditEtm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");

  const filteredDrivers = drivers.filter(d => {
    const term = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(term) ||
      d.mobile.includes(term) ||
      (d.etmId && d.etmId.toLowerCase().includes(term)) ||
      (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(term))
    );
  });

  const openDriverModal = (driver: AdminDriverItem, tab: "PROFILE" | "EDIT" | "VEHICLE" | "FINANCES") => {
    setSelectedDriver(driver);
    setActiveTab(tab);
    setEditName(driver.name);
    setEditMobile(driver.mobile);
    setEditEtm(driver.etmId || "");
    setSelectedVehicle(driver.vehicleNumber || "");
  };

  const handleSaveEdit = async () => {
    if (!selectedDriver) return;
    try {
      await onUpdateDriver(selectedDriver.id, {
        name: editName,
        mobile: editMobile,
        etmId: editEtm
      });
      alert("Driver details updated successfully!");
      setSelectedDriver(null);
    } catch (err: any) {
      alert("Failed to update driver: " + (err?.message || "Unknown error"));
    }
  };

  const handleVehicleAssign = async () => {
    if (!selectedDriver) return;
    try {
      await onAssignVehicle(selectedDriver.mobile || selectedDriver.etmId, selectedVehicle);
      alert(`Vehicle ${selectedVehicle} assigned to ${selectedDriver.name}`);
      setSelectedDriver(null);
    } catch (err: any) {
      alert("Failed to assign vehicle: " + (err?.message || "Unknown error"));
    }
  };

  const handleStatusToggle = async (driver: AdminDriverItem) => {
    const nextStatus = driver.status === "Suspended" || driver.status === "Inactive" ? "Active" : "Suspended";
    try {
      await onToggleStatus(driver.mobile || driver.etmId, nextStatus);
      alert(`Driver status changed to ${nextStatus}`);
      setSelectedDriver(null);
    } catch (err: any) {
      alert("Failed to change driver status: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen text-[#333333]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0D47A1]" />
            <h2 className="text-base sm:text-lg font-bold text-[#0D47A1]">Fleet Driver Directory & Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, edit profile details, toggle active/suspended status, and assign fleet vehicles.
          </p>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-[#0D47A1] text-xs font-bold rounded-full">
          Total {drivers.length} Drivers
        </span>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Driver Name, Mobile Number, ETM ID, or Vehicle Number..."
          className="w-full text-xs font-medium focus:outline-none bg-transparent"
        />
      </div>

      {/* Driver List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">No matching drivers found</p>
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
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDrivers.map((driver, idx) => {
                  const isSuspended = driver.status === "Suspended" || driver.status === "Inactive";

                  return (
                    <tr key={`${driver.id}-${driver.mobile || idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{driver.name}</td>
                      <td className="p-3 font-mono text-slate-600">{driver.mobile}</td>
                      <td className="p-3 font-bold text-[#0D47A1]">{driver.etmId && !["UNASSIGNED", "N/A", "NULL", "UNDEFINED"].includes(driver.etmId.toUpperCase()) ? driver.etmId : ""}</td>
                      <td className="p-3 font-mono">{formatVehicleNumber(driver.vehicleNumber)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                            isSuspended
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {driver.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openDriverModal(driver, "PROFILE")}
                            className="p-1.5 rounded-lg bg-blue-50 text-[#0D47A1] hover:bg-blue-100 transition-colors"
                            title="View Driver Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDriverModal(driver, "EDIT")}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            title="Edit Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDriverModal(driver, "VEHICLE")}
                            className="p-1.5 rounded-lg bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition-colors"
                            title="Assign Vehicle"
                          >
                            <Car className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(driver)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSuspended
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                            title={isSuspended ? "Activate Driver" : "Suspend Driver"}
                          >
                            {isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
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

      {/* Driver Management Modal */}
      <AnimatePresence>
        {selectedDriver && (
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
              className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#0D47A1]">{selectedDriver.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">Mobile: {selectedDriver.mobile}</p>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(["PROFILE", "EDIT", "VEHICLE", "FINANCES"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                      activeTab === tab ? "bg-white text-[#0D47A1] shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* TAB 1: PROFILE */}
              {activeTab === "PROFILE" && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ETM ID</p>
                    <p className="font-bold text-[#0D47A1] mt-0.5">{selectedDriver.etmId && !["UNASSIGNED", "N/A", "NULL", "UNDEFINED"].includes(selectedDriver.etmId.toUpperCase()) ? selectedDriver.etmId : ""}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Assigned Vehicle</p>
                    <p className="font-bold text-slate-900 mt-0.5">{formatVehicleNumber(selectedDriver.vehicleNumber)}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedDriver.status}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Registration Date</p>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedDriver.registrationDate}</p>
                  </div>
                </div>
              )}

              {/* TAB 2: EDIT DETAILS */}
              {activeTab === "EDIT" && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ETM ID</label>
                    <input
                      type="text"
                      value={editEtm}
                      onChange={(e) => setEditEtm(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    />
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    className="w-full py-2.5 bg-[#0D47A1] text-white font-bold rounded-xl shadow-sm hover:bg-blue-800 transition-colors"
                  >
                    Save Driver Changes
                  </button>
                </div>
              )}

              {/* TAB 3: VEHICLE ASSIGNMENT */}
              {activeTab === "VEHICLE" && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Select Fleet Vehicle</label>
                    <input
                      type="text"
                      value={selectedVehicle}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                      placeholder="Enter vehicle number e.g. MH02AB1234..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold uppercase"
                    />
                  </div>
                  <button
                    onClick={handleVehicleAssign}
                    className="w-full py-2.5 bg-cyan-700 text-white font-bold rounded-xl shadow-sm hover:bg-cyan-800 transition-colors"
                  >
                    Assign Vehicle to Driver
                  </button>
                </div>
              )}

              {/* TAB 4: FINANCES */}
              {activeTab === "FINANCES" && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-[10px] text-emerald-800 font-bold uppercase">Daily Earnings</p>
                    <p className="text-base font-extrabold text-emerald-900 mt-1">
                      ₹{(selectedDriver.dailyEarnings || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-[10px] text-amber-800 font-bold uppercase">Current Outstanding</p>
                    <p className="text-base font-extrabold text-amber-900 mt-1">
                      ₹{(selectedDriver.currentOutstanding || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-[10px] text-indigo-800 font-bold uppercase">Weekly Outstanding</p>
                    <p className="text-base font-extrabold text-indigo-900 mt-1">
                      ₹{(selectedDriver.weeklyOutstanding || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <p className="text-[10px] text-rose-800 font-bold uppercase">Total Cumulative Dues</p>
                    <p className="text-base font-extrabold text-rose-900 mt-1">
                      ₹{(selectedDriver.totalOutstanding !== undefined ? selectedDriver.totalOutstanding : ((selectedDriver.currentOutstanding || 0) + (selectedDriver.weeklyOutstanding || 0))).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
