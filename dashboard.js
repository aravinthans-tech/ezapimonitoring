// Dashboard JavaScript - Application Insights Data Fetching and Visualization

// Chart instances
let requestVolumeChart = null;
let statusCodeChart = null;
let responseTimeChart = null;
let topEndpointsChart = null;

// Auto-refresh timer
let refreshTimer = null;

// Logs filter state
let logsFilterStartTime = null;
let logsFilterEndTime = null;

// Store original table data for filtering
let originalRecentRequestsData = null;
let originalRecentExceptionsData = null;
let recentExceptionsFullData = []; // Store full exception data for modal
let originalSlowestEndpointsData = null;
let originalMostUsedEndpointsData = null;

// Store data availability state
let hasRecentData = true; // Default to true, will be detected
let lastAvailableDataTime = null;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Check if demo mode should be used
function isDemoMode() {
    const config = getCurrentEnvironmentConfig();
    return !config.applicationId || config.applicationId === 'YOUR_APPLICATION_ID_HERE' || config.applicationId === 'YOUR_LIVE_APPLICATION_ID' ||
           !config.apiKey || config.apiKey === 'YOUR_API_KEY_HERE' || config.apiKey === 'YOUR_LIVE_API_KEY';
}

// Initialize dashboard
function initializeDashboard() {
    // Check if configuration is set - if not, use demo mode
    if (isDemoMode()) {
        // Show demo mode notification
        const demoNotification = document.createElement('div');
        demoNotification.className = 'bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded';
        demoNotification.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <strong class="font-bold">Demo Mode:</strong>
                    <span>Showing sample data. Configure Application Insights credentials in config.js to see real data.</span>
                </div>
                <button id="closeDemo" class="text-blue-700 hover:text-blue-900">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        const container = document.querySelector('.container');
        const header = container.querySelector('header');
        if (header && header.nextSibling) {
            container.insertBefore(demoNotification, header.nextSibling);
        } else {
            container.insertBefore(demoNotification, container.firstChild);
        }
        
        document.getElementById('closeDemo').addEventListener('click', function() {
            demoNotification.remove();
        });
    }

    // Set up mode selector
    const dataSourceMode = document.getElementById('dataSourceMode');
    const customerNameContainer = document.getElementById('customerNameContainer');
    const customerNameInput = document.getElementById('customerName');
    const connectOnPremiseBtn = document.getElementById('connectOnPremise');
    const appInsightsEnvironmentContainer = document.getElementById('appInsightsEnvironmentContainer');
    const appInsightsEnvironment = document.getElementById('appInsightsEnvironment');
    const environmentInfo = document.getElementById('environmentInfo');
    const environmentName = document.getElementById('environmentName');
    
    // Initialize Application Insights environment selector
    function initializeAppInsightsEnvironment() {
        if (!appInsightsEnvironment) return;
        
        // Load saved environment
        const savedEnv = getCurrentEnvironment() || 'trial';
        appInsightsEnvironment.value = savedEnv;
        updateEnvironmentInfo(savedEnv);
        
        // Handle environment change
        appInsightsEnvironment.addEventListener('change', function(e) {
            const env = e.target.value;
            setCurrentEnvironment(env);
            updateEnvironmentInfo(env);
            refreshData(); // Refresh data when environment changes
        });
    }
    
    // Update environment info display
    function updateEnvironmentInfo(env) {
        if (!environmentName) return;
        const config = APP_INSIGHTS_CONFIG[env] || APP_INSIGHTS_CONFIG.trial;
        environmentName.textContent = config.name;
        
        // Show warning if live environment is not configured
        if (env === 'live' && (config.applicationId === 'YOUR_LIVE_APPLICATION_ID' || config.apiKey === 'YOUR_LIVE_API_KEY')) {
            environmentInfo.innerHTML = '<span class="text-yellow-600 font-medium">⚠️ Live environment not configured</span>';
        } else {
            environmentInfo.innerHTML = `<span class="font-medium">${config.name}</span>`;
        }
    }
    
    // Load saved mode and customer
    if (dataSourceMode) {
        const savedMode = localStorage.getItem('monitoringMode') || 'appinsights';
        dataSourceMode.value = savedMode;
        setCurrentMode(savedMode);
        
        // Show/hide environment selector and customer input based on mode
        if (savedMode === 'appinsights') {
            if (appInsightsEnvironmentContainer) {
                appInsightsEnvironmentContainer.classList.remove('hidden');
            }
            initializeAppInsightsEnvironment();
        } else {
            if (appInsightsEnvironmentContainer) {
                appInsightsEnvironmentContainer.classList.add('hidden');
            }
        }
        
        // Show/hide customer input based on mode
        if (savedMode === 'onpremise') {
            customerNameContainer.classList.remove('hidden');
            const savedCustomer = localStorage.getItem('customerName');
            if (savedCustomer) {
                customerNameInput.value = savedCustomer;
                setCustomerName(savedCustomer);
            }
        }
        
        // Handle mode change
        dataSourceMode.addEventListener('change', function(e) {
            const mode = e.target.value;
            setCurrentMode(mode);
            
            // Show/hide environment selector
            if (appInsightsEnvironmentContainer) {
                if (mode === 'appinsights') {
                    appInsightsEnvironmentContainer.classList.remove('hidden');
                    if (!appInsightsEnvironment.hasAttribute('data-initialized')) {
                        initializeAppInsightsEnvironment();
                        appInsightsEnvironment.setAttribute('data-initialized', 'true');
                    }
                } else {
                    appInsightsEnvironmentContainer.classList.add('hidden');
                }
            }
            
            // Show/hide tenant filter based on mode
            const tenantFilterContainer = document.querySelector('#tenantFilter')?.closest('.p-3');
            if (tenantFilterContainer) {
                if (mode === 'appinsights') {
                    tenantFilterContainer.classList.remove('hidden');
                } else {
                    tenantFilterContainer.classList.add('hidden');
                    // Clear tenant filter when switching to on-premise
                    setCurrentTenantId(null);
                    const tenantFilter = document.getElementById('tenantFilter');
                    if (tenantFilter) {
                        tenantFilter.value = '';
                    }
                    updateTenantInfo(null);
                }
            }
            
            if (mode === 'onpremise') {
                customerNameContainer.classList.remove('hidden');
                const savedCustomer = localStorage.getItem('customerName');
                if (savedCustomer) {
                    customerNameInput.value = savedCustomer;
                    setCustomerName(savedCustomer);
                }
            } else {
                customerNameContainer.classList.add('hidden');
            }
            
            // Refresh data when mode changes
            refreshData();
        });
    }
    
    // Handle connect button
    if (connectOnPremiseBtn) {
        connectOnPremiseBtn.addEventListener('click', function() {
            const customerName = customerNameInput.value.trim();
            if (!customerName) {
                alert('Please enter a customer name');
                return;
            }
            
            setCustomerName(customerName);
            refreshData();
        });
    }
    
    // Initialize tenant filter dropdown
    initializeTenantFilter();
    
    // Set up refresh button (sidebar only)
    const sidebarRefreshBtn = document.getElementById('sidebarRefreshBtn');
    if (sidebarRefreshBtn) {
        sidebarRefreshBtn.addEventListener('click', function() {
            refreshData();
        });
    }
    
    // Initialize page navigation - show dashboard by default
    showPage('dashboard');

    // Set up error close button
    document.getElementById('closeError').addEventListener('click', function() {
        document.getElementById('errorMessage').classList.add('hidden');
    });
    
    // Set up endpoint search
    const endpointSearchInput = document.getElementById('endpointSearch');
    if (endpointSearchInput) {
        endpointSearchInput.addEventListener('input', function(e) {
            filterTablesByEndpoint(e.target.value);
        });
    }
    
    // Initialize filter with default (last 24 hours)
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (document.getElementById('filterStartTime')) {
        document.getElementById('filterStartTime').value = formatDateTimeLocal(last24h);
        document.getElementById('filterEndTime').value = formatDateTimeLocal(now);
    }

    // Initial data load
    refreshData();

    // Set up auto-refresh
    if (APP_INSIGHTS_CONFIG.refreshInterval > 0) {
        refreshTimer = setInterval(refreshData, APP_INSIGHTS_CONFIG.refreshInterval);
    }
}

// Initialize tenant filter dropdown
function initializeTenantFilter() {
    const tenantFilter = document.getElementById('tenantFilter');
    const selectedTenantInfo = document.getElementById('selectedTenantInfo');
    const selectedTenantName = document.getElementById('selectedTenantName');
    const selectedTenantEmail = document.getElementById('selectedTenantEmail');
    
    if (!tenantFilter) return;
    
    // Get the container to show/hide based on mode
    const tenantFilterContainer = tenantFilter.closest('.p-3');
    
    // Populate tenant dropdown
    const tenantIds = Object.keys(TENANT_DATA).map(id => parseInt(id)).sort((a, b) => {
        const nameA = TENANT_DATA[a].name.toLowerCase();
        const nameB = TENANT_DATA[b].name.toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    tenantIds.forEach(tenantId => {
        const tenant = TENANT_DATA[tenantId];
        const option = document.createElement('option');
        option.value = tenantId;
        option.textContent = `${tenant.name} (${tenant.email})`;
        tenantFilter.appendChild(option);
    });
    
    // Show/hide based on current mode
    const currentMode = getCurrentMode();
    if (currentMode === 'appinsights') {
        if (tenantFilterContainer) {
            tenantFilterContainer.classList.remove('hidden');
        }
    } else {
        if (tenantFilterContainer) {
            tenantFilterContainer.classList.add('hidden');
        }
    }
    
    // Load saved tenant selection (only if in Application Insights mode)
    if (currentMode === 'appinsights') {
        const savedTenantId = getCurrentTenantId();
        if (savedTenantId) {
            tenantFilter.value = savedTenantId;
            updateTenantInfo(savedTenantId);
        }
    }
    
    // Handle tenant filter change
    tenantFilter.addEventListener('change', function(e) {
        const tenantId = e.target.value ? parseInt(e.target.value) : null;
        setCurrentTenantId(tenantId);
        updateTenantInfo(tenantId);
        refreshData(); // Refresh data when tenant changes
    });
}

// Update tenant info display
function updateTenantInfo(tenantId) {
    const selectedTenantInfo = document.getElementById('selectedTenantInfo');
    const selectedTenantName = document.getElementById('selectedTenantName');
    const selectedTenantEmail = document.getElementById('selectedTenantEmail');
    
    if (!selectedTenantInfo || !selectedTenantName || !selectedTenantEmail) return;
    
    if (tenantId && TENANT_DATA[tenantId]) {
        selectedTenantName.textContent = TENANT_DATA[tenantId].name;
        selectedTenantEmail.textContent = TENANT_DATA[tenantId].email;
        selectedTenantInfo.classList.remove('hidden');
    } else {
        selectedTenantInfo.classList.add('hidden');
    }
}

// Helper function to add tenant filter to KQL query
// Only applies to Application Insights mode, not on-premise
function addTenantFilterToQuery(query) {
    // Only apply tenant filter for Application Insights mode
    const currentMode = getCurrentMode();
    if (currentMode !== 'appinsights') {
        return query; // No tenant filter for on-premise mode
    }
    
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
        return query; // No tenant filter, return query as is
    }
    
    // Add tenant filter condition to existing where clauses
    // Check if TenantId field exists and compare value
    // Use isnotnull() to safely check if the field exists before accessing it
    const tenantFilter = `isnotnull(customDimensions.TenantId) and tostring(customDimensions.TenantId) == "${tenantId}"`;
    
    if (query.includes('| where')) {
        // Find the first "| where" and add tenant filter
        const firstWhereIndex = query.indexOf('| where');
        if (firstWhereIndex !== -1) {
            const beforeWhere = query.substring(0, firstWhereIndex);
            const afterWhere = query.substring(firstWhereIndex + 7); // Skip "| where"
            
            // Check if there's already content after "| where"
            if (afterWhere.trim().length > 0) {
                // Add tenant filter before existing conditions
                return `${beforeWhere}| where ${tenantFilter} and ${afterWhere.trim()}`;
            } else {
                // Just add tenant filter
                return `${beforeWhere}| where ${tenantFilter}`;
            }
        }
    } else if (query.includes('customEvents')) {
        // Add where clause after customEvents
        return query.replace(/customEvents\s*/, `customEvents | where ${tenantFilter} `);
    }
    
    return query;
}

// Show loading indicator
function showLoading() {
    document.getElementById('loadingIndicator').classList.remove('hidden');
}

// Hide loading indicator
function hideLoading() {
    document.getElementById('loadingIndicator').classList.add('hidden');
}

// Show error message with formatted endpoint and status code
function showError(message) {
    const errorTextElement = document.getElementById('errorText');
    
    // Helper function to escape HTML (if escapeHtml is not yet defined)
    const escapeHtmlLocal = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    // Check if message contains endpoint and status code
    if (message.includes('Endpoint:') && message.includes('Status Code:')) {
        // Parse and format the error message nicely
        const endpointMatch = message.match(/Endpoint: ([^|]+)/);
        const statusMatch = message.match(/Status Code: (\d+)/);
        const errorParts = message.split('|');
        const errorDetail = errorParts.length > 2 ? errorParts.slice(2).join('|').trim() : '';
        
        if (endpointMatch && statusMatch) {
            const endpoint = endpointMatch[1].trim();
            const statusCode = statusMatch[1].trim();
            const escapeFn = typeof escapeHtml !== 'undefined' ? escapeHtml : escapeHtmlLocal;
            
            const formattedMessage = `
                <div class="space-y-2">
                    <div><strong>Endpoint:</strong> <code class="bg-red-50 px-2 py-1 rounded text-sm font-mono">${escapeFn(endpoint)}</code></div>
                    <div><strong>Status Code:</strong> <span class="bg-red-200 px-2 py-1 rounded font-semibold">${statusCode}</span></div>
                    ${errorDetail ? `<div class="mt-2"><strong>Error Details:</strong> <span class="text-sm">${escapeFn(errorDetail)}</span></div>` : ''}
                </div>
            `;
            errorTextElement.innerHTML = formattedMessage;
        } else {
            errorTextElement.textContent = message;
        }
    } else {
        errorTextElement.textContent = message;
    }
    
    document.getElementById('errorMessage').classList.remove('hidden');
    hideLoading();
}

// Hide error message
function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = moment();
    const formatted = now.format('MMM DD, YYYY HH:mm:ss');
    const sidebarLastUpdated = document.getElementById('sidebarLastUpdated');
    if (sidebarLastUpdated) {
        sidebarLastUpdated.textContent = formatted;
    }
}

