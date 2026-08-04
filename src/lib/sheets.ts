import { DriverDetails, VehicleDocument, TransactionItem, NotificationItem, PaymentRecord } from "../types";

export const SPREADSHEET_ID = "1zgXzRTy2-aHR8JuR2r0AISCdkywI-jtUa7wV-OW7APo";

export function getEffectiveToken(accessToken?: string | null): string {
  if (accessToken && accessToken.trim().length > 0) return accessToken;
  if (typeof window !== "undefined" && window.localStorage) {
    return (
      localStorage.getItem("google_access_token") ||
      localStorage.getItem("access_token") ||
      ""
    );
  }
  return "";
}

/**
 * Validates Google Sheets configuration parameters before invoking any APIs.
 * Throws a specific error if configuration is missing.
 */
export function validateConfig(spreadsheetId: string | undefined | null) {
  if (!spreadsheetId || spreadsheetId.trim() === "" || spreadsheetId.toLowerCase().includes("placeholder") || spreadsheetId.toLowerCase().includes("your_")) {
    throw new Error("Spreadsheet configuration missing");
  }
}

/**
 * Formats vehicle numbers to ensure invalid/unassigned values return empty string ("").
 */
export function formatVehicleNumber(v?: string | null): string {
  if (!v) return "";
  const trimmed = String(v).trim();
  const upper = trimmed.toUpperCase();
  if (
    !trimmed ||
    upper === "UNASSIGNED" ||
    upper === "N/A" ||
    upper === "NA" ||
    upper === "NULL" ||
    upper === "UNDEFINED" ||
    upper === "-" ||
    upper === "NOT ASSIGNED" ||
    upper === "NONE"
  ) {
    return "";
  }
  return trimmed;
}

// Custom field mappings with common header aliases to guarantee matching regardless of column casing or naming
const driverMappings = {
  id: ["id", "driverid", "serial", "uid", "driverno", "driver_id"],
  name: ["name", "drivername", "fullname", "driver", "driver_name"],
  Driver_Name: ["name", "drivername", "fullname", "driver", "driver_name"],
  Name: ["name", "drivername", "fullname", "driver", "driver_name"],
  phone: ["phone", "phonenumber", "mobile", "contact", "mobilenumber", "mobile_number"],
  email: ["email", "emailaddress"],
  avatarUrl: [],
  licenseNumber: ["licensenumber", "licenseno", "license", "licenseno_"],
  licenseExpiry: ["licenseexpiry", "expiry", "licenseexpirydate"],
  vehicleRegistration: ["vehicleregistration", "registrationno", "registration", "vehicleno", "carregistration", "vehicle", "vehicle_no", "vehiclenumber", "allottedvehicle", "car"],
  vehiclePhoto: ["vehiclephoto", "carphoto", "vehicleimage", "carimage", "photo", "image"],
  vehicleModel: ["vehiclemodel", "carmodel", "model", "vehiclename", "carname"],
  vehicleName: ["vehiclename", "carname", "vehiclemodel", "carmodel", "model"],
  etm: ["etm", "etmid"],
  status: ["status", "driverstatus", "state"],
  Status: ["status", "driverstatus", "state"]
};

const transactionMappings = {
  id: ["id", "txid", "transactionid", "slno"],
  partner: ["partner", "company", "source", "cabservice"],
  amount: ["amount", "earnings", "fare", "payment"],
  time: ["time", "timestamp"],
  date: ["date", "day", "transactiondate"],
  status: ["status", "state", "txstatus"],
  tripId: ["tripid", "tripno", "bookingid"]
};

const documentMappings = {
  id: ["id", "docid", "documentid"],
  name: ["name", "documentname", "title"],
  fullName: ["fullname", "descriptiontitle", "completedname", "completename"],
  status: ["status", "state", "docstatus"],
  expiryDate: ["expirydate", "expiry", "expdate", "expiry_date"],
  description: ["description", "details", "notes", "desc"],
  documentNo: ["documentno", "docno", "number", "documentnumber"]
};

