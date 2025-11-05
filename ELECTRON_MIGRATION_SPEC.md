# Clipify - Electron Migration Specification

## Project Overview

**Clipify** is a desktop application for AI-powered text processing with global hotkeys. Currently built with Tauri (Rust + React), this document provides complete specifications for rebuilding it in Electron.

### Core Purpose
- Monitor clipboard and process text with AI (rephrase, summarize, legalify)
- Global hotkey system for instant text processing
- OAuth authentication via Google
- Clipboard history management
- System tray integration

---

## Technology Stack

### Current (Tauri)
- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Rust (Tauri 2.x)
- **Plugins**: clipboard-manager, global-shortcut, notification, deep-link, store

### Target (Electron)
- **Frontend**: React 19, TypeScript, Vite (keep existing)
- **Backend**: Node.js (Electron main process)
- **Required Modules**:
  - `electron` - Core framework
  - `electron-store` - Persistent storage (replace Tauri store)
  - `electron-globalshortcut` or `globalshortcut` - Global hotkeys
  - `clipboardy` or `electron.clipboard` - Clipboard operations
  - `node-notifier` or Electron notifications - System notifications
  - `robotjs` or `nut-js` - Simulate keyboard (Cmd+C for text selection)

---

## Architecture Overview


### Application Structure

```
clipify-electron/
├── package.json
├── electron.vite.config.ts          # Electron + Vite config
├── src/
│   ├── main/                        # Electron main process (Node.js)
│   │   ├── index.ts                 # Main entry point
│   │   ├── window.ts                # Window management
│   │   ├── tray.ts                  # System tray
│   │   ├── clipboard/
│   │   │   ├── monitor.ts           # Clipboard monitoring
│   │   │   ├── history.ts           # History management
│   │   │   └── commands.ts          # IPC handlers
│   │   ├── hotkeys/
│   │   │   ├── manager.ts           # Hotkey registration
│   │   │   ├── parser.ts            # Combo parsing
│   │   │   └── handlers.ts          # Hotkey event handlers
│   │   ├── auth/
│   │   │   ├── deeplink.ts          # Deep link protocol
│   │   │   └── handlers.ts          # Auth IPC handlers
│   │   ├── system/
│   │   │   ├── permissions.ts       # Accessibility checks
│   │   │   └── keyboard.ts          # Keyboard simulation
│   │   └── store/
│   │       └── config.ts            # Electron store setup
│   ├── preload/                     # Preload scripts (context bridge)
│   │   └── index.ts                 # Expose APIs to renderer
│   └── renderer/                    # React frontend (existing)
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── utils/
│       ├── index.html
│       └── main.tsx
├── resources/                       # App icons and assets
└── dist/                           # Build output
```

---

## Core Features & Implementation


### 1. Window Management

**Current Tauri Implementation**: `src-tauri/src/window.rs`

**Electron Equivalent**: `src/main/window.ts`

```typescript
import { BrowserWindow, app } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 1200,
    center: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Hide instead of close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  return mainWindow;
}

export function showMainWindow(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.restore();
  }
}

export function hideMainWindow(): void {
  mainWindow?.hide();
}

export function toggleWindowVisibility(): void {
  if (mainWindow?.isVisible()) {
    hideMainWindow();
  } else {
    showMainWindow();
  }
}
```

**IPC Handlers** (register in main process):
```typescript
ipcMain.handle('show-main-window', () => showMainWindow());
ipcMain.handle('hide-main-window', () => hideMainWindow());
ipcMain.handle('toggle-window-visibility', () => toggleWindowVisibility());
```

---


### 2. System Tray

**Current Tauri Implementation**: `src-tauri/src/lib.rs` (tray setup)

**Electron Equivalent**: `src/main/tray.ts`

```typescript
import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import { toggleWindowVisibility, showMainWindow } from './window';
import { getClipboardHistory } from './clipboard/history';

let tray: Tray | null = null;

export function createTray(): Tray {
  const iconPath = path.join(__dirname, '../../resources/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Clipify - Professional Text Cleanup Tool');
  
  updateTrayMenu();
  
  tray.on('click', () => {
    toggleWindowVisibility();
  });
  
  return tray;
}

export function updateTrayMenu(): void {
  if (!tray) return;
  
  const history = getClipboardHistory();
  const recentEntries = history.slice(0, 10);
  
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Show/Hide Clipify',
      click: () => toggleWindowVisibility()
    },
    { type: 'separator' },
    {
      label: '🧹 Cleanup Clipboard',
      click: () => {
        // Trigger clipboard copy action
      }
    },
    {
      label: process.platform === 'darwin' 
        ? '⌨️ Clean Clipboard (Cmd+Shift+C)'
        : '⌨️ Clean Clipboard (Ctrl+Shift+C)',
      click: () => {
        // Trigger shortcut action
      }
    }
  ];
  
  // Add recent clipboard items
  if (recentEntries.length > 0) {
    menuTemplate.push({ type: 'separator' });
    recentEntries.forEach((entry) => {
      const preview = entry.preview.length > 50 
        ? entry.preview.substring(0, 47) + '...'
        : entry.preview;
      
      menuTemplate.push({
        label: `📋 ${preview}`,
        click: () => {
          // Copy to clipboard
          const { clipboard } = require('electron');
          clipboard.writeText(entry.content);
        }
      });
    });
  }
  
  menuTemplate.push(
    { type: 'separator' },
    {
      label: '🗑️ Clear History',
      click: () => {
        // Clear clipboard history
      }
    },
    { type: 'separator' },
    {
      label: '⚙️ Settings',
      click: () => showMainWindow()
    },
    {
      label: 'ℹ️ About Clipify',
      click: () => {
        // Show about dialog
      }
    },
    { type: 'separator' },
    {
      label: '🚪 Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  );
  
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}
```

---


### 3. Clipboard Management

**Current Tauri Implementation**: 
- `src-tauri/src/clipboard.rs` - Data structures
- `src-tauri/src/clipboard_monitor.rs` - Monitoring
- `src-tauri/src/clipboard_commands.rs` - IPC commands

**Electron Equivalent**: `src/main/clipboard/`

#### History Data Structure (`history.ts`)

