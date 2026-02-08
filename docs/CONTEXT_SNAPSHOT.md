# 🔍 최신 운영 맥락 요약 (CONTEXT_SNAPSHOT.md)

**스냅샷 시간**: 2026-02-08T01:35:00+09:00

---

## 📊 프로젝트 현황 한눈에 보기

### 기본 정보
- **프로젝트명**: Stock Analysis Native
- **목적**: CORS 제약 없는 네이티브(Tauri/Android) 주가 분석 시스템
- **현재 상태**: 🚀 네이티브 전환 완료 & 윈도우 투명 오버레이 모드 구현 완료
- **주 사용 환경**: Tauri Desktop (Overlay Mode), Android APK (보조)

### 핵심 전략 (Pivot)
- **Overlay First**: 주식 정보를 항상 위에 띄워두고(Always On Top) 다른 작업을 방해하지 않는 투명 오버레이 앱으로 진화.
- **Native 연동**: Tauri(Rust) 및 CapacitorHttp를 통한 Yahoo Finance 직접 통신
- **GitHub Sync**: `presets.json`을 GitHub 저장소와 직접 동기화 (Tauri에서 자동 git push)

### 플랫폼 지원 현황
| 플랫폼 | 상태 | 비고 |
|--------|------|------|
| **Desktop (Tauri)** | ✅ 메인 플랫폼 | **투명 오버레이**, 커스텀 타이틀바, 클릭 관통(Click-Through) 지원 |
| **Mobile (Android)** | ✅ 보조 플랫폼 | Capacitor 8.0, 클라이언트 사이드 분석(CORS 프리) |
| **Web (Vercel)** | ❌ 배포 중단 | `npm run build`는 Tauri/Capacitor 빌드를 위한 선행 과정일 뿐, 웹 배포 목적 아님 |

---

## 🎯 핵심 기능 상태

### 1. 투명 오버레이 시스템 (New) ✅
- **Active Mode**: 불투명 배경, 창 제어 가능 (이동, 최소화, 종료, 티커 관리).
- **Overlay Mode**: 창에서 포커스가 벗어나면(Blur) 완전 투명(Ghost) 모드로 전환.
- **Click-Through**: 오버레이 모드에서는 마우스 클릭이 앱을 통과하여 뒤에 있는 차트/게임 조작 가능.

### 2. 주가 분석 시스템 ✅
- **Native Engine**: Tauri(Rust) 및 Android(Native HTTP) 직접 통신 엔진 통합
- **트리플 시그널**: RSI < 30, MFI < 30, BB 하단 터치 실시간 탐지

### 3. 사용자 경험 (UX) 원칙 ⭐
- **Simplicity**: 복잡한 차트나 그래프 제공 금지. 오직 신호(Signal)만 제공.
- **Direct Link**: 결과 클릭 시 `tossinvest.com`으로 즉시 이동 (별도 팝업/알림 없음).
- **No System Notifications**: 윈도우 알림 센터(Action Center) 사용 금지. 조용한 발견 지향.

### 4. 프리셋 및 동기화 ✅
- **GitHub Sync**: `presets.json` 파일을 통한 기기 간 동기화 (Vercel KV 대체)
- **Tauri Push**: 데스크톱에서 프리셋 저장 시 자동으로 `git add/commit/push` 수행

---

## 📁 주요 파일 위치 및 역할

### 핵심 로직
| 파일 | 역할 | 중요도 |
|------|------|--------|
| `src/hooks/useAnalysis.ts` | 분석 엔진 통합 (Tauri/Android 분기) | ⭐⭐⭐ |
| `src-tauri/src/lib.rs` | Rust 기반 고성능 분석 로직 & 윈도우 제어 (Transparency) | ⭐⭐⭐ |
| `src/components/WindowEffect.tsx` | 투명도 및 클릭 관통 제어 (Frontend) | ⭐⭐⭐ |
| `src/components/TitleBar.tsx` | 커스텀 타이틀바 (최소화/최대화/종료) | ⭐⭐ |

---

## ⚡ 현재 운영 이슈 및 제약사항

### 🟢 Info (알아두면 좋음)
1.  **Overlay Mode 특성**
    - 앱을 조작하려면 작업표시줄 아이콘을 클릭하거나 `Alt+Tab`으로 포커스를 가져와야 함.
    - 투명 모드에서는 마우스 이벤트가 무시됨(Click-Through).

---

## 🔄 최근 변경 이력 (최근 3개)

### 2026-02-08: Rust 분석 엔진 최적화 (Completed)
- **Concurrency**: `tokio::sync::Semaphore` 도입으로 5개 티커 병렬 처리 (속도 5배 향상).
- **Date Parsing**: `chrono` 라이브러리 도입으로 날짜 변환 로직 정확도 및 성능 개선.

### 2026-02-08: 투명 오버레이 & 클릭 관통 구현 (Completed)
- **Transparency**: `webview2-com` 및 Rust 백엔드를 이용한 True Transparency 구현 ("White-out" 문제 해결).
- **Interaction**: `WindowEffect.tsx`를 통해 Focus/Blur에 따른 동적 투명도 및 클릭 관통 제어.

### 2026-02-07: 네이티브 전용 앱으로 대대적 리팩토링
- **변경**: `src/app/api` 폴더 및 Vercel 관련 설정 파일(`vercel.json` 등) 전면 삭제
- **수정**: `useAnalysis.ts`에서 서버 모드 로직 제거 및 네이티브 로직 통합

### 2026-02-07: GitHub 프리셋 동기화 기능 도입
- **기능**: `presets.json` 추출 및 GitHub Raw URL 연동
- **자동화**: Tauri 환경에서 프리셋 저장 시 자동 `git push` 로직 구현

---

**문서 버전**: 2.1 (Overlay Update)
**스냅샷 생성**: 2026-02-08T01:35:00+09:00
**다음 업데이트**: UI 디자인 고도화 또는 모바일 연동 강화 시
