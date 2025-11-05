/**
 * Development Token Input Component
 * Provides manual JWT token entry for development environments only
 * This component is completely disabled in production builds
 */

import React, { useState } from 'react';
import { detectEnvironment } from '../services/environmentService';
import { getApiClient } from '../services/apiClient';
import { getAuthService } from '../services/authService';
import { getSecureTokenStorage } from '../services/secureTokenStorage';
import { isStrictDevelopmentMode, guardDevelopmentOnly, devLog, devError } from '../utils/devModeGuard';

interface DevTokenInputProps {
  className?: string;
  onTokenSet?: (token: string) => void;
}

export const DevTokenInput: React.FC<DevTokenInputProps> = ({
  className = '',
  onTokenSet,
}) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Strict development mode check - multiple layers of protection
  if (!isStrictDevelopmentMode()) {
    devError('DevTokenInput attempted to render in non-development environment');
    return null;
  }

  // Additional legacy check for backwards compatibility
  const environment = detectEnvironment();
  if (environment !== 'development') {
    devError('DevTokenInput blocked by legacy environment check');
    return null;
  }

  const handleTokenChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setToken(e.target.value);
    setError(null);
    setSuccess(null);
  };

  const validateJwtToken = (tokenString: string): boolean => {
    try {
      // Basic JWT structure validation (header.payload.signature)
      const parts = tokenString.trim().split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Try to decode the payload to ensure it's valid base64
      const payload = JSON.parse(atob(parts[1]));
      
      // Check for basic JWT claims
      if (!payload.exp || !payload.iat) {
        return false;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token is expired');
      }

      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Token is expired') {
        throw error;
      }
      return false;
    }
  };

  const handleSetToken = async () => {
    // Guard against production usage
    try {
      guardDevelopmentOnly('Manual JWT token setting');
    } catch (error) {
      setError('This feature is only available in development mode');
      return;
    }

    if (!token.trim()) {
      setError('Please enter a JWT token');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate JWT token format
      if (!validateJwtToken(token.trim())) {
        throw new Error('Invalid JWT token format');
      }

      // Set token in API client
      const apiClient = getApiClient();
      apiClient.setJwtToken(token.trim());

      // Store token in secure storage for AuthenticatedApiClient
      const secureStorage = getSecureTokenStorage();
      await secureStorage.storeAccessToken(token.trim(), {
        accessToken: token.trim(),
        tokenType: 'Bearer',
        userId: 'dev-user',
      });

      // Try to decode token to get user info
      const parts = token.trim().split('.');
      const payload = JSON.parse(atob(parts[1]));
      
      // Create a mock user object from token payload
      const mockUser = {
        id: payload.sub || payload.user_id || 'dev-user',
        email: payload.email || 'dev@example.com',
        name: payload.name || 'Development User',
      };

      // Update auth service state manually for development
      const authService = getAuthService();
      // Note: This is a development-only hack to simulate authentication
      // In production, this would go through proper OAuth flow
      (authService as any).updateAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
        error: null,
      });

      setSuccess('JWT token set successfully! You are now authenticated.');
      onTokenSet?.(token.trim());

      devLog('JWT token set for development:', {
        tokenLength: token.trim().length,
        payload: payload,
        user: mockUser,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set JWT token';
      setError(errorMessage);
      devError('Failed to set JWT token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearToken = async () => {
    // Guard against production usage
    try {
      guardDevelopmentOnly('Manual JWT token clearing');
    } catch (error) {
      setError('This feature is only available in development mode');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Clear token from API client
      const apiClient = getApiClient();
      apiClient.setJwtToken(null);

      // Clear token from secure storage
      const secureStorage = getSecureTokenStorage();
      secureStorage.clearAllTokens().catch((error) => {
        devError('Failed to clear tokens from secure storage:', error);
      });

      // Clear auth state
      const authService = getAuthService();
      (authService as any).updateAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      setToken('');
      setSuccess('JWT token cleared successfully!');

      devLog('JWT token cleared for development');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear JWT token';
      setError(errorMessage);
      devError('Failed to clear JWT token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`dev-token-input card ${className}`}>
      <div className="row-between" style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, color: '#f59e0b' }}>🔧 Development Mode</h4>
        <span className="badge" style={{ backgroundColor: '#fbbf24', color: '#92400e' }}>
          DEV ONLY
        </span>
      </div>

      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
        Manually enter a JWT token for development testing. This feature is completely disabled in production.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="jwt-token" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          JWT Token:
        </label>
        <textarea
          id="jwt-token"
          value={token}
          onChange={handleTokenChange}
          placeholder="Paste your JWT token here..."
          rows={4}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
          disabled={isLoading}
        />
      </div>

      <div className="row-center gap-8" style={{ marginBottom: '16px' }}>
        <button
          onClick={handleSetToken}
          disabled={isLoading || !token.trim()}
          className="btn btn-primary"
        >
          {isLoading ? 'Setting...' : 'Set Token & Login'}
        </button>
        <button
          onClick={handleClearToken}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          Clear Token
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.28)', marginBottom: '8px' }}>
          <div className="row-center gap-8" style={{ color: '#991b1b' }}>
            <span>⚠️</span>
            <span style={{ fontSize: '14px' }}>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="card" style={{ borderColor: 'rgba(34, 197, 94, 0.28)', marginBottom: '8px' }}>
          <div className="row-center gap-8" style={{ color: '#166534' }}>
            <span>✅</span>
            <span style={{ fontSize: '14px' }}>{success}</span>
          </div>
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
        💡 Tip: You can get a JWT token from your browser's developer tools after logging in to the web app.
      </div>
    </div>
  );
};

export default DevTokenInput;