```typescript
import Store from 'electron-store';

export interface ClipboardEntry {
  id: string;
  content: string;
  original_content: string;
  is_cleaned: boolean;
  timestamp: string;
  char_count: number;
  line_count: number;
  has_formatting: boolean;
  content_type: 'text' | 'url' | 'email' | 'phone';
  preview: string;
  prompt_action?: string;
}

interface ClipboardHistoryData {
  entries: ClipboardEntry[];
  max_entries: number;
}

const store = new Store<ClipboardHistoryData>({
  name: 'clipboard-history',
  defaults: {
    entries: [],
    max_entries: 100
  }
});

export function createClipboardEntry(
  content: string,
  isCleaned: boolean = false,
  originalContent?: string,
  promptAction?: string
): ClipboardEntry {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  const charCount = content.length;
  const lineCount = content.split('\n').length;
  const hasFormatting = /[\n\t]/.test(content);
  
  // Detect content type
  let contentType: ClipboardEntry['content_type'] = 'text';
  if (/^https?:\/\//.test(content)) {
    contentType = 'url';
  } else if (/@.*\./.test(content) && !content.includes('\n')) {
    contentType = 'email';
  } else if (/^[\d\s\-+().]+$/.test(content)) {
    contentType = 'phone';
  }
  
  const preview = content.length > 100 
    ? content.substring(0, 97) + '...'
    : content;
  
  return {
    id,
    content,
    original_content: originalContent || content,
    is_cleaned: isCleaned,
    timestamp,
    char_count: charCount,
    line_count: lineCount,
    has_formatting: hasFormatting,
    content_type: contentType,
    preview,
    prompt_action: promptAction
  };
}

export function getClipboardHistory(): ClipboardEntry[] {
  return store.get('entries', []);
}

export function addToClipboardHistory(entry: ClipboardEntry): void {
  const entries = store.get('entries', []);
  const maxEntries = store.get('max_entries', 100);
  
  // Remove duplicates
  const filtered = entries.filter(e => e.content !== entry.content);
  
  // Add new entry at the beginning
  filtered.unshift(entry);
  
  // Maintain max entries limit
  if (filtered.length > maxEntries) {
    filtered.splice(maxEntries);
  }
  
  store.set('entries', filtered);
}

export function removeFromClipboardHistory(id: string): boolean {
  const entries = store.get('entries', []);
  const filtered = entries.filter(e => e.id !== id);
  
  if (filtered.length !== entries.length) {
    store.set('entries', filtered);
    return true;
  }
  return false;
}

export function clearClipboardHistory(): void {
  store.set('entries', []);
}

export function searchClipboardHistory(query: string): ClipboardEntry[] {
  const entries = store.get('entries', []);
  if (!query) return entries;
  
  const lowerQuery = query.toLowerCase();
  return entries.filter(entry => 
    entry.content.toLowerCase().includes(lowerQuery) ||
    entry.content_type.toLowerCase().includes(lowerQuery)
  );
}

export function getClipboardEntryById(id: string): ClipboardEntry | null {
  const entries = store.get('entries', []);
  return entries.find(e => e.id === id) || null;
}
```

---


#### Clipboard Monitor (`monitor.ts`)

```typescript
import { clipboard } from 'electron';
import { addToClipboardHistory, createClipboardEntry } from './history';
import { updateTrayMenu } from '../tray';

let monitorInterval: NodeJS.Timeout | null = null;
let lastContent: string = '';
let isMonitoring: boolean = false;

export function startClipboardMonitoring(mainWindow: Electron.BrowserWindow): void {
  if (isMonitoring) return;
  
  isMonitoring = true;
  console.log('[ClipboardMonitor] Starting monitoring...');
  
  monitorInterval = setInterval(() => {
    try {
      const currentContent = clipboard.readText();
      
      // Skip empty content
      if (!currentContent || currentContent.trim() === '') {
        return;
      }
      
      // Check if content changed
      if (currentContent !== lastContent) {
        console.log('[ClipboardMonitor] Content changed, length:', currentContent.length);
        lastContent = currentContent;
        
        // Add to history
        const entry = createClipboardEntry(currentContent, false);
        addToClipboardHistory(entry);
        
        // Emit event to renderer
        mainWindow.webContents.send('clipboard-content-changed', currentContent);
        
        // Update tray menu
        updateTrayMenu();
      }
    } catch (error) {
      console.error('[ClipboardMonitor] Error:', error);
    }
  }, 500); // Check every 500ms
}

export function stopClipboardMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  isMonitoring = false;
  console.log('[ClipboardMonitor] Stopped monitoring');
}

export function isClipboardMonitoring(): boolean {
  return isMonitoring;
}
```

#### IPC Handlers (`commands.ts`)

```typescript
import { ipcMain, clipboard } from 'electron';
import {
  getClipboardHistory,
  addToClipboardHistory,
  removeFromClipboardHistory,
  clearClipboardHistory,
  searchClipboardHistory,
  getClipboardEntryById,
  createClipboardEntry
} from './history';
import { startClipboardMonitoring, stopClipboardMonitoring } from './monitor';

export function registerClipboardHandlers(mainWindow: Electron.BrowserWindow): void {
  ipcMain.handle('get-clipboard-history', () => {
    return getClipboardHistory();
  });
  
  ipcMain.handle('add-to-clipboard-history', (_, content: string, isCleaned: boolean, originalContent?: string) => {
    const entry = createClipboardEntry(content, isCleaned, originalContent);
    addToClipboardHistory(entry);
    return entry;
  });
  
  ipcMain.handle('remove-from-clipboard-history', (_, id: string) => {
    return removeFromClipboardHistory(id);
  });
  
  ipcMain.handle('clear-clipboard-history', () => {
    clearClipboardHistory();
  });
  
  ipcMain.handle('search-clipboard-history', (_, query: string) => {
    return searchClipboardHistory(query);
  });
  
  ipcMain.handle('get-clipboard-entry-by-id', (_, id: string) => {
    return getClipboardEntryById(id);
  });
  
  ipcMain.handle('start-clipboard-monitoring', () => {
    startClipboardMonitoring(mainWindow);
  });
  
  ipcMain.handle('stop-clipboard-monitoring', () => {
    stopClipboardMonitoring();
  });
  
  ipcMain.handle('trigger-clipboard-copy', async () => {
    // Simulate Cmd+C / Ctrl+C to copy selected text
    const robot = require('robotjs');
    const modifier = process.platform === 'darwin' ? 'command' : 'control';
    
    robot.keyTap('c', modifier);
    
    // Wait for clipboard to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const copiedText = clipboard.readText();
    return copiedText;
  });
}
```

---


### 4. Global Hotkeys System

**Current Tauri Implementation**: `src-tauri/src/hotkey.rs`

**Electron Equivalent**: `src/main/hotkeys/`

#### Hotkey Manager (`manager.ts`)

