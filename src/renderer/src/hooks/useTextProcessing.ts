import { useState, useRef, useCallback } from 'react';
import { writeClipboard as writeText } from '../services/platformAdapter';
import { rephraseService, isRephraseError } from '../services/rephraseService';
import { addToClipboardHistory } from '../utils/clipboardUtils';
import { NotificationType } from './useNotification';

export const useTextProcessing = (
  showNotification: (message: string, type: NotificationType) => void,
  loadClipboardHistory: () => void
) => {
  const [cleanedText, setCleanedText] = useState<string>("");
  const [rephrasedText, setRephrasedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const lastValueRef = useRef<string>("");
  const lastRephraseTimeRef = useRef<number>(0);

  // Auto-rephrase function with debouncing
  const autoRephrase = useCallback(async (text: string) => {
    const now = Date.now();
    const timeSinceLastRephrase = now - lastRephraseTimeRef.current;

    // Debounce: ignore if less than 500ms since last rephrase
    if (timeSinceLastRephrase < 500) {
      console.log('Debouncing rephrase request');
      return;
    }

    lastRephraseTimeRef.current = now;

    setIsRephrasing(true);

    try {
      console.log('Starting auto-rephrase for text:', text.substring(0, 100) + '...');
      // Use exact API specification from user requirements
      const response = await rephraseService.rephrase(
        text,
        'formal',
        'Business communication',
        'Colleagues',
        false
      );

      // Update clipboard with rephrased text
      await writeText(response.rephrased_text);
      setRephrasedText(response.rephrased_text);
      lastValueRef.current = response.rephrased_text;

      // Add to clipboard history with prompt action
      await addToClipboardHistory(
        response.rephrased_text,
        true, // is_cleaned
        text, // original_content
        'Rephrase' // prompt_action
      );

      // Note: Notification is handled by useAutoRephrase hook to prevent duplicates

      // Reload clipboard history to show new entry
      await loadClipboardHistory();
    } catch (error) {
      console.error('Rephrase failed:', error);

      if (isRephraseError(error)) {
        showNotification(`Rephrase failed ❌ ${error.message}`, 'error');
      } else {
        showNotification('Rephrase failed ❌ Unknown error', 'error');
      }
    } finally {
      setIsRephrasing(false);
    }
  }, [showNotification, loadClipboardHistory]);

  const processClipboardText = useCallback(async () => {
    setIsProcessing(true);
    try {
      const clipboardText = await navigator.clipboard.readText();
      const cleaned = clipboardText.trim();

      if (cleaned && cleaned !== lastValueRef.current) {
        setCleanedText(cleaned);
        lastValueRef.current = cleaned;

        // Auto-rephrase if enabled and text is substantial
        if (cleaned.length > 10) {
          await autoRephrase(cleaned);
        }
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [autoRephrase]);

  const copyRephrasedText = useCallback(async () => {
    if (rephrasedText) {
      await writeText(rephrasedText);
      
      // Add to clipboard history with prompt action
      await addToClipboardHistory(
        rephrasedText,
        true, // is_cleaned
        cleanedText, // original_content
        'Manual Rephrase' // prompt_action
      );
      
      showNotification('Rephrased text copied to clipboard ✅', 'success');
    }
  }, [rephrasedText, cleanedText, showNotification]);

  const clearTexts = useCallback(() => {
    setCleanedText("");
    setRephrasedText("");
    lastValueRef.current = "";
  }, []);

  return {
    cleanedText,
    rephrasedText,
    isProcessing,
    isRephrasing,
    setCleanedText,
    setRephrasedText,
    processClipboardText,
    copyRephrasedText,
    clearTexts
  };
};
