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
        
        // Parse and validate numeric fields
        const parseAndValidateFloat = (value, fieldName, min = null, max = null) => {
            const parsed = parseFloat(value);
            if (isNaN(parsed)) {
                throw new ValidationError(`${fieldName} deve ser um número válido`);
            }
            if (min !== null && parsed < min) {
                throw new ValidationError(`${fieldName} deve ser maior ou igual a ${min}`);
            }
            if (max !== null && parsed > max) {
                throw new ValidationError(`${fieldName} deve ser menor ou igual a ${max}`);
            }
            return parsed;
        };

        const parseAndValidateInt = (value, fieldName, min = null, max = null) => {
            const parsed = parseInt(value);
            if (isNaN(parsed)) {
                throw new ValidationError(`${fieldName} deve ser um número inteiro válido`);
            }
            if (min !== null && parsed < min) {
                throw new ValidationError(`${fieldName} deve ser maior ou igual a ${min}`);
            }
            if (max !== null && parsed > max) {
                throw new ValidationError(`${fieldName} deve ser menor ou igual a ${max}`);
            }
            return parsed;
        };

        const voyageData = {
            shipName: formData.get('shipName')?.trim() || '',
            speed: parseAndValidateFloat(formData.get('speed'), 'Velocidade', 0, 50),
            duration: parseAndValidateFloat(formData.get('duration'), 'Duração', 0),
            distance: parseAndValidateFloat(formData.get('distance'), 'Distância', 0),
            beaufortScale: parseAndValidateInt(formData.get('beaufortScale'), 'Escala Beaufort', 0, 12),
            Area_Molhada: parseAndValidateFloat(formData.get('Area_Molhada'), 'Área Molhada', 0),
            MASSA_TOTAL_TON: parseAndValidateFloat(formData.get('MASSA_TOTAL_TON'), 'Massa Total', 0),
            TIPO_COMBUSTIVEL_PRINCIPAL: formData.get('TIPO_COMBUSTIVEL_PRINCIPAL') || '',
            decLatitude: parseAndValidateFloat(formData.get('decLatitude'), 'Latitude', -90, 90),
            decLongitude: parseAndValidateFloat(formData.get('decLongitude'), 'Longitude', -180, 180),
            DiasDesdeUltimaLimpeza: parseAndValidateFloat(formData.get('DiasDesdeUltimaLimpeza'), 'Dias desde última limpeza', 0)
        };
        
        // Validate ship name
        if (!voyageData.shipName) {
            throw new ValidationError('Nome do navio é obrigatório');
        }
        
        // Use constants for currency
        const currency = formData.get('currency') || (typeof CURRENCY_CODES !== 'undefined' ? CURRENCY_CODES.BRL : 'BRL');
        const fuelType = voyageData.TIPO_COMBUSTIVEL_PRINCIPAL;
        
        // Validate data with API validator
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
    
    // Recommendation - SECURITY: Use textContent instead of innerHTML
    const recommendation = document.createElement('div');
    recommendation.className = 'recommendation';
    const strong = document.createElement('strong');
    strong.textContent = 'Recomendação:';
    recommendation.appendChild(strong);
    recommendation.appendChild(document.createTextNode(' ' + (result.recommended_action || 'N/A')));
    
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

/**
 * Safe localStorage setItem with QuotaExceededError handling
 */
function safeLocalStorageSetItem(key, value) {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                retries++;
                
                // Try to clear old data
                if (key === 'biofouling_predictions') {
                    try {
                        const existing = JSON.parse(localStorage.getItem(key) || '[]');
                        // Remove oldest 25% of predictions
                        const toRemove = Math.max(1, Math.floor(existing.length * 0.25));
                        const cleaned = existing.slice(toRemove);
                        localStorage.setItem(key, JSON.stringify(cleaned));
                        // Try again with smaller data
                        continue;
                    } catch (clearError) {
                        console.error('Error clearing old predictions:', clearError);
                    }
                } else if (key === 'biofouling_dashboard_data') {
                    try {
                        const existing = JSON.parse(localStorage.getItem(key) || '{"ships":[],"predictions":[]}');
                        // Remove oldest 25% of predictions
                        if (existing.predictions && existing.predictions.length > 0) {
                            const toRemove = Math.max(1, Math.floor(existing.predictions.length * 0.25));
                            existing.predictions = existing.predictions.slice(toRemove);
                            localStorage.setItem(key, JSON.stringify(existing));
                            continue;
                        }
                    } catch (clearError) {
                        console.error('Error clearing old dashboard data:', clearError);
                    }
                }
                
                // If still failing, show error to user
                if (retries >= maxRetries) {
                    console.error('Failed to save data after retries. Storage quota exceeded.');
                    showError('Não foi possível salvar os dados. O armazenamento local está cheio. Por favor, limpe alguns dados antigos.');
                    return false;
                }
            } else {
                // Other errors, rethrow
                throw e;
            }
        }
    }
    return false;
}

function savePredictionToStorage(result) {
    try {
        let predictions = [];
        const saved = localStorage.getItem('biofouling_predictions');
        if (saved) {
            predictions = JSON.parse(saved);
        }
        predictions.push(result);
        // Keep only last 100 predictions (use constant if available)
        const maxPredictions = typeof STORAGE_CONFIG !== 'undefined' 
            ? STORAGE_CONFIG.MAX_PREDICTIONS 
            : 100;
        if (predictions.length > maxPredictions) {
            predictions = predictions.slice(-maxPredictions);
        }
        
        // Use safe storage setter
        if (!safeLocalStorageSetItem('biofouling_predictions', JSON.stringify(predictions))) {
            return; // Failed to save, error already shown
        }
        
        // Also update dashboard data
        let dashboardData = { ships: [], predictions: [] };
        const dashboardSaved = localStorage.getItem('biofouling_dashboard_data');
        if (dashboardSaved) {
            dashboardData = JSON.parse(dashboardSaved);
        }
        
        // Add prediction and LIMIT to maxPredictions
        dashboardData.predictions.push(result);
        if (dashboardData.predictions.length > maxPredictions) {
            dashboardData.predictions = dashboardData.predictions.slice(-maxPredictions);
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
        
        // Use safe storage setter
        safeLocalStorageSetItem('biofouling_dashboard_data', JSON.stringify(dashboardData));
    } catch (error) {
        console.error('Error saving prediction:', error);
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            showError('Armazenamento local cheio. Alguns dados podem não ser salvos.');
        }
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

