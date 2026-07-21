export function shouldOpenForSelectionKey(event: KeyboardEvent): boolean {
  const selectAll =
    (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a';
  return selectAll || event.key.startsWith('Arrow') || event.key === 'Shift';
}
