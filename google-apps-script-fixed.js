// Google Sheet Configuration
const SPREADSHEET_ID = '1-v4YUmLOvI4uiCT97F7f50Q2G2K-e1t13OFr52c0iV8';
const SHEETS = {
  SALES: 'DATA_VENTAS',
  PROMOTERS: 'PROMOTORES',
  STORES: 'TIENDAS',
  MODELS: 'MODELOS',
  COMPETITORS: 'COMPETIDORES'
};

// Column indices (0-based)
const PROMOTER_COL = 0;  // Column A
const STORE_COL = 1;     // Column B
const MODEL_COL = 0;     // Column A in MODELOS sheet
const COMPETITOR_COL = 1; // Column B in MODELOS sheet

// This function runs when the web app receives a POST request
function doPost(e) {
  return handleRequest(e);
}

// This function runs when the web app receives a GET request
function doGet(e) {
  // Check if this is a data request
  if (e.parameter && e.parameter.action === 'getData') {
    return getInitialData(e);
  }
  
  // For other GET requests, return a simple HTML page
  const html = HtmlService.createHtmlOutput('<h1>Competitor Sales Tracker</h1><p>API is running.</p>')
    .setTitle('Competitor Sales Tracker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

// Get initial data for the form
function getInitialData(e) {
  // Handle CORS
  const callback = e.parameter.callback;
  const isJsonp = !!callback;
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Get promoters and their stores
    const promotersSheet = ss.getSheetByName(SHEETS.PROMOTERS);
    const promotersData = promotersSheet ? promotersSheet.getDataRange().getValues() : [];
    const promoters = [];
    const promoterMap = new Map(); // To group stores by promoter
    
    // Skip header row
    for (let i = 1; i < promotersData.length; i++) {
      const row = promotersData[i];
      if (row && row[PROMOTER_COL]) {
        const promoterName = row[PROMOTER_COL].trim();
        const storeName = row[STORE_COL] ? row[STORE_COL].trim() : '';
        
        if (!promoterMap.has(promoterName)) {
          promoterMap.set(promoterName, []);
        }
        
        if (storeName) {
          promoterMap.get(promoterName).push(storeName);
        }
      }
    }
    
    // Convert map to array of promoter objects
    promoterMap.forEach((stores, name) => {
      promoters.push({
        name: name,
        stores: stores
      });
    });
    
    // Get stores
    const storesSheet = ss.getSheetByName(SHEETS.STORES);
    const storesData = storesSheet ? storesSheet.getDataRange().getValues() : [];
    const stores = [];
    
    // Skip header row
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i] && storesData[i][0]) {
        stores.push(storesData[i][0]);
      }
    }
    
    // Get models and competitors
    const modelsSheet = ss.getSheetByName(SHEETS.MODELS);
    const modelsData = modelsSheet ? modelsSheet.getDataRange().getValues() : [];
    const modelCompetitors = {};
    
    // Skip header row
    for (let i = 1; i < modelsData.length; i++) {
      if (modelsData[i]) {
        const model = modelsData[i][MODEL_COL];
        const competitor = modelsData[i][COMPETITOR_COL];
        
        if (model) {
          if (!modelCompetitors[model]) {
            modelCompetitors[model] = [];
          }
          if (competitor) {
            modelCompetitors[model].push(competitor);
          }
        }
      }
    }
    
    // Prepare response
    const response = {
      status: 'success',
      data: {
        promoters: promoters,
        stores: stores,
        modelCompetitors: modelCompetitors
      }
    };
    
    // Handle JSONP or regular JSON response
    if (isJsonp) {
      return ContentService
        .createTextOutput(`${callback}(${JSON.stringify(response)})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
      
  } catch (error) {
    console.error('Error in getInitialData:', error);
    const errorResponse = {
      status: 'error',
      message: error.toString()
    };
    
    if (isJsonp) {
      return ContentService
        .createTextOutput(`${callback}(${JSON.stringify(errorResponse)})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(errorResponse))
        .setMimeType(ContentService.MimeType.JSON)
        .setStatusCode(500);
    }
  }
}

// Handle both GET and POST requests
function handleRequest(e) {
  const params = e.parameter;
  const callback = params.callback;
  const isJsonp = !!callback;
  const action = params.action;
  
  try {
    // Log the incoming request for debugging
    console.log('Received request');
    console.log('Action:', action);
    console.log('Parameters:', JSON.stringify(params));
    
    // Handle different actions
    if (action === 'getData') {
      return getInitialData(e);
    } else if (action === 'submitData') {
      // Handle form submission
      const jsonData = params.data ? JSON.parse(params.data) : null;
      
      if (!jsonData) {
        throw new Error('No data received in the request');
      }
      
      // Validate required fields
      if (!jsonData.promoterName || !jsonData.storeName || !jsonData.saleDate || !jsonData.ourModel || !jsonData.competitors) {
        throw new Error('Missing required fields in the request');
      }
      
      // Get the spreadsheet
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      if (!ss) {
        throw new Error('Could not open spreadsheet with ID: ' + SPREADSHEET_ID);
      }
      
      // Get or create the sheet
      let sheet = ss.getSheetByName(SHEETS.SALES);
      if (!sheet) {
        console.log('Creating new sheet:', SHEETS.SALES);
        sheet = ss.insertSheet(SHEETS.SALES);
        // Set headers
        sheet.appendRow([
          'Timestamp', 
          'Promoter Name', 
          'Store Name', 
          'Date',
          'Our Model',
          'Competitor Name',
          'Sales',
          'Stock'
        ]);
      }
      
      // Add the data to the sheet
      const timestamp = new Date();
      
      // Add a row for each competitor
      jsonData.competitors.forEach(competitor => {
        sheet.appendRow([
          timestamp,
          jsonData.promoterName,
          jsonData.storeName,
          jsonData.saleDate,
          jsonData.ourModel,
          competitor.name,
          competitor.sales || '',
          competitor.stock || ''
        ]);
      });
      
      // Prepare success response
      const response = {
        status: 'success',
        message: 'Data saved successfully'
      };
      
      if (isJsonp) {
        return ContentService
          .createTextOutput(`${callback}(${JSON.stringify(response)})`)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService
          .createTextOutput(JSON.stringify(response))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error:', error);
    const errorResponse = {
      status: 'error',
      message: error.toString(),
      stack: error.stack
    };
    
    // For JSONP, wrap the response in the callback
    if (isJsonp) {
      return ContentService.createTextOutput(
        `${callback}(${JSON.stringify(errorResponse)})`
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON)
      .setStatusCode(400);
  }
}

// Test function to verify script setup
function testSetup() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      return { success: false, message: 'Could not access spreadsheet' };
    }
    
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Promoter Name', 'Store Name', 'Date', 'Our Model', 'Competitor Model', 'Sales', 'Stock']);
      return { success: true, message: 'Created new sheet: ' + SHEET_NAME, sheetUrl: ss.getUrl() };
    }
    
    return { 
      success: true, 
      message: 'Sheet already exists', 
      sheetName: sheet.getName(),
      sheetUrl: ss.getUrl(),
      lastRow: sheet.getLastRow(),
      lastColumn: sheet.getLastColumn()
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'Error: ' + error.toString(),
      stack: error.stack
    };
  }
}
