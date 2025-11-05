// Centralized feature flags
export const FEATURE_SUMMARIZATION: boolean = (import.meta.env.VITE_FEATURE_SUMMARIZATION === "true");
export const FEATURE_HOTKEYS_CONFIG: boolean = (import.meta.env.VITE_FEATURE_HOTKEYS_CONFIG === "true");

// Custom prompts and hotkeys feature flags
export const FEATURE_CUSTOM_PROMPTS: boolean = (import.meta.env.VITE_FEATURE_CUSTOM_PROMPTS === "true");
export const FEATURE_MULTIPLE_HOTKEYS: boolean = (import.meta.env.VITE_FEATURE_MULTIPLE_HOTKEYS === "true");
export const FEATURE_PROMPT_MANAGEMENT_UI: boolean = (import.meta.env.VITE_FEATURE_PROMPT_MANAGEMENT_UI === "true");
export const FEATURE_UNIFIED_PROCESSING: boolean = (import.meta.env.VITE_FEATURE_UNIFIED_PROCESSING === "true");

export const anyFeatureEnabled = () => FEATURE_SUMMARIZATION || FEATURE_HOTKEYS_CONFIG || FEATURE_CUSTOM_PROMPTS || FEATURE_MULTIPLE_HOTKEYS || FEATURE_PROMPT_MANAGEMENT_UI || FEATURE_UNIFIED_PROCESSING;
