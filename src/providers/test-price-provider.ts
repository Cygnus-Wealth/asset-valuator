import { PriceData, PriceProvider } from '../types.js';

const DETERMINISTIC_PRICES: Record<string, number> = {
  BTC: 40000,
  ETH: 2000,
  SOL: 100,
  USDC: 1,
  USDT: 1,
};

export class TestPriceProvider implements PriceProvider {
  async fetchPrice(symbol: string, _currency: string = 'usd'): Promise<PriceData> {
    const normalizedSymbol = symbol.toUpperCase();
    const price = DETERMINISTIC_PRICES[normalizedSymbol];

    if (price === undefined) {
      throw new Error(`TestPriceProvider: no deterministic price for ${normalizedSymbol}`);
    }

    return {
      symbol: normalizedSymbol,
      price,
      timestamp: new Date(),
    };
  }

  async fetchMultiplePrices(symbols: string[], currency: string = 'usd'): Promise<PriceData[]> {
    const results: PriceData[] = [];

    for (const symbol of symbols) {
      try {
        const priceData = await this.fetchPrice(symbol, currency);
        results.push(priceData);
      } catch {
        // Skip symbols without deterministic prices
      }
    }

    return results;
  }
}
