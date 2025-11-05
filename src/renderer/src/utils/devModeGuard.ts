/**
 * Development Mode Guard Utility
 * Provides strict environment checks to ensure development-only features
 * are completely disabled in production builds
 */

import { detectEnvironment } from '../services/environmentService';

/**
 * Strict development mode check
 * Returns true only if we are definitely in development mode
 * Uses multiple environment indicators for maximum safety
 */
export const isStrictDevelopmentMode = (): boolean => {
  try {
    // Primary check: environment detection service
    const detectedEnv = detectEnvironment();
    if (detectedEnv !== 'development') {
      return false;
    }

    // Secondary checks for additional safety
    const viteMode = import.meta.env.MODE;
    const nodeEnv = import.meta.env.NODE_ENV;
    const viteEnv = import.meta.env.VITE_ENVIRONMENT;
    const isDev = import.meta.env.DEV;

    // All development indicators must align
    const developmentIndicators = [
      viteMode === 'development',
      nodeEnv !== 'production',
      viteEnv !== 'production',
      isDev === true,
    ];

    // At least 3 out of 4 indicators must confirm development mode
    const devCount = developmentIndicators.filter(Boolean).length;
    const isDefinitelyDev = devCount >= 3;

    // Additional safety: check for production-specific environment variables
    const prodApiUrl = import.meta.env.VITE_PROD_API_BASE_URL;
    const prodEnvVar = import.meta.env.VITE_PROD_ENVIRONMENT;
    
    // If we have production environment variables set, be extra cautious
    if (prodEnvVar === 'production' || (prodApiUrl && !prodApiUrl.includes('localhost'))) {
      console.warn('[DevModeGuard] Production environment variables detected, disabling dev features');
      return false;
    }

    const result = isDefinitelyDev;
    
    if (result) {
      console.log('[DevModeGuard] Development mode confirmed:', {
        detectedEnv,
        viteMode,
        nodeEnv,
        viteEnv,
        isDev,
        devIndicatorCount: devCount,
      });
    } else {
      console.warn('[DevModeGuard] Development mode NOT confirmed, dev features disabled:', {
        detectedEnv,
        viteMode,
        nodeEnv,
        viteEnv,
        isDev,
        devIndicatorCount: devCount,
      });
    }

    return result;
  } catch (error) {
    console.error('[DevModeGuard] Error checking development mode, defaulting to false:', error);
    return false;
  }
};

/**
 * Guard function for development-only features
 * Throws an error if called in production
 */
export const guardDevelopmentOnly = (featureName: string): void => {
  if (!isStrictDevelopmentMode()) {
    const error = new Error(`${featureName} is only available in development mode`);
    console.error('[DevModeGuard]', error.message);
    throw error;
  }
};

/**
 * Safe wrapper for development-only code execution
 * Returns null if not in development mode
 */
export const runInDevelopmentOnly = <T>(
  fn: () => T,
  featureName: string = 'Development feature'
): T | null => {
  try {
    if (!isStrictDevelopmentMode()) {
      console.warn(`[DevModeGuard] ${featureName} skipped - not in development mode`);
      return null;
    }
    return fn();
  } catch (error) {
    console.error(`[DevModeGuard] Error in ${featureName}:`, error);
    return null;
  }
};

/**
 * Development-only console logging
 * Only logs in development mode
 */
export const devLog = (message: string, ...args: any[]): void => {
  if (isStrictDevelopmentMode()) {
    console.log(`[DEV] ${message}`, ...args);
  }
};

/**
 * Development-only warning logging
 * Only logs in development mode
 */
export const devWarn = (message: string, ...args: any[]): void => {
  if (isStrictDevelopmentMode()) {
    console.warn(`[DEV] ${message}`, ...args);
  }
};

/**
 * Development-only error logging
 * Only logs in development mode
 */
export const devError = (message: string, ...args: any[]): void => {
  if (isStrictDevelopmentMode()) {
    console.error(`[DEV] ${message}`, ...args);
  }
};