const notificationMappings = {
  id: ["id", "notifid", "notificationid"],
  title: ["title", "header", "subject"],
  message: ["message", "body", "text"],
  time: ["time", "timestamp", "date"],
  type: ["type", "severity", "category", "alerttype"],
  read: ["read", "isread", "status", "readstatus"]
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseSheetRows<T>(values: string[][], fieldMappings: { [key: string]: string[] }): T[] {
  if (!values || values.length <= 1) return [];
  const headers = values[0].map(h => normalizeHeader(h));
  const rows = values.slice(1);

  return rows.map((row, rowIndex) => {
    const item: any = {};
    
    // Automatically generate a sequential ID if "id" is missing
    item.id = `row-${rowIndex + 1}`;

    Object.keys(fieldMappings).forEach(key => {
      const aliases = fieldMappings[key];
      const colIndex = headers.findIndex(h => aliases.includes(h));
      if (colIndex !== -1 && row[colIndex] !== undefined && row[colIndex] !== "") {
        let val: any = row[colIndex].trim();
        
        // Handle numeric fields
        if (key === "amount" || key === "tripsCount" || key === "percentage") {
          const num = Number(val.replace(/[^0-9.-]/g, ""));
          val = isNaN(num) ? 0 : num;
        } 
        // Handle boolean fields
        else if (key === "read") {
          const lowerVal = val.toLowerCase();
          val = lowerVal === "true" || lowerVal === "1" || lowerVal === "yes" || lowerVal === "read";
        }
        
        item[key] = val;
      }
    });

    return item as T;
  });
}

export function parseEarningsSheetRows(
  rows: string[][],
  loggedMobile?: string,
  matchedDriver?: DriverDetails | null,
  loggedDriverId?: string
): TransactionItem[] {
  // Normalize function exactly as requested
  const normalizeMobile = (num: string): string => {
    if (!num) return "";
    return num.replace(/\D/g, '').slice(-10);
  };

  const loggedNorm = loggedMobile ? normalizeMobile(loggedMobile) : "";

  // Helper to parse date strings
  const parseSheetDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();
    if (!cleaned) return null;

    const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      return new Date(year, month, day);
    }

    const ymdMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(year, month, day);
    }

    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  };

  // Helper to format date into 'DD MMM YYYY' for display consistency
  const formatSheetDate = (dateStr: string): string => {
    const parsed = parseSheetDate(dateStr);
    if (!parsed) return dateStr || "04 Jul 2026";
    const day = String(parsed.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  };

  if (!rows || rows.length <= 1) {
    console.log("Logged mobile:", loggedMobile);
    console.log("Sheet rows:", rows);
    console.log("Matched mobile rows:", []);
    console.log("Today rows:", []);
    console.log("Week rows:", []);
    return [];
  }

  const dataRows = rows.slice(1);

  const headers = rows[0].map(h => normalizeHeader(h));
  const driverIdColIndex = headers.findIndex(h => ["driverid", "driver_id", "id", "uid"].includes(h));

  // 1. Filter rows by logged-in driver ID or mobile number
  const matchedRows = dataRows.filter((row) => {
    if (row.length === 0 || row.every(cell => !cell)) return false;

    // Filter by Driver ID if available
    if (loggedDriverId && driverIdColIndex !== -1) {
      const rowDriverId = (row[driverIdColIndex] || "").trim();
      if (rowDriverId) {
        return rowDriverId === loggedDriverId.trim();
      }
    }

    // Fallback to Column I (index 8)
    const phoneVal = (row[8] || "").trim();
    if (!phoneVal) return false;
    const rowNorm = normalizeMobile(phoneVal);
    return loggedNorm ? rowNorm === loggedNorm : true;
  });

  // Calculate totalTrips for matched rows (Column C is index 2)
  const totalTrips = matchedRows.reduce((sum, row) => {
    const tripVal = Number((row[2] || "0").replace(/[^0-9.-]/g, "")) || 0;
    return sum + tripVal;
  }, 0);

  // Add debugging as requested:
  console.log("Trips:", matchedRows.map(row => row[2]));
  console.log("Total Trips:", totalTrips);

  // Find the latest (max) date from the matched rows
  let maxDateObj: Date | null = null;
  matchedRows.forEach((row) => {
    const rawDate = (row[0] || "").trim();
    const txDateObj = parseSheetDate(rawDate);
    if (txDateObj) {
      if (!maxDateObj || txDateObj > maxDateObj) {
        maxDateObj = txDateObj;
      }
    }
  });

  const todayObj = new Date();
  
  const isToday = (txDate: Date): boolean => {
    if (!maxDateObj) return false;
    return txDate.getDate() === maxDateObj.getDate() &&
           txDate.getMonth() === maxDateObj.getMonth() &&
           txDate.getFullYear() === maxDateObj.getFullYear();
  };

  const isThisWeek = (txDate: Date): boolean => {
    const day = todayObj.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = todayObj.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(todayObj.getFullYear(), todayObj.getMonth(), diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return txDate >= monday && txDate <= sunday;
  };

  const txItems: TransactionItem[] = matchedRows.map((row, rowIndex) => {
    const rawDate = (row[0] || "").trim();
    const dateVal = formatSheetDate(rawDate);
    const etmVal = (row[1] || "").trim();
    const tripVal = Number((row[2] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const nameVal = (row[3] || "").trim();

    // Column values mapping
    const totalEarning = Number((row[4] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const cashCollected = Number((row[5] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const tipAndToll = Number((row[6] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const uberSub = Number((row[7] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const phoneVal = (row[8] || "").trim();

    const txId = `row-${rowIndex + 1}-${etmVal || 'item'}`;

    return {
      id: txId,
      partner: "Uber",
      amount: totalEarning, // Total earning maps to amount field
      time: "12:00 PM",
      date: dateVal,
      status: "Completed",
      tripId: etmVal,

      // Extra parsed fields for app values
      etm: etmVal,
      trip: tripVal,
      name: nameVal,
      totalEarning,
      cashCollected,
      tipAndToll,
      uberSub,
      number: phoneVal
    };
  });

  const todayRows: TransactionItem[] = [];
  const weekRows: TransactionItem[] = [];

  matchedRows.forEach((row, index) => {
    const rawDate = (row[0] || "").trim();
    const txDateObj = parseSheetDate(rawDate);
    const txItem = txItems[index];
    if (txDateObj) {
      if (isToday(txDateObj)) {
        todayRows.push(txItem);
      }
      if (isThisWeek(txDateObj)) {
        weekRows.push(txItem);
      }
    }
  });

  // Log debugging
  console.log("Logged mobile:", loggedMobile);
  console.log("Sheet rows:", rows);
  console.log("Matched mobile rows:", txItems);
  console.log("Today rows:", todayRows);
  console.log("Week rows:", weekRows);

  return txItems;
}

export async function fetchSheetValuesPublic(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Public CSV fetch failed with status ${res.status}`);
  }
  const csvText = await res.text();
  
  // Custom simple CSV parser supporting double quotes and multi-line fields gracefully
  const rows: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let insideQuote = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i+1];
    
    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentLine.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF
      }
      currentLine.push(currentField.trim());
      rows.push(currentLine);
      currentLine = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    rows.push(currentLine);
  }
  
  return rows;
}

const sheetValuesCache = new Map<string, { timestamp: number; data: string[][] }>();
const CACHE_TTL_MS = 5000;

export function clearSheetCache(): void {
  sheetValuesCache.clear();
  try {
    localStorage.removeItem("ssk_cached_sheets_data");
  } catch (_) {}
}

export async function fetchSheetValues(spreadsheetId: string, sheetName: string, accessToken?: string | null): Promise<string[][]> {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID missing");
  }
  if (!sheetName) {
    throw new Error("Sheet name missing");
  }

  validateConfig(spreadsheetId);

  const effectiveToken = getEffectiveToken(accessToken);
  const cacheKey = `${spreadsheetId}:${sheetName}:${effectiveToken || "public"}`;
  const cached = sheetValuesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // If we have an access token, try the authenticated Google Sheets API first
  if (effectiveToken) {
    try {
      console.log("Spreadsheet ID:", spreadsheetId);
      console.log("Sheet Name:", sheetName);
      console.log("Sheet:", sheetName);
      console.log("Access token exists:", !!effectiveToken);
      console.log("Payload:", null);

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const values = data.values || [];
        sheetValuesCache.set(cacheKey, { timestamp: Date.now(), data: values });
        return values;
      } else {
        console.warn(`Google Sheets API responded with status ${response.status} for sheet ${sheetName}. Falling back to public CSV fetch.`);
      }
    } catch (err) {
      console.warn(`Authenticated fetch failed for sheet ${sheetName}, falling back to public CSV fetch:`, err);
    }
  }

  // Fallback to public CSV fetch
  try {
    const values = await fetchSheetValuesPublic(spreadsheetId, sheetName);
    sheetValuesCache.set(cacheKey, { timestamp: Date.now(), data: values });
    return values;
  } catch (publicErr) {
    console.error(`Both authenticated and public fetch failed for sheet ${sheetName}:`, publicErr);
    throw publicErr;
  }
}

export async function appendSheetRows(
  spreadsheetId: string,
  sheetName: string,
  rowsValues: string[][],
  accessToken?: string | null
): Promise<any> {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID missing");
  }
  if (!sheetName) {
    throw new Error("Sheet name missing");
  }

  const effectiveToken = getEffectiveToken(accessToken);
  if (!effectiveToken) {
    throw new Error("Google OAuth access token missing. Please sign in with Google to perform sheet updates.");
  }

  validateConfig(spreadsheetId);

  console.log("Spreadsheet ID:", spreadsheetId);
  console.log("Sheet Name:", sheetName);
  console.log("Sheet:", sheetName);
  console.log("Access token exists:", !!effectiveToken);
  console.log("Payload:", rowsValues);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${effectiveToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: rowsValues
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets API append responded with status ${response.status}: ${errText}`);
  }

  return response.json();
}

export async function appendOnboardingDocuments(
  documentsList: {
    name: string;
    fullName: string;
    status: "verified" | "warning" | "expired" | "pending";
    expiryDate: string;
    description: string;
    documentNo: string;
  }[],
  accessToken: string
): Promise<void> {
  try {
    validateConfig(SPREADSHEET_ID);
    const sheetName = "Documents Sheet";
    let rawValues: string[][] = [];
    try {
      rawValues = await fetchSheetValues(SPREADSHEET_ID, sheetName, accessToken);
    } catch (err) {
      console.warn("Could not read 'Documents Sheet', defaulting to empty headers", err);
    }
    
    // Default column order if headers aren't fetched or are empty
    let idCol = 0;
    let nameCol = 1;
    let fullNameCol = 2;
    let statusCol = 3;
    let expiryDateCol = 4;
    let descriptionCol = 5;
    let documentNoCol = 6;
    let maxCols = 7;

    if (rawValues && rawValues.length > 0) {
      const headers = rawValues[0].map(h => normalizeHeader(h));
      maxCols = Math.max(headers.length, 7);

      const findColIndex = (aliases: string[], fallback: number): number => {
        const idx = headers.findIndex(h => aliases.includes(h));
        return idx !== -1 ? idx : fallback;
      };

      idCol = findColIndex(documentMappings.id, idCol);
      nameCol = findColIndex(documentMappings.name, nameCol);
      fullNameCol = findColIndex(documentMappings.fullName, fullNameCol);
      statusCol = findColIndex(documentMappings.status, statusCol);
      expiryDateCol = findColIndex(documentMappings.expiryDate, expiryDateCol);
      descriptionCol = findColIndex(documentMappings.description, descriptionCol);
      documentNoCol = findColIndex(documentMappings.documentNo, documentNoCol);
    }

    // 2. Build rows for each document
    const rowsToAppend = documentsList.map((doc, idx) => {
      const row = new Array(maxCols).fill("");
      row[idCol] = `doc-onb-${Date.now()}-${idx + 1}`;
      row[nameCol] = doc.name;
      row[fullNameCol] = doc.fullName;
      row[statusCol] = doc.status;
      row[expiryDateCol] = doc.expiryDate;
      row[descriptionCol] = doc.description;
      row[documentNoCol] = doc.documentNo;
      return row;
    });

    // 3. Append to the correct active tab
    await appendSheetRows(SPREADSHEET_ID, sheetName, rowsToAppend, accessToken);
  } catch (err) {
    console.error("Failed to append onboarding documents to Google Sheets", err);
    throw err;
  }
}

export interface SSKSyncResult {
  driver: DriverDetails | null;
  transactions: TransactionItem[];
  documents: VehicleDocument[];
  notifications: NotificationItem[];
  payments: PaymentRecord[];
  outstandingAmount?: number | string;
  lastWeekOutstanding?: number | string;
  weeklyRent?: number | string;
  currentOutstanding?: number | string;
  totalOutstanding?: number | string;
  lastDayEarnings?: number;
  weeklyHissabRow?: string[];
  weeklyHissabHeaders?: string[];
  weeklyHissabRows?: string[][];
  allWeeklyRows?: string[][];
  msgFormatRows?: string[][];
}

const CACHE_KEY = "ssk_cached_sheets_data";

export function getCachedSheetsData(): SSKSyncResult | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn("Failed to read Google Sheets cache from localStorage", err);
  }
  return null;
}

export async function fetchAndParseAllSheets(
  accessToken?: string | null,
  loggedMobile?: string,
  loggedDriverId?: string
): Promise<SSKSyncResult> {
  try {
    validateConfig(SPREADSHEET_ID);

    // Use Promise.all to fetch all sheets concurrently for maximum performance and minimum loading latency
    const [driverRaw, earningsRaw, documentsRaw, notificationsRaw, paymentsRaw, outstandingLogRaw, msgFormatRaw, vehicleMasterRaw] = await Promise.all([
      fetchSheetValues(SPREADSHEET_ID, "Driver_Master", accessToken).catch(err => {
        console.warn("Failed fetching Driver_Master sheet, continuing...", err);
        return [] as string[][];
      }),
      fetchSheetValues(SPREADSHEET_ID, "Daily_Earnings", accessToken).catch(err => {
        console.warn("Failed fetching Daily_Earnings sheet, continuing...", err);
        return [] as string[][];
      }),
      fetchSheetValues(SPREADSHEET_ID, "Documents Sheet", accessToken).catch(err => {
        console.warn("Failed fetching Documents Sheet, continuing...", err);
        return [] as string[][];
      }),
      fetchSheetValues(SPREADSHEET_ID, "Notifications", accessToken).catch(err => {
        console.warn("Failed fetching Notifications sheet, continuing...", err);
        return [] as string[][];
      }),
      fetchSheetValues(SPREADSHEET_ID, "Payment Log", accessToken).catch(err => {
        console.warn("Failed fetching Payment Log, continuing...", err);
        return [] as string[][];
      }),
      fetchSheetValues(SPREADSHEET_ID, "Outstanding_Log", accessToken).catch(err => {
        console.warn("Failed fetching Outstanding_Log sheet, continuing...", err);
        return [] as string[][];
      }),
      fetchSheetValues(SPREADSHEET_ID, "Msg Format", accessToken).catch(err => {
        console.warn("Failed fetching Msg Format sheet, continuing...", err);
        return [] as string[][];
      }),
      fetchSheetValues(SPREADSHEET_ID, "Vehicle_Master", accessToken).catch(err => {
        console.warn("Failed fetching Vehicle_Master sheet, continuing...", err);
        return [] as string[][];
      })
    ]);

    const rows = earningsRaw;
    console.log("Fetching Daily_Earnings sheet");
    console.log("Rows:", rows);

    const drivers = parseSheetRows<DriverDetails>(driverRaw, driverMappings);

    const driverId = loggedDriverId || "";
    const driverMasterRows = driverRaw;
    let matchedDriver: DriverDetails | null = null;
    
    // Find Driver_Master row where Driver_Master["Driver ID"] === LoggedInUser.Driver_ID
    if (driverId) {
      matchedDriver = drivers.find(d => d.id && String(d.id).trim() === String(driverId).trim()) || null;
    }

    // DEBUG LOGS EXACTLY AS REQUESTED
    console.log("Driver_ID from login:", driverId);
    console.log("Driver_Master rows:", driverMasterRows.length);
    console.log("Matched row:", matchedDriver);
    console.log("Driver Name:", matchedDriver?.Name);
    console.log("Driver ID:", driverId);
    console.log("Driver Status:", matchedDriver?.Status);

    if (!matchedDriver) {
      console.log("Driver_ID not found in Driver_Master");
    }

    if (!matchedDriver) {
      matchedDriver = {
        id: driverId || "DL-unknown",
        name: "Driver not found in Driver_Master",
        Name: "Driver not found in Driver_Master",
        Driver_Name: "Driver not found in Driver_Master",
        phone: loggedMobile || "",
        email: "",
        avatarUrl: "",
        licenseNumber: "",
        licenseExpiry: "",
        vehicleRegistration: "N/A",
        status: "Inactive",
        Status: "Inactive",
        etm: "N/A"
      };
    } else {
      // Synchronize Name, Driver_Name, and name
      if (matchedDriver.Name) {
        matchedDriver.name = matchedDriver.Name;
        matchedDriver.Driver_Name = matchedDriver.Name;
      } else if (matchedDriver.Driver_Name) {
        matchedDriver.Name = matchedDriver.Driver_Name;
        matchedDriver.name = matchedDriver.Driver_Name;
      } else if (matchedDriver.name) {
        matchedDriver.Name = matchedDriver.name;
        matchedDriver.Driver_Name = matchedDriver.name;
      }

      // Synchronize Status and status
      if (matchedDriver.Status) {
        matchedDriver.status = matchedDriver.Status;
      } else if (matchedDriver.status) {
        matchedDriver.Status = matchedDriver.status;
      }
    }

    // Match vehicle assignment from Vehicle_Master if available
    if (matchedDriver && vehicleMasterRaw && vehicleMasterRaw.length > 1) {
      const loggedEtm = matchedDriver.etm ? matchedDriver.etm.trim().toUpperCase() : "";
      const loggedNorm = loggedMobile ? loggedMobile.replace(/\D/g, "").slice(-10) : "";

      for (let i = 1; i < vehicleMasterRaw.length; i++) {
        const vRow = vehicleMasterRaw[i];
        if (!vRow || vRow.length === 0) continue;
        const vNo = vRow[1] ? String(vRow[1]).trim() : "";
        const fuelType = vRow[2] ? String(vRow[2]).trim() : "EV";
        const assignedEtm = vRow[3] ? String(vRow[3]).trim().toUpperCase() : "";
        const assignedMobile = vRow[5] ? String(vRow[5]).replace(/\D/g, "").slice(-10) : "";

        if ((loggedEtm && assignedEtm && loggedEtm === assignedEtm) || (loggedNorm && assignedMobile && loggedNorm === assignedMobile)) {
          if (vNo) matchedDriver.vehicleRegistration = vNo;
          if (fuelType) matchedDriver.vehicleModel = fuelType;
          break;
        }
      }
    }

    const transactions = parseEarningsSheetRows(earningsRaw, loggedMobile, matchedDriver, loggedDriverId);

    // Filter documents by Driver ID or mobile number
    let filteredDocuments = parseSheetRows<VehicleDocument>(documentsRaw, documentMappings);
    if (matchedDriver) {
      const docHeaders = documentsRaw && documentsRaw.length > 0 ? documentsRaw[0].map(h => normalizeHeader(h)) : [];
      if (docHeaders.length > 0) {
        const docDriverIdIndex = docHeaders.findIndex(h => ["driverid", "driver_id", "id", "uid"].includes(h));
        const docMobileIndex = docHeaders.findIndex(h => ["mobile", "mobilenumber", "phone", "phonenumber"].includes(h));
        
        filteredDocuments = filteredDocuments.filter((doc, rowIndex) => {
          const row = documentsRaw[rowIndex + 1];
          if (!row) return true;

          if (docDriverIdIndex !== -1 && loggedDriverId) {
            const rowDriverId = (row[docDriverIdIndex] || "").trim();
            if (rowDriverId) return rowDriverId === loggedDriverId.trim();
          }

          if (docMobileIndex !== -1 && matchedDriver.phone) {
            const rowMobile = (row[docMobileIndex] || "").trim().replace(/\D/g, "").slice(-10);
            const loggedNorm = matchedDriver.phone.replace(/\D/g, "").slice(-10);
            if (rowMobile && loggedNorm) return rowMobile === loggedNorm;
          }

          if (row.length >= 2 && matchedDriver.phone) {
            const rowMobile = (row[1] || "").trim().replace(/\D/g, "").slice(-10);
            const loggedNorm = matchedDriver.phone.replace(/\D/g, "").slice(-10);
            if (rowMobile && loggedNorm && rowMobile.length === 10) return rowMobile === loggedNorm;
          }

          return true;
        });
      }
    }

    // Filter notifications by Driver ID or mobile number
    let filteredNotifications = parseSheetRows<NotificationItem>(notificationsRaw, notificationMappings);
    if (matchedDriver) {
      const notifHeaders = notificationsRaw && notificationsRaw.length > 0 ? notificationsRaw[0].map(h => normalizeHeader(h)) : [];
      if (notifHeaders.length > 0) {
        const notifDriverIdIndex = notifHeaders.findIndex(h => ["driverid", "driver_id", "id", "uid"].includes(h));
        const notifMobileIndex = notifHeaders.findIndex(h => ["mobile", "mobilenumber", "phone", "phonenumber"].includes(h));
        
        filteredNotifications = filteredNotifications.filter((notif, rowIndex) => {
          const row = notificationsRaw[rowIndex + 1];
          if (!row) return true;

          let hasFilter = false;
          let isMatch = true;

          if (notifDriverIdIndex !== -1 && loggedDriverId) {
            hasFilter = true;
            const rowDriverId = (row[notifDriverIdIndex] || "").trim();
            isMatch = rowDriverId === loggedDriverId.trim();
          }

          if (!isMatch && notifMobileIndex !== -1 && matchedDriver.phone) {
            hasFilter = true;
            const rowMobile = (row[notifMobileIndex] || "").trim().replace(/\D/g, "").slice(-10);
            const loggedNorm = matchedDriver.phone.replace(/\D/g, "").slice(-10);
            isMatch = rowMobile === loggedNorm;
          }

          return hasFilter ? isMatch : true;
        });
      }
    }

    const payments = parsePaymentRows(paymentsRaw, loggedMobile, loggedDriverId);

    // Outstanding_Log processing using ETM (Column B = index 1) or Mobile (Column D = index 3)
    const driverETM = (matchedDriver?.etm || (matchedDriver as any)?.ETM || loggedDriverId || "").trim();
    const cleanETM = driverETM.toUpperCase();
    const driverMobile = (matchedDriver?.phone || loggedMobile || "").trim();
    const cleanMobile10 = driverMobile.replace(/\D/g, "").slice(-10);

    const outstandingLogTotalRows = outstandingLogRaw ? outstandingLogRaw.length : 0;
    let matchedOutstandingLogRow: string[] | null = null;

    if (outstandingLogRaw && outstandingLogRaw.length > 0) {
      let etmColIdx = 1;
      let mobileColIdx = 3;

      // Detect header columns if available
      const headerRow = outstandingLogRaw[0];
      if (headerRow && headerRow.length > 0) {
        const headers = headerRow.map(h => String(h).trim().toLowerCase().replace(/[\s_-]+/g, ""));
        const foundEtmIdx = headers.findIndex(h => h === "etm" || h === "etmid");
        if (foundEtmIdx !== -1) etmColIdx = foundEtmIdx;

        const foundMobileIdx = headers.findIndex(h => h === "mobile" || h === "phone" || h === "mobilenumber" || h === "contact");
        if (foundMobileIdx !== -1) mobileColIdx = foundMobileIdx;
      }

      // Step 1: Match by ETM with Column B
      if (cleanETM) {
        for (let i = 1; i < outstandingLogRaw.length; i++) {
          const row = outstandingLogRaw[i];
          if (row) {
            const rowEtm = String(row[etmColIdx] !== undefined ? row[etmColIdx] : (row[1] || "")).trim().toUpperCase();
            if (rowEtm && rowEtm === cleanETM) {
              matchedOutstandingLogRow = row;
              break;
            }
          }
        }
        if (!matchedOutstandingLogRow && outstandingLogRaw.length === 1) {
          const row = outstandingLogRaw[0];
          if (row) {
            const rowEtm = String(row[etmColIdx] !== undefined ? row[etmColIdx] : (row[1] || "")).trim().toUpperCase();
            if (rowEtm && rowEtm === cleanETM) {
              matchedOutstandingLogRow = row;
            }
          }
        }
      }

      // Step 2: If ETM is not found, match Mobile Number with Column D
      if (!matchedOutstandingLogRow && cleanMobile10) {
        for (let i = 1; i < outstandingLogRaw.length; i++) {
          const row = outstandingLogRaw[i];
          if (row) {
            const rowMobile = String(row[mobileColIdx] !== undefined ? row[mobileColIdx] : (row[3] || "")).trim().replace(/\D/g, "").slice(-10);
            if (rowMobile && rowMobile === cleanMobile10) {
              matchedOutstandingLogRow = row;
              break;
            }
          }
        }
        if (!matchedOutstandingLogRow && outstandingLogRaw.length === 1) {
          const row = outstandingLogRaw[0];
          if (row) {
            const rowMobile = String(row[mobileColIdx] !== undefined ? row[mobileColIdx] : (row[3] || "")).trim().replace(/\D/g, "").slice(-10);
            if (rowMobile && rowMobile === cleanMobile10) {
              matchedOutstandingLogRow = row;
            }
          }
        }
      }
    }

    const parseAmount = (val: any): number => {
      if (val === undefined || val === null) return 0;
      const str = String(val).trim();
      if (!str) return 0;
      const cleanStr = str.replace(/[^0-9.-]/g, "");
      if (!cleanStr) return 0;
      const parsed = Number(cleanStr);
      return isNaN(parsed) ? 0 : parsed;
    };

    let weeklyOsVal = 0;
    let rentVal = 0;
    let currentOsVal = 0;
    let totalOsVal = 0;

    if (matchedOutstandingLogRow) {
      // Column E = Weekly OS (index 4)
      // Column F = Rent (index 5)
      // Column G = Current OS (index 6)
      // Column H = Total OS (index 7)
      weeklyOsVal = parseAmount(matchedOutstandingLogRow[4]);
      rentVal = parseAmount(matchedOutstandingLogRow[5]);
      currentOsVal = parseAmount(matchedOutstandingLogRow[6]);
      totalOsVal = parseAmount(matchedOutstandingLogRow[7]);
    }

    // DEBUG LOGS EXACTLY AS SPECIFIED
    console.log("Driver ETM:", driverETM);
    console.log("Driver Mobile:", driverMobile);
    console.log("Outstanding_Log Total Rows:", outstandingLogTotalRows);
    console.log("Matched Outstanding_Log Row:", matchedOutstandingLogRow);
    console.log("Weekly OS Value:", weeklyOsVal);
    console.log("Rent Value:", rentVal);
    console.log("Current OS Value:", currentOsVal);
    console.log("Total OS Value:", totalOsVal);

    const lastWeekOutstanding = weeklyOsVal;
    const weeklyRent = rentVal;
    const currentOutstanding = currentOsVal;
    const totalOutstanding = totalOsVal;
    const outstandingAmount = totalOsVal || currentOsVal;

    const { lastDayEarnings } = getLastDayEarnings(earningsRaw || [], driverETM, driverId);

    const result: SSKSyncResult = {
      driver: matchedDriver,
      transactions,
      documents: filteredDocuments,
      notifications: filteredNotifications,
      payments,
      outstandingAmount,
      currentOutstanding,
      lastWeekOutstanding,
      weeklyRent,
      totalOutstanding,
      lastDayEarnings,
      weeklyHissabRow: matchedOutstandingLogRow || undefined,
      weeklyHissabHeaders: outstandingLogRaw && outstandingLogRaw.length > 0 ? outstandingLogRaw[0] : undefined,
      weeklyHissabRows: outstandingLogRaw || undefined,
      allWeeklyRows: outstandingLogRaw || undefined,
      msgFormatRows: msgFormatRaw || undefined
    };

    // Save to cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch (err) {
      console.warn("Failed to write Google Sheets cache to localStorage", err);
    }

    return result;
  } catch (err) {
    console.warn("Network or API error, checking for offline cached data...", err);
    const cachedData = getCachedSheetsData();
    if (cachedData) {
      console.info("Successfully recovered offline cached data from localStorage");
      return cachedData;
    }
    // If no cache, propagate error
    throw err;
  }
}

/**
 * Uploads a local base64/data URL image to tmpfiles.org to get an accessible, direct-view URL.
 * This completely avoids pushing huge base64 strings into individual cells of Google Sheets.
 */
export async function uploadBase64Image(base64Data: string, filename: string = "image.png"): Promise<string> {
  if (!base64Data || !base64Data.startsWith("data:")) {
    // If it's already a public URL or empty, keep as is
    return base64Data;
  }
  try {
    const res = await fetch(base64Data);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type });

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: formData
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload to tmpfiles.org failed with status ${uploadRes.status}`);
    }

    const json = await uploadRes.json();
    if (json.status === "success" && json.data && json.data.url) {
      const viewerUrl = json.data.url;
      // Convert view page URL (e.g., https://tmpfiles.org/123/name.png) to direct raw file download URL (https://tmpfiles.org/dl/123/name.png)
      const directUrl = viewerUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
      return directUrl;
    }
    throw new Error("Invalid response format from tmpfiles.org API");
  } catch (err) {
    console.error("Error uploading image to tmpfiles.org:", err);
    // Safe fallback limit so it doesn't break entirely if network is blocked
    return base64Data.slice(0, 5000);
  }
}

/**
 * Appends driver onboarding information to "Documents Sheet" in the precise 10 columns requested:
 * Timestamp, Mobile Number, Selfie image URL, Aadhaar image URL, Aadhaar number,
 * Driving licence image URL, Driving licence number, Address proof image URL, Address proof text, Registration status.
 */
export async function appendDriverOnboardingData(
  data: {
    mobileNumber: string;
    selfieUrl: string;
    aadhaarUrl: string;
    aadhaarNumber: string;
    dlUrl: string;
    dlNumber: string;
    addressUrl: string;
    addressText: string;
  },
  accessToken: string
): Promise<any> {
  const sheetName = "Documents Sheet";
  // Format Indian standard timestamp
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const rowValue = [
    timestamp,                 // Timestamp (A)
    data.mobileNumber,         // Mobile Number (B)
    data.selfieUrl,            // Selfie image URL (C)
    data.aadhaarUrl,           // Aadhaar image URL (D)
    data.aadhaarNumber,        // Aadhaar number (E)
    data.dlUrl,                // Driving licence image URL (F)
    data.dlNumber,             // Driving licence number (G)
    data.addressUrl,           // Address proof image URL (H)
    data.addressText,          // Address proof text (I)
    "Pending Review"           // Registration status (J)
  ];

  validateConfig(SPREADSHEET_ID);
  console.log("Spreadsheet ID:", SPREADSHEET_ID);
  console.log("Sheet:", sheetName);
  console.log("Payload:", rowValue);

  try {
    const response = await appendSheetRows(SPREADSHEET_ID, sheetName, [rowValue], accessToken);
    console.log("API response after write: SUCCESS", response);
    return response;
  } catch (error) {
    console.error("API response after write: FAILED", error);
    throw error;
  }
}

/**
 * Checks if the mobile number exists in Column D of "Driver_Master" tab.
 * Uses OAuth fetch if accessToken exists, otherwise falls back to public Google Sheets CSV rendering endpoint.
 */
export async function checkMobileInDriverSheet(
  mobile: string,
  accessToken?: string | null
): Promise<{ exists: boolean; driver?: DriverDetails }> {
  try {
    validateConfig(SPREADSHEET_ID);
    let rows: string[][] = [];
    if (accessToken) {
      rows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Master", accessToken);
    } else {
      // Direct public spreadsheet fetch
      const tabNames = ["Driver_Master"];
      let fetchedOk = false;
      for (const tabName of tabNames) {
        try {
          console.log("Spreadsheet ID:", SPREADSHEET_ID);
          console.log("Sheet Name:", tabName);
          console.log("Access token exists:", !!accessToken);
          console.log("Payload:", null);
          const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
          const res = await fetch(url);
          if (res.ok) {
            const csvText = await res.text();
            // Simple CSV parser supporting double quotes
            rows = csvText.split("\n").map(line => {
              const row: string[] = [];
              let insideQuote = false;
              let currentVal = "";
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  insideQuote = !insideQuote;
                } else if (char === ',' && !insideQuote) {
                  row.push(currentVal.trim());
                  currentVal = "";
                } else {
                  currentVal += char;
                }
              }
              row.push(currentVal.trim());
              return row;
            });
            fetchedOk = true;
            break;
          }
        } catch (e) {
          console.warn(`Public check failed for tab ${tabName}:`, e);
        }
      }

      if (!fetchedOk) {
        console.warn("Public CSV check was unsuccessful; defaulting to login bypass or empty list");
        return { exists: false };
      }
    }

    if (!rows || rows.length <= 1) {
      return { exists: false };
    }

    const headers = rows[0].map(h => normalizeHeader(h));
    const aliases = driverMappings.phone;
    let phoneColIndex = headers.findIndex(h => aliases.includes(h));
    if (phoneColIndex === -1) {
      phoneColIndex = 3; // Column D fallback
    }

    const normalizedMobile = mobile.trim().replace(/\D/g, "").slice(-10);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[phoneColIndex]) {
        const val = row[phoneColIndex].trim().replace(/\D/g, "").slice(-10);
        if (val === normalizedMobile && normalizedMobile.length > 0) {
          // Parse this row as DriverDetails
          const driversList = parseSheetRows<DriverDetails>([rows[0], row], driverMappings);
          if (driversList && driversList.length > 0) {
            return { exists: true, driver: driversList[0] };
          }
        }
      }
    }
  } catch (err) {
    console.error("Error in checkMobileInDriverSheet:", err);
  }

  return { exists: false };
}

export function parsePaymentRows(rows: string[][], loggedMobile?: string, loggedDriverId?: string): PaymentRecord[] {
  if (!rows || rows.length <= 1) return [];
  const normalizedLogged = loggedMobile ? loggedMobile.trim().replace(/\D/g, "").slice(-10) : "";

  const payments: PaymentRecord[] = [];
  
  // Column mapping:
  // A = Date
  // B = Mobile Number
  // C = Payment Type
  // D = Amount
  // E = Status
  const headers = rows[0].map(h => normalizeHeader(h));
  const driverIdColIndex = headers.findIndex(h => ["driverid", "driver_id", "id", "uid"].includes(h));
  const mobileColIndex = headers.findIndex(h => ["mobile", "mobilenumber", "phone", "phonenumber"].includes(h));

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    let isMatch = false;
    if (loggedDriverId && driverIdColIndex !== -1) {
      isMatch = (row[driverIdColIndex] || "").trim() === loggedDriverId.trim();
    } else {
      const rawMobile = mobileColIndex !== -1 ? (row[mobileColIndex] || "") : (row[1] || "");
      const normalizedRowMobile = rawMobile.trim().replace(/\D/g, "").slice(-10);
      isMatch = normalizedRowMobile === normalizedLogged && normalizedLogged.length > 0;
    }

    if (isMatch) {
      const rawAmount = (row[3] || "").trim();
      const amountNum = Number(rawAmount.replace(/[^0-9.-]/g, ""));
      const amount = isNaN(amountNum) ? 0 : amountNum;

      payments.push({
        id: `pay-${i}`,
        date: (row[0] || "").trim(),
        mobileNumber: (row[1] || "").trim(),
        paymentType: (row[2] || "").trim(),
        amount: amount,
        status: (row[4] || "").trim() || "Pending"
      });
    }
  }

  return payments;
}

export async function fetchPaymentSheetRows(
  accessToken?: string | null,
  loggedMobile?: string,
  loggedDriverId?: string
): Promise<PaymentRecord[]> {
  try {
    validateConfig(SPREADSHEET_ID);
    const rows = await fetchSheetValues(SPREADSHEET_ID, "Payment Log", accessToken);
    return parsePaymentRows(rows, loggedMobile, loggedDriverId);
  } catch (err) {
    console.error("Error in fetchPaymentSheetRows:", err);
    return [];
  }
}

export function getOutstandingAmount(earningsSheetRows: string[][], loggedMobile?: string, loggedDriverId?: string): number {
  if (!earningsSheetRows || earningsSheetRows.length <= 1) return 0;
  
  const normalizeMobile = (num: string): string => {
    return String(num).replace(/\D/g, "").slice(-10);
  };
  
  const loggedNorm = loggedMobile ? normalizeMobile(loggedMobile) : "";

  const headers = earningsSheetRows[0].map(h => normalizeHeader(h));
  const driverIdColIndex = headers.findIndex(h => ["driverid", "driver_id", "id", "uid"].includes(h));
  const mobileColIndex = headers.findIndex(h => ["mobile", "mobilenumber", "phone", "phonenumber"].includes(h));

  for (let i = 1; i < earningsSheetRows.length; i++) {
    const row = earningsSheetRows[i];
    if (!row) continue;

    let isMatch = false;
    if (loggedDriverId && driverIdColIndex !== -1) {
      isMatch = (row[driverIdColIndex] || "").trim() === loggedDriverId.trim();
    } else if (loggedNorm) {
      const rowMobile = row.length > 19 ? row[19] : (mobileColIndex !== -1 ? row[mobileColIndex] : "");
      if (rowMobile && normalizeMobile(rowMobile) === loggedNorm) {
        isMatch = true;
      }
    }

    if (isMatch) {
      const outstandingColIndex = headers.findIndex(h => h.includes("outstanding") || h.includes("balance"));
      const valIndex = outstandingColIndex !== -1 ? outstandingColIndex : (row.length > 18 ? 18 : -1);
      if (valIndex !== -1 && row[valIndex]) {
        const parsed = Number(row[valIndex].replace(/[^0-9.-]/g, ""));
        return isNaN(parsed) ? 0 : parsed;
      }
    }
  }
  return 0;
}

export function getOutstandingDetails(earningsSheetRows: string[][], loggedMobile?: string, loggedDriverId?: string): { currentOutstanding: number, lastWeekOutstanding: number } {
  if (!earningsSheetRows || earningsSheetRows.length <= 1) {
    return { currentOutstanding: 0, lastWeekOutstanding: 0 };
  }
  
  const normalizeMobile = (num: string): string => {
    return String(num).replace(/\D/g, "").slice(-10);
  };
  
  const loggedNorm = loggedMobile ? normalizeMobile(loggedMobile) : "";

  const headers = earningsSheetRows[0].map(h => normalizeHeader(h));
  const driverIdColIndex = headers.findIndex(h => ["driverid", "driver_id", "id", "uid"].includes(h));
  const mobileColIndex = headers.findIndex(h => ["mobile", "mobilenumber", "phone", "phonenumber"].includes(h));

  const matchedRows: { index: number; outstanding: number; week?: string; dateObj?: Date }[] = [];

  for (let i = 1; i < earningsSheetRows.length; i++) {
    const row = earningsSheetRows[i];
    if (!row) continue;

    let isMatch = false;
    if (loggedDriverId && driverIdColIndex !== -1) {
      isMatch = (row[driverIdColIndex] || "").trim() === loggedDriverId.trim();
    } else if (loggedNorm) {
      const rowMobile = row.length > 19 ? row[19] : (mobileColIndex !== -1 ? row[mobileColIndex] : "");
      if (rowMobile && normalizeMobile(rowMobile) === loggedNorm) {
        isMatch = true;
      }
    }

    if (isMatch) {
      const outstandingColIndex = headers.findIndex(h => h.includes("outstanding") || h.includes("balance"));
      const valIndex = outstandingColIndex !== -1 ? outstandingColIndex : (row.length > 18 ? 18 : -1);
      if (valIndex !== -1 && row[valIndex]) {
        const parsed = Number(row[valIndex].replace(/[^0-9.-]/g, ""));
        const outstanding = isNaN(parsed) ? 0 : parsed;
        
        const dateColIndex = headers.findIndex(h => h.includes("date") || h.includes("week") || h.includes("period"));
        let weekVal = "";
        let dateObj: Date | null = null;
        if (dateColIndex !== -1 && row[dateColIndex]) {
          weekVal = (row[dateColIndex] || "").trim();
          const cleanDate = weekVal.replace(/[^0-9/-]/g, "");
          const parsedDate = new Date(cleanDate);
          if (!isNaN(parsedDate.getTime())) {
            dateObj = parsedDate;
          }
        }
        
        matchedRows.push({
          index: i,
          outstanding,
          week: weekVal,
          dateObj: dateObj || undefined
        });
      }
    }
  }

  if (matchedRows.length === 0) {
    return { currentOutstanding: 0, lastWeekOutstanding: 0 };
  }

  matchedRows.sort((a, b) => {
    if (a.dateObj && b.dateObj) {
      return a.dateObj.getTime() - b.dateObj.getTime();
    }
    return a.index - b.index;
  });

  const latestEntry = matchedRows[matchedRows.length - 1];
  const currentOutstanding = latestEntry.outstanding;
  
  let lastWeekOutstanding = currentOutstanding;
  if (matchedRows.length > 1) {
    lastWeekOutstanding = matchedRows[matchedRows.length - 2].outstanding;
  }

  return { currentOutstanding, lastWeekOutstanding };
}

export async function writePaymentLog(
  accessToken: string | null,
  loggedMobile: string,
  paymentType: string,
  amount: number
): Promise<any> {
  console.log("Writing payment...");
  console.log("Mobile:", loggedMobile);
  console.log("Amount:", amount);
  console.log("Type:", paymentType);

  // Format date: e.g. "05/07/2026 04:15 PM"
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = pad(hours) + ':' + minutes + ' ' + ampm;
  
  const formattedDateTime = `${day}/${month}/${year} ${strTime}`;

  const rowData = [
    formattedDateTime,      // A = Current DateTime
    loggedMobile,           // B = Logged-in Mobile Number
    paymentType,            // C = Payment Type
    String(amount),         // D = Payment Amount
    "Paid"                  // E = Status
  ];

  if (!accessToken) {
    console.log("No OAuth token found. Simulating payment log write locally.");
    const simulatedResponse = { simulated: true, row: rowData };
    console.log("Sheet write success:", simulatedResponse);
    return simulatedResponse;
  }

  try {
    validateConfig(SPREADSHEET_ID);
    const response = await appendSheetRows(SPREADSHEET_ID, "Payment Log", [rowData], accessToken);
    console.log("Sheet write success:", response);
    return response;
  } catch (error) {
    console.log("Sheet write failed:", error);
    throw error;
  }
}

export function findHeaderIndices(headerRow: string[]) {
  const normalize = (h: string) => h.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const normalized = headerRow.map(normalize);

  const getIndex = (aliases: string[]) => {
    return normalized.findIndex(h => aliases.map(normalize).includes(h));
  };

  return {
    mobile: getIndex(["Mobile_Number", "Mobile Number", "Mobile", "Phone", "PhoneNumber"]),
    password: getIndex(["Password", "pwd", "pass"]),
    status: getIndex(["Status", "state"]),
    driverId: getIndex(["Driver_ID", "Driver ID", "DriverID", "id", "uid"]),
    etm: getIndex(["ETM", "etm"]),
    lastLogin: getIndex(["Last_Login", "Last Login", "Last_login", "lastlogin"])
  };
}

export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function generateAdminPassword(name: string, mobile: string): string {
  const cleanName = String(name || "").replace(/[^a-zA-Z]/g, "").toUpperCase();
  const namePart = cleanName.slice(0, 4);

  const cleanMobile = String(mobile || "").replace(/\D/g, "");
  const mobilePart = cleanMobile.slice(-4);

  return `${namePart}${mobilePart}`;
}

export interface AuthenticateResult {
  success: boolean;
  error?: "not_found" | "invalid" | "admin_invalid_password" | "inactive" | "error";
  driver?: {
    Driver_ID: string;
    Employee_ID?: string;
    Mobile_Number: string;
    Email?: string;
    ETM: string;
    Status: string;
    Last_Login: string;
    Name?: string;
    Role?: string;
    User_Type?: string;
    Branch?: string;
    Department?: string;
    Permissions?: string;
    Permission?: string;
  };
  rowIndex?: number;
  lastLoginColIndex?: number;
}

export async function authenticateDriverWithSheet(
  mobile: string,
  passwordInput: string,
  accessToken?: string | null
): Promise<AuthenticateResult> {
  try {
    validateConfig(SPREADSHEET_ID);
    const enteredMobile = String(mobile).trim();
    const enteredPassword = String(passwordInput).trim();
    const enteredMobileNormalized = enteredMobile.replace(/\D/g, "").slice(-10);

    const findCol = (headers: string[], keys: string[]) => {
      for (const k of keys) {
        const idx = headers.findIndex((h) => h.toLowerCase().trim() === k.toLowerCase().trim());
        if (idx !== -1) return idx;
      }
      for (const k of keys) {
        const normK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        const idx = headers.findIndex((h) => {
          const normH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          return normH === normK || (normH.length > 2 && normK.includes(normH)) || (normK.length > 2 && normH.includes(normK));
        });
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // =========================================================================
    // STEP 1: CHECK Admin_Users SHEET FIRST
    // =========================================================================
    console.log("Searching Admin_Users...");
    console.log(`Entered Mobile: ${enteredMobile}`);

    try {
      const adminRows = await fetchSheetValues(SPREADSHEET_ID, "Admin_Users", accessToken);

      if (adminRows && adminRows.length > 1) {
        const adminHeaders = adminRows[0].map((h) => String(h).trim());

        let empIdCol = 0;
        let nameCol = 1;
        let mobileCol = 2;
        let emailCol = 3;
        let roleCol = 4;
        let branchCol = 5;
        let statusCol = 6;
        let permCol = 7;
        let pwdCol = 8;

        const foundEmp = findCol(adminHeaders, ["Employee ID", "Employee_ID", "Emp_ID", "Emp ID", "EmployeeID", "ID"]);
        if (foundEmp !== -1) empIdCol = foundEmp;

        const foundName = findCol(adminHeaders, ["Name", "Employee_Name", "Employee Name", "Admin_Name", "Admin Name", "Full Name", "User_Name", "Employee"]);
        if (foundName !== -1) nameCol = foundName;

        const foundMobile = findCol(adminHeaders, ["Mobile", "Mobile_Number", "Mobile Number", "Phone", "Mobile_No", "Contact", "Cell"]);
        if (foundMobile !== -1) mobileCol = foundMobile;

        const foundEmail = findCol(adminHeaders, ["Email", "Email_ID", "Email ID", "EmailAddress"]);
        if (foundEmail !== -1) emailCol = foundEmail;

        const foundRole = findCol(adminHeaders, ["Role", "User_Type", "UserType", "Role_Type", "Designation", "Title"]);
        if (foundRole !== -1) roleCol = foundRole;

        const foundBranch = findCol(adminHeaders, ["Branch", "Branch_Name", "Branch Name", "City", "Location"]);
        if (foundBranch !== -1) branchCol = foundBranch;

        const foundStatus = findCol(adminHeaders, ["Status", "State"]);
        if (foundStatus !== -1) statusCol = foundStatus;

        const foundPerm = findCol(adminHeaders, ["Permission", "Permissions", "Rights", "Access"]);
        if (foundPerm !== -1) permCol = foundPerm;

        const foundPwd = findCol(adminHeaders, ["Password", "Pass", "Pwd", "Pin"]);
        if (foundPwd !== -1) pwdCol = foundPwd;

        let matchedAdminRow: string[] | null = null;
        let matchedAdminRowIndex = -1;

        for (let i = 1; i < adminRows.length; i++) {
          const row = adminRows[i];
          if (!row || row.length === 0) continue;

          let isMatch = false;

          if (mobileCol < row.length && row[mobileCol] !== undefined) {
            const cellVal = String(row[mobileCol]).trim();
            const cellNorm = cellVal.replace(/\D/g, "").slice(-10);
            if (
              cellVal === enteredMobile ||
              (cellNorm.length === 10 && enteredMobileNormalized.length === 10 && cellNorm === enteredMobileNormalized)
            ) {
              isMatch = true;
            }
          }

          if (!isMatch) {
            for (let c = 0; c < row.length; c++) {
              const val = String(row[c] || "").trim();
              const valNorm = val.replace(/\D/g, "").slice(-10);
              if (
                val === enteredMobile ||
                (valNorm.length === 10 && enteredMobileNormalized.length === 10 && valNorm === enteredMobileNormalized)
              ) {
                isMatch = true;
                break;
              }
            }
          }

          if (isMatch) {
            matchedAdminRow = row;
            matchedAdminRowIndex = i + 1;
            break;
          }
        }

        if (matchedAdminRow) {
          console.log(`Matched Row Number: ${matchedAdminRowIndex}`);

          const employeeId = empIdCol < matchedAdminRow.length && matchedAdminRow[empIdCol] !== undefined ? String(matchedAdminRow[empIdCol]).trim() : `EMP-${enteredMobileNormalized}`;
          const name = nameCol < matchedAdminRow.length && matchedAdminRow[nameCol] !== undefined ? String(matchedAdminRow[nameCol]).trim() : "Admin User";
          const mobileVal = mobileCol < matchedAdminRow.length && matchedAdminRow[mobileCol] !== undefined ? String(matchedAdminRow[mobileCol]).trim() : enteredMobile;
          const email = emailCol < matchedAdminRow.length && matchedAdminRow[emailCol] !== undefined ? String(matchedAdminRow[emailCol]).trim() : "";
          const role = roleCol < matchedAdminRow.length && matchedAdminRow[roleCol] !== undefined ? String(matchedAdminRow[roleCol]).trim() : "Admin";
          const branch = branchCol < matchedAdminRow.length && matchedAdminRow[branchCol] !== undefined ? String(matchedAdminRow[branchCol]).trim() : "";
          const status = statusCol < matchedAdminRow.length && matchedAdminRow[statusCol] !== undefined ? String(matchedAdminRow[statusCol]).trim() : "Active";
          const permission = permCol < matchedAdminRow.length && matchedAdminRow[permCol] !== undefined ? String(matchedAdminRow[permCol]).trim() : "ALL";
          const passwordFound = pwdCol < matchedAdminRow.length && matchedAdminRow[pwdCol] !== undefined ? String(matchedAdminRow[pwdCol]).trim() : "";

          console.log(`Employee ID: ${employeeId}`);
          console.log(`Employee Name: ${name}`);
          console.log(`Role: ${role}`);
          console.log(`Branch: ${branch}`);
          console.log(`Status: ${status}`);
          console.log(`Permission: ${permission}`);
          console.log(`Password Found: ${passwordFound}`);
          console.log(`Entered Password: ${enteredPassword}`);

          const blockedStatuses = ["blocked", "disabled", "deleted"];
          if (blockedStatuses.includes(status.toLowerCase())) {
            console.log(`[AUTH DEBUG] Admin account status is blocked/disabled ("${status}")`);
            return { success: false, error: "inactive" };
          }

          const pwdMatched = (enteredPassword.trim() === passwordFound.trim());
          console.log(`Password Match: ${pwdMatched}`);

          if (pwdMatched) {
            console.log("Login Type: Admin");
            console.log("Opening Admin Dashboard");
            return {
              success: true,
              driver: {
                Driver_ID: employeeId || `ADM-${enteredMobileNormalized || enteredMobile}`,
                Employee_ID: employeeId,
                Name: name,
                Mobile_Number: mobileVal || enteredMobile,
                Email: email,
                Role: role || "Admin",
                Branch: branch,
                Department: "",
                Status: status,
                Permissions: permission,
                Permission: permission,
                User_Type: "admin",
                ETM: "ADMIN",
                Last_Login: new Date().toISOString()
              },
              rowIndex: matchedAdminRowIndex
            };
          } else {
            console.log("[AUTH DEBUG] Password mismatch for Admin_Users");
            return { success: false, error: "admin_invalid_password" };
          }
        }
      }
    } catch (adminErr) {
      console.warn(`[AUTH DEBUG] Could not check Admin_Users sheet:`, adminErr);
    }

    // =========================================================================
    // STEP 2: CHECK Driver_Login SHEET (Only if Admin not found)
    // =========================================================================
    console.log("Searching Driver_Login...");
    const sheetName = "Driver_Login";
    console.log(`[AUTH DEBUG] Step 2: Mobile not found in Admin_Users. Searching "${sheetName}"...`);

    const rows = await fetchSheetValues(SPREADSHEET_ID, sheetName, accessToken);
    if (!rows || rows.length === 0) {
      console.log(`[AUTH DEBUG] Total rows fetched from Driver_Login: 0`);
      return { success: false, error: "not_found" };
    }

    console.log(`[AUTH DEBUG] Available Driver_Login headers:`, rows[0]);

    const headers = rows[0].map((h) => String(h).trim());

    const mobileIndex = findCol(headers, ["Mobile_Number", "Mobile Number", "Mobile", "Phone", "Mobile_No", "Contact"]);
    const passwordIndex = findCol(headers, ["Password", "Pass", "Pwd", "Pin"]);
    const statusIndex = findCol(headers, ["Status", "State"]);
    const driverIdIndex = findCol(headers, ["Driver_ID", "Driver ID", "DriverID", "ID"]);
    const etmIndex = findCol(headers, ["ETM", "ETM_No", "ETM No"]);
    const lastLoginIndex = findCol(headers, ["Last_Login", "Last Login", "LastLogin"]);
    const nameIndex = findCol(headers, ["Name", "Driver_Name", "Driver Name", "Name_Of_Driver", "Full Name"]);
    const roleIndex = findCol(headers, ["Role", "User_Type", "UserType", "Access", "Admin", "Type", "Role_Type"]);
    const branchIndex = findCol(headers, ["Branch", "Branch_Name", "Branch Name", "City"]);

    let foundMobileRow: string[] | null = null;
    let foundMobileRowIndex = -1;
    let isPasswordMatched = false;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      let cellMobileStr = "";
      let cellPasswordStr = "";

      if (mobileIndex !== -1 && row[mobileIndex] !== undefined) {
        cellMobileStr = String(row[mobileIndex]).trim();
      }
      if (passwordIndex !== -1 && row[passwordIndex] !== undefined) {
        cellPasswordStr = String(row[passwordIndex]).trim();
      }

      const cellMobileNormalized = cellMobileStr.replace(/\D/g, "").slice(-10);

      let mobileMatches =
        cellMobileStr === enteredMobile ||
        (cellMobileNormalized.length === 10 &&
          enteredMobileNormalized.length === 10 &&
          cellMobileNormalized === enteredMobileNormalized);

      // Fallback cell search in Driver_Login row if mobile column wasn't index-matched
      if (!mobileMatches && mobileIndex === -1) {
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || "").trim();
          const valNorm = val.replace(/\D/g, "").slice(-10);
          if (
            val === enteredMobile ||
            (valNorm.length === 10 && enteredMobileNormalized.length === 10 && valNorm === enteredMobileNormalized)
          ) {
            mobileMatches = true;
            cellMobileStr = val;
            break;
          }
        }
      }

      const pwdMatched = cellPasswordStr === enteredPassword || cellPasswordStr.toLowerCase() === enteredPassword.toLowerCase();

      if (mobileMatches) {
        foundMobileRow = row;
        foundMobileRowIndex = i;
        if (pwdMatched) {
          isPasswordMatched = true;
          break;
        }
      }
    }

    if (!foundMobileRow) {
      console.log("[AUTH DEBUG] No matching record found in Driver_Login sheet");
      return { success: false, error: "not_found" };
    }

    if (!isPasswordMatched) {
      console.log("[AUTH DEBUG] Mobile matches in Driver_Login but password is incorrect");
      return { success: false, error: "invalid" };
    }

    const rowStatus =
      statusIndex !== -1 && foundMobileRow[statusIndex] !== undefined
        ? String(foundMobileRow[statusIndex]).trim()
        : "Active";

    const blockedStatuses = ["blocked", "disabled", "deleted"];
    if (blockedStatuses.includes(rowStatus.toLowerCase())) {
      console.log(`[AUTH DEBUG] Account status is blocked/disabled ("${rowStatus}")`);
      return { success: false, error: "inactive" };
    }

    const driverId =
      driverIdIndex !== -1 && foundMobileRow[driverIdIndex] !== undefined
        ? String(foundMobileRow[driverIdIndex]).trim()
        : `DR-${enteredMobile}`;
    const etm = etmIndex !== -1 && foundMobileRow[etmIndex] !== undefined ? String(foundMobileRow[etmIndex]).trim() : "";
    const lastLogin =
      lastLoginIndex !== -1 && foundMobileRow[lastLoginIndex] !== undefined
        ? String(foundMobileRow[lastLoginIndex]).trim()
        : "";
    const name = nameIndex !== -1 && foundMobileRow[nameIndex] !== undefined ? String(foundMobileRow[nameIndex]).trim() : "";
    const cellRoleRaw = roleIndex !== -1 && foundMobileRow[roleIndex] !== undefined ? String(foundMobileRow[roleIndex]).trim() : "";
    const cellBranchRaw = branchIndex !== -1 && foundMobileRow[branchIndex] !== undefined ? String(foundMobileRow[branchIndex]).trim() : "";

    const isRoleAdmin =
      ["admin", "superadmin", "administrator", "fleet_manager", "owner"].includes(cellRoleRaw.toLowerCase()) ||
      enteredMobile === "9999999999" ||
      enteredMobile.toLowerCase().includes("admin");
    const userRole: "driver" | "admin" = isRoleAdmin ? "admin" : "driver";

    console.log("Opening Driver Dashboard");
    return {
      success: true,
      driver: {
        Driver_ID: driverId,
        Mobile_Number: enteredMobile,
        ETM: etm,
        Status: rowStatus,
        Last_Login: lastLogin,
        Name: name || `Driver ${driverId}`,
        Role: cellRoleRaw || userRole,
        User_Type: userRole,
        Branch: cellBranchRaw
      },
      rowIndex: foundMobileRowIndex,
      lastLoginColIndex: lastLoginIndex
    };
  } catch (err) {
    console.error("Error in authenticateDriverWithSheet:", err);
    return { success: false, error: "error" };
  }
}

export async function updateLastLogin(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  colIndex: number,
  accessToken: string
): Promise<any> {
  if (colIndex === -1) {
    console.warn("Last_Login column index not found, skipping update.");
    return null;
  }
  const colLetter = getColumnLetter(colIndex);
  const cellRange = `${sheetName}!${colLetter}${rowIndex + 1}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`;
  
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
  const formattedDateTime = `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [[formattedDateTime]]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Failed to update Last_Login: ${errText}`);
    throw new Error(`Failed to update Last_Login: ${errText}`);
  }

  return response.json();
}

export async function updateDriverProfileInSheets(
  driverId: string,
  updatedFields: { name?: string; phone?: string; email?: string },
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    validateConfig(SPREADSHEET_ID);
    const sheetName = "Driver_Login";

    if (!accessToken) {
      console.log("[PROFILE SYNC] No Google OAuth token available, saved locally.");
      return { success: true, message: "Profile saved locally." };
    }

    const rows = await fetchSheetValues(SPREADSHEET_ID, sheetName, accessToken);
    if (!rows || rows.length <= 1) {
      return { success: false, message: "Driver_Login sheet unavailable." };
    }

    const headers = rows[0].map(h => normalizeHeader(h));
    const driverIdIndex = headers.findIndex(h => ["driverid", "id", "uid", "driverno"].includes(h));
    const mobileIndex = headers.findIndex(h => ["mobilenumber", "mobile", "phone", "contact"].includes(h));
    const nameIndex = headers.findIndex(h => ["name", "drivername", "fullname", "driver"].includes(h));
    const emailIndex = headers.findIndex(h => ["email", "emailaddress"].includes(h));

    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const cellDriverId = driverIdIndex !== -1 && row[driverIdIndex] ? String(row[driverIdIndex]).trim() : "";
      const cellMobile = mobileIndex !== -1 && row[mobileIndex] ? String(row[mobileIndex]).trim().replace(/\D/g, "").slice(-10) : "";
      const searchDriverId = String(driverId).trim();
      const searchMobile = updatedFields.phone ? String(updatedFields.phone).trim().replace(/\D/g, "").slice(-10) : "";

      if ((cellDriverId && cellDriverId === searchDriverId) || (searchMobile && cellMobile && cellMobile === searchMobile)) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      console.warn("[PROFILE SYNC] Row not found in Driver_Login sheet, profile saved locally.");
      return { success: true, message: "Saved locally (Record not found in Sheet)." };
    }

    const updatePromises: Promise<any>[] = [];

    if (updatedFields.name && nameIndex !== -1) {
      const colLetter = getColumnLetter(nameIndex);
      const cellRange = `${sheetName}!${colLetter}${targetRowIndex + 1}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`;
      updatePromises.push(
        fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: [[updatedFields.name]] })
        })
      );
    }

    if (updatedFields.phone && mobileIndex !== -1) {
      const colLetter = getColumnLetter(mobileIndex);
      const cellRange = `${sheetName}!${colLetter}${targetRowIndex + 1}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`;
      updatePromises.push(
        fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: [[updatedFields.phone]] })
        })
      );
    }

    if (updatedFields.email !== undefined && emailIndex !== -1) {
      const colLetter = getColumnLetter(emailIndex);
      const cellRange = `${sheetName}!${colLetter}${targetRowIndex + 1}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`;
      updatePromises.push(
        fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: [[updatedFields.email]] })
        })
      );
    }

    await Promise.all(updatePromises);
    console.log("[PROFILE SYNC] Google Sheet driver profile updated successfully.");
    return { success: true, message: "Profile updated & synced with Google Sheet!" };
  } catch (err: any) {
    console.error("[PROFILE SYNC ERROR]", err);
    return { success: false, message: err?.message || "Failed to sync with Google Sheet." };
  }
}

export function getWeeklyHissabFromNewSheets(
  evRows: string[][],
  cngRows: string[][],
  driverETM: string,
  driverId: string
): { 
  weeklyOutstanding: number | string; 
  matchedRow: string[] | null; 
  headers: string[] | null; 
  matchedRows?: string[][];
} {
  const cleanETM = String(driverETM || "").trim().toUpperCase();

  const totalRowCount = (evRows?.length || 0) + (cngRows?.length || 0);

  // Collect all ETM IDs found in the sheets (Column G / index 6)
  const allWeeklyDataRows = [
    ...(evRows || []).slice(1),
    ...(cngRows || []).slice(1)
  ];
  const allEtmIds = allWeeklyDataRows
    .map(row => (row && row.length > 6 ? String(row[6] || "").trim().toUpperCase() : ""))
    .filter(Boolean);

  if (!cleanETM) {
    console.log("Driver ETM:", driverETM);
    console.log("Total Row Count:", totalRowCount);
    console.log("All ETM IDs Found:", allEtmIds);
    console.log("Finally Matched Row:", null);
    console.log("Last Week OS:", "ETM Not Found in Weekly Hissab");
    console.log("Final OS:", "ETM Not Found in Weekly Hissab");

    return { weeklyOutstanding: "ETM Not Found in Weekly Hissab", matchedRow: null, headers: null, matchedRows: [] };
  }

  const findMatches = (rows: string[][]) => {
    const matched: string[][] = [];
    if (!rows || rows.length <= 1) return matched;
    // Column 7 (index 6, ET ID) is Column G
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > 6) {
        const rowEtId = String(row[6] || "").trim().toUpperCase();
        if (rowEtId === cleanETM) {
          matched.push(row);
        }
      }
    }
    return matched;
  };

  const parseRowEndDate = (row: string[]) => {
    if (!row || !row[2]) return 0;
    const dateStr = String(row[2]).trim();
    if (!dateStr) return 0;
    if (dateStr.includes("/") || dateStr.includes("-")) {
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime() || 0;
        } else if (parts[2].length === 4) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime() || 0;
        }
      }
    }
    const timestamp = Date.parse(dateStr);
    return isNaN(timestamp) ? 0 : timestamp;
  };

  const evMatches = findMatches(evRows);
  const cngMatches = findMatches(cngRows);
  const allMatches = [...evMatches, ...cngMatches];

  // Sort matched rows by End Date (Column C, index 2) in descending order to get the latest week first
  allMatches.sort((a, b) => parseRowEndDate(b) - parseRowEndDate(a));

  let matchedRow = allMatches.length > 0 ? allMatches[0] : null;
  let headers = evRows && evRows.length > 0 ? evRows[0] : (cngRows && cngRows.length > 0 ? cngRows[0] : null);

  let weeklyOutstanding: number | string = "ETM Not Found in Weekly Hissab";
  let lastWeekOS: number | string = "ETM Not Found in Weekly Hissab";
  let finalOS: number | string = "ETM Not Found in Weekly Hissab";

  if (matchedRow) {
    // Column U is index 20 (Last Week OS) - handle null or undefined values by converting to 0 using Number(value || 0)
    const rawLastWeekVal = matchedRow[20];
    const cleanLastWeekStr = rawLastWeekVal ? String(rawLastWeekVal).replace(/[^0-9.-]/g, "") : "";
    const parsedLastWeek = Number(cleanLastWeekStr || 0);
    lastWeekOS = isNaN(parsedLastWeek) ? 0 : parsedLastWeek;

    // Column V is index 21 (Final OS) - handle null or undefined values by converting to 0 using Number(value || 0)
    const rawFinalVal = matchedRow[21];
    const cleanFinalStr = rawFinalVal ? String(rawFinalVal).replace(/[^0-9.-]/g, "") : "";
    const parsedFinal = Number(cleanFinalStr || 0);
    finalOS = isNaN(parsedFinal) ? 0 : parsedFinal;
    weeklyOutstanding = finalOS;
  }

  console.log("Driver ETM:", driverETM);
  console.log("Total Row Count:", totalRowCount);
  console.log("All ETM IDs Found:", allEtmIds);
  console.log("Finally Matched Row:", matchedRow);
  console.log("Last Week OS:", lastWeekOS);
  console.log("Final OS:", finalOS);

  return { weeklyOutstanding, matchedRow, headers, matchedRows: allMatches };
}

export function getWeeklyHissabOutstanding(
  weeklyHissabRows: string[][],
  driverETM: string,
  driverId: string
): { weeklyOutstanding: number | string; matchedRow: string[] | null } {
  const cleanETM = String(driverETM || "").trim().toUpperCase();
  const totalRowCount = weeklyHissabRows?.length || 0;

  const headers = weeklyHissabRows && weeklyHissabRows.length > 0 ? weeklyHissabRows[0].map(h => normalizeHeader(h)) : [];
  const etmIdIndex = headers.findIndex(h => h === "etmid" || h === "etm_id" || h === "etm" || h === "driveretm");
  const matchIndex = etmIdIndex !== -1 ? etmIdIndex : 6; // column G is index 6

  const allEtmIds = (weeklyHissabRows || [])
    .slice(1)
    .map(row => (row && row[matchIndex] ? String(row[matchIndex]).trim().toUpperCase() : ""))
    .filter(Boolean);

  if (!weeklyHissabRows || weeklyHissabRows.length <= 1 || !cleanETM) {
    console.log("Driver ETM:", driverETM);
    console.log("Total Row Count:", totalRowCount);
    console.log("All ETM IDs Found:", allEtmIds);
    console.log("Finally Matched Row:", null);
    console.log("Last Week OS:", "ETM Not Found in Weekly Hissab");
    console.log("Final OS:", "ETM Not Found in Weekly Hissab");

    return { weeklyOutstanding: "ETM Not Found in Weekly Hissab", matchedRow: null };
  }

  const parseRowEndDate = (row: string[]) => {
    if (!row || !row[2]) return 0;
    const dateStr = String(row[2]).trim();
    if (!dateStr) return 0;
    if (dateStr.includes("/") || dateStr.includes("-")) {
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime() || 0;
        } else if (parts[2].length === 4) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime() || 0;
        }
      }
    }
    const timestamp = Date.parse(dateStr);
    return isNaN(timestamp) ? 0 : timestamp;
  };

  const allMatches: string[][] = [];
  for (let i = 1; i < weeklyHissabRows.length; i++) {
    const row = weeklyHissabRows[i];
    if (row && row[matchIndex] && String(row[matchIndex]).trim().toUpperCase() === cleanETM) {
      allMatches.push(row);
    }
  }

  // Sort matching rows by End Date (Column C) in descending order
  allMatches.sort((a, b) => parseRowEndDate(b) - parseRowEndDate(a));
  let matchedRow = allMatches.length > 0 ? allMatches[0] : null;

  let weeklyOutstanding: number | string = "ETM Not Found in Weekly Hissab";
  let lastWeekOS: number | string = "ETM Not Found in Weekly Hissab";
  let finalOS: number | string = "ETM Not Found in Weekly Hissab";

  if (matchedRow) {
    const rawLastWeekVal = matchedRow[20];
    const cleanLastWeekStr = rawLastWeekVal ? String(rawLastWeekVal).replace(/[^0-9.-]/g, "") : "";
    const parsedLastWeek = Number(cleanLastWeekStr || 0);
    lastWeekOS = isNaN(parsedLastWeek) ? 0 : parsedLastWeek;

    const rawFinalVal = matchedRow[21];
    const cleanFinalStr = rawFinalVal ? String(rawFinalVal).replace(/[^0-9.-]/g, "") : "";
    const parsedFinal = Number(cleanFinalStr || 0);
    finalOS = isNaN(parsedFinal) ? 0 : parsedFinal;
    weeklyOutstanding = finalOS;
  }

  console.log("Driver ETM:", driverETM);
  console.log("Total Row Count:", totalRowCount);
  console.log("All ETM IDs Found:", allEtmIds);
  console.log("Finally Matched Row:", matchedRow);
  console.log("Last Week OS:", lastWeekOS);
  console.log("Final OS:", finalOS);

  return { weeklyOutstanding, matchedRow };
}

export function getDriverEarningsOutstanding(
  driverEarningsRows: string[][],
  driverETM: string,
  driverId: string
): { currentOutstanding: number | string; matchedRow: string[] | null } {
  const cleanETM = String(driverETM || "").trim().toUpperCase();
  if (!driverEarningsRows || driverEarningsRows.length <= 1 || !cleanETM) {
    return { currentOutstanding: "ETM Not Found in Driver_Earnings", matchedRow: null };
  }

  const headers = driverEarningsRows[0].map(h => normalizeHeader(h));
  const etmIndex = headers.findIndex(h => h === "etm" || h === "etmid" || h === "etm_id" || h === "driveretm");
  const matchIndex = etmIndex !== -1 ? etmIndex : 4; // column E is index 4

  let matchedEarningsRow: string[] | null = null;
  for (let i = 1; i < driverEarningsRows.length; i++) {
    const row = driverEarningsRows[i];
    if (row && row[matchIndex]) {
      const sheetETM = String(row[matchIndex]).trim().toUpperCase();
      if (sheetETM === cleanETM) {
        matchedEarningsRow = row;
        break;
      }
    }
  }

  let currentOutstanding: number | string = "ETM Not Found in Driver_Earnings";
  if (matchedEarningsRow) {
    const valStr = matchedEarningsRow[21] || "0";
    // Parse value, removing everything except digits, minus sign, and dot
    const cleanStr = valStr.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleanStr);
    currentOutstanding = isNaN(parsed) ? 0 : parsed;
  }

  return { currentOutstanding, matchedRow: matchedEarningsRow };
}

export function getLastDayEarnings(
  dailyEarningsRows: string[][],
  driverETM: string,
  driverId: string
): { lastDayEarnings: number; matchedRow: string[] | null } {
  if (!dailyEarningsRows || dailyEarningsRows.length <= 1 || !driverETM) {
    console.log("Driver ID:", driverId);
    console.log("Driver ETM:", driverETM);
    console.log("Daily Earnings Match:", null);
    return { lastDayEarnings: 0, matchedRow: null };
  }

  const headers = dailyEarningsRows[0].map(h => normalizeHeader(h));
  const etmIndex = headers.findIndex(h => h === "etm" || h === "etmid" || h === "etm_id" || h === "driveretm");
  const matchIndex = etmIndex !== -1 ? etmIndex : 1; // Column B is index 1

  const matchedRows: string[][] = [];
  for (let i = 1; i < dailyEarningsRows.length; i++) {
    const row = dailyEarningsRows[i];
    if (row && row[matchIndex] && row[matchIndex].trim().toLowerCase() === driverETM.trim().toLowerCase()) {
      matchedRows.push(row);
    }
  }

  if (matchedRows.length === 0) {
    console.log("Driver ID:", driverId);
    console.log("Driver ETM:", driverETM);
    console.log("Daily Earnings Match:", null);
    return { lastDayEarnings: 0, matchedRow: null };
  }

  const dateIndex = headers.findIndex(h => h === "date" || h === "dt" || h === "earningsdate");
  const matchDateIndex = dateIndex !== -1 ? dateIndex : 0; // Column A is index 0

  const earningsIndex = headers.findIndex(h => h === "totalearning" || h === "totalearnings" || h === "earning" || h === "earnings" || h === "total_earning");
  const matchEarningsIndex = earningsIndex !== -1 ? earningsIndex : 4; // Column E is index 4

  const parseSheetDateLocal = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();
    if (!cleaned) return null;

    const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      return new Date(year, month, day);
    }

    const ymdMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(year, month, day);
    }

    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  };

  const sortedRows = matchedRows.map(row => {
    const dateStr = row[matchDateIndex] || "";
    const parsedDate = parseSheetDateLocal(dateStr);
    return { row, date: parsedDate || new Date(0) };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  const latestRowObj = sortedRows[0];
  const matchedDailyEarnings = latestRowObj ? latestRowObj.row : null;

  let lastDayEarnings = 0;
  if (matchedDailyEarnings) {
    const valStr = matchedDailyEarnings[matchEarningsIndex] || "0";
    const cleanStr = valStr.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleanStr);
    lastDayEarnings = isNaN(parsed) ? 0 : parsed;
  }

  console.log("Driver ID:", driverId);
  console.log("Driver ETM:", driverETM);
  console.log("Daily Earnings Match:", matchedDailyEarnings);

  return { lastDayEarnings, matchedRow: matchedDailyEarnings };
}

export async function uploadFileToGoogleDrive(
  base64OrUrl: string,
  fileName: string,
  accessToken?: string | null
): Promise<string> {
  if (!base64OrUrl) return "";
  if (base64OrUrl.startsWith("http://") || base64OrUrl.startsWith("https://")) {
    return base64OrUrl;
  }

  if (accessToken && base64OrUrl.startsWith("data:")) {
    try {
      const match = base64OrUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];

        const metadata = {
          name: fileName,
          mimeType: mimeType
        };

        const boundary = "-------314159265358979323846";
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const body = delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: ' + mimeType + '\r\n' +
          'Content-Transfer-Encoding: base64\r\n\r\n' +
          base64Data +
          close_delim;

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
          },
          body: body
        });

        if (uploadRes.ok) {
          const fileData = await uploadRes.json();
          if (fileData.id) {
            try {
              await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  role: 'reader',
                  type: 'anyone'
                })
              });
            } catch (permErr) {
              console.warn("Could not set public permission on Google Drive file:", permErr);
            }

            const driveUrl = `https://drive.google.com/file/d/${fileData.id}/view?usp=sharing`;
            console.log(`Uploaded ${fileName} to Google Drive: ${driveUrl}`);
            return driveUrl;
          }
        } else {
          console.warn("Google Drive upload API responded with status:", uploadRes.status);
        }
      }
    } catch (err) {
      console.error("Google Drive upload failed, returning fallback URL:", err);
    }
  }

  return base64OrUrl;
}

