// Data Analysis Module
// Generates insights and metrics from stored predictions

class DataAnalyzer {
    /**
     * Calculate aggregated metrics from predictions
     * Improved with better error handling and data validation
     */
    static calculateAggregatedMetrics(predictions) {
        if (!predictions || predictions.length === 0) {
            return {
                totalExtraFuel: 0,
                totalExtraCostBRL: 0,
                totalExtraCostUSD: 0,
                totalExtraCO2: 0,
                totalExtraPower: 0,
                averageBiofoulingLevel: 0,
                totalPredictions: 0,
                predictionsWithImpact: 0
            };
        }

        let totalExtraFuel = 0;
        let totalExtraCostBRL = 0;
        let totalExtraCostUSD = 0;
        let totalExtraCO2 = 0;
        let totalExtraPower = 0;
        let totalBiofoulingLevel = 0;
        let predictionsWithImpact = 0;
        let validBiofoulingLevels = 0;

        predictions.forEach(pred => {
            // Validate and accumulate biofouling level
            if (typeof pred.biofouling_level === 'number' && 
                pred.biofouling_level >= 0 && pred.biofouling_level <= 3) {
                totalBiofoulingLevel += pred.biofouling_level;
                validBiofoulingLevels++;
            }

            // Process impact analysis if available
            if (pred.impact_analysis && typeof pred.impact_analysis === 'object') {
                const impact = pred.impact_analysis;
                predictionsWithImpact++;

                // Safely parse numeric values with validation
                const extraFuel = this._safeParseFloat(impact.extra_fuel_tons);
                const extraCO2 = this._safeParseFloat(impact.extra_co2_tons);
                const extraPower = this._safeParseFloat(impact.delta_power_kw);
                const costBRL = this._safeParseFloat(impact.total_cost_brl);
                const costUSD = this._safeParseFloat(impact.total_cost_usd);

                totalExtraFuel += extraFuel;
                totalExtraCO2 += extraCO2;
                totalExtraPower += extraPower;
                
                // Always accumulate both currencies (they may both be present)
                totalExtraCostBRL += costBRL;
                totalExtraCostUSD += costUSD;
            }
        });

        return {
            totalExtraFuel: Math.max(0, totalExtraFuel),
            totalExtraCostBRL: Math.max(0, totalExtraCostBRL),
            totalExtraCostUSD: Math.max(0, totalExtraCostUSD),
            totalExtraCO2: Math.max(0, totalExtraCO2),
            totalExtraPower: Math.max(0, totalExtraPower),
            averageBiofoulingLevel: validBiofoulingLevels > 0 
                ? totalBiofoulingLevel / validBiofoulingLevels 
                : 0,
            totalPredictions: predictions.length,
            predictionsWithImpact: predictionsWithImpact
        };
    }

