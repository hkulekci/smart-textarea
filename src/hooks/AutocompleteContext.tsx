import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AIProvider, AnyProviderConfig, AutocompleteContextValue } from '../types';
import { createProvider } from '../providers';

const AutocompleteContext = createContext<AutocompleteContextValue | null>(null);

export interface AutocompleteProviderProps {
  children: React.ReactNode;
  initialConfig?: AnyProviderConfig;
}

export function AutocompleteProvider({ children, initialConfig }: AutocompleteProviderProps) {
  const [provider, setProviderState] = useState<AIProvider | null>(
    initialConfig ? createProvider(initialConfig) : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setProvider = useCallback(async (config: AnyProviderConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const newProvider = createProvider(config);
      const isAvailable = await newProvider.isAvailable();

      if (!isAvailable) {
        throw new Error(`Provider ${newProvider.name} is not available. Please check your configuration.`);
      }

      setProviderState(newProvider);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize provider'));
      setProviderState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AutocompleteContextValue>(
    () => ({
      provider,
      isLoading,
      error,
      setProvider,
    }),
    [provider, isLoading, error, setProvider]
  );

  return (
    <AutocompleteContext.Provider value={value}>
      {children}
    </AutocompleteContext.Provider>
  );
}

export function useAutocompleteContext(): AutocompleteContextValue {
  const context = useContext(AutocompleteContext);

  if (!context) {
    throw new Error('useAutocompleteContext must be used within an AutocompleteProvider');
  }

  return context;
}
