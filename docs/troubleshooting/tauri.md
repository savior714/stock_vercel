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
