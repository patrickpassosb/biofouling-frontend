// analise-data.js - Módulo para carregar e processar dados de análise de biofouling

/**
 * Carrega os dados de análise do arquivo JSON
 * @returns {Promise<Array>} Array com os dados de análise
 */
async function loadAnalysisData() {
    try {
        const response = await fetch('analise_biofouling.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao carregar dados de análise:', error);
        return [];
    }
}

/**
 * Calcula estatísticas agregadas dos dados
 * @param {Array} data - Array de eventos de análise
 * @returns {Object} Objeto com estatísticas agregadas
 */
function calculateAggregatedStats(data) {
    if (!data || data.length === 0) {
        return {
            totalEvents: 0,
            totalFuelTons: 0,
            totalCostUSD: 0,
            totalCostBRL: 0,
            totalCO2Tons: 0,
            avgConfidence: 0,
            avgPowerIncrease: 0,
            riskDistribution: {},
            biofoulingDistribution: {},
            shipName: 'N/A'
        };
    }

    const stats = {
        totalEvents: data.length,
        totalFuelTons: 0,
        totalCostUSD: 0,
        totalCostBRL: 0,
        totalCO2Tons: 0,
        avgConfidence: 0,
        avgPowerIncrease: 0,
        riskDistribution: {},
        biofoulingDistribution: {},
        shipName: data[0].shipName || 'N/A'
    };

    // Calcular totais e distribuições
    data.forEach(event => {
        stats.totalFuelTons += event.Extra_Fuel_Tons || 0;
        stats.totalCostUSD += event.Total_Cost_USD || 0;
        stats.totalCostBRL += event.Total_Cost_BRL || 0;
        stats.totalCO2Tons += event.Extra_CO2_Tons || 0;
        stats.avgConfidence += event.Confidence || 0;
        stats.avgPowerIncrease += event.Power_Increase_Percent || 0;

        // Distribuição de risco
        const risk = event.Risk_Category;
        stats.riskDistribution[risk] = (stats.riskDistribution[risk] || 0) + 1;

        // Distribuição de biofouling
        const level = event.Biofouling_Level;
        stats.biofoulingDistribution[level] = (stats.biofoulingDistribution[level] || 0) + 1;
    });

    // Calcular médias
    stats.avgConfidence = stats.avgConfidence / data.length;
    stats.avgPowerIncrease = stats.avgPowerIncrease / data.length;

    return stats;
}

/**
 * Formata dados para visualização temporal
 * @param {Array} data - Array de eventos de análise
 * @returns {Array} Array formatado para gráficos temporais
 */
function formatTimelineData(data) {
    return data.map(event => ({
        date: new Date(event.startGMTDate),
        dateStr: event.startGMTDate,
        biofoulingLevel: event.Biofouling_Level,
        riskCategory: event.Risk_Category,
        action: event.Action,
        fuelImpact: event.Extra_Fuel_Tons,
        costBRL: event.Total_Cost_BRL,
        co2Impact: event.Extra_CO2_Tons,
        powerIncrease: event.Power_Increase_Percent
    })).sort((a, b) => a.date - b.date);
}

/**
 * Formata dados de distribuição de risco para gráficos
 * @param {Object} riskDistribution - Objeto com contagem por categoria de risco
 * @returns {Array} Array formatado para gráficos de pizza/donut
 */
function formatRiskDistribution(riskDistribution) {
    const colors = {
        'Low': '#1A932E',
        'Medium': '#FFA500',
        'High': '#FF6B00',
        'Critical': '#DC143C'
    };

    return Object.entries(riskDistribution).map(([category, count]) => ({
        label: category,
        value: count,
        color: colors[category] || '#4D4D4D'
    }));
}

/**
 * Formata valor monetário em BRL
 * @param {number} value - Valor numérico
 * @returns {string} Valor formatado
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Formata número com separadores de milhar
 * @param {number} value - Valor numérico
 * @param {number} decimals - Número de casas decimais
 * @returns {string} Valor formatado
 */
function formatNumber(value, decimals = 2) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Formata data para exibição
 * @param {string|Date} date - Data
 * @returns {string} Data formatada
 */
function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
}

/**
 * Obtém cor baseada no nível de biofouling
 * @param {number} level - Nível de biofouling (0-3)
 * @returns {string} Código de cor hexadecimal
 */
function getBiofoulingColor(level) {
    const colors = {
        0: '#1A932E',  // Verde - Limpo
        1: '#90EE90',  // Verde claro - Leve
        2: '#FFA500',  // Laranja - Moderado
        3: '#DC143C'   // Vermelho - Severo
    };
    return colors[level] || '#4D4D4D';
}

/**
 * Obtém cor baseada na categoria de risco
 * @param {string} category - Categoria de risco
 * @returns {string} Código de cor hexadecimal
 */
function getRiskColor(category) {
    const colors = {
        'Low': '#1A932E',
        'Medium': '#FFA500',
        'High': '#FF6B00',
        'Critical': '#DC143C'
    };
    return colors[category] || '#4D4D4D';
}