```typescript
import { globalShortcut, BrowserWindow } from 'electron';
import { parseHotkeyCombo } from './parser';

interface HotkeyConfig {
  code: string;
  combo: string;
}

interface HotkeyStatus {
  code: string;
  registered: boolean;
  error?: string;
}

class HotkeyManager {
  private registered: Map<string, string> = new Map(); // code -> combo
  private mainWindow: BrowserWindow;
  
  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }
  
  async register(code: string, combo: string): Promise<boolean> {
    console.log(`[HotkeyManager] Registering: ${code} -> ${combo}`);
    
    try {
      // Parse combo to Electron format
      const electronCombo = parseHotkeyCombo(combo);
      
      // Unregister if already exists
      if (this.registered.has(code)) {
        const oldCombo = this.registered.get(code)!;
        globalShortcut.unregister(parseHotkeyCombo(oldCombo));
      }
      
      // Register new shortcut
      const success = globalShortcut.register(electronCombo, () => {
        this.handleHotkeyPress(code);
      });
      
      if (success) {
        this.registered.set(code, combo);
        console.log(`[HotkeyManager] Successfully registered: ${code}`);
        return true;
      } else {
        throw new Error('Failed to register shortcut');
      }
    } catch (error) {
      console.error(`[HotkeyManager] Failed to register ${code}:`, error);
      throw error;
    }
  }
  
  async unregister(code: string): Promise<boolean> {
    console.log(`[HotkeyManager] Unregistering: ${code}`);
    
    if (!this.registered.has(code)) {
      return false;
    }
    
    const combo = this.registered.get(code)!;
    const electronCombo = parseHotkeyCombo(combo);
    
    globalShortcut.unregister(electronCombo);
    this.registered.delete(code);
    
    console.log(`[HotkeyManager] Successfully unregistered: ${code}`);
    return true;
  }
  
  async reloadHotkeys(configs: HotkeyConfig[]): Promise<HotkeyStatus[]> {
    console.log(`[HotkeyManager] Reloading ${configs.length} hotkeys`);
    
    // Unregister all existing
    globalShortcut.unregisterAll();
    this.registered.clear();
    
    // Register new hotkeys
    const statuses: HotkeyStatus[] = [];
    
    for (const config of configs) {
      try {
        await this.register(config.code, config.combo);
        statuses.push({
          code: config.code,
          registered: true
        });
      } catch (error) {
        statuses.push({
          code: config.code,
          registered: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return statuses;
  }
  
  isRegistered(combo: string): boolean {
    const electronCombo = parseHotkeyCombo(combo);
    return globalShortcut.isRegistered(electronCombo);
  }
  
  private async handleHotkeyPress(code: string): Promise<void> {
    console.log(`[HotkeyManager] Hotkey pressed: ${code}`);
    
    // Simulate Cmd+C / Ctrl+C to copy selected text
    const robot = require('robotjs');
    const modifier = process.platform === 'darwin' ? 'command' : 'control';
    
    robot.keyTap('c', modifier);
    
    // Wait for clipboard to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { clipboard } = require('electron');
    const copiedText = clipboard.readText();
    
    if (copiedText && copiedText.trim()) {
      // Emit event to renderer with code and text
      this.mainWindow.webContents.send('auto-process-request', {
        code,
        text: copiedText
      });
    }
  }
  
  cleanup(): void {
    globalShortcut.unregisterAll();
    this.registered.clear();
  }
}

export default HotkeyManager;
```

---


#### Hotkey Parser (`parser.ts`)

```typescript
/**
 * Parse normalized hotkey combo to Electron format
 * Input: "PRIMARY+SHIFT+KeyC" or "ALT+F1"
 * Output: "CommandOrControl+Shift+C" or "Alt+F1"
 */
export function parseHotkeyCombo(combo: string): string {
  const parts = combo.split('+');
  const electronParts: string[] = [];
  
  for (const part of parts) {
    const upper = part.toUpperCase();
    
    switch (upper) {
      case 'PRIMARY':
        electronParts.push('CommandOrControl');
        break;
      case 'SHIFT':
        electronParts.push('Shift');
        break;
      case 'ALT':
      case 'OPTION':
        electronParts.push('Alt');
        break;
      case 'CONTROL':
      case 'CTRL':
        electronParts.push('Control');
        break;
      case 'SUPER':
      case 'CMD':
      case 'COMMAND':
      case 'WIN':
      case 'WINDOWS':
        electronParts.push('Command');
        break;
      default:
        // Parse key code
        const key = parseKeyCode(part);
        if (key) {
          electronParts.push(key);
        }
    }
  }
  
  return electronParts.join('+');
}

function parseKeyCode(key: string): string | null {
  const upper = key.toUpperCase();
  
  // Letters
  if (/^KEY[A-Z]$/.test(upper)) {
    return upper.replace('KEY', '');
  }
  if (/^[A-Z]$/.test(upper)) {
    return upper;
  }
  
  // Numbers
  if (/^DIGIT\d$/.test(upper)) {
    return upper.replace('DIGIT', '');
  }
  if (/^\d$/.test(upper)) {
    return upper;
  }
  
  // Function keys
  if (/^F\d{1,2}$/.test(upper)) {
    return upper;
  }
  
  // Special keys mapping
  const specialKeys: Record<string, string> = {
    'SPACE': 'Space',
    'ENTER': 'Enter',
    'RETURN': 'Return',
    'TAB': 'Tab',
    'BACKSPACE': 'Backspace',
    'ESCAPE': 'Escape',
    'ESC': 'Escape',
    'DELETE': 'Delete',
    'DEL': 'Delete',
    'INSERT': 'Insert',
    'INS': 'Insert',
    'HOME': 'Home',
    'END': 'End',
    'PAGEUP': 'PageUp',
    'PGUP': 'PageUp',
    'PAGEDOWN': 'PageDown',
    'PGDN': 'PageDown',
    'ARROWUP': 'Up',
    'UP': 'Up',
    'ARROWDOWN': 'Down',
    'DOWN': 'Down',
    'ARROWLEFT': 'Left',
    'LEFT': 'Left',
    'ARROWRIGHT': 'Right',
    'RIGHT': 'Right'
  };
  
  return specialKeys[upper] || null;
}
```

#### IPC Handlers (`handlers.ts`)

```typescript
import { ipcMain } from 'electron';
import HotkeyManager from './manager';

export function registerHotkeyHandlers(hotkeyManager: HotkeyManager): void {
  ipcMain.handle('register-hotkey', async (_, code: string, combo: string) => {
    return await hotkeyManager.register(code, combo);
  });
  
  ipcMain.handle('unregister-hotkey', async (_, code: string) => {
    return await hotkeyManager.unregister(code);
  });
  
  ipcMain.handle('reload-hotkeys', async (_, configs: Array<{code: string, combo: string}>) => {
    return await hotkeyManager.reloadHotkeys(configs);
  });
  
  ipcMain.handle('is-shortcut-registered', (_, combo: string) => {
    return hotkeyManager.isRegistered(combo);
  });
}
```

---


### 5. Authentication & Deep Links

**Current Tauri Implementation**: 
- `src-tauri/src/lib.rs` - Deep link handling
- `src/services/authService.ts` - Auth flow

**Electron Equivalent**: `src/main/auth/`

#### Deep Link Protocol (`deeplink.ts`)

```typescript
import { app, BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

export function setupDeepLinkProtocol(window: BrowserWindow): void {
  mainWindow = window;
  
  // Register protocol
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('clipify', process.execPath, [process.argv[1]]);
    }
  } else {
    app.setAsDefaultProtocolClient('clipify');
  }
  
  // Handle deep links on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
  
  // Handle deep links on Windows/Linux (second instance)
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    
    // Check for deep link in command line
    const url = commandLine.find(arg => arg.startsWith('clipify://'));
    if (url) {
      handleDeepLink(url);
    }
  });
  
  // Handle deep link on startup (Windows/Linux)
  const url = process.argv.find(arg => arg.startsWith('clipify://'));
  if (url) {
    handleDeepLink(url);
  }
}

function handleDeepLink(url: string): void {
  console.log('[DeepLink] Received:', url);
  
  if (!mainWindow) return;
  
  // Emit to renderer
  mainWindow.webContents.send('deep-link-received', url);
  
  // Show window
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

export function verifyProtocolRegistration(): { scheme: string; isRegistered: boolean } {
  const isRegistered = app.isDefaultProtocolClient('clipify');
  return {
    scheme: 'clipify',
    isRegistered
  };
}
```

