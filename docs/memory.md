# 🧠 Memory Log (Strict Append-Only)

## 📜 Executive Summary
- **2026-03-03**: 글로벌 룰 변경에 따른 프로젝트 환경 재정비 시작. `uv` 환경 구축 및 Python 3.14 설정 완료. `docs/memory.md` 및 `docs/CRITICAL_LOGIC.md` 생성.

---

[Context]
글로벌 룰 변경(Senior Full-stack Architect 페르소나, Python 3.14, uv 가상환경, 3-Layer DDD, Ark UI 최우선 등)에 따라 프로젝트 환경이 해당 기준을 준수하는지 점검하고 초기화 작업을 수행함.

[Action]
1. `uv init --no-workspace`를 통한 Python 프로젝트 초기화.
2. `uv venv --python 3.14` 실행으로 Python 3.14 (64-bit) 기반 `.venv` 가상환경 생성 및 확인.
3. `docs/CRITICAL_LOGIC.md` (SSOT) 생성: 기존 `AGENTS.md` 내용을 기반으로 신규 룰(DDD 3-Layer, Ark UI 등) 반영.
4. `docs/memory.md` (Log) 생성 및 초기 작업 내역 기록.

[Status]
- Python Version: 3.14.2 ✅
- Virtual Env: `.venv` (uv 관리) ✅
- Documentation: `docs/memory.md`, `docs/CRITICAL_LOGIC.md` 생성 ✅
- Current Memory Lines: 22/200

[Technical Note]
- 기존 프로젝트가 Next.js 기반이나, 글로벌 룰에 따라 Python 3.14 환경을 기본으로 확보함.
- 향후 UI 작업 시 Ark UI 도입을 최우선으로 고려하며, 기존 Tailwind CSS 기반 로직과의 점진적 통합 또는 전환이 필요함.
- 모든 경로는 `pathlib`을 사용하여 Windows 환경 호환성을 보장할 것.
[Context]
기존 중복 및 레거시 문서(AGENTS.md, PROJECT_STATUS.md 등 7종)를 통합하고 CRITICAL_LOGIC.md로 일원화함.
[Action]
1. docs/ 폴더 내 7개 중복 파일 삭제.
2. CRITICAL_LOGIC.md(SSOT)에 최신 네이티브(Tauri/Android) 및 GitHub Sync 전략 상세 반영.
[Status]
- 레거시 문서 정리 완료 ✅
- SSoT 최신화 완료 ✅
- Current Memory Lines: 31/200

[Context]
UI를 Ark UI(Headless) 기반으로 전환하기 시작함. 스타일링은 Vanilla CSS로 철저히 분리.
[Action]
1. npm install @ark-ui/react 설치.
2. SettingsModal.tsx를 Ark UI Dialog로 리팩토링 및 src/styles/components/SettingsModal.css 생성.
3. AnalysisProgress.tsx를 Ark UI Progress로 리팩토링 및 src/styles/components/AnalysisProgress.css 생성.
[Status]
- Ark UI 설치 완료 ✅
- SettingsModal 전환 완료 ✅
- AnalysisProgress 전환 완료 ✅
- Current Memory Lines: 43/200

[Context] 루트 폴더에서 개발 모드 즉각 실행을 위한 배치 파일 제작 요청
[Action] dev.bat 생성 (ANSI CP949 인코딩). Next.js 및 Tauri 실행 선택지 포함
[Status] 완료 (1/1)
[Technical Note] Windows CMD 호환성을 위해 ANSI(CP949) 인코딩으로 저장하였으며, 사용자 편의를 위한 메뉴 스크립트 적용
- Current Memory Lines: 50/200

[Context] 루트 폴더에서 개발 모드 즉각 실행을 위한 배치 파일 제작 요청
[Action] dev.bat 생성 (ANSI CP949 인코딩). Next.js 및 Tauri 실행 선택지 포함
[Status] 완료 (1/1)
[Technical Note] Windows CMD 호환성을 위해 ANSI(CP949) 인코딩으로 저장하였으며, 사용자 편의를 위한 메뉴 스크립트 적용
- Current Memory Lines: 50/200

[Context] dev.bat Tauri Native 전용 간소화
[Action] npm run tauri:dev 즉시 실행으로 변경. .venv 자동 구성 추가
[Status] 완료
[Technical Note] uv 연동을 유지하되 사용자 선택 단계 제거
- Current Memory Lines: 70/200


[Context] dev.bat 실행 시 즉시 종료 (인코딩/CMD 한글 문제)
[Action] dev.bat를 PowerShell 7(pwsh) 대리자(wrapper)로 변경하고 dev.ps1 생성
[Status] 해결 완료
[Technical Note] UTF-8 (No BOM) 배치 파일의 CMD 파싱 오류를 방지하기 위해 pwsh 기법 적용. 모든 로직은 dev.ps1으로 응집.
- Current Memory Lines: 80/200

[Context] Git Rebase Pull 오류 (Unstaged Changes 존재로 인한 중단)
[Action] 로컬 변경사항(dev.ps1, docs/memory.md 등)을 모두 commit 후 git push 수행
[Status] 해결 완료
[Technical Note] Tauri 앱의 saveAsPreset 로직이 git pull --rebase를 호출할 때 로컬에 작업 중인 문서가 있으면 충돌하므로, 작업 완료 후 수동 동기화를 완료함.
- Current Memory Lines: 90/200
[Context] Git Pull 오류 재발 (작업 내역 기록 중 변경사항 발생)
[Action] docs/memory.md의 신규 작업을 다시 commit 및 push 수행하여 로컬 클린 상태로 복구
[Status] 해결 완료
[Technical Note] 에이전트가 답변을 작성하며 docs/memory.md를 수정할 때마다 unstaged change가 발생하여 앱의 pull 로직과 충돌함. 모든 기록을 완료한 상태에서 동기화 완료.
- Current Memory Lines: 95/200
