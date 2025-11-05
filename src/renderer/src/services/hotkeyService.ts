/**
 * Hotkey Service
 * Handles hotkey management entirely on the frontend using local storage.
 */

import { PromptHotkey } from "../types/customPrompts";
import { getLoggingService } from "./loggingService";

export interface CreateHotkeyRequest {
  prompt_code: string;
  combo: string;
}

export interface UpdateHotkeyRequest {
  combo: string;
}

export interface UpdateHotkeyStatusRequest {
  registered: boolean;
}

const HOTKEYS_STORAGE_KEY = "clipify_hotkeys_v1";
const BUILTIN_DEFAULTS: Record<string, string> = {
  REPHRASE: "PRIMARY+SHIFT+KeyC",
  SUMMARIZE: "PRIMARY+SHIFT+KeyS",
  LEGALIFY: "PRIMARY+SHIFT+KeyL",
};

class HotkeyService {
  private memoryHotkeys: PromptHotkey[] = [];

  private getLogger() {
    try {
      return getLoggingService();
    } catch (error) {
      return {
        info: (message: string, ...args: unknown[]) => console.log(message, ...args),
        error: (message: string, ...args: unknown[]) => console.error(message, ...args),
        warn: (message: string, ...args: unknown[]) => console.warn(message, ...args),
        debug: (message: string, ...args: unknown[]) => console.debug(message, ...args),
      };
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return window.localStorage;
    } catch (error) {
      this.getLogger().warn("hotkey", "localStorage unavailable", {
        error: String(error),
      });
      return null;
    }
  }

  private normalizeHotkey(value: any): PromptHotkey | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const promptCode = typeof value.prompt_code === "string" ? value.prompt_code : null;
    const combo = typeof value.combo === "string" ? value.combo : null;

    if (!promptCode || !combo) {
      return null;
    }

    const now = new Date().toISOString();

