# 🧩 CRITICAL_LOGIC (SSOT)

## 🎯 프로젝트 개요: Stock Analysis Native
- **목적**: 기술적 지표(RSI, MFI, 볼린저 밴드) 기반 실시간 과매도 구간 탐지 및 알람 시스템. 
- **핵심 전략**: CORS 제약 없는 네이티브(Tauri/Android) 환경 중심, **투명 오버레이(Always On Top)** 모드 최우선.

## 🏗️ 아키텍처 원칙 (3-Layer DDD)
1. **Definition**: 도메인 모델, 타입 정의, 상수 (`src/types/`, `src/constants/`)
2. **Repository**: Tauri(Rust `reqwest`), CapacitorHttp, GitHub Sync (`src/lib/api/`, `src/lib/storage/`)
3. **Service/Logic**: 지표 계산, 투명도 제어, 분석 페이싱 (`src/lib/analysis/`, `src/hooks/`)

## 🛠️ 기술 스택 및 환경 표준
- **Frontend**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript
- **UI Framework**: **Ark UI** (Headless UI) 기반 점진적 전환
- **Styling**: Global CSS (Glassmorphism & Overlay 최적화)
- **Native**: Tauri v2 (Rust Backend), Capacitor 8.0 (Android)
- **Python**: 3.14 (uv 가상환경 `.venv`) - 데이터 전처리 및 유틸리티
- **GitHub Sync**: `presets.json` 기반 기기 간 동기화 (Vercel KV 대체)

## 📱 플랫폼별 상태 및 역할
- **Desktop (Tauri)**: 메인 플랫폼. 투명 오버레이, 클릭 관통, GitHub 자동 Push 지원.
- **Mobile (Android)**: 보조 플랫폼. CapacitorHttp native 통신, 백그라운드 복원 지원.
- **Web**: Tauri/Capacitor 빌드를 위한 선행 단계 (Vercel 배포 지양).

## 🔄 데이터 분석 및 차단 방지 로직
- **트리플 시그널**: RSI(14) < 30 AND MFI(14) < 30 AND 볼린저 밴드(20, 1) 하단 터치.
- **데이터 정합성**: **수정주가(Adj Close)** 기반 (배당/분할 반영).
- **차단 방지**:
  - User-Agent 로테이션 (10종 브라우저)
  - 페이싱: 서버 측 5초(Web), 클라이언트 0.5초 / Tauri 200ms 지연
  - 5분 메모리 캐시 (TTL)
- **GitHub Sync**: `git pull --rebase` 및 아토믹 파일 쓰기로 충돌 방지.

## 📏 제약 사항 및 UX 원칙
- **No Charts**: 시스템 경량화를 위해 차트 시각화 배제.
- **No OS Notifications**: 조용한 발견 지향 (윈도우 알림 미사용).
- **Direct Links**: 상세 정보는 `tossinvest.com` 외부 링크 연결.
- **Overlay First**: 포커스 아웃(Blur) 시 투명 모드 + 클릭 관통 강제.
