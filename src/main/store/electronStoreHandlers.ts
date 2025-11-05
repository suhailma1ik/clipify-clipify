import { ipcMain } from 'electron';
import Store from 'electron-store';

// Create store instances for different purposes
const stores = new Map<string, Store>();

function getStore(storeName: string): Store {
  if (!stores.has(storeName)) {
    stores.set(storeName, new Store({ name: storeName }));
  }
  return stores.get(storeName)!;
}

/**
 * Register electron-store IPC handlers
 */
export function registerElectronStoreHandlers(): void {
  // Load/initialize a store
  ipcMain.handle('store-load', async (_event, storeName: string) => {
    try {
      getStore(storeName);
      return { success: true };
    } catch (error) {
      console.error(`Failed to load store ${storeName}:`, error);
      throw error;
    }
  });

  // Get a value from store
  ipcMain.handle('store-get', async (_event, storeName: string, key: string) => {
    try {
      const store = getStore(storeName);
      return store.get(key, null);
    } catch (error) {
      console.error(`Failed to get ${key} from store ${storeName}:`, error);
      return null;
    }
  });

  // Set a value in store
  ipcMain.handle('store-set', async (_event, storeName: string, key: string, value: any) => {
    try {
      const store = getStore(storeName);
      store.set(key, value);
      return { success: true };
    } catch (error) {
      console.error(`Failed to set ${key} in store ${storeName}:`, error);
      throw error;
    }
  });

  // Delete a key from store
  ipcMain.handle('store-delete', async (_event, storeName: string, key: string) => {
    try {
      const store = getStore(storeName);
      store.delete(key);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete ${key} from store ${storeName}:`, error);
      throw error;
    }
  });

  // Save store (electron-store auto-saves, but keep for API compatibility)
  ipcMain.handle('store-save', async (_event, storeName: string) => {
    try {
      // electron-store auto-saves, so this is a no-op
      getStore(storeName);
      return { success: true };
    } catch (error) {
      console.error(`Failed to save store ${storeName}:`, error);
      throw error;
    }
  });

  // Clear entire store
  ipcMain.handle('store-clear', async (_event, storeName: string) => {
    try {
      const store = getStore(storeName);
      store.clear();
      return { success: true };
    } catch (error) {
      console.error(`Failed to clear store ${storeName}:`, error);
      throw error;
    }
  });

  // Get all keys from store
  ipcMain.handle('store-keys', async (_event, storeName: string) => {
    try {
      const store = getStore(storeName);
      const storeData = store.store;
      return Object.keys(storeData);
    } catch (error) {
      console.error(`Failed to get keys from store ${storeName}:`, error);
      return [];
    }
  });

  // Get all values from store
  ipcMain.handle('store-values', async (_event, storeName: string) => {
    try {
      const store = getStore(storeName);
      const storeData = store.store;
      return Object.values(storeData);
    } catch (error) {
      console.error(`Failed to get values from store ${storeName}:`, error);
      return [];
    }
  });

  // Get all entries from store
  ipcMain.handle('store-entries', async (_event, storeName: string) => {
    try {
      const store = getStore(storeName);
      const storeData = store.store;
      return Object.entries(storeData);
    } catch (error) {
      console.error(`Failed to get entries from store ${storeName}:`, error);
      return [];
    }
  });

  // Check if key exists in store
  ipcMain.handle('store-has', async (_event, storeName: string, key: string) => {
    try {
      const store = getStore(storeName);
      return store.has(key);
    } catch (error) {
      console.error(`Failed to check ${key} in store ${storeName}:`, error);
      return false;
    }
  });

  // Get store size (number of keys)
  ipcMain.handle('store-length', async (_event, storeName: string) => {
    try {
      const store = getStore(storeName);
      const storeData = store.store;
      return Object.keys(storeData).length;
    } catch (error) {
      console.error(`Failed to get length of store ${storeName}:`, error);
      return 0;
    }
  });

  console.log('Electron Store IPC handlers registered');
}
