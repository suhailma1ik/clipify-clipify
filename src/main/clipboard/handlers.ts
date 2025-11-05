import { ipcMain } from 'electron'
import { readClipboard, writeClipboard, triggerClipboardCopy } from './operations'

/**
 * Register all clipboard-related IPC handlers
 */
export function registerClipboardHandlers(): void {
  // Handler for reading clipboard content
  ipcMain.handle('read-clipboard', async () => {
    try {
      return readClipboard()
    } catch (error) {
      console.error('Error reading clipboard:', error)
      throw new Error(`Failed to read clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // Handler for writing to clipboard
  ipcMain.handle('write-clipboard', async (_event, text: string) => {
    try {
      writeClipboard(text)
      return { success: true }
    } catch (error) {
      console.error('Error writing to clipboard:', error)
      throw new Error(`Failed to write to clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // Handler for triggering clipboard copy via keyboard simulation
  ipcMain.handle('trigger-clipboard-copy', async () => {
    try {
      const copiedText = await triggerClipboardCopy()
      return copiedText
    } catch (error) {
      console.error('Error triggering clipboard copy:', error)
      throw new Error(`Failed to trigger clipboard copy: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // Handler for getting clipboard history
  ipcMain.handle('get_clipboard_history', async () => {
    try {
      // Return empty array for now - clipboard history can be implemented later
      return []
    } catch (error) {
      console.error('Error getting clipboard history:', error)
      return []
    }
  })

  // Handler for adding to clipboard history
  ipcMain.handle('add_to_clipboard_history', async (_event, params: {
    content: string;
    is_cleaned: boolean;
    original_content?: string | null;
    prompt_action?: string | null;
  }) => {
    try {
      // For now, just log the action - full clipboard history can be implemented later
      console.log('Add to clipboard history:', {
        contentLength: params.content.length,
        isCleaned: params.is_cleaned,
        promptAction: params.prompt_action
      })
      return { success: true }
    } catch (error) {
      console.error('Error adding to clipboard history:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  console.log('Clipboard IPC handlers registered')
}
