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

## 🏗️ 시스템 아키텍처 (PC 전용)

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

### **새로운 아키텍처 (Tauri + Python)**
```
┌──────────────────────────────────────┐
│         Tauri Desktop App            │
│  ┌────────────────────────────────┐  │
│  │      Next.js Frontend          │  │
│  │      (TypeScript/React)        │  │
│  └───────────┬────────────────────┘  │
│              │ IPC (invoke)           │
│  ┌───────────▼────────────────────┐  │
│  │      Rust Backend              │  │
│  │   (Tauri Commands)             │  │
│  └───────────┬────────────────────┘  │
│              │ Process::Command       │
│  ┌───────────▼────────────────────┐  │
│  │   Python Scripts (Local)       │  │
│  │   - options_analyzer.py        │  │
│  │   - yfinance, numpy, scipy     │  │
│  └───────────┬────────────────────┘  │
└──────────────┼──────────────────────┘
               │
               ▼
       ┌───────────────┐
       │ Yahoo Finance │
       │  Options API  │
       └───────────────┘
```

### **데이터 흐름**

1. **사용자 액션**: "분석 실행" 버튼 클릭
2. **Frontend → Rust**: `invoke('analyze_with_options', { tickers: [...] })`
3. **Rust → Python**: `python scripts/options_analyzer.py AAPL,TSLA,NVDA`
4. **Python**: yfinance로 옵션 데이터 수집 + 계산
5. **Python → Rust**: JSON 결과 반환
6. **Rust → Frontend**: 파싱된 데이터 전달
7. **Frontend**: UI 업데이트 (시그널 표시)

### **Tauri Command 구현 방식**

```rust
// src-tauri/src/main.rs
use std::process::Command;

#[tauri::command]
async fn analyze_with_options(tickers: Vec<String>) -> Result<String, String> {
    // Python 스크립트 경로
    let script_path = "scripts/options_analyzer.py";
    
    // 티커 리스트를 콤마로 구분
    let tickers_str = tickers.join(",");
    
    // Python 실행
    let output = Command::new("python")
        .arg(script_path)
        .arg(&tickers_str)
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python error: {}", error));
    }
    
    // JSON 결과 반환
    let result = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(result)
}
```

### **Python 스크립트 구조**

```
stock_vercel/
├── scripts/
│   ├── options_analyzer.py      # 메인 분석 스크립트
│   ├── requirements.txt          # Python 의존성
│   └── utils/
│       ├── __init__.py
│       ├── options_data.py       # 옵션 데이터 수집
│       ├── calculations.py       # Max Pain, Gamma 계산
│       └── signals.py            # 시그널 로직
```

---

## 🔧 개발 환경 설정

### **1. Python 환경 구축**

```bash
# 프로젝트 루트에서
cd stock_vercel

# Python 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
.\venv\Scripts\activate

# 필요한 패키지 설치
pip install yfinance numpy scipy pandas
pip freeze > scripts/requirements.txt
```

### **2. Tauri 설정 업데이트**

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "bundle": {
    "resources": [
      "scripts/**/*.py",      // Python 스크립트 포함
      "../venv/**/*"          // Python 가상환경 포함 (선택)
    ]
  }
}
```

### **3. 개발 워크플로우**

```bash
# 터미널 1: Next.js 개발 서버
npm run dev

# 터미널 2: Tauri 개발 모드
npm run tauri:dev

# Python 스크립트 단독 테스트
python scripts/options_analyzer.py AAPL
```

---

## 📦 배포 전략 (PC 전용)

### **Windows NSIS 인스톨러**

**포함할 항목:**
1. ✅ Tauri 앱 실행 파일 (`app.exe`)
2. ✅ Python 스크립트 (`scripts/`)
3. ⚠️ Python 런타임 (두 가지 방법)

**방법 1: 사용자 Python 의존 (간단)**
```
- 인스톨러 크기: ~10MB
- 요구사항: 사용자 PC에 Python 3.10+ 설치 필요
- 장점: 인스톨러 작고 빠름
- 단점: 사용자가 Python 설치해야 함
```

**방법 2: Python Embedded 포함 (권장)**
```
- 인스톨러 크기: ~50MB
- 요구사항: 없음 (독립 실행)
- 장점: 사용자 편의성 최고
- 단점: 인스톨러 크기 증가
```

**Python Embedded 설정:**
```bash
# Python Embedded 다운로드
# https://www.python.org/downloads/windows/
# "Windows embeddable package (64-bit)" 다운로드

