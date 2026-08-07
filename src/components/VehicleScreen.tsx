import React from "react";
import { Car, Menu, PhoneCall, ShieldCheck, Calendar, Fuel, CheckCircle2 } from "lucide-react";
import { DriverDetails, DriverDocumentRecord } from "../types";
import PullToRefresh from "./PullToRefresh";
import SSKLogo from "./SSKLogo";

interface VehicleScreenProps {
  driver: DriverDetails | null;
  documentRecord?: DriverDocumentRecord | null;
  loggedMobile: string;
  onRefresh: () => Promise<void>;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
  onOpenDrawer: () => void;
}

export default function VehicleScreen({
  driver,
  documentRecord,
  loggedMobile,
  onRefresh,
  syncState,
  onOpenDrawer,
}: VehicleScreenProps) {
  // Helper function to normalize values and filter out placeholders/unassigned indicators
  const normalizeValue = (val?: string): string => {
    if (!val) return "";
    const cleaned = val.trim();
    const lower = cleaned.toLowerCase();
    if (
      !cleaned ||
      lower === "n/a" ||
      lower === "na" ||
      lower === "none" ||
      lower === "no" ||
      lower === "no vehicle" ||
      lower === "not assigned" ||
      lower === "not allotted" ||
      lower === "unassigned" ||
      lower === "nil" ||
      lower === "-" ||
      lower === "0"
    ) {
      return "";
    }
    return cleaned;
  };

  // Determine actual assigned vehicle number and model live from Google Sheet data
  const vehicleNumber =
    normalizeValue(driver?.vehicleRegistration) ||
    normalizeValue(documentRecord?.vehicleNumber);

  const vehicleModel =
    normalizeValue(driver?.vehicleModel) ||
    normalizeValue(driver?.vehicleName) ||
    normalizeValue(documentRecord?.vehicleModel);

  const vehiclePhoto = normalizeValue(driver?.vehiclePhoto);

  // A vehicle is assigned ONLY if a valid registration number or model exists in the sheet
  const isVehicleAssigned = Boolean(vehicleNumber || vehicleModel);

  // Determine Fuel type based on vehicle model or default to EV/CNG Fleet
  const getFuelType = (modelStr: string): string => {
    const lower = modelStr.toLowerCase();
    if (lower.includes("ev") || lower.includes("electric") || lower.includes("tigor ev") || lower.includes("xpress")) {
      return "EV (Electric Vehicle)";
    }
    if (lower.includes("cng") || lower.includes("aura") || lower.includes("wagonr") || lower.includes("dzire")) {
      return "CNG Fleet";
    }
    return "EV / Commercial Fleet";
  };

  // Formatted registration / allotment date
  const registrationDate = documentRecord?.registrationDateTime
    ? new Date(documentRecord.registrationDateTime).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : driver?.lastLogin
    ? new Date(driver.lastLogin).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Active Record";

  return (
    <div className="flex-1 flex flex-col bg-[#F4F6F9] dark:bg-slate-950 text-[#333333] dark:text-slate-100 relative overflow-hidden transition-colors duration-200">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs select-none relative shrink-0 transition-colors duration-200">
        <button
          onClick={onOpenDrawer}
          className="lg:hidden p-1 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-[#0A2540] dark:text-slate-100 cursor-pointer"
          title="Open Menu"
          id="btn-open-menu-vehicle"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-extrabold text-[#0A2540] dark:text-white mx-auto lg:mx-0">Vehicle Details</h2>
        <div className="w-8 lg:hidden" /> {/* Balance spacer */}
      </div>

      <PullToRefresh onRefresh={onRefresh} syncState={syncState}>
        {/* 2. Main content container */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-5 max-w-3xl lg:max-w-4xl mx-auto w-full transition-all duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0A2540] dark:text-white tracking-tight">
                My Vehicle
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Your registered vehicle details
              </p>
            </div>
            {isVehicleAssigned && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-black uppercase tracking-wide">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Active Allocation
              </span>
            )}
          </div>

          {isVehicleAssigned ? (
            /* Vehicle Assigned Card */
            <div className="w-full bg-white dark:bg-slate-900 rounded-[20px] p-5 sm:p-7 shadow-md hover:shadow-lg border border-slate-200/80 dark:border-slate-800 flex flex-col gap-6 transition-all duration-300">
              
              {/* Top Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-[#0A2540] dark:bg-blue-900/80 p-2.5 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0066cc] dark:text-blue-400 block">
                      SSK Fleet Partner
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-[#0A2540] dark:text-white">
                      {vehicleModel || "Assigned Fleet Vehicle"}
                    </h3>
                  </div>
                </div>
                <span className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>
              </div>

              {/* Vehicle Banner / Photo */}
              {vehiclePhoto ? (
                <div className="w-full overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
                  <img
                    src={vehiclePhoto}
                    alt={vehicleModel || "Assigned Vehicle"}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto max-h-64 object-cover hover:scale-102 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="w-full bg-gradient-to-br from-slate-900 via-[#0A2540] to-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-inner flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-3xs" />
                  <SSKLogo size={150} className="relative z-10 my-1 drop-shadow-xl" />
                  <span className="relative z-10 text-xs font-black text-amber-400 uppercase tracking-widest mt-2">
                    Official SSK Fleet Vehicle
                  </span>
                </div>
              )}

              {/* Vehicle Registration License Plate */}
              <div className="flex flex-col items-center justify-center text-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  VEHICLE NUMBER
                </span>
                <div className="bg-[#EBF3FC] dark:bg-slate-900 border-2 border-blue-300/80 dark:border-blue-700 rounded-2xl px-6 sm:px-10 py-3 shadow-2xs inline-flex items-center justify-center select-all">
                  <span className="text-xl sm:text-2xl font-mono font-black text-[#0A2540] dark:text-blue-300 tracking-wider">
                    {vehicleNumber}
                  </span>
                </div>
              </div>

              {/* Vehicle Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Vehicle Model */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 shrink-0">
                    <Car className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      Vehicle Model
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#0A2540] dark:text-white">
                      {vehicleModel || "Commercial Fleet Model"}
                    </span>
                  </div>
                </div>

                {/* Fuel Type */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shrink-0">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      Fuel Type
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#0A2540] dark:text-white">
                      {getFuelType(vehicleModel)}
                    </span>
                  </div>
                </div>

                {/* Registration / Allotment Date */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      Allotment Date
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#0A2540] dark:text-white">
                      {registrationDate}
                    </span>
                  </div>
                </div>

                {/* Allocation Status */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      Allocation Status
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      Active Allocation
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Vehicle NOT Allotted Empty State Card */
            <div className="w-full bg-white dark:bg-slate-900 rounded-[20px] p-6 sm:p-10 md:p-12 shadow-md hover:shadow-lg border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-all duration-300">
              
              {/* Official SSK Fleet Logo */}
              <div className="w-full flex items-center justify-center mb-6 max-w-xs sm:max-w-sm mx-auto">
                <SSKLogo
                  size={200}
                  className="w-44 h-44 sm:w-52 sm:h-52 object-contain drop-shadow-xl hover:scale-102 transition-transform duration-300"
                />
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0A2540] dark:text-white tracking-tight mb-3">
                Vehicle Not Alloted
              </h2>

              {/* Informational Guidance Text */}
              <div className="max-w-md mx-auto space-y-1 mb-8">
                <p className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200 leading-snug">
                  No vehicle has been allotted to your account yet.
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Please contact your Fleet Administrator.
                </p>
              </div>

              {/* Contact Fleet Administrator Button */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 w-full max-w-xs sm:max-w-sm flex justify-center">
                <a
                  href="tel:02212345678"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#0A2540] hover:bg-blue-900 active:scale-98 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-md transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 text-amber-400" />
                  <span>Contact Fleet Administrator</span>
                </a>
              </div>

            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}

