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

// Set CORS headers
function setCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '3600'
  };
}

// Handle OPTIONS request for CORS preflight
function doOptions() {
  const response = HtmlService.createHtmlOutput('');
  const headers = setCorsHeaders();
  
  Object.keys(headers).forEach(key => {
    response.setHeader(key, headers[key]);
  });
  
  return response;
}

// This function runs when the web app receives a POST request
function doPost(e) {
  try {
    // Handle CORS preflight
    if (e && e.parameter && e.parameter.action === 'options') {
      return doOptions();
    }
    return handleRequest(e);
  } catch (error) {
    return handleError(error);
  }
}

// This function runs when the web app receives a GET request
function doGet(e) {
  try {
    // Handle CORS preflight
    if (e && e.parameter && e.parameter.action === 'options') {
      return doOptions();
    }
    
    // Check if this is a data request
    if (e.parameter && e.parameter.action === 'getData') {
      return getInitialData(e);
    }
    
    // For other GET requests, return a simple HTML page
    const html = HtmlService.createHtmlOutput('<h1>Competitor Sales Tracker</h1><p>API is running.</p>')
      .setTitle('Competitor Sales Tracker')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    // Add CORS headers
    const headers = setCorsHeaders();
    Object.keys(headers).forEach(key => {
      html.setHeader(key, headers[key]);
    });
    
    return html;
  } catch (error) {
    return handleError(error);
  }
}

// Handle errors and return proper response
function handleError(error) {
  console.error('Error:', error);
  const response = ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: error.message || 'An unknown error occurred',
    stack: error.stack
  }));
  
  response.setMimeType(ContentService.MimeType.JSON);
  const headers = setCorsHeaders();
  Object.keys(headers).forEach(key => {
    response.setHeader(key, headers[key]);
  });
  
  return response;
}

