import React from "react";
import { Menu, AlertTriangle } from "lucide-react";
import { DriverDetails, DriverDocumentRecord } from "../types";
import PullToRefresh from "./PullToRefresh";

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

  // Determine actual assigned vehicle number live from Google Sheet data
  const vehicleNumber =
    normalizeValue(driver?.vehicleRegistration) ||
    normalizeValue(documentRecord?.vehicleNumber);

  // A vehicle is assigned ONLY if a valid registration number exists
  const isVehicleAssigned = Boolean(vehicleNumber);

  return (
    <div className="flex-1 flex flex-col bg-[#F4F6F9] dark:bg-slate-950 text-[#333333] dark:text-slate-100 relative overflow-hidden transition-colors duration-200">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-3.5 flex items-center justify-between shadow-xs select-none relative shrink-0 transition-colors duration-200">
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
        {/* Main content container */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-5 max-w-xl mx-auto w-full transition-all duration-300">
          
          {isVehicleAssigned ? (
            /* Vehicle Assigned Card - Shows ONLY Vehicle Number */
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-all duration-300">
              <span className="text-xs sm:text-sm font-black tracking-widest text-slate-400 dark:text-slate-400 uppercase mb-3">
                VEHICLE NUMBER
              </span>
              <div className="bg-[#EBF3FC] dark:bg-slate-800 border-2 border-blue-300/80 dark:border-blue-700 rounded-2xl px-6 sm:px-10 py-4 shadow-2xs inline-flex items-center justify-center select-all">
                <span className="text-2xl sm:text-3xl font-mono font-black text-[#0A2540] dark:text-blue-300 tracking-wider">
                  {vehicleNumber}
                </span>
              </div>
            </div>
          ) : (
            /* Vehicle NOT Allotted Empty State Card */
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-all duration-300">
              <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0A2540] dark:text-white tracking-tight mb-2">
                Vehicle Not Alloted
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                No vehicle has been allotted to your account yet.
              </p>
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}

