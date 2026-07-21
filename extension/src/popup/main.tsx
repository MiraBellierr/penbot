import { createRoot } from 'react-dom/client';
import './popup.css';

function Popup() {
  const openToolbar = async () => {
    await chrome.runtime.sendMessage({ type: 'OPEN_ACTIVE_SELECTION' });
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
