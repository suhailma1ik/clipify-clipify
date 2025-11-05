# Clipify - Electron Migration Quick Reference

## What is Clipify?

A desktop app for AI-powered text processing with global hotkeys. Currently built with Tauri (Rust + React), this document helps rebuild it in Electron (Node.js + React).

## Core Features

1. **Global Hotkeys** - Cmd/Ctrl+Shift+C/S/L for instant text processing
2. **Clipboard Management** - Monitor , upate clipboard
3. **AI Text Processing** - Rephrase, summarize, legalify text via backend API
4. **OAuth Authentication** - Google login with deep link callback
5. **System Tray** - Always-on background operation

## Tech Stack Change

| Component | Current (Tauri) | Target (Electron) |
|-----------|----------------|-------------------|
| Frontend | React 19 + TypeScript | React 19 + TypeScript (same) |
| Backend | Rust | Node.js |
| Build Tool | Vite | electron-vite |
| Storage | @tauri-apps/plugin-store | electron-store |
| Hotkeys | tauri-plugin-global-shortcut | electron globalShortcut |
| Clipboard | tauri-plugin-clipboard-manager | electron clipboard |
| Deep Links | tauri-plugin-deep-link | electron protocol |

## Key Dependencies

```bash
npm install electron-vite electron-builder electron-store robotjs
```

## Project Structure

```
clipify-electron/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── index.ts       # Entry point
│   │   ├── window.ts      # Window management
│   │   ├── tray.ts        # System tray
│   │   ├── hotkeys/       # Global hotkey system
│   │   ├── auth/          # Deep link & OAuth
│   │   ├── system/        # Permissions & utilities
│   │   └── store/         # Secure storage
│   ├── preload/           # Context bridge
│   │   └── index.ts       # Expose APIs to renderer
│   └── renderer/          # React frontend (existing code)
│       └── src/
│           ├── services/platformAdapter.ts  # Tauri→Electron adapter
│           └── ... (existing React code)
└── resources/             # Icons and assets
```

## Migration Steps

1. **Setup** - Initialize Electron project with electron-vite
2. **Main Process** - Implement window, tray, clipboard, hotkeys
3. **Preload** - Create context bridge for IPC
4. **Adapter** - Create platform adapter for frontend
5. **Frontend** - Update imports to use adapter
6. **Test** - Test on macOS, Windows, Linux
7. **Build** - Configure electron-builder and create installers

## Quick Start Commands

```bash
# Development
npm run dev

# Build
npm run build

# Package
npm run dist          # All platforms
npm run dist:mac      # macOS only
npm run dist:win      # Windows only
npm run dist:linux    # Linux only
```

## Important Files

- **ELECTRON_MIGRATION_SPEC.md** - Complete implementation guide
- **src/main/index.ts** - Main process entry point
- **src/preload/index.ts** - Context bridge
- **src/renderer/src/services/platformAdapter.ts** - Tauri→Electron adapter
- **electron.vite.config.ts** - Build configuration
- **package.json** - Dependencies and build scripts

## Platform-Specific Notes

### macOS
- Requires accessibility permissions for global shortcuts
- Needs code signing for distribution
- Protocol: `clipify://`

### Windows
- No special permissions required
- Protocol registration automatic
- Installer: NSIS

### Linux
- No special permissions required
- Package formats: AppImage, deb
- May need robotjs dependencies

## API Endpoints (Backend)

- `POST /api/v1/auth/google/login` - OAuth login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/protected/rephrase` - Rephrase text
- `POST /api/v1/protected/summarize` - Summarize text
- `POST /api/v1/protected/legalify` - Legal transformation
- `GET /api/v1/protected/hotkeys` - Get hotkey bindings
- `GET /api/v1/protected/prompts` - Get custom prompts

## Deep Link Flow

1. User clicks "Login" in app
2. Opens browser to `https://clipify.space/login?redirect=clipify://auth/callback`
3. User authenticates with Google
4. Backend redirects to `clipify://auth/callback?token=...&user=...`
5. App receives deep link, stores tokens, updates UI

## Default Hotkeys

- `Cmd/Ctrl+Shift+C` - Rephrase selected text
- `Cmd/Ctrl+Shift+S` - Summarize selected text
- `Cmd/Ctrl+Shift+L` - Legalify selected text

## Environment Variables

```bash
# Development
VITE_DEV_API_BASE_URL=http://localhost:8080
VITE_DEV_OAUTH_REDIRECT_URI=clipify://auth/callback

# Production
VITE_PROD_API_BASE_URL=https://clipify0.el.r.appspot.com
VITE_PROD_OAUTH_REDIRECT_URI=clipify://auth/callback
```

## Testing Checklist

- [ ] OAuth login flow
- [ ] Deep link callback
- [ ] Global hotkeys (all 3 defaults)
- [ ] Clipboard monitoring
- [ ] Text processing (rephrase/summarize/legalify)
- [ ] Custom prompts
- [ ] Hotkey management
- [ ] System tray menu
- [ ] Token refresh
- [ ] Logout
- [ ] Accessibility permissions (macOS)

## Common Issues

1. **Hotkeys not working** → Check accessibility permissions (macOS)
2. **Deep links not working** → Verify protocol registration
3. **Build fails** → Install robotjs dependencies
4. **Auth fails** → Check API endpoints and network

## Next Steps

1. Read **ELECTRON_MIGRATION_SPEC.md** for detailed implementation
2. Setup Electron project structure
3. Implement main process features
4. Create preload script
5. Add platform adapter to frontend
6. Test thoroughly on all platforms
7. Build and distribute

---

For complete implementation details, see **ELECTRON_MIGRATION_SPEC.md**
