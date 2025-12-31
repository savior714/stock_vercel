# 🤖 Project Master Instruction (AGENTS.md)

## 🎯 1. 프로젝트 개요 및 제어 (Project Control)

* **핵심 목표:** 실시간 주가 분석 및 기술적 지표(RSI, MFI, 볼린저 밴드) 기반 알람 시스템 (Web + Desktop App)
* **기술 스택:**
  * **Web:** Next.js 16.1.1 (App Router), React 19.2.3, TypeScript
  * **Desktop:** **Tauri v2** (Rust Backend) - CORS 제약 없는 네이티브 API 호출
  * **Styling:** Global CSS, Responsive Design (Mobile-First)
  * **API:** Yahoo Finance (Rust reqwest / Vercel API Routes), Market Indicators
  * **Storage:** Vercel KV (Upstash Redis) - 프리셋 동기화, localStorage - 캐시
  * **Deployment:** Vercel (Web), GitHub Actions (Tauri Build - 예정)

* **운영 명령어:**
  * **Web 개발:** `npm run dev`
  * **Tauri 앱 개발:** `npx tauri dev` (추천)
  * **Web 빌드:** `npm run build`
  * **Tauri 앱 빌드:** `npx tauri build`

---

## 🏗 2. 개발 및 소통 원칙 (Core Principles)

1. **언어 및 인코딩:** 모든 답변과 산출물은 **한글**로 작성하며, 한국어 문자는 반드시 **UTF-8**로 인코딩한다.
2. **Next.js & Tauri 우선:** 
   - 웹 로직은 Next.js (App Router)를 기준으로 작성한다.
   - CORS 문제나 네이티브 기능이 필요할 때는 **Tauri** API(`window.__TAURI__`)를 최우선으로 활용한다.
3. **간결성(Conciseness):** 불필요한 설명은 최소화하고 작업 결과와 핵심 로그 위주로 보고한다.
4. **정직성(Honesty):** 모르는 내용이나 에러 발생 시 추측하지 않고 솔직히 인정하며 대안을 제시한다.
5. **문서 관리:** 모든 Markdown 파일은 프로젝트 루트의 **`docs/` 폴더** 안에 저장하며, 진행 상황을 `PROJECT_STATUS.md`에 주기적으로 반영한다.

---

## 🛠 3. 세부 구현 지침 (Detailed Rules)

* **CORS 및 네트워크:** 
  - 브라우저 CORS 제한 발생 시 **Tauri Native Mode**를 사용하도록 유도한다.
  - Web 환경에서는 Vercel API Routes(`api/analyze`)를 프록시로 사용한다.
* **Tauri 통합:**
  - Rust 백엔드(`src-tauri/src/lib.rs`)는 API 통신 등 최소한의 기능만 담당하고, 비즈니스 로직은 TypeScript(`lib/tauri-analysis.ts`)에서 처리한다.
  - `page.tsx` 등 UI 컴포넌트에서는 `isTauri` 플래그를 통해 하이브리드(Web/App) 동작을 분기 처리한다.
* **데이터 검증:**
  - `/api/debug` 또는 '데이터 검증' 탭을 활용하여 Yahoo Finance 원본 데이터와 계산된 지표의 정합성을 상시 확인한다.
* **가시성:** 
  - 대량의 티커 분석 시 반드시 **진행률(Progress Bar)**을 표시하여 사용자에게 상태를 알린다.

---

## 🤖 4. 제미나이 최적화 및 코드 무결성 (Gemini Integrity)

제미나이의 성능 저하 및 코드 누락을 방지하기 위해 다음 규칙을 엄격히 준수한다.

1. **생략 금지 (No Truncation):** 코드를 수정할 때 `// ...` 또는 `/* 기존 코드 */`와 같은 생략을 절대 하지 않는다. **파일 전체 내용**을 제공하여 사용자가 바로 복사-붙여넣기 할 수 있게 한다.
2. **사전 분석 (Chain of Thought):** 코드를 작성하기 전, 수정 내용이 기존 기능에 미칠 영향을 **먼저 한 문장으로 분석**한 뒤 작성을 시작한다.
3. **컨텍스트 보존:** 새로운 기능 추가 시 기존의 `import`, 타입 정의, 환경 변수 설정을 임의로 삭제하거나 변경하지 않는다.
4. **원자적 수정 (Atomic Modification):** 한 번에 하나의 기능만 수정한다. 여러 파일 수정 시 순서를 제안하고 승인 후 진행한다.
5. **비교 검토 (Diff Summary):** 코드 작성 후, 기존 코드와의 차이점을 **Diff 스타일**로 짧게 요약하여 보고한다.

---

## � 5. Git Push Workflow (5단계 필수 절차)

"git에 푸시해줘" 요청 시 다음 절차를 엄격히 준수한다. (매우 중요)

1. **변경사항 정리 (Staging):** `git status` 확인 후 논리적 단위로 스테이징. Conventional Commits (feat:, fix:, docs:) 규칙 준수.
2. **문서 업데이트 (Docs):** `docs/AGENTS.md` 또는 `PROJECT_STATUS.md`, `task.md` 등에 변경 사항을 즉시 반영 후 스테이징.
3. **Feature 브랜치 푸시 (Push Feature):** 현재 작업 중인 브랜치(예: `feature/xxx`)를 원격 저장소에 push.
4. **Main 브랜치 병합 (Merge):** `main` 브랜치로 체크아웃 후 `git merge feature/xxx` 실행. (충돌 시 해결 후 커밋)
5. **최종 푸시 (Push Main):** 병합된 `main` 브랜치를 `origin main`에 최종 push.
