import { app, BrowserWindow } from 'electron'
import { createMainWindow, showMainWindow, getMainWindow } from './window'
import { registerWindowHandlers } from './windowHandlers'
import { setupDeepLinkProtocol } from './auth/deeplink'
import { registerAuthHandlers } from './auth/handlers'
import { registerStorageHandlers } from './store/handlers'
import { registerElectronStoreHandlers } from './store/electronStoreHandlers'
import { registerClipboardHandlers } from './clipboard/handlers'
import { createTray, destroyTray } from './tray'
import { HotkeyManager } from './hotkeys/manager'
import { registerHotkeyHandlers } from './hotkeys/handlers'
import { registerSystemHandlers } from './system/handlers'
import { registerUtilityHandlers } from './utils/handlers'
import { requestNotificationPermission } from './system/notificationPermission'

// Flag to track if app is quitting
let isQuitting = false

// Hotkey manager instance
let hotkeyManager: HotkeyManager | null = null

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // If we didn't get the lock, quit immediately
  app.quit()
} else {
  // Handle second instance attempts
  // Note: Deep link handling for second-instance is done in setupDeepLinkProtocol
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Focus existing window if second instance is attempted
    const mainWindow = getMainWindow()
    if (mainWindow) {
      showMainWindow()
    }
    // Deep link URLs in commandLine are handled by the listener in setupDeepLinkProtocol
  })

  // Create window when app is ready
  app.whenReady().then(() => {
    const mainWindow = createMainWindow()
    
    // Register window IPC handlers
    registerWindowHandlers()
    
    // Setup deep link protocol (Task 4)
    setupDeepLinkProtocol(mainWindow)
    
    // Register auth IPC handlers (Task 4)
    registerAuthHandlers()
    
    // Register storage IPC handlers (Task 5)
    registerStorageHandlers()
    
    // Register electron-store IPC handlers
    registerElectronStoreHandlers()
    
    // Create system tray (Task 6)
    createTray()
    
    // Register clipboard IPC handlers (Task 7)
    registerClipboardHandlers()
    
    // Initialize hotkey manager (Task 8)
    hotkeyManager = new HotkeyManager(mainWindow)
    
    // Register default hotkeys (Task 8)
    hotkeyManager.register('REPHRASE', 'PRIMARY+SHIFT+KeyC')
    hotkeyManager.register('SUMMARIZE', 'PRIMARY+SHIFT+KeyS')
    hotkeyManager.register('LEGALIFY', 'PRIMARY+SHIFT+KeyL')
    
    // Register hotkey IPC handlers (Task 8)
    registerHotkeyHandlers(hotkeyManager)
    
    // Register system IPC handlers (Task 9)
    registerSystemHandlers()
    
    // Register utility IPC handlers
    registerUtilityHandlers()
    
    // Check notification permissions on startup (macOS)
    if (process.platform === 'darwin') {
      setTimeout(() => {
        requestNotificationPermission(mainWindow)
      }, 2000) // Wait 2 seconds after app starts
    }
  })
}

// Handle window-all-closed event (platform-specific behavior)
app.on('window-all-closed', () => {
  // On macOS, keep the app running in the tray even when all windows are closed
  // On Windows/Linux, quit the application
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle activate event (macOS)
app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked and no windows are open
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

// Handle before-quit event for cleanup
app.on('before-quit', () => {
  // Set flag to allow window to close
  isQuitting = true
  
  // Destroy system tray (Task 6)
  destroyTray()
  
  // Unregister global hotkeys (Task 8)
  if (hotkeyManager) {
    hotkeyManager.cleanup()
  }
  
  // TODO: Additional cleanup will be added in subsequent tasks:
  // - Clean up event listeners
})

// Export isQuitting flag for use in other modules
export function getIsQuitting(): boolean {
  return isQuitting
}
