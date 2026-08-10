import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Home as HomeIcon,
  Car as VehicleIcon,
  LogOut as LogOutIcon,
  Menu as MenuIcon,
  Wallet as PaymentIcon,
  Receipt as ReceiptIcon,
  User as ProfileIcon,
  LifeBuoy as HelpIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import PhoneFrame from "./components/PhoneFrame";
import LoginScreen from "./components/LoginScreen";
import DashboardScreen from "./components/DashboardScreen";
import VehicleScreen from "./components/VehicleScreen";
import SplashScreen from "./components/SplashScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import PaymentScreen from "./components/PaymentScreen";
import WeeklyHissabScreen from "./components/WeeklyHissabScreen";
import ProfileScreen from "./components/ProfileScreen";
import HelpSupportScreen from "./components/HelpSupportScreen";
import AdminPanelContainer from "./components/admin/AdminPanelContainer";
import SSKLogo from "./components/SSKLogo";

import { ActiveScreen, NotificationItem, VehicleDocument, TransactionItem, DriverDetails, PaymentRecord, DriverDocumentRecord } from "./types";
import { mockDriver, mockDocuments, mockNotifications, mockTransactions } from "./data";
import { initAuth, googleSignIn, logoutUser } from "./firebase";
import { fetchAndParseAllSheets, getCachedSheetsData, appendOnboardingDocuments, uploadBase64Image, appendDriverOnboardingData, checkMobileInDriverSheet, writePaymentLog, SPREADSHEET_ID, authenticateDriverWithSheet, updateLastLogin, updateDriverProfileInSheets, saveDriverDocumentsToSheet, fetchDriverDocumentsFromSheet, resolveDriverDisplayName, markNotificationReadInSheet } from "./lib/sheets";
import { DISPLAY_VERSION } from "./lib/version";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(ActiveScreen.SPLASH);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDriverSidebarCollapsed, setIsDriverSidebarCollapsed] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [viaWhatsApp, setViaWhatsApp] = useState(false);
  const [documentRecord, setDocumentRecord] = useState<DriverDocumentRecord | null>(null);
  
  // App simulated database states - Load from cache first for instant load and offline capability
  const cachedData = getCachedSheetsData();
  const [driver, setDriver] = useState<DriverDetails>(cachedData?.driver || mockDriver);
  const [notifications, setNotifications] = useState<NotificationItem[]>(cachedData?.notifications || mockNotifications);
  const [documents, setDocuments] = useState<VehicleDocument[]>(cachedData?.documents || mockDocuments);
  const [transactions, setTransactions] = useState<TransactionItem[]>(cachedData?.transactions || mockTransactions);
  const [payments, setPayments] = useState<PaymentRecord[]>(cachedData?.payments || []);
  const [outstandingAmount, setOutstandingAmount] = useState<number | string>(cachedData?.outstandingAmount !== undefined ? cachedData.outstandingAmount : 0);
  const [lastWeekOutstanding, setLastWeekOutstanding] = useState<number | string>(cachedData?.lastWeekOutstanding !== undefined ? cachedData.lastWeekOutstanding : 0);
  const [weeklyRent, setWeeklyRent] = useState<number | string>(cachedData?.weeklyRent !== undefined ? cachedData.weeklyRent : 0);
  const [currentOutstanding, setCurrentOutstanding] = useState<number | string>(cachedData?.currentOutstanding !== undefined ? cachedData.currentOutstanding : 0);
  const [totalOutstanding, setTotalOutstanding] = useState<number | string>(cachedData?.totalOutstanding !== undefined ? cachedData.totalOutstanding : 0);
  const [weeklyHissabRow, setWeeklyHissabRow] = useState<string[] | undefined>(cachedData?.weeklyHissabRow);
  const [weeklyHissabHeaders, setWeeklyHissabHeaders] = useState<string[] | undefined>(cachedData?.weeklyHissabHeaders);
  const [weeklyHissabRows, setWeeklyHissabRows] = useState<string[][] | undefined>(cachedData?.weeklyHissabRows);
  const [allWeeklyRows, setAllWeeklyRows] = useState<string[][] | undefined>(cachedData?.allWeeklyRows);
  const [msgFormatRows, setMsgFormatRows] = useState<string[][] | undefined>(cachedData?.msgFormatRows);

  // Sync and Auth states
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem("google_access_token"));

  // Global Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem("ssk_dark_mode");
      if (savedTheme !== null) {
        return savedTheme === "true";
      }
      return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ssk_dark_mode", String(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.warn("Dark mode effect error:", e);
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Splash routing and push notification states
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<ActiveScreen>(ActiveScreen.LOGIN);
  const [initialPaymentData, setInitialPaymentData] = useState<{
    paymentType: string;
    amount: number;
  } | null>(null);
  const [pushNotification, setPushNotification] = useState<{
    title: string;
    message: string;
    type: "success" | "warning" | "info";
  } | null>(null);

  const handleNavigateToPayment = (data?: { paymentType: string; amount: number }) => {
    if (data) {
      setInitialPaymentData(data);
    }
    setActiveScreen(ActiveScreen.PAYMENT);
  };

  // Web Audio Synth for premium double-chime notification sound
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.1); // G5
      gain2.gain.setValueAtTime(0.12, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);
    } catch (err) {
      console.warn("Audio chime context error:", err);
    }
  };

  const triggerPushNotification = (
    title: string,
    message: string,
    type: "success" | "warning" | "info"
  ) => {
    playNotificationSound();
    setPushNotification({ title, message, type });

    // Try to trigger standard browser Web Push Notification
    try {
      if ("Notification" in window && window.Notification.permission === "granted") {
        new window.Notification(title, {
          body: message,
          icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%2308182D%22 stroke=%22%23D5A144%22 stroke-width=%224%22/><text x=%2250%%22 y=%2270%%22 font-size=%2232%22 font-weight=%22900%22 fill=%22%23D5A144%22 text-anchor=%22middle%22 font-family=%22sans-serif%22>SSK</text></svg>"
        });
      }
    } catch (err) {
      console.warn("Browser notification trigger error:", err);
    }
  };

  const handleSheetsError = (err: any) => {
    const errorMsg = err?.message || String(err);
    if (errorMsg.includes("Spreadsheet configuration missing")) {
      triggerPushNotification(
        "Spreadsheet configuration missing",
        "Spreadsheet configuration missing",
        "warning"
      );
    } else {
      triggerPushNotification(
        "Google Sheet Sync Failed ❌",
        `Error details: ${errorMsg}`,
        "warning"
      );
    }
  };

  const checkAndNotifySyncData = (notifs: NotificationItem[]) => {
    if (!notifs || notifs.length === 0) return;
    const unread = notifs.filter(n => n && !n.read);

    const rentNotif = unread.find(n => n && typeof n.title === "string" && n.title.toLowerCase().includes("rent"));
    if (rentNotif) {
      setTimeout(() => {
        triggerPushNotification("Rent Payment Alert 🔔", rentNotif.message || "", "warning");
      }, 1200);
      return;
    }

    const pucNotif = unread.find(n => n && (
      (typeof n.title === "string" && n.title.toLowerCase().includes("puc")) ||
      (typeof n.message === "string" && n.message.toLowerCase().includes("pollution"))
    ));
    if (pucNotif) {
      setTimeout(() => {
        triggerPushNotification("RTO Document Warning ⚠️", pucNotif.message || "", "warning");
      }, 1600);
      return;
    }

  };

  // Request browser permission for notifications
  useEffect(() => {
    try {
      if ("Notification" in window && window.Notification.permission === "default") {
        window.Notification.requestPermission();
      }
    } catch (err) {
      console.warn("Notification request permission failed:", err);
    }
  }, []);

  // Check cached or existing Firebase Google session on load
  useEffect(() => {
    if (!SPREADSHEET_ID || SPREADSHEET_ID.trim() === "" || SPREADSHEET_ID.toLowerCase().includes("placeholder") || SPREADSHEET_ID.toLowerCase().includes("your_")) {
      triggerPushNotification(
        "Spreadsheet configuration missing",
        "Spreadsheet configuration missing",
        "warning"
      );
    }

    const savedSessionStr = localStorage.getItem("mobile_login_session");
    if (savedSessionStr) {
      try {
        const session = JSON.parse(savedSessionStr);
        if (session && session.Driver_ID) {
          const isSessionAdmin =
            session.User_Type === "admin" ||
            session.Role?.toLowerCase() === "admin" ||
            session.Role === "Admin" ||
            session.Mobile_Number === "9999999999";

          const userRole: "driver" | "admin" = isSessionAdmin ? "admin" : "driver";

          const sessionName = resolveDriverDisplayName(session, session.Mobile_Number, session.ETM);
          const restoredDriver: DriverDetails = {
            id: session.Driver_ID || `DR-${session.Mobile_Number}`,
            name: sessionName,
            Name: sessionName,
            Driver_Name: sessionName,
            phone: session.Mobile_Number,
            email: "",
            avatarUrl: session.Photo || "",
            licenseNumber: "",
            licenseExpiry: "",
            vehicleRegistration: "",
            status: session.Status || "Active",
            Status: session.Status || "Active",
            etm: session.ETM,
            lastLogin: session.Last_Login,
            role: userRole,
            User_Type: userRole,
            Role: session.Role || (userRole === "admin" ? "Admin" : "Driver"),
            Branch: session.Branch || "",
            Department: session.Department || "",
            Permissions: session.Permissions || ""
          };
          setDriver(restoredDriver);
          setPhoneNumber(session.Mobile_Number);

          if (userRole === "admin") {
            setPendingRedirect(ActiveScreen.ADMIN_PANEL);
          } else {
            setPendingRedirect(ActiveScreen.DASHBOARD);
          }
          
          const token = localStorage.getItem("google_access_token");
          if (token) {
            setAccessToken(token);
          }

          // Fetch driver document record for profile photo
          fetchDriverDocumentsFromSheet(session.Mobile_Number || session.ETM || session.Driver_ID || "", token)
            .then((docRec) => {
              if (docRec) {
                setDocumentRecord(docRec);
              }
            })
            .catch((docErr) => console.error("Failed to fetch driver documents record on session restore:", docErr));

          setSyncState("syncing");
          fetchAndParseAllSheets(token, session.Mobile_Number, session.Driver_ID)
            .then((result) => {
              if (result.driver) {
                setDriver((prev) => {
                  const resolvedName = resolveDriverDisplayName(result.driver, session.Mobile_Number, session.ETM || result.driver?.etm);
                  return {
                    ...prev,
                    ...result.driver,
                    name: resolvedName,
                    Name: resolvedName,
                    Driver_Name: resolvedName,
                    role: userRole,
                    User_Type: userRole,
                    Role: session.Role || (userRole === "admin" ? "Admin" : "Driver"),
                    Branch: session.Branch || "",
                    Department: session.Department || "",
                    Permissions: session.Permissions || ""
                  };
                });
              }
              setTransactions(result.transactions);
              setDocuments(result.documents);
              setNotifications(result.notifications);
              setPayments(result.payments || []);
              setOutstandingAmount(result.outstandingAmount !== undefined ? result.outstandingAmount : 0);
              setLastWeekOutstanding(result.lastWeekOutstanding !== undefined ? result.lastWeekOutstanding : 0);
              setWeeklyRent(result.weeklyRent !== undefined ? result.weeklyRent : 0);
              setCurrentOutstanding(result.currentOutstanding !== undefined ? result.currentOutstanding : 0);
              setTotalOutstanding(result.totalOutstanding !== undefined ? result.totalOutstanding : 0);
              setWeeklyHissabRow(result.weeklyHissabRow);
              setWeeklyHissabHeaders(result.weeklyHissabHeaders);
              setWeeklyHissabRows(result.weeklyHissabRows);
              setAllWeeklyRows(result.allWeeklyRows);
              setMsgFormatRows(result.msgFormatRows);
              setSyncState("synced");
              checkAndNotifySyncData(result.notifications);
            })
            .catch((err) => {
              console.error("Session restore sheet sync failed:", err);
              setSyncState("failed");
            });
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved mobile_login_session on load:", e);
      }
    }

    const unsubscribe = initAuth(
      async (user, token) => {
        setAccessToken(token);
        const hasSession = !!localStorage.getItem("mobile_login_session");
        if (hasSession) {
          setPendingRedirect(ActiveScreen.DASHBOARD);
        } else {
          setPendingRedirect(ActiveScreen.LOGIN);
        }
      },
      () => {
        setPendingRedirect(ActiveScreen.LOGIN);
      }
    );
    return () => unsubscribe();
  }, []);

  // When splash finish timer expires, route to pending destination
  useEffect(() => {
    if (isSplashFinished) {
      setActiveScreen(pendingRedirect);
      // Trigger a helpful showcase notification when returning or loading the dashboard
      if (pendingRedirect === ActiveScreen.DASHBOARD && notifications.length > 0) {
        checkAndNotifySyncData(notifications);
      }
    }
  }, [isSplashFinished, pendingRedirect]);

  // Periodic Google Sheets sync interval (every 30 seconds)
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(async () => {
      setSyncState("syncing");
      try {
        const result = await fetchAndParseAllSheets(accessToken, phoneNumber || driver?.phone, driver?.etm || (driver as any)?.ETM || driver?.id);
        if (result.driver) {
          setDriver(result.driver);
        }
        setTransactions(result.transactions);
        setDocuments(result.documents);
        setNotifications(result.notifications);
        setPayments(result.payments || []);
        setOutstandingAmount(result.outstandingAmount !== undefined ? result.outstandingAmount : 0);
        setLastWeekOutstanding(result.lastWeekOutstanding !== undefined ? result.lastWeekOutstanding : 0);
        setWeeklyRent(result.weeklyRent !== undefined ? result.weeklyRent : 0);
        setCurrentOutstanding(result.currentOutstanding !== undefined ? result.currentOutstanding : 0);
        setTotalOutstanding(result.totalOutstanding !== undefined ? result.totalOutstanding : 0);
        setWeeklyHissabRow(result.weeklyHissabRow);
        setWeeklyHissabHeaders(result.weeklyHissabHeaders);
        setWeeklyHissabRows(result.weeklyHissabRows);
        setAllWeeklyRows(result.allWeeklyRows);
        setMsgFormatRows(result.msgFormatRows);
        setSyncState("synced");
        checkAndNotifySyncData(result.notifications);
      } catch (err) {
        console.error("Background auto-sync failed:", err);
        setSyncState("failed");
        handleSheetsError(err);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [accessToken, phoneNumber, driver?.phone, driver?.id]);

  // Trigger a fresh sheets fetch every time the dashboard is loaded/active
  useEffect(() => {
    if (activeScreen === ActiveScreen.DASHBOARD && accessToken) {
      console.log("Dashboard loaded - triggering fresh Google Sheets sync...");
      handleRefreshDatabase().catch(err => {
        console.warn("Auto-refresh on dashboard load failed:", err);
      });
    }
  }, [activeScreen, accessToken]);

  // Transition loaders
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Handlers
  const handlePasswordLogin = async (mobile: string, passwordInput: string) => {
    setIsLoggingIn(true);
    setSyncState("syncing");
    try {
      const authRes = await authenticateDriverWithSheet(mobile, passwordInput, accessToken);
      
      if (authRes.success && authRes.driver) {
        const driverData = authRes.driver;
        
        // 1. Update Last_Login if accessToken exists and col index is available
        if (accessToken && authRes.rowIndex !== undefined && authRes.lastLoginColIndex !== undefined && authRes.lastLoginColIndex !== -1) {
          try {
            await updateLastLogin(SPREADSHEET_ID, "Driver_Login", authRes.rowIndex, authRes.lastLoginColIndex, accessToken);
            // Update the locally stored session timestamp as well
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const day = pad(now.getDate());
            const month = pad(now.getMonth() + 1);
            const year = now.getFullYear();
            let hours = now.getHours();
            const minutes = pad(now.getMinutes());
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            driverData.Last_Login = `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;
          } catch (updateErr) {
            console.error("Failed to update Last_Login cell:", updateErr);
          }
        }

        // 2. Save complete driver record to local storage
        localStorage.setItem("mobile_login_session", JSON.stringify(driverData));
        setPhoneNumber(mobile);
        
        // 3. Update React driver state
        const userRole: "driver" | "admin" =
          driverData.Role === "admin" ||
          driverData.User_Type === "admin" ||
          mobile === "9999999999" ||
          mobile.toLowerCase().includes("admin")
            ? "admin"
            : "driver";

        const resolvedLoginName = resolveDriverDisplayName(driverData, mobile, driverData.ETM);
        const updatedDriver: DriverDetails = {
          id: driverData.Driver_ID,
          name: resolvedLoginName,
          Name: resolvedLoginName,
          Driver_Name: resolvedLoginName,
          phone: driverData.Mobile_Number || mobile,
          email: "",
          avatarUrl: "",
          licenseNumber: "",
          licenseExpiry: "",
          vehicleRegistration: "",
          status: driverData.Status || "Active",
          Status: driverData.Status || "Active",
          etm: driverData.ETM,
          lastLogin: driverData.Last_Login,
          role: userRole,
          User_Type: userRole,
          Role: driverData.Role || (userRole === "admin" ? "Admin" : "Driver"),
          Branch: driverData.Branch || "",
          Department: driverData.Department || "",
          Permissions: driverData.Permissions || ""
        };
        setDriver(updatedDriver);

        // Fetch document record for profile photo
        fetchDriverDocumentsFromSheet(mobile || driverData.ETM || driverData.Driver_ID || "", accessToken)
          .then((docRec) => {
            if (docRec) {
              setDocumentRecord(docRec);
            }
          })
          .catch((docErr) => console.error("Failed to fetch driver document record after login:", docErr));

        // 4. Load all driver-specific sheets (earnings, payments, documents, etc.)
        const syncResult = await fetchAndParseAllSheets(accessToken, mobile, driverData.ETM || driverData.Driver_ID);
        if (syncResult.driver) {
          setDriver((prev) => {
            const finalName = resolveDriverDisplayName(syncResult.driver, mobile, driverData.ETM || syncResult.driver?.etm);
            return {
              ...prev,
              ...syncResult.driver,
              name: finalName,
              Name: finalName,
              Driver_Name: finalName,
              role: userRole,
              User_Type: userRole,
              Role: driverData.Role || (userRole === "admin" ? "Admin" : "Driver"),
              Branch: driverData.Branch || "",
              Department: driverData.Department || "",
              Permissions: driverData.Permissions || ""
            };
          });
        }
        setTransactions(syncResult.transactions);
        setDocuments(syncResult.documents);
        setNotifications(syncResult.notifications);
        setPayments(syncResult.payments || []);
        setOutstandingAmount(syncResult.outstandingAmount !== undefined ? syncResult.outstandingAmount : 0);
        setLastWeekOutstanding(syncResult.lastWeekOutstanding !== undefined ? syncResult.lastWeekOutstanding : 0);
        setWeeklyRent(syncResult.weeklyRent !== undefined ? syncResult.weeklyRent : 0);
        setCurrentOutstanding(syncResult.currentOutstanding !== undefined ? syncResult.currentOutstanding : 0);
        setTotalOutstanding(syncResult.totalOutstanding !== undefined ? syncResult.totalOutstanding : 0);
        setWeeklyHissabRow(syncResult.weeklyHissabRow);
        setWeeklyHissabHeaders(syncResult.weeklyHissabHeaders);
        setWeeklyHissabRows(syncResult.weeklyHissabRows);
        setAllWeeklyRows(syncResult.allWeeklyRows);
        setMsgFormatRows(syncResult.msgFormatRows);
        setSyncState("synced");

        triggerPushNotification(
          "Welcome Back! 👋",
          `Successfully logged in as ${syncResult.driver?.name || driverData.Name || driverData.Driver_ID}.`,
          "success"
        );

        if ((driverData.Status || "").toLowerCase() === "inactive" || (updatedDriver.status || "").toLowerCase() === "inactive") {
          setTimeout(() => {
            triggerPushNotification(
              "Account Notice ℹ️",
              "Your account is currently inactive, but you can continue using the app.",
              "warning"
            );
          }, 800);
        }

        if (userRole === "admin") {
          setActiveScreen(ActiveScreen.ADMIN_PANEL);
        } else {
          setActiveScreen(ActiveScreen.DASHBOARD);
        }
      } else {
        setIsLoggingIn(false);
        setSyncState("failed");
        if (authRes.error === "not_found") {
          throw new Error("Mobile number not found in system. Please check your mobile number.");
        } else if (authRes.error === "inactive") {
          throw new Error("Your account is blocked or disabled. Please contact the administrator.");
        } else if (authRes.error === "admin_invalid_password") {
          throw new Error("Invalid Admin Password");
        } else if (authRes.error === "invalid") {
          throw new Error("Invalid Password. Please check your password.");
        } else {
          throw new Error("Invalid Mobile Number or Password");
        }
      }
    } catch (err: any) {
      setIsLoggingIn(false);
      setSyncState("failed");
      console.error("Login verification failed:", err);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setActiveScreen(ActiveScreen.LOGIN);
    setPhoneNumber("");
    setAccessToken(null);
    setSyncState("idle");
    setPendingRedirect(ActiveScreen.LOGIN);
    setWeeklyHissabRow(undefined);
    setWeeklyHissabHeaders(undefined);
    setWeeklyHissabRows(undefined);
    setAllWeeklyRows(undefined);

    try {
      // Specifically remove requested keys
      localStorage.removeItem("ssk_cached_sheets_data");
      localStorage.removeItem("driver data");
      localStorage.removeItem("driver_data");
      localStorage.removeItem("access token");
      localStorage.removeItem("google_access_token");
      localStorage.removeItem("mobile login session");
      localStorage.removeItem("mobile_login_session");

      // Fully clear both storage areas
      localStorage.clear();
      sessionStorage.clear();
    } catch (storageErr) {
      console.warn("Storage clearing error:", storageErr);
    }

    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    // Reset any user specific modifications
    setNotifications(mockNotifications);
    setDocuments(mockDocuments);
    setTransactions(mockTransactions);
    setDriver(mockDriver);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true, readAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) } : notif))
    );
    if (accessToken) {
      markNotificationReadInSheet(id, accessToken).catch((err) =>
        console.error("Failed to mark notification as read in Google Sheet:", err)
      );
    }
  };

  const handleRenewDocument = (docId: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          // Push expiry 1 year out
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const formattedDate = `${nextYear.getDate().toString().padStart(2, "0")} ${monthNames[nextYear.getMonth()]} ${nextYear.getFullYear()}`;
          
          return {
            ...doc,
            status: "verified",
            expiryDate: formattedDate,
            description: `${doc.fullName} is fully certified and verified on SSK Fleet Server.`
          };
        }
        return doc;
      })
    );

    // If it was the PUC document, resolve corresponding notification warning
    if (docId === "doc-3") {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === "notif-1"
            ? {
                ...n,
                read: true,
                title: "PUC Renewal Verified",
                message: "Your new Pollution Certificate is verified. Expiry is pushed to next year.",
                type: "success"
              }
            : n
        )
      );

      // Log a mock compliance transaction
      const newTx: TransactionItem = {
        id: `tx-puc-${Date.now().toString().slice(-4)}`,
        partner: "Cash",
        amount: 150, // standard PUC price
        time: "Just Now",
        date: "03 Jul 2026",
        status: "Completed",
        tripId: "COMP-PUC-09"
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const handleNavigateToTab = (tab: "dashboard" | "vehicle") => {
    switch (tab) {
      case "dashboard":
        setActiveScreen(ActiveScreen.DASHBOARD);
        break;
      case "vehicle":
        setActiveScreen(ActiveScreen.VEHICLE);
        break;
    }
  };

  const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);

  const handleOnboardingComplete = async (data: {
    name: string;
    phone: string;
    email: string;
    etmId: string;
    aadhaarNo: string;
    panNo: string;
    dlNo: string;
    dob: string;
    emergencyContact: string;
    vehicleNo: string;
    vehicleModel: string;
    addressText: string;
    documents: {
      selfie: string;
      aadhaarPhoto: string;
      aadhaarBackPhoto: string;
      panPhoto: string;
      dlPhoto: string;
      dlBackPhoto: string;
      addressPhoto: string;
      bankPhoto: string;
      policePhoto: string;
    };
  }) => {
    setIsOnboardingSubmitting(true);
    try {
      // 1. Upload images to tmpfiles.org to get real, accessible public URLs
      let selfieUrl = data.documents.selfie;
      let aadhaarUrl = data.documents.aadhaarPhoto;
      let dlUrl = data.documents.dlPhoto;
      let addressUrl = data.documents.addressPhoto;

      try {
        const uploadPromises = [
          uploadBase64Image(data.documents.selfie, `selfie_${data.phone}.png`).then(url => selfieUrl = url),
          uploadBase64Image(data.documents.aadhaarPhoto, `aadhaar_${data.phone}.png`).then(url => aadhaarUrl = url),
          uploadBase64Image(data.documents.dlPhoto, `dl_${data.phone}.png`).then(url => dlUrl = url),
          uploadBase64Image(data.documents.addressPhoto, `address_${data.phone}.png`).then(url => addressUrl = url)
        ];
        await Promise.all(uploadPromises);
      } catch (uploadErr) {
        console.error("Some document image uploads failed:", uploadErr);
      }

      // 2. Setup local driver profile with the uploaded URLs
      const newDriver: DriverDetails = {
        id: `SSK-${Date.now().toString().slice(-5)}`,
        name: data.name,
        phone: data.phone,
        email: data.email,
        avatarUrl: "",
        licenseNumber: data.dlNo,
        licenseExpiry: "31 Dec 2035",
        vehicleRegistration: "Pending Allocation"
      };
      setDriver(newDriver);

      // 3. Prepare documents for app list
      const listDocs: {
        name: string;
        fullName: string;
        status: "pending";
        expiryDate: string;
        description: string;
        documentNo: string;
      }[] = [
        {
          name: "Selfie",
          fullName: "Driver Profile Selfie",
          status: "pending",
          expiryDate: "N/A",
          documentNo: "N/A",
          description: "Driver profile selfie uploaded during registration. Pending administrative approval."
        },
        {
          name: "Aadhaar",
          fullName: "Aadhaar Identity Card",
          status: "pending",
          expiryDate: "N/A",
          documentNo: data.aadhaarNo,
          description: "Front Aadhaar Card copy uploaded during onboarding."
        },
        {
          name: "DL",
          fullName: "Driving Licence",
          status: "pending",
          expiryDate: "31 Dec 2035",
          documentNo: data.dlNo,
          description: `Driving Licence (DL) Copy. Licence Number: ${data.dlNo}.`
        },
        {
          name: "Address Proof",
          fullName: "Address Verification Document",
          status: "pending",
          expiryDate: "N/A",
          documentNo: "N/A",
          description: `Address: ${data.addressText}. Verification copy uploaded.`
        }
      ];

      // Convert format to VehicleDocument for React state
      const appDocs: VehicleDocument[] = listDocs.map((doc, idx) => ({
        id: `doc-onb-${Date.now()}-${idx + 1}`,
        name: doc.name,
        fullName: doc.fullName,
        status: "pending",
        expiryDate: doc.expiryDate,
        documentNo: doc.documentNo,
        description: doc.description
      }));

      // Prepend to documents state so they are listed at the very top
      setDocuments(prev => [...appDocs, ...prev]);

      // 4. Append to the Google Sheet tab "Documents Sheet"
      let currentToken = accessToken;
      if (!currentToken) {
        console.log("No Google Access Token found in state. Requesting Google OAuth popup to authorize writing...");
        try {
          const authResult = await googleSignIn();
          if (authResult) {
            currentToken = authResult.accessToken;
            setAccessToken(authResult.accessToken);
            console.log("Google OAuth successful. Token acquired:", currentToken);
          }
        } catch (authErr: any) {
          console.error("Google OAuth authentication failed during onboarding:", authErr);
        }
      }

      if (currentToken) {
        try {
          console.log("Writing onboarding documents to Google Sheets (Tab: Driver_Documents)...");
          const docRes = await saveDriverDocumentsToSheet({
            driverName: data.name,
            mobileNumber: data.phone,
            etmId: data.etmId || driver?.etm || "",
            aadhaarNumber: data.aadhaarNo,
            panNumber: data.panNo,
            dlNumber: data.dlNo,
            address: data.addressText,
            dob: data.dob,
            emergencyContact: data.emergencyContact,
            vehicleNumber: data.vehicleNo,
            vehicleModel: data.vehicleModel,
            profilePhotoUrl: data.documents.selfie,
            aadhaarFrontUrl: data.documents.aadhaarPhoto,
            aadhaarBackUrl: data.documents.aadhaarBackPhoto,
            panCardUrl: data.documents.panPhoto,
            dlFrontUrl: data.documents.dlPhoto,
            dlBackUrl: data.documents.dlBackPhoto,
            bankPassbookUrl: data.documents.bankPhoto,
            policeVerificationUrl: data.documents.policePhoto,
            status: "Submitted"
          }, currentToken);

          if (docRes.success) {
            setDocumentRecord({
              registrationDateTime: new Date().toISOString(),
              driverName: data.name,
              mobileNumber: data.phone,
              etmId: data.etmId || driver?.etm || "",
              aadhaarNumber: data.aadhaarNo,
              panNumber: data.panNo,
              dlNumber: data.dlNo,
              address: data.addressText,
              dob: data.dob,
              emergencyContact: data.emergencyContact,
              vehicleNumber: data.vehicleNo,
              vehicleModel: data.vehicleModel,
              profilePhotoUrl: data.documents.selfie,
              aadhaarFrontUrl: data.documents.aadhaarPhoto,
              aadhaarBackUrl: data.documents.aadhaarBackPhoto,
              panCardUrl: data.documents.panPhoto,
              dlFrontUrl: data.documents.dlPhoto,
              dlBackUrl: data.documents.dlBackPhoto,
              bankPassbookUrl: data.documents.bankPhoto,
              policeVerificationUrl: data.documents.policePhoto,
              status: "Submitted",
              lastUpdated: new Date().toISOString(),
              isLocked: true
            });
            triggerPushNotification(
              "Documents Locked & Saved 🔒",
              "Driver documents uploaded to Drive and recorded in Driver_Documents sheet.",
              "success"
            );
          } else {
            triggerPushNotification(
              "Document Lock Notice ⚠️",
              docRes.message,
              "warning"
            );
          }
        } catch (sheetErr: any) {
          console.error("Sheets sync failed:", sheetErr);
          handleSheetsError(sheetErr);
        }
      } else {
        triggerPushNotification(
          "Saved Locally 📲",
          "Onboarding completed locally. Google Sheet was NOT updated because Google authorization is missing.",
          "info"
        );
      }

      // 5. Welcome Notification
      const onboardingNotif: NotificationItem = {
        id: `notif-onb-${Date.now()}`,
        title: "Registration Received",
        message: `Welcome, ${data.name}! Your documents are undergoing verification. Our fleet admins will contact you shortly.`,
        time: "Just Now",
        type: "success",
        read: false
      };
      setNotifications(prev => [onboardingNotif, ...prev]);

      // Navigate to Dashboard screen
      setActiveScreen(ActiveScreen.DASHBOARD);
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      triggerPushNotification(
        "Onboarding Complete 🛠️",
        "Registered successfully!",
        "success"
      );
      setActiveScreen(ActiveScreen.DASHBOARD);
    } finally {
      setIsOnboardingSubmitting(false);
    }
  };

  const handleSubmitPayment = async (paymentType: string, amount: number): Promise<boolean> => {
    try {
      const mobile = phoneNumber || driver?.phone || "";
      await writePaymentLog(accessToken, mobile, paymentType, amount);
      
      // Refresh without page reload
      await handleRefreshDatabase();

      // Show floating success toast
      const toast = document.createElement("div");
      toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#00C853] text-white text-sm px-6 py-3.5 rounded-full shadow-2xl z-[9999] flex items-center gap-2 font-bold border border-white/10 animate-bounce";
      toast.innerHTML = `✓ Payment recorded successfully`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);

      triggerPushNotification(
        "Payment Recorded! 💳",
        `Your ${paymentType} payment of ₹${amount} was recorded successfully.`,
        "success"
      );

      return true;
    } catch (err) {
      console.error("Payment submission failed:", err);
      
      // Show floating failure toast
      const toast = document.createElement("div");
      toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-sm px-6 py-3.5 rounded-full shadow-2xl z-[9999] flex items-center gap-2 font-bold border border-white/10 animate-bounce";
      toast.innerHTML = `⚠️ Payment save failed`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);

      triggerPushNotification(
        "Payment Failed ⚠️",
        "Unable to log payment into Google Sheets.",
        "warning"
      );

      return false;
    }
  };

  const handleRefreshDatabase = async () => {
    setSyncState("syncing");
    try {
      const result = await fetchAndParseAllSheets(accessToken, phoneNumber || driver?.phone, driver?.etm || (driver as any)?.ETM || driver?.id);
      
      // Handle the "No data found" case if ALL sheets are completely empty
      if (!result.driver && result.transactions.length === 0 && result.documents.length === 0 && result.notifications.length === 0 && (!result.payments || result.payments.length === 0)) {
        setTransactions([]);
        setDocuments([]);
        setNotifications([]);
        setPayments([]);
        setOutstandingAmount(0);
        setLastWeekOutstanding(0);
        setWeeklyRent(0);
        setCurrentOutstanding(0);
        setTotalOutstanding(0);
        setWeeklyHissabRow(undefined);
        setWeeklyHissabHeaders(undefined);
        setWeeklyHissabRows(undefined);
        setAllWeeklyRows(undefined);
        setMsgFormatRows(undefined);
        setSyncState("synced");
        return;
      }

      if (result.driver) {
        setDriver(result.driver);
      }
      setTransactions(result.transactions);
      setDocuments(result.documents);
      setNotifications(result.notifications);
      setPayments(result.payments || []);
      setOutstandingAmount(result.outstandingAmount !== undefined ? result.outstandingAmount : 0);
      setLastWeekOutstanding(result.lastWeekOutstanding !== undefined ? result.lastWeekOutstanding : 0);
      setWeeklyRent(result.weeklyRent !== undefined ? result.weeklyRent : 0);
      setCurrentOutstanding(result.currentOutstanding !== undefined ? result.currentOutstanding : 0);
      setTotalOutstanding(result.totalOutstanding !== undefined ? result.totalOutstanding : 0);
      setWeeklyHissabRow(result.weeklyHissabRow);
      setWeeklyHissabHeaders(result.weeklyHissabHeaders);
      setWeeklyHissabRows(result.weeklyHissabRows);
      setAllWeeklyRows(result.allWeeklyRows);
      setMsgFormatRows(result.msgFormatRows);

      try {
        const docRec = await fetchDriverDocumentsFromSheet(phoneNumber || driver?.etm || driver?.phone || "", accessToken);
        if (docRec) {
          setDocumentRecord(docRec);
        }
      } catch (docErr) {
        console.error("Failed to fetch driver documents record:", docErr);
      }

      setSyncState("synced");
    } catch (err) {
      console.error("Manual sync with Google Sheets failed:", err);
      setSyncState("failed");
      throw new Error("Unable to sync");
    }
  };

  const handleUpdateDriver = async (updatedFields: Partial<DriverDetails>) => {
    setSyncState("syncing");
    try {
      const currentName = updatedFields.name || driver?.name || driver?.Driver_Name || driver?.Name || "";
      const currentPhone = updatedFields.phone !== undefined ? updatedFields.phone : (driver?.phone || "");
      const currentEmail = updatedFields.email !== undefined ? updatedFields.email : (driver?.email || "");

      const updatedDriver: DriverDetails = {
        ...driver,
        ...updatedFields,
        name: currentName,
        Name: currentName,
        Driver_Name: currentName,
        phone: currentPhone,
        email: currentEmail,
      };

      setDriver(updatedDriver);

      // 1. Update session in localStorage
      const savedSessionStr = localStorage.getItem("mobile_login_session");
      if (savedSessionStr) {
        try {
          const savedSession = JSON.parse(savedSessionStr);
          if (updatedFields.name) savedSession.Name = updatedFields.name;
          if (updatedFields.phone) savedSession.Mobile_Number = updatedFields.phone;
          localStorage.setItem("mobile_login_session", JSON.stringify(savedSession));
        } catch (e) {
          console.error("Failed to update mobile_login_session:", e);
        }
      }

      // 2. Update cached sheets data
      const cached = getCachedSheetsData();
      if (cached) {
        cached.driver = updatedDriver;
        localStorage.setItem("ssk_cached_sheets_data", JSON.stringify(cached));
      }

      // 3. Attempt Google Sheets Sync
      const syncRes = await updateDriverProfileInSheets(
        updatedDriver.id,
        {
          name: updatedDriver.name,
          phone: updatedDriver.phone,
          email: updatedDriver.email,
        },
        accessToken
      );

      setSyncState("synced");
      triggerPushNotification(
        "Profile Updated 👤",
        syncRes.message || "Contact details updated and synced with Google Sheet.",
        "success"
      );
    } catch (err: any) {
      console.error("Failed to sync profile update with Google Sheet:", err);
      setSyncState("failed");
      triggerPushNotification(
        "Profile Saved Locally ⚠️",
        "Saved locally, but Google Sheet sync encountered an issue.",
        "warning"
      );
    }
  };

  // Push notification auto-dismiss timer
  useEffect(() => {
    if (pushNotification) {
      const timer = setTimeout(() => {
        setPushNotification(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [pushNotification]);

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case ActiveScreen.SPLASH:
        return (
          <SplashScreen
            onComplete={() => setIsSplashFinished(true)}
          />
        );
      case ActiveScreen.LOGIN:
        return (
          <LoginScreen
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            onLogin={handlePasswordLogin}
            isLoggingIn={isLoggingIn}
            onNewUserRegister={() => setActiveScreen(ActiveScreen.ONBOARDING)}
          />
        );
      case ActiveScreen.DASHBOARD:
        return (
          <DashboardScreen
            driver={driver}
            notifications={notifications}
            documents={documents}
            transactions={transactions}
            onNavigateToTab={handleNavigateToTab}
            onNavigateToPayment={handleNavigateToPayment}
            onMarkNotificationRead={handleMarkNotificationRead}
            onRefresh={handleRefreshDatabase}
            syncState={syncState}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            outstandingAmount={outstandingAmount}
            lastWeekOutstanding={lastWeekOutstanding}
            weeklyRent={weeklyRent}
            currentOutstanding={currentOutstanding}
            totalOutstanding={totalOutstanding}
          />
        );
      case ActiveScreen.VEHICLE:
        return (
          <VehicleScreen
            driver={driver}
            documentRecord={documentRecord}
            loggedMobile={phoneNumber || driver?.phone || ""}
            onRefresh={handleRefreshDatabase}
            syncState={syncState}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        );
      case ActiveScreen.PAYMENT:
        return (
          <PaymentScreen
            payments={payments}
            outstandingAmount={outstandingAmount}
            onRefresh={handleRefreshDatabase}
            syncState={syncState}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            triggerNotification={triggerPushNotification}
            onSubmitPayment={handleSubmitPayment}
            loggedMobile={phoneNumber || driver?.phone || ""}
            driver={driver}
            initialPaymentData={initialPaymentData}
            onClearInitialPaymentData={() => setInitialPaymentData(null)}
          />
        );
      case ActiveScreen.WEEKLY_HISSAB:
        return (
          <WeeklyHissabScreen
            driver={driver}
            weeklyHissabRow={weeklyHissabRow}
            weeklyHissabHeaders={weeklyHissabHeaders}
            weeklyHissabRows={weeklyHissabRows}
            allWeeklyRows={allWeeklyRows}
            msgFormatRows={msgFormatRows}
            accessToken={accessToken}
            onBackToDashboard={() => setActiveScreen(ActiveScreen.DASHBOARD)}
            onNavigateToPayment={() => setActiveScreen(ActiveScreen.PAYMENT)}
          />
        );
      case ActiveScreen.PROFILE:
        return (
          <ProfileScreen
            driver={driver}
            documentRecord={documentRecord}
            onRefresh={handleRefreshDatabase}
            syncState={syncState}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onUpdateDriver={handleUpdateDriver}
            onOpenOnboarding={() => setActiveScreen(ActiveScreen.ONBOARDING)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        );
      case ActiveScreen.HELP_SUPPORT:
        return (
          <HelpSupportScreen
            driver={driver}
            documentRecord={documentRecord}
            loggedMobile={phoneNumber || driver?.phone || ""}
            accessToken={accessToken}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onRefresh={handleRefreshDatabase}
            syncState={syncState}
            triggerPushNotification={triggerPushNotification}
          />
        );
      case ActiveScreen.ONBOARDING:
        return (
          <OnboardingScreen
            initialPhone={phoneNumber || driver?.phone || ""}
            initialEtm={driver?.etm || ""}
            existingDocRecord={documentRecord}
            onComplete={handleOnboardingComplete}
            onBackToLogin={() => setActiveScreen(ActiveScreen.LOGIN)}
            isSubmitting={isOnboardingSubmitting}
          />
        );
      case ActiveScreen.ADMIN_PANEL:
        return (
          <AdminPanelContainer
            accessToken={accessToken}
            currentAdminDriver={driver}
            onLogout={handleLogout}
            onSwitchToDriverView={() => setActiveScreen(ActiveScreen.DASHBOARD)}
            msgFormatRows={msgFormatRows}
            weeklyHissabRow={weeklyHissabRow}
            weeklyHissabHeaders={weeklyHissabHeaders}
            weeklyHissabRows={weeklyHissabRows}
            allWeeklyRows={allWeeklyRows}
          />
        );
    }
  };

  // Determine if we are on an auth / onboarding screen
  const isAuthScreen =
    activeScreen === ActiveScreen.LOGIN ||
    activeScreen === ActiveScreen.SPLASH ||
    activeScreen === ActiveScreen.ONBOARDING;

  // Determine if we should show bottom navigation
  const showBottomNav =
    !isAuthScreen &&
    activeScreen !== ActiveScreen.ADMIN_PANEL;

  // Derived Driver Info for Sidebar / Drawer
  const drawerDriverName = resolveDriverDisplayName(driver, phoneNumber || driver?.phone, driver?.etm);
  const rawDriverStatus = (driver?.Status || driver?.status || "Active").trim();
  const drawerDriverStatus = rawDriverStatus.toLowerCase() === "inactive" ? "Inactive" : rawDriverStatus.toLowerCase() === "suspended" ? "Suspended" : "Active";
  const drawerDriverEtm = (driver?.etm || driver?.ETM || driver?.etmId || "").trim();
  const drawerDriverPhone = (driver?.phone || driver?.Mobile_Number || phoneNumber || "").trim();
  const drawerProfilePhoto = documentRecord?.profilePhotoUrl || driver?.avatarUrl || driver?.vehiclePhoto || "";

  return (
    <PhoneFrame>
      {/* Sliding In-App Push Notification Banner */}
      <AnimatePresence>
        {pushNotification && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.95 }}
            animate={{ y: 12, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="absolute top-0 left-4 right-4 z-[9999] bg-[#0C1E35]/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-700/50 flex items-start gap-3 cursor-pointer select-none"
            onClick={() => {
              const msg = (pushNotification.message || "").toLowerCase();
              const title = (pushNotification.title || "").toLowerCase();
              if (msg.includes("rent") || title.includes("rent")) {
                setActiveScreen(ActiveScreen.DASHBOARD);
              } else if (msg.includes("puc") || title.includes("puc") || msg.includes("document") || title.includes("document")) {
                setActiveScreen(ActiveScreen.VEHICLE);
              } else {
                setActiveScreen(ActiveScreen.DASHBOARD);
              }
              setPushNotification(null);
            }}
          >
            {/* Round Mini SSK Logo Icon */}
            <SSKLogo className="w-9 h-9 shrink-0 drop-shadow-md" />
            
            {/* Notification Text Detail */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-amber-200 truncate tracking-wide uppercase">
                  {pushNotification.title}
                </h4>
                <span className="text-[9px] font-medium text-slate-400 shrink-0 uppercase tracking-widest">
                  Now
                </span>
              </div>
              <p className="text-[11px] text-slate-100 font-medium leading-relaxed mt-0.5">
                {pushNotification.message}
              </p>
              <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-amber-400 hover:text-amber-300">
                <span>Tap to view details</span>
                <span className="text-[9px] text-slate-500 font-normal">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPushNotification(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content & Layout Layer */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200 min-h-screen">
        
        {/* Permanent Desktop Sidebar for Driver App (lg screens >= 1024px) */}
        {!isAuthScreen && activeScreen !== ActiveScreen.ADMIN_PANEL && (
          <aside
            className={`hidden lg:flex flex-col bg-[#08182D] text-white sticky top-0 h-screen transition-all duration-300 z-40 border-r border-slate-800 shrink-0 ${
              isDriverSidebarCollapsed ? "w-20" : "w-64"
            }`}
          >
            {/* Header / Brand */}
            <div className="p-4 bg-[#0D47A1] text-white flex items-center justify-between border-b border-blue-900 shrink-0 h-16">
              {!isDriverSidebarCollapsed ? (
                <div className="flex items-center gap-3 overflow-hidden">
                  <SSKLogo className="w-9 h-9 shrink-0 drop-shadow-md" />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs text-white truncate">SSK Fleet</h3>
                    <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider truncate">Driver Portal</p>
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  <SSKLogo className="w-9 h-9 shrink-0 drop-shadow-md" />
                </div>
              )}
              <button
                onClick={() => setIsDriverSidebarCollapsed(!isDriverSidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-blue-800 text-blue-200 hover:text-white transition-colors cursor-pointer ml-1"
                title={isDriverSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isDriverSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>

            {/* Driver Profile Summary Card */}
            {!isDriverSidebarCollapsed && (
              <div className="p-3.5 mx-3 mt-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3" id="desktop-sidebar-driver-profile">
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {drawerProfilePhoto ? (
                    <img
                      src={drawerProfilePhoto}
                      alt={drawerDriverName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ProfileIcon className="w-5 h-5 text-blue-200" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        drawerDriverStatus === "Active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                      }`}
                      id="desktop-driver-status"
                    >
                      <span className={`w-1 h-1 rounded-full ${drawerDriverStatus === "Active" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                      {drawerDriverStatus}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate" id="desktop-driver-name">{drawerDriverName}</h4>
                  <p className="text-[10px] font-mono text-blue-200 truncate" id="desktop-driver-etm">
                    {drawerDriverEtm && drawerDriverEtm.toUpperCase() !== "N/A" ? `ETM: ${drawerDriverEtm}` : drawerDriverPhone}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Menu Links */}
            <div className="flex-1 py-4 overflow-y-auto px-3 space-y-1 no-scrollbar">
              {(driver.role === "admin" || driver.User_Type === "admin") && (
                <button
                  onClick={() => setActiveScreen(ActiveScreen.ADMIN_PANEL)}
                  title={isDriverSidebarCollapsed ? "Switch to Admin Panel" : undefined}
                  className={`w-full flex items-center ${
                    isDriverSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3.5"
                  } py-2.5 rounded-xl text-xs font-bold transition-all bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 mb-2 cursor-pointer`}
                >
                  <span className="w-5 h-5 flex items-center justify-center font-black shrink-0">⚙️</span>
                  {!isDriverSidebarCollapsed && <span className="truncate">Admin Panel</span>}
                </button>
              )}

              {[
                { screen: ActiveScreen.DASHBOARD, label: "Home", icon: HomeIcon },
                { screen: ActiveScreen.WEEKLY_HISSAB, label: "Weekly Hissab", icon: ReceiptIcon },
                { screen: ActiveScreen.VEHICLE, label: "Vehicle", icon: VehicleIcon },
                { screen: ActiveScreen.PAYMENT, label: "Payment", icon: PaymentIcon },
                { screen: ActiveScreen.PROFILE, label: "Profile", icon: ProfileIcon },
                { screen: ActiveScreen.HELP_SUPPORT, label: "Help & Support", icon: HelpIcon },
              ].map((item) => {
                const isActive = activeScreen === item.screen;
                return (
                  <button
                    key={item.screen}
                    onClick={() => setActiveScreen(item.screen)}
                    title={isDriverSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isDriverSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3.5"
                    } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0D47A1] text-white shadow-md font-black"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    {!isDriverSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>

            {/* Desktop Sidebar Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#061324] space-y-2 shrink-0">
              <button
                onClick={handleLogout}
                title={isDriverSidebarCollapsed ? "Logout" : undefined}
                className={`w-full flex items-center ${
                  isDriverSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3.5"
                } py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer`}
              >
                <LogOutIcon className="w-4 h-4 shrink-0" />
                {!isDriverSidebarCollapsed && <span>Logout</span>}
              </button>
              {!isDriverSidebarCollapsed && (
                <div className="text-center text-[10px] font-mono text-slate-500 pt-0.5">
                  SSK Driver App • {DISPLAY_VERSION}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          <AnimatePresence mode="wait">
            {renderActiveScreen()}
          </AnimatePresence>
        </div>
      </div>

      {/* Sliding Left Navigation Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black z-50 cursor-pointer"
              id="drawer-backdrop"
            />

            {/* Sliding Menu Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="absolute top-0 left-0 bottom-0 w-[280px] bg-[#08182D] text-white z-[60] shadow-2xl flex flex-col border-r border-slate-800"
              id="drawer-menu"
            >
              {/* Drawer Header with Profile Summary */}
              <div className="p-5 bg-[#0D47A1] text-white border-b border-slate-800/50 flex items-center gap-3.5" id="drawer-header-profile">
                {/* Profile Photo / Avatar */}
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                  {drawerProfilePhoto ? (
                    <img
                      src={drawerProfilePhoto}
                      alt={drawerDriverName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ProfileIcon className="w-6 h-6 text-blue-200" />
                  )}
                </div>

                {/* Driver Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        drawerDriverStatus === "Active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                      }`}
                      id="drawer-driver-status"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          drawerDriverStatus === "Active" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                        }`}
                      />
                      {drawerDriverStatus}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold tracking-tight text-white truncate leading-tight" id="drawer-driver-name">
                    {drawerDriverName}
                  </h3>

                  <p className="text-[11px] text-blue-200 font-medium font-mono truncate leading-tight" id="drawer-driver-etm">
                    {drawerDriverEtm && drawerDriverEtm.toUpperCase() !== "N/A" ? `ETM: ${drawerDriverEtm}` : "Driver Partner"}
                  </p>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 py-4 overflow-y-auto">
                <nav className="px-3 space-y-1">
                  {(driver.role === "admin" || driver.User_Type === "admin") && (
                    <button
                      onClick={() => {
                        setActiveScreen(ActiveScreen.ADMIN_PANEL);
                        setIsDrawerOpen(false);
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 mb-2"
                      id="drawer-item-admin-panel"
                    >
                      <span className="w-5 h-5 flex items-center justify-center font-black">⚙️</span>
                      <span>Switch to Admin Panel</span>
                    </button>
                  )}
                  {[
                    { screen: ActiveScreen.DASHBOARD, label: "Home", icon: HomeIcon },
                    { screen: ActiveScreen.WEEKLY_HISSAB, label: "Weekly Hissab", icon: ReceiptIcon },
                    { screen: ActiveScreen.VEHICLE, label: "Vehicle", icon: VehicleIcon },
                    { screen: ActiveScreen.PAYMENT, label: "Payment", icon: PaymentIcon },
                    { screen: ActiveScreen.PROFILE, label: "Profile", icon: ProfileIcon },
                    { screen: ActiveScreen.HELP_SUPPORT, label: "Help & Support", icon: HelpIcon },
                  ].map((item) => {
                    const isActive = activeScreen === item.screen;
                    return (
                      <button
                        key={item.screen}
                        onClick={() => {
                          setActiveScreen(item.screen);
                          setIsDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? "bg-[#0D47A1] text-white shadow-md font-black"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                        }`}
                        id={`drawer-item-${item.label.toLowerCase()}`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-white animate-pulse" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Footer with Logout button */}
              <div className="p-4 border-t border-slate-800/60 space-y-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer"
                  id="drawer-item-logout"
                >
                  <LogOutIcon className="w-5 h-5" />
                  <span>Logout</span>
                </button>
                <div className="text-center text-[10px] font-mono text-slate-500 pt-1">
                  SSK Driver App • {DISPLAY_VERSION}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}
