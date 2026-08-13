import { AdminDriverItem } from "../types";
import { SPREADSHEET_ID, validateConfig, fetchAllAdminData, fetchSheetValues, clearSheetCache } from "./sheets";
import { googleSignIn } from "../firebase";

const IS_DEV = import.meta.env?.DEV ?? process.env.NODE_ENV !== "production";

/**
 * Helper to log API requests and responses in development mode.
 */
function logDev(action: string, payload: any, response?: any, error?: any) {
  if (IS_DEV) {
    if (error) {
      console.error(`[GoogleSheets API Error] ${action}:`, { payload, error });
    } else {
      console.log(`[GoogleSheets API] ${action}:`, { payload, response });
    }
  }
}

/**
 * Case-insensitive helper to determine Driver Verification Status:
 * Pending: blank, empty, null, undefined, pending, submitted
 * Approved: approved, active, verified
 * Rejected: rejected
 */
export function getVerificationStatus(driver: Partial<AdminDriverItem> | any): "Pending" | "Approved" | "Rejected" {
  if (!driver) return "Pending";
  const raw = (
    driver.verificationStatus ||
    driver.status ||
    ""
  ).toString().trim().toLowerCase();

  if (!raw || raw === "null" || raw === "undefined" || raw === "pending" || raw === "submitted") {
    return "Pending";
  }
  if (raw === "approved" || raw === "active" || raw === "verified") {
    return "Approved";
  }
  if (raw === "rejected") {
    return "Rejected";
  }
  return "Pending";
}

/**
 * Resolves access token from parameter or localStorage.
 */
