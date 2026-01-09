// Components
export { AutocompleteTextarea, OptimizedAutocompleteTextarea } from './components';
export type { AutocompleteTextareaRef, OptimizedAutocompleteTextareaRef } from './components';

// Hooks and Context
export {
  useAutocomplete,
  useOptimizedAutocomplete,
  useSmartTrigger,
  useAutocompleteContext,
  AutocompleteProvider,
} from './hooks';
export type {
  AutocompleteProviderProps,
  UseOptimizedAutocompleteOptions,
  UseOptimizedAutocompleteReturn,
  SmartTriggerOptions,
} from './hooks';

// Providers
export {
  createProvider,
  BaseProvider,
  OpenAIProvider,
  StreamingOpenAIProvider,
  GeminiProvider,
  OpenRouterProvider,
  LocalProvider,
  CustomProvider,
} from './providers';

// Types
export type {
  ProviderType,
  CompletionRequest,
  CompletionResponse,
  AIProvider,
  ProviderConfig,
  OpenAIConfig,
  GeminiConfig,
  OpenRouterConfig,
  LocalConfig,
  CustomProviderConfig,
  AnyProviderConfig,
  AutocompleteContextValue,
  AutocompleteTextareaProps,
  UseAutocompleteOptions,
  UseAutocompleteReturn,
} from './types';

// Utils
export { debounce, shouldTriggerCompletion, getTextSegments, CompletionCache, completionCache } from './utils';
