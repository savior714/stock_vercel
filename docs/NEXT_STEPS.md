# 📋 다음 단계 (NEXT_STEPS.md)

**최종 업데이트**: 2026-01-22T00:07:00+09:00

---

## 🎯 현재 단계

**프로젝트 상태**: 안정화 단계 (주요 기능 완료)

**마지막 완료 작업**:
- **2026-01-22**: 분석 완료 카운트 표시 오류 수정
  - "전체 분석 완료" 카운트가 전체 티커 수 대신 성공한 티커 수를 표시하도록 수정
  - `app/page.tsx` 229번 라인: `results.length` → `results.filter(r => !r.error).length`
- **2026-01-22**: Put/Call Ratio 표시 오류 수정 (235606.32 → 정상 범위)
  - Rust 백엔드 (`src-tauri/src/lib.rs`) 수정
  - Web API (`app/api/market-indicators/route.ts`) 수정
  - CNN API 데이터 스케일 처리 로직 개선
  - Tauri NSIS 빌드 완료
- Tauri Desktop 앱 NSIS 빌드 완료
- Capacitor Android 앱 빌드 완료
- 모든 핵심 기능 구현 완료 (주가 분석, 시장 지표, 프리셋 관리)

---

## 🚀 즉시 실행 가능한 작업

### 1. 검증 및 테스트
- [ ] 분석 완료 카운트 수정 검증 (Tauri 앱에서 Ctrl+R 새로고침 후 확인)
- [ ] Put/Call Ratio 정상 범위 표시 확인 (0.5~1.5)
- [ ] 대량 티커 분석 시 429 에러 빈도 모니터링

### 2. 문서화 개선
- [ ] `docs/OPTIONS_INDICATORS_GUIDE.md` 검토 및 구현 여부 결정
- [ ] `docs/OPTIONS_SIGNALS_PLAN.md` 검토 및 구현 여부 결정
- [ ] 사용자 가이드 업데이트 (최신 UI 스크린샷 포함)

### 3. 성능 최적화 (필요 시)
- [ ] 429 에러 빈번 발생 시 요청 간격 조정 (500ms → 1초)
- [ ] Vercel KV 캐시 시스템 강화 (서버 재시작 후에도 유지)
- [ ] 병렬 처리 최적화

---

## 🔮 향후 개선 계획

### Phase 1: 안정성 강화 (우선순위: 높음)
1. **에러 복구 메커니즘**
   - 자동 재시도 로직 구현
   - Fallback API 연동 검토 (Finnhub 등)
   - 네트워크 에러 핸들링 강화

2. **모니터링 시스템**
   - API 호출 성공률 추적
   - 에러 로그 수집 및 분석
   - 사용자 피드백 수집 메커니즘

### Phase 2: 기능 확장 (우선순위: 중간)
1. **옵션 지표 추가** (OPTIONS_SIGNALS_PLAN.md 참조)
   - 0DTE (Zero Days to Expiration)
   - Max Pain
   - Gamma Wall
   - Unusual Options Activity
   - Skew

2. **UI/UX 개선**
   - 차트 시각화 추가 (TradingView 위젯 또는 Chart.js)
   - 알림 기능 (브라우저 알림, 이메일 등)
   - 다크 모드 개선
   - 반응형 디자인 최적화

3. **데이터 확장**
   - 한국 주식 지원 (KRX API 연동 검토)
   - 암호화폐 지원 (Binance API 연동 검토)
   - 포트폴리오 추적 기능

### Phase 3: 고급 기능 (우선순위: 낮음)
1. **백테스팅 시스템**
   - 과거 데이터 기반 전략 검증
   - 수익률 시뮬레이션

2. **소셜 기능**
   - 사용자 간 프리셋 공유
   - 커뮤니티 추천 종목

3. **AI 분석**
   - 뉴스 감성 분석
   - 가격 예측 모델

---

## ⚠️ 알려진 이슈 및 제약사항

### 해결 필요
1. **Yahoo Finance API Rate Limit**
   - 현재: User-Agent 로테이션, 지연, 캐시로 완화
   - 개선안: NAS 프록시 활용 또는 유료 API 검토

2. **Vercel Hobby Plan 제한**
   - 10초 타임아웃
   - 공유 IP로 인한 Rate Limit 공유
   - 개선안: Pro Plan 업그레이드 또는 자체 서버 구축

3. **메모리 캐시 휘발성**
   - 서버 재시작 시 캐시 초기화
   - 개선안: Vercel KV에 캐시 저장

### 모니터링 필요
1. **Tauri 빌드 캐시 문제**
   - 증상: 코드 수정 후 변경사항 미반영
   - 해결: `out` 및 `src-tauri/target/release` 삭제 후 재빌드

2. **Android 한글 경로 이슈**
   - 증상: 빌드 경로에 한글 포함 시 경고
   - 해결: `gradle.properties`에 `android.overridePathCheck=true` 추가

---

## 🎯 직전 에이전트가 남긴 '다음 행동'

**이전 대화 맥락**: 
- 최근 대화는 HWP 변환 관련 작업 (다른 프로젝트: HIRA Scraper)
- Stock Analysis Dashboard는 2026-01-13 이후 주요 업데이트 없음

**다음 에이전트를 위한 권고사항**:
1. 사용자가 새로운 기능 요청 시, `docs/OPTIONS_SIGNALS_PLAN.md` 먼저 확인
2. 빌드 관련 이슈 발생 시, `docs/TROUBLESHOOTING.md` 참조
3. 코드 수정 시 `docs/AGENTS.md`의 SSoT/DRY 원칙 엄수
4. 작업 완료 후 반드시 이 문서(`NEXT_STEPS.md`)와 `TROUBLESHOOTING.md` 업데이트

---

## 📝 작업 종료 시 체크리스트

작업 완료 후 다음을 반드시 수행:
- [ ] `docs/NEXT_STEPS.md` 업데이트 (완료된 작업 체크, 새로운 이슈 추가)
- [ ] `docs/TROUBLESHOOTING.md` 업데이트 (새로운 문제 및 해결 방법 기록)
- [ ] `docs/PROJECT_STATUS.md` 업데이트 (필요 시)
- [ ] Git 커밋 및 푸시 (Conventional Commits 규칙 준수)

---

**문서 버전**: 1.0  
**작성일**: 2026-01-21
