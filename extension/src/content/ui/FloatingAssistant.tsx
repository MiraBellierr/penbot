import { useCallback, useEffect, useRef, useState } from 'react';
import type { SelectionSnapshot } from '../selection/SelectionAdapter';
import { getSettings } from '../../shared/settings';
import { positionNearRect } from '../../shared/positioning';
import {
  ACTIONS,
  type Settings,
  type TextAction,
  type TransformResult,
  type TransformResponse,
} from '../../shared/types';
import { buildTransformRequest } from '../../shared/transformClient';
import { LanguageSelector } from './LanguageSelector';

const LABELS: Record<TextAction, string> = {
  grammar: 'Grammar',
  standard: 'Standard',
  fluent: 'Fluent',
  formal: 'Formal',
  answer: 'Answer',
  translate: 'Translate',
};

interface Props {
  snapshot: SelectionSnapshot;
  initialAction?: TextAction | undefined;
  collapsedInitially?: boolean;
  onClose: () => void;
}

function newSeed(): string {
  return crypto.randomUUID();
}

export function FloatingAssistant({
  snapshot,
  initialAction,
  collapsedInitially = false,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const activeRequest = useRef<string | undefined>(undefined);
  const initialActionRequested = useRef(false);
  const [settings, setSettings] = useState<Settings>();
  const [menuOpen, setMenuOpen] = useState(!collapsedInitially);
  const [action, setAction] = useState<TextAction | undefined>(initialAction);
  const [history, setHistory] = useState<TransformResult[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [edited, setEdited] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({
    left: snapshot.rect.left,
    top: snapshot.rect.bottom + 8,
  });

  useEffect(() => {
    void getSettings().then((value) => {
      setSettings(value);
      setSourceLanguage(value.sourceLanguage);
      setTargetLanguage(value.targetLanguage);
    });
  }, []);

  const cancelRequest = useCallback(() => {
    if (activeRequest.current) {
      void chrome.runtime.sendMessage({
        type: 'CANCEL_TRANSFORM',
        requestId: activeRequest.current,
      });
      activeRequest.current = undefined;
    }
  }, []);

  const close = useCallback(() => {
    cancelRequest();
    snapshot.restore();
    onClose();
  }, [cancelRequest, onClose, snapshot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: PointerEvent) => {
      if (!panelRef.current) return;
      const root = panelRef.current.getRootNode();
      const shadowHost = root instanceof ShadowRoot ? root.host : null;
      const path = event.composedPath();
      if (
        !path.includes(panelRef.current) &&
        (!shadowHost || !path.includes(shadowHost))
      )
        close();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
      cancelRequest();
    };
  }, [cancelRequest, close]);

  useEffect(() => {
    const reposition = () => {
      const box = panelRef.current?.getBoundingClientRect();
      setPosition(
        positionNearRect(snapshot.rect, box?.width ?? 620, box?.height ?? 50),
      );
    };
    const frame = requestAnimationFrame(reposition);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [snapshot, action, loading, historyIndex, menuOpen]);

  const request = useCallback(
    async (selectedAction: TextAction, regenerate = false) => {
      if (!settings) return;
      cancelRequest();
      if (!snapshot.isStillValid()) {
        setError(
          'The original selection changed and can no longer be safely restored.',
        );
        return;
      }
      setAction(selectedAction);
      setLoading(true);
      setError('');
      const requestId = newSeed();
      activeRequest.current = requestId;
      const invoke = async (
        variationSeed: string,
      ): Promise<TransformResponse> =>
        chrome.runtime.sendMessage({
          type: 'TRANSFORM',
          requestId,
          request: buildTransformRequest(
            selectedAction,
            snapshot.text,
            settings,
            sourceLanguage,
            targetLanguage,
            variationSeed,
          ),
        });
      try {
        let response = await invoke(newSeed());
        if (!response.success) throw new Error(response.error.message);
        const previous = history.at(-1)?.result;
        if (
          regenerate &&
          selectedAction !== 'grammar' &&
          response.data.result === previous
        ) {
          response = await invoke(newSeed());
          if (!response.success) throw new Error(response.error.message);
          if (response.data.result === previous)
            throw new Error(
              'DeepSeek returned the same variation twice. Please try again.',
            );
        }
        const data = response.data;
        setHistory((current) => {
          const next = [...current, data];
          setHistoryIndex(next.length - 1);
          return next;
        });
        setEdited(data.result);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'DeepSeek could not process the text.',
        );
      } finally {
        if (activeRequest.current === requestId)
          activeRequest.current = undefined;
        setLoading(false);
      }
    },
    [
      cancelRequest,
      history,
      settings,
      snapshot,
      sourceLanguage,
      targetLanguage,
    ],
  );

  useEffect(() => {
    if (settings && initialAction && !initialActionRequested.current) {
      initialActionRequested.current = true;
      void request(initialAction);
    }
  }, [initialAction, request, settings]);

  const chooseAction = (nextAction: TextAction) => {
    setHistory([]);
    setHistoryIndex(-1);
    setEdited('');
    void request(nextAction);
  };
  const navigate = (index: number) => {
    const item = history[index];
    if (!item) return;
    setHistoryIndex(index);
    setEdited(item.result);
  };
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };
  const apply = (insert: boolean) => {
    if (!edited.trim()) {
      setError('The result cannot be empty.');
      return;
    }
    const ok = insert ? snapshot.insertAfter(edited) : snapshot.replace(edited);
    if (!ok) {
      setError(
        'The original selection changed and could not be safely updated.',
      );
      return;
    }
    onClose();
  };

  const onToolbarKeyDown = (event: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const buttons = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-action]') ??
        [],
    );
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    buttons[(current + direction + buttons.length) % buttons.length]?.focus();
    event.preventDefault();
  };

  const current = history[historyIndex];
  return (
    <div
      ref={panelRef}
      className={`penbot${!action && !menuOpen ? ' launcher-shell' : ''}`}
      data-theme={settings?.theme ?? 'system'}
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label="Penbot writing assistant"
    >
      {!action && !menuOpen ? (
        <button
          className="launcher"
          type="button"
          aria-label="Open Penbot actions"
          title="Open Penbot actions"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setMenuOpen(true)}
        >
          <span aria-hidden="true">✦</span>
        </button>
      ) : !action ? (
        <div
          className="toolbar"
          role="toolbar"
          aria-label="Text actions"
          onPointerDown={(event) => event.preventDefault()}
          onKeyDown={onToolbarKeyDown}
        >
          {ACTIONS.map((item) => (
            <button
              type="button"
              data-action={item}
              key={item}
              title={LABELS[item]}
              aria-label={LABELS[item]}
              onClick={() => chooseAction(item)}
            >
              {LABELS[item]}
            </button>
          ))}
        </div>
      ) : (
        <section className="preview">
          <header>
            <strong>{LABELS[action]}</strong>
            <button
              className="icon"
              type="button"
              aria-label="Close"
              title="Close"
              onClick={close}
            >
              ×
            </button>
          </header>
          <p className="privacy-note">
            Only the selected text is sent to DeepSeek.
          </p>
          <label className="original">
            <span>Original</span>
            <pre>{snapshot.text}</pre>
          </label>
          {action === 'translate' && (
            <div className="languages">
              <LanguageSelector
                id="penbot-sources"
                label="From"
                source
                value={sourceLanguage}
                onChange={setSourceLanguage}
              />
              <LanguageSelector
                id="penbot-targets"
                label="To"
                value={targetLanguage}
                onChange={(value) => {
                  setTargetLanguage(value);
                  void chrome.storage.sync.set({ targetLanguage: value });
                }}
              />
            </div>
          )}
          {loading ? (
            <div className="status" role="status">
              <span className="spinner" /> Asking DeepSeek…
            </div>
          ) : error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : current ? (
            <>
              <label className="result">
                <span>{action === 'answer' ? 'Reply' : 'Result'}</span>
                <textarea
                  aria-label="Generated result"
                  value={edited}
                  onChange={(event) => setEdited(event.target.value)}
                />
              </label>
              {current.romanized && (
                <div className="secondary">
                  <span>Romanization</span>
                  <p>{current.romanized}</p>
                  <button
                    type="button"
                    onClick={() => void copy(current.romanized ?? '')}
                  >
                    Copy
                  </button>
                </div>
              )}
              {current.englishTranslation && (
                <div className="secondary">
                  <span>English</span>
                  <p>{current.englishTranslation}</p>
                  <button
                    type="button"
                    onClick={() => void copy(current.englishTranslation ?? '')}
                  >
                    Copy
                  </button>
                </div>
              )}
            </>
          ) : null}
          <footer>
            {history.length > 1 && (
              <div className="history">
                <button
                  type="button"
                  aria-label="Previous variation"
                  disabled={historyIndex <= 0}
                  onClick={() => navigate(historyIndex - 1)}
                >
                  ←
                </button>
                <span>
                  {historyIndex + 1}/{history.length}
                </span>
                <button
                  type="button"
                  aria-label="Next variation"
                  disabled={historyIndex >= history.length - 1}
                  onClick={() => navigate(historyIndex + 1)}
                >
                  →
                </button>
              </div>
            )}
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void request(action, true)}
            >
              {error && history.length === 0 ? 'Retry' : 'Regenerate'}
            </button>
            {current && (
              <button type="button" onClick={() => void copy(edited)}>
                {action === 'answer' ? 'Copy Reply' : 'Copy'}
              </button>
            )}
            {current && action === 'answer' && (
              <button
                className="primary"
                type="button"
                onClick={() => apply(true)}
              >
                Insert Reply
              </button>
            )}
            {current && action !== 'answer' && (
              <button
                className="primary"
                type="button"
                onClick={() => apply(false)}
              >
                Confirm
              </button>
            )}
          </footer>
        </section>
      )}
    </div>
  );
}
