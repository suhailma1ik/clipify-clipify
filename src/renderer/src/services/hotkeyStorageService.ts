/**
 * Service for managing custom hotkey persistence in localStorage
 */

const STORAGE_KEY = 'clipify_custom_hotkey';
const DEFAULT_HOTKEY = 'PRIMARY+SHIFT+KeyC';
const CURRENT_VERSION = '1.0.0';

interface StoredHotkey {
  combo: string;        // Normalized format: "PRIMARY+SHIFT+KeyC"
  timestamp: number;    // When it was saved
  version: string;      // App version for migration support
}

/**
 * Get the custom hotkey from localStorage
 * @returns The custom hotkey combo or null if not set
 */
export function getCustomHotkey(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const data: StoredHotkey = JSON.parse(stored);
    
    // Validate the stored data structure
    if (!data.combo || typeof data.combo !== 'string') {
      console.warn('Invalid hotkey data in storage, clearing');
      clearCustomHotkey();
      return null;
    }

    return data.combo;
  } catch (error) {
    console.error('Failed to get custom hotkey from storage:', error);
    return null;
  }
}

/**
 * Save a custom hotkey to localStorage
 * @param combo - The hotkey combination in normalized format
 */
export function setCustomHotkey(combo: string): void {
  try {
    const data: StoredHotkey = {
      combo,
      timestamp: Date.now(),
      version: CURRENT_VERSION,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save custom hotkey to storage:', error);
    throw new Error('Failed to save hotkey configuration');
  }
}

/**
 * Clear the custom hotkey from localStorage
 */
export function clearCustomHotkey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear custom hotkey from storage:', error);
  }
}

/**
 * Get the default hotkey combination
 * @returns The default hotkey in normalized format
 */
export function getDefaultHotkey(): string {
  return DEFAULT_HOTKEY;
}
