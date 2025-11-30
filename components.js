// UI Components Module
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
     */
    static displayImpactAnalysis(impact, container) {
        if (!impact) {
            container.innerHTML = '<p>Nenhuma análise de impacto disponível.</p>';
            return;
        }

        const currency = impact.preferred_currency || 'BRL';
        const currencySymbol = currency === 'BRL' ? 'R$' : 'US$';
        
        const totalCost = currency === 'BRL' ? impact.total_cost_brl : impact.total_cost_usd;
        const extraCost = currency === 'BRL' ? impact.extra_cost_brl : impact.extra_cost_usd;
        const euEtsCost = currency === 'BRL' ? impact.eu_ets_cost_brl : impact.eu_ets_cost_usd;

        container.innerHTML = `
            <div class="impact-analysis">
                <h3>Análise de Impacto</h3>
                
                <!-- Power Section -->
                <section class="impact-section">
                    <h4>
                        <span class="material-icons">speed</span>
                        Potência
                    </h4>
                    <div class="impact-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Base (casco limpo):</span>
                            <span class="metric-value">${impact.base_power_kw.toLocaleString('pt-BR')} kW</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Com Fouling:</span>
                            <span class="metric-value">${impact.fouled_power_kw.toLocaleString('pt-BR')} kW</span>
                        </div>
                        <div class="metric-item highlight">
                            <span class="metric-label">Aumento:</span>
                            <span class="metric-value">+${impact.delta_power_percent.toFixed(1)}% (+${impact.delta_power_kw.toLocaleString('pt-BR')} kW)</span>
                        </div>
                    </div>
                </section>

                <!-- Fuel Section -->
                <section class="impact-section">
                    <h4>
                        <span class="material-icons">local_gas_station</span>
                        Combustível
                    </h4>
                    <div class="impact-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Consumo Base:</span>
                            <span class="metric-value">${impact.base_fuel_tons.toFixed(2)} toneladas</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Consumo Extra:</span>
                            <span class="metric-value">${impact.extra_fuel_tons.toFixed(2)} toneladas</span>
                        </div>
                        <div class="metric-item highlight">
                            <span class="metric-label">Aumento:</span>
                            <span class="metric-value">+${impact.extra_fuel_percent.toFixed(1)}%</span>
                        </div>
                    </div>
                </section>

                <!-- Costs Section -->
                <section class="impact-section">
                    <h4>
                        <span class="material-icons">attach_money</span>
                        Custos (${currency})
                    </h4>
                    <div class="impact-metrics">
                        <div class="metric-item">
                            <span class="metric-label">OPEX:</span>
                            <span class="metric-value">${currencySymbol} ${extraCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">EU ETS:</span>
                            <span class="metric-value">${currencySymbol} ${euEtsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="metric-item highlight">
                            <span class="metric-label">Total:</span>
                            <span class="metric-value">${currencySymbol} ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </section>

                <!-- CO₂ Section -->
                <section class="impact-section">
                    <h4>
                        <span class="material-icons">cloud</span>
                        Emissões
                    </h4>
                    <div class="impact-metrics">
                        <div class="metric-item highlight">
                            <span class="metric-label">CO₂ Extra:</span>
                            <span class="metric-value">${impact.extra_co2_tons.toFixed(2)} toneladas</span>
                        </div>
                    </div>
                </section>

                <!-- Metadata Section -->
                <section class="impact-metadata">
                    <div class="metadata-item">
                        <strong>Tipo de Biofouling:</strong> ${impact.biofouling_description}
                    </div>
                    <div class="metadata-item">
                        <strong>Tipo de Combustível:</strong> ${impact.fuel_type}
                    </div>
                    <div class="metadata-item">
                        <strong>Rugosidade (ks):</strong> ${impact.ks_range_um[0]} - ${impact.ks_range_um[1]} μm
                    </div>
                    <div class="metadata-item">
                        <small>Taxa de câmbio: ${impact.exchange_rate_used}</small>
                    </div>
                </section>
            </div>
        `;
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
        const mapping = {
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
        const mapping = {
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
        const levelText = {
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

