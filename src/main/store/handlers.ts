import { ipcMain } from 'electron';
import {
  storeAccessToken,
  getAccessToken,
  storeRefreshToken,
  getRefreshToken,
  storeTokenMetadata,
  getTokenMetadata,
  storeUserInfo,
  getUserInfo,
  clearAllTokens,
  hasValidAccessToken,
  TokenMetadata,
  UserInfo
} from './config';

/**
 * Register all token storage IPC handlers
 */
export function registerStorageHandlers(): void {
  // Store access token
  ipcMain.handle('store-access-token', async (_event, token: string) => {
    try {
      storeAccessToken(token);
      return { success: true };
    } catch (error) {
      console.error('IPC: store-access-token failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store access token' 
      };
    }
  });

  // Get access token
  ipcMain.handle('get-access-token', async () => {
    try {
      const token = getAccessToken();
      return { success: true, token };
    } catch (error) {
      console.error('IPC: get-access-token failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get access token',
        token: null
      };
    }
  });

  // Store refresh token
  ipcMain.handle('store-refresh-token', async (_event, token: string) => {
    try {
      storeRefreshToken(token);
      return { success: true };
    } catch (error) {
      console.error('IPC: store-refresh-token failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store refresh token' 
      };
    }
  });

  // Get refresh token
  ipcMain.handle('get-refresh-token', async () => {
    try {
      const token = getRefreshToken();
      return { success: true, token };
    } catch (error) {
      console.error('IPC: get-refresh-token failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get refresh token',
        token: null
      };
    }
  });

  // Store token metadata
  ipcMain.handle('store-token-metadata', async (_event, metadata: TokenMetadata) => {
    try {
      storeTokenMetadata(metadata);
      return { success: true };
    } catch (error) {
      console.error('IPC: store-token-metadata failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store token metadata' 
      };
    }
  });

  // Get token metadata
  ipcMain.handle('get-token-metadata', async () => {
    try {
      const metadata = getTokenMetadata();
      return { success: true, metadata };
    } catch (error) {
      console.error('IPC: get-token-metadata failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get token metadata',
        metadata: null
      };
    }
  });

  // Store user info
  ipcMain.handle('store-user-info', async (_event, user: UserInfo) => {
    try {
      storeUserInfo(user);
      return { success: true };
    } catch (error) {
      console.error('IPC: store-user-info failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store user info' 
      };
    }
  });

  // Get user info
  ipcMain.handle('get-user-info', async () => {
    try {
      const user = getUserInfo();
      return { success: true, user };
    } catch (error) {
      console.error('IPC: get-user-info failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get user info',
        user: null
      };
    }
  });

  // Clear all tokens
  ipcMain.handle('clear-all-tokens', async () => {
    try {
      clearAllTokens();
      return { success: true };
    } catch (error) {
      console.error('IPC: clear-all-tokens failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear tokens' 
      };
    }
  });

  // Check if valid access token exists
  ipcMain.handle('has-valid-access-token', async () => {
    try {
      const isValid = hasValidAccessToken();
      return { success: true, isValid };
    } catch (error) {
      console.error('IPC: has-valid-access-token failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check token validity',
        isValid: false
      };
    }
  });

  console.log('Storage IPC handlers registered');
}
