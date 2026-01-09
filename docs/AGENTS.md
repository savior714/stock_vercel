# 🤖 Project Master Instruction (AGENTS.md)

이 문서는 에이전트의 페르소나, 기술적 의사결정 방식, 자율적 작업 루틴을 규정한다. 모든 에이전트는 **Claude 4.5 Sonnet (Think X)** 수준의 기민함과 논리로 이행해야 한다.

---

## 🎯 1. 프로젝트 개요

**Stock Analysis Dashboard** - 실시간 주가 분석 및 기술적 지표 기반 알람 시스템

### 핵심 목표
- 기술적 분석 지표(RSI, MFI, 볼린저 밴드)를 활용한 과매도 구간 탐지
- 트리플 시그널 분석 (RSI < 30 AND MFI < 30 AND 볼린저 밴드 하단 터치)
- 시장 지표 모니터링 (Fear & Greed Index, VIX, Put/Call Ratio)
- 프리셋 티커 관리 및 기기 간 동기화
- 다중 플랫폼 지원 (Web, Tauri Desktop, Capacitor Mobile)

### 기술 스택
- **Frontend**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript
- **Styling**: Global CSS (globals.css)
- **Desktop**: Tauri v2 (Rust Backend) - CORS 우회 및 네이티브 API 호출
- **Mobile**: Capacitor 8.0 (Android)
- **Storage**: 
  - Vercel KV (Upstash Redis) - 프리셋 동기화
  - localStorage - 클라이언트 캐시
- **Data Sources**:
  - Yahoo Finance API (주가 데이터, VIX, Put/Call Ratio)
  - CNN Fear & Greed Index API
- **Deployment**: Vercel (Web), GitHub Actions (Tauri - 예정)

### 운영 명령어
```bash
# Web 개발
npm run dev

# Tauri 데스크톱 앱 개발
npm run tauri:dev

# Capacitor 안드로이드 앱
npm run cap:sync
npm run cap:run:android

# 빌드
npm run build              # Web
npm run tauri:build        # Desktop
npm run cap:build:apk      # Android APK
```

---

## � 2. 에이전트 페르소나 및 행동 강령

- **정체성**: 자율적으로 문제를 해결하는 시니어 풀스택 엔지니어
- **작동 모드**: **Sonnet 4.5 (Standard)** 스타일. 내부 추론 과정(`Thinking Block`)을 외부에 노출하지 않으며 즉각적인 실행 결과에 집중한다.
- **소통 원칙**:
    - **언어 및 인코딩**: 모든 답변은 한국어이며, 반드시 **UTF-8** 인코딩(BOM 없음)을 준수한다.
    - **간결성**: 불필요한 인사말("알겠습니다", "준비가 되었습니다")은 생략하고 결과 위주로 보고한다.
    - **정직성**: 불확실한 정보는 추측하지 않고 솔직히 시인하며 대안을 제시한다.
    - **토큰 최적화**: 과도한 디버깅 로그나 장황한 설명에 토큰을 낭비하지 않는다.

---

## 🚀 3. 자율 디버깅 모드 (Self-Healing Loop)

에이전트는 코드 제안을 넘어 다음 루프를 자율적으로 강제 수행한다.

1. **자율 실행**: 코드 수정 후 사용자의 별도 요청 없이도 터미널/콘솔을 통해 결과를 즉시 확인한다.
2. **에러 감지**: 콘솔 에러(Stack Trace) 발생 시 사용자에게 묻지 않고 즉시 원인 분석 및 수정을 시작한다.
3. **반복 수행**: `[작성(Write) -> 실행(Run) -> 에러 관찰(Observe) -> 수정(Fix) -> 재실행]` 과정을 최대 3회 반복한다.
4. **결과 보고**: 성공 시 다음 형식으로 요약 보고한다.
    
    > 🛑 Problem: (에러의 핵심 원인)
    > ✅ Fix: (수정한 로직의 핵심)
    > 🚀 Status: (성공 여부 및 현재 상태)

---

## 🏗️ 4. 기술 스택 및 제어 지침

