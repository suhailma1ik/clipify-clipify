import { invoke, listen, writeClipboard as platformWriteClipboard } from "../services/platformAdapter";
import { isTauriEnvironment } from "./index";
import { FEATURE_SUMMARIZATION } from "./featureFlags";

/**
 * Setup global shortcut for clipboard monitoring using Tauri v2 API
 * This function now uses the frontend API instead of backend commands
 */
export const setupGlobalShortcut = async (): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.warn("Global shortcuts not available in browser environment");
    return;
  }

  try {
    const shortcut = "CommandOrControl+Shift+C";

    // Prefer the backend-registered hotkey. If it's already registered in Rust,
    // skip frontend registration to avoid conflicts and accidental unregistration.
    let backendRegistered = false;
    try {
      const status: any = await invoke("check_hotkey_registration_status");
      backendRegistered = !!(status && (status as any).is_registered);
      if (backendRegistered) {
        console.log(
          "Backend hotkey is already registered; skipping frontend registration for Cmd/Ctrl+Shift+C",
        );
      }
    } catch (sErr) {
      console.warn("Could not verify backend hotkey registration status:", sErr);
    }

    // Check accessibility permissions first
    try {
      await invoke("check-accessibility-permissions");
      console.log("Accessibility permissions verified");
    } catch (error) {
      throw new Error(
        "Accessibility permissions required. Please grant permissions through the UI."
      );
    }

    // Only register the main rephrase hotkey on the frontend if the backend
    // did not already register it. When we handle it here, emit the
    // auto-rephrase-request event after obtaining cleaned text so the
    // useAutoRephrase hook can call the backend API.
    if (!backendRegistered) {
      // Helper to perform registration for rephrase (Cmd/Ctrl+Shift+C)
      const doRegister = async () => {
        await register(shortcut, async (event) => {
          console.log("Global shortcut triggered:", event);
          if (event.state === "Released") {
            try {
              const cleaned = (await invoke<string>("trigger_clipboard_copy")) || "";
              const text = typeof cleaned === "string" ? cleaned : "";
              if (text.trim().length > 0) {
                // Emit event using Electron IPC
                await invoke("emit-event", "auto-rephrase-request", text);
              }
            } catch (err) {
              console.error("Failed to copy and emit rephrase request:", err);
            }
          }
        });
      };

      // Register the global shortcut using Tauri v2 API
      try {
        await doRegister();
        console.log("Global shortcut registered successfully using Tauri v2 API");
      } catch (regErr) {
        // If registration fails (e.g., already registered by another handler),
        // do not attempt to unregister blindly to avoid removing backend handler.
        console.warn("Frontend shortcut registration skipped:", regErr);
      }
    }

    // Optionally register Summarize shortcut when feature is enabled
    if (FEATURE_SUMMARIZATION) {
      const summarizeShortcut = "CommandOrControl+Shift+S";

      // Pre-clean any existing binding
      try {
        const alreadyRegisteredS = await isRegistered(summarizeShortcut);
        if (alreadyRegisteredS) {
          console.log(
            `Global shortcut ${summarizeShortcut} already registered. Unregistering before re-registering...`
          );
          await unregister(summarizeShortcut);
        }
      } catch (preErr) {
        console.warn(
          "Could not check/unregister existing summarize shortcut before registering:",
          preErr
        );
      }

      const registerSummarize = async () => {
        await register(summarizeShortcut, (event) => {
          console.log("Summarize shortcut triggered:", event);
          if (event.state === "Released") {
            invoke("trigger_clipboard_copy_action", { code: "SUMMARIZE" }).catch(
              (err) => {
                console.error("Failed to trigger summarize action:", err);
              }
            );
          }
        });
      };

      try {
        await registerSummarize();
      } catch (regErr) {
        const msg = regErr instanceof Error ? regErr.message : String(regErr);
        if (msg.includes("RegisterEventHotKey failed")) {
          console.warn(
            "RegisterEventHotKey failed for summarize. Attempting to unregister and retry once..."
          );
          try {
            await unregister(summarizeShortcut);
          } catch (unregErr) {
            console.warn(
              "Unregister on summarize failure also failed (may not be previously registered by us):",
              unregErr
            );
          }
          await registerSummarize();
        } else {
          throw regErr;
        }
      }

      console.log("Summarize shortcut registered successfully");
    }
  } catch (error) {
    console.error("Failed to register global shortcut:", error);
    throw error;
  }
};

/**
 * Write text to clipboard
 */
export const writeToClipboard = async (text: string): Promise<void> => {
  try {
    if (isTauriEnvironment()) {
      await platformWriteClipboard(text);
    } else {
      // Browser fallback using native clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    console.error("Failed to write to clipboard:", error);
    throw error;
  }
};

/**
 * Add entry to clipboard history with optional prompt action
 */
export const addToClipboardHistory = async (
  content: string,
  is_cleaned: boolean = false,
  original_content?: string,
  prompt_action?: string
): Promise<void> => {
  try {
    if (isTauriEnvironment()) {
      await invoke("add_to_clipboard_history", {
        content,
        is_cleaned,
        original_content: original_content || null,
        prompt_action: prompt_action || null,
      });
    }
  } catch (error) {
    console.error("Failed to add to clipboard history:", error);
    throw error;
  }
};
