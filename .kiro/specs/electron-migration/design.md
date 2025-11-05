# Design Document

## Overview

This document describes the technical design for migrating Clipify from Tauri to Electron. The design maintains a clear separation between the main process (Node.js backend), preload script (security bridge), and renderer process (React frontend). The architecture leverages Electron's IPC mechanism for secure communication and follows modern security best practices with context isolation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  Main Process   │◄───────►│ Preload Script   │          │
│  │   (Node.js)     │   IPC   │ (Context Bridge) │          │
│  └────────┬────────┘         └────────┬─────────┘          │
│           │                           │                      │
│           │                           ▼                      │
│           │                  ┌──────────────────┐          │
│           │                  │ Renderer Process │          │
│           │                  │  (React + Vite)  │          │
│           │                  └──────────────────┘          │
│           │                                                  │
│           ├──► Window Management                            │
│           ├──► System Tray                                  │
│           ├──► Deep Link Protocol                           │
│           ├──► Global Hotkeys (electron.globalShortcut)    │
│           ├──► Clipboard (electron.clipboard)              │
│           ├──► Secure Storage (electron-store)             │
│           └──► System Integration (robotjs)                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   External Services    │
              ├────────────────────────┤
              │ • Backend API          │
              │ • OAuth Provider       │
              │ • System Clipboard     │
              └────────────────────────┘
```

### Process Communication Flow

```
Renderer Process          Preload Script           Main Process
     │                         │                         │
     │  invoke('command')      │                         │
     ├────────────────────────►│                         │
     │                         │  ipcRenderer.invoke()   │
     │                         ├────────────────────────►│
     │                         │                         │
     │                         │                    Execute
     │                         │                    Handler
     │                         │                         │
     │                         │      Return Result      │
     │                         │◄────────────────────────┤
     │   Return Promise        │                         │
     │◄────────────────────────┤                         │
     │                         │                         │
```

## Components and Interfaces

### 1. Main Process (`src/main/`)

#### 1.1 Entry Point (`index.ts`)

**Purpose**: Application initialization and lifecycle management

**Key Responsibilities**:
- Request single instance lock
- Create main window on ready
- Setup deep link protocol
- Initialize system tray
- Register global hotkeys
- Register all IPC handlers
- Handle app lifecycle events

**Dependencies**:
- electron (app, BrowserWindow)
- All module handlers (window, tray, auth, hotkeys, etc.)

**Interface**:
```typescript
// No public interface - entry point
// Handles app events: ready, window-all-closed, activate, before-quit, second-instance
```

---

#### 1.2 Window Management (`window.ts`)

**Purpose**: Manage application window lifecycle and visibility

**Exports**:
```typescript
export function createMainWindow(): BrowserWindow
export function showMainWindow(): void
export function hideMainWindow(): void
export function toggleWindowVisibility(): void
export function getMainWindow(): BrowserWindow | null
```

**Configuration**:
- Window size: 800x1200
- Preload script path
- Context isolation: enabled
- Node integration: disabled
- Sandbox: enabled

**Behavior**:
- Hide on close (don't quit)
- Load from dev server in development
- Load from file in production

---

#### 1.3 System Tray (`tray.ts`)

**Purpose**: Provide persistent system tray icon and menu

**Exports**:
```typescript
export function createTray(): Tray
export function updateTrayMenu(): void
export function getTray(): Tray | null
```

**Menu Structure**:
- Show/Hide Clipify
- Separator
- Settings
- About Clipify
- Separator
- Quit

**Icon**:
- Location: resources/icon.png
- Size: 16x16 (resized from source)
- Platform-specific handling

---

#### 1.4 Authentication Module (`auth/`)

##### Deep Link Handler (`auth/deeplink.ts`)

**Purpose**: Handle clipify:// protocol URLs for OAuth callback

**Exports**:
```typescript
export function setupDeepLinkProtocol(window: BrowserWindow): void
export function verifyProtocolRegistration(): { scheme: string; isRegistered: boolean }
```

**Protocol Handling**:
- macOS: `app.on('open-url')`
- Windows/Linux: `app.on('second-instance')` + startup args
- Registration: `app.setAsDefaultProtocolClient('clipify')`

**Event Flow**:
1. Receive clipify:// URL
2. Parse URL and extract parameters
3. Emit 'deep-link-received' to renderer
4. Show and focus window

##### IPC Handlers (`auth/handlers.ts`)

**Purpose**: Handle authentication-related IPC commands

**Exports**:
```typescript
export function registerAuthHandlers(): void
```

**IPC Commands**:
- `verify-deep-link-protocols`: Check protocol registration status
- `check-protocol-registration`: Verify specific protocol

---

#### 1.5 Storage Module (`store/`)

##### Secure Storage (`store/config.ts`)

**Purpose**: Securely store authentication tokens and user data

**Exports**:
```typescript
export function storeAccessToken(token: string): void
export function getAccessToken(): string | null
export function storeRefreshToken(token: string): void
export function getRefreshToken(): string | null
export function storeTokenMetadata(metadata: TokenMetadata): void
export function getTokenMetadata(): TokenMetadata | null
export function storeUserInfo(user: UserInfo): void
export function getUserInfo(): UserInfo | null
export function clearAllTokens(): void
export function hasValidAccessToken(): boolean
```

**Data Models**:
```typescript
interface TokenMetadata {
  expiresAt?: number;
  tokenType: string;
  scope?: string;
  issuedAt: number;
}

interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  plan?: string;
}
```

**Storage Strategy**:
- Use electron-store for persistence
- Use safeStorage API when available for encryption
- Store tokens as base64-encoded encrypted buffers
- Store metadata and user info as plain JSON

**File Location**:
- macOS: `~/Library/Application Support/clipify-electron/`
- Windows: `%APPDATA%/clipify-electron/`
- Linux: `~/.config/clipify-electron/`

---

#### 1.6 Clipboard Module (`clipboard/`)

##### Clipboard Operations (`clipboard/operations.ts`)

**Purpose**: Read from and write to system clipboard

**Exports**:
```typescript
export function readClipboard(): string
export function writeClipboard(text: string): void
export function triggerClipboardCopy(): Promise<string>
```

**Implementation**:
- Use `electron.clipboard.readText()` for reading
- Use `electron.clipboard.writeText()` for writing
- Use `robotjs.keyTap()` for simulating Cmd+C/Ctrl+C

##### IPC Handlers (`clipboard/handlers.ts`)

**Purpose**: Handle clipboard-related IPC commands

**Exports**:
```typescript
export function registerClipboardHandlers(): void
```

**IPC Commands**:
- `read-clipboard`: Return current clipboard text
- `write-clipboard`: Write text to clipboard
- `trigger-clipboard-copy`: Simulate copy and return text

---

#### 1.7 Hotkeys Module (`hotkeys/`)

##### Hotkey Manager (`hotkeys/manager.ts`)

**Purpose**: Manage global keyboard shortcuts

**Class**: `HotkeyManager`

**Methods**:
```typescript
constructor(mainWindow: BrowserWindow)
async register(code: string, combo: string): Promise<boolean>
async unregister(code: string): Promise<boolean>
async reloadHotkeys(configs: HotkeyConfig[]): Promise<HotkeyStatus[]>
isRegistered(combo: string): boolean
cleanup(): void
```

**Data Models**:
```typescript
interface HotkeyConfig {
  code: string;      // e.g., 'REPHRASE', 'SUMMARIZE'
  combo: string;     // e.g., 'PRIMARY+SHIFT+KeyC'
}

