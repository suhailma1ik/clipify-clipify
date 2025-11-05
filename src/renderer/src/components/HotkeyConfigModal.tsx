/**
 * HotkeyConfigModal Component
 * Modal dialog for configuring custom keyboard shortcuts
 */

import React, { useState, useEffect, useCallback } from 'react';
import HotkeyInput from './HotkeyInput';
import { formatHotkeyForDisplay, validateHotkeyCombo } from '../utils/hotkeyNormalization';
import { buttons, COLORS } from '../styles/AppStyles';

interface HotkeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHotkey: string;
  isCustom: boolean;
  onSave: (newHotkey: string) => Promise<void>;
  onReset: () => Promise<void>;
}

/**
 * Modal dialog for hotkey configuration
 * Provides UI for capturing, validating, and saving custom hotkeys
 */
const HotkeyConfigModal: React.FC<HotkeyConfigModalProps> = ({
  isOpen,
  onClose,
  currentHotkey,
  isCustom,
  onSave,
  onReset,
}) => {
  const [capturedHotkey, setCapturedHotkey] = useState<string>(currentHotkey);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset captured hotkey when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedHotkey(currentHotkey);
      setValidationError(null);
    }
  }, [isOpen, currentHotkey]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isLoading, onClose]);

  // Handle hotkey capture
  const handleHotkeyChange = useCallback((combo: string) => {
    setCapturedHotkey(combo);
    
    // Validate the captured hotkey
    const validation = validateHotkeyCombo(combo);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid hotkey combination');
    } else {
      setValidationError(null);
    }
  }, []);

  // Handle save button click
  const handleSave = async () => {
    // Validate before saving
    const validation = validateHotkeyCombo(capturedHotkey);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid hotkey combination');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(capturedHotkey);
      onClose();
    } catch (error) {
      // Error is handled by the hook and displayed via notification
      console.error('Failed to save hotkey:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reset button click
  const handleReset = async () => {
    setIsLoading(true);
    try {
      await onReset();
      onClose();
    } catch (error) {
      // Error is handled by the hook and displayed via notification
      console.error('Failed to reset hotkey:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const isSaveDisabled = isLoading || !!validationError || capturedHotkey === currentHotkey;
  const isResetDisabled = isLoading || !isCustom;

  return (
    <div
      style={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hotkey-modal-title"
    >
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h3 id="hotkey-modal-title" style={styles.title}>
            Customize Keyboard Shortcut
          </h3>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            style={styles.closeButton}
            aria-label="Close modal"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Current Hotkey Display */}
          <div style={styles.section}>
            <label style={styles.label}>
              Current Shortcut {isCustom && <span style={styles.badge}>Custom</span>}
              {!isCustom && <span style={styles.badgeDefault}>Default</span>}
            </label>
            <div style={styles.currentHotkey}>
              {formatHotkeyForDisplay(currentHotkey)}
            </div>
          </div>

          {/* Hotkey Capture Input */}
          <div style={styles.section}>
            <label htmlFor="hotkey-input" style={styles.label}>
              New Shortcut
            </label>
            <HotkeyInput
              value={capturedHotkey}
              onChange={handleHotkeyChange}
              placeholder="Click and press your desired keys..."
              disabled={isLoading}
              style={styles.input}
            />
            
            {/* Validation Error */}
            {validationError && (
              <div
                style={styles.errorMessage}
                role="alert"
                aria-live="polite"
                id="hotkey-error"
              >
                ⚠️ {validationError}
              </div>
            )}

            {/* Help Text */}
            {!validationError && (
              <div style={styles.helpText}>
                Use at least one modifier key (Ctrl, Cmd, Alt, Shift) and one regular key
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <button
            onClick={handleReset}
            disabled={isResetDisabled}
            style={{
              ...buttons.secondary({ disabled: isResetDisabled }),
              marginRight: 'auto',
            }}
            aria-label="Reset to default hotkey"
            type="button"
          >
            {isLoading ? 'Resetting...' : 'Reset to Default'}
          </button>

          <button
            onClick={handleCancel}
            disabled={isLoading}
            style={buttons.secondary({ disabled: isLoading })}
            aria-label="Cancel without saving"
            type="button"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            style={buttons.primary({ disabled: isSaveDisabled })}
            aria-label="Save custom hotkey"
            type="button"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    backdropFilter: 'blur(2px)',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: '16px',
    width: '90vw',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    color: COLORS.text,
    fontSize: '20px',
    fontWeight: 700,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: COLORS.muted,
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
    transition: 'color 0.2s ease',
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: COLORS.text,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    background: COLORS.primaryLight,
    color: COLORS.primary,
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  badgeDefault: {
    background: '#f3f4f6',
    color: COLORS.muted,
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  currentHotkey: {
    padding: '12px 16px',
    background: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'monospace',
    color: COLORS.text,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  errorMessage: {
    color: '#d32f2f',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  helpText: {
    color: COLORS.muted,
    fontSize: '13px',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    alignItems: 'center',
  },
};

export default HotkeyConfigModal;
