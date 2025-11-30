// API Integration Module
class BiofoulingAPI {
    constructor() {
        this.baseURL = API_CONFIG.getBaseURL();
        this.retryAttempts = 3;
        this.retryDelay = 1000; // milliseconds
    }

    /**
     * Make HTTP request with retry logic
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, mergedOptions);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
                    throw new APIError(
                        errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
                        response.status,
                        errorData
                    );
                }

                return await response.json();
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error instanceof APIError && error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < this.retryAttempts) {
                    await this.sleep(this.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Health check endpoint
     */
    async healthCheck() {
        try {
            return await this.request(API_CONFIG.endpoints.health);
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    /**
     * Simple prediction (without impact analysis)
     */
    async predictSimple(voyageData) {
        try {
            return await this.request(API_CONFIG.endpoints.predict, {
                method: 'POST',
                body: JSON.stringify(voyageData),
            });
        } catch (error) {
            console.error('Prediction failed:', error);
            throw error;
        }
    }

    /**
     * Prediction with impact analysis (recommended)
     */
    async predictWithImpact(voyageData, fuelType = API_CONFIG.defaults.fuelType, currency = API_CONFIG.defaults.currency) {
        try {
            const queryParams = new URLSearchParams({
                fuel_type: fuelType,
                currency: currency
            });
            
            const endpoint = `${API_CONFIG.endpoints.predictWithImpact}?${queryParams}`;
            
            return await this.request(endpoint, {
                method: 'POST',
                body: JSON.stringify(voyageData),
            });
        } catch (error) {
            console.error('Prediction with impact failed:', error);
            throw error;
        }
    }

    /**
     * Batch prediction
     */
    async predictBatch(voyages) {
        try {
            return await this.request(API_CONFIG.endpoints.predictBatch, {
                method: 'POST',
                body: JSON.stringify({ voyages }),
            });
        } catch (error) {
            console.error('Batch prediction failed:', error);
            throw error;
        }
    }

    /**
     * Validate voyage data
     */
    validateVoyageData(data) {
        const required = [
            'shipName', 'speed', 'duration', 'distance', 'beaufortScale',
            'Area_Molhada', 'MASSA_TOTAL_TON', 'TIPO_COMBUSTIVEL_PRINCIPAL',
            'decLatitude', 'decLongitude', 'DiasDesdeUltimaLimpeza'
        ];

        const missing = required.filter(field => data[field] === undefined || data[field] === null || data[field] === '');
        
        if (missing.length > 0) {
            throw new ValidationError(`Campos obrigatórios faltando: ${missing.join(', ')}`);
        }

        // Validate ranges
        if (data.speed < 0 || data.speed > 50) {
            throw new ValidationError('Velocidade deve estar entre 0 e 50 nós');
        }
        
        if (data.beaufortScale < 0 || data.beaufortScale > 12) {
            throw new ValidationError('Escala Beaufort deve estar entre 0 e 12');
        }

        if (data.decLatitude < -90 || data.decLatitude > 90) {
            throw new ValidationError('Latitude deve estar entre -90 e 90');
        }

        if (data.decLongitude < -180 || data.decLongitude > 180) {
            throw new ValidationError('Longitude deve estar entre -180 e 180');
        }

        return true;
    }
}

// Custom Error Classes
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

// Create singleton instance
const api = new BiofoulingAPI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BiofoulingAPI, APIError, ValidationError, api };
}

