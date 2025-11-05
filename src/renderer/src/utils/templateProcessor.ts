/**
 * Template processor for custom prompts
 * Handles {input} placeholder replacement and fallback logic
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class TemplateProcessor {
  private static readonly PLACEHOLDER = '{input}';
  private static readonly FALLBACK_DELIMITER = '\n\nText:\n---\n';
  private static readonly FALLBACK_SUFFIX = '\n---';
  private static readonly MAX_TEMPLATE_LENGTH = 10000;

  /**
   * Process a template by replacing {input} placeholder with actual input text
   * If template doesn't contain {input}, appends input at the end with delimiter
   * @param template - The prompt template
   * @param input - The user's input text
   * @returns Processed prompt ready to send to API
   */
  static process(template: string, input: string): string {
    if (!template || !input) {
      throw new Error('Template and input are required');
    }

    // Check if template contains the placeholder
    if (template.includes(this.PLACEHOLDER)) {
      // Replace all occurrences of {input} with the actual input
      return template.replace(new RegExp(this.PLACEHOLDER, 'g'), input);
    } else {
      // Fallback: append input at the end with delimiter
      return `${template}${this.FALLBACK_DELIMITER}${input}${this.FALLBACK_SUFFIX}`;
    }
  }

  /**
   * Validate a template
   * @param template - The template to validate
   * @returns Validation result with errors and warnings
   */
  static validate(template: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if template is empty
    if (!template || template.trim().length === 0) {
      errors.push('Template cannot be empty');
    }

    // Check template length
    if (template.length > this.MAX_TEMPLATE_LENGTH) {
      errors.push(`Template exceeds maximum length of ${this.MAX_TEMPLATE_LENGTH} characters`);
    }

    // Warn if template doesn't contain {input} placeholder
    if (template && !template.includes(this.PLACEHOLDER)) {
      warnings.push('Template does not contain {input} placeholder. Input will be appended at the end.');
    }

    // Check for multiple {input} placeholders (not an error, just informational)
    const placeholderCount = (template.match(new RegExp(this.PLACEHOLDER, 'g')) || []).length;
    if (placeholderCount > 1) {
      warnings.push(`Template contains ${placeholderCount} {input} placeholders. All will be replaced with the same input.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if a template contains the {input} placeholder
   * @param template - The template to check
   * @returns True if template contains {input}
   */
  static hasPlaceholder(template: string): boolean {
    return template.includes(this.PLACEHOLDER);
  }

  /**
   * Get the placeholder string
   * @returns The placeholder string
   */
  static getPlaceholder(): string {
    return this.PLACEHOLDER;
  }
}