// Check if recent data exists (within last 1 hour)
async function checkDataAvailability() {
    try {
        if (isDemoMode()) {
            hasRecentData = true;
            lastAvailableDataTime = new Date();
            return { hasRecentData: true, lastDataTime: new Date() };
        }
        
        // Query for the most recent telemetry event timestamp
        const query = addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" | top 1 by timestamp desc | project timestamp`);
        const result = await executeQuery(query);
        
        const rows = result?.tables?.[0]?.rows || [];
        if (rows.length > 0 && rows[0][0]) {
            const lastTimestamp = new Date(rows[0][0]);
            lastAvailableDataTime = lastTimestamp;
            
            // Check if data is within last 1 hour
            const now = new Date();
            const hoursSinceLastData = (now - lastTimestamp) / (1000 * 60 * 60);
            hasRecentData = hoursSinceLastData <= 1;
            
            return { hasRecentData, lastDataTime: lastTimestamp };
        } else {
            // No data found at all
            hasRecentData = false;
            // Use yesterday 14:30 as fallback
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(14, 30, 0, 0);
            lastAvailableDataTime = yesterday;
            return { hasRecentData: false, lastDataTime: yesterday };
        }
    } catch (error) {
        console.error('Error checking data availability:', error);
        // On error, assume no recent data and use historical
        hasRecentData = false;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(14, 30, 0, 0);
        lastAvailableDataTime = yesterday;
        return { hasRecentData: false, lastDataTime: yesterday };
    }
}

// Get historical date range (yesterday 00:00 to yesterday 14:30)
function getHistoricalDateRange() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Start: yesterday 00:00:00
    const startTime = new Date(yesterday);
    startTime.setHours(0, 0, 0, 0);
    
    // End: yesterday 14:30:00 or last available data time (whichever is earlier)
    let endTime = new Date(yesterday);
    endTime.setHours(14, 30, 0, 0);
    
    // If we detected last available time, use it (but not later than 14:30)
    if (lastAvailableDataTime) {
        const lastAvailable = new Date(lastAvailableDataTime);
        if (lastAvailable < endTime) {
            endTime = lastAvailable;
        }
    }
    
    return { startTime, endTime };
}

// Update Key Metrics heading with date range
function updateKeyMetricsHeading(startTime, endTime) {
    const heading = document.querySelector('#page-dashboard h2');
    if (heading) {
        // Always show "Last 24 Hours" instead of specific date range
        heading.textContent = `Key Metrics (Last 24 Hours)`;
    }
}

// Page Navigation Functions
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
        item.classList.add('text-gray-700');
    });
    
    // Show selected page
    const selectedPage = document.getElementById(`page-${pageName}`);
    if (selectedPage) {
        selectedPage.classList.remove('hidden');
    }
    
    // Activate selected nav item
    const selectedNav = document.getElementById(`nav-${pageName}`);
    if (selectedNav) {
        selectedNav.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-medium');
        selectedNav.classList.remove('text-gray-700', 'font-semibold');
    }
    
    // If logs page is shown, show loading and refresh logs data
    if (pageName === 'logs') {
        showLogsLoading();
        refreshLogsOnly();
    }
    
    // Page navigation - no need to update title as header is removed
}

// Make showPage globally accessible
window.showPage = showPage;

// Execute query based on current mode
async function executeQuery(query, params = {}) {
    const mode = getCurrentMode();
    
    if (mode === 'onpremise') {
        return await executeOnPremiseQuery(query, params);
    } else {
        return await executeAppInsightsQuery(query);
    }
}

// Execute Application Insights query
async function executeAppInsightsQuery(query) {
    try {
        const url = getQueryApiUrl();
        const headers = getApiHeaders();
        
        // Reduced logging for performance (comment out in production)
        // console.log('Executing Application Insights query:', query);
        // console.log('URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                query: query
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            // Include endpoint and status code in error message
            const endpoint = url.split('?')[0]; // Get base URL without query params
            throw new Error(`Endpoint: ${endpoint} | Status Code: ${response.status} | ${errorText || response.statusText}`);
        }

        const data = await response.json();
        
        // Check if there's an error in the response
        if (data.error) {
            console.error('Application Insights query error:', data.error);
            throw new Error(data.error.message || 'Query execution failed');
        }
        
        // Log query results for debugging
        if (data.tables && data.tables[0]) {
            const rowCount = data.tables[0].rows ? data.tables[0].rows.length : 0;
            console.log(`Query returned ${rowCount} rows`);
            if (rowCount === 0) {
                console.warn('Query returned no data. This might mean:');
                console.warn('1. No data exists in Application Insights for the time range');
                console.warn('2. Data is not being sent as customEvents with name "ApiCallTelemetry"');
                console.warn('3. The time range is incorrect');
            }
        }
        
        return data;
    } catch (error) {
        console.error('Query execution error:', error);
        // Provide more helpful error messages
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Network error: Unable to connect to Application Insights API. This might be a CORS issue. Try using a local web server or check your network connection.');
        }
        throw error;
    }
}

// Execute On-Premise Elasticsearch query directly
async function executeOnPremiseQuery(queryType, params = {}) {
    try {
        const startTime = params.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const endTime = params.endTime || new Date().toISOString();
        const indexName = getElasticsearchIndex();
        const esUrl = getElasticsearchUrl();
        
        let queryBody;
        
        if (queryType === 'stats' || queryType.includes('summarize')) {
            // Build stats query with aggregations
            const mustClauses = [
                {
                    range: {
                        "@timestamp": {
                            gte: startTime,
                            lte: endTime
                        }
                    }
                }
            ];
            
            if (ON_PREMISE_CONFIG.currentCustomer) {
                mustClauses.push({
                    bool: {
                        should: [
                            { term: { "customer": ON_PREMISE_CONFIG.currentCustomer } },
                            { bool: { must_not: { exists: { field: "customer" } } } },
                            { term: { "customer": "" } }
                        ],
                        minimum_should_match: 1
                    }
                });
            }
            
            queryBody = {
                size: 0,
                query: {
                    bool: {
                        must: mustClauses
                    }
                },
                aggs: {
                    total_requests: {
                        value_count: { field: "@timestamp" }
                    },
                    avg_response_time: {
                        avg: { field: "responseTime" }
                    },
                    status_codes: {
                        terms: { field: "statusCode", size: 20 }
                    },
                    hourly_data: {
                        date_histogram: {
                            field: "@timestamp",
                            calendar_interval: "1h"
                        },
                        aggs: {
                            count: {
                                value_count: { field: "@timestamp" }
                            },
                            avg_response_time: {
                                avg: { field: "responseTime" }
                            }
                        }
                    },
                    top_endpoints: {
                        terms: {
                            field: "path",
                            size: 10,
                            order: { _count: "desc" }
                        }
                    },
                    slowest_endpoints: {
                        terms: {
                            field: "path",
                            size: 10,
                            order: { "avg_time": "desc" }
                        },
                        aggs: {
                            avg_time: {
                                avg: { field: "responseTime" }
                            }
                        }
                    }
                }
            };
        } else if (queryType === 'requests' || queryType === 'requests | order by timestamp desc') {
            // Build requests query
            const mustClauses = [
                {
                    range: {
                        "@timestamp": {
                            gte: startTime,
                            lte: endTime
                        }
                    }
                }
            ];
            
            if (ON_PREMISE_CONFIG.currentCustomer) {
                mustClauses.push({
                    bool: {
                        should: [
                            { term: { "customer": ON_PREMISE_CONFIG.currentCustomer } },
                            { bool: { must_not: { exists: { field: "customer" } } } },
                            { term: { "customer": "" } }
                        ],
                        minimum_should_match: 1
                    }
                });
            }
            
            if (params.path) {
                mustClauses.push({ term: { "path": params.path } });
            }
            
            if (params.statusCode) {
                mustClauses.push({ term: { "statusCode": params.statusCode } });
            }
            
            queryBody = {
                size: params.size || 100,
                query: {
                    bool: {
                        must: mustClauses
                    }
                },
                sort: [
                    { "@timestamp": { order: "desc" } }
                ],
                _source: ["@timestamp", "method", "path", "statusCode", "responseTime", "customer", "errorMessage", "tenantId", "userId", "requestBody"]
            };
        } else if (queryType === 'exceptions' || queryType.includes('exceptions')) {
            // Build exceptions query (status code >= 400)
            const mustClauses = [
                {
                    range: {
                        "@timestamp": {
                            gte: startTime,
                            lte: endTime
                        }
                    }
                },
                {
                    range: {
                        "statusCode": {
                            gte: 400
                        }
                    }
                }
            ];
            
            if (ON_PREMISE_CONFIG.currentCustomer) {
                mustClauses.push({
                    bool: {
                        should: [
                            { term: { "customer": ON_PREMISE_CONFIG.currentCustomer } },
                            { bool: { must_not: { exists: { field: "customer" } } } },
                            { term: { "customer": "" } }
                        ],
                        minimum_should_match: 1
                    }
                });
            }
            
            queryBody = {
                size: params.size || 50,
                query: {
                    bool: {
                        must: mustClauses
                    }
                },
                sort: [
                    { "@timestamp": { order: "desc" } }
                ],
                _source: ["@timestamp", "method", "path", "statusCode", "errorMessage", "errorCode"]
            };
        } else {
            // Default to stats
            return await executeOnPremiseQuery('stats', params);
        }
        
        console.log('Executing Elasticsearch query:', queryType);
        console.log('Query:', JSON.stringify(queryBody, null, 2));
        
        const url = `${esUrl}/${indexName}/_search`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(queryBody)
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error.reason || errorData.error.message || JSON.stringify(errorData.error);
                }
            } catch (e) {
                const text = await response.text().catch(() => '');
                if (text) {
                    errorMessage = text;
                }
            }
            throw new Error(errorMessage);
        }

        const esResponse = await response.json();
        
        // Transform Elasticsearch response to match Application Insights format
        if (queryType === 'requests' || queryType === 'requests | order by timestamp desc') {
            return transformElasticsearchRequestsResponse(esResponse);
        } else if (queryType === 'stats' || queryType.includes('summarize')) {
            return transformElasticsearchStatsResponse(esResponse);
        } else if (queryType === 'exceptions' || queryType.includes('exceptions')) {
            return transformElasticsearchExceptionsResponse(esResponse);
        }
        
        return esResponse;
    } catch (error) {
        console.error('Elasticsearch query execution error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Network error: Unable to connect to Elasticsearch. Please check if Elasticsearch is running at ' + getElasticsearchUrl());
        }
        throw error;
    }
}

