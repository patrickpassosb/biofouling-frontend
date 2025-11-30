// UI Components Module
// Load constants
const CURRENCY_CODES = typeof CURRENCY_CODES !== 'undefined' ? CURRENCY_CODES : { BRL: 'BRL', USD: 'USD' };
const CURRENCY_SYMBOLS = typeof CURRENCY_SYMBOLS !== 'undefined' ? CURRENCY_SYMBOLS : { BRL: 'R$', USD: 'US$' };

class UIComponents {
    /**
     * Create loading spinner
     */
    static createSpinner(size = '40px') {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            width: ${size};
            height: ${size};
            border: 4px solid #E9E9E9;
            border-top: 4px solid #1A932E;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        `;
        
        // Add animation if not already added
        if (!document.getElementById('spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'spinner-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        return spinner;
    }

    /**
     * Create error message component
     */
    static createErrorMessage(message, type = 'error') {
        const errorDiv = document.createElement('div');
        errorDiv.className = `error-message error-${type}`;
        errorDiv.style.cssText = `
            padding: 12px 16px;
            border-radius: 8px;
            margin: 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        `;
        
        if (type === 'error') {
            errorDiv.style.backgroundColor = '#FFEBEE';
            errorDiv.style.color = '#C62828';
            errorDiv.style.border = '1px solid #EF5350';
        } else if (type === 'warning') {
            errorDiv.style.backgroundColor = '#FFF3E0';
            errorDiv.style.color = '#E65100';
            errorDiv.style.border = '1px solid #FFA726';
        } else {
            errorDiv.style.backgroundColor = '#E8F5E9';
            errorDiv.style.color = '#2E7D32';
            errorDiv.style.border = '1px solid #1A932E';
        }
        
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'check_circle';
        icon.style.fontSize = '20px';
        
        const text = document.createElement('span');
        text.textContent = message;
        
        errorDiv.appendChild(icon);
        errorDiv.appendChild(text);
        
        return errorDiv;
    }

    /**
     * Display impact analysis results
     * SECURITY: Uses createElement/textContent instead of innerHTML to prevent XSS
     */
    static displayImpactAnalysis(impact, container) {
        // Clear container
        container.innerHTML = '';
        
        if (!impact) {
            const noData = document.createElement('p');
            noData.textContent = 'Nenhuma análise de impacto disponível.';
            container.appendChild(noData);
            return;
        }

        // Use constants for currency codes
        const currency = impact.preferred_currency || CURRENCY_CODES.BRL;
        const currencySymbol = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS[CURRENCY_CODES.BRL];
        
        const totalCost = currency === CURRENCY_CODES.BRL ? impact.total_cost_brl : impact.total_cost_usd;
        const extraCost = currency === CURRENCY_CODES.BRL ? impact.extra_cost_brl : impact.extra_cost_usd;
        const euEtsCost = currency === CURRENCY_CODES.BRL ? impact.eu_ets_cost_brl : impact.eu_ets_cost_usd;

        // Create main container
        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'impact-analysis';

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Análise de Impacto';
        analysisDiv.appendChild(title);

        // Helper function to create metric item
        const createMetricItem = (label, value, isHighlight = false) => {
            const item = document.createElement('div');
            item.className = isHighlight ? 'metric-item highlight' : 'metric-item';
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'metric-label';
            labelSpan.textContent = label;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'metric-value';
            valueSpan.textContent = value;
            
            item.appendChild(labelSpan);
            item.appendChild(valueSpan);
            return item;
        };

        // Helper function to create section
        const createSection = (titleText, iconName, metrics) => {
            const section = document.createElement('section');
            section.className = 'impact-section';
            
            const h4 = document.createElement('h4');
            const icon = document.createElement('span');
            icon.className = 'material-icons';
            icon.textContent = iconName;
            h4.appendChild(icon);
            h4.appendChild(document.createTextNode(' ' + titleText));
            section.appendChild(h4);
            
            const metricsDiv = document.createElement('div');
            metricsDiv.className = 'impact-metrics';
            metrics.forEach(metric => {
                metricsDiv.appendChild(createMetricItem(metric.label, metric.value, metric.highlight));
            });
            section.appendChild(metricsDiv);
            
            return section;
        };

        // Power Section
        analysisDiv.appendChild(createSection('Potência', 'speed', [
            { label: 'Base (casco limpo):', value: `${impact.base_power_kw.toLocaleString('pt-BR')} kW` },
            { label: 'Com Fouling:', value: `${impact.fouled_power_kw.toLocaleString('pt-BR')} kW` },
            { label: 'Aumento:', value: `+${impact.delta_power_percent.toFixed(1)}% (+${impact.delta_power_kw.toLocaleString('pt-BR')} kW)`, highlight: true }
        ]));

        // Fuel Section
        analysisDiv.appendChild(createSection('Combustível', 'local_gas_station', [
            { label: 'Consumo Base:', value: `${impact.base_fuel_tons.toFixed(2)} toneladas` },
            { label: 'Consumo Extra:', value: `${impact.extra_fuel_tons.toFixed(2)} toneladas` },
            { label: 'Aumento:', value: `+${impact.extra_fuel_percent.toFixed(1)}%`, highlight: true }
        ]));

        // Costs Section
        analysisDiv.appendChild(createSection(`Custos (${currency})`, 'attach_money', [
            { label: 'OPEX:', value: `${currencySymbol} ${extraCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
            { label: 'EU ETS:', value: `${currencySymbol} ${euEtsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
            { label: 'Total:', value: `${currencySymbol} ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, highlight: true }
        ]));

        // CO₂ Section
        analysisDiv.appendChild(createSection('Emissões', 'cloud', [
            { label: 'CO₂ Extra:', value: `${impact.extra_co2_tons.toFixed(2)} toneladas`, highlight: true }
        ]));

        // Metadata Section
        const metadataSection = document.createElement('section');
        metadataSection.className = 'impact-metadata';
        
        const createMetadataItem = (label, value) => {
            const item = document.createElement('div');
            item.className = 'metadata-item';
            const strong = document.createElement('strong');
            strong.textContent = label;
            item.appendChild(strong);
            item.appendChild(document.createTextNode(' ' + value));
            return item;
        };

        metadataSection.appendChild(createMetadataItem('Tipo de Biofouling:', impact.biofouling_description || 'N/A'));
        metadataSection.appendChild(createMetadataItem('Tipo de Combustível:', impact.fuel_type || 'N/A'));
        
        if (impact.ks_range_um && Array.isArray(impact.ks_range_um) && impact.ks_range_um.length >= 2) {
            metadataSection.appendChild(createMetadataItem('Rugosidade (ks):', `${impact.ks_range_um[0]} - ${impact.ks_range_um[1]} μm`));
        }
        
        const exchangeRateItem = document.createElement('div');
        exchangeRateItem.className = 'metadata-item';
        const small = document.createElement('small');
        small.textContent = `Taxa de câmbio: ${impact.exchange_rate_used || 'N/A'}`;
        exchangeRateItem.appendChild(small);
        metadataSection.appendChild(exchangeRateItem);
        
        analysisDiv.appendChild(metadataSection);
        container.appendChild(analysisDiv);
    }

    /**
     * Create biofouling level indicator
     */
    static createBiofoulingIndicator(level, riskCategory) {
        const indicator = document.createElement('div');
        indicator.className = `fouling-indicator ${this.getRiskClass(riskCategory)}`;
        
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = this.getRiskIcon(riskCategory);
        
        const text = document.createElement('span');
        text.textContent = this.getRiskText(level, riskCategory);
        
        indicator.appendChild(icon);
        indicator.appendChild(text);
        
        return indicator;
    }

    /**
     * Get risk class name
     */
    static getRiskClass(riskCategory) {
        const mapping = typeof RISK_CATEGORY_MAPPINGS !== 'undefined' && RISK_CATEGORY_MAPPINGS?.class
            ? RISK_CATEGORY_MAPPINGS.class
            : {
                'Low': 'clean',
                'Medium': 'moderate',
                'High': 'high',
                'Critical': 'critical'
            };
        return mapping[riskCategory] || 'moderate';
    }

    /**
     * Get risk icon
     */
    static getRiskIcon(riskCategory) {
        const mapping = typeof RISK_CATEGORY_MAPPINGS !== 'undefined' && RISK_CATEGORY_MAPPINGS?.icon
            ? RISK_CATEGORY_MAPPINGS.icon
            : {
                'Low': 'check_circle',
                'Medium': 'warning',
                'High': 'warning',
                'Critical': 'error'
            };
        return mapping[riskCategory] || 'warning';
    }

    /**
     * Get risk text
     */
    static getRiskText(level, riskCategory) {
        const levelText = typeof BIOFOULING_LEVEL_DESCRIPTIONS !== 'undefined'
            ? BIOFOULING_LEVEL_DESCRIPTIONS
            : {
                0: 'Hidraulicamente Liso',
                1: 'Slime Leve / Biofilme',
                2: 'Incrustação Calcária Média',
                3: 'Incrustação Calcária Pesada'
            };
        
        const levelDesc = levelText[level] || `Nível ${level}`;
        return `Nível ${level} - ${levelDesc} (${riskCategory})`;
    }

    /**
     * Create form field with label
     */
    static createFormField(id, label, type = 'text', placeholder = '', required = false, value = '') {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-field';
        
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        if (required) {
            const requiredMark = document.createElement('span');
            requiredMark.textContent = ' *';
            requiredMark.style.color = '#EF5350';
            labelEl.appendChild(requiredMark);
        }
        
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.name = id;
        input.placeholder = placeholder;
        input.required = required;
        input.value = value;
        
        fieldGroup.appendChild(labelEl);
        fieldGroup.appendChild(input);
        
        return fieldGroup;
    }

    /**
     * Create select field
     */
    static createSelectField(id, label, options, required = false, value = '') {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-field';
        
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        if (required) {
            const requiredMark = document.createElement('span');
            requiredMark.textContent = ' *';
            requiredMark.style.color = '#EF5350';
            labelEl.appendChild(requiredMark);
        }
        
        const select = document.createElement('select');
        select.id = id;
        select.name = id;
        select.required = required;
        
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            if (option.value === value) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });
        
        fieldGroup.appendChild(labelEl);
        fieldGroup.appendChild(select);
        
        return fieldGroup;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIComponents;
}

