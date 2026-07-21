// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SelectionSnapshot } from '../selection/SelectionAdapter';
import { DEFAULT_SETTINGS } from '../../shared/settings';
import { FloatingAssistant } from './FloatingAssistant';

describe('FloatingAssistant launcher', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: vi.fn(async () => DEFAULT_SETTINGS),
          set: vi.fn(async () => undefined),
        },
      },
      runtime: { sendMessage: vi.fn(async () => undefined) },
    });
  });

  afterEach(() => {
    document.body.textContent = '';
    vi.unstubAllGlobals();
  });

  it('opens from a closed Shadow DOM without the outside-click handler closing it', async () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const mount = document.createElement('div');
    shadow.append(mount);
    document.body.append(host);
    const onClose = vi.fn();
    const snapshot: SelectionSnapshot = {
      text: 'selected text',
      rect: new DOMRect(100, 100, 80, 20),
      element: document.body,
      isStillValid: () => true,
      replace: () => true,
      insertAfter: () => true,
      restore: () => true,
    };
    const root = createRoot(mount);

    await act(async () => {
      root.render(
        <FloatingAssistant
          snapshot={snapshot}
          collapsedInitially
          onClose={onClose}
        />,
      );
      await Promise.resolve();
    });
    const launcher = shadow.querySelector<HTMLButtonElement>('.launcher');
    expect(launcher).not.toBeNull();

    await act(async () => {
      launcher?.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
      launcher?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true }),
      );
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(shadow.querySelector('[role="toolbar"]')).not.toBeNull();
    await act(async () => root.unmount());
  });
});
