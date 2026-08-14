import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const SPREADSHEET_ID = "1zgXzRTy2-aHR8JuR2r0AISCdkywI-jtUa7wV-OW7APo";
const DEFAULT_SHEET_NAME = "Hissab Summary";

function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Server-side Google Sheets Write Handler
 */
async function performBackendSheetWrite(payload: any) {
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    process.env.GOOGLE_SCRIPT_URL ||
    process.env.VITE_APPS_SCRIPT_URL ||
    "";

  console.log("[Backend Sheet Write] Apps Script URL configured:", !!appsScriptUrl);

  // Strategy 1: Forward payload to Google Apps Script Web App
  if (appsScriptUrl && appsScriptUrl.startsWith("http")) {
    console.log(`[Backend Sheet Write] Executing via Google Apps Script Web App...`);
    try {
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "follow"
      });

      const resText = await response.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(resText);
      } catch (_) {
        console.warn("[Backend Sheet Write] Apps Script returned non-JSON text:", resText.substring(0, 300));
      }

      if (resJson && resJson.success) {
        console.log("[Backend Sheet Write] Apps Script Write Success:", resJson);
        return resJson;
      }
      if (resJson && resJson.error) {
        throw new Error(`Apps Script Error: ${resJson.error}`);
      }
    } catch (err: any) {
      console.error("[Backend Sheet Write] Apps Script Execution Failed:", err.message);
      throw err;
    }
  }

  // Strategy 2: Direct Google Sheets REST API v4 using Server OAuth Token or Service Account
  const serverToken =
    process.env.GOOGLE_ACCESS_TOKEN ||
    process.env.GOOGLE_OAUTH_TOKEN ||
    "";

  if (serverToken) {
    console.log("[Backend Sheet Write] Executing via Server Access Token...");
    const action = payload.action;

    if (action === "updateCell") {
      const colLetter = getColumnLetter(payload.colIndex);
      const sheetPart = encodeURIComponent(payload.sheetName || DEFAULT_SHEET_NAME);
      const range = `${sheetPart}!${colLetter}${payload.rowIndex}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${payload.spreadsheetId || SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

      const apiRes = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${serverToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: [[payload.newValue]] })
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text().catch(() => "");
        throw new Error(`Google Sheets REST API failed (${apiRes.status}): ${errText}`);
      }

      return {
        success: true,
        sheet: payload.sheetName || DEFAULT_SHEET_NAME,
        rowIndex: payload.rowIndex,
        colIndex: payload.colIndex,
        newValue: payload.newValue,
        rowsWritten: 1
      };
    } else if (action === "uploadHissabSummary" || action === "writeHissabSummary") {
      const combinedMatrix = payload.combinedMatrix;
      if (!combinedMatrix || combinedMatrix.length === 0) {
        throw new Error("No combinedMatrix data provided for sheet write");
      }

      const numCols = combinedMatrix[0].length;
      const endColLetter = getColumnLetter(Math.max(numCols - 1, 0));
      const sheetPart = encodeURIComponent(payload.sheetName || DEFAULT_SHEET_NAME);
      const range = `${sheetPart}!A1:${endColLetter}${combinedMatrix.length}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${payload.spreadsheetId || SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

      const apiRes = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${serverToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: combinedMatrix })
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text().catch(() => "");
        throw new Error(`Google Sheets REST API failed (${apiRes.status}): ${errText}`);
      }

      return {
        success: true,
        sheet: payload.sheetName || DEFAULT_SHEET_NAME,
        rowsInserted: payload.rowsInserted || 0,
        rowsUpdated: payload.rowsUpdated || 0,
        rowsWritten: combinedMatrix.length - 1
      };
    }
  }

  // Strategy 3: Fallback handling when server credentials are missing
  console.warn("[Backend Sheet Write] Warning: Neither GOOGLE_APPS_SCRIPT_URL nor GOOGLE_ACCESS_TOKEN is configured in server environment.");
  throw new Error(
    "Google Sheets write authentication is not configured on the server. Please set GOOGLE_APPS_SCRIPT_URL in server environment variables or deploy Google Apps Script Web App."
  );
}

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    spreadsheetId: SPREADSHEET_ID,
    appsScriptConfigured: !!(process.env.GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL)
  });
});

