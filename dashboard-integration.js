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
    // Check API health
    try {
        const health = await api.healthCheck();
        console.log('API Health:', health);
    } catch (error) {
        console.error('API health check failed:', error);
        showError('Não foi possível conectar à API. Alguns dados podem não estar disponíveis.');
    }

    // Load dashboard data
    await loadDashboardData();
    
    // Update UI
    updateHighlights();
    updateStatusTable();
    updateMaintenanceChart();
}

async function loadDashboardData() {
    // Load from localStorage if available
    // In production, this could also fetch from API
    try {
        const savedData = localStorage.getItem('biofouling_dashboard_data');
        if (savedData) {
            dashboardData = JSON.parse(savedData);
            // Ensure predictions are limited to 100 (safety check)
            if (dashboardData.predictions && dashboardData.predictions.length > 100) {
                dashboardData.predictions = dashboardData.predictions.slice(-100);
                localStorage.setItem('biofouling_dashboard_data', JSON.stringify(dashboardData));
            }
        } else {
            // Try loading from predictions
            const predictions = localStorage.getItem('biofouling_predictions');
            if (predictions) {
                const preds = JSON.parse(predictions);
                // Limit to 100 (safety check)
                dashboardData.predictions = preds.length > 100 ? preds.slice(-100) : preds;
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
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
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
        totalSavingsEl.textContent = formatCurrency(savings, 'BRL');
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
                <td colspan="3" style="text-align: center; padding: 20px; color: #4D4D4D;">
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
        
        const statusCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status-badge status-${getStatusClass(ship.riskCategory)}`;
        badge.textContent = getStatusText(ship.riskCategory);
        statusCell.appendChild(badge);
        
        row.appendChild(nameCell);
        row.appendChild(locationCell);
        row.appendChild(statusCell);
        
        tbody.appendChild(row);
    });
}

function getStatusClass(riskCategory) {
    const mapping = {
        'Low': 'ok',
        'Medium': 'maintenance',
        'High': 'late',
        'Critical': 'late'
    };
    return mapping[riskCategory] || 'maintenance';
}

function getStatusText(riskCategory) {
    const mapping = {
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
    const symbol = currency === 'BRL' ? 'R$' : 'US$';
    return `${symbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function showError(message) {
    const errorDiv = UIComponents.createErrorMessage(message, 'error');
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
    }
});

function saveDashboardData() {
    try {
        localStorage.setItem('biofouling_dashboard_data', JSON.stringify(dashboardData));
    } catch (error) {
        console.error('Error saving dashboard data:', error);
    }
}

