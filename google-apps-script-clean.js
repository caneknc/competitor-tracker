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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '3600',
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method'
  };
}

// Handle OPTIONS request for CORS preflight
function doOptions() {
  const response = ContentService.createTextOutput('');
  const headers = setCorsHeaders();
  
  // Set all CORS headers
  Object.keys(headers).forEach(function(key) {
    response.setHeader(key, headers[key]);
  });
  
  // Set status code for preflight response
  response.setMimeType(ContentService.MimeType.JSON);
  response.setStatusCode(204); // No Content
  
  return response;
}

// This function runs when the web app receives a POST request
function doPost(e) {
  try {
    // Handle CORS preflight
    if (!e) {
      e = { parameter: {} };
    }
    
    if (!e.parameter) {
      e.parameter = {};
    }
    
    // Check for preflight request
    if (e.httpMethod === 'OPTIONS' || (e.parameter && e.parameter.action === 'options')) {
      return doOptions();
    }
    
    // Parse JSON data from the request body if it exists
    if (e.postData && e.postData.type === 'application/json') {
      try {
        const jsonData = JSON.parse(e.postData.contents);
        // If the parsed data has parameters, merge them with the existing parameters
        if (jsonData) {
          // If the data is wrapped in a 'data' property, use that
          if (jsonData.data) {
            e.parameter = { ...e.parameter, ...jsonData.data };
          } else {
            e.parameter = { ...e.parameter, ...jsonData };
          }
        }
      } catch (error) {
        console.error('Error parsing JSON data:', error);
        // Continue with the original parameters if parsing fails
      }
    }
    
    return handleRequest(e);
  } catch (error) {
    return handleError(error);
  }
}

// This function runs when the web app receives a GET request
function doGet(e) {
  try {
    if (!e) {
      e = { parameter: {} };
    }
    
    if (!e.parameter) {
      e.parameter = {};
    }
    
    // Handle CORS preflight
    if (e.parameter.action === 'options' || (e.queryString && e.queryString.includes('action=options'))) {
      return doOptions();
    }
    
    // Check if this is a data request
    if (e.parameter.action === 'getData') {
      return getInitialData(e);
    }
    
    // For other GET requests, return a simple HTML page with CORS headers
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

// Handle errors and return proper response with CORS headers
function handleError(error) {
  console.error('Error:', error);
  
  const errorData = {
    status: 'error',
    message: error.message || 'An unknown error occurred',
    // Only include stack trace in development
    ...(error.stack && { stack: error.stack })
  };
  
  // Create response with CORS headers
  const response = ContentService.createTextOutput(JSON.stringify(errorData));
  response.setMimeType(ContentService.MimeType.JSON);
  
  // Set CORS headers
  const headers = setCorsHeaders();
  Object.keys(headers).forEach(function(key) {
    response.setHeader(key, headers[key]);
  });
  
  // Set appropriate status code
  const statusCode = error.statusCode || 500;
  response.setStatusCode(statusCode);
  
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
    // Don't override the Content-Type header if it's already set
    if (key === 'Content-Type' && response.getHeaders()['Content-Type']) {
      return;
    }
    response.setHeader(key, headers[key]);
  });
  
  // Set status code
  response.setStatusCode(statusCode);
  
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
  const params = e.parameter || {};
  const callback = params.callback;
  const isJsonp = !!callback;
  
  try {
    console.log('Fetching initial data...');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      const error = new Error('Could not open spreadsheet with ID: ' + SPREADSHEET_ID);
      error.statusCode = 500;
      throw error;
    }
    
    // Get promoters and their stores
    console.log('Fetching promoters...');
    const promotersSheet = ss.getSheetByName(SHEETS.PROMOTERS);
    const promotersData = promotersSheet ? promotersSheet.getDataRange().getValues() : [];
    const promoters = [];
    const promoterMap = {}; // To group stores by promoter
    
    // Skip header row
    for (let i = 1; i < promotersData.length; i++) {
      const row = promotersData[i];
      if (row && row[PROMOTER_COL]) {
        const promoterName = row[PROMOTER_COL].toString().trim();
        const storeName = row[STORE_COL] ? row[STORE_COL].toString().trim() : '';
        
        if (!promoterMap[promoterName]) {
          promoterMap[promoterName] = [];
        }
        
        if (storeName) {
          promoterMap[promoterName].push(storeName);
        }
      }
    }
    
    // Convert map to array of promoter objects
    for (const name in promoterMap) {
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
    for (let j = 1; j < storesData.length; j++) {
      if (storesData[j] && storesData[j][0]) {
        const storeName = storesData[j][0].toString().trim();
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
    
    // Process models and their competitors
    // Skip header row
    for (let k = 1; k < modelsData.length; k++) {
      const row = modelsData[k];
      if (row && row[MODEL_COL]) {
        const model = row[MODEL_COL].toString().trim();
        const competitor = row[COMPETITOR_COL] ? row[COMPETITOR_COL].toString().trim() : '';
        
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
    
    // Create a proper error object with status code
    const errorObj = new Error(error.message || 'Failed to load initial data');
    errorObj.statusCode = error.statusCode || 500;
    errorObj.details = error.details || error.toString();
    
    // Use handleError to ensure proper CORS headers
    return handleError(errorObj);
  }
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
          // If data is nested in a 'data' property, use that
          if (jsonData.data) {
            jsonData = jsonData.data;
          }
        } 
        // Fall back to URL parameters (for backward compatibility)
        else if (params.data) {
          jsonData = typeof params.data === 'string' ? JSON.parse(params.data) : params.data;
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
    console.error('Unexpected error:', error);
    const errorResponse = {
      status: 'error',
      message: 'An unexpected error occurred',
      details: error.message
    };
    
    return isJsonp 
      ? createJsonpResponse(errorResponse, callback)
      : createResponse(errorResponse, 500);
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