interface HotkeyStatus {
  code: string;
  registered: boolean;
  error?: string;
}
```

**Behavior**:
- Store registered hotkeys in Map<code, combo>
- Parse combo using HotkeyParser
- Register with electron.globalShortcut
- On press: simulate Cmd+C, wait 100ms, read clipboard, emit event

##### Hotkey Parser (`hotkeys/parser.ts`)

**Purpose**: Convert normalized hotkey combos to Electron format

**Exports**:
```typescript
export function parseHotkeyCombo(combo: string): string
```

**Conversion Rules**:
- `PRIMARY` → `CommandOrControl`
- `SHIFT` → `Shift`
- `ALT`/`OPTION` → `Alt`
- `CONTROL`/`CTRL` → `Control`
- `SUPER`/`CMD`/`COMMAND` → `Command`
- `KeyX` → `X`
- `DigitX` → `X`
- `FX` → `FX` (function keys)

**Examples**:
- `PRIMARY+SHIFT+KeyC` → `CommandOrControl+Shift+C`
- `ALT+F1` → `Alt+F1`
- `CONTROL+SHIFT+KeyS` → `Control+Shift+S`

##### IPC Handlers (`hotkeys/handlers.ts`)

**Purpose**: Handle hotkey-related IPC commands

**Exports**:
```typescript
export function registerHotkeyHandlers(hotkeyManager: HotkeyManager): void
```

**IPC Commands**:
- `register-hotkey`: Register a new hotkey
- `unregister-hotkey`: Unregister a hotkey
- `reload-hotkeys`: Reload all hotkeys
- `is-shortcut-registered`: Check if combo is registered

---

#### 1.8 System Module (`system/`)

##### Permissions (`system/permissions.ts`)

**Purpose**: Check and request system permissions (macOS accessibility)

**Exports**:
```typescript
export function checkAccessibilityPermissions(): { granted: boolean; message: string }
export function requestAccessibilityPermissions(): void
export function getMacOSVersion(): string | null
export function getAccessibilityInstructions(): string
```

**Platform Behavior**:
- macOS: Use `systemPreferences.isTrustedAccessibilityClient()`
- Windows/Linux: Always return granted (not required)

##### Keyboard Simulation (`system/keyboard.ts`)

**Purpose**: Simulate keyboard input using robotjs

**Exports**:
```typescript
export function simulateCmdC(): void
export function simulateCmdV(): void
export function simulateKeyCombo(key: string, modifiers: string[]): void
```

**Implementation**:
- Use `robotjs.keyTap(key, modifier)`
- Platform-specific modifiers (command on macOS, control on others)

##### IPC Handlers (`system/handlers.ts`)

**Purpose**: Handle system-related IPC commands

**Exports**:
```typescript
export function registerSystemHandlers(): void
```

**IPC Commands**:
- `check-accessibility-permissions`: Check permission status
- `request-input-monitoring-permission`: Request permissions
- `get-macos-version`: Get macOS version
- `get-accessibility-instructions`: Get platform instructions
- `simulate-cmd-c`: Simulate Cmd+C
- `quit-application`: Quit the app

---

### 2. Preload Script (`src/preload/`)

#### Context Bridge (`index.ts`)

**Purpose**: Securely expose main process APIs to renderer

**Security Configuration**:
- Context isolation: enabled
- Node integration: disabled
- Sandbox: enabled

**Exposed API Structure**:
```typescript
window.electron = {
  // Window management
  showMainWindow(): Promise<void>
  hideMainWindow(): Promise<void>
  toggleWindowVisibility(): Promise<void>
  
  // Clipboard
  readClipboard(): Promise<string>
  writeClipboard(text: string): Promise<void>
  triggerClipboardCopy(): Promise<string>
  
  // Hotkeys
  registerHotkey(code: string, combo: string): Promise<boolean>
  unregisterHotkey(code: string): Promise<boolean>
  reloadHotkeys(configs: HotkeyConfig[]): Promise<HotkeyStatus[]>
  isShortcutRegistered(combo: string): Promise<boolean>
  
  // System
  checkAccessibilityPermissions(): Promise<string>
  requestInputMonitoringPermission(): Promise<void>
  getMacOSVersion(): Promise<string | null>
  getAccessibilityInstructions(): Promise<string>
  simulateCmdC(): Promise<void>
  quitApplication(): Promise<void>
  
  // Auth
  verifyDeepLinkProtocols(): Promise<any>
  checkProtocolRegistration(scheme: string): Promise<any>
  
  // Event listeners
  onDeepLinkReceived(callback: (url: string) => void): () => void
  onAutoProcessRequest(callback: (data: {code: string, text: string}) => void): () => void
}
```

**TypeScript Definitions**:
- Declare global Window interface extension
- Provide full type safety for all methods
- Include JSDoc comments for IDE support

---

### 3. Renderer Process (`src/renderer/`)

#### Platform Adapter (`src/renderer/src/services/platformAdapter.ts`)

**Purpose**: Provide compatibility layer between Tauri and Electron APIs

**Exports**:
```typescript
export async function invoke(command: string, args?: any): Promise<any>
export async function listen(event: string, handler: (data: any) => void): Promise<() => void>
```

**Command Mapping**:
```typescript
const commandMap: Record<string, string> = {
  'show_main_window': 'show-main-window',
  'hide_main_window': 'hide-main-window',
  'toggle_window_visibility': 'toggle-window-visibility',
  'read_clipboard': 'read-clipboard',
  'write_clipboard': 'write-clipboard',
  'trigger_clipboard_copy': 'trigger-clipboard-copy',
  'register_hotkey': 'register-hotkey',
  'unregister_hotkey': 'unregister-hotkey',
  'reload_hotkeys': 'reload-hotkeys',
  // ... etc
}
```

**Event Mapping**:
```typescript
const eventMap: Record<string, string> = {
  'deep-link-received': 'deep-link-received',
  'auto-process-request': 'auto-process-request'
}
```

**Detection Logic**:
```typescript
const isElectron = typeof window !== 'undefined' && window.electron
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window
```

---

## Data Models

### Authentication Data

```typescript
// Access Token (encrypted)
type AccessToken = string;

