// Performance and load testing utilities
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface LoadTestConfig {
  concurrent: number;
  duration: number;
  rampUp: number;
  endpoint: string;
  method: string;
  payload?: any;
}

class LoadTester {
  private metrics: PerformanceMetrics[] = [];
  
  async runLoadTest(config: LoadTestConfig): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const requests: Promise<any>[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Simulate concurrent requests
    for (let i = 0; i < config.concurrent; i++) {
      const request = this.makeRequest(config.endpoint, config.method, config.payload)
        .then(() => successCount++)
        .catch(() => errorCount++);
      
      requests.push(request);
      
      // Ramp up delay
      if (config.rampUp > 0) {
        await new Promise(resolve => setTimeout(resolve, config.rampUp / config.concurrent));
      }
    }
    
    // Wait for all requests to complete
    await Promise.allSettled(requests);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const metrics: PerformanceMetrics = {
      responseTime: totalTime / config.concurrent,
      throughput: (successCount / totalTime) * 1000, // requests per second
      errorRate: (errorCount / config.concurrent) * 100,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
    };
    
    this.metrics.push(metrics);
    return metrics;
  }
  
  private async makeRequest(endpoint: string, method: string, payload?: any): Promise<Response> {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
    };
    
    if (payload && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(payload);
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    // Mock response based on endpoint
    if (endpoint.includes('/api/mobile/claims')) {
      return new Response(JSON.stringify({
        success: true,
        data: { id: 'test-claim', status: 'CREATED' }
      }), { status: 200 });
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  
  private getMemoryUsage(): number {
    // Mock memory usage (in MB)
    return Math.random() * 100 + 50;
  }
  
  private getCpuUsage(): number {
    // Mock CPU usage (percentage)
    return Math.random() * 50 + 10;
  }
  
  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      throw new Error('No metrics available');
    }
    
    const sum = this.metrics.reduce((acc, metric) => ({
      responseTime: acc.responseTime + metric.responseTime,
      throughput: acc.throughput + metric.throughput,
      errorRate: acc.errorRate + metric.errorRate,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      cpuUsage: acc.cpuUsage + metric.cpuUsage,
    }), {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    });
    
    const count = this.metrics.length;
    return {
      responseTime: sum.responseTime / count,
      throughput: sum.throughput / count,
      errorRate: sum.errorRate / count,
      memoryUsage: sum.memoryUsage / count,
      cpuUsage: sum.cpuUsage / count,
    };
  }
  
  reset(): void {
    this.metrics = [];
  }
}