// Get initial data for the form
function getInitialData(e) {
  const callback = e.parameter.callback;
  const isJsonp = !!callback;
  
  try {
    console.log('Fetching initial data...');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      throw new Error('Could not open spreadsheet with ID: ' + SPREADSHEET_ID);
    }
    
    // Get promoters and their stores
    console.log('Fetching promoters...');
    const promotersSheet = ss.getSheetByName(SHEETS.PROMOTERS);
    const promotersData = promotersSheet ? promotersSheet.getDataRange().getValues() : [];
    const promoters = [];
    const promoterMap = new Map(); // To group stores by promoter
    
    // Skip header row
    for (let i = 1; i < promotersData.length; i++) {
      const row = promotersData[i];
      if (row && row[PROMOTER_COL]) {
        const promoterName = row[PROMOTER_COL].toString().trim();
        const storeName = row[STORE_COL] ? row[STORE_COL].toString().trim() : '';
        
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
    console.log('Fetching stores...');
    const storesSheet = ss.getSheetByName(SHEETS.STORES);
    const storesData = storesSheet ? storesSheet.getDataRange().getValues() : [];
    const stores = [];
    
    // Skip header row and add unique stores
    const storeSet = new Set();
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i] && storesData[i][0]) {
        const storeName = storesData[i][0].toString().trim();
        if (storeName && !storeSet.has(storeName)) {
          storeSet.add(storeName);
          stores.push(storeName);
        }
      }
    }
    
    // Get models and competitors
    console.log('Fetching models and competitors...');
    const modelsSheet = ss.getSheetByName(SHEETS.MODELS);
    const modelsData = modelsSheet ? modelsSheet.getDataRange().getValues() : [];
    const modelCompetitors = {};
    
    // Skip header row
    for (let i = 1; i < modelsData.length; i++) {
      if (modelsData[i]) {
        const model = modelsData[i][MODEL_COL] ? modelsData[i][MODEL_COL].toString().trim() : '';
        const competitor = modelsData[i][COMPETITOR_COL] ? modelsData[i][COMPETITOR_COL].toString().trim() : '';
        
        if (model) {
          if (!modelCompetitors[model]) {
            modelCompetitors[model] = [];
          }
          if (competitor && competitor !== model) { // Don't add self as competitor
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
    
    console.log('Successfully fetched initial data');
    
    // Return response using our helper functions
    return isJsonp 
      ? createJsonpResponse(response, callback)
      : createResponse(response);
      
  } catch (error) {
    console.error('Error in getInitialData:', error);
    const errorResponse = {
      status: 'error',
      message: 'Failed to load initial data',
      details: error.message || error.toString()
    };
    
    return isJsonp 
      ? createJsonpResponse(errorResponse, callback)
      : createResponse(errorResponse, 500);
  }
}

// Create a proper response with CORS headers
function createResponse(data, statusCode = 200) {
  const response = ContentService.createTextOutput(JSON.stringify(data));
  response.setMimeType(ContentService.MimeType.JSON);
  
  // Set CORS headers
  const headers = setCorsHeaders();
  Object.keys(headers).forEach(key => {
    response.setHeader(key, headers[key]);
  });
  
  if (statusCode !== 200) {
    response.setStatusCode(statusCode);
  }
  
  return response;
}

// Create a JSONP response
function createJsonpResponse(data, callback) {
  const response = ContentService.createTextOutput(`${callback}(${JSON.stringify(data)})`);
  response.setMimeType(ContentService.MimeType.JAVASCRIPT);
  
  // Set CORS headers
  const headers = setCorsHeaders();
  Object.keys(headers).forEach(key => {
    response.setHeader(key, headers[key]);
  });
  
  return response;
}

// Handle both GET and POST requests
function handleRequest(e) {
  const params = e.parameter;
  const callback = params.callback;
  const isJsonp = !!callback;
  const action = params.action;
  
  try {
    // Log the request for debugging
    console.log('Handling request:', {
      parameters: params,
      method: e.requestMethod,
      contentType: e.contentType,
      postData: e.postData ? e.postData.getDataAsString() : null
    });
    // Log the incoming request for debugging
    console.log('Action:', action);
    console.log('Parameters:', JSON.stringify(params));
    
    // Handle different actions
    if (action === 'getData') {
      return getInitialData(e);
    } else if (action === 'submitData') {
      // Handle form submission
      let jsonData;
      
      try {
        // Try to get data from POST body first
        if (e.postData && e.postData.contents) {
          jsonData = JSON.parse(e.postData.contents);
        } 
        // Fall back to URL parameters
        else if (params.data) {
          jsonData = JSON.parse(params.data);
        } else {
          throw new Error('No data received in the request');
        }
      } catch (error) {
        console.error('Error parsing request data:', error);
        const errorResponse = {
          status: 'error',
          message: 'Invalid request data format',
          details: error.message
        };
        return isJsonp 
          ? createJsonpResponse(errorResponse, callback)
          : createResponse(errorResponse, 400);
      }
      
      // Validate required fields
      const missingFields = [];
      if (!jsonData.promoterName) missingFields.push('promoterName');
      if (!jsonData.storeName) missingFields.push('storeName');
      if (!jsonData.saleDate) missingFields.push('saleDate');
      if (!jsonData.ourModel) missingFields.push('ourModel');
      if (!jsonData.competitors || !Array.isArray(jsonData.competitors)) missingFields.push('competitors');
      
      if (missingFields.length > 0) {
        const errorResponse = {
          status: 'error',
          message: 'Missing required fields',
          missingFields: missingFields
        };
        return isJsonp 
          ? createJsonpResponse(errorResponse, callback)
          : createResponse(errorResponse, 400);
      }
      
      try {
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
        const rows = [];
        
        // Prepare all rows to be added in a batch
        jsonData.competitors.forEach(competitor => {
          rows.push([
            timestamp,
            jsonData.promoterName,
            jsonData.storeName,
            jsonData.saleDate,
            jsonData.ourModel,
            competitor.name || '',
            competitor.sales || '',
            competitor.stock || ''
          ]);
        });
        
        // Add all rows in a single operation for better performance
        if (rows.length > 0) {
          sheet.getRange(
            sheet.getLastRow() + 1, 
            1, 
            rows.length, 
            rows[0].length
          ).setValues(rows);
        }
        
        // Prepare success response
        const response = {
          status: 'success',
          message: 'Data saved successfully',
          recordsAdded: rows.length
        };
        
        return isJsonp 
          ? createJsonpResponse(response, callback)
          : createResponse(response);
          
      } catch (error) {
        console.error('Error saving data:', error);
        const errorResponse = {
          status: 'error',
          message: 'Failed to save data',
          details: error.message
        };
        return isJsonp 
          ? createJsonpResponse(errorResponse, callback)
          : createResponse(errorResponse, 500);
      }
    } else {
      // Handle unknown action
      const errorResponse = {
        status: 'error',
        message: 'Invalid action',
        details: `The action '${action}' is not supported`
      };
      
      return isJsonp 
        ? createJsonpResponse(errorResponse, callback)
        : createResponse(errorResponse, 400);
    }
  } catch (error) {
    console.error('Error in handleRequest:', error);
    const errorResponse = {
      status: 'error',
      message: 'An unexpected error occurred',
      details: error.message || error.toString()
    };
    
    return isJsonp 
      ? createJsonpResponse(errorResponse, callback)
      : createResponse(errorResponse, 500);
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
