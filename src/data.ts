import { DriverDetails, VehicleDocument, NotificationItem, TransactionItem } from "./types";

export const mockDriver: DriverDetails = {
  id: "SSK12345",
  name: "Omkar Sonawane",
  phone: "7977242151",
  email: "omkar.sonawane@ssktravels.com",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", // High-quality profile photo
  licenseNumber: "MH-0220210084512",
  licenseExpiry: "18 Aug 2036",
  vehicleRegistration: "MH02AB1234"
};

export const mockVehicleDetails = {
  model: "Tata Tigor EV",
  registrationNo: "MH02AB1234",
  owner: "SSK TOURS & TRAVELS",
  fuelType: "White Electric",
  seatingCapacity: "4 + 1",
  chassisNo: "MAT628541S00******",
  engineNo: "TGEV******"
};

export const mockDocuments: VehicleDocument[] = [
  {
    id: "doc-1",
    name: "RC",
    fullName: "Registration Certificate (RC)",
    status: "verified",
    expiryDate: "14 Aug 2035",
    documentNo: "MH02/RC/48592",
    description: "Official vehicle registration document under SSK Tours & Travels."
  },
  {
    id: "doc-2",
    name: "Insurance",
    fullName: "Commercial Insurance",
    status: "verified",
    expiryDate: "12 Oct 2026",
    documentNo: "INS-MH-8948123",
    description: "Comprehensive commercial passenger vehicle insurance cover."
  },
  {
    id: "doc-3",
    name: "PUC",
    fullName: "Pollution Under Control (PUC)",
    status: "warning",
    expiryDate: "10 Jul 2026", // Expiring soon (7 days from July 3)
    documentNo: "PUC-MH02-74829",
    description: "Emission compliance certificate. Needs immediate renewal."
  },
  {
    id: "doc-4",
    name: "Permit",
    fullName: "All India Tourist Permit",
    status: "verified",
    expiryDate: "22 Dec 2026",
    documentNo: "MH/PERMIT/2025/92",
    description: "State tourist permit for commercial passenger operations."
  },
  {
    id: "doc-5",
    name: "Fitness",
    fullName: "Fitness Certificate",
    status: "verified",
    expiryDate: "30 Jan 2027",
    documentNo: "FIT-MH-2025-8942",
    description: "RTO fitness standard clearance certificate."
  },
  {
    id: "doc-6",
    name: "Road Tax",
    fullName: "RTO Road Tax Receipt",
    status: "verified",
    expiryDate: "31 Mar 2027",
    documentNo: "TAX-MH02-948291",
    description: "Commercial state road tax receipt token."
  }
];

export const mockNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "PUC Document Expiring",
    message: "Your Pollution Certificate (PUC) will expire in 7 days. Please upload a new certificate.",
    time: "2 hours ago",
    type: "warning",
    read: false
  },
  {
    id: "notif-2",
    title: "Weekly Rent Due",
    message: "Weekly rental payment of ₹6,000 for Tata Tigor EV is due tomorrow.",
    time: "5 hours ago",
    type: "warning",
    read: false
  },
  {
    id: "notif-3",
    title: "New Earning Update",
    message: "A new earning update is available for your recent completed trips with Uber and Ola.",
    time: "Just Now",
    type: "success",
    read: false
  },
  {
    id: "notif-4",
    title: "System Maintenance",
    message: "SSK Driver App will undergo brief maintenance tonight from 1 AM to 2 AM UTC.",
    time: "2 days ago",
    type: "info",
    read: true
  }
];

