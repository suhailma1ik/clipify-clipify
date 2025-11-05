import { ipcMain, app } from 'electron';
import {
  checkAccessibilityPermissions,
  requestAccessibilityPermissions,
  getMacOSVersion,
  getAccessibilityInstructions,
  PermissionStatus
} from './permissions';
import { simulateCmdC, simulateCmdV } from './keyboard';
import { openNotificationSettings, checkNotificationPermission } from './notificationPermission';

/**
 * Register all system-related IPC handlers
 */
export function registerSystemHandlers(): void {
  // Check accessibility permissions
  ipcMain.handle('check-accessibility-permissions', async (): Promise<PermissionStatus> => {
    try {
      return checkAccessibilityPermissions();
    } catch (error) {
      console.error('Error checking accessibility permissions:', error);
      return {
        granted: false,
        message: `Error checking permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  });

  // Request accessibility permissions (will prompt user on macOS)
  ipcMain.handle('request-input-monitoring-permission', async (): Promise<PermissionStatus> => {
    try {
      return requestAccessibilityPermissions();
    } catch (error) {
      console.error('Error requesting accessibility permissions:', error);
      return {
        granted: false,
        message: `Error requesting permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  });

  // Get macOS version
  ipcMain.handle('get-macos-version', async (): Promise<string | null> => {
    try {
      return getMacOSVersion();
    } catch (error) {
      console.error('Error getting macOS version:', error);
      return null;
    }
  });

  // Get accessibility instructions
  ipcMain.handle('get-accessibility-instructions', async (): Promise<string> => {
    try {
      return getAccessibilityInstructions();
    } catch (error) {
      console.error('Error getting accessibility instructions:', error);
      return 'Unable to retrieve instructions. Please check system documentation.';
    }
  });

  // Simulate Cmd+C
  ipcMain.handle('simulate-cmd-c', async (): Promise<void> => {
    try {
      await simulateCmdC();
    } catch (error) {
      console.error('Error simulating Cmd+C:', error);
      throw error;
    }
  });

  // Simulate Cmd+V
  ipcMain.handle('simulate-cmd-v', async (): Promise<void> => {
    try {
      await simulateCmdV();
    } catch (error) {
      console.error('Error simulating Cmd+V:', error);
      throw error;
    }
  });

  // Quit application
  ipcMain.handle('quit-application', async (): Promise<void> => {
    try {
      app.quit();
    } catch (error) {
      console.error('Error quitting application:', error);
      throw error;
    }
  });

  // Check accessibility permissions and shortcut status (combined check)
  ipcMain.handle('check-accessibility-permissions-and-shortcut-status', async (): Promise<{
    permissions: PermissionStatus;
    platform: string;
    version: string | null;
  }> => {
    try {
      const permissions = checkAccessibilityPermissions();
      const version = getMacOSVersion();
      
      return {
        permissions,
        platform: process.platform,
        version
      };
    } catch (error) {
      console.error('Error checking permissions and shortcut status:', error);
      return {
        permissions: {
          granted: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        platform: process.platform,
        version: null
      };
    }
  });

  // Check notification permissions
  ipcMain.handle('check-notification-permission', async (): Promise<boolean> => {
    try {
      return await checkNotificationPermission();
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  });

  // Open notification settings
  ipcMain.on('open-notification-settings', () => {
    try {
      openNotificationSettings();
    } catch (error) {
      console.error('Error opening notification settings:', error);
    }
  });

  console.log('System IPC handlers registered');
}
