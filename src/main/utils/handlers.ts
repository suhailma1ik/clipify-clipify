import { ipcMain, shell, Notification } from 'electron';

/**
 * Register utility IPC handlers
 */
export function registerUtilityHandlers(): void {
  // Open URL in external browser
  ipcMain.handle('open-url', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open URL:', error);
      throw error;
    }
  });

  // Show notification
  ipcMain.handle('show-notification', async (_event, options: { title: string; body: string }) => {
    try {
      const notification = new Notification({
        title: options.title,
        body: options.body
      });
      notification.show();
      return { success: true };
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw error;
    }
  });

  // Request notification permission (always granted in Electron)
  ipcMain.handle('request-notification-permission', async () => {
    return true;
  });

  // Check notification permission (always granted in Electron)
  ipcMain.handle('is-notification-permission-granted', async () => {
    return true;
  });

  console.log('Utility IPC handlers registered');
}
