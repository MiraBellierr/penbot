import { createRoot, type Root } from 'react-dom/client';
import { FloatingAssistant } from './ui/FloatingAssistant';
import { SelectionManager } from './selection/SelectionManager';
import { CONTENT_STYLES } from './styles';
import { getSettings } from '../shared/settings';
import { isBackgroundMessage } from '../shared/validation';
import type { TextAction } from '../shared/types';
import { findEditableTarget } from './selection/editableElements';
import { shouldOpenForSelectionKey } from './selection/selectionKeys';

const manager = new SelectionManager();
let root: Root | undefined;
let host: HTMLDivElement | undefined;
let lastEditableTarget: EventTarget | null = null;
let lastSnapshot: ReturnType<SelectionManager['capture']>;

function isExtensionEvent(event: Event): boolean {
  return Boolean(host && event.composedPath().includes(host));
}

function unmount(): void {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
}

function close(): void {
  unmount();
  lastSnapshot = null;
}

async function open(action?: TextAction, automatic = false): Promise<void> {
  const settings = await getSettings();
  const captured = manager.capture(
    lastEditableTarget ?? document.activeElement,
  );
  if (captured && captured.text.length <= settings.maxSelectionLength)
    lastSnapshot = captured;
  if (captured)
    void chrome.runtime.sendMessage({ type: 'SELECTION_AVAILABLE' });
  if (automatic && !settings.autoShow) return;
  const snapshot =
    captured ?? (lastSnapshot?.isStillValid() ? lastSnapshot : null);
  if (!snapshot || snapshot.text.length > settings.maxSelectionLength) return;
  unmount();
  lastSnapshot = snapshot;
  host = document.createElement('div');
  host.id = 'penbot-extension-root';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = CONTENT_STYLES;
  const mount = document.createElement('div');
  shadow.append(style, mount);
  document.documentElement.append(host);
  root = createRoot(mount);
  root.render(
    <FloatingAssistant
      snapshot={snapshot}
      initialAction={action}
      collapsedInitially={automatic}
      onClose={close}
    />,
  );
}

document.addEventListener(
  'pointerdown',
  (event) => {
    if (isExtensionEvent(event)) return;
    const target = findEditableTarget(event.target);
    if (target) lastEditableTarget = target;
  },
  true,
);
document.addEventListener(
  'mouseup',
  (event) => {
    if (isExtensionEvent(event)) return;
    const target = findEditableTarget(event.target);
    if (target) lastEditableTarget = target;
    queueMicrotask(() => {
      void open(undefined, true);
    });
  },
  true,
);
document.addEventListener(
  'keyup',
  (event) => {
    if (isExtensionEvent(event)) return;
    const target = findEditableTarget(event.target);
    if (target) lastEditableTarget = target;
    if (shouldOpenForSelectionKey(event))
      queueMicrotask(() => {
        void open(undefined, true);
      });
  },
  true,
);

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isBackgroundMessage(message) || message.type !== 'OPEN_TOOLBAR') return;
  void open(message.action);
});
