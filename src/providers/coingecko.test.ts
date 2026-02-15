import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { CoinGeckoProvider } from './coingecko.js';

vi.mock('axios', () => {
  return {
    default: {
      get: vi.fn(),
      isAxiosError: vi.fn(() => false),
    },
  };
});

const mockedAxios = vi.mocked(axios);

describe('CoinGeckoProvider', () => {
  let provider: CoinGeckoProvider;

  beforeEach(() => {
    provider = new CoinGeckoProvider();
    vi.clearAllMocks();
  });

  describe('Stablecoin fallback behavior', () => {
    describe('fetchPrice', () => {
      it('should return 1 USD for USDC when API fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        const result = await provider.fetchPrice('USDC', 'USD');

        expect(result).toEqual({
          symbol: 'USDC',
          price: 1,
          timestamp: expect.any(Date)
        });
      });

      it('should return 1 USD for USDT when API fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        const result = await provider.fetchPrice('USDT', 'USD');

        expect(result).toEqual({
          symbol: 'USDT',
          price: 1,
          timestamp: expect.any(Date)
        });
      });

      it('should return 1 USD for DAI when API fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        const result = await provider.fetchPrice('DAI', 'USD');

        expect(result).toEqual({
          symbol: 'DAI',
          price: 1,
          timestamp: expect.any(Date)
        });
      });

      it('should throw error for non-stablecoin when API fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        await expect(provider.fetchPrice('BTC', 'USD')).rejects.toThrow();
      });

      it('should throw error for stablecoin in non-USD currency when API fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        await expect(provider.fetchPrice('USDC', 'EUR')).rejects.toThrow();
      });
    });

    describe('fetchMultiplePrices', () => {
      it('should return 1 USD for stablecoins when API fails completely', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        const result = await provider.fetchMultiplePrices(['USDC', 'USDT', 'DAI'], 'USD');

        expect(result).toEqual([
          { symbol: 'USDC', price: 1, timestamp: expect.any(Date) },
          { symbol: 'USDT', price: 1, timestamp: expect.any(Date) },
          { symbol: 'DAI', price: 1, timestamp: expect.any(Date) }
        ]);
      });

      it('should return 1 USD for stablecoins when their prices are not found', async () => {
        mockedAxios.get.mockResolvedValueOnce({
          data: {
            bitcoin: { usd: 50000 },
            // USDC not in response
          }
        });

        const result = await provider.fetchMultiplePrices(['BTC', 'USDC'], 'USD');

        expect(result).toEqual([
          { symbol: 'BTC', price: 50000, timestamp: expect.any(Date) },
          { symbol: 'USDC', price: 1, timestamp: expect.any(Date) }
        ]);
      });

      it('should handle mixed stablecoins and regular tokens when API fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        const result = await provider.fetchMultiplePrices(['BTC', 'USDC', 'ETH', 'USDT'], 'USD');

        // Should only return stablecoins
        expect(result).toEqual([
          { symbol: 'USDC', price: 1, timestamp: expect.any(Date) },
          { symbol: 'USDT', price: 1, timestamp: expect.any(Date) }
        ]);
      });

      it('should throw error when no stablecoins and API fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

        await expect(provider.fetchMultiplePrices(['BTC', 'ETH'], 'USD')).rejects.toThrow();
      });
    });
  });
});
