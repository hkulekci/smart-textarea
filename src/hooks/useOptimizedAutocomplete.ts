import { useState, useCallback, useRef, useEffect } from 'react';
import type { AIProvider, CompletionResponse } from '../types';
import { useSmartTrigger } from './useSmartTrigger';
import { completionCache } from '../utils/cache';

export interface UseOptimizedAutocompleteOptions {
  /** Minimum pause before triggering completion (ms) */
  pauseThreshold?: number;
  /** Minimum characters before triggering */
  minChars?: number;
  /** Cooldown between API calls (ms) */
  cooldown?: number;
  /** Only trigger at natural breakpoints */
  triggerAtBreakpoints?: boolean;
  /** Enable caching */
  enableCache?: boolean;
  /** Enable completion */
  enabled?: boolean;
}

export interface UseOptimizedAutocompleteReturn {
  completion: string | null;
  isLoading: boolean;
  error: Error | null;
  acceptCompletion: () => string;
  dismissCompletion: () => void;
  handleTextChange: (text: string, cursorPosition: number) => void;
  stats: {
    apiCalls: number;
    cacheHits: number;
    tokensUsed: number;
  };
}

export function useOptimizedAutocomplete(
  provider: AIProvider | null,
  options: UseOptimizedAutocompleteOptions = {}
): UseOptimizedAutocompleteReturn {
  const {
    pauseThreshold = 600,
    minChars = 15,
    cooldown = 1500,
    triggerAtBreakpoints = true,
    enableCache = true,
    enabled = true,
  } = options;

  const [completion, setCompletion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState({ apiCalls: 0, cacheHits: 0, tokensUsed: 0 });

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequestRef = useRef<{ text: string; cursorPosition: number } | null>(null);

  const requestCompletion = useCallback(
    async (text: string, cursorPosition: number) => {
      if (!provider || !enabled) return;

      // Check cache first
      if (enableCache) {
        const cached = completionCache.getByPrefix(text, cursorPosition);
        if (cached) {
          setCompletion(cached);
          setStats((s) => ({ ...s, cacheHits: s.cacheHits + 1 }));
          return;
        }
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      currentRequestRef.current = { text, cursorPosition };

      setIsLoading(true);
      setError(null);

      try {
        const response: CompletionResponse = await provider.complete({
          text,
          cursorPosition,
          maxTokens: 30, // Limit tokens for faster response
        });

        // Verify this is still the current request
        if (
          currentRequestRef.current?.text === text &&
          currentRequestRef.current?.cursorPosition === cursorPosition
        ) {
          const completionText = response.completion?.trim() || null;
          setCompletion(completionText);

          // Update stats
          setStats((s) => ({
            ...s,
            apiCalls: s.apiCalls + 1,
            tokensUsed: s.tokensUsed + (completionText?.split(/\s+/).length || 0),
          }));

          // Cache the result
          if (enableCache && completionText) {
            completionCache.set(text, cursorPosition, completionText);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
          setCompletion(null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [provider, enabled, enableCache]
  );

  const { checkTrigger, reset } = useSmartTrigger(requestCompletion, {
    pauseThreshold,
    minChars,
    cooldown,
    triggerAtBreakpoints,
  });

  const handleTextChange = useCallback(
    (text: string, cursorPosition: number) => {
      // Dismiss current completion if user continues typing differently
      if (completion) {
        const textAfterCursor = text.substring(cursorPosition);
        // If user typed something that doesn't match completion, dismiss
        if (completion && !completion.startsWith(textAfterCursor.charAt(0) || '')) {
          setCompletion(null);
        }
      }

      checkTrigger(text, cursorPosition);
    },
    [checkTrigger, completion]
  );

  const acceptCompletion = useCallback((): string => {
    const result = completion || '';
    setCompletion(null);
    return result;
  }, [completion]);

  const dismissCompletion = useCallback(() => {
    setCompletion(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    reset();
  }, [reset]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    completion,
    isLoading,
    error,
    acceptCompletion,
    dismissCompletion,
    handleTextChange,
    stats,
  };
}
