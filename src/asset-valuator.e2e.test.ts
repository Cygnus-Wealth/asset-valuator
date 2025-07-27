import { AssetValuator } from './asset-valuator.js';

describe('AssetValuator E2E Tests', () => {
  let valuator: AssetValuator;

  beforeEach(() => {
    valuator = new AssetValuator();
  });

  describe('USDC Price Retrieval', () => {
    it('should successfully get USDC price in USD', async () => {
      const price = await valuator.getPrice('USDC', 'USD');
      
      expect(price).toBeDefined();
      expect(price.base).toBe('USDC');
      expect(price.quote).toBe('USD');
      expect(price.price).toBeGreaterThan(0);
      expect(price.price).toBeLessThan(2); // USDC should be close to $1
      expect(price.timestamp).toBeInstanceOf(Date);
    });

    it('should successfully convert USDC to other currencies', async () => {
      const btcValue = await valuator.convert({
        from: 'USDC',
        to: 'BTC',
        amount: 1000
      });
      
      expect(btcValue).toBeGreaterThan(0);
      expect(btcValue).toBeLessThan(1); // 1000 USDC should be less than 1 BTC
    });

    it('should successfully get multiple prices including USDC', async () => {
      const prices = await valuator.getPrices(['BTC', 'ETH', 'USDC'], 'USD');
      
      expect(prices).toHaveLength(3);
      
      const usdcPrice = prices.find(p => p.base === 'USDC');
      expect(usdcPrice).toBeDefined();
      expect(usdcPrice!.price).toBeGreaterThan(0);
      expect(usdcPrice!.price).toBeLessThan(2);
    });
  });
});