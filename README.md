# Alpha-Forge

Financial analysis tool for instant financial data summaries.

**Status**: Early Development (MVP)

## Features

- 📊 Fetch financial data from FMP API
- 💻 CLI and Web API interfaces
- 📈 Financial metrics (Sharpe ratio, ROE, etc)
- 📝 Structured logging
- 🔄 Reusable business logic across interfaces

## Getting Started

### What you'll need

- **Node.js 18 or newer** — [Download at nodejs.org](https://nodejs.org/en/download)  
  After installing, open a terminal and run `node --version` to confirm. You should see `v18.x.x` or higher.
- **A terminal** — on Windows, search for "Command Prompt" or "PowerShell" in the Start menu. On Mac, open Spotlight (⌘ Space) and search "Terminal".

### Step 1 — Install dependencies

Open your terminal, navigate to the project folder, then run:

```bash
npm install
```

Then install the frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

This downloads everything the app needs. It takes 1–2 minutes the first time.

---

### Option A — Demo Mode (no API key needed)

Uses built-in sample stock data. The best way to try the app without any setup.

You'll need **two terminal windows** open in the project folder.

**Terminal 1 — start the data server:**
```bash
npm run web:fixtures
```
You should see:
```
Fixture server  http://localhost:3001
Mode: static JSON — no API calls, no pipeline
```

**Terminal 2 — start the web app:**
```bash
cd frontend
npm run dev
```
You should see a line that says `Local: http://localhost:5173`

Open **http://localhost:5173** in your browser. You're in.

---

### Option B — Live Mode (requires a free API key)

Pulls real financial data via the Financial Modeling Prep (FMP) API.

#### 1. Get a free API key

1. Go to [financialmodelingprep.com](https://financialmodelingprep.com/developer/docs)
2. Sign up for a free account
3. Copy your API key from the dashboard

#### 2. Create your `.env` file

In the project root folder, make a copy of `.env.example` and name it `.env`:

```bash
# Mac, Linux, or Git Bash on Windows:
cp .env.example .env

# Windows PowerShell:
Copy-Item .env.example .env

# Windows Command Prompt:
copy .env.example .env
```

Open `.env` in any text editor. Find this line:

```
FMP_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with the API key you copied. Save the file.

#### 3. Connect the frontend to the live server

Inside the `frontend/` folder, create a new file named `.env.local` containing:

```
VITE_API_URL=http://localhost:3000
```

#### 4. Start the app

You'll need **two terminal windows** open in the project folder.

**Terminal 1 — start the live data server:**
```bash
npm run web:dev
```
You should see:
```
🚀 Server started on http://localhost:3000
```

**Terminal 2 — start the web app:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

### CLI Mode (advanced)

For running a full analysis from the command line (requires `FMP_API_KEY` in `.env`):

```bash
npm start -- AAPL
```

Outputs a JSON report to `data/AAPL-analysis.json`.

---

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
