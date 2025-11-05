/**
 * Hotkey IPC Handlers
 * 
 * Registers IPC handlers for hotkey-related commands from the renderer process.
 */

import { ipcMain } from 'electron'
import { HotkeyManager, HotkeyConfig } from './manager'

/**
 * Register all hotkey-related IPC handlers
 * 
 * @param hotkeyManager - The HotkeyManager instance to use
 */
export function registerHotkeyHandlers(hotkeyManager: HotkeyManager): void {
  /**
   * Register a new global hotkey
   * 
   * @param code - Action code (e.g., 'REPHRASE')
   * @param combo - Normalized key combination (e.g., 'PRIMARY+SHIFT+KeyC')
   * @returns Success status and error message if failed
   */
  ipcMain.handle('register-hotkey', async (_event, code: string, combo: string) => {
    try {
      const success = await hotkeyManager.register(code, combo)
      
      if (success) {
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Failed to register hotkey. It may already be in use by another application.'
        }
      }
    } catch (error) {
      console.error('Error in register-hotkey handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Unregister a global hotkey
   * 
   * @param code - Action code to unregister
   * @returns Success status and error message if failed
   */
  ipcMain.handle('unregister-hotkey', async (_event, code: string) => {
    try {
      const success = await hotkeyManager.unregister(code)
      
      if (success) {
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Hotkey is not registered'
        }
      }
    } catch (error) {
      console.error('Error in unregister-hotkey handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Reload all hotkeys
   * Unregisters all current hotkeys and registers new ones
   * 
   * @param configs - Array of hotkey configurations
   * @returns Array of registration statuses for each hotkey
   */
  ipcMain.handle('reload-hotkeys', async (_event, configs: HotkeyConfig[]) => {
    try {
      const statuses = await hotkeyManager.reloadHotkeys(configs)
      return {
        success: true,
        statuses
      }
    } catch (error) {
      console.error('Error in reload-hotkeys handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Check if a specific combo is registered
   * 
   * @param combo - Normalized key combination to check
   * @returns Whether the combo is registered
   */
  ipcMain.handle('is-shortcut-registered', async (_event, combo: string) => {
    try {
      const isRegistered = hotkeyManager.isRegistered(combo)
      return {
        success: true,
        isRegistered
      }
    } catch (error) {
      console.error('Error in is-shortcut-registered handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Check hotkey registration status
   * Returns information about registered hotkeys
   */
  ipcMain.handle('check_hotkey_registration_status', async () => {
    try {
      // Return basic status - can be expanded later
      return {
        is_registered: true,
        hotkeys: hotkeyManager.getRegisteredHotkeys()
      }
    } catch (error) {
      console.error('Error checking hotkey registration status:', error)
      return {
        is_registered: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // ============================================
  // Underscore variants for renderer compatibility
  // These handlers support the renderer's direct invoke calls
  // ============================================

  /**
   * Register hotkey (underscore variant)
   * Supports object parameter: { code, combo }
   */
  ipcMain.handle('register_hotkey', async (_event, params: { code: string; combo: string }) => {
    try {
      const { code, combo } = params
      console.log(`[register_hotkey] Registering: ${code} -> ${combo}`)
      
      // Register the new hotkey (the manager will handle any existing registration)
      const success = await hotkeyManager.registerOrUpdate(code, combo)
      console.log(`[register_hotkey] Result for ${code} -> ${combo}: ${success}`)
      
      if (success) {
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Failed to register hotkey. It may already be in use by another application.'
        }
      }
    } catch (error) {
      console.error('Error in register_hotkey handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Unregister hotkey (underscore variant)
   * Supports object parameter: { code }
   */
  ipcMain.handle('unregister_hotkey', async (_event, params: { code: string }) => {
    try {
      const { code } = params
      console.log(`[unregister_hotkey] Attempting to unregister: ${code}`)
      const success = await hotkeyManager.unregister(code)
      console.log(`[unregister_hotkey] Unregister result for ${code}: ${success}`)
      
      if (success) {
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Hotkey is not registered'
        }
      }
    } catch (error) {
      console.error('Error in unregister_hotkey handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Resume all hotkeys (Tauri compatibility)
   * In Electron, hotkeys are always active unless explicitly unregistered
   * This is a no-op for compatibility with Tauri code
   */
  ipcMain.handle('resume_all_hotkeys', async () => {
    try {
      // No-op for Electron - hotkeys are always active
      return { success: true }
    } catch (error) {
      console.error('Error in resume_all_hotkeys handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Suspend all hotkeys (Tauri compatibility)
   * In Electron, we don't need to suspend hotkeys during input capture
   * This is a no-op for compatibility with Tauri code
   */
  ipcMain.handle('suspend_all_hotkeys', async () => {
    try {
      // No-op for Electron - not needed
      return { success: true }
    } catch (error) {
      console.error('Error in suspend_all_hotkeys handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  console.log('Hotkey IPC handlers registered')
}
