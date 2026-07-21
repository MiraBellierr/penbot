// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentEditableSelectionAdapter } from './ContentEditableSelectionAdapter';
import { InputSelectionAdapter } from './InputSelectionAdapter';
import { dispatchReplacementEvents } from './NativeEventDispatcher';
import { isRestrictedField } from './restrictions';
import { getTextControlSelectionRect } from './TextControlSelectionRect';
import { shouldOpenForSelectionKey } from './selectionKeys';

beforeEach(() => {
  document.body.textContent = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  delete (document as Partial<Document>).execCommand;
});

describe('input selection replacement', () => {
  it('positions against the selected text marker instead of the whole field', () => {
    const input = document.createElement('input');
    input.value = 'before selected after';
    document.body.append(input);
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 400, 30),
    );
    const markerRect = new DOMRect(130, 23, 75, 18);
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
      function (this: HTMLElement) {
        return (this instanceof HTMLSpanElement
          ? [markerRect]
          : []) as unknown as DOMRectList;
      },
    );

    expect(getTextControlSelectionRect(input, 7, 15)).toBe(markerRect);
  });

  it('replaces only the selected multiline text, dispatches native events, and places the caret', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'Before\nold text\nAfter';
    document.body.append(textarea);
    textarea.setSelectionRange(7, 15);
    const events: string[] = [];
    ['beforeinput', 'input', 'change'].forEach((name) =>
      textarea.addEventListener(name, () => events.push(name)),
    );
    const snapshot = new InputSelectionAdapter().capture(textarea)!;
    expect(snapshot.text).toBe('old text');
    expect(snapshot.replace('new\ncopy')).toBe(true);
    expect(textarea.value).toBe('Before\nnew\ncopy\nAfter');
    expect(textarea.selectionStart).toBe(15);
    expect(events).toEqual(['beforeinput', 'input', 'change']);
  });

  it('supports a Twitch-style controlled chat textarea', () => {
    const textarea = document.createElement('textarea');
    textarea.dataset.aTarget = 'chat-input';
    textarea.value = 'hello twitch chat';
    document.body.append(textarea);
    textarea.setSelectionRange(6, 12);
    const inputEvents: string[] = [];
    textarea.addEventListener('input', () => inputEvents.push(textarea.value));

    const snapshot = new InputSelectionAdapter().capture(textarea)!;
    expect(snapshot.replace('Twitch')).toBe(true);
    expect(textarea.value).toBe('hello Twitch chat');
    expect(inputEvents).toEqual(['hello Twitch chat']);
  });

  it('restores a selection and refuses replacement after content changes', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = 'hello world';
    document.body.append(input);
    input.setSelectionRange(0, 5);
    const snapshot = new InputSelectionAdapter().capture(input)!;
    input.setSelectionRange(6, 11);
    expect(snapshot.restore()).toBe(true);
    expect(input.selectionStart).toBe(0);
    input.value = 'changed';
    expect(snapshot.replace('Hi')).toBe(false);
  });

  it('inserts Answer text after the selection without overwriting it', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = 'Question? Rest';
    document.body.append(input);
    input.setSelectionRange(0, 9);
    const snapshot = new InputSelectionAdapter().capture(input)!;
    expect(snapshot.insertAfter(' Reply.')).toBe(true);
    expect(input.value).toBe('Question? Reply. Rest');
  });
});

describe('contenteditable replacement', () => {
  it('preserves surrounding nodes and formatting', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.innerHTML = '<b>Before </b><span>old text</span><i> after</i>';
    document.body.append(editor);
    const text = editor.querySelector('span')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 8);
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(0, 0, 30, 10),
    });
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const snapshot = new ContentEditableSelectionAdapter().capture()!;
    const inputs: string[] = [];
    editor.addEventListener('input', () => inputs.push('input'));
    expect(snapshot.replace('new copy')).toBe(true);
    expect(editor.querySelector('b')?.textContent).toBe('Before ');
    expect(editor.querySelector('i')?.textContent).toBe(' after');
    expect(editor.textContent).toBe('Before new copy after');
    expect(inputs).toEqual(['input']);
  });

  it('recognizes a nested Discord-style rich editor and uses native insertion', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', '');
    editor.setAttribute('role', 'textbox');
    editor.dataset.slateEditor = 'true';
    editor.innerHTML =
      '<span data-slate-node="text"><span data-slate-leaf="true">hello discord</span></span>';
    document.body.append(editor);
    const text = editor.querySelector('[data-slate-leaf]')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 6);
    range.setEnd(text, 13);
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(0, 0, 30, 10),
    });
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const execute = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execute,
    });

    const snapshot = new ContentEditableSelectionAdapter().capture()!;
    expect(snapshot.text).toBe('discord');
    expect(snapshot.replace('Discord')).toBe(true);
    expect(execute).toHaveBeenCalledWith('insertText', false, 'Discord');
  });
});

describe('event and field safety', () => {
  it.each([
    ['Ctrl+A', new KeyboardEvent('keyup', { key: 'a', ctrlKey: true })],
    [
      'Ctrl+A uppercase',
      new KeyboardEvent('keyup', { key: 'A', ctrlKey: true }),
    ],
    ['Cmd+A', new KeyboardEvent('keyup', { key: 'a', metaKey: true })],
    ['Shift', new KeyboardEvent('keyup', { key: 'Shift' })],
    [
      'Arrow selection',
      new KeyboardEvent('keyup', { key: 'ArrowRight', shiftKey: true }),
    ],
  ])('opens for %s keyboard selection', (_name, event) => {
    expect(shouldOpenForSelectionKey(event)).toBe(true);
  });

  it('does not open for an ordinary A keypress', () => {
    expect(
      shouldOpenForSelectionKey(new KeyboardEvent('keyup', { key: 'a' })),
    ).toBe(false);
  });

  it('honors cancelled beforeinput events', () => {
    const element = document.createElement('div');
    element.addEventListener('beforeinput', (event) => event.preventDefault());
    expect(dispatchReplacementEvents(element, 'text')).toBe(false);
  });

  it.each([
    ['password', { type: 'password' }],
    ['payment field', { type: 'text', name: 'credit-card-number' }],
    ['one-time code', { type: 'text', autocomplete: 'one-time-code' }],
  ])('rejects a restricted %s', (_name, attributes) => {
    const input = document.createElement('input');
    Object.assign(input, attributes);
    expect(isRestrictedField(input)).toBe(true);
  });
});
