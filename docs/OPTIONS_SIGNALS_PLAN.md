# Options Signals Implementation Plan

## 📌 회귀점 (Rollback Point)

**Git Tag**: `v1.0.0-stable`  
**Commit**: `20839c9`  
**날짜**: 2026-01-09  
**상태**: Tauri 로컬 프리셋 저장 완료, 기술적 지표 분석 작동 중

**복구 방법:**
```bash
git checkout v1.0.0-stable
# 또는
git reset --hard v1.0.0-stable
```

---

## 🎯 프로젝트 목표

기존 기술적 지표(RSI, MFI, Bollinger Bands)에 **옵션 시장 데이터**를 결합하여:
- 매수/매도 시그널의 정확도 향상
- 가중치 기반 신뢰도 점수 시스템 구축
- 일봉 스윙 트레이딩에 최적화된 알림 시스템

---

## 🏗️ 시스템 아키텍처

### **현재 아키텍처**
```
┌─────────────────┐
│   Next.js App   │ (Frontend)
│   (TypeScript)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Yahoo Finance  │ (External API)
│      API        │
└─────────────────┘
```

### **새로운 아키텍처 (Python 백엔드 추가)**
```
┌─────────────────┐
│   Next.js App   │ (Frontend - Tauri/Capacitor)
│   (TypeScript)  │
└────────┬────────┘
         │ HTTP/IPC
         ▼
┌─────────────────┐
│  Python Backend │ (FastAPI/Flask)
│   - yfinance    │
│   - numpy       │
│   - scipy       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Yahoo Finance  │
│   Options API   │
└─────────────────┘
```

### **Tauri + Python 통합 방식**

**방법 1: Tauri Command (권장)**
```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn calculate_options_signals(ticker: String) -> Result<String, String> {
    let output = Command::new("python")
        .arg("scripts/options_calculator.py")
        .arg(&ticker)
        .output()
        .map_err(|e| e.to_string())?;
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
```

**방법 2: HTTP Server (대안)**
```python
# Python FastAPI 서버를 localhost:8000에서 실행
# Next.js에서 fetch('http://localhost:8000/signals/{ticker}')
```

### **Android APK 호환성**

✅ **Tauri + Python → APK 가능**
- Tauri는 **Capacitor**와 함께 사용 가능
- Python 스크립트는 **Chaquopy** (Android Python 런타임)로 패키징
- 또는 Python 서버를 **별도 클라우드**에 배포하고 HTTP로 통신

**권장 방식:**
```
Tauri Desktop (Windows/Mac) → Python 로컬 실행
Capacitor Mobile (Android) → Python 클라우드 API 호출
```

---

## 📊 데이터 모델 설계

### **1. 옵션 지표 데이터 구조**

```typescript
// types/options.ts
export interface OptionsData {
  ticker: string;
  timestamp: string;
  currentPrice: number;
  
  // Max Pain
  maxPain: {
    strike: number;
    distance: number;  // 현재가 대비 거리 (%)
  };
  
  // Gamma Wall
  gammaWall: {
    positive: GammaLevel[];  // 지지선
    negative: GammaLevel[];  // 저항선
    nearest: {
      type: 'support' | 'resistance';
      strike: number;
      distance: number;
    };
  };
  
  // Skew Index
  skew: {
    value: number;
    trend: 'rising' | 'falling' | 'stable';
    interpretation: 'fear' | 'neutral' | 'greed';
  };
  
  // UOA (Unusual Options Activity)
  uoa: {
    calls: UOASignal[];
    puts: UOASignal[];
    hasUnusual: boolean;
  };
  
  // 0DTE
  dte0: {
    hasExpiration: boolean;
    strikes: number[];
    nearestStrike: number | null;
  };
  
  // VIX (시장 전체)
  vix: {
    current: number;
    trend: 'rising' | 'falling';
  };
}

interface GammaLevel {
  strike: number;
  gammaExposure: number;
  openInterest: number;
}

interface UOASignal {
  strike: number;
  volume: number;
  openInterest: number;
  volumeOIRatio: number;
  impliedVolatility: number;
  isUnusual: boolean;
}
```

### **2. 시그널 스코어 데이터 구조**

