import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import type { AutocompleteTextareaProps } from '../types';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { useAutocompleteContext } from '../hooks/AutocompleteContext';

export interface AutocompleteTextareaRef {
  focus: () => void;
  blur: () => void;
  select: () => void;
  getTextarea: () => HTMLTextAreaElement | null;
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
    width: '16px',
    height: '16px',
    border: '2px solid #e0e0e0',
    borderTopColor: '#3498db',
    borderRadius: '50%',
    animation: 'autocomplete-spin 1s linear infinite',
  },
};

// Inject keyframes for the loading spinner
const injectStyles = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'autocomplete-textarea-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes autocomplete-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

export const AutocompleteTextarea = forwardRef<AutocompleteTextareaRef, AutocompleteTextareaProps>(
  function AutocompleteTextarea(
    {
      value,
      onChange,
      debounceMs = 300,
      minCharsForCompletion = 10,
      acceptKey = 'Tab',
      dismissKey = 'Escape',
      showGhostText = true,
      completionClassName,
      onCompletionAccept,
      onCompletionDismiss,
      disabled = false,
      triggerOnSentenceEnd = true,
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
      requestCompletion,
    } = useAutocomplete(provider, {
      debounceMs,
      minCharsForCompletion,
      triggerOnSentenceEnd,
      enabled: !disabled,
    });

    // Inject CSS for animations
    useEffect(() => {
      injectStyles();
    }, []);

    // Sync textarea computed styles to ghost overlay
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
    }));

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorPosition = e.target.selectionStart;

        onChange(newValue);
        setCursorPosition(newCursorPosition);

        // Request completion with new text
        requestCompletion(newValue, newCursorPosition);
      },
      [onChange, requestCompletion]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Accept completion
        if (completion && e.key === acceptKey) {
          e.preventDefault();
          const acceptedCompletion = acceptCompletion();

          if (acceptedCompletion) {
            const beforeCursor = value.substring(0, cursorPosition);
            const afterCursor = value.substring(cursorPosition);
            const newValue = beforeCursor + acceptedCompletion + afterCursor;

            onChange(newValue);

            // Set cursor after the completion
            const newCursorPosition = cursorPosition + acceptedCompletion.length;
            setCursorPosition(newCursorPosition);

            // Set cursor position after React updates
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
              }
            }, 0);

            onCompletionAccept?.(acceptedCompletion);
          }
          return;
        }

        // Dismiss completion
        if (completion && e.key === dismissKey) {
          e.preventDefault();
          dismissCompletion();
          onCompletionDismiss?.();
          return;
        }

        // Call original onKeyDown if provided
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

    const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      setCursorPosition(e.currentTarget.selectionStart);
      textareaProps.onSelect?.(e);
    }, [textareaProps]);

    // Render ghost text overlay
    const renderGhostOverlay = () => {
      if (!showGhostText || !completion) return null;

      const beforeCursor = value.substring(0, cursorPosition);

      return (
        <div
          ref={ghostRef}
          style={{
            ...defaultStyles.ghostOverlay,
            ...textareaStyles,
          }}
          aria-hidden="true"
        >
          <span style={{ visibility: 'hidden' }}>{beforeCursor}</span>
          <span
            style={defaultStyles.ghostText}
            className={completionClassName}
          >
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
          {isLoading && (
            <div style={defaultStyles.loadingIndicator} aria-label="Loading completion" />
          )}
        </div>
      </div>
    );
  }
);
