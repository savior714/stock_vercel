# 📈 Stock Analysis Dashboard

실시간 주가 분석 및 기술적 지표 기반 알람 시스템

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/savior714/stock_vercel)

## 🎯 프로젝트 소개

Stock Analysis Dashboard는 기술적 분석 지표를 활용하여 과매도 구간의 주식을 자동으로 찾아주는 웹 애플리케이션입니다. RSI, MFI, 볼린저 밴드 등의 지표를 조합하여 매수 타이밍을 포착할 수 있도록 도와줍니다.

### 주요 기능

- **🎯 트리플 시그널 분석**: RSI < 35 AND MFI < 35 AND 볼린저 밴드 하단 터치
- **📊 볼린저 밴드 분석**: 볼린저 밴드 하단 터치 종목 탐지
- **📈 시장 지표 모니터링**: 
  - CNN Fear & Greed Index (실시간)
  - VIX 변동성 지수 (50일 평균 포함)
  - Put/Call Ratio (CBOE)
- **💾 티커 관리**: 프리셋 티커 + 커스텀 티커 추가
- **☁️ 프리셋 동기화**: Vercel KV로 기기 간 프리셋 공유
- **🔄 실시간 업데이트**: 5분마다 자동 갱신

## 🚀 빠른 시작

### 설치