#### IPC Handlers (`handlers.ts`)

```typescript
import { ipcMain } from 'electron';
import { verifyProtocolRegistration } from './deeplink';

export function registerAuthHandlers(): void {
  ipcMain.handle('verify-deep-link-protocols', () => {
    return {
      protocols: [verifyProtocolRegistration()],
      tauri_version: 'N/A',
      environment: process.env.NODE_ENV || 'production',
      last_error: null,
      event_listener_active: true
    };
  });
  
  ipcMain.handle('check-protocol-registration', (_, scheme: string) => {
    return verifyProtocolRegistration();
  });
}
```

---


### 6. System Permissions & Utilities

**Current Tauri Implementation**: `src-tauri/src/system.rs`

**Electron Equivalent**: `src/main/system/`

#### Permissions (`permissions.ts`)

```typescript
import { systemPreferences } from 'electron';

export function checkAccessibilityPermissions(): { granted: boolean; message: string } {
  if (process.platform !== 'darwin') {
    return { granted: true, message: 'Not required on this platform' };
  }
  
  const granted = systemPreferences.isTrustedAccessibilityClient(false);
  
  return {
    granted,
    message: granted 
      ? 'Accessibility permissions granted'
      : 'Accessibility permissions required for global shortcuts'
  };
}

export function requestAccessibilityPermissions(): void {
  if (process.platform === 'darwin') {
    systemPreferences.isTrustedAccessibilityClient(true);
  }
}

export function getMacOSVersion(): string | null {
  if (process.platform !== 'darwin') {
    return null;
  }
  
  const os = require('os');
  return os.release();
}

export function getAccessibilityInstructions(): string {
  if (process.platform === 'darwin') {
    return 'Go to System Settings > Privacy & Security > Accessibility and enable Clipify';
  }
  return 'Not required on this platform';
}
```

#### Keyboard Simulation (`keyboard.ts`)

```typescript
import * as robot from 'robotjs';

export function simulateCmdC(): void {
  const modifier = process.platform === 'darwin' ? 'command' : 'control';
  robot.keyTap('c', modifier);
}

export function simulateCmdV(): void {
  const modifier = process.platform === 'darwin' ? 'command' : 'control';
  robot.keyTap('v', modifier);
}
```

#### IPC Handlers

```typescript
import { ipcMain, app } from 'electron';
import {
  checkAccessibilityPermissions,
  requestAccessibilityPermissions,
  getMacOSVersion,
  getAccessibilityInstructions
} from './permissions';
import { simulateCmdC } from './keyboard';

export function registerSystemHandlers(): void {
  ipcMain.handle('check-accessibility-permissions', () => {
    const result = checkAccessibilityPermissions();
    if (result.granted) {
      return result.message;
    } else {
      throw new Error(result.message);
    }
  });
  
  ipcMain.handle('request-input-monitoring-permission', () => {
    requestAccessibilityPermissions();
  });
  
  ipcMain.handle('get-macos-version', () => {
    return getMacOSVersion();
  });
  
  ipcMain.handle('get-accessibility-instructions', () => {
    return getAccessibilityInstructions();
  });
  
  ipcMain.handle('simulate-cmd-c', () => {
    simulateCmdC();
  });
  
  ipcMain.handle('quit-application', () => {
    app.quit();
  });
  
  ipcMain.handle('check-accessibility-permissions-and-shortcut-status', () => {
    const permissions = checkAccessibilityPermissions();
    return {
      accessibility_granted: permissions.granted,
      shortcut_registered: true, // Electron handles this differently
      can_register_shortcut: permissions.granted,
      error_message: permissions.granted ? null : permissions.message,
      needs_restart: false
    };
  });
}
```

---


### 7. Secure Storage

**Current Tauri Implementation**: `@tauri-apps/plugin-store`

**Electron Equivalent**: `electron-store` with encryption

#### Store Configuration (`src/main/store/config.ts`)

```typescript
import Store from 'electron-store';
import { safeStorage } from 'electron';

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

interface SecureStoreSchema {
  access_token?: string;
  refresh_token?: string;
  token_metadata?: TokenMetadata;
  user_info?: UserInfo;
}

// Create encrypted store for sensitive data
export const secureStore = new Store<SecureStoreSchema>({
  name: 'secure-storage',
  encryptionKey: 'clipify-secure-key', // In production, use a more secure key
  clearInvalidConfig: true
});

// Helper functions
export function storeAccessToken(token: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    secureStore.set('access_token', encrypted.toString('base64'));
  } else {
    secureStore.set('access_token', token);
  }
}

export function getAccessToken(): string | null {
  const stored = secureStore.get('access_token');
  if (!stored) return null;
  
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(stored, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      return null;
    }
  }
  
  return stored;
}

export function storeRefreshToken(token: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    secureStore.set('refresh_token', encrypted.toString('base64'));
  } else {
    secureStore.set('refresh_token', token);
  }
}

export function getRefreshToken(): string | null {
  const stored = secureStore.get('refresh_token');
  if (!stored) return null;
  
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(stored, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      return null;
    }
  }
  
  return stored;
}

export function storeTokenMetadata(metadata: TokenMetadata): void {
  secureStore.set('token_metadata', metadata);
}

export function getTokenMetadata(): TokenMetadata | null {
  return secureStore.get('token_metadata') || null;
}

export function storeUserInfo(user: UserInfo): void {
  secureStore.set('user_info', user);
}

export function getUserInfo(): UserInfo | null {
  return secureStore.get('user_info') || null;
}

export function clearAllTokens(): void {
  secureStore.delete('access_token');
  secureStore.delete('refresh_token');
  secureStore.delete('token_metadata');
  secureStore.delete('user_info');
}

export function hasValidAccessToken(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  
  const metadata = getTokenMetadata();
  if (!metadata || !metadata.expiresAt) return true; // Assume valid if no expiry
  
  const now = Math.floor(Date.now() / 1000);
  return metadata.expiresAt > now;
}
```

---


### 8. Preload Script (Context Bridge)

