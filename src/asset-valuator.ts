import { PriceProvider, AssetPrice, ConversionOptions, SupportedCurrency } from './types.js';
import { DecentralizedAggregator } from './providers/decentralized-aggregator.js';

export class AssetValuator {
  private provider: PriceProvider;
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000; // 1 minute

  constructor(provider?: PriceProvider) {
    this.provider = provider || new DecentralizedAggregator();
  }

  private getCacheKey(base: string, quote: string): string {
    return `${base.toUpperCase()}_${quote.toUpperCase()}`;
  }

  private async getCachedOrFetchPrice(symbol: string, currency: string): Promise<number> {
    const cacheKey = this.getCacheKey(symbol, currency);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.price;
    }

    const priceData = await this.provider.fetchPrice(symbol, currency);
    this.cache.set(cacheKey, {
      price: priceData.price,
      timestamp: Date.now()
    });

    return priceData.price;
  }

  async getPrice(base: string, quote: string = 'USD'): Promise<AssetPrice> {
    const price = await this.getCachedOrFetchPrice(base, quote);
    
    return {
      base: base.toUpperCase(),
      quote: quote.toUpperCase(),
      price,
      timestamp: new Date()
    };
  }

  async convert(options: ConversionOptions): Promise<number> {
    const { from, to, amount = 1 } = options;
    
    if (from.toUpperCase() === to.toUpperCase()) {
      return amount;
    }

    if (to.toUpperCase() === 'USD') {
      const price = await this.getCachedOrFetchPrice(from, 'USD');
      return price * amount;
    }

    if (from.toUpperCase() === 'USD') {
      const price = await this.getCachedOrFetchPrice(to, 'USD');
      return amount / price;
    }

    // For crypto-to-crypto conversions, use USD as intermediate
    const fromPriceInUSD = await this.getCachedOrFetchPrice(from, 'USD');
    const toPriceInUSD = await this.getCachedOrFetchPrice(to, 'USD');
    
    return (fromPriceInUSD / toPriceInUSD) * amount;
  }

  async getPrices(symbols: string[], quote: string = 'USD'): Promise<AssetPrice[]> {
    const prices = await this.provider.fetchMultiplePrices(symbols, quote);
    const timestamp = new Date();

    // Update cache
    for (const priceData of prices) {
      const cacheKey = this.getCacheKey(priceData.symbol, quote);
      this.cache.set(cacheKey, {
        price: priceData.price,
        timestamp: Date.now()
      });
    }

    return prices.map(p => ({
      base: p.symbol,
      quote: quote.toUpperCase(),
      price: p.price,
      timestamp
    }));
  }

  setCacheTimeout(milliseconds: number): void {
    this.cacheTimeout = milliseconds;
  }

  clearCache(): void {
    this.cache.clear();
  }
}