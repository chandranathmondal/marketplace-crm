/** Bump when redeploying so the extension can verify the live deployment. */
var MARKETPLACE_CRM_API_VERSION = 3;

var SPREADSHEET_ID_PROPERTY = "MARKETPLACE_CRM_SPREADSHEET_ID";
var SHEET_HEADERS = {
  Contacts: ["phone", "name", "notes", "followup_date", "tags", "timestamp"],
  Listings: ["id", "platform", "listing_id", "url", "title", "price", "phone", "timestamp"],
  Interactions: ["id", "phone", "listing_id", "notes", "timestamp"]
};
var REQUIRED_SHEETS = Object.keys(SHEET_HEADERS);

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing POST body");
    }

    var data = JSON.parse(e.postData.contents);
    var spreadsheetId = resolveSpreadsheetId_(data);

    if (data.action === "ping") {
      var spreadsheet = openSpreadsheetById_(spreadsheetId);
      var prepared = prepareWorkbook_(spreadsheet);

      return jsonResponse_({
        success: true,
        apiVersion: MARKETPLACE_CRM_API_VERSION,
        message: "Marketplace CRM API Running",
        spreadsheet: prepared.spreadsheetName,
        spreadsheetId: spreadsheet.getId()
      });
    }

    var workbook = prepareWorkbook_(openSpreadsheetById_(spreadsheetId));
    var contactsSheet = workbook.Contacts;
    var listingsSheet = workbook.Listings;
    var interactionsSheet = workbook.Interactions;
    var timestamp = new Date();
    var lock = LockService.getScriptLock();

    lock.waitLock(10000);

    try {
      contactsSheet.appendRow([
        data.phone || "",
        data.name || "",
        data.notes || "",
        data.followup_date || "",
        data.tags || "",
        timestamp
      ]);

      listingsSheet.appendRow([
        Utilities.getUuid(),
        data.platform || "",
        data.listing_id || "",
        data.url || "",
        data.title || "",
        data.price || "",
        data.phone || "",
        timestamp
      ]);

      interactionsSheet.appendRow([
        Utilities.getUuid(),
        data.phone || "",
        data.listing_id || "",
        data.notes || "",
        timestamp
      ]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({
      success: true,
      apiVersion: MARKETPLACE_CRM_API_VERSION
    });
  } catch (err) {
    return jsonResponse_({
      success: false,
      apiVersion: MARKETPLACE_CRM_API_VERSION,
      error: String(err)
    });
  }
}

function doGet(e) {
  try {
    var spreadsheetId = "";

    if (e && e.parameter && e.parameter.spreadsheet_id) {
      spreadsheetId = extractSpreadsheetId_(e.parameter.spreadsheet_id);
    }

    if (!spreadsheetId) {
      throw new Error(
        "Missing spreadsheet_id query parameter. Use extension Settings → Test Connection instead."
      );
    }

    var spreadsheet = openSpreadsheetById_(spreadsheetId);
    var prepared = prepareWorkbook_(spreadsheet);

    return jsonResponse_({
      success: true,
      apiVersion: MARKETPLACE_CRM_API_VERSION,
      message: "Marketplace CRM API Running",
      spreadsheet: prepared.spreadsheetName,
      spreadsheetId: spreadsheet.getId()
    });
  } catch (err) {
    return jsonResponse_({
      success: false,
      apiVersion: MARKETPLACE_CRM_API_VERSION,
      error: String(err)
    });
  }
}

/** Run from the Apps Script editor to verify spreadsheet access. */
function runMarketplaceCrmSelfTest() {
  var spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(SPREADSHEET_ID_PROPERTY);

  if (!spreadsheetId) {
    throw new Error("Set script property " + SPREADSHEET_ID_PROPERTY + " first.");
  }

  var spreadsheet = openSpreadsheetById_(spreadsheetId);
  var prepared = prepareWorkbook_(spreadsheet);

  Logger.log("OK: " + prepared.spreadsheetName);
}

