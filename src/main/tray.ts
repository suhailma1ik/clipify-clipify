import { Tray, nativeImage, app, Menu } from 'electron'
import path from 'path'
import { toggleWindowVisibility, showMainWindow, getMainWindow } from './window'

let tray: Tray | null = null

/**
 * Create and configure the system tray icon
 * @returns The created Tray instance
 */
export function createTray(): Tray {
  // Get the icon path - use app icon for macOS as tray icon
  const iconName = 'icon.png'
  let iconPath = path.join(app.getAppPath(), 'resources', iconName)
  
  // Load the icon
  let icon = nativeImage.createFromPath(iconPath)
  // Fallback to process.resourcesPath for packaged apps if not found
  if (icon.isEmpty()) {
    const altPath = path.join(process.resourcesPath, iconName)
    icon = nativeImage.createFromPath(altPath)
  }
  
  // Resize to 16x16 for tray (standard tray icon size)
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 })
    
    // Mark as non-template image for macOS to match app icon appearance
    if (process.platform === 'darwin') {
      icon.setTemplateImage(false)
    }
  }
  
  // Create the tray
  tray = new Tray(icon)
  
  // Set tooltip text
  tray.setToolTip('Clipify')
  
  // Handle click event to toggle window visibility
  tray.on('click', () => {
    toggleWindowVisibility()
  })
  
  // Create and set the context menu
  updateTrayMenu()
  
  return tray
}

/**
 * Update the tray context menu
 */
export function updateTrayMenu(): void {
  if (!tray) {
    return
  }
  
  const mainWindow = getMainWindow()
  const isVisible = mainWindow?.isVisible() ?? false
  
  // Create menu template
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: isVisible ? 'Hide Clipify' : 'Show Clipify',
      click: () => {
        toggleWindowVisibility()
        // Update menu after toggling
        setTimeout(() => updateTrayMenu(), 100)
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Settings',
      click: () => {
        showMainWindow()
        // TODO: Navigate to settings page when implemented
      }
    },
    {
      label: 'About Clipify',
      click: () => {
        showMainWindow()
        // TODO: Show about dialog when implemented
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ]
  
  // Build menu from template
  const contextMenu = Menu.buildFromTemplate(menuTemplate)
  
  // Set context menu on tray
  tray.setContextMenu(contextMenu)
}

/**
 * Get the current tray instance
 * @returns The Tray instance or null if not created
 */
export function getTray(): Tray | null {
  return tray
}

/**
 * Destroy the tray icon
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
