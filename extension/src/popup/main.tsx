import { createRoot } from 'react-dom/client';
import './popup.css';

function Popup() {
  const openToolbar = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id)
      await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_TOOLBAR' });
    window.close();
  };
  return (
    <main>
      <h1>Penbot</h1>
      <p>
        Select text in an editable field, then choose a DeepSeek writing action.
      </p>
      <button onClick={() => void openToolbar()}>Open for selection</button>
      <button
        className="secondary"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        Settings
      </button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Popup />);
