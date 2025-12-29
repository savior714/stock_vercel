# 📊 주식 데이터 API 대안 가이드

## 현재 구현 상태

**Yahoo Finance (기본)** + **Finnhub (Fallback)**

### Yahoo Finance 최적화
- 요청 간 **2초 지연**
- **User-Agent 로테이션** (10개)
- **메모리 캐시** (5분 TTL)

### Finnhub Fallback
- Yahoo 429 에러 시 자동 전환
- **OHLCV 데이터**만 수집 → 지표는 서버에서 직접 계산
- 무료: **60회/분**, 10년 일봉 데이터

---

## Finnhub 설정 방법

1. [finnhub.io](https://finnhub.io/) 가입
2. Dashboard에서 API Key 복사
3. 환경 변수 설정:

```bash
# .env.local 또는 Vercel 환경 변수
FINNHUB_API_KEY=your_api_key_here
```

---

## API 비교

| API | 무료 한도 | 특징 |
|-----|----------|------|
| **Yahoo Finance** | 무제한 (비공식) | 429 에러 가능 |
| **Finnhub** | 60/분 | 안정적, 15분 지연 |
| Alpha Vantage | 25/일 | 한도 너무 적음 |
| Twelve Data | 800/일 | 지표별 호출 필요 |
| IEX Cloud | ❌ | 2024년 8월 서비스 종료 |

---

## 지표 계산 방식

현재 구현은 **OHLCV 데이터를 받아 서버에서 직접 계산**합니다:

- **RSI 14** (Wilder's smoothing)
- **MFI 14** (Money Flow Index)
- **Bollinger Bands 20/1** (20일 이평 ± 1σ)

이 방식의 장점:
- API 호출 1회로 모든 지표 계산 가능
- 커스텀 설정 자유로움
- 외부 API 의존도 낮음