// Transform Elasticsearch requests response to Application Insights format
function transformElasticsearchRequestsResponse(esResponse) {
    // Elasticsearch returns: { hits: { hits: [...], total: {...} } }
    // Application Insights format: { tables: [{ columns: [...], rows: [...] }] }
    
    const hits = esResponse.hits?.hits || [];
    
    if (hits.length === 0) {
        return {
            tables: [{
                columns: [
                    { name: 'timestamp', type: 'datetime' },
                    { name: 'name', type: 'string' },
                    { name: 'url', type: 'string' },
                    { name: 'success', type: 'bool' },
                    { name: 'duration', type: 'real' },
                    { name: 'resultCode', type: 'long' }
                ],
                rows: []
            }]
        };
    }
    
    const rows = hits.map(hit => {
        const source = hit._source;
        return [
            source['@timestamp'] || source.timestamp || new Date().toISOString(),  // [0] timestamp
            `${source.method || 'GET'} ${source.path || ''}`,  // [1] name/endpoint
            source.statusCode || 200,  // [2] statusCode
            source.responseTime || 0,  // [3] duration
            (source.statusCode || 200) < 400,  // [4] success
            source.path || '',  // [5] url/path
            source.tenantId || null,  // [6] tenantId
            source.userId || null,  // [7] userId
            source.requestBody || null,  // [8] requestBody
            source.method || 'GET',  // [9] method (for easier access)
            source.responseTime || 0  // [10] responseTime (for easier access)
        ];
    });
    
    return {
        tables: [{
            columns: [
                { name: 'timestamp', type: 'datetime' },
                { name: 'name', type: 'string' },
                { name: 'url', type: 'string' },
                { name: 'success', type: 'bool' },
                { name: 'duration', type: 'real' },
                { name: 'resultCode', type: 'long' }
            ],
            rows: rows
        }]
    };
}

// Transform Elasticsearch stats response to Application Insights format
function transformElasticsearchStatsResponse(esResponse) {
    // Elasticsearch returns aggregations
    // Transform to match the expected format from the old API
    const aggs = esResponse.aggregations || {};
    
    const statsData = {
        totalRequests: aggs.total_requests?.value || 0,
        avgResponseTime: aggs.avg_response_time?.value || 0,
        statusCodes: (aggs.status_codes?.buckets || []).map(b => ({
            statusCode: parseInt(b.key),
            count: b.doc_count || 0
        })),
        hourlyData: (aggs.hourly_data?.buckets || []).map(b => ({
            time: new Date(b.key_as_string || b.key),
            count: b.count?.value || b.doc_count || 0,
            avgResponseTime: b.avg_response_time?.value || 0
        })),
        topEndpoints: (aggs.top_endpoints?.buckets || []).map(b => ({
            path: b.key,
            count: b.doc_count || 0
        })),
        slowestEndpoints: (aggs.slowest_endpoints?.buckets || []).map(b => ({
            path: b.key,
            avgTime: b.avg_time?.value || 0,
            count: b.doc_count || 0
        }))
    };
    
    return statsData;
}

// Transform Elasticsearch exceptions response to Application Insights format
function transformElasticsearchExceptionsResponse(esResponse) {
    // Elasticsearch returns: { hits: { hits: [...] } }
    const hits = esResponse.hits?.hits || [];
    
    if (hits.length === 0) {
        return {
            tables: [{
                columns: [
                    { name: 'timestamp', type: 'datetime' },
                    { name: 'endpoint', type: 'string' },
                    { name: 'statusCode', type: 'string' },
                    { name: 'errorMessage', type: 'string' },
                    { name: 'errorCode', type: 'string' }
                ],
                rows: []
            }]
        };
    }
    
    const rows = hits.map(hit => {
        const source = hit._source;
        // Get the actual error message from Elasticsearch source
        const errorMessage = source.errorMessage || source.error_message || '';
        const errorCode = source.errorCode || source.error_code || source.statusCode || 'N/A';
        const endpoint = source.path || source.endpoint || 'N/A';
        const statusCode = source.statusCode || 'N/A';
        
        return [
            source['@timestamp'] || source.timestamp || new Date().toISOString(),
            endpoint,
            String(statusCode),
            errorMessage, // Use the actual errorMessage from Elasticsearch
            String(errorCode)
        ];
    });
    
    return {
        tables: [{
            columns: [
                { name: 'timestamp', type: 'datetime' },
                { name: 'endpoint', type: 'string' },
                { name: 'statusCode', type: 'string' },
                { name: 'errorMessage', type: 'string' },
                { name: 'errorCode', type: 'string' }
            ],
            rows: rows
        }]
    };
}

// Generate demo data
function generateDemoData() {
    const now = new Date();
    const hours = [];
    const requestCounts = [];
    const responseTimes = [];
    
    // Generate hourly data for last 24 hours
    for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        hours.push(time);
        requestCounts.push(Math.floor(Math.random() * 500) + 200);
        responseTimes.push(Math.random() * 300 + 100);
    }
    
    // Calculate totals
    const totalRequests = requestCounts.reduce((a, b) => a + b, 0);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const errorCount = Math.floor(totalRequests * 0.05); // 5% error rate
    const successRate = ((totalRequests - errorCount) / totalRequests * 100).toFixed(1);
    
    // Generate status codes
    const statusCodes = [
        [200, Math.floor(totalRequests * 0.85)],
        [201, Math.floor(totalRequests * 0.05)],
        [400, Math.floor(totalRequests * 0.04)],
        [404, Math.floor(totalRequests * 0.03)],
        [500, Math.floor(totalRequests * 0.02)],
        [503, Math.floor(totalRequests * 0.01)]
    ];
    
    // Generate top endpoints
    const endpoints = [
        ['/api/users', Math.floor(totalRequests * 0.25)],
        ['/api/products', Math.floor(totalRequests * 0.20)],
        ['/api/orders', Math.floor(totalRequests * 0.15)],
        ['/api/auth/login', Math.floor(totalRequests * 0.12)],
        ['/api/dashboard', Math.floor(totalRequests * 0.10)],
        ['/api/reports', Math.floor(totalRequests * 0.08)],
        ['/api/settings', Math.floor(totalRequests * 0.05)],
        ['/api/notifications', Math.floor(totalRequests * 0.03)],
        ['/api/search', Math.floor(totalRequests * 0.015)],
        ['/api/export', Math.floor(totalRequests * 0.005)]
    ];
    
    // Generate recent requests
    const recentRequests = [];
    for (let i = 0; i < 10; i++) {
        const time = new Date(now.getTime() - i * 5 * 60 * 1000);
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)][0];
        const status = statusCodes[Math.floor(Math.random() * statusCodes.length)][0];
        recentRequests.push([time, endpoint, status, Math.random() * 500 + 50]);
    }
    
    // Generate exceptions
    const exceptions = [
        ['System.NullReferenceException', new Date(now.getTime() - 2 * 60 * 60 * 1000), 15],
        ['System.TimeoutException', new Date(now.getTime() - 4 * 60 * 60 * 1000), 8],
        ['System.ArgumentException', new Date(now.getTime() - 6 * 60 * 60 * 1000), 12],
        ['System.UnauthorizedAccessException', new Date(now.getTime() - 8 * 60 * 60 * 1000), 5],
        ['System.OutOfMemoryException', new Date(now.getTime() - 10 * 60 * 60 * 1000), 3]
    ];
    
    // Generate slowest endpoints
    const slowestEndpoints = endpoints.slice(0, 5).map(([name, count]) => [
        name,
        Math.random() * 800 + 200,
        count
    ]).sort((a, b) => b[1] - a[1]);
    
    // Generate most used endpoints with success rate
    const mostUsedEndpoints = endpoints.slice(0, 10).map(([name, count]) => {
        const successCount = Math.floor(count * (Math.random() * 0.1 + 0.9)); // 90-100% success
        const successRate = (successCount / count * 100).toFixed(1);
        return [name, count, successCount, parseFloat(successRate)]; // name, totalCount, successCount, successRate
    });
    
    // Generate request logs
    const requestLogs = [];
    for (let i = 0; i < 50; i++) {
        const time = new Date(now.getTime() - i * 10 * 60 * 1000);
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)][0];
        const status = statusCodes[Math.floor(Math.random() * statusCodes.length)][0];
        const method = ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)];
        requestLogs.push([
            time,
            endpoint,
            `https://api.example.com${endpoint}`,
            status,
            Math.random() * 500 + 50,
            status < 400,
            `${method} ${endpoint}`
        ]);
    }
    
    return {
        totalRequests: { tables: [{ rows: [[totalRequests]] }] },
        avgResponseTime: { tables: [{ rows: [[avgResponseTime]] }] },
        errorCount: { tables: [{ rows: [[errorCount]] }] },
        requestTrends: { tables: [{ rows: hours.map((h, i) => [h, requestCounts[i]]) }] },
        statusCode: { tables: [{ rows: statusCodes }] },
        topEndpoints: { tables: [{ rows: endpoints.slice(0, 10) }] },
        recentRequests: { tables: [{ rows: recentRequests }] },
        recentExceptions: { tables: [{ rows: exceptions }] },
        slowestEndpoints: { tables: [{ rows: slowestEndpoints }] },
        mostUsedEndpoints: { tables: [{ rows: mostUsedEndpoints }] },
        responseTime: { tables: [{ rows: hours.map((h, i) => [h, responseTimes[i]]) }] },
        requestLogs: { tables: [{ rows: requestLogs }] }
    };
}

