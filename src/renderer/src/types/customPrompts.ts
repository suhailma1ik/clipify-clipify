/**
 * Types for custom prompts and hotkeys
 */

export interface CustomPrompt {
  id: string;
  name: string;
  template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptHotkey {
  id: string;
  prompt_code: string; // UUID for custom, "REPHRASE"/"SUMMARIZE" for builtin
  combo: string;
  is_active: boolean;
  registered?: boolean; // Local registration status
  created_at: string;
  updated_at: string;
}

export interface LocalPromptData {
  prompts: CustomPrompt[];
  hotkeys: PromptHotkey[];
  lastSync: number;
  version: string;
}

export interface SyncConflict {
  type: 'prompt' | 'hotkey';
  id: string;
  local: CustomPrompt | PromptHotkey;
  server: CustomPrompt | PromptHotkey;
}

export interface SyncResult {
  success: boolean;
  conflicts?: SyncConflict[];
  error?: string;
}
