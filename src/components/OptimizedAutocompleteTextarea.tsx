import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import type { AutocompleteTextareaProps } from '../types';
import { useOptimizedAutocomplete } from '../hooks/useOptimizedAutocomplete';
import { useAutocompleteContext } from '../hooks/AutocompleteContext';

export interface OptimizedAutocompleteTextareaRef {
  focus: () => void;
  blur: () => void;
  select: () => void;
  getTextarea: () => HTMLTextAreaElement | null;
  getStats: () => { apiCalls: number; cacheHits: number; tokensUsed: number };
}

interface OptimizedProps extends Omit<AutocompleteTextareaProps, 'debounceMs' | 'minCharsForCompletion' | 'triggerOnSentenceEnd'> {
  /** Minimum pause before triggering completion (ms) */
  pauseThreshold?: number;
  /** Minimum characters before triggering */
  minChars?: number;
  /** Cooldown between API calls (ms) */
  cooldown?: number;
  /** Only trigger at natural breakpoints (space, punctuation) */
  triggerAtBreakpoints?: boolean;
  /** Enable completion caching */
  enableCache?: boolean;
  /** Show stats overlay */
  showStats?: boolean;
}

const defaultStyles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
  },
  wrapper: {
    position: 'relative',
    display: 'inline-block',
    width: '100%',
  },
  textarea: {
    width: '100%',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  ghostOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    boxSizing: 'border-box',
  },
  ghostText: {
    opacity: 0.5,
    color: '#666',
  },
  loadingIndicator: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '12px',
    height: '12px',
    border: '2px solid #e0e0e0',
    borderTopColor: '#3498db',
    borderRadius: '50%',
    animation: 'autocomplete-spin 1s linear infinite',
  },
  statsOverlay: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontFamily: 'monospace',
    pointerEvents: 'none',
  },
};

const injectStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'autocomplete-textarea-styles';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `@keyframes autocomplete-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
};

export const OptimizedAutocompleteTextarea = forwardRef<OptimizedAutocompleteTextareaRef, OptimizedProps>(
  function OptimizedAutocompleteTextarea(
    {
      value,
      onChange,
      pauseThreshold = 600,
      minChars = 15,
      cooldown = 1500,
      triggerAtBreakpoints = true,
      enableCache = true,
      acceptKey = 'Tab',
      dismissKey = 'Escape',
      showGhostText = true,
      showStats = false,
      completionClassName,
      onCompletionAccept,
      onCompletionDismiss,
      disabled = false,
      className,
      style,
      ...textareaProps
    },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);
    const { provider } = useAutocompleteContext();

    const [cursorPosition, setCursorPosition] = useState(0);
    const [textareaStyles, setTextareaStyles] = useState<React.CSSProperties>({});

    const {
      completion,
      isLoading,
      acceptCompletion,
      dismissCompletion,
      handleTextChange,
      stats,
    } = useOptimizedAutocomplete(provider, {
      pauseThreshold,
      minChars,
      cooldown,
      triggerAtBreakpoints,
      enableCache,
      enabled: !disabled,
    });

    useEffect(() => {
      injectStyles();
    }, []);

    useEffect(() => {
      if (textareaRef.current) {
        const computed = window.getComputedStyle(textareaRef.current);
        setTextareaStyles({
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          padding: computed.padding,
          border: 'transparent',
          borderWidth: computed.borderWidth,
          borderStyle: computed.borderStyle,
        });
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      select: () => textareaRef.current?.select(),
      getTextarea: () => textareaRef.current,
      getStats: () => stats,
    }));

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorPosition = e.target.selectionStart;

        onChange(newValue);
        setCursorPosition(newCursorPosition);
        handleTextChange(newValue, newCursorPosition);
      },
      [onChange, handleTextChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (completion && e.key === acceptKey) {
          e.preventDefault();
          const acceptedCompletion = acceptCompletion();

          if (acceptedCompletion) {
            const beforeCursor = value.substring(0, cursorPosition);
            const afterCursor = value.substring(cursorPosition);
            const newValue = beforeCursor + acceptedCompletion + afterCursor;

            onChange(newValue);

            const newCursorPosition = cursorPosition + acceptedCompletion.length;
            setCursorPosition(newCursorPosition);

            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
              }
            }, 0);

            onCompletionAccept?.(acceptedCompletion);
          }
          return;
        }

        if (completion && e.key === dismissKey) {
          e.preventDefault();
          dismissCompletion();
          onCompletionDismiss?.();
          return;
        }

        textareaProps.onKeyDown?.(e);
      },
      [
        completion,
        acceptKey,
        dismissKey,
        acceptCompletion,
        dismissCompletion,
        value,
        cursorPosition,
        onChange,
        onCompletionAccept,
        onCompletionDismiss,
        textareaProps,
      ]
    );

    const handleSelect = useCallback(
      (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        setCursorPosition(e.currentTarget.selectionStart);
        textareaProps.onSelect?.(e);
      },
      [textareaProps]
    );

    const renderGhostOverlay = () => {
      if (!showGhostText || !completion) return null;
      const beforeCursor = value.substring(0, cursorPosition);

      return (
        <div ref={ghostRef} style={{ ...defaultStyles.ghostOverlay, ...textareaStyles }} aria-hidden="true">
          <span style={{ visibility: 'hidden' }}>{beforeCursor}</span>
          <span style={defaultStyles.ghostText} className={completionClassName}>
            {completion}
          </span>
        </div>
      );
    };

    return (
      <div style={defaultStyles.container}>
        <div style={defaultStyles.wrapper}>
          <textarea
            {...textareaProps}
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            disabled={disabled}
            className={className}
            style={{
              ...defaultStyles.textarea,
              ...style,
              background: showGhostText && completion ? 'transparent' : undefined,
            }}
          />
          {renderGhostOverlay()}
          {isLoading && <div style={defaultStyles.loadingIndicator} aria-label="Loading" />}
          {showStats && (
            <div style={defaultStyles.statsOverlay}>
              API: {stats.apiCalls} | Cache: {stats.cacheHits} | Tokens: ~{stats.tokensUsed}
            </div>
          )}
        </div>
      </div>
    );
  }
);
