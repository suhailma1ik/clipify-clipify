/**
 * Electron API exposed to the renderer process via context bridge.
 * This interface provides type-safe access to main process functionality.
 */
export interface ElectronAPI {
  /**
   * The current platform (darwin, win32, linux)
   */
  platform: NodeJS.Platform

  /**
   * Version information for Node.js, Chrome, and Electron
   */
  versions: {
    node: string
    chrome: string
    electron: string
  }

  // ============================================
  // Window Management
  // ============================================

  /**
   * Shows and focuses the main application window.
   * @returns Promise that resolves with success status
   */
  showMainWindow: () => Promise<{ success: boolean; error?: string }>

  /**
   * Hides the main application window without quitting the app.
   * @returns Promise that resolves with success status
   */
  hideMainWindow: () => Promise<{ success: boolean; error?: string }>

  /**
   * Toggles the main window visibility (show if hidden, hide if visible).
   * @returns Promise that resolves with success status
   */
  toggleWindowVisibility: () => Promise<{ success: boolean; error?: string }>

  // ============================================
  // Authentication & Deep Link
  // ============================================

  /**
   * Verifies that the deep link protocols (clipify://) are registered.
   * @returns Promise that resolves with registration status
   */
  verifyDeepLinkProtocols: () => Promise<{
    success: boolean
    data?: { scheme: string; isRegistered: boolean }
    error?: string
  }>

  /**
   * Checks if a specific protocol scheme is registered.
   * @param scheme The protocol scheme to check (e.g., 'clipify')
   * @returns Promise that resolves with registration status
   */
  checkProtocolRegistration: (scheme: string) => Promise<{
    success: boolean
    data?: { scheme: string; isRegistered: boolean }
    error?: string
  }>

  /**
   * Listen for deep link events (clipify:// URLs).
   * @param callback Function to call when a deep link is received
   * @returns Cleanup function to remove the listener
   */
  onDeepLinkReceived: (callback: (url: string) => void) => () => void

  // ============================================
  // Token Storage (Task 5)
  // ============================================

  /**
   * Store access token securely using platform-specific encryption.
   * @param token The access token to store
   * @returns Promise that resolves with success status
   */
  storeAccessToken: (token: string) => Promise<{ success: boolean; error?: string }>

  /**
   * Get stored access token.
   * @returns Promise that resolves with the token or null if not found
   */
  getAccessToken: () => Promise<{ success: boolean; token: string | null; error?: string }>

  /**
   * Store refresh token securely using platform-specific encryption.
   * @param token The refresh token to store
   * @returns Promise that resolves with success status
   */
  storeRefreshToken: (token: string) => Promise<{ success: boolean; error?: string }>

  /**
   * Get stored refresh token.
   * @returns Promise that resolves with the token or null if not found
   */
  getRefreshToken: () => Promise<{ success: boolean; token: string | null; error?: string }>

  /**
   * Store token metadata (expiry, type, scope, etc.).
   * @param metadata Token metadata object
   * @returns Promise that resolves with success status
   */
  storeTokenMetadata: (metadata: {
    expiresAt?: number
    tokenType: string
    scope?: string
    issuedAt: number
  }) => Promise<{ success: boolean; error?: string }>

  /**
   * Get stored token metadata.
   * @returns Promise that resolves with metadata or null if not found
   */
  getTokenMetadata: () => Promise<{
    success: boolean
    metadata: {
      expiresAt?: number
      tokenType: string
      scope?: string
      issuedAt: number
    } | null
    error?: string
  }>

  /**
   * Store user information.
   * @param user User information object
   * @returns Promise that resolves with success status
   */
  storeUserInfo: (user: {
    id: string
    email: string
    name?: string
    avatar?: string
    plan?: string
  }) => Promise<{ success: boolean; error?: string }>

  /**
   * Get stored user information.
   * @returns Promise that resolves with user info or null if not found
   */
  getUserInfo: () => Promise<{
    success: boolean
    user: {
      id: string
      email: string
      name?: string
      avatar?: string
      plan?: string
    } | null
    error?: string
  }>

  /**
   * Clear all stored tokens and user data (logout).
   * @returns Promise that resolves with success status
   */
  clearAllTokens: () => Promise<{ success: boolean; error?: string }>

  /**
   * Check if a valid, non-expired access token exists.
   * @returns Promise that resolves with validity status
   */
  hasValidAccessToken: () => Promise<{ success: boolean; isValid: boolean; error?: string }>

  // ============================================
  // Clipboard Operations (Task 7)
  // ============================================

  /**
   * Read text content from the system clipboard.
   * @returns Promise that resolves with the clipboard text
   */
  readClipboard: () => Promise<string>

