/**
 * Local storage service for custom prompts and hotkeys
 * Uses tauri-plugin-store for persistent storage
 */

import { invoke } from './platformAdapter';

// Electron Store wrapper
class Store {
  private storeName: string;

  constructor(storeName: string) {
    this.storeName = storeName;
  }

  async get<T>(key: string): Promise<T | null> {
    return await invoke<T | null>('store-get', this.storeName, key);
  }

  async set(key: string, value: any): Promise<void> {
    await invoke('store-set', this.storeName, key, value);
  }

  async delete(key: string): Promise<void> {
    await invoke('store-delete', this.storeName, key);
  }

  async save(): Promise<void> {
    await invoke('store-save', this.storeName);
  }

  async load(): Promise<void> {
    await invoke('store-load', this.storeName);
  }

  async clear(): Promise<void> {
    await invoke('store-clear', this.storeName);
  }

  async keys(): Promise<string[]> {
    return await invoke<string[]>('store-keys', this.storeName);
  }

  async values(): Promise<any[]> {
    return await invoke<any[]>('store-values', this.storeName);
  }

  async entries(): Promise<[string, any][]> {
    return await invoke<[string, any][]>('store-entries', this.storeName);
  }

  async has(key: string): Promise<boolean> {
    return await invoke<boolean>('store-has', this.storeName, key);
  }

  async length(): Promise<number> {
    return await invoke<number>('store-length', this.storeName);
  }
}
import { CustomPrompt, PromptHotkey, LocalPromptData, SyncConflict, SyncResult } from '../types/customPrompts';
import { getApiClient } from './apiClient';

const STORE_FILE = 'prompts.json';
const STORE_VERSION = '1.0.0';

export class PromptStorageService {
  private store: Store | null = null;
  private initialized = false;

  /**
   * Initialize the store
   */
  private async initStore(): Promise<void> {
    if (this.initialized && this.store) {
      return;
    }

    try {
      this.store = await Store.load(STORE_FILE);
      this.initialized = true;
      console.log('[PromptStorageService] Store initialized');
    } catch (error) {
      console.error('[PromptStorageService] Failed to initialize store:', error);
      throw error;
    }
  }

  /**
   * Get all local data
   */
  async getLocalData(): Promise<LocalPromptData> {
    await this.initStore();

    try {
      const prompts = (await this.store!.get<CustomPrompt[]>('prompts')) || [];
      const hotkeys = (await this.store!.get<PromptHotkey[]>('hotkeys')) || [];
      const lastSync = (await this.store!.get<number>('lastSync')) || 0;
      const version = (await this.store!.get<string>('version')) || STORE_VERSION;

      return {
        prompts,
        hotkeys,
        lastSync,
        version
      };
    } catch (error) {
      console.error('[PromptStorageService] Failed to get local data:', error);
      return {
        prompts: [],
        hotkeys: [],
        lastSync: 0,
        version: STORE_VERSION
      };
    }
  }

  /**
   * Save prompts to local storage
   */
  async savePrompts(prompts: CustomPrompt[]): Promise<void> {
    await this.initStore();

    try {
      await this.store!.set('prompts', prompts);
      await this.store!.save();
      console.log('[PromptStorageService] Prompts saved:', prompts.length);
    } catch (error) {
      console.error('[PromptStorageService] Failed to save prompts:', error);
      throw error;
    }
  }

