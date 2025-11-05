import { Notification, shell } from 'electron'
import { BrowserWindow } from 'electron'

/**
 * Check if notification permissions are granted
 * @returns Promise<boolean> - true if granted, false otherwise
 */
export async function checkNotificationPermission(): Promise<boolean> {
    // On macOS, we can check if notifications are supported
    // Electron's Notification.isSupported() checks if the system supports notifications
    if (!Notification.isSupported()) {
        return false
    }

    // For macOS, we need to check the actual permission status
    // This is a workaround since Electron doesn't provide direct permission status
    try {
        // Try to create a silent test notification
        // If it fails or is blocked, permissions are likely denied
        const testNotification = new Notification({
            title: '',
            body: '',
            silent: true,
        })

        // If we can create it, permissions are likely granted
        testNotification.close()
        return true
    } catch (error) {
        console.error('Notification permission check failed:', error)
        return false
    }
}

/**
 * Open macOS System Settings to Notifications page
 * This will guide users to enable notifications for the app
 */
export function openNotificationSettings(): void {
    const platform = process.platform

    if (platform === 'darwin') {
        // macOS: Open System Settings > Notifications
        // The URL scheme for macOS System Settings
        shell.openExternal('x-apple.systempreferences:com.apple.preference.notifications')
    } else if (platform === 'win32') {
        // Windows: Open notification settings
        shell.openExternal('ms-settings:notifications')
    } else {
        // Linux: This varies by desktop environment
        console.log('Please enable notifications in your system settings')
    }
}

/**
 * Show a dialog to inform users about notification permissions
 * @param mainWindow - The main browser window
 */
export function showNotificationPermissionDialog(mainWindow: BrowserWindow | null): void {
    if (!mainWindow) {
        return
    }

    // Send message to renderer to show the permission dialog
    mainWindow.webContents.send('notification-permission-required')
}

/**
 * Request notification permission and guide user if needed
 * @param mainWindow - The main browser window
 * @returns Promise<boolean> - true if permission granted
 */
export async function requestNotificationPermission(mainWindow: BrowserWindow | null): Promise<boolean> {
    const hasPermission = await checkNotificationPermission()

    if (!hasPermission && process.platform === 'darwin') {
        // Show dialog to user
        showNotificationPermissionDialog(mainWindow)
        return false
    }

    return hasPermission
}
