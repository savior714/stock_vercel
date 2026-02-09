# 📋 다음 단계 (NEXT_STEPS.md)

**최종 업데이트**: 2026-02-09T10:30:00+09:00

---

## 🎯 현재 단계

**프로젝트 상태**: 🚀 네이티브 플랫폼 집중 전환 완료

**마지막 완료 작업**:
- **2026-02-07**: 네이티브 전용 리팩토링 (Vercel 제거)
  - `src/app/api` 폴더 및 Vercel 관련 설정 파일 삭제
  - `useAnalysis.ts` 서버 모드 로직 제거 및 네이티브 통합
  - `README.md` 및 SSoT 문서 네이티브 중심으로 개편
- **2026-02-07**: GitHub 프리셋 동기화 도입
  - `presets.json` 추출 및 GitHub Raw URL 연동
  - Tauri 환경 프리셋 저장 시 자동 `git push` 구현
- **2026-02-09**: IDE 개발 환경 안정화
  - Capacitor Android 빌드 경로 오류 및 CSS 린트 이슈 해결
  - `settings.json` 최적화 (Java 제외 규칙 및 Tailwind v4 설정)

---

## 🚀 즉시 실행 가능한 작업

### 1. 네이티브 성능 최적화
- [x] **[긴급]** `npm run build` 에러 해결 (모듈 미발견 및 락파일 이슈, BOM 제거)
- [x] **[긴급]** `npm run build` 에러 해결 (모듈 미발견 및 락파일 이슈, BOM 제거)
- [x] **[완료]** IDE 및 Android 빌드 환경 안정화 (Java Extension, CSS Lint, Gradle 8.13 Override)
- [x] **[긴급]** 오버레이 투명도 조절 기능(슬라이더) 구현
- [x] **[긴급]** 초기 실행 시 프리셋 자동 로드 구현
- [ ] Tauri(Rust) 분석 엔진의 결과 처리 속도 벤치마킹 및 튜닝
- [ ] Android APK의 백그라운드 분석 안정성 테스트
- [ ] GitHub 동기화 시 충돌 방지 로직 (Git Pull 우선 실행 등) 검토

### 2. 기능 확장 (Native 전용)
- [ ] **GitHub 동기화 안정성**: 충돌 방지 로직(Git Pull 우선 실행) 및 에러 핸들링 강화
- [ ] **(취소됨)** 다크 모드: 시스템 설정 연동 불필요 (단일 테마 유지)

### 3. 문서 및 유지보수
- [ ] `docs/OPTIONS_SIGNALS_PLAN.md` 정리 (불필요한 기능 명세 삭제)
- [ ] Android APK 설치 및 설정 가이드 최신화

---

## 🔮 향후 개선 계획

### Phase 1: 안정성 및 성능 (우선순위: 높음)
1. **분석 엔진 고도화**
   - Rust 백엔드 처리량 증대 (멀티스레딩 최적화)
   - Android Native HTTP 예외 처리 세분화
2. **GitHub 동기화 고도화**
   - 설정(RSI 기간 등)까지 GitHub에 동기화할지 결정
   - 프리셋 히스토리 관리 (Git log 활용)

### Phase 2: 시각화 및 UX (우선순위: 중간)
1. **인터랙티브 차트**
   - 티커 클릭 시 하단에 상세 기술적 지표 차트 표시
2. **모바일 최적화**
   - Android용 하단 탭 내비게이션 및 위젯 지원

---

## ⚠️ 알려진 이슈 및 제약사항

### 해결 필요
1. **GitHub Auth (Tauri)**
   - 로컬 환경의 Git 인증 정보(`ssh-agent`, `credential helper`)가 Tauri 쉘 명령 실행 시 정상 작동해야 함
- [x] **Desktop (Tauri) Overlay Mode**
    - [x] 투명 윈도우 구현 (Windows WebView2 호환성 해결)
    - [x] 커스텀 타이틀바 및 창 제어 기능 구현
    - [x] 오버레이 모드 (Click-Through) 및 동적 투명도 구현

- [ ] **Data Fetching Refinement**
    - [ ] Yahoo Finance API 호출 최적화 (캐싱 전략 강화)
    - [ ] 실시간 데이터 갱신 주기 설정 옵션화

- [x] **UI/UX Polish**
    - [x] 오버레이 모드에서의 가독성 개선 (텍스트 그림자 등)
    - [x] 투명도 조절 슬라이더(Live Preview) 추가
2. **Yahoo Finance Rate Limit**
   - 직접 호출 방식에서도 과도한 요청 시 차단 가능성 존재 (지연 로직 필수)

### 모니터링 필요
1. **Tauri 빌드 캐시**
   - `out` 폴더 삭제 후 빌드 습관 유지 필요
2. **Android 한글 경로**
   - `android.overridePathCheck=true` 설정 유지

---

## 🎯 다음 에이전트를 위한 지침
1. **웹앱 고려 금지**: 모든 로직은 브라우저 환경이 아닌 Tauri/Capacitor를 기준으로 작성할 것.
2. **프리셋 관리**: `presets.json`과 GitHub 동기화 로직이 훼손되지 않도록 주의할 것.
3. **분석 방식**: 직접 API 호출(CORS 프리)을 기본으로 하며, 프록시 서버 호출 로직 추가 금지.

---

**문서 버전**: 2.0 (Native focused)  
**작성일**: 2026-02-07
