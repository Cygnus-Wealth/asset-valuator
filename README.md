# @cygnus-wealth/asset-valuator

A TypeScript library for retrieving and converting cryptocurrency asset prices.

## Installation

```bash
npm install @cygnus-wealth/asset-valuator
```

## Usage

### Basic Usage

```typescript
import { AssetValuator } from '@cygnus-wealth/asset-valuator';

const valuator = new AssetValuator();

// Get the USD price of ETH
const ethPrice = await valuator.getPrice('ETH', 'USD');
console.log(ethPrice);
// { base: 'ETH', quote: 'USD', price: 3000, timestamp: Date }

// Convert 2 BTC to USD
const usdValue = await valuator.convert({
  from: 'BTC',
  to: 'USD',
  amount: 2
});
console.log(usdValue); // 100000 (assuming BTC = $50,000)

// Get ETH price in BTC
const ethInBtc = await valuator.convert({
  from: 'ETH',
  to: 'BTC'
});
console.log(ethInBtc); // 0.06 (assuming ETH = $3,000, BTC = $50,000)
```

### Fetching Multiple Prices

```typescript
const prices = await valuator.getPrices(['BTC', 'ETH', 'BNB'], 'USD');
console.log(prices);
// [
//   { base: 'BTC', quote: 'USD', price: 50000, timestamp: Date },
//   { base: 'ETH', quote: 'USD', price: 3000, timestamp: Date },
//   { base: 'BNB', quote: 'USD', price: 300, timestamp: Date }
// ]
```

### Data Model Integration

Convert prices to @cygnus-wealth/data-models format:

```typescript
import { DataModelConverter } from '@cygnus-wealth/asset-valuator';

const ethPrice = await valuator.getPrice('ETH', 'USD');
const assetValue = DataModelConverter.toAssetValueModel(ethPrice);
console.log(assetValue);
// {
//   assetSymbol: 'ETH',
//   currency: 'USD',
//   value: 3000,
//   timestamp: Date
// }
```

### Cache Management

```typescript
// Set cache timeout (default: 60 seconds)
valuator.setCacheTimeout(30000); // 30 seconds

// Clear cache
valuator.clearCache();
```

### Custom Price Provider

You can implement your own price provider:

```typescript
import { PriceProvider, AssetValuator } from '@cygnus-wealth/asset-valuator';

class CustomProvider implements PriceProvider {
  async fetchPrice(symbol: string, currency?: string) {
    // Your implementation
  }

  async fetchMultiplePrices(symbols: string[], currency?: string) {
    // Your implementation
  }
}

const valuator = new AssetValuator(new CustomProvider());
```

## API Reference

### AssetValuator

- `getPrice(base: string, quote?: string): Promise<AssetPrice>`
- `convert(options: ConversionOptions): Promise<number>`
- `getPrices(symbols: string[], quote?: string): Promise<AssetPrice[]>`
- `setCacheTimeout(milliseconds: number): void`
- `clearCache(): void`

### Types

```typescript
interface AssetPrice {
  base: string;
  quote: string;
  price: number;
  timestamp: Date;
}

interface ConversionOptions {
  from: string;
  to: string;
  amount?: number;
}
```

## License

MIT