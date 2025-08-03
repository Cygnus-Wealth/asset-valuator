export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  retryAfterMs?: number;
  maxRetries?: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private retryCount = new Map<string, number>();
  
  constructor(private options: RateLimiterOptions) {
    this.options.retryAfterMs = options.retryAfterMs || 1000;
    this.options.maxRetries = options.maxRetries || 3;
  }

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    
    // Clean up old requests
    this.requests = this.requests.filter(time => now - time < this.options.windowMs);
    
    // Check if we're at the limit
    if (this.requests.length >= this.options.maxRequests) {
      const retries = this.retryCount.get(key) || 0;
      
      if (retries >= this.options.maxRetries!) {
        this.retryCount.delete(key);
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      // Exponential backoff
      const backoffMs = this.options.retryAfterMs! * Math.pow(2, retries);
      await this.sleep(backoffMs);
      
      this.retryCount.set(key, retries + 1);
      return this.execute(key, fn);
    }
    
    // Execute the function
    this.requests.push(now);
    this.retryCount.delete(key);
    
    try {
      return await fn();
    } catch (error) {
      // If it's a 429 error, apply backoff
      if (this.is429Error(error)) {
        const retries = this.retryCount.get(key) || 0;
        
        if (retries >= this.options.maxRetries!) {
          this.retryCount.delete(key);
          throw error;
        }
        
        const backoffMs = this.options.retryAfterMs! * Math.pow(2, retries);
        await this.sleep(backoffMs);
        
        this.retryCount.set(key, retries + 1);
        return this.execute(key, fn);
      }
      
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private is429Error(error: any): boolean {
    return error?.response?.status === 429 || 
           error?.code === 'ERR_RATE_LIMITED' ||
           (error?.message && error.message.includes('429'));
  }

  reset(): void {
    this.requests = [];
    this.retryCount.clear();
  }
}