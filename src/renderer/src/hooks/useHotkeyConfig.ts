/**
 * useHotkeyConfig Hook
 * Manages custom hotkey configuration state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '../services/platformAdapter';
import {
  getCustomHotkey,
  setCustomHotkey,
  clearCustomHotkey,
  getDefaultHotkey,
} from '../services/hotkeyStorageService';
import { notificationService } from '../services/notificationService';
import { getLoggingService } from '../services/loggingService';

export interface UseHotkeyConfigReturn {
  currentHotkey: string;
  isCustom: boolean;
  isLoading: boolean;
  error: string | null;
  saveHotkey: (combo: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
  loadHotkey: () => Promise<void>;
}

const HOTKEY_CODE = 'QUICK_CAPTURE';

/**
 * Custom hook for managing hotkey configuration
 */
export function useHotkeyConfig(): UseHotkeyConfigReturn {
  const [currentHotkey, setCurrentHotkey] = useState<string>(getDefaultHotkey());
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const logger = getLoggingService();

  /**
   * Load hotkey from storage on mount
   */
  const loadHotkey = useCallback(async () => {
    try {
      logger.info('hotkey-config', 'Loading hotkey from storage');
      
      const customHotkey = getCustomHotkey();
      
      if (customHotkey) {
        setCurrentHotkey(customHotkey);
        setIsCustom(true);
        logger.info('hotkey-config', 'Custom hotkey loaded', { combo: customHotkey });
      } else {
        const defaultHotkey = getDefaultHotkey();
        setCurrentHotkey(defaultHotkey);
        setIsCustom(false);
        logger.info('hotkey-config', 'Using default hotkey', { combo: defaultHotkey });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load hotkey';
      logger.error('hotkey-config', 'Failed to load hotkey', err instanceof Error ? err : new Error(String(err)));
      setError(errorMessage);
    }
  }, [logger]);

  /**
   * Save new hotkey configuration
   */
  const saveHotkey = useCallback(
    async (newCombo: string) => {
      setIsLoading(true);
      setError(null);

      const previousHotkey = currentHotkey;
      const previousIsCustom = isCustom;

      try {
        logger.info('hotkey-config', 'Saving new hotkey', { newCombo });

        // Unregister old hotkey
        try {
          await invoke('unregister_hotkey', { code: HOTKEY_CODE });
          logger.info('hotkey-config', 'Old hotkey unregistered', { code: HOTKEY_CODE });
        } catch (unregisterError) {
          logger.warn('hotkey-config', 'Failed to unregister old hotkey', { error: unregisterError });
          // Continue anyway - the old hotkey might not have been registered
        }

        // Register new hotkey
        await invoke('register_hotkey', {
          code: HOTKEY_CODE,
          combo: newCombo,
        });
        logger.info('hotkey-config', 'New hotkey registered', { combo: newCombo });

        // Save to storage
        setCustomHotkey(newCombo);
        logger.info('hotkey-config', 'Hotkey saved to storage', { combo: newCombo });

        // Update state
        setCurrentHotkey(newCombo);
        setIsCustom(true);

        // Show success notification
        await notificationService.success(
          'Hotkey Updated',
          'Your custom hotkey has been saved successfully'
        );

        logger.info('hotkey-config', 'Hotkey update completed successfully', { combo: newCombo });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to register hotkey';
        logger.error('hotkey-config', 'Failed to save hotkey', err instanceof Error ? err : new Error(String(err)), {
          newCombo,
          previousHotkey,
        });
        
        setError(errorMessage);

        // Rollback: Re-register previous hotkey
        try {
          await invoke('register_hotkey', {
            code: HOTKEY_CODE,
            combo: previousHotkey,
          });
          logger.info('hotkey-config', 'Rolled back to previous hotkey', { combo: previousHotkey });
          
          // Restore previous state
          setCurrentHotkey(previousHotkey);
          setIsCustom(previousIsCustom);
        } catch (rollbackError) {
          logger.error('hotkey-config', 'Failed to rollback to previous hotkey', rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)));
        }

        // Show error notification
        await notificationService.error(
          'Hotkey Registration Failed',
          `Failed to register hotkey: ${errorMessage}`
        );

        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentHotkey, isCustom, logger]
  );

  /**
   * Reset hotkey to default
   */
  const resetToDefault = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const defaultHotkey = getDefaultHotkey();
      logger.info('hotkey-config', 'Resetting to default hotkey', { defaultHotkey });

      // Unregister custom hotkey
      try {
        await invoke('unregister_hotkey', { code: HOTKEY_CODE });
        logger.info('hotkey-config', 'Custom hotkey unregistered', { code: HOTKEY_CODE });
      } catch (unregisterError) {
        logger.warn('hotkey-config', 'Failed to unregister custom hotkey', { error: unregisterError });
        // Continue anyway
      }

      // Register default hotkey
      await invoke('register_hotkey', {
        code: HOTKEY_CODE,
        combo: defaultHotkey,
      });
      logger.info('hotkey-config', 'Default hotkey registered', { combo: defaultHotkey });

      // Clear from storage
      clearCustomHotkey();
      logger.info('hotkey-config', 'Custom hotkey cleared from storage');

      // Update state
      setCurrentHotkey(defaultHotkey);
      setIsCustom(false);

      // Show success notification
      await notificationService.success(
        'Hotkey Reset',
        'Your hotkey has been reset to default'
      );

      logger.info('hotkey-config', 'Hotkey reset completed successfully', { defaultHotkey });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset hotkey';
      logger.error('hotkey-config', 'Failed to reset hotkey', err instanceof Error ? err : new Error(String(err)));
      
      setError(errorMessage);

      // Show error notification
      await notificationService.error(
        'Hotkey Reset Failed',
        `Failed to reset hotkey: ${errorMessage}`
      );

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  // Load hotkey on mount
  useEffect(() => {
    loadHotkey();
  }, [loadHotkey]);

  return {
    currentHotkey,
    isCustom,
    isLoading,
    error,
    saveHotkey,
    resetToDefault,
    loadHotkey,
  };
}
