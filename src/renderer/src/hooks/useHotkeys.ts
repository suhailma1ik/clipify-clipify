/**
 * Hotkeys Hook
 * Manages hotkey bindings state and operations
 */

import { useState, useCallback } from 'react';
import { invoke } from '../services/platformAdapter';
import { PromptHotkey } from '../types/customPrompts';
import { getHotkeyService } from '../services/hotkeyService';
import { getLoggingService } from '../services/loggingService';
import { handleHotkeyError } from '../utils/errorHandler';
import { notificationService } from '../services/notificationService';

export interface HotkeyWithStatus extends PromptHotkey {
  registrationStatus: 'pending' | 'success' | 'failed';
  registrationError?: string;
}

export interface UseHotkeysReturn {
  hotkeys: HotkeyWithStatus[];
  loading: boolean;
  error: string | null;
  loadHotkeys: () => Promise<void>;
  createHotkey: (promptCode: string, combo: string) => Promise<void>;
  updateHotkey: (id: string, combo: string) => Promise<void>;
  deleteHotkey: (id: string) => Promise<void>;
  checkConflict: (combo: string, excludeId?: string) => boolean;
}

export function useHotkeys(): UseHotkeysReturn {
  const [hotkeys, setHotkeys] = useState<HotkeyWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hotkeyService = getHotkeyService();
  const logger = getLoggingService();

  /**
   * Load all hotkeys
   */
  const loadHotkeys = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      logger.info('hotkeys', 'Loading hotkeys');
      const loadedHotkeys = await hotkeyService.getHotkeys();

      const hotkeysWithStatus: HotkeyWithStatus[] = loadedHotkeys.map((hotkey) => {
        return {
          ...hotkey,
          registrationStatus: 'success',
        };
      });

      setHotkeys(hotkeysWithStatus);

      logger.info('hotkeys', 'Hotkeys loaded', { count: loadedHotkeys.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load hotkeys';
      setError(errorMessage);
      logger.error('hotkeys', 'Failed to load hotkeys', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [hotkeyService, logger]);


  /**
   * Create a new hotkey binding
   */
  const createHotkey = useCallback(
    async (promptCode: string, combo: string): Promise<void> => {
      setError(null);

      try {
        logger.info('hotkeys', 'Creating hotkey', { promptCode, combo });
        
        // Create hotkey locally
        const createdHotkey = await hotkeyService.createHotkey({ prompt_code: promptCode, combo });
        
        // Register with backend
        try {
          await invoke('register_hotkey', { code: promptCode, combo });
          await hotkeyService.updateHotkeyStatus(createdHotkey.id, { registered: true });
          logger.info('hotkeys', 'Hotkey registered with backend', { id: createdHotkey.id, promptCode, combo });
        } catch (backendErr) {
          logger.error('hotkeys', 'Failed to register hotkey with backend', backendErr instanceof Error ? backendErr : new Error(String(backendErr)));
          throw new Error(`Failed to register hotkey: ${backendErr instanceof Error ? backendErr.message : String(backendErr)}`);
        }
        
        // Show success notification
        await notificationService.success(
          'Hotkey Created',
          `Successfully created hotkey "${combo}"`
        );
        
        // Reload hotkeys to get the updated list
        await loadHotkeys();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create hotkey';
        setError(errorMessage);
        await handleHotkeyError(err, combo);
        throw err;
      }
    },
    [hotkeyService, logger, loadHotkeys]
  );

  /**
   * Update an existing hotkey binding
   */
  const updateHotkey = useCallback(
    async (id: string, combo: string): Promise<void> => {
      setError(null);

      try {
        // Find the hotkey to get its prompt code
        const hotkey = hotkeys.find((h) => h.id === id);
        if (!hotkey) {
          throw new Error('Hotkey not found');
        }

        logger.info('hotkeys', 'Updating hotkey', { id, combo, promptCode: hotkey.prompt_code });
        
        // First, unregister the old hotkey from backend if it was registered
        if (hotkey.registered && hotkey.combo) {
          try {
            await invoke('unregister_hotkey', { code: hotkey.prompt_code });
            logger.info('hotkeys', 'Unregistered old hotkey from backend', { promptCode: hotkey.prompt_code, oldCombo: hotkey.combo });
          } catch (unregErr) {
            logger.warn('hotkeys', 'Failed to unregister old hotkey (may not exist)', unregErr instanceof Error ? unregErr : new Error(String(unregErr)));
          }
        }
        
        // Update hotkey locally
        await hotkeyService.updateHotkey(id, { combo });
        
        // Register new hotkey with backend
        try {
          await invoke('register_hotkey', { code: hotkey.prompt_code, combo });
          await hotkeyService.updateHotkeyStatus(id, { registered: true });
          logger.info('hotkeys', 'Hotkey updated and registered with backend', { id, combo });
        } catch (backendErr) {
          logger.error('hotkeys', 'Failed to register updated hotkey with backend', backendErr instanceof Error ? backendErr : new Error(String(backendErr)));
          throw new Error(`Failed to register hotkey: ${backendErr instanceof Error ? backendErr.message : String(backendErr)}`);
        }
        
        // Show success notification
        await notificationService.success(
          'Hotkey Updated',
          `Successfully updated hotkey to "${combo}"`
        );
        
        // Reload hotkeys to get the updated list
        await loadHotkeys();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update hotkey';
        setError(errorMessage);
        await handleHotkeyError(err, combo);
        throw err;
      }
    },
    [hotkeys, hotkeyService, logger, loadHotkeys]
  );

  /**
   * Delete a hotkey binding
   */
  const deleteHotkey = useCallback(
    async (id: string): Promise<void> => {
      setError(null);

      try {
        // Find the hotkey to get its prompt code
        const hotkey = hotkeys.find((h) => h.id === id);
        if (!hotkey) {
          throw new Error('Hotkey not found');
        }

        logger.info('hotkeys', 'Deleting hotkey', { id, promptCode: hotkey.prompt_code });
        
        // Unregister from backend if it was registered
        if (hotkey.registered) {
          try {
            await invoke('unregister_hotkey', { code: hotkey.prompt_code });
            logger.info('hotkeys', 'Unregistered hotkey from backend', { promptCode: hotkey.prompt_code });
          } catch (unregErr) {
            logger.warn('hotkeys', 'Failed to unregister hotkey (may not exist)', unregErr instanceof Error ? unregErr : new Error(String(unregErr)));
          }
        }
        
        // Delete hotkey locally
        await hotkeyService.deleteHotkey(id);
        
        logger.info('hotkeys', 'Hotkey deleted', { id });
        
        // Show success notification
        await notificationService.success('Hotkey Deleted', 'Successfully deleted hotkey');
        
        // Reload hotkeys to get the updated list
        await loadHotkeys();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete hotkey';
        setError(errorMessage);
        await notificationService.error('Failed to Delete Hotkey', errorMessage);
        logger.error('hotkeys', 'Failed to delete hotkey', err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [hotkeys, hotkeyService, logger, loadHotkeys]
  );

  /**
   * Check if a hotkey combo conflicts with existing hotkeys
   */
  const checkConflict = useCallback(
    (combo: string, excludeId?: string): boolean => {
      return hotkeys.some(
        (hotkey) => hotkey.combo === combo && hotkey.id !== excludeId
      );
    },
    [hotkeys]
  );

  return {
    hotkeys,
    loading,
    error,
    loadHotkeys,
    createHotkey,
    updateHotkey,
    deleteHotkey,
    checkConflict,
  };
}
