import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { AssetValuator } from './asset-valuator.js';
import { PriceProvider, PriceData } from './types.js';
import {
  SINGLE_PRICE_BTC,
  SINGLE_PRICE_ETH,
  SINGLE_PRICE_USDC,
  BATCH_PRICES,
  BATCH_PRICES_WITH_BNB,
} from './__fixtures__/coingecko-responses.js';

const isLive = process.env.E2E_LIVE === 'true';

/**
 * Recorded-response provider that replays fixture data for CI.
 * When E2E_LIVE=true these tests hit real APIs instead.
 */
class RecordedPriceProvider implements PriceProvider {
  private responses: Record<string, Record<string, number>> = {
    ...SINGLE_PRICE_BTC,
    ...SINGLE_PRICE_ETH,
    ...SINGLE_PRICE_USDC,
    ...BATCH_PRICES,
  };

  private symbolToId: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    USDC: 'usd-coin',
    USDT: 'tether',
    BNB: 'binancecoin',
  };

  async fetchPrice(symbol: string, currency: string = 'usd'): Promise<PriceData> {
    const id = this.symbolToId[symbol.toUpperCase()] ?? symbol.toLowerCase();
    const prices = this.responses[id];
    if (!prices || prices[currency.toLowerCase()] === undefined) {
      throw new Error(`RecordedPriceProvider: no recorded response for ${symbol} in ${currency}`);
    }
    return {
      symbol: symbol.toUpperCase(),
      price: prices[currency.toLowerCase()],
      timestamp: new Date(),
    };
  }

  async fetchMultiplePrices(symbols: string[], currency: string = 'usd'): Promise<PriceData[]> {
    const results: PriceData[] = [];
    for (const symbol of symbols) {
      try {
        results.push(await this.fetchPrice(symbol, currency));
      } catch {
        // skip unknown symbols
      }
    }
    return results;
  }
}

/**
 * Provider that always throws — used to simulate API unavailability.
 */
class FailingPriceProvider implements PriceProvider {
  async fetchPrice(): Promise<PriceData> {
    throw new Error('API unavailable');
  }
  async fetchMultiplePrices(): Promise<PriceData[]> {
    throw new Error('API unavailable');
  }
}

function createValuator(): AssetValuator {
  if (isLive) {
    // Live mode: default production provider (DecentralizedAggregator)
    return new AssetValuator();
  }
  // CI mode: recorded fixture provider
  return new AssetValuator(new RecordedPriceProvider());
}

describe('AssetValuator E2E', () => {
  let valuator: AssetValuator;

  beforeEach(() => {
    valuator = createValuator();
  });

  // ── P0: Price fetch for a known asset ────────────────────────────
  describe('P0: single price fetch', () => {
    it('should fetch BTC price in USD', async () => {
      const price = await valuator.getPrice('BTC', 'USD');

      expect(price.base).toBe('BTC');
      expect(price.quote).toBe('USD');
      expect(price.price).toBeGreaterThan(0);
      expect(price.timestamp).toBeInstanceOf(Date);
    });

    it('should fetch ETH price in USD', async () => {
      const price = await valuator.getPrice('ETH', 'USD');

      expect(price.base).toBe('ETH');
      expect(price.quote).toBe('USD');
      expect(price.price).toBeGreaterThan(0);
      expect(price.timestamp).toBeInstanceOf(Date);
    });

    it('should fetch USDC price close to 1 USD', async () => {
      const price = await valuator.getPrice('USDC', 'USD');

      expect(price.base).toBe('USDC');
      expect(price.price).toBeGreaterThan(0.95);
      expect(price.price).toBeLessThan(1.05);
    });
  });

  // ── P1: Batch price fetch ────────────────────────────────────────
  describe('P1: batch price fetch', () => {
    it('should fetch prices for multiple assets', async () => {
      const prices = await valuator.getPrices(['BTC', 'ETH', 'USDC'], 'USD');

      expect(prices.length).toBeGreaterThanOrEqual(3);

      const symbols = prices.map(p => p.base);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('USDC');

      for (const p of prices) {
        expect(p.price).toBeGreaterThan(0);
        expect(p.quote).toBe('USD');
        expect(p.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should return BTC price higher than ETH price', async () => {
      const prices = await valuator.getPrices(['BTC', 'ETH'], 'USD');
      const btc = prices.find(p => p.base === 'BTC')!;
      const eth = prices.find(p => p.base === 'ETH')!;

      expect(btc.price).toBeGreaterThan(eth.price);
    });
  });

  // ── P1: Currency conversion ──────────────────────────────────────
  describe('P1: currency conversion', () => {
    it('should convert BTC to USD', async () => {
      const usdValue = await valuator.convert({ from: 'BTC', to: 'USD', amount: 1 });

      expect(usdValue).toBeGreaterThan(0);
    });

    it('should convert USD to ETH', async () => {
      const ethValue = await valuator.convert({ from: 'USD', to: 'ETH', amount: 10000 });

      expect(ethValue).toBeGreaterThan(0);
      expect(ethValue).toBeLessThan(10000); // 10k USD < 10k ETH
    });

    it('should convert ETH to BTC (cross-crypto)', async () => {
      const btcValue = await valuator.convert({ from: 'ETH', to: 'BTC', amount: 10 });

      expect(btcValue).toBeGreaterThan(0);
      expect(btcValue).toBeLessThan(10); // 10 ETH < 10 BTC in value
    });

    it('should return same amount for same currency', async () => {
      const result = await valuator.convert({ from: 'USD', to: 'USD', amount: 500 });
      expect(result).toBe(500);
    });
  });

  // ── P1: API unavailable fallback ─────────────────────────────────
  describe('P1: API unavailable fallback', () => {
    it('should throw when API is unavailable for non-stablecoin', async () => {
      const failValuator = new AssetValuator(new FailingPriceProvider());

      await expect(failValuator.getPrice('BTC', 'USD')).rejects.toThrow();
    });

    it('should throw when batch fetch fails for non-stablecoins', async () => {
      const failValuator = new AssetValuator(new FailingPriceProvider());

      await expect(failValuator.getPrices(['BTC', 'ETH'], 'USD')).rejects.toThrow();
    });

    it('should throw when conversion fails due to unavailable API', async () => {
      const failValuator = new AssetValuator(new FailingPriceProvider());

      await expect(
        failValuator.convert({ from: 'BTC', to: 'USD', amount: 1 })
      ).rejects.toThrow();
    });
  });

  // ── P2: Stale price detection ────────────────────────────────────
  describe('P2: stale price detection', () => {
    it('should serve cached price within TTL', async () => {
      valuator.setCacheTimeout(5000); // 5 seconds

      const first = await valuator.getPrice('BTC', 'USD');
      const second = await valuator.getPrice('BTC', 'USD');

      // Both should return valid prices (second from cache)
      expect(first.price).toBe(second.price);
    });

    it('should refresh price after cache expiry', async () => {
      valuator.setCacheTimeout(50); // 50ms

      const first = await valuator.getPrice('BTC', 'USD');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const second = await valuator.getPrice('BTC', 'USD');

      // Both should be valid prices (second is a fresh fetch)
      expect(first.price).toBeGreaterThan(0);
      expect(second.price).toBeGreaterThan(0);
    });

    it('should clear cache and refetch', async () => {
      await valuator.getPrice('BTC', 'USD');
      valuator.clearCache();

      const fresh = await valuator.getPrice('BTC', 'USD');
      expect(fresh.price).toBeGreaterThan(0);
    });
  });
});