**File**: `src/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Window management
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  hideMainWindow: () => ipcRenderer.invoke('hide-main-window'),
  toggleWindowVisibility: () => ipcRenderer.invoke('toggle-window-visibility'),
  
  // Clipboard
  getClipboardHistory: () => ipcRenderer.invoke('get-clipboard-history'),
  addToClipboardHistory: (content: string, isCleaned: boolean, originalContent?: string) =>
    ipcRenderer.invoke('add-to-clipboard-history', content, isCleaned, originalContent),
  removeFromClipboardHistory: (id: string) => ipcRenderer.invoke('remove-from-clipboard-history', id),
  clearClipboardHistory: () => ipcRenderer.invoke('clear-clipboard-history'),
  searchClipboardHistory: (query: string) => ipcRenderer.invoke('search-clipboard-history', query),
  getClipboardEntryById: (id: string) => ipcRenderer.invoke('get-clipboard-entry-by-id', id),
  startClipboardMonitoring: () => ipcRenderer.invoke('start-clipboard-monitoring'),
  stopClipboardMonitoring: () => ipcRenderer.invoke('stop-clipboard-monitoring'),
  triggerClipboardCopy: () => ipcRenderer.invoke('trigger-clipboard-copy'),
  
  // Hotkeys
  registerHotkey: (code: string, combo: string) => ipcRenderer.invoke('register-hotkey', code, combo),
  unregisterHotkey: (code: string) => ipcRenderer.invoke('unregister-hotkey', code),
  reloadHotkeys: (configs: Array<{code: string, combo: string}>) => 
    ipcRenderer.invoke('reload-hotkeys', configs),
  isShortcutRegistered: (combo: string) => ipcRenderer.invoke('is-shortcut-registered', combo),
  
  // System
  checkAccessibilityPermissions: () => ipcRenderer.invoke('check-accessibility-permissions'),
  requestInputMonitoringPermission: () => ipcRenderer.invoke('request-input-monitoring-permission'),
  getMacOSVersion: () => ipcRenderer.invoke('get-macos-version'),
  getAccessibilityInstructions: () => ipcRenderer.invoke('get-accessibility-instructions'),
  simulateCmdC: () => ipcRenderer.invoke('simulate-cmd-c'),
  quitApplication: () => ipcRenderer.invoke('quit-application'),
  checkAccessibilityPermissionsAndShortcutStatus: () => 
    ipcRenderer.invoke('check-accessibility-permissions-and-shortcut-status'),
  
  // Auth
  verifyDeepLinkProtocols: () => ipcRenderer.invoke('verify-deep-link-protocols'),
  checkProtocolRegistration: (scheme: string) => ipcRenderer.invoke('check-protocol-registration', scheme),
  
  // Event listeners
  onDeepLinkReceived: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link-received', (_, url) => callback(url));
    return () => ipcRenderer.removeAllListeners('deep-link-received');
  },
  onClipboardContentChanged: (callback: (content: string) => void) => {
    ipcRenderer.on('clipboard-content-changed', (_, content) => callback(content));
    return () => ipcRenderer.removeAllListeners('clipboard-content-changed');
  },
  onAutoProcessRequest: (callback: (data: {code: string, text: string}) => void) => {
    ipcRenderer.on('auto-process-request', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('auto-process-request');
  }
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electron: {
      showMainWindow: () => Promise<void>;
      hideMainWindow: () => Promise<void>;
      toggleWindowVisibility: () => Promise<void>;
      getClipboardHistory: () => Promise<any[]>;
      addToClipboardHistory: (content: string, isCleaned: boolean, originalContent?: string) => Promise<any>;
      removeFromClipboardHistory: (id: string) => Promise<boolean>;
      clearClipboardHistory: () => Promise<void>;
      searchClipboardHistory: (query: string) => Promise<any[]>;
      getClipboardEntryById: (id: string) => Promise<any>;
      startClipboardMonitoring: () => Promise<void>;
      stopClipboardMonitoring: () => Promise<void>;
      triggerClipboardCopy: () => Promise<string>;
      registerHotkey: (code: string, combo: string) => Promise<boolean>;
      unregisterHotkey: (code: string) => Promise<boolean>;
      reloadHotkeys: (configs: Array<{code: string, combo: string}>) => Promise<any[]>;
      isShortcutRegistered: (combo: string) => Promise<boolean>;
      checkAccessibilityPermissions: () => Promise<string>;
      requestInputMonitoringPermission: () => Promise<void>;
      getMacOSVersion: () => Promise<string | null>;
      getAccessibilityInstructions: () => Promise<string>;
      simulateCmdC: () => Promise<void>;
      quitApplication: () => Promise<void>;
      checkAccessibilityPermissionsAndShortcutStatus: () => Promise<any>;
      verifyDeepLinkProtocols: () => Promise<any>;
      checkProtocolRegistration: (scheme: string) => Promise<any>;
      onDeepLinkReceived: (callback: (url: string) => void) => () => void;
      onClipboardContentChanged: (callback: (content: string) => void) => () => void;
      onAutoProcessRequest: (callback: (data: {code: string, text: string}) => void) => () => void;
    };
  }
}
```

---


### 9. Main Process Entry Point