function getEffectiveAccessToken(accessToken?: string | null): string {
  if (accessToken && accessToken.trim()) return accessToken;
  if (typeof window !== "undefined") {
    return (
      localStorage.getItem("google_access_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      ""
    );
  }
  return "";
}

/**
 * Ensures access token exists. If missing from storage and props, prompts user for Google Sign-In.
 */
export async function ensureAccessToken(accessToken?: string | null): Promise<string> {
  let token = getEffectiveAccessToken(accessToken);
  if (!token) {
    try {
      console.log("OAuth token missing. Prompting Google Sign-In...");
      const authResult = await googleSignIn();
      if (authResult?.accessToken) {
        token = authResult.accessToken;
        localStorage.setItem("google_access_token", token);
      }
    } catch (err) {
      console.error("Google OAuth login prompt failed:", err);
    }
  }
  return token;
}

/**
 * Low-level sheet values fetcher with error resilience.
 * Uses authenticated API first with fallback to public CSV fetcher.
 */
export async function fetchRawSheetValues(
  sheetName: string,
  accessToken?: string | null
): Promise<string[][]> {
  validateConfig(SPREADSHEET_ID);
  const token = getEffectiveAccessToken(accessToken);
  logDev("fetchRawSheetValues REQUEST", { sheetName, tokenExists: !!token });

  try {
    const rows = await fetchSheetValues(SPREADSHEET_ID, sheetName, token);
    logDev("fetchRawSheetValues SUCCESS", { sheetName, rowCount: rows.length });
    return rows;
  } catch (error) {
    logDev("fetchRawSheetValues ERROR", { sheetName }, null, error);
    throw error;
  }
}

/**
 * Correctly formats Google Sheets range parameters for API endpoint URLs.
 * Preserves '!' as literal character while URL-encoding sheet name (handling spaces).
 */
export function formatRangeForUrl(range: string): string {
  if (range.includes("!")) {
    const exclIdx = range.lastIndexOf("!");
    let sheetPart = range.substring(0, exclIdx);
    const cellPart = range.substring(exclIdx + 1);

    if (sheetPart.startsWith("'") && sheetPart.endsWith("'")) {
      sheetPart = sheetPart.substring(1, sheetPart.length - 1);
    }
    return `${encodeURIComponent(sheetPart)}!${cellPart}`;
  }
  return encodeURIComponent(range);
}

/**
 * Low-level sheet range updater with error throwing.
 */
export async function updateSheetRange(
  arg1: string,
  arg2: any,
  arg3?: any,
  arg4?: string | null
): Promise<any> {
  let range = arg1;
  let values: string[][] = arg2;
  let rawToken = arg3;

  if (typeof arg2 === "string" && Array.isArray(arg3)) {
    range = arg2;
    values = arg3;
    rawToken = arg4;
  }

  validateConfig(SPREADSHEET_ID);
  let token = await ensureAccessToken(rawToken);
  if (!token) {
    console.error("Failure: Google OAuth access token missing");
    throw new Error(
      "Google OAuth access token missing. Please sign in with Google to perform sheet updates."
    );
  }

  const formattedRange = formatRangeForUrl(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${formattedRange}?valueInputOption=USER_ENTERED`;

  logDev("updateSheetRange REQUEST", { range, formattedRange, valuesCount: values.length });

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let parseMessage = "";
    try {
      const parsed = JSON.parse(errText);
      parseMessage = parsed?.error?.message || "";
    } catch (_) {}

    const error = new Error(
      `Failed to update sheet range '${range}': ${res.status} ${res.statusText}. ${parseMessage || errText}`
    );
    console.error("Failure:", error.message);
    logDev("updateSheetRange ERROR", { range, formattedRange }, null, error);
    throw error;
  }

  const responseData = await res.json();
  logDev("updateSheetRange SUCCESS", { range }, responseData);
  return responseData;
}

/**
 * Low-level sheet row appender with error throwing.
 */
export async function appendSheetRowValues(
  sheetName: string,
  values: string[][],
  accessToken?: string | null
): Promise<any> {
  validateConfig(SPREADSHEET_ID);
  const token = getEffectiveAccessToken(accessToken);
  if (!token) {
    throw new Error(
      "Google OAuth access token missing. Please sign in with Google to perform sheet updates."
    );
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    sheetName
  )}:append?valueInputOption=USER_ENTERED`;

  logDev("appendSheetRowValues REQUEST", { sheetName, values });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let parseMessage = "";
    try {
      const parsed = JSON.parse(errText);
      parseMessage = parsed?.error?.message || "";
    } catch (_) {}

    const error = new Error(
      `Failed to append to sheet '${sheetName}': ${res.status} ${res.statusText}. ${parseMessage || errText}`
    );
    logDev("appendSheetRowValues ERROR", { sheetName }, null, error);
    throw error;
  }

  const responseData = await res.json();
  logDev("appendSheetRowValues SUCCESS", { sheetName }, responseData);
  return responseData;
}

/**
 * Low-level batch updater for multiple sheet ranges in a single HTTP request.
 */
export async function batchUpdateSheetRanges(
  data: { range: string; values: string[][] }[],
  accessToken?: string | null
): Promise<any> {
  if (!data || data.length === 0) return null;
  validateConfig(SPREADSHEET_ID);
  const token = getEffectiveAccessToken(accessToken);
  if (!token) {
    throw new Error(
      "Google OAuth access token missing. Please sign in with Google to perform sheet updates."
    );
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;

  logDev("batchUpdateSheetRanges REQUEST", {
    itemCount: data.length,
    ranges: data.map(d => d.range)
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let parseMessage = "";
    try {
      const parsed = JSON.parse(errText);
      parseMessage = parsed?.error?.message || "";
    } catch (_) {}

    const error = new Error(
      `Failed to batch update sheet ranges: ${res.status} ${res.statusText}. ${parseMessage || errText}`
    );
    logDev("batchUpdateSheetRanges ERROR", { ranges: data.map(d => d.range) }, null, error);
    throw error;
  }

  const responseData = await res.json();
  logDev("batchUpdateSheetRanges SUCCESS", {}, responseData);
  return responseData;
}

/**
 * 1. getDriverVerification()
 * Fetches all Driver_Verification rows parsed into objects.
 * Columns: A=Driver ID, B=ETM ID, C=Driver Name, D=Mobile Number, E=Vehicle Type,
 * F=Registration Date, G=Registration Time, H=Branch, I=Verification Status,
 * J=Verified By, K=Verification Date, L=Remarks
 */
export async function getDriverVerification(
  accessToken?: string | null
): Promise<any[]> {
  logDev("getDriverVerification REQUEST", {});
  try {
    const rows = await fetchRawSheetValues("Driver_Verification", accessToken);
    if (!rows || rows.length <= 1) return [];

    const items = rows.slice(1).map((row, idx) => ({
      rowIndex: idx + 2,
      driverId: row[0] || "",
      etmId: row[1] || "",
      driverName: row[2] || "",
      mobileNumber: row[3] || "",
      vehicleType: row[4] || "EV",
      registrationDate: row[5] || "",
      registrationTime: row[6] || "",
      branch: row[7] || "Main",
      verificationStatus: row[8] || "Pending",
      documentStatus: row[8] || "Pending",
      approvalStatus: row[8] || "Pending",
      verifiedBy: row[9] || "",
      verificationDate: row[10] || "",
      remarks: row[11] || ""
    }));

    logDev("getDriverVerification SUCCESS", { count: items.length });
    return items;
  } catch (error) {
    logDev("getDriverVerification ERROR", {}, null, error);
    throw error;
  }
}

/**
 * 2. updateDriverVerification(driverIdOrKey, updates, accessToken)
 * Updates Driver_Verification row in Google Sheets according to the 12-column layout:
 * A: Driver ID
 * B: ETM ID
 * C: Driver Name
 * D: Mobile Number
 * E: Vehicle Type
 * F: Registration Date
 * G: Registration Time
 * H: Branch
 * I: Verification Status
 * J: Verified By
 * K: Verification Date
 * L: Remarks
 */
export async function updateDriverVerification(
  driverIdOrKey: string,
  updates: Record<string, any>,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  logDev("updateDriverVerification REQUEST", { driverIdOrKey, updates });

  try {
    const key = String(driverIdOrKey || "").trim().toUpperCase();
    const cleanKeyMobile = driverIdOrKey ? String(driverIdOrKey).replace(/\D/g, "").slice(-10) : "";

    const rows = await fetchRawSheetValues("Driver_Verification", accessToken);

    let matchedIdx = -1;
    if (rows && rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const idCell = String(r[0] || "").trim().toUpperCase();
        const etmCell = String(r[1] || "").trim().toUpperCase();
        const mobCell = String(r[3] || "").replace(/\D/g, "").slice(-10);

        if (
          (key && (idCell === key || etmCell === key)) ||
          (cleanKeyMobile && mobCell === cleanKeyMobile)
        ) {
          matchedIdx = i;
          break;
        }
      }
    }

    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    const currentTimeStr = now.toTimeString().split(" ")[0];
    const currentDateTimeStr = `${currentDateStr} ${currentTimeStr}`;

    const verificationStatus = updates.verificationStatus || updates.documentStatus || updates.approvalStatus || "Approved";
    const verifiedBy = updates.verifiedBy || "Admin";
    const verificationDate = updates.verificationDate || currentDateTimeStr;
    const remarks = updates.remarks || updates.rejectionReason || "Approved";

    if (matchedIdx === -1) {
      // When no matching row exists, append a new 12-column row
      const dvHeaders = [
        "Driver ID",
        "ETM ID",
        "Driver Name",
        "Mobile Number",
        "Vehicle Type",
        "Registration Date",
        "Registration Time",
        "Branch",
        "Verification Status",
        "Verified By",
        "Verification Date",
        "Remarks"
      ];

      const cleanMobile = updates.mobileNumber || updates.mobile || cleanKeyMobile || "";
      const cleanEtm = updates.etmId || updates.etm || "";
      const driverId = updates.driverId || driverIdOrKey || (cleanEtm ? `DR-${cleanEtm}` : `DR-${cleanMobile}`);

      const newDvRow = [
        driverId,
        cleanEtm,
        updates.driverName || updates.name || "",
        cleanMobile,
        updates.vehicleType || updates.vehicleModel || "EV",
        updates.registrationDate || currentDateStr,
        updates.registrationTime || currentTimeStr,
        updates.branch || "Main",
        verificationStatus,
        verifiedBy,
        verificationDate,
        remarks
      ];

      if (!rows || rows.length === 0) {
        await appendSheetRowValues("Driver_Verification", [dvHeaders, newDvRow], accessToken);
      } else {
        await appendSheetRowValues("Driver_Verification", [newDvRow], accessToken);
      }

      logDev("updateDriverVerification APPEND SUCCESS", { driverId });
      return { success: true, message: "Driver Verification row appended successfully" };
    }

    // When a matching row exists, update ONLY Columns I, J, K, L (indexes 8, 9, 10, 11)
    const range = `Driver_Verification!I${matchedIdx + 1}:L${matchedIdx + 1}`;
    await updateSheetRange(range, [[verificationStatus, verifiedBy, verificationDate, remarks]], accessToken);

    logDev("updateDriverVerification UPDATE SUCCESS", { matchedRow: matchedIdx + 1, range });
    return { success: true, message: "Driver Verification updated successfully" };
  } catch (error) {
    logDev("updateDriverVerification ERROR", { driverIdOrKey, updates }, null, error);
    console.error("Google Sheets API error in updateDriverVerification:", error);
    throw error;
  }
}

/**
 * 3. createDriverMaster(driverData, accessToken)
 * Creates a new row in Driver_Master checking duplicates first.
 */
export async function createDriverMaster(
  driverData: Record<string, any>,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  logDev("createDriverMaster REQUEST", { driverData });

  const cleanMobile = driverData.mobile ? String(driverData.mobile).replace(/\D/g, "").slice(-10) : "";
  const cleanEtm = driverData.etm ? String(driverData.etm).trim().toUpperCase() : "";
  const driverId = driverData.driverId ? String(driverData.driverId).trim() : (cleanEtm ? `DR-${cleanEtm}` : `DR-${cleanMobile}`);

  // Prevent duplicate Driver_Master records by checking both Driver ID and ETM
  const dmRows = await fetchRawSheetValues("Driver_Master", accessToken).catch(() => []);
  if (dmRows && dmRows.length > 1) {
    for (let i = 1; i < dmRows.length; i++) {
      const r = dmRows[i];
      if (!r) continue;
      const rId = String(r[0] || "").trim().toUpperCase();
      const rEtm = String(r[1] || "").trim().toUpperCase();
      const rMob = String(r[3] || "").replace(/\D/g, "").slice(-10);

      if (
        (driverId && rId === driverId.toUpperCase()) ||
        (cleanEtm && rEtm === cleanEtm) ||
        (cleanMobile && rMob === cleanMobile)
      ) {
        logDev("createDriverMaster SKIPPED (Already exists, updating instead)", { driverId, cleanEtm });
        return updateDriverMaster(driverId || cleanEtm || cleanMobile, driverData, accessToken);
      }
    }
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const headers = [
    "Driver ID", "ETM", "Name", "Mobile", "Aadhaar", "PAN", "License", "Vehicle No", "Status", "Profile Photo", "Joining Date", "Payment Status", "Last Login", "FCM Token"
  ];

  const rowValues = [
    driverId,
    cleanEtm,
    driverData.name || "",
    cleanMobile,
    driverData.aadhaar || driverData.aadhaarNo || "",
    driverData.pan || driverData.panNo || "",
    driverData.license || driverData.licenseNo || "",
    driverData.vehicleNo || driverData.vehicleNumber || "",
    "Active",
    driverData.profilePhoto || "",
    driverData.joiningDate || todayStr,
    "Active",
    "",
    ""
  ];

  if (!dmRows || dmRows.length === 0) {
    await appendSheetRowValues("Driver_Master", [headers, rowValues], accessToken);
  } else {
    await appendSheetRowValues("Driver_Master", [rowValues], accessToken);
  }

  logDev("createDriverMaster SUCCESS", { driverId });
  return { success: true, message: "Driver Master record created successfully" };
}

/**
 * 4. updateDriverMaster(driverIdOrKey, updates, accessToken)
 * Updates an existing Driver_Master row.
 */
export async function updateDriverMaster(
  driverIdOrKey: string,
  updates: Record<string, any>,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  logDev("updateDriverMaster REQUEST", { driverIdOrKey, updates });

  const key = String(driverIdOrKey || "").trim().toUpperCase();
  const cleanMobile = driverIdOrKey.replace(/\D/g, "").slice(-10);

  const dmRows = await fetchRawSheetValues("Driver_Master", accessToken).catch(() => []);

  let matchedIdx = -1;
  if (dmRows && dmRows.length > 1) {
    for (let i = 1; i < dmRows.length; i++) {
      const r = dmRows[i];
      if (!r) continue;
      const rId = String(r[0] || "").trim().toUpperCase();
      const rEtm = String(r[1] || "").trim().toUpperCase();
      const rMob = String(r[3] || "").replace(/\D/g, "").slice(-10);

      if (
        (key && (rId === key || rEtm === key)) ||
        (cleanMobile && rMob === cleanMobile)
      ) {
        matchedIdx = i;
        break;
      }
    }
  }

  if (matchedIdx === -1) {
    // If not found, create it!
    return createDriverMaster({ driverId: driverIdOrKey, ...updates }, accessToken);
  }

  const existingRow = [...dmRows[matchedIdx]];
  while (existingRow.length < 14) existingRow.push("");

  if (updates.etm !== undefined) existingRow[1] = updates.etm;
  if (updates.name !== undefined) existingRow[2] = updates.name;
  if (updates.mobile !== undefined) existingRow[3] = updates.mobile;
  if (updates.aadhaar !== undefined || updates.aadhaarNo !== undefined) existingRow[4] = updates.aadhaar || updates.aadhaarNo;
  if (updates.pan !== undefined || updates.panNo !== undefined) existingRow[5] = updates.pan || updates.panNo;
  if (updates.license !== undefined || updates.licenseNo !== undefined) existingRow[6] = updates.license || updates.licenseNo;
  if (updates.vehicleNo !== undefined || updates.vehicleNumber !== undefined) existingRow[7] = updates.vehicleNo || updates.vehicleNumber;
  if (updates.status !== undefined) existingRow[8] = updates.status;
  if (updates.profilePhoto !== undefined) existingRow[9] = updates.profilePhoto;

  const range = `Driver_Master!A${matchedIdx + 1}:N${matchedIdx + 1}`;
  await updateSheetRange(range, [existingRow], accessToken);

  logDev("updateDriverMaster SUCCESS", { matchedRow: matchedIdx + 1 });
  return { success: true, message: "Driver Master record updated successfully" };
}

/**
 * 5. createDriverLogin(driverData, accessToken)
 * Creates new row in Driver_Login sheet.
 */
export async function createDriverLogin(
  driverData: Record<string, any>,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  logDev("createDriverLogin REQUEST", { driverData });

  const cleanMobile = driverData.mobile ? String(driverData.mobile).replace(/\D/g, "").slice(-10) : "";
  const cleanEtm = driverData.etm ? String(driverData.etm).trim().toUpperCase() : "";
  const driverId = driverData.driverId ? String(driverData.driverId).trim() : (cleanEtm ? `DR-${cleanEtm}` : `DR-${cleanMobile}`);

  const dlRows = await fetchRawSheetValues("Driver_Login", accessToken).catch(() => []);
  if (dlRows && dlRows.length > 1) {
    for (let i = 1; i < dlRows.length; i++) {
      const r = dlRows[i];
      if (!r) continue;
      const rMob = String(r[0] || "").replace(/\D/g, "").slice(-10);
      const rEtm = String(r[2] || "").trim().toUpperCase();
      const rId = String(r[5] || "").trim().toUpperCase();

      if (
        (cleanMobile && rMob === cleanMobile) ||
        (cleanEtm && rEtm === cleanEtm) ||
        (driverId && rId === driverId.toUpperCase())
      ) {
        logDev("createDriverLogin SKIPPED (Already exists, updating instead)", { driverId, cleanEtm });
        return updateDriverLogin(driverId || cleanEtm || cleanMobile, driverData, accessToken);
      }
    }
  }

  const headers = ["Mobile Number", "Password", "ETM ID", "Status", "Last Login", "Driver ID", "Driver Name"];
  const rowValues = [
    cleanMobile,
    driverData.password || "1234",
    cleanEtm,
    "Active",
    "",
    driverId,
    driverData.name || driverData.driverName || ""
  ];

  if (!dlRows || dlRows.length === 0) {
    await appendSheetRowValues("Driver_Login", [headers, rowValues], accessToken);
  } else {
    await appendSheetRowValues("Driver_Login", [rowValues], accessToken);
  }

  logDev("createDriverLogin SUCCESS", { cleanMobile, cleanEtm });
  return { success: true, message: "Driver Login created successfully" };
}

/**
 * 6. updateDriverLogin(driverIdOrKey, updates, accessToken)
 * Updates matching row in Driver_Login.
 */
export async function updateDriverLogin(
  driverIdOrKey: string,
  updates: Record<string, any>,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  logDev("updateDriverLogin REQUEST", { driverIdOrKey, updates });

  const key = String(driverIdOrKey || "").trim().toUpperCase();
  const cleanMobile = driverIdOrKey.replace(/\D/g, "").slice(-10);

  const dlRows = await fetchRawSheetValues("Driver_Login", accessToken).catch(() => []);

  let matchedIdx = -1;
  if (dlRows && dlRows.length > 1) {
    for (let i = 1; i < dlRows.length; i++) {
      const r = dlRows[i];
      if (!r) continue;
      const rMob = String(r[0] || "").replace(/\D/g, "").slice(-10);
      const rEtm = String(r[2] || "").trim().toUpperCase();
      const rId = String(r[5] || "").trim().toUpperCase();

      if (
        (key && (rId === key || rEtm === key)) ||
        (cleanMobile && rMob === cleanMobile)
      ) {
        matchedIdx = i;
        break;
      }
    }
  }

  if (matchedIdx === -1) {
    return createDriverLogin({ driverId: driverIdOrKey, ...updates }, accessToken);
  }

  const existingRow = [...dlRows[matchedIdx]];
  while (existingRow.length < 7) existingRow.push("");

  if (updates.mobile !== undefined) existingRow[0] = updates.mobile;
  if (updates.password !== undefined) existingRow[1] = updates.password;
  if (updates.etm !== undefined || updates.etmId !== undefined) existingRow[2] = updates.etm || updates.etmId;
  if (updates.status !== undefined) existingRow[3] = updates.status;
  if (updates.driverId !== undefined) existingRow[5] = updates.driverId;
  if (updates.name !== undefined || updates.driverName !== undefined) existingRow[6] = updates.name || updates.driverName;

  const range = `Driver_Login!A${matchedIdx + 1}:G${matchedIdx + 1}`;
  await updateSheetRange(range, [existingRow], accessToken);

  logDev("updateDriverLogin SUCCESS", { matchedRow: matchedIdx + 1 });
  return { success: true, message: "Driver Login updated successfully" };
}

/**
 * 7. getVehicleAssignment(etm, accessToken)
 * Searches Vehicle_Master for matching Assigned Driver ETM.
 */
export async function getVehicleAssignment(
  etmOrMobile: string,
  accessToken?: string | null
): Promise<string | null> {
  logDev("getVehicleAssignment REQUEST", { etmOrMobile });
  const cleanEtm = String(etmOrMobile || "").trim().toUpperCase();
  const cleanMobile = etmOrMobile.replace(/\D/g, "").slice(-10);

  try {
    const vmRows = await fetchRawSheetValues("Vehicle_Master", accessToken);
    if (!vmRows || vmRows.length <= 1) return null;

    const headers = vmRows[0].map(h => String(h || "").trim().toLowerCase());
    const vNoIdx = headers.findIndex(h => h.includes("vehicle number") || h.includes("vehiclenumber") || h.includes("vehicle no"));
    const etmIdx = headers.findIndex(h => h.includes("assigned driver etm") || h === "etm" || h.includes("etm id"));
    const mobileIdx = headers.findIndex(h => h.includes("driver mobile") || h === "mobile");

    for (let i = 1; i < vmRows.length; i++) {
      const r = vmRows[i];
      if (!r) continue;
      const rVNo = vNoIdx !== -1 && r[vNoIdx] ? String(r[vNoIdx]).trim().toUpperCase() : (r[1] ? String(r[1]).trim().toUpperCase() : "");
      const rEtm = etmIdx !== -1 && r[etmIdx] ? String(r[etmIdx]).trim().toUpperCase() : (r[3] ? String(r[3]).trim().toUpperCase() : "");
      const rMobile = mobileIdx !== -1 && r[mobileIdx] ? String(r[mobileIdx]).replace(/\D/g, "").slice(-10) : (r[5] ? String(r[5]).replace(/\D/g, "").slice(-10) : "");

      if (rVNo && ((cleanEtm && rEtm === cleanEtm) || (cleanMobile && rMobile === cleanMobile))) {
        logDev("getVehicleAssignment FOUND", { matchedVehicleNo: rVNo });
        return rVNo;
      }
    }

    logDev("getVehicleAssignment NOT FOUND", {});
    return null;
  } catch (error) {
    logDev("getVehicleAssignment ERROR", {}, null, error);
    return null;
  }
}

/**
 * Helper to find driver row in verification sheets using priority:
 * 1. Driver ID
 * 2. ETM ID
 * 3. Mobile Number
 */
function findDriverRowIndex(
  rows: string[][],
  rawId: string,
  driverId: string,
  cleanEtm: string,
  cleanMobile: string
): { index: number; matchedBy: string; matchedId: string; matchedEtm: string } {
  if (!rows || rows.length <= 1) return { index: -1, matchedBy: "", matchedId: "", matchedEtm: "" };

  const norm = (str: string) => String(str || "").replace(/^DR-?/i, "").replace(/^ROW-?/i, "").trim().toUpperCase();

  const targetRawId = rawId ? norm(rawId) : "";
  const targetDriverId = driverId ? norm(driverId) : "";
  const targetEtm = cleanEtm ? norm(cleanEtm) : "";
  const targetMobile = cleanMobile ? cleanMobile.replace(/\D/g, "").slice(-10) : "";

  // Priority 0: BOTH ETM ID and Mobile Number (Strict Match for Documents_Verification)
  if (targetEtm && targetMobile) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const rEtmRaw = String(r[1] || "").trim().toUpperCase();
      const rEtmNorm = norm(rEtmRaw);
      const rMobileRaw = String(r[3] || "").replace(/\D/g, "").slice(-10);

      if ((rEtmRaw === cleanEtm || rEtmNorm === targetEtm) && rMobileRaw === targetMobile) {
        return { index: i, matchedBy: "ETM + Mobile", matchedId: String(r[0] || ""), matchedEtm: rEtmRaw };
      }
    }
  }

  // Priority 1: Driver ID (Col A / index 0)
  if (targetRawId || targetDriverId) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const rIdRaw = String(r[0] || "").trim().toUpperCase();
      const rIdNorm = norm(rIdRaw);
      const rEtmRaw = String(r[1] || "").trim().toUpperCase();

      if (
        (targetRawId && (rIdRaw === rawId || rIdNorm === targetRawId)) ||
        (targetDriverId && (rIdRaw === driverId || rIdNorm === targetDriverId))
      ) {
        return { index: i, matchedBy: "Driver ID", matchedId: rIdRaw, matchedEtm: rEtmRaw };
      }
    }
  }

  // Priority 2: ETM ID (Col B / index 1)
  if (cleanEtm) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const rIdRaw = String(r[0] || "").trim().toUpperCase();
      const rEtmRaw = String(r[1] || "").trim().toUpperCase();
      const rEtmNorm = norm(rEtmRaw);

      if (rEtmRaw === cleanEtm || rEtmNorm === targetEtm || rIdRaw === cleanEtm || norm(rIdRaw) === targetEtm) {
        return { index: i, matchedBy: "ETM ID", matchedId: rIdRaw, matchedEtm: rEtmRaw };
      }
    }
  }

  // Priority 3: Mobile Number (Col D / index 3)
  if (cleanMobile) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const rIdRaw = String(r[0] || "").trim().toUpperCase();
      const rEtmRaw = String(r[1] || "").trim().toUpperCase();
      const rMob = String(r[3] || "").replace(/\D/g, "").slice(-10);

      if (rMob === cleanMobile) {
        return { index: i, matchedBy: "Mobile Number", matchedId: rIdRaw, matchedEtm: rEtmRaw };
      }
    }
  }

  return { index: -1, matchedBy: "", matchedId: "", matchedEtm: "" };
}

