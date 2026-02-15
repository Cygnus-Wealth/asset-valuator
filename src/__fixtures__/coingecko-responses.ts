/**
 * Recorded CoinGecko API responses for deterministic CI testing.
 * Captured from live API — prices are representative snapshots, not live values.
 * When E2E_LIVE=true these fixtures are bypassed in favor of live calls.
 */

export const SINGLE_PRICE_BTC = {
  bitcoin: { usd: 97250.42 },
};

export const SINGLE_PRICE_ETH = {
  ethereum: { usd: 3285.18 },
};

export const SINGLE_PRICE_USDC = {
  'usd-coin': { usd: 0.9998 },
};

export const BATCH_PRICES = {
  bitcoin: { usd: 97250.42 },
  ethereum: { usd: 3285.18 },
  solana: { usd: 178.63 },
  'usd-coin': { usd: 0.9998 },
  tether: { usd: 1.0001 },
};

export const BATCH_PRICES_WITH_BNB = {
  bitcoin: { usd: 97250.42 },
  ethereum: { usd: 3285.18 },
  'usd-coin': { usd: 0.9998 },
};
