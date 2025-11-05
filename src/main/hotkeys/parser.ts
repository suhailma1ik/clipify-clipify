/**
 * Hotkey Parser
 * 
 * Converts normalized hotkey combo strings to Electron's globalShortcut format.
 * 
 * Input format: "PRIMARY+SHIFT+KeyC"
 * Output format: "CommandOrControl+Shift+C"
 */

/**
 * Parse a hotkey combo string and convert it to Electron format
 * 
 * @param combo - Normalized hotkey combo (e.g., "PRIMARY+SHIFT+KeyC")
 * @returns Electron-formatted hotkey combo (e.g., "CommandOrControl+Shift+C")
 * 
 * @example
 * parseHotkeyCombo("PRIMARY+SHIFT+KeyC") // "CommandOrControl+Shift+C"
 * parseHotkeyCombo("ALT+F1") // "Alt+F1"
 * parseHotkeyCombo("CONTROL+SHIFT+KeyS") // "Control+Shift+S"
 */
export function parseHotkeyCombo(combo: string): string {
  // Split the combo into individual parts
  const parts = combo.split('+')
  
  // Map each part to Electron format
  const electronParts = parts.map(part => {
    // Handle modifier keys
    if (part === 'PRIMARY') {
      return 'CommandOrControl'
    }
    if (part === 'SHIFT') {
      return 'Shift'
    }
    if (part === 'ALT' || part === 'OPTION') {
      return 'Alt'
    }
    if (part === 'CONTROL' || part === 'CTRL') {
      return 'Control'
    }
    if (part === 'SUPER' || part === 'CMD' || part === 'COMMAND') {
      return 'Command'
    }
    
    // Handle key codes
    // KeyX -> X (e.g., KeyC -> C)
    if (part.startsWith('Key')) {
      return part.substring(3)
    }
    
    // DigitX -> X (e.g., Digit1 -> 1)
    if (part.startsWith('Digit')) {
      return part.substring(5)
    }
    
    // Function keys (F1-F24) remain as-is
    if (/^F\d+$/.test(part)) {
      return part
    }
    
    // Handle special keys
    const specialKeys: Record<string, string> = {
      'Space': 'Space',
      'Enter': 'Enter',
      'Return': 'Return',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Insert': 'Insert',
      'Escape': 'Escape',
      'Esc': 'Escape',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Up': 'Up',
      'Down': 'Down',
      'Left': 'Left',
      'Right': 'Right',
      'Plus': 'Plus',
      'Minus': 'Minus',
      'Equal': 'Equal',
      'Comma': 'Comma',
      'Period': 'Period',
      'Slash': 'Slash',
      'Backslash': 'Backslash',
      'BracketLeft': '[',
      'BracketRight': ']',
      'Semicolon': ';',
      'Quote': "'",
      'Backquote': '`'
    }
    
    if (specialKeys[part]) {
      return specialKeys[part]
    }
    
    // If no mapping found, return as-is
    return part
  })
  
  // Join parts with '+' and return
  return electronParts.join('+')
}
