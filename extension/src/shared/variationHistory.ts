import type { TransformResult } from './types';

export class VariationHistory {
  readonly #items: TransformResult[] = [];
  #index = -1;
  add(result: TransformResult): void {
    this.#items.push(result);
    this.#index = this.#items.length - 1;
  }
  previous(): TransformResult | undefined {
    if (this.#index > 0) this.#index -= 1;
    return this.current;
  }
  next(): TransformResult | undefined {
    if (this.#index < this.#items.length - 1) this.#index += 1;
    return this.current;
  }
  get current(): TransformResult | undefined {
    return this.#items[this.#index];
  }
  get length(): number {
    return this.#items.length;
  }
  get index(): number {
    return this.#index;
  }
}
