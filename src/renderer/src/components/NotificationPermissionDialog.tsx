import React, { useEffect, useState } from 'react'

interface NotificationPermissionDialogProps {
  onClose?: () => void
}

export const NotificationPermissionDialog: React.FC<NotificationPermissionDialogProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Listen for notification permission required event from main process
    const handlePermissionRequired = () => {
      setIsVisible(true)
    }

    // @ts-ignore - Electron IPC
    const cleanup = window.electron?.onNotificationPermissionRequired?.(handlePermissionRequired)

    return () => {
      cleanup?.()
    }
  }, [])

  const handleOpenSettings = () => {
    // Call main process to open system settings
    // @ts-ignore - Electron IPC
    window.electron?.openNotificationSettings?.()
    setIsVisible(false)
    onClose?.()
  }

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#333' }}>
            🔔 Enable Notifications
          </h2>
        </div>
        
        <div style={{ marginBottom: '24px', color: '#666', lineHeight: '1.5' }}>
          <p style={{ margin: '0 0 12px 0' }}>
            Clipify needs notification permissions to keep you updated about clipboard operations and important events.
          </p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Click "Open Settings" to enable notifications in System Settings.
          </p>
        </div>

        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#555'
        }}>
          <strong>Steps:</strong>
          <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Click "Open Settings" below</li>
            <li>Find "Clipify" in the list</li>
            <li>Toggle "Allow Notifications" ON</li>
            <li>Restart Clipify</li>
          </ol>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Later
          </button>
          <button
            onClick={handleOpenSettings}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#007AFF',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Open Settings
          </button>
        </div>
      </div>
    </div>
  )
}