  /**
   * Write text content to the system clipboard.
   * @param text The text to write to clipboard
   * @returns Promise that resolves with success status
   */
  writeClipboard: (text: string) => Promise<{ success: boolean }>

  /**
   * Simulate Cmd+C (macOS) or Ctrl+C (Windows/Linux) to copy selected text.
   * Waits 100ms for clipboard to update and returns the copied text.
   * @returns Promise that resolves with the copied text from clipboard
   */
  triggerClipboardCopy: () => Promise<string>

  // ============================================
  // Hotkey Management (Task 8)
  // ============================================

  /**
   * Register a global hotkey.
   * @param code Action code (e.g., 'REPHRASE', 'SUMMARIZE')
   * @param combo Normalized key combination (e.g., 'PRIMARY+SHIFT+KeyC')
   * @returns Promise that resolves with success status
   */
  registerHotkey: (code: string, combo: string) => Promise<{
    success: boolean
    error?: string
  }>

  /**
   * Unregister a global hotkey.
   * @param code Action code to unregister
   * @returns Promise that resolves with success status
   */
  unregisterHotkey: (code: string) => Promise<{
    success: boolean
    error?: string
  }>

  /**
   * Reload all hotkeys.
   * Unregisters all current hotkeys and registers new ones.
   * @param configs Array of hotkey configurations
   * @returns Promise that resolves with array of registration statuses
   */
  reloadHotkeys: (configs: Array<{ code: string; combo: string }>) => Promise<{
    success: boolean
    statuses?: Array<{
      code: string
      registered: boolean
      error?: string
    }>
    error?: string
  }>

  /**
   * Check if a specific combo is registered.
   * @param combo Normalized key combination to check
   * @returns Promise that resolves with registration status
   */
  isShortcutRegistered: (combo: string) => Promise<{
    success: boolean
    isRegistered?: boolean
    error?: string
  }>

  /**
   * Listen for auto-process requests triggered by hotkeys.
   * When a registered hotkey is pressed, the selected text is copied and this event is emitted.
   * @param callback Function to call when a hotkey triggers auto-processing
   * @returns Cleanup function to remove the listener
   */
  onAutoProcessRequest: (callback: (data: { code: string; text: string }) => void) => () => void

  // ============================================
  // System Permissions & Keyboard Simulation (Task 9)
  // ============================================

  /**
   * Check if the application has accessibility permissions (macOS).
   * On Windows/Linux, always returns granted=true.
   * @returns Promise that resolves with permission status
   */
  checkAccessibilityPermissions: () => Promise<{
    granted: boolean
    message: string
    needsRestart?: boolean
  }>

  /**
   * Request accessibility permissions (macOS).
   * Will prompt the user to grant permissions if not already granted.
   * @returns Promise that resolves with permission status
   */
  requestInputMonitoringPermission: () => Promise<{
    granted: boolean
    message: string
    needsRestart?: boolean
  }>

  /**
   * Get macOS version string.
   * @returns Promise that resolves with macOS version or null on non-macOS platforms
   */
  getMacOSVersion: () => Promise<string | null>

  /**
   * Get platform-specific instructions for granting accessibility permissions.
   * @returns Promise that resolves with detailed instructions text
   */
  getAccessibilityInstructions: () => Promise<string>

  /**
   * Simulate Cmd+C (macOS) or Ctrl+C (Windows/Linux).
   * Used to copy selected text to clipboard.
   * @returns Promise that resolves when simulation is complete
   */
  simulateCmdC: () => Promise<void>

  /**
   * Simulate Cmd+V (macOS) or Ctrl+V (Windows/Linux).
   * Used to paste clipboard content.
   * @returns Promise that resolves when simulation is complete
   */
  simulateCmdV: () => Promise<void>

  /**
   * Quit the application completely.
   * @returns Promise that resolves when quit is initiated
   */
  quitApplication: () => Promise<void>

  /**
   * Check accessibility permissions and get system status.
   * Combined check for permissions, platform, and version.
   * @returns Promise that resolves with comprehensive system status
   */
  checkAccessibilityPermissionsAndShortcutStatus: () => Promise<{
    permissions: {
      granted: boolean
      message: string
      needsRestart?: boolean
    }
    platform: string
    version: string | null
  }>
}

/**
 * Global window interface extension.
 * Provides type-safe access to the Electron API in the renderer process.
 */
declare global {
  interface Window {
    /**
     * Electron API exposed via context bridge.
     * All methods are type-safe and communicate with the main process via IPC.
     */
    electron: ElectronAPI
  }
}