/**
 * 8. syncApprovedDriver(driver, accessToken, adminName, targetSheet)
 * Full automated workflow for approving a driver.
 */
export async function syncApprovedDriver(
  driver: AdminDriverItem | any,
  accessToken?: string | null,
  adminName: string = "Admin",
  targetSheet: "Driver_Verification" | "Documents_Verification" | "AUTO" = "Driver_Verification"
): Promise<{ success: boolean; message: string; freshData?: any }> {
  console.log("Button clicked: APPROVE");
  logDev("syncApprovedDriver START", { driver, adminName, targetSheet });

  if (!driver) {
    console.error("Failure: Driver data is required for approval workflow");
    throw new Error("Driver data is required for approval workflow");
  }

  let token = await ensureAccessToken(accessToken);
  if (!token) {
    console.error("Failure: Google OAuth access token missing");
    throw new Error("Google OAuth access token missing. Please sign in with Google to perform sheet updates.");
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0];
  const dateTimeStr = `${dateStr} ${timeStr}`;

  const cleanMobile = driver?.mobile ? String(driver.mobile).replace(/\D/g, "").slice(-10) : "";
  const cleanEtm = driver?.etmId || driver?.etm ? String(driver.etmId || driver.etm).trim().toUpperCase() : "";
  const rawId = driver?.id ? String(driver.id).trim().toUpperCase() : "";
  const driverId = rawId && !rawId.startsWith("ROW-") ? rawId : (cleanEtm ? `DR-${cleanEtm}` : (cleanMobile ? `DR-${cleanMobile}` : ""));

  console.log("Driver ID:", driverId || rawId);
  console.log("ETM:", cleanEtm);

  try {
    let sheetToUpdate = targetSheet;
    let sheetRows: string[][] = [];
    let matchedIdx = -1;
    let matchedInfo: { index: number; matchedBy: string; matchedId: string; matchedEtm: string } = { index: -1, matchedBy: "", matchedId: "", matchedEtm: "" };

    if (sheetToUpdate === "Driver_Verification") {
      sheetRows = await fetchRawSheetValues("Driver_Verification", token).catch(() => []);
      matchedInfo = findDriverRowIndex(sheetRows, rawId, driverId, cleanEtm, cleanMobile);
      matchedIdx = matchedInfo.index;
      if (matchedIdx === -1) {
        console.error("Failure: Driver not found in Driver_Verification sheet.");
        throw new Error("Driver not found in Driver_Verification sheet.");
      }
    } else if (sheetToUpdate === "Documents_Verification") {
      sheetRows = await fetchRawSheetValues("Documents_Verification", token).catch(() => []);
      matchedInfo = findDriverRowIndex(sheetRows, rawId, driverId, cleanEtm, cleanMobile);
      matchedIdx = matchedInfo.index;
      if (matchedIdx === -1) {
        console.error("Failure: Driver not found in Documents_Verification sheet.");
        throw new Error("Driver not found in Documents_Verification sheet.");
      }
    } else {
      // AUTO mode: Check Driver_Verification first, then Documents_Verification
      sheetRows = await fetchRawSheetValues("Driver_Verification", token).catch(() => []);
      matchedInfo = findDriverRowIndex(sheetRows, rawId, driverId, cleanEtm, cleanMobile);
      if (matchedInfo.index !== -1) {
        sheetToUpdate = "Driver_Verification";
        matchedIdx = matchedInfo.index;
      } else {
        sheetRows = await fetchRawSheetValues("Documents_Verification", token).catch(() => []);
        matchedInfo = findDriverRowIndex(sheetRows, rawId, driverId, cleanEtm, cleanMobile);
        if (matchedInfo.index !== -1) {
          sheetToUpdate = "Documents_Verification";
          matchedIdx = matchedInfo.index;
        }
      }

      if (matchedIdx === -1) {
        console.error("Failure: Driver not found in Driver_Verification or Documents_Verification sheet.");
        throw new Error("Driver not found in Driver_Verification or Documents_Verification sheet.");
      }
    }

    const matchedRowNumber = matchedIdx + 1;
    const range = sheetToUpdate === "Documents_Verification"
      ? `Documents_Verification!M${matchedRowNumber}:P${matchedRowNumber}`
      : `${sheetToUpdate}!I${matchedRowNumber}:L${matchedRowNumber}`;

    // Required Console Logs
    console.log("Matched row:", matchedRowNumber);
    console.log("Google Sheets Range:", range);

    // Update Columns
    const updateValues = [["Approved", adminName, dateTimeStr, "Approved"]];
    console.log("Values being written:", updateValues);

    const sheetsResponse = await updateSheetRange(range, updateValues, token);

    console.log("Google Sheets API response:", sheetsResponse);
    console.log("Success:", range);

    // Clear sheet cache and reload single source of truth
    clearSheetCache();
    const freshData = await fetchAllAdminData(token);

    logDev("syncApprovedDriver SUCCESS", { driverId, sheetToUpdate, range });

    return {
      success: true,
      message: `Driver Approved Successfully in ${sheetToUpdate}`,
      freshData
    };
  } catch (error: any) {
    console.error("Failure:", error?.message || error);
    logDev("syncApprovedDriver FAILED", { driverId }, null, error);
    throw new Error(error?.message || "Failed to sync approved driver to Google Sheets");
  }
}

