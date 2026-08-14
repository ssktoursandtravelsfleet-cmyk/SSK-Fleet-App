import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Store processed notification IDs in memory and sessionStorage to prevent duplicate vibrations/alerts
const PROCESSED_NOTIF_KEY = "ssk_processed_notif_ids";

export function getProcessedNotifIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(PROCESSED_NOTIF_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (err) {
    console.warn("Failed to read processed notification IDs:", err);
  }
  return new Set<string>();
}

export function markNotifAsProcessed(notifId: string): void {
  if (!notifId) return;
  const ids = getProcessedNotifIds();
  ids.add(notifId);
  try {
    // Keep last 100 notification IDs
    const arr = Array.from(ids).slice(-100);
    sessionStorage.setItem(PROCESSED_NOTIF_KEY, JSON.stringify(arr));
  } catch (err) {
    console.warn("Failed to store processed notification ID:", err);
  }
}

export function isNotifProcessed(notifId: string): boolean {
  if (!notifId) return false;
  return getProcessedNotifIds().has(notifId);
}

/**
 * Safely trigger device vibration using browser Vibration API
 * Pattern: [200, 100, 200]
 */
export function triggerDeviceVibration(pattern: number[] = [200, 100, 200]): boolean {
  try {
    if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
      const result = navigator.vibrate(pattern);
      console.log("[NOTIFICATION VIBRATION] Triggered vibration pattern:", pattern, "Result:", result);
      return result;
    } else {
      console.log("[NOTIFICATION VIBRATION] Vibration API not supported on this browser/device.");
    }
  } catch (err) {
    console.warn("[NOTIFICATION VIBRATION] Vibration API call failed gracefully:", err);
  }
  return false;
}

/**
 * Register Service Worker for FCM and PWA background notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("[SERVICE WORKER] Service worker not supported in this environment.");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/"
    });
    console.log("[SERVICE WORKER] Registered successfully with scope:", registration.scope);
    return registration;
  } catch (err) {
    console.warn("[SERVICE WORKER] Service worker registration error:", err);
    return null;
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("[NOTIFICATION PERMISSION] User response:", permission);
    return permission;
  } catch (err) {
    console.warn("[NOTIFICATION PERMISSION] Request error:", err);
    return Notification.permission || "denied";
  }
}

/**
 * Helper to test if an identifier is valid and not a placeholder like "N/A", "NA", "NULL", "NONE", "-"
 */
export function isValidDriverIdentifier(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = String(val).trim().toUpperCase();
  const invalidPlaceholders = new Set([
    "",
    "N/A",
    "NA",
    "NONE",
    "NULL",
    "UNDEFINED",
    "-",
    "--",
    "UNKNOWN",
    "N / A",
    "NAN",
    "ALL"
  ]);
  return !invalidPlaceholders.has(trimmed);
}

/**
 * Sanitize a string so it is always a safe single-segment Firestore document ID (no forward or backward slashes)
 */
export function sanitizeFirestoreDocId(id: string): string {
  if (!id) return "";
  return id
    .trim()
    .replace(/[\/\\#?\[\]*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Get FCM Device Token and register it under the driver's ETM ID / Driver ID in Firestore `driver_tokens`
 */
export async function registerDriverFcmToken(
  driverEtm?: string,
  driverMobile?: string,
  driverId?: string
): Promise<string | null> {
  const validEtm = isValidDriverIdentifier(driverEtm) ? String(driverEtm).trim().toUpperCase() : "";
  const validId = isValidDriverIdentifier(driverId) ? String(driverId).trim().toUpperCase() : "";
  const cleanMobile = String(driverMobile || "").replace(/\D/g, "").slice(-10);

  const bestIdentifier = validEtm || validId;
  let docKey = "";

  if (bestIdentifier) {
    docKey = sanitizeFirestoreDocId(bestIdentifier);
  } else if (cleanMobile && cleanMobile.length >= 10) {
    docKey = `MOB_${cleanMobile}`;
  }

  if (!docKey) {
    console.log("[FCM TOKEN] Cannot register FCM token: No valid driver identifier (ETM or 10-digit mobile) provided.", {
      driverEtm,
      driverId,
      driverMobile
    });
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.log("[FCM TOKEN] Firebase Messaging not supported in this browser.");
      return null;
    }

    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      console.log("[FCM TOKEN] Notification permission not granted:", permission);
      return null;
    }

    const swReg = await registerServiceWorker();
    const messaging = getMessaging();

    // Get current FCM token
    const token = await getToken(messaging, {
      serviceWorkerRegistration: swReg || undefined
    }).catch((err) => {
      console.warn("[FCM TOKEN] Failed to fetch FCM device token:", err);
      return null;
    });

    if (!token) {
      console.log("[FCM TOKEN] No FCM token returned.");
      return null;
    }

    console.log("[FCM TOKEN] Obtained FCM device token:", token, "for driver docKey:", docKey);

    // Save/update token in Firestore `driver_tokens` collection with sanitized single-segment document ID
    const tokenRef = doc(db, "driver_tokens", docKey);

    await setDoc(tokenRef, {
      driverId: bestIdentifier || `MOB_${cleanMobile}`,
      etmId: validEtm || bestIdentifier || "",
      mobileNumber: cleanMobile,
      fcmToken: token,
      updatedAt: new Date().toISOString(),
      platform: typeof window !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "web"
    }, { merge: true });

    console.log("[FCM TOKEN] Successfully saved FCM token to Firestore driver_tokens/", docKey);
    return token;
  } catch (err) {
    console.error("[FCM TOKEN] Error registering FCM device token:", err);
    return null;
  }
}

/**
 * Show a native browser or system notification with vibration
 */
export function showSystemNotification(
  title: string,
  message: string,
  notifId: string,
  driverId?: string
): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const options: any = {
    body: message,
    vibrate: [200, 100, 200],
    tag: notifId, // Unique tag prevents duplicates
    renotify: false,
    data: {
      notificationId: notifId,
      driverId: driverId || ""
    }
  };

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, options).catch((err) => {
          console.warn("[SYSTEM NOTIFICATION] Service worker showNotification error:", err);
          new Notification(title, options);
        });
      });
    } else {
      new Notification(title, options);
    }
  } catch (err) {
    console.warn("[SYSTEM NOTIFICATION] Fallback showNotification error:", err);
  }
}

/**
 * Setup foreground messaging handler for FCM
 */
export async function setupForegroundFcmListener(
  onIncomingMessage: (payload: any) => void
): Promise<(() => void) | null> {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const messaging = getMessaging();
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM FOREGROUND] Received foreground FCM message:", payload);
      onIncomingMessage(payload);
    });

    return unsubscribe;
  } catch (err) {
    console.warn("[FCM FOREGROUND] Setup error:", err);
    return null;
  }
}
