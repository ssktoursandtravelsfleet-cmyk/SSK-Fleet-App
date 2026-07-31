import React, { useState, useEffect } from "react";
import { AdminScreen, AdminDriverItem, AdminVehicleItem, DriverDetails } from "../../types";
import AdminHeader from "./AdminHeader";
import AdminDrawer from "./AdminDrawer";
import AdminDashboard from "./AdminDashboard";
import AdminDriverVerification from "./AdminDriverVerification";
import AdminDocumentVerification from "./AdminDocumentVerification";
import AdminDriverManagement from "./AdminDriverManagement";
import AdminOutstandingManagement from "./AdminOutstandingManagement";
import AdminVehicleManagement from "./AdminVehicleManagement";
import AdminReports from "./AdminReports";
import AdminNotifications from "./AdminNotifications";
import AdminSettings from "./AdminSettings";
import WeeklyHissabScreen from "../WeeklyHissabScreen";
import {
  fetchAllAdminData,
  updateDriverStatusInSheet,
  sendAdminNotificationToSheet,
  assignVehicleInSheets,
  removeVehicleAssignmentInSheets,
  clearSheetCache
} from "../../lib/sheets";
import { syncApprovedDriver, syncRejectedDriver, getVerificationStatus } from "../../lib/googleSheets";

interface AdminPanelContainerProps {
  accessToken?: string | null;
  currentAdminDriver: DriverDetails | null;
  onLogout: () => void;
  onSwitchToDriverView?: () => void;
  msgFormatRows?: string[][];
  weeklyHissabRow?: string[];
  weeklyHissabHeaders?: string[];
  weeklyHissabRows?: string[][];
  allWeeklyRows?: string[][];
}