  /**
   * Save hotkeys to local storage
   */
  async saveHotkeys(hotkeys: PromptHotkey[]): Promise<void> {
    await this.initStore();

    try {
      await this.store!.set('hotkeys', hotkeys);
      await this.store!.save();
      console.log('[PromptStorageService] Hotkeys saved:', hotkeys.length);
    } catch (error) {
      console.error('[PromptStorageService] Failed to save hotkeys:', error);
      throw error;
    }
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(): Promise<void> {
    await this.initStore();

    try {
      await this.store!.set('lastSync', Date.now());
      await this.store!.save();
      console.log('[PromptStorageService] Last sync updated');
    } catch (error) {
      console.error('[PromptStorageService] Failed to update last sync:', error);
      throw error;
    }
  }

  /**
   * Clear all local data
   */
  async clearLocalData(): Promise<void> {
    await this.initStore();

    try {
      await this.store!.set('prompts', []);
      await this.store!.set('hotkeys', []);
      await this.store!.set('lastSync', 0);
      await this.store!.save();
      console.log('[PromptStorageService] Local data cleared');
    } catch (error) {
      console.error('[PromptStorageService] Failed to clear local data:', error);
      throw error;
    }
  }

  /**
   * Fetch data from server and sync to local storage
   */
  async syncFromServer(): Promise<SyncResult> {
    try {
      console.log('[PromptStorageService] Starting sync from server');
      const apiClient = getApiClient();

      // Fetch prompts and hotkeys from server
      const [promptsResponse, hotkeysResponse] = await Promise.all([
        apiClient.get<{ prompts: CustomPrompt[] }>('/api/v1/protected/prompts'),
        apiClient.get<{ hotkeys: PromptHotkey[] }>('/api/v1/protected/hotkeys')
      ]);

      const serverPrompts = promptsResponse.data.prompts || [];
      const serverHotkeys = hotkeysResponse.data.hotkeys || [];

      // Detect conflicts (for now, server wins - can be enhanced later)
      // Future enhancement: compare local and server data for conflicts
      const conflicts: SyncConflict[] = [];

      // Save server data to local storage
      await this.savePrompts(serverPrompts);
      await this.saveHotkeys(serverHotkeys);
      await this.updateLastSync();

      console.log('[PromptStorageService] Sync completed successfully');
      return {
        success: true,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error) {
      console.error('[PromptStorageService] Sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Push local changes to server
   */
  async pushToServer(prompt: CustomPrompt): Promise<boolean> {
    try {
      const apiClient = getApiClient();

      // Check if prompt exists (has id from server)
      if (prompt.id && prompt.id.length > 0) {
        // Update existing prompt
        await apiClient.put(`/api/v1/protected/prompts/${prompt.id}`, {
          name: prompt.name,
          template: prompt.template
        });
      } else {
        // Create new prompt
        const response = await apiClient.post<{ id: string }>('/api/v1/protected/prompts', {
          name: prompt.name,
          template: prompt.template
        });

        // Update local prompt with server-generated ID
        prompt.id = response.data.id;
      }

      console.log('[PromptStorageService] Prompt pushed to server:', prompt.id);
      return true;
    } catch (error) {
      console.error('[PromptStorageService] Failed to push prompt to server:', error);
      return false;
    }
  }

  /**
   * Push hotkey to server
   */
  async pushHotkeyToServer(hotkey: PromptHotkey): Promise<boolean> {
    try {
      const apiClient = getApiClient();

      // Check if hotkey exists (has id from server)
      if (hotkey.id && hotkey.id.length > 0) {
        // Update existing hotkey
        await apiClient.put(`/api/v1/protected/hotkeys/${hotkey.id}`, {
          combo: hotkey.combo
        });
      } else {
        // Create new hotkey
        const response = await apiClient.post<{ id: string }>('/api/v1/protected/hotkeys', {
          prompt_code: hotkey.prompt_code,
          combo: hotkey.combo
        });

        // Update local hotkey with server-generated ID
        hotkey.id = response.data.id;
      }

      console.log('[PromptStorageService] Hotkey pushed to server:', hotkey.id);
      return true;
    } catch (error) {
      console.error('[PromptStorageService] Failed to push hotkey to server:', error);
      return false;
    }
  }

  /**
   * Delete prompt from server
   */
  async deletePromptFromServer(promptId: string): Promise<boolean> {
    try {
      const apiClient = getApiClient();
      await apiClient.delete(`/api/v1/protected/prompts/${promptId}`);
      console.log('[PromptStorageService] Prompt deleted from server:', promptId);
      return true;
    } catch (error) {
      console.error('[PromptStorageService] Failed to delete prompt from server:', error);
      return false;
    }
  }

  /**
   * Delete hotkey from server
   */
  async deleteHotkeyFromServer(hotkeyId: string): Promise<boolean> {
    try {
      const apiClient = getApiClient();
      await apiClient.delete(`/api/v1/protected/hotkeys/${hotkeyId}`);
      console.log('[PromptStorageService] Hotkey deleted from server:', hotkeyId);
      return true;
    } catch (error) {
      console.error('[PromptStorageService] Failed to delete hotkey from server:', error);
      return false;
    }
  }

  /**
   * Check if online (simple check)
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
}

// Create singleton instance
let promptStorageService: PromptStorageService | null = null;

/**
 * Get the prompt storage service instance
 */
export const getPromptStorageService = (): PromptStorageService => {
  if (!promptStorageService) {
    promptStorageService = new PromptStorageService();
  }
  return promptStorageService;
};
