# 빌드 및 배포 관련 트러블슈팅

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
3. 그 후 `npx tauri build` 실행

### `Module not found: @tauri-apps/plugin-fs` (의존성 최적화 후)

**증상:**
- `npm run lint` 또는 `npm run build` 시 `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-shell` 모듈을 찾을 수 없다는 에러 발생
- `node_modules`에는 해당 패키지가 존재함에도 인식 불가

**원인:**
- 패키지 매니저(npm)의 락파일(`package-lock.json`) 불일치 또는 캐시 문제
- `devDependencies`와 `dependencies` 이동 중 의존성 트리 꼬임
- Windows 환경에서의 파일 잠금(Lock) 문제로 인한 불완전한 설치

**시도해볼 해결책:**
1. **클린 인스톨 (가장 확실):**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Force package-lock.json
   npm install
   ```
2. **강제 재설치:**
   ```powershell
   npm install --force
   ```
3. **TypeScript 설정 확인:**
   `tsconfig.json`의 `moduleResolution`이 `bundler` 또는 `node`로 설정되어 있는지 확인하세요.
