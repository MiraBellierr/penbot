import {
  dispatchBeforeInput,
  dispatchInputEvents,
} from './NativeEventDispatcher';
import type { SelectionAdapter, SelectionSnapshot } from './SelectionAdapter';
import { isRestrictedField } from './restrictions';

function editableRoot(node: Node): HTMLElement | null {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return null;
  const editable = element.closest(
    '[contenteditable="true"], [contenteditable="plaintext-only"]',
  );
  return editable instanceof HTMLElement ? editable : null;
}

export class ContentEditableSelectionAdapter implements SelectionAdapter {
  capture(): SelectionSnapshot | null {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
      return null;
    const range = selection.getRangeAt(0);
    const root = editableRoot(range.commonAncestorContainer);
    if (
      !root ||
      isRestrictedField(root) ||
      !root.contains(range.startContainer) ||
      !root.contains(range.endContainer)
    )
      return null;
    const savedRange = range.cloneRange();
    const text = savedRange.toString();
    if (!text) return null;
    const rect = savedRange.getBoundingClientRect();

    const valid = (): boolean =>
      root.isConnected &&
      savedRange.toString() === text &&
      root.contains(savedRange.commonAncestorContainer);
    const selectRange = (): boolean => {
      if (!valid()) return false;
      const current = document.getSelection();
      if (!current) return false;
      current.removeAllRanges();
      current.addRange(savedRange);
      return true;
    };
    const replaceRange = (replacement: string, insert: boolean): boolean => {
      if (!selectRange()) return false;
      const working = savedRange.cloneRange();
      if (insert) working.collapse(false);
      const inputType = insert ? 'insertText' : 'insertReplacementText';
      if (!dispatchBeforeInput(root, replacement, inputType)) return false;
      working.deleteContents();
      const textNode = document.createTextNode(replacement);
      working.insertNode(textNode);
      const caret = document.createRange();
      caret.setStartAfter(textNode);
      caret.collapse(true);
      const current = document.getSelection();
      current?.removeAllRanges();
      current?.addRange(caret);
      dispatchInputEvents(root, replacement, inputType);
      return true;
    };
    return {
      text,
      rect,
      element: root,
      isStillValid: valid,
      replace: (replacement) => replaceRange(replacement, false),
      insertAfter: (reply) => replaceRange(reply, true),
      restore: selectRange,
    };
  }
}