export const mockTransactions: TransactionItem[] = [
  // 25 May: ₹2350
  {
    id: "tx-25-1",
    partner: "Uber",
    amount: 1100,
    time: "08:15 PM",
    date: "25 May 2026",
    status: "Completed",
    tripId: "UB-384910-K"
  },
  {
    id: "tx-25-2",
    partner: "Ola",
    amount: 850,
    time: "04:30 PM",
    date: "25 May 2026",
    status: "Completed",
    tripId: "OL-192842-A"
  },
  {
    id: "tx-25-3",
    partner: "Rapido",
    amount: 400,
    time: "11:20 AM",
    date: "25 May 2026",
    status: "Completed",
    tripId: "RP-482019-X"
  },
  // 24 May: ₹2180
  {
    id: "tx-24-1",
    partner: "Uber",
    amount: 1000,
    time: "09:00 PM",
    date: "24 May 2026",
    status: "Completed",
    tripId: "UB-284918-B"
  },
  {
    id: "tx-24-2",
    partner: "Ola",
    amount: 780,
    time: "05:15 PM",
    date: "24 May 2026",
    status: "Completed",
    tripId: "OL-928491-Y"
  },
  {
    id: "tx-24-3",
    partner: "Rapido",
    amount: 400,
    time: "02:10 PM",
    date: "24 May 2026",
    status: "Completed",
    tripId: "RP-192841-Z"
  },
  // 23 May: ₹2450
  {
    id: "tx-23-1",
    partner: "Uber",
    amount: 1200,
    time: "07:45 PM",
    date: "23 May 2026",
    status: "Completed",
    tripId: "UB-192848-Q"
  },
  {
    id: "tx-23-2",
    partner: "Ola",
    amount: 850,
    time: "03:20 PM",
    date: "23 May 2026",
    status: "Completed",
    tripId: "OL-482910-W"
  },
  {
    id: "tx-23-3",
    partner: "Rapido",
    amount: 400,
    time: "12:15 PM",
    date: "23 May 2026",
    status: "Completed",
    tripId: "RP-928410-E"
  },
  // 22 May: ₹2190
  {
    id: "tx-22-1",
    partner: "Uber",
    amount: 1000,
    time: "08:30 PM",
    date: "22 May 2026",
    status: "Completed",
    tripId: "UB-482910-R"
  },
  {
    id: "tx-22-2",
    partner: "Ola",
    amount: 790,
    time: "04:10 PM",
    date: "22 May 2026",
    status: "Completed",
    tripId: "OL-192840-T"
  },
  {
    id: "tx-22-3",
    partner: "Rapido",
    amount: 400,
    time: "01:05 PM",
    date: "22 May 2026",
    status: "Completed",
    tripId: "RP-482910-Y"
  },
  // 21 May: ₹2020
  {
    id: "tx-21-1",
    partner: "Uber",
    amount: 900,
    time: "07:20 PM",
    date: "21 May 2026",
    status: "Completed",
    tripId: "UB-192841-U"
  },
  {
    id: "tx-21-2",
    partner: "Ola",
    amount: 720,
    time: "03:40 PM",
    date: "21 May 2026",
    status: "Completed",
    tripId: "OL-482919-I"
  },
  {
    id: "tx-21-3",
    partner: "Rapido",
    amount: 400,
    time: "11:55 AM",
    date: "21 May 2026",
    status: "Completed",
    tripId: "RP-192842-O"
  },
  // 20 May: ₹1980
  {
    id: "tx-20-1",
    partner: "Uber",
    amount: 900,
    time: "08:10 PM",
    date: "20 May 2026",
    status: "Completed",
    tripId: "UB-482912-P"
  },
  {
    id: "tx-20-2",
    partner: "Ola",
    amount: 680,
    time: "04:15 PM",
    date: "20 May 2026",
    status: "Completed",
    tripId: "OL-192839-S"
  },
  {
    id: "tx-20-3",
    partner: "Rapido",
    amount: 400,
    time: "12:05 PM",
    date: "20 May 2026",
    status: "Completed",
    tripId: "RP-482918-D"
  },
  // 19 May: ₹1630
  {
    id: "tx-19-1",
    partner: "Uber",
    amount: 800,
    time: "07:50 PM",
    date: "19 May 2026",
    status: "Completed",
    tripId: "UB-192838-F"
  },
  {
    id: "tx-19-2",
    partner: "Ola",
    amount: 530,
    time: "03:10 PM",
    date: "19 May 2026",
    status: "Completed",
    tripId: "OL-482917-G"
  },
  {
    id: "tx-19-3",
    partner: "Rapido",
    amount: 300,
    time: "11:15 AM",
    date: "19 May 2026",
    status: "Completed",
    tripId: "RP-192837-H"
  }
];

export const mockDailyStats = [
  { day: "Mon", amount: 1630 },
  { day: "Tue", amount: 1980 },
  { day: "Wed", amount: 2020 },
  { day: "Thu", amount: 2190 },
  { day: "Fri", amount: 2450 },
  { day: "Sat", amount: 2180 },
  { day: "Sun", amount: 2350 }
];