// Refresh Token (encrypted)
type RefreshToken = string;

// Token Metadata
interface TokenMetadata {
  expiresAt?: number;      // Unix timestamp
  tokenType: string;       // e.g., "Bearer"
  scope?: string;          // OAuth scopes
  issuedAt: number;        // Unix timestamp
}

// User Information
interface UserInfo {
  id: string;              // User ID from backend
  email: string;           // User email
  name?: string;           // Display name
  avatar?: string;         // Avatar URL
  plan?: string;           // Subscription plan
}
```

### Hotkey Data

```typescript
// Hotkey Configuration
interface HotkeyConfig {
  code: string;            // Action code (e.g., 'REPHRASE')
  combo: string;           // Key combination (e.g., 'PRIMARY+SHIFT+KeyC')
}

// Hotkey Status
interface HotkeyStatus {
  code: string;            // Action code
  registered: boolean;     // Registration success
  error?: string;          // Error message if failed
}

// Auto-process Request (emitted on hotkey press)
interface AutoProcessRequest {
  code: string;            // Action code
  text: string;            // Copied text from clipboard
}
```

### Deep Link Data

```typescript
// Deep Link URL format
// clipify://auth/callback?token=<access_token>&refresh_token=<refresh_token>&user=<user_json>

interface DeepLinkParams {
  token: string;           // Access token
  refresh_token: string;   // Refresh token
  user: string;            // JSON-encoded user info
}
```

---

## Error Handling

### Error Types

```typescript
enum ErrorCode {
  // IPC Errors
  IPC_HANDLER_NOT_FOUND = 'IPC_HANDLER_NOT_FOUND',
  IPC_INVALID_ARGS = 'IPC_INVALID_ARGS',
  
  // Storage Errors
  STORAGE_READ_ERROR = 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR = 'STORAGE_WRITE_ERROR',
  STORAGE_ENCRYPTION_ERROR = 'STORAGE_ENCRYPTION_ERROR',
  
  // Hotkey Errors
  HOTKEY_REGISTRATION_FAILED = 'HOTKEY_REGISTRATION_FAILED',
  HOTKEY_ALREADY_REGISTERED = 'HOTKEY_ALREADY_REGISTERED',
  HOTKEY_INVALID_COMBO = 'HOTKEY_INVALID_COMBO',
  
  // Permission Errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PERMISSION_CHECK_FAILED = 'PERMISSION_CHECK_FAILED',
  
  // Clipboard Errors
  CLIPBOARD_READ_ERROR = 'CLIPBOARD_READ_ERROR',
  CLIPBOARD_WRITE_ERROR = 'CLIPBOARD_WRITE_ERROR',
  
  // Deep Link Errors
  DEEPLINK_INVALID_URL = 'DEEPLINK_INVALID_URL',
  DEEPLINK_MISSING_PARAMS = 'DEEPLINK_MISSING_PARAMS'
}

class ClipifyError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ClipifyError';
  }
}
```

### Error Handling Strategy

1. **IPC Handlers**: Wrap all handlers in try-catch, return structured errors
2. **Main Process**: Log errors with context, emit error events to renderer
3. **Renderer Process**: Display user-friendly error messages
4. **Development**: Enable verbose logging and stack traces
5. **Production**: Log errors to file, sanitize sensitive data

---

## Testing Strategy

### Unit Tests

**Main Process**:
- Hotkey parser: Test combo conversion
- Token storage: Test encryption/decryption
- Window management: Test show/hide/toggle logic

**Preload**:
- Context bridge: Test API exposure
- Type safety: Test TypeScript definitions

**Renderer**:
- Platform adapter: Test command/event mapping
- Error handling: Test error propagation

### Integration Tests

**IPC Communication**:
- Test all IPC handlers with valid/invalid inputs
- Test event emission and listening
- Test error propagation across processes

**System Integration**:
- Test deep link protocol registration
- Test global hotkey registration
- Test clipboard operations
- Test system tray creation

### Manual Testing

**Per-Feature Testing**:
- Each feature will have a dedicated test file
- Test file will include step-by-step instructions
- Test file will include expected vs actual results
- Test file will cover edge cases and error scenarios

**Test File Structure**:
```markdown
# Feature: [Feature Name]

## Setup
- Prerequisites
- Configuration needed

## Test Cases

### Test Case 1: [Description]
**Steps**:
1. Step 1
2. Step 2

**Expected**: [Expected result]
**Actual**: [To be filled during testing]
**Status**: [ ] Pass [ ] Fail

