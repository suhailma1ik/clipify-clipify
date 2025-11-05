# Requirements Document

## Introduction

This document outlines the requirements for migrating Clipify from Tauri (Rust + React) to Electron (Node.js + React). Clipify is a desktop application for AI-powered text processing with global hotkeys. The migration will maintain all existing functionality while leveraging Electron's mature ecosystem and broader platform support.

## Glossary

- **Main Process**: The Electron main process running Node.js that manages application lifecycle, windows, and system integration
- **Renderer Process**: The Electron renderer process running the React frontend in a Chromium browser context
- **Preload Script**: A script that runs before the renderer process loads, creating a secure bridge between main and renderer processes
- **IPC (Inter-Process Communication)**: The communication mechanism between main and renderer processes in Electron
- **Context Bridge**: Electron's secure API for exposing main process functionality to the renderer process
- **Deep Link**: A URL protocol (clipify://) that allows external applications/browsers to open and pass data to the application
- **Global Hotkey**: A system-wide keyboard shortcut that works even when the application is not focused
- **System Tray**: A persistent icon in the system tray/menu bar that provides quick access to the application
- **OAuth**: Open Authorization protocol used for Google authentication
- **JWT Token**: JSON Web Token used for API authentication
- **Platform Adapter**: A compatibility layer that maps Tauri API calls to Electron API calls

## Requirements

### Requirement 1: Project Setup and Configuration

**User Story:** As a developer, I want a properly configured Electron project with TypeScript support, so that I can develop and build the application efficiently.

#### Acceptance Criteria

1. WHEN the project is initialized, THE System SHALL have a valid electron-vite configuration file that defines main, preload, and renderer build targets
2. WHEN the project is initialized, THE System SHALL have TypeScript configuration files (tsconfig.json) with strict type checking enabled
3. WHEN the project structure is created, THE System SHALL organize code into src/main/, src/preload/, and src/renderer/ directories
4. WHEN environment files are created, THE System SHALL provide separate .env.development and .env.production files with all required API endpoints and OAuth configuration
5. WHEN the package.json is configured, THE System SHALL include scripts for development (dev), building (build), and packaging (dist) the application

---

### Requirement 2: Window Management

**User Story:** As a user, I want the application window to be properly managed, so that I can show, hide, and interact with the application interface.

#### Acceptance Criteria

1. WHEN the application starts, THE Main Process SHALL create a browser window with dimensions 800x1200 pixels
2. WHEN the user closes the window, THE Main Process SHALL hide the window instead of quitting the application
3. WHEN a show-main-window IPC command is received, THE Main Process SHALL display and focus the main window
4. WHEN a hide-main-window IPC command is received, THE Main Process SHALL hide the main window
5. WHEN a toggle-window-visibility IPC command is received, THE Main Process SHALL show the window if hidden or hide the window if visible

---

### Requirement 3: Preload Script and Context Bridge

**User Story:** As a developer, I want a secure communication bridge between main and renderer processes, so that the frontend can safely access Electron APIs.

#### Acceptance Criteria

1. WHEN the preload script loads, THE Preload Script SHALL expose a window.electron object to the renderer process using contextBridge
2. WHEN the context bridge is created, THE Preload Script SHALL enable contextIsolation and disable nodeIntegration for security
3. WHEN IPC methods are exposed, THE Preload Script SHALL provide type-safe wrappers for all main process commands
4. WHEN event listeners are exposed, THE Preload Script SHALL provide methods to subscribe and unsubscribe from main process events
5. WHEN TypeScript definitions are created, THE Preload Script SHALL declare global Window interface extensions for type safety

---

### Requirement 4: Deep Link Protocol Registration

**User Story:** As a user, I want the application to handle clipify:// URLs, so that I can complete OAuth authentication via browser redirects.

#### Acceptance Criteria

1. WHEN the application installs, THE Main Process SHALL register clipify as a custom URL protocol handler
2. WHEN a clipify:// URL is opened on macOS, THE Main Process SHALL receive the URL via the open-url event
3. WHEN a clipify:// URL is opened on Windows/Linux, THE Main Process SHALL receive the URL via the second-instance event
4. WHEN a deep link is received, THE Main Process SHALL emit a deep-link-received event to the renderer process with the URL
5. WHEN a deep link is received, THE Main Process SHALL show and focus the main window if it is hidden

---

### Requirement 5: OAuth Authentication Flow

**User Story:** As a user, I want to authenticate with Google OAuth, so that I can access AI text processing features.

#### Acceptance Criteria

1. WHEN the user initiates login, THE Renderer Process SHALL open the system browser to the OAuth URL with redirect parameter clipify://auth/callback
2. WHEN the OAuth callback URL is received via deep link, THE Renderer Process SHALL extract the access token, refresh token, and user information from URL parameters
3. WHEN authentication tokens are received, THE Main Process SHALL store the access token and refresh token securely using electron-store with encryption
4. WHEN token metadata is provided, THE Main Process SHALL store expiration time, token type, scope, and issued timestamp
5. WHEN user information is received, THE Main Process SHALL store user ID, email, name, avatar, and plan information

---

### Requirement 6: Secure Token Storage

**User Story:** As a user, I want my authentication tokens stored securely, so that my account credentials are protected.

#### Acceptance Criteria

1. WHEN tokens are stored, THE Main Process SHALL use electron-store with encryption for persistent storage
2. WHERE Electron's safeStorage API is available, THE Main Process SHALL encrypt tokens using platform-specific encryption (Keychain on macOS, Credential Manager on Windows)
3. WHEN tokens are retrieved, THE Main Process SHALL decrypt tokens if they were encrypted with safeStorage
4. WHEN the user logs out, THE Main Process SHALL delete all stored tokens, metadata, and user information
5. WHEN token validity is checked, THE Main Process SHALL compare the current timestamp with the stored expiration time

---

### Requirement 7: System Tray Integration

**User Story:** As a user, I want a system tray icon with a context menu, so that I can quickly access application features without opening the main window.

#### Acceptance Criteria

1. WHEN the application starts, THE Main Process SHALL create a system tray icon with the Clipify logo
2. WHEN the tray icon is clicked, THE Main Process SHALL toggle the main window visibility
3. WHEN the tray context menu is opened, THE Main Process SHALL display menu items for Show/Hide, Settings, About, and Quit
4. WHEN the Quit menu item is clicked, THE Main Process SHALL terminate the application completely
5. WHEN the Settings menu item is clicked, THE Main Process SHALL show the main window

---

### Requirement 8: Clipboard Operations

**User Story:** As a user, I want to read from and write to the system clipboard, so that I can process selected text with AI.

#### Acceptance Criteria

1. WHEN a read-clipboard IPC command is received, THE Main Process SHALL return the current text content from the system clipboard
2. WHEN a write-clipboard IPC command is received with text content, THE Main Process SHALL write the text to the system clipboard
3. WHEN clipboard operations fail, THE Main Process SHALL return an error message to the renderer process
4. WHEN the trigger-clipboard-copy IPC command is received, THE Main Process SHALL simulate Cmd+C (macOS) or Ctrl+C (Windows/Linux) using robotjs
5. WHEN keyboard simulation completes, THE Main Process SHALL wait 100ms for clipboard update and return the copied text

---

### Requirement 9: Global Hotkey System

**User Story:** As a user, I want to register global keyboard shortcuts, so that I can trigger text processing actions from anywhere in the system.

#### Acceptance Criteria

1. WHEN the application starts, THE Main Process SHALL register three default hotkeys: PRIMARY+SHIFT+KeyC (rephrase), PRIMARY+SHIFT+KeyS (summarize), PRIMARY+SHIFT+KeyL (legalify)
2. WHEN a hotkey combo string is provided (e.g., "PRIMARY+SHIFT+KeyC"), THE Hotkey Parser SHALL convert it to Electron format (e.g., "CommandOrControl+Shift+C")
3. WHEN a registered hotkey is pressed, THE Hotkey Manager SHALL simulate Cmd+C/Ctrl+C to copy selected text, wait 100ms, read clipboard, and emit auto-process-request event to renderer with code and text
4. WHEN a register-hotkey IPC command is received, THE Main Process SHALL register the hotkey and return success or failure status
5. WHEN the application quits, THE Main Process SHALL unregister all global hotkeys

---

### Requirement 10: System Permissions (macOS)

**User Story:** As a macOS user, I want to be prompted for accessibility permissions, so that global hotkeys and keyboard simulation can function properly.

#### Acceptance Criteria

1. WHEN accessibility permissions are checked on macOS, THE Main Process SHALL use systemPreferences.isTrustedAccessibilityClient() to determine permission status
2. WHEN accessibility permissions are requested on macOS, THE Main Process SHALL call systemPreferences.isTrustedAccessibilityClient(true) to prompt the user
3. WHEN accessibility permissions are checked on Windows/Linux, THE Main Process SHALL return granted status without checking (not required on these platforms)
4. WHEN permission instructions are requested, THE Main Process SHALL return platform-specific instructions for granting accessibility permissions
5. WHEN permission status is queried, THE Main Process SHALL return an object with granted status, error message, and whether restart is needed

---

### Requirement 11: Platform Adapter Layer

**User Story:** As a developer, I want a compatibility layer for the React frontend, so that existing Tauri API calls can work with Electron without rewriting all frontend code.

#### Acceptance Criteria

1. WHEN the platform adapter is imported, THE Adapter SHALL detect whether the application is running in Electron or Tauri environment
2. WHEN invoke() is called with a Tauri command name, THE Adapter SHALL map the command to the corresponding Electron IPC handler
3. WHEN listen() is called with a Tauri event name, THE Adapter SHALL map the event to the corresponding Electron event listener
4. WHEN an unknown command or event is provided, THE Adapter SHALL throw an error with a descriptive message
5. WHEN the adapter is used in Tauri environment, THE Adapter SHALL fall back to using Tauri APIs directly

---

### Requirement 12: Application Lifecycle Management

**User Story:** As a user, I want the application to handle startup, shutdown, and single-instance behavior correctly, so that the application behaves predictably.

#### Acceptance Criteria

1. WHEN the application launches, THE Main Process SHALL request a single instance lock to prevent multiple instances
2. WHEN a second instance is attempted, THE Main Process SHALL focus the existing instance and pass any deep link URLs to it
3. WHEN all windows are closed on Windows/Linux, THE Main Process SHALL quit the application
4. WHEN all windows are closed on macOS, THE Main Process SHALL keep the application running in the tray
5. WHEN the application quits, THE Main Process SHALL clean up all resources including hotkeys, tray icon, and event listeners

---

### Requirement 13: Build and Distribution Configuration

**User Story:** As a developer, I want proper build configuration, so that I can create distributable packages for macOS, Windows, and Linux.

#### Acceptance Criteria

1. WHEN electron-builder is configured, THE Build Configuration SHALL define app ID as com.suhailmalik.clipify
2. WHEN building for macOS, THE Build Configuration SHALL create DMG and ZIP packages with proper code signing entitlements
3. WHEN building for Windows, THE Build Configuration SHALL create NSIS installer and portable executable
4. WHEN building for Linux, THE Build Configuration SHALL create AppImage and DEB packages
5. WHEN protocol registration is configured, THE Build Configuration SHALL register the clipify:// protocol for all platforms

---

### Requirement 14: Development Environment

**User Story:** As a developer, I want hot-reload and debugging capabilities, so that I can develop efficiently.

#### Acceptance Criteria

1. WHEN npm run dev is executed, THE Development Server SHALL start the Vite dev server on port 5173 for the renderer process
2. WHEN the dev server starts, THE Main Process SHALL load the renderer from http://localhost:5173
3. WHEN source files change, THE Development Server SHALL hot-reload the renderer process without restarting the main process
4. WHEN the main process code changes, THE Development Server SHALL restart the Electron application
5. WHEN errors occur, THE Development Server SHALL display error messages in both terminal and renderer console

---

### Requirement 15: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can debug issues effectively.

#### Acceptance Criteria

1. WHEN IPC handlers execute, THE Main Process SHALL wrap all handlers in try-catch blocks and return errors to the renderer
2. WHEN errors occur in the main process, THE Main Process SHALL log errors to console with timestamp, context, and stack trace
3. WHEN errors occur in the renderer process, THE Renderer Process SHALL log errors to console and optionally send to main process
4. WHEN critical errors occur, THE Main Process SHALL display error dialogs to the user with actionable information
5. WHEN the application is in development mode, THE Main Process SHALL enable verbose logging for debugging

---

## Notes

- Clipboard history and monitoring features are explicitly excluded from this migration phase
- The frontend React code will be migrated from the existing Tauri application with minimal changes
- All backend API endpoints are already deployed and functional at https://clipify0.el.r.appspot.com
- The implementation will use the latest stable versions of all dependencies
- Each feature will be implemented incrementally with corresponding test files for validation
