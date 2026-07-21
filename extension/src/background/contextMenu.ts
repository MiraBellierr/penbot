import type { TextAction } from '../shared/types';

const MENUS: Array<[TextAction, string]> = [
  ['grammar', 'Correct Grammar'],
  ['standard', 'Standard Rephrase'],
  ['fluent', 'Fluent Rephrase'],
  ['formal', 'Formal Rephrase'],
  ['answer', 'Generate Answer'],
  ['translate', 'Translate'],
];

export function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    for (const [id, title] of MENUS)
      chrome.contextMenus.create({
        id,
        title,
        contexts: ['editable'],
        documentUrlPatterns: ['http://*/*', 'https://*/*'],
      });
  });
}

export function handleContextMenu(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): void {
  if (!tab?.id || !MENUS.some(([id]) => id === info.menuItemId)) return;
  const message = { type: 'OPEN_TOOLBAR', action: info.menuItemId };
  if (info.frameId === undefined) void chrome.tabs.sendMessage(tab.id, message);
  else void chrome.tabs.sendMessage(tab.id, message, { frameId: info.frameId });
}
