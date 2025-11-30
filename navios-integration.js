// navios-integration.js - Integração da página de análise de biofouling

let analysisData = [];
let filteredData = [];

/**
 * Inicializa a página de análise
 */
async function initAnalysisPage() {
    try {
        // Carregar dados
        analysisData = await loadAnalysisData();
        filteredData = [...analysisData];

        if (analysisData.length === 0) {
            showError('Nenhum dado de análise encontrado.');
            return;
        }

        // Calcular e exibir estatísticas
        const stats = calculateAggregatedStats(analysisData);
        updateSummaryCards(stats);
        updateMLBanner(stats, analysisData);

        // Criar visualizações
        createVisualizations(analysisData, stats);

        // Preencher tabela
        populateEventsTable(analysisData);

        // Configurar filtros e busca
        setupFilters();

    } catch (error) {
        console.error('Erro ao inicializar página de análise:', error);
        showError('Erro ao carregar dados de análise.');
    }
}

/**
 * Atualiza os cards de resumo com as estatísticas
 */
function updateSummaryCards(stats) {
    // Combustível total
    document.getElementById('totalFuelDisplay').textContent = formatNumber(stats.totalFuelTons, 2);

    // Custo total
    document.getElementById('totalCostBRLDisplay').textContent = formatCurrency(stats.totalCostBRL);
    document.getElementById('totalCostUSDDisplay').textContent =
        `USD ${formatNumber(stats.totalCostUSD, 2)}`;

    // CO2 total
    document.getElementById('totalCO2Display').textContent = formatNumber(stats.totalCO2Tons, 2);

    // Aumento médio de potência
    document.getElementById('avgPowerDisplay').textContent =
        `${formatNumber(stats.avgPowerIncrease, 1)}%`;

    // Animar cards
    animateCards();
}

/**
 * Atualiza o banner de informações do ML
 */
function updateMLBanner(stats, data) {
    document.getElementById('shipNameDisplay').textContent = stats.shipName;
    document.getElementById('totalEventsDisplay').textContent = stats.totalEvents;

    // Calcular período
    const dates = data.map(e => new Date(e.startGMTDate)).sort((a, b) => a - b);
    const firstDate = dates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const lastDate = dates[dates.length - 1].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    document.getElementById('periodDisplay').textContent = `${firstDate} a ${lastDate}`;
}

/**
 * Cria todas as visualizações
 */
function createVisualizations(data, stats) {
    // Timeline
    const timelineData = formatTimelineData(data);
    const timelineCanvas = document.getElementById('timelineChart');
    if (timelineCanvas) {
        createTimelineChart(timelineCanvas, timelineData);
        animateChartEntry(timelineCanvas);
    }

    // Risk distribution
    const riskData = formatRiskDistribution(stats.riskDistribution);
    const riskCanvas = document.getElementById('riskChart');
    if (riskCanvas) {
        createRiskDonutChart(riskCanvas, riskData);
        animateChartEntry(riskCanvas);
    }

    // Cost bars
    const costCanvas = document.getElementById('costChart');
    if (costCanvas) {
        createCostBarsChart(costCanvas, timelineData, 10);
        animateChartEntry(costCanvas);
    }
}

/**
 * Preenche a tabela de eventos
 */
function populateEventsTable(data) {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #4D4D4D;">
                    Nenhum evento encontrado.
                </td>
            </tr>
        `;
        return;
    }

    // Ordenar por data (mais recente primeiro)
    const sortedData = [...data].sort((a, b) =>
        new Date(b.startGMTDate) - new Date(a.startGMTDate)
    );

    sortedData.forEach((event, index) => {
        const row = document.createElement('tr');
        row.className = 'table-row-animated';
        row.style.animationDelay = `${Math.min(index * 0.05, 1)}s`;

        const riskColor = getRiskColor(event.Risk_Category);
        const biofoulingColor = getBiofoulingColor(event.Biofouling_Level);

        row.innerHTML = `
            <td>${formatDate(event.startGMTDate)}</td>
            <td>${event.sessionId}</td>
            <td>
                <span class="level-badge" style="background-color: ${biofoulingColor};">
                    ${event.Biofouling_Level}
                </span>
            </td>
            <td>
                <span class="risk-badge" style="background-color: ${riskColor};">
                    ${event.Risk_Category}
                </span>
            </td>
            <td class="action-cell">${event.Action}</td>
            <td>${formatNumber(event.Extra_Fuel_Tons, 2)}</td>
            <td>${formatCurrency(event.Total_Cost_BRL)}</td>
            <td>${formatNumber(event.Extra_CO2_Tons, 2)}</td>
            <td>
                <span class="confidence-badge">
                    ${(event.Confidence * 100).toFixed(0)}%
                </span>
            </td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Configura filtros e busca
 */
function setupFilters() {
    // Filtro de risco
    const riskFilter = document.getElementById('riskFilter');
    if (riskFilter) {
        riskFilter.addEventListener('change', (e) => {
            const selectedRisk = e.target.value;

            if (selectedRisk === 'all') {
                filteredData = [...analysisData];
            } else {
                filteredData = analysisData.filter(event =>
                    event.Risk_Category === selectedRisk
                );
            }

            populateEventsTable(filteredData);
        });
    }

    // Busca
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            if (!searchTerm) {
                filteredData = [...analysisData];
            } else {
                filteredData = analysisData.filter(event =>
                    event.startGMTDate.toLowerCase().includes(searchTerm) ||
                    event.sessionId.toString().includes(searchTerm)
                );
            }

            populateEventsTable(filteredData);
        });
    }
}

/**
 * Anima a entrada dos cards
 */
function animateCards() {
    const cards = document.querySelectorAll('.analysis-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

/**
 * Exibe mensagem de erro
 */
function showError(message) {
    const tbody = document.getElementById('eventsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                    <span class="material-icons" style="font-size: 48px; color: #DC143C;">error_outline</span>
                    <p style="margin-top: 10px; color: #DC143C; font-weight: 500;">${message}</p>
                </td>
            </tr>
        `;
    }

    // Limpar cards
    document.getElementById('totalFuelDisplay').textContent = '-';
    document.getElementById('totalCostBRLDisplay').textContent = '-';
    document.getElementById('totalCostUSDDisplay').textContent = '-';
    document.getElementById('totalCO2Display').textContent = '-';
    document.getElementById('avgPowerDisplay').textContent = '-';
    document.getElementById('shipNameDisplay').textContent = '-';
    document.getElementById('totalEventsDisplay').textContent = '0';
    document.getElementById('periodDisplay').textContent = '-';
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalysisPage);
} else {
    initAnalysisPage();
}
