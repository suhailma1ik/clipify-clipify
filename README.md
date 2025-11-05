# Clipify - Electron Migration

AI-powered text processing desktop application built with Electron, React, and TypeScript.

## Project Structure

```
clipify/
├── src/
│   ├── main/           # Main process (Node.js)
│   ├── preload/        # Preload scripts (Context Bridge)
│   └── renderer/       # Renderer process (React)
├── out/                # Build output
├── release/            # Distribution packages
└── resources/          # App resources (icons, etc.)
```

## Development

### Prerequisites

- Node.js 18+ 
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build

```bash
# Build for current platform
npm run build

# Create distribution packages
npm run dist

# Platform-specific builds
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## Configuration

### Environment Variables

- `.env.development` - Development environment configuration
- `.env.production` - Production environment configuration

### TypeScript

- `tsconfig.json` - Main/Preload TypeScript config
- `tsconfig.web.json` - Renderer TypeScript config
- `tsconfig.node.json` - Build tools TypeScript config

## Architecture

- **Main Process**: Manages application lifecycle, windows, system integration
- **Preload Script**: Secure bridge between main and renderer processes
- **Renderer Process**: React-based UI running in Chromium

## Security

- Context isolation enabled
- Node integration disabled
- Sandbox enabled
- Secure IPC communication via context bridge

## License

ISC
