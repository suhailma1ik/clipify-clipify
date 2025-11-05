import { app, BrowserWindow } from 'electron'
import { showMainWindow } from '../window'

/**
 * Deep Link Protocol Handler
 * 
 * Handles clipify:// protocol URLs for OAuth authentication callbacks.
 * Supports platform-specific deep link handling:
 * - macOS: Uses 'open-url' event
 * - Windows/Linux: Uses 'second-instance' event and startup args
 */

/**
 * Parse a deep link URL and extract parameters
 * @param url The deep link URL (e.g., clipify://auth/callback?token=xxx)
 * @returns Parsed URL object or null if invalid
 */
function parseDeepLinkUrl(url: string): URL | null {
  try {
    // Ensure the URL starts with clipify://
    if (!url.startsWith('clipify://')) {
      return null
    }
    return new URL(url)
  } catch (error) {
    console.error('Failed to parse deep link URL:', error)
    return null
  }
}

/**
 * Handle a deep link URL by emitting it to the renderer process
 * @param window The main browser window
 * @param url The deep link URL
 */
function handleDeepLink(window: BrowserWindow, url: string): void {
  const parsedUrl = parseDeepLinkUrl(url)
  
  if (!parsedUrl) {
    console.error('Invalid deep link URL:', url)
    return
  }

  console.log('Deep link received:', url)
  
  // Show and focus the window when a deep link is received
  showMainWindow()
  
  // Emit the deep link to the renderer process
  window.webContents.send('deep-link-received', url)
}

/**
 * Setup deep link protocol handling for the application
 * 
 * This function:
 * 1. Registers the clipify:// protocol as the default handler
 * 2. Sets up platform-specific event listeners for deep links
 * 3. Checks startup arguments for deep links (Windows/Linux)
 * 
 * @param window The main browser window to send events to
 */
export function setupDeepLinkProtocol(window: BrowserWindow): void {
  // Register clipify:// as the default protocol client
  if (process.defaultApp) {
    // In development, we need to pass the executable path and args
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('clipify', process.execPath, [
        process.argv[1]
      ])
    }
  } else {
    // In production, just register the protocol
    app.setAsDefaultProtocolClient('clipify')
  }

  // macOS: Handle deep links via 'open-url' event
  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(window, url)
  })

  // Windows/Linux: Handle deep links via 'second-instance' event
  // This is already set up in index.ts, but we need to check for deep links
  // in the command line arguments
  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    // Check command line arguments for deep link URLs
    const deepLinkUrl = commandLine.find((arg) => arg.startsWith('clipify://'))
    
    if (deepLinkUrl) {
      handleDeepLink(window, deepLinkUrl)
    }
  })

  // Check startup arguments for deep links (Windows/Linux)
  // This handles the case where the app is launched via a deep link
  if (process.platform === 'win32' || process.platform === 'linux') {
    const deepLinkUrl = process.argv.find((arg) => arg.startsWith('clipify://'))
    
    if (deepLinkUrl) {
      // Wait for window to be ready before handling the deep link
      window.webContents.once('did-finish-load', () => {
        handleDeepLink(window, deepLinkUrl)
      })
    }
  }

  console.log('Deep link protocol setup complete')
}

/**
 * Verify that the protocol is registered correctly
 * @returns Object with registration status
 */
export function verifyProtocolRegistration(): {
  scheme: string
  isRegistered: boolean
} {
  const isRegistered = app.isDefaultProtocolClient('clipify')
  
  return {
    scheme: 'clipify',
    isRegistered
  }
}