/**
 * Synchronizes driver REJECTION across Driver_Verification / Documents_Verification.
 */
export async function syncRejectedDriver(
  driver: AdminDriverItem | any,
  reason: string = "Rejected",
  accessToken?: string | null,
  adminName: string = "Admin",
  targetSheet: "Driver_Verification" | "Documents_Verification" | "AUTO" = "Driver_Verification"
): Promise<{ success: boolean; message: string; freshData?: any }> {
  console.log("Button clicked: REJECT");
  logDev("syncRejectedDriver START", { driver, reason, adminName, targetSheet });

  if (!driver) {
    console.error("Failure: Driver data is required for rejection workflow");
    throw new Error("Driver data is required for rejection workflow");
  }

  let token = await ensureAccessToken(accessToken);
  if (!token) {
    console.error("Failure: Google OAuth access token missing");
    throw new Error("Google OAuth access token missing. Please sign in with Google to perform sheet updates.");
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0];
  const dateTimeStr = `${dateStr} ${timeStr}`;

  const cleanMobile = driver?.mobile ? String(driver.mobile).replace(/\D/g, "").slice(-10) : "";
  const cleanEtm = driver?.etmId || driver?.etm ? String(driver.etmId || driver.etm).trim().toUpperCase() : "";
  const rawId = driver?.id ? String(driver.id).trim().toUpperCase() : "";
  const driverId = rawId && !rawId.startsWith("ROW-") ? rawId : (cleanEtm ? `DR-${cleanEtm}` : (cleanMobile ? `DR-${cleanMobile}` : ""));

  console.log("Driver ID:", driverId || rawId);
  console.log("ETM:", cleanEtm);

  try {
    let sheetToUpdate = targetSheet;
    let sheetRows: string[][] = [];
    let matchedIdx = -1;
    let matchedInfo: { index: number; matchedBy: string; matchedId: string; matchedEtm: string } = { index: -1, matchedBy: "", matchedId: "", matchedEtm: "" };

    if (sheetToUpdate === "Driver_Verification") {
      sheetRows = await fetchRawSheetValues("Driver_Verification", token).catch(() => []);
      matchedInfo = findDriverRowIndex(sheetRows, rawId, driverId, cleanEtm, cleanMobile);
      matchedIdx = matchedInfo.index;
      if (matchedIdx === -1) {
        console.error("Failure: Driver not found in Driver_Verification sheet.");
        throw new Error("Driver not found in Driver_Verification sheet.");
      }
    } else if (sheetToUpdate === "Documents_Verification") {
      sheetRows = await fetchRawSheetValues("Documents_Verification", token).catch(() => []);
      matchedInfo = findDriverRowIndex(sheetRows, rawId, driverId, cleanEtm, cleanMobile);
      matchedIdx = matchedInfo.index;
      if (matchedIdx === -1) {
        console.error("Failure: Driver not found in Documents_Verification sheet.");
        throw new Error("Driver not found in Documents_Verification sheet.");
      }
    } else {
      // AUTO mode: Check Driver_Verification first, then Documents_Verification
      sheetRows = await fetchRawSheetValues("Driver_Verification", token).catch(() => []);
      matchedInfo = findDriverRowIndex(sheetRows, rawId, driverId, cleanEtm, cleanMobile);
      if (matchedInfo.index !== -1) {
        sheetToUpdate = "Driver_Verification";
        matchedIdx = matchedInfo.index;
      } else {
        sheetRows = await fetchRawSheetValues("Documents_Verification", token).catch(() => []);
        matchedInfo = findDriverRowIndex(sheetRows, rawId, driverId, cleanEtm, cleanMobile);
        if (matchedInfo.index !== -1) {
          sheetToUpdate = "Documents_Verification";
          matchedIdx = matchedInfo.index;
        }
      }

      if (matchedIdx === -1) {
        console.error("Failure: Driver not found in Driver_Verification or Documents_Verification sheet.");
        throw new Error("Driver not found in Driver_Verification or Documents_Verification sheet.");
      }
    }

    const matchedRowNumber = matchedIdx + 1;
    const range = sheetToUpdate === "Documents_Verification"
      ? `Documents_Verification!M${matchedRowNumber}:P${matchedRowNumber}`
      : `${sheetToUpdate}!I${matchedRowNumber}:L${matchedRowNumber}`;

    // Required Console Logs
    console.log("Matched row:", matchedRowNumber);
    console.log("Google Sheets Range:", range);

    // Update Columns
    const updateValues = [["Rejected", adminName, dateTimeStr, reason || "Rejected"]];
    console.log("Values being written:", updateValues);

    const sheetsResponse = await updateSheetRange(range, updateValues, token);

    console.log("Google Sheets API response:", sheetsResponse);
    console.log("Success:", range);

    // Clear sheet cache and reload single source of truth
    clearSheetCache();
    const freshData = await fetchAllAdminData(token);

    logDev("syncRejectedDriver SUCCESS", { driverId, sheetToUpdate, range });

    return {
      success: true,
      message: `Driver Rejected Successfully in ${sheetToUpdate}`,
      freshData
    };
  } catch (error: any) {
    console.error("Failure:", error?.message || error);
    logDev("syncRejectedDriver FAILED", { driverId }, null, error);
    throw new Error(error?.message || "Failed to sync rejected driver to Google Sheets");
  }
}

