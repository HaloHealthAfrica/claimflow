// Performance monitoring and optimization utilities
import { clientErrorReporter } from './client-error-reporter';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  pageLoadTime?: number;
  apiResponseTime?: number;
  componentRenderTime?: number;
  imageLoadTime?: number;
  
  // Resource metrics
  memoryUsage?: number;
  networkType?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  
  // User experience metrics
  interactionDelay?: number;
  scrollPerformance?: number;
  
  // Context
  url?: string;
  userAgent?: string;
  timestamp: number;
}

export interface PerformanceThresholds {
  lcp: number; // 2.5s
  fid: number; // 100ms
  cls: number; // 0.1
  fcp: number; // 1.8s
  ttfb: number; // 600ms
  pageLoadTime: number; // 3s
  apiResponseTime: number; // 1s
  componentRenderTime: number; // 16ms (60fps)
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private thresholds: PerformanceThresholds = {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    fcp: 1800,
    ttfb: 600,
    pageLoadTime: 3000,
    apiResponseTime: 1000,
    componentRenderTime: 16,
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.setupPeriodicReporting();
    }
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Initialize performance observers
  private initializeObservers(): void {
    try {
      // Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            this.recordMetric({ lcp: lastEntry.startTime });
            this.checkThreshold('lcp', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric({ fid: entry.processingStart - entry.startTime });
            this.checkThreshold('fid', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          if (clsValue > 0) {
            this.recordMetric({ cls: clsValue });
            this.checkThreshold('cls', clsValue);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);

        // Navigation timing
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            const metrics: Partial<PerformanceMetrics> = {
              pageLoadTime: entry.loadEventEnd - entry.fetchStart,
              ttfb: entry.responseStart - entry.fetchStart,
            };
            this.recordMetric(metrics);
            this.checkThreshold('pageLoadTime', metrics.pageLoadTime!);
            this.checkThreshold('ttfb', metrics.ttfb!);
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);

        // Paint timing
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              this.recordMetric({ fcp: entry.startTime });
              this.checkThreshold('fcp', entry.startTime);
            }
          });
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      }

      // Memory usage monitoring
      this.monitorMemoryUsage();
      
      // Network type detection
      this.detectNetworkType();
      
      // Device type detection
      this.detectDeviceType();
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  // Record performance metric
  public recordMetric(metric: Partial<PerformanceMetrics>): void {
    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.metrics.push(fullMetric);

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Measure API response time
  public measureApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    const startTime = performance.now();
    
    return apiCall().then(
      (result) => {
        const responseTime = performance.now() - startTime;
        this.recordMetric({ 
          apiResponseTime: responseTime,
          url: endpoint,
        });
        this.checkThreshold('apiResponseTime', responseTime);
        return result;
      },
      (error) => {
        const responseTime = performance.now() - startTime;
        this.recordMetric({ 
          apiResponseTime: responseTime,
          url: endpoint,
        });
        throw error;
      }
    );
  }

  // Measure component render time
  public measureComponentRender(componentName: string, renderFn: () => void): void {
    const startTime = performance.now();
    renderFn();
    const renderTime = performance.now() - startTime;
    
    this.recordMetric({ 
      componentRenderTime: renderTime,
      url: `component:${componentName}`,
    });
    this.checkThreshold('componentRenderTime', renderTime);
  }

  // Measure image load time
  public measureImageLoad(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const img = new Image();
      
      img.onload = () => {
        const loadTime = performance.now() - startTime;
        this.recordMetric({ 
          imageLoadTime: loadTime,
          url: imageUrl,
        });
        resolve();
      };
      
      img.onerror = () => {
        const loadTime = performance.now() - startTime;
        this.recordMetric({ 
          imageLoadTime: loadTime,
          url: imageUrl,
        });
        reject(new Error('Image failed to load'));
      };
      
      img.src = imageUrl;
    });
  }

  // Get performance summary
  public getPerformanceSummary(): {
    averages: Partial<PerformanceMetrics>;
    violations: Array<{ metric: string; value: number; threshold: number }>;
    recommendations: string[];
  } {
    if (this.metrics.length === 0) {
      return { averages: {}, violations: [], recommendations: [] };
    }

    // Calculate averages
    const averages: Partial<PerformanceMetrics> = {};
    const metricKeys = ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'pageLoadTime', 'apiResponseTime', 'componentRenderTime'] as const;
    
    metricKeys.forEach(key => {
      const values = this.metrics
        .map(m => m[key])
        .filter(v => v !== undefined) as number[];
      
      if (values.length > 0) {
        averages[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    // Find threshold violations
    const violations: Array<{ metric: string; value: number; threshold: number }> = [];
    Object.entries(averages).forEach(([metric, value]) => {
      const threshold = this.thresholds[metric as keyof PerformanceThresholds];
      if (threshold && value! > threshold) {
        violations.push({ metric, value: value!, threshold });
      }
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(averages, violations);

    return { averages, violations, recommendations };
  }

  // Generate performance recommendations
  private generateRecommendations(
    averages: Partial<PerformanceMetrics>,
    violations: Array<{ metric: string; value: number; threshold: number }>
  ): string[] {
    const recommendations: string[] = [];

    violations.forEach(({ metric, value, threshold }) => {
      switch (metric) {
        case 'lcp':
          recommendations.push(
            'Optimize Largest Contentful Paint by reducing server response times, optimizing images, and removing render-blocking resources.'
          );
          break;
        case 'fid':
          recommendations.push(
            'Improve First Input Delay by reducing JavaScript execution time and breaking up long tasks.'
          );
          break;
        case 'cls':
          recommendations.push(
            'Reduce Cumulative Layout Shift by setting dimensions for images and ads, and avoiding inserting content above existing content.'
          );
          break;
        case 'fcp':
          recommendations.push(
            'Optimize First Contentful Paint by reducing server response times and eliminating render-blocking resources.'
          );
          break;
        case 'ttfb':
          recommendations.push(
            'Improve Time to First Byte by optimizing server performance, using a CDN, and implementing caching.'
          );
          break;
        case 'pageLoadTime':
          recommendations.push(
            'Reduce page load time by optimizing images, minifying CSS/JS, and implementing code splitting.'
          );
          break;
        case 'apiResponseTime':
          recommendations.push(
            'Optimize API response times by implementing caching, database optimization, and request batching.'
          );
          break;
        case 'componentRenderTime':
          recommendations.push(
            'Optimize component rendering by using React.memo, useMemo, and useCallback for expensive operations.'
          );
          break;
      }
    });

    return recommendations;
  }

  // Check if metric exceeds threshold
  private checkThreshold(metric: keyof PerformanceThresholds, value: number): void {
    const threshold = this.thresholds[metric];
    if (value > threshold) {
      clientErrorReporter.reportPerformanceIssue(
        metric,
        value,
        threshold,
        'PerformanceMonitor'
      );
    }
  }

  // Monitor memory usage
  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric({
          memoryUsage: memory.usedJSHeapSize,
        });
      }, 30000); // Every 30 seconds
    }
  }

  // Detect network type
  private detectNetworkType(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.recordMetric({
        networkType: connection.effectiveType || 'unknown',
      });
    }
  }

  // Detect device type
  private detectDeviceType(): void {
    const width = window.innerWidth;
    let deviceType: 'mobile' | 'tablet' | 'desktop';
    
    if (width < 768) {
      deviceType = 'mobile';
    } else if (width < 1024) {
      deviceType = 'tablet';
    } else {
      deviceType = 'desktop';
    }
    
    this.recordMetric({ deviceType });
  }

  // Setup periodic reporting
  private setupPeriodicReporting(): void {
    setInterval(() => {
      const summary = this.getPerformanceSummary();
      if (summary.violations.length > 0) {
        console.warn('Performance violations detected:', summary.violations);
        console.info('Recommendations:', summary.recommendations);
      }
    }, 60000); // Every minute
  }

  // Cleanup observers
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const measureApiCall = React.useCallback(<T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ) => {
    return performanceMonitor.measureApiCall(apiCall, endpoint);
  }, []);

  const measureComponentRender = React.useCallback((
    componentName: string,
    renderFn: () => void
  ) => {
    performanceMonitor.measureComponentRender(componentName, renderFn);
  }, []);

  const recordMetric = React.useCallback((metric: Partial<PerformanceMetrics>) => {
    performanceMonitor.recordMetric(metric);
  }, []);

  const getPerformanceSummary = React.useCallback(() => {
    return performanceMonitor.getPerformanceSummary();
  }, []);

  return {
    measureApiCall,
    measureComponentRender,
    recordMetric,
    getPerformanceSummary,
  };
}

// Performance optimization utilities
export const PerformanceUtils = {
  // Debounce function for performance
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for performance
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Intersection Observer for lazy loading
  createIntersectionObserver: (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ): IntersectionObserver => {
    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    });
  },

  // Preload critical resources
  preloadResource: (url: string, type: 'script' | 'style' | 'image' | 'font'): void => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    if (type === 'font') {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  },

  // Prefetch resources
  prefetchResource: (url: string): void => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  },

  // Check if device is mobile
  isMobile: (): boolean => {
    return window.innerWidth < 768;
  },

  // Check if device has touch support
  isTouchDevice: (): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  // Get device pixel ratio
  getDevicePixelRatio: (): number => {
    return window.devicePixelRatio || 1;
  },

  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
};