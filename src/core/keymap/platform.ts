export function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

export function shortcutKey(event: KeyboardEvent): string {
  // macOS Option changes event.key (Option+S becomes ß). Match the intended
  // letter key for shortcuts while leaving ordinary text input alone.
  if (event.altKey && /^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (event.altKey && /^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  return event.key;
}
