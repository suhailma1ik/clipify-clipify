import React, { useState } from 'react';
import { GlobalShortcutProps } from '../types';
import { commonStyles } from '../utils';
import { getShortcutLabel } from '../utils/platform';
import HotkeyConfigModal from './HotkeyConfigModal';
import { useHotkeyConfig } from '../hooks/useHotkeyConfig';
import { formatHotkeyForDisplay } from '../utils/hotkeyNormalization';

const GlobalShortcut: React.FC<GlobalShortcutProps> = ({ shortcutStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentHotkey, isCustom, saveHotkey, resetToDefault } = useHotkeyConfig();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Parse the current hotkey to display individual keys
  const displayHotkey = formatHotkeyForDisplay(currentHotkey);
  const hotkeyParts = displayHotkey.split('+').map(part => part.trim());

  return (
    <div style={commonStyles.card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          borderRadius: '12px',
          padding: '10px',
          marginRight: '16px',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}>
          <span style={{ fontSize: '24px' }}>⌨️</span>
        </div>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '22px', fontWeight: '800' }}>Quick Capture</h2>
          <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Press {getShortcutLabel()} anywhere</p>
        </div>
      </div>
      
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: shortcutStatus.includes("✅") ? 'linear-gradient(135deg, #e8f5e8, #f0fff0)' : 
                   shortcutStatus.includes("❌") ? 'linear-gradient(135deg, #ffe8e8, #fff5f5)' : 'linear-gradient(135deg, #e8f0ff, #f0f8ff)',
        border: shortcutStatus.includes("✅") ? '2px solid #4caf50' : 
               shortcutStatus.includes("❌") ? '2px solid #f44336' : '2px solid #667eea',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: shortcutStatus.includes("✅") ? 'radial-gradient(circle at 50% 50%, rgba(76, 175, 80, 0.1), transparent)' :
                     shortcutStatus.includes("❌") ? 'radial-gradient(circle at 50% 50%, rgba(244, 67, 54, 0.1), transparent)' : 'radial-gradient(circle at 50% 50%, rgba(102, 126, 234, 0.1), transparent)',
          animation: shortcutStatus.includes("✅") || shortcutStatus.includes("❌") ? 'pulse 2s ease-in-out infinite' : 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '16px',
            fontWeight: '600',
            color: shortcutStatus.includes("✅") ? '#2e7d32' : 
                   shortcutStatus.includes("❌") ? '#c62828' : '#1565c0'
          }}>
            <span style={{ marginRight: '12px', fontSize: '20px' }}>
              {shortcutStatus.includes("✅") ? '🎉' : shortcutStatus.includes("❌") ? '⚠️' : '🔄'}
            </span>
            {shortcutStatus}
          </div>
        </div>
      </div>
      
      <div style={{
        marginTop: '16px',
        padding: '16px',
        background: 'linear-gradient(45deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
        borderRadius: '10px',
        border: '1px solid rgba(102, 126, 234, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#4a5568',
          fontWeight: '500'
        }}>
          {hotkeyParts.map((part, index) => (
            <React.Fragment key={index}>
              <kbd style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                marginRight: index < hotkeyParts.length - 1 ? '4px' : '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>{part}</kbd>
              {index < hotkeyParts.length - 1 && <span style={{ margin: '0 4px' }}>+</span>}
            </React.Fragment>
          ))}
          → Capture & Clean Text Instantly
        </div>
      </div>

      {/* Customize Shortcut Button */}
      <button
        onClick={handleOpenModal}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '12px 16px',
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        }}
        aria-label="Customize keyboard shortcut"
      >
        <span style={{ fontSize: '16px' }}>⚙️</span>
        Customize Shortcut
        {isCustom && <span style={{
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600'
        }}>Custom</span>}
      </button>

      {/* Hotkey Configuration Modal */}
      <HotkeyConfigModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        currentHotkey={currentHotkey}
        isCustom={isCustom}
        onSave={saveHotkey}
        onReset={resetToDefault}
      />
    </div>
  );
};

export default GlobalShortcut;