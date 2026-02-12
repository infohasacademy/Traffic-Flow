/**
 * GA4 Service - Fetches real data from Google Analytics 4
 * 
 * This service communicates with the Cloudflare Worker proxy
 * to fetch realtime and historical analytics data.
 */

export interface GA4Config {
  workerUrl: string;
  propertyId: string;
}

export interface RealtimeData {
  activeUsers: number;
  pageViews: number;
  deviceBreakdown: { device: string; users: number }[];
  channelBreakdown: { channel: string; users: number }[];
  countryBreakdown: { country: string; users: number }[];
}

export interface HistoricalData {
  dateRange: { startDate: string; endDate: string };
  totals: {
    sessions: number;
    users: number;
    newUsers: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversions: number;
    conversionRate: number;
  };
  dailyData: Array<{
    date: string;
    sessions: number;
    users: number;
  }>;
  channelData: Array<{
    channel: string;
    sessions: number;
    users: number;
  }>;
}

class GA4Service {
  private config: GA4Config | null = null;

  setConfig(config: GA4Config) {
    this.config = config;
  }

  async fetchRealtimeData(): Promise<RealtimeData> {
    if (!this.config) {
      throw new Error('GA4 service not configured. Call setConfig() first.');
    }

    const response = await fetch(`${this.config.workerUrl}/api/ga4/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: this.config.propertyId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch realtime data: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseRealtimeData(data);
  }

  async fetchHistoricalData(startDate: string, endDate: string): Promise<HistoricalData> {
    if (!this.config) {
      throw new Error('GA4 service not configured. Call setConfig() first.');
    }

    const response = await fetch(`${this.config.workerUrl}/api/ga4/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: this.config.propertyId,
        startDate,
        endDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch historical data: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseHistoricalData(data, startDate, endDate);
  }

  private parseRealtimeData(rawData: any): RealtimeData {
    const rows = rawData.rows || [];
    
    let activeUsers = 0;
    let pageViews = 0;
    const deviceMap = new Map<string, number>();
    const channelMap = new Map<string, number>();
    const countryMap = new Map<string, number>();

    rows.forEach((row: any) => {
      const country = row.dimensionValues?.[0]?.value || 'Unknown';
      const device = row.dimensionValues?.[1]?.value || 'Unknown';
      const channel = row.dimensionValues?.[2]?.value || 'Unknown';
      const users = parseInt(row.metricValues?.[0]?.value || '0');
      const views = parseInt(row.metricValues?.[1]?.value || '0');

      activeUsers += users;
      pageViews += views;

      deviceMap.set(device, (deviceMap.get(device) || 0) + users);
      channelMap.set(channel, (channelMap.get(channel) || 0) + users);
      countryMap.set(country, (countryMap.get(country) || 0) + users);
    });

    return {
      activeUsers,
      pageViews,
      deviceBreakdown: Array.from(deviceMap.entries()).map(([device, users]) => ({ device, users })),
      channelBreakdown: Array.from(channelMap.entries()).map(([channel, users]) => ({ channel, users })),
      countryBreakdown: Array.from(countryMap.entries())
        .map(([country, users]) => ({ country, users }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 10),
    };
  }

  private parseHistoricalData(rawData: any, startDate: string, endDate: string): HistoricalData {
    const rows = rawData.rows || [];
    
    let totalSessions = 0;
    let totalUsers = 0;
    let totalNewUsers = 0;
    let totalBounceRate = 0;
    let totalAvgDuration = 0;
    let totalConversions = 0;
    let rowCount = 0;

    const dailyMap = new Map<string, { sessions: number; users: number }>();
    const channelMap = new Map<string, { sessions: number; users: number }>();

    rows.forEach((row: any) => {
      const date = row.dimensionValues?.[0]?.value || '';
      const channel = row.dimensionValues?.[1]?.value || 'Unknown';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0');
      const users = parseInt(row.metricValues?.[1]?.value || '0');
      const newUsers = parseInt(row.metricValues?.[2]?.value || '0');
      const bounceRate = parseFloat(row.metricValues?.[3]?.value || '0');
      const avgDuration = parseFloat(row.metricValues?.[4]?.value || '0');
      const conversions = parseInt(row.metricValues?.[5]?.value || '0');

      totalSessions += sessions;
      totalUsers += users;
      totalNewUsers += newUsers;
      totalBounceRate += bounceRate;
      totalAvgDuration += avgDuration;
      totalConversions += conversions;
      rowCount++;

      // Aggregate by date
      const existing = dailyMap.get(date) || { sessions: 0, users: 0 };
      dailyMap.set(date, {
        sessions: existing.sessions + sessions,
        users: existing.users + users,
      });

      // Aggregate by channel
      const existingChannel = channelMap.get(channel) || { sessions: 0, users: 0 };
      channelMap.set(channel, {
        sessions: existingChannel.sessions + sessions,
        users: existingChannel.users + users,
      });
    });

    const avgBounceRate = rowCount > 0 ? totalBounceRate / rowCount : 0;
    const avgSessionDuration = rowCount > 0 ? totalAvgDuration / rowCount : 0;
    const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

    return {
      dateRange: { startDate, endDate },
      totals: {
        sessions: totalSessions,
        users: totalUsers,
        newUsers: totalNewUsers,
        bounceRate: avgBounceRate,
        avgSessionDuration,
        conversions: totalConversions,
        conversionRate,
      },
      dailyData: Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      channelData: Array.from(channelMap.entries())
        .map(([channel, data]) => ({ channel, ...data }))
        .sort((a, b) => b.sessions - a.sessions),
    };
  }
}

export const ga4Service = new GA4Service();
