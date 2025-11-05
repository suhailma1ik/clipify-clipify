import { describe, it, expect } from 'vitest';
import { TemplateProcessor } from '../templateProcessor';

describe('TemplateProcessor', () => {
  describe('process', () => {
    it('should replace {input} placeholder with actual input', () => {
      const template = 'Please summarize: {input}';
      const input = 'This is a test text';
      const result = TemplateProcessor.process(template, input);
      expect(result).toBe('Please summarize: This is a test text');
    });

    it('should replace multiple {input} placeholders', () => {
      const template = 'Input: {input}\nRepeat: {input}';
      const input = 'test';
      const result = TemplateProcessor.process(template, input);
      expect(result).toBe('Input: test\nRepeat: test');
    });

    it('should append input when no placeholder exists', () => {
      const template = 'Please summarize the following text:';
      const input = 'This is a test';
      const result = TemplateProcessor.process(template, input);
      expect(result).toBe('Please summarize the following text:\n\nText:\n---\nThis is a test\n---');
    });

    it('should throw error when template is empty', () => {
      expect(() => TemplateProcessor.process('', 'input')).toThrow('Template and input are required');
    });

    it('should throw error when input is empty', () => {
      expect(() => TemplateProcessor.process('template', '')).toThrow('Template and input are required');
    });
  });

  describe('validate', () => {
    it('should validate template with {input} placeholder', () => {
      const result = TemplateProcessor.validate('Summarize: {input}');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when template has no {input} placeholder', () => {
      const result = TemplateProcessor.validate('Summarize the text');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('does not contain {input}');
    });

    it('should warn when template has multiple {input} placeholders', () => {
      const result = TemplateProcessor.validate('Input: {input}, Repeat: {input}');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('contains 2 {input} placeholders');
    });

    it('should error when template is empty', () => {
      const result = TemplateProcessor.validate('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('cannot be empty');
    });

    it('should error when template exceeds max length', () => {
      const longTemplate = 'a'.repeat(10001);
      const result = TemplateProcessor.validate(longTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('exceeds maximum length');
    });
  });

  describe('hasPlaceholder', () => {
    it('should return true when template has {input}', () => {
      expect(TemplateProcessor.hasPlaceholder('Test {input}')).toBe(true);
    });

    it('should return false when template has no {input}', () => {
      expect(TemplateProcessor.hasPlaceholder('Test template')).toBe(false);
    });
  });

  describe('getPlaceholder', () => {
    it('should return the placeholder string', () => {
      expect(TemplateProcessor.getPlaceholder()).toBe('{input}');
    });
  });
});
