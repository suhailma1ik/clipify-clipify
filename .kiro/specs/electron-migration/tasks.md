# Implementation Plan

This document outlines the implementation tasks for migrating Clipify from Tauri to Electron. Each task is designed to be implemented and tested independently, building incrementally toward the complete application.

---

## Task List

- [x] 1. Setup project structure and configuration
  - Create src/main/, src/preload/, src/renderer/ directory structure
  - Configure electron-vite with main, preload, and renderer targets
  - Setup TypeScript configuration with strict mode
  - Create .env.development and .env.production files with API endpoints
  - Update package.json scripts for dev, build, and dist commands
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implement window management
  - [x] 2.1 Create src/main/window.ts with window lifecycle functions
    - Implement createMainWindow() with proper configuration (800x1200, preload path, security settings)
    - Implement showMainWindow(), hideMainWindow(), toggleWindowVisibility()
    - Handle close event to hide instead of quit
    - Load from dev server in development, file in production
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 2.2 Create src/main/index.ts entry point
    - Request single instance lock
    - Handle app ready event to create window
    - Handle window-all-closed event (platform-specific behavior)
    - Handle activate event (macOS)
    - Handle before-quit event for cleanup
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 2.3 Register window IPC handlers
    - Register show-main-window handler
    - Register hide-main-window handler
    - Register toggle-window-visibility handler
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 3. Create preload script and context bridge
  - [x] 3.1 Create src/preload/index.ts with context bridge
    - Expose window.electron object using contextBridge
    - Configure contextIsolation and disable nodeIntegration
    - Expose window management methods (show, hide, toggle)
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 3.2 Add TypeScript definitions for window.electron
    - Declare global Window interface extension
    - Add type definitions for all exposed methods
    - Include JSDoc comments for IDE support
    - _Requirements: 3.5_

- [x] 4. Implement deep link protocol and authentication
  - [x] 4.1 Create src/main/auth/deeplink.ts
    - Implement setupDeepLinkProtocol() to register clipify:// protocol
    - Handle open-url event (macOS)
    - Handle second-instance event (Windows/Linux)
    - Parse startup args for deep links
    - Emit deep-link-received event to renderer
    - Show and focus window when deep link received
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 4.2 Create src/main/auth/handlers.ts
    - Implement verifyProtocolRegistration() function
    - Register verify-deep-link-protocols IPC handler
    - Register check-protocol-registration IPC handler
    - _Requirements: 4.1_
  
  - [x] 4.3 Update preload script with auth methods
    - Expose verifyDeepLinkProtocols() method
    - Expose checkProtocolRegistration() method
    - Expose onDeepLinkReceived() event listener
    - _Requirements: 3.4_
  
  - [x] 4.4 Update main index.ts to setup deep link protocol
    - Call setupDeepLinkProtocol() after window creation
    - Register auth IPC handlers
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Implement secure token storage
  - [x] 5.1 Create src/main/store/config.ts
    - Define TokenMetadata and UserInfo interfaces
    - Initialize electron-store with encryption
    - Implement storeAccessToken() with safeStorage encryption
    - Implement getAccessToken() with safeStorage decryption
    - Implement storeRefreshToken() and getRefreshToken()
    - Implement storeTokenMetadata() and getTokenMetadata()
    - Implement storeUserInfo() and getUserInfo()
    - Implement clearAllTokens()
    - Implement hasValidAccessToken() with expiry check
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 5.2 Create IPC handlers for token storage
    - Register store-access-token handler
    - Register get-access-token handler
    - Register store-refresh-token handler
    - Register get-refresh-token handler
    - Register store-token-metadata handler
    - Register get-token-metadata handler
    - Register store-user-info handler
    - Register get-user-info handler
    - Register clear-all-tokens handler
    - Register has-valid-access-token handler
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 5.3 Update preload script with storage methods
    - Expose all token storage methods
    - Add TypeScript definitions
    - _Requirements: 3.3_

- [x] 6. Implement system tray
  - [x] 6.1 Create src/main/tray.ts
    - Implement createTray() with icon loading
    - Resize icon to 16x16
    - Set tooltip text
    - Handle click event to toggle window
    - _Requirements: 7.1, 7.2_
  
  - [x] 6.2 Implement tray menu
    - Create menu template with Show/Hide, Settings, About, Quit items
    - Build menu from template
    - Set context menu on tray
    - Handle menu item clicks
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [x] 6.3 Create placeholder icon resource
    - Create resources/ directory
    - Add placeholder icon.png (16x16 or larger)
    - Document icon requirements for production
    - _Requirements: 7.1_
  
  - [x] 6.4 Update main index.ts to create tray
    - Call createTray() after window creation
    - _Requirements: 7.1_

