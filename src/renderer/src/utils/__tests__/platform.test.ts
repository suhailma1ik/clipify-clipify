import { describe, it, expect } from 'vitest';
import { isMac, getPrimaryModifierKey, getShortcutLabel, formatHotkeyCombo } from '../platform';

// Mock the navigator
const mockNavigator = (userAgent: string, platform: string) => {
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent,
      platform,
    },
    writable: true,
    configurable: true,
  });
};

describe('platform utilities', () => {
  describe('isMac', () => {
    it('should return true for macOS user agent', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel');
      expect(isMac()).toBe(true);
    });

    it('should return false for Windows user agent', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32');
      expect(isMac()).toBe(false);
    });

    it('should return false for Linux user agent', () => {
      mockNavigator('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64');
      expect(isMac()).toBe(false);
    });
  });

  describe('getPrimaryModifierKey', () => {
    it('should return "Cmd" on macOS', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel');
      expect(getPrimaryModifierKey()).toBe('Cmd');
    });

    it('should return "Ctrl" on Windows', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32');
      expect(getPrimaryModifierKey()).toBe('Ctrl');
    });

    it('should return "Ctrl" on Linux', () => {
      mockNavigator('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64');
      expect(getPrimaryModifierKey()).toBe('Ctrl');
    });
  });

  describe('getShortcutLabel', () => {
    it('should return default shortcut with Cmd on macOS', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel');
      expect(getShortcutLabel()).toBe('Cmd+Shift+C');
    });

    it('should return default shortcut with Ctrl on Windows', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32');
      expect(getShortcutLabel()).toBe('Ctrl+Shift+C');
    });
  });

  describe('formatHotkeyCombo', () => {
    it('should format PRIMARY+SHIFT+KeyC correctly on macOS', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel');
      expect(formatHotkeyCombo('PRIMARY+SHIFT+KeyC')).toBe('Cmd+Shift+C');
    });

    it('should format PRIMARY+SHIFT+KeyC correctly on Windows', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32');
      expect(formatHotkeyCombo('PRIMARY+SHIFT+KeyC')).toBe('Ctrl+Shift+C');
    });

    it('should format PRIMARY+ALT+KeyR correctly on macOS', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel');
      expect(formatHotkeyCombo('PRIMARY+ALT+KeyR')).toBe('Cmd+Option+R');
    });

    it('should format PRIMARY+ALT+KeyR correctly on Windows', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32');
      expect(formatHotkeyCombo('PRIMARY+ALT+KeyR')).toBe('Ctrl+Alt+R');
    });

    it('should format PRIMARY+SHIFT+F1 correctly', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel');
      expect(formatHotkeyCombo('PRIMARY+SHIFT+F1')).toBe('Cmd+Shift+F1');
    });

    it('should format PRIMARY+KeyS correctly', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel');
      expect(formatHotkeyCombo('PRIMARY+KeyS')).toBe('Cmd+S');
    });

    it('should handle custom hotkeys with multiple modifiers', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32');
      expect(formatHotkeyCombo('PRIMARY+SHIFT+ALT+KeyX')).toBe('Ctrl+Shift+Alt+X');
    });
  });
});