// Refresh all data
async function refreshData() {
    showLoading();
    hideError();

    try {
        const currentMode = getCurrentMode();
        
        // Check if On-Premise mode and customer is not set
        if (currentMode === 'onpremise' && !ON_PREMISE_CONFIG.currentCustomer) {
            hideLoading();
            showError('Please enter a customer name and click Connect');
            return;
        }
        
        // Check if demo mode (only for Application Insights)
        if (currentMode === 'appinsights' && isDemoMode()) {
            // Use demo data
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading delay
            
            const demoData = generateDemoData();
            
            // Update metric cards
            updateMetricCards(demoData.totalRequests, demoData.avgResponseTime, demoData.errorCount, demoData.totalRequests);
            
            // Update Key Metrics heading for demo mode
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            updateKeyMetricsHeading(last24h, now);

            // Update charts
            updateCharts(demoData.requestTrends, demoData.statusCode, demoData.topEndpoints, demoData.responseTime);

            // Store original data for filtering
            originalRecentRequestsData = demoData.recentRequests;
            originalRecentExceptionsData = demoData.recentExceptions;
            originalSlowestEndpointsData = demoData.slowestEndpoints;
            originalMostUsedEndpointsData = demoData.mostUsedEndpoints;
            
            // Update tables
            updateTables(demoData.recentRequests, demoData.recentExceptions, demoData.slowestEndpoints, demoData.mostUsedEndpoints);
            
            // Update logs table
            updateRequestLogsTable(demoData.requestLogs);
            
            // Apply search filter if active
            const searchValue = document.getElementById('endpointSearch')?.value || '';
            if (searchValue) {
                filterTablesByEndpoint(searchValue);
            }

            updateLastUpdated();
            hideLoading();
            return;
        }
        
        // For On-Premise mode, skip data availability check
        let dataAvailability = null;
        // Skip data availability check for faster loading - it's not critical
        // if (currentMode === 'appinsights') {
        //     dataAvailability = await checkDataAvailability();
        // }
        
        // Determine time range - always use last 24 hours (optimized - removed conditional logic)
        let startTime, endTime;
        endTime = new Date();
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        
        // Format datetime for queries (ISO 8601 format)
        const startTimeStr = startTime.toISOString();
        const endTimeStr = endTime.toISOString();

        // Fetch all data in parallel
        let totalRequestsData, avgResponseTimeData, errorCountData, requestTrendsData, 
            statusCodeData, topEndpointsData, recentRequestsData, recentExceptionsData, 
            slowestEndpointsData, mostUsedEndpointsData, responseTimeData, requestLogsData;
        
        if (currentMode === 'onpremise') {
            // On-Premise mode: Use stats endpoint and requests endpoint
            // Use Promise.allSettled to handle partial failures gracefully
            const results = await Promise.allSettled([
                executeQuery('stats', { startTime: startTimeStr, endTime: endTimeStr }),
                executeQuery('requests | order by timestamp desc', { startTime: startTimeStr, endTime: endTimeStr, size: 100 }),
                executeQuery('exceptions', { startTime: startTimeStr, endTime: endTimeStr, size: 50 })
            ]);
            
            // Check for failures and provide specific error messages
            const errors = [];
            if (results[0].status === 'rejected') {
                errors.push(`Stats endpoint: ${results[0].reason.message}`);
            }
            if (results[1].status === 'rejected') {
                errors.push(`Requests endpoint: ${results[1].reason.message}`);
            }
            if (results[2].status === 'rejected') {
                errors.push(`Exceptions endpoint: ${results[2].reason.message}`);
            }
            
            if (errors.length > 0) {
                console.warn('Some endpoints failed:', errors);
                // Continue with available data, but show warning
                if (errors.length === 3) {
                    // All endpoints failed
                    throw new Error(errors.join('; '));
                }
            }
            
            const statsData = results[0].status === 'fulfilled' ? results[0].value : { totalRequests: 0, avgResponseTime: 0, statusCodes: [], hourlyData: [], topEndpoints: [], slowestEndpoints: [] };
            const requestsData = results[1].status === 'fulfilled' ? results[1].value : { tables: [{ rows: [] }] };
            const exceptionsData = results[2].status === 'fulfilled' ? results[2].value : { tables: [{ rows: [] }] };
            
            // Transform stats data to match Application Insights format
            totalRequestsData = { tables: [{ rows: [[statsData.totalRequests || 0]] }] };
            avgResponseTimeData = { tables: [{ rows: [[statsData.avgResponseTime || 0]] }] };
            const errorCount = (statsData.statusCodes || []).filter(s => s.statusCode >= 400).reduce((sum, s) => sum + s.count, 0);
            errorCountData = { tables: [{ rows: [[errorCount]] }] };
            
            // Request trends from hourlyData
            if (statsData.hourlyData && statsData.hourlyData.length > 0) {
                requestTrendsData = { tables: [{ rows: statsData.hourlyData.map(d => [d.time, d.count]) }] };
            } else {
                requestTrendsData = { tables: [{ rows: [] }] };
            }
            
            // Status codes
            if (statsData.statusCodes && statsData.statusCodes.length > 0) {
                statusCodeData = { tables: [{ rows: statsData.statusCodes.map(s => [s.statusCode, s.count]) }] };
            } else {
                statusCodeData = { tables: [{ rows: [] }] };
            }
            
            // Top endpoints
            if (statsData.topEndpoints && statsData.topEndpoints.length > 0) {
                topEndpointsData = { tables: [{ rows: statsData.topEndpoints.map(e => [e.path, e.count]) }] };
            } else {
                topEndpointsData = { tables: [{ rows: [] }] };
            }
            
            // Recent requests (from requestsData)
            recentRequestsData = requestsData;
            
            // Recent exceptions
            recentExceptionsData = exceptionsData;
            
            // Slowest endpoints
            if (statsData.slowestEndpoints && statsData.slowestEndpoints.length > 0) {
                slowestEndpointsData = { tables: [{ rows: statsData.slowestEndpoints.map(e => [e.path, e.avgTime, e.count]) }] };
            } else {
                slowestEndpointsData = { tables: [{ rows: [] }] };
            }
            
            // Most used endpoints (from topEndpoints with success rate calculation)
            if (statsData.topEndpoints && statsData.topEndpoints.length > 0) {
                mostUsedEndpointsData = { tables: [{ rows: statsData.topEndpoints.map(e => {
                    const successCount = Math.floor(e.count * 0.95); // Estimate 95% success rate
                    return [e.path, e.count, successCount, 95.0];
                })}] };
            } else {
                mostUsedEndpointsData = { tables: [{ rows: [] }] };
            }
            
            // Response time distribution (from hourlyData)
            if (statsData.hourlyData && statsData.hourlyData.length > 0) {
                responseTimeData = { tables: [{ rows: statsData.hourlyData.map(d => [d.time, d.avgResponseTime || 0]) }] };
            } else {
                responseTimeData = { tables: [{ rows: [] }] };
            }
            
            // Request logs (from requestsData)
            requestLogsData = requestsData;
        } else {
            // Application Insights mode: Use KQL queries
            // Query customEvents where name == "ApiCallTelemetry" (telemetry data from TelemetryAPI)
            [
                totalRequestsData,
                avgResponseTimeData,
                errorCountData,
                requestTrendsData,
                statusCodeData,
                topEndpointsData,
                recentRequestsData,
                recentExceptionsData,
                slowestEndpointsData,
                mostUsedEndpointsData,
                responseTimeData,
                requestLogsData
            ] = await Promise.all([
                // Total requests - optimized with sampling for large datasets
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | summarize count()`)),
                
                // Average response time - optimized query
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | extend duration = datetime_diff('millisecond', todatetime(tostring(customDimensions.ResponseTime)), todatetime(tostring(customDimensions.RequestTime))) | where isnotnull(duration) | summarize avg(duration)`)),
                
                // Error count - status codes >= 400
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") and toint(tostring(customDimensions.StatusCode)) >= 400 | summarize count()`)),
                
                // Request trends (hourly) - optimized
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | summarize count() by bin(timestamp, 1h) | order by timestamp asc`)),
                
                // Status code breakdown - optimized
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | summarize count() by toint(tostring(customDimensions.StatusCode)) | order by count_ desc`)),
                
                // Top endpoints - optimized with limit
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | summarize count() by tostring(customDimensions.Endpoint) | top 10 by count_ desc`)),
                
                // Recent requests - limit to 10 most recent
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | extend duration = datetime_diff('millisecond', todatetime(tostring(customDimensions.ResponseTime)), todatetime(tostring(customDimensions.RequestTime))) | extend name = strcat(tostring(customDimensions.Method), " ", tostring(customDimensions.Endpoint)) | top 10 by timestamp desc | project timestamp, name, toint(tostring(customDimensions.StatusCode)), duration`)),
                
                // Recent exceptions - limit to 10 most recent
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") and toint(tostring(customDimensions.StatusCode)) >= 400 | extend endpoint = tostring(customDimensions.Endpoint) | extend statusCode = tostring(customDimensions.StatusCode) | extend errorMessage = tostring(customDimensions.ErrorMessage) | extend errorCode = tostring(customDimensions.ErrorCode) | top 10 by timestamp desc | project timestamp, endpoint, statusCode, errorMessage, errorCode`)),
                
                // Slowest endpoints - optimized with aggregation
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | extend duration = datetime_diff('millisecond', todatetime(tostring(customDimensions.ResponseTime)), todatetime(tostring(customDimensions.RequestTime))) | where isnotnull(duration) | summarize avg(duration), count() by tostring(customDimensions.Endpoint) | where count_ > 10 | top 10 by avg_duration desc`)),
                
                // Most used endpoints - optimized
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | extend statusCode = toint(tostring(customDimensions.StatusCode)) | summarize totalCount = count(), successCount = countif(statusCode < 400) by tostring(customDimensions.Endpoint) | extend successRate = (successCount * 100.0 / totalCount) | top 10 by totalCount desc`)),
                
                // Response time distribution (hourly averages) - optimized
                executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | extend duration = datetime_diff('millisecond', todatetime(tostring(customDimensions.ResponseTime)), todatetime(tostring(customDimensions.RequestTime))) | where isnotnull(duration) | summarize avg(duration) by bin(timestamp, 1h) | order by timestamp asc`)),
                
                // Request logs - LIMIT to 500 records for performance (was unlimited)
                (logsFilterStartTime && logsFilterEndTime ? 
                    executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${logsFilterStartTime}") and timestamp <= datetime("${logsFilterEndTime}") | extend duration = datetime_diff('millisecond', todatetime(tostring(customDimensions.ResponseTime)), todatetime(tostring(customDimensions.RequestTime))) | extend name = strcat(tostring(customDimensions.Method), " ", tostring(customDimensions.Endpoint)) | extend success = toint(tostring(customDimensions.StatusCode)) < 400 | extend operation_Name = strcat(tostring(customDimensions.Method), " ", tostring(customDimensions.Endpoint)) | order by timestamp desc | take 500 | project timestamp, name, tostring(customDimensions.Endpoint), toint(tostring(customDimensions.StatusCode)), duration, success, operation_Name`)) :
                    executeQuery(addTenantFilterToQuery(`customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTimeStr}") and timestamp <= datetime("${endTimeStr}") | extend duration = datetime_diff('millisecond', todatetime(tostring(customDimensions.ResponseTime)), todatetime(tostring(customDimensions.RequestTime))) | extend name = strcat(tostring(customDimensions.Method), " ", tostring(customDimensions.Endpoint)) | extend success = toint(tostring(customDimensions.StatusCode)) < 400 | extend operation_Name = strcat(tostring(customDimensions.Method), " ", tostring(customDimensions.Endpoint)) | order by timestamp desc | take 500 | project timestamp, name, tostring(customDimensions.Endpoint), toint(tostring(customDimensions.StatusCode)), duration, success, operation_Name`)))
            ]);
        }

        // Update metric cards
        updateMetricCards(totalRequestsData, avgResponseTimeData, errorCountData, totalRequestsData);
        
        // Update Key Metrics heading with actual date range
        updateKeyMetricsHeading(startTime, endTime);

        // Update charts
        updateCharts(requestTrendsData, statusCodeData, topEndpointsData, responseTimeData);

        // Store original data for filtering
        originalRecentRequestsData = recentRequestsData;
        originalRecentExceptionsData = recentExceptionsData;
        originalSlowestEndpointsData = slowestEndpointsData;
        originalMostUsedEndpointsData = mostUsedEndpointsData;
        
        // Update tables
        updateTables(recentRequestsData, recentExceptionsData, slowestEndpointsData, mostUsedEndpointsData);
        
        // Update logs table
        updateRequestLogsTable(requestLogsData);
        
        // Apply search filter if active
        const searchValue = document.getElementById('endpointSearch')?.value || '';
        if (searchValue) {
            filterTablesByEndpoint(searchValue);
        }

        updateLastUpdated();
        hideLoading();
    } catch (error) {
        console.error('Error refreshing data:', error);
        const currentMode = getCurrentMode();
        let errorMessage;
        
        if (currentMode === 'onpremise') {
            errorMessage = 'Failed to fetch data from On-Premise API: ' + error.message;
            if (error.message.includes('Customer name is required')) {
                errorMessage += ' Please enter a customer name and click Connect.';
            } else if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
                errorMessage += ' Please check if the API is running at ' + ON_PREMISE_CONFIG.baseUrl + ' and the customer name is correct.';
            }
        } else {
            errorMessage = 'Failed to fetch data from Application Insights: ' + error.message;
            // Provide specific guidance based on error type
            if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage += ' Please check your API Key permissions.';
            } else if (error.message.includes('404')) {
                errorMessage += ' Application ID not found. Please verify your Application ID.';
            } else if (error.message.includes('CORS') || error.message.includes('Network error')) {
                errorMessage += ' Try opening the dashboard from a web server (not file://) or use Live Server extension in VS Code.';
            }
        }
        
        showError(errorMessage);
    }
}

