import { useCallback, useRef } from "react";
import { getApiClient } from "../services/apiClient";
import {
  writeToClipboard,
  addToClipboardHistory,
} from "../utils/clipboardUtils";
import {
  statusMessages,
  getCurrentTimestamp,
  resetStatusAfterDelay,
} from "../utils/statusUtils";
import { getAuthErrorHandler } from "../services/authErrorHandler";
import { TemplateProcessor } from "../utils/templateProcessor";
import { CustomPrompt } from "../types/customPrompts";

interface UseAutoProcessProps {
  showNotification: (
    message: string,
    type: "success" | "error" | "info"
  ) => void;
  setShortcutStatus: (status: string) => void;
  customPrompts?: CustomPrompt[]; // Custom prompts for template lookup
}

// Built-in action codes
const BUILTIN_CODES = new Set(["REPHRASE", "SUMMARIZE", "LEGALIFY"]);

type AutoProcessEvent = {
  code: string;
  text: string;
};

export const useAutoProcess = ({
  showNotification,
  setShortcutStatus,
  customPrompts = [],
}: UseAutoProcessProps) => {
  const authErrorHandler = getAuthErrorHandler();
  const lastRequestTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const DEBOUNCE_DELAY = 1000; // ms
  const TEXT_PREVIEW_LENGTH = 50; // Characters to show in notification

  /**
   * Truncate text for notification preview
   */
  const getTextPreview = (
    text: string,
    maxLength: number = TEXT_PREVIEW_LENGTH
  ): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  /**
   * Check if a code is a built-in prompt
   */
  const isBuiltinCode = (code: string): boolean => {
    return BUILTIN_CODES.has(code.toUpperCase());
  };

  /**
   * Find custom prompt by code
   */
  const findCustomPrompt = (code: string): CustomPrompt | undefined => {
    return customPrompts.find((p) => p.id === code && p.is_active);
  };

  /**
   * Process built-in prompt (REPHRASE, SUMMARIZE)
   */
  const processBuiltinPrompt = async (
    code: string,
    text: string
  ): Promise<string> => {
    const api = getApiClient();
    const options = code === "SUMMARIZE" ? { mode: "concise" } : undefined;
    const resp = await api.processWithCode(text, code, options);

    const output =
      (resp?.data && (resp.data.output || resp.data.rephrased_text)) || "";
    if (!output.trim()) {
      throw new Error("Empty response from processing endpoint");
    }

    return output;
  };

  /**
   * Process custom prompt
   */
  const processCustomPrompt = async (
    prompt: CustomPrompt,
    text: string
  ): Promise<string> => {
    // Check if online
    if (!navigator.onLine) {
      throw new Error(
        "No internet connection. Custom prompts require an active internet connection."
      );
    }

    // Process template with input text
    const processedPrompt = TemplateProcessor.process(prompt.template, text);

    // Call unified process endpoint
    const api = getApiClient();
    const resp = await api.post("/api/v1/protected/process", {
      input: text,
      prompt: processedPrompt,
    });

    const output = resp?.data?.output || "";
    if (!output.trim()) {
      throw new Error("Empty response from processing endpoint");
    }

    return output;
  };

  const setupAutoProcessListener = useCallback(async () => {
    try {
      const { listen } = await import("../services/platformAdapter");

      const unlisten = await listen<any>("auto-process-request", async (receivedPayload) => {
        const payload = receivedPayload as AutoProcessEvent;
        const text = payload?.text || "";
        const code = payload?.code || "";
        const currentTime = Date.now();

        console.log("[useAutoProcess] Request received:", {
          code,
          textLength: text.length,
        });

        if (!text.trim()) {
          console.log("[useAutoProcess] Empty text, ignoring");
          return;
        }

        // Debounce & in-flight guard
        if (isProcessingRef.current) {
          console.log("[useAutoProcess] Already processing, ignoring");
          return;
        }
        if (currentTime - lastRequestTimeRef.current < DEBOUNCE_DELAY) {
          console.log("[useAutoProcess] Debouncing, ignoring");
          return;
        }

        lastRequestTimeRef.current = currentTime;
        isProcessingRef.current = true;

        try {
          // Show optimistic processing notification with text preview
          const textPreview = getTextPreview(text);
          setShortcutStatus(statusMessages.rephrasing);
          showNotification(`🔄 Processing: "${textPreview}"`, "info");

          // Ensure token is present
          let currentJwtToken: string | null = null;
          try {
            currentJwtToken = getApiClient().getJwtToken();
          } catch (e) {
            console.error("[useAutoProcess] API client not initialized:", e);
            setShortcutStatus(statusMessages.tokenRequired);
            showNotification("API client not initialized", "error");
            return;
          }
          if (!currentJwtToken) {
            setShortcutStatus(statusMessages.tokenRequired);
            showNotification(
              "Authentication is required for shortcut",
              "error"
            );
            return;
          }

          // Determine if this is a built-in or custom prompt
          const codeUpper = code.toUpperCase();
          let output: string;
          let promptName: string;
          let promptAction: string;

          if (isBuiltinCode(codeUpper)) {
            // Process built-in prompt
            console.log(
              "[useAutoProcess] Processing built-in prompt:",
              codeUpper
            );
            output = await processBuiltinPrompt(codeUpper, text);

            // Map code to display names
            if (codeUpper === "SUMMARIZE") {
              promptName = "Summary";
              promptAction = "Summarize";
            } else if (codeUpper === "LEGALIFY") {
              promptName = "Legalized text";
              promptAction = "Legalify";
            } else {
              promptName = "Rephrased text";
              promptAction = "Rephrase";
            }
          } else {
            // Try to find custom prompt
            const customPrompt = findCustomPrompt(code);
            if (!customPrompt) {
              throw new Error(`Unknown prompt code: ${code}`);
            }

            console.log(
              "[useAutoProcess] Processing custom prompt:",
              customPrompt.name
            );
            output = await processCustomPrompt(customPrompt, text);
            promptName = customPrompt.name;
            promptAction = `Custom: ${customPrompt.name}`;
          }

          // Write to clipboard and add to history with prompt action tracking
          await writeToClipboard(output);

          // Show completion notification with result preview
          const resultPreview = getTextPreview(output);
          const emoji =
            codeUpper === "SUMMARIZE"
              ? "📝"
              : codeUpper === "LEGALIFY"
              ? "⚖️"
              : "✓";
          setShortcutStatus(statusMessages.success(getCurrentTimestamp()));
          showNotification(
            `${emoji} ${promptName}: "${resultPreview}"`,
            "success"
          );

          await addToClipboardHistory(output, true, text, promptAction);
        } catch (error) {
          console.error("[useAutoProcess] Failed to process:", error);
          const message =
            error instanceof Error ? error.message : "Unknown error";

          if (error instanceof Error && authErrorHandler.isAuthError(error)) {
            await authErrorHandler.handleAuthError(error, "useAutoProcess");
            showNotification(
              "Authentication expired. Please log in again.",
              "error"
            );
          } else {
            setShortcutStatus(statusMessages.error(message));
            showNotification(`Failed to process text: ${message}`, "error");
          }
        } finally {
          isProcessingRef.current = false;
          resetStatusAfterDelay(setShortcutStatus);
        }
      });

      console.log("[useAutoProcess] Event listener setup complete");
      return unlisten;
    } catch (error) {
      console.error("[useAutoProcess] Failed to setup listener:", error);
    }
  }, [showNotification, setShortcutStatus, customPrompts]);

  return { setupAutoProcessListener };
};
