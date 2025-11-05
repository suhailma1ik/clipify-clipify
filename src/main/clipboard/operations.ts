import { clipboard } from 'electron'
import { keyboard, Key } from '@nut-tree-fork/nut-js'

/**
 * Read text content from the system clipboard
 * @returns The current clipboard text content
 */
export function readClipboard(): string {
  return clipboard.readText()
}

/**
 * Write text content to the system clipboard
 * @param text - The text to write to clipboard
 */
export function writeClipboard(text: string): void {
  clipboard.writeText(text)
}

/**
 * Simulate Cmd+C (macOS) or Ctrl+C (Windows/Linux) to copy selected text
 * Waits 100ms for clipboard to update and returns the copied text
 * @returns Promise that resolves with the copied text
 */
export async function triggerClipboardCopy(): Promise<string> {
  // Determine platform-specific modifier
  const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl

  // Simulate the copy keyboard shortcut
  await keyboard.type(Key.C, modifier)

  // Wait 100ms for clipboard to update
  await new Promise(resolve => setTimeout(resolve, 100))

  // Read and return the clipboard content
  return readClipboard()
}
