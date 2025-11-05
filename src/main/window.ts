import { BrowserWindow } from 'electron'
import { join } from 'path'
import { getIsQuitting } from './index'

let mainWindow: BrowserWindow | null = null

/**
 * Create the main application window with proper configuration
 * @returns The created BrowserWindow instance
 */
export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 1200,
    show: false, // Don't show until ready-to-show event
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Load from dev server in development, file in production
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:1420')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Hide window on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!getIsQuitting()) {
      event.preventDefault()
      hideMainWindow()
    }
  })

  return mainWindow
}

/**
 * Show and focus the main window
 */
export function showMainWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  }
}

/**
 * Hide the main window
 */
export function hideMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
  }
}

/**
 * Toggle window visibility (show if hidden, hide if visible)
 */
export function toggleWindowVisibility(): void {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      hideMainWindow()
    } else {
      showMainWindow()
    }
  }
}

/**
 * Get the main window instance
 * @returns The main window or null if not created
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