### Test Case 2: ...
```

---

## Security Considerations

### Context Isolation

- **Enabled**: Prevents renderer from accessing Node.js/Electron APIs directly
- **Context Bridge**: Only expose necessary APIs through preload
- **No Node Integration**: Renderer cannot require() Node modules

### Token Storage

- **Encryption**: Use safeStorage API when available
- **Platform Security**:
  - macOS: Keychain
  - Windows: Credential Manager
  - Linux: libsecret
- **Fallback**: electron-store encryption if safeStorage unavailable

### IPC Security

- **Validation**: Validate all IPC inputs
- **Whitelist**: Only expose necessary commands
- **Type Safety**: Use TypeScript for compile-time checks
- **Error Handling**: Never expose sensitive data in errors

### Deep Link Security

- **URL Validation**: Validate deep link URLs before processing
- **Parameter Sanitization**: Sanitize all URL parameters
- **Rate Limiting**: Prevent deep link spam
- **Origin Verification**: Verify deep links come from trusted sources

---

## Performance Considerations

### Startup Time

- **Lazy Loading**: Load non-critical modules on demand
- **Deferred Initialization**: Defer hotkey registration until after window loads
- **Cache**: Cache user preferences and tokens

### Memory Management

- **Event Listeners**: Clean up listeners on window close
- **IPC Handlers**: Use handle() instead of on() for request-response
- **Hotkeys**: Unregister all hotkeys on quit

### Clipboard Operations

- **Debouncing**: Debounce rapid clipboard operations
- **Async**: Use async operations to avoid blocking
- **Error Recovery**: Gracefully handle clipboard access failures

---

## Build Configuration

### electron-vite Configuration

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') }
      }
    }
  }
})
```

### electron-builder Configuration

```json
{
  "appId": "com.suhailmalik.clipify",
  "productName": "Clipify",
  "directories": { "output": "release" },
  "files": ["dist/**/*", "resources/**/*"],
  "mac": {
    "category": "public.app-category.productivity",
    "target": ["dmg", "zip"],
    "icon": "resources/icon.icns",
    "hardenedRuntime": true,
    "entitlements": "build/entitlements.mac.plist"
  },
  "win": {
    "target": ["nsis", "portable"],
    "icon": "resources/icon.ico"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "icon": "resources/icon.png",
    "category": "Utility"
  },
  "protocols": [{
    "name": "Clipify",
    "schemes": ["clipify"]
  }]
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["node", "vite/client"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Environment Configuration

### Development Environment

```bash
NODE_ENV=development
VITE_DEV_API_BASE_URL=http://localhost:8080
VITE_DEV_OAUTH_REDIRECT_URI=clipify://auth/callback
VITE_DEV_LOG_LEVEL=debug
```

### Production Environment

```bash
NODE_ENV=production
VITE_PROD_API_BASE_URL=https://clipify0.el.r.appspot.com
VITE_PROD_OAUTH_REDIRECT_URI=clipify://auth/callback
VITE_PROD_LOG_LEVEL=info
```

---

## Dependencies

### Core Dependencies

- **electron**: ^28.0.0 - Core framework
- **electron-store**: ^8.1.0 - Persistent storage with encryption
- **robotjs**: ^0.6.0 - Keyboard simulation

### Development Dependencies

- **electron-vite**: ^2.0.0 - Build tool
- **electron-builder**: ^24.9.1 - Packaging tool
- **typescript**: ^5.3.3 - Type safety
- **@types/node**: ^20.10.0 - Node.js types
- **vite**: ^5.0.8 - Frontend build tool
- **react**: ^18.2.0 - UI framework

### Dependency Considerations

- All dependencies are latest stable versions
- electron-store provides built-in encryption
- robotjs requires native compilation (may need build tools)
- electron-vite provides hot-reload for development

---

## Migration Notes

### Changes from Tauri

1. **API Calls**: All Tauri `invoke()` calls mapped through platform adapter
2. **Events**: All Tauri `listen()` calls mapped through platform adapter
3. **Storage**: Tauri store → electron-store
4. **Hotkeys**: tauri-plugin-global-shortcut → electron.globalShortcut
5. **Clipboard**: tauri-plugin-clipboard-manager → electron.clipboard
6. **Deep Links**: tauri-plugin-deep-link → electron protocol registration

### Frontend Changes Required

- Import platform adapter instead of Tauri APIs
- Update environment variable access (import.meta.env remains same)
- No changes to React components or UI logic
- No changes to API service layer (uses same endpoints)

### Removed Features (For Now)

- Clipboard history storage
- Clipboard monitoring/polling
- Clipboard history UI components

These can be added in a future phase if needed.
