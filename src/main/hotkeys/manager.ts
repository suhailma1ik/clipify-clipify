/**
 * Hotkey Manager
 * 
 * Manages global keyboard shortcuts using Electron's globalShortcut API.
 * Handles registration, unregistration, and hotkey press events.
 */

import { BrowserWindow, globalShortcut } from 'electron'
import { parseHotkeyCombo } from './parser'
import { triggerClipboardCopy } from '../clipboard/operations'

/**
 * Hotkey configuration interface
 */
export interface HotkeyConfig {
  code: string      // Action code (e.g., 'REPHRASE', 'SUMMARIZE')
  combo: string     // Key combination (e.g., 'PRIMARY+SHIFT+KeyC')
}

/**
 * Hotkey registration status
 */
export interface HotkeyStatus {
  code: string          // Action code
  registered: boolean   // Whether registration was successful
  error?: string        // Error message if registration failed
}

/**
 * Auto-process request data emitted when hotkey is pressed
 */
export interface AutoProcessRequest {
  code: string    // Action code
  text: string    // Copied text from clipboard
}

/**
 * HotkeyManager class
 * 
 * Manages global hotkeys for the application.
 * Stores registered hotkeys and handles hotkey press events.
 */
export class HotkeyManager {
  private mainWindow: BrowserWindow
  private registeredHotkeys: Map<string, string> // Map<code, combo>

