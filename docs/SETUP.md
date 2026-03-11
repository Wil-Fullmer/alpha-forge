# Development Setup

## Prerequisites
- Node.js 18+
- npm or yarn

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Create your `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Add your FMP API key to `.env`:
```
FMP_API_KEY=your_api_key_here
```

## Running the Project

### CLI Mode
```bash
npm start -- AAPL     # Get company profile for Apple
npm run dev -- AAPL   # Development mode with auto-reload
```

### Web Server
```bash
npm run web           # Start web server on :3000
npm run web:dev       # Development mode with auto-reload
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## Project Structure

- `src/cli/` - Command-line interface
- `src/web/` - Web API server
- `src/services/` - Business logic (reusable across CLI & Web)
- `src/utils/` - Utilities (logging, formatting, etc)
- `tests/` - Test files
- `logs/` - Runtime logs (git-ignored)
- `data/` - Data artifacts (cache, fixtures, exports)
- `docs/` - Documentation

## Logging

Logs are configured in `src/utils/logger.js`:
- **Console**: Real-time output
- **data-errors.log**: API and data errors
- **pipeline.log**: All events

Logs are automatically rotated at 10MB with max 5 files per type.

⚠️ **Important**: Never log API keys or sensitive environment variables.

## Multi-Device Development with GitHub

1. Commit your work:
```bash
git add .
git commit -m "Your message"
git push
```

2. On another device, pull and install:
```bash
git pull
npm install
```

GitHub Issues/Projects can be used to track todos across devices.
