import { ipcMain } from 'electron'
import { showMainWindow, hideMainWindow, toggleWindowVisibility } from './window'

/**
 * Register IPC handlers for window management
 */
export function registerWindowHandlers(): void {
  // Handler for showing the main window
  ipcMain.handle('show-main-window', async () => {
    try {
      showMainWindow()
      return { success: true }
    } catch (error) {
      console.error('Error showing main window:', error)
      return { success: false, error: String(error) }
    }
  })

  // Handler for hiding the main window
  ipcMain.handle('hide-main-window', async () => {
    try {
      hideMainWindow()
      return { success: true }
    } catch (error) {
      console.error('Error hiding main window:', error)
      return { success: false, error: String(error) }
    }
  })

  // Handler for toggling window visibility
  ipcMain.handle('toggle-window-visibility', async () => {
    try {
      toggleWindowVisibility()
      return { success: true }
    } catch (error) {
      console.error('Error toggling window visibility:', error)
      return { success: false, error: String(error) }
    }
  })
}
