import { useRef, useCallback, useEffect } from 'react';

export interface SmartTriggerOptions {
  /** Minimum pause duration before triggering (ms) */
  pauseThreshold?: number;
  /** Minimum characters before considering trigger */
  minChars?: number;
  /** Only trigger at natural breakpoints (space, punctuation) */
  triggerAtBreakpoints?: boolean;
  /** Cooldown between triggers (ms) */
  cooldown?: number;
}

interface TriggerState {
  lastKeyTime: number;
  lastTriggerTime: number;
  lastText: string;
  pauseTimer: ReturnType<typeof setTimeout> | null;
}

export function useSmartTrigger(
  onTrigger: (text: string, cursorPosition: number) => void,
  options: SmartTriggerOptions = {}
) {
  const {
    pauseThreshold = 500,  // Kullanıcı 500ms durduğunda trigger
    minChars = 15,
    triggerAtBreakpoints = true,
    cooldown = 1000,  // Aynı text için 1 saniye bekle
  } = options;

  const stateRef = useRef<TriggerState>({
    lastKeyTime: 0,
    lastTriggerTime: 0,
    lastText: '',
    pauseTimer: null,
  });

  const clearPauseTimer = useCallback(() => {
    if (stateRef.current.pauseTimer) {
      clearTimeout(stateRef.current.pauseTimer);
      stateRef.current.pauseTimer = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPauseTimer();
  }, [clearPauseTimer]);

  const checkTrigger = useCallback(
    (text: string, cursorPosition: number) => {
      const now = Date.now();
      const state = stateRef.current;

      // Clear previous timer
      clearPauseTimer();

      // Update last key time
      state.lastKeyTime = now;

      // Check minimum characters
      if (text.length < minChars) {
        return;
      }

      // Get text before cursor
      const textBeforeCursor = text.substring(0, cursorPosition);
      if (textBeforeCursor.length === 0) {
        return;
      }

      const lastChar = textBeforeCursor[textBeforeCursor.length - 1];

      // Check if at natural breakpoint
      const isAtBreakpoint = /[\s.,!?;:\n]$/.test(textBeforeCursor);

      // Check cooldown - don't trigger if text hasn't changed significantly
      const textChanged = text !== state.lastText;
      const significantChange = Math.abs(text.length - state.lastText.length) > 3;
      const cooldownPassed = now - state.lastTriggerTime > cooldown;

      if (!textChanged || (!significantChange && !cooldownPassed)) {
        return;
      }

      // Immediate trigger on sentence end
      if (['.', '!', '?'].includes(lastChar) && lastChar !== state.lastText.slice(-1)) {
        state.lastText = text;
        state.lastTriggerTime = now;
        onTrigger(text, cursorPosition);
        return;
      }

      // Set pause timer for delayed trigger
      state.pauseTimer = setTimeout(() => {
        const timeSinceLastKey = Date.now() - state.lastKeyTime;

        // Only trigger if user has actually paused
        if (timeSinceLastKey >= pauseThreshold - 50) {
          // If we require breakpoints, check that
          if (triggerAtBreakpoints && !isAtBreakpoint) {
            return;
          }

          state.lastText = text;
          state.lastTriggerTime = Date.now();
          onTrigger(text, cursorPosition);
        }
      }, pauseThreshold);
    },
    [onTrigger, pauseThreshold, minChars, triggerAtBreakpoints, cooldown, clearPauseTimer]
  );

  const reset = useCallback(() => {
    clearPauseTimer();
    stateRef.current = {
      lastKeyTime: 0,
      lastTriggerTime: 0,
      lastText: '',
      pauseTimer: null,
    };
  }, [clearPauseTimer]);

  return { checkTrigger, reset };
}
