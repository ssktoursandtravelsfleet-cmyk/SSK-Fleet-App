import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

export interface PublishedWeekRecord {
  weekKey: string;
  weekLabel: string;
  startDate?: string;
  endDate?: string;
  published: boolean;
  publishedAt: string;
  publishedBy: string;
}

/**
  Generate a normalized, deterministic week key string for indexing.
 */
export function getWeekKey(weekStr: string): string {
  if (!weekStr) return "";
  return weekStr
    .trim()
    .toLowerCase()
    .replace(/\s*[\-—to]+\s*/gi, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
}

/**
 * Save published status for a specific week in Firestore.
 */
export async function publishWeekStatus(
  weekLabel: string,
  publishedBy: string = "Admin"
): Promise<{ success: boolean; record?: PublishedWeekRecord; message?: string }> {
  try {
    const weekKey = getWeekKey(weekLabel);
    if (!weekKey) {
      throw new Error("Invalid week label specified.");
    }

    const docRef = doc(db, "published_weeks", weekKey);
    const now = new Date().toISOString();

    const record: PublishedWeekRecord = {
      weekKey,
      weekLabel,
      published: true,
      publishedAt: now,
      publishedBy
    };

    await setDoc(docRef, record, { merge: true });
    console.log(`[PUBLISH WEEK SUCCESS] Saved publish status for weekKey=${weekKey}`, record);

    return {
      success: true,
      record
    };
  } catch (err: any) {
    console.error(`[PUBLISH WEEK ERROR] Failed to save publish status for ${weekLabel}:`, err);
    return {
      success: false,
      message: err?.message || "Failed to save publish status to database."
    };
  }
}

/**
 * Check if a specific week is published in Firestore.
 */
export async function checkWeekIsPublished(weekLabel: string): Promise<boolean> {
  try {
    const weekKey = getWeekKey(weekLabel);
    if (!weekKey) return false;

    const docRef = doc(db, "published_weeks", weekKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return !!data.published;
    }
    return false;
  } catch (err) {
    console.warn(`[CHECK PUBLISH STATUS ERROR] for ${weekLabel}:`, err);
    return false;
  }
}

/**
 * Fetch all published weeks map from Firestore.
 */
export async function fetchAllPublishedWeeks(): Promise<Record<string, PublishedWeekRecord>> {
  try {
    const colRef = collection(db, "published_weeks");
    const snap = await getDocs(colRef);
    const result: Record<string, PublishedWeekRecord> = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data() as PublishedWeekRecord;
      if (data && data.weekKey) {
        result[data.weekKey] = data;
      }
    });
    return result;
  } catch (err) {
    console.warn("[FETCH ALL PUBLISHED WEEKS ERROR]:", err);
    return {};
  }
}
