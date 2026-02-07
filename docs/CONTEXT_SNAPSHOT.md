# 🔍 최신 운영 맥락 요약 (CONTEXT_SNAPSHOT.md)

**스냅샷 시간**: 2026-02-07T23:45:00+09:00

---

## 📊 프로젝트 현황 한눈에 보기

### 기본 정보
- **프로젝트명**: Stock Analysis Native
- **목적**: CORS 제약 없는 네이티브(Tauri/Android) 주가 분석 시스템
- **현재 상태**: 🚀 네이티브 전환 완료 (Vercel 의존성 제거)
- **주 사용 환경**: Tauri Desktop (메인), Android APK (보조)

### 핵심 전략 (Pivot)
- **Web App 제거**: Vercel 배포 및 API Routes 서비스 중단
- **Native 연동**: Tauri(Rust) 및 CapacitorHttp를 통한 Yahoo Finance 직접 통신
- **GitHub Sync**: `presets.json`을 GitHub 저장소와 직접 동기화 (Tauri에서 자동 git push)

### 플랫폼 지원 현황
| 플랫폼 | 상태 | 비고 |
|--------|------|------|
| **Desktop (Tauri)** | ✅ 최적화 완료 | Rust 백엔드, GitHub 자동 동기화 기능 탑재 |
| **Mobile (Android)** | ✅ 분석 연동 완료 | Capacitor 8.0, 클라이언트 사이드 분석(CORS 프리) |
| **Web (Vercel)** | ❌ 삭제됨 | 네이티브 집중을 위해 모든 서버측 코드 제거 |

---

## 🎯 핵심 기능 상태

### 1. 주가 분석 시스템 ✅
- **Native Engine**: Tauri(Rust) 및 Android(Native HTTP) 직접 통신 엔진 통합
- **트리플 시그널**: RSI < 30, MFI < 30, BB 하단 터치 실시간 탐지

### 2. 프리셋 및 동기화 ✅
- **GitHub Sync**: `presets.json` 파일을 통한 기기 간 동기화 (Vercel KV 대체)
- **Tauri Push**: 데스크톱에서 프리셋 저장 시 자동으로 `git add/commit/push` 수행

---

## 📁 주요 파일 위치 및 역할

### 핵심 로직
| 파일 | 역할 | 중요도 |
|------|------|--------|
| `src/hooks/useAnalysis.ts` | 분석 엔진 통합 (Tauri/Android 분기) | ⭐⭐⭐ |
| `src/hooks/useTickers.ts` | GitHub 동기화 및 티커 관리 | ⭐⭐⭐ |
| `presets.json` | 중앙 집중식 프리셋 데이터 | ⭐⭐⭐ |
| `src-tauri/src/lib.rs` | Rust 기반 고성능 분석 로직 | ⭐⭐⭐ |

---

## ⚡ 현재 운영 이슈 및 제약사항

### 🔴 Critical (즉시 주의 필요)
1. **Build Failure (Npm)**
   - `npm run build` 시 `@tauri-apps/plugin-fs` 모듈 미발견 에러 발생
   - 원인: 의존성 최적화로 인한 패키지 락파일 불일치 추정
   - 상태: `docs/troubleshooting/build.md`에 해결책 기록됨

### 🟡 Warning (모니터링 필요)
1. **Yahoo Finance API Rate Limit**
   - 429 에러 간헐적 발생 가능
   - 대응: NAS 프록시 사용 또는 요청 간격 조정

### 🟢 Info (알아두면 좋음)
1. **Tauri 빌드 캐시 문제**
   - 코드 수정 후 `out` 폴더 삭제 필수
   - 해결: `Remove-Item -Recurse -Force out; npm run build`

---

## 🔄 최근 변경 이력 (최근 3개)

### 2026-02-07: 네이티브 전용 앱으로 대대적 리팩토링
- **변경**: `src/app/api` 폴더 및 Vercel 관련 설정 파일(`vercel.json` 등) 전면 삭제
- **수정**: `useAnalysis.ts`에서 서버 모드 로직 제거 및 네이티브 로직 통합
- **문서**: `README.md`를 Tauri/Android 중심 네이티브 앱 문서로 재작성

### 2026-02-07: GitHub 프리셋 동기화 기능 도입
- **기능**: `presets.json` 추출 및 GitHub Raw URL 연동
- **자동화**: Tauri 환경에서 프리셋 저장 시 자동 `git push` 로직 구현

### 2026-02-07: SettingsModal UI 고도화
- 설정창 오픈 시 바디 스크롤 잠금 및 내부 스크롤 기능 개선

---

**문서 버전**: 2.0 (Native focused)  
**스냅샷 생성**: 2026-02-07T23:45:00+09:00  
**다음 업데이트**: 네이티브 기능 확장 또는 아키텍처 변경 시
