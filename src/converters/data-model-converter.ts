import { AssetPrice } from '../types.js';
// Import from @cygnus-wealth/data-models when types are available
// For now, we'll define expected interfaces

interface AssetValueModel {
  assetSymbol: string;
  currency: string;
  value: number;
  timestamp: Date;
}

interface AssetPairModel {
  baseAsset: string;
  quoteAsset: string;
  price: number;
  volume24h?: number;
  changePercent24h?: number;
  lastUpdated: Date;
}

export class DataModelConverter {
  static toAssetValueModel(assetPrice: AssetPrice): AssetValueModel {
    return {
      assetSymbol: assetPrice.base,
      currency: assetPrice.quote,
      value: assetPrice.price,
      timestamp: assetPrice.timestamp
    };
  }

  static toAssetPairModel(assetPrice: AssetPrice): AssetPairModel {
    return {
      baseAsset: assetPrice.base,
      quoteAsset: assetPrice.quote,
      price: assetPrice.price,
      lastUpdated: assetPrice.timestamp
    };
  }

  static fromAssetValueModel(model: AssetValueModel): AssetPrice {
    return {
      base: model.assetSymbol,
      quote: model.currency,
      price: model.value,
      timestamp: model.timestamp
    };
  }

  static fromAssetPairModel(model: AssetPairModel): AssetPrice {
    return {
      base: model.baseAsset,
      quote: model.quoteAsset,
      price: model.price,
      timestamp: model.lastUpdated
    };
  }
}