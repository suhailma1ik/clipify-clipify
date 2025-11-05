import { systemPreferences } from 'electron';
import * as os from 'os';

/**
 * Permission check result
 */
export interface PermissionStatus {
  granted: boolean;
  message: string;
  needsRestart?: boolean;
}

/**
 * Check if the application has accessibility permissions (macOS only)
 * On Windows/Linux, always returns granted=true
 */
export function checkAccessibilityPermissions(): PermissionStatus {
  if (process.platform !== 'darwin') {
    return {
      granted: true,
      message: 'Accessibility permissions not required on this platform'
    };
  }

  const granted = systemPreferences.isTrustedAccessibilityClient(false);
  
  return {
    granted,
    message: granted 
      ? 'Accessibility permissions granted' 
      : 'Accessibility permissions required for global hotkeys and keyboard simulation'
  };
}

/**
 * Request accessibility permissions (macOS only)
 * This will prompt the user to grant permissions if not already granted
 */
export function requestAccessibilityPermissions(): PermissionStatus {
  if (process.platform !== 'darwin') {
    return {
      granted: true,
      message: 'Accessibility permissions not required on this platform'
    };
  }

  // Calling with true will prompt the user if not already granted
  const granted = systemPreferences.isTrustedAccessibilityClient(true);
  
  return {
    granted,
    message: granted 
      ? 'Accessibility permissions granted' 
      : 'Please grant accessibility permissions in System Preferences',
    needsRestart: !granted
  };
}

/**
 * Get macOS version string
 * Returns null on non-macOS platforms
 */
export function getMacOSVersion(): string | null {
  if (process.platform !== 'darwin') {
    return null;
  }

  try {
    const release = os.release();
    // Parse Darwin version to macOS version
    // Darwin 20.x = macOS 11.x (Big Sur)
    // Darwin 21.x = macOS 12.x (Monterey)
    // Darwin 22.x = macOS 13.x (Ventura)
    // Darwin 23.x = macOS 14.x (Sonoma)
    const darwinVersion = parseInt(release.split('.')[0], 10);
    
    if (darwinVersion >= 20) {
      const macOSVersion = darwinVersion - 9;
      return `macOS ${macOSVersion}.x`;
    }
    
    return `macOS (Darwin ${release})`;
  } catch (error) {
    console.error('Error getting macOS version:', error);
    return null;
  }
}

/**
 * Get platform-specific instructions for granting accessibility permissions
 */
export function getAccessibilityInstructions(): string {
  if (process.platform === 'darwin') {
    const version = getMacOSVersion();
    
    return `To enable global hotkeys and keyboard simulation, Clipify needs accessibility permissions.

Steps to grant permissions:
1. Open System Preferences (or System Settings on ${version || 'newer macOS'})
2. Go to Security & Privacy → Privacy → Accessibility
3. Click the lock icon to make changes
4. Find Clipify in the list and check the box
5. If Clipify is not in the list, click the + button and add it
6. Restart Clipify for changes to take effect

Note: You may need to restart the application after granting permissions.`;
  }
  
  if (process.platform === 'win32') {
    return 'Accessibility permissions are not required on Windows. Global hotkeys should work automatically.';
  }
  
  return 'Accessibility permissions are not required on Linux. Global hotkeys should work automatically.';
}
