import { useState, useCallback, useRef, useEffect } from 'react';
import type { AIProvider, UseAutocompleteOptions, UseAutocompleteReturn } from '../types';
import { debounce, shouldTriggerCompletion } from '../utils';

export function useAutocomplete(
  provider: AIProvider | null,
  options: UseAutocompleteOptions = {}
): UseAutocompleteReturn {
  const {
    debounceMs = 300,
    minCharsForCompletion = 10,
    triggerOnSentenceEnd = true,
    enabled = true,
  } = options;

  const [completion, setCompletion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<{ text: string; cursorPosition: number } | null>(null);

  const requestCompletionInternal = useCallback(
    async (text: string, cursorPosition: number) => {
      if (!provider || !enabled) {
        return;
      }

      if (!shouldTriggerCompletion(text, cursorPosition, minCharsForCompletion, triggerOnSentenceEnd)) {
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      lastRequestRef.current = { text, cursorPosition };

      setIsLoading(true);
      setError(null);

      try {
        const response = await provider.complete({
          text,
          cursorPosition,
        });

        // Only set completion if this is still the latest request
        if (
          lastRequestRef.current?.text === text &&
          lastRequestRef.current?.cursorPosition === cursorPosition
        ) {
          setCompletion(response.completion || null);
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
    [provider, enabled, minCharsForCompletion, triggerOnSentenceEnd]
  );

  const debouncedRequestRef = useRef<ReturnType<typeof debounce<typeof requestCompletionInternal>> | null>(null);

  useEffect(() => {
    debouncedRequestRef.current = debounce(requestCompletionInternal, debounceMs);
    return () => {
      debouncedRequestRef.current?.cancel();
    };
  }, [requestCompletionInternal, debounceMs]);

  const requestCompletion = useCallback(
    (text: string, cursorPosition: number) => {
      debouncedRequestRef.current?.(text, cursorPosition);
    },
    []
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
    debouncedRequestRef.current?.cancel();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      debouncedRequestRef.current?.cancel();
    };
  }, []);

  return {
    completion,
    isLoading,
    error,
    acceptCompletion,
    dismissCompletion,
    requestCompletion,
  };
}
