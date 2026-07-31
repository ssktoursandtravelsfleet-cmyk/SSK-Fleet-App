import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Car, Search, UserCheck, X, Plus, AlertCircle, Edit } from "lucide-react";
import { AdminVehicleItem, AdminDriverItem } from "../../types";

interface AdminVehicleManagementProps {
  vehicles: AdminVehicleItem[];
  drivers: AdminDriverItem[];
  onAssignVehicle: (driverMobileOrEtm: string, vehicleNumber: string) => Promise<void>;
  onRemoveVehicleAssignment: (vehicleNumber: string) => Promise<void>;
  isProcessing?: boolean;
}

export default function AdminVehicleManagement({
  vehicles = [],
  drivers = [],
  onAssignVehicle,
  onRemoveVehicleAssignment,
  isProcessing = false
}: AdminVehicleManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<AdminVehicleItem | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const filteredVehicles = vehicles.filter(v =>
    v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssign = async () => {
    if (!selectedVehicle || !selectedDriverId) return;
    try {
      await onAssignVehicle(selectedDriverId, selectedVehicle.vehicleNumber);
      alert(`Vehicle ${selectedVehicle.vehicleNumber} assigned successfully!`);
      setSelectedVehicle(null);
    } catch (err: any) {
      alert("Failed to assign vehicle: " + (err?.message || "Unknown error"));
    }
  };

  const handleRemove = async (vehicleNumber: string) => {
    if (!confirm(`Are you sure you want to remove assignment for ${vehicleNumber}?`)) return;
    try {
      await onRemoveVehicleAssignment(vehicleNumber);
      alert(`Vehicle assignment removed for ${vehicleNumber}`);
    } catch (err: any) {
      alert("Failed to remove assignment: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen text-[#333333]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-cyan-700" />
            <h2 className="text-base sm:text-lg font-bold text-cyan-900">Fleet Vehicle Allocation</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage EV and CNG vehicles, driver allocations, and fleet deployment status.
          </p>
        </div>
        <span className="px-3 py-1 bg-cyan-100 text-cyan-900 text-xs font-bold rounded-full">
          Total {vehicles.length} Vehicles
        </span>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Vehicle Number or Assigned Driver..."
          className="w-full text-xs font-medium focus:outline-none bg-transparent"
        />
      </div>

      {/* Vehicle Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3">Vehicle Number</th>
                <th className="p-3">Vehicle Type</th>
                <th className="p-3">Model</th>
                <th className="p-3">Assigned Driver</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-extrabold font-mono text-slate-900">{vehicle.vehicleNumber}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-800">
                      {vehicle.vehicleType}
                    </span>
                  </td>
                  <td className="p-3">{vehicle.model}</td>
                  <td className="p-3 font-bold text-[#0D47A1]">
                    {vehicle.assignedDriverName || ""}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                        vehicle.assignedDriverName
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {vehicle.assignedDriverName ? "Active Assignment" : ""}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setSelectedDriverId(vehicle.assignedDriverId || "");
                        }}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] rounded-lg transition-colors"
                      >
                        Change / Assign
                      </button>

                      {vehicle.assignedDriverName && (
                        <button
                          onClick={() => handleRemove(vehicle.vehicleNumber)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition-colors"
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Vehicle Modal */}
      <AnimatePresence>
        {selectedVehicle && (
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
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-extrabold text-cyan-900">
                  Assign Driver to {selectedVehicle.vehicleNumber}
                </h3>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map((d, idx) => (
                    <option key={`${d.id}-${d.mobile || idx}`} value={d.mobile || d.etmId}>
                      {d.name} ({d.mobile}) - ETM: {d.etmId || "N/A"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Confirm Allocation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
