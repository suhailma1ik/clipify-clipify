# Notification Permissions (macOS)

## Overview

Clipify now includes automatic notification permission checking for macOS users. When the app detects that notification permissions are not granted, it will show a helpful dialog guiding users to enable them.

## Features

### Automatic Permission Check
- On app startup (macOS only), Clipify checks if notification permissions are granted
- If permissions are missing, a dialog appears after 2 seconds
- The check is non-intrusive and only runs once per session

### User-Friendly Dialog
The permission dialog includes:
- Clear explanation of why notifications are needed
- Step-by-step instructions to enable permissions
- Direct button to open System Settings > Notifications
- Option to dismiss and enable later

### System Integration
- **macOS**: Opens `System Settings > Notifications` directly
- **Windows**: Opens `Settings > Notifications` (if needed)
- **Linux**: Logs message (varies by desktop environment)

## Implementation Details

### Main Process (`src/main/system/notificationPermission.ts`)
- `checkNotificationPermission()`: Checks if notifications are supported and enabled
- `openNotificationSettings()`: Opens system settings to notification preferences
- `requestNotificationPermission()`: Checks permission and shows dialog if needed

### Renderer Process
- `NotificationPermissionDialog`: React component that displays the permission prompt
- `useNotificationPermission`: Hook for managing permission state
- Listens for `notification-permission-required` IPC event from main process

### IPC Communication
- `check-notification-permission`: Check current permission status
- `open-notification-settings`: Open system notification settings
- `notification-permission-required`: Event sent when permission is needed

## User Flow

1. User launches Clipify on macOS
2. After 2 seconds, app checks notification permissions
3. If not granted:
   - Dialog appears with instructions
   - User clicks "Open Settings"
   - System Settings opens to Notifications
   - User finds Clipify and toggles "Allow Notifications" ON
   - User restarts Clipify
4. Notifications now work properly

## Testing

To test the notification permission flow:

1. **Disable notifications for Clipify:**
   - Open System Settings > Notifications
   - Find Clipify in the list
   - Toggle "Allow Notifications" OFF

2. **Launch Clipify:**
   - The permission dialog should appear after 2 seconds
   - Click "Open Settings" to verify it opens System Settings

3. **Re-enable notifications:**
   - Toggle "Allow Notifications" ON in System Settings
   - Restart Clipify
   - Dialog should not appear

## Notes

- The permission check only runs on macOS (where notification permissions are strictly enforced)
- On Windows and Linux, notifications typically work without explicit permission
- The dialog can be dismissed with "Later" - it won't show again until next app launch
- Users must restart Clipify after enabling permissions for changes to take effect
