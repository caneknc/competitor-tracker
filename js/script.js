// Model to competitor mapping
const modelCompetitors = {
    'Model A': ['Competitor 1A', 'Competitor 2A', 'Competitor 3A'],
    'Model B': ['Competitor 1B', 'Competitor 2B', 'Competitor 3B'],
    'Model C': ['Competitor 1C', 'Competitor 2C', 'Competitor 3C']
};

// Google Apps Script Web App URL - Replace with your own URL after deploying
const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';

// Set today's date as default
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('saleDate').value = today;
    
    // Add event listener for model selection
    document.getElementById('ourModel').addEventListener('change', updateCompetitorFields);
    
    // Form submission
    document.getElementById('salesForm').addEventListener('submit', handleFormSubmit);
});

// Update competitor fields based on selected model
function updateCompetitorFields() {
    const selectedModel = this.value;
    const competitorModelsDiv = document.getElementById('competitorModels');
    competitorModelsDiv.innerHTML = ''; // Clear previous fields
    
    if (!selectedModel) return;
    
    const competitors = modelCompetitors[selectedModel] || [];
    
    if (competitors.length === 0) {
        competitorModelsDiv.innerHTML = '<p>No competitor models found for the selected model.</p>';
        return;
    }
    
    competitors.forEach((competitor, index) => {
        const competitorDiv = document.createElement('div');
        competitorDiv.className = 'competitor-row mb-3';
        competitorDiv.innerHTML = `
            <h5>${competitor}</h5>
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label for="sales-${index}" class="form-label">Daily Sales</label>
                    <input type="number" class="form-control sales-input" id="sales-${index}" min="0" required>
                    <div class="invalid-feedback">
                        Please enter sales count.
                    </div>
                </div>
                <div class="col-md-6 mb-2">
                    <label for="stock-${index}" class="form-label">Current Stock</label>
                    <input type="number" class="form-control stock-input" id="stock-${index}" min="0" required>
                    <div class="invalid-feedback">
                        Please enter stock count.
                    </div>
                </div>
            </div>
        `;
        competitorModelsDiv.appendChild(competitorDiv);
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    
    // Check form validity
    if (!form.checkValidity()) {
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
    }
    
    // Prepare data
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
        const sales = document.getElementById(`sales-${index}`).value;
        const stock = document.getElementById(`stock-${index}`).value;
        
        formData.competitors.push({
            name: competitorName,
            sales: sales,
            stock: stock
        });
    });
    
    try {
        // Send data to Google Apps Script
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            // Show success message
            const successMessage = document.getElementById('successMessage');
            successMessage.classList.remove('d-none');
            
            // Reset form
            form.reset();
            form.classList.remove('was-validated');
            document.getElementById('competitorModels').innerHTML = '';
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                successMessage.classList.add('d-none');
            }, 5000);
        } else {
            throw new Error('Failed to submit data');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while submitting the data. Please try again.');
    }
}