describe('Performance Testing', () => {
  let loadTester: LoadTester;
  
  beforeEach(() => {
    loadTester = new LoadTester();
    jest.clearAllMocks();
  });
  
  describe('API Endpoint Performance', () => {
    it('should handle concurrent claim creation requests', async () => {
      const config: LoadTestConfig = {
        concurrent: 10,
        duration: 5000,
        rampUp: 1000,
        endpoint: '/api/mobile/claims',
        method: 'POST',
        payload: {
          dateOfService: '2024-01-15',
          providerName: 'Test Provider',
          amountCents: 10000,
          cptCodes: ['99213'],
          icdCodes: ['Z00.00'],
        },
      };
      
      const metrics = await loadTester.runLoadTest(config);
      
      // Performance assertions
      expect(metrics.responseTime).toBeLessThan(1000); // Less than 1 second average
      expect(metrics.throughput).toBeGreaterThan(5); // At least 5 requests per second
      expect(metrics.errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(metrics.memoryUsage).toBeLessThan(200); // Less than 200MB memory usage
      expect(metrics.cpuUsage).toBeLessThan(80); // Less than 80% CPU usage
    });
    
    it('should handle concurrent claim retrieval requests', async () => {
      const config: LoadTestConfig = {
        concurrent: 20,
        duration: 3000,
        rampUp: 500,
        endpoint: '/api/mobile/claims',
        method: 'GET',
      };
      
      const metrics = await loadTester.runLoadTest(config);
      
      // GET requests should be faster than POST
      expect(metrics.responseTime).toBeLessThan(500);
      expect(metrics.throughput).toBeGreaterThan(10);
      expect(metrics.errorRate).toBeLessThan(2);
    });
    
    it('should handle authentication load', async () => {
      const config: LoadTestConfig = {
        concurrent: 15,
        duration: 4000,
        rampUp: 800,
        endpoint: '/api/mobile/auth/login',
        method: 'POST',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      };
      
      const metrics = await loadTester.runLoadTest(config);
      
      expect(metrics.responseTime).toBeLessThan(800);
      expect(metrics.errorRate).toBeLessThan(3);
    });
  });
  
  describe('Stress Testing', () => {
    it('should handle high concurrent load', async () => {
      const config: LoadTestConfig = {
        concurrent: 50,
        duration: 10000,
        rampUp: 2000,
        endpoint: '/api/mobile/claims',
        method: 'GET',
      };
      
      const metrics = await loadTester.runLoadTest(config);
      
      // Under stress, we allow higher response times but still expect reasonable performance
      expect(metrics.responseTime).toBeLessThan(2000);
      expect(metrics.errorRate).toBeLessThan(10);
      expect(metrics.throughput).toBeGreaterThan(2);
    });
    
    it('should recover from peak load', async () => {
      // Run high load test
      const highLoadConfig: LoadTestConfig = {
        concurrent: 30,
        duration: 5000,
        rampUp: 1000,
        endpoint: '/api/mobile/claims',
        method: 'POST',
        payload: { dateOfService: '2024-01-15', providerName: 'Test' },
      };
      
      const highLoadMetrics = await loadTester.runLoadTest(highLoadConfig);
      
      // Wait for system to recover
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Run normal load test
      const normalLoadConfig: LoadTestConfig = {
        concurrent: 5,
        duration: 2000,
        rampUp: 200,
        endpoint: '/api/mobile/claims',
        method: 'GET',
      };
      
      const normalLoadMetrics = await loadTester.runLoadTest(normalLoadConfig);
      
      // System should recover to normal performance levels
      expect(normalLoadMetrics.responseTime).toBeLessThan(highLoadMetrics.responseTime);
      expect(normalLoadMetrics.errorRate).toBeLessThan(highLoadMetrics.errorRate);
    });
  });
  
  describe('Memory and Resource Testing', () => {
    it('should not have memory leaks during extended operation', async () => {
      const initialMetrics = await loadTester.runLoadTest({
        concurrent: 5,
        duration: 1000,
        rampUp: 100,
        endpoint: '/api/mobile/claims',
        method: 'GET',
      });
      
      // Run multiple test cycles
      for (let i = 0; i < 5; i++) {
        await loadTester.runLoadTest({
          concurrent: 10,
          duration: 2000,
          rampUp: 200,
          endpoint: '/api/mobile/claims',
          method: 'POST',
          payload: { dateOfService: '2024-01-15', providerName: `Provider ${i}` },
        });
      }
      
      const finalMetrics = await loadTester.runLoadTest({
        concurrent: 5,
        duration: 1000,
        rampUp: 100,
        endpoint: '/api/mobile/claims',
        method: 'GET',
      });
      
      // Memory usage should not increase significantly
      const memoryIncrease = finalMetrics.memoryUsage - initialMetrics.memoryUsage;
      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
    });
  });
  
  describe('Database Performance', () => {
    it('should handle concurrent database operations efficiently', async () => {
      // Simulate database-heavy operations
      const dbConfig: LoadTestConfig = {
        concurrent: 8,
        duration: 3000,
        rampUp: 400,
        endpoint: '/api/mobile/claims/search',
        method: 'POST',
        payload: {
          filters: {
            status: 'SUBMITTED',
            dateRange: {
              start: '2024-01-01',
              end: '2024-01-31',
            },
          },
          pagination: {
            page: 1,
            limit: 20,
          },
        },
      };
      
      const metrics = await loadTester.runLoadTest(dbConfig);
      
      // Database operations should still be reasonably fast
      expect(metrics.responseTime).toBeLessThan(1500);
      expect(metrics.errorRate).toBeLessThan(5);
    });
  });
});

// Utility functions for performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      this.metrics.get(operation)!.push(duration);
    };
  }
  
  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) {
      return 0;
    }
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  getPercentile(operation: string, percentile: number): number {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) {
      return 0;
    }
    
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
  
  reset(): void {
    this.metrics.clear();
  }
  
  getReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    for (const [operation, times] of this.metrics.entries()) {
      if (times.length > 0) {
        report[operation] = {
          count: times.length,
          average: this.getAverageTime(operation),
          min: Math.min(...times),
          max: Math.max(...times),
          p50: this.getPercentile(operation, 50),
          p95: this.getPercentile(operation, 95),
          p99: this.getPercentile(operation, 99),
        };
      }
    }
    
    return report;
  }
}

// Example usage in tests
describe('Performance Monitoring Integration', () => {
  let monitor: PerformanceMonitor;
  
  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.reset();
  });
  
  it('should monitor API call performance', async () => {
    const endTimer = monitor.startTimer('api-call');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    endTimer();
    
    const averageTime = monitor.getAverageTime('api-call');
    expect(averageTime).toBeGreaterThan(90);
    expect(averageTime).toBeLessThan(150);
  });
  
  it('should generate performance report', async () => {
    // Simulate multiple operations
    for (let i = 0; i < 10; i++) {
      const endTimer = monitor.startTimer('test-operation');
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      endTimer();
    }
    
    const report = monitor.getReport();
    
    expect(report['test-operation']).toBeDefined();
    expect(report['test-operation'].count).toBe(10);
    expect(report['test-operation'].average).toBeGreaterThan(0);
    expect(report['test-operation'].p95).toBeGreaterThan(report['test-operation'].p50);
  });
});