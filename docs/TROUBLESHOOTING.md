# Troubleshooting Guide

이 문서는 Stock Analysis Dashboard 개발 및 사용 중 발생할 수 있는 문제와 해결 방법을 정리합니다.

## 목차
- [Tauri 데스크톱 앱 관련](#tauri-데스크톱-앱-관련)
- [빌드 관련](#빌드-관련)
- [권한 관련](#권한-관련)

---

## Tauri 데스크톱 앱 관련

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

---

## 빌드 관련

### `out` 폴더가 생성되지 않음

**증상:**
- `npm run tauri:build` 실행 시 에러
- `frontendDist` 경로를 찾을 수 없음

**원인:**
`next.config.ts`가 조건부로만 `output: 'export'`를 활성화하고 있어, 환경 변수 없이 빌드 시 정적 export가 되지 않습니다.

**해결 방법 1: 환경 변수 설정**
```powershell
$env:TAURI_ENV='true'; npm run build
```

**해결 방법 2: 항상 정적 export 활성화 (권장)**
`next.config.ts` 수정:

```typescript
const nextConfig: NextConfig = {
  // 항상 정적 내보내기 사용 (Tauri/Capacitor 호환)
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};
```

### 빌드 캐시 문제

**증상:**
- 코드를 수정했는데 변경사항이 반영되지 않음
- 이전 버전의 앱이 계속 실행됨
- 디버그 코드를 제거했는데 여전히 팝업이 뜸

**원인:**
- `out` 폴더에 이전 빌드 결과물이 캐시됨
- `src-tauri/target/release`에 이전 Rust 빌드 결과물이 캐시됨

**해결 방법:**
완전히 새로 빌드:

```powershell
# 1. 프론트엔드 캐시 삭제
Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# 2. Tauri 캐시 삭제 (선택사항, 빌드 시간이 오래 걸림)
Remove-Item -Recurse -Force src-tauri\target\release -ErrorAction SilentlyContinue

# 3. 새로 빌드
npm run build
npx tauri build
```

**빠른 해결 방법 (프론트엔드만):**
```powershell
# out 폴더만 삭제하고 재빌드
Remove-Item -Recurse -Force out
npm run build
npx tauri build
```

### `beforeBuildCommand` 실패

**증상:**
`npm run tauri:build` 실행 시 `beforeBuildCommand` 단계에서 실패

**원인:**
- API routes가 포함된 상태에서 정적 export 시도
- 빌드 스크립트 오류

**해결 방법:**
1. `tauri.conf.json`에서 `beforeBuildCommand` 제거
2. 수동으로 `npm run build` 먼저 실행
3. 그 후 `npx tauri build` 실행

---

## 권한 관련

### Tauri v2 파일 시스템 권한

Tauri v2는 보안을 위해 기본적으로 파일 시스템 접근을 제한합니다.

**필요한 권한:**
- `fs:allow-app-read-recursive`: 앱 데이터 디렉토리 읽기
- `fs:allow-app-write-recursive`: 앱 데이터 디렉토리 쓰기
- `$APPLOCALDATA` 경로 명시

**설정 위치:**
`src-tauri/capabilities/default.json`

---

## 개발 팁

### 개발자 도구 활성화

프로덕션 빌드에서는 F12가 작동하지 않습니다. 개발 중 디버깅이 필요하면:

1. `src-tauri/tauri.conf.json`에 추가:
```json
{
  "app": {
    "withGlobalTauri": true,
    "security": {
      "devtools": true
    }
  }
}
```

2. 또는 `npm run tauri:dev`로 개발 모드 실행

### 로그 확인

Tauri 앱의 콘솔 로그는 터미널에 출력됩니다:
```powershell
npm run tauri:dev
```

---

## 참고 자료

- [Tauri v2 공식 문서](https://v2.tauri.app/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Tauri File System Plugin](https://v2.tauri.app/plugin/file-system/)
