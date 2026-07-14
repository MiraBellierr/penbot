import { handleContextMenu, registerContextMenus } from './contextMenu';
import { getSettings } from '../shared/settings';
import {
  isBackgroundMessage,
  parseTransformResponse,
} from '../shared/validation';
import type { TransformResponse } from '../shared/types';

const activeRequests = new Map<string, AbortController>();

chrome.runtime.onInstalled.addListener(registerContextMenus);
chrome.runtime.onStartup.addListener(registerContextMenus);
chrome.contextMenus.onClicked.addListener(handleContextMenu);

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'open-toolbar') return;
  void chrome.tabs
    .query({ active: true, currentWindow: true })
    .then(([tab]) => {
      if (tab?.id)
        return chrome.tabs.sendMessage(tab.id, { type: 'OPEN_TOOLBAR' });
    });
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.request),
        signal: controller.signal,
      },
    );
    const body: unknown = await response.json().catch(() => null);
    const parsed = parseTransformResponse(body);
    if (!response.ok && parsed.success)
      throw new Error('The backend returned an invalid status.');
    return parsed;
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
  if (message.type === 'CANCEL_TRANSFORM') {
    activeRequests.get(message.requestId)?.abort();
    activeRequests.delete(message.requestId);
    return false;
  }
  if (message.type !== 'TRANSFORM') return false;
  void transform(message).then(sendResponse);
  return true;
});
