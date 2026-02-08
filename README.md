# 📈 Stock Analysis (Native App)

실시간 주가 분석 및 기술적 지표(RSI, MFI, Bollinger Bands) 기반의 **Tauri(Desktop) & Android(Mobile)** 주식 분석 앱입니다.

---

## 🎯 프로젝트 개요

웹 브라우저의 CORS 제약과 서버리스 환경의 Rate Limit을 극복하기 위해, Rust 백엔드(Tauri)와 네이티브 HTTP(Android)를 기반으로 직접 데이터를 분석하는 **네이티브 전용 앱**으로 전환되었습니다.

### 지원 플랫폼

| 플랫폼 | 방식 | CORS 우회 | 분석 엔진 |
|--------|------|----------|----------|
| 🖥️ **Desktop (Tauri)** | ✅ **Main** | Rust Backend (High-speed) | 투명 오버레이, 클릭 관통, 시스템 타이틀바 제거 |
| 📱 **Mobile (Android)** | ✅ Secondary | CapacitorHttp | 백그라운드 분석, 이동 중 확인 용도 |
| 🌐 **Web (Vercel)** | ❌ Discontinued | - | `npm run build`는 Tauri UI 생성을 위한 과정일 뿐임 |

---

## 🚀 주요 기능

### 🎯 트리플 시그널 분석
- **조건**: RSI < 30 AND MFI < 30 AND 볼린저 밴드 하단 터치
- 수정주가(Adj Close) 기반 정확한 지표 계산 (배당/분할 반영)

### 📊 기술적 지표
- **RSI (14일)**: < 30 과매도, > 70 과매수
- **MFI (14일)**: 거래량 고려 지표, < 30 과매도
- **Bollinger Bands**: 20일 이동평균 ± 1 표준편차

### 📈 시장 심리 지표 (실시간)
- **Fear & Greed Index**: CNN 실시간 점수 연동
- **VIX 변동성 지수**: Yahoo Finance ^VIX 기반 실시간 추적
- **Put/Call Ratio**: 시장 공포/탐욕 심리 분석

### 3. 사용자 경험 (UX) 철학 ⭐
- **Simplicity**: 복잡한 차트/그래프를 제거하고 오직 **"매수 신호"**만 심플하게 전달
- **Direct Link**: 결과 클릭 시 **[토스증권](https://tossinvest.com)** 페이지로 즉시 이동
- **No Distraction**: 윈도우 알림 센터(OS 푸시)를 사용하지 않음. 오버레이에서 조용히 확인.

### 4. 투명 오버레이 & 클릭 관통 (New)
- **Overlay Mode**: 창에서 포커스가 벗어나면 배경이 투명해지고 마우스 클릭이 뒤쪽 창으로 전달됨 (게임/영상 시청 중 방해 금지)
- **Active Mode**: 앱을 클릭하거나 Alt+Tab으로 포커스 시 배경이 불투명해지고 조작 가능

### 5. 프리셋 & GitHub 동기화
- **GitHub Sync**: `presets.json` 파일을 통한 중앙 집중식 관리
- **자동 푸시**: 앱에서 프리셋 수정 시 자동으로 `git commit & push` 수행

---

## 📂 프로젝트 구조

```
stock-vercel/
├── src/app/                # Next.js App Router (UI Layer)
├── src/components/         # UI 컴포넌트
├── src/hooks/              # 네이티브 분석 로직 (Logic Layer)
├── src/lib/api-client/     # 플랫폼별 API 클라이언트 (Tauri/Android)
├── src-tauri/              # Tauri Rust 백엔드 (High-speed Analysis)
├── android/                # Capacitor Android 프로젝트
└── presets.json            # 프리셋 데이터 (GitHub Sync 기준)
```

---

## 📦 설치 및 실행

### 🖥️ Tauri 데스크톱 앱 (Windows/macOS/Linux)
```bash
npm install
npx tauri dev
```

### 📱 Android APK 빌드
```bash
# 정적 빌드 및 동기화
npm run cap:sync

# Android Studio에서 APK 빌드 또는 직접 실행
npx cap open android
```

---

## 🔍 트러블슈팅

### 429 Too Many Requests (Yahoo Finance)
네이티브 앱은 서버를 거치지 않고 직접 통신하므로 CORS는 없지만, 과도한 요청 시 Yahoo Finance에서 일시적으로 차단할 수 있습니다.
- 분석 주기를 조절하거나 티커 수를 분할하여 분석하세요.
- User-Agent 로테이션 기능이 내장되어 있습니다.

### Git Push 실패 (Tauri 프리셋 저장 시)
- PC에 Git이 설치되어 있어야 합니다.
- 해당 레포지토리에 커밋/푸시 권한이 설정되어 있어야 합니다.

---

## 📄 라이선스
MIT License

**⚠️ 면책 조항**: 이 도구는 교육 및 정보 제공 목적으로만 사용됩니다. 투자 결정은 본인의 책임하에 이루어져야 하며, 이 도구의 분석 결과에만 의존하여 투자 결정을 내리지 마십시오.
