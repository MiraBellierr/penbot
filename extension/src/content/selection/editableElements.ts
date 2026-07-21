export type SupportedTextControl = HTMLInputElement | HTMLTextAreaElement;

export function findContentEditableRoot(node: Node): HTMLElement | null {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return null;
  const declaredRoot = element.closest('[contenteditable]');
  if (!(declaredRoot instanceof HTMLElement)) return null;
  const mode = declaredRoot.getAttribute('contenteditable')?.toLowerCase();
  if (mode === 'false') return null;
  return mode === '' ||
    mode === 'true' ||
    mode === 'plaintext-only' ||
    declaredRoot.isContentEditable
    ? declaredRoot
    : null;
}

export function findEditableTarget(
  target: EventTarget | null,
): HTMLElement | null {
  if (!(target instanceof Node)) return null;
  if (target instanceof HTMLTextAreaElement) return target;
  if (
    target instanceof HTMLInputElement &&
    ['text', 'search'].includes(target.type)
  )
    return target;
  return findContentEditableRoot(target);
}