// CSV Upload API Endpoint for Hissab Summary
app.post("/api/hissab-summary/upload", async (req, res) => {
  console.log("[API POST /api/hissab-summary/upload] Received upload request.");
  try {
    const {
      spreadsheetId = SPREADSHEET_ID,
      sheetName = DEFAULT_SHEET_NAME,
      headers,
      newRowsToInsertAtTop,
      existingDataRows,
      combinedMatrix,
      duplicateStrategy = "update",
      insertedNewCount = 0,
      updatedRecordsCount = 0,
      skippedRecordsCount = 0,
      adminRole
    } = req.body;

    // Validate Admin privileges
    const roleUpper = String(adminRole || "").toUpperCase();
    if (adminRole && !roleUpper.includes("ADMIN") && !roleUpper.includes("SUPER")) {
      console.warn(`[API /api/hissab-summary/upload] Forbidden access attempt by role: ${adminRole}`);
      return res.status(403).json({
        success: false,
        sheet: sheetName,
        rowsWritten: 0,
        error: "Forbidden: Admin privileges required to update Hissab Summary"
      });
    }

    const matrix = combinedMatrix || (headers ? [headers, ...(newRowsToInsertAtTop || []), ...(existingDataRows || [])] : []);
    if (!matrix || matrix.length === 0) {
      return res.status(400).json({
        success: false,
        sheet: sheetName,
        rowsWritten: 0,
        error: "Invalid request payload: combinedMatrix or headers/rows required"
      });
    }

    const payload = {
      action: "uploadHissabSummary",
      spreadsheetId,
      sheetName,
      combinedMatrix: matrix,
      duplicateStrategy,
      rowsInserted: insertedNewCount,
      rowsUpdated: updatedRecordsCount,
      rowsSkipped: skippedRecordsCount
    };

    const result = await performBackendSheetWrite(payload);

    return res.json({
      success: true,
      sheet: sheetName,
      rowsInserted: insertedNewCount || result.rowsInserted || matrix.length - 1,
      rowsUpdated: updatedRecordsCount || result.rowsUpdated || 0,
      rowsSkipped: skippedRecordsCount || result.rowsSkipped || 0,
      rowsWritten: matrix.length - 1,
      message: "Uploaded successfully to Google Sheet"
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err) || "Failed to write to Google Sheet";
    console.error("[API Error /api/hissab-summary/upload]:", errorMsg);
    return res.status(500).json({
      success: false,
      sheet: DEFAULT_SHEET_NAME,
      rowsWritten: 0,
      error: errorMsg
    });
  }
});

// Single Cell Update Endpoint for Hissab Summary
app.post("/api/hissab-summary/update-cell", async (req, res) => {
  console.log("[API POST /api/hissab-summary/update-cell] Received cell update request.");
  try {
    const {
      spreadsheetId = SPREADSHEET_ID,
      sheetName = DEFAULT_SHEET_NAME,
      rowIndex,
      colIndex,
      newValue,
      adminRole
    } = req.body;

    const roleUpper = String(adminRole || "").toUpperCase();
    if (adminRole && !roleUpper.includes("ADMIN") && !roleUpper.includes("SUPER")) {
      console.warn(`[API /api/hissab-summary/update-cell] Forbidden access attempt by role: ${adminRole}`);
      return res.status(403).json({
        success: false,
        sheet: sheetName,
        rowsWritten: 0,
        error: "Forbidden: Admin privileges required to update Hissab Summary"
      });
    }

    if (rowIndex === undefined || colIndex === undefined) {
      return res.status(400).json({
        success: false,
        sheet: sheetName,
        rowsWritten: 0,
        error: "rowIndex and colIndex are required"
      });
    }

    const payload = {
      action: "updateCell",
      spreadsheetId,
      sheetName,
      rowIndex,
      colIndex,
      newValue: newValue !== undefined ? String(newValue) : ""
    };

    const result = await performBackendSheetWrite(payload);

    return res.json({
      success: true,
      sheet: sheetName,
      rowIndex,
      colIndex,
      newValue,
      rowsWritten: 1,
      message: "Cell updated successfully in Google Sheet"
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err) || "Failed to update cell in Google Sheet";
    console.error("[API Error /api/hissab-summary/update-cell]:", errorMsg);
    return res.status(500).json({
      success: false,
      sheet: DEFAULT_SHEET_NAME,
      rowsWritten: 0,
      error: errorMsg
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
