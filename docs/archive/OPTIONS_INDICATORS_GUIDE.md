# Options Indicators Implementation Guide

This document provides a detailed explanation of individual options indicators, their concepts, calculation methods, and Python implementation examples.

---

## 📊 Indicator Difficulty and Implementation Order

| Order | Indicator | Difficulty | Estimated Time | yfinance Data | Additional Calculation |
|------|------|--------|----------|----------------|----------|
| 1 | **0DTE** | ⭐ Very Easy | 1 hour | Expiration List | Filtering only |
| 2 | **UOA** | ⭐⭐ Easy | 2-3 hours | Volume, OI, IV | Ratio comparison |
| 3 | **Max Pain** | ⭐⭐ Moderate | 3-4 hours | OI, Strike | Summation |
| 4 | **Skew** | ⭐⭐⭐ Moderate | 4-5 hours | IV, Strike | IV Average comparison |
| 5 | **Gamma Wall** | ⭐⭐⭐⭐ Difficult | 1-2 days | OI, IV, Strike | Black-Scholes |

---

## 1. 0DTE (Zero Days to Expiration)

### **Concept**
- Options contracts expiring on the current day.
- Rapid time decay as the expiration date approaches.
- Characterized by high volatility and volume.

### **Trading Significance**
- On expiration day, stock prices tend to "pin" near strikes with high volume.
- Support/Resistance effect due to market maker delta hedging.

### **Data from yfinance**
```python
stock = yf.Ticker("AAPL")
expirations = stock.options  # List of expiration dates
# e.g., ['2026-01-09', '2026-01-16', '2026-01-23', ...]
```

### **Implementation**

