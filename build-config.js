const fs = require('fs');
const path = require('path');

// Read environment variables with fallbacks
const config = {
    trial: {
        applicationId: process.env.TRIAL_APP_INSIGHTS_APP_ID || 'YOUR_APPLICATION_ID_HERE',
        apiKey: process.env.TRIAL_APP_INSIGHTS_API_KEY || 'YOUR_API_KEY_HERE',
        queryApiUrl: 'https://api.applicationinsights.io/v1/apps/{appId}/query',
        name: 'Trial'
    },
    live: {
        applicationId: process.env.LIVE_APP_INSIGHTS_APP_ID || 'YOUR_LIVE_APPLICATION_ID',
        apiKey: process.env.LIVE_APP_INSIGHTS_API_KEY || 'YOUR_LIVE_API_KEY',
        queryApiUrl: 'https://api.applicationinsights.io/v1/apps/{appId}/query',
        name: 'Live'
    },
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL) || 300000,
    currentEnvironment: process.env.APP_INSIGHTS_ENVIRONMENT || 'trial'
};

const onPremiseConfig = {
    elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    indexName: process.env.ELASTICSEARCH_INDEX || 'api-monitoring',
    currentCustomer: null,
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL) || 300000
};

// Generate config.js from environment variables
const configJs = `// Application Insights Configuration
// Support for both Trial and Live environments
// This file is auto-generated during build. Do not edit manually.

const APP_INSIGHTS_CONFIG = {
    // Trial Environment Configuration (Current)
    trial: {
        // Application Insights Application ID
        applicationId: '${config.trial.applicationId}',
        
        // Application Insights API Key
        apiKey: '${config.trial.apiKey}',
        
        // Application Insights Query API endpoint
        queryApiUrl: 'https://api.applicationinsights.io/v1/apps/{appId}/query',
        
        // Environment name
        name: '${config.trial.name}'
    },
    
    // Live Environment Configuration (To be configured)
    live: {
        // Application Insights Application ID
        applicationId: '${config.live.applicationId}',
        
        // Application Insights API Key
        apiKey: '${config.live.apiKey}',
        
        // Application Insights Query API endpoint
        queryApiUrl: 'https://api.applicationinsights.io/v1/apps/{appId}/query',
        
        // Environment name
        name: '${config.live.name}'
    },
    
    // Auto-refresh interval in milliseconds (5 minutes = 300000)
    refreshInterval: ${config.refreshInterval},
    
    // Current environment: 'trial' or 'live'
    currentEnvironment: '${config.currentEnvironment}'
};

// On-Premise Configuration
const ON_PREMISE_CONFIG = {
    // Elasticsearch URL (direct connection)
    elasticsearchUrl: '${onPremiseConfig.elasticsearchUrl}',
    
    // Elasticsearch index name
    indexName: '${onPremiseConfig.indexName}',
    
    // Current customer name (used for identification/filtering)
    currentCustomer: null,
    
    // Auto-refresh interval in milliseconds (5 minutes = 300000)
    refreshInterval: ${onPremiseConfig.refreshInterval}
};

// Tenant Configuration
const TENANT_DATA = {
    // Regular Tenants
    1: { name: 'Admin', email: 'admin@ezofis.com' },
    2: { name: 'Seth', email: 'Seth@ezofis.com' },
    3: { name: 'DDL', email: 'alexg@documentdirection.ca' },
    9: { name: 'Vijaysabari', email: 'vijaysabari.m@kodivian.com' },
    11: { name: 'Parthiban', email: 'parthiban.k@ezofis.com' },
    12: { name: 'Armour group', email: 'admin@ezofis.ca' },
    13: { name: 'Kenneth', email: 'kenneth@quanticslt.com' },
    15: { name: 'Mark', email: 'Mark.Reed@dssa.daicel.com' },
    20: { name: 'Arul', email: 'arul.devarajan@ezofis.com' },
    // Trial Tenants
    23: { name: 'Admin', email: 'admin@belltemple.ca' },
    31: { name: 'Legal', email: 'legal.admin@ezofis.com' },
    32: { name: 'Audit Admin', email: 'audit.admin@ezofis.com' },
    34: { name: 'Ruchi', email: 'Ruchi.Agrawal@edelweissmf.com' },
    39: { name: 'Admin', email: 'construction.admin@ezofis.com' },
    42: { name: 'Huimin', email: 'huimin.chong@iforte.com.my' },
    65: { name: 'Goutham', email: 'goutham.kosuru@scienstechnologies.com' },
    66: { name: 'Nandini', email: 'nandinitalasila@gmail.com' },
    67: { name: 'Mortgage', email: 'Mortgage.admin@ezofis.com' },
    71: { name: 'Arif', email: 'arif@zad.qa' },
    72: { name: 'sathiya', email: 'sathiya@ezofis.com' },
    73: { name: 'lohini', email: 'lohini@ezofis.com' },
    74: { name: 'nandini', email: 'nandinitalasala@gmail.com' },
    75: { name: 'RC1', email: 'RC1@RAMCO.US' },
    76: { name: 'Adiena', email: 'adiena@glosev.com' },
    77: { name: 'Gowri', email: 'gowri.9pi@gmail.com' },
    78: { name: 'Admin', email: 'dfms.admin@keralabank.co.in' }
};

// Current selected tenant ID (null = all tenants)
let CURRENT_TENANT_ID = null;

// Helper function to get tenant name by ID
function getTenantName(tenantId) {
    return TENANT_DATA[tenantId]?.name || \`Tenant \${tenantId}\`;
}

// Helper function to get tenant email by ID
function getTenantEmail(tenantId) {
    return TENANT_DATA[tenantId]?.email || '';
}

// Helper function to get current tenant ID
function getCurrentTenantId() {
    return CURRENT_TENANT_ID;
}

// Helper function to set current tenant ID
function setCurrentTenantId(tenantId) {
    CURRENT_TENANT_ID = tenantId;
    // Save to localStorage
    localStorage.setItem('selectedTenantId', tenantId ? tenantId.toString() : null);
}

// Load saved tenant from localStorage
function loadSavedTenant() {
    const savedTenantId = localStorage.getItem('selectedTenantId');
    if (savedTenantId) {
        CURRENT_TENANT_ID = parseInt(savedTenantId);
    }
}

// Current data source mode
let CURRENT_MODE = 'appinsights'; // 'appinsights' or 'onpremise'

// Helper function to get current environment config
function getCurrentEnvironmentConfig() {
    const env = APP_INSIGHTS_CONFIG.currentEnvironment || 'trial';
    return APP_INSIGHTS_CONFIG[env] || APP_INSIGHTS_CONFIG.trial;
}

// Helper function to get the query API URL (Application Insights)
function getQueryApiUrl() {
    const config = getCurrentEnvironmentConfig();
    return config.queryApiUrl.replace('{appId}', config.applicationId);
}

// Helper function to get API headers (Application Insights)
function getApiHeaders() {
    const config = getCurrentEnvironmentConfig();
    return {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
    };
}

// Helper function to get current environment
function getCurrentEnvironment() {
    return APP_INSIGHTS_CONFIG.currentEnvironment || 'trial';
}

// Helper function to set current environment
function setCurrentEnvironment(environment) {
    if (environment === 'trial' || environment === 'live') {
        APP_INSIGHTS_CONFIG.currentEnvironment = environment;
        // Save to localStorage
        localStorage.setItem('appInsightsEnvironment', environment);
    }
}

// Load saved environment from localStorage
function loadSavedEnvironment() {
    const savedEnv = localStorage.getItem('appInsightsEnvironment');
    if (savedEnv === 'trial' || savedEnv === 'live') {
        APP_INSIGHTS_CONFIG.currentEnvironment = savedEnv;
    }
}

// Helper function to get Elasticsearch URL
function getElasticsearchUrl() {
    return ON_PREMISE_CONFIG.elasticsearchUrl;
}

// Helper function to get Elasticsearch index name
function getElasticsearchIndex() {
    return ON_PREMISE_CONFIG.indexName;
}

// Helper function to get current mode
function getCurrentMode() {
    return CURRENT_MODE;
}

// Helper function to set current mode
function setCurrentMode(mode) {
    CURRENT_MODE = mode;
    // Save to localStorage
    localStorage.setItem('monitoringMode', mode);
}

// Helper function to set customer name
function setCustomerName(customerName) {
    ON_PREMISE_CONFIG.currentCustomer = customerName;
    // Save to localStorage
    localStorage.setItem('customerName', customerName);
}

// Load saved mode and customer from localStorage
function loadSavedConfig() {
    const savedMode = localStorage.getItem('monitoringMode');
    const savedCustomer = localStorage.getItem('customerName');
    
    if (savedMode) {
        CURRENT_MODE = savedMode;
    }
    if (savedCustomer) {
        ON_PREMISE_CONFIG.currentCustomer = savedCustomer;
    }
    
    // Load saved tenant
    loadSavedTenant();
    
    // Load saved environment
    loadSavedEnvironment();
}

// Initialize on load
loadSavedConfig();
`;

// Write the generated config.js
fs.writeFileSync(path.join(__dirname, 'config.js'), configJs, 'utf8');
console.log('✅ config.js generated successfully from environment variables');

