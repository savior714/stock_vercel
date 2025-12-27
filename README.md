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
- **💾 티커 관리**: 360개 프리셋 티커 + 커스텀 티커 추가
- **🔄 실시간 업데이트**: 5분마다 자동 갱신

## 🚀 빠른 시작

### 설치

```bash
# 저장소 클론
git clone https://github.com/savior714/stock_vercel.git
cd stock_vercel

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 배포

```bash
# Vercel에 배포
vercel --prod
```

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
- 20일 이동평균 ± 2 표준편차
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

- **Frontend**: Next.js 16.1.1, React, TypeScript
- **Styling**: CSS Modules
- **API**: Next.js API Routes
- **Data Sources**:
  - Yahoo Finance API (주가 데이터, VIX)
  - CNN Fear & Greed Index API
  - CBOE Put/Call Ratio (via Yahoo Finance)
- **Deployment**: Vercel

## 📁 프로젝트 구조

```
stock-vercel/
├── app/
│   ├── api/
│   │   ├── analyze/          # 주가 분석 API
│   │   ├── market-indicators/ # 시장 지표 API
│   │   └── tickers/          # 티커 관리 API
│   ├── page.tsx              # 메인 페이지
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 글로벌 스타일
├── public/
│   └── preset_tickers.json   # 프리셋 티커 목록 (360개)
└── README.md
```

## 🔧 API 엔드포인트

### POST /api/analyze
주식 분석 실행

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

## 🎨 주요 특징

### 티커 포맷 자동 변환
- `BRK.B` → `BRK-B` 자동 변환
- Yahoo Finance API 호환성 향상

### 프리셋 티커
- 360개의 인기 주식 프리셋 제공
- S&P 500, 나스닥, 섹터별 대표주 포함

### 실시간 업데이트
- 시장 지표 5분마다 자동 갱신
- 로컬스토리지에 티커 목록 자동 저장

## 📝 사용 방법

1. **티커 추가**: 상단 입력창에 티커 심볼 입력 (예: AAPL)
2. **프리셋 불러오기**: 360개 프리셋 티커 한번에 추가
3. **분석 실행**: "🚀 분석 실행" 버튼 클릭
4. **결과 확인**: 
   - 트리플 시그널 탭: RSI, MFI, BB 모두 만족하는 종목
   - 볼린저 밴드 탭: BB 하단 터치 종목

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
