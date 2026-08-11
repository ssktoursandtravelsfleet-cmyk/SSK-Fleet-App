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
  alertLevel: "info" | "warning" | "success" | "danger";
  targetDriverEtm?: string; // e.g. "ETM32932" or "ALL"
  targetDriverName?: string; // e.g. "Imran Ali Mulla"
  mobileNumber?: string;
  channel?: string; // "In-App Push Alert", "WhatsApp Message", "Important Notice", etc.
  createdBy?: string;
  accessToken?: string | null;
}

/**
 * Dispatch notification to Firestore `driver_notifications` collection + Google Sheets backup
 */
export async function dispatchDriverNotification(params: SendNotificationParams): Promise<{
  success: boolean;
  message: string;
  notifId?: string;
}> {
  const {
    title,
    message,
    alertLevel,
    targetDriverEtm = "ALL",
    targetDriverName = "All Fleet Drivers",
    mobileNumber = "",
    channel = "In-App Push Alert",
    createdBy = "Admin Manager",
    accessToken
  } = params;

  if (!title.trim() || !message.trim()) {
    throw new Error("Notification title and message content are required.");
  }

  const cleanEtm = String(targetDriverEtm || "ALL").trim().toUpperCase();
  const cleanName = String(targetDriverName || "All Fleet Drivers").trim();
  const cleanMobile = String(mobileNumber || "").replace(/\D/g, "").slice(-10);
  const now = new Date();
  const notifId = `NOTIF_${now.getTime()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const nowFormatted = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const notifData = {
    id: notifId,
    notificationId: notifId,
    recipientType: cleanEtm === "ALL" ? "all" : "driver",
    recipientId: cleanEtm,
    driverId: cleanEtm,
    etmId: cleanEtm,
    driverName: cleanName,
    mobileNumber: cleanMobile,
    title: title.trim(),
    message: message.trim(),
    notificationType: alertLevel || "info",
    alertLevel: alertLevel || "info",
    channel: channel || "In-App Push Alert",
    createdAt: now.toISOString(),
    createdAtFormatted: nowFormatted,
    read: false,
    status: "sent",
    createdBy: createdBy || "Admin Manager",
    sentBy: createdBy || "Admin Manager"
  };

  console.log("DISPATCHING DRIVER NOTIFICATION TO FIRESTORE:", notifData);

  try {
    // 1. PRIMARY WRITE: Store directly in Firebase Firestore database
    const docRef = doc(db, "driver_notifications", notifId);
    await setDoc(docRef, notifData);

    // 1b. VERIFY WRITE: Verify document exists in Firestore
    const verifySnap = await getDoc(docRef);
    if (!verifySnap.exists()) {
      throw new Error("Document write verification failed on Firestore.");
    }

    console.info("Successfully written & verified notification in Firestore:", notifId, verifySnap.data());

    // 2. SECONDARY WRITE: Append to Google Sheets for audit / backup log
    sendAdminNotificationToSheet(
      title,
      message,
      alertLevel,
      cleanEtm,
      cleanName,
      channel,
      createdBy,
      accessToken
    ).catch((sheetErr) => {
      console.warn("Google Sheets notification backup failed (Firestore write succeeded):", sheetErr);
    });

    const recipientLabel = cleanEtm !== "ALL" && cleanEtm !== ""
      ? `${cleanName} (${cleanEtm})`
      : "All Fleet Drivers";

    return {
      success: true,
      message: `Notification sent successfully to ${recipientLabel}!`,
      notifId
    };
  } catch (firestoreErr: any) {
    console.error("CRITICAL: Failed to write notification to Firestore:", firestoreErr);

    // Fallback: Try Google Sheets if Firestore fails
    try {
      const sheetRes = await sendAdminNotificationToSheet(
        title,
        message,
        alertLevel,
        cleanEtm,
        cleanName,
        channel,
        createdBy,
        accessToken
      );
      if (sheetRes.success) {
        return {
          success: true,
          message: `Notification recorded via Google Sheets backup to ${cleanName}.`,
          notifId
        };
      }
    } catch (sErr) {
      console.error("Google Sheets fallback also failed:", sErr);
    }

    throw new Error(`Failed to deliver notification: ${firestoreErr?.message || "Database write error"}`);
  }
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

