# 🤖 AGENTS.md - Stock Analysis Dashboard

AI 에이전트가 이 프로젝트 작업 시 따라야 할 지침서입니다.

---

## 🎯 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | Stock Analysis Dashboard |
| **핵심 목표** | 기술적 분석 지표(RSI, MFI, 볼린저 밴드)를 활용한 과매도 구간 주식 자동 탐지 웹 애플리케이션 |
| **배포 URL** | Vercel (자동 배포) |

### 기술 스택
- **Frontend**: Next.js 16.1.1 (App Router), React, TypeScript
- **Styling**: CSS Modules (Vanilla CSS)
- **API**: Next.js API Routes
- **Data Sources**: Yahoo Finance API, CNN Fear & Greed Index, CBOE Put/Call Ratio

---

## 🏗 2. 개발 원칙

### 프레임워크 & 스타일링
- 웹페이지 개발은 반드시 **Next.js (App Router)** 기반으로 한다.
- 스타일링은 **CSS Modules** 또는 **Vanilla CSS** 사용.
- 서버 컴포넌트 우선 활용, 클라이언트 로직에만 `'use client'` 사용.

### 코드 품질
- **Encoding**: 모든 소스 코드 및 입출력 한국어는 **UTF-8** 인코딩.
- **Lint**: 주기적으로 Lint 오류 점검 및 수정.
- **Knip**: 사용하지 않는 파일, 의존성, 변수 제거로 프로젝트 경량화 유지.

### 커뮤니케이션
- **언어 정책**: 모든 답변과 산출물은 반드시 **한글**로 작성.
- 불필요한 설명 최소화, **작업 결과와 핵심 로그** 위주 보고.
- 모르는 내용/에러 발생 시 추측하지 않고 솔직히 인정, 대안 제시.
- 프로세스 진행 시 **진행률(Progress Bar/로그)** 표시.

### 문서 관리
- 모든 Markdown 파일은 프로젝트의 **`docs/` 폴더** 안에 저장한다.

---

## 📁 3. 프로젝트 구조

```
stock-vercel/
├── app/
│   ├── api/
│   │   ├── analyze/          # 주가 분석 API (RSI, MFI, BB)
│   │   ├── market-indicators/ # 시장 지표 API (Fear&Greed, VIX, Put/Call)
│   │   └── tickers/          # 티커 관리 API
│   ├── page.tsx              # 메인 대시보드 페이지
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 글로벌 스타일
├── public/
│   └── preset_tickers.json   # 프리셋 티커 목록 (360개)
├── docs/                     # 문서 폴더
│   ├── AGENTS.md             # 이 파일
│   └── README.md             # 프로젝트 설명서
└── package.json
```

---

## 🛠 4. 운영 명령어

| 작업 | 명령어 |
|------|--------|
| 개발 서버 실행 | `npm run dev` |
| 프로덕션 빌드 | `npm run build` |
| Vercel 배포 | `vercel --prod` |
| 의존성 설치 | `npm install` |

---

## 🔧 5. API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/analyze` | POST | 주식 분석 실행 (RSI, MFI, BB) |
| `/api/market-indicators` | GET | 시장 지표 조회 (Fear&Greed, VIX, Put/Call) |
| `/api/tickers` | GET/POST | 티커 목록 관리 |

---

## 🤖 6. Git Push Workflow (5단계 필수 절차)

사용자가 "git에 푸시해줘" 요청 시 다음 절차 엄격 준수:

1. **변경사항 정리 및 커밋**: `git status` 확인 → 논리적 단위로 스테이징 → Conventional Commits 규격(`feat:`, `fix:`, `docs:`) 준수 및 UTF-8 메시지 작성
2. **문서 업데이트**: `docs/README.md` 또는 `docs/AGENTS.md`에 변경 기능 즉시 반영 후 커밋
3. **Feature 브랜치 푸시**: 현재 브랜치(또는 새 브랜치)를 원격 저장소에 push
4. **Main 브랜치 병합**: main 브랜치로 체크아웃 후 merge 실행 (충돌 시 즉시 보고 및 해결책 제시)
5. **Main 브랜치 최종 푸시**: 병합 완료된 main 브랜치를 `origin main`에 최종 push

---

## 📊 7. 기술적 지표 참고

| 지표 | 과매도 기준 | 과매수 기준 |
|------|------------|------------|
| RSI | < 35 | > 70 |
| MFI | < 35 | > 80 |
| Bollinger Band | 하단 터치 | 상단 터치 |
| Fear & Greed | 0-25 (Extreme Fear) | 75-100 (Extreme Greed) |
| VIX | < 15 (Low) | > 30 (Extreme) |
| Put/Call Ratio | > 1.0 (Extreme Fear) | < 0.8 (Neutral) |

---

## ⚠️ 8. 주의사항

- **API Rate Limit**: Yahoo Finance API는 가끔 rate limit 발생 가능
- **데이터 요구사항**: 분석에 최소 20일 이상의 과거 데이터 필요
- **티커 포맷**: `BRK.B` → `BRK-B` 자동 변환 (Yahoo Finance 호환)
- **면책 조항**: 이 도구는 교육/정보 제공 목적만, 투자 결정은 본인 책임

---

## 🔄 9. 충돌 관리

실제 코드와 이 지침(`docs/AGENTS.md`)이 충돌하면 **지침을 최신화하는 것을 최우선**으로 제안한다.
