/**
 * FingerprintRotator - Rotates browser fingerprints to avoid bot detection
 * Spoofs user agent, screen resolution, and other browser identifiers
 */

export interface Fingerprint {
  userAgent: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  hardware: {
    cores: number;
    memory: number;
  };
  platform: string;
}

export class FingerprintRotator {
  private static userAgents = {
    desktop: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ],
    mobile: [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    ]
  };

  private static resolutions = {
    desktop: [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 2560, height: 1440 }
    ],
    mobile: [
      { width: 390, height: 844 }, // iPhone 14
      { width: 412, height: 915 }, // Pixel 7
      { width: 360, height: 800 }  // Standard Android
    ]
  };

  /**
   * Generate a random fingerprint based on device type
   */
  static generateFingerprint(type: 'desktop' | 'mobile' = 'desktop'): Fingerprint {
    const uaList = this.userAgents[type];
    const resList = this.resolutions[type];
    
    const resolution = resList[Math.floor(Math.random() * resList.length)];
    
    return {
      userAgent: uaList[Math.floor(Math.random() * uaList.length)],
      screen: {
        ...resolution,
        colorDepth: 24
      },
      hardware: {
        cores: type === 'desktop' ? [4, 8, 12, 16][Math.floor(Math.random() * 4)] : [4, 8][Math.floor(Math.random() * 2)],
        memory: type === 'desktop' ? [8, 16, 32][Math.floor(Math.random() * 3)] : [4, 6, 8][Math.floor(Math.random() * 3)]
      },
      platform: type === 'desktop' ? 'Win32' : 'Linux armv8l'
    };
  }

  /**
   * Get randomized HTTP headers matching the fingerprint
   */
  static getHeaders(fp: Fingerprint) {
    return {
      'User-Agent': fp.userAgent,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Ch-Ua-Platform': fp.platform.includes('Win') ? 'Windows' : 'Android',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Upgrade-Insecure-Requests': '1'
    };
  }
}

export default FingerprintRotator;