```typescript
// types/signals.ts
export interface SignalScore {
  ticker: string;
  timestamp: string;
  
  // 최종 시그널
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  totalScore: number;  // 0-100
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // 점수 분해
  breakdown: {
    technicalScore: number;  // 기술적 지표 점수 (0-50)
    optionsScore: number;    // 옵션 지표 점수 (0-50)
  };
  
  // 발동된 로직들
  triggeredRules: TriggeredRule[];
  
  // 상세 분석
  analysis: {
    buyReasons: string[];
    sellReasons: string[];
    warnings: string[];
  };
}

interface TriggeredRule {
  id: string;
  name: string;
  type: 'buy' | 'sell';
  score: number;
  description: string;
}
```

---

## 🧮 계산 로직 설계

### **Phase 1: 옵션 데이터 수집**

```python
# scripts/options_calculator.py
import yfinance as yf
import numpy as np
from scipy.stats import norm
from datetime import datetime, timedelta

class OptionsAnalyzer:
    def __init__(self, ticker: str):
        self.ticker = ticker
        self.stock = yf.Ticker(ticker)
        self.current_price = self.stock.history(period="1d")['Close'].iloc[-1]
    
    def get_options_chain(self, expiration: str):
        """옵션 체인 데이터 가져오기"""
        return self.stock.option_chain(expiration)
    
    def calculate_max_pain(self, expiration: str) -> float:
        """Max Pain 계산"""
        chain = self.get_options_chain(expiration)
        strikes = sorted(set(chain.calls['strike'].tolist()))
        
        max_pain_values = {}
        for strike in strikes:
            # Call 손실
            call_loss = sum(
                chain.calls[chain.calls['strike'] < strike]['openInterest'] 
                * (strike - chain.calls[chain.calls['strike'] < strike]['strike'])
            )
            # Put 손실
            put_loss = sum(
                chain.puts[chain.puts['strike'] > strike]['openInterest']
                * (chain.puts[chain.puts['strike'] > strike]['strike'] - strike)
            )
            max_pain_values[strike] = call_loss + put_loss
        
        return min(max_pain_values, key=max_pain_values.get)
    
    def calculate_gamma(self, S, K, T, r, sigma):
        """Black-Scholes Gamma 계산"""
        d1 = (np.log(S/K) + (r + 0.5*sigma**2)*T) / (sigma*np.sqrt(T))
        gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
        return gamma
    
    def find_gamma_walls(self, expiration: str):
        """Gamma Wall 찾기"""
        chain = self.get_options_chain(expiration)
        days_to_exp = (datetime.strptime(expiration, '%Y-%m-%d') - datetime.now()).days
        T = days_to_exp / 365.0
        
        gamma_exposure = {}
        for _, row in chain.calls.iterrows():
            gamma = self.calculate_gamma(
                S=self.current_price,
                K=row['strike'],
                T=T,
                r=0.05,
                sigma=row['impliedVolatility']
            )
            gex = gamma * row['openInterest'] * 100  # 계약당 100주
            gamma_exposure[row['strike']] = gex
        
        # Positive/Negative 분리
        positive = {k: v for k, v in gamma_exposure.items() if v > 0}
        negative = {k: v for k, v in gamma_exposure.items() if v < 0}
        
        return {
            'positive': sorted(positive.items(), key=lambda x: x[1], reverse=True)[:5],
            'negative': sorted(negative.items(), key=lambda x: x[1])[:5]
        }
    
    def calculate_skew(self, expiration: str) -> float:
        """Volatility Skew 계산"""
        chain = self.get_options_chain(expiration)
        
        # ATM 찾기
        atm_strike = min(chain.calls['strike'], key=lambda x: abs(x - self.current_price))
        atm_iv = chain.calls[chain.calls['strike'] == atm_strike]['impliedVolatility'].iloc[0]
        
        # OTM Put IV
        otm_puts = chain.puts[chain.puts['strike'] < self.current_price * 0.95]
        if len(otm_puts) > 0:
            otm_put_iv = otm_puts['impliedVolatility'].mean()
            return otm_put_iv - atm_iv
        return 0
    
    def detect_uoa(self, expiration: str):
        """Unusual Options Activity 감지"""
        chain = self.get_options_chain(expiration)
        
        unusual_calls = chain.calls[
            (chain.calls['volume'] > 1000) &
            (chain.calls['volume'] > chain.calls['openInterest'] * 2)
        ]
        
        unusual_puts = chain.puts[
            (chain.puts['volume'] > 1000) &
            (chain.puts['volume'] > chain.puts['openInterest'] * 2)
        ]
        
        return {
            'calls': unusual_calls[['strike', 'volume', 'openInterest', 'impliedVolatility']].to_dict('records'),
            'puts': unusual_puts[['strike', 'volume', 'openInterest', 'impliedVolatility']].to_dict('records')
        }
    
    def analyze(self):
        """전체 분석 실행"""
        expirations = self.stock.options
        nearest_exp = expirations[0] if expirations else None
        
        if not nearest_exp:
            return {'error': 'No options data available'}
        
        return {
            'ticker': self.ticker,
            'currentPrice': self.current_price,
            'maxPain': self.calculate_max_pain(nearest_exp),
            'gammaWall': self.find_gamma_walls(nearest_exp),
            'skew': self.calculate_skew(nearest_exp),
            'uoa': self.detect_uoa(nearest_exp),
            'dte0': {
                'hasExpiration': nearest_exp == datetime.now().strftime('%Y-%m-%d'),
                'strikes': []  # TODO: 구현
            }
        }
```

