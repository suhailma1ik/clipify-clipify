/**
 * Custom Prompts Hook
 * Manages custom prompts state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { CustomPrompt } from '../types/customPrompts';
import { getCustomPromptsService } from '../services/customPromptsService';
import { getLoggingService } from '../services/loggingService';
import { handlePromptError, isOffline } from '../utils/errorHandler';
import { notificationService } from '../services/notificationService';

export interface UseCustomPromptsReturn {
  prompts: CustomPrompt[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filteredPrompts: CustomPrompt[];
  setSearchQuery: (query: string) => void;
  loadPrompts: () => Promise<void>;
  createPrompt: (name: string, template: string) => Promise<string>;
  updatePrompt: (id: string, name: string, template: string) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
}

export function useCustomPrompts(): UseCustomPromptsReturn {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPrompts, setFilteredPrompts] = useState<CustomPrompt[]>([]);

  const customPromptsService = getCustomPromptsService();
  const logger = getLoggingService();

  // Filter prompts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPrompts(prompts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = prompts.filter(
      (prompt) =>
        prompt.name.toLowerCase().includes(query) ||
        prompt.template.toLowerCase().includes(query)
    );
    setFilteredPrompts(filtered);
  }, [prompts, searchQuery]);

  /**
   * Load all custom prompts
   */
  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check if offline
    if (isOffline()) {
      const errorMessage = 'You are currently offline. Please check your internet connection.';
      setError(errorMessage);
      await notificationService.error('No Internet Connection', errorMessage);
      setLoading(false);
      return;
    }

    try {
      logger.info('prompts', 'Loading custom prompts');
      const loadedPrompts = await customPromptsService.getPrompts();
      setPrompts(loadedPrompts);
      logger.info('prompts', 'Custom prompts loaded', { count: loadedPrompts.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prompts';
      setError(errorMessage);
      await handlePromptError(err, 'load');
    } finally {
      setLoading(false);
    }
  }, [customPromptsService, logger]);

  /**
   * Create a new custom prompt
   */
  const createPrompt = useCallback(
    async (name: string, template: string): Promise<string> => {
      setError(null);

      try {
        logger.info('prompts', 'Creating custom prompt', { name });
        const id = await customPromptsService.createPrompt({ name, template });
        logger.info('prompts', 'Custom prompt created', { id, name });
        
        // Show success notification
        await notificationService.success('Prompt Created', `Successfully created prompt "${name}"`);
        
        // Reload prompts to get the updated list
        await loadPrompts();
        
        return id;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create prompt';
        setError(errorMessage);
        await handlePromptError(err, 'create', name);
        throw err;
      }
    },
    [customPromptsService, logger, loadPrompts]
  );

  /**
   * Update an existing custom prompt
   */
  const updatePrompt = useCallback(
    async (id: string, name: string, template: string): Promise<void> => {
      setError(null);

      try {
        logger.info('prompts', 'Updating custom prompt', { id, name });
        await customPromptsService.updatePrompt(id, { name, template });
        logger.info('prompts', 'Custom prompt updated', { id, name });
        
        // Show success notification
        await notificationService.success('Prompt Updated', `Successfully updated prompt "${name}"`);
        
        // Reload prompts to get the updated list
        await loadPrompts();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update prompt';
        setError(errorMessage);
        await handlePromptError(err, 'update', name);
        throw err;
      }
    },
    [customPromptsService, logger, loadPrompts]
  );

  /**
   * Delete a custom prompt
   */
  const deletePrompt = useCallback(
    async (id: string): Promise<void> => {
      setError(null);

      try {
        logger.info('prompts', 'Deleting custom prompt', { id });
        await customPromptsService.deletePrompt(id);
        logger.info('prompts', 'Custom prompt deleted', { id });
        
        // Show success notification
        await notificationService.success('Prompt Deleted', 'Successfully deleted prompt');
        
        // Reload prompts to get the updated list
        await loadPrompts();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete prompt';
        setError(errorMessage);
        await handlePromptError(err, 'delete');
        throw err;
      }
    },
    [customPromptsService, logger, loadPrompts]
  );

  return {
    prompts,
    loading,
    error,
    searchQuery,
    filteredPrompts,
    setSearchQuery,
    loadPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
  };
}
