import { PriceData, PriceProvider } from '../types.js';
import { CoinGeckoProvider } from './coingecko.js';
import { CoinPaprikaProvider } from './coinpaprika.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { EdgeCache } from '../utils/edge-cache.js';
import { hasIndexedDB, hasLocalStorage } from '../utils/browser-detect.js';

export interface AggregatorOptions {
  providers?: PriceProvider[];
  cacheOptions?: {
    storage?: 'memory' | 'localStorage' | 'indexedDB';
    ttl?: number;
  };
  rateLimitOptions?: {
    maxRequests?: number;
    windowMs?: number;
  };
  consensusThreshold?: number; // Percentage of providers that must agree (0.5 = 50%)
}

export class DecentralizedAggregator implements PriceProvider {
  private providers: PriceProvider[];
  private rateLimiter: RateLimiter;
  private cache: EdgeCache;
  private consensusThreshold: number;

  constructor(options: AggregatorOptions = {}) {
    // Default providers
    this.providers = options.providers || [
      new CoinGeckoProvider(),
      new CoinPaprikaProvider(),
    ];

    // Rate limiter with conservative defaults for edge devices
    this.rateLimiter = new RateLimiter({
      maxRequests: options.rateLimitOptions?.maxRequests || 5,
      windowMs: options.rateLimitOptions?.windowMs || 60000, // 1 minute
      retryAfterMs: 2000,
      maxRetries: 3
    });

    // Edge cache with automatic storage selection
    this.cache = new EdgeCache({
      storage: options.cacheOptions?.storage || this.selectBestStorage(),
      defaultTTL: options.cacheOptions?.ttl || 60000, // 60 seconds
      maxSize: 500
    });

    this.consensusThreshold = options.consensusThreshold || 0.5;
  }

  private selectBestStorage(): 'memory' | 'localStorage' | 'indexedDB' {
    if (hasIndexedDB()) {
      return 'indexedDB';
    } else if (hasLocalStorage()) {
      return 'localStorage';
    }
    return 'memory';
  }

  async fetchPrice(symbol: string, currency: string = 'usd'): Promise<PriceData> {
    const cacheKey = `${symbol}-${currency}`;
    
    // Check cache first
    const cached = await this.cache.get<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use rate limiter to fetch from providers
    return this.rateLimiter.execute(cacheKey, async () => {
      const results = await this.fetchFromProviders(symbol, currency);
      
      if (results.length === 0) {
        throw new Error(`No price data available for ${symbol}`);
      }

      // Calculate consensus price
      const consensusPrice = this.calculateConsensusPrice(results);
      
      const priceData: PriceData = {
        symbol: symbol.toUpperCase(),
        price: consensusPrice,
        timestamp: new Date()
      };

      // Cache the result
      await this.cache.set(cacheKey, priceData);
      
      return priceData;
    });
  }

  async fetchMultiplePrices(symbols: string[], currency: string = 'usd'): Promise<PriceData[]> {
    // Check cache for all symbols
    const results: PriceData[] = [];
    const uncachedSymbols: string[] = [];

    for (const symbol of symbols) {
      const cached = await this.cache.get<PriceData>(`${symbol}-${currency}`);
      if (cached) {
        results.push(cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // Fetch uncached symbols
    if (uncachedSymbols.length > 0) {
      const batchKey = `batch-${uncachedSymbols.join(',')}-${currency}`;
      
      const fetchedPrices = await this.rateLimiter.execute(batchKey, async () => {
        const allResults: PriceData[] = [];
        
        // Try each provider
        for (const provider of this.providers) {
          try {
            const providerResults = await provider.fetchMultiplePrices(uncachedSymbols, currency);
            allResults.push(...providerResults);
          } catch (error) {
            console.warn(`Provider failed:`, error);
          }
        }

        // Group by symbol and calculate consensus
        const grouped = this.groupBySymbol(allResults);
        const consensusPrices: PriceData[] = [];

        for (const [symbol, prices] of grouped.entries()) {
          if (prices.length > 0) {
            const consensusPrice = this.calculateConsensusPrice(prices);
            const priceData: PriceData = {
              symbol,
              price: consensusPrice,
              timestamp: new Date()
            };
            
            consensusPrices.push(priceData);
            
            // Cache individual results
            await this.cache.set(`${symbol}-${currency}`, priceData);
          }
        }

        return consensusPrices;
      });

      results.push(...fetchedPrices);
    }

    return results;
  }

  private async fetchFromProviders(symbol: string, currency: string): Promise<PriceData[]> {
    const results: PriceData[] = [];
    
    // Try each provider sequentially with fallback
    for (const provider of this.providers) {
      try {
        const price = await provider.fetchPrice(symbol, currency);
        results.push(price);
        
        // If we have enough providers for consensus, we can stop
        if (results.length >= Math.ceil(this.providers.length * this.consensusThreshold)) {
          break;
        }
      } catch (error) {
        console.warn(`Provider failed for ${symbol}:`, error);
        // Continue to next provider
      }
    }

    return results;
  }

  private calculateConsensusPrice(prices: PriceData[]): number {
    if (prices.length === 0) {
      throw new Error('No prices available for consensus');
    }

    if (prices.length === 1) {
      return prices[0].price;
    }

    // Sort prices
    const sortedPrices = prices.map(p => p.price).sort((a, b) => a - b);
    
    // Remove outliers (prices that deviate more than 10% from median)
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const filtered = sortedPrices.filter(price => 
      Math.abs(price - median) / median <= 0.1
    );

    // If too many outliers, use median
    if (filtered.length < prices.length * this.consensusThreshold) {
      return median;
    }

    // Calculate average of filtered prices
    return filtered.reduce((sum, price) => sum + price, 0) / filtered.length;
  }

  private groupBySymbol(prices: PriceData[]): Map<string, PriceData[]> {
    const grouped = new Map<string, PriceData[]>();
    
    for (const price of prices) {
      const symbol = price.symbol.toUpperCase();
      if (!grouped.has(symbol)) {
        grouped.set(symbol, []);
      }
      grouped.get(symbol)!.push(price);
    }

    return grouped;
  }

  // Utility methods for managing the aggregator
  
  addProvider(provider: PriceProvider): void {
    this.providers.push(provider);
  }

  removeProvider(index: number): void {
    this.providers.splice(index, 1);
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  resetRateLimiter(): void {
    this.rateLimiter.reset();
  }
}