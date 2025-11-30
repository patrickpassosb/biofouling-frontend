// Application Constants
// Only fixed values that don't change should be here
// Dynamic values from API should NOT be constants

// Storage Configuration
const STORAGE_CONFIG = {
    MAX_PREDICTIONS: 100  // Fixed storage limit configuration
};

// Currency Codes - ISO standard codes (fixed)
const CURRENCY_CODES = {
    BRL: 'BRL',
    USD: 'USD'
};

// Currency Symbols - Fixed conventions
const CURRENCY_SYMBOLS = {
    BRL: 'R$',
    USD: 'US$'
};

// Fuel Types - Industry standard types (fixed enums)
const FUEL_TYPES = {
    LSHFO: 'LSHFO',
    ULSMGO: 'ULSMGO',
    LSMGO: 'LSMGO',
    VLSHFO: 'VLSHFO',
    VLSFO: 'VLSFO',
    MGO: 'MGO',
    HFO: 'HFO',
    LNG: 'LNG'
};

// API Configuration Constants
const API_CONFIG_CONSTANTS = {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000
};

// Risk Category Mappings - Fixed mappings
const RISK_CATEGORY_MAPPINGS = {
    class: {
        'Low': 'clean',
        'Medium': 'moderate',
        'High': 'high',
        'Critical': 'critical'
    },
    icon: {
        'Low': 'check_circle',
        'Medium': 'warning',
        'High': 'warning',
        'Critical': 'error'
    },
    status: {
        'Low': 'ok',
        'Medium': 'maintenance',
        'High': 'late',
        'Critical': 'late'
    },
    text: {
        'Low': 'Limpo',
        'Medium': 'Moderado',
        'High': 'Suja',
        'Critical': 'Suja'
    }
};

// Biofouling Level Descriptions - Fixed descriptions
const BIOFOULING_LEVEL_DESCRIPTIONS = {
    0: 'Hidraulicamente Liso',
    1: 'Slime Leve / Biofilme',
    2: 'Incrustação Calcária Média',
    3: 'Incrustação Calcária Pesada'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORAGE_CONFIG,
        CURRENCY_CODES,
        CURRENCY_SYMBOLS,
        FUEL_TYPES,
        API_CONFIG_CONSTANTS,
        RISK_CATEGORY_MAPPINGS,
        BIOFOULING_LEVEL_DESCRIPTIONS
    };
}

