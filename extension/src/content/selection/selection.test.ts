// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { ContentEditableSelectionAdapter } from './ContentEditableSelectionAdapter';
import { InputSelectionAdapter } from './InputSelectionAdapter';
import { dispatchReplacementEvents } from './NativeEventDispatcher';
import { isRestrictedField } from './restrictions';

beforeEach(() => {
  document.body.textContent = '';
});

describe('input selection replacement', () => {
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
});

describe('event and field safety', () => {
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
