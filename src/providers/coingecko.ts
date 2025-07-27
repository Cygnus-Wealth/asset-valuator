import axios from 'axios';
import { PriceData, PriceProvider } from '../types.js';

export class CoinGeckoProvider implements PriceProvider {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private stablecoins = new Set(['USDC', 'USDT', 'DAI']);
  private symbolToIdMap: Map<string, string> = new Map([
    ['BTC', 'bitcoin'],
    ['ETH', 'ethereum'],
    ['USDT', 'tether'],
    ['USDC', 'usd-coin'],
    ['BNB', 'binancecoin'],
    ['SOL', 'solana'],
    ['XRP', 'ripple'],
    ['ADA', 'cardano'],
    ['DOGE', 'dogecoin'],
    ['AVAX', 'avalanche-2'],
    ['DOT', 'polkadot'],
    ['MATIC', 'matic-network'],
    ['LINK', 'chainlink'],
    ['UNI', 'uniswap'],
    ['ATOM', 'cosmos'],
    ['LTC', 'litecoin'],
    ['DAI', 'dai'],
    ['WBTC', 'wrapped-bitcoin'],
    ['AAVE', 'aave'],
    ['COMP', 'compound-governance-token'],
    ['CRV', 'curve-dao-token'],
    ['MKR', 'maker'],
    ['SNX', 'synthetix-network-token'],
    ['SUSHI', 'sushi'],
    ['YFI', 'yearn-finance'],
  ]);

  private getCoingeckoId(symbol: string): string {
    return this.symbolToIdMap.get(symbol.toUpperCase()) || symbol.toLowerCase();
  }

  async fetchPrice(symbol: string, currency: string = 'usd'): Promise<PriceData> {
    const id = this.getCoingeckoId(symbol);
    const url = `${this.baseUrl}/simple/price`;
    
    try {
      const response = await axios.get(url, {
        params: {
          ids: id,
          vs_currencies: currency.toLowerCase()
        }
      });

      const price = response.data[id]?.[currency.toLowerCase()];
      
      if (price === undefined) {
        throw new Error(`Price not found for ${symbol} in ${currency}`);
      }

      return {
        symbol: symbol.toUpperCase(),
        price,
        timestamp: new Date()
      };
    } catch (error) {
      // For stablecoins, return 1 USD if we can't fetch the price
      if (this.stablecoins.has(symbol.toUpperCase()) && currency.toLowerCase() === 'usd') {
        return {
          symbol: symbol.toUpperCase(),
          price: 1,
          timestamp: new Date()
        };
      }
      
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch price: ${error.message}`);
      }
      throw error;
    }
  }

  async fetchMultiplePrices(symbols: string[], currency: string = 'usd'): Promise<PriceData[]> {
    const ids = symbols.map(s => this.getCoingeckoId(s)).join(',');
    const url = `${this.baseUrl}/simple/price`;
    
    try {
      const response = await axios.get(url, {
        params: {
          ids,
          vs_currencies: currency.toLowerCase()
        }
      });

      const results: PriceData[] = [];
      const timestamp = new Date();

      for (const symbol of symbols) {
        const id = this.getCoingeckoId(symbol);
        const price = response.data[id]?.[currency.toLowerCase()];
        
        if (price !== undefined) {
          results.push({
            symbol: symbol.toUpperCase(),
            price,
            timestamp
          });
        } else if (this.stablecoins.has(symbol.toUpperCase()) && currency.toLowerCase() === 'usd') {
          // For stablecoins, return 1 USD if price is not found
          results.push({
            symbol: symbol.toUpperCase(),
            price: 1,
            timestamp
          });
        }
      }

      return results;
    } catch (error) {
      // If the entire request fails, check if any symbols are stablecoins
      const results: PriceData[] = [];
      const timestamp = new Date();
      
      for (const symbol of symbols) {
        if (this.stablecoins.has(symbol.toUpperCase()) && currency.toLowerCase() === 'usd') {
          results.push({
            symbol: symbol.toUpperCase(),
            price: 1,
            timestamp
          });
        }
      }
      
      // If we have stablecoin results, return them; otherwise throw the error
      if (results.length > 0) {
        // For non-stablecoins, we still need to throw an error
        if (results.length < symbols.length) {
          console.warn(`Failed to fetch prices for some assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return results;
      }
      
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch prices: ${error.message}`);
      }
      throw error;
    }
  }
}