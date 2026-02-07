# 📜 개발 이력 (Development History)

## 2026-02-08: Transparent Overlay & Click-Through Implementation
- **성취 (Achievements)**:
    - **Windows True Transparency**: `webview2-com`을 사용하여 윈도우 배경을 완전히 투명하게 만드는 Rust 로직 구현 (`SetDefaultBackgroundColor`).
    - **Custom TitleBar**: 시스템 타이틀바를 제거하고(`decorations: false`), 최소화/최대화/종료 기능을 포함한 커스텀 타이틀바 구현.
    - **Dynamic Overlay System**:
        - **Focus Mode**: 불투명 배경, 창 제어 가능.
        - **Blur Mode**: 투명 배경(Opacity 0.3), 마우스 클릭 관통(Click-Through) 지원.
    - **Stability**: `windows` 크레이트 버전 충돌(0.62 vs 0.61) 해결 및 Rust 컴파일 오류 수정.

- **작업 내용**:
    - `src-tauri/src/lib.rs`: `set_ignore_cursor_events`, `set_shadow`, WebView2 배경색 제어 로직 추가.
    - `src-tauri/tauri.conf.json`: 투명화 및 권한 설정 (`allow-minimize`, `allow-maximize` 등).
    - `src/components/WindowEffect.tsx`: 포커스 이벤트 리스너 및 투명도/권한 제어 로직 구현.
    - `src/app/globals.css`: Glassmorphism 스타일 및 동적 투명도 클래스(`.overlay-mode`) 추가.

## 2026-02-07: Type-Driven Refactoring & Project Verification
- **성취 (Achievements)**:
    - 전반적인 타입 안전성 강화: `any` 타입 제거 및 명시적 인터페이스(`CNNGraphData`, `AnalysisResult` 등) 도입.
    - API 라우트(`analyze`, `market-indicators`)의 널 체크 및 에러 핸들링 보강.
    - 미사용 변수, 임포트, 프롭스 제거를 통한 코드 베이스 다이어트 (0 에러, 0 경고 지향).
    - `ResultTable` 컴포넌트 인터페이스 단순화 및 `page.tsx` 연동 최적화.
    - `useAnalysis`, `useTickers` 훅의 무결성 확보 및 의존성 배열 최적화.
    - 전체 빌드(`npm run build`) 및 린트(`npm run lint`) 검증 통과.

- **작업 내용**:
    - `src/app/api/analyze/route.ts`: `any` 제거 및 `HistoricalData` 인코딩 안정화.
    - `src/app/api/market-indicators/route.ts`: VIX 데이터 폴백 로직 정교화 및 타입 캐스팅 적용.
    - `src/hooks/useAnalysis.ts`: `useEffect` 의존성 수정 및 미사용 상태(`shouldStop`) 제거.
    - `src/components/ResultTable.tsx`: 불필요한 `onRemoveTicker` 제거 및 UI 일관성 확보.
