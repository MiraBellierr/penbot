import { useEffect, useState } from 'react';
import { LANGUAGES, SOURCE_LANGUAGES } from '../shared/languages';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
} from '../shared/settings';
import type { Settings } from '../shared/types';
import './options.css';

function originPattern(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/*`;
  } catch {
    return null;
  }
}

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState('');
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const pattern = originPattern(settings.backendUrl);
    if (!pattern) {
      setStatus('Enter a valid backend URL.');
      return;
    }
    const alreadyAllowed = await chrome.permissions.contains({
      origins: [pattern],
    });
    if (!alreadyAllowed) {
      const granted = await chrome.permissions.request({ origins: [pattern] });
      if (!granted) {
        setStatus('Permission to contact that backend was not granted.');
        return;
      }
    }
    await saveSettings(settings);
    setStatus('Settings saved.');
  };
  return (
    <main>
      <header>
        <div>
          <h1>Penbot settings</h1>
          <p>Configure the secure backend used by the extension.</p>
        </div>
        <div className="provider">
          <strong>AI provider: DeepSeek</strong>
          <span>AI model: DeepSeek-V4-Flash</span>
        </div>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        <section>
          <h2>Connection</h2>
          <label>
            Backend API URL
            <input
              type="url"
              required
              value={settings.backendUrl}
              onChange={(event) => update('backendUrl', event.target.value)}
            />
            <small>
              The browser sends selected text to this server; the server stores
              the DeepSeek key.
            </small>
          </label>
          <label>
            Request timeout (milliseconds)
            <input
              type="number"
              min="1000"
              max="120000"
              value={settings.requestTimeoutMs}
              onChange={(event) =>
                update('requestTimeoutMs', Number(event.target.value))
              }
            />
          </label>
        </section>
        <section>
          <h2>Writing</h2>
          <div className="grid">
            <label>
              Default source language
              <select
                value={settings.sourceLanguage}
                onChange={(event) =>
                  update('sourceLanguage', event.target.value)
                }
              >
                {SOURCE_LANGUAGES.map((language) => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </label>
            <label>
              Default target language
              <select
                value={settings.targetLanguage}
                onChange={(event) =>
                  update('targetLanguage', event.target.value)
                }
              >
                {LANGUAGES.map((language) => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Preferred English dialect
            <select
              value={settings.dialect}
              onChange={(event) =>
                update('dialect', event.target.value as Settings['dialect'])
              }
            >
              <option value="none">No preference</option>
              <option value="american">American English</option>
              <option value="british">British English</option>
              <option value="australian">Australian English</option>
            </select>
          </label>
          <label>
            Custom writing preferences
            <textarea
              maxLength={1000}
              value={settings.customInstructions}
              onChange={(event) =>
                update('customInstructions', event.target.value)
              }
            />
          </label>
        </section>
        <section>
          <h2>Interface and safety</h2>
          <div className="grid">
            <label>
              Theme
              <select
                value={settings.theme}
                onChange={(event) =>
                  update('theme', event.target.value as Settings['theme'])
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Maximum selected-text length
              <input
                type="number"
                min="1"
                max="10000"
                value={settings.maxSelectionLength}
                onChange={(event) =>
                  update('maxSelectionLength', Number(event.target.value))
                }
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.autoShow}
              onChange={(event) => update('autoShow', event.target.checked)}
            />{' '}
            Show the floating toolbar automatically
          </label>
        </section>
        <section>
          <h2>Keyboard shortcut</h2>
          <p>
            The default shortcut is <kbd>Alt</kbd> + <kbd>Shift</kbd> +{' '}
            <kbd>P</kbd>. Change it at{' '}
            <code>chrome://extensions/shortcuts</code> (or your browser’s
            equivalent extension shortcut page).
          </p>
        </section>
        <div className="actions">
          <button type="submit">Save settings</button>
          <span role="status">{status}</span>
        </div>
      </form>
    </main>
  );
}