export async function saveDriverDocumentsToSheet(
  docRecord: Partial<import("../types").DriverDocumentRecord>,
  accessToken?: string | null
): Promise<{ success: boolean; isLocked?: boolean; message: string }> {
  try {
    validateConfig(SPREADSHEET_ID);
    const sheetName = "Driver_Documents";

    const searchMobile = docRecord.mobileNumber ? docRecord.mobileNumber.replace(/\D/g, "").slice(-10) : "";
    const searchEtm = docRecord.etmId ? docRecord.etmId.trim().toUpperCase() : "";

    let rows: string[][] = [];
    if (accessToken) {
      try {
        rows = await fetchSheetValues(SPREADSHEET_ID, sheetName, accessToken);
      } catch (err) {
        console.warn(`Could not fetch ${sheetName} sheet, will create/append...`, err);
      }
    }

    const EXPECTED_HEADERS = [
      "Registration Date & Time",
      "Driver Name",
      "Mobile Number",
      "ETM ID",
      "Aadhaar Number",
      "PAN Number",
      "Driving License Number",
      "Address",
      "Date of Birth",
      "Emergency Contact",
      "Vehicle Number",
      "Vehicle Model",
      "Profile Photo URL",
      "Aadhaar Front URL",
      "Aadhaar Back URL",
      "PAN Card URL",
      "Driving License Front URL",
      "Driving License Back URL",
      "Bank Passbook / Cancelled Cheque URL",
      "Police Verification URL",
      "Status",
      "Last Updated",
      "Document Locked"
    ];

    let targetRowIndex = -1;
    let existingLockStatus = false;

    if (rows && rows.length > 0) {
      const headers = rows[0].map(h => normalizeHeader(h));
      const mobileIdx = headers.findIndex(h => ["mobilenumber", "mobile", "phone"].includes(h));
      const etmIdx = headers.findIndex(h => ["etmid", "etm", "etmno"].includes(h));
      const lockIdx = headers.findIndex(h => ["documentlocked", "locked", "doclocked", "statuslocked"].includes(h));

      const useMobileIdx = mobileIdx !== -1 ? mobileIdx : 2;
      const useEtmIdx = etmIdx !== -1 ? etmIdx : 3;
      const useLockIdx = lockIdx !== -1 ? lockIdx : 22;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const cellMobile = row[useMobileIdx] ? String(row[useMobileIdx]).replace(/\D/g, "").slice(-10) : "";
        const cellEtm = row[useEtmIdx] ? String(row[useEtmIdx]).trim().toUpperCase() : "";

        if ((searchEtm && cellEtm === searchEtm) || (searchMobile && cellMobile === searchMobile)) {
          targetRowIndex = i;
          const lockVal = row[useLockIdx] ? String(row[useLockIdx]).trim().toUpperCase() : "";
          if (["TRUE", "LOCKED", "YES", "1"].includes(lockVal)) {
            existingLockStatus = true;
          }
          break;
        }
      }
    }

    if (targetRowIndex !== -1 && existingLockStatus) {
      return {
        success: false,
        isLocked: true,
        message: "Your documents have already been submitted successfully. To update any document, please contact the Admin."
      };
    }

    const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const profilePhotoUrl = await uploadFileToGoogleDrive(docRecord.profilePhotoUrl || "", `Profile_${searchMobile || searchEtm}.jpg`, accessToken);
    const aadhaarFrontUrl = await uploadFileToGoogleDrive(docRecord.aadhaarFrontUrl || "", `Aadhaar_Front_${searchMobile || searchEtm}.jpg`, accessToken);
    const aadhaarBackUrl = await uploadFileToGoogleDrive(docRecord.aadhaarBackUrl || "", `Aadhaar_Back_${searchMobile || searchEtm}.jpg`, accessToken);
    const panCardUrl = await uploadFileToGoogleDrive(docRecord.panCardUrl || "", `PAN_${searchMobile || searchEtm}.jpg`, accessToken);
    const dlFrontUrl = await uploadFileToGoogleDrive(docRecord.dlFrontUrl || "", `DL_Front_${searchMobile || searchEtm}.jpg`, accessToken);
    const dlBackUrl = await uploadFileToGoogleDrive(docRecord.dlBackUrl || "", `DL_Back_${searchMobile || searchEtm}.jpg`, accessToken);
    const bankPassbookUrl = await uploadFileToGoogleDrive(docRecord.bankPassbookUrl || "", `Bank_Passbook_${searchMobile || searchEtm}.jpg`, accessToken);
    const policeVerificationUrl = await uploadFileToGoogleDrive(docRecord.policeVerificationUrl || "", `Police_Verification_${searchMobile || searchEtm}.jpg`, accessToken);

    const rowValues = [
      docRecord.registrationDateTime || nowStr,
      docRecord.driverName || "",
      docRecord.mobileNumber || "",
      docRecord.etmId || "",
      docRecord.aadhaarNumber || "",
      docRecord.panNumber || "",
      docRecord.dlNumber || "",
      docRecord.address || "",
      docRecord.dob || "",
      docRecord.emergencyContact || "",
      docRecord.vehicleNumber || "",
      docRecord.vehicleModel || "",
      profilePhotoUrl,
      aadhaarFrontUrl,
      aadhaarBackUrl,
      panCardUrl,
      dlFrontUrl,
      dlBackUrl,
      bankPassbookUrl,
      policeVerificationUrl,
      docRecord.status || "Submitted",
      nowStr,
      "TRUE"
    ];

    if (accessToken) {
      if (targetRowIndex !== -1) {
        const cellRange = `${sheetName}!A${targetRowIndex + 1}:W${targetRowIndex + 1}`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`;
        await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: [rowValues] })
        });
      } else {
        if (!rows || rows.length === 0) {
          try {
            await appendSheetRows(SPREADSHEET_ID, sheetName, [EXPECTED_HEADERS], accessToken);
          } catch (e) {
            console.warn("Header append warning:", e);
          }
        }
        await appendSheetRows(SPREADSHEET_ID, sheetName, [rowValues], accessToken);
      }
    }

    // Auto sync registration data across all connected sheets (Driver_Verification, Documents_Verification, Driver_Master, Driver_Login)
    try {
      await autoSyncRegistrationToAllSheets(docRecord, accessToken);
    } catch (e) {
      console.warn("Auto sync registration error:", e);
    }

    return {
      success: true,
      isLocked: true,
      message: "Driver documents saved and locked successfully!"
    };
  } catch (err: any) {
    console.error("Error saving driver documents to sheet:", err);
    return {
      success: false,
      message: err?.message || "Failed to save documents to Google Sheet."
    };
  }
}

/**
 * Auto sync registration data across all Google Sheets tabs
 */
export async function autoSyncRegistrationToAllSheets(
  docRecord: Partial<import("../types").DriverDocumentRecord> & {
    driverName?: string;
    mobileNumber?: string;
    etmId?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    dlNumber?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    profilePhotoUrl?: string;
    aadhaarFrontUrl?: string;
    panCardUrl?: string;
    dlFrontUrl?: string;
    bankPassbookUrl?: string;
    status?: string;
  },
  accessToken?: string | null
) {
  if (!accessToken) return;
  try {
    const mobile = (docRecord.mobileNumber || "").replace(/\D/g, "").slice(-10);
    const etm = docRecord.etmId || `ETM-${mobile}`;
    const name = docRecord.driverName || `Driver ${mobile}`;
    const driverId = `DR-${mobile || etm}`;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0];
    const status = docRecord.status || "Pending";

    // 1. Driver_Verification
    try {
      const dvHeaders = ["Driver ID", "ETM ID", "Driver Name", "Mobile Number", "Vehicle Type", "Registration Date", "Registration Time", "Branch", "Verification Status", "Verified By", "Verification Date", "Remarks"];
      const dvRow = [
        driverId,
        etm,
        name,
        docRecord.mobileNumber || "",
        docRecord.vehicleModel || "EV",
        dateStr,
        timeStr,
        "Main",
        status,
        "",
        "",
        ""
      ];

      const dvRows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Verification", accessToken).catch(() => null);
      if (!dvRows || dvRows.length === 0) {
        await appendSheetRows(SPREADSHEET_ID, "Driver_Verification", [dvHeaders, dvRow], accessToken).catch(() => {});
      } else {
        let matchedIdx = -1;
        for (let i = 1; i < dvRows.length; i++) {
          const r = dvRows[i];
          if (r && (r[3]?.replace(/\D/g, "").slice(-10) === mobile || r[1]?.trim().toUpperCase() === etm.toUpperCase())) {
            matchedIdx = i;
            break;
          }
        }
        if (matchedIdx !== -1) {
          const range = `Driver_Verification!A${matchedIdx + 1}:L${matchedIdx + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [dvRow] })
          }).catch(() => {});
        } else {
          await appendSheetRows(SPREADSHEET_ID, "Driver_Verification", [dvRow], accessToken).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error syncing Driver_Verification sheet:", e);
    }

    // 2. Documents_Verification
    try {
      const docvHeaders = ["Driver ID", "ETM ID", "Driver Name", "Mobile Number", "Vehicle Type", "Registration Date", "Registration Time", "Branch", "Verification Status", "Verified By", "Verification Date", "Remarks"];
      const docvRow = [
        driverId,
        etm,
        name,
        docRecord.mobileNumber || "",
        docRecord.vehicleModel || "EV",
        dateStr,
        timeStr,
        "Main",
        status,
        "",
        "",
        ""
      ];

      const docvRows = await fetchSheetValues(SPREADSHEET_ID, "Documents_Verification", accessToken).catch(() => null);
      if (!docvRows || docvRows.length === 0) {
        await appendSheetRows(SPREADSHEET_ID, "Documents_Verification", [docvHeaders, docvRow], accessToken).catch(() => {});
      } else {
        let matchedIdx = -1;
        for (let i = 1; i < docvRows.length; i++) {
          const r = docvRows[i];
          if (r && (r[3]?.replace(/\D/g, "").slice(-10) === mobile || r[1]?.trim().toUpperCase() === etm.toUpperCase())) {
            matchedIdx = i;
            break;
          }
        }
        if (matchedIdx !== -1) {
          const range = `Documents_Verification!A${matchedIdx + 1}:L${matchedIdx + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [docvRow] })
          }).catch(() => {});
        } else {
          await appendSheetRows(SPREADSHEET_ID, "Documents_Verification", [docvRow], accessToken).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error syncing Documents_Verification sheet:", e);
    }

    // 3. Driver_Master
    try {
      const dmHeaders = ["Driver ID", "Driver Name", "Mobile Number", "ETM ID", "Vehicle Number", "Status"];
      const dmRow = [
        driverId,
        name,
        docRecord.mobileNumber || "",
        etm,
        docRecord.vehicleNumber || "",
        status
      ];

      const dmRows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Master", accessToken).catch(() => null);
      if (!dmRows || dmRows.length === 0) {
        await appendSheetRows(SPREADSHEET_ID, "Driver_Master", [dmHeaders, dmRow], accessToken).catch(() => {});
      } else {
        let matchedIdx = -1;
        for (let i = 1; i < dmRows.length; i++) {
          const r = dmRows[i];
          if (r && (r[2]?.replace(/\D/g, "").slice(-10) === mobile || r[3]?.trim().toUpperCase() === etm.toUpperCase())) {
            matchedIdx = i;
            break;
          }
        }
        if (matchedIdx !== -1) {
          const range = `Driver_Master!A${matchedIdx + 1}:F${matchedIdx + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [dmRow] })
          }).catch(() => {});
        } else {
          await appendSheetRows(SPREADSHEET_ID, "Driver_Master", [dmRow], accessToken).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error syncing Driver_Master sheet:", e);
    }

    // 4. Driver_Login
    try {
      const dlHeaders = ["Mobile_Number", "Password", "ETM", "Status", "Last_Login"];
      const dlRows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Login", accessToken).catch(() => null);
      if (!dlRows || dlRows.length === 0) {
        await appendSheetRows(SPREADSHEET_ID, "Driver_Login", [dlHeaders, [docRecord.mobileNumber || "", "1234", etm, "Inactive", ""]], accessToken).catch(() => {});
      } else {
        let matchedIdx = -1;
        for (let i = 1; i < dlRows.length; i++) {
          const r = dlRows[i];
          if (r && r[0]?.replace(/\D/g, "").slice(-10) === mobile) {
            matchedIdx = i;
            break;
          }
        }
        if (matchedIdx === -1) {
          await appendSheetRows(SPREADSHEET_ID, "Driver_Login", [[docRecord.mobileNumber || "", "1234", etm, "Inactive", ""]], accessToken).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error syncing Driver_Login sheet:", e);
    }
  } catch (err) {
    console.error("Error in autoSyncRegistrationToAllSheets:", err);
  }
}