function resolveSpreadsheetId_(data) {
  var spreadsheetId = extractSpreadsheetId_(data && data.spreadsheet_id);

  if (!spreadsheetId) {
    spreadsheetId = extractSpreadsheetId_(
      PropertiesService
        .getScriptProperties()
        .getProperty(SPREADSHEET_ID_PROPERTY)
    );
  }

  if (!spreadsheetId) {
    throw new Error(
      "Missing Google Sheet ID. In extension Settings, paste the Sheet ID from the URL " +
      "(between /d/ and /edit). Do not paste the Apps Script /exec URL."
    );
  }

  return spreadsheetId;
}

function extractSpreadsheetId_(value) {
  if (!value) {
    return "";
  }

  var trimmed = String(value).trim();
  var urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (urlMatch) {
    return urlMatch[1];
  }

  var idMatch = trimmed.match(/([a-zA-Z0-9-_]{20,})/);

  return idMatch ? idMatch[1] : "";
}

function openSpreadsheetById_(spreadsheetId) {
  var normalizedId = extractSpreadsheetId_(spreadsheetId);

  if (!normalizedId) {
    throw new Error("Invalid Google Sheet ID: \"" + spreadsheetId + "\"");
  }

  try {
    var spreadsheet = SpreadsheetApp.openById(normalizedId);

    if (!spreadsheet) {
      throw new Error("SpreadsheetApp.openById returned null");
    }

    return spreadsheet;
  } catch (err) {
    throw new Error(
      "Could not open spreadsheet \"" + normalizedId + "\". " +
      "Use the Sheet ID between /d/ and /edit, and ensure the deployer account can edit the sheet. " +
      "Details: " + err
    );
  }
}

function getRequiredSheet_(spreadsheet, name) {
  if (!spreadsheet) {
    throw new Error("Could not access spreadsheet while opening tab \"" + name + "\"");
  }

  var sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  if (!sheet) {
    throw new Error("Could not create sheet \"" + name + "\"");
  }

  return sheet;
}

function prepareWorkbook_(spreadsheet) {
  if (!spreadsheet) {
    throw new Error("Internal error: spreadsheet is null in prepareWorkbook_");
  }

  var preparedSheets = {
    spreadsheetName: spreadsheet.getName()
  };

  for (var i = 0; i < REQUIRED_SHEETS.length; i++) {
    var sheetName = REQUIRED_SHEETS[i];
    var sheet = getRequiredSheet_(spreadsheet, sheetName);
    ensureHeaderRow_(sheet, SHEET_HEADERS[sheetName]);
    preparedSheets[sheetName] = sheet;
  }

  return preparedSheets;
}

function ensureHeaderRow_(sheet, headers) {
  if (!sheet) {
    throw new Error("Internal error: sheet is null in ensureHeaderRow_");
  }

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  var existingHeaders = headerRange.getValues()[0];
  var hasAnyHeader = false;

  for (var i = 0; i < existingHeaders.length; i++) {
    if (String(existingHeaders[i]).trim() !== "") {
      hasAnyHeader = true;
      break;
    }
  }

  if (!hasAnyHeader) {
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  for (var headerIndex = 0; headerIndex < headers.length; headerIndex++) {
    if (String(existingHeaders[headerIndex]).trim() !== headers[headerIndex]) {
      throw new Error(
        "Sheet " + sheet.getName() + " has unexpected headers. Expected: " + headers.join(", ")
      );
    }
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function setMarketplaceCrmSpreadsheetId(spreadsheetId) {
  PropertiesService
    .getScriptProperties()
    .setProperty(SPREADSHEET_ID_PROPERTY, extractSpreadsheetId_(spreadsheetId));

  return ContentService
    .createTextOutput("Saved spreadsheet ID")
    .setMimeType(ContentService.MimeType.TEXT);
}