// Update metric cards
function updateMetricCards(totalRequestsData, avgResponseTimeData, errorCountData, successData) {
    // Total requests
    const totalRequests = totalRequestsData?.tables?.[0]?.rows?.[0]?.[0] || 0;
    document.getElementById('totalRequests').textContent = formatNumber(totalRequests);

    // Average response time
    const avgResponseTime = avgResponseTimeData?.tables?.[0]?.rows?.[0]?.[0] || 0;
    document.getElementById('avgResponseTime').textContent = formatDuration(avgResponseTime);

    // Success rate
    const total = totalRequests;
    const errors = errorCountData?.tables?.[0]?.rows?.[0]?.[0] || 0;
    const successCount = total - errors;
    const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : 0;
    document.getElementById('successRate').textContent = successRate + '%';

    // Error count
    document.getElementById('errorCount').textContent = formatNumber(errors);
}

// Update charts
function updateCharts(requestTrendsData, statusCodeData, topEndpointsData, responseTimeData) {
    // Request Volume Over Time
    updateRequestVolumeChart(requestTrendsData);

    // Status Code Breakdown
    updateStatusCodeChart(statusCodeData);

    // Top Endpoints
    updateTopEndpointsChart(topEndpointsData);

    // Response Time Distribution
    updateResponseTimeChart(responseTimeData || requestTrendsData);
}

// Update Request Volume Chart
function updateRequestVolumeChart(data) {
    const ctx = document.getElementById('requestVolumeChart').getContext('2d');
    const rows = data?.tables?.[0]?.rows || [];
    
    const labels = rows.map(row => moment(row[0]).format('MMM DD HH:mm'));
    const values = rows.map(row => row[1] || 0);

    if (requestVolumeChart) {
        requestVolumeChart.destroy();
    }

    requestVolumeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Request Count',
                data: values,
                borderColor: 'rgb(139, 92, 246)',  // Purple to match dashboard
                backgroundColor: 'rgba(139, 92, 246, 0.15)',  // Light purple fill
                tension: 0.4,
                fill: true,
                borderWidth: 2.5,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: 'rgb(139, 92, 246)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `Requests: ${formatNumber(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Requests',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        },
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// Update Status Code Chart
function updateStatusCodeChart(data) {
    const ctx = document.getElementById('statusCodeChart').getContext('2d');
    const rows = data?.tables?.[0]?.rows || [];
    
    const labels = rows.map(row => `HTTP ${row[0]}`);
    const values = rows.map(row => row[1] || 0);
    const total = values.reduce((a, b) => a + b, 0);

    // Standard HTTP status code colors
    const colors = rows.map(row => {
        const code = row[0];
        if (code >= 200 && code < 300) return 'rgb(16, 185, 129)';    // Emerald green for success (HTTP 200)
        if (code >= 300 && code < 400) return 'rgb(59, 130, 246)';    // Blue for redirect
        if (code >= 400 && code < 500) return 'rgb(251, 191, 36)';    // Yellow for client error
        if (code >= 500) return 'rgb(239, 68, 68)';                   // Red for server error
        return 'rgb(156, 163, 175)';                                   // Gray for other
    });

    if (statusCodeChart) {
        statusCodeChart.destroy();
    }

    statusCodeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart',
                animateRotate: true,
                animateScale: true
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${formatNumber(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Update status code list
    updateStatusCodeList(rows, total, colors);
}

// Update Status Code List (like the dashboard example)
function updateStatusCodeList(rows, total, colors) {
    const listContainer = document.getElementById('statusCodeList');
    if (!listContainer) return;
    
    // Sort by count descending
    const sortedRows = [...rows].map((row, i) => ({
        code: row[0],
        count: row[1] || 0,
        color: colors[i]
    })).sort((a, b) => b.count - a.count);
    
    listContainer.innerHTML = sortedRows.map(item => {
        const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
        const code = item.code;
        let statusName = '';
        if (code >= 200 && code < 300) statusName = 'Success';
        else if (code >= 300 && code < 400) statusName = 'Redirect';
        else if (code >= 400 && code < 500) statusName = 'Client Error';
        else if (code >= 500) statusName = 'Server Error';
        else statusName = 'Other';
        
        return `
            <div class="flex items-center justify-between py-2">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color: ${item.color}"></div>
                    <span class="text-sm font-medium text-gray-700">HTTP ${code}</span>
                    <span class="text-xs text-gray-500">(${statusName})</span>
                </div>
                <div class="text-right">
                    <div class="text-sm font-semibold text-gray-800">${percentage}%</div>
                    <div class="text-xs text-gray-500">${formatNumber(item.count)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Update Top Endpoints Chart
function updateTopEndpointsChart(data) {
    const ctx = document.getElementById('topEndpointsChart').getContext('2d');
    const rows = data?.tables?.[0]?.rows || [];
    
    // Reverse for horizontal bar chart (top to bottom)
    const sortedRows = [...rows].sort((a, b) => (b[1] || 0) - (a[1] || 0));
    const labels = sortedRows.map(row => {
        const name = row[0] || '';
        return name.length > 40 ? name.substring(0, 40) + '...' : name;
    });
    const values = sortedRows.map(row => row[1] || 0);

    if (topEndpointsChart) {
        topEndpointsChart.destroy();
    }

    topEndpointsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Request Count',
                data: values,
                backgroundColor: 'rgba(6, 182, 212, 0.8)',  // Cyan/turquoise to match Connect button
                borderColor: 'rgb(14, 165, 233)',  // Darker cyan border
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `Requests: ${formatNumber(context.parsed.x)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Requests',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        },
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// Update Response Time Chart
function updateResponseTimeChart(data) {
    const ctx = document.getElementById('responseTimeChart').getContext('2d');
    const rows = data?.tables?.[0]?.rows || [];
    
    const labels = rows.map(row => moment(row[0]).format('MMM DD HH:mm'));
    // Use actual response time data (average duration in milliseconds)
    const values = rows.map(row => row[1] || 0);

    if (responseTimeChart) {
        responseTimeChart.destroy();
    }

    responseTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avg Response Time (ms)',
                data: values,
                backgroundColor: 'rgba(103, 232, 249, 0.7)',
                borderColor: 'rgba(34, 211, 238, 0.85)',
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 1200,
                easing: 'easeInOut'
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update tables
function updateTables(recentRequestsData, recentExceptionsData, slowestEndpointsData, mostUsedEndpointsData) {
    updateRecentRequestsTable(recentRequestsData);
    updateRecentExceptionsTable(recentExceptionsData);
    updateSlowestEndpointsTable(slowestEndpointsData);
    updateMostUsedEndpointsTable(mostUsedEndpointsData);
}

// Update Recent Requests Table
function updateRecentRequestsTable(data) {
    const tbody = document.getElementById('recentRequestsTable');
    const rows = data?.tables?.[0]?.rows || [];
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No data available</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map((row, index) => {
        const timestamp = moment(row[0]).format('MMM DD, HH:mm:ss');
        const name = row[1];
        const statusCode = row[2];
        const duration = formatDuration(row[3]);
        const statusClass = getStatusClass(statusCode);
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="showRequestDetails('${timestamp}', '${escapeHtml(name)}', ${statusCode}, '${duration}', ${index})">
                <td class="px-4 py-3 text-sm text-gray-700">${timestamp}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${truncateText(name, 40)}</td>
                <td class="px-4 py-3 text-sm"><span class="status-badge ${statusClass}">${statusCode}</span></td>
                <td class="px-4 py-3 text-sm text-gray-700">${duration}</td>
            </tr>
        `;
    }).join('');
}

// Update Recent Exceptions Table
function updateRecentExceptionsTable(data) {
    const tbody = document.getElementById('recentExceptionsTable');
    const rows = data?.tables?.[0]?.rows || [];
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">No exceptions found</td></tr>';
        recentExceptionsFullData = [];
        return;
    }

    // Store full data for modal access
    recentExceptionsFullData = rows.map(row => {
        // Handle error message - convert to string and handle null/undefined/empty
        let errorMessage = row[3];
        if (!errorMessage || (typeof errorMessage === 'string' && errorMessage.trim() === '')) {
            errorMessage = 'N/A';
        } else {
            errorMessage = String(errorMessage);
        }
        
        return {
            timestamp: row[0],
            endpoint: row[1] || 'N/A',
            statusCode: row[2] || 'N/A',
            errorMessage: errorMessage,
            errorCode: row[4] || row[2] || 'N/A'
        };
    });

    tbody.innerHTML = rows.map((row, index) => {
        // Row format: [timestamp, endpoint, statusCode, errorMessage, errorCode]
        const timestamp = moment(row[0]).format('MMM DD, HH:mm');
        const endpoint = row[1] || 'N/A';
        const statusCode = row[2] || 'N/A';
        
        // Handle error message - convert to string and handle null/undefined/empty
        let errorMessage = row[3];
        if (!errorMessage || (typeof errorMessage === 'string' && errorMessage.trim() === '')) {
            errorMessage = 'N/A';
        } else {
            errorMessage = String(errorMessage);
        }
        
        const errorCode = row[4] || statusCode; // Fallback to status code if error code not available
        
        const statusClass = getStatusClass(statusCode);
        
        // Escape HTML for all text fields to prevent XSS and display issues
        const escapedEndpoint = escapeHtml(truncateText(endpoint, 50));
        const escapedErrorCode = escapeHtml(truncateText(String(errorCode), 30));
        const escapedErrorMessage = escapeHtml(truncateText(String(errorMessage), 100));
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer transition-colors" 
                onclick="showExceptionDetails(${index})"
                title="Click to view full error message">
                <td class="px-4 py-3 text-sm text-gray-700">${timestamp}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${escapedEndpoint}</td>
                <td class="px-4 py-3 text-sm"><span class="status-badge ${statusClass}">${escapeHtml(String(statusCode))}</span></td>
                <td class="px-4 py-3 text-sm text-gray-700">${escapedErrorCode}</td>
                <td class="px-4 py-3 text-sm text-red-600">${escapedErrorMessage}</td>
            </tr>
        `;
    }).join('');
}

// Update Slowest Endpoints Table
function updateSlowestEndpointsTable(data) {
    const tbody = document.getElementById('slowestEndpointsTable');
    const rows = data?.tables?.[0]?.rows || [];
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-500">No data available</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map(row => {
        const name = row[0];
        const avgDuration = formatDuration(row[1]);
        const count = formatNumber(row[2]);
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">${truncateText(name, 50)}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${avgDuration}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${count}</td>
            </tr>
        `;
    }).join('');
}

// Update Most Used Endpoints Table
function updateMostUsedEndpointsTable(data) {
    const tbody = document.getElementById('mostUsedEndpointsTable');
    const rows = data?.tables?.[0]?.rows || [];
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-500">No data available</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map(row => {
        const name = row[0];
        const totalCount = row[1]; // totalCount
        const successCount = row[2]; // successCount
        const successRate = row[3]; // successRate (calculated)
        const count = formatNumber(totalCount);
        const rate = successRate ? (typeof successRate === 'number' ? successRate.toFixed(1) : parseFloat(successRate).toFixed(1)) + '%' : 'N/A';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">${truncateText(name, 50)}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${count}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${rate}</td>
            </tr>
        `;
    }).join('');
}

// Show loading state in logs table
function showLogsLoading() {
    const tbody = document.getElementById('requestLogsTable');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-12 text-center"><div class="flex flex-col items-center justify-center"><div class="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-purple-600 mb-3"></div><p class="text-gray-500 text-sm">Loading logs...</p></div></td></tr>';
    }
}

// Update Request Logs Table
function updateRequestLogsTable(data) {
    const tbody = document.getElementById('requestLogsTable');
    const rows = data?.tables?.[0]?.rows || [];
    
    // Update count
    document.getElementById('logsCount').textContent = formatNumber(rows.length);
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">No requests found</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map((row, index) => {
        const timestamp = moment(row[0]).format('MMM DD, YYYY HH:mm:ss');
        const name = row[1] || 'N/A';
        const url = row[2] || '';
        const statusCode = row[3] || 'N/A';
        const duration = formatDuration(row[4] || 0);
        const success = row[5];
        const operationName = row[6] || '';
        
        // Extract HTTP method from URL or operation name
        const method = operationName ? operationName.split(' ')[0] : (url ? 'GET' : 'N/A');
        
        const statusClass = getStatusClass(statusCode);
        const successIcon = success ? 
            '<i class="fas fa-check-circle text-green-500"></i>' : 
            '<i class="fas fa-times-circle text-red-500"></i>';
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="showRequestDetails('${timestamp}', '${escapeHtml(name)}', ${statusCode}, '${duration}', ${index})">
                <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">${timestamp}</td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    <div class="max-w-xs truncate" title="${name}">${truncateText(name, 40)}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">${method}</span>
                </td>
                <td class="px-4 py-3 text-sm">
                    <span class="status-badge ${statusClass}">${statusCode}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">${duration}</td>
                <td class="px-4 py-3 text-sm text-center">${successIcon}</td>
            </tr>
        `;
    }).join('');
}

// Helper functions
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
}

function formatDuration(ms) {
    if (ms === null || ms === undefined) return '0 ms';
    if (ms < 1000) return Math.round(ms) + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
}

function getStatusClass(statusCode) {
    const code = statusCode.toString();
    if (code.startsWith('2')) return 'status-200';
    if (code.startsWith('4')) return 'status-400';
    if (code.startsWith('5')) return 'status-500';
    return '';
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Helper function to format date for datetime-local input
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Filter Functions for Logs
function setQuickFilter(period) {
    const now = new Date();
    let startTime = new Date();
    
    switch(period) {
        case '1h':
            startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
            break;
        case '6h':
            startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
        case '24h':
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
    }
    
    // Set the datetime-local inputs - end time is always current time
    document.getElementById('filterStartTime').value = formatDateTimeLocal(startTime);
    document.getElementById('filterEndTime').value = formatDateTimeLocal(now);
    
    // Highlight active button
    document.querySelectorAll('.quick-filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show loading and apply filter immediately
    showLogsLoading();
    applyLogsFilter();
}

async function applyLogsFilter() {
    const startInput = document.getElementById('filterStartTime').value;
    const endInput = document.getElementById('filterEndTime').value;
    
    if (!startInput || !endInput) {
        alert('Please select both start and end date/time');
        return;
    }
    
    // Convert to ISO format for API
    const startDate = new Date(startInput);
    const endDate = new Date(endInput);
    
    if (startDate >= endDate) {
        alert('Start time must be before end time');
        return;
    }
    
    logsFilterStartTime = startDate.toISOString();
    // Always use current time as end time for real-time data
    logsFilterEndTime = new Date().toISOString();
    
    // Update filter status - show from start to "now"
    const startFormatted = moment(startDate).format('MMM DD, YYYY HH:mm');
    const nowFormatted = moment().format('MMM DD, YYYY HH:mm');
    document.getElementById('filterStatus').textContent = `Showing: ${startFormatted} to ${nowFormatted} (Live)`;
    
    // Show loading and refresh only logs
    showLogsLoading();
    await refreshLogsOnly();
}

function resetLogsFilter() {
    logsFilterStartTime = null;
    logsFilterEndTime = null;
    document.getElementById('filterStartTime').value = '';
    document.getElementById('filterEndTime').value = '';
    document.getElementById('filterStatus').textContent = 'Showing: Last 24 Hours';
    const startFormatted = moment(defaultRange.startTime).format('MMM DD, YYYY HH:mm');
    const endFormatted = moment(defaultRange.endTime).format('MMM DD, YYYY HH:mm');
    document.getElementById('filterStatus').textContent = `Showing: ${startFormatted} to ${endFormatted}`;
    
    // Refresh all data
    refreshData();
}

async function refreshLogsOnly() {
    try {
        showLoading();
        showLogsLoading();
        hideError();
        
        const currentMode = getCurrentMode();
        
        // Check if On-Premise mode and customer is not set
        if (currentMode === 'onpremise' && !ON_PREMISE_CONFIG.currentCustomer) {
            hideLoading();
            showError('Please enter a customer name and click Connect');
            const tbody = document.getElementById('requestLogsTable');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">Please connect to On-Premise API</td></tr>';
            }
            return;
        }
        
        if (currentMode === 'appinsights' && isDemoMode()) {
            // Simulate a small delay for demo mode to show loading
            await new Promise(resolve => setTimeout(resolve, 500));
            const demoData = generateDemoData();
            updateRequestLogsTable(demoData.requestLogs);
            hideLoading();
            return;
        }
        
        // Get current filter times
        let startTime = logsFilterStartTime;
        let endTime = logsFilterEndTime;
        
        if (currentMode === 'onpremise') {
            // For On-Premise, use filter times or default to last 24 hours
            if (!startTime || !endTime) {
                endTime = new Date().toISOString();
                startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            }
            
            // Fetch logs from On-Premise API
            const requestLogsData = await executeQuery('requests | order by timestamp desc', {
                startTime: startTime,
                endTime: endTime,
                size: 1000
            });
            updateRequestLogsTable(requestLogsData);
            hideLoading();
            return;
        }
        
        // Application Insights mode
        // Always use last 24 hours
        if (!startTime || !endTime) {
            // Use last 24 hours
            endTime = new Date().toISOString();
            startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        } else {
            // Filter is set - use it, but always use current time as end to get latest
            endTime = new Date().toISOString();
        }
        
        // Fetch logs with current filter - use customEvents for telemetry data
        const query = `customEvents | where name == "ApiCallTelemetry" and timestamp >= datetime("${startTime}") and timestamp <= datetime("${endTime}") | extend duration = datetime_diff('millisecond', todatetime(tostring(customDimensions.ResponseTime)), todatetime(tostring(customDimensions.RequestTime))) | extend name = strcat(tostring(customDimensions.Method), " ", tostring(customDimensions.Endpoint)) | extend success = toint(tostring(customDimensions.StatusCode)) < 400 | extend operation_Name = strcat(tostring(customDimensions.Method), " ", tostring(customDimensions.Endpoint)) | order by timestamp desc | project timestamp, name, tostring(customDimensions.Endpoint), toint(tostring(customDimensions.StatusCode)), duration, success, operation_Name`;
        
        console.log('Fetching logs with query:', query);
        const requestLogsData = await executeQuery(query);
        updateRequestLogsTable(requestLogsData);
        
        hideLoading();
    } catch (error) {
        console.error('Error refreshing logs:', error);
        showError('Failed to fetch logs: ' + error.message);
        // Show error in table too
        const tbody = document.getElementById('requestLogsTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-red-500">Failed to load logs. Please try again.</td></tr>';
        }
    }
}

// Filter tables by endpoint name
function filterTablesByEndpoint(searchTerm) {
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Filter Recent Requests
    if (originalRecentRequestsData) {
        const filtered = filterDataByEndpoint(originalRecentRequestsData, searchLower, 1); // endpoint is at index 1
        updateRecentRequestsTable(filtered);
    }
    
    // Filter Recent Exceptions (exceptions don't have endpoint, but we can search by type)
    if (originalRecentExceptionsData) {
        const filtered = filterDataByEndpoint(originalRecentExceptionsData, searchLower, 0); // exception type is at index 0
        updateRecentExceptionsTable(filtered);
    }
    
    // Filter Slowest Endpoints
    if (originalSlowestEndpointsData) {
        const filtered = filterDataByEndpoint(originalSlowestEndpointsData, searchLower, 0); // endpoint is at index 0
        updateSlowestEndpointsTable(filtered);
    }
    
    // Filter Most Used Endpoints
    if (originalMostUsedEndpointsData) {
        const filtered = filterDataByEndpoint(originalMostUsedEndpointsData, searchLower, 0); // endpoint is at index 0
        updateMostUsedEndpointsTable(filtered);
    }
}

// Helper function to filter data by endpoint
function filterDataByEndpoint(data, searchTerm, endpointIndex) {
    if (!searchTerm) {
        return data;
    }
    
    if (!data || !data.tables || !data.tables[0] || !data.tables[0].rows) {
        return data;
    }
    
    const filteredRows = data.tables[0].rows.filter(row => {
        if (!row || row.length <= endpointIndex) return false;
        const endpoint = String(row[endpointIndex] || '').toLowerCase();
        return endpoint.includes(searchTerm);
    });
    
    return {
        tables: [{
            rows: filteredRows
        }]
    };
}

// Clear endpoint search
function clearEndpointSearch() {
    const searchInput = document.getElementById('endpointSearch');
    if (searchInput) {
        searchInput.value = '';
        filterTablesByEndpoint('');
    }
}

// Show request details modal
async function showRequestDetails(timestamp, endpoint, statusCode, duration, rowIndex) {
    const modal = document.getElementById('requestDetailModal');
    const content = document.getElementById('requestDetailContent');
    
    // Show modal with loading state
    modal.classList.remove('hidden');
    content.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-purple-600"></div>
            <span class="ml-3 text-gray-600">Loading details...</span>
        </div>
    `;
    
    try {
        const currentMode = getCurrentMode();
        let tenantId = 'N/A';
        let userId = 'N/A';
        let requestBody = 'N/A';
        let method = 'N/A';
        let requestTime = 'N/A';
        let responseTime = 'N/A';
        
        if (currentMode === 'appinsights') {
            // Query customEvents for ApiCallTelemetry
            // Extract endpoint path from the name (format: "METHOD /path" or just "/path")
            let methodFromName = 'GET';
            let pathFromName = endpoint;
            
            // Try to parse method and path from endpoint string
            const endpointMatch = endpoint.match(/^(\w+)\s+(.+)$/);
            if (endpointMatch) {
                methodFromName = endpointMatch[1];
                pathFromName = endpointMatch[2];
            } else if (endpoint.startsWith('/')) {
                // If it starts with /, it's likely just the path
                pathFromName = endpoint;
            }
            
            // Parse timestamp to find events around the same time (within 10 minutes)
            let requestTimestamp;
            let startTime, endTime;
            
            try {
                // Try parsing with moment first - handle different timestamp formats
                let momentDate;
                
                // Try the format from Recent Requests table: "MMM DD, HH:mm:ss"
                momentDate = moment(timestamp, 'MMM DD, HH:mm:ss');
                if (!momentDate.isValid()) {
                    // Try the format from Logs table: "MMM DD, YYYY HH:mm:ss"
                    momentDate = moment(timestamp, 'MMM DD, YYYY HH:mm:ss');
                }
                if (!momentDate.isValid()) {
                    // Try ISO format
                    momentDate = moment(timestamp);
                }
                
                if (momentDate.isValid()) {
                    requestTimestamp = momentDate.toDate();
                } else {
                    // Try parsing as Date directly
                    requestTimestamp = new Date(timestamp);
                    if (isNaN(requestTimestamp.getTime())) {
                        // If still invalid, use current time minus 1 hour as fallback
                        console.warn('Invalid timestamp format:', timestamp, '- using fallback time');
                        requestTimestamp = new Date(Date.now() - 60 * 60 * 1000);
                    }
                }
                
                // Calculate time range
                startTime = new Date(requestTimestamp.getTime() - 10 * 60 * 1000); // 10 minutes before
                endTime = new Date(requestTimestamp.getTime() + 10 * 60 * 1000); // 10 minutes after
                
                // Validate dates
                if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                    throw new Error('Invalid date range calculated');
                }
            } catch (e) {
                console.error('Error parsing timestamp:', e, 'Timestamp:', timestamp);
                // Use a default range (last hour) as fallback
                const now = new Date();
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                endTime = now;
            }
            
            console.log('Searching for telemetry:', {
                originalTimestamp: timestamp,
                parsedTimestamp: requestTimestamp ? requestTimestamp.toISOString() : 'N/A',
                endpoint: pathFromName,
                method: methodFromName,
                statusCode: statusCode,
                timeRange: { start: startTime.toISOString(), end: endTime.toISOString() }
            });
            
            // Query Application Insights for custom events matching this endpoint and time range
            // Get more events and filter in JavaScript for better matching
            let query = `customEvents
                | where name == "ApiCallTelemetry"
                | where timestamp >= datetime("${startTime.toISOString()}")
                | where timestamp <= datetime("${endTime.toISOString()}")
                | order by timestamp desc
                | take 100
                | project timestamp, 
                          tostring(customDimensions.Endpoint),
                          tostring(customDimensions.Method),
                          tostring(customDimensions.StatusCode),
                          tostring(customDimensions.TenantId), 
                          tostring(customDimensions.UserId), 
                          tostring(customDimensions.RequestBody),
                          tostring(customDimensions.RequestTime),
                          tostring(customDimensions.ResponseTime)`;
            
            const result = await executeQuery(addTenantFilterToQuery(query));
            const rows = result?.tables?.[0]?.rows || [];
            
            console.log('Found events:', rows.length);
            if (rows.length > 0) {
                console.log('Sample event:', {
                    endpoint: rows[0][1],
                    method: rows[0][2],
                    statusCode: rows[0][3]
                });
            }
            
            // Find the best matching row
            let matchedRow = null;
            if (rows.length > 0) {
                // Normalize the search endpoint - remove leading/trailing slashes and query strings
                const normalizeEndpoint = (ep) => {
                    if (!ep) return '';
                    let normalized = ep.toLowerCase().trim();
                    // Remove query string
                    const queryIndex = normalized.indexOf('?');
                    if (queryIndex > -1) {
                        normalized = normalized.substring(0, queryIndex);
                    }
                    // Remove leading/trailing slashes for comparison
                    normalized = normalized.replace(/^\/+|\/+$/g, '');
                    return normalized;
                };
                
                const normalizedSearchEndpoint = normalizeEndpoint(pathFromName);
                const searchMethod = methodFromName.toUpperCase();
                const searchStatusCode = statusCode.toString();
                
                // First try exact match on endpoint, method, and status code
                matchedRow = rows.find(row => {
                    const rowEndpoint = normalizeEndpoint(row[1] || '');
                    const rowMethod = (row[2] || '').toUpperCase();
                    const rowStatusCode = (row[3] || '').toString();
                    
                    return rowEndpoint === normalizedSearchEndpoint && 
                           rowMethod === searchMethod && 
                           rowStatusCode === searchStatusCode;
                });
                
                // If no exact match, try matching endpoint and method (ignore status code)
                if (!matchedRow) {
                    matchedRow = rows.find(row => {
                        const rowEndpoint = normalizeEndpoint(row[1] || '');
                        const rowMethod = (row[2] || '').toUpperCase();
                        
                        return rowEndpoint === normalizedSearchEndpoint && rowMethod === searchMethod;
                    });
                }
                
                // If still no match, try partial match on endpoint
                if (!matchedRow) {
                    matchedRow = rows.find(row => {
                        const rowEndpoint = normalizeEndpoint(row[1] || '');
                        return rowEndpoint.includes(normalizedSearchEndpoint) || 
                               normalizedSearchEndpoint.includes(rowEndpoint);
                    });
                }
                
                // If still no match, use the most recent one with matching status code
                if (!matchedRow) {
                    matchedRow = rows.find(row => {
                        const rowStatusCode = (row[3] || '').toString();
                        return rowStatusCode === searchStatusCode;
                    });
                }
                
                // Last resort: use the most recent one
                if (!matchedRow && rows.length > 0) {
                    matchedRow = rows[0];
                }
            }
            
            if (matchedRow) {
                // Column order: timestamp, Endpoint, Method, StatusCode, TenantId, UserId, RequestBody, RequestTime, ResponseTime
                tenantId = matchedRow[4] || 'N/A';
                userId = matchedRow[5] || 'N/A';
                requestBody = matchedRow[6] || 'N/A';
                method = matchedRow[2] || methodFromName;
                requestTime = matchedRow[7] || 'N/A';
                responseTime = matchedRow[8] || 'N/A';
                
                console.log('Matched event:', {
                    endpoint: matchedRow[1],
                    method: matchedRow[2],
                    statusCode: matchedRow[3],
                    tenantId,
                    userId,
                    hasRequestBody: requestBody !== 'N/A' && requestBody !== '',
                    requestTime,
                    responseTime
                });
            } else {
                console.log('No matching event found. Searched for:', {
                    endpoint: pathFromName,
                    method: methodFromName,
                    statusCode: statusCode
                });
            }
        } else if (currentMode === 'onpremise') {
            // For on-premise, query Elasticsearch for the specific request
            // Extract endpoint path and method from the name (format: "METHOD /path" or "N/A METHOD /path" or just "/path")
            let methodFromName = 'GET';
            let pathFromName = endpoint;
            
            // Remove "N/A" prefix if present
            let cleanEndpoint = endpoint.replace(/^N\/A\s+/i, '').trim();
            
            // Try to parse method and path from endpoint string
            const endpointMatch = cleanEndpoint.match(/^(\w+)\s+(.+)$/);
            if (endpointMatch) {
                methodFromName = endpointMatch[1];
                pathFromName = endpointMatch[2];
            } else if (cleanEndpoint.startsWith('/')) {
                // If it starts with /, it's likely just the path
                pathFromName = cleanEndpoint;
            } else {
                // Fallback: use the cleaned endpoint as path
                pathFromName = cleanEndpoint;
            }
            
            // Parse timestamp to find events around the same time (within 10 minutes)
            let requestTimestamp;
            let startTime, endTime;
            
            try {
                // Try parsing with moment first - handle different timestamp formats
                let momentDate;
                
                // Try the format from Recent Requests table: "MMM DD, HH:mm:ss"
                momentDate = moment(timestamp, 'MMM DD, HH:mm:ss');
                if (!momentDate.isValid()) {
                    // Try the format from Logs table: "MMM DD, YYYY HH:mm:ss"
                    momentDate = moment(timestamp, 'MMM DD, YYYY HH:mm:ss');
                }
                if (!momentDate.isValid()) {
                    // Try ISO format
                    momentDate = moment(timestamp);
                }
                
                if (momentDate.isValid()) {
                    requestTimestamp = momentDate.toDate();
                } else {
                    // Try parsing as Date directly
                    requestTimestamp = new Date(timestamp);
                    if (isNaN(requestTimestamp.getTime())) {
                        // If still invalid, use current time minus 1 hour as fallback
                        console.warn('Invalid timestamp format:', timestamp, '- using fallback time');
                        requestTimestamp = new Date(Date.now() - 60 * 60 * 1000);
                    }
                }
                
                // Calculate time range (10 minutes window)
                startTime = new Date(requestTimestamp.getTime() - 10 * 60 * 1000); // 10 minutes before
                endTime = new Date(requestTimestamp.getTime() + 10 * 60 * 1000); // 10 minutes after
                
                // Validate dates
                if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                    throw new Error('Invalid date range calculated');
                }
            } catch (e) {
                console.error('Error parsing timestamp:', e, 'Timestamp:', timestamp);
                // Use a default range (last hour) as fallback
                const now = new Date();
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                endTime = now;
            }
            
            console.log('Searching for on-premise request:', {
                originalTimestamp: timestamp,
                parsedTimestamp: requestTimestamp ? requestTimestamp.toISOString() : 'N/A',
                endpoint: pathFromName,
                method: methodFromName,
                statusCode: statusCode,
                timeRange: { start: startTime.toISOString(), end: endTime.toISOString() }
            });
            
            try {
                // Query Elasticsearch for matching request
                const esUrl = getElasticsearchUrl();
                const indexName = getElasticsearchIndex();
                
                // Normalize the search endpoint - remove leading/trailing slashes and query strings
                const normalizeEndpoint = (ep) => {
                    if (!ep) return '';
                    let normalized = ep.toLowerCase().trim();
                    // Remove query string
                    const queryIndex = normalized.indexOf('?');
                    if (queryIndex > -1) {
                        normalized = normalized.substring(0, queryIndex);
                    }
                    // Remove leading/trailing slashes for comparison
                    normalized = normalized.replace(/^\/+|\/+$/g, '');
                    return normalized;
                };
                
                const normalizedSearchEndpoint = normalizeEndpoint(pathFromName);
                const searchMethod = methodFromName.toUpperCase();
                const searchStatusCode = statusCode.toString();
                
                // Build Elasticsearch query
                const mustClauses = [
                    {
                        range: {
                            "@timestamp": {
                                gte: startTime.toISOString(),
                                lte: endTime.toISOString()
                            }
                        }
                    },
                    {
                        bool: {
                            should: [
                                { term: { "method": searchMethod } },
                                { term: { "Method": searchMethod } }
                            ],
                            minimum_should_match: 1
                        }
                    },
                    {
                        bool: {
                            should: [
                                { term: { "statusCode": parseInt(searchStatusCode) } },
                                { term: { "StatusCode": parseInt(searchStatusCode) } }
                            ],
                            minimum_should_match: 1
                        }
                    }
                ];
                
                // Add path match (try multiple field name variations and matching strategies)
                mustClauses.push({
                    bool: {
                        should: [
                            { term: { "path.keyword": pathFromName } },
                            { term: { "Path.keyword": pathFromName } },
                            { term: { "path": pathFromName } },
                            { term: { "Path": pathFromName } },
                            { match: { "path": pathFromName } },
                            { match: { "Path": pathFromName } },
                            { wildcard: { "path": `*${normalizedSearchEndpoint}*` } },
                            { wildcard: { "Path": `*${normalizedSearchEndpoint}*` } }
                        ],
                        minimum_should_match: 1
                    }
                });
                
                // Add customer filter if set
                if (ON_PREMISE_CONFIG.currentCustomer) {
                    mustClauses.push({
                        bool: {
                            should: [
                                { term: { "customer": ON_PREMISE_CONFIG.currentCustomer } },
                                { bool: { must_not: { exists: { field: "customer" } } } },
                                { term: { "customer": "" } }
                            ],
                            minimum_should_match: 1
                        }
                    });
                }
                
                const queryBody = {
                    size: 50, // Get multiple results to find best match
                    query: {
                        bool: {
                            must: mustClauses
                        }
                    },
                    sort: [
                        { "@timestamp": { order: "desc" } }
                    ],
                    _source: ["@timestamp", "method", "path", "statusCode", "responseTime", "tenantId", "userId", "requestBody", "Method", "Path", "StatusCode", "ResponseTime", "TenantId", "UserId", "RequestBody"]
                };
                
                const url = `${esUrl}/${indexName}/_search`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(queryBody)
                });
                
                if (!response.ok) {
                    throw new Error(`Elasticsearch query failed: ${response.status} ${response.statusText}`);
                }
                
                const esResponse = await response.json();
                const hits = esResponse.hits?.hits || [];
                
                console.log('Found on-premise requests:', hits.length);
                if (hits.length > 0) {
                    console.log('Sample hit:', {
                        path: hits[0]._source.path || hits[0]._source.Path,
                        method: hits[0]._source.method || hits[0]._source.Method,
                        statusCode: hits[0]._source.statusCode || hits[0]._source.StatusCode,
                        hasTenantId: !!(hits[0]._source.tenantId || hits[0]._source.TenantId),
                        hasUserId: !!(hits[0]._source.userId || hits[0]._source.UserId),
                        hasRequestBody: !!(hits[0]._source.requestBody || hits[0]._source.RequestBody)
                    });
                }
                
                // Find the best matching request
                let matchedHit = null;
                
                if (hits.length > 0) {
                    // First try exact match on endpoint, method, and status code
                    matchedHit = hits.find(hit => {
                        const source = hit._source;
                        const rowPath = source.path || source.Path || '';
                        const rowEndpoint = normalizeEndpoint(rowPath);
                        const rowMethod = (source.method || source.Method || '').toUpperCase();
                        return rowEndpoint === normalizedSearchEndpoint && rowMethod === searchMethod;
                    });
                    
                    // If no exact match, try match on endpoint only
                    if (!matchedHit) {
                        matchedHit = hits.find(hit => {
                            const source = hit._source;
                            const rowPath = source.path || source.Path || '';
                            const rowEndpoint = normalizeEndpoint(rowPath);
                            return rowEndpoint === normalizedSearchEndpoint;
                        });
                    }
                    
                    // If no exact match, try partial match
                    if (!matchedHit) {
                        matchedHit = hits.find(hit => {
                            const source = hit._source;
                            const rowPath = source.path || source.Path || '';
                            const rowEndpoint = normalizeEndpoint(rowPath);
                            return rowEndpoint.includes(normalizedSearchEndpoint) || 
                                   normalizedSearchEndpoint.includes(rowEndpoint);
                        });
                    }
                    
                    // If still no match, use the most recent one with matching status code
                    if (!matchedHit) {
                        matchedHit = hits.find(hit => {
                            const source = hit._source;
                            const rowStatusCode = String(source.statusCode || source.StatusCode || '');
                            return rowStatusCode === searchStatusCode;
                        });
                    }
                    
                    // Last resort: use the most recent one
                    if (!matchedHit && hits.length > 0) {
                        matchedHit = hits[0];
                    }
                }
                
                if (matchedHit) {
                    const source = matchedHit._source;
                    
                    // Log the full source to debug field names
                    console.log('Matched document source:', JSON.stringify(source, null, 2));
                    
                    // Try both camelCase and PascalCase field names (NEST might use either)
                    const tenantIdValue = source.tenantId || source.TenantId;
                    const userIdValue = source.userId || source.UserId;
                    const requestBodyValue = source.requestBody || source.RequestBody;
                    const responseTimeValue = source.responseTime || source.ResponseTime;
                    
                    tenantId = (tenantIdValue && String(tenantIdValue).trim() !== '') ? String(tenantIdValue) : 'N/A';
                    userId = (userIdValue && String(userIdValue).trim() !== '') ? String(userIdValue) : 'N/A';
                    requestBody = (requestBodyValue && String(requestBodyValue).trim() !== '') ? String(requestBodyValue) : 'N/A';
                    method = source.method || source.Method || methodFromName;
                    responseTime = responseTimeValue ? `${(Number(responseTimeValue) / 1000).toFixed(2)} s` : 'N/A';
                    
                    // Calculate requestTime from timestamp and responseTime
                    const timestamp = source['@timestamp'] || source.timestamp;
                    if (timestamp && responseTimeValue) {
                        const responseTimestamp = moment(timestamp);
                        const requestTimestamp = responseTimestamp.subtract(Number(responseTimeValue), 'milliseconds');
                        requestTime = requestTimestamp.format('MMM DD, YYYY HH:mm:ss');
                    } else if (timestamp) {
                        // If no responseTime, use timestamp as requestTime
                        requestTime = moment(timestamp).format('MMM DD, YYYY HH:mm:ss');
                    } else {
                        requestTime = 'N/A';
                    }
                    
                    console.log('Matched on-premise request:', {
                        endpoint: source.path || source.Path,
                        method: source.method || source.Method,
                        statusCode: source.statusCode || source.StatusCode,
                        tenantId,
                        userId,
                        hasRequestBody: requestBody !== 'N/A' && requestBody !== '',
                        requestTime,
                        responseTime,
                        rawTenantId: tenantIdValue,
                        rawUserId: userIdValue,
                        rawRequestBody: requestBodyValue ? (requestBodyValue.length > 100 ? requestBodyValue.substring(0, 100) + '...' : requestBodyValue) : null
                    });
                } else {
                    console.log('No matching on-premise request found. Searched for:', {
                        endpoint: pathFromName,
                        method: methodFromName,
                        statusCode: statusCode
                    });
                    // Keep default N/A values
                }
            } catch (error) {
                console.error('Error querying Elasticsearch for on-premise request:', error);
                // Keep default N/A values on error
            }
        }
        
        // Format request body for display
        let requestBodyDisplay = requestBody;
        if (requestBody && requestBody !== 'N/A') {
            try {
                const parsed = JSON.parse(requestBody);
                requestBodyDisplay = JSON.stringify(parsed, null, 2);
            } catch (e) {
                // Not JSON, use as is
                requestBodyDisplay = requestBody;
            }
        }
        
        // Build modal content
        content.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Endpoint</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${method} ${endpoint}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Status Code</label>
                        <div class="text-sm"><span class="status-badge ${getStatusClass(statusCode)}">${statusCode}</span></div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Tenant ID</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${tenantId}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">User ID</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${userId}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Request Time</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${requestTime}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Response Time</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${responseTime}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${duration}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Timestamp</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${timestamp}</div>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Request Input (RequestBody)</label>
                    <div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre class="text-xs whitespace-pre-wrap">${escapeHtml(requestBodyDisplay)}</pre>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading request details:', error);
        content.innerHTML = `
            <div class="text-center py-8">
                <div class="text-red-600 mb-2">
                    <i class="fas fa-exclamation-circle text-2xl"></i>
                </div>
                <p class="text-gray-700">Failed to load request details</p>
                <p class="text-sm text-gray-500 mt-1">${error.message}</p>
            </div>
        `;
    }
}

// Close request modal
function closeRequestModal() {
    const modal = document.getElementById('requestDetailModal');
    modal.classList.add('hidden');
}

// Show exception details in modal
function showExceptionDetails(index) {
    try {
        const modal = document.getElementById('requestDetailModal');
        const content = document.getElementById('requestDetailContent');
        
        // Get exception data from stored array
        if (!recentExceptionsFullData || !recentExceptionsFullData[index]) {
            throw new Error('Exception data not found');
        }
        
        const exceptionData = recentExceptionsFullData[index];
        
        // Format timestamp
        const formattedTimestamp = moment(exceptionData.timestamp).format('MMM DD, YYYY HH:mm:ss');
        
        const statusClass = getStatusClass(exceptionData.statusCode);
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Build modal content with full error message
        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle text-red-600 text-xl mr-3"></i>
                        <h3 class="text-lg font-semibold text-red-800">Exception Details</h3>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Timestamp</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${escapeHtml(formattedTimestamp)}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Status Code</label>
                        <div class="text-sm"><span class="status-badge ${statusClass}">${escapeHtml(exceptionData.statusCode)}</span></div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Endpoint</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded break-words">${escapeHtml(exceptionData.endpoint)}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Error Code</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded">${escapeHtml(exceptionData.errorCode)}</div>
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-2">Full Error Message</label>
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                        <pre class="text-sm text-red-800 whitespace-pre-wrap font-mono break-words">${escapeHtml(exceptionData.errorMessage)}</pre>
                    </div>
                </div>
                
                <div class="flex justify-end pt-4 border-t border-gray-200">
                    <button onclick="closeRequestModal()" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                        Close
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error showing exception details:', error);
        const modal = document.getElementById('requestDetailModal');
        const content = document.getElementById('requestDetailContent');
        modal.classList.remove('hidden');
        content.innerHTML = `
            <div class="text-center py-8">
                <div class="text-red-600 mb-2">
                    <i class="fas fa-exclamation-circle text-2xl"></i>
                </div>
                <p class="text-gray-700">Failed to load exception details</p>
                <p class="text-sm text-gray-500 mt-1">${error.message}</p>
                <button onclick="closeRequestModal()" class="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                    Close
                </button>
            </div>
        `;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.showRequestDetails = showRequestDetails;
window.closeRequestModal = closeRequestModal;
window.showExceptionDetails = showExceptionDetails;

