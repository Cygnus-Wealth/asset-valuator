# Asset Valuator - Bounded Context Architecture

## Context Overview

The Asset Valuator bounded context is a core domain within the CygnusWealth Portfolio Management system, responsible for providing real-time and historical asset pricing data across cryptocurrency and traditional financial markets. This context serves as the single source of truth for asset valuation throughout the ecosystem.

## Domain Model

### Core Aggregates

#### PriceAggregate
The central aggregate responsible for managing price data from multiple sources.

**Entities:**
- `AssetPrice`: Represents a price point for an asset at a specific time
- `PriceData`: Raw price data from external providers
- `CachedPrice`: Time-bound cached price entries

**Value Objects:**
- `Currency`: Represents supported currencies (USD, BTC, ETH)
- `Symbol`: Asset identifier with validation
- `Timestamp`: UTC-based time representation
- `Price`: Decimal price with precision handling

#### ProviderAggregate
Manages external price data providers and their configurations.

**Entities:**
- `PriceProvider`: Interface for external data sources
- `ProviderConfiguration`: Provider-specific settings

**Value Objects:**
- `ApiEndpoint`: Provider API URL
- `RateLimit`: Request throttling configuration
- `CacheTTL`: Time-to-live settings per provider

## Bounded Context Boundaries

### Upstream Contexts
- **Market Data Providers**: External APIs (CoinGecko, CoinMarketCap)
  - Integration: Anti-Corruption Layer via Provider interfaces
  - Contract: REST API with rate limiting

### Downstream Contexts
- **Portfolio Aggregation**: Consumes price data for portfolio valuation
  - Integration: Published Language via `@cygnus-wealth/data-models`
  - Contract: Typed interfaces (AssetPrice, PriceData)

- **Transaction Processing**: Uses prices for transaction valuation
  - Integration: Open Host Service
  - Contract: Price conversion API

### Context Map
```
[Market Data Providers] -ACL-> [Asset Valuator] -OHS-> [Portfolio Aggregation]
                                       |
                                       v
                                [Transaction Processing]
```

## Architectural Patterns

### Hexagonal Architecture
The context implements hexagonal architecture with clear ports and adapters:

**Ports (Interfaces):**
- `PriceProvider`: Inbound port for price data
- `AssetValuator`: Outbound port for price requests
- `DataModelConverter`: Outbound port for data transformation

**Adapters:**
- `CoinGeckoProvider`: Adapter for CoinGecko API
- `CacheAdapter`: In-memory cache implementation
- `HttpClient`: Network communication adapter

### Domain-Driven Design Patterns

#### Repository Pattern
- `PriceRepository`: Abstracts price data persistence
- `CacheRepository`: Manages cached price storage

#### Factory Pattern
- `PriceProviderFactory`: Creates provider instances
- `AssetPriceFactory`: Constructs domain objects from raw data

#### Strategy Pattern
- `PricingStrategy`: Allows multiple pricing algorithms
- `ConversionStrategy`: Handles currency conversion logic

## Technical Architecture

### Module Structure
```
asset-valuator/
├── src/
│   ├── domain/              # Core domain logic
│   │   ├── aggregates/      # Domain aggregates
│   │   ├── entities/        # Domain entities
│   │   └── value-objects/   # Value objects
│   ├── application/         # Application services
│   │   ├── services/        # Use case implementations
│   │   └── dto/            # Data transfer objects
│   ├── infrastructure/      # External integrations
│   │   ├── providers/       # External API adapters
│   │   ├── cache/          # Caching implementation
│   │   └── converters/     # Data model converters
│   └── interfaces/          # Public API
│       ├── asset-valuator.ts # Main entry point
│       └── types.ts         # Public type definitions
```

### Caching Strategy

#### Multi-Layer Cache
1. **L1 Cache (Hot)**: 60-second TTL for active assets
2. **L2 Cache (Warm)**: 5-minute TTL for less active assets
3. **L3 Cache (Cold)**: 1-hour TTL for stable assets

#### Cache Invalidation
- Time-based expiration with configurable TTL
- Event-driven updates from price changes
- Manual refresh capability via API

### Error Handling

#### Domain Exceptions
- `AssetNotFoundException`: Unknown asset symbol
- `ProviderUnavailableException`: External API failure
- `RateLimitExceededException`: API quota exceeded
- `StaleDataException`: Cache data too old

#### Recovery Strategies
1. **Provider Failover**: Automatic fallback to secondary providers
2. **Cache Fallback**: Use cached data when fresh data unavailable
3. **Circuit Breaker**: Temporary provider disabling on repeated failures
4. **Retry Logic**: Exponential backoff with jitter

## Integration Points

### Inbound Integration
**AssetValuator Service Interface**
```typescript
interface AssetValuator {
  getPrice(symbol: string, currency?: string): Promise<AssetPrice>
  getPrices(symbols: string[], currency?: string): Promise<AssetPrice[]>
  convert(options: ConversionOptions): Promise<number>
}
```

