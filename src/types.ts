export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
}

export interface AssetPrice {
  base: string;
  quote: string;
  price: number;
  timestamp: Date;
}

export interface PriceProvider {
  fetchPrice(symbol: string, currency?: string): Promise<PriceData>;
  fetchMultiplePrices(symbols: string[], currency?: string): Promise<PriceData[]>;
}

export type SupportedCurrency = 'USD' | 'BTC' | 'ETH';

export interface ConversionOptions {
  from: string;
  to: string;
  amount?: number;
}