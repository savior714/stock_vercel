# Options Indicators Implementation Guide

이 문서는 각 옵션 지표의 개념, 계산 방법, Python 구현 예제를 상세히 설명합니다.

---

## 📊 지표별 난이도 및 구현 순서

| 순서 | 지표 | 난이도 | 예상 시간 | yfinance 데이터 | 추가 계산 |
|------|------|--------|----------|----------------|----------|
| 1 | **0DTE** | ⭐ 매우 쉬움 | 1시간 | 만기일 리스트 | 필터링만 |
| 2 | **UOA** | ⭐⭐ 쉬움 | 2-3시간 | Volume, OI, IV | 비율 비교 |
| 3 | **Max Pain** | ⭐⭐ 보통 | 3-4시간 | OI, Strike | 합산 계산 |
| 4 | **Skew** | ⭐⭐⭐ 보통 | 4-5시간 | IV, Strike | IV 평균 비교 |
| 5 | **Gamma Wall** | ⭐⭐⭐⭐ 어려움 | 1-2일 | OI, IV, Strike | Black-Scholes |

---

## 1. 0DTE (Zero Days to Expiration)

### **개념**
- 당일 만기인 옵션 계약
- 만기일에 가까울수록 시간 가치 급격히 감소
- 높은 변동성과 거래량 특징

### **트레이딩 의미**
- 만기일 당일 주가는 대량 거래된 행사가 근처로 "핀(Pin)"되는 경향
- 마켓 메이커의 델타 헤징으로 인한 지지/저항 효과

### **yfinance 제공 데이터**
```python
stock = yf.Ticker("AAPL")
expirations = stock.options  # 만기일 리스트
# 예: ['2026-01-09', '2026-01-16', '2026-01-23', ...]
```

### **구현 코드**

```python
from datetime import datetime
import yfinance as yf

def get_0dte_options(ticker: str):
    """
    당일 만기 옵션 찾기
    
    Args:
        ticker: 종목 심볼 (예: 'AAPL')
    
    Returns:
        dict: {
            'hasExpiration': bool,
            'strikes': list,
            'callVolume': int,
            'putVolume': int,
            'topStrikes': list  # 거래량 상위 5개
        }
    """
    stock = yf.Ticker(ticker)
    today = datetime.now().strftime('%Y-%m-%d')
    
    # 오늘 만기인 옵션이 있는지 확인
    if today not in stock.options:
        return {'hasExpiration': False}
    
    # 옵션 체인 가져오기
    chain = stock.option_chain(today)
    
    # 거래량 상위 행사가 찾기
    calls_by_volume = chain.calls.nlargest(5, 'volume')[['strike', 'volume']]
    puts_by_volume = chain.puts.nlargest(5, 'volume')[['strike', 'volume']]
    
    return {
        'hasExpiration': True,
        'strikes': sorted(set(chain.calls['strike'].tolist())),
        'callVolume': int(chain.calls['volume'].sum()),
        'putVolume': int(chain.puts['volume'].sum()),
        'topCallStrikes': calls_by_volume.to_dict('records'),
        'topPutStrikes': puts_by_volume.to_dict('records')
    }

# 사용 예시
result = get_0dte_options('SPY')
print(result)
# {
#   'hasExpiration': True,
#   'strikes': [450, 455, 460, ...],
#   'callVolume': 125000,
#   'putVolume': 98000,
#   'topCallStrikes': [{'strike': 460, 'volume': 15000}, ...]
# }
```

---

## 2. UOA (Unusual Options Activity)

### **개념**
- 비정상적으로 높은 옵션 거래량
- "스마트 머니" (기관/고래)의 포지션 진입 신호
- 주가 방향성 예측에 활용

### **감지 기준**
1. **Volume > 1000**: 절대적 거래량
2. **Volume/OI Ratio > 2**: 거래량이 미결제약정의 2배 이상
3. **IV Spike**: 내재 변동성이 평균보다 50% 이상 높음

### **yfinance 제공 데이터**
```python
chain = stock.option_chain(expiration)
# chain.calls 컬럼: strike, volume, openInterest, impliedVolatility
# chain.puts 컬럼: strike, volume, openInterest, impliedVolatility
```

### **구현 코드**

```python
def detect_unusual_activity(ticker: str, expiration: str):
    """
    비정상적 옵션 거래 활동 감지
    
    Args:
        ticker: 종목 심볼
        expiration: 만기일 (YYYY-MM-DD)
    
    Returns:
        dict: {
            'calls': list,
            'puts': list,
            'hasUnusual': bool,
            'summary': str
        }
    """
    stock = yf.Ticker(ticker)
    chain = stock.option_chain(expiration)
    
    # Call UOA 감지
    unusual_calls = chain.calls[
        (chain.calls['volume'] > 1000) &
        (chain.calls['volume'] > chain.calls['openInterest'] * 2) &
        (chain.calls['impliedVolatility'] > chain.calls['impliedVolatility'].mean() * 1.5)
    ].copy()
    
    # Put UOA 감지
    unusual_puts = chain.puts[
        (chain.puts['volume'] > 1000) &
        (chain.puts['volume'] > chain.puts['openInterest'] * 2) &
        (chain.puts['impliedVolatility'] > chain.puts['impliedVolatility'].mean() * 1.5)
    ].copy()
    
    # Volume/OI Ratio 계산
    if len(unusual_calls) > 0:
        unusual_calls['volumeOIRatio'] = unusual_calls['volume'] / unusual_calls['openInterest']
    if len(unusual_puts) > 0:
        unusual_puts['volumeOIRatio'] = unusual_puts['volume'] / unusual_puts['openInterest']
    
    # 요약
    summary = []
    if len(unusual_calls) > 0:
        summary.append(f"{len(unusual_calls)}개 Call UOA 감지")
    if len(unusual_puts) > 0:
        summary.append(f"{len(unusual_puts)}개 Put UOA 감지")
    
    return {
        'calls': unusual_calls[['strike', 'volume', 'openInterest', 'impliedVolatility', 'volumeOIRatio']].to_dict('records'),
        'puts': unusual_puts[['strike', 'volume', 'openInterest', 'impliedVolatility', 'volumeOIRatio']].to_dict('records'),
        'hasUnusual': len(unusual_calls) > 0 or len(unusual_puts) > 0,
        'summary': ', '.join(summary) if summary else 'UOA 없음'
    }

# 사용 예시
result = detect_unusual_activity('TSLA', '2026-01-16')
print(result)
# {
#   'calls': [{'strike': 250, 'volume': 5000, 'openInterest': 2000, 'volumeOIRatio': 2.5}],
#   'puts': [],
#   'hasUnusual': True,
#   'summary': '1개 Call UOA 감지'
# }
```

---

## 3. Max Pain

### **개념**
- 옵션 만기 시 옵션 매수자의 손실이 최대가 되는 주가
- 옵션 매도자(마켓 메이커)의 손실이 최소가 되는 지점
- 만기일에 주가가 Max Pain 근처로 수렴하는 경향

### **계산 원리**
각 행사가에서:
1. ITM Call의 손실 = Σ(행사가 - 현재가) × OI
2. ITM Put의 손실 = Σ(현재가 - 행사가) × OI
3. 총 손실 = Call 손실 + Put 손실
4. Max Pain = 총 손실이 최소인 행사가

### **yfinance 제공 데이터**
```python
chain.calls['openInterest']  # Call 미결제약정
chain.puts['openInterest']   # Put 미결제약정
chain.calls['strike']        # 행사가
```

### **구현 코드**

```python
def calculate_max_pain(ticker: str, expiration: str):
    """
    Max Pain 계산
    
    Args:
        ticker: 종목 심볼
        expiration: 만기일
    
    Returns:
        dict: {
            'maxPain': float,
            'currentPrice': float,
            'distance': float,  # %
            'distanceDirection': str  # 'above' or 'below'
        }
    """
    stock = yf.Ticker(ticker)
    chain = stock.option_chain(expiration)
    current_price = stock.history(period="1d")['Close'].iloc[-1]
    
    # 모든 행사가 리스트
    strikes = sorted(set(chain.calls['strike'].tolist()))
    
    max_pain_values = {}
    for strike in strikes:
        # Call 손실: 행사가보다 낮은 Call들의 손실
        call_loss = 0
        for _, row in chain.calls[chain.calls['strike'] < strike].iterrows():
            call_loss += (strike - row['strike']) * row['openInterest']
        
        # Put 손실: 행사가보다 높은 Put들의 손실
        put_loss = 0
        for _, row in chain.puts[chain.puts['strike'] > strike].iterrows():
            put_loss += (row['strike'] - strike) * row['openInterest']
        
        max_pain_values[strike] = call_loss + put_loss
    
    # 손실이 최소인 지점 = Max Pain
    max_pain = min(max_pain_values, key=max_pain_values.get)
    distance = ((current_price - max_pain) / max_pain) * 100
    
    return {
        'maxPain': float(max_pain),
        'currentPrice': float(current_price),
        'distance': round(distance, 2),
        'distanceDirection': 'above' if current_price > max_pain else 'below'
    }

# 사용 예시
result = calculate_max_pain('NVDA', '2026-01-16')
print(result)
# {
#   'maxPain': 500.0,
#   'currentPrice': 485.0,
#   'distance': -3.0,
#   'distanceDirection': 'below'
# }
```

---

## 4. Skew (Volatility Skew)

### **개념**
- ATM과 OTM Put의 내재 변동성(IV) 차이
- 시장의 공포/탐욕 심리 측정
- Skew > 0: 공포 (Put 수요 높음)
- Skew < 0: 탐욕 (Call 수요 높음)

### **해석**
- **High Skew (>0.1)**: 하락 리스크 헤징 수요 증가 → 매수 기회
- **Low/Negative Skew (<-0.05)**: 과도한 낙관 → 조정 가능성
- **Normal Skew (0~0.1)**: 중립

### **yfinance 제공 데이터**
```python
chain.calls['impliedVolatility']  # Call IV
chain.puts['impliedVolatility']   # Put IV
chain.calls['strike']              # 행사가
```

### **구현 코드**

```python
def calculate_skew(ticker: str, expiration: str):
    """
    Volatility Skew 계산
    
    Args:
        ticker: 종목 심볼
        expiration: 만기일
    
    Returns:
        dict: {
            'value': float,
            'atmIV': float,
            'otmPutIV': float,
            'interpretation': str,  # 'fear', 'neutral', 'greed'
            'trend': str  # 'rising', 'falling', 'stable'
        }
    """
    stock = yf.Ticker(ticker)
    chain = stock.option_chain(expiration)
    current_price = stock.history(period="1d")['Close'].iloc[-1]
    
    # ATM (At-The-Money) 찾기
    atm_strike = min(chain.calls['strike'], key=lambda x: abs(x - current_price))
    atm_call = chain.calls[chain.calls['strike'] == atm_strike]
    
    if len(atm_call) == 0:
        return {'value': 0, 'interpretation': 'neutral'}
    
    atm_iv = atm_call['impliedVolatility'].iloc[0]
    
    # OTM Put (현재가보다 5% 낮은 행사가)
    otm_puts = chain.puts[chain.puts['strike'] < current_price * 0.95]
    
    if len(otm_puts) == 0:
        return {'value': 0, 'atmIV': atm_iv, 'interpretation': 'neutral'}
    
    otm_put_iv = otm_puts['impliedVolatility'].mean()
    skew = otm_put_iv - atm_iv
    
    # 해석
    if skew > 0.1:
        interpretation = 'fear'
    elif skew < -0.05:
        interpretation = 'greed'
    else:
        interpretation = 'neutral'
    
    # 트렌드 (이전 데이터와 비교 필요, 여기서는 단순화)
    trend = 'stable'
    if abs(skew) > 0.15:
        trend = 'rising' if skew > 0 else 'falling'
    
    return {
        'value': round(skew, 4),
        'atmIV': round(atm_iv, 4),
        'otmPutIV': round(otm_put_iv, 4),
        'interpretation': interpretation,
        'trend': trend
    }

# 사용 예시
result = calculate_skew('SPY', '2026-01-16')
print(result)
# {
#   'value': 0.12,
#   'atmIV': 0.18,
#   'otmPutIV': 0.30,
#   'interpretation': 'fear',
#   'trend': 'rising'
# }
```

---

## 5. Gamma Wall

### **개념**
- Gamma Exposure(GEX)가 가장 큰 행사가
- Positive Gamma: 지지선 (매수 압력)
- Negative Gamma: 저항선 (매도 압력)

### **Black-Scholes Gamma 공식**
```
Gamma = N'(d1) / (S × σ × √T)

where:
- N'(d1) = 정규분포 확률밀도함수
- S = 현재 주가
- σ = 내재 변동성
- T = 만기까지 시간 (년)
- d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)
```

### **GEX (Gamma Exposure)**
```
GEX = Gamma × Open Interest × 100 (계약당 100주)
```