- [x] 7. Implement clipboard operations
  - [x] 7.1 Create src/main/clipboard/operations.ts
    - Implement readClipboard() using electron.clipboard.readText()
    - Implement writeClipboard() using electron.clipboard.writeText()
    - Implement triggerClipboardCopy() using robotjs.keyTap()
    - Add 100ms delay after keyboard simulation
    - Handle platform-specific modifiers (command vs control)
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [x] 7.2 Create src/main/clipboard/handlers.ts
    - Register read-clipboard IPC handler
    - Register write-clipboard IPC handler
    - Register trigger-clipboard-copy IPC handler
    - Wrap handlers in try-catch for error handling
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 7.3 Update preload script with clipboard methods
    - Expose readClipboard() method
    - Expose writeClipboard() method
    - Expose triggerClipboardCopy() method
    - Add TypeScript definitions
    - _Requirements: 3.3_
  
  - [x] 7.4 Update main index.ts to register clipboard handlers
    - Call registerClipboardHandlers()
    - _Requirements: 8.1, 8.2_

- [x] 8. Implement global hotkeys system
  - [x] 8.1 Create src/main/hotkeys/parser.ts
    - Implement parseHotkeyCombo() function
    - Map PRIMARY to CommandOrControl
    - Map SHIFT, ALT, CONTROL to Electron format
    - Parse key codes (KeyX, DigitX, FX)
    - Handle special keys (Space, Enter, etc.)
    - _Requirements: 9.2_
  
  - [x] 8.2 Create src/main/hotkeys/manager.ts
    - Create HotkeyManager class with constructor accepting BrowserWindow
    - Implement register() method using globalShortcut.register()
    - Implement unregister() method using globalShortcut.unregister()
    - Implement reloadHotkeys() method to unregister all and re-register
    - Implement isRegistered() method using globalShortcut.isRegistered()
    - Implement cleanup() method using globalShortcut.unregisterAll()
    - Store registered hotkeys in Map<code, combo>
    - _Requirements: 9.1, 9.4, 9.5_
  
  - [x] 8.3 Implement hotkey press handler in manager
    - On hotkey press, simulate Cmd+C/Ctrl+C using robotjs
    - Wait 100ms for clipboard update
    - Read clipboard text
    - Emit auto-process-request event to renderer with code and text
    - _Requirements: 9.3_
  
  - [x] 8.4 Create src/main/hotkeys/handlers.ts
    - Register register-hotkey IPC handler
    - Register unregister-hotkey IPC handler
    - Register reload-hotkeys IPC handler
    - Register is-shortcut-registered IPC handler
    - _Requirements: 9.4_
  
  - [x] 8.5 Update preload script with hotkey methods
    - Expose registerHotkey() method
    - Expose unregisterHotkey() method
    - Expose reloadHotkeys() method
    - Expose isShortcutRegistered() method
    - Expose onAutoProcessRequest() event listener
    - Add TypeScript definitions
    - _Requirements: 3.3, 3.4_
  
  - [x] 8.6 Update main index.ts to initialize hotkeys
    - Create HotkeyManager instance after window creation
    - Register default hotkeys (REPHRASE, SUMMARIZE, LEGALIFY)
    - Register hotkey IPC handlers
    - Call cleanup() in before-quit handler
    - _Requirements: 9.1, 9.5_

- [x] 9. Implement system permissions (macOS)
  - [x] 9.1 Create src/main/system/permissions.ts
    - Implement checkAccessibilityPermissions() using systemPreferences.isTrustedAccessibilityClient(false)
    - Implement requestAccessibilityPermissions() using systemPreferences.isTrustedAccessibilityClient(true)
    - Implement getMacOSVersion() using os.release()
    - Implement getAccessibilityInstructions() with platform-specific text
    - Return granted=true for Windows/Linux
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 9.2 Create src/main/system/keyboard.ts
    - Implement simulateCmdC() using robotjs.keyTap()
    - Implement simulateCmdV() using robotjs.keyTap()
    - Handle platform-specific modifiers
    - _Requirements: 8.4_
  
  - [x] 9.3 Create src/main/system/handlers.ts
    - Register check-accessibility-permissions IPC handler
    - Register request-input-monitoring-permission IPC handler
    - Register get-macos-version IPC handler
    - Register get-accessibility-instructions IPC handler
    - Register simulate-cmd-c IPC handler
    - Register quit-application IPC handler
    - Register check-accessibility-permissions-and-shortcut-status IPC handler
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 9.4 Update preload script with system methods
    - Expose all system permission methods
    - Add TypeScript definitions
    - _Requirements: 3.3_
  
  - [x] 9.5 Update main index.ts to register system handlers
    - Call registerSystemHandlers()
    - _Requirements: 10.1_

- [x] 10. Create platform adapter for frontend
  - [x] 10.1 Create src/renderer/src/services/platformAdapter.ts
    - Implement environment detection (isElectron, isTauri)
    - Create command mapping object (Tauri → Electron)
    - Create event mapping object (Tauri → Electron)
    - Implement invoke() function with command mapping
    - Implement listen() function with event mapping
    - Add error handling for unknown commands/events
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 10.2 Add TypeScript definitions for platform adapter
    - Export invoke and listen function types
    - Document command and event mappings
    - _Requirements: 11.5_