```python
from datetime import datetime
import yfinance as yf

def get_0dte_options(ticker: str):
    """
    Find options expiring today.
    
    Args:
        ticker: Symbol (e.g., 'AAPL')
    
    Returns:
        dict: {
            'hasExpiration': bool,
            'strikes': list,
            'callVolume': int,
            'putVolume': int,
            'topStrikes': list  # Top 5 by volume
        }
    """
    stock = yf.Ticker(ticker)
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Check if there is an expiration today
    if today not in stock.options:
        return {'hasExpiration': False}
    
    # Get options chain
    chain = stock.option_chain(today)
    
    # Find top strikes by volume
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

# Usage example
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

### **Concept**
- Abnormally high options trading volume.
- Signal of "Smart Money" (Institutions/Whales) entering positions.
- Leveraged for predicting price direction.

### **Detection Criteria**
1. **Volume > 1000**: Absolute trading volume.
2. **Volume/OI Ratio > 2**: Volume is at least twice the Open Interest.
3. **IV Spike**: Implied Volatility is 50% higher than average.

### **Data from yfinance**
```python
chain = stock.option_chain(expiration)
# chain.calls columns: strike, volume, openInterest, impliedVolatility
# chain.puts columns: strike, volume, openInterest, impliedVolatility
```

### **Implementation**

```python
def detect_unusual_activity(ticker: str, expiration: str):
    """
    Detect unusual options trading activity.
    
    Args:
        ticker: Symbol
        expiration: Expiration date (YYYY-MM-DD)
    
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
    
    # Detect Call UOA
    unusual_calls = chain.calls[
        (chain.calls['volume'] > 1000) &
        (chain.calls['volume'] > chain.calls['openInterest'] * 2) &
        (chain.calls['impliedVolatility'] > chain.calls['impliedVolatility'].mean() * 1.5)
    ].copy()
    
    # Detect Put UOA
    unusual_puts = chain.puts[
        (chain.puts['volume'] > 1000) &
        (chain.puts['volume'] > chain.puts['openInterest'] * 2) &
        (chain.puts['impliedVolatility'] > chain.puts['impliedVolatility'].mean() * 1.5)
    ].copy()
    
    # Calculate Volume/OI Ratio
    if len(unusual_calls) > 0:
        unusual_calls['volumeOIRatio'] = unusual_calls['volume'] / unusual_calls['openInterest']
    if len(unusual_puts) > 0:
        unusual_puts['volumeOIRatio'] = unusual_puts['volume'] / unusual_puts['openInterest']
    
    # Summary
    summary = []
    if len(unusual_calls) > 0:
        summary.append(f"{len(unusual_calls)} Call UOA detected")
    if len(unusual_puts) > 0:
        summary.append(f"{len(unusual_puts)} Put UOA detected")
    
    return {
        'calls': unusual_calls[['strike', 'volume', 'openInterest', 'impliedVolatility', 'volumeOIRatio']].to_dict('records'),
        'puts': unusual_puts[['strike', 'volume', 'openInterest', 'impliedVolatility', 'volumeOIRatio']].to_dict('records'),
        'hasUnusual': len(unusual_calls) > 0 or len(unusual_puts) > 0,
        'summary': ', '.join(summary) if summary else 'No UOA'
    }

# Usage example
result = detect_unusual_activity('TSLA', '2026-01-16')
print(result)
# {
#   'calls': [{'strike': 250, 'volume': 5000, 'openInterest': 2000, 'volumeOIRatio': 2.5}],
#   'puts': [],
#   'hasUnusual': True,
#   'summary': '1 Call UOA detected'
# }
```

---

## 3. Max Pain

### **Concept**
- The stock price at which most options buyers lose money upon expiration.
- The point where options sellers (Market Makers) incur a minimum loss.
- Stock price tends to converge towards Max Pain on expiration day.

### **Calculation Principle**
At each strike:
1. ITM Call Loss = Σ(Strike Price - Current Price) × OI
2. ITM Put Loss = Σ(Current Price - Strike Price) × OI
3. Total Loss = Call Loss + Put Loss
4. Max Pain = Strike Price with minimum Total Loss.

### **Data from yfinance**
```python
chain.calls['openInterest']  # Call Open Interest
chain.puts['openInterest']   # Put Open Interest
chain.calls['strike']        # Strike Price
```

### **Implementation**

```python
def calculate_max_pain(ticker: str, expiration: str):
    """
    Calculate Max Pain.
    
    Args:
        ticker: Symbol
        expiration: Expiration date
    
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
    
    # List of all strikes
    strikes = sorted(set(chain.calls['strike'].tolist()))
    
    max_pain_values = {}
    for strike in strikes:
        # Call Loss: Loss from Calls below the strike price
        call_loss = 0
        for _, row in chain.calls[chain.calls['strike'] < strike].iterrows():
            call_loss += (strike - row['strike']) * row['openInterest']
        
        # Put Loss: Loss from Puts above the strike price
        put_loss = 0
        for _, row in chain.puts[chain.puts['strike'] > strike].iterrows():
            put_loss += (row['strike'] - strike) * row['openInterest']
        
        max_pain_values[strike] = call_loss + put_loss
    
    # Point of minimum loss = Max Pain
    max_pain = min(max_pain_values, key=max_pain_values.get)
    distance = ((current_price - max_pain) / max_pain) * 100
    
    return {
        'maxPain': float(max_pain),
        'currentPrice': float(current_price),
        'distance': round(distance, 2),
        'distanceDirection': 'above' if current_price > max_pain else 'below'
    }

# Usage example
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

### **Concept**
- Implied Volatility (IV) difference between ATM and OTM Puts.
- Measures market fear/greed.
- Skew > 0: Fear (High demand for Puts).
- Skew < 0: Greed (High demand for Calls).

### **Interpretation**
- **High Skew (>0.1)**: Rising demand for hedging downside risk → Buying opportunity.
- **Low/Negative Skew (<-0.05)**: Excessive optimism → Potential correction.
- **Normal Skew (0~0.1)**: Neutral.

### **Data from yfinance**
```python
chain.calls['impliedVolatility']  # Call IV
chain.puts['impliedVolatility']   # Put IV
chain.calls['strike']              # Strike Price
```

### **Implementation**