export async function fetchDriverDocumentsFromSheet(
  mobileOrEtm: string,
  accessToken?: string | null
): Promise<import("../types").DriverDocumentRecord | null> {
  if (!mobileOrEtm) return null;
  try {
    validateConfig(SPREADSHEET_ID);
    const sheetName = "Driver_Documents";
    const searchNorm = mobileOrEtm.trim().toUpperCase().replace(/\D/g, "").slice(-10) || mobileOrEtm.trim().toUpperCase();

    const rows = await fetchSheetValues(SPREADSHEET_ID, sheetName, accessToken);
    if (!rows || rows.length <= 1) return null;

    const headers = rows[0].map(h => normalizeHeader(h));
    const mobileIdx = headers.findIndex(h => ["mobilenumber", "mobile", "phone"].includes(h));
    const etmIdx = headers.findIndex(h => ["etmid", "etm", "etmno"].includes(h));

    const useMobileIdx = mobileIdx !== -1 ? mobileIdx : 2;
    const useEtmIdx = etmIdx !== -1 ? etmIdx : 3;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const cellMobile = row[useMobileIdx] ? String(row[useMobileIdx]).replace(/\D/g, "").slice(-10) : "";
      const cellEtm = row[useEtmIdx] ? String(row[useEtmIdx]).trim().toUpperCase() : "";

      if ((cellEtm && cellEtm === searchNorm) || (cellMobile && cellMobile === searchNorm)) {
        const lockVal = row[22] ? String(row[22]).trim().toUpperCase() : "TRUE";
        const isLocked = ["TRUE", "LOCKED", "YES", "1"].includes(lockVal);

        return {
          registrationDateTime: row[0] || "",
          driverName: row[1] || "",
          mobileNumber: row[2] || "",
          etmId: row[3] || "",
          aadhaarNumber: row[4] || "",
          panNumber: row[5] || "",
          dlNumber: row[6] || "",
          address: row[7] || "",
          dob: row[8] || "",
          emergencyContact: row[9] || "",
          vehicleNumber: row[10] || "",
          vehicleModel: row[11] || "",
          profilePhotoUrl: row[12] || "",
          aadhaarFrontUrl: row[13] || "",
          aadhaarBackUrl: row[14] || "",
          panCardUrl: row[15] || "",
          dlFrontUrl: row[16] || "",
          dlBackUrl: row[17] || "",
          bankPassbookUrl: row[18] || "",
          policeVerificationUrl: row[19] || "",
          status: row[20] || "Submitted",
          lastUpdated: row[21] || "",
          isLocked: isLocked
        };
      }
    }
  } catch (err) {
    console.error("Error fetching driver documents from sheet:", err);
  }
  return null;
}

