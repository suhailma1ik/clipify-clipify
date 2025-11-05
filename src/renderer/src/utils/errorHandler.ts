/**
 * Error Handler Utility
 * Provides centralized error handling with user-friendly messages
 */

import { notificationService } from '../services/notificationService';
import { getLoggingService } from '../services/loggingService';

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: string;
}

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logError?: boolean;
  context?: string;
  fallbackMessage?: string;
}

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_JSON: 'Invalid data format. Please try again.',
  MISSING_INPUT: 'Required field is missing.',
  INPUT_TOO_LONG: 'Input exceeds maximum length.',
  PROMPT_TOO_LONG: 'Prompt exceeds maximum length.',
  
  // Not found errors
  NOT_FOUND: 'The requested item was not found.',
  
  // Duplicate errors
  DUPLICATE_ENTRY: 'This item already exists.',
  
  // Permission errors
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  
  // Database errors
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  
  // Processing errors
  PROCESSING_ERROR: 'Failed to process your request.',
  PROVIDER_ERROR: 'AI service is currently unavailable.',
  EMPTY_RESPONSE: 'Received empty response from service.',
  TIMEOUT: 'Request timed out. Please try again.',
  
  // Quota errors
  QUOTA_EXCEEDED: 'You have exceeded your usage quota.',
  
  // Network errors
  NETWORK_ERROR: 'Network connection failed. Please check your internet.',
  OFFLINE: 'You are currently offline.',
};

/**
 * Get user-friendly error message from error code
 */
export function getUserFriendlyMessage(errorCode: string, defaultMessage?: string): string {
  return ERROR_MESSAGES[errorCode] || defaultMessage || 'An unexpected error occurred.';
}

/**
 * Parse API error response
 */
export function parseApiError(error: any): ApiErrorResponse {
  // Check if it's already an API error with our structure
  if (error?.data?.error && error?.data?.code) {
    return {
      error: error.data.error,
      code: error.data.code,
      details: error.data.details,
    };
  }

  // Check if error has message and status (axios-style)
  if (error?.response?.data) {
    const data = error.response.data;
    return {
      error: data.error || data.message || 'Unknown error',
      code: data.code || 'UNKNOWN_ERROR',
      details: data.details,
    };
  }

  // Check if it's a fetch API error
  if (error?.message) {
    return {
      error: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }

  // Fallback
  return {
    error: String(error),
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Check if user is offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Get appropriate error title based on error code
 */
function getErrorTitle(errorCode: string): string {
  if (errorCode.includes('VALIDATION')) {
    return 'Validation Error';
  }
  if (errorCode.includes('PERMISSION') || errorCode.includes('DENIED')) {
    return 'Access Denied';
  }
  if (errorCode.includes('NOT_FOUND')) {
    return 'Not Found';
  }
  if (errorCode.includes('DUPLICATE')) {
    return 'Duplicate Entry';
  }
  if (errorCode.includes('QUOTA')) {
    return 'Quota Exceeded';
  }
  if (errorCode.includes('TIMEOUT')) {
    return 'Request Timeout';
  }
  if (errorCode.includes('NETWORK') || errorCode.includes('OFFLINE')) {
    return 'Connection Error';
  }
  return 'Error';
}

/**
 * Handle API error with notifications and logging
 */
export async function handleApiError(
  error: any,
  options: ErrorHandlerOptions = {}
): Promise<void> {
  const {
    showNotification = true,
    logError = true,
    context = 'api',
    fallbackMessage,
  } = options;

  // Check if offline
  if (isOffline()) {
    if (showNotification) {
      await notificationService.error(
        'No Internet Connection',
        'Please check your internet connection and try again.'
      );
    }
    if (logError) {
      const logger = getLoggingService();
      logger.warn(context, 'User is offline');
    }
    return;
  }

  // Parse the error
  const apiError = parseApiError(error);
  const userMessage = getUserFriendlyMessage(apiError.code, fallbackMessage);

  // Show notification
  if (showNotification) {
    const title = getErrorTitle(apiError.code);
    const body = apiError.details
      ? `${userMessage}\n\n${apiError.details}`
      : userMessage;
    
    await notificationService.error(title, body);
  }

  // Log error
  if (logError) {
    const logger = getLoggingService();
    logger.error(
      context,
      `API Error: ${apiError.error}`,
      error instanceof Error ? error : new Error(apiError.error),
      { code: apiError.code, details: apiError.details }
    );
  }
}

/**
 * Retry logic for failed operations
 */
export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Call retry callback
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Calculate delay with optional exponential backoff
      const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const apiError = parseApiError(error);
  
  // Retry on network errors, timeouts, and server errors
  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'DATABASE_ERROR',
    'PROVIDER_ERROR',
  ];

  return retryableCodes.includes(apiError.code);
}

/**
 * Handle hotkey registration error with retry
 */
export async function handleHotkeyError(
  error: any,
  combo: string,
  retryFn?: () => Promise<void>
): Promise<void> {
  const apiError = parseApiError(error);
  const logger = getLoggingService();

  logger.error('hotkeys', 'Hotkey registration failed', error instanceof Error ? error : new Error(String(error)), {
    combo,
    code: apiError.code,
  });

  // Handle specific hotkey errors
  if (apiError.code === 'DUPLICATE_ENTRY') {
    await notificationService.error(
      'Hotkey Already in Use',
      `The hotkey combination "${combo}" is already assigned to another prompt. Please choose a different combination.`
    );
    return;
  }

  if (apiError.code === 'VALIDATION_ERROR') {
    await notificationService.error(
      'Invalid Hotkey',
      `The hotkey combination "${combo}" is not valid. ${apiError.details || 'Please try a different combination.'}`
    );
    return;
  }

  // For retryable errors, offer retry
  if (isRetryableError(error) && retryFn) {
    await notificationService.warning(
      'Hotkey Registration Failed',
      `Failed to register hotkey "${combo}". Would you like to try again?`
    );
    // Note: Actual retry UI would be handled by the component
  } else {
    await notificationService.error(
      'Hotkey Registration Failed',
      `Failed to register hotkey "${combo}". ${getUserFriendlyMessage(apiError.code)}`
    );
  }
}

/**
 * Handle custom prompt error
 */
export async function handlePromptError(
  error: any,
  operation: 'create' | 'update' | 'delete' | 'load',
  promptName?: string
): Promise<void> {
  const apiError = parseApiError(error);
  const logger = getLoggingService();

  logger.error('prompts', `Prompt ${operation} failed`, error instanceof Error ? error : new Error(String(error)), {
    operation,
    promptName,
    code: apiError.code,
  });

  const operationText = {
    create: 'create',
    update: 'update',
    delete: 'delete',
    load: 'load',
  }[operation];

  const title = `Failed to ${operationText} prompt`;
  const message = promptName
    ? `Failed to ${operationText} prompt "${promptName}". ${getUserFriendlyMessage(apiError.code)}`
    : `Failed to ${operationText} prompt. ${getUserFriendlyMessage(apiError.code)}`;

  await notificationService.error(title, message);
}
