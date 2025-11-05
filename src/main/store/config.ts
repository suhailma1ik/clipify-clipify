import Store from 'electron-store';
import { safeStorage } from 'electron';

/**
 * Token metadata interface
 */
export interface TokenMetadata {
  expiresAt?: number;      // Unix timestamp
  tokenType: string;       // e.g., "Bearer"
  scope?: string;          // OAuth scopes
  issuedAt: number;        // Unix timestamp
}

/**
 * User information interface
 */
export interface UserInfo {
  id: string;              // User ID from backend
  email: string;           // User email
  name?: string;           // Display name
  avatar?: string;         // Avatar URL
  plan?: string;           // Subscription plan
}

/**
 * Store schema definition
 */
interface StoreSchema {
  accessToken?: string;
  refreshToken?: string;
  tokenMetadata?: TokenMetadata;
  userInfo?: UserInfo;
}

// Initialize electron-store with encryption
const store = new Store<StoreSchema>({
  name: 'clipify-secure-storage',
  encryptionKey: 'clipify-encryption-key-v1',
  clearInvalidConfig: true
});

/**
 * Store access token with safeStorage encryption if available
 */
export function storeAccessToken(token: string): void {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(token);
      store.set('accessToken', buffer.toString('base64'));
    } else {
      // Fallback to electron-store encryption
      store.set('accessToken', token);
    }
  } catch (error) {
    console.error('Failed to store access token:', error);
    throw new Error('Failed to store access token');
  }
}

/**
 * Get access token with safeStorage decryption if available
 */
export function getAccessToken(): string | null {
  try {
    const stored = store.get('accessToken');
    if (!stored) return null;

    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(stored, 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      return decrypted;
    } else {
      // Fallback to electron-store encryption
      return stored;
    }
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Store refresh token with safeStorage encryption if available
 */
export function storeRefreshToken(token: string): void {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(token);
      store.set('refreshToken', buffer.toString('base64'));
    } else {
      // Fallback to electron-store encryption
      store.set('refreshToken', token);
    }
  } catch (error) {
    console.error('Failed to store refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
}

/**
 * Get refresh token with safeStorage decryption if available
 */
export function getRefreshToken(): string | null {
  try {
    const stored = store.get('refreshToken');
    if (!stored) return null;

    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(stored, 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      return decrypted;
    } else {
      // Fallback to electron-store encryption
      return stored;
    }
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Store token metadata
 */
export function storeTokenMetadata(metadata: TokenMetadata): void {
  try {
    store.set('tokenMetadata', metadata);
  } catch (error) {
    console.error('Failed to store token metadata:', error);
    throw new Error('Failed to store token metadata');
  }
}

/**
 * Get token metadata
 */
export function getTokenMetadata(): TokenMetadata | null {
  try {
    return store.get('tokenMetadata') || null;
  } catch (error) {
    console.error('Failed to get token metadata:', error);
    return null;
  }
}

/**
 * Store user information
 */
export function storeUserInfo(user: UserInfo): void {
  try {
    store.set('userInfo', user);
  } catch (error) {
    console.error('Failed to store user info:', error);
    throw new Error('Failed to store user info');
  }
}

/**
 * Get user information
 */
export function getUserInfo(): UserInfo | null {
  try {
    return store.get('userInfo') || null;
  } catch (error) {
    console.error('Failed to get user info:', error);
    return null;
  }
}

/**
 * Clear all tokens and user data
 */
export function clearAllTokens(): void {
  try {
    store.delete('accessToken');
    store.delete('refreshToken');
    store.delete('tokenMetadata');
    store.delete('userInfo');
  } catch (error) {
    console.error('Failed to clear tokens:', error);
    throw new Error('Failed to clear tokens');
  }
}

/**
 * Check if a valid access token exists
 */
export function hasValidAccessToken(): boolean {
  try {
    const token = getAccessToken();
    if (!token) return false;

    const metadata = getTokenMetadata();
    if (!metadata) return false;

    // Check if token has expired
    if (metadata.expiresAt) {
      const now = Date.now();
      return now < metadata.expiresAt;
    }

    // If no expiry time, assume token is valid
    return true;
  } catch (error) {
    console.error('Failed to check token validity:', error);
    return false;
  }
}