**File**: `src/main/index.ts`

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { createMainWindow } from './window';
import { createTray } from './tray';
import { setupDeepLinkProtocol } from './auth/deeplink';
import { registerClipboardHandlers } from './clipboard/commands';
import { registerSystemHandlers } from './system/permissions';
import { registerAuthHandlers } from './auth/handlers';
import HotkeyManager from './hotkeys/manager';
import { registerHotkeyHandlers } from './hotkeys/handlers';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;
  let hotkeyManager: HotkeyManager | null = null;
  
  app.on('ready', async () => {
    // Create main window
    mainWindow = createMainWindow();
    
    // Setup deep link protocol
    setupDeepLinkProtocol(mainWindow);
    
    // Create system tray
    createTray();
    
    // Initialize hotkey manager
    hotkeyManager = new HotkeyManager(mainWindow);
    
    // Register default hotkeys
    const defaultHotkeys = [
      { code: 'REPHRASE', combo: 'PRIMARY+SHIFT+KeyC' },
      { code: 'SUMMARIZE', combo: 'PRIMARY+SHIFT+KeyS' },
      { code: 'LEGALIFY', combo: 'PRIMARY+SHIFT+KeyL' }
    ];
    
    for (const hotkey of defaultHotkeys) {
      try {
        await hotkeyManager.register(hotkey.code, hotkey.combo);
      } catch (error) {
        console.error(`Failed to register default hotkey ${hotkey.code}:`, error);
      }
    }
    
    // Register IPC handlers
    registerClipboardHandlers(mainWindow);
    registerSystemHandlers();
    registerAuthHandlers();
    registerHotkeyHandlers(hotkeyManager);
  });
  
  app.on('window-all-closed', () => {
    // On macOS, keep app running in tray
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  
  app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
  
  app.on('before-quit', () => {
    app.isQuitting = true;
    hotkeyManager?.cleanup();
  });
}
```

---


### 10. Frontend Adapter Layer

The existing React frontend needs minimal changes. Create an adapter to map Tauri APIs to Electron APIs.

**File**: `src/renderer/src/services/platformAdapter.ts`

```typescript
// Detect if running in Electron or Tauri
const isElectron = typeof window !== 'undefined' && window.electron;
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export const invoke = async (command: string, args?: any): Promise<any> => {
  if (isElectron) {
    // Map Tauri commands to Electron IPC
    const commandMap: Record<string, string> = {
      'show_main_window': 'show-main-window',
      'hide_main_window': 'hide-main-window',
      'toggle_window_visibility': 'toggle-window-visibility',
      'get_clipboard_history': 'get-clipboard-history',
      'add_to_clipboard_history': 'add-to-clipboard-history',
      'remove_from_clipboard_history': 'remove-from-clipboard-history',
      'clear_clipboard_history': 'clear-clipboard-history',
      'search_clipboard_history': 'search-clipboard-history',
      'get_clipboard_entry_by_id': 'get-clipboard-entry-by-id',
      'start_clipboard_monitoring': 'start-clipboard-monitoring',
      'stop_clipboard_monitoring': 'stop-clipboard-monitoring',
      'trigger_clipboard_copy': 'trigger-clipboard-copy',
      'register_hotkey': 'register-hotkey',
      'unregister_hotkey': 'unregister-hotkey',
      'reload_hotkeys': 'reload-hotkeys',
      'is_shortcut_registered': 'is-shortcut-registered',
      'check_accessibility_permissions': 'check-accessibility-permissions',
      'request_input_monitoring_permission': 'request-input-monitoring-permission',
      'get_macos_version': 'get-macos-version',
      'get_accessibility_instructions': 'get-accessibility-instructions',
      'simulate_cmd_c': 'simulate-cmd-c',
      'quit_application': 'quit-application',
      'check_accessibility_permissions_and_shortcut_status': 'check-accessibility-permissions-and-shortcut-status',
      'verify_deep_link_protocols': 'verify-deep-link-protocols',
      'check_protocol_registration': 'check-protocol-registration'
    };
    
    const electronCommand = commandMap[command] || command;
    
    // Call appropriate Electron method
    switch (electronCommand) {
      case 'show-main-window':
        return window.electron.showMainWindow();
      case 'hide-main-window':
        return window.electron.hideMainWindow();
      case 'toggle-window-visibility':
        return window.electron.toggleWindowVisibility();
      case 'get-clipboard-history':
        return window.electron.getClipboardHistory();
      case 'add-to-clipboard-history':
        return window.electron.addToClipboardHistory(args.content, args.is_cleaned, args.original_content);
      case 'remove-from-clipboard-history':
        return window.electron.removeFromClipboardHistory(args.id);
      case 'clear-clipboard-history':
        return window.electron.clearClipboardHistory();
      case 'search-clipboard-history':
        return window.electron.searchClipboardHistory(args.query);
      case 'get-clipboard-entry-by-id':
        return window.electron.getClipboardEntryById(args.id);
      case 'start-clipboard-monitoring':
        return window.electron.startClipboardMonitoring();
      case 'stop-clipboard-monitoring':
        return window.electron.stopClipboardMonitoring();
      case 'trigger-clipboard-copy':
        return window.electron.triggerClipboardCopy();
      case 'register-hotkey':
        return window.electron.registerHotkey(args.code, args.combo);
      case 'unregister-hotkey':
        return window.electron.unregisterHotkey(args.code);
      case 'reload-hotkeys':
        return window.electron.reloadHotkeys(args.config);
      case 'is-shortcut-registered':
        return window.electron.isShortcutRegistered(args.combo);
      case 'check-accessibility-permissions':
        return window.electron.checkAccessibilityPermissions();
      case 'request-input-monitoring-permission':
        return window.electron.requestInputMonitoringPermission();
      case 'get-macos-version':
        return window.electron.getMacOSVersion();
      case 'get-accessibility-instructions':
        return window.electron.getAccessibilityInstructions();
      case 'simulate-cmd-c':
        return window.electron.simulateCmdC();
      case 'quit-application':
        return window.electron.quitApplication();
      case 'check-accessibility-permissions-and-shortcut-status':
        return window.electron.checkAccessibilityPermissionsAndShortcutStatus();
      case 'verify-deep-link-protocols':
        return window.electron.verifyDeepLinkProtocols();
      case 'check-protocol-registration':
        return window.electron.checkProtocolRegistration(args.scheme);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } else if (isTauri) {
    // Use Tauri API
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return tauriInvoke(command, args);
  } else {
    throw new Error('Platform not supported');
  }
};

export const listen = async (event: string, handler: (data: any) => void): Promise<() => void> => {
  if (isElectron) {
    // Map Tauri events to Electron events
    const eventMap: Record<string, string> = {
      'deep-link-received': 'deep-link-received',
      'clipboard-content-changed': 'clipboard-content-changed',
      'auto-process-request': 'auto-process-request'
    };
    
    const electronEvent = eventMap[event] || event;
    
    switch (electronEvent) {
      case 'deep-link-received':
        return window.electron.onDeepLinkReceived(handler);
      case 'clipboard-content-changed':
        return window.electron.onClipboardContentChanged(handler);
      case 'auto-process-request':
        return window.electron.onAutoProcessRequest(handler);
      default:
        throw new Error(`Unknown event: ${event}`);
    }
  } else if (isTauri) {
    const { listen: tauriListen } = await import('@tauri-apps/api/event');
    const unlisten = await tauriListen(event, (e) => handler(e.payload));
    return unlisten;
  } else {
    throw new Error('Platform not supported');
  }
};
```

**Update existing services to use the adapter**:

Replace all imports of `@tauri-apps/api/core` with the adapter:

```typescript
// Before
import { invoke } from '@tauri-apps/api/core';

// After
import { invoke } from './platformAdapter';
```

---


## Configuration Files

### package.json

```json
{
  "name": "clipify-electron",
  "version": "0.1.0",
  "description": "Professional Text Cleanup Tool",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "dist:mac": "electron-builder --mac",
    "dist:win": "electron-builder --win",
    "dist:linux": "electron-builder --linux"
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "robotjs": "^0.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "electron-vite": "^2.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  },
  "build": {
    "appId": "com.suhailmalik.clipify",
    "productName": "Clipify",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "resources/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"],
      "icon": "resources/icon.icns",
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "hardenedRuntime": true,
      "gatekeeperAssess": false
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
    "protocols": [
      {
        "name": "Clipify",
        "schemes": ["clipify"]
      }
    ]
  }
}
```

### electron.vite.config.ts

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
});
```

### tsconfig.json

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

### .env.development

```bash
# Development Environment
NODE_ENV=development
VITE_DEV_ENVIRONMENT=development
VITE_DEV_BASE_URL=http://localhost:5173/
VITE_DEV_API_BASE_URL=http://localhost:8080
VITE_DEV_API_TIMEOUT=10000
VITE_DEV_OAUTH_BASE_URL=https://clipify0.el.r.appspot.com/api/v1/auth/google/login
VITE_DEV_OAUTH_CLIENT_ID=clipify-desktop
VITE_DEV_OAUTH_REDIRECT_URI=clipify://auth/callback
VITE_DEV_OAUTH_SCOPE=openid email profile
VITE_DEV_LOG_LEVEL=debug
VITE_FEATURE_SUMMARIZATION=true
VITE_FEATURE_HOTKEYS_CONFIG=false
```

### .env.production

