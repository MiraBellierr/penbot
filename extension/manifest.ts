import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Penbot – DeepSeek Writing Assistant',
  version: '1.0.0',
  description:
    'Correct, rewrite, answer, and translate selected text with DeepSeek-V4-Flash.',
  permissions: ['storage', 'contextMenus', 'activeTab'],
  host_permissions: ['https://api.deepseek.com/*'],
  optional_host_permissions: ['https://*/*', 'http://*/*'],
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  action: { default_popup: 'popup.html', default_title: 'Penbot' },
  options_page: 'options.html',
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
      all_frames: true,
      match_about_blank: true,
    },
  ],
  commands: {
    'open-toolbar': {
      suggested_key: { default: 'Alt+Shift+P', mac: 'Alt+Shift+P' },
      description: 'Open Penbot for the current selection',
    },
  },
  web_accessible_resources: [],
});
