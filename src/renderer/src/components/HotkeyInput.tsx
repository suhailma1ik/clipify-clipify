/**
 * Hotkey Input Component
 * Captures keyboard input and converts to normalized hotkey format
 */

import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '../services/platformAdapter';
import { parseHotkeyFromEvent, formatHotkeyForDisplay } from '../utils/hotkeyNormalization';
import { isTauriEnvironment } from '../utils';

interface HotkeyInputProps {
  value: string;
  onChange: (combo: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Input component for capturing hotkey combinations
 * Displays platform-specific formatting and captures keyboard events
 */
const HotkeyInput: React.FC<HotkeyInputProps> = ({
  value,
  onChange,
  placeholder = 'Click to capture hotkey',
  disabled = false,
  className,
  style,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCapturing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCapturing]);

  const handleFocus = async () => {
    if (!disabled) {
      setIsCapturing(true);
      // Suspend all hotkeys to prevent conflicts during capture
      if (isTauriEnvironment()) {
        try {
          await invoke('suspend_all_hotkeys');
          console.log('[HotkeyInput] Suspended all hotkeys for capture');
        } catch (err) {
          console.warn('[HotkeyInput] Failed to suspend hotkeys:', err);
        }
      }
    }
  };

  const handleBlur = async () => {
    setIsCapturing(false);
    // Resume all hotkeys after capture
    if (isTauriEnvironment()) {
      try {
        await invoke('resume_all_hotkeys');
        console.log('[HotkeyInput] Resumed all hotkeys after capture');
      } catch (err) {
        console.warn('[HotkeyInput] Failed to resume hotkeys:', err);
      }
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCapturing) return;

    e.preventDefault();
    e.stopPropagation();

    // Ignore modifier-only keys
    if (['Control', 'Shift', 'Alt', 'Meta', 'Command'].includes(e.key)) {
      return;
    }

    // Parse the hotkey from the event
    const combo = parseHotkeyFromEvent(e.nativeEvent);
    onChange(combo);
    setIsCapturing(false);
    
    // Resume hotkeys before blurring
    if (isTauriEnvironment()) {
      try {
        await invoke('resume_all_hotkeys');
        console.log('[HotkeyInput] Resumed all hotkeys after capture');
      } catch (err) {
        console.warn('[HotkeyInput] Failed to resume hotkeys:', err);
      }
    }
    
    // Blur the input after capturing
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleClick = () => {
    if (!disabled) {
      setIsCapturing(true);
    }
  };

  const displayValue = value ? formatHotkeyForDisplay(value) : '';

  return (
    <input
      ref={inputRef}
      type="text"
      className={className || 'input'}
      value={isCapturing ? 'Press keys...' : displayValue}
      placeholder={placeholder}
      readOnly
      disabled={disabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: isCapturing ? 'inherit' : 'monospace',
        ...style,
      }}
    />
  );
};

export default HotkeyInput;
