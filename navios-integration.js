// Integration script for navios.html page
document.addEventListener('DOMContentLoaded', function() {
    initializeNaviosPage();
});

let shipsData = []; // Store ships data

async function initializeNaviosPage() {
    // Check API health
    try {
        const health = await api.healthCheck();
        console.log('API Health:', health);
    } catch (error) {
        console.error('API health check failed:', error);
        showError('Não foi possível conectar à API. Verifique sua conexão.');
    }

    // Setup form handler
    const form = document.getElementById('predictionForm');
    if (form) {
        form.addEventListener('submit', handlePredictionSubmit);
    }

    // Load initial ships data (mock for now, can be replaced with API call)
    loadShipsData();
}

async function handlePredictionSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsDiv = document.getElementById('predictionResults');
    
    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Processando...';
    
    // Clear previous results
    resultsContainer.style.display = 'none';
    resultsDiv.innerHTML = '';
    
    // Show loading
    const loadingSpinner = UIComponents.createSpinner();
    resultsDiv.appendChild(loadingSpinner);
    resultsContainer.style.display = 'block';
    
    try {
        // Collect form data
        const formData = new FormData(form);
        const voyageData = {
            shipName: formData.get('shipName'),
            speed: parseFloat(formData.get('speed')),
            duration: parseFloat(formData.get('duration')),
            distance: parseFloat(formData.get('distance')),
            beaufortScale: parseInt(formData.get('beaufortScale')),
            Area_Molhada: parseFloat(formData.get('Area_Molhada')),
            MASSA_TOTAL_TON: parseFloat(formData.get('MASSA_TOTAL_TON')),
            TIPO_COMBUSTIVEL_PRINCIPAL: formData.get('TIPO_COMBUSTIVEL_PRINCIPAL'),
            decLatitude: parseFloat(formData.get('decLatitude')),
            decLongitude: parseFloat(formData.get('decLongitude')),
            DiasDesdeUltimaLimpeza: parseFloat(formData.get('DiasDesdeUltimaLimpeza'))
        };
        
        const currency = formData.get('currency') || 'BRL';
        const fuelType = voyageData.TIPO_COMBUSTIVEL_PRINCIPAL;
        
        // Validate data
        api.validateVoyageData(voyageData);
        
        // Make prediction
        const result = await api.predictWithImpact(voyageData, fuelType, currency);
        
        // Display results
        displayPredictionResult(result, resultsDiv);
        
        // Add to ships data
        addShipToData(result);
        
        // Refresh ships display
        displayShips();
        
        // Save to localStorage for dashboard
        savePredictionToStorage(result);
        
        // Dispatch event for dashboard update
        dispatchPredictionEvent(result);
        
    } catch (error) {
        console.error('Prediction error:', error);
        
        let errorMessage = 'Erro ao fazer predição. ';
        if (error instanceof ValidationError) {
            errorMessage += error.message;
        } else if (error instanceof APIError) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Tente novamente mais tarde.';
        }
        
        const errorDiv = UIComponents.createErrorMessage(errorMessage, 'error');
        resultsDiv.innerHTML = '';
        resultsDiv.appendChild(errorDiv);
        resultsContainer.style.display = 'block';
        
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Fazer Predição';
    }
}

