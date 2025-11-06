import { invoke } from '../services/platformAdapter';

export interface ProtocolRegistrationStatus {
  scheme: string;
  is_registered: boolean;
  error?: string;
}

export interface DeepLinkDiagnostics {
  protocols: ProtocolRegistrationStatus[];
  tauri_version: string;
  environment: string;
  last_error?: string;
  event_listener_active: boolean;
}

/**
 * Check if deeplink protocols are properly registered on Windows
 */
export async function checkWindowsDeepLinkRegistration(): Promise<DeepLinkDiagnostics> {
  try {
    // Align with main handler name
    return await invoke<DeepLinkDiagnostics>('verify-deep-link-protocols');
  } catch (error) {
    console.error('Failed to check deeplink registration:', error);
    throw error;
  }
}

/**
 * Check registration status for a specific protocol
 */
export async function checkProtocolRegistration(scheme: string): Promise<ProtocolRegistrationStatus> {
  try {
    // Align with main handler name and argument shape
    return await invoke<ProtocolRegistrationStatus>('check-protocol-registration', scheme);
  } catch (error) {
    console.error(`Failed to check protocol registration for ${scheme}:`, error);
    throw error;
  }
}

/**
 * Attempt to register deeplink protocols on Windows (requires admin privileges)
 */
export async function registerWindowsProtocols(): Promise<string[]> {
  // Registration is handled by the app on startup via app.setAsDefaultProtocolClient
  // Provide a deterministic message instead of attempting unsupported operations from renderer
  return [
    'clipify: Registration attempted automatically on startup. If not registered, run the installer or start as Administrator.'
  ];
}

/**
 * Show Windows deeplink diagnostic information
 */
export async function showWindowsDeepLinkDiagnostics(): Promise<void> {
  try {
    const diagnostics = await checkWindowsDeepLinkRegistration();
    
    console.group('🔗 Windows DeepLink Diagnostics');
    console.log('Tauri Version:', diagnostics.tauri_version);
    console.log('Environment:', diagnostics.environment);
    console.log('Event Listener Active:', diagnostics.event_listener_active);
    
    if (diagnostics.last_error) {
      console.error('Last Error:', diagnostics.last_error);
    }
    
    console.group('Protocol Registration Status:');
    diagnostics.protocols.forEach(protocol => {
      const status = protocol.is_registered ? '✅ Registered' : '❌ Not Registered';
      console.log(`${protocol.scheme}://`, status);
      if (protocol.error) {
        console.warn(`  Error: ${protocol.error}`);
      }
    });
    console.groupEnd();
    
    // Check if any protocols are not registered
    const unregistered = diagnostics.protocols.filter(p => !p.is_registered);
    if (unregistered.length > 0) {
      console.warn('⚠️ Some protocols are not registered. Consider running as administrator and calling registerWindowsProtocols()');
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Failed to show diagnostics:', error);
  }
}

/**
 * Test deeplink functionality by opening a test URL
 */
export async function testDeepLink(scheme: string = 'clipify', testData: string = 'test-auth-callback'): Promise<void> {
  const testUrl = `${scheme}://${testData}`;
  try {
    // Use Electron main handler name and expected argument shape
    await invoke('open-url', testUrl);
    console.log(`🧪 Testing deeplink: ${testUrl}`);
  } catch (error) {
    console.error('Failed to test deeplink:', error);
    // Fallback: try to open with window.open (may not work for custom protocols)
    window.open(testUrl, '_self');
  }
}

/**
 * Initialize Windows deeplink diagnostics on app startup
 */
export async function initializeWindowsDeepLinkDiagnostics(): Promise<void> {
  // Only run diagnostics on Windows
  if (navigator.platform.toLowerCase().includes('win')) {
    console.log('🪟 Windows detected - Running deeplink diagnostics...');
    await showWindowsDeepLinkDiagnostics();
  }
}