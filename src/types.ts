export enum ActiveScreen {
  SPLASH = "SPLASH",
  LOGIN = "LOGIN",
  OTP = "OTP",
  DASHBOARD = "DASHBOARD",
  VEHICLE = "VEHICLE",
  ONBOARDING = "ONBOARDING",
  PAYMENT = "PAYMENT",
  WEEKLY_HISSAB = "WEEKLY_HISSAB",
  PROFILE = "PROFILE",
  HELP_SUPPORT = "HELP_SUPPORT",
  ADMIN_PANEL = "ADMIN_PANEL"
}

export enum AdminScreen {
  DASHBOARD = "DASHBOARD",
  DRIVER_VERIFICATION = "DRIVER_VERIFICATION",
  DOCUMENT_VERIFICATION = "DOCUMENT_VERIFICATION",
  DRIVERS = "DRIVERS",
  VEHICLES = "VEHICLES",
  EARNINGS = "EARNINGS",
  OUTSTANDING = "OUTSTANDING",
  WEEKLY_HISSAB = "WEEKLY_HISSAB",
  REPORTS = "REPORTS",
  NOTIFICATIONS = "NOTIFICATIONS",
  SETTINGS = "SETTINGS"
}

export interface DriverDetails {
  id: string;
  name: string;
  Driver_Name?: string;
  Name?: string;
  phone: string;
  email: string;
  avatarUrl: string;
  licenseNumber: string;
  licenseExpiry: string;
  vehicleRegistration: string;
  vehiclePhoto?: string;
  vehicleModel?: string;
  vehicleName?: string;
  status?: string;
  Status?: string;
  etm?: string;
  lastLogin?: string;
  role?: "driver" | "admin";
  User_Type?: string;
  Role?: string;
  Branch?: string;
  Department?: string;
  Permissions?: string;
}

export interface AdminDriverItem {
  id: string;
  name: string;
  mobile: string;
  etmId: string;
  vehicleNumber: string;
  vehicleModel: string;
  status: "Approved" | "Pending" | "Rejected" | "Active" | "Inactive" | "Suspended" | string;
  documentStatus: "Verified" | "Pending" | "Rejected" | string;
  registrationDate: string;
  aadhaarNumber?: string;
  aadhaarNo?: string;
  panNumber?: string;
  panNo?: string;
  dlNumber?: string;
  licenseNo?: string;
  address?: string;
  emergencyContact?: string;
  profilePhotoUrl?: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  panCardUrl?: string;
  dlFrontUrl?: string;
  dlBackUrl?: string;
  bankPassbookUrl?: string;
  policeVerificationUrl?: string;
  currentOutstanding?: number;
  weeklyOutstanding?: number;
  totalOutstanding?: number;
  totalEarnings?: number;
  dailyEarnings?: number;
  lastLogin?: string;
  documentRemarks?: Record<string, string>;
  role?: string;
}

export interface AdminVehicleItem {
  id: string;
  vehicleNumber: string;
  vehicleType: "EV" | "CNG" | "Petrol" | "Diesel" | string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverEtm?: string;
  status: "Active" | "In Service" | "Unassigned" | "Maintenance";
  model: string;
  registrationYear?: string;
}

export interface VehicleDocument {
  id: string;
  name: string;
  fullName: string;
  status: "verified" | "warning" | "expired" | "pending";
  expiryDate: string;
  description: string;
  documentNo: string;
}

export interface PartnerEarning {
  partner: "Uber" | "Ola" | "Rapido" | "Cash";
  amount: number;
  tripsCount: number;
  percentage: number;
  color: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "info" | "warning" | "success" | "danger";
  alertLevel?: string;
  read: boolean;
  readStatus?: string;
  readAt?: string;
  targetDriverId?: string;
  etmId?: string;
  driverName?: string;
  mobileNumber?: string;
  channel?: string;
  sentBy?: string;
  sentByName?: string;
  createdBy?: string;
  deliveryStatus?: string;
  createdAt?: string;
}

export interface TransactionItem {
  id: string;
  partner: "Uber" | "Ola" | "Rapido" | "Cash";
  amount: number;
  time: string;
  date: string;
  status: "Completed" | "Pending";
  tripId: string;
  etm?: string;
  name?: string;
  totalEarning?: number;
  cashCollected?: number;
  tipAndToll?: number;
  uberSub?: number;
  number?: string;
  trip?: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  mobileNumber: string;
  paymentType: string;
  amount: number;
  status: "Paid" | "Pending" | string;
}

export interface DriverDocumentRecord {
  registrationDateTime: string;
  driverName: string;
  mobileNumber: string;
  etmId: string;
  aadhaarNumber: string;
  panNumber: string;
  dlNumber: string;
  address: string;
  dob: string;
  emergencyContact: string;
  vehicleNumber: string;
  vehicleModel: string;
  profilePhotoUrl: string;
  aadhaarFrontUrl: string;
  aadhaarBackUrl: string;
  panCardUrl: string;
  dlFrontUrl: string;
  dlBackUrl: string;
  bankPassbookUrl: string;
  policeVerificationUrl: string;
  status: string;
  lastUpdated: string;
  isLocked: boolean;
}

