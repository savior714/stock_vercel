# 📊 주식 데이터 API 대안 가이드

## 현재 상황

**Yahoo Finance**는 무료이지만 429 (Too Many Requests) 에러가 발생할 수 있습니다.

**Finnhub** 무료 플랜은 `stock/candle` 엔드포인트 접근이 제한되어 현재 비활성화되어 있습니다.

## 대안 API 옵션

### 1. **IEX Cloud** ⭐ 추천

**장점:**
- 무료 플랜: 월 50,000회 요청 (충분한 사용량)
- 안정적인 API (공식 API)
- 과거 주가 데이터 (일봉, 주봉 등) 제공
- RSI, MFI, 볼린저 밴드 계산에 필요한 OHLCV 데이터 제공
- 실시간 데이터도 제공

**단점:**
- 무료 플랜은 15분 지연 데이터만 제공 (과거 데이터는 실시간)
- API 키 필요

**가격:**
- 무료: 월 50,000회
- 유료: $9/월부터 (실시간 데이터)

**API 엔드포인트:**
```
GET https://cloud.iexapis.com/stable/stock/{symbol}/chart/{range}
```

**문서:** https://iexcloud.io/docs/api/

---

### 2. **Alpha Vantage**

**장점:**
- 완전 무료
- 과거 주가 데이터 제공
- 기술 지표 API도 제공 (RSI, MFI, 볼린저 밴드 등)

**단점:**
- 무료 플랜: 분당 5회 요청만 가능 (매우 제한적)
- 일일 500회 요청 제한
- 대량 분석에는 부적합

**가격:**
- 무료: 분당 5회, 일일 500회
- 유료: $49.99/월부터

**API 엔드포인트:**
```
GET https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={key}
```

**문서:** https://www.alphavantage.co/documentation/

---

### 3. **Polygon.io**

**장점:**
- 무료 플랜: 분당 5회 요청
- 과거 주가 데이터 제공
- 실시간 데이터도 제공

**단점:**
- 무료 플랜은 매우 제한적
- 대량 분석에는 부적합

**가격:**
- 무료: 분당 5회
- 유료: $29/월부터

**API 엔드포인트:**
```
GET https://api.polygon.io/v2/aggs/ticker/{symbol}/range/1/day/{start}/{end}
```

**문서:** https://polygon.io/docs/

---

### 4. **Yahoo Finance만 사용** (현재 상태)

**장점:**
- 완전 무료
- API 키 불필요
- 과거 데이터 제공
- 수정주가(adjusted close) 제공

**단점:**
- 429 에러 발생 가능
- 비공식 API (변경 가능성)
- Rate limiting 대응 필요

**현재 구현:**
- User-Agent 로테이션
- 요청 간 지연 시간
- Exponential Backoff

---

## 추천 방안

### 옵션 A: IEX Cloud 사용 (추천)

**이유:**
- 무료 플랜으로도 충분한 사용량 (월 50,000회)
- 안정적이고 공식 API
- 과거 데이터 제공

**구현 필요 사항:**
1. IEX Cloud 회원가입 및 API 키 발급
2. `getStockDataFromIEX` 함수 구현
3. Yahoo Finance 실패 시 IEX Cloud로 fallback

---

### 옵션 B: Yahoo Finance만 사용 (현재)

**이유:**
- 추가 비용 없음
- 이미 잘 작동함
- 429 에러는 요청 간 지연으로 완화 가능

**개선 사항:**
- 요청 간 지연 시간 증가
- 더 많은 User-Agent 로테이션
- 재시도 로직 강화

---

## 결론

**현재는 Yahoo Finance만 사용하는 것을 권장합니다.**

429 에러가 자주 발생한다면:
1. 요청 간 지연 시간을 늘림 (예: 2-3초)
2. IEX Cloud를 fallback으로 추가 (무료 플랜으로도 충분)

**IEX Cloud 구현을 원하시면 알려주세요!**