  /**
   * Create a new HotkeyManager instance
   * @param mainWindow - The main application window
   */
  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.registeredHotkeys = new Map()
  }

  /**
   * Register a global hotkey
   * 
   * @param code - Action code (e.g., 'REPHRASE')
   * @param combo - Normalized key combination (e.g., 'PRIMARY+SHIFT+KeyC')
   * @returns Promise that resolves to true if registration succeeded
   */
  async register(code: string, combo: string): Promise<boolean> {
    try {
      // Parse the combo to Electron format
      const electronCombo = parseHotkeyCombo(combo)
      
      // Check if this combo is already registered
      if (globalShortcut.isRegistered(electronCombo)) {
        console.warn(`Hotkey combo ${electronCombo} is already registered`)
        return false
      }
      
      // Register the hotkey
      const success = globalShortcut.register(electronCombo, async () => {
        await this.handleHotkeyPress(code)
      })
      
      if (success) {
        // Store the registered hotkey
        this.registeredHotkeys.set(code, combo)
        console.log(`Registered hotkey: ${code} -> ${electronCombo}`)
        return true
      } else {
        console.error(`Failed to register hotkey: ${code} -> ${electronCombo}`)
        return false
      }
    } catch (error) {
      console.error(`Error registering hotkey ${code}:`, error)
      return false
    }
  }

  /**
   * Register or update a global hotkey
   * If a hotkey with this code already exists, unregister it first
   * 
   * @param code - Action code (e.g., 'REPHRASE')
   * @param combo - Normalized key combination (e.g., 'PRIMARY+SHIFT+KeyC')
   * @returns Promise that resolves to true if registration succeeded
   */
  async registerOrUpdate(code: string, combo: string): Promise<boolean> {
    try {
      console.log(`[registerOrUpdate] Code: ${code}, New combo: ${combo}`)
      
      // Check if this code already has a registered hotkey
      const existingCombo = this.registeredHotkeys.get(code)
      
      if (existingCombo) {
        console.log(`[registerOrUpdate] Found existing combo for ${code}: ${existingCombo}`)
        // Unregister the old combo first
        const oldElectronCombo = parseHotkeyCombo(existingCombo)
        globalShortcut.unregister(oldElectronCombo)
        console.log(`[registerOrUpdate] Unregistered old combo: ${oldElectronCombo}`)
      }
      
      // Parse the new combo to Electron format
      const newElectronCombo = parseHotkeyCombo(combo)
      console.log(`[registerOrUpdate] Registering new combo: ${newElectronCombo}`)
      
      // Check if the new combo is already registered by another code
      if (globalShortcut.isRegistered(newElectronCombo)) {
        console.warn(`[registerOrUpdate] Combo ${newElectronCombo} is already registered by another action`)
        // Try to re-register the old one if it existed
        if (existingCombo) {
          const oldElectronCombo = parseHotkeyCombo(existingCombo)
          globalShortcut.register(oldElectronCombo, async () => {
            await this.handleHotkeyPress(code)
          })
        }
        return false
      }
      
      // Register the new hotkey
      const success = globalShortcut.register(newElectronCombo, async () => {
        await this.handleHotkeyPress(code)
      })
      
      if (success) {
        // Update the stored hotkey
        this.registeredHotkeys.set(code, combo)
        console.log(`[registerOrUpdate] Successfully registered: ${code} -> ${newElectronCombo}`)
        return true
      } else {
        console.error(`[registerOrUpdate] Failed to register: ${code} -> ${newElectronCombo}`)
        // Try to re-register the old one if it existed
        if (existingCombo) {
          const oldElectronCombo = parseHotkeyCombo(existingCombo)
          globalShortcut.register(oldElectronCombo, async () => {
            await this.handleHotkeyPress(code)
          })
          console.log(`[registerOrUpdate] Rolled back to old combo: ${oldElectronCombo}`)
        }
        return false
      }
    } catch (error) {
      console.error(`[registerOrUpdate] Error for ${code}:`, error)
      return false
    }
  }

  /**
   * Unregister a global hotkey
   * 
   * @param code - Action code to unregister
   * @returns Promise that resolves to true if unregistration succeeded
   */
  async unregister(code: string): Promise<boolean> {
    try {
      const combo = this.registeredHotkeys.get(code)
      
      if (!combo) {
        console.warn(`Hotkey ${code} is not registered`)
        return false
      }
      
      // Parse the combo to Electron format
      const electronCombo = parseHotkeyCombo(combo)
      
      // Unregister the hotkey
      globalShortcut.unregister(electronCombo)
      
      // Remove from our map
      this.registeredHotkeys.delete(code)
      
      console.log(`Unregistered hotkey: ${code} -> ${electronCombo}`)
      return true
    } catch (error) {
      console.error(`Error unregistering hotkey ${code}:`, error)
      return false
    }
  }

  /**
   * Reload all hotkeys
   * Unregisters all current hotkeys and registers new ones
   * 
   * @param configs - Array of hotkey configurations to register
   * @returns Promise that resolves to array of registration statuses
   */
  async reloadHotkeys(configs: HotkeyConfig[]): Promise<HotkeyStatus[]> {
    // Unregister all current hotkeys
    globalShortcut.unregisterAll()
    this.registeredHotkeys.clear()
    
    // Register new hotkeys
    const statuses: HotkeyStatus[] = []
    
    for (const config of configs) {
      try {
        const registered = await this.register(config.code, config.combo)
        statuses.push({
          code: config.code,
          registered
        })
      } catch (error) {
        statuses.push({
          code: config.code,
          registered: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return statuses
  }

  /**
   * Check if a specific combo is registered
   * 
   * @param combo - Normalized key combination to check
   * @returns True if the combo is registered
   */
  isRegistered(combo: string): boolean {
    const electronCombo = parseHotkeyCombo(combo)
    return globalShortcut.isRegistered(electronCombo)
  }

  /**
   * Get all registered hotkeys
   * 
   * @returns Array of registered hotkey configurations
   */
  getRegisteredHotkeys(): HotkeyConfig[] {
    const hotkeys: HotkeyConfig[] = []
    this.registeredHotkeys.forEach((combo, code) => {
      hotkeys.push({ code, combo })
    })
    return hotkeys
  }

  /**
   * Clean up all registered hotkeys
   * Should be called before app quits
   */
  cleanup(): void {
    globalShortcut.unregisterAll()
    this.registeredHotkeys.clear()
    console.log('Cleaned up all hotkeys')
  }

  /**
   * Handle hotkey press event
   * Simulates Cmd+C/Ctrl+C, reads clipboard, and emits event to renderer
   * 
   * @param code - Action code that was triggered
   */
  private async handleHotkeyPress(code: string): Promise<void> {
    try {
      console.log(`Hotkey pressed: ${code}`)
      
      // Simulate Cmd+C/Ctrl+C to copy selected text
      // Wait 100ms for clipboard update and get the text
      const text = await triggerClipboardCopy()
      
      // Emit auto-process-request event to renderer with code and text
      this.mainWindow.webContents.send('auto-process-request', {
        code,
        text
      })
      
      console.log(`Auto-process request sent: ${code}, text length: ${text.length}`)
    } catch (error) {
      console.error(`Error handling hotkey press for ${code}:`, error)
    }
  }
}