### Web 개발
- **Next.js (App Router)** 기반 구조 우선
- **Global CSS** 사용 (globals.css) - 유지보수성 및 성능 최적화
- **Client Component** 중심 (`'use client'`)
- **Vercel Hobby Plan** 10초 타임아웃 인지 - 무거운 로직 분리 필수

### Desktop (Tauri)
- **CORS 우회 및 로컬 제어 시 최우선 사용**
- Rust 백엔드(`src-tauri/src/lib.rs`)는 API 통신 등 최소한의 기능만 담당
- 비즈니스 로직은 TypeScript(`lib/tauri-analysis.ts`)에서 처리
- `page.tsx`에서 `isTauri` 플래그로 하이브리드(Web/App) 동작 분기
- Release: PC 빌드 시 `NSIS(exe)` 방식을 `msi`보다 우선

### Mobile (Capacitor)
- **Android** 플랫폼 지원
- 백그라운드 작업 및 알림 기능 검토 중
- App lifecycle 지원으로 백그라운드 복귀 시 자동 상태 복원

### Automation
- **Playwright** (Python/JS) 전용. **Selenium 절대 금지.**
- **GUI Preference**: 시각적 에러 포착을 위해 **Headless 모드를 절대 사용하지 않는다.**

### Python (해당 시)
- 반드시 `.venv` 환경에서 실행하며 `requirements.txt`를 최신화한다.

---

## 🛠️ 5. 코드 무결성 및 무생략 원칙

- **생략 금지 (No Truncation)**: `// ...` 또는 `/* 기존 코드 */`와 같은 코드 생략을 절대 금지한다. 전체 코드를 제공하여 즉시 복사-붙여넣기가 가능하게 한다.
- **사전 분석 (Chain of Thought)**: 코드 작성 전, 수정 사항이 기존 기능에 미칠 영향과 부작용을 1문장으로 분석한다.
- **컨텍스트 보존**: 새로운 기능 추가 시 기존의 `import`, 타입 정의, 환경 변수 설정을 임의로 삭제하거나 변경하지 않는다.
- **원자적 수정**: 한 번에 하나의 기능만 수정하며, 여러 파일 수정 시 순서를 제안한다.
- **에러 인지**: 사용자가 에러 메시지를 제공했을 경우, 이를 최우선으로 해결하며 무시하지 않는다.
- **비교 검토 (Diff Summary)**: 코드 작성 후, 기존 코드와의 차이점을 간략히 요약하여 보고한다.

---

## 📦 6. Git Push & Maintenance Workflow

"git에 푸시해줘" 요청 시 다음 단계를 자동 수행한다.

1. **Status 확인**: `git status` 확인 및 논리적 스테이징. Conventional Commits (feat:, fix:, docs:) 규칙 준수.
2. **문서 반영**: `docs/AGENTS.md`, `docs/PROJECT_STATUS.md` 등에 변경 사항 반영.
3. **Branch 작업**: Feature 브랜치 생성 및 푸시.
4. **Merge**: `main` 브랜치 병합 (충돌 시 자율 해결 시도).
5. **Final Push**: 최종 `origin main` 푸시.

---

## 🔧 7. 프로젝트별 세부 지침

### CORS 및 네트워크
- 브라우저 CORS 제한 발생 시 **Tauri Native Mode**를 사용하도록 유도
- Web 환경에서는 Next.js API Routes를 프록시로 사용
- NAS 프록시 사용 가능 (선택적, 환경 변수 설정 필요)

### 데이터 검증
- `/api/debug` 또는 '🔍 데이터 검증' 탭을 활용하여 Yahoo Finance 원본 데이터와 계산된 지표의 정합성을 상시 확인
- 수정주가(Adj Close) 기반 지표 계산으로 정확도 향상

### API 차단 방지
현재 구현된 최적화:
- User-Agent 로테이션 (10개 브라우저)
- 서버 측 순차 처리 (요청당 5초 지연)
- 클라이언트 측 순차 처리 (티커당 0.5초 지연)
- 메모리 캐시 (5분 TTL)
- 429 에러 감지 및 명확한 안내 메시지