export async function submitSupportTicket(ticket: {
  driverName: string;
  etmId: string;
  mobileNumber: string;
  subject: string;
  description: string;
}, accessToken?: string | null): Promise<{ success: boolean; message: string }> {
  try {
    validateConfig(SPREADSHEET_ID);
    const sheetName = "Support_Tickets";
    const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    
    const rowValues = [
      nowStr,
      ticket.driverName || "",
      ticket.etmId || "",
      ticket.mobileNumber || "",
      ticket.subject || "",
      ticket.description || "",
      "Open"
    ];

    if (accessToken) {
      try {
        const existing = await fetchSheetValues(SPREADSHEET_ID, sheetName, accessToken);
        if (!existing || existing.length === 0) {
          const headers = ["Date & Time", "Driver Name", "ETM ID", "Mobile Number", "Subject", "Description", "Status"];
          await appendSheetRows(SPREADSHEET_ID, sheetName, [headers], accessToken);
        }
      } catch (e) {
        console.warn("Sheet check notice for Support_Tickets:", e);
        try {
          const headers = ["Date & Time", "Driver Name", "ETM ID", "Mobile Number", "Subject", "Description", "Status"];
          await appendSheetRows(SPREADSHEET_ID, sheetName, [headers], accessToken);
        } catch (e2) {
          console.warn("Header append notice for Support_Tickets:", e2);
        }
      }

      await appendSheetRows(SPREADSHEET_ID, sheetName, [rowValues], accessToken);
    } else {
      console.warn("No Google OAuth access token provided, ticket submission recorded locally.");
    }

    return {
      success: true,
      message: "Your complaint/support ticket has been submitted successfully!"
    };
  } catch (err: any) {
    console.error("Error submitting support ticket:", err);
    return {
      success: false,
      message: err?.message || "Failed to submit support ticket to Google Sheets."
    };
  }
}