### Outbound Integration
**Data Model Conversion**
```typescript
interface DataModelConverter {
  toPriceData(price: AssetPrice): PriceData
  toDataModel(prices: AssetPrice[]): DataModelPrice[]
}
```

## Quality Attributes

### Performance
- Single price fetch: < 200ms (cached), < 1s (fresh)
- Batch fetch (100 assets): < 2 seconds
- Cache hit ratio: > 80%
- Concurrent request handling: 1000 req/s

### Reliability
- API success rate: > 99%
- Automatic failover to backup providers
- Graceful degradation with cached data
- Circuit breaker for failing providers

### Scalability
- Horizontal scaling via stateless design
- Distributed cache support ready
- Batch operations for efficiency
- Request deduplication

### Security
- API key encryption at rest
- Request authentication
- Rate limit protection
- Input validation and sanitization

## Testing Strategy

### Framework
All tests use **Vitest 3.2.4** (migrated from Jest for enterprise consistency).

- `vitest.config.ts` — unit tests (`*.test.ts`, excludes `*.e2e.test.ts`)
- `vitest.e2e.config.ts` — E2E tests (`*.e2e.test.ts`, 15 s timeout, 2 retries)

### Unit Testing
- Domain logic isolation
- Value object validation
- Cache behavior verification
- Error handling scenarios
- Run: `npm test`

### E2E Testing
End-to-end scenarios verify the full pricing pipeline:

| Scenario | Priority | Description |
|---|---|---|
| Single price fetch | P0 | Fetch BTC/ETH/USDC price in USD |
| Batch price fetch | P1 | Fetch multiple assets in one call |
| Currency conversion | P1 | BTC→USD, USD→ETH, cross-crypto |
| API unavailable fallback | P1 | Graceful failure when provider down |
| Stale price detection | P2 | Cache TTL, expiry, and refresh |

**Recorded vs live responses:**
- CI runs use recorded API fixtures (`src/__fixtures__/coingecko-responses.ts`) via a `RecordedPriceProvider` for deterministic results.
- Nightly / manual runs set `E2E_LIVE=true` to hit real provider APIs.

Run: `npm run test:e2e` (CI) or `E2E_LIVE=true npm run test:e2e` (live)

### Integration Testing
- Provider API mocking
- Cache integration
- Data conversion accuracy

### Contract Testing
- Provider API contracts
- Consumer-driven contracts
- Data model compatibility

## Deployment Architecture

### Container Strategy
- Docker containerization
- Environment-based configuration
- Secret management via environment variables

### Monitoring
- Health check endpoints
- Metrics collection (cache hits, API calls)
- Distributed tracing support
- Error logging and alerting

## Evolution Strategy

### Extensibility Points
1. **Provider Plugins**: Easy addition of new price sources
2. **Currency Support**: Expandable currency types
3. **Cache Backends**: Pluggable cache implementations
4. **Pricing Algorithms**: Customizable aggregation strategies

### Future Enhancements
- WebSocket support for real-time prices
- Historical data persistence
- Machine learning price predictions
- Decentralized oracle integration
- Cross-chain price discovery

## Compliance and Governance

### Data Governance
- Price data attribution
- Source transparency
- Audit trail for price changes
- Data retention policies

### API Governance
- Versioning strategy
- Deprecation policy
- Rate limiting per consumer
- SLA definitions

## Dependencies

### Internal Dependencies
- `@cygnus-wealth/data-models`: Shared data structures

### External Dependencies
- `axios`: HTTP client for API calls
- `vitest`: Testing framework
- `typescript`: Type safety

### Provider Dependencies
- CoinGecko API
- CoinMarketCap API (future)
- Direct exchange APIs (future)

## Anti-Patterns to Avoid

1. **Direct Provider Coupling**: Always use abstractions
2. **Synchronous Batch Fetching**: Use parallel processing
3. **Unbounded Cache Growth**: Implement cache eviction
4. **Tight Consumer Coupling**: Maintain stable interfaces
5. **Price Data Mutation**: Treat prices as immutable

## Decision Log

### ADR-001: In-Memory Cache
**Decision**: Use in-memory caching initially
**Rationale**: Simplicity, performance, sufficient for current scale
**Consequences**: Will need distributed cache for horizontal scaling

### ADR-002: USD as Intermediate Currency
**Decision**: Use USD for crypto-to-crypto conversions
**Rationale**: Most liquid, widely available pricing
**Consequences**: Additional conversion step, potential precision loss

### ADR-003: Provider Abstraction
**Decision**: Abstract all external providers behind interfaces
**Rationale**: Flexibility, testability, vendor independence
**Consequences**: Additional abstraction layer, initial complexity

### ADR-004: Event-Driven Updates
**Decision**: Implement event-driven cache updates
**Rationale**: Real-time data freshness, proactive updates
**Consequences**: Event infrastructure requirement