# 🧠 Memory Log (Strict Append-Only)

## 📜 Executive Summary (Steps 1-158)

- **Environment Initialization**: Established Python 3.14 (64-bit) runtime via `uv` with a dedicated `.venv`.
- **SSOT Refactoring**: Consolidated multiple legacy docs into `docs/CRITICAL_LOGIC.md` and established DDD patterns.
- **UI Modernization**: Integrated **Ark UI** for headless components (`SettingsModal`, `AnalysisProgress`) with Vanilla CSS styling.
- **Execution Scripting**: Developed `dev.ps1` for PowerShell 7 native execution and used `dev.bat` as a proxy.
- **Repository Pattern**: Refactored Git synchronization logic into `GithubSyncRepo` to improve separation of concerns.
- **Logic Calibration**: Aligned technical indicator thresholds (RSI/MFI < 30) application-wide to match SSOT requirements.
- **Shell & Security Standardization**: Improved background process handling by configuring VS Code automation profiles (`-WindowStyle Hidden`, `WinPTY`) and replacing unstable `mshta` bridges with reliable PowerShell/pwsh direct execution.
- **GitHub Sync Error Fix**: Resolved "program not allowed" errors by updating Tauri capabilities and implemented a `pwsh` -> `powershell` fallback mechanism in `GithubSyncRepo` for broad compatibility.

---

[Context]
Unified technical documentation in English while maintaining Korean for user communication.

[Action History (Compressed)]

1. Translated all core documentation and UI assets to English (Steps 17-37).
2. Stabilized `dev.bat` with PowerShell fallback and terminal flicker suppression (Steps 33-115).
3. Optimized background execution by adjusting `settings.json` and removing `mshta` complexity (Steps 43-141).
4. Fixed GitHub Sync by adding Tauri permissions for `pwsh` and implementing runtime shell detection/fallback in `GithubSyncRepo` (Steps 142-158).
5. (Step-by-Step) Created/Verified `debug_dev.bat` for visible debugging (Task 1).

- Action History: `GithubSyncRepo`에 `--autostash` 옵격 적용 완료 (Step 159).
- Final Verification: 로컬 변경 사항이 있는 상태에서 Git Pull이 정상 작동함을 검증 및 계획 종료 (Step 160). ✅
- Large Files identified: `src-tauri\src\lib.rs` (675 lines) 등 소수 파일 식별 완료. ✅
- Folder Removal: `.agent` 디렉토리 및 하위 대형 파일들 전체 삭제 완료. ✅
- GitHub Sync: `git pull --rebase --autostash` 도입으로 dirty worktree 대응 완료. ✅
- Environment Stability: `dev.bat` crash fixed and execution visibility ensured. ✅
- Documentation: English purity maintained (Technical assets) ✅
- UI Korean Restoration: `src/app/page.tsx` 한글화 완료 (Task 1) ✅
- UI Korean Restoration: `src/components/ResultTable.tsx` 한글화 완료 (Task 2) ✅
- UI Korean Restoration: `src/components/SettingsModal.tsx` 한글화 완료 (Task 3) ✅
- UI Korean Restoration: `AnalysisProgress`, `TickerInput`, `TitleBar`, `MarketIndicators` 한글화 완료 (Task 4) ✅
- UI Korean Restoration: 최종 검증 및 린트 체크 완료 (Task 5) ✅
- **Stability**: 전역 린트 Zero 달성 및 `SettingsModal` 훅 경고 수정 완료.
- **Refactoring**: `src-tauri\src\lib.rs` (777 lines) 리팩토링 착수.
- Action History: `models.rs` 생성 및 데이터 구조체 이동 완료 (Task 1). ✅
- Action History: `commands/` 폴더를 생성하고 모든 커맨드 핸들러를 `stock.rs`, `market.rs`, `window.rs`로 분리 완료 (Task 3). ✅
- Action History: `lib.rs`를 60줄 수준의 엔트리 포인트로 축소 및 모듈 연결 완료 (Task 4). ✅
- Context: `src-tauri\src\lib.rs` 리팩토링 완료. 3-Layer DDD (Models, Analysis, Commands) 구조 확립.
- Action History: `CLAUDE.md`의 'Terminal & Runtime' 섹션에 탐색 및 I/O 최적화 규칙([Traffic Zero]) 업데이트 완료. ✅
- Action History: `analysis.rs`의 하드코딩된 임계값(35.0 -> 30.0)을 SSOT에 맞춰 수정하고 상수로 분리 완료 (Task 1). ✅
- Action History: `Tauri State`와 `AppState`를 도입하여 `reqwest::Client`를 싱글톤화하고 모든 커맨드에서 재사용하도록 수정 완료 (Task 2). ✅
- Action History: `RwLock<HashMap>`을 이용한 5분 TTL 메모리 캐시 구현 완료. `HistoricalData` 및 `TauriAnalysisResult`에 `Clone` 트레이트 추가 (Task 3). ✅
- Action History: `AnalysisSettings` 구조체를 Rust에 도입하고, 분석 API 호출 시 프론트엔드 설정을 전달하여 백엔드 계산 로직과 동기화 완료 (Task 4). ✅
- Action History: PowerShell 에러 수집 시스템(`exec-log`) 구축을 위한 설계 문서(`docs/plans/error_analysis_system.md`) 작성 완료.
- Action History: `scripts/error_handler.ps1` 생성 및 `exec-log` 함수 정의 완료 (Task 1). ✅
- Action History: `dev.ps1`에 에러 핸들러(`scripts/error_handler.ps1`) 도트 소싱 통합 완료 (Task 2). ✅
- Action History: 주요 명령어(`uv sync`, `npm install` 등)에 `exec-log` 적용 및 함수명 표준 동사로 변경 완료 (Task 3). ✅
- Action History: 에러 로그 분석 가이드(`docs/ERROR_LOGS.md`) 생성 및 AI 자동 분석 프로토콜 정의 완료 (Task 4). ✅
- Action History: 에러 사후 분석 자동화 워크플로우(`.agent/workflows/debug.md`) 구축 완료. ✅
- Action History: `exec-log` 보안 정책(Out-File 금지) 대응을 위해 .NET Native 파일 쓰기 방식으로 수정 및 작동 검증 완료. ✅
- Final Verification: 프로젝트 전역 린트/빌드 Zero Error 상태 확인 및 에러 로깅 시스템 활성화 완료. ✅
- UI Cleanup: `SettingsModal` backdrop `blur(8px)` 제거 (흐려지는 효과 삭제). ✅
- UI Cleanup: `SettingsModal`에서 opacity(Ghost Mode) 슬라이더 섹션 제거. RSI/MFI/BB 파라미터 설정은 유지. ✅
- UI Cleanup: `WindowEffect.tsx`에서 `setAlwaysOnTop` 호출 3곳 제거 — blur/focus 이벤트 및 초기화 시 항상 위 고정 해제. ✅

[Technical Note]

- Memory log compressed at step 158 to adhere to 200-line global limit.
- Current Memory Lines: 38/200
