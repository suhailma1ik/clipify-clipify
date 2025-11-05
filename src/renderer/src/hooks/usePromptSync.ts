/**
 * Hook for managing custom prompts and hotkeys with sync
 */

import { useState, useEffect, useCallback } from 'react';
import { CustomPrompt, PromptHotkey, SyncResult } from '../types/customPrompts';
import { getPromptStorageService } from '../services/promptStorageService';

interface UsePromptSyncProps {
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const usePromptSync = ({ showNotification }: UsePromptSyncProps = {}) => {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [hotkeys, setHotkeys] = useState<PromptHotkey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number>(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const storageService = getPromptStorageService();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Load local data from storage
   */
  const loadLocalData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getLocalData();
      setPrompts(data.prompts);
      setHotkeys(data.hotkeys);
      setLastSync(data.lastSync);
      console.log('[usePromptSync] Local data loaded');
    } catch (error) {
      console.error('[usePromptSync] Failed to load local data:', error);
      showNotification?.('Failed to load local data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [storageService, showNotification]);

  /**
   * Sync data from server (called on login)
   */
  const syncFromServer = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      const error = 'No internet connection';
      showNotification?.(error, 'error');
      return { success: false, error };
    }

    setIsSyncing(true);
    try {
      const result = await storageService.syncFromServer();
      
      if (result.success) {
        // Reload local data after sync
        await loadLocalData();
        showNotification?.('Data synced successfully', 'success');
      } else {
        showNotification?.(`Sync failed: ${result.error}`, 'error');
      }

      return result;
    } catch (error) {
      console.error('[usePromptSync] Sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification?.(`Sync failed: ${errorMessage}`, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, storageService, loadLocalData, showNotification]);

  /**
   * Add or update a prompt
   */
  const savePrompt = useCallback(async (prompt: CustomPrompt): Promise<boolean> => {
    if (!isOnline) {
      showNotification?.('No internet connection. Changes cannot be saved.', 'error');
      return false;
    }

    try {
      // Push to server first
      const success = await storageService.pushToServer(prompt);
      
      if (success) {
        // Update local storage
        const updatedPrompts = prompts.some(p => p.id === prompt.id)
          ? prompts.map(p => p.id === prompt.id ? prompt : p)
          : [...prompts, prompt];
        
        await storageService.savePrompts(updatedPrompts);
        setPrompts(updatedPrompts);
        showNotification?.('Prompt saved successfully', 'success');
        return true;
      } else {
        showNotification?.('Failed to save prompt', 'error');
        return false;
      }
    } catch (error) {
      console.error('[usePromptSync] Failed to save prompt:', error);
      showNotification?.('Failed to save prompt', 'error');
      return false;
    }
  }, [isOnline, prompts, storageService, showNotification]);

  /**
   * Delete a prompt
   */
  const deletePrompt = useCallback(async (promptId: string): Promise<boolean> => {
    if (!isOnline) {
      showNotification?.('No internet connection. Changes cannot be saved.', 'error');
      return false;
    }

    try {
      // Delete from server first
      const success = await storageService.deletePromptFromServer(promptId);
      
      if (success) {
        // Update local storage
        const updatedPrompts = prompts.filter(p => p.id !== promptId);
        await storageService.savePrompts(updatedPrompts);
        setPrompts(updatedPrompts);
        
        // Also delete associated hotkeys
        const updatedHotkeys = hotkeys.filter(h => h.prompt_code !== promptId);
        await storageService.saveHotkeys(updatedHotkeys);
        setHotkeys(updatedHotkeys);
        
        showNotification?.('Prompt deleted successfully', 'success');
        return true;
      } else {
        showNotification?.('Failed to delete prompt', 'error');
        return false;
      }
    } catch (error) {
      console.error('[usePromptSync] Failed to delete prompt:', error);
      showNotification?.('Failed to delete prompt', 'error');
      return false;
    }
  }, [isOnline, prompts, hotkeys, storageService, showNotification]);

  /**
   * Add or update a hotkey
   */
  const saveHotkey = useCallback(async (hotkey: PromptHotkey): Promise<boolean> => {
    if (!isOnline) {
      showNotification?.('No internet connection. Changes cannot be saved.', 'error');
      return false;
    }

    try {
      // Push to server first
      const success = await storageService.pushHotkeyToServer(hotkey);
      
      if (success) {
        // Update local storage
        const updatedHotkeys = hotkeys.some(h => h.id === hotkey.id)
          ? hotkeys.map(h => h.id === hotkey.id ? hotkey : h)
          : [...hotkeys, hotkey];
        
        await storageService.saveHotkeys(updatedHotkeys);
        setHotkeys(updatedHotkeys);
        showNotification?.('Hotkey saved successfully', 'success');
        return true;
      } else {
        showNotification?.('Failed to save hotkey', 'error');
        return false;
      }
    } catch (error) {
      console.error('[usePromptSync] Failed to save hotkey:', error);
      showNotification?.('Failed to save hotkey', 'error');
      return false;
    }
  }, [isOnline, hotkeys, storageService, showNotification]);

  /**
   * Delete a hotkey
   */
  const deleteHotkey = useCallback(async (hotkeyId: string): Promise<boolean> => {
    if (!isOnline) {
      showNotification?.('No internet connection. Changes cannot be saved.', 'error');
      return false;
    }

    try {
      // Delete from server first
      const success = await storageService.deleteHotkeyFromServer(hotkeyId);
      
      if (success) {
        // Update local storage
        const updatedHotkeys = hotkeys.filter(h => h.id !== hotkeyId);
        await storageService.saveHotkeys(updatedHotkeys);
        setHotkeys(updatedHotkeys);
        showNotification?.('Hotkey deleted successfully', 'success');
        return true;
      } else {
        showNotification?.('Failed to delete hotkey', 'error');
        return false;
      }
    } catch (error) {
      console.error('[usePromptSync] Failed to delete hotkey:', error);
      showNotification?.('Failed to delete hotkey', 'error');
      return false;
    }
  }, [isOnline, hotkeys, storageService, showNotification]);

  /**
   * Clear all local data (called on logout)
   */
  const clearLocalData = useCallback(async () => {
    try {
      await storageService.clearLocalData();
      setPrompts([]);
      setHotkeys([]);
      setLastSync(0);
      console.log('[usePromptSync] Local data cleared');
    } catch (error) {
      console.error('[usePromptSync] Failed to clear local data:', error);
    }
  }, [storageService]);

  return {
    prompts,
    hotkeys,
    isLoading,
    isSyncing,
    lastSync,
    isOnline,
    loadLocalData,
    syncFromServer,
    savePrompt,
    deletePrompt,
    saveHotkey,
    deleteHotkey,
    clearLocalData
  };
};
