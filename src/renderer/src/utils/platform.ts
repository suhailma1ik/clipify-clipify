// Cross-platform platform utilities
// Provides helpers to render OS-specific shortcut labels consistently

import { formatHotkeyForDisplay } from './hotkeyNormalization';

export const isMac = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = (navigator as any).platform || "";
  return /Mac|Macintosh|Mac OS X/.test(ua) || /Mac/.test(platform);
};

export const getPrimaryModifierKey = (): string => (isMac() ? "Cmd" : "Ctrl");

/**
 * Get the default shortcut label
 * @returns The default shortcut in platform-specific format (e.g., "Cmd+Shift+C" on macOS)
 */
export const getShortcutLabel = (): string => `${getPrimaryModifierKey()}+Shift+C`;

/**
 * Format any hotkey combo for display in platform-specific format
 * @param normalizedCombo - Hotkey in normalized format (e.g., "PRIMARY+SHIFT+KeyC")
 * @returns Hotkey in platform-specific format (e.g., "Cmd+Shift+C" on macOS, "Ctrl+Shift+C" on Windows)
 */
export const formatHotkeyCombo = (normalizedCombo: string): string => {
  return formatHotkeyForDisplay(normalizedCombo);
};