export interface DocumentVerificationRecord {
  rowIndex: number;
  driverId: string;
  etmId: string;
  driverName: string;
  mobileNumber: string;
  profilePhotoUrl: string;
  aadhaarFrontUrl: string;
  aadhaarBackUrl: string;
  aadhaarNumber: string;
  panCardUrl: string;
  panNumber: string;
  dlFrontUrl: string;
  dlBackUrl: string;
  dlNumber: string;
  addressProofText: string;
  addressProofPhotoUrl: string;
  bankPassbookUrl: string;
}

export async function fetchDocumentsVerificationRecords(
  accessToken?: string | null
): Promise<DocumentVerificationRecord[]> {
  const token = getEffectiveAccessToken(accessToken);
  const rows = await fetchRawSheetValues("Documents_Verification", token);
  
  if (!rows || rows.length <= 1) return [];

  const records: DocumentVerificationRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Check if completely empty
    const isCompletelyEmpty = row.every(cell => !cell || !String(cell).trim());
    if (isCompletelyEmpty) continue;

    records.push({
      rowIndex: i + 1,
      driverId: row[0] ? String(row[0]).trim() : "",
      etmId: row[1] ? String(row[1]).trim() : "",
      driverName: row[2] ? String(row[2]).trim() : "",
      mobileNumber: row[3] ? String(row[3]).trim() : "",
      profilePhotoUrl: row[4] ? String(row[4]).trim() : "",
      aadhaarFrontUrl: row[5] ? String(row[5]).trim() : "",
      aadhaarBackUrl: row[6] ? String(row[6]).trim() : "",
      aadhaarNumber: row[7] ? String(row[7]).trim() : "",
      panCardUrl: row[8] ? String(row[8]).trim() : "",
      panNumber: row[9] ? String(row[9]).trim() : "",
      dlFrontUrl: row[10] ? String(row[10]).trim() : "",
      dlBackUrl: row[11] ? String(row[11]).trim() : "",
      dlNumber: row[12] ? String(row[12]).trim() : "",
      addressProofText: row[13] ? String(row[13]).trim() : "",
      addressProofPhotoUrl: row[14] ? String(row[14]).trim() : "",
      bankPassbookUrl: row[15] ? String(row[15]).trim() : ""
    });
  }

  return records;
}

