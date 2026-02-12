# GA4 Integration Setup Guide

## Overview

Your Traffic-Flow dashboard now integrates with **real GA4 data** instead of simulated traffic. This guide shows you how to complete the setup.

---

## What's Been Added

✅ **Cloudflare Worker** (`/cloudflare-worker/worker.js`) - API proxy for GA4  
✅ **GA4 Service** (`/app/src/services/ga4Service.ts`) - Fetches real analytics  

---

## Step 1: Deploy Cloudflare Worker

### 1.1 Create Service Account in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)  
2. Create or select a project  
3. Enable **"Google Analytics Data API"**  
4. Create a **Service Account**:  
   - IAM & Admin → Service Accounts → Create  
   - Name it (e.g., "ga4-traffic-flow")  
   - Create and download the **JSON key**  

### 1.2 Grant Access in GA4

1. Open [Google Analytics](https://analytics.google.com)  
2. Go to **Admin → Property → Property Access Management**  
3. Add the service account email (from the JSON)  
4. Assign **Viewer** role  
5. Note your **Property ID** (looks like: `properties/123456789`)  

### 1.3 Deploy Worker to Cloudflare

1. Sign up at [Cloudflare](https://dash.cloudflare.com)  
2. Go to **Workers & Pages → Create Worker**  
3. Copy `/cloudflare-worker/worker.js` content into the editor  
4. Click **Save and Deploy**  
5. Go to **Settings → Variables → Add Secret**:  
   - Name: `GA4_SERVICE_ACCOUNT`  
   - Value: Paste your **entire service account JSON**  
6. Note your worker URL (e.g., `https://ga4-proxy.YOUR-ID.workers.dev`)  

---

## Step 2: Create Config File

Create `/app/src/config/ga4Config.ts`:

```typescript
export const GA4_CONFIG = {
  workerUrl: 'https://YOUR-WORKER-URL.workers.dev',  // Replace with your Cloudflare Worker URL
  propertyId: 'properties/YOUR-PROPERTY-ID'          // Replace with your GA4 Property ID
};
```

---

## Step 3: Create GA4 Dashboard Component

Create `/app/src/components/GA4Dashboard.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { ga4Service, type RealtimeData, type HistoricalData } from '../services/ga4Service';
import { GA4_CONFIG } from '../config/ga4Config';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function GA4Dashboard() {
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7daysAgo');

  useEffect(() => {
    ga4Service.setConfig(GA4_CONFIG);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [realtime, historical] = await Promise.all([
        ga4Service.fetchRealtimeData(),
        ga4Service.fetchHistoricalData(dateRange, 'today')
      ]);
      setRealtimeData(realtime);
      setHistoricalData(historical);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Real GA4 Analytics</h1>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7daysAgo">Last 7 Days</SelectItem>
              <SelectItem value="30daysAgo">Last 30 Days</SelectItem>
              <SelectItem value="90daysAgo">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Fetch Data'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {realtimeData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{realtimeData.activeUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Page Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{realtimeData.pageViews}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {historicalData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{historicalData.totals.sessions.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{historicalData.totals.users.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>New Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{historicalData.totals.newUsers.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bounce Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{historicalData.totals.bounceRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Avg Session Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Math.round(historicalData.totals.avgSessionDuration)}s</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{historicalData.totals.conversions}</div>
              <div className="text-sm text-gray-500">{historicalData.totals.conversionRate.toFixed(2)}% rate</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

## Step 4: Update App.tsx

Replace the existing dashboard with the GA4 version:

```typescript
import { GA4Dashboard } from './components/GA4Dashboard';

function App() {
  return <GA4Dashboard />;
}

export default App;
```

---

## Step 5: Build and Deploy

```bash
# In the /app directory
npm install
npm run build

# The build will automatically deploy via GitHub Actions
git add .
git commit -m "Complete GA4 integration setup"
git push
```

---

## Preview Your Dashboard

Once deployed, visit:

**https://infohasacademy.github.io/Traffic-Flow/**

Click "Fetch Data" to see your **real GA4 traffic** from yesterday and today!

---

## Troubleshooting

### Worker Returns 500 Error
- Check that `GA4_SERVICE_ACCOUNT` secret is set correctly in Cloudflare
- Verify the JSON is complete and valid

### "Property not found" Error
- Confirm Property ID format: `properties/123456789`
- Verify service account has Viewer access in GA4

### No Data Showing
- Ensure your GA4 property has recent traffic
- Check date range selection
- Verify API is enabled in Google Cloud

---

## What Data You'll See

### Realtime (Updated Every Minute)
- Active users right now
- Current page views
- Device breakdown (mobile/desktop/tablet)
- Traffic channels (Organic Search, Direct, Social, etc.)
- Top countries

### Historical (Selected Date Range)
- Total sessions and users
- New vs returning users
- Bounce rate and engagement
- Average session duration
- Conversions and conversion rate
- Daily trends
- Channel performance

---

## Next Steps

1. **Customize** - Modify `GA4Dashboard.tsx` to show charts, tables, or additional metrics
2. **Add Filters** - Extend the service to filter by page, device, country, etc.
3. **Schedule Refresh** - Add auto-refresh for realtime data
4. **Export Data** - Add CSV export functionality

Your dashboard now shows **real traffic** from your INFOHAS academy website! 🎉