```bash
# Production Environment
NODE_ENV=production
VITE_ENVIRONMENT=production
VITE_PROD_ENVIRONMENT=production
VITE_PROD_BASE_URL=https://clipify0.el.r.appspot.com/
VITE_WEBSITE_BASE_URL=https://clipify.space/
VITE_PROD_API_BASE_URL=https://clipify0.el.r.appspot.com
VITE_PROD_API_TIMEOUT=30000
VITE_PROD_OAUTH_BASE_URL=https://clipify0.el.r.appspot.com/api/v1/auth/google/login
VITE_PROD_OAUTH_CLIENT_ID=clipify-desktop
VITE_PROD_OAUTH_REDIRECT_URI=clipify://auth/callback
VITE_PROD_OAUTH_SCOPE=openid email profile
VITE_PROD_LOG_LEVEL=info
VITE_API_BASE_URL=https://clipify0.el.r.appspot.com
VITE_FEATURE_SUMMARIZATION=false
VITE_FEATURE_HOTKEYS_CONFIG=false
```

---

## Key Features Summary

### 1. **Clipboard Management**
- Monitor clipboard changes every 500ms
- Store up to 100 entries with metadata
- Search and filter history
- Persistent storage with electron-store

### 2. **Global Hotkeys**
- Default hotkeys:
  - `Cmd/Ctrl+Shift+C` - Rephrase
  - `Cmd/Ctrl+Shift+S` - Summarize
  - `Cmd/Ctrl+Shift+L` - Legalify
- Custom hotkey bindings
- Platform-specific modifier keys (PRIMARY = Cmd on macOS, Ctrl on Windows/Linux)
- Conflict detection

### 3. **Text Processing**
- AI-powered rephrasing via backend API
- Summarization
- Legal text transformation
- Custom prompts support
- Word limit validation (150 words for free plan)

### 4. **Authentication**
- OAuth via Google
- Deep link callback: `clipify://auth/callback`
- JWT token storage with encryption
- Token refresh mechanism
- Session persistence

### 5. **System Tray**
- Always-on background operation
- Quick access to recent clipboard items
- Trigger hotkeys from menu
- Settings and quit options

### 6. **Permissions**
- macOS: Accessibility permissions for global shortcuts
- Windows: No special permissions required
- Linux: No special permissions required

---


## Migration Checklist

### Phase 1: Setup & Infrastructure
- [ ] Initialize Electron project with electron-vite
- [ ] Setup TypeScript configuration
- [ ] Create main process structure
- [ ] Create preload script with context bridge
- [ ] Setup electron-store for persistent storage
- [ ] Configure build system (electron-builder)

### Phase 2: Core Features
- [ ] Implement window management
- [ ] Create system tray with menu
- [ ] Setup clipboard monitoring
- [ ] Implement clipboard history storage
- [ ] Create IPC handlers for clipboard operations

### Phase 3: Hotkeys
- [ ] Implement hotkey manager
- [ ] Create hotkey parser (normalize to Electron format)
- [ ] Register default hotkeys
- [ ] Implement keyboard simulation (robotjs)
- [ ] Create IPC handlers for hotkey operations

### Phase 4: Authentication
- [ ] Setup deep link protocol registration
- [ ] Implement deep link handler
- [ ] Create secure token storage
- [ ] Implement auth flow (OAuth callback)
- [ ] Create IPC handlers for auth operations

### Phase 5: System Integration
- [ ] Implement accessibility permission checks (macOS)
- [ ] Create system utilities (keyboard simulation)
- [ ] Setup notifications
- [ ] Implement quit/restart handlers

### Phase 6: Frontend Adaptation
- [ ] Create platform adapter layer
- [ ] Update all Tauri API calls to use adapter
- [ ] Test event listeners
- [ ] Update environment service
- [ ] Test all UI components

### Phase 7: Testing & Polish
- [ ] Test on macOS
- [ ] Test on Windows
- [ ] Test on Linux
- [ ] Test deep link flow
- [ ] Test hotkey registration
- [ ] Test clipboard monitoring
- [ ] Test authentication flow
- [ ] Performance optimization

### Phase 8: Build & Distribution
- [ ] Configure code signing (macOS)
- [ ] Setup auto-updater
- [ ] Create installers (DMG, NSIS, AppImage)
- [ ] Test installation on all platforms
- [ ] Create distribution packages

---

## Platform-Specific Notes

### macOS
- **Accessibility Permissions**: Required for global shortcuts and keyboard simulation
- **Code Signing**: Required for distribution
- **Notarization**: Required for Gatekeeper
- **Entitlements**: Need `com.apple.security.automation.apple-events` for keyboard simulation

### Windows
- **No special permissions** required
- **Protocol registration**: Automatic via electron-builder
- **Installer**: NSIS or Squirrel
- **Auto-update**: Use electron-updater

### Linux
- **No special permissions** required
- **Protocol registration**: Via .desktop file
- **Package formats**: AppImage, deb, rpm
- **Dependencies**: May need to install robotjs dependencies

---


## API Endpoints (Backend)

The application communicates with a backend API for text processing and authentication.

### Authentication Endpoints

```
POST /api/v1/auth/google/login
  - Initiates Google OAuth flow
  - Query params: client_type=web, redirect=<deep_link_uri>

GET /api/v1/auth/google/callback
  - OAuth callback handler
  - Returns: token, user data, redirect to deep link

POST /api/v1/auth/refresh
  - Refresh access token
  - Headers: Authorization: Bearer <refresh_token>
  - Returns: new access_token, refresh_token

POST /api/v1/auth/logout
  - Logout user
  - Headers: Authorization: Bearer <access_token>

GET /api/v1/auth/desktop-login
  - Desktop-specific login flow
  - Handles cookie session reuse
```

### Text Processing Endpoints

```
POST /api/v1/protected/rephrase
  - Rephrase text
  - Headers: Authorization: Bearer <access_token>
  - Body: {
      text: string,
      style?: string,
      context?: string,
      target_audience?: string,
      preserve_length?: boolean
    }
  - Returns: { rephrased_text: string }

POST /api/v1/protected/summarize
  - Summarize text
  - Headers: Authorization: Bearer <access_token>
  - Body: { text: string }
  - Returns: { summary: string }

POST /api/v1/protected/legalify
  - Transform to legal language
  - Headers: Authorization: Bearer <access_token>
  - Body: { text: string }
  - Returns: { legal_text: string }

POST /api/v1/protected/custom-prompt
  - Process with custom prompt
  - Headers: Authorization: Bearer <access_token>
  - Body: {
      text: string,
      prompt_code: string
    }
  - Returns: { processed_text: string }
```

### Hotkey Management Endpoints

```
GET /api/v1/protected/hotkeys
  - Get user's hotkey bindings
  - Headers: Authorization: Bearer <access_token>
  - Returns: Array<{ id, prompt_code, combo, registered }>

POST /api/v1/protected/hotkeys
  - Create hotkey binding
  - Headers: Authorization: Bearer <access_token>
  - Body: { prompt_code: string, combo: string }
  - Returns: { id, prompt_code, combo, registered }

PUT /api/v1/protected/hotkeys/:id
  - Update hotkey binding
  - Headers: Authorization: Bearer <access_token>
  - Body: { combo: string }
  - Returns: { id, prompt_code, combo, registered }

DELETE /api/v1/protected/hotkeys/:id
  - Delete hotkey binding
  - Headers: Authorization: Bearer <access_token>
  - Returns: { success: boolean }
```

