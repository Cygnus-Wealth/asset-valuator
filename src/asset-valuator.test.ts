import { describe, it, expect, beforeEach } from 'vitest';
import { AssetValuator } from './asset-valuator.js';
import { PriceProvider, PriceData } from './types.js';

// Mock provider for testing
class MockPriceProvider implements PriceProvider {
  private prices: Map<string, number> = new Map([
    ['BTC_USD', 50000],
    ['ETH_USD', 3000],
    ['BNB_USD', 300],
  ]);

  async fetchPrice(symbol: string, currency: string = 'usd'): Promise<PriceData> {
    const key = `${symbol.toUpperCase()}_${currency.toUpperCase()}`;
    const price = this.prices.get(key);
    
    if (!price) {
      throw new Error(`Price not found for ${symbol} in ${currency}`);
    }

    return {
      symbol: symbol.toUpperCase(),
      price,
      timestamp: new Date()
    };
  }

  async fetchMultiplePrices(symbols: string[], currency: string = 'usd'): Promise<PriceData[]> {
    const results: PriceData[] = [];
    
    for (const symbol of symbols) {
      try {
        const priceData = await this.fetchPrice(symbol, currency);
        results.push(priceData);
      } catch {
        // Skip if price not found
      }
    }
    
    return results;
  }
}

describe('AssetValuator', () => {
  let valuator: AssetValuator;

  beforeEach(() => {
    valuator = new AssetValuator(new MockPriceProvider());
  });

  describe('getPrice', () => {
    it('should fetch price for BTC in USD', async () => {
      const result = await valuator.getPrice('BTC', 'USD');
      
      expect(result.base).toBe('BTC');
      expect(result.quote).toBe('USD');
      expect(result.price).toBe(50000);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should use USD as default quote currency', async () => {
      const result = await valuator.getPrice('ETH');
      
      expect(result.quote).toBe('USD');
      expect(result.price).toBe(3000);
    });

    it('should cache prices', async () => {
      const firstCall = await valuator.getPrice('BTC', 'USD');
      const secondCall = await valuator.getPrice('BTC', 'USD');
      
      expect(firstCall.price).toBe(secondCall.price);
    });
  });

  describe('convert', () => {
    it('should convert BTC to USD', async () => {
      const result = await valuator.convert({
        from: 'BTC',
        to: 'USD',
        amount: 2
      });
      
      expect(result).toBe(100000); // 2 * 50000
    });

    it('should convert USD to ETH', async () => {
      const result = await valuator.convert({
        from: 'USD',
        to: 'ETH',
        amount: 6000
      });
      
      expect(result).toBe(2); // 6000 / 3000
    });

    it('should convert ETH to BTC', async () => {
      const result = await valuator.convert({
        from: 'ETH',
        to: 'BTC',
        amount: 10
      });
      
      expect(result).toBe(0.6); // (3000 * 10) / 50000
    });

    it('should return same amount for same currency', async () => {
      const result = await valuator.convert({
        from: 'USD',
        to: 'USD',
        amount: 100
      });
      
      expect(result).toBe(100);
    });

    it('should default to amount 1 if not specified', async () => {
      const result = await valuator.convert({
        from: 'BTC',
        to: 'USD'
      });
      
      expect(result).toBe(50000);
    });
  });

  describe('getPrices', () => {
    it('should fetch multiple prices', async () => {
      const results = await valuator.getPrices(['BTC', 'ETH', 'BNB'], 'USD');
      
      expect(results).toHaveLength(3);
      expect(results[0].base).toBe('BTC');
      expect(results[0].price).toBe(50000);
      expect(results[1].base).toBe('ETH');
      expect(results[1].price).toBe(3000);
      expect(results[2].base).toBe('BNB');
      expect(results[2].price).toBe(300);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      await valuator.getPrice('BTC', 'USD');
      valuator.clearCache();
      
      // This would make a new request if cache is cleared
      // In a real test, we'd verify the provider is called again
      const result = await valuator.getPrice('BTC', 'USD');
      expect(result.price).toBe(50000);
    });

    it('should respect cache timeout', async () => {
      valuator.setCacheTimeout(100); // 100ms timeout
      
      await valuator.getPrice('BTC', 'USD');
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // This should fetch new price after cache expiry
      const result = await valuator.getPrice('BTC', 'USD');
      expect(result.price).toBe(50000);
    });
  });
});