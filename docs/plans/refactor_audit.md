# 🗺️ Project Blueprint: 코드베이스 로직 정렬 및 Rust Backend 최적화

> 생성 일시: 2026-03-13 01:25 | 상태: 설계 승인 대기

## 🎯 Architectural Goal

- **Logic Alignment**: `docs/CRITICAL_LOGIC.md`(SSOT)와 실제 구현된 지표 임계값(30 vs 35)을 통일합니다.
- **Backend Optimization**: `reqwest` 클라이언트를 재사용하여 연결 풀링을 활성화하고, 5분 메모리 캐시를 도입하여 API 호출을 최적화합니다.
- **Clean Code (Rust)**: 하드코딩된 변수들을 상수로 분리하고, 중복된 HTTP 요청 로직을 정제합니다.

## 🛠️ Step-by-Step Execution Plan

### 📦 Task List

- [x] **Task 1: Rust Backend 상수 분리 및 로직 정렬**
  - **Tool**: `Edit`
  - **Target**: `src-tauri\src\analysis.rs`
  - **Goal**: 하드코딩된 `35.0`을 `30.0`(SSOT 기준)으로 수정하고, 지표 설정 값을 상수로 추출합니다.
  - **Pseudocode**:

    ```rust
    pub const DEFAULT_RSI_THRESHOLD: f64 = 30.0;
    pub const DEFAULT_MFI_THRESHOLD: f64 = 30.0;
    // ... logic uses these constants
    ```

  - **Dependency**: None

- [x] **Task 2: Rust HTTP 클라이언트 싱글톤화 및 캐시 준비**
  - **Tool**: `Edit`
  - **Target**: `src-tauri\src\lib.rs`, `src-tauri\src\commands\stock.rs`, `src-tauri\src\commands\market.rs`
  - **Goal**: `Tauri::State`를 통해 공유 `reqwest::Client`를 제공하여 매 요청마다 클라이언트를 생성하는 비효율을 제거합니다.
  - **Dependency**: Task 1

- [x] **Task 3: 5분 메모리 캐시(TTL) 구현**
  - **Tool**: `Edit`
  - **Target**: `src-tauri\src\commands\stock.rs`
  - **Goal**: `moka` 또는 단순 `HashMap + Instant`를 사용하여 `CRITICAL_LOGIC.md`에 명시된 5분 캐시를 구현합니다.
  - **Dependency**: Task 2

- [x] **Task 4: 프론트엔드-백엔드 임계값 동기화 검토**
  - **Tool**: `Edit`
  - **Target**: `src\hooks\useAnalysis.ts` (또는 관련 분석 훅)
  - **Goal**: 프론트엔드의 `Settings` 값이 Rust 백엔드의 분석 로직에도 전달되도록 인터페이스를 개선합니다.
  - **Dependency**: Task 3

## ⚠️ 기술적 제약 및 규칙 (SSOT)

- **Performance**: `Mutex` 또는 `RwLock` 사용 시 데드락에 주의하고, 비동기 환경에 적합한 `tokio::sync`를 우선 사용합니다.
- **Consistency**: 모든 변경 사항은 `CRITICAL_LOGIC.md`의 "Anti-Blocking" 및 "Triple Signal" 섹션을 준수해야 합니다.

## ✅ Definition of Done

1. [x] Rust Backend에서 동일 종목에 대한 5분 이내 재요청 시 캐시된 데이터 반환 확인.
2. [x] `reqwest::Client`가 전역/상태로 관리되어 매 요청마다 생성되지 않음.
3. [x] 트리플 시그널 임계값이 SSOT와 일치함 (30.0).
4. [x] `memory.md` 업데이트 완료.
