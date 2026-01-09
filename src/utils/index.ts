export { debounce } from './debounce';
export { CompletionCache, completionCache } from './cache';

export function shouldTriggerCompletion(
  text: string,
  cursorPosition: number,
  minChars: number,
  triggerOnSentenceEnd: boolean
): boolean {
  if (text.length < minChars) {
    return false;
  }

  const textBeforeCursor = text.substring(0, cursorPosition);

  if (textBeforeCursor.length === 0) {
    return false;
  }

  const lastChar = textBeforeCursor[textBeforeCursor.length - 1];

  // Always trigger on sentence-ending punctuation if enabled
  if (triggerOnSentenceEnd && ['.', '!', '?', ':', ';'].includes(lastChar)) {
    return true;
  }

  // Trigger on space after some characters
  if (lastChar === ' ' && textBeforeCursor.trim().length >= minChars) {
    return true;
  }

  // Trigger when typing normally after minimum characters
  if (textBeforeCursor.length >= minChars) {
    // Add a slight delay by checking if we're at a word boundary
    const words = textBeforeCursor.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    // Trigger when the last word has at least 2 characters
    return lastWord.length >= 2;
  }

  return false;
}

export function getTextSegments(text: string, cursorPosition: number): {
  before: string;
  after: string;
  currentWord: string;
  currentSentence: string;
} {
  const before = text.substring(0, cursorPosition);
  const after = text.substring(cursorPosition);

  // Get current word
  const wordMatch = before.match(/[\w]+$/);
  const currentWord = wordMatch ? wordMatch[0] : '';

  // Get current sentence
  const sentenceMatch = before.match(/[^.!?]*$/);
  const currentSentence = sentenceMatch ? sentenceMatch[0].trim() : '';

  return { before, after, currentWord, currentSentence };
}