# 프로젝트에 포함
stock_vercel/
├── python-embed/
│   ├── python.exe
│   ├── python310.zip
│   └── ...
└── scripts/
    └── ...
```

```rust
// src-tauri/src/main.rs (수정)
#[tauri::command]
async fn analyze_with_options(tickers: Vec<String>) -> Result<String, String> {
    // 번들된 Python 사용
    let python_path = if cfg!(debug_assertions) {
        "python"  // 개발 모드: 시스템 Python
    } else {
        "./python-embed/python.exe"  // 프로덕션: 번들 Python
    };
    
    let output = Command::new(python_path)
        .arg("scripts/options_analyzer.py")
        .arg(&tickers.join(","))
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;
    
    // ... 나머지 코드
}
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

## 🎯 PC 버전 구현 로드맵

### **Milestone 1: Python 기반 구축 (3-4일)**

**목표**: Python으로 옵션 데이터 수집 및 기본 계산 완성

```bash
# Day 1: 환경 설정
- [ ] Python 가상환경 생성
- [ ] yfinance, numpy, scipy 설치
- [ ] 1개 종목으로 옵션 체인 데이터 수집 테스트

# Day 2-3: 계산 함수 구현
- [ ] Max Pain 계산
- [ ] Gamma Wall 계산 (Black-Scholes)
- [ ] Skew Index 계산

# Day 4: 검증
- [ ] 계산 결과 정확도 검증
- [ ] JSON 출력 형식 확정
```

**산출물**: `scripts/options_analyzer.py` (독립 실행 가능)

---

### **Milestone 2: Tauri 통합 (2-3일)**

**목표**: Rust에서 Python 호출 및 데이터 파싱

```bash
# Day 1: Tauri Command 구현
- [ ] analyze_with_options 커맨드 작성
- [ ] Python 프로세스 실행 테스트
- [ ] 에러 핸들링

# Day 2: Frontend 연동
- [ ] TypeScript 타입 정의
- [ ] invoke() 호출 구현
- [ ] 로딩 상태 처리

# Day 3: 테스트
- [ ] 개발 모드 테스트
- [ ] 프로덕션 빌드 테스트
```

**산출물**: Tauri 앱에서 Python 스크립트 호출 성공

---

### **Milestone 3: 시그널 로직 구현 (4-5일)**

**목표**: 10개 매수/매도 로직 완성

```bash
# Day 1-2: BUY 로직 5개
- [ ] 자석 회귀 (Gravity)
- [ ] 감마 지지 (Gamma Floor)
- [ ] 고래의 탐승 (UOA Follow)
- [ ] 공포의 정점 (Skew Peak)
- [ ] 0DTE 핀 효과 (Pinning)

# Day 3-4: SELL 로직 5개
- [ ] 천장의 벽 (Gamma Ceiling)
- [ ] 스큐 타이밍 전스
- [ ] 수익 실현 자석
- [ ] 헤지 풋의 습격
- [ ] 변동성 폭발 경보

# Day 5: 가중치 시스템
- [ ] 점수 계산 엔진
- [ ] 신뢰도 등급 분류
```

**산출물**: `lib/signal-engine.ts` (시그널 스코어링)

---

### **Milestone 4: UI 구현 (2-3일)**

**목표**: 시그널을 사용자에게 시각적으로 표시

```bash
# Day 1: 컴포넌트 설계
- [ ] SignalBadge 컴포넌트
- [ ] TriggeredRules 리스트
- [ ] 상세 분석 패널

# Day 2: 스타일링
- [ ] BUY/SELL 색상 테마
- [ ] 애니메이션 효과
- [ ] 반응형 레이아웃

# Day 3: 필터링
- [ ] "BUY만 보기" 필터
- [ ] "80점 이상만" 필터
- [ ] 정렬 옵션
```

**산출물**: 완성된 시그널 UI

---

