// analise-charts.js - Módulo para criar visualizações de dados usando canvas

/**
 * Cria gráfico de linha temporal mostrando níveis de biofouling ao longo do tempo
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @param {Array} timelineData - Dados formatados para timeline
 */
function createTimelineChart(canvas, timelineData) {
    if (!canvas || !timelineData || timelineData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2; // Retina display
    const height = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const padding = { top: 20, right: 40, bottom: 60, left: 60 };
    const chartWidth = width / 2 - padding.left - padding.right;
    const chartHeight = height / 2 - padding.top - padding.bottom;

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Configurações
    const maxLevel = 3;
    const minLevel = 0;
    const dataPoints = timelineData.length;

    // Desenhar grid
    ctx.strokeStyle = '#E9E9E9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
        const y = padding.top + (chartHeight / 3) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Labels do eixo Y
        ctx.fillStyle = '#4D4D4D';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText((3 - i).toString(), padding.left - 10, y + 4);
    }

    // Desenhar linha
    ctx.strokeStyle = '#1A932E';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    timelineData.forEach((point, index) => {
        const x = padding.left + (chartWidth / (dataPoints - 1)) * index;
        const y = padding.top + chartHeight - (point.biofoulingLevel / maxLevel) * chartHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Desenhar pontos
    timelineData.forEach((point, index) => {
        const x = padding.left + (chartWidth / (dataPoints - 1)) * index;
        const y = padding.top + chartHeight - (point.biofoulingLevel / maxLevel) * chartHeight;

        ctx.fillStyle = getBiofoulingColor(point.biofoulingLevel);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Borda branca
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Labels do eixo X (datas)
    ctx.fillStyle = '#4D4D4D';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';

    // Mostrar apenas algumas datas para não poluir
    const step = Math.ceil(dataPoints / 5);
    timelineData.forEach((point, index) => {
        if (index % step === 0 || index === dataPoints - 1) {
            const x = padding.left + (chartWidth / (dataPoints - 1)) * index;
            const y = padding.top + chartHeight + 20;
            const dateStr = point.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(dateStr, 0, 0);
            ctx.restore();
        }
    });

    // Título do eixo Y
    ctx.save();
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4D4D4D';
    ctx.font = 'bold 12px Inter';
    ctx.fillText('Nível de Biofouling', 0, 0);
    ctx.restore();
}

/**
 * Cria gráfico de donut mostrando distribuição de categorias de risco
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @param {Array} riskData - Dados formatados de distribuição de risco
 */
function createRiskDonutChart(canvas, riskData) {
    if (!canvas || !riskData || riskData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const centerX = width / 4;
    const centerY = height / 4;
    const radius = Math.min(width, height) / 4 - 40;
    const innerRadius = radius * 0.6;

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Calcular total
    const total = riskData.reduce((sum, item) => sum + item.value, 0);

    // Desenhar segmentos
    let currentAngle = -Math.PI / 2;
    riskData.forEach((item, index) => {
        const sliceAngle = (item.value / total) * Math.PI * 2;

        // Desenhar segmento
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();

        // Borda branca
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        currentAngle += sliceAngle;
    });

    // Desenhar centro branco
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Texto central
    ctx.fillStyle = '#1A932E';
    ctx.font = 'bold 24px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, centerX, centerY - 10);

    ctx.fillStyle = '#4D4D4D';
    ctx.font = '12px Inter';
    ctx.fillText('Eventos', centerX, centerY + 10);

    // Legenda
    const legendX = centerX + radius + 40;
    const legendY = centerY - (riskData.length * 25) / 2;

    riskData.forEach((item, index) => {
        const y = legendY + index * 25;

        // Quadrado de cor
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, y - 8, 16, 16);

        // Texto
        ctx.fillStyle = '#4D4D4D';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`${item.label}: ${item.value}`, legendX + 24, y + 4);
    });
}

/**
 * Cria gráfico de barras horizontais mostrando custos por evento
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @param {Array} data - Dados de eventos (limitado aos top N)
 * @param {number} maxBars - Número máximo de barras a exibir
 */
function createCostBarsChart(canvas, data, maxBars = 10) {
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Ordenar por custo e pegar top N
    const sortedData = [...data]
        .sort((a, b) => b.costBRL - a.costBRL)
        .slice(0, maxBars);

    const padding = { top: 20, right: 100, bottom: 30, left: 80 };
    const chartWidth = width / 2 - padding.left - padding.right;
    const chartHeight = height / 2 - padding.top - padding.bottom;
    const barHeight = chartHeight / sortedData.length - 10;

    const maxCost = Math.max(...sortedData.map(d => d.costBRL));

    sortedData.forEach((item, index) => {
        const y = padding.top + index * (barHeight + 10);
        const barWidth = (item.costBRL / maxCost) * chartWidth;

        // Barra
        const color = getRiskColor(item.riskCategory);
        ctx.fillStyle = color;
        ctx.fillRect(padding.left, y, barWidth, barHeight);

        // Label da data
        ctx.fillStyle = '#4D4D4D';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        const dateStr = item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        ctx.fillText(dateStr, padding.left - 5, y + barHeight / 2 + 3);

        // Valor
        ctx.textAlign = 'left';
        const valueStr = formatCurrency(item.costBRL);
        ctx.fillText(valueStr, padding.left + barWidth + 5, y + barHeight / 2 + 3);
    });

    // Título
    ctx.fillStyle = '#4D4D4D';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Top 10 Eventos por Custo (BRL)', width / 4, 15);
}

/**
 * Anima a entrada de um canvas
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 */
function animateChartEntry(canvas) {
    if (!canvas) return;

    canvas.style.opacity = '0';
    canvas.style.transform = 'translateY(20px)';

    setTimeout(() => {
        canvas.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        canvas.style.opacity = '1';
        canvas.style.transform = 'translateY(0)';
    }, 100);
}
