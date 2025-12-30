# 📈 Stock Analysis Dashboard

실시간 주가 분석 및 기술적 지표(RSI, MFI, Bollinger Bands) 기반의 투자 보조 시스템입니다.
**Next.js** 웹 애플리케이션과 **Tauri** 데스크톱 앱(Rust Backend)을 모두 지원하는 하이브리드 프로젝트입니다.

## 🚀 주요 기능

- **트리플 시그널 분석**: RSI < 35 AND MFI < 35 AND 볼린저 밴드 하단 터치 시 강력한 매수 신호 포착
- **기술적 지표 모니터링**:
  - RSI (Relative Strength Index)
  - MFI (Money Flow Index)
  - Bollinger Bands (20일 이평선 ± 2표준편차)
- **시장 심리 지표**: Fear & Greed Index, VIX, Put/Call Ratio
- **Tauri Native Mode**: Rust 백엔드를 통해 CORS 제약 없이 고속으로 주가 데이터를 수집 및 분석
- **데이터 검증**: Yahoo Finance 원본 데이터와 지표 계산 결과 교차 검증

## 🛠 기술 스택

- **Web Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Desktop Engine**: **Tauri v2** (Rust Backend)
- **API**: Yahoo Finance (via `reqwest`), Vercel API Routes
- **State Management**: React Hooks (Context-free simple state)
- **Storage**: Vercel KV (Preset Sync), LocalStorage (Cache)

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 18+
- Rust (Tauri 빌드용)

### 1. 웹 모드 실행 (Web Only)
브라우저 환경에서 실행되며, Vercel API를 통해 데이터를 가져옵니다.
```bash
npm install
npm run dev
```

### 2. Tauri 앱 실행 (Desktop App - 추천)
Rust 백엔드를 사용하여 더 빠르고 CORS 제약 없는 분석이 가능합니다.
```bash
npm install
npx tauri dev
```

### 3. 프로덕션 빌드
```bash
# Web Build
npm run build

# Desktop App Build
npx tauri build
```

## 📂 프로젝트 구조

- `app/`: Next.js App Router 페이지 및 컴포넌트
- `src-tauri/`: Tauri Rust 백엔드 설정 및 로직 (`lib.rs`)
- `lib/`: 공유 유틸리티 (기술적 지표 계산 등)
- `docs/`: 프로젝트 문서 (`AGENTS.md`, `PROJECT_STATUS.md` 등)

## 📝 라이선스
MIT License