export async function updateDocumentsVerificationRecord(
  record: DocumentVerificationRecord,
  userRole: string,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  const normalizedRole = (userRole || "").trim().toLowerCase();
  const isAuthorized = normalizedRole.includes("super admin") || normalizedRole.includes("admin") || normalizedRole === "superadmin";

  if (!isAuthorized) {
    throw new Error("Permission Denied: Only Admin or Super Admin can edit document verification data.");
  }

  const token = await ensureAccessToken(accessToken);
  if (!token) {
    throw new Error("Google OAuth access token missing. Please sign in to save changes.");
  }

  const range = `Documents_Verification!A${record.rowIndex}:P${record.rowIndex}`;
  const values = [[
    record.driverId || "",
    record.etmId || "",
    record.driverName || "",
    record.mobileNumber || "",
    record.profilePhotoUrl || "",
    record.aadhaarFrontUrl || "",
    record.aadhaarBackUrl || "",
    record.aadhaarNumber || "",
    record.panCardUrl || "",
    record.panNumber || "",
    record.dlFrontUrl || "",
    record.dlBackUrl || "",
    record.dlNumber || "",
    record.addressProofText || "",
    record.addressProofPhotoUrl || "",
    record.bankPassbookUrl || ""
  ]];

  console.log(`[Documents_Verification] Updating row ${record.rowIndex} at range ${range}:`, values);
  await updateSheetRange(range, values, token);

  clearSheetCache();
  return { success: true, message: "Saved successfully." };
}

