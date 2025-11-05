import { contextBridge, ipcRenderer } from 'electron'

/**
 * Preload script that creates a secure bridge between the main and renderer processes.
 * 
 * Security Configuration:
 * - contextIsolation: enabled (configured in window.ts)
 * - nodeIntegration: disabled (configured in window.ts)
 * - sandbox: enabled (configured in window.ts)
 * 
 * This script exposes a limited, type-safe API to the renderer process via contextBridge,
 * preventing direct access to Node.js/Electron APIs while maintaining security.
 */

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // ============================================
  // Generic IPC Methods
  // ============================================

  /**
   * Generic invoke method for IPC communication
   * @param channel The IPC channel to invoke
   * @param args Arguments to pass to the handler
   * @returns Promise resolving to the handler's return value
   */
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  /**
   * Generic event listener
   * @param channel The IPC channel to listen to
   * @param callback Function to call when event is received
   * @returns Cleanup function to remove the listener
   */
  on: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  /**
   * Send a message to the main process
   * @param channel The IPC channel to send to
   * @param args Arguments to send
   */
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),

  // ============================================
  // Platform Information
  // ============================================
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // ============================================
  // Window Management
  // ============================================

  /**
   * Shows and focuses the main application window
   */
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),

  /**
   * Hides the main application window without quitting
   */
  hideMainWindow: () => ipcRenderer.invoke('hide-main-window'),

  /**
   * Toggles the main window visibility
   */
  toggleWindowVisibility: () => ipcRenderer.invoke('toggle-window-visibility'),

  // ============================================
  // Authentication & Deep Link
  // ============================================

  /**
   * Verifies that the deep link protocols are registered
   */
  verifyDeepLinkProtocols: () => ipcRenderer.invoke('verify-deep-link-protocols'),

  /**
   * Checks if a specific protocol scheme is registered
   * @param scheme The protocol scheme to check (e.g., 'clipify')
   */
  checkProtocolRegistration: (scheme: string) =>
    ipcRenderer.invoke('check-protocol-registration', scheme),

  /**
   * Listen for deep link events
   * @param callback Function to call when a deep link is received
   * @returns Cleanup function to remove the listener
   */
  onDeepLinkReceived: (callback: (url: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string) => callback(url)
    ipcRenderer.on('deep-link-received', listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('deep-link-received', listener)
    }
  },

  // ============================================
  // Token Storage (Task 5)
  // ============================================

  /**
   * Store access token securely
   * @param token The access token to store
   */
  storeAccessToken: (token: string) => ipcRenderer.invoke('store-access-token', token),

  /**
   * Get stored access token
   * @returns The access token or null if not found
   */
  getAccessToken: () => ipcRenderer.invoke('get-access-token'),

  /**
   * Store refresh token securely
   * @param token The refresh token to store
   */
  storeRefreshToken: (token: string) => ipcRenderer.invoke('store-refresh-token', token),

  /**
   * Get stored refresh token
   * @returns The refresh token or null if not found
   */
  getRefreshToken: () => ipcRenderer.invoke('get-refresh-token'),

  /**
   * Store token metadata
   * @param metadata Token metadata including expiry, type, scope
   */
  storeTokenMetadata: (metadata: {
    expiresAt?: number;
    tokenType: string;
    scope?: string;
    issuedAt: number;
  }) => ipcRenderer.invoke('store-token-metadata', metadata),

  /**
   * Get stored token metadata
   * @returns Token metadata or null if not found
   */
  getTokenMetadata: () => ipcRenderer.invoke('get-token-metadata'),

  /**
   * Store user information
   * @param user User information object
   */
  storeUserInfo: (user: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    plan?: string;
  }) => ipcRenderer.invoke('store-user-info', user),

  /**
   * Get stored user information
   * @returns User information or null if not found
   */
  getUserInfo: () => ipcRenderer.invoke('get-user-info'),

  /**
   * Clear all stored tokens and user data
   */
  clearAllTokens: () => ipcRenderer.invoke('clear-all-tokens'),

  /**
   * Check if a valid access token exists
   * @returns True if a valid, non-expired access token exists
   */
  hasValidAccessToken: () => ipcRenderer.invoke('has-valid-access-token'),

  // ============================================
  // Clipboard Operations (Task 7)
  // ============================================

  /**
   * Read text content from the system clipboard
   * @returns The current clipboard text content
   */
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),

  /**
   * Write text content to the system clipboard
   * @param text The text to write to clipboard
   */
  writeClipboard: (text: string) => ipcRenderer.invoke('write-clipboard', text),

  /**
   * Simulate Cmd+C (macOS) or Ctrl+C (Windows/Linux) to copy selected text
   * Waits 100ms for clipboard to update and returns the copied text
   * @returns The copied text from clipboard
   */
  triggerClipboardCopy: () => ipcRenderer.invoke('trigger-clipboard-copy'),

  // ============================================
  // Hotkey Management (Task 8)
  // ============================================

  /**
   * Register a global hotkey
   * @param code Action code (e.g., 'REPHRASE', 'SUMMARIZE')
   * @param combo Normalized key combination (e.g., 'PRIMARY+SHIFT+KeyC')
   * @returns Success status
   */
  registerHotkey: (code: string, combo: string) =>
    ipcRenderer.invoke('register-hotkey', code, combo),

  /**
   * Unregister a global hotkey
   * @param code Action code to unregister
   * @returns Success status
   */
  unregisterHotkey: (code: string) =>
    ipcRenderer.invoke('unregister-hotkey', code),

  /**
   * Reload all hotkeys
   * Unregisters all current hotkeys and registers new ones
   * @param configs Array of hotkey configurations
   * @returns Array of registration statuses
   */
  reloadHotkeys: (configs: Array<{ code: string; combo: string }>) =>
    ipcRenderer.invoke('reload-hotkeys', configs),

  /**
   * Check if a specific combo is registered
   * @param combo Normalized key combination to check
   * @returns Whether the combo is registered
   */
  isShortcutRegistered: (combo: string) =>
    ipcRenderer.invoke('is-shortcut-registered', combo),

  /**
   * Listen for auto-process requests triggered by hotkeys
   * @param callback Function to call when a hotkey triggers auto-processing
   * @returns Cleanup function to remove the listener
   */
  onAutoProcessRequest: (callback: (data: { code: string; text: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { code: string; text: string }) =>
      callback(data)
    ipcRenderer.on('auto-process-request', listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('auto-process-request', listener)
    }
  },

  // ============================================
  // System Permissions & Keyboard Simulation (Task 9)
  // ============================================

  /**
   * Check if the application has accessibility permissions (macOS)
   * On Windows/Linux, always returns granted=true
   * @returns Permission status with granted flag and message
   */
  checkAccessibilityPermissions: () =>
    ipcRenderer.invoke('check-accessibility-permissions'),

  /**
   * Request accessibility permissions (macOS)
   * Will prompt the user to grant permissions if not already granted
   * @returns Permission status with granted flag and message
   */
  requestInputMonitoringPermission: () =>
    ipcRenderer.invoke('request-input-monitoring-permission'),

  /**
   * Get macOS version string
   * @returns macOS version or null on non-macOS platforms
   */
  getMacOSVersion: () =>
    ipcRenderer.invoke('get-macos-version'),

  /**
   * Get platform-specific instructions for granting accessibility permissions
   * @returns Detailed instructions text
   */
  getAccessibilityInstructions: () =>
    ipcRenderer.invoke('get-accessibility-instructions'),

  /**
   * Simulate Cmd+C (macOS) or Ctrl+C (Windows/Linux)
   * Used to copy selected text to clipboard
   */
  simulateCmdC: () =>
    ipcRenderer.invoke('simulate-cmd-c'),

  /**
   * Simulate Cmd+V (macOS) or Ctrl+V (Windows/Linux)
   * Used to paste clipboard content
   */
  simulateCmdV: () =>
    ipcRenderer.invoke('simulate-cmd-v'),

  /**
   * Quit the application completely
   */
  quitApplication: () =>
    ipcRenderer.invoke('quit-application'),

  /**
   * Check accessibility permissions and get system status
   * Combined check for permissions, platform, and version
   * @returns Object with permissions status, platform, and version
   */
  checkAccessibilityPermissionsAndShortcutStatus: () =>
    ipcRenderer.invoke('check-accessibility-permissions-and-shortcut-status'),

  // ============================================
  // Notification Permissions
  // ============================================

  /**
   * Check if notification permissions are granted
   * @returns True if notification permissions are granted
   */
  checkNotificationPermission: () =>
    ipcRenderer.invoke('check-notification-permission'),

  /**
   * Open system settings to notification preferences
   * On macOS, opens System Settings > Notifications
   */
  openNotificationSettings: () =>
    ipcRenderer.send('open-notification-settings'),

  /**
   * Listen for notification permission required events
   * @param callback Function to call when permission is required
   * @returns Cleanup function to remove the listener
   */
  onNotificationPermissionRequired: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('notification-permission-required', listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('notification-permission-required', listener)
    }
  }
})
