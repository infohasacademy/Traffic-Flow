/**
 * ReferrerManager - Manages organic search signals and referrer headers
 * Classifies traffic as organic human traffic for Google Analytics
 */

export interface SearchEngine {
  name: string;
  baseUrl: string;
  queryParam: string;
  domains: string[];
}

export class ReferrerManager {
  private static engines: SearchEngine[] = [
    {
      name: 'google',
      baseUrl: 'https://www.google.com/search',
      queryParam: 'q',
      domains: ['google.com', 'google.de', 'google.co.jp', 'google.fr', 'google.it']
    },
    {
      name: 'bing',
      baseUrl: 'https://www.bing.com/search',
      queryParam: 'q',
      domains: ['bing.com']
    },
    {
      name: 'yahoo',
      baseUrl: 'https://search.yahoo.com/search',
      queryParam: 'p',
      domains: ['yahoo.com']
    },
    {
      name: 'duckduckgo',
      baseUrl: 'https://duckduckgo.com/',
      queryParam: 'q',
      domains: ['duckduckgo.com']
    }
  ];

  /**
   * Generate an organic referrer URL with keyword parameters
   */
  static generateOrganicReferrer(keyword: string, engineName: string = 'google'): string {
    const engine = this.engines.find(e => e.name === engineName) || this.engines[0];
    const domain = engine.domains[Math.floor(Math.random() * engine.domains.length)];
    
    // Add realistic search parameters
    const params = new URLSearchParams();
    params.append(engine.queryParam, keyword);
    
    if (engine.name === 'google') {
      params.append('oq', keyword);
      params.append('sourceid', 'chrome');
      params.append('ie', 'UTF-8');
    }

    return `https://www.${domain}/search?${params.toString()}`;
  }

  /**
   * Get GA4 compatible source/medium
   */
  static getGASourceMedium(engineName: string = 'google') {
    return {
      source: engineName,
      medium: 'organic'
    };
  }

  /**
   * Generate realistic document location (dl) for GA4
   */
  static generateDocumentLocation(baseUrl: string, path: string = ''): string {
    const url = new URL(path, baseUrl);
    // Add non-tracking query parameters for realism
    if (Math.random() < 0.3) {
      url.searchParams.append('ref', 'search');
    }
    return url.toString();
  }

  /**
   * Get randomized search engine based on target market
   */
  static getRandomEngine(market: string = 'global'): string {
    const weights: Record<string, number> = {
      'google': 0.85,
      'bing': 0.08,
      'yahoo': 0.05,
      'duckduckgo': 0.02
    };

    if (market === 'de') weights['google'] = 0.90;
    if (market === 'jp') weights['yahoo'] = 0.15;

    const rand = Math.random();
    let cumulative = 0;
    for (const [name, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand < cumulative) return name;
    }
    return 'google';
  }
}

export default ReferrerManager;
