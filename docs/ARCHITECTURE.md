# Architecture

## Overview
Alpha-Forge is a modular financial analysis tool supporting multiple interfaces:
- **CLI**: Command-line analysis
- **Web API**: HTTP endpoints for web apps
- **Pipeline**: Data transformation and enrichment

## Core Design Principle
**Separation of Concerns**: Business logic lives in `services/`, interfaces (CLI/Web) are thin wrappers.

This allows:
- Reuse across CLI and Web
- Easy testing of business logic
- Simple conversion from CLI → Web

## Data Flow

```
External API (FMP)
       ↓
financialData.js (fetch, cache)
       ↓
analysis.js (calculations)
       ↓
CLI Output / Web Response
```

## Key Modules

### Services (`src/services/`)
- **financialData.js** - FMP API calls
- **analysis.js** - Financial calculations (Sharpe, ROE, etc)

### Interfaces
- **CLI** (`src/cli/`) - Command-line entry point
- **Web** (`src/web/`) - HTTP server with routes

### Utilities (`src/utils/`)
- **logger.js** - Structured logging with file rotation

## Adding New Features

1. Add business logic to `src/services/newFeature.js`
2. Export functions that are interface-agnostic
3. Call from CLI or Web as needed

Example:
```js
// src/services/metrics.js - reusable
export function calculateMetric(data) { ... }

// src/cli/index.js - CLI interface
const result = await calculateMetric(data)
console.log(result)

// src/web/server.js - Web interface
res.json({ metric: calculateMetric(data) })
```

## Testing

- Unit tests in `tests/unit/` - test services in isolation
- Integration tests in `tests/integration/` - test full pipelines
- No test dependencies on CLI or Web output format

## Security

- API keys loaded from `.env`, never hardcoded
- Sensitive data never logged (see logger.js)
- Error messages don't expose credentials
