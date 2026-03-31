# Alpha-Forge

Financial analysis tool for instant financial data summaries.

**Status**: Early Development (MVP)

## Features

- 📊 Fetch financial data from FMP API
- 💻 CLI and Web API interfaces
- 📈 Financial metrics (Sharpe ratio, ROE, etc)
- 📝 Structured logging
- 🔄 Reusable business logic across interfaces

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your FMP API key

# Run CLI
npm start -- AAPL

# Run web server
npm run web
```

See [SETUP.md](docs/SETUP.md) for detailed instructions.

## Development Modes

### Fixture mode (no API key required)
```bash
npm run web:fixtures        # fixture server on :3001
cd frontend && npm run dev  # Vite SPA on :5173
```
Serves static JSON from `data/fixtures/{TICKER}/`. No FMP calls. Use for all frontend work.

### Live backend mode (requires `FMP_API_KEY` in `.env`)
```bash
npm run web:dev             # backend on :3000
# In frontend: set VITE_API_URL=http://localhost:3000 before npm run dev
cd frontend && npm run dev
```

### Full pipeline (CLI)
```bash
npm start -- AAPL           # runs analysis, writes data/AAPL-analysis.json
```

See [docs/BRANCH_HANDOFF.md](docs/BRANCH_HANDOFF.md) for multi-device setup and [docs/API_CONTRACT.md](docs/API_CONTRACT.md) for API endpoint shapes.

## Architecture

Single codebase, multiple interfaces:
- **CLI**: `npm start`
- **Web API**: `npm run web` (port 3000)
- **Pipeline**: Data transformation scripts

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for design details.

## Project Structure

```
src/
  ├── cli/        # Command-line interface
  ├── web/        # Web API server
  ├── services/   # Business logic
  └── utils/      # Utilities (logging, etc)
tests/
  ├── unit/       # Unit tests
  └── integration/# Integration tests
logs/             # Runtime logs (auto-rotated)
data/
  ├── cache/      # Cached API responses
  ├── fixtures/   # Sample data
  └── exports/    # Generated reports
docs/             # Documentation
```

## Development

### Commands
```bash
npm start -- AAPL          # CLI mode
npm run dev -- AAPL        # CLI with auto-reload
npm run web                # Web server
npm run web:dev            # Web with auto-reload
npm test                   # Run tests
npm run test:watch         # Tests with auto-reload
```

### Multi-Device Sync
Push to GitHub, pull on another device. No extra setup needed.

### GitHub Integration
- Use Issues/Projects for tracking todos
- Claude can read todos on every push

## AI Workflow

Claude agent definitions remain the source of truth in `.claude/agents/`.
Codex uses a mirrored copy in `.codex/agents/` so both tools can work from the same agent instructions without modifying Claude-owned files.

When agent files change, run:

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\sync-agents.ps1
```

See `docs/AGENT_SYNC.md` for safety rules and verification behavior.

## Contributing

1. Create an issue or discussion on GitHub
2. Work on a branch
3. Push when ready for review
4. Merge to main when complete

## API Reference

See [API.md](docs/API.md) (coming soon)

## License

MIT