```bash
# 저장소 클론
git clone https://github.com/savior714/stock_vercel.git
cd stock_vercel

# 의존성 설치
npm install

# 환경 변수 설정 (선택사항 - 프리셋용)
# .env.local 파일 생성 후 Vercel KV 변수 설정
# KV_REST_API_URL=your_url
# KV_REST_API_TOKEN=your_token

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 배포

```bash
# Vercel에 배포
vercel --prod
```

### 429 에러 대응

Yahoo Finance API는 무료이지만 429 (Too Many Requests) 에러가 발생할 수 있습니다.

**현재 구현된 대응 방법:**
- 요청 간 5초 지연
- User-Agent 로테이션 (10개)
- 메모리 캐시 (5분 TTL)

**429 에러 발생 시:**
- 잠시 후 다시 시도해주세요
- 한 번에 분석하는 종목 수를 줄여주세요

## 📊 기술적 지표 설명

### RSI (Relative Strength Index)
- **범위**: 0-100
- **과매도**: RSI < 35
- **과매수**: RSI > 70
- 14일 기간 사용

### MFI (Money Flow Index)
- **범위**: 0-100
- **과매도**: MFI < 35
- **과매수**: MFI > 80
- 거래량을 고려한 RSI

### 볼린저 밴드 (Bollinger Bands)
- 20일 이동평균 ± 1 표준편차
- 하단 밴드 터치: 과매도 신호
- 상단 밴드 터치: 과매수 신호

### Fear & Greed Index
- **0-25**: Extreme Fear (극도의 공포)
- **25-45**: Fear (공포)
- **45-55**: Neutral (중립)
- **55-75**: Greed (탐욕)
- **75-100**: Extreme Greed (극도의 탐욕)

### VIX (Volatility Index)
- **< 15**: 낮은 변동성
- **15-20**: 보통 변동성
- **20-30**: 높은 변동성
- **> 30**: 극도의 변동성

### Put/Call Ratio
- **> 1.0**: Extreme Fear (극도의 공포)
- **0.8-1.0**: Fear (공포)
- **< 0.8**: Neutral (중립)

## 🛠️ 기술 스택

- **Frontend**: Next.js 16.1.1, React 19.2.3, TypeScript
- **Styling**: Global CSS (globals.css)
- **API**: Next.js API Routes
- **Storage**: 
  - Vercel KV (Upstash Redis) - 프리셋 동기화
  - localStorage - 클라이언트 티커 목록 캐시
- **Data Sources**:
  - Yahoo Finance API (주가 데이터, VIX, Put/Call Ratio)
  - CNN Fear & Greed Index API
- **Deployment**: Vercel

## 📁 프로젝트 구조

```
stock-vercel/
├── app/
│   ├── api/
│   │   ├── analyze/          # 주가 분석 API
│   │   ├── market-indicators/ # 시장 지표 API
│   │   ├── presets/          # 프리셋 관리 API (Vercel KV)
│   │   ├── tickers/          # 티커 관리 API (메모리 저장)
│   │   └── debug/            # 데이터 검증 API
│   ├── page.tsx              # 메인 페이지 (Client Component)
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 글로벌 스타일
├── docs/
│   ├── AGENTS.md             # 프로젝트 지침서
│   └── README.md             # 사용자 문서
├── public/
│   └── preset_tickers.json   # 기본 프리셋 (백업)
└── package.json
```

## 🔧 API 엔드포인트

### POST /api/analyze
주식 분석 실행 (수정주가 기반)

**Request:**
```json
{
  "tickers": ["AAPL", "TSLA", "BRK.B"]
}
```

**Response:**
```json
{
  "results": [
    {
      "ticker": "AAPL",
      "price": 195.50,
      "rsi": 32.5,
      "mfi": 28.3,
      "bb_touch": true,
      "alert": true
    }
  ]
}
```

**특징:**
- 수정주가(Adj Close) 기반 지표 계산
- API 차단 방지: User-Agent 로테이션, 순차 처리
- 429 에러 시 명확한 안내 메시지

### GET /api/market-indicators
시장 지표 조회

**Response:**
```json
{
  "fearAndGreed": {
    "score": 56,
    "rating": "Greed",
    "previousClose": 54
  },
  "vix": {
    "current": 13.6,
    "fiftyDayAvg": 15.2,
    "rating": "Low"
  },
  "putCallRatio": {
    "current": 0.70,
    "rating": "Neutral"
  }
}
```

### GET /api/debug
데이터 검증 (Yahoo Finance 원본 데이터 조회)

**Query Parameters:**
- `ticker`: 티커 심볼 (필수)
- `days`: 조회할 일수 (기본값: 30)

**Response:**
```json
{
  "ticker": "AAPL",
  "data": [
    {
      "date": "2024-01-15",
      "open": 185.50,
      "high": 186.20,
      "low": 184.80,
      "close": 185.90,
      "adjClose": 185.90,
      "volume": 50000000,
      "rsi": 45.2,
      "mfi": 48.5,
      "bbLower": 182.30,
      "bbMiddle": 185.00,
      "bbUpper": 187.70
    }
  ],
  "summary": {
    "latestDate": "2024-01-15",
    "latestClose": 185.90,
    "latestAdjClose": 185.90,
    "closeVsAdjCloseDiff": false,
    "latestRSI": 45.2,
    "latestMFI": 48.5,
    "latestBBLower": 182.30,
    "latestBBUpper": 187.70
  }
}
```

**용도:**
- Yahoo Finance 원본 데이터 확인
- 계산된 지표(RSI, MFI, BB) 검증
- 토스증권 등 다른 플랫폼과 비교

## 🎨 주요 특징

### 티커 포맷 자동 변환
- `BRK.B` → `BRK-B` 자동 변환
- Yahoo Finance API 호환성 향상

### 프리셋 티커
- 360개의 인기 주식 프리셋 제공
- S&P 500, 나스닥, 섹터별 대표주 포함

### 프리셋 동기화
- Vercel KV (Upstash Redis)로 프리셋 서버 저장
- "💾 프리셋 저장": 현재 티커 목록을 서버에 저장
- "📥 프리셋 불러오기": 서버 프리셋으로 교체
- PC, 모바일 등 어디서나 동일한 프리셋 사용 가능

### 🛠️ 데이터 정합성 & 신뢰성 강화
- **수정주가(Adj Close) 반영**: 배당/분할이 반영된 가격으로 지표를 계산하여 분석 정확도 향상
- **API 차단 방지**: 
  - 클라이언트 측 순차 처리 및 지연 로직 (티커당 0.5초)
  - 서버 측 순차 처리 및 지연 로직 (요청당 1초)
  - User-Agent 로테이션 (3가지 브라우저 User-Agent)
  - 429 Too Many Requests 발생 시 명확한 안내 메시지 제공
- **데이터 검증 도구**: '🔍 데이터 검증' 탭에서 Yahoo Finance 원본 데이터와 계산된 지표를 테이블로 확인 가능
  - 일봉 데이터 (시/고/저/종가, 수정종가, 거래량)
  - 계산된 지표 (RSI, MFI, 볼린저 밴드)
  - 토스증권 등 다른 플랫폼과 비교 가능

### ⚡ 성능 최적화
- **메모리 캐시**: 5분 TTL로 동일 티커 재요청 시 빠른 응답
- **CSS 최적화**: Global CSS 사용으로 렌더링 성능 및 유지보수성 개선
- **진행률 표시**: 대량 티커 분석 시 실시간 진행 상황 표시 (프로그레스 바)
- **티커 목록 최적화**: 10개 이상 티커 시 "더보기" 기능으로 UI 최적화
- **Finnhub Fallback**: Yahoo Finance 429 에러 시 자동 전환

## 📝 사용 방법

1. **티커 추가**: 상단 입력창에 티커 심볼 입력 (예: AAPL) 후 Enter 또는 "추가" 버튼 클릭
2. **프리셋 불러오기**: "📥 프리셋 불러오기" 클릭 → 서버 프리셋으로 교체
3. **프리셋 저장**: 티커 편집 후 "💾 프리셋 저장" 클릭 → 모든 기기에서 동기화
4. **분석 실행**: "🚀 분석 실행" 버튼 클릭 (진행률 표시)
5. **결과 확인**: 
   - 🎯 트리플 시그널 탭: RSI < 35 AND MFI < 35 AND BB 하단 터치 종목
   - 📊 볼린저 밴드 탭: BB 하단 터치 종목
   - 🔍 데이터 검증 탭: Yahoo Finance 원본 데이터와 계산된 지표 확인

## 🔍 트러블슈팅

### API 에러
- Yahoo Finance API는 가끔 rate limit이 발생할 수 있습니다
- 티커가 많을 경우 분석 시간이 길어질 수 있습니다

### 데이터 없음
- 일부 티커는 충분한 과거 데이터가 없을 수 있습니다
- 최소 20일 이상의 데이터가 필요합니다

## 📄 라이선스

MIT License

## 🤝 기여

Pull Request는 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 문의

프로젝트 관련 문의사항은 Issues를 통해 남겨주세요.

---

**⚠️ 면책 조항**: 이 도구는 교육 및 정보 제공 목적으로만 사용됩니다. 투자 결정은 본인의 책임하에 이루어져야 하며, 이 도구의 분석 결과에만 의존하여 투자 결정을 내리지 마십시오.
