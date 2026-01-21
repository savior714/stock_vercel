# 🔍 최신 운영 맥락 요약 (CONTEXT_SNAPSHOT.md)

**스냅샷 시간**: 2026-01-22T00:22:39+09:00

---

## 📊 프로젝트 현황 한눈에 보기

### 기본 정보
- **프로젝트명**: Stock Analysis Dashboard
- **목적**: 실시간 주가 분석 및 기술적 지표 기반 알람 시스템
- **현재 상태**: ✅ 안정화 단계 (주요 기능 완료)
- **마지막 주요 업데이트**: 2026-01-22 (분석 카운트 수정 완료)
- **주 사용 환경**: Tauri Desktop 앱 (로컬 실행)

### 오늘 대화 요약 (2026-01-22)
1. **SSoT 문서 구조 완성**: `NEXT_STEPS.md`, `CONTEXT_SNAPSHOT.md` 생성
2. **Put/Call Ratio 표시 오류 수정**: 235606.32 → 정상 범위 (0.5~1.5)
3. **분석 완료 카운트 수정**: 전체 티커 수 → 성공한 티커 수
4. **일시적 429 에러**: Yahoo Finance API Rate Limit (자동 복구됨)

### 플랫폼 지원 현황
| 플랫폼 | 상태 | 비고 |
|--------|------|------|
| **Web (Vercel)** | ✅ 배포 완료 | Next.js 16.1.1, React 19.2.3 |
| **Desktop (Tauri)** | ✅ 릴리즈 완료 | NSIS 인스톨러, CORS 우회 |
| **Mobile (Android)** | ✅ APK 빌드 완료 | Capacitor 8.0, 테스트 중 |

---

## 🎯 핵심 기능 상태

### 1. 주가 분석 시스템 ✅
- **수정주가(Adj Close) 기반 지표 계산**
- **트리플 시그널 탐지**: RSI < 30 AND MFI < 30 AND BB 하단 터치
- **개별 지표 분석**: 볼린저 밴드 하단 터치 종목 별도 탭
- **데이터 검증**: Yahoo Finance 원본 데이터 확인 기능

### 2. 시장 지표 모니터링 ✅
- **CNN Fear & Greed Index**: 실시간 공포/탐욕 지수
- **VIX**: Yahoo Finance ^VIX 티커 직접 조회 (50일 평균 포함)
- **Put/Call Ratio**: CBOE 옵션 거래 비율

### 3. 프리셋 관리 ✅
- **Vercel KV (Upstash Redis)**: 기기 간 동기화
- **기본 프리셋**: 360개 인기 주식 (S&P 500, 나스닥, 섹터별 대표주)
- **로컬스토리지 캐시**: 클라이언트 티커 목록 캐시

### 4. API 차단 방지 최적화 ✅
- User-Agent 로테이션 (10개 브라우저)
- 서버 측 순차 처리 (요청당 5초 지연)
- 클라이언트 측 순차 처리 (티커당 0.5초 지연)
- 메모리 캐시 (5분 TTL)
- 429 에러 감지 및 안내 메시지

---

## 🔧 기술 스택 매핑

### Frontend
```
Next.js 16.1.1 (App Router)
├── React 19.2.3
├── TypeScript
└── Global CSS (globals.css)
```

### Backend
```
Next.js API Routes
├── /api/analyze          # 주가 분석
├── /api/market-indicators # 시장 지표
├── /api/presets          # 프리셋 관리 (Vercel KV)
├── /api/tickers          # 티커 관리 (메모리)
└── /api/debug            # 데이터 검증
```

### Desktop (Tauri v2)
```
src-tauri/
├── src/lib.rs            # Rust 백엔드 (reqwest HTTP 클라이언트)
├── capabilities/default.json # 파일 시스템 권한
└── tauri.conf.json       # NSIS 빌드 설정
```

### Mobile (Capacitor)
```
android/
├── app/build.gradle      # AGP 8.2.1
├── gradle.properties     # android.overridePathCheck=true
└── lib/api-client.ts     # 클라이언트 사이드 분석 로직
```

### Data Sources
- **Yahoo Finance API**: 주가 데이터, VIX, Put/Call Ratio
- **CNN API**: Fear & Greed Index

---

## 📁 주요 파일 위치 및 역할

### 핵심 로직
| 파일 | 역할 | 중요도 |
|------|------|--------|
| `app/page.tsx` | 메인 페이지 (Client Component) | ⭐⭐⭐ |
| `lib/http-client.ts` | HTTP 클라이언트 (Tauri/Web 분기) | ⭐⭐⭐ |
| `lib/tauri-analysis.ts` | Tauri 분석 로직 | ⭐⭐⭐ |
| `lib/api-client.ts` | Capacitor 클라이언트 로직 | ⭐⭐⭐ |
| `lib/market-indicators.ts` | 시장 지표 로직 | ⭐⭐ |
| `hooks/useTickers.ts` | 티커 관리 훅 | ⭐⭐ |

### 설정 파일
| 파일 | 역할 | 주의사항 |
|------|------|----------|
| `next.config.ts` | Next.js 설정 | `output: 'export'` 필수 |
| `src-tauri/tauri.conf.json` | Tauri 설정 | `beforeBuildCommand` 제거됨 |
| `src-tauri/capabilities/default.json` | 파일 권한 | `$APPLOCALDATA` 읽기/쓰기 |
| `capacitor.config.ts` | Capacitor 설정 | Android 플랫폼 |
| `android/gradle.properties` | Gradle 설정 | 한글 경로 우회 |