function displayPredictionResult(result, container) {
    container.innerHTML = '';
    
    // Prediction header
    const predictionDiv = document.createElement('div');
    predictionDiv.className = 'prediction-result';
    
    const header = document.createElement('div');
    header.className = 'prediction-header';
    
    const title = document.createElement('div');
    title.className = 'prediction-title';
    title.textContent = `Navio: ${result.ship_id}`;
    
    const confidence = document.createElement('div');
    confidence.className = 'confidence-badge';
    confidence.textContent = `Confiança: ${(result.confidence_score * 100).toFixed(1)}%`;
    
    header.appendChild(title);
    header.appendChild(confidence);
    
    // Biofouling indicator
    const indicator = UIComponents.createBiofoulingIndicator(
        result.biofouling_level,
        result.risk_category
    );
    
    // Recommendation
    const recommendation = document.createElement('div');
    recommendation.className = 'recommendation';
    recommendation.innerHTML = `
        <strong>Recomendação:</strong> ${result.recommended_action}
    `;
    
    predictionDiv.appendChild(header);
    predictionDiv.appendChild(indicator);
    predictionDiv.appendChild(recommendation);
    
    // Impact analysis
    if (result.impact_analysis) {
        const impactContainer = document.createElement('div');
        UIComponents.displayImpactAnalysis(result.impact_analysis, impactContainer);
        predictionDiv.appendChild(impactContainer);
    }
    
    container.appendChild(predictionDiv);
    
    // Scroll to results
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addShipToData(result) {
    const shipData = {
        id: result.ship_id,
        name: result.ship_id,
        level: result.biofouling_level,
        riskCategory: result.risk_category,
        confidence: result.confidence_score,
        recommendation: result.recommended_action,
        impact: result.impact_analysis,
        timestamp: result.timestamp
    };
    
    // Remove if already exists
    shipsData = shipsData.filter(s => s.id !== shipData.id);
    
    // Add new
    shipsData.push(shipData);
}

function loadShipsData() {
    // For now, use empty array - can be populated from API or localStorage
    shipsData = [];
    displayShips();
}

function displayShips() {
    // Group ships by risk category
    const critical = shipsData.filter(s => s.riskCategory === 'Critical');
    const high = shipsData.filter(s => s.riskCategory === 'High');
    const moderate = shipsData.filter(s => s.riskCategory === 'Medium');
    const low = shipsData.filter(s => s.riskCategory === 'Low');
    
    // Update titles
    updateSectionTitle('criticalTitle', critical.length, 'crítico');
    updateSectionTitle('highTitle', high.length, 'alto');
    updateSectionTitle('moderateTitle', moderate.length, 'moderado');
    updateSectionTitle('lightTitle', low.length, 'leve');
    
    // Display ships
    displayShipGroup('criticalShips', critical, 'critical');
    displayShipGroup('highShips', high, 'high');
    displayShipGroup('moderateShips', moderate, 'moderate');
    displayShipGroup('cleanShips', low, 'clean');
}

function updateSectionTitle(elementId, count, level) {
    const element = document.getElementById(elementId);
    if (element) {
        if (count === 0) {
            element.parentElement.style.display = 'none';
        } else {
            element.parentElement.style.display = 'block';
            element.innerHTML = `${count} Navio${count > 1 ? 's' : ''} com incrustação de nível <strong>${level}</strong>`;
        }
    }
}

function displayShipGroup(containerId, ships, riskClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (ships.length === 0) {
        container.parentElement.style.display = 'none';
        return;
    }
    
    container.parentElement.style.display = 'block';
    
    ships.forEach(ship => {
        const card = createShipCard(ship, riskClass);
        container.appendChild(card);
    });
}

function createShipCard(ship, riskClass) {
    const card = document.createElement('div');
    card.className = 'ship-card';
    
    const commander = document.createElement('p');
    commander.className = 'ship-commander';
    commander.textContent = `Comandante - ${ship.name}`;
    
    const name = document.createElement('h3');
    name.className = 'ship-name';
    name.textContent = ship.name;
    
    const indicator = UIComponents.createBiofoulingIndicator(ship.level, ship.riskCategory);
    
    const button = document.createElement('button');
    button.className = 'request-btn';
    button.textContent = 'Solicitar limpeza';
    button.addEventListener('click', () => {
        alert(`Solicitação de limpeza para ${ship.name} enviada!`);
    });
    
    card.appendChild(commander);
    card.appendChild(name);
    card.appendChild(indicator);
    card.appendChild(button);
    
    return card;
}

function savePredictionToStorage(result) {
    try {
        let predictions = [];
        const saved = localStorage.getItem('biofouling_predictions');
        if (saved) {
            predictions = JSON.parse(saved);
        }
        predictions.push(result);
        // Keep only last 100 predictions
        if (predictions.length > 100) {
            predictions = predictions.slice(-100);
        }
        localStorage.setItem('biofouling_predictions', JSON.stringify(predictions));
        
        // Also update dashboard data
        let dashboardData = { ships: [], predictions: [] };
        const dashboardSaved = localStorage.getItem('biofouling_dashboard_data');
        if (dashboardSaved) {
            dashboardData = JSON.parse(dashboardSaved);
        }
        
        // Add prediction and LIMIT to 100
        dashboardData.predictions.push(result);
        if (dashboardData.predictions.length > 100) {
            dashboardData.predictions = dashboardData.predictions.slice(-100);
        }
        
        const shipData = {
            id: result.ship_id,
            name: result.ship_id,
            level: result.biofouling_level,
            riskCategory: result.risk_category,
            location: 'Em trânsito'
        };
        dashboardData.ships = dashboardData.ships.filter(s => s.id !== shipData.id);
        dashboardData.ships.push(shipData);
        localStorage.setItem('biofouling_dashboard_data', JSON.stringify(dashboardData));
    } catch (error) {
        console.error('Error saving prediction:', error);
    }
}

function dispatchPredictionEvent(result) {
    // Dispatch custom event for dashboard
    const event = new CustomEvent('biofouling-prediction-made', {
        detail: {
            prediction: result,
            ship: {
                id: result.ship_id,
                name: result.ship_id,
                level: result.biofouling_level,
                riskCategory: result.risk_category,
                location: 'Em trânsito'
            }
        }
    });
    window.dispatchEvent(event);
    
    // Also trigger storage event for cross-tab communication
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'biofouling_predictions',
        newValue: localStorage.getItem('biofouling_predictions')
    }));
}

function showError(message) {
    const errorDiv = UIComponents.createErrorMessage(message, 'error');
    const content = document.querySelector('.content');
    if (content) {
        content.insertBefore(errorDiv, content.firstChild);
    }
}