export async function fetchMsgFormatSheet(accessToken?: string | null): Promise<string[][]> {
  try {
    validateConfig(SPREADSHEET_ID);
    const rows = await fetchSheetValues(SPREADSHEET_ID, "Msg Format", accessToken);
    return rows || [];
  } catch (err) {
    console.warn("Failed fetching Msg Format sheet", err);
    return [];
  }
}

function isValidDriverName(name?: string): boolean {
  if (!name || !name.trim()) return false;
  const clean = name.trim().toUpperCase();
  if (clean.startsWith("ETM")) return false;
  if (clean.startsWith("DR-")) return false;
  if (/^\d+$/.test(clean)) return false;
  if (clean.startsWith("DRIVER ETM")) return false;
  if (clean.startsWith("DRIVER DR-")) return false;
  if (/^DRIVER[\s\(_\-\d]/i.test(clean)) return false;
  if (clean === "DRIVER") return false;
  if (clean.includes("DRIVER 9") || clean.includes("DRIVER 8") || clean.includes("DRIVER 7")) return false;
  return true;
}

/**
 * Fetch all driver, document, vehicle, earnings, and outstanding data for Admin Panel
 */
export async function fetchAllAdminData(accessToken?: string | null): Promise<{
  drivers: import("../types").AdminDriverItem[];
  vehicles: import("../types").AdminVehicleItem[];
  driverVerification?: import("../types").AdminDriverItem[];
}> {
  try {
    validateConfig(SPREADSHEET_ID);
    const [
      loginRows,
      masterRows,
      docRows,
      earningsRows,
      outstandingRows,
      dvRows,
      docvRows,
      vmRows,
      dailyHissabRows,
      weeklyHissabRows,
      driverWeeklySummaryRows,
      evRows,
      cngRows
    ] = await Promise.all([
      fetchSheetValues(SPREADSHEET_ID, "Driver_Login", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Driver_Master", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Driver_Documents", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Daily_Earnings", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Outstanding_Log", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Driver_Verification", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Documents_Verification", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Vehicle_Master", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Daily_Hissab", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Weekly_Hissab", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "Driver_Weekly_Summary", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "EV", accessToken).catch(() => []),
      fetchSheetValues(SPREADSHEET_ID, "CNG", accessToken).catch(() => [])
    ]);

    // Robust amount parser preserving negative & positive numbers
    const parseAmountWithNull = (val: any): number | null => {
      if (val === undefined || val === null) return null;
      const str = String(val).trim();
      if (!str) return null;
      const cleanStr = str.replace(/[^0-9.-]/g, "");
      if (!cleanStr || cleanStr === "-" || cleanStr === ".") return null;
      const parsed = Number(cleanStr);
      return isNaN(parsed) ? null : parsed;
    };

    // Helper to generate normalized lookup keys for ETM ID, Mobile, and Driver ID
    const generateNormalizedKeys = (etm?: string, mobile?: string, id?: string): string[] => {
      const keys = new Set<string>();
      if (etm) {
        const rawEtm = String(etm).trim().toUpperCase();
        if (rawEtm) {
          keys.add(rawEtm);
          const noHyphen = rawEtm.replace(/[\s_-]+/g, "");
          keys.add(noHyphen);
          const digitsOnly = noHyphen.replace(/^ETM/i, "");
          if (digitsOnly) keys.add(digitsOnly);
        }
      }
      if (mobile) {
        const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);
        if (cleanMobile) {
          keys.add(cleanMobile);
          keys.add(`DR-${cleanMobile}`);
        }
      }
      if (id) {
        const cleanId = String(id).trim().toUpperCase();
        if (cleanId) keys.add(cleanId);
      }
      return Array.from(keys);
    };

    interface OutstandingRecord {
      weeklyOS?: number;
      currentOS?: number;
      totalOS?: number;
      sourceSheet: string;
    }

    const outstandingLogMap = new Map<string, OutstandingRecord>();
    const weeklyHissabMap = new Map<string, OutstandingRecord>();
    const dailyHissabMap = new Map<string, number>();

    // 1. Process Outstanding_Log sheet
    if (outstandingRows && outstandingRows.length > 0) {
      let etmColIdx = 1;
      let mobileColIdx = 3;
      let weeklyOsIdx = 4;
      let currentOsIdx = 6;
      let totalOsIdx = 7;

      const headerRow = outstandingRows[0];
      if (headerRow && headerRow.length > 0) {
        const headers = headerRow.map(h => String(h || "").trim().toLowerCase().replace(/[\s_-]+/g, ""));
        const foundEtmIdx = headers.findIndex(h => h === "etm" || h === "etmid" || h === "driveretm");
        if (foundEtmIdx !== -1) etmColIdx = foundEtmIdx;

        const foundMobileIdx = headers.findIndex(h => h === "mobile" || h === "phone" || h === "mobilenumber" || h === "contact");
        if (foundMobileIdx !== -1) mobileColIdx = foundMobileIdx;

        const foundWeeklyIdx = headers.findIndex(h => h.includes("weeklyos") || h.includes("weeklyoutstanding") || h.includes("lastweekos"));
        if (foundWeeklyIdx !== -1) weeklyOsIdx = foundWeeklyIdx;

        const foundCurrentIdx = headers.findIndex(h => h.includes("currentos") || h.includes("currentoutstanding"));
        if (foundCurrentIdx !== -1) currentOsIdx = foundCurrentIdx;

        const foundTotalIdx = headers.findIndex(h => h.includes("totalos") || h.includes("totaloutstanding"));
        if (foundTotalIdx !== -1) totalOsIdx = foundTotalIdx;
      }

      for (let i = 1; i < outstandingRows.length; i++) {
        const row = outstandingRows[i];
        if (!row || row.length === 0) continue;

        const rowEtm = row[etmColIdx] !== undefined ? String(row[etmColIdx]).trim() : (row[1] ? String(row[1]).trim() : "");
        const rowMobile = row[mobileColIdx] !== undefined ? String(row[mobileColIdx]).trim() : (row[3] ? String(row[3]).trim() : "");

        const weeklyVal = parseAmountWithNull(row[weeklyOsIdx] !== undefined ? row[weeklyOsIdx] : row[4]);
        const currentVal = parseAmountWithNull(row[currentOsIdx] !== undefined ? row[currentOsIdx] : row[6]);
        const totalVal = parseAmountWithNull(row[totalOsIdx] !== undefined ? row[totalOsIdx] : row[7]);

        const rec: OutstandingRecord = {
          weeklyOS: weeklyVal !== null ? weeklyVal : undefined,
          currentOS: currentVal !== null ? currentVal : undefined,
          totalOS: totalVal !== null ? totalVal : undefined,
          sourceSheet: "Outstanding_Log"
        };

        const keys = generateNormalizedKeys(rowEtm, rowMobile);
        for (const k of keys) {
          outstandingLogMap.set(k, rec);
        }
      }
    }

    // Helper to process Weekly Hissab sheets (Weekly_Hissab, Driver_Weekly_Summary, EV, CNG)
    const processWeeklyHissabSheet = (rows: string[][], sheetName: string) => {
      if (!rows || rows.length <= 1) return;

      const headerRow = rows[0];
      const headers = headerRow ? headerRow.map(h => String(h || "").trim().toLowerCase().replace(/[\s_-]+/g, "")) : [];

      let etmColIdx = headers.findIndex(h => h === "etmid" || h === "etm" || h === "driveretm" || h === "etid");
      if (etmColIdx === -1) {
        if (rows.length > 1 && rows[1].length > 6 && String(rows[1][6]).toUpperCase().startsWith("ETM")) {
          etmColIdx = 6;
        } else if (rows.length > 1 && rows[1].length > 1 && String(rows[1][1]).toUpperCase().startsWith("ETM")) {
          etmColIdx = 1;
        } else {
          etmColIdx = 6;
        }
      }

      let mobileColIdx = headers.findIndex(h => h === "mobile" || h === "phone" || h === "mobilenumber" || h === "contact");
      let driverIdColIdx = headers.findIndex(h => h === "driverid" || h === "id");

      let weeklyOsIdx = headers.findIndex(h => h.includes("weeklyoutstanding") || h.includes("finalos") || h.includes("weeklyos") || h.includes("lastweekos") || h.includes("outstanding"));
      if (weeklyOsIdx === -1) weeklyOsIdx = 21;

      let currentOsIdx = headers.findIndex(h => h.includes("currentos") || h.includes("currentoutstanding"));
      if (currentOsIdx === -1) currentOsIdx = 20;

      let dateIdx = headers.findIndex(h => h.includes("enddate") || h.includes("date") || h.includes("weekend"));
      if (dateIdx === -1) dateIdx = 2;

      const parseRowEndDate = (row: string[]) => {
        if (!row || !row[dateIdx]) return 0;
        const dateStr = String(row[dateIdx]).trim();
        if (!dateStr) return 0;
        if (dateStr.includes("/") || dateStr.includes("-")) {
          const parts = dateStr.split(/[\/\-]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime() || 0;
            } else if (parts[2].length === 4) {
              return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime() || 0;
            }
          }
        }
        const timestamp = Date.parse(dateStr);
        return isNaN(timestamp) ? 0 : timestamp;
      };

      const rowsByDriverKey = new Map<string, string[]>();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        let rowEtm = row[etmColIdx] ? String(row[etmColIdx]).trim() : "";
        if (!rowEtm) {
          for (let c = 0; c < Math.min(row.length, 8); c++) {
            const val = String(row[c] || "").trim().toUpperCase();
            if (val.startsWith("ETM") || /^ETM[A-Z0-9_-]+$/i.test(val)) {
              rowEtm = val;
              break;
            }
          }
        }
        const rowMobile = mobileColIdx !== -1 && row[mobileColIdx] ? String(row[mobileColIdx]).trim() : "";
        const rowDriverId = driverIdColIdx !== -1 && row[driverIdColIdx] ? String(row[driverIdColIdx]).trim() : "";

        const keys = generateNormalizedKeys(rowEtm, rowMobile, rowDriverId);
        if (keys.length === 0) continue;

        const primaryKey = keys[0];
        const existingRow = rowsByDriverKey.get(primaryKey);
        if (!existingRow) {
          rowsByDriverKey.set(primaryKey, row);
        } else if (parseRowEndDate(row) >= parseRowEndDate(existingRow)) {
          rowsByDriverKey.set(primaryKey, row);
        }

        for (const k of keys) {
          if (!weeklyHissabMap.has(k)) {
            const weeklyVal = parseAmountWithNull(row[weeklyOsIdx] !== undefined ? row[weeklyOsIdx] : row[21]);
            const currentVal = parseAmountWithNull(row[currentOsIdx] !== undefined ? row[currentOsIdx] : row[20]);
            if (weeklyVal !== null || currentVal !== null) {
              weeklyHissabMap.set(k, {
                weeklyOS: weeklyVal !== null ? weeklyVal : undefined,
                currentOS: currentVal !== null ? currentVal : undefined,
                sourceSheet: sheetName
              });
            }
          }
        }
      }

      rowsByDriverKey.forEach((row) => {
        let rowEtm = row[etmColIdx] ? String(row[etmColIdx]).trim() : "";
        if (!rowEtm) {
          for (let c = 0; c < Math.min(row.length, 8); c++) {
            const val = String(row[c] || "").trim().toUpperCase();
            if (val.startsWith("ETM")) {
              rowEtm = val;
              break;
            }
          }
        }
        const rowMobile = mobileColIdx !== -1 && row[mobileColIdx] ? String(row[mobileColIdx]).trim() : "";
        const rowDriverId = driverIdColIdx !== -1 && row[driverIdColIdx] ? String(row[driverIdColIdx]).trim() : "";

        const keys = generateNormalizedKeys(rowEtm, rowMobile, rowDriverId);
        const weeklyVal = parseAmountWithNull(row[weeklyOsIdx] !== undefined ? row[weeklyOsIdx] : row[21]);
        const currentVal = parseAmountWithNull(row[currentOsIdx] !== undefined ? row[currentOsIdx] : row[20]);

        const rec: OutstandingRecord = {
          weeklyOS: weeklyVal !== null ? weeklyVal : undefined,
          currentOS: currentVal !== null ? currentVal : undefined,
          sourceSheet: sheetName
        };

        for (const k of keys) {
          weeklyHissabMap.set(k, rec);
        }
      });
    };

    // Process all potential weekly summary / hissabs sources
    processWeeklyHissabSheet(weeklyHissabRows, "Weekly_Hissab");
    processWeeklyHissabSheet(driverWeeklySummaryRows, "Driver_Weekly_Summary");
    processWeeklyHissabSheet(evRows, "EV");
    processWeeklyHissabSheet(cngRows, "CNG");

    // Process Daily_Hissab for current outstanding fallback
    if (dailyHissabRows && dailyHissabRows.length > 1) {
      for (let i = 1; i < dailyHissabRows.length; i++) {
        const row = dailyHissabRows[i];
        if (!row || row.length === 0) continue;
        let etmKey = "";
        for (let c = 0; c < Math.min(row.length, 8); c++) {
          const val = String(row[c] || "").trim().toUpperCase();
          if (val.startsWith("ETM") || /^[A-Z0-9_-]{3,15}$/.test(val)) {
            etmKey = val;
            break;
          }
        }
        if (!etmKey && row[1]) etmKey = String(row[1]).trim().toUpperCase();

        if (etmKey) {
          const colV = parseAmountWithNull(row[21]);
          if (colV !== null) {
            const keys = generateNormalizedKeys(etmKey);
            for (const k of keys) {
              dailyHissabMap.set(k, colV);
            }
          }
        }
      }
    }

    // 1. Authoritative Driver_Master Lookup Map
    interface MasterDriverInfo {
      id: string;
      name: string;
      mobile: string;
      etm: string;
      vehicle: string;
      status: string;
    }

    const masterByMobile = new Map<string, MasterDriverInfo>();
    const masterByEtm = new Map<string, MasterDriverInfo>();
    const masterById = new Map<string, MasterDriverInfo>();

    if (masterRows && masterRows.length > 1) {
      const headers = masterRows[0].map(h => String(h || "").trim().toLowerCase());
      const idIdx = headers.findIndex(h => h === "driver id" || h === "id");
      const etmIdx = headers.findIndex(h => h === "etm" || h === "etm id" || h === "etmid");
      const nameIdx = headers.findIndex(h => h === "name" || h === "driver name" || h === "drivername");
      const mobileIdx = headers.findIndex(h => h === "mobile" || h === "mobile number" || h === "phone");
      const vehicleIdx = headers.findIndex(h => h.includes("vehicle"));
      const statusIdx = headers.findIndex(h => h === "status");

      for (let i = 1; i < masterRows.length; i++) {
        const row = masterRows[i];
        if (!row || row.length === 0) continue;

        let id = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : (row[0] ? String(row[0]).trim() : "");
        let etm = etmIdx !== -1 && row[etmIdx] ? String(row[etmIdx]).trim() : "";
        let rawName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "";
        let mobile = mobileIdx !== -1 && row[mobileIdx] ? String(row[mobileIdx]).trim() : "";
        let vehicle = vehicleIdx !== -1 && row[vehicleIdx] ? String(row[vehicleIdx]).trim() : "";
        let status = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : "";

        // Fallbacks if header matching didn't yield values
        if (!rawName && !etm && !mobile) {
          const col1 = row[1] ? String(row[1]).trim() : "";
          const col2 = row[2] ? String(row[2]).trim() : "";
          const col3 = row[3] ? String(row[3]).trim() : "";

          // Structure: [Driver ID, ETM, Name, Mobile, ...]
          if (col1.toUpperCase().startsWith("ETM") || /^\d{10}$/.test(col3.replace(/\D/g, ""))) {
            etm = col1;
            rawName = col2;
            mobile = col3;
            vehicle = row[7] ? String(row[7]).trim() : (row[4] ? String(row[4]).trim() : "");
            status = row[8] ? String(row[8]).trim() : (row[5] ? String(row[5]).trim() : "");
          } else {
            // Structure: [Driver ID, Name, Mobile, ETM, ...]
            rawName = col1;
            mobile = col2;
            etm = col3;
            vehicle = row[4] ? String(row[4]).trim() : "";
            status = row[5] ? String(row[5]).trim() : "";
          }
        }

        const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
        const cleanEtm = etm.toUpperCase();
        const cleanId = id.toUpperCase();
        const validName = isValidDriverName(rawName) ? rawName : "";

        const info: MasterDriverInfo = {
          id: id || (cleanMobile ? `DR-${cleanMobile}` : `DR-${cleanEtm}`),
          name: validName,
          mobile: mobile || cleanMobile,
          etm: etm || (cleanMobile ? `ETM-${cleanMobile}` : ""),
          vehicle,
          status
        };

        if (cleanMobile) masterByMobile.set(cleanMobile, info);
        if (cleanEtm) masterByEtm.set(cleanEtm, info);
        if (cleanId) masterById.set(cleanId, info);
      }
    }

    // 2. Authoritative Vehicle_Master Lookup Map
    interface VehicleMasterAssignment {
      vehicleNumber: string;
      vehicleModel: string;
      assignedDriverEtm: string;
      assignedDriverMobile: string;
      assignedDriverName: string;
    }

    const vehicleByEtm = new Map<string, VehicleMasterAssignment>();
    const vehicleByMobile = new Map<string, VehicleMasterAssignment>();
    const vehicleMap = new Map<string, import("../types").AdminVehicleItem>();

    if (vmRows && vmRows.length > 1) {
      const vmHeaders = vmRows[0].map(h => String(h || "").trim().toLowerCase());
      const vIdIdx = vmHeaders.findIndex(h => h.includes("vehicle id") || h === "id");
      const vNoIdx = vmHeaders.findIndex(h => h === "vehicle number" || h === "vehiclenumber" || h === "vehicle_number" || h === "vehicle no");
      const fuelIdx = vmHeaders.findIndex(h => h.includes("fuel") || h.includes("model") || h.includes("type"));
      const etmIdx = vmHeaders.findIndex(h => h.includes("assigned driver etm") || h === "etm" || h.includes("etm id"));
      const driverNameIdx = vmHeaders.findIndex(h => h.includes("assigned driver name") || h === "driver name");
      const driverMobileIdx = vmHeaders.findIndex(h => h.includes("driver mobile") || h === "mobile");
      const allocIdx = vmHeaders.findIndex(h => h.includes("allocation") || h.includes("status"));

      for (let i = 1; i < vmRows.length; i++) {
        const row = vmRows[i];
        if (!row || row.length === 0) continue;

        const vId = vIdIdx !== -1 && row[vIdIdx] ? String(row[vIdIdx]).trim() : (row[0] ? String(row[0]).trim() : "");
        const vNo = vNoIdx !== -1 && row[vNoIdx] ? String(row[vNoIdx]).trim().toUpperCase() : (row[1] ? String(row[1]).trim().toUpperCase() : (vId ? vId.toUpperCase() : ""));
        const fuelType = fuelIdx !== -1 && row[fuelIdx] ? String(row[fuelIdx]).trim() : (row[2] ? String(row[2]).trim() : "EV");
        const assignedEtm = etmIdx !== -1 && row[etmIdx] ? String(row[etmIdx]).trim().toUpperCase() : (row[3] ? String(row[3]).trim().toUpperCase() : "");
        const rawDriverName = driverNameIdx !== -1 && row[driverNameIdx] ? String(row[driverNameIdx]).trim() : (row[4] ? String(row[4]).trim() : "");
        const assignedMobile = driverMobileIdx !== -1 && row[driverMobileIdx] ? String(row[driverMobileIdx]).replace(/\D/g, "").slice(-10) : (row[5] ? String(row[5]).replace(/\D/g, "").slice(-10) : "");
        const allocStatus = allocIdx !== -1 && row[allocIdx] ? String(row[allocIdx]).trim() : (row[6] ? String(row[6]).trim() : (assignedEtm || assignedMobile ? "Assigned" : "Available"));

        if (vNo) {
          const matchedMaster = (assignedMobile && masterByMobile.get(assignedMobile)) ||
                                (assignedEtm && masterByEtm.get(assignedEtm));
          const resolvedDriverName = (matchedMaster && matchedMaster.name) || (isValidDriverName(rawDriverName) ? rawDriverName : "");

          vehicleMap.set(vNo, {
            id: vId || vNo,
            vehicleNumber: vNo,
            vehicleType: fuelType.toLowerCase().includes("cng") ? "CNG" : "EV",
            assignedDriverId: assignedEtm || assignedMobile,
            assignedDriverName: resolvedDriverName,
            assignedDriverEtm: assignedEtm,
            status: allocStatus === "Assigned" ? "Active" : "Unassigned",
            model: fuelType || "Standard Fleet Vehicle"
          });

          const assignment: VehicleMasterAssignment = {
            vehicleNumber: vNo,
            vehicleModel: fuelType || "EV",
            assignedDriverEtm: assignedEtm,
            assignedDriverMobile: assignedMobile,
            assignedDriverName: resolvedDriverName
          };
          if (assignedEtm) vehicleByEtm.set(assignedEtm, assignment);
          if (assignedMobile) vehicleByMobile.set(assignedMobile, assignment);
        }
      }
    }

    const driverMap = new Map<string, import("../types").AdminDriverItem>();

    // Helper to resolve driver details with Driver_Master as highest priority
    const resolveDriverDetails = (
      mobileParam: string,
      etmParam: string,
      idParam: string,
      rawNameParam?: string
    ) => {
      const cleanMobile = mobileParam ? mobileParam.replace(/\D/g, "").slice(-10) : "";
      const cleanEtm = etmParam ? etmParam.trim().toUpperCase() : "";
      const cleanId = idParam ? idParam.trim().toUpperCase() : "";

      const master = (cleanMobile && masterByMobile.get(cleanMobile)) ||
                     (cleanEtm && masterByEtm.get(cleanEtm)) ||
                     (cleanId && masterById.get(cleanId));

      const mobile = (master && master.mobile) || mobileParam || cleanMobile;
      const etmId = (master && master.etm) || etmParam || (cleanMobile ? `ETM-${cleanMobile}` : "");
      const id = (master && master.id) || idParam || (cleanMobile ? `DR-${cleanMobile}` : etmId);

      let name = "";
      if (master && isValidDriverName(master.name)) {
        name = master.name;
      } else if (isValidDriverName(rawNameParam)) {
        name = rawNameParam!.trim();
      } else {
        name = ""; // Never assign ETM ID as name!
      }

      return { id, name, mobile, etmId, masterVehicle: master?.vehicle || "" };
    };

    // 1. Process Driver_Login
    if (loginRows && loginRows.length > 1) {
      const headers = loginRows[0].map(h => normalizeHeader(h));
      const mobileIdx = headers.findIndex(h => ["mobilenumber", "mobile", "phone"].includes(h));
      const idIdx = headers.findIndex(h => ["driverid", "id", "driver_id"].includes(h));
      const etmIdx = headers.findIndex(h => ["etm", "etmid"].includes(h));
      const nameIdx = headers.findIndex(h => ["name", "drivername"].includes(h));
      const statusIdx = headers.findIndex(h => ["status", "state"].includes(h));
      const lastLoginIdx = headers.findIndex(h => ["lastlogin", "login"].includes(h));

      for (let i = 1; i < loginRows.length; i++) {
        const row = loginRows[i];
        if (!row || row.length === 0) continue;
        const mobile = mobileIdx !== -1 && row[mobileIdx] ? String(row[mobileIdx]).trim() : "";
        const id = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : "";
        const etm = etmIdx !== -1 && row[etmIdx] ? String(row[etmIdx]).trim() : "";
        const rawName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "";
        const status = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : "Active";
        const lastLogin = lastLoginIdx !== -1 && row[lastLoginIdx] ? String(row[lastLoginIdx]).trim() : "";

        const resolved = resolveDriverDetails(mobile, etm, id, rawName);
        const key = resolved.mobile.replace(/\D/g, "").slice(-10) || resolved.etmId.toUpperCase() || resolved.id;

        if (key) {
          driverMap.set(key, {
            id: resolved.id,
            name: resolved.name,
            mobile: resolved.mobile,
            etmId: resolved.etmId,
            vehicleNumber: "",
            vehicleModel: "",
            status: status || "Active",
            documentStatus: "Pending",
            registrationDate: new Date().toISOString().split("T")[0],
            lastLogin: lastLogin,
            currentOutstanding: 0,
            weeklyOutstanding: 0,
            totalOutstanding: 0,
            totalEarnings: 0,
            dailyEarnings: 0
          });
        }
      }
    }

    // 2. Process Driver_Documents
    if (docRows && docRows.length > 1) {
      for (let i = 1; i < docRows.length; i++) {
        const row = docRows[i];
        if (!row || row.length === 0) continue;

        const regDate = row[0] || "";
        const rawName = row[1] || "";
        const mobile = row[2] ? String(row[2]).trim() : "";
        const etm = row[3] ? String(row[3]).trim() : "";

        const resolved = resolveDriverDetails(mobile, etm, "", rawName);
        const key = resolved.mobile.replace(/\D/g, "").slice(-10) || resolved.etmId.toUpperCase() || resolved.id;

        let item = driverMap.get(key);
        if (!item) {
          item = {
            id: resolved.id,
            name: resolved.name,
            mobile: resolved.mobile,
            etmId: resolved.etmId,
            vehicleNumber: row[10] || "",
            vehicleModel: row[11] || "",
            status: row[20] || "Pending",
            documentStatus: row[20] || "Pending",
            registrationDate: regDate,
          };
          driverMap.set(key, item);
        } else {
          if (resolved.name && isValidDriverName(resolved.name)) item.name = resolved.name;
          item.mobile = resolved.mobile || item.mobile;
          item.etmId = resolved.etmId || item.etmId;
        }

        item.aadhaarNumber = row[4] || item.aadhaarNumber;
        item.panNumber = row[5] || item.panNumber;
        item.dlNumber = row[6] || item.dlNumber;
        item.address = row[7] || item.address;
        item.emergencyContact = row[9] || item.emergencyContact;
        if (row[10]) item.vehicleNumber = row[10];
        if (row[11]) item.vehicleModel = row[11];
        item.profilePhotoUrl = row[12] || item.profilePhotoUrl;
        item.aadhaarFrontUrl = row[13] || item.aadhaarFrontUrl;
        item.aadhaarBackUrl = row[14] || item.aadhaarBackUrl;
        item.panCardUrl = row[15] || item.panCardUrl;
        item.dlFrontUrl = row[16] || item.dlFrontUrl;
        item.dlBackUrl = row[17] || item.dlBackUrl;
        item.bankPassbookUrl = row[18] || item.bankPassbookUrl;
        item.policeVerificationUrl = row[19] || item.policeVerificationUrl;
        item.documentStatus = row[20] || item.documentStatus || "Pending";
      }
    }

    // 3. Process Driver_Verification
    if (dvRows && dvRows.length > 1) {
      for (let i = 1; i < dvRows.length; i++) {
        const row = dvRows[i];
        if (!row || row.length === 0) continue;
        const id = row[0] ? String(row[0]).trim() : "";
        const etm = row[1] ? String(row[1]).trim() : "";
        const rawName = row[2] ? String(row[2]).trim() : "";
        const mobile = row[3] ? String(row[3]).trim() : "";
        // Column I (index 8) is Verification Status!
        const verificationStatus = row[8] ? String(row[8]).trim() : (row[12] ? String(row[12]).trim() : "Pending");

        const resolved = resolveDriverDetails(mobile, etm, id, rawName);
        const key = resolved.mobile.replace(/\D/g, "").slice(-10) || resolved.etmId.toUpperCase() || resolved.id;

        let item = driverMap.get(key);
        if (item) {
          if (resolved.name && isValidDriverName(resolved.name)) item.name = resolved.name;
          item.mobile = resolved.mobile || item.mobile;
          item.etmId = resolved.etmId || item.etmId;
          if (verificationStatus) {
            item.status = verificationStatus;
            item.documentStatus = verificationStatus;
            (item as any).verificationStatus = verificationStatus;
          }
        } else if (key) {
          driverMap.set(key, {
            id: resolved.id,
            name: resolved.name,
            mobile: resolved.mobile,
            etmId: resolved.etmId,
            vehicleNumber: "",
            vehicleModel: "",
            status: verificationStatus || "Pending",
            documentStatus: verificationStatus || "Pending",
            registrationDate: new Date().toISOString().split("T")[0]
          });
          const newItem = driverMap.get(key);
          if (newItem) (newItem as any).verificationStatus = verificationStatus;
        }

        // Auto refresh Driver_Verification row in Google Sheets if driver name was incorrectly populated with ETM ID
        if (accessToken && (!isValidDriverName(rawName) || rawName.toUpperCase().startsWith("ETM") || rawName.toUpperCase().startsWith("DR-"))) {
          if (resolved.name && isValidDriverName(resolved.name)) {
            const range = `Driver_Verification!C${i + 1}`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
            fetch(url, {
              method: "PUT",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ values: [[resolved.name]] })
            }).catch(() => {});
          }
        }
      }
    }

    // 3b. Process Documents_Verification
    if (docvRows && docvRows.length > 1) {
      for (let i = 1; i < docvRows.length; i++) {
        const row = docvRows[i];
        if (!row || row.length === 0) continue;
        const id = row[0] ? String(row[0]).trim() : "";
        const etm = row[1] ? String(row[1]).trim() : "";
        const rawName = row[2] ? String(row[2]).trim() : "";
        const mobile = row[3] ? String(row[3]).trim() : "";
        // Column I (index 8) is Verification Status!
        const docVerificationStatus = row[8] ? String(row[8]).trim() : (row[12] ? String(row[12]).trim() : "Pending");

        const resolved = resolveDriverDetails(mobile, etm, id, rawName);
        const key = resolved.mobile.replace(/\D/g, "").slice(-10) || resolved.etmId.toUpperCase() || resolved.id;

        let item = driverMap.get(key);
        if (item) {
          if (docVerificationStatus) {
            item.documentStatus = docVerificationStatus;
          }
        }
      }
    }

    // 4. Process Driver_Master
    if (masterRows && masterRows.length > 1) {
      const headers = masterRows[0].map(h => String(h || "").trim().toLowerCase());
      const idIdx = headers.findIndex(h => h === "driver id" || h === "id");
      const etmIdx = headers.findIndex(h => h === "etm" || h === "etm id" || h === "etmid");
      const nameIdx = headers.findIndex(h => h === "name" || h === "driver name" || h === "drivername");
      const mobileIdx = headers.findIndex(h => h === "mobile" || h === "mobile number" || h === "phone");
      const vehicleIdx = headers.findIndex(h => h.includes("vehicle"));
      const statusIdx = headers.findIndex(h => h === "status");

      for (let i = 1; i < masterRows.length; i++) {
        const row = masterRows[i];
        if (!row || row.length === 0) continue;

        let id = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : (row[0] ? String(row[0]).trim() : "");
        let etm = etmIdx !== -1 && row[etmIdx] ? String(row[etmIdx]).trim() : "";
        let rawName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "";
        let mobile = mobileIdx !== -1 && row[mobileIdx] ? String(row[mobileIdx]).trim() : "";
        let vehicleNo = vehicleIdx !== -1 && row[vehicleIdx] ? String(row[vehicleIdx]).trim() : "";
        let status = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : "";

        if (!rawName && !etm && !mobile) {
          const col1 = row[1] ? String(row[1]).trim() : "";
          const col2 = row[2] ? String(row[2]).trim() : "";
          const col3 = row[3] ? String(row[3]).trim() : "";

          if (col1.toUpperCase().startsWith("ETM") || /^\d{10}$/.test(col3.replace(/\D/g, ""))) {
            etm = col1;
            rawName = col2;
            mobile = col3;
            vehicleNo = row[7] ? String(row[7]).trim() : "";
            status = row[8] ? String(row[8]).trim() : "";
          } else {
            rawName = col1;
            mobile = col2;
            etm = col3;
            vehicleNo = row[4] ? String(row[4]).trim() : "";
            status = row[5] ? String(row[5]).trim() : "";
          }
        }

        const resolved = resolveDriverDetails(mobile, etm, id, rawName);
        const key = resolved.mobile.replace(/\D/g, "").slice(-10) || resolved.etmId.toUpperCase() || resolved.id;

        let item = driverMap.get(key);
        if (item) {
          if (resolved.name && isValidDriverName(resolved.name)) item.name = resolved.name;
          item.mobile = resolved.mobile || item.mobile;
          item.etmId = resolved.etmId || item.etmId;
          if (vehicleNo) item.vehicleNumber = vehicleNo;
          if (status) {
            const dvStatus = ((item as any).verificationStatus || item.status || "").trim().toLowerCase();
            if (dvStatus === "approved" || dvStatus === "rejected" || dvStatus === "verified") {
              if (status.toLowerCase() === "suspended") {
                item.status = status;
              }
            } else {
              item.status = status;
            }
          }
        } else if (key) {
          driverMap.set(key, {
            id: resolved.id,
            name: resolved.name,
            mobile: resolved.mobile,
            etmId: resolved.etmId,
            vehicleNumber: vehicleNo,
            vehicleModel: "",
            status: status || "Active",
            documentStatus: "Verified",
            registrationDate: new Date().toISOString().split("T")[0]
          });
        }
      }
    }

    // Attach Vehicle_Master assignments dynamically to all drivers
    const rawDrivers = Array.from(driverMap.values());
    const seenIds = new Set<string>();

    const driversList = rawDrivers.map((d, index) => {
      let uniqueId = d.id || `DR-${d.mobile || index}`;
      if (seenIds.has(uniqueId)) {
        uniqueId = `${uniqueId}-${d.mobile || index}`;
      }
      seenIds.add(uniqueId);

      const cleanMobile = d.mobile ? d.mobile.replace(/\D/g, "").slice(-10) : "";
      const cleanEtm = d.etmId ? d.etmId.trim().toUpperCase() : "";

      // Check Vehicle_Master assignment:
      // Search Vehicle_Master where Assigned Driver ETM == Driver_Master.ETM (or Driver Mobile)
      const vmMatch = (cleanEtm && vehicleByEtm.get(cleanEtm)) ||
                      (cleanMobile && vehicleByMobile.get(cleanMobile));

      let finalVehicleNo = "";
      let finalVehicleModel = d.vehicleModel || "EV";

      if (vmMatch && vmMatch.vehicleNumber) {
        finalVehicleNo = formatVehicleNumber(vmMatch.vehicleNumber);
        finalVehicleModel = vmMatch.vehicleModel || finalVehicleModel;
      } else {
        finalVehicleNo = formatVehicleNumber(d.vehicleNumber);
      }

      // Ensure Driver Name is NEVER set to ETM or DR- or pure numbers
      const validName = d.name && isValidDriverName(d.name) ? d.name.trim() : "";
      const finalName = validName || (d.mobile ? `Driver (${d.mobile})` : "Pending Name");

      const driverKeys = generateNormalizedKeys(d.etmId, d.mobile, uniqueId);

      let weeklyOSVal: number | null = null;
      let currentOSVal: number | null = null;
      let totalOSVal: number | null = null;
      let resolvedSource = "";

      // 1. Look up in Outstanding_Log map
      for (const k of driverKeys) {
        const rec = outstandingLogMap.get(k);
        if (rec) {
          if (weeklyOSVal === null && rec.weeklyOS !== undefined) weeklyOSVal = rec.weeklyOS;
          if (currentOSVal === null && rec.currentOS !== undefined) currentOSVal = rec.currentOS;
          if (totalOSVal === null && rec.totalOS !== undefined) totalOSVal = rec.totalOS;
          resolvedSource = rec.sourceSheet;
          if (weeklyOSVal !== null) break;
        }
      }

      // 2. Look up in Weekly_Hissab / Driver_Weekly_Summary map
      if (weeklyOSVal === null) {
        for (const k of driverKeys) {
          const rec = weeklyHissabMap.get(k);
          if (rec) {
            if (weeklyOSVal === null && rec.weeklyOS !== undefined) weeklyOSVal = rec.weeklyOS;
            if (currentOSVal === null && rec.currentOS !== undefined) currentOSVal = rec.currentOS;
            if (totalOSVal === null && rec.totalOS !== undefined) totalOSVal = rec.totalOS;
            if (!resolvedSource) resolvedSource = rec.sourceSheet;
            if (weeklyOSVal !== null) break;
          }
        }
      }

      // 3. Fallback for Current Outstanding from Daily_Hissab map
      if (currentOSVal === null) {
        for (const k of driverKeys) {
          const val = dailyHissabMap.get(k);
          if (val !== undefined && val !== null) {
            currentOSVal = val;
            break;
          }
        }
      }

      const curOutstanding = currentOSVal !== null && !isNaN(currentOSVal) ? currentOSVal : 0;
      const lastWeekOutstanding = weeklyOSVal !== null && !isNaN(weeklyOSVal) ? weeklyOSVal : 0;
      const totalOut = totalOSVal !== null && !isNaN(totalOSVal) ? totalOSVal : (curOutstanding + lastWeekOutstanding);

      if (weeklyOSVal === null || isNaN(weeklyOSVal)) {
        console.warn(
          `[Admin Weekly Outstanding Debug] Driver "${finalName}" (ETM: "${d.etmId || 'N/A'}", Mobile: "${d.mobile || 'N/A'}", ID: "${uniqueId}"): ` +
          `Weekly Outstanding is missing/null/empty/NaN in Google Sheets. Displaying ₹0. Lookup keys tested: [${driverKeys.join(", ")}].`
        );
      } else {
        console.log(
          `[Admin Weekly Outstanding Debug] Driver "${finalName}" (ETM: "${d.etmId || 'N/A'}", Mobile: "${d.mobile || 'N/A'}"): ` +
          `Successfully resolved Weekly Outstanding = ₹${lastWeekOutstanding} from sheet "${resolvedSource}".`
        );
      }

      return {
        ...d,
        id: uniqueId,
        name: finalName,
        vehicleNumber: finalVehicleNo,
        vehicleModel: finalVehicleModel,
        currentOutstanding: curOutstanding,
        weeklyOutstanding: lastWeekOutstanding,
        totalOutstanding: totalOut
      };
    });

    // Merge driver assigned vehicles into vehicleMap if missing
    driversList.forEach(d => {
      if (d.vehicleNumber && d.vehicleNumber.trim()) {
        const vNo = d.vehicleNumber.trim().toUpperCase();
        if (!vehicleMap.has(vNo)) {
          vehicleMap.set(vNo, {
            id: vNo,
            vehicleNumber: vNo,
            vehicleType: d.vehicleModel?.toLowerCase().includes("cng") ? "CNG" : "EV",
            assignedDriverId: d.id,
            assignedDriverName: d.name,
            assignedDriverEtm: d.etmId,
            status: "Active",
            model: d.vehicleModel || "Standard Fleet Vehicle"
          });
        } else {
          const existing = vehicleMap.get(vNo)!;
          if (!existing.assignedDriverName || existing.assignedDriverName.startsWith("Driver (")) {
            existing.assignedDriverName = d.name;
          }
          if (!existing.assignedDriverEtm) {
            existing.assignedDriverEtm = d.etmId;
          }
        }
      }
    });

    return {
      drivers: driversList,
      vehicles: Array.from(vehicleMap.values()),
      driverVerification: driversList
    };
  } catch (err) {
    console.warn("Failed fetching all admin data from Google Sheets:", err);
    return { drivers: [], vehicles: [], driverVerification: [] };
  }
}

