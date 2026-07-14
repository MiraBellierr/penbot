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
  void chrome.tabs.sendMessage(tab.id, {
    type: 'OPEN_TOOLBAR',
    action: info.menuItemId,
  });
}
