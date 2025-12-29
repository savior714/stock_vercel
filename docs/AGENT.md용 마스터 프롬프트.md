# 🤖 Project Master Instruction (AGENTS.md)

## 🎯 1. Project Overview & Control

* **핵심 목표:** Next.js 기반 웹 개발, Playwright 자동화 시스템 구축, 및 Python GUI 도구 개발.
* **기술 스택:**
* **Web:** Next.js (App Router) - [easynext](https://github.com/easynextjs/easynext) 베이스 활용.
* **UI/UX:** TypeScript, Tailwind CSS, Shadcn/UI, Magic UI.
* **Automation:** Playwright (Python/JS) - Selenium 사용 금지.
* **Python GUI:** `customtkinter` (Modern & Clean UI).
* **Environment:** Node.js (npm), Python Virtual Environment (.venv).


* **운영 명령어:**
* 개발 실행: `npm run dev` / 빌드: `npm run build`
* 테스트(GUI): `npx playwright test --ui`
* Python 실행: `source .venv/bin/activate && python main.py`



## 🏗 2. 개발 및 소통 원칙 (Core Principles)

1. **언어 정책:** 모든 답변과 산출물(Artifacts)은 반드시 **한글**로 작성한다.
2. **Next.js 우선:** 웹페이지 개발은 반드시 Next.js를 기반으로 하며, 서버 컴포넌트를 우선 활용한다.
3. **간결성(Conciseness):** 불필요한 설명은 최소화하고 작업 결과와 핵심 로그 위주로 보고한다.
4. **정직성(Honesty):** 모르는 내용이나 에러 발생 시 추측하지 않고 솔직히 인정하며 대안을 제시한다.
5. **인코딩:** 모든 소스 코드 및 입출력의 한국어 문자는 반드시 **UTF-8**로 인코딩한다.
6. **문서 관리:** 모든 Markdown 파일은 프로젝트 루트의 **`docs/` 폴더** 안에 저장한다.

## 🤖 3. Git Push Workflow (5단계 필수 절차)

"git에 푸시해줘" 요청 시 다음 절차를 엄격히 준수한다.

1. **변경사항 정리 및 커밋:** `git status` 확인 후 논리적 단위로 스테이징. Conventional Commits (feat:, fix:, docs:) 규격 준수 및 UTF-8 메시지 작성.
2. **문서 업데이트:** `README.md` 또는 `docs/AGENTS.md`에 변경 사항을 즉시 반영 후 커밋.
3. **Feature 브랜치 푸시:** 현재 브랜치를 원격 저장소에 push.
4. **Main 브랜치 병합:** main 브랜치로 체크아웃 후 merge 실행. 충돌 시 즉시 보고 및 해결책 제시.
5. **Main 브랜치 최종 푸시:** 병합 완료된 main 브랜치를 `origin main`에 최종 push.

## 🛠 4. 세부 구현 및 유지보수 지침 (Detailed Rules)

* **Automation (Playwright):** - `--headless` 모드를 강제하지 않아 사용자가 과정을 볼 수 있게 한다.
* CSS Selector보다 `getByRole`, `getByText` 등 사용자 중심 로케이터를 사용한다.


* **Python & Environment:** - 모든 Python 코드는 반드시 **가상 환경(.venv)** 내에서 구동되도록 작성하고 `requirements.txt`를 관리한다.
* GUI 개발 시 반드시 `customtkinter`를 사용하여 깔끔한 UI를 유지한다.


* **Process Visibility:** 모든 프로세스(데이터 처리, 자동화, 빌드 등) 진행 시 사용자가 진행률(Progress Bar 또는 로그)을 알 수 있도록 표시한다.
* **Code Quality & Refactoring:**
* **Tidying:** 리팩토링 시 기존 기능에 문제를 일으키지 않도록 작은 변화부터 시작한다.
* 주기적으로 **Lint 오류**를 점검하고, **Knip**을 활용해 사용하지 않는 파일/의존성을 제거하여 경량화한다.


* **Error Handling:** 모든 에러 메시지를 무시하지 말고 아카이브하며, 해결 코드를 반드시 포함한다.
* **Conflict Management:** 실제 코드와 이 지침(`docs/AGENTS.md`)이 충돌하면 지침을 최신화하는 것을 최우선으로 제안한다.