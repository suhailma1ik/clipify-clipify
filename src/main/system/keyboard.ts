import { keyboard, Key } from '@nut-tree-fork/nut-js';

/**
 * Simulate Cmd+C (macOS) or Ctrl+C (Windows/Linux)
 * Used to copy selected text to clipboard
 */
export async function simulateCmdC(): Promise<void> {
  try {
    const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
    await keyboard.type(Key.C, modifier);
  } catch (error) {
    console.error('Error simulating Cmd+C:', error);
    throw new Error('Failed to simulate copy command');
  }
}

/**
 * Simulate Cmd+V (macOS) or Ctrl+V (Windows/Linux)
 * Used to paste clipboard content
 */
export async function simulateCmdV(): Promise<void> {
  try {
    const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
    await keyboard.type(Key.V, modifier);
  } catch (error) {
    console.error('Error simulating Cmd+V:', error);
    throw new Error('Failed to simulate paste command');
  }
}

/**
 * Simulate a key combination with modifiers
 * @param key - The key to press (e.g., 'c', 'v', 'a')
 * @param modifiers - Array of modifiers (e.g., ['command', 'shift'])
 */
export async function simulateKeyCombo(key: string, modifiers: string[]): Promise<void> {
  try {
    // Convert platform-agnostic modifiers to platform-specific ones
    const nutModifiers = modifiers.map(mod => {
      if (mod === 'primary' || mod === 'cmd') {
        return process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
      }
      if (mod === 'shift') return Key.LeftShift;
      if (mod === 'alt') return Key.LeftAlt;
      if (mod === 'control') return Key.LeftControl;
      return Key.LeftControl; // fallback
    });
    
    // Convert key string to Key enum
    const nutKey = Key[key.toUpperCase() as keyof typeof Key] || Key.C;
    await keyboard.type(nutKey, ...nutModifiers);
  } catch (error) {
    console.error(`Error simulating key combo ${key} with modifiers ${modifiers}:`, error);
    throw new Error(`Failed to simulate key combination: ${key}+${modifiers.join('+')}`);
  }
}
