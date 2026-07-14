export const CONTENT_STYLES = `
:host { all: initial; color-scheme: light dark; }
*, *::before, *::after { box-sizing: border-box; }
.penbot { --bg:#fff; --surface:#f6f7f9; --text:#17202a; --muted:#667085; --border:#d7dce2; --accent:#5b46e8; --danger:#b42318; position:fixed; z-index:2147483000; width:max-content; max-width:calc(100vw - 16px); color:var(--text); background:var(--bg); border:1px solid var(--border); border-radius:12px; box-shadow:0 12px 36px rgba(16,24,40,.22); font:13px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
.penbot[data-theme="dark"] { --bg:#17181c; --surface:#25272d; --text:#f2f4f7; --muted:#aeb4c0; --border:#3c4049; --accent:#9b8cff; --danger:#ff8a80; }
@media (prefers-color-scheme:dark) { .penbot[data-theme="system"] { --bg:#17181c; --surface:#25272d; --text:#f2f4f7; --muted:#aeb4c0; --border:#3c4049; --accent:#9b8cff; --danger:#ff8a80; } }
button,input,textarea { font:inherit; color:inherit; }
button { border:1px solid var(--border); background:var(--bg); border-radius:7px; padding:6px 10px; cursor:pointer; white-space:nowrap; }
button:hover:not(:disabled), button:focus-visible { border-color:var(--accent); outline:2px solid color-mix(in srgb,var(--accent) 24%,transparent); outline-offset:1px; }
button:disabled { opacity:.45; cursor:not-allowed; }
.toolbar { display:flex; gap:4px; padding:6px; max-width:calc(100vw - 18px); overflow-x:auto; }
.toolbar button { border:0; }
.preview { width:min(520px,calc(100vw - 18px)); padding:14px; }
header { display:flex; align-items:center; justify-content:space-between; font-size:15px; }
.icon { border:0; font-size:20px; padding:0 5px; }
.privacy-note { color:var(--muted); margin:4px 0 10px; font-size:11px; }
label>span,.secondary>span { display:block; color:var(--muted); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; margin-bottom:4px; }
.original pre { max-height:90px; overflow:auto; white-space:pre-wrap; word-break:break-word; background:var(--surface); border-radius:7px; padding:8px; margin:0 0 10px; font:12px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace; }
.result textarea { width:100%; min-height:120px; resize:vertical; border:1px solid var(--border); border-radius:8px; background:var(--bg); padding:9px; }
.languages { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
.language-field input { width:100%; border:1px solid var(--border); border-radius:7px; background:var(--bg); padding:7px; }
.secondary { position:relative; background:var(--surface); border-radius:7px; padding:8px 58px 8px 8px; margin-top:8px; }
.secondary p { margin:0; white-space:pre-wrap; }
.secondary button { position:absolute; right:6px; top:6px; padding:3px 6px; font-size:11px; }
.status,.error { padding:22px 8px; text-align:center; }
.error { color:var(--danger); }
.spinner { display:inline-block; width:14px; height:14px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .8s linear infinite; vertical-align:-2px; margin-right:6px; }
@keyframes spin { to { transform:rotate(360deg); } }
footer { display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:6px; margin-top:12px; }
.primary { background:var(--accent); color:white; border-color:var(--accent); }
.history { display:flex; align-items:center; gap:5px; margin-right:auto; color:var(--muted); }
.history button { padding:4px 7px; }
@media (max-width:480px) { .preview { padding:10px; } .languages { grid-template-columns:1fr; } footer { justify-content:stretch; } footer>button { flex:1; } }
`;