### **Phase 2: 시그널 스코어링 엔진**

```typescript
// lib/signal-engine.ts
export class SignalEngine {
  private technicalData: TechnicalIndicators;
  private optionsData: OptionsData;
  
  constructor(technical: TechnicalIndicators, options: OptionsData) {
    this.technicalData = technical;
    this.optionsData = options;
  }
  
  // BUY 로직 1: 자석 회귀 (Gravity)
  private checkGravity(): { triggered: boolean; score: number; description: string } {
    const rsiLow = this.technicalData.rsi < 35;
    const belowMaxPain = this.technicalData.price < this.optionsData.maxPain.strike * 0.95;
    
    if (rsiLow && belowMaxPain) {
      return {
        triggered: true,
        score: 80,
        description: `RSI ${this.technicalData.rsi.toFixed(1)} 과매도 + Max Pain(${this.optionsData.maxPain.strike}) 아래 ${Math.abs(this.optionsData.maxPain.distance).toFixed(1)}%`
      };
    }
    return { triggered: false, score: 0, description: '' };
  }
  
  // BUY 로직 2: 감마 지지 (Gamma Floor)
  private checkGammaFloor(): { triggered: boolean; score: number; description: string } {
    const atBBLower = this.technicalData.bbPosition === 'lower';
    const nearGammaSupport = this.optionsData.gammaWall.nearest.type === 'support' &&
                             Math.abs(this.optionsData.gammaWall.nearest.distance) < 2;
    
    if (atBBLower && nearGammaSupport) {
      return {
        triggered: true,
        score: 80,
        description: `BB 하단 + Positive Gamma Wall(${this.optionsData.gammaWall.nearest.strike}) 근접`
      };
    }
    return { triggered: false, score: 0, description: '' };
  }
  
  // ... 나머지 8개 로직 구현
  
  public calculateSignal(): SignalScore {
    const buyRules = [
      this.checkGravity(),
      this.checkGammaFloor(),
      // ... 나머지 BUY 로직
    ];
    
    const sellRules = [
      // ... SELL 로직
    ];
    
    const triggeredBuy = buyRules.filter(r => r.triggered);
    const triggeredSell = sellRules.filter(r => r.triggered);
    
    const buyScore = triggeredBuy.reduce((sum, r) => sum + r.score, 0);
    const sellScore = triggeredSell.reduce((sum, r) => sum + r.score, 0);
    
    // 최종 시그널 결정
    let signal: SignalScore['signal'] = 'NEUTRAL';
    if (buyScore >= 80 && buyScore > sellScore) {
      signal = buyScore >= 160 ? 'STRONG_BUY' : 'BUY';
    } else if (sellScore >= 80 && sellScore > buyScore) {
      signal = sellScore >= 160 ? 'STRONG_SELL' : 'SELL';
    }
    
    return {
      ticker: this.optionsData.ticker,
      timestamp: new Date().toISOString(),
      signal,
      totalScore: Math.max(buyScore, sellScore),
      confidence: this.calculateConfidence(buyScore, sellScore),
      breakdown: {
        technicalScore: this.calculateTechnicalScore(),
        optionsScore: this.calculateOptionsScore()
      },
      triggeredRules: [
        ...triggeredBuy.map(r => ({ ...r, type: 'buy' as const })),
        ...triggeredSell.map(r => ({ ...r, type: 'sell' as const }))
      ],
      analysis: {
        buyReasons: triggeredBuy.map(r => r.description),
        sellReasons: triggeredSell.map(r => r.description),
        warnings: this.generateWarnings()
      }
    };
  }
}
```