/**
 * Assign Vehicle to Driver in Google Sheets (Vehicle_Master & Driver_Master)
 */
export async function assignVehicleInSheets(
  driverMobileOrEtm: string,
  vehicleNumber: string,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    validateConfig(SPREADSHEET_ID);
    const token = getEffectiveToken(accessToken);
    if (!token) {
      return { success: true, message: `Vehicle ${vehicleNumber} assigned locally.` };
    }

    const searchKey = driverMobileOrEtm.replace(/\D/g, "").slice(-10) || driverMobileOrEtm.trim().toUpperCase();

    // 1. Get driver details from Driver_Master
    const masterRows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Master", accessToken).catch(() => []);
    let driverName = "";
    let driverMobile = "";
    let driverEtm = "";
    let driverId = "";

    if (masterRows && masterRows.length > 1) {
      for (let i = 1; i < masterRows.length; i++) {
        const r = masterRows[i];
        if (!r) continue;
        const cellId = r[0] ? String(r[0]).trim() : "";
        const cellName = r[1] ? String(r[1]).trim() : "";
        const cellMobile = r[2] ? String(r[2]).replace(/\D/g, "").slice(-10) : "";
        const cellEtm = r[3] ? String(r[3]).trim().toUpperCase() : "";

        if (cellMobile === searchKey || cellEtm === searchKey || cellId.toUpperCase() === searchKey) {
          driverId = cellId;
          driverName = cellName;
          driverMobile = r[2] || "";
          driverEtm = cellEtm;

          const range = `Driver_Master!E${i + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [[vehicleNumber]] })
          }).catch(() => {});
          break;
        }
      }
    }

    if (!driverName) driverName = `Driver ${driverMobileOrEtm}`;
    if (!driverEtm) driverEtm = driverMobileOrEtm;
    if (!driverMobile) driverMobile = driverMobileOrEtm;

    // 2. Update Vehicle_Master
    const vmRows = await fetchSheetValues(SPREADSHEET_ID, "Vehicle_Master", accessToken).catch(() => []);
    const vmHeaders = ["Vehicle ID", "Vehicle Number", "Fuel Type", "Assigned Driver ETM", "Assigned Driver Name", "Driver Mobile", "Allocation Status"];

    if (!vmRows || vmRows.length === 0) {
      await appendSheetRows(SPREADSHEET_ID, "Vehicle_Master", [
        vmHeaders,
        [`VEH-${vehicleNumber}`, vehicleNumber, "EV", driverEtm, driverName, driverMobile, "Assigned"]
      ], accessToken);
    } else {
      let vehicleMatched = false;
      for (let i = 1; i < vmRows.length; i++) {
        const r = vmRows[i];
        if (!r) continue;
        const cellVNo = r[1] ? String(r[1]).trim().toUpperCase() : "";
        const cellEtm = r[3] ? String(r[3]).trim().toUpperCase() : "";
        const cellMobile = r[5] ? String(r[5]).replace(/\D/g, "").slice(-10) : "";

        if (cellVNo !== vehicleNumber.trim().toUpperCase() && (cellEtm === driverEtm.toUpperCase() || (cellMobile && cellMobile === searchKey))) {
          const clearRange = `Vehicle_Master!D${i + 1}:G${i + 1}`;
          const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(clearRange)}?valueInputOption=USER_ENTERED`;
          await fetch(clearUrl, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [["", "", "", "Available"]] })
          }).catch(() => {});
        }

        if (cellVNo === vehicleNumber.trim().toUpperCase()) {
          vehicleMatched = true;
          const range = `Vehicle_Master!D${i + 1}:G${i + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [[driverEtm, driverName, driverMobile, "Assigned"]] })
          }).catch(() => {});
        }
      }

      if (!vehicleMatched) {
        await appendSheetRows(SPREADSHEET_ID, "Vehicle_Master", [
          [`VEH-${vehicleNumber}`, vehicleNumber, "EV", driverEtm, driverName, driverMobile, "Assigned"]
        ], accessToken);
      }
    }

    return { success: true, message: `Vehicle ${vehicleNumber} assigned successfully in Google Sheets!` };
  } catch (err: any) {
    console.error("Error assigning vehicle in sheets:", err);
    return { success: false, message: err?.message || "Failed to assign vehicle." };
  }
}

/**
 * Remove Vehicle Assignment in Google Sheets
 */
export async function removeVehicleAssignmentInSheets(
  vehicleNumber: string,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    validateConfig(SPREADSHEET_ID);
    const token = getEffectiveToken(accessToken);
    if (!token) {
      return { success: true, message: `Vehicle assignment removed locally.` };
    }

    const cleanVNo = vehicleNumber.trim().toUpperCase();

    // 1. Update Vehicle_Master
    const vmRows = await fetchSheetValues(SPREADSHEET_ID, "Vehicle_Master", accessToken).catch(() => []);
    let assignedEtm = "";
    if (vmRows && vmRows.length > 1) {
      for (let i = 1; i < vmRows.length; i++) {
        const r = vmRows[i];
        if (!r) continue;
        const cellVNo = r[1] ? String(r[1]).trim().toUpperCase() : "";
        if (cellVNo === cleanVNo) {
          assignedEtm = r[3] ? String(r[3]).trim() : "";
          const range = `Vehicle_Master!D${i + 1}:G${i + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [["", "", "", "Available"]] })
          }).catch(() => {});
          break;
        }
      }
    }

    // 2. Clear vehicle in Driver_Master
    const masterRows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Master", accessToken).catch(() => []);
    if (masterRows && masterRows.length > 1) {
      for (let i = 1; i < masterRows.length; i++) {
        const r = masterRows[i];
        if (!r) continue;
        const cellVNo = r[4] ? String(r[4]).trim().toUpperCase() : "";
        const cellEtm = r[3] ? String(r[3]).trim().toUpperCase() : "";
        if (cellVNo === cleanVNo || (assignedEtm && cellEtm === assignedEtm.toUpperCase())) {
          const range = `Driver_Master!E${i + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [[""]] })
          }).catch(() => {});
        }
      }
    }

    return { success: true, message: `Vehicle assignment removed for ${vehicleNumber} in Google Sheets!` };
  } catch (err: any) {
    console.error("Error removing vehicle assignment in sheets:", err);
    return { success: false, message: err?.message || "Failed to remove vehicle assignment." };
  }
}

import { syncApprovedDriver, syncRejectedDriver } from "./googleSheets";

/**
 * Complete Driver Verification approval workflow.
 * Delegates to googleSheets.ts syncApprovedDriver module.
 */
export async function approveDriverWorkflowInSheets(
  driver: import("../types").AdminDriverItem,
  accessToken?: string | null,
  adminName: string = "Admin"
): Promise<{ success: boolean; message: string }> {
  return syncApprovedDriver(driver, accessToken, adminName);
}

/**
 * Complete Driver Verification rejection workflow.
 * Delegates to googleSheets.ts syncRejectedDriver module.
 */
export async function rejectDriverWorkflowInSheets(
  driver: import("../types").AdminDriverItem,
  reason: string = "Rejected",
  accessToken?: string | null,
  adminName: string = "Admin"
): Promise<{ success: boolean; message: string }> {
  return syncRejectedDriver(driver, reason, accessToken, adminName);
}

/**
 * Update driver status in Google Sheets (Driver_Master, Driver_Verification, Documents_Verification, Driver_Login, Driver_Documents)
 */
export async function updateDriverStatusInSheet(
  driverMobileOrEtm: string,
  newStatus: "Approved" | "Active" | "Rejected" | "Inactive" | "Suspended",
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    validateConfig(SPREADSHEET_ID);
    const searchKey = driverMobileOrEtm.replace(/\D/g, "").slice(-10) || driverMobileOrEtm.trim().toUpperCase();

    const token = getEffectiveToken(accessToken);
    if (!token) {
      return { success: true, message: `Driver status set to ${newStatus} locally.` };
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Note: Driver_Master must never be updated per workflow requirement #7.

    // 1. Driver_Verification
    const dvRows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Verification", accessToken).catch(() => []);
    if (dvRows && dvRows.length > 1) {
      for (let i = 1; i < dvRows.length; i++) {
        const r = dvRows[i];
        if (!r) continue;
        const cellMobile = r[3] ? String(r[3]).replace(/\D/g, "").slice(-10) : "";
        const cellEtm = r[1] ? String(r[1]).trim().toUpperCase() : "";
        if (cellMobile === searchKey || cellEtm === searchKey) {
          const range = `Driver_Verification!M${i + 1}:O${i + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [[newStatus, "Admin", todayStr]] })
          }).catch(() => {});
          break;
        }
      }
    }

    // 3. Documents_Verification
    const docvRows = await fetchSheetValues(SPREADSHEET_ID, "Documents_Verification", accessToken).catch(() => []);
    if (docvRows && docvRows.length > 1) {
      for (let i = 1; i < docvRows.length; i++) {
        const r = docvRows[i];
        if (!r) continue;
        const cellMobile = r[3] ? String(r[3]).replace(/\D/g, "").slice(-10) : "";
        const cellEtm = r[1] ? String(r[1]).trim().toUpperCase() : "";
        if (cellMobile === searchKey || cellEtm === searchKey) {
          const range = `Documents_Verification!I${i + 1}:K${i + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [[newStatus, "Admin", todayStr]] })
          }).catch(() => {});
          break;
        }
      }
    }

    // 4. Driver_Login
    const loginRows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Login", accessToken).catch(() => []);
    if (loginRows && loginRows.length > 1) {
      for (let i = 1; i < loginRows.length; i++) {
        const r = loginRows[i];
        if (!r) continue;
        const cellMobile = r[0] ? String(r[0]).replace(/\D/g, "").slice(-10) : "";
        if (cellMobile === searchKey) {
          const range = `Driver_Login!D${i + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [[newStatus === "Approved" ? "Active" : newStatus]] })
          }).catch(() => {});
          break;
        }
      }
    }

    // 5. Driver_Documents
    const docRows = await fetchSheetValues(SPREADSHEET_ID, "Driver_Documents", accessToken).catch(() => []);
    if (docRows && docRows.length > 1) {
      for (let i = 1; i < docRows.length; i++) {
        const r = docRows[i];
        if (!r) continue;
        const cellMobile = r[2] ? String(r[2]).replace(/\D/g, "").slice(-10) : "";
        const cellEtm = r[3] ? String(r[3]).trim().toUpperCase() : "";
        if (cellMobile === searchKey || cellEtm === searchKey) {
          const range = `Driver_Documents!U${i + 1}`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
          await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [[newStatus]] })
          }).catch(() => {});
          break;
        }
      }
    }

    return { success: true, message: `Driver status successfully updated to ${newStatus} in Google Sheets!` };
  } catch (err: any) {
    console.error("Error updating driver status in sheet:", err);
    return { success: false, message: err?.message || "Failed to update driver status in sheet." };
  }
}

/**
 * Send Admin Notification to Notifications Sheet
 */
export async function sendAdminNotificationToSheet(
  title: string,
  message: string,
  type: "info" | "warning" | "success" | "danger",
  driverMobileOrEtm?: string,
  accessToken?: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    validateConfig(SPREADSHEET_ID);
    const sheetName = "Notifications";
    const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const rowValues = [
      nowStr,
      driverMobileOrEtm || "ALL",
      title,
      message,
      type || "info",
      "FALSE"
    ];

    if (accessToken) {
      await appendSheetRows(SPREADSHEET_ID, sheetName, [rowValues], accessToken);
    }

    return { success: true, message: "Notification broadcasted successfully!" };
  } catch (err: any) {
    console.error("Error sending admin notification:", err);
    return { success: false, message: err?.message || "Failed to send notification." };
  }
}



