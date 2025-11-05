/**
 * Platform Adapter for Electron
 * Provides a unified interface for platform-specific operations
 */

// Type definitions for Electron IPC
interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  send: (channel: string, ...args: any[]) => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

/**
 * Check if running in Electron environment
 */
export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && window.electron !== undefined;
}

/**
 * Invoke an Electron IPC command
 */
export async function invoke<T = any>(command: string, ...args: any[]): Promise<T> {
  if (!isElectronEnvironment()) {
    throw new Error('Not running in Electron environment');
  }
  return window.electron!.invoke(command, ...args);
}

/**
 * Listen to Electron IPC events
 */
export function listen<T = any>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  if (!isElectronEnvironment()) {
    throw new Error('Not running in Electron environment');
  }
  
  const unlisten = window.electron!.on(event, handler);
  return Promise.resolve(unlisten);
}

/**
 * Open URL in external browser
 */
export async function openUrl(url: string): Promise<void> {
  if (!isElectronEnvironment()) {
    window.open(url, '_blank');
    return;
  }
  await invoke('open-url', url);
}

/**
 * Write text to clipboard
 */
export async function writeClipboard(text: string): Promise<void> {
  if (!isElectronEnvironment()) {
    await navigator.clipboard.writeText(text);
    return;
  }
  await invoke('write-clipboard', text);
}

/**
 * Read text from clipboard
 */
export async function readClipboard(): Promise<string> {
  if (!isElectronEnvironment()) {
    return await navigator.clipboard.readText();
  }
  return await invoke('read-clipboard');
}

/**
 * Show notification
 */
export async function showNotification(title: string, body: string): Promise<void> {
  if (!isElectronEnvironment()) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }
  await invoke('show-notification', { title, body });
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isElectronEnvironment()) {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
  return await invoke('request-notification-permission');
}

/**
 * Check if notification permission is granted
 */
export async function isNotificationPermissionGranted(): Promise<boolean> {
  if (!isElectronEnvironment()) {
    return 'Notification' in window && Notification.permission === 'granted';
  }
  return await invoke('is-notification-permission-granted');
}

/**
 * Fetch with platform-specific implementation
 */
export async function platformFetch(url: string, options?: RequestInit): Promise<Response> {
  // Use native fetch for both Electron and web
  return fetch(url, options);
}

// Re-export for convenience
export { isElectronEnvironment as isPlatformEnvironment };
