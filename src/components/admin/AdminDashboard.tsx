import React from "react";
import { motion } from "motion/react";
import {
  Users,
  UserCheck,
  FileCheck,
  UserX,
  Car,
  DollarSign,
  TrendingUp,
  Receipt,
  Clock,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Bell,
  FileText,
  AlertCircle
} from "lucide-react";
import { AdminDriverItem, AdminVehicleItem, AdminScreen } from "../../types";
import { formatVehicleNumber } from "../../lib/sheets";

interface AdminDashboardProps {
  drivers: AdminDriverItem[];
  vehicles: AdminVehicleItem[];
  onNavigate: (screen: AdminScreen) => void;
  onRefresh: () => void;
}

export default function AdminDashboard({
  drivers = [],
  vehicles = [],
  onNavigate,
  onRefresh
}: AdminDashboardProps) {
  // Calculations for dashboard summary cards
  const totalDrivers = drivers.length;
  const pendingDrivers = drivers.filter(d => d.status === "Pending" || d.status === "Submitted").length;
  const pendingDocs = drivers.filter(d => d.documentStatus === "Pending" || d.documentStatus === "Submitted").length;
  const activeDrivers = drivers.filter(d => d.status === "Active" || d.status === "Approved").length;
  const inactiveDrivers = drivers.filter(d => d.status === "Inactive" || d.status === "Suspended" || d.status === "Rejected").length;
  const vehiclesAssigned = vehicles.filter(v => v.assignedDriverId || v.assignedDriverEtm || v.status === "Active").length;

  // Earnings & Outstanding Summaries
  const dailyEarningsTotal = drivers.reduce((acc, d) => acc + (d.dailyEarnings || 0), 0);
  const weeklyEarningsTotal = drivers.reduce((acc, d) => acc + (d.totalEarnings || 0), 0);
  const currentOutstandingTotal = drivers.reduce((acc, d) => acc + (d.currentOutstanding || 0), 0);
  const weeklyOutstandingTotal = drivers.reduce((acc, d) => acc + (d.weeklyOutstanding || 0), 0);
  const totalOutstandingTotal = drivers.reduce((acc, d) => acc + (d.totalOutstanding !== undefined ? d.totalOutstanding : ((d.currentOutstanding || 0) + (d.weeklyOutstanding || 0))), 0);

  const statsList = [
    {
      title: "Total Drivers",
      value: totalDrivers,
      subtitle: "Registered Partners",
      icon: Users,
      color: "bg-blue-50 text-[#0D47A1] border-blue-200",
      targetScreen: AdminScreen.DRIVERS
    },
    {
      title: "Pending Driver Approval",
      value: pendingDrivers,
      subtitle: "Requires Action",
      icon: UserCheck,
      color: "bg-amber-50 text-amber-700 border-amber-200",
      badge: pendingDrivers > 0 ? "Pending" : null,
      targetScreen: AdminScreen.DRIVER_VERIFICATION
    },
    {
      title: "Pending Documents",
      value: pendingDocs,
      subtitle: "KYC Verification",
      icon: FileCheck,
      color: "bg-purple-50 text-purple-700 border-purple-200",
      badge: pendingDocs > 0 ? "Review" : null,
      targetScreen: AdminScreen.DOCUMENT_VERIFICATION
    },
    {
      title: "Active Drivers",
      value: activeDrivers,
      subtitle: "On Road Partners",
      icon: Users,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      targetScreen: AdminScreen.DRIVERS
    },
    {
      title: "Inactive / Suspended",
      value: inactiveDrivers,
      subtitle: "Offline / Suspended",
      icon: UserX,
      color: "bg-rose-50 text-rose-700 border-rose-200",
      targetScreen: AdminScreen.DRIVERS
    },
    {
      title: "Vehicles Assigned",
      value: vehiclesAssigned,
      subtitle: "Fleet Deployment",
      icon: Car,
      color: "bg-cyan-50 text-cyan-700 border-cyan-200",
      targetScreen: AdminScreen.VEHICLES
    },
    {
      title: "Daily Earnings",
      value: `₹${dailyEarningsTotal.toLocaleString("en-IN")}`,
      subtitle: "Today Fleet Earnings",
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      targetScreen: AdminScreen.EARNINGS
    },
    {
      title: "Weekly Earnings",
      value: `₹${weeklyEarningsTotal.toLocaleString("en-IN")}`,
      subtitle: "Weekly Total Summary",
      icon: TrendingUp,
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      targetScreen: AdminScreen.EARNINGS
    },
    {
      title: "Current Outstanding",
      value: `₹${currentOutstandingTotal.toLocaleString("en-IN")}`,
      subtitle: "Due Collections",
      icon: Receipt,
      color: "bg-amber-50 text-amber-800 border-amber-200",
      targetScreen: AdminScreen.OUTSTANDING
    },
    {
      title: "Weekly Outstanding",
      value: `₹${weeklyOutstandingTotal.toLocaleString("en-IN")}`,
      subtitle: "Weekly Hissab Outstanding",
      icon: Receipt,
      color: "bg-indigo-50 text-indigo-800 border-indigo-200",
      targetScreen: AdminScreen.OUTSTANDING
    },
    {
      title: "Total Outstanding",
      value: `₹${totalOutstandingTotal.toLocaleString("en-IN")}`,
      subtitle: "Cumulative Outstanding",
      icon: Clock,
      color: "bg-rose-50 text-rose-800 border-rose-200",
      targetScreen: AdminScreen.OUTSTANDING
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 min-h-screen text-[#333333]">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0D47A1] to-[#1E88E5] rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <h2 className="text-base sm:text-lg font-bold">Admin Operations Console</h2>
          </div>
          <p className="text-xs text-blue-100 max-w-xl">
            Real-time management for SSK driver onboardings, KYC document approvals, vehicle allocations, and earnings logs.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onNavigate(AdminScreen.DRIVER_VERIFICATION)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white text-[#0D47A1] text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-4 h-4 text-[#0D47A1]" />
            <span>Verifications ({pendingDrivers})</span>
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1E88E5]"></span>
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate(AdminScreen.DRIVER_VERIFICATION)}
            className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#1E88E5] transition-all text-left flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0D47A1] flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1]">Driver Approval</p>
              <p className="text-[10px] text-slate-500">{pendingDrivers} awaiting</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate(AdminScreen.DOCUMENT_VERIFICATION)}
            className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#1E88E5] transition-all text-left flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">KYC Documents</p>
              <p className="text-[10px] text-slate-500">{pendingDocs} to review</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate(AdminScreen.NOTIFICATIONS)}
            className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#1E88E5] transition-all text-left flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700">Broadcast Notice</p>
              <p className="text-[10px] text-slate-500">App & WhatsApp</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate(AdminScreen.REPORTS)}
            className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#1E88E5] transition-all text-left flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Export Reports</p>
              <p className="text-[10px] text-slate-500">PDF & Excel</p>
            </div>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1E88E5]"></span>
          Fleet Metrics & Financial Summaries
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {statsList.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onNavigate(stat.targetScreen)}
                className={`p-4 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${stat.color}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold tracking-tight opacity-80">{stat.title}</span>
                  <div className="p-1.5 rounded-lg bg-white/80 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-black tracking-tight">{stat.value}</span>
                  {stat.badge && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                      {stat.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] mt-2 pt-2 border-t border-slate-100 opacity-75">
                  <span>{stat.subtitle}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity / Pending Approvals Preview */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#0D47A1]" />
            <h3 className="text-sm font-bold text-[#0D47A1]">Newly Registered Drivers Awaiting Approval</h3>
          </div>
          <button
            onClick={() => onNavigate(AdminScreen.DRIVER_VERIFICATION)}
            className="text-xs font-bold text-[#1E88E5] hover:underline flex items-center gap-1"
          >
            <span>View All ({pendingDrivers})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {drivers.filter(d => d.status === "Pending" || d.status === "Submitted").length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <UserCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-bold text-slate-700">All drivers are verified!</p>
            <p className="text-[11px] text-slate-500">No pending registrations requiring review at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-2.5">Driver Name</th>
                  <th className="p-2.5">Mobile Number</th>
                  <th className="p-2.5">ETM ID</th>
                  <th className="p-2.5">Vehicle</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {drivers
                  .filter(d => d.status === "Pending" || d.status === "Submitted")
                  .slice(0, 5)
                  .map((driver, idx) => (
                    <tr key={`${driver.id}-${driver.mobile || idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900">{driver.name}</td>
                      <td className="p-2.5 font-mono text-slate-600">{driver.mobile}</td>
                      <td className="p-2.5 font-bold text-[#0D47A1]">{driver.etmId && !["UNASSIGNED", "N/A", "NULL", "UNDEFINED"].includes(driver.etmId.toUpperCase()) ? driver.etmId : ""}</td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {formatVehicleNumber(driver.vehicleNumber)}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                          {driver.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => onNavigate(AdminScreen.DRIVER_VERIFICATION)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#0D47A1] text-white rounded-lg hover:bg-blue-800 transition-colors shadow-2xs"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
