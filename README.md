# Application Insights Dashboard

A professional, real-time monitoring dashboard for Azure Application Insights data.

## Features

- **Key Metrics Cards**: Total requests, average response time, success rate, and error count
- **Interactive Charts**: 
  - Request volume over time
  - Status code breakdown
  - Response time distribution
  - Top 10 endpoints by request count
- **Data Tables**:
  - Recent requests
  - Recent exceptions
  - Slowest endpoints
  - Most used endpoints
- **Auto-refresh**: Updates every 5 minutes automatically
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Built with Tailwind CSS for a professional appearance

## Setup Instructions

### 1. Get Application Insights Credentials

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your **Application Insights** resource
3. Get your **Application ID**:
   - Go to **Overview** section
   - Copy the **Application ID** (it's a GUID)

4. Get your **API Key**:
   - Go to **API Access** (under Configure section)
   - Click **Create API Key**
   - Give it a name (e.g., "Dashboard API Key")
   - Select **Read telemetry** permissions
   - Click **Generate key**
   - **Copy the API key immediately** (you won't be able to see it again)

### 2. Configure the Dashboard

1. Open `config.js` file
2. Replace the placeholder values:
   ```javascript
   applicationId: 'YOUR_APPLICATION_ID_HERE',  // Paste your Application ID
   apiKey: 'YOUR_API_KEY_HERE',                // Paste your API Key
   ```
3. Save the file

### 3. Open the Dashboard

1. Open `dashboard.html` in your web browser
2. The dashboard will automatically load data from Application Insights
3. Data refreshes every 5 minutes automatically
4. Click the "Refresh" button to manually update

## Files Structure

```
API MONITORING TOOL/
├── dashboard.html      # Main dashboard page
├── dashboard.js        # JavaScript logic for data fetching and visualization
├── dashboard.css       # Custom styles (complements Tailwind CSS)
├── config.js          # Configuration file (API credentials)
└── README.md          # This file
```

## Configuration Options

In `config.js`, you can customize:

- **refreshInterval**: Change auto-refresh interval (in milliseconds)
  - Default: 300000 (5 minutes)
  - Example: 60000 = 1 minute, 180000 = 3 minutes

## Troubleshooting

### Dashboard shows "Please configure your Application Insights credentials"
- Make sure you've updated `config.js` with your Application ID and API Key
- Verify the values are correct (no extra spaces or quotes)

### "Failed to fetch data from Application Insights" error
- Check that your API Key is valid and has "Read telemetry" permissions
- Verify your Application ID is correct
- Ensure your Application Insights resource is active
- Check browser console for detailed error messages

### No data showing
- Wait a few minutes - data ingestion can have a delay
- Make sure your API is generating telemetry data
- Check that Application Insights is properly configured in your API

### CORS errors in browser console
- Application Insights REST API supports CORS, but if you see errors, try:
  - Using a local web server instead of opening the file directly
  - Or host the dashboard on a web server

## Deployment Options

### Option 1: Local File
- Simply open `dashboard.html` in your browser
- Works for personal use

### Option 2: Azure Blob Storage (Static Website)
1. Create a Storage Account in Azure
2. Enable static website hosting
3. Upload all dashboard files
4. Access via the static website URL

### Option 3: Web Server
- Upload files to any web server (IIS, Apache, Nginx, etc.)
- Access via your domain/URL

### Option 4: GitHub Pages
- Push files to a GitHub repository
- Enable GitHub Pages
- Access via GitHub Pages URL

## Security Notes

- **Never commit `config.js` with real credentials to version control**
- Consider using environment variables or a secure configuration method for production
- The API Key has read-only access, but should still be kept secure
- For production, consider adding authentication to the dashboard itself

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge
- Safari
- Opera

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your Application Insights credentials
3. Ensure your API is sending telemetry to Application Insights

## License

This dashboard is provided as-is for monitoring your Application Insights data.

