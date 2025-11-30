// API Configuration
const API_CONFIG = {
    // Production API URL
    PRODUCTION: 'https://biofouling-api-454735405258.us-central1.run.app',
    
    // Development API URL (local)
    DEVELOPMENT: 'http://localhost:8000',
    
    // Detect environment
    getBaseURL() {
        // Check if we're in development (localhost)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return this.DEVELOPMENT;
        }
        return this.PRODUCTION;
    },
    
    // API endpoints
    endpoints: {
        health: '/health',
        predict: '/api/v1/predict',
        predictWithImpact: '/api/v1/predict/with-impact',
        predictBatch: '/api/v1/predict/batch'
    },
    
    // Default values
    defaults: {
        fuelType: 'LSHFO',
        currency: 'BRL'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}

