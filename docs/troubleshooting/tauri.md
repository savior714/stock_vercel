# Tauri Desktop App Troubleshooting

### Presets Missing Immediately After Installation (0 Presets)

**Symptoms:**
The preset list remains empty (0 items) even after clicking "Fetch Presets" on a newly installed app on a different machine.

**Cause:**
Production-built apps (NSIS) may fail to `fetch` static files like `preset_tickers.json` due to path or protocol issues. A fetch failure initializes as an empty array, resulting in no items.

**Resolution:**
Instead of relying solely on file loading, include the default preset data as constants (`constants/presets.ts`) within the code:
- Strengthen the fallback logic in `hooks/useTickers.ts` to use the `DEFAULT_PRESETS` constant if a fetch fails or the file path is unavailable.

---

### Preset Saving Failure (Forbidden Path)

**Symptoms:**
```
Failed to save presets: forbidden path: C:\Users\...\AppData\Local\com.stockvercel.app\
```

**Cause:**
Tauri v2's `fs:default` permission does not include write access to the `AppLocalData` directory by default.

**Resolution:**
Add explicit permissions in `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    {
      "identifier": "fs:allow-app-read-recursive",
      "allow": [{ "path": "$APPLOCALDATA/*" }]
    },
    {
      "identifier": "fs:allow-app-write-recursive",
      "allow": [{ "path": "$APPLOCALDATA/*" }]
    },
    {
      "identifier": "fs:allow-app-read",
      "allow": [{ "path": "$APPLOCALDATA" }]
    },
    {
      "identifier": "fs:allow-app-write",
      "allow": [{ "path": "$APPLOCALDATA" }]
    }
  ]
}
```

---

### Environment Detection Failure (isTauriEnv is Always false)

**Symptoms:**
- The app operates in web mode even when running as a Tauri app.
- Preset saving attempts to use the API (resulting in 404 errors).

**Cause:**
Due to Next.js SSR/SSG behavior, `const isTauriEnv = isTauriEnvironment()` is evaluated on the server-side and remains fixed as `false`.

**Resolution:**
Change `isTauriEnv` to use `useState` and `useEffect` so it is evaluated only on the client-side:

```typescript
// ❌ Incorrect
const isTauriEnv = isTauriEnvironment();

// ✅ Correct
const [isTauriEnv, setIsTauriEnv] = useState(false);

useEffect(() => {
  setIsTauriEnv(isTauriEnvironment());
}, []);
```

---

### Improved Environment Detection Function

**Issue:**
Simply checking `window.__TAURI__` might not be enough to detect a Tauri v2 environment.

**Resolution:**
Add multiple checks to the `isTauriEnvironment` function in `lib/http-client.ts`:

```typescript
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  // Check hostname, __TAURI__, and __TAURI_INTERNALS__
  return window.location.hostname === 'tauri.localhost' 
    || '__TAURI__' in window 
    || '__TAURI_INTERNALS__' in window;
}
```

---

### Windows Crate & WebView2-com Version Conflict (2026-02-08)

**Symptoms:**
`cargo check` fails with missing `ICoreWebView2Controller::cast` method or trait implementation errors.

**Cause:**
The `webview2-com` crate (0.38.2) requires `windows` crate version 0.58~0.61, but the project has 0.48 or 0.62 installed, causing trait mismatches.

**Resolution:**
Explicitly pin the `windows` version to **0.61** in `Cargo.toml`.
```toml
windows = { version = "0.61", features = ["Win32_Foundation", "Win32_Graphics_Gdi"] }
```

---

### Event Handlers Cannot Be Passed to Client Component Props (2026-02-09)

**Symptoms:**
Next.js runtime error: `Event handlers cannot be passed to Client Component props. <body onContextMenu={...}>`.

**Cause:**
`app/layout.tsx` is a server component by default and cannot pass event handlers directly to parent elements.

**Resolution:**
Create a separate client component (`DisableContextMenu.tsx`) to handle the events.

---

### WebView2 "White-out" (Background Transparency Fails)

**Symptoms:**
Setting `transparent: true` in `tauri.conf.json` results in a white or opaque window background.

**Cause:**
The default background color of the WebView2 controller itself is set to opaque (white).

**Resolution:**
Force the background color to transparent (Alpha 0) via the `ICoreWebView2Controller2` interface in the Rust backend.
```rust
use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Controller2;
// ...
controller.SetDefaultBackgroundColor(COREWEBVIEW2_COLOR { R: 0, G: 0, B: 0, A: 0 });
```

---

### Overlay Mode Not Responding (2026-02-09)

**Symptoms:**
The app does not become transparent when clicking other windows (Blur), or Click-through does not function.

**Cause 1 (JS/TS)**: The `init()` function for registering listeners inside `WindowEffect.tsx` is defined but not called.

**Cause 2 (Permissions)**: Tauri v2 permission policy requires `set_ignore_cursor_events` and `set_shadow` to be explicitly listed in `capabilities/default.json`.

**Resolution**:
- Add the `init()` call inside `useEffect` in `WindowEffect.tsx`.
- Add the following items to the `permissions` array in `src-tauri/capabilities/default.json`:
```json
"core:window:allow-set-ignore-cursor-events",
"core:window:allow-set-shadow"
```

**Note**: Changes to `capabilities` require a complete restart of the `tauri dev` process.