- [ ] 11. Setup error handling and logging
  - [ ] 11.1 Create src/main/utils/errors.ts
    - Define ErrorCode enum
    - Create ClipifyError class
    - Implement error logging utility
    - _Requirements: 15.1, 15.2_
  
  - [ ] 11.2 Update all IPC handlers with error handling
    - Wrap handlers in try-catch blocks
    - Return structured errors to renderer
    - Log errors with context
    - _Requirements: 15.1, 15.2_
  
  - [ ] 11.3 Add development mode logging
    - Enable verbose logging in development
    - Add timestamps to log messages
    - Log IPC calls and responses
    - _Requirements: 15.5_

- [ ] 12. Configure build and distribution
  - [ ] 12.1 Update package.json with electron-builder config
    - Set appId to com.suhailmalik.clipify
    - Configure output directory
    - Configure files to include
    - Configure macOS target (dmg, zip) with entitlements
    - Configure Windows target (nsis, portable)
    - Configure Linux target (AppImage, deb)
    - Configure protocol registration
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 12.2 Create build/entitlements.mac.plist
    - Add com.apple.security.automation.apple-events entitlement
    - Add other required macOS entitlements
    - _Requirements: 13.2_
  
  - [ ] 12.3 Test build process
    - Run npm run build to verify compilation
    - Run npm run dist to create packages
    - Verify package contents
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 13. Setup development environment
  - [ ] 13.1 Verify electron-vite dev server configuration
    - Ensure renderer loads from http://localhost:5173
    - Verify hot-reload works for renderer
    - Verify main process restarts on changes
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [ ] 13.2 Add development debugging tools
    - Enable DevTools in development mode
    - Add source maps for debugging
    - Configure error overlay
    - _Requirements: 14.5_
  
  - [ ] 13.3 Create development documentation
    - Document npm run dev command
    - Document debugging process
    - Document common issues and solutions
    - _Requirements: 14.1_

- [ ] 14. Create test files for each feature
  - [ ] 14.1 Create tests/window-management.test.md
    - Test window creation and visibility
    - Test show/hide/toggle functionality
    - Test close behavior (hide vs quit)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 14.2 Create tests/deep-link.test.md
    - Test protocol registration
    - Test deep link handling on each platform
    - Test URL parsing and parameter extraction
    - Test window focus on deep link
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 14.3 Create tests/token-storage.test.md
    - Test token encryption and decryption
    - Test token storage and retrieval
    - Test token expiry validation
    - Test clear all tokens
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 14.4 Create tests/system-tray.test.md
    - Test tray icon creation
    - Test tray menu items
    - Test tray click behavior
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 14.5 Create tests/clipboard.test.md
    - Test read clipboard
    - Test write clipboard
    - Test trigger clipboard copy
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [ ] 14.6 Create tests/hotkeys.test.md
    - Test hotkey parser with various combos
    - Test hotkey registration
    - Test hotkey press simulation
    - Test hotkey unregistration
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 14.7 Create tests/permissions.test.md
    - Test accessibility permission check (macOS)
    - Test permission request (macOS)
    - Test platform-specific behavior
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 14.8 Create tests/platform-adapter.test.md
    - Test command mapping
    - Test event mapping
    - Test error handling
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

---

## Implementation Notes

### Task Dependencies

- Task 1 must be completed first (project setup)
- Tasks 2-3 should be completed before other tasks (window + preload)
- Task 4 (deep link) can be done independently after 2-3
- Task 5 (storage) can be done independently after 2-3
- Task 6 (tray) depends on task 2 (window management)
- Task 7 (clipboard) can be done independently after 2-3
- Task 8 (hotkeys) depends on task 7 (clipboard operations)
- Task 9 (permissions) can be done independently after 2-3
- Task 10 (adapter) should be done after all main process features
- Task 11 (error handling) should be integrated throughout
- Task 12 (build) can be done after core features
- Task 13 (dev environment) should be verified early
- Task 14 (tests) should be created alongside each feature

### Testing Approach

Each task includes test file creation. After implementing a task:
1. Create the corresponding test file
2. Run manual tests following test file instructions
3. Document results in test file
4. Fix any issues before moving to next task

### Development Test Code

Each task will include test code behind a `DEV_TEST` flag that can be enabled to verify the feature works correctly. This allows isolated testing of each feature without requiring the full application to be functional.

**Usage**:
```typescript
// In main process or renderer
const DEV_TEST = process.env.DEV_TEST === 'true';

if (DEV_TEST) {
  // Test code for this feature
}
```

**Running tests**:
```bash
# Enable test mode
DEV_TEST=true npm run dev

# Or add to .env.development
DEV_TEST=true
```

### Development Workflow

1. Implement task code
2. Add DEV_TEST code block to test the feature
3. Run with DEV_TEST=true to verify functionality
4. Create test file with manual test instructions
5. Document results
6. Commit changes
7. Move to next task

### Code Quality

- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Follow consistent naming conventions
- Handle errors gracefully
- Log important events for debugging