### Custom Prompts Endpoints

```
GET /api/v1/protected/prompts
  - Get user's custom prompts
  - Headers: Authorization: Bearer <access_token>
  - Returns: Array<{ id, code, name, description, template }>

POST /api/v1/protected/prompts
  - Create custom prompt
  - Headers: Authorization: Bearer <access_token>
  - Body: {
      code: string,
      name: string,
      description?: string,
      template: string
    }
  - Returns: { id, code, name, description, template }

PUT /api/v1/protected/prompts/:id
  - Update custom prompt
  - Headers: Authorization: Bearer <access_token>
  - Body: { name?, description?, template? }
  - Returns: { id, code, name, description, template }

DELETE /api/v1/protected/prompts/:id
  - Delete custom prompt
  - Headers: Authorization: Bearer <access_token>
  - Returns: { success: boolean }
```

---

## Error Handling

### Frontend Error Handling

```typescript
// Error types
export class ClipifyError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ClipifyError';
  }
}

// Common error codes
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  WORD_LIMIT_EXCEEDED = 'WORD_LIMIT_EXCEEDED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  HOTKEY_CONFLICT = 'HOTKEY_CONFLICT',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

// Error handler
export async function handleError(error: any): Promise<void> {
  if (error instanceof ClipifyError) {
    switch (error.code) {
      case ErrorCode.UNAUTHORIZED:
        // Trigger re-authentication
        await authService.logout();
        await notificationService.error('Session Expired', 'Please log in again');
        break;
      case ErrorCode.RATE_LIMITED:
        await notificationService.error('Rate Limited', 'Please try again later');
        break;
      case ErrorCode.WORD_LIMIT_EXCEEDED:
        await notificationService.error('Word Limit Exceeded', error.message);
        break;
      default:
        await notificationService.error('Error', error.message);
    }
  } else {
    await notificationService.error('Unexpected Error', 'An unexpected error occurred');
  }
  
  // Log error
  getLoggingService().error('app', 'Error occurred', error);
}
```

---


## Testing Strategy

### Unit Tests
- Test hotkey parser
- Test clipboard entry creation
- Test token storage/retrieval
- Test platform adapter

### Integration Tests
- Test IPC communication
- Test clipboard monitoring
- Test hotkey registration
- Test deep link handling

### E2E Tests
- Test complete authentication flow
- Test text processing flow
- Test hotkey trigger → process → clipboard
- Test tray menu interactions

### Manual Testing Checklist
- [ ] Install app on clean system
- [ ] Test first launch experience
- [ ] Test OAuth login flow
- [ ] Test deep link callback
- [ ] Test global hotkeys
- [ ] Test clipboard monitoring
- [ ] Test text processing (rephrase, summarize, legalify)
- [ ] Test custom prompts
- [ ] Test hotkey management
- [ ] Test system tray menu
- [ ] Test window show/hide
- [ ] Test quit and restart
- [ ] Test token refresh
- [ ] Test logout
- [ ] Test accessibility permissions (macOS)
- [ ] Test protocol registration

---

## Performance Considerations

### Clipboard Monitoring
- Poll interval: 500ms (configurable)
- Debounce duplicate content
- Limit history to 100 entries
- Lazy load history in UI

### Hotkey Registration
- Register on app startup
- Unregister on app quit
- Handle conflicts gracefully
- Provide user feedback

### Memory Management
- Clear old clipboard entries
- Limit event listeners
- Cleanup on window close
- Proper IPC handler cleanup

### Startup Time
- Lazy load non-critical modules
- Defer clipboard monitoring start
- Cache user preferences
- Optimize bundle size

---

## Security Considerations

### Token Storage
- Use electron-store with encryption
- Use safeStorage API when available
- Never log tokens
- Clear tokens on logout

### Deep Links
- Validate deep link URLs
- Sanitize query parameters
- Prevent XSS in URL handling
- Rate limit deep link processing

### IPC Security
- Use contextBridge (no nodeIntegration)
- Validate all IPC inputs
- Whitelist allowed commands
- Use contextIsolation

### API Communication
- Always use HTTPS
- Validate SSL certificates
- Implement request timeouts
- Handle 401/403 properly

---

## Deployment

### macOS
```bash
# Build
npm run dist:mac

# Output
release/Clipify-0.1.0.dmg
release/Clipify-0.1.0-mac.zip

# Code signing (requires Apple Developer account)
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=password
npm run dist:mac
```

### Windows
```bash
# Build
npm run dist:win

# Output
release/Clipify Setup 0.1.0.exe
release/Clipify 0.1.0.exe (portable)

# Code signing (optional)
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=password
npm run dist:win
```

### Linux
```bash
# Build
npm run dist:linux

# Output
release/Clipify-0.1.0.AppImage
release/clipify_0.1.0_amd64.deb

# No code signing required
```

---

## Troubleshooting

### Common Issues

**1. Global shortcuts not working**
- Check accessibility permissions (macOS)
- Verify no conflicts with other apps
- Check console for registration errors
- Try different key combinations

**2. Deep links not working**
- Verify protocol registration
- Check if another app claimed the protocol
- Test with: `open clipify://auth/callback?token=test` (macOS)
- Check console for deep link events

**3. Clipboard monitoring not working**
- Check if monitoring is started
- Verify clipboard permissions
- Check console for errors
- Try manual clipboard operations

**4. Authentication fails**
- Check network connectivity
- Verify API endpoints
- Check token storage
- Clear stored tokens and retry

**5. Build fails**
- Check Node.js version (>=18)
- Install native dependencies (robotjs)
- Check platform-specific requirements
- Clear node_modules and reinstall

---

## Additional Resources

### Documentation
- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [robotjs](http://robotjs.io/)

### Similar Projects
- [Clipy](https://github.com/Clipy/Clipy) - Clipboard manager for macOS
- [CopyQ](https://github.com/hluk/CopyQ) - Cross-platform clipboard manager
- [Ditto](https://ditto-cp.sourceforge.io/) - Windows clipboard manager

---

## Conclusion

This specification provides a complete blueprint for migrating Clipify from Tauri to Electron. The architecture maintains feature parity while leveraging Electron's mature ecosystem and broader platform support.

Key advantages of Electron migration:
- Mature ecosystem with extensive libraries
- Better documentation and community support
- Easier native module integration
- More flexible build and distribution options
- Better debugging tools

The migration preserves all existing features:
- Global hotkeys with platform-specific modifiers
- Clipboard monitoring and history
- OAuth authentication with deep links
- AI-powered text processing
- System tray integration
- Secure token storage
- Custom prompts and hotkey bindings

All frontend code remains largely unchanged, with only a thin adapter layer needed to bridge Tauri and Electron APIs.
