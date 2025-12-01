// Integration script for index.html (dashboard) page
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

let dashboardData = {
    ships: [],
    predictions: [],
    totalSavings: 0,
    totalEmissions: 0
};

async function initializeDashboard() {
    // Check API health (non-blocking - don't wait for it)
    api.healthCheck().then(health => {
        console.log('API Health:', health);
    }).catch(error => {
        console.warn('API health check failed (non-critical):', error);
        // Don't show error to user - API is optional for local JSON data
    });

    // Load dashboard data (this will load from JSON if localStorage is empty)
    await loadDashboardData();
    
    // Update UI
    updateHighlights();
    updateStatusTable();
    updateMaintenanceChart();
    updateBiofoulingAnalysis();
    updateFleetProportions();
}

async function loadDashboardData() {
    // Load from localStorage if available
    // In production, this could also fetch from API
    try {
        const savedData = localStorage.getItem('biofouling_dashboard_data');
        if (savedData) {
            try {
                dashboardData = JSON.parse(savedData);
                // Ensure predictions are limited (safety check)
                const maxPredictions = typeof STORAGE_CONFIG !== 'undefined' 
                    ? STORAGE_CONFIG.MAX_PREDICTIONS 
                    : 100;
                if (dashboardData.predictions && dashboardData.predictions.length > maxPredictions) {
                    dashboardData.predictions = dashboardData.predictions.slice(-maxPredictions);
                    localStorage.setItem('biofouling_dashboard_data', JSON.stringify(dashboardData));
                }
                // If we have valid data, use it but still try to refresh from source in background
                if (dashboardData.predictions && dashboardData.predictions.length > 0) {
                    console.log('Loaded data from localStorage:', dashboardData.predictions.length, 'predictions');
                    // Update UI immediately with localStorage data
                    updateHighlights();
                    updateStatusTable();
                    updateMaintenanceChart();
                    updateBiofoulingAnalysis();
                    updateFleetProportions();
                    // Still try to load fresh data in background (non-blocking) to ensure it's up to date
                    loadFromJSONFile().then(() => {
                        // Update UI again if new data was loaded
                        if (dashboardData.predictions && dashboardData.predictions.length > 0) {
                            requestAnimationFrame(() => {
                                updateHighlights();
                                updateStatusTable();
                                updateMaintenanceChart();
                                updateBiofoulingAnalysis();
                                updateFleetProportions();
                            });
                        }
                    }).catch(() => {
                        // Ignore errors, we already have data from localStorage
                    });
                    return;
                }
            } catch (e) {
                console.warn('Error parsing localStorage data, will reload from source:', e);
                localStorage.removeItem('biofouling_dashboard_data');
            }
        }
        
        // Try loading from predictions storage
        const predictions = localStorage.getItem('biofouling_predictions');
        if (predictions) {
            try {
                const preds = JSON.parse(predictions);
                // Limit to max predictions (safety check)
                const maxPredictions = typeof STORAGE_CONFIG !== 'undefined' 
                    ? STORAGE_CONFIG.MAX_PREDICTIONS 
                    : 100;
                dashboardData.predictions = preds.length > maxPredictions ? preds.slice(-maxPredictions) : preds;
                // Extract unique ships
                const shipsMap = new Map();
                preds.forEach(pred => {
                    if (!shipsMap.has(pred.ship_id)) {
                        shipsMap.set(pred.ship_id, {
                            id: pred.ship_id,
                            name: pred.ship_id,
                            level: pred.biofouling_level,
                            riskCategory: pred.risk_category,
                            location: 'Em trânsito'
                        });
                    }
                });
                dashboardData.ships = Array.from(shipsMap.values());
                if (dashboardData.predictions.length > 0) {
                    console.log('Loaded data from biofouling_predictions:', dashboardData.predictions.length, 'predictions');
                    return;
                }
            } catch (e) {
                console.warn('Error parsing predictions from localStorage:', e);
            }
        }
        
        // Try loading from analise_biofouling.json file or embedded data
        await loadFromJSONFile();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Try loading from JSON file as fallback
        await loadFromJSONFile();
    }
}

