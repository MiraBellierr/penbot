export interface SelectionSnapshot {
  readonly text: string;
  readonly rect: DOMRect;
  readonly element: HTMLElement;
  isStillValid(): boolean;
  replace(text: string): boolean;
  insertAfter(text: string): boolean;
  restore(): boolean;
}

export interface SelectionAdapter {
  capture(target?: EventTarget | null): SelectionSnapshot | null;
}
