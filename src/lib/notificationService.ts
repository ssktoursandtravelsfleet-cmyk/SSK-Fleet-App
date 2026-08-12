import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { NotificationItem } from "../types";
import { sendAdminNotificationToSheet, markNotificationReadInSheet } from "./sheets";

export interface SendNotificationParams {
  title: string;
  message: string;
  alertLevel?: string;
  targetDriverId?: string;
  targetDriverEtm?: string;
  targetDriverName?: string;
  mobileNumber?: string;
  channel?: string;
  createdBy?: string;
  sentBy?: string;
  sentByName?: string;
  accessToken?: string | null;
}

/**
 * Dispatch notification to Google Sheets `Notifications` tab first + Firestore `driver_notifications` collection
 */
export async function dispatchDriverNotification(params: SendNotificationParams): Promise<{
  success: boolean;
  message: string;
  notifId?: string;
}> {
  const {
    title,
    message,
    alertLevel = "Information",
    targetDriverId = "ALL",
    targetDriverEtm = "ALL",
    targetDriverName = "All Fleet Drivers",
    mobileNumber = "ALL",
    channel = "In-App Push Alert",
    sentBy = "Admin",
    sentByName = "Admin Manager",
    createdBy,
    accessToken
  } = params;

  if (!title || !title.trim() || !message || !message.trim()) {
    throw new Error("Notification header title and message content are required.");
  }

  const cleanDriverId = String(targetDriverId || "ALL").trim();
  const cleanEtm = String(targetDriverEtm || "ALL").trim();
  const cleanName = String(targetDriverName || "All Fleet Drivers").trim();
  const cleanMobile = String(mobileNumber || "ALL").trim();
  const cleanChannel = String(channel || "In-App Push Alert").trim();
  const cleanAlertLevel = String(alertLevel || "Information").trim();
  const cleanSentBy = String(sentBy || "Admin").trim();
  const cleanSentByName = String(sentByName || createdBy || "Admin Manager").trim();

  // 1. PRIMARY WRITE: Write to Google Sheets "Notifications" tab
  const sheetRes = await sendAdminNotificationToSheet(
    title,
    message,
    cleanAlertLevel,
    cleanDriverId,
    cleanEtm,
    cleanName,
    cleanMobile,
    cleanChannel,
    cleanSentBy,
    cleanSentByName,
    accessToken
  );

  // If Google Sheets write fails -> DO NOT SHOW SUCCESS -> Return error
  if (!sheetRes || !sheetRes.success) {
    return {
      success: false,
      message: sheetRes?.message || "Notification could not be saved. Please try again."
    };
  }

  const notifId = sheetRes.notifId;
  const now = new Date();
  const nowFormatted = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // 2. REALTIME SYNC: Store in Firestore `driver_notifications` collection
  const notifData = {
    id: notifId,
    notificationId: notifId,
    recipientType: cleanDriverId === "ALL" && cleanEtm === "ALL" ? "all" : "driver",
    recipientId: cleanEtm !== "ALL" ? cleanEtm : cleanDriverId,
    targetDriverId: cleanDriverId,
    driverId: cleanDriverId,
    etmId: cleanEtm,
    driverName: cleanName,
    mobileNumber: cleanMobile,
    title: title.trim(),
    message: message.trim(),
    alertLevel: cleanAlertLevel,
    notificationType: cleanAlertLevel,
    type: cleanAlertLevel,
    channel: cleanChannel,
    createdAt: now.toISOString(),
    createdAtFormatted: nowFormatted,
    read: false,
    readStatus: "Unread",
    deliveryStatus: "Sent",
    status: "sent",
    createdBy: cleanSentByName,
    sentBy: cleanSentBy,
    sentByName: cleanSentByName
  };

  try {
    const docRef = doc(db, "driver_notifications", notifId);
    await setDoc(docRef, notifData);
  } catch (fsErr) {
    console.warn("Firestore sync notification warning:", fsErr);
  }

  const recipientLabel = cleanDriverId !== "ALL" && cleanEtm !== "ALL"
    ? `${cleanName} (${cleanEtm})`
    : "All Fleet Drivers";

  return {
    success: true,
    message: `Notification sent successfully to ${recipientLabel}.`,
    notifId
  };
}