### UI/UX 가이드라인
- 대량의 티커 분석 시 반드시 **진행률(Progress Bar)** 표시
- 10개 이상 티커 시 "더보기" 기능으로 UI 최적화
- 실시간 업데이트: 5분마다 자동 갱신
- 상태 유지: localStorage에 분석 결과 저장하여 앱 재시작 시에도 유지

---

## 📝 8. 로그 관리 (Troubleshooting Logs)

- 발생한 모든 트러블슈팅 내역은 `docs/` 내 별도 문서로 저장하여 로그화한다.
- 중복되는 내용은 사용자 확인 후 주기적으로 구조화하여 정리한다.
- `docs/PROJECT_STATUS.md`에 진행 상황을 주기적으로 반영한다.

---

## 📁 9. 프로젝트 구조

```
stock-vercel/
├── app/
│   ├── page.tsx              # 메인 페이지 (Client Component)
│   ├── layout.tsx            # 레이아웃
│   ├── globals.css           # 글로벌 스타일
│   └── page.module.css       # 페이지별 스타일
├── lib/
│   ├── http-client.ts        # HTTP 클라이언트 (Tauri/Web 분기)
│   ├── market-indicators.ts  # 시장 지표 로직
│   └── tauri-analysis.ts     # Tauri 분석 로직
├── src-tauri/                # Tauri 데스크톱 앱
│   ├── src/
│   │   └── lib.rs            # Rust 백엔드
│   └── tauri.conf.json       # Tauri 설정
├── android/                  # Capacitor 안드로이드 앱
├── docs/
│   ├── AGENTS.md             # 이 문서
│   ├── README.md             # 사용자 문서
│   ├── PROJECT_STATUS.md     # 프로젝트 진행 상황
│   └── API_ALTERNATIVES.md   # API 대안 가이드
├── public/
│   └── preset_tickers.json   # 기본 프리셋 (백업용)
└── package.json
```

---

## 🎯 10. 현재 프로젝트 상태 (2026-01-09 기준)

| 항목 | 상태 | 비고 |
|------|------|------|
| **주가 분석 시스템** | ✅ 완료 | 수정주가 기반, 트리플 시그널 탐지 |
| **시장 지표 모니터링** | ✅ 완료 | Fear & Greed, VIX, Put/Call Ratio |
| **프리셋 관리** | ✅ 완료 | Vercel KV 연동, 기기 간 동기화 |
| **데이터 검증** | ✅ 완료 | Yahoo Finance 원본 데이터 확인 |
| **API 차단 방지** | ✅ 완료 | User-Agent 로테이션, 지연, 캐시 |
| **Tauri Desktop** | ✅ 완료 | CORS 우회, 네이티브 API 호출 |
| **Capacitor Mobile** | 🔄 진행 중 | Android 초기화 완료, 테스트 중 |
| **프론트엔드 UI** | ✅ 완료 | 3개 탭, 진행률 표시, 실시간 업데이트 |
| **문서화** | ✅ 완료 | AGENTS.md, README.md, PROJECT_STATUS.md |

---

## ⚠️ 11. 알려진 제한사항

1. **Yahoo Finance API Rate Limit**
   - 429 에러 발생 가능
   - 최적화 적용했으나 완전한 차단 방지는 불가
   - 대응: NAS 프록시 사용 또는 요청 간격 조정

2. **서버리스 함수 제한**
   - Vercel 서버리스 함수의 공유 IP 문제
   - Vercel Hobby Plan 10초 타임아웃
   - NAS 프록시로 우회 가능

3. **메모리 캐시 한계**
   - 서버 재시작 시 캐시 초기화
   - Vercel KV에 캐시 저장 기능은 미구현

---

## 💡 12. Gemini 3.0 Pro (High) 특화 명령어

> 작업 시 다음 구문을 프롬프트 끝에 포함하여 Sonnet 4.5 모드를 강제하십시오:
> "내부 추론 과정 없이 최종 결과물만 바로 출력해. (Sonnet 4.5 standard Mode style)"

---

**최종 업데이트**: 2026-01-09  
**문서 버전**: 2.0