    /**
     * Safely parse float values, handling null, undefined, and invalid numbers
     */
    static _safeParseFloat(value) {
        if (value === null || value === undefined) {
            return 0;
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Get ships by risk category
     */
    static groupShipsByRisk(ships) {
        const groups = {
            Critical: [],
            High: [],
            Medium: [],
            Low: []
        };

        ships.forEach(ship => {
            const category = ship.riskCategory || 'Low';
            if (groups[category]) {
                groups[category].push(ship);
            }
        });

        return groups;
    }

    /**
     * Calculate fleet status proportions
     */
    static calculateFleetProportions(ships) {
        if (!ships || ships.length === 0) {
            return {
                clean: 0,
                dirty: 0,
                maintenance: 0
            };
        }

        const groups = this.groupShipsByRisk(ships);
        const total = ships.length;

        return {
            clean: (groups.Low.length / total) * 100,
            dirty: ((groups.High.length + groups.Critical.length) / total) * 100,
            maintenance: (groups.Medium.length / total) * 100
        };
    }

    /**
     * Get top priority ships (highest impact)
     */
    static getTopPriorityShips(predictions, limit = 5) {
        if (!predictions || predictions.length === 0) {
            return [];
        }

        // Filter predictions with impact analysis
        const withImpact = predictions
            .filter(pred => pred.impact_analysis)
            .map(pred => ({
                ship_id: pred.ship_id,
                biofouling_level: pred.biofouling_level,
                risk_category: pred.risk_category,
                impact: pred.impact_analysis,
                timestamp: pred.timestamp,
                // Calculate priority score (weighted by cost and level)
                priorityScore: (pred.impact_analysis.total_cost_brl || 0) * (pred.biofouling_level + 1)
            }))
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .slice(0, limit);

        return withImpact;
    }

    /**
     * Calculate biofouling level distribution
     */
    static calculateLevelDistribution(predictions) {
        const distribution = {
            0: 0,
            1: 0,
            2: 0,
            3: 0
        };

        predictions.forEach(pred => {
            const level = pred.biofouling_level || 0;
            if (distribution.hasOwnProperty(level)) {
                distribution[level]++;
            }
        });

        return distribution;
    }

    /**
     * Calculate potential savings if cleaning was done
     */
    static calculatePotentialSavings(predictions) {
        const metrics = this.calculateAggregatedMetrics(predictions);
        
        return {
            fuelSaved: metrics.totalExtraFuel,
            costSavedBRL: metrics.totalExtraCostBRL,
            costSavedUSD: metrics.totalExtraCostUSD,
            co2Avoided: metrics.totalExtraCO2,
            powerReduction: metrics.totalExtraPower
        };
    }

    /**
     * Get average speed from predictions
     */
    static calculateAverageSpeed(predictions) {
        if (!predictions || predictions.length === 0) {
            return 0;
        }

        // Note: Speed is not in prediction result, would need to be stored
        // For now, return a default or calculate from available data
        // This would ideally come from voyage data if stored
        return 15.0; // Default fallback
    }

    /**
     * Generate insights and recommendations
     */
    static generateInsights(predictions, ships) {
        const metrics = this.calculateAggregatedMetrics(predictions);
        const priorityShips = this.getTopPriorityShips(predictions, 3);
        const proportions = this.calculateFleetProportions(ships);
        const levelDistribution = this.calculateLevelDistribution(predictions);

        const insights = {
            summary: {
                totalShips: ships.length,
                totalPredictions: metrics.totalPredictions,
                averageBiofoulingLevel: metrics.averageBiofoulingLevel.toFixed(1),
                fleetHealth: proportions.clean >= 50 ? 'Boa' : proportions.dirty >= 30 ? 'Atenção' : 'Crítica'
            },
            impact: {
                totalExtraFuel: metrics.totalExtraFuel.toFixed(2),
                totalExtraCostBRL: metrics.totalExtraCostBRL.toFixed(2),
                totalExtraCostUSD: metrics.totalExtraCostUSD.toFixed(2),
                totalExtraCO2: metrics.totalExtraCO2.toFixed(2),
                totalExtraPower: metrics.totalExtraPower.toFixed(0)
            },
            priorityShips: priorityShips.map(ship => ({
                name: ship.ship_id,
                level: ship.biofouling_level,
                risk: ship.risk_category,
                estimatedCost: ship.impact.total_cost_brl || 0,
                recommendation: ship.risk_category === 'Critical' ? 'Limpeza imediata' :
                               ship.risk_category === 'High' ? 'Limpeza em 1 mês' :
                               ship.risk_category === 'Medium' ? 'Inspeção em 3 meses' :
                               'Monitoramento'
            })),
            distribution: levelDistribution,
            proportions: proportions,
            recommendations: this.generateRecommendations(metrics, proportions, priorityShips)
        };

        return insights;
    }

    /**
     * Generate actionable recommendations
     */
    static generateRecommendations(metrics, proportions, priorityShips) {
        const recommendations = [];

        if (proportions.dirty > 30) {
            recommendations.push({
                type: 'urgent',
                title: 'Alta proporção de navios com biofouling',
                message: `${proportions.dirty.toFixed(0)}% da frota apresenta níveis altos de biofouling. Considere um programa de limpeza preventiva.`,
                action: 'Ver navios prioritários'
            });
        }

        if (metrics.totalExtraCostBRL > 100000) {
            recommendations.push({
                type: 'cost',
                title: 'Custos elevados devido ao biofouling',
                message: `Custo acumulado estimado em R$ ${metrics.totalExtraCostBRL.toFixed(2)}. Limpezas preventivas podem reduzir significativamente estes custos.`,
                action: 'Calcular economia potencial'
            });
        }

        if (priorityShips.length > 0 && priorityShips[0].risk_category === 'Critical') {
            recommendations.push({
                type: 'critical',
                title: 'Navios críticos identificados',
                message: `${priorityShips.length} navio(s) requerem atenção imediata. Limpeza urgente recomendada.`,
                action: 'Ver detalhes'
            });
        }

        return recommendations;
    }

    /**
     * Calculate maintenance timeline from predictions
     */
    static calculateMaintenanceTimeline(predictions) {
        if (!predictions || predictions.length === 0) {
            return [];
        }

        // Group predictions by ship and find most recent
        const shipLatest = {};
        predictions.forEach(pred => {
            if (!shipLatest[pred.ship_id] || 
                new Date(pred.timestamp) > new Date(shipLatest[pred.ship_id].timestamp)) {
                shipLatest[pred.ship_id] = pred;
            }
        });

        // Calculate days since last cleaning and estimate next maintenance
        const timeline = Object.values(shipLatest).map(pred => {
            const daysSinceCleaning = pred.voyageData?.DiasDesdeUltimaLimpeza || 0;
            const level = pred.biofouling_level || 0;
            
            // Estimate next maintenance based on level
            let daysUntilMaintenance = 0;
            if (level === 0) daysUntilMaintenance = 180 - daysSinceCleaning;
            else if (level === 1) daysUntilMaintenance = 90 - daysSinceCleaning;
            else if (level === 2) daysUntilMaintenance = 30 - daysSinceCleaning;
            else daysUntilMaintenance = 0; // Immediate

            return {
                ship_id: pred.ship_id,
                currentLevel: level,
                riskCategory: pred.risk_category,
                daysSinceCleaning: daysSinceCleaning,
                daysUntilMaintenance: Math.max(0, daysUntilMaintenance),
                status: daysUntilMaintenance <= 0 ? 'urgent' : 
                       daysUntilMaintenance <= 30 ? 'soon' : 'scheduled'
            };
        });

        return timeline.sort((a, b) => a.daysUntilMaintenance - b.daysUntilMaintenance);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataAnalyzer;
}