export default function AdminPanelContainer({
  accessToken,
  currentAdminDriver,
  onLogout,
  onSwitchToDriverView,
  msgFormatRows = [],
  weeklyHissabRow,
  weeklyHissabHeaders,
  weeklyHissabRows,
  allWeeklyRows
}: AdminPanelContainerProps) {
  const [activeScreen, setActiveScreen] = useState<AdminScreen>(AdminScreen.DASHBOARD);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [drivers, setDrivers] = useState<AdminDriverItem[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicleItem[]>([]);

  // Initial fetch of admin data
  const loadAdminData = async () => {
    setIsRefreshing(true);
    try {
      clearSheetCache();
      const data = await fetchAllAdminData(accessToken);
      const freshDrivers = data.driverVerification || data.drivers || [];
      setDrivers([...freshDrivers]);
      if (data.vehicles) {
        setVehicles([...data.vehicles]);
      }
    } catch (err) {
      console.error("Failed to load admin sheet data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [accessToken]);

  // Handler functions
  const handleApproveDriver = async (driver: AdminDriverItem) => {
    setIsRefreshing(true);
    try {
      const result = await syncApprovedDriver(
        driver,
        accessToken,
        currentAdminDriver?.name || "Admin",
        "Driver_Verification"
      );
      if (!result.success) {
        throw new Error(result.message);
      }
      clearSheetCache();
      const fresh = await fetchAllAdminData(accessToken);
      const freshDrivers = fresh.driverVerification || fresh.drivers || [];
      setDrivers([...freshDrivers]);
      if (fresh.vehicles) {
        setVehicles([...fresh.vehicles]);
      }
    } catch (err: any) {
      clearSheetCache();
      const fresh = await fetchAllAdminData(accessToken);
      const freshDrivers = fresh.driverVerification || fresh.drivers || [];
      setDrivers([...freshDrivers]);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRejectDriver = async (driver: AdminDriverItem, reason?: string) => {
    setIsRefreshing(true);
    try {
      const result = await syncRejectedDriver(
        driver,
        reason || "Rejected",
        accessToken,
        currentAdminDriver?.name || "Admin",
        "Driver_Verification"
      );
      if (!result.success) {
        throw new Error(result.message);
      }
      clearSheetCache();
      const fresh = await fetchAllAdminData(accessToken);
      const freshDrivers = fresh.driverVerification || fresh.drivers || [];
      setDrivers([...freshDrivers]);
      if (fresh.vehicles) {
        setVehicles([...fresh.vehicles]);
      }
    } catch (err: any) {
      clearSheetCache();
      const fresh = await fetchAllAdminData(accessToken);
      const freshDrivers = fresh.driverVerification || fresh.drivers || [];
      setDrivers([...freshDrivers]);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleVerifyDocumentStatus = async (
    mobileOrEtm: string,
    status: "Verified" | "Rejected",
    remarks?: string
  ) => {
    setIsRefreshing(true);
    try {
      const foundDriver = drivers.find(d => d.mobile === mobileOrEtm || d.etmId === mobileOrEtm || d.id === mobileOrEtm);
      const targetDriver = foundDriver || { mobile: mobileOrEtm, etmId: mobileOrEtm, id: mobileOrEtm, name: "Driver" };

      if (status === "Verified") {
        await syncApprovedDriver(
          targetDriver,
          accessToken,
          currentAdminDriver?.name || "Admin",
          "Documents_Verification"
        );
      } else {
        await syncRejectedDriver(
          targetDriver,
          remarks || "Rejected",
          accessToken,
          currentAdminDriver?.name || "Admin",
          "Documents_Verification"
        );
      }
      clearSheetCache();
      const fresh = await fetchAllAdminData(accessToken);
      const freshDrivers = fresh.driverVerification || fresh.drivers || [];
      setDrivers([...freshDrivers]);
      if (fresh.vehicles) {
        setVehicles([...fresh.vehicles]);
      }
    } catch (err: any) {
      clearSheetCache();
      const fresh = await fetchAllAdminData(accessToken);
      const freshDrivers = fresh.driverVerification || fresh.drivers || [];
      setDrivers([...freshDrivers]);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateDriver = async (driverId: string, updatedFields: Partial<AdminDriverItem>) => {
    setDrivers(prev =>
      prev.map(d => (d.id === driverId ? { ...d, ...updatedFields } : d))
    );
  };

  const handleAssignVehicle = async (driverMobileOrEtm: string, vehicleNumber: string) => {
    setDrivers(prev =>
      prev.map(d =>
        d.mobile === driverMobileOrEtm || d.etmId === driverMobileOrEtm
          ? { ...d, vehicleNumber }
          : d
      )
    );
    setVehicles(prev =>
      prev.map(v =>
        v.vehicleNumber === vehicleNumber
          ? { ...v, assignedDriverId: driverMobileOrEtm, status: "Active" }
          : v
      )
    );
    await assignVehicleInSheets(driverMobileOrEtm, vehicleNumber, accessToken);
    await loadAdminData();
  };

  const handleRemoveVehicleAssignment = async (vehicleNumber: string) => {
    setVehicles(prev =>
      prev.map(v =>
        v.vehicleNumber === vehicleNumber
          ? { ...v, assignedDriverId: undefined, assignedDriverName: undefined, status: "Unassigned" }
          : v
      )
    );
    await removeVehicleAssignmentInSheets(vehicleNumber, accessToken);
    await loadAdminData();
  };

  const handleToggleStatus = async (driverMobileOrEtm: string, newStatus: "Active" | "Suspended") => {
    await updateDriverStatusInSheet(driverMobileOrEtm, newStatus, accessToken);
    setDrivers(prev =>
      prev.map(d =>
        d.mobile === driverMobileOrEtm || d.etmId === driverMobileOrEtm
          ? { ...d, status: newStatus }
          : d
      )
    );
  };

  const handleUpdateOutstanding = async (
    driverMobileOrEtm: string,
    amount: number,
    type: "DEDUCT" | "ADD" | "SET"
  ) => {
    setDrivers(prev =>
      prev.map(d => {
        if (d.mobile === driverMobileOrEtm || d.etmId === driverMobileOrEtm) {
          let cur = d.currentOutstanding || 0;
          if (type === "DEDUCT") cur = Math.max(0, cur - amount);
          else if (type === "ADD") cur = cur + amount;
          else if (type === "SET") cur = amount;
          return { ...d, currentOutstanding: cur };
        }
        return d;
      })
    );
  };

  const handleSendNotification = async (
    title: string,
    message: string,
    type: "info" | "warning" | "success" | "danger",
    targetDriver?: string
  ) => {
    await sendAdminNotificationToSheet(title, message, type, targetDriver, accessToken);
  };

  const pendingDriversCount = drivers.filter(d => getVerificationStatus(d) === "Pending").length;
  const pendingDocCount = drivers.filter(d => d.documentStatus === "Pending" || d.documentStatus === "Submitted").length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <AdminHeader
        onOpenDrawer={() => setIsDrawerOpen(true)}
        activeScreen={activeScreen}
        onRefresh={loadAdminData}
        isRefreshing={isRefreshing}
        onSwitchToDriverView={onSwitchToDriverView}
      />

      {/* Navigation Drawer */}
      <AdminDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeScreen={activeScreen}
        onSelectScreen={(screen) => setActiveScreen(screen)}
        onLogout={onLogout}
        adminName={currentAdminDriver?.name || "Admin Manager"}
        adminMobile={currentAdminDriver?.phone || "Fleet Master"}
        pendingDriverCount={pendingDriversCount}
        pendingDocCount={pendingDocCount}
      />

      {/* Main Screen Body */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {activeScreen === AdminScreen.DASHBOARD && (
          <AdminDashboard
            drivers={drivers}
            vehicles={vehicles}
            onNavigate={(screen) => setActiveScreen(screen)}
            onRefresh={loadAdminData}
          />
        )}

        {activeScreen === AdminScreen.DRIVER_VERIFICATION && (
          <AdminDriverVerification
            drivers={drivers}
            onApproveDriver={handleApproveDriver}
            onRejectDriver={handleRejectDriver}
            isProcessing={isRefreshing}
          />
        )}

        {activeScreen === AdminScreen.DOCUMENT_VERIFICATION && (
          <AdminDocumentVerification
            drivers={drivers}
            onVerifyDocumentStatus={handleVerifyDocumentStatus}
            isProcessing={isRefreshing}
          />
        )}

        {activeScreen === AdminScreen.DRIVERS && (
          <AdminDriverManagement
            drivers={drivers}
            vehicles={vehicles}
            onUpdateDriver={handleUpdateDriver}
            onAssignVehicle={handleAssignVehicle}
            onToggleStatus={handleToggleStatus}
            isProcessing={isRefreshing}
          />
        )}

        {activeScreen === AdminScreen.VEHICLES && (
          <AdminVehicleManagement
            vehicles={vehicles}
            drivers={drivers}
            onAssignVehicle={handleAssignVehicle}
            onRemoveVehicleAssignment={handleRemoveVehicleAssignment}
            isProcessing={isRefreshing}
          />
        )}

        {activeScreen === AdminScreen.EARNINGS && (
          <AdminReports drivers={drivers} vehicles={vehicles} />
        )}

        {activeScreen === AdminScreen.OUTSTANDING && (
          <AdminOutstandingManagement
            drivers={drivers}
            onUpdateOutstanding={handleUpdateOutstanding}
            onRefresh={loadAdminData}
            isProcessing={isRefreshing}
          />
        )}

        {activeScreen === AdminScreen.WEEKLY_HISSAB && (
          <div className="p-2 sm:p-4 bg-white min-h-screen">
            <WeeklyHissabScreen
              driver={currentAdminDriver || { id: "ADMIN", name: "Admin", phone: "", email: "", avatarUrl: "", licenseNumber: "", licenseExpiry: "", vehicleRegistration: "" }}
              accessToken={accessToken}
              msgFormatRows={msgFormatRows}
              weeklyHissabRow={weeklyHissabRow}
              weeklyHissabHeaders={weeklyHissabHeaders}
              weeklyHissabRows={weeklyHissabRows}
              allWeeklyRows={allWeeklyRows}
              onBackToDashboard={() => setActiveScreen(AdminScreen.DASHBOARD)}
            />
          </div>
        )}

        {activeScreen === AdminScreen.REPORTS && (
          <AdminReports drivers={drivers} vehicles={vehicles} />
        )}

        {activeScreen === AdminScreen.NOTIFICATIONS && (
          <AdminNotifications
            drivers={drivers}
            onSendNotification={handleSendNotification}
            isProcessing={isRefreshing}
          />
        )}

        {activeScreen === AdminScreen.SETTINGS && (
          <AdminSettings onRefreshAll={loadAdminData} isRefreshing={isRefreshing} />
        )}
      </main>
    </div>
  );
}
