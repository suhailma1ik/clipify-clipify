import { ipcMain } from 'electron'
import { verifyProtocolRegistration } from './deeplink'

/**
 * Authentication IPC Handlers
 * 
 * Registers IPC handlers for authentication-related operations:
 * - Protocol registration verification
 * - Deep link protocol checks
 */

/**
 * Register all authentication-related IPC handlers
 */
export function registerAuthHandlers(): void {
  // Handler: verify-deep-link-protocols
  // Verifies that the clipify:// protocol is registered
  ipcMain.handle('verify-deep-link-protocols', async () => {
    try {
      const result = verifyProtocolRegistration()
      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Error verifying deep link protocols:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // Handler: check-protocol-registration
  // Checks if a specific protocol scheme is registered
  ipcMain.handle('check-protocol-registration', async (_event, scheme: string) => {
    try {
      if (scheme !== 'clipify') {
        return {
          success: false,
          error: 'Only clipify:// protocol is supported'
        }
      }

      const result = verifyProtocolRegistration()
      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Error checking protocol registration:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // Handler: get_pending_deep_link_events
  // Returns any pending deep link events that haven't been processed
  ipcMain.handle('get_pending_deep_link_events', async () => {
    try {
      // Return empty array for now - deep link event queue can be implemented later
      return []
    } catch (error) {
      console.error('Error getting pending deep link events:', error)
      return []
    }
  })

  console.log('Auth IPC handlers registered')
}
