import axios from 'axios';
import { PriceData, PriceProvider } from '../types.js';

export class CoinPaprikaProvider implements PriceProvider {
  private baseUrl = 'https://api.coinpaprika.com/v1';
  private symbolToIdMap: Map<string, string> = new Map([
    ['BTC', 'btc-bitcoin'],
    ['ETH', 'eth-ethereum'],
    ['USDT', 'usdt-tether'],
    ['USDC', 'usdc-usd-coin'],
    ['BNB', 'bnb-binance-coin'],
    ['SOL', 'sol-solana'],
    ['XRP', 'xrp-xrp'],
    ['ADA', 'ada-cardano'],
    ['DOGE', 'doge-dogecoin'],
    ['AVAX', 'avax-avalanche'],
    ['DOT', 'dot-polkadot'],
    ['MATIC', 'matic-polygon'],
    ['LINK', 'link-chainlink'],
    ['UNI', 'uni-uniswap'],
    ['ATOM', 'atom-cosmos'],
    ['LTC', 'ltc-litecoin'],
    ['DAI', 'dai-dai'],
  ]);

  private getCoinPaprikaId(symbol: string): string {
    return this.symbolToIdMap.get(symbol.toUpperCase()) || `${symbol.toLowerCase()}-${symbol.toLowerCase()}`;
  }

  async fetchPrice(symbol: string, currency: string = 'usd'): Promise<PriceData> {
    const id = this.getCoinPaprikaId(symbol);
    const url = `${this.baseUrl}/tickers/${id}`;
    
    try {
      const response = await axios.get(url);
      const data = response.data;
      
      if (!data || !data.quotes || !data.quotes.USD) {
        throw new Error(`Price not found for ${symbol}`);
      }

      // CoinPaprika only provides USD prices in free tier
      const priceInUSD = data.quotes.USD.price;
      
      const price = priceInUSD;
      if (currency.toLowerCase() !== 'usd') {
        // For other currencies, we'd need to convert
        // This is a limitation of the free API
        throw new Error(`CoinPaprika free tier only supports USD prices`);
      }

      return {
        symbol: symbol.toUpperCase(),
        price,
        timestamp: new Date()
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch price from CoinPaprika: ${error.message}`);
      }
      throw error;
    }
  }

  async fetchMultiplePrices(symbols: string[], currency: string = 'usd'): Promise<PriceData[]> {
    // CoinPaprika requires individual requests for each coin
    const promises = symbols.map(symbol => 
      this.fetchPrice(symbol, currency).catch(() => null)
    );
    
    const results = await Promise.all(promises);
    return results.filter((result): result is PriceData => result !== null);
  }
}