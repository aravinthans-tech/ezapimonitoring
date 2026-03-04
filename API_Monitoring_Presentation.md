# API Monitoring Tool - Presentation

## Slide 1: Title Slide
**API Monitoring Tool**
*Dual-Mode Monitoring: Azure Application Insights & On-Premise Elasticsearch*

---

## Slide 2: Overview
**What We Built:**
- **Azure Mode**: Monitor APIs hosted in Azure using Application Insights
- **On-Premise Mode**: Monitor APIs hosted locally using Elasticsearch
- **Unified Dashboard**: Single dashboard for both monitoring modes
- **Centralized Logging**: TelemetryAPI handles all data collection

---

## Slide 3: Architecture Overview

### High-Level Architecture

```
┌─────────────┐
│   Generic   │
│     API     │
│  (On-Prem)  │
└──────┬──────┘
       │
       │ HTTP POST
       │ /api/telemetry/log/elastic
       ▼
┌─────────────┐
│ TelemetryAPI│
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│ Elasticsearch│  │ Application │
│  (On-Prem)   │  │  Insights   │
│              │  │   (Azure)    │
└──────┬───────┘  └──────┬──────┘
       │                 │
       │                 │
       └────────┬─────────┘
                │
                ▼
         ┌─────────────┐
         │  Dashboard  │
         │  (Browser)   │
         └─────────────┘
```

---

## Slide 4: Azure Application Insights Setup

### How It Works:

1. **Other APIs** (Azure-hosted) send telemetry to TelemetryAPI
2. **TelemetryAPI** receives data at `/api/telemetry/log`
3. **Application Insights** stores the data in Azure
4. **Dashboard** queries Application Insights using KQL queries

### Data Flow:
```
Azure API → TelemetryAPI → Application Insights → Dashboard
```

### Key Components:
- **Endpoint**: `/api/telemetry/log` (Application Insights only)
- **Storage**: Azure Application Insights
- **Query Method**: KQL (Kusto Query Language)
- **Dashboard Mode**: "Application Insights"

---

## Slide 5: On-Premise Elasticsearch Setup

### How It Works:

1. **GenericAPI** (On-Premise) sends telemetry to TelemetryAPI
2. **TelemetryAPI** receives data at `/api/telemetry/log/elastic`
3. **Elasticsearch** stores the data locally
4. **Dashboard** queries Elasticsearch directly via REST API

### Data Flow:
```
GenericAPI → TelemetryAPI → Elasticsearch → Dashboard
```

