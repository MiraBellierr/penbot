import {
  dispatchBeforeInput,
  dispatchInputEvents,
} from './NativeEventDispatcher';
import type { SelectionAdapter, SelectionSnapshot } from './SelectionAdapter';
import { findContentEditableRoot } from './editableElements';
import { isRestrictedField } from './restrictions';

export class ContentEditableSelectionAdapter implements SelectionAdapter {
  capture(): SelectionSnapshot | null {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
      return null;
    const range = selection.getRangeAt(0);
    const root = findContentEditableRoot(range.commonAncestorContainer);
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

    const valid = (): boolean =>
      root.isConnected &&
      savedRange.toString() === text &&
      root.contains(savedRange.commonAncestorContainer);
    const select = (targetRange: Range): boolean => {
      if (!valid()) return false;
      const current = document.getSelection();
      if (!current) return false;
      current.removeAllRanges();
      current.addRange(targetRange);
      return true;
    };
    const selectRange = (): boolean => select(savedRange);
    const replaceRange = (replacement: string, insert: boolean): boolean => {
      const working = savedRange.cloneRange();
      if (insert) working.collapse(false);
      if (!select(working)) return false;
      const inputType = insert ? 'insertText' : 'insertReplacementText';
      if (typeof document.execCommand === 'function') {
        try {
          if (document.execCommand('insertText', false, replacement)) {
            root.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        } catch {
          // Some editors disable execCommand; the guarded DOM path below remains available.
        }
        if (!select(working)) return false;
      }
      const contentBeforeEvent = root.textContent;
      if (!dispatchBeforeInput(root, replacement, inputType))
        return root.textContent !== contentBeforeEvent;
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
      get rect() {
        return savedRange.getBoundingClientRect();
      },
      element: root,
      isStillValid: valid,
      replace: (replacement) => replaceRange(replacement, false),
      insertAfter: (reply) => replaceRange(reply, true),
      restore: selectRange,
    };
  }
}