/**
 * Load data from analise_biofouling.json file
 */
async function loadFromJSONFile() {
    try {
        let jsonData = null;
        
        // Try to fetch JSON file first
        try {
            const response = await fetch('analise_biofouling.json', {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            if (response.ok) {
                jsonData = await response.json();
                console.log('Data loaded from analise_biofouling.json file');
            } else {
                console.warn('JSON file not accessible, trying embedded data');
            }
        } catch (fetchError) {
            console.warn('Fetch failed, trying embedded data:', fetchError);
        }
        
        // Fallback to embedded data if fetch failed
        if (!jsonData && typeof ANALISE_BIOFOULING_DATA !== 'undefined') {
            console.log('Using embedded ANALISE_BIOFOULING_DATA');
            jsonData = ANALISE_BIOFOULING_DATA;
        }
        
        if (!jsonData) {
            console.warn('No data available from file or embedded source');
            return;
        }
        
        // Detect if all items have the same shipName but different sessionIds
        // If so, we'll generate unique names using sessionId
        const firstShipName = jsonData[0]?.shipName;
        const allSameName = jsonData.length > 0 && jsonData.every(item => item.shipName === firstShipName);
        const uniqueSessionIds = new Set(jsonData.map(item => item.sessionId)).size;
        const hasMultipleSessionIds = uniqueSessionIds > 1;
        const shouldGenerateUniqueNames = allSameName && hasMultipleSessionIds;
        
        if (shouldGenerateUniqueNames) {
            console.log(`Detected ${jsonData.length} events with same ship name but different sessionIds. Generating unique names.`);
        }
        
        // Convert JSON format to dashboard format
        const predictions = jsonData.map(item => {
            // Calculate delta_power_kw from Power_Increase_Percent
            // Estimate base power from fuel consumption (typical: 1 ton fuel ≈ 200-300 kW)
            // Using a conservative estimate: if extra fuel is known, estimate power
            const extraFuelTons = item.Extra_Fuel_Tons || 0;
            // Power increase percentage applied to estimated base power
            // Typical ship power: 5000-15000 kW, using 8000 kW as average
            const estimatedBasePower = 8000; // kW
            const powerIncreasePercent = item.Power_Increase_Percent || 0;
            const deltaPowerKw = (powerIncreasePercent / 100) * estimatedBasePower;
            
            // Generate unique ship name if needed
            const shipName = shouldGenerateUniqueNames 
                ? `${item.shipName} (${item.sessionId})`
                : item.shipName;
            
            return {
                ship_id: shipName,
                biofouling_level: item.Biofouling_Level,
                risk_category: item.Risk_Category,
                confidence: item.Confidence,
                timestamp: item.startGMTDate ? new Date(item.startGMTDate).toISOString() : new Date().toISOString(),
                sessionId: item.sessionId,
                impact_analysis: {
                    extra_fuel_tons: extraFuelTons,
                    extra_co2_tons: item.Extra_CO2_Tons || 0,
                    delta_power_kw: Math.round(deltaPowerKw),
                    total_cost_brl: item.Total_Cost_BRL || 0,
                    total_cost_usd: item.Total_Cost_USD || 0,
                    preferred_currency: 'BRL',
                    extra_cost_brl: item.Extra_Cost_BRL || 0,
                    extra_cost_usd: item.Extra_Cost_USD || 0
                },
                recommended_action: item.Action
            };
        });
        
        // Extract unique ships
        const shipsMap = new Map();
        predictions.forEach(pred => {
            if (!shipsMap.has(pred.ship_id)) {
                shipsMap.set(pred.ship_id, {
                    id: pred.ship_id,
                    name: pred.ship_id,
                    level: pred.biofouling_level,
                    riskCategory: pred.risk_category,
                    location: 'Em trânsito'
                });
            } else {
                // Update to latest level if newer
                const existingShip = shipsMap.get(pred.ship_id);
                if (pred.timestamp > existingShip.lastUpdate) {
                    existingShip.level = pred.biofouling_level;
                    existingShip.riskCategory = pred.risk_category;
                    existingShip.lastUpdate = pred.timestamp;
                }
            }
        });
        
        dashboardData.predictions = predictions;
        dashboardData.ships = Array.from(shipsMap.values());
        
        // Save to localStorage for future use
        try {
            localStorage.setItem('biofouling_dashboard_data', JSON.stringify(dashboardData));
            localStorage.setItem('biofouling_predictions', JSON.stringify(predictions));
            console.log(`✅ Data loaded and saved: ${predictions.length} predictions, ${dashboardData.ships.length} ships`);
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
        
        // Force UI update after loading (always update when data is loaded)
        if (predictions.length > 0) {
            // Use requestAnimationFrame for smoother updates
            requestAnimationFrame(() => {
                updateHighlights();
                updateStatusTable();
                updateMaintenanceChart();
                updateBiofoulingAnalysis();
                updateFleetProportions();
            });
        }
    } catch (error) {
        console.error('Error loading from JSON file:', error);
        // If embedded data is available, try using it directly
        if (typeof ANALISE_BIOFOULING_DATA !== 'undefined' && ANALISE_BIOFOULING_DATA.length > 0) {
            console.log('Attempting to use embedded data as last resort');
            // Recursive call with embedded data
            const jsonData = ANALISE_BIOFOULING_DATA;
            
            // Detect if all items have the same shipName but different sessionIds
            const firstShipName = jsonData[0]?.shipName;
            const allSameName = jsonData.length > 0 && jsonData.every(item => item.shipName === firstShipName);
            const uniqueSessionIds = new Set(jsonData.map(item => item.sessionId)).size;
            const hasMultipleSessionIds = uniqueSessionIds > 1;
            const shouldGenerateUniqueNames = allSameName && hasMultipleSessionIds;
            
            if (shouldGenerateUniqueNames) {
                console.log(`Detected ${jsonData.length} events with same ship name but different sessionIds. Generating unique names.`);
            }
            
            // Process the data (same conversion logic)
            const predictions = jsonData.map(item => {
                const extraFuelTons = item.Extra_Fuel_Tons || 0;
                const estimatedBasePower = 8000;
                const powerIncreasePercent = item.Power_Increase_Percent || 0;
                const deltaPowerKw = (powerIncreasePercent / 100) * estimatedBasePower;
                
                // Generate unique ship name if needed
                const shipName = shouldGenerateUniqueNames 
                    ? `${item.shipName} (${item.sessionId})`
                    : item.shipName;
                
                return {
                    ship_id: shipName,
                    biofouling_level: item.Biofouling_Level,
                    risk_category: item.Risk_Category,
                    confidence: item.Confidence,
                    timestamp: item.startGMTDate ? new Date(item.startGMTDate).toISOString() : new Date().toISOString(),
                    sessionId: item.sessionId,
                    impact_analysis: {
                        extra_fuel_tons: extraFuelTons,
                        extra_co2_tons: item.Extra_CO2_Tons || 0,
                        delta_power_kw: Math.round(deltaPowerKw),
                        total_cost_brl: item.Total_Cost_BRL || 0,
                        total_cost_usd: item.Total_Cost_USD || 0,
                        preferred_currency: 'BRL',
                        extra_cost_brl: item.Extra_Cost_BRL || 0,
                        extra_cost_usd: item.Extra_Cost_USD || 0
                    },
                    recommended_action: item.Action
                };
            });
            
            const shipsMap = new Map();
            predictions.forEach(pred => {
                if (!shipsMap.has(pred.ship_id)) {
                    shipsMap.set(pred.ship_id, {
                        id: pred.ship_id,
                        name: pred.ship_id,
                        level: pred.biofouling_level,
                        riskCategory: pred.risk_category,
                        location: 'Em trânsito'
                    });
                } else {
                    const existingShip = shipsMap.get(pred.ship_id);
                    if (pred.timestamp > (existingShip.lastUpdate || '')) {
                        existingShip.level = pred.biofouling_level;
                        existingShip.riskCategory = pred.risk_category;
                        existingShip.lastUpdate = pred.timestamp;
                    }
                }
            });
            
            dashboardData.predictions = predictions;
            dashboardData.ships = Array.from(shipsMap.values());
            
            try {
                localStorage.setItem('biofouling_dashboard_data', JSON.stringify(dashboardData));
                localStorage.setItem('biofouling_predictions', JSON.stringify(predictions));
                console.log('✅ Data loaded from embedded source and saved to localStorage');
            } catch (e) {
                console.warn('Could not save to localStorage:', e);
            }
            
            // Force UI update
            requestAnimationFrame(() => {
                updateHighlights();
                updateStatusTable();
                updateMaintenanceChart();
                updateBiofoulingAnalysis();
                updateFleetProportions();
            });
        }
    }
}

function updateHighlights() {
    // Active ships count
    const activeShipsEl = document.getElementById('activeShips');
    const activeShipsChangeEl = document.getElementById('activeShipsChange');
    if (activeShipsEl) {
        const count = dashboardData.ships.length || 0;
        activeShipsEl.textContent = `${count} navio${count !== 1 ? 's' : ''}`;
        if (activeShipsChangeEl) {
            activeShipsChangeEl.textContent = 'Dados atualizados';
        }
    }

    // Average speed (mock for now)
    const avgSpeedEl = document.getElementById('avgSpeed');
    const avgSpeedChangeEl = document.getElementById('avgSpeedChange');
    if (avgSpeedEl) {
        const avgSpeed = calculateAverageSpeed();
        avgSpeedEl.textContent = avgSpeed > 0 ? `${avgSpeed.toFixed(1)} kn` : '-';
        if (avgSpeedChangeEl) {
            avgSpeedChangeEl.className = 'card-change positive';
            avgSpeedChangeEl.innerHTML = '<span class="material-icons">trending_up</span> Dados atualizados';
        }
    }

    // Total savings
    const totalSavingsEl = document.getElementById('totalSavings');
    const totalSavingsChangeEl = document.getElementById('totalSavingsChange');
    if (totalSavingsEl) {
        const savings = calculateTotalSavings();
        const defaultCurrency = typeof CURRENCY_CODES !== 'undefined' ? CURRENCY_CODES.BRL : 'BRL';
        totalSavingsEl.textContent = formatCurrency(savings, defaultCurrency);
        if (totalSavingsChangeEl) {
            totalSavingsChangeEl.textContent = 'Baseado em predições recentes';
        }
    }

    // Emissions saved
    const emissionsSavedEl = document.getElementById('emissionsSaved');
    const emissionsSavedChangeEl = document.getElementById('emissionsSavedChange');
    if (emissionsSavedEl) {
        const emissions = calculateTotalEmissions();
        emissionsSavedEl.textContent = `${emissions.toFixed(1)} ton CO₂`;
        if (emissionsSavedChangeEl) {
            emissionsSavedChangeEl.textContent = 'Baseado em predições recentes';
        }
    }
}

function calculateAverageSpeed() {
    // Mock calculation - in production would use real data
    return dashboardData.ships.length > 0 ? 15.0 : 0;
}

function calculateTotalSavings() {
    let total = 0;
    dashboardData.predictions.forEach(pred => {
        if (pred.impact_analysis) {
            // Calculate potential savings if cleaning was done
            const extraCost = pred.impact_analysis.total_cost_brl || pred.impact_analysis.total_cost_usd * 5;
            total += extraCost;
        }
    });
    return total;
}

function calculateTotalEmissions() {
    let total = 0;
    dashboardData.predictions.forEach(pred => {
        if (pred.impact_analysis) {
            total += pred.impact_analysis.extra_co2_tons || 0;
        }
    });
    return total;
}

function updateStatusTable() {
    const tbody = document.getElementById('statusTableBody');
    if (!tbody) return;

    if (dashboardData.ships.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: #4D4D4D;">
                    Nenhum navio com dados disponíveis. Faça uma predição na página de Navios.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    
    dashboardData.ships.forEach(ship => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = ship.name || ship.id;
        
        const locationCell = document.createElement('td');
        locationCell.textContent = ship.location || 'Em trânsito';
        
        // Biofouling level cell
        const levelCell = document.createElement('td');
        const level = ship.level !== undefined ? ship.level : '-';
        if (typeof level === 'number') {
            const levelBadge = document.createElement('span');
            levelBadge.className = `level-badge level-${level}`;
            levelBadge.style.cssText = `
                background-color: ${level === 0 ? '#1A932E' : level === 1 ? '#FFB74D' : level === 2 ? '#FFA726' : '#EF5350'};
                color: white;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
            `;
            levelBadge.textContent = `Nível ${level}`;
            levelCell.appendChild(levelBadge);
        } else {
            levelCell.textContent = '-';
        }
        
        const statusCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status-badge status-${getStatusClass(ship.riskCategory)}`;
        badge.textContent = getStatusText(ship.riskCategory);
        statusCell.appendChild(badge);
        
        row.appendChild(nameCell);
        row.appendChild(locationCell);
        row.appendChild(levelCell);
        row.appendChild(statusCell);
        
        tbody.appendChild(row);
    });
}

function getStatusClass(riskCategory) {
    const mapping = typeof RISK_CATEGORY_MAPPINGS !== 'undefined' && RISK_CATEGORY_MAPPINGS?.status
        ? RISK_CATEGORY_MAPPINGS.status
        : {
            'Low': 'ok',
            'Medium': 'maintenance',
            'High': 'late',
            'Critical': 'late'
        };
    return mapping[riskCategory] || 'maintenance';
}

function getStatusText(riskCategory) {
    const mapping = typeof RISK_CATEGORY_MAPPINGS !== 'undefined' && RISK_CATEGORY_MAPPINGS?.text
        ? RISK_CATEGORY_MAPPINGS.text
        : {
            'Low': 'Limpo',
            'Medium': 'Moderado',
            'High': 'Suja',
            'Critical': 'Suja'
        };
    return mapping[riskCategory] || 'Desconhecido';
}

function updateMaintenanceChart() {
    // Update chart with maintenance data
    const chartData = calculateMaintenanceChartData();
    
    // Trigger chart update if function exists
    if (typeof renderMaintenanceChart === 'function') {
        renderMaintenanceChart(chartData);
    }
}

function calculateMaintenanceChartData() {
    // Group predictions by month for current year
    const currentYear = new Date().getFullYear();
    const monthlyCounts = new Array(12).fill(0);
    
    dashboardData.predictions.forEach(pred => {
        if (pred.timestamp) {
            try {
                const date = new Date(pred.timestamp);
                if (date.getFullYear() === currentYear) {
                    const monthIndex = date.getMonth(); // 0-11
                    monthlyCounts[monthIndex]++;
                }
            } catch (e) {
                console.error('Error parsing timestamp:', e);
            }
        }
    });
    
    return monthlyCounts;
}

function calculateMaintenanceData() {
    // Group predictions by month
    const monthlyData = {};
    
    dashboardData.predictions.forEach(pred => {
        if (pred.timestamp) {
            const date = new Date(pred.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = 0;
            }
            monthlyData[monthKey]++;
        }
    });
    
    return monthlyData;
}

function formatCurrency(value, currency) {
    const symbol = typeof CURRENCY_SYMBOLS !== 'undefined' 
        ? (CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS[CURRENCY_CODES.BRL])
        : (currency === 'BRL' ? 'R$' : 'US$');
    return `${symbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function showError(message) {
    // Simple error display function that doesn't depend on UIComponents
    console.error(message);
    // Try to use UIComponents if available, otherwise show simple alert
    if (typeof UIComponents !== 'undefined' && UIComponents.createErrorMessage) {
        const errorDiv = UIComponents.createErrorMessage(message, 'error');
        document.body.appendChild(errorDiv);
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    } else {
        // Fallback: log to console only
        console.warn('UIComponents not available, error logged:', message);
    }
    const content = document.querySelector('.content');
    if (content) {
        content.insertBefore(errorDiv, content.firstChild);
    }
}

// Listen for storage events to update dashboard when new predictions are made
window.addEventListener('storage', function(e) {
    if (e.key === 'biofouling_predictions') {
        loadDashboardData();
        updateHighlights();
        updateStatusTable();
        updateMaintenanceChart();
        updateBiofoulingAnalysis();
        updateFleetProportions();
    }
});

// Also listen for custom events from navios page
window.addEventListener('biofouling-prediction-made', function(e) {
    if (e.detail && e.detail.prediction) {
        dashboardData.predictions.push(e.detail.prediction);
        if (e.detail.ship) {
            dashboardData.ships.push(e.detail.ship);
        }
        saveDashboardData();
        updateHighlights();
        updateStatusTable();
        updateMaintenanceChart();
        updateBiofoulingAnalysis();
        updateFleetProportions();
    }
});

function saveDashboardData() {
    try {
        localStorage.setItem('biofouling_dashboard_data', JSON.stringify(dashboardData));
    } catch (error) {
        console.error('Error saving dashboard data:', error);
    }
}

/**
 * Update biofouling analysis section with real data
 */
function updateBiofoulingAnalysis() {
    if (!dashboardData.predictions || dashboardData.predictions.length === 0) {
        // Hide analysis section if no data
        const analysisSection = document.querySelector('.biofouling-analysis-section');
        if (analysisSection) {
            analysisSection.style.display = 'none';
        }
        return;
    }

    // Show analysis section
    const analysisSection = document.querySelector('.biofouling-analysis-section');
    if (analysisSection) {
        analysisSection.style.display = 'block';
    }

    // Calculate aggregated metrics
    const metrics = DataAnalyzer.calculateAggregatedMetrics(dashboardData.predictions);
    const insights = DataAnalyzer.generateInsights(dashboardData.predictions, dashboardData.ships);

    // Update impact cards
    const totalExtraFuelEl = document.getElementById('totalExtraFuel');
    if (totalExtraFuelEl) {
        totalExtraFuelEl.textContent = metrics.totalExtraFuel.toFixed(2);
    }

    const totalCostBRLEl = document.getElementById('totalCostBRL');
    if (totalCostBRLEl) {
        const symbol = typeof CURRENCY_SYMBOLS !== 'undefined' ? CURRENCY_SYMBOLS.BRL : 'R$';
        totalCostBRLEl.textContent = `${symbol} ${metrics.totalExtraCostBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    const totalCostUSDEl = document.getElementById('totalCostUSD');
    if (totalCostUSDEl) {
        const symbol = typeof CURRENCY_SYMBOLS !== 'undefined' ? CURRENCY_SYMBOLS.USD : 'US$';
        totalCostUSDEl.textContent = `${symbol} ${metrics.totalExtraCostUSD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    const totalExtraCO2El = document.getElementById('totalExtraCO2');
    if (totalExtraCO2El) {
        totalExtraCO2El.textContent = metrics.totalExtraCO2.toFixed(2);
    }

    const totalExtraPowerEl = document.getElementById('totalExtraPower');
    if (totalExtraPowerEl) {
        totalExtraPowerEl.textContent = metrics.totalExtraPower.toFixed(0);
    }

    // Update priority ships list
    updatePriorityShipsList(insights.priorityShips);

    // Update distribution chart
    updateDistributionChart(insights.distribution);

    // Update recommendations
    updateRecommendations(insights.recommendations);

    // Update highlights with average biofouling level
    updateHighlightsWithBiofouling(metrics.averageBiofoulingLevel);

    // Ensure chart is redrawn after a short delay to allow DOM to settle
    setTimeout(function() {
        updateDistributionChart(insights.distribution);
    }, 100);
}

/**
 * Update priority ships list
 */
function updatePriorityShipsList(priorityShips) {
    const container = document.getElementById('priorityShipsList');
    if (!container) return;

    if (priorityShips.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <span class="material-icons">check_circle</span>
                </div>
                <div class="empty-state-message">Nenhum navio prioritário identificado. Frota em bom estado!</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    priorityShips.forEach((ship, index) => {
        const shipCard = document.createElement('div');
        shipCard.className = 'priority-ship-card';
        shipCard.style.cssText = `
            padding: 12px;
            margin-bottom: 8px;
            border-left: 4px solid ${ship.risk === 'Critical' ? '#EF5350' : ship.risk === 'High' ? '#FFA726' : '#FFB74D'};
            background-color: #FAFAFA;
            border-radius: 4px;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';

        const name = document.createElement('strong');
        name.textContent = `${index + 1}. ${ship.name}`;
        name.style.color = '#000';

        const levelBadge = document.createElement('span');
        levelBadge.className = `status-badge status-${getStatusClass(ship.risk)}`;
        levelBadge.textContent = `Nível ${ship.level} - ${ship.risk}`;
        levelBadge.style.fontSize = '12px';

        header.appendChild(name);
        header.appendChild(levelBadge);

        const cost = document.createElement('div');
        cost.style.cssText = 'font-size: 13px; color: #4D4D4D; margin-top: 4px;';
        const symbol = typeof CURRENCY_SYMBOLS !== 'undefined' ? CURRENCY_SYMBOLS.BRL : 'R$';
        cost.textContent = `Custo estimado: ${symbol} ${ship.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        const recommendation = document.createElement('div');
        recommendation.style.cssText = 'font-size: 12px; color: #666; margin-top: 4px; font-style: italic;';
        recommendation.textContent = `Recomendação: ${ship.recommendation}`;

        shipCard.appendChild(header);
        shipCard.appendChild(cost);
        shipCard.appendChild(recommendation);
        container.appendChild(shipCard);
    });
}

/**
 * Update distribution chart
 */
function updateDistributionChart(distribution) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const width = container ? container.offsetWidth : 400;
    const height = 200;
    
    // Set actual pixel dimensions (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
    if (total === 0) {
        ctx.fillStyle = '#4D4D4D';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum dado disponível', width / 2, height / 2);
        return;
    }

    const colors = {
        0: '#1A932E', // Green - Clean
        1: '#FFB74D', // Orange - Light
        2: '#FFA726', // Orange - Moderate
        3: '#EF5350'  // Red - Critical
    };

    const labels = {
        0: 'Nível 0 (Limpo)',
        1: 'Nível 1 (Leve)',
        2: 'Nível 2 (Moderado)',
        3: 'Nível 3 (Crítico)'
    };

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / 4;
    const barPadding = barWidth * 0.2;
    const maxValue = Math.max(...Object.values(distribution), 1);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw bars
    Object.keys(distribution).forEach((level, index) => {
        const value = distribution[level];
        const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
        const x = padding + index * barWidth + barPadding / 2;
        const y = height - padding - barHeight;
        const actualBarWidth = barWidth - barPadding;

        // Draw bar
        ctx.fillStyle = colors[level] || '#4D4D4D';
        ctx.fillRect(x, y, actualBarWidth, barHeight);

        // Draw label
        ctx.fillStyle = '#4D4D4D';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(labels[level] || `Nível ${level}`, x + actualBarWidth / 2, height - padding + 15);

        // Draw value
        if (value > 0) {
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Inter';
            ctx.fillText(value.toString(), x + actualBarWidth / 2, y - 5);
        }
    });
}

// Handle window resize for distribution chart
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        if (dashboardData.predictions && dashboardData.predictions.length > 0) {
            const distribution = DataAnalyzer.calculateLevelDistribution(dashboardData.predictions);
            updateDistributionChart(distribution);
        }
    }, 250);
});

/**
 * Update recommendations
 */
function updateRecommendations(recommendations) {
    const container = document.getElementById('recommendationsList');
    const card = document.getElementById('recommendationsCard');
    
    if (!container || !card) return;

    if (recommendations.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    container.innerHTML = '';

    recommendations.forEach(rec => {
        const recDiv = document.createElement('div');
        recDiv.className = 'recommendation-item';
        recDiv.style.cssText = `
            padding: 12px;
            margin-bottom: 8px;
            border-left: 4px solid ${rec.type === 'urgent' ? '#EF5350' : rec.type === 'cost' ? '#FFA726' : '#1A932E'};
            background-color: ${rec.type === 'urgent' ? '#FFEBEE' : rec.type === 'cost' ? '#FFF3E0' : '#E8F5E9'};
            border-radius: 4px;
        `;

        const title = document.createElement('strong');
        title.textContent = rec.title;
        title.style.display = 'block';
        title.style.marginBottom = '4px';
        title.style.color = '#000';

        const message = document.createElement('div');
        message.textContent = rec.message;
        message.style.fontSize = '13px';
        message.style.color = '#4D4D4D';
        message.style.marginBottom = '4px';

        recDiv.appendChild(title);
        recDiv.appendChild(message);
        container.appendChild(recDiv);
    });
}

/**
 * Update fleet proportions treemap
 */
function updateFleetProportions() {
    const container = document.getElementById('fleetProportionTreemap');
    if (!container) return;
    
    // Don't show empty state if data might still be loading
    if (!dashboardData || !dashboardData.ships || dashboardData.ships.length === 0) {
        // Only show empty state if we're sure there's no data (not just loading)
        const hasPredictions = dashboardData.predictions && dashboardData.predictions.length > 0;
        if (!hasPredictions) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <span class="material-icons">directions_boat</span>
                    </div>
                    <div class="empty-state-message">Nenhum navio disponível para análise</div>
                </div>
            `;
        }
        return;
    }

    const proportions = DataAnalyzer.calculateFleetProportions(dashboardData.ships);

    const items = container.querySelectorAll('.treemap-item');
    if (items.length >= 3) {
        // Update clean
        const cleanValue = items[0].querySelector('.treemap-value');
        if (cleanValue) {
            cleanValue.textContent = `${proportions.clean.toFixed(0)}%`;
        }

        // Update dirty
        const dirtyValue = items[1].querySelector('.treemap-value');
        if (dirtyValue) {
            dirtyValue.textContent = `${proportions.dirty.toFixed(0)}%`;
        }

        // Update maintenance
        const maintenanceValue = items[2].querySelector('.treemap-value');
        if (maintenanceValue) {
            maintenanceValue.textContent = `${proportions.maintenance.toFixed(0)}%`;
        }
    }
}

/**
 * Update highlights with average biofouling level
 */
function updateHighlightsWithBiofouling(averageLevel) {
    const avgBiofoulingEl = document.getElementById('avgBiofoulingLevel');
    if (avgBiofoulingEl) {
        if (averageLevel > 0) {
            avgBiofoulingEl.textContent = averageLevel.toFixed(1);
            const changeEl = document.getElementById('avgBiofoulingLevelChange');
            if (changeEl) {
                let status = '';
                if (averageLevel <= 1) {
                    status = 'Frota em bom estado';
                    changeEl.className = 'card-change positive';
                } else if (averageLevel <= 2) {
                    status = 'Atenção necessária';
                    changeEl.className = 'card-change';
                } else {
                    status = 'Ação urgente necessária';
                    changeEl.className = 'card-change negative';
                }
                changeEl.innerHTML = `<span class="material-icons">${averageLevel <= 1 ? 'check_circle' : averageLevel <= 2 ? 'warning' : 'error'}</span> ${status}`;
            }
        } else {
            avgBiofoulingEl.textContent = '-';
        }
    }
}