/**
 * Subscribe to real-time driver notifications from Firestore
 */
export function subscribeToDriverNotifications(
  driverEtm?: string,
  driverMobile?: string,
  driverId?: string,
  onUpdate?: (notifications: NotificationItem[]) => void,
  onError?: (err: any) => void
): () => void {
  const cleanEtm = String(driverEtm || "").trim().toUpperCase();
  const cleanId = String(driverId || "").trim().toUpperCase();
  const cleanMobile = String(driverMobile || "").replace(/\D/g, "").slice(-10);

  console.log("SUBSCRIBING TO DRIVER NOTIFICATIONS WITH KEYS:", { cleanEtm, cleanId, cleanMobile });

  const notifCollectionRef = collection(db, "driver_notifications");

  const unsubscribe = onSnapshot(
    notifCollectionRef,
    (snapshot) => {
      const allNotifs: NotificationItem[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data) return;

        const targetEtm = String(data.recipientId || data.driverId || data.etmId || "ALL").trim().toUpperCase();
        const targetMobile = String(data.mobileNumber || "").replace(/\D/g, "").slice(-10);

        // Matching logic for the logged-in driver:
        let isMatch = false;

        // 1. Global broadcast
        if (["ALL", "BROADCAST", "EVERYONE", ""].includes(targetEtm)) {
          isMatch = true;
        }
        // 2. Exact match on ETM ID
        else if (cleanEtm && targetEtm === cleanEtm) {
          isMatch = true;
        }
        // 3. Exact match on Driver ID
        else if (cleanId && targetEtm === cleanId) {
          isMatch = true;
        }
        // 4. Exact match on Mobile Number
        else if (cleanMobile && targetMobile && cleanMobile === targetMobile) {
          isMatch = true;
        }

        if (isMatch) {
          let normType: "info" | "warning" | "success" | "danger" = "info";
          const rawLevel = String(data.alertLevel || data.type || "info").toLowerCase();
          if (rawLevel.includes("warn")) normType = "warning";
          else if (rawLevel.includes("succ") || rawLevel.includes("pay")) normType = "success";
          else if (rawLevel.includes("danger") || rawLevel.includes("urg") || rawLevel.includes("err")) normType = "danger";

          allNotifs.push({
            id: data.id || docSnap.id,
            title: data.title || "SSK Fleet Alert",
            message: data.message || "",
            time: data.createdAtFormatted || (data.createdAt ? new Date(data.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })),
            type: normType,
            read: !!data.read,
            etmId: targetEtm,
            driverName: data.driverName || "",
            channel: data.channel || "In-App Push Alert",
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || "Admin Manager",
            readAt: data.readAt || ""
          });
        }
      });

      // Sort newest first
      allNotifs.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.time).getTime() || 0;
        const timeB = new Date(b.createdAt || b.time).getTime() || 0;
        return timeB - timeA;
      });

      console.log(`FOUND ${allNotifs.length} MATCHING NOTIFICATIONS FOR ETM:`, cleanEtm, allNotifs);

      if (onUpdate) {
        onUpdate(allNotifs);
      }
    },
    (err) => {
      console.error("Firestore driver notification listener error:", err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Mark notification as read in Firestore + Google Sheets
 */
export async function markNotificationAsRead(
  notificationId: string,
  accessToken?: string | null
): Promise<void> {
  if (!notificationId) return;

  const nowFormatted = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  try {
    // 1. Update Firestore doc
    const docRef = doc(db, "driver_notifications", notificationId);
    await updateDoc(docRef, {
      read: true,
      readAt: nowFormatted
    }).catch(async () => {
      // If document doesn't exist by ID, try finding doc where field `id == notificationId`
      const snap = await getDocs(query(collection(db, "driver_notifications")));
      snap.forEach((d) => {
        if (d.data().id === notificationId || d.id === notificationId) {
          updateDoc(doc(db, "driver_notifications", d.id), {
            read: true,
            readAt: nowFormatted
          }).catch(() => {});
        }
      });
    });
  } catch (err) {
    console.warn("Firestore mark notification read warning:", err);
  }

  // 2. Also update in Google Sheets
  if (accessToken) {
    markNotificationReadInSheet(notificationId, accessToken).catch(() => {});
  }
}

