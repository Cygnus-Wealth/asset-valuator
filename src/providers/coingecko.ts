import axios from 'axios';
import { PriceData, PriceProvider } from '../types.js';

export class CoinGeckoProvider implements PriceProvider {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private symbolToIdMap: Map<string, string> = new Map([
    ['BTC', 'bitcoin'],
    ['ETH', 'ethereum'],
    ['USDT', 'tether'],
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
        }
      }

      return results;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch prices: ${error.message}`);
      }
      throw error;
    }
  }
}