import { handleContextMenu, registerContextMenus } from './contextMenu';
import { getSettings } from '../shared/settings';
import {
  isBackgroundMessage,
  parseTransformResponse,
} from '../shared/validation';
import type { TransformResponse } from '../shared/types';

const activeRequests = new Map<string, AbortController>();
const selectionFrameKey = (tabId: number) => `selection-frame:${tabId}`;

async function rememberSelectionFrame(
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  if (sender.tab?.id === undefined) return;
  await chrome.storage.session.set({
    [selectionFrameKey(sender.tab.id)]: sender.frameId ?? 0,
  });
}

async function openSelectionInActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;
  const key = selectionFrameKey(tab.id);
  const stored = await chrome.storage.session.get(key);
  const frameId = typeof stored[key] === 'number' ? stored[key] : 0;
  try {
    await chrome.tabs.sendMessage(
      tab.id,
      { type: 'OPEN_TOOLBAR' },
      { frameId },
    );
  } catch {
    if (frameId !== 0)
      await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_TOOLBAR' });
  }
}

chrome.runtime.onInstalled.addListener(registerContextMenus);
chrome.runtime.onStartup.addListener(registerContextMenus);
chrome.contextMenus.onClicked.addListener(handleContextMenu);

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'open-toolbar') return;
  void openSelectionInActiveTab();
});

async function transform(
  message: Extract<ReturnType<typeof normalizeMessage>, { type: 'TRANSFORM' }>,
): Promise<TransformResponse> {
  const settings = await getSettings();
  const controller = new AbortController();
  activeRequests.get(message.requestId)?.abort();
  activeRequests.set(message.requestId, controller);
  const timeout = setTimeout(
    () => controller.abort(),
    settings.requestTimeoutMs,
  );
  try {
    const response = await fetch(
      `${settings.backendUrl.replace(/\/$/, '')}/api/transform`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(message.request),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      if (body !== null && typeof body === 'object') {
        const parsed = parseTransformResponse(body);
        if (!parsed.success) return parsed;
        throw new Error('The backend returned an invalid status.');
      }
      throw new Error(
        `The backend returned an error (HTTP ${response.status}).`,
      );
    }
    const body: unknown = await response.json().catch(() => null);
    if (body === null)
      throw new Error('The backend returned a non-JSON response.');
    return parseTransformResponse(body);
  } catch (cause) {
    const timedOut = controller.signal.aborted;
    return {
      success: false,
      error: {
        code: timedOut ? 'REQUEST_ABORTED' : 'NETWORK_ERROR',
        message: timedOut
          ? 'The request took too long and was cancelled.'
          : cause instanceof Error
            ? cause.message
            : 'DeepSeek is unavailable.',
      },
    };
  } finally {
    clearTimeout(timeout);
    activeRequests.delete(message.requestId);
  }
}

function normalizeMessage(message: unknown) {
  if (!isBackgroundMessage(message)) return null;
  return message;
}

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  const message = normalizeMessage(raw);
  if (!message) return false;
  if (message.type === 'SELECTION_AVAILABLE') {
    void rememberSelectionFrame(sender);
    return false;
  }
  if (message.type === 'OPEN_ACTIVE_SELECTION') {
    void openSelectionInActiveTab().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'CANCEL_TRANSFORM') {
    activeRequests.get(message.requestId)?.abort();
    activeRequests.delete(message.requestId);
    return false;
  }
  if (message.type !== 'TRANSFORM') return false;
  void transform(message).then(sendResponse);
  return true;
});