### **Milestone 5: 최적화 및 배포 (2-3일)**

**목표**: 성능 최적화 및 Windows 인스톨러 생성

```bash
# Day 1: 성능 최적화
- [ ] Python 스크립트 실행 시간 측정
- [ ] 병렬 처리 (여러 종목 동시 분석)
- [ ] 캐싱 전략

# Day 2: Python Embedded 패키징
- [ ] Python Embedded 다운로드
- [ ] 의존성 패키지 포함
- [ ] Tauri 빌드 설정 업데이트

# Day 3: 최종 빌드 및 테스트
- [ ] NSIS 인스톨러 생성
- [ ] 깨끗한 PC에서 설치 테스트
- [ ] 사용자 가이드 작성
```

**산출물**: `stock-vercel_1.1.0_x64-setup.exe`

---

## 📅 전체 일정 (2-3주)

```
Week 1: Python 기반 + Tauri 통합
├─ Mon-Thu: Milestone 1 (Python)
└─ Fri-Sun: Milestone 2 (Tauri)

Week 2: 시그널 로직 + UI
├─ Mon-Fri: Milestone 3 (Signals)
└─ Sat-Sun: Milestone 4 (UI) 시작

Week 3: UI 완성 + 배포
├─ Mon-Tue: Milestone 4 (UI) 완료
└─ Wed-Fri: Milestone 5 (Optimization & Deploy)
```

---

## 🚀 빠른 시작 가이드

### **Step 1: Python 환경 설정**

```powershell
# 프로젝트 루트에서
cd stock_vercel

# 가상환경 생성
python -m venv venv

# 활성화
.\venv\Scripts\activate

# 패키지 설치
pip install yfinance numpy scipy pandas
```

### **Step 2: 프로토타입 테스트**

```python
# scripts/options_analyzer.py (간단 버전)
import sys
import yfinance as yf
import json

ticker = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
stock = yf.Ticker(ticker)

# 옵션 만기일 가져오기
expirations = stock.options
if not expirations:
    print(json.dumps({"error": "No options data"}))
    sys.exit(1)

# 첫 번째 만기일 옵션 체인
chain = stock.option_chain(expirations[0])

# 간단한 결과 출력
result = {
    "ticker": ticker,
    "expiration": expirations[0],
    "callsCount": len(chain.calls),
    "putsCount": len(chain.puts)
}

print(json.dumps(result))
```

```bash
# 테스트 실행
python scripts/options_analyzer.py AAPL
# 출력: {"ticker": "AAPL", "expiration": "2026-01-16", ...}
```

### **Step 3: Tauri 통합 테스트**

```rust
// src-tauri/src/main.rs에 추가
#[tauri::command]
fn test_python() -> Result<String, String> {
    let output = std::process::Command::new("python")
        .arg("scripts/options_analyzer.py")
        .arg("AAPL")
        .output()
        .map_err(|e| e.to_string())?;
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// main 함수에 등록
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![test_python])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// app/page.tsx에서 테스트
import { invoke } from '@tauri-apps/api/core';

async function testPython() {
  try {
    const result = await invoke('test_python');
    console.log('Python result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## ✅ 체크리스트

### **개발 환경**
- [ ] Python 3.10+ 설치 확인
- [ ] 가상환경 생성 및 활성화
- [ ] yfinance 설치 및 테스트
- [ ] Rust/Tauri 개발 환경 확인

### **코드 구조**
- [ ] `scripts/` 폴더 생성
- [ ] `scripts/options_analyzer.py` 작성
- [ ] `scripts/requirements.txt` 생성
- [ ] Tauri Command 추가

### **테스트**
- [ ] Python 스크립트 단독 실행 성공
- [ ] Tauri에서 Python 호출 성공
- [ ] JSON 파싱 성공
- [ ] 에러 핸들링 작동 확인

---

## 🎯 다음 단계

준비되셨으면 다음 중 선택해 주세요:

1. **Milestone 1 시작** (Python 환경 설정 및 프로토타입)
2. **전체 코드 스캐폴딩** (폴더 구조 및 기본 파일 생성)
3. **특정 부분 상세 설계** (예: Max Pain 계산 로직)

어떤 것부터 시작할까요?