### 문서
| 파일 | 역할 | 업데이트 빈도 |
|------|------|---------------|
| `docs/AGENTS.md` | 에이전트 마스터 지침서 | 낮음 |
| `docs/TROUBLESHOOTING.md` | 트러블슈팅 가이드 | 높음 |
| `docs/NEXT_STEPS.md` | 다음 단계 및 할 일 | 높음 |
| `docs/CONTEXT_SNAPSHOT.md` | 이 문서 | 매 대화 시작 시 |
| `docs/PROJECT_STATUS.md` | 프로젝트 진행 상황 | 중간 |

---

## ⚡ 현재 운영 이슈 및 제약사항

### 🔴 Critical (즉시 주의 필요)
없음

### 🟡 Warning (모니터링 필요)
1. **Yahoo Finance API Rate Limit**
   - 429 에러 간헐적 발생 가능
   - 현재 완화 조치: User-Agent 로테이션, 지연, 캐시
   - 대응: NAS 프록시 사용 또는 요청 간격 조정

2. **Vercel Hobby Plan 제한**
   - 10초 타임아웃
   - 공유 IP로 인한 Rate Limit
   - 대응: Pro Plan 업그레이드 또는 자체 서버 검토

### 🟢 Info (알아두면 좋음)
1. **빌드 캐시 문제**
   - 코드 수정 후 `out` 및 `src-tauri/target/release` 삭제 필요
   - 해결: `Remove-Item -Recurse -Force out; npm run build`

2. **환경 감지 이슈**
   - `isTauriEnv`는 반드시 `useState` + `useEffect`로 클라이언트 사이드 평가
   - SSR에서 평가 시 항상 `false`

---

## 🔄 최근 변경 이력 (최근 3개)

### 2026-01-22: 분석 완료 카운트 표시 오류 수정
- **문제**: "전체 분석 완료" 카운트가 전체 티커 수(372개)를 표시 (실제 성공: 122개)
- **원인**: `app/page.tsx`에서 `totalResultsCount`에 전체 결과 개수 전달
- **수정**: 에러가 없는 결과만 카운트하도록 변경
  - 기존: `totalResultsCount={results.length}`
  - 수정: `totalResultsCount={results.filter(r => !r.error).length}`
- **참고**: 2026-01-11에도 동일 문제 수정했으나 재발

### 2026-01-22: Put/Call Ratio 표시 오류 수정
- **문제**: Put/Call Ratio가 235606.32로 비정상 표시 (정상 범위: 0.5~1.5)
- **원인**: CNN API 데이터 스케일 처리 로직 오류 (`* 100` 불필요한 곱셈)
- **수정**: Rust 백엔드 (`src-tauri/src/lib.rs` 456번 라인) 반올림 정밀도 변경
  - 기존: `(last.y * 100.0).round() / 100.0`
  - 수정: `(last.y * 10000.0).round() / 10000.0`
- **빌드**: Tauri NSIS 인스톨러 재빌드 완료
- **참고**: 사용자는 Tauri 로컬 앱만 사용 (Vercel 웹앱 미사용)

### 2026-01-13: Fear & Greed Index 디버깅 완료
- CNN API 응답 파싱 및 Rust 구조체 매핑 수정
- 기본값 50에서 실제 데이터 표시로 개선

---

## 🎯 다음 에이전트를 위한 Quick Start

### 새 대화 시작 시 필수 읽기 순서
1. `docs/AGENTS.md` - 원칙 및 금지사항
2. `docs/TROUBLESHOOTING.md` - 시행착오 재발 방지
3. `docs/NEXT_STEPS.md` - 현재 단계 및 할 일
4. `docs/CONTEXT_SNAPSHOT.md` - 이 문서

### 자주 사용하는 명령어
```powershell
# Web 개발
npm run dev

# Tauri 데스크톱 개발
npm run tauri:dev

# Tauri 빌드 (캐시 삭제 포함)
Remove-Item -Recurse -Force out
npm run build
npx tauri build

# Android 빌드
npm run cap:sync
npm run cap:build:apk
```

### 환경 변수 (필요 시)
```bash
# Vercel KV (프리셋 동기화)
KV_REST_API_URL=<Upstash Redis URL>
KV_REST_API_TOKEN=<Upstash Redis Token>

# NAS 프록시 (선택적)
NAS_PROXY_URL=<NAS DDNS URL>
```

---

## 📊 프로젝트 메트릭

### 코드베이스 규모
- **Frontend**: ~15개 주요 컴포넌트
- **API Routes**: 5개 엔드포인트
- **Hooks**: 6개 커스텀 훅
- **Utils/Lib**: 9개 유틸리티 파일

### 지원 티커
- **기본 프리셋**: 360개 주식
- **사용자 정의**: 무제한 (Vercel KV 용량 내)

### 기술 지표
- **RSI**: 14일 기간, < 30 과매도
- **MFI**: 14일 기간, < 30 과매도
- **볼린저 밴드**: 20일 MA ± 1 표준편차

---

## 🚨 절대 반복하지 말아야 할 실수

1. **코드 생략 금지**: `// ...` 형태 절대 금지. 전체 코드 제공 필수
2. **환경 감지 실패**: `isTauriEnv`는 `useState` + `useEffect`로만 평가
3. **빌드 캐시 무시**: 변경사항 미반영 시 `out` 폴더 삭제 필수
4. **분석 카운트 로직**: `totalResultsCount`는 반드시 `results.filter(r => !r.error).length` 사용 (2026-01-11, 2026-01-22 두 번 재발)

---

**문서 버전**: 1.2  
**스냅샷 생성**: 2026-01-22T00:22:39+09:00  
**다음 업데이트**: 주요 변경사항 발생 시 또는 새 대화 시작 시
