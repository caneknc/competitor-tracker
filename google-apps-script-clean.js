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
  
  Object.keys(headers).forEach(function(key) {
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
    Object.keys(headers).forEach(function(key) {
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
  Object.keys(headers).forEach(function(key) {
    response.setHeader(key, headers[key]);
  });
  
  return response;
}

// Create a proper response with CORS headers
function createResponse(data, statusCode) {
  statusCode = statusCode || 200;
  const response = ContentService.createTextOutput(JSON.stringify(data));
  response.setMimeType(ContentService.MimeType.JSON);
  
  // Set CORS headers
  const headers = setCorsHeaders();
  Object.keys(headers).forEach(function(key) {
    response.setHeader(key, headers[key]);
  });
  
  if (statusCode !== 200) {
    response.setStatusCode(statusCode);
  }
  
  return response;
}

// Create a JSONP response
function createJsonpResponse(data, callback) {
  const response = ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')');
  response.setMimeType(ContentService.MimeType.JAVASCRIPT);
  
  // Set CORS headers
  const headers = setCorsHeaders();
  Object.keys(headers).forEach(function(key) {
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
    const promoterMap = {}; // To group stores by promoter
    
    // Skip header row
    for (var i = 1; i < promotersData.length; i++) {
      var row = promotersData[i];
      if (row && row[PROMOTER_COL]) {
        var promoterName = row[PROMOTER_COL].toString().trim();
        var storeName = row[STORE_COL] ? row[STORE_COL].toString().trim() : '';
        
        if (!promoterMap[promoterName]) {
          promoterMap[promoterName] = [];
        }
        
        if (storeName) {
          promoterMap[promoterName].push(storeName);
        }
      }
    }
    
    // Convert map to array of promoter objects
    for (var name in promoterMap) {
      if (promoterMap.hasOwnProperty(name)) {
        promoters.push({
          name: name,
          stores: promoterMap[name]
        });
      }
    }
    
    // Get stores
    console.log('Fetching stores...');
    const storesSheet = ss.getSheetByName(SHEETS.STORES);
    const storesData = storesSheet ? storesSheet.getDataRange().getValues() : [];
    const stores = [];
    
    // Skip header row and add unique stores
    const storeSet = {};
    for (var j = 1; j < storesData.length; j++) {
      if (storesData[j] && storesData[j][0]) {
        var storeName = storesData[j][0].toString().trim();
        if (storeName && !storeSet[storeName]) {
          storeSet[storeName] = true;
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
    for (var k = 1; k < modelsData.length; k++) {
      if (modelsData[k]) {
        var model = modelsData[k][MODEL_COL] ? modelsData[k][MODEL_COL].toString().trim() : '';
        var competitor = modelsData[k][COMPETITOR_COL] ? modelsData[k][COMPETITOR_COL].toString().trim() : '';
        
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

// Handle both GET and POST requests
// Handle both GET and POST requests
function handleRequest(e) {
  var params = e.parameter;
  var callback = params.callback;
  var isJsonp = !!callback;
  var action = params.action;

  try {
    // Log the request for debugging
    console.log('Handling request:', {
      parameters: params,
      method: e.requestMethod,
      contentType: e.contentType,
      postData: e.postData ? e.postData.getDataAsString() : null
    });

    // Handle different actions
    if (action === 'getData') {
      return getInitialData(e);
    } else if (action === 'submitData') {
      // ... (rest of your submitData handling code) ...

      // Prepare success response
      var successResponse = {
        status: 'success',
        message: 'Data saved successfully',
        recordsAdded: rows.length
      };

      if (isJsonp) {
        return createJsonpResponse(successResponse, callback);
      } else {
        return createResponse(successResponse);
      }

      // ... (rest of your submitData error handling) ...

    } else {
      // ... (rest of your unknown action handling) ...
    }
  } catch (error) {
    // ... (rest of your general error handling) ...
  }
}

// Create a JSONP response
function createJsonpResponse(data, callback) {
  const response = ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')');
  response.setMimeType(ContentService.MimeType.JAVASCRIPT); // Ensure correct MIME type
  
  // Set CORS headers
  const headers = setCorsHeaders();
  Object.keys(headers).forEach(function(key) {
    response.setHeader(key, headers[key]);
  });
  
  return response;
}

// Test function to verify script setup
function testSetup() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      throw new Error('Could not open spreadsheet with ID: ' + SPREADSHEET_ID);
    }
    
    // Check if all required sheets exist
    var sheets = ss.getSheets();
    var sheetNames = sheets.map(function(sheet) {
      return sheet.getName();
    });
    
    var missingSheets = [];
    for (var sheetName in SHEETS) {
      if (sheetNames.indexOf(SHEETS[sheetName]) === -1) {
        missingSheets.push(SHEETS[sheetName]);
      }
    }
    
    if (missingSheets.length > 0) {
      console.warn('Warning: The following sheets are missing: ' + missingSheets.join(', '));
      console.warn('Please create these sheets with the correct column headers.');
    } else {
      console.log('All required sheets exist.');
    }
    
    // Test data retrieval
    console.log('Testing data retrieval...');
    var testE = {
      parameter: {
        action: 'getData'
      }
    };
    
    var result = getInitialData(testE);
    console.log('Data retrieval test completed successfully');
    return 'Test completed successfully. Check logs for details.';
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}
