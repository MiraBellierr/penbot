export interface Point {
  left: number;
  top: number;
}

export function positionNearRect(
  rect: DOMRect,
  width: number,
  height: number,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
): Point {
  const gap = 8;
  const margin = 8;
  let left = rect.left + rect.width / 2 - width / 2;
  let top = rect.bottom + gap;
  if (top + height > viewportHeight - margin) top = rect.top - height - gap;
  left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
  top = Math.max(margin, Math.min(top, viewportHeight - height - margin));
  return { left, top };
}