```python
def calculate_skew(ticker: str, expiration: str):
    """
    Calculate Volatility Skew.
    
    Args:
        ticker: Symbol
        expiration: Expiration date
    
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
    
    # Find ATM (At-The-Money)
    atm_strike = min(chain.calls['strike'], key=lambda x: abs(x - current_price))
    atm_call = chain.calls[chain.calls['strike'] == atm_strike]
    
    if len(atm_call) == 0:
        return {'value': 0, 'interpretation': 'neutral'}
    
    atm_iv = atm_call['impliedVolatility'].iloc[0]
    
    # OTM Put (Strike 5% below current price)
    otm_puts = chain.puts[chain.puts['strike'] < current_price * 0.95]
    
    if len(otm_puts) == 0:
        return {'value': 0, 'atmIV': atm_iv, 'interpretation': 'neutral'}
    
    otm_put_iv = otm_puts['impliedVolatility'].mean()
    skew = otm_put_iv - atm_iv
    
    # Interpretation
    if skew > 0.1:
        interpretation = 'fear'
    elif skew < -0.05:
        interpretation = 'greed'
    else:
        interpretation = 'neutral'
    
    # Trend (simplified version)
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

# Usage example
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

### **Concept**
- Strike with the largest Gamma Exposure (GEX).
- Positive Gamma: Support (Buying pressure).
- Negative Gamma: Resistance (Selling pressure).

### **Black-Scholes Gamma Formula**
```
Gamma = N'(d1) / (S × σ × √T)

where:
- N'(d1) = Probability density function of standard normal distribution
- S = Current stock price
- K = Strike price
- σ = Implied Volatility
- T = Time to expiration (years)
- d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)
```

### **GEX (Gamma Exposure)**
```
GEX = Gamma × Open Interest × 100 (100 shares per contract)
```

### **Data from yfinance**
```python
chain.calls['strike']              # K (Strike)
chain.calls['openInterest']        # OI
chain.calls['impliedVolatility']   # σ (IV)
stock.history()['Close']           # S (Current Price)
```

### **Implementation**

```python
from scipy.stats import norm
import numpy as np
from datetime import datetime

def black_scholes_gamma(S, K, T, r, sigma):
    """
    Calculate Black-Scholes Gamma.
    
    Args:
        S: Current stock price
        K: Strike price
        T: Time to expiration (years)
        r: Risk-free interest rate
        sigma: Implied Volatility
    
    Returns:
        float: Gamma value
    """
    if T <= 0 or sigma <= 0:
        return 0
    
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    return gamma

def find_gamma_walls(ticker: str, expiration: str):
    """
    Identify Gamma Walls.
    
    Args:
        ticker: Symbol
        expiration: Expiration date
    
    Returns:
        dict: {
            'positive': list,  # Support levels (Top 5)
            'negative': list,  # Resistance levels (Top 5)
            'nearest': dict    # Nearest Gamma Wall to current price
        }
    """
    stock = yf.Ticker(ticker)
    chain = stock.option_chain(expiration)
    current_price = stock.history(period="1d")['Close'].iloc[-1]
    
    # Calculate days to expiration
    exp_date = datetime.strptime(expiration, '%Y-%m-%d')
    days_to_exp = (exp_date - datetime.now()).days
    T = max(days_to_exp / 365.0, 0.001)  # Prevention of zero value
    
    r = 0.05  # Assumed risk-free rate (5%)
    
    gamma_exposure = {}
    
    # Calculate Call Gamma
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
    
    # Separate Positive/Negative
    positive = {k: v for k, v in gamma_exposure.items() if v > 0}
    negative = {k: v for k, v in gamma_exposure.items() if v < 0}
    
    # Extract Top 5
    top_positive = sorted(positive.items(), key=lambda x: x[1], reverse=True)[:5]
    top_negative = sorted(negative.items(), key=lambda x: x[1])[:5]
    
    # Nearest Gamma Wall to current price
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

# Usage example
result = find_gamma_walls('AAPL', '2026-01-16')
print(result)
# {
#   'positive': [{'strike': 180, 'gex': 15000000}, ...],
#   'negative': [{'strike': 200, 'gex': -8000000}, ...],
#   'nearest': {'strike': 185, 'gex': 12000000, 'type': 'support', 'distance': -2.7}
# }
```

---

## 📚 References

### **yfinance Documentation**
- https://pypi.org/project/yfinance/
- https://github.com/ranaroussi/yfinance

### **Black-Scholes Model**
- https://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model
- https://www.investopedia.com/terms/b/blackscholes.asp

### **Options Greeks**
- https://www.investopedia.com/trading/getting-to-know-the-greeks/

### **Max Pain Theory**
- https://www.investopedia.com/terms/m/maxpain.asp

---

## 🎯 Next Steps

After reviewing this document:
1. Understand the core concepts of each indicator.
2. Test code execution in a Python environment.
3. Verify results using real-time stock data.
4. Issue instructions to begin implementation.

I am ready to assist whenever you are prepared!