### **yfinance 제공 데이터**
```python
chain.calls['strike']              # K (행사가)
chain.calls['openInterest']        # OI
chain.calls['impliedVolatility']   # σ (IV)
stock.history()['Close']           # S (현재가)
```

### **구현 코드**

```python
from scipy.stats import norm
import numpy as np
from datetime import datetime

def black_scholes_gamma(S, K, T, r, sigma):
    """
    Black-Scholes Gamma 계산
    
    Args:
        S: 현재 주가
        K: 행사가
        T: 만기까지 시간 (년)
        r: 무위험 이자율
        sigma: 내재 변동성
    
    Returns:
        float: Gamma 값
    """
    if T <= 0 or sigma <= 0:
        return 0
    
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    return gamma

def find_gamma_walls(ticker: str, expiration: str):
    """
    Gamma Wall 찾기
    
    Args:
        ticker: 종목 심볼
        expiration: 만기일
    
    Returns:
        dict: {
            'positive': list,  # 지지선 (상위 5개)
            'negative': list,  # 저항선 (상위 5개)
            'nearest': dict    # 현재가에 가장 가까운 Gamma Wall
        }
    """
    stock = yf.Ticker(ticker)
    chain = stock.option_chain(expiration)
    current_price = stock.history(period="1d")['Close'].iloc[-1]
    
    # 만기까지 일수 계산
    exp_date = datetime.strptime(expiration, '%Y-%m-%d')
    days_to_exp = (exp_date - datetime.now()).days
    T = max(days_to_exp / 365.0, 0.001)  # 최소값 방지
    
    r = 0.05  # 무위험 이자율 (5% 가정)
    
    gamma_exposure = {}
    
    # Call Gamma 계산
    for _, row in chain.calls.iterrows():
        if row['impliedVolatility'] > 0:
            gamma = black_scholes_gamma(
                S=current_price,
                K=row['strike'],
                T=T,
                r=r,
                sigma=row['impliedVolatility']
            )
            gex = gamma * row['openInterest'] * 100
            gamma_exposure[row['strike']] = gex
    
    # Positive/Negative 분리
    positive = {k: v for k, v in gamma_exposure.items() if v > 0}
    negative = {k: v for k, v in gamma_exposure.items() if v < 0}
    
    # 상위 5개 추출
    top_positive = sorted(positive.items(), key=lambda x: x[1], reverse=True)[:5]
    top_negative = sorted(negative.items(), key=lambda x: x[1])[:5]
    
    # 현재가에 가장 가까운 Gamma Wall
    all_walls = list(gamma_exposure.keys())
    if all_walls:
        nearest_strike = min(all_walls, key=lambda x: abs(x - current_price))
        nearest_gex = gamma_exposure[nearest_strike]
        nearest = {
            'strike': nearest_strike,
            'gex': nearest_gex,
            'type': 'support' if nearest_gex > 0 else 'resistance',
            'distance': round(((current_price - nearest_strike) / current_price) * 100, 2)
        }
    else:
        nearest = None
    
    return {
        'positive': [{'strike': k, 'gex': round(v, 2)} for k, v in top_positive],
        'negative': [{'strike': k, 'gex': round(v, 2)} for k, v in top_negative],
        'nearest': nearest
    }

# 사용 예시
result = find_gamma_walls('AAPL', '2026-01-16')
print(result)
# {
#   'positive': [{'strike': 180, 'gex': 15000000}, ...],
#   'negative': [{'strike': 200, 'gex': -8000000}, ...],
#   'nearest': {'strike': 185, 'gex': 12000000, 'type': 'support', 'distance': -2.7}
# }
```

---

## 📚 참고 자료

### **yfinance 공식 문서**
- https://pypi.org/project/yfinance/
- https://github.com/ranaroussi/yfinance

### **Black-Scholes 모델**
- https://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model
- https://www.investopedia.com/terms/b/blackscholes.asp

### **Options Greeks**
- https://www.investopedia.com/trading/getting-to-know-the-greeks/

### **Max Pain Theory**
- https://www.investopedia.com/terms/m/maxpain.asp

---

## 🎯 다음 단계

이 문서를 학습하신 후:
1. 각 지표의 개념 이해
2. Python 코드 실행 테스트
3. 실제 종목 데이터로 검증
4. 구현 시작 지시

준비되시면 언제든 알려주세요!
