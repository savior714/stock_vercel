# 🤖 Project Master Instruction (AGENTS.md)

## 🎯 1. Project Overview & Control

* **핵심 목표:** 실시간 주가 분석 및 기술적 지표 기반 알람 시스템 (Stock Analysis Dashboard)
* **기술 스택:**
  * **Web:** Next.js 16.1.1 (App Router), React, TypeScript
  * **Styling:** CSS Modules (globals.css 활용)
  * **API:** Next.js API Routes (Yahoo Finance, CNN Fear & Greed Index, CBOE)
  * **Storage:** Vercel KV (Upstash Redis) - 프리셋 동기화용
  * **Deployment:** Vercel
  * **Environment:** Node.js (npm)

* **운영 명령어:**
  * 개발 실행: `npm run dev`
  * 빌드: `npm run build`
  * Vercel 배포: `vercel --prod`

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

### Stock Analysis 관련

* **기술적 지표:**
  - RSI (14일 기간): < 35 과매도, > 70 과매수
  - MFI: < 35 과매도, > 80 과매수
  - 볼린저 밴드: 20일 이동평균 ± 2 표준편차
  - 트리플 시그널: RSI < 35 AND MFI < 35 AND BB 하단 터치

* **티커 관리:**
  - Yahoo Finance API 호환을 위해 `BRK.B` → `BRK-B` 자동 변환
  - 프리셋 티커: Vercel KV에 저장 (기기 간 동기화)
  - 로컬스토리지에 현재 티커 목록 캐시
  - "📥 프리셋 불러오기": 서버 프리셋으로 교체
  - "💾 프리셋 저장": 현재 목록을 서버에 저장

### API 구조

* `/api/analyze` - 주가 분석 API (POST)
* `/api/market-indicators` - 시장 지표 API (GET)
* `/api/tickers` - 티커 관리 API (메모리 저장)
* `/api/presets` - 프리셋 관리 API (Vercel KV 사용)
  - GET: 프리셋 조회
  - PUT: 프리셋 전체 교체
  - POST: 티커 추가
  - DELETE: 티커 제거

### 코드 품질

* **Tidying:** 리팩토링 시 기존 기능에 문제를 일으키지 않도록 작은 변화부터 시작한다.
* 주기적으로 **Lint 오류**를 점검하고, 사용하지 않는 파일/의존성을 제거하여 경량화한다.
* **Error Handling:** 모든 에러 메시지를 무시하지 말고 아카이브하며, 해결 코드를 반드시 포함한다.
* **Conflict Management:** 실제 코드와 이 지침(`docs/AGENTS.md`)이 충돌하면 지침을 최신화하는 것을 최우선으로 제안한다.
* **Process Visibility:** 모든 프로세스(데이터 처리, 자동화, 빌드 등) 진행 시 사용자가 진행률(Progress Bar 또는 로그)을 알 수 있도록 표시한다.


## 📁 5. 프로젝트 구조

```
stock-vercel/
├── app/
│   ├── api/
│   │   ├── analyze/          # 주가 분석 API
│   │   ├── market-indicators/ # 시장 지표 API
│   │   ├── presets/          # 프리셋 관리 API (Vercel KV)
│   │   └── tickers/          # 티커 관리 API
│   ├── page.tsx              # 메인 페이지
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 글로벌 스타일
├── docs/
│   ├── AGENTS.md             # 프로젝트 지침서
│   └── README.md             # 사용자 문서
├── public/
│   └── preset_tickers.json   # 기본 프리셋 (백업용)
└── package.json
```

## 🗄️ 6. Vercel KV 설정

프리셋 동기화를 위해 Vercel KV (Upstash Redis) 필요:

1. Vercel 대시보드 → Storage → Upstash Redis 생성
2. 프로젝트에 연결 (환경 변수 자동 설정)
3. 필요한 환경 변수:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
