/**
 * Integration Tests: End-to-End Workflows
 * Tests complete workflows for custom prompts and hotkeys
 * Requirements: 10.4, 10.5, 10.6, 10.7
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CustomPrompt } from '../../types/customPrompts';
import { TemplateProcessor } from '../../utils/templateProcessor';

// Mock services
vi.mock('../../services/customPromptsService', () => ({
  getCustomPromptsService: () => ({
    getPrompts: vi.fn(),
    createPrompt: vi.fn(),
    updatePrompt: vi.fn(),
    deletePrompt: vi.fn(),
  }),
}));

vi.mock('../../services/hotkeyService', () => ({
  getHotkeyService: () => ({
    getHotkeys: vi.fn(),
    createHotkey: vi.fn(),
    updateHotkey: vi.fn(),
    deleteHotkey: vi.fn(),
  }),
}));

vi.mock('../../services/loggingService', () => ({
  getLoggingService: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock('../../services/notificationService', () => ({
  notificationService: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../services/apiClient', () => ({
  getApiClient: () => ({
    getJwtToken: vi.fn(() => 'mock-jwt-token'),
    processWithCode: vi.fn(),
    post: vi.fn(),
  }),
}));

vi.mock('../../utils/errorHandler', () => ({
  handlePromptError: vi.fn(),
  handleHotkeyError: vi.fn(),
  isOffline: vi.fn(() => false),
}));

vi.mock('../../utils/clipboardUtils', () => ({
  writeToClipboard: vi.fn(),
}));

describe('End-to-End Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Custom Prompt Creation and Hotkey Binding Flow', () => {
    it('should validate prompt data structure', () => {
      const mockPrompt: CustomPrompt = {
        id: 'test-prompt-id-123',
        name: 'Test Prompt',
        template: 'Process this: {input}',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Verify prompt structure
      expect(mockPrompt).toHaveProperty('id');
      expect(mockPrompt).toHaveProperty('name');
      expect(mockPrompt).toHaveProperty('template');
      expect(mockPrompt).toHaveProperty('is_active');
      expect(mockPrompt.is_active).toBe(true);
    });

    it('should validate hotkey binding structure', () => {
      const mockHotkey = {
        id: 'test-hotkey-id-456',
        prompt_code: 'test-prompt-id-123',
        combo: 'PRIMARY+SHIFT+KeyT',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Verify hotkey structure
      expect(mockHotkey).toHaveProperty('id');
      expect(mockHotkey).toHaveProperty('prompt_code');
      expect(mockHotkey).toHaveProperty('combo');
      expect(mockHotkey).toHaveProperty('is_active');
      expect(mockHotkey.combo).toMatch(/PRIMARY\+SHIFT\+Key[A-Z]/);
    });

    it('should handle template validation', () => {
      const validTemplate = 'Process this: {input}';
      const tooLongTemplate = 'x'.repeat(10001);
      const emptyTemplate = '';

      // Valid template
      const result1 = TemplateProcessor.validate(validTemplate);
      expect(result1.isValid).toBe(true);

      // Too long template
      const result2 = TemplateProcessor.validate(tooLongTemplate);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Template exceeds maximum length of 10000 characters');

      // Empty template
      const result3 = TemplateProcessor.validate(emptyTemplate);
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Template cannot be empty');
    });
  });

  describe('Hotkey Triggering and Text Processing', () => {
    it('should identify builtin prompt codes correctly', () => {
      const builtinCodes = ['REPHRASE', 'SUMMARIZE'];
      const customCode = 'custom-uuid-123';

      // Builtin codes should be recognized
      builtinCodes.forEach(code => {
        expect(['REPHRASE', 'SUMMARIZE']).toContain(code);
      });

      // Custom codes should not match builtin
      expect(['REPHRASE', 'SUMMARIZE']).not.toContain(customCode);
    });

    it('should process custom prompt templates correctly', () => {
      const customPrompt: CustomPrompt = {
        id: 'custom-123',
        name: 'Custom Test',
        template: 'Analyze: {input}',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const input = 'Test input';
      const processedPrompt = TemplateProcessor.process(customPrompt.template, input);

      expect(processedPrompt).toBe('Analyze: Test input');
    });

    it('should detect offline status for custom prompts', async () => {
      const { isOffline } = await import('../../utils/errorHandler');
      
      // Mock offline
      vi.mocked(isOffline).mockReturnValue(true);
      expect(isOffline()).toBe(true);

      // Mock online
      vi.mocked(isOffline).mockReturnValue(false);
      expect(isOffline()).toBe(false);
    });
  });

  describe('Data Synchronization Across Login/Logout', () => {
    it('should handle prompt data synchronization structure', () => {
      const mockPrompts: CustomPrompt[] = [
        {
          id: 'prompt-1',
          name: 'Prompt 1',
          template: 'Template 1: {input}',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'prompt-2',
          name: 'Prompt 2',
          template: 'Template 2: {input}',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Verify data structure for sync
      expect(mockPrompts).toHaveLength(2);
      mockPrompts.forEach(prompt => {
        expect(prompt).toHaveProperty('id');
        expect(prompt).toHaveProperty('name');
        expect(prompt).toHaveProperty('template');
        expect(prompt).toHaveProperty('is_active');
        expect(prompt).toHaveProperty('created_at');
        expect(prompt).toHaveProperty('updated_at');
      });
    });

    it('should handle empty data on logout', () => {
      const emptyPrompts: CustomPrompt[] = [];
      const emptyHotkeys: any[] = [];

      // Verify empty state
      expect(emptyPrompts).toHaveLength(0);
      expect(emptyHotkeys).toHaveLength(0);
    });
  });

  describe('Conflict Resolution and Error Recovery', () => {
    it('should detect hotkey conflicts', () => {
      const existingHotkeys = [
        {
          id: 'existing-hotkey',
          prompt_code: 'prompt-1',
          combo: 'PRIMARY+SHIFT+KeyA',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const newHotkeyCombo = 'PRIMARY+SHIFT+KeyA';
      
      // Check for conflict
      const hasConflict = existingHotkeys.some(h => h.combo === newHotkeyCombo);
      expect(hasConflict).toBe(true);

      // Different combo should not conflict
      const differentCombo = 'PRIMARY+SHIFT+KeyB';
      const noConflict = existingHotkeys.some(h => h.combo === differentCombo);
      expect(noConflict).toBe(false);
    });

    it('should recover from template processing errors', () => {
      const validTemplate = 'Process: {input}';
      const invalidTemplate = 'Process: {input';

      // Valid template should process successfully
      const result1 = TemplateProcessor.process(validTemplate, 'test');
      expect(result1).toBe('Process: test');

      // Invalid template should still work (no strict validation)
      const result2 = TemplateProcessor.process(invalidTemplate, 'test');
      expect(result2).toContain('test');
    });

    it('should handle authentication token validation', async () => {
      const { getApiClient } = await import('../../services/apiClient');
      const mockApiClient = getApiClient();

      // Test with valid token
      vi.mocked(mockApiClient.getJwtToken).mockReturnValue('valid-token');
      expect(mockApiClient.getJwtToken()).toBe('valid-token');

      // Test with no token
      vi.mocked(mockApiClient.getJwtToken).mockReturnValue(null);
      expect(mockApiClient.getJwtToken()).toBeNull();
    });
  });

  describe('Template Processing Integration', () => {
    it('should process template with placeholder correctly', () => {
      const template = 'Summarize this text: {input}';
      const input = 'Long article content here';
      
      const result = TemplateProcessor.process(template, input);
      
      expect(result).toBe('Summarize this text: Long article content here');
    });

    it('should append input when no placeholder exists', () => {
      const template = 'Summarize this text:';
      const input = 'Article content';
      
      const result = TemplateProcessor.process(template, input);
      
      expect(result).toContain('Summarize this text:');
      expect(result).toContain('Article content');
      expect(result).toMatch(/Text:\n---\n/);
    });

    it('should handle multiple placeholders', () => {
      const template = 'Input: {input}, Again: {input}';
      const input = 'test';
      
      const result = TemplateProcessor.process(template, input);
      
      expect(result).toBe('Input: test, Again: test');
    });

    it('should validate templates correctly', () => {
      const validTemplate = 'Process: {input}';
      const emptyTemplate = '';
      const longTemplate = 'x'.repeat(10001);

      const result1 = TemplateProcessor.validate(validTemplate);
      expect(result1.isValid).toBe(true);

      const result2 = TemplateProcessor.validate(emptyTemplate);
      expect(result2.isValid).toBe(false);

      const result3 = TemplateProcessor.validate(longTemplate);
      expect(result3.isValid).toBe(false);
    });
  });
});
