import { AssetValuator, DataModelConverter } from '../src/index.js';

async function main() {
  const valuator = new AssetValuator();

  console.log('=== Asset Valuator Examples ===\n');

  // Example 1: Get single price
  console.log('1. Getting BTC price in USD:');
  const btcPrice = await valuator.getPrice('BTC', 'USD');
  console.log(btcPrice);
  console.log();

  // Example 2: Get ETH price (USD is default)
  console.log('2. Getting ETH price (default USD):');
  const ethPrice = await valuator.getPrice('ETH');
  console.log(ethPrice);
  console.log();

  // Example 3: Convert currencies
  console.log('3. Converting 0.5 BTC to USD:');
  const btcToUsd = await valuator.convert({
    from: 'BTC',
    to: 'USD',
    amount: 0.5
  });
  console.log(`0.5 BTC = $${btcToUsd}`);
  console.log();

  // Example 4: Convert ETH to BTC
  console.log('4. Converting 10 ETH to BTC:');
  const ethToBtc = await valuator.convert({
    from: 'ETH',
    to: 'BTC',
    amount: 10
  });
  console.log(`10 ETH = ${ethToBtc} BTC`);
  console.log();

  // Example 5: Get multiple prices
  console.log('5. Getting multiple crypto prices:');
  const prices = await valuator.getPrices(['BTC', 'ETH', 'BNB', 'SOL'], 'USD');
  prices.forEach(p => {
    console.log(`${p.base}: $${p.price}`);
  });
  console.log();

  // Example 6: Data model conversion
  console.log('6. Converting to data model format:');
  const assetValue = DataModelConverter.toAssetValueModel(ethPrice);
  console.log('AssetValueModel:', assetValue);
  
  const assetPair = DataModelConverter.toAssetPairModel(ethPrice);
  console.log('AssetPairModel:', assetPair);
  console.log();

  // Example 7: Cache demonstration
  console.log('7. Cache demonstration:');
  console.time('First call');
  await valuator.getPrice('BTC', 'USD');
  console.timeEnd('First call');
  
  console.time('Second call (cached)');
  await valuator.getPrice('BTC', 'USD');
  console.timeEnd('Second call (cached)');
}

main().catch(console.error);