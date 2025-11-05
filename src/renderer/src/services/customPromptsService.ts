/**
 * Custom Prompts Service
 * Handles API calls for custom prompt management
 */

import { getAuthenticatedApiClient } from './authenticatedApiClient';
import { CustomPrompt } from '../types/customPrompts';

export interface CreatePromptRequest {
  name: string;
  template: string;
}

export interface UpdatePromptRequest {
  name: string;
  template: string;
}

export interface GetPromptsResponse {
  prompts: CustomPrompt[];
}

export interface CreatePromptResponse {
  id: string;
}

class CustomPromptsService {
  private apiClient = getAuthenticatedApiClient();

  /**
   * Get all custom prompts for the authenticated user
   */
  async getPrompts(): Promise<CustomPrompt[]> {
    const response = await this.apiClient.get<GetPromptsResponse>(
      '/api/v1/protected/prompts'
    );
    return response.data.prompts;
  }

  /**
   * Create a new custom prompt
   */
  async createPrompt(request: CreatePromptRequest): Promise<string> {
    const response = await this.apiClient.post<CreatePromptResponse>(
      '/api/v1/protected/prompts',
      request
    );
    return response.data.id;
  }

  /**
   * Update an existing custom prompt
   */
  async updatePrompt(id: string, request: UpdatePromptRequest): Promise<void> {
    await this.apiClient.put(
      `/api/v1/protected/prompts/${id}`,
      request
    );
  }

  /**
   * Delete a custom prompt
   */
  async deletePrompt(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/protected/prompts/${id}`);
  }
}

// Export singleton instance
let customPromptsServiceInstance: CustomPromptsService | null = null;

export function getCustomPromptsService(): CustomPromptsService {
  if (!customPromptsServiceInstance) {
    customPromptsServiceInstance = new CustomPromptsService();
  }
  return customPromptsServiceInstance;
}