/**
 * Helper to convert 0-based column index to Google Sheets column letter (A, B, C, ..., Z, AA, AB, etc.)
 */
export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Updates a single cell in "Hissab Summary" sheet at a specific row (1-based index) and column (0-based index)
 */
export async function updateHissabSummaryCell(
  rowIndex: number,
  colIndex: number,
  newValue: string,
  accessToken?: string | null
): Promise<any> {
  const colLetter = getColumnLetter(colIndex);
  const range = `'Hissab Summary'!${colLetter}${rowIndex}`;
  const response = await updateSheetRange(range, [[newValue]], accessToken);
  clearSheetCache();
  return response;
}

/**
 * Inserts new CSV records at the TOP of "Hissab Summary" sheet (immediately below Row 1 header)
 * Preserves all existing data below the new records.
 */
export async function insertHissabSummaryRecordsAtTop(
  headers: string[],
  newCsvMappedRows: string[][],
  existingDataRows: string[][],
  accessToken?: string | null
): Promise<any> {
  const combinedMatrix = [headers, ...newCsvMappedRows, ...existingDataRows];
  const endColLetter = getColumnLetter(Math.max(headers.length - 1, 0));
  const endRowIndex = combinedMatrix.length;
  const range = `'Hissab Summary'!A1:${endColLetter}${endRowIndex}`;

  const response = await updateSheetRange(range, combinedMatrix, accessToken);
  clearSheetCache();
  return response;
}