    return {
      id: typeof value.id === "string" ? value.id : this.generateId(promptCode),
      prompt_code: promptCode,
      combo,
      is_active: value.is_active !== false,
      registered: typeof value.registered === "boolean" ? value.registered : false,
      created_at: typeof value.created_at === "string" ? value.created_at : now,
      updated_at: typeof value.updated_at === "string" ? value.updated_at : now,
    };
  }

  private normalizeHotkeyList(
    list: PromptHotkey[],
  ): { list: PromptHotkey[]; mutated: boolean } {
    let mutated = false;
    const byCode = new Map<string, PromptHotkey>();

    for (const hotkey of list) {
      const key = hotkey.prompt_code.toUpperCase();
      const existing = byCode.get(key);

      if (!existing) {
        byCode.set(key, hotkey);
      } else {
        const existingUpdated = Date.parse(existing.updated_at || "") || 0;
        const candidateUpdated = Date.parse(hotkey.updated_at || "") || 0;

        if (candidateUpdated >= existingUpdated) {
          byCode.set(key, hotkey);
        }
        mutated = true;
      }
    }

    const nowIso = new Date().toISOString();
    for (const [code, combo] of Object.entries(BUILTIN_DEFAULTS)) {
      if (!byCode.has(code)) {
        mutated = true;
        byCode.set(code, {
          id: `builtin-${code}`,
          prompt_code: code,
          combo,
          is_active: true,
          registered: false,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    }

    const normalized = Array.from(byCode.values())
      .map((hotkey) => ({
        ...hotkey,
        prompt_code: hotkey.prompt_code,
        combo: hotkey.combo,
        is_active: hotkey.is_active !== false,
        registered: !!hotkey.registered,
      }))
      .sort((a, b) => a.prompt_code.localeCompare(b.prompt_code));

    return { list: normalized, mutated };
  }

  private readHotkeys(): PromptHotkey[] {
    const storage = this.getStorage();
    let stored = [...this.memoryHotkeys];

    if (storage) {
      try {
        const raw = storage.getItem(HOTKEYS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            stored = parsed
              .map((item) => this.normalizeHotkey(item))
              .filter((item): item is PromptHotkey => item !== null);
          }
        }
      } catch (error) {
        this.getLogger().warn("hotkey", "Failed to parse stored hotkeys", {
          error: String(error),
        });
      }
    }

    const { list: normalized, mutated } = this.normalizeHotkeyList(stored);

    this.memoryHotkeys = [...normalized];

    if (mutated && storage) {
      try {
        storage.setItem(HOTKEYS_STORAGE_KEY, JSON.stringify(normalized));
      } catch (error) {
        this.getLogger().warn("hotkey", "Failed to persist normalized hotkeys", {
          error: String(error),
        });
      }
    }

    return normalized;
  }

  private writeHotkeys(hotkeys: PromptHotkey[]): void {
    this.memoryHotkeys = [...hotkeys];
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(HOTKEYS_STORAGE_KEY, JSON.stringify(hotkeys));
    } catch (error) {
      this.getLogger().warn("hotkey", "Failed to persist hotkeys", {
        error: String(error),
      });
    }
  }

  private generateId(promptCode: string): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    const random = Math.random().toString(36).slice(2, 10);
    return `hk-${promptCode}-${Date.now()}-${random}`;
  }

  async getHotkeys(): Promise<PromptHotkey[]> {
    const hotkeys = this.readHotkeys();
    this.getLogger().info("hotkey", "Loaded hotkeys from local storage", {
      count: hotkeys.length,
    });
    return hotkeys;
  }

  async createHotkey(request: CreateHotkeyRequest): Promise<PromptHotkey> {
    const hotkeys = this.readHotkeys();
    const now = new Date().toISOString();

    const newHotkey: PromptHotkey = {
      id: this.generateId(request.prompt_code),
      prompt_code: request.prompt_code,
      combo: request.combo,
      is_active: true,
      registered: false,
      created_at: now,
      updated_at: now,
    };

    this.writeHotkeys([...hotkeys, newHotkey]);
    this.getLogger().info("hotkey", "Created hotkey", {
      promptCode: request.prompt_code,
    });

    return newHotkey;
  }

  async updateHotkey(id: string, request: UpdateHotkeyRequest): Promise<void> {
    const hotkeys = this.readHotkeys();
    const index = hotkeys.findIndex((h) => h.id === id);

    if (index === -1) {
      throw new Error("Hotkey not found");
    }

    const now = new Date().toISOString();
    const updated: PromptHotkey = {
      ...hotkeys[index],
      combo: request.combo,
      registered: false,
      updated_at: now,
    };

    const next = [...hotkeys];
    next[index] = updated;
    this.writeHotkeys(next);

    this.getLogger().info("hotkey", "Updated hotkey", {
      id,
      promptCode: updated.prompt_code,
    });
  }

  async deleteHotkey(id: string): Promise<void> {
    const hotkeys = this.readHotkeys();
    const next = hotkeys.filter((h) => h.id !== id);

    if (next.length === hotkeys.length) {
      return;
    }

    this.writeHotkeys(next);
    this.getLogger().info("hotkey", "Deleted hotkey", { id });
  }

  async updateHotkeyStatus(id: string, request: UpdateHotkeyStatusRequest): Promise<void> {
    const hotkeys = this.readHotkeys();
    const index = hotkeys.findIndex((h) => h.id === id);

    if (index === -1) {
      return;
    }

    const next = [...hotkeys];
    next[index] = {
      ...next[index],
      registered: request.registered,
      updated_at: new Date().toISOString(),
    };

    this.writeHotkeys(next);
    this.getLogger().debug("hotkey", "Updated hotkey registration status", {
      id,
      registered: request.registered,
    });
  }

  getCachedRegistrationStatus(id: string): boolean | undefined {
    const hotkeys = this.readHotkeys();
    return hotkeys.find((h) => h.id === id)?.registered;
  }
}

let hotkeyServiceInstance: HotkeyService | null = null;

export function getHotkeyService(): HotkeyService {
  if (!hotkeyServiceInstance) {
    hotkeyServiceInstance = new HotkeyService();
  }
  return hotkeyServiceInstance;
}
