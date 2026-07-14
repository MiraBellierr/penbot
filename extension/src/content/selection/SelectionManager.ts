import { ContentEditableSelectionAdapter } from './ContentEditableSelectionAdapter';
import { InputSelectionAdapter } from './InputSelectionAdapter';
import type { SelectionSnapshot } from './SelectionAdapter';

export class SelectionManager {
  readonly #input = new InputSelectionAdapter();
  readonly #editable = new ContentEditableSelectionAdapter();

  capture(
    target: EventTarget | null = document.activeElement,
  ): SelectionSnapshot | null {
    return this.#input.capture(target) ?? this.#editable.capture();
  }
}
