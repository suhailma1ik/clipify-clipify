/**
 * Hotkey Normalization Utilities
 * Handles cross-platform hotkey format conversion
 */

import { isMac } from './platform';

export interface NormalizedHotkey {
  primary: boolean;    // Maps to Cmd on macOS, Ctrl on Windows/Linux
  shift: boolean;
  alt: boolean;
  key: string;        // Platform-agnostic key code (e.g., 'KeyC', 'F1')
}

export interface PlatformHotkey {
  modifiers: string[];  // ['cmd', 'shift'] on macOS, ['ctrl', 'shift'] on Windows
  key: string;         // Display key ('C', 'F1')
}

/**
 * Convert platform-specific hotkey to normalized format
 * Example: { modifiers: ['cmd', 'shift'], key: 'C' } -> "PRIMARY+SHIFT+KeyC"
 */
export function normalizeHotkey(platform: PlatformHotkey): string {
  const parts: string[] = [];

  // Check for primary modifier (Cmd on macOS, Ctrl on Windows/Linux)
  const hasPrimary = platform.modifiers.some(
    (mod) => mod.toLowerCase() === 'cmd' || mod.toLowerCase() === 'ctrl' || mod.toLowerCase() === 'control'
  );
  if (hasPrimary) {
    parts.push('PRIMARY');
  }

  // Check for shift
  if (platform.modifiers.some((mod) => mod.toLowerCase() === 'shift')) {
    parts.push('SHIFT');
  }

  // Check for alt
  if (platform.modifiers.some((mod) => mod.toLowerCase() === 'alt' || mod.toLowerCase() === 'option')) {
    parts.push('ALT');
  }

  // Add key code
  const keyCode = getKeyCode(platform.key);
  parts.push(keyCode);

  return parts.join('+');
}

/**
 * Convert normalized format to platform-specific hotkey
 * Example: "PRIMARY+SHIFT+KeyC" -> { modifiers: ['cmd', 'shift'], key: 'C' } on macOS
 */
export function denormalizeHotkey(normalized: string): PlatformHotkey {
  const parts = normalized.split('+');
  const modifiers: string[] = [];
  let key = '';

  for (const part of parts) {
    const upperPart = part.toUpperCase();
    
    if (upperPart === 'PRIMARY') {
      modifiers.push(isMac() ? 'cmd' : 'ctrl');
    } else if (upperPart === 'SHIFT') {
      modifiers.push('shift');
    } else if (upperPart === 'ALT') {
      modifiers.push(isMac() ? 'option' : 'alt');
    } else {
      // This is the key
      key = getDisplayKey(part);
    }
  }

  return { modifiers, key };
}

/**
 * Get platform-agnostic key code from display key
 */
function getKeyCode(displayKey: string): string {
  const upper = displayKey.toUpperCase();
  
  // Function keys
  if (/^F\d+$/.test(upper)) {
    return upper;
  }
  
  // Number keys
  if (/^\d$/.test(displayKey)) {
    return `Digit${displayKey}`;
  }
  
  // Letter keys
  if (/^[A-Z]$/i.test(displayKey)) {
    return `Key${upper}`;
  }
  
  // Special keys
  const specialKeys: Record<string, string> = {
    'SPACE': 'Space',
    'ENTER': 'Enter',
    'TAB': 'Tab',
    'BACKSPACE': 'Backspace',
    'DELETE': 'Delete',
    'ESCAPE': 'Escape',
    'ESC': 'Escape',
    'ARROWUP': 'ArrowUp',
    'ARROWDOWN': 'ArrowDown',
    'ARROWLEFT': 'ArrowLeft',
    'ARROWRIGHT': 'ArrowRight',
    'UP': 'ArrowUp',
    'DOWN': 'ArrowDown',
    'LEFT': 'ArrowLeft',
    'RIGHT': 'ArrowRight',
  };
  
  return specialKeys[upper] || displayKey;
}

/**
 * Get display key from key code
 */
function getDisplayKey(keyCode: string): string {
  // Function keys
  if (/^F\d+$/i.test(keyCode)) {
    return keyCode.toUpperCase();
  }
  
  // Number keys
  if (keyCode.startsWith('Digit')) {
    return keyCode.replace('Digit', '');
  }
  
  // Letter keys
  if (keyCode.startsWith('Key')) {
    return keyCode.replace('Key', '');
  }
  
  // Special keys
  const specialKeys: Record<string, string> = {
    'Space': 'Space',
    'Enter': 'Enter',
    'Tab': 'Tab',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Escape': 'Esc',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
  };
  
  return specialKeys[keyCode] || keyCode;
}

/**
 * Format hotkey for display
 * Example: "PRIMARY+SHIFT+KeyC" -> "Cmd+Shift+C" on macOS, "Ctrl+Shift+C" on Windows
 */
export function formatHotkeyForDisplay(normalized: string): string {
  const platform = denormalizeHotkey(normalized);
  
  // Capitalize modifiers for display
  const displayModifiers = platform.modifiers.map((mod) => {
    const lower = mod.toLowerCase();
    if (lower === 'cmd') return 'Cmd';
    if (lower === 'ctrl' || lower === 'control') return 'Ctrl';
    if (lower === 'shift') return 'Shift';
    if (lower === 'alt') return 'Alt';
    if (lower === 'option') return 'Option';
    return mod;
  });
  
  return [...displayModifiers, platform.key].join('+');
}

/**
 * Validate hotkey combo format
 */
export function validateHotkeyCombo(combo: string): { isValid: boolean; error?: string } {
  if (!combo || !combo.trim()) {
    return { isValid: false, error: 'Hotkey combo is required' };
  }

  const parts = combo.split('+');
  
  if (parts.length < 2) {
    return { isValid: false, error: 'Hotkey must include at least one modifier and a key' };
  }

  // Check if last part is a valid key
  const key = parts[parts.length - 1];
  if (!key || key.trim() === '') {
    return { isValid: false, error: 'Invalid key in hotkey combo' };
  }

  return { isValid: true };
}

/**
 * Parse hotkey from keyboard event
 */
export function parseHotkeyFromEvent(event: KeyboardEvent): string {
  const modifiers: string[] = [];
  
  if (event.ctrlKey || event.metaKey) {
    modifiers.push('PRIMARY');
  }
  
  if (event.shiftKey) {
    modifiers.push('SHIFT');
  }
  
  if (event.altKey) {
    modifiers.push('ALT');
  }
  
  // Get key code
  const keyCode = event.code || getKeyCode(event.key);
  
  return [...modifiers, keyCode].join('+');
}