---

## 🎨 UI/UX 설계

### **결과 카드 업데이트**

```tsx
// components/StockResultCard.tsx
interface StockResultCardProps {
  result: StockResult;
  signal?: SignalScore;
}

export function StockResultCard({ result, signal }: StockResultCardProps) {
  return (
    <div className="result-card">
      {/* 기존 내용 */}
      <div className="ticker">{result.ticker}</div>
      <div className="indicators">
        <span>RSI: {result.rsi}</span>
        <span>MFI: {result.mfi}</span>
      </div>
      
      {/* 새로운 시그널 섹션 */}
      {signal && (
        <div className={`signal-section signal-${signal.signal.toLowerCase()}`}>
          <div className="signal-header">
            <span className="signal-badge">
              {signal.signal === 'STRONG_BUY' && '🟢🟢 강력 매수'}
              {signal.signal === 'BUY' && '🟢 매수'}
              {signal.signal === 'STRONG_SELL' && '🔴🔴 강력 매도'}
              {signal.signal === 'SELL' && '🔴 매도'}
            </span>
            <span className="confidence">{signal.confidence}</span>
            <span className="score">{signal.totalScore}점</span>
          </div>
          
          <div className="triggered-rules">
            {signal.triggeredRules.map(rule => (
              <div key={rule.id} className={`rule-tag ${rule.type}`}>
                {rule.name}
              </div>
            ))}
          </div>
          
          <details className="analysis-details">
            <summary>상세 분석</summary>
            <div className="analysis-content">
              {signal.analysis.buyReasons.length > 0 && (
                <div className="buy-reasons">
                  <h4>매수 근거:</h4>
                  <ul>
                    {signal.analysis.buyReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {signal.analysis.sellReasons.length > 0 && (
                <div className="sell-reasons">
                  <h4>매도 근거:</h4>
                  <ul>
                    {signal.analysis.sellReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
```

---

## 📅 구현 일정

### **Week 1: Python 백엔드 구축**
- [ ] Day 1-2: yfinance 옵션 데이터 수집 스크립트
- [ ] Day 3-4: Max Pain, Gamma Wall 계산 함수
- [ ] Day 5-7: Skew, UOA, 0DTE 로직 구현

### **Week 2: Tauri 통합**
- [ ] Day 1-2: Tauri Command로 Python 호출
- [ ] Day 3-4: 데이터 파싱 및 TypeScript 타입 정의
- [ ] Day 5-7: 에러 핸들링 및 테스트

### **Week 3: 시그널 엔진**
- [ ] Day 1-3: 10개 로직 구현
- [ ] Day 4-5: 가중치 시스템 및 스코어링
- [ ] Day 6-7: 백테스팅 및 임계값 조정

### **Week 4: UI 및 최적화**
- [ ] Day 1-3: UI 컴포넌트 구현
- [ ] Day 4-5: 필터링 및 정렬 기능
- [ ] Day 6-7: 성능 최적화 및 문서화

---

## ✅ 체크리스트

### **기술 스택 확정**
- [ ] Python 3.10+
- [ ] yfinance, numpy, scipy
- [ ] FastAPI (선택) 또는 Tauri Command
- [ ] TypeScript 타입 정의

### **개발 환경 설정**
- [ ] Python 가상환경 생성
- [ ] 필요한 패키지 설치
- [ ] Tauri에서 Python 실행 테스트

### **데이터 검증**
- [ ] yfinance 옵션 데이터 품질 확인
- [ ] 계산 로직 정확도 검증
- [ ] 백테스팅 데이터 수집

---

## 🚀 다음 단계

1. **Python 환경 설정 및 테스트**
2. **1개 종목으로 프로토타입 구현**
3. **사용자 피드백 수집**
4. **전체 시스템 구현**

이 계획서를 검토하시고, 시작할 준비가 되면 알려주세요!