### Key Components:
- **Endpoint**: `/api/telemetry/log/elastic` (Elasticsearch only)
- **Storage**: Local Elasticsearch (http://localhost:9200)
- **Query Method**: Elasticsearch Query DSL
- **Dashboard Mode**: "On-Premise"

---

## Slide 6: TelemetryAPI - Centralized Logging Service

### Purpose:
- **Single Point** for all telemetry data collection
- **Dual Destination** routing based on API type
- **Separation of Concerns**: Logging vs. Querying

### Endpoints:

| Endpoint | Destination | Used By |
|----------|-------------|---------|
| `/api/telemetry/log` | Application Insights | Azure APIs |
| `/api/telemetry/log/elastic` | Elasticsearch | GenericAPI (On-Prem) |

### Benefits:
- ✅ Centralized configuration
- ✅ Easy to maintain
- ✅ Scalable architecture
- ✅ Clear separation of logging and querying

---

## Slide 7: Data Capture - GenericAPI (On-Premise)

### Implementation Steps:

1. **Middleware Integration**
   - `ApiLoggingMiddleware` intercepts all HTTP requests
   - Captures: Method, Path, Status Code, Response Time, Request/Response Body
   - Extracts: Customer, TenantId from query/headers

2. **Telemetry Sending**
   ```csharp
   // Fire-and-forget async call
   await httpClient.PostAsync(
       "http://localhost:5292/api/telemetry/log/elastic",
       jsonContent
   );
   ```

3. **Data Structure**
   - Timestamp, Method, Path, StatusCode
   - ResponseTime, Customer, TenantId
   - RequestBody, ErrorMessage, ErrorCode

---

## Slide 8: Data Capture - Azure APIs

### Implementation Steps:

1. **API Integration**
   - APIs call TelemetryAPI endpoint
   - Send telemetry data via HTTP POST

2. **Telemetry Sending**
   ```csharp
   await httpClient.PostAsync(
       "https://telemetry-api.com/api/telemetry/log",
       jsonContent
   );
   ```

3. **Application Insights Storage**
   - Data stored as Custom Events
   - Event Name: "ApiCallTelemetry"
   - Custom Dimensions contain all telemetry data

---

## Slide 9: Dashboard - Query Methods

### Application Insights Mode:
- **Query API**: Application Insights REST API
- **Query Language**: KQL (Kusto Query Language)
- **Authentication**: API Key
- **Example Query**:
  ```kql
  customEvents
  | where name == "ApiCallTelemetry"
  | where timestamp >= datetime("2024-01-15T00:00:00Z")
  | summarize count()
  ```

### On-Premise Mode:
- **Query API**: Elasticsearch REST API (Direct)
- **Query Language**: Elasticsearch Query DSL
- **Authentication**: None (local development)
- **Example Query**:
  ```json
  {
    "query": {
      "range": {
        "@timestamp": {
          "gte": "2024-01-15T00:00:00Z",
          "lte": "2024-01-15T23:59:59Z"
        }
      }
    }
  }
  ```

---

## Slide 10: Dashboard Features

### Key Metrics:
- 📊 Total Requests
- ⏱️ Average Response Time
- ✅ Success Rate
- ❌ Error Count

### Charts & Analytics:
- 📈 Request Volume Over Time
- 🎯 Status Code Breakdown
- ⏱️ Response Time Distribution
- 🔝 Top 10 Endpoints

### Additional Features:
- 📋 Recent Requests Table
- ⚠️ Recent Exceptions
- 🐌 Slowest Endpoints
- 📊 Most Used Endpoints
- 🔍 Request Logs with Filtering

---

## Slide 11: Configuration Files

### config.js
```javascript
// Application Insights Config
APP_INSIGHTS_CONFIG = {
    applicationId: '...',
    apiKey: '...',
    queryApiUrl: '...'
}

// On-Premise Config
ON_PREMISE_CONFIG = {
    elasticsearchUrl: 'http://localhost:9200',
    indexName: 'api-monitoring',
    currentCustomer: null
}
```

### appsettings.json (TelemetryAPI)
```json
{
  "ApplicationInsights": {
    "ConnectionString": "..."
  },
  "Elasticsearch": {
    "Url": "http://localhost:9200",
    "IndexName": "api-monitoring"
  }
}
```

---

## Slide 12: Elasticsearch Setup

### Installation Steps:

1. **Download Elasticsearch** (8.19.7)
2. **Configure** `elasticsearch.yml`:
   ```yaml
   cluster.name: api-monitoring-cluster
   node.name: api-monitoring-node
   network.host: 127.0.0.1
   discovery.type: single-node
   xpack.security.enabled: false
   http.cors.enabled: true
   http.cors.allow-origin: "*"
   ```

3. **Start Elasticsearch**:
   ```batch
   START_ELASTICSEARCH.bat
   ```

4. **Verify**: http://localhost:9200

---

## Slide 13: Data Flow Diagram - Complete

```
┌─────────────────────────────────────────────────────────┐
│                    GENERIC API                         │
│                  (On-Premise IIS)                       │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │     ApiLoggingMiddleware                     │     │
│  │  - Intercepts HTTP requests                  │     │
│  │  - Captures: Method, Path, Status, Time      │     │
│  │  - Extracts: Customer, TenantId              │     │
│  └──────────────┬───────────────────────────────┘     │
└─────────────────┼──────────────────────────────────────┘
                  │
                  │ POST /api/telemetry/log/elastic
                  ▼
┌─────────────────────────────────────────────────────────┐
│                  TELEMETRY API                          │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────┐       │
│  │ /log (Azure)     │    │ /log/elastic     │       │
│  │                  │    │                  │       │
│  │ → App Insights  │    │ → Elasticsearch  │       │
│  └──────────────────┘    └──────────────────┘       │
└─────────────────────────────────────────────────────────┘
                  │
                  │ Direct Query
                  ▼
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD                            │
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │ App Insights │         │ Elasticsearch│            │
│  │   Mode       │         │    Mode      │            │
│  │              │         │              │            │
│  │ KQL Queries  │         │ REST API     │            │
│  └──────────────┘         └──────────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## Slide 14: Key Differences

| Aspect | Application Insights | Elasticsearch |
|--------|---------------------|---------------|
| **Location** | Azure Cloud | On-Premise (Local) |
| **Storage** | Azure Application Insights | Local Elasticsearch |
| **Query Method** | KQL (Kusto) | Elasticsearch Query DSL |
| **Authentication** | API Key | None (Local) |
| **Endpoint** | `/api/telemetry/log` | `/api/telemetry/log/elastic` |
| **Dashboard Query** | REST API (Azure) | Direct REST API |
| **Cost** | Pay-per-use | Free (Self-hosted) |

---

## Slide 15: Benefits

### ✅ Centralized Logging
- Single TelemetryAPI handles all logging
- Easy to maintain and update

### ✅ Flexible Architecture
- Support for both Azure and On-Premise
- Easy to add new APIs

### ✅ Real-Time Monitoring
- Live dashboard updates
- Auto-refresh every 5 minutes

### ✅ Comprehensive Metrics
- Request/Response tracking
- Error monitoring
- Performance analytics

### ✅ Cost-Effective
- On-Premise: Free (Elasticsearch)
- Azure: Pay only for what you use

---

## Slide 16: Summary

### What We Achieved:

1. ✅ **Dual-Mode Monitoring**
   - Azure Application Insights for cloud APIs
   - Elasticsearch for on-premise APIs

2. ✅ **Centralized Logging**
   - TelemetryAPI as single point of collection
   - Clear separation of concerns

3. ✅ **Unified Dashboard**
   - Single interface for both modes
   - Easy switching between modes

4. ✅ **Complete Solution**
   - Data capture, storage, and visualization
   - Real-time monitoring and analytics

---

## Slide 17: Thank You

### Questions?

**Contact Information:**
- Project: API Monitoring Tool
- Technologies: ASP.NET Core, Elasticsearch, Application Insights, JavaScript

---

