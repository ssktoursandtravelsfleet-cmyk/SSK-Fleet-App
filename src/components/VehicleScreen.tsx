import React from "react";
import { Car, Menu, Info, AlertCircle, PhoneCall } from "lucide-react";
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

  // Debugging logs
  console.log("Logged mobile:", loggedMobile);
  console.log("Driver details:", driver);
  console.log("Document record:", documentRecord);
  console.log("Is Vehicle Assigned:", isVehicleAssigned, { vehicleNumber, vehicleModel, vehiclePhoto });

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
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-4 max-w-4xl lg:max-w-5xl mx-auto w-full">
          {isVehicleAssigned ? (
            /* Vehicle Assigned Card */
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100 dark:border-slate-800 flex flex-col transition-colors duration-200">
              {/* Header Block */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="bg-[#0A2540] dark:bg-blue-900 p-3 rounded-2xl flex items-center justify-center shrink-0">
                  <Car className="w-5.5 h-5.5 text-white" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-extrabold text-[#0A2540] dark:text-white leading-none mb-1">My Vehicle</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400 font-bold leading-none">Your registered vehicle details</p>
                </div>
              </div>

              {/* Vehicle Photo Container (Rendered ONLY if photo URL is provided in Google Sheets) */}
              {vehiclePhoto ? (
                <div className="w-full overflow-hidden mb-5">
                  <img
                    src={vehiclePhoto}
                    alt={vehicleModel || "Assigned Vehicle"}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto max-h-60 object-cover rounded-2xl border border-slate-100 shadow-sm"
                  />
                </div>
              ) : (
                <div className="w-full bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl p-6 border border-slate-100/80 mb-5 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-100 text-[#0A2540] mb-2">
                    <Car className="w-10 h-10" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    SSK Fleet Vehicle
                  </span>
                </div>
              )}

              {/* Vehicle Details */}
              <div className="flex flex-col items-center text-center">
                {vehicleModel && (
                  <>
                    <span className="text-[10px] font-black tracking-widest text-[#0066cc] uppercase mb-1">
                      VEHICLE NAME
                    </span>
                    <h4 className="text-2xl font-black text-[#0A2540] mb-4">
                      {vehicleModel}
                    </h4>
                  </>
                )}

                {vehicleNumber && (
                  <>
                    <span className="text-[10px] font-black tracking-widest text-[#0066cc] uppercase mb-2">
                      VEHICLE NUMBER
                    </span>
                    {/* Stylized Digital License Plate Card */}
                    <div className="bg-[#EBF3FC] border border-blue-200/60 rounded-2xl px-8 py-3.5 shadow-2xs inline-flex items-center justify-center select-none min-w-[200px]">
                      <span className="text-lg font-mono font-black text-[#0A2540] tracking-wider leading-none">
                        {vehicleNumber}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Vehicle NOT Assigned Empty State Card */
            <div className="w-full bg-white rounded-3xl p-6 py-8 shadow-xs border border-slate-100 flex flex-col items-center text-center">
              {/* No Vehicle Illustration / Icon */}
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200/60">
                  <Car className="w-10 h-10 stroke-[1.75]" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full border-2 border-white shadow-xs">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>

              {/* Title with Car Emoji */}
              <h3 className="text-xl font-black text-[#0A2540] flex items-center justify-center gap-2 mb-2">
                <span>🚗</span> Car Not Allotted
              </h3>

              {/* Grey Badge */}
              <div className="mb-4">
                <span className="bg-slate-100 text-slate-600 text-xs font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-slate-200 inline-block">
                  Not Assigned
                </span>
              </div>

              {/* Clear Informational Text */}
              <div className="space-y-1.5 max-w-xs text-slate-600">
                <p className="text-sm font-semibold leading-relaxed">
                  This driver currently has no vehicle assigned.
                </p>
                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                  Please contact your Fleet Manager or Branch Office.
                </p>
              </div>

              {/* Contact Button */}
              <div className="mt-6 pt-5 border-t border-slate-100 w-full flex justify-center">
                <a
                  href="tel:02212345678"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-extrabold rounded-xl border border-slate-200/80 transition-all cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                  <span>Contact Office</span>
                </a>
              </div>
            </div>
          )}

          {/* Bottom Info Alert Box */}
          <div className="bg-[#EBF3FC] border border-blue-100 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <Info className="w-5.5 h-5.5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-blue-900/80 leading-relaxed">
              Vehicle details are fetched from your registered records in Google Sheets.
            </p>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
