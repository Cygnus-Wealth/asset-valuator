# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Build
```bash
npm run build  # Compile TypeScript to JavaScript in dist/
```

### Development
```bash
npm run dev   # Watch mode - automatically recompile on changes
```

### Testing
```bash
npm test                    # Run all tests
npm test -- --coverage      # Run tests with coverage report
npm test asset-valuator     # Run tests matching specific pattern
```

### Linting
```bash
npm run lint  # Run ESLint on TypeScript files
```

## Architecture Overview

This is a TypeScript library for cryptocurrency price retrieval and conversion, designed as an ES module with the following structure:

### Core Components

1. **AssetValuator** (src/asset-valuator.ts:4-97)
   - Main entry point for the library
   - Manages price caching with configurable timeout (default: 60 seconds)
   - Supports price retrieval, currency conversion, and batch operations
   - Uses dependency injection for price providers

2. **Price Providers** (src/providers/)
   - **CoinGeckoProvider** (src/providers/coingecko.ts:4-95): Default implementation using CoinGecko API
   - Implements PriceProvider interface for extensibility
   - Maps common symbols (BTC, ETH, etc.) to CoinGecko IDs

3. **Type System** (src/types.ts)
   - Defines interfaces: PriceProvider, AssetPrice, ConversionOptions, PriceData
   - Ensures type safety across the library

4. **Data Model Integration** (src/converters/data-model-converter.ts)
   - Converts prices to @cygnus-wealth/data-models format
   - Provides compatibility with the wider Cygnus Wealth ecosystem

### Key Design Patterns

- **Provider Pattern**: Allows custom price providers to be injected
- **Caching Strategy**: In-memory cache to reduce API calls with configurable timeout
- **USD Intermediary**: For crypto-to-crypto conversions, uses USD as intermediate currency
- **ES Modules**: Uses .js extensions in imports for ES module compatibility

### Dependencies

- **axios**: HTTP client for API requests
- **@cygnus-wealth/data-models**: Shared data model types

### Testing Setup

- Uses Jest with ts-jest for TypeScript support
- Configured for ES modules with proper module resolution
- Test files use .test.ts naming convention