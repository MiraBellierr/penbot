type TextControl = HTMLInputElement | HTMLTextAreaElement;

const MIRRORED_PROPERTIES = [
  'borderBottomWidth',
  'borderBottomStyle',
  'borderLeftWidth',
  'borderLeftStyle',
  'borderRightWidth',
  'borderRightStyle',
  'borderTopWidth',
  'borderTopStyle',
  'boxSizing',
  'direction',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'overflowWrap',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'tabSize',
  'textAlign',
  'textIndent',
  'textTransform',
  'wordBreak',
] as const;

function usableRect(rect: DOMRect): boolean {
  return (
    Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.height > 0
  );
}

export function getTextControlSelectionRect(
  element: TextControl,
  start: number,
  end: number,
): DOMRect {
  const controlRect = element.getBoundingClientRect();
  const mirror = document.createElement('div');
  const marker = document.createElement('span');
  const computed = getComputedStyle(element);

  mirror.setAttribute('aria-hidden', 'true');
  Object.assign(mirror.style, {
    position: 'fixed',
    visibility: 'hidden',
    pointerEvents: 'none',
    contain: 'strict',
    left: `${controlRect.left}px`,
    top: `${controlRect.top}px`,
    width: `${controlRect.width}px`,
    height: `${controlRect.height}px`,
    margin: '0',
    overflow: 'hidden',
    whiteSpace: element instanceof HTMLInputElement ? 'pre' : 'pre-wrap',
  });
  for (const property of MIRRORED_PROPERTIES) {
    mirror.style[property] = computed[property];
  }

  mirror.append(document.createTextNode(element.value.slice(0, start)));
  marker.textContent = element.value.slice(start, end) || '\u200b';
  marker.append(document.createTextNode('\u200b'));
  mirror.append(marker);
  document.body.append(mirror);
  mirror.scrollLeft = element.scrollLeft;
  mirror.scrollTop = element.scrollTop;

  const rectangles = Array.from(marker.getClientRects());
  const selectionRect = rectangles.at(-1) ?? marker.getBoundingClientRect();
  mirror.remove();
  return usableRect(selectionRect) ? selectionRect : controlRect;
}
