// Model to competitor mapping
const modelCompetitors = {
    'Model A': ['Competitor 1A', 'Competitor 2A', 'Competitor 3A'],
    'Model B': ['Competitor 1B', 'Competitor 2B', 'Competitor 3B'],
    'Model C': ['Competitor 1C', 'Competitor 2C', 'Competitor 3C']
};

// App configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDkFnwJaAR0SDdfrcPzSoC5hUjAwdP2GXstrjddUj0sgWE2_nfwTsw5meKPyJsc3a3/exec';

// App data
let appData = {
    promoters: [],
    stores: [],
    modelCompetitors: {}
};

// Set today's date as default and initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default (YYYY-MM-DD format)
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('saleDate').value = formattedDate;
    
    // Load initial data
    loadInitialData();
    
    // Add event listeners
    document.getElementById('ourModel').addEventListener('change', updateCompetitorFields);
});

// Load initial data from Google Sheets
function loadInitialData() {
    console.log('1. Starting to load initial data...');
    console.log('2. Script URL:', SCRIPT_URL);
    
    // Create a unique callback function name
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const url = `${SCRIPT_URL}?action=getData&callback=${callbackName}`;
    console.log('3. Generated URL with callback:', url);
    
    // Create script element
    const script = document.createElement('script');
    script.src = url;
    console.log('4. Script element created');
    
    // Set up the callback function
    window[callbackName] = function(result) {
        console.log('5. Received server response');
        console.log('6. Raw response:', result);
        
        try {
            if (result && result.status === 'success') {
                appData = result.data || { promoters: [], stores: [], modelCompetitors: {} };
                console.log('7. Data loaded successfully');
                console.log('8. Promoters:', appData.promoters);
                console.log('9. Stores:', appData.stores);
                console.log('10. Models:', Object.keys(appData.modelCompetitors || {}));
                initializeDropdowns();
            } else {
                const errorMsg = result && result.message || 'Error en la respuesta del servidor';
                console.error('7. Error in response:', errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Error processing data:', error);
            alert('Error al cargar los datos: ' + error.message);
        }
        
        // Clean up
        delete window[callbackName];
    };
    
    // Handle script loading errors
    script.onerror = function() {
        console.error('Error loading script');
        alert('Error al cargar los datos. Por favor, inténtalo de nuevo.');
        delete window[callbackName];
    };
    
    // Add script to the page to make the request
    document.body.appendChild(script);
}

// Initialize dropdowns with data
function initializeDropdowns() {
    console.log('Initializing dropdowns with data:', appData);
    
    // Populate promoter dropdown
    const promoterSelect = document.getElementById('promoterName');
    promoterSelect.innerHTML = '<option value="" selected disabled>Seleccione un promotor</option>';
    
    appData.promoters.forEach(promoter => {
        const option = document.createElement('option');
        option.value = promoter.name;
        option.textContent = promoter.name;
        promoterSelect.appendChild(option);
    });
    
    // Populate store dropdown
    const storeSelect = document.getElementById('storeName');
    storeSelect.innerHTML = '<option value="" selected disabled>Seleccione una tienda</option>';
    
    appData.stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store;
        option.textContent = store;
        storeSelect.appendChild(option);
    });
    
    // Populate model dropdown
    const modelSelect = document.getElementById('ourModel');
    modelSelect.innerHTML = '<option value="" selected>Seleccione un modelo</option>';
    
    Object.keys(appData.modelCompetitors || {}).forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
    
    // Set up form submission
    // Form submission is now handled inline in the event listener below
}

// Update competitor fields based on selected model
function updateCompetitorFields() {
    const selectedModel = this.value;
    const competitorModelsDiv = document.getElementById('competitorModels');
    competitorModelsDiv.innerHTML = ''; // Clear previous fields
    
    if (!selectedModel) return;
    
    const competitors = appData.modelCompetitors[selectedModel] || [];
    
    if (competitors.length === 0) {
        competitorModelsDiv.innerHTML = '<p>No se encontraron modelos competidores para el modelo seleccionado.</p>';
        return;
    }
    
    competitors.forEach((competitor, index) => {
        const competitorDiv = document.createElement('div');
        competitorDiv.className = 'competitor-row';
        competitorDiv.innerHTML = `
            <h5>${competitor}</h5>
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label for="sales-${index}" class="form-label">Ventas del día</label>
                    <input type="number" class="form-control" id="sales-${index}" min="0">
                </div>
                <div class="col-md-6 mb-2">
                    <label for="stock-${index}" class="form-label">Stock actual</label>
                    <input type="number" class="form-control" id="stock-${index}" min="0">
                </div>
            </div>
        `;
        competitorModelsDiv.appendChild(competitorDiv);
    });
}

// Handle form submission
document.getElementById('salesForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const form = e.target;
    
    // Check form validity
    if (!form.checkValidity()) {
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
    }
    
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
    
    // Prepare form data
    const formData = {
        promoterName: document.getElementById('promoterName').value,
        storeName: document.getElementById('storeName').value,
        saleDate: document.getElementById('saleDate').value,
        ourModel: document.getElementById('ourModel').value,
        competitors: []
    };
    
    // Get competitor data
    const competitorRows = document.querySelectorAll('.competitor-row');
    competitorRows.forEach((row, index) => {
        const competitorName = row.querySelector('h5').textContent;
        const sales = document.getElementById(`sales-${index}`)?.value || '';
        const stock = document.getElementById(`stock-${index}`)?.value || '';
        
        formData.competitors.push({
            name: competitorName,
            sales: sales,
            stock: stock
        });
    });
    
    console.log('Submitting form data:', formData);
    
    // Create a unique callback function name
    const callbackName = 'form_callback_' + Math.round(100000 * Math.random());
    
    // Set up the callback
    window[callbackName] = function(result) {
        console.log('Form submission response:', result);
        
        // Clean up
        delete window[callbackName];
        
        // Restore button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
        
        if (result && result.status === 'success') {
            // Show success message
            const successMessage = document.getElementById('successMessage');
            successMessage.style.display = 'block';
            
            // Reset form
            form.reset();
            form.classList.remove('was-validated');
            document.getElementById('competitorModels').innerHTML = '';
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 5000);
        } else {
            const errorMsg = result && result.message || 'Error al enviar los datos';
            console.error('Error in form submission:', errorMsg);
            alert('Error: ' + errorMsg);
        }
    };
    
    // Create script element for JSONP
    const script = document.createElement('script');
    const url = `${SCRIPT_URL}?action=submitData&data=${encodeURIComponent(JSON.stringify(formData))}&callback=${callbackName}`;
    console.log('Sending request to:', url);
    script.src = url;
    
    // Set up error handling
    script.onerror = function() {
        console.error('Script load error');
        alert('Error al conectar con el servidor. Por favor, inténtalo de nuevo.');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
        delete window[callbackName];
    };
    
    // Set a timeout to clean up if the request takes too long
    const timeout = setTimeout(() => {
        if (window[callbackName]) {
            console.error('Request timed out');
            alert('La solicitud está tardando demasiado. Por favor, verifica tu conexión e inténtalo de nuevo.');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            delete window[callbackName];
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        }
    }, 30000); // 30 second timeout
    
    // Override the callback to clear the timeout
    const originalCallback = window[callbackName];
    window[callbackName] = function() {
        clearTimeout(timeout);
        originalCallback.apply(this, arguments);
    };
    
    // Add script to the page to make the request
    document.body.appendChild(script);
});
