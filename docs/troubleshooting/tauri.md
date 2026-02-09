# Tauri 데스크톱 앱 관련 트러블슈팅

### 설치 직후 프리셋이 0개로 나옴 (Missing Presets)

**증상:**
다른 컴퓨터에 앱을 설치한 직후 "프리셋 가져오기"를 눌러도 리스트가 비어있음 (0개).

**원인:**
프로덕션(NSIS) 빌드된 앱은 정적 파일(`preset_tickers.json`)을 `fetch`로 로드하려 할 때 경로 문제나 프로토콜 문제로 실패할 수 있습니다. `fetch` 실패 시 빈 배열로 초기화되면서 아무것도 뜨지 않게 됨.

**해결 방법:**
파일 로딩에 의존하지 않고, 기본 프리셋 데이터를 코드 내 상수(`constants/presets.ts`)로 포함시켜 직접 로드하도록 수정:
- `hooks/useTickers.ts`에서 `fetch` 실패 시 또는 기본 경로에서 `DEFAULT_PRESETS` 상수를 사용하도록 폴백 로직 강화.

### 프리셋 저장 실패 (Forbidden Path)

**증상:**
```
프리셋 저장에 실패했습니다: forbidden path: C:\Users\...\AppData\Local\com.stockvercel.app\
```

**원인:**
Tauri v2의 `fs:default` 권한은 `AppLocalData` 디렉토리에 대한 쓰기 권한을 포함하지 않습니다.

**해결 방법:**
`src-tauri/capabilities/default.json`에 명시적 권한 추가:

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

### 환경 감지 실패 (isTauriEnv가 항상 false)

**증상:**
- Tauri 앱에서 실행해도 웹 모드로 작동
- 프리셋이 API로 저장 시도 (404 에러)

**원인:**
Next.js SSR/SSG 특성상 `const isTauriEnv = isTauriEnvironment()`가 서버 사이드에서 평가되어 항상 `false`로 고정됩니다.

**해결 방법:**
`isTauriEnv`를 `useState`와 `useEffect`로 변경하여 클라이언트 사이드에서만 평가:

```typescript
// ❌ 잘못된 방법
const isTauriEnv = isTauriEnvironment();

// ✅ 올바른 방법
const [isTauriEnv, setIsTauriEnv] = useState(false);

useEffect(() => {
  setIsTauriEnv(isTauriEnvironment());
}, []);
```

### 환경 감지 함수 개선

**문제:**
`window.__TAURI__` 체크만으로는 Tauri v2 환경을 감지하지 못할 수 있습니다.

**해결 방법:**
`lib/http-client.ts`의 `isTauriEnvironment` 함수에 다중 체크 추가:

```typescript
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  // 도메인, __TAURI__, __TAURI_INTERNALS__ 모두 체크
  return window.location.hostname === 'tauri.localhost' 
    || '__TAURI__' in window 
    || '__TAURI_INTERNALS__' in window;
}
```

### 4. Windows Crate & WebView2-com Version Conflict (2026-02-08)
- **증상**: `cargo check` 시 `ICoreWebView2Controller::cast` 메서드를 찾을 수 없거나 트레이트 구현 오류 발생.
- **원인**: `webview2-com` 크레이트(0.38.2)가 `windows` 0.58~0.61 버전을 요구하나, 프로젝트에는 0.48 또는 0.62가 설치되어 트레이트가 불일치함.
- **해결**: `Cargo.toml`에서 `windows` 버전을 **0.61**로 명시적으로 고정.
  ```toml
  windows = { version = "0.61", features = ["Win32_Foundation", "Win32_Graphics_Gdi"] }
  ```

### 5. Event handlers cannot be passed to Client Component props (2026-02-09)
- **증상**: Next.js 런타임 에러 발생: `Event handlers cannot be passed to Client Component props. <body onContextMenu={...}>`.
- **원인**: `app/layout.tsx`는 기본적으로 서버 컴포넌트이며, 부모 요소에 직접 이벤트를 전달할 수 없음.
- **해결**: 별도의 클라이언트 컴포넌트(`DisableContextMenu.tsx`)를 생성하여 이벤트를 제어하도록 수정.

### 6. WebView2 "White-out" (Background Transparency Fails)
- **증상**: `tauri.conf.json`에서 `transparent: true`로 설정해도 윈도우 배경이 하얗게 나오거나 불투명함.
- **원인**: WebView2 컨트롤러 자체의 기본 배경색이 불투명(White)으로 설정되어 있음.
- **해결**: Rust 백엔드에서 `ICoreWebView2Controller2` 인터페이스를 통해 배경색을 투명(Alpha 0)으로 강제 설정.
  ```rust
  use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Controller2;
  // ...
  controller.SetDefaultBackgroundColor(COREWEBVIEW2_COLOR { R: 0, G: 0, B: 0, A: 0 });
  ```

### 7. Overlay Mode Not Responding (2026-02-09)
- **증상**: 다른 창 클릭(Blur) 시 앱이 투명해지지 않거나, 클릭 관통(Click-through)이 작동하지 않음.
- **원인 1 (JS/TS)**: `WindowEffect.tsx` 내부에서 리스너를 등록하는 `init()` 함수가 정의만 되고 호출되지 않음.
- **원인 2 (Permissions)**: Tauri v2 권한 정책상 `set_ignore_cursor_events`, `set_shadow` 등이 `capabilities/default.json`에 명시되어야 함.
- **해결**:
    - `WindowEffect.tsx`에서 `useEffect` 내부에 `init()` 호출 추가.
    - `src-tauri/capabilities/default.json`의 `permissions` 배열에 아래 항목 추가:
    ```json
    "core:window:allow-set-ignore-cursor-events",
    "core:window:allow-set-shadow"
    ```
- **주의**: `capabilities` 설정 변경은 `tauri dev` 프로세스를 완전히 재시작해야 반영됨.

