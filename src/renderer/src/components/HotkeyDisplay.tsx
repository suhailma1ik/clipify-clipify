/**
 * Hotkey Display Component
 * Displays hotkey combinations with platform-specific formatting
 */

import React from 'react';
import { formatHotkeyForDisplay } from '../utils/hotkeyNormalization';

interface HotkeyDisplayProps {
  combo: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Display a hotkey combination with platform-specific formatting
 * Example: "PRIMARY+SHIFT+KeyC" -> "Cmd+Shift+C" on macOS, "Ctrl+Shift+C" on Windows
 */
const HotkeyDisplay: React.FC<HotkeyDisplayProps> = ({ combo, className, style }) => {
  const displayText = formatHotkeyForDisplay(combo);
  const keys = displayText.split('+');

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: 'monospace',
        fontSize: '13px',
        ...style,
      }}
    >
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd
            style={{
              padding: '2px 6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {key}
          </kbd>
          {index < keys.length - 1 && <span style={{ opacity: 0.5 }}>+</span>}
        </React.Fragment>
      ))}
    </span>
  );
};

export default HotkeyDisplay;
