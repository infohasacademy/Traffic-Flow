/**
 * GA4MeasurementProtocol - Sends organic traffic data to Google Analytics 4
 * Implements proper source/medium attribution for organic search detection
 * Critical for GA4 to recognize traffic as "Organic Search"
 */

export interface GA4Event {
  client_id: string;
  user_id?: string;
  timestamp_micros?: string;
  user_properties?: Record<string, any>;
  non_personalized_ads?: boolean;
  events: GA4EventParams[];
}

export interface GA4EventParams {
  name: string;
  params: {
    page_location: string;
    page_referrer?: string;
    page_title?: string;
    engagement_time_msec?: number;
    session_id?: string;
    // CRITICAL for organic traffic detection
    campaign_source?: string; // 'google', 'bing', 'yahoo'
    campaign_medium?: string; // MUST be 'organic' for organic search
    campaign_name?: string;
    term?: string; // search query/keyword
    content?: string;
    // Additional tracking
    language?: string;
    screen_resolution?: string;
    debug_mode?: boolean;
  };
}

export interface OrganicTrafficConfig {
  measurementId: string;
  apiSecret: string; // GA4 API secret from Admin > Data Streams
  debug?: boolean;
}

export class GA4MeasurementProtocol {
  private config: OrganicTrafficConfig;
  private readonly GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
  private readonly GA4_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

  constructor(config: OrganicTrafficConfig) {
    this.config = config;
  }

  /**
   * Generate unique client ID (persistent user identifier)
   */
  private generateClientId(): string {
    return `${Date.now()}.${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Send organic search pageview event to GA4
   * This is the CRITICAL method for organic traffic attribution
   */
  async sendOrganicPageview(params: {
    url: string;
    referrer: string;
    searchEngine: 'google' | 'bing' | 'yahoo' | 'duckduckgo';
    keyword: string;
    userAgent?: string;
    language?: string;
    sessionId?: string;
    engagementTime?: number;
  }): Promise<boolean> {
    try {
      const clientId = this.generateClientId();
      const sessionId = params.sessionId || `session_${Date.now()}`;

      const event: GA4Event = {
        client_id: clientId,
        timestamp_micros: (Date.now() * 1000).toString(),
        non_personalized_ads: false,
        user_properties: {
          traffic_type: { value: 'organic_simulation' },
          user_agent: { value: params.userAgent || navigator.userAgent },
        },
        events: [
          {
            name: 'page_view',
            params: {
              page_location: params.url,
              page_referrer: params.referrer,
              page_title: `Traffic from ${params.searchEngine}`,
              engagement_time_msec: params.engagementTime || 30000,
              session_id: sessionId,
              
              // ⚠️ CRITICAL: These parameters make GA4 classify traffic as organic
              campaign_source: params.searchEngine, // 'google', 'bing', etc.
              campaign_medium: 'organic', // MUST be 'organic'
              term: params.keyword, // The search query
              language: params.language || 'en-US',
              screen_resolution: `${window.screen.width}x${window.screen.height}`,
              debug_mode: this.config.debug || false,
            },
          },
        ],
      };

      const endpoint = this.config.debug ? this.GA4_DEBUG_ENDPOINT : this.GA4_ENDPOINT;
      const url = `${endpoint}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (this.config.debug) {
        const debugResponse = await response.json();
        console.log('GA4 Debug Response:', debugResponse);
      }

      return response.ok;
    } catch (error) {
      console.error('GA4 Measurement Protocol Error:', error);
      return false;
    }
  }

  /**
   * Send engaged session event (user stayed and interacted)
   */
  async sendEngagementEvent(params: {
    url: string;
    sessionId: string;
    engagementTime: number;
    scrollDepth: number;
    clicks: number;
  }): Promise<boolean> {
    try {
      const clientId = this.generateClientId();

      const event: GA4Event = {
        client_id: clientId,
        events: [
          {
            name: 'user_engagement',
            params: {
              page_location: params.url,
              session_id: params.sessionId,
              engagement_time_msec: params.engagementTime,
              campaign_medium: 'organic', // Maintain organic attribution
              // Custom event parameters
              scroll_depth: params.scrollDepth,
              click_count: params.clicks,
            },
          },
        ],
      };

      const url = `${this.GA4_ENDPOINT}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      return response.ok;
    } catch (error) {
      console.error('GA4 Engagement Event Error:', error);
      return false;
    }
  }

  /**
   * Send scroll depth event (user read content)
   */
  async sendScrollEvent(params: {
    url: string;
    sessionId: string;
    scrollDepth: number;
  }): Promise<boolean> {
    try {
      const event: GA4Event = {
        client_id: this.generateClientId(),
        events: [
          {
            name: 'scroll',
            params: {
              page_location: params.url,
              session_id: params.sessionId,
              campaign_medium: 'organic',
              percent_scrolled: params.scrollDepth,
            },
          },
        ],
      };

      const url = `${this.GA4_ENDPOINT}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      return response.ok;
    } catch (error) {
      console.error('GA4 Scroll Event Error:', error);
      return false;
    }
  }

  /**
   * Send conversion event (form submission, CTA click, etc.)
   */
  async sendConversionEvent(params: {
    url: string;
    sessionId: string;
    conversionType: string;
    value?: number;
  }): Promise<boolean> {
    try {
      const event: GA4Event = {
        client_id: this.generateClientId(),
        events: [
          {
            name: params.conversionType, // 'generate_lead', 'sign_up', 'purchase'
            params: {
              page_location: params.url,
              session_id: params.sessionId,
              campaign_medium: 'organic',
              value: params.value || 0,
              currency: 'USD',
            },
          },
        ],
      };

      const url = `${this.GA4_ENDPOINT}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      return response.ok;
    } catch (error) {
      console.error('GA4 Conversion Event Error:', error);
      return false;
    }
  }

  /**
   * Batch send multiple events (more efficient)
   */
  async sendBatchEvents(events: GA4EventParams[], clientId?: string): Promise<boolean> {
    try {
      const batchEvent: GA4Event = {
        client_id: clientId || this.generateClientId(),
        events: events.map(e => ({
          ...e,
          params: {
            ...e.params,
            campaign_medium: 'organic', // Ensure all events maintain organic attribution
          },
        })),
      };

      const url = `${this.GA4_ENDPOINT}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchEvent),
      });

      return response.ok;
    } catch (error) {
      console.error('GA4 Batch Events Error:', error);
      return false;
    }
  }

  /**
   * Validate GA4 configuration and API connectivity
   */
  async validateConfiguration(): Promise<{ valid: boolean; message: string }> {
    try {
      // Send test event to debug endpoint
      const testEvent: GA4Event = {
        client_id: 'test_client',
        events: [
          {
            name: 'test_event',
            params: {
              page_location: 'https://test.com',
              campaign_medium: 'organic',
              campaign_source: 'google',
            },
          },
        ],
      };

      const url = `${this.GA4_DEBUG_ENDPOINT}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent),
      });

      if (response.ok) {
        const debugResponse = await response.json();
        if (debugResponse.validationMessages && debugResponse.validationMessages.length > 0) {
          return {
            valid: false,
            message: `Validation errors: ${JSON.stringify(debugResponse.validationMessages)}`,
          };
        }
        return { valid: true, message: 'GA4 configuration is valid' };
      } else {
        return {
          valid: false,
          message: `HTTP ${response.status}: ${await response.text()}`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton with default config (will be overridden by campaign settings)
export default GA4MeasurementProtocol;
