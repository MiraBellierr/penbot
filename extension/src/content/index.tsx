import { createRoot, type Root } from 'react-dom/client';
import { FloatingAssistant } from './ui/FloatingAssistant';
import { SelectionManager } from './selection/SelectionManager';
import { CONTENT_STYLES } from './styles';
import { getSettings } from '../shared/settings';
import { isBackgroundMessage } from '../shared/validation';
import type { TextAction } from '../shared/types';

const manager = new SelectionManager();
let root: Root | undefined;
let host: HTMLDivElement | undefined;
let lastTarget: EventTarget | null = null;

function close(): void {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
}

async function open(action?: TextAction, automatic = false): Promise<void> {
  const settings = await getSettings();
  if (automatic && !settings.autoShow) return;
  const snapshot = manager.capture(lastTarget ?? document.activeElement);
  if (!snapshot || snapshot.text.length > settings.maxSelectionLength) return;
  close();
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
      onClose={close}
    />,
  );
}

document.addEventListener(
  'pointerdown',
  (event) => {
    lastTarget = event.target;
  },
  true,
);
document.addEventListener(
  'mouseup',
  (event) => {
    lastTarget = event.target;
    queueMicrotask(() => {
      void open(undefined, true);
    });
  },
  true,
);
document.addEventListener(
  'keyup',
  (event) => {
    lastTarget = event.target;
    if (event.key.startsWith('Arrow') || event.key === 'Shift')
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
