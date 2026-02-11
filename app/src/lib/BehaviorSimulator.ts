/**
 * BehaviorSimulator - Simulates human-like browsing behaviors
 * Implements realistic interaction patterns for organic traffic detection
 */

export interface BehaviorConfig {
  dwellTime: { min: number; max: number };
  scrollBehavior: 'natural' | 'fast' | 'slow';
  mouseMovement: boolean;
  clickPatterns: 'f-pattern' | 'z-pattern' | 'random';
  readingSpeed: number; // words per minute
}

export interface SessionBehavior {
  duration: number;
  pagesVisited: number;
  interactions: InteractionEvent[];
  bounceRate: number;
}

export interface InteractionEvent {
  type: 'scroll' | 'click' | 'hover' | 'focus' | 'copy';
  timestamp: number;
  target?: string;
  duration?: number;
}

export class BehaviorSimulator {
  private config: BehaviorConfig;

  constructor(config?: Partial<BehaviorConfig>) {
    this.config = {
      dwellTime: { min: 30000, max: 90000 }, // 30-90 seconds
      scrollBehavior: 'natural',
      mouseMovement: true,
      clickPatterns: 'f-pattern',
      readingSpeed: 225, // average adult reading speed
      ...config,
    };
  }

  /**
   * Generate realistic dwell time based on content length
   */
  calculateDwellTime(contentWordCount: number): number {
    const baseReadingTime = (contentWordCount / this.config.readingSpeed) * 60000;
    const scanningTime = Math.random() * 10000 + 5000; // 5-15 seconds
    const interactionTime = Math.random() * 20000 + 10000; // 10-30 seconds
    
    return Math.min(
      Math.max(baseReadingTime + scanningTime + interactionTime, this.config.dwellTime.min),
      this.config.dwellTime.max
    );
  }

  /**
   * Generate natural scroll pattern with pauses
   */
  generateScrollPattern(pageHeight: number): number[] {
    const scrollPoints: number[] = [0];
    let currentPosition = 0;
    
    while (currentPosition < pageHeight) {
      // Random scroll distance (100-400px)
      const scrollDistance = Math.random() * 300 + 100;
      currentPosition += scrollDistance;
      
      if (currentPosition < pageHeight) {
        scrollPoints.push(currentPosition);
        
        // Occasional backscroll (20% chance)
        if (Math.random() < 0.2) {
          const backscroll = Math.random() * 100 + 50;
          scrollPoints.push(currentPosition - backscroll);
        }
      }
    }
    
    scrollPoints.push(pageHeight);
    return scrollPoints;
  }

  /**
   * Generate mouse movement coordinates (erratic, human-like)
   */
  generateMousePath(startX: number, startY: number, endX: number, endY: number): Array<{x: number, y: number}> {
    const path: Array<{x: number, y: number}> = [{x: startX, y: startY}];
    const steps = Math.floor(Math.random() * 15) + 10; // 10-25 intermediate points
    
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      // Add random jitter
      const jitterX = (Math.random() - 0.5) * 50;
      const jitterY = (Math.random() - 0.5) * 50;
      
      path.push({
        x: startX + (endX - startX) * progress + jitterX,
        y: startY + (endY - startY) * progress + jitterY,
      });
    }
    
    path.push({x: endX, y: endY});
    return path;
  }

  /**
   * Generate timing delays between actions (3-7 seconds)
   */
  getActionDelay(): number {
    // Exponential distribution for more realistic timing
    const lambda = 1 / 5000; // mean of 5 seconds
    const uniform = Math.random();
    return Math.min(-Math.log(1 - uniform) / lambda + 3000, 15000);
  }

  /**
   * Simulate F-pattern scanning behavior
   */
  getFPatternCoordinates(viewport: {width: number, height: number}): Array<{x: number, y: number}> {
    return [
      // Top horizontal scan
      {x: viewport.width * 0.1, y: viewport.height * 0.15},
      {x: viewport.width * 0.8, y: viewport.height * 0.15},
      // Second horizontal scan (shorter)
      {x: viewport.width * 0.1, y: viewport.height * 0.35},
      {x: viewport.width * 0.5, y: viewport.height * 0.35},
      // Vertical scan on left
      {x: viewport.width * 0.1, y: viewport.height * 0.55},
      {x: viewport.width * 0.1, y: viewport.height * 0.75},
    ];
  }

  /**
   * Generate session behavior profile
   */
  generateSessionProfile(): SessionBehavior {
    const pagesVisited = Math.floor(Math.random() * 3) + 3; // 3-5 pages
    const duration = this.config.dwellTime.min * pagesVisited + Math.random() * 60000;
    
    const interactions: InteractionEvent[] = [];
    let timestamp = 0;
    
    for (let i = 0; i < pagesVisited; i++) {
      // Add scroll events
      for (let j = 0; j < Math.floor(Math.random() * 5) + 3; j++) {
        timestamp += this.getActionDelay();
        interactions.push({
          type: 'scroll',
          timestamp,
          duration: Math.random() * 2000 + 1000,
        });
      }
      
      // Add occasional hover/click
      if (Math.random() < 0.7) {
        timestamp += this.getActionDelay();
        interactions.push({
          type: Math.random() < 0.5 ? 'hover' : 'click',
          timestamp,
          target: `element-${Math.floor(Math.random() * 10)}`,
        });
      }
      
      // Occasional text selection (15% chance)
      if (Math.random() < 0.15) {
        timestamp += this.getActionDelay();
        interactions.push({
          type: 'copy',
          timestamp,
          duration: Math.random() * 3000 + 2000,
        });
      }
    }
    
    return {
      duration,
      pagesVisited,
      interactions,
      bounceRate: Math.random() * 0.2 + 0.15, // 15-35% bounce rate
    };
  }

  /**
   * Calculate engagement metrics
   */
  getEngagementMetrics(session: SessionBehavior) {
    return {
      avgTimeOnPage: session.duration / session.pagesVisited,
      interactionsPerPage: session.interactions.length / session.pagesVisited,
      scrollDepth: Math.random() * 30 + 70, // 70-100% scroll depth
      returnProbability: Math.random() * 0.15 + 0.20, // 20-35% return rate
    };
  }
}

// Export default instance with balanced settings
export default new BehaviorSimulator({
  dwellTime: { min: 35000, max: 120000 },
  scrollBehavior: 'natural',
  mouseMovement: true,
  clickPatterns: 'f-pattern',
  readingSpeed: 225,
});
