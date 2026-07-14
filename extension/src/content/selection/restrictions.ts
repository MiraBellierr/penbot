export function isRestrictedField(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'password' || element.disabled || element.readOnly)
      return true;
  }
  if (
    element instanceof HTMLTextAreaElement &&
    (element.disabled || element.readOnly)
  )
    return true;
  const hint = [
    element.getAttribute('autocomplete'),
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.getAttribute('aria-label'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /credit.?card|card.?number|cc-?num|cvv|cvc|security.?code|one.?time.?code/.test(
    hint,
  );
}
