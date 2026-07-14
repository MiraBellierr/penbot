export function dispatchBeforeInput(
  element: HTMLElement,
  text: string,
  inputType = 'insertReplacementText',
): boolean {
  const beforeInput = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    composed: true,
    data: text,
    inputType,
  });
  return element.dispatchEvent(beforeInput);
}

export function dispatchInputEvents(
  element: HTMLElement,
  text: string,
  inputType = 'insertReplacementText',
): void {
  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: text,
      inputType,
    }),
  );
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

export function dispatchReplacementEvents(
  element: HTMLElement,
  text: string,
  inputType = 'insertReplacementText',
): boolean {
  if (!dispatchBeforeInput(element, text, inputType)) return false;
  dispatchInputEvents(element, text, inputType);
  return true;
}
