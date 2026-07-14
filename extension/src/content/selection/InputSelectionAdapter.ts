import type { SelectionAdapter, SelectionSnapshot } from './SelectionAdapter';
import { isRestrictedField } from './restrictions';

type TextControl = HTMLInputElement | HTMLTextAreaElement;

function isSupported(element: Element): element is TextControl {
  return (
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement &&
      ['text', 'search'].includes(element.type))
  );
}

function setNativeValue(element: TextControl, value: string): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (!descriptor?.set) throw new Error('Native value setter is unavailable.');
  descriptor.set.call(element, value);
}

export class InputSelectionAdapter implements SelectionAdapter {
  capture(
    target: EventTarget | null = document.activeElement,
  ): SelectionSnapshot | null {
    if (
      !(target instanceof Element) ||
      !isSupported(target) ||
      isRestrictedField(target)
    )
      return null;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start === null || end === null || start === end) return null;
    const originalValue = target.value;
    const text = originalValue.slice(start, end);
    const rect = target.getBoundingClientRect();

    const valid = (): boolean =>
      target.isConnected &&
      target.value === originalValue &&
      target.value.slice(start, end) === text;
    const focusAndSelect = (from: number, to: number): void => {
      target.focus({ preventScroll: true });
      target.setSelectionRange(from, to);
    };
    const mutate = (replacement: string, insert: boolean): boolean => {
      if (!valid()) return false;
      const insertionPoint = insert ? end : start;
      const deleteEnd = insert ? end : end;
      focusAndSelect(insert ? end : start, end);
      const before = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: replacement,
        inputType: insert ? 'insertText' : 'insertReplacementText',
      });
      if (!target.dispatchEvent(before)) return false;
      const nextValue =
        originalValue.slice(0, insertionPoint) +
        replacement +
        originalValue.slice(deleteEnd);
      setNativeValue(target, nextValue);
      target.setSelectionRange(
        insertionPoint + replacement.length,
        insertionPoint + replacement.length,
      );
      target.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          data: replacement,
          inputType: insert ? 'insertText' : 'insertReplacementText',
        }),
      );
      target.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    return {
      text,
      rect,
      element: target,
      isStillValid: valid,
      replace: (replacement) => mutate(replacement, false),
      insertAfter: (reply) => mutate(reply, true),
      restore: () => {
        if (!valid()) return false;
        focusAndSelect(start, end);
        return true;
      },
    };
  }
}
