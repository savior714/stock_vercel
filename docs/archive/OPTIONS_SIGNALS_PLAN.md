# Options Signals Implementation Plan

## 📌 Rollback Point

**Git Tag**: `v1.0.0-stable`  
**Commit**: `20839c9`  
**Date**: 2026-01-09  
**Status**: Tauri local preset saving completed, Technical indicator analysis functioning.

**Recovery Method:**
```bash
git checkout v1.0.0-stable
# OR
git reset --hard v1.0.0-stable
```

---

## 🎯 Project Objectives

Integrate **Options market data** with existing technical indicators (RSI, MFI, Bollinger Bands) to:
- Enhance the accuracy of buy/sell signals.
- Establish a weight-based confidence score system.
- Implement an optimized alert system tailored for daily swing trading.

---

## 🏗️ System Architecture (PC Dedicated)

### **Current Architecture**
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

### **New Architecture (Tauri + Python)**
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

### **Data Flow**

1. **User Action**: Clicks the "Run Analysis" button.
2. **Frontend → Rust**: `invoke('analyze_with_options', { tickers: [...] })`
3. **Rust → Python**: `python scripts/options_analyzer.py AAPL,TSLA,NVDA`
4. **Python**: Collects data via yfinance + Performs calculations.
5. **Python → Rust**: Returns JSON results.
6. **Rust → Frontend**: Passes parsed data.
7. **Frontend**: Updates UI (displays signals).

### **Tauri Command Implementation**

```rust
// src-tauri/src/main.rs
use std::process::Command;

#[tauri::command]
async fn analyze_with_options(tickers: Vec<String>) -> Result<String, String> {
    // Path to Python script
    let script_path = "scripts/options_analyzer.py";
    
    // Join ticker list with commas
    let tickers_str = tickers.join(",");
    
    // Execute Python
    let output = Command::new("python")
        .arg(script_path)
        .arg(&tickers_str)
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python error: {}", error));
    }
    
    // Return JSON results
    let result = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(result)
}
```

### **Python Script Structure**

```
stock_vercel/
├── scripts/
│   ├── options_analyzer.py      # Main analysis script
│   ├── requirements.txt          # Python dependencies
│   └── utils/
│       ├── __init__.py
│       ├── options_data.py       # Option data collection
│       ├── calculations.py       # Max Pain, Gamma calculations
│       └── signals.py            # Signal logic
```

---

## 🔧 Development Environment Setup

### **1. Build Python Environment**

```bash
# In the project root
cd stock_vercel

# Create Python virtual environment
python -m venv venv

# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Install required packages
pip install yfinance numpy scipy pandas
pip freeze > scripts/requirements.txt
```

### **2. Update Tauri Configuration**

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
      "scripts/**/*.py",      // Include Python scripts
      "../venv/**/*"          // Include Python venv (Optional)
    ]
  }
}
```

### **3. Development Workflow**

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Tauri dev mode
npm run tauri:dev

# Independent testing of Python script
python scripts/options_analyzer.py AAPL
```

---

## 📦 Deployment Strategy (PC Dedicated)

### **Windows NSIS Installer**

**Items to Include:**
1. ✅ Tauri executable (`app.exe`)
2. ✅ Python scripts (`scripts/`)
3. ⚠️ Python runtime (Two approaches)

**Approach 1: Rely on User Python (Simplest)**
```
- Installer size: ~10MB
- Requirement: Python 3.10+ must be installed on the user PC.
- Pros: Small and fast installer.
- Cons: User is responsible for Python installation.
```

**Approach 2: Bundle Python Embedded (Recommended)**
```
- Installer size: ~50MB
- Requirement: None (Standalone execution).
- Pros: Ideal user convenience.
- Cons: Increased installer size.
```

**Python Embedded Configuration:**
```bash
# Download Python Embedded
# https://www.python.org/downloads/windows/
# Download "Windows embeddable package (64-bit)"

# Include in project
stock_vercel/
├── python-embed/
│   ├── python.exe
│   ├── python310.zip
│   └── ...
└── scripts/
    └── ...
```

```rust
// src-tauri/src/main.rs (Revised)
#[tauri::command]
async fn analyze_with_options(tickers: Vec<String>) -> Result<String, String> {
    // Use bundled Python
    let python_path = if cfg!(debug_assertions) {
        "python"  // Dev Mode: System Python
    } else {
        "./python-embed/python.exe"  // Production: Bundled Python
    };
    
    let output = Command::new(python_path)
        .arg("scripts/options_analyzer.py")
        .arg(&tickers.join(","))
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;
    
    // ... remaining code
}
```

---

## 📊 Data Model Design

### **1. Options Indicator Data Structure**

```typescript
// types/options.ts
export interface OptionsData {
  ticker: string;
  timestamp: string;
  currentPrice: number;
  
  // Max Pain
  maxPain: {
    strike: number;
    distance: number;  // Distance relative to current price (%)
  };
  
  // Gamma Wall
  gammaWall: {
    positive: GammaLevel[];  // Support level
    negative: GammaLevel[];  // Resistance level
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
  
  // VIX (Overall Market)
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

### **2. Signal Score Data Structure**

```typescript
// types/signals.ts
export interface SignalScore {
  ticker: string;
  timestamp: string;
  
  // Final signal
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  totalScore: number;  // 0-100
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // Score breakdown
  breakdown: {
    technicalScore: number;  // (0-50)
    optionsScore: number;    // (0-50)
  };
  
  // Triggered rules
  triggeredRules: TriggeredRule[];
  
  // Analysis details
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

## 🧮 Calculation Logic Design

### **Phase 1: Option Data Collection**

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
        """Fetch options chain data"""
        return self.stock.option_chain(expiration)
    
    def calculate_max_pain(self, expiration: str) -> float:
        """Calculate Max Pain"""
        chain = self.get_options_chain(expiration)
        strikes = sorted(set(chain.calls['strike'].tolist()))
        
        max_pain_values = {}
        for strike in strikes:
            # Call Loss
            call_loss = sum(
                chain.calls[chain.calls['strike'] < strike]['openInterest'] 
                * (strike - chain.calls[chain.calls['strike'] < strike]['strike'])
            )
            # Put Loss
            put_loss = sum(
                chain.puts[chain.puts['strike'] > strike]['openInterest']
                * (chain.puts[chain.puts['strike'] > strike]['strike'] - strike)
            )
            max_pain_values[strike] = call_loss + put_loss
        
        return min(max_pain_values, key=max_pain_values.get)
    
    def calculate_gamma(self, S, K, T, r, sigma):
        """Calculate Black-Scholes Gamma"""
        d1 = (np.log(S/K) + (r + 0.5*sigma**2)*T) / (sigma*np.sqrt(T))
        gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
        return gamma
    
    def find_gamma_walls(self, expiration: str):
        """Find Gamma Walls"""
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
            gex = gamma * row['openInterest'] * 100  # 100 shares per contract
            gamma_exposure[row['strike']] = gex
        
        # Separate positive/negative
        positive = {k: v for k, v in gamma_exposure.items() if v > 0}
        negative = {k: v for k, v in gamma_exposure.items() if v < 0}
        
        return {
            'positive': sorted(positive.items(), key=lambda x: x[1], reverse=True)[:5],
            'negative': sorted(negative.items(), key=lambda x: x[1])[:5]
        }
    
    def calculate_skew(self, expiration: str) -> float:
        """Calculate Volatility Skew"""
        chain = self.get_options_chain(expiration)
        
        # Find ATM
        atm_strike = min(chain.calls['strike'], key=lambda x: abs(x - self.current_price))
        atm_iv = chain.calls[chain.calls['strike'] == atm_strike]['impliedVolatility'].iloc[0]
        
        # OTM Put IV
        otm_puts = chain.puts[chain.puts['strike'] < self.current_price * 0.95]
        if len(otm_puts) > 0:
            otm_put_iv = otm_puts['impliedVolatility'].mean()
            return otm_put_iv - atm_iv
        return 0
    
    def detect_uoa(self, expiration: str):
        """Detect Unusual Options Activity"""
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
        """Run full analysis"""
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
                'strikes': []  # TODO: implementation
            }
        }
```

### **Phase 2: Signal Scoring Engine**

```typescript
// lib/signal-engine.ts
export class SignalEngine {
  private technicalData: TechnicalIndicators;
  private optionsData: OptionsData;
  
  constructor(technical: TechnicalIndicators, options: OptionsData) {
    this.technicalData = technical;
    this.optionsData = options;
  }
  
  // BUY Logic 1: Gravity
  private checkGravity(): { triggered: boolean; score: number; description: string } {
    const rsiLow = this.technicalData.rsi < 35;
    const belowMaxPain = this.technicalData.price < this.optionsData.maxPain.strike * 0.95;
    
    if (rsiLow && belowMaxPain) {
      return {
        triggered: true,
        score: 80,
        description: `RSI ${this.technicalData.rsi.toFixed(1)} Oversold + ${Math.abs(this.optionsData.maxPain.distance).toFixed(1)}% below Max Pain(${this.optionsData.maxPain.strike})`
      };
    }
    return { triggered: false, score: 0, description: '' };
  }
  
  // BUY Logic 2: Gamma Floor
  private checkGammaFloor(): { triggered: boolean; score: number; description: string } {
    const atBBLower = this.technicalData.bbPosition === 'lower';
    const nearGammaSupport = this.optionsData.gammaWall.nearest.type === 'support' &&
                             Math.abs(this.optionsData.gammaWall.nearest.distance) < 2;
    
    if (atBBLower && nearGammaSupport) {
      return {
        triggered: true,
        score: 80,
        description: `BB Lower + Proximity to Positive Gamma Wall(${this.optionsData.gammaWall.nearest.strike})`
      };
    }
    return { triggered: false, score: 0, description: '' };
  }
  
  // ... Implementation of remains rules
  
  public calculateSignal(): SignalScore {
    const buyRules = [
      this.checkGravity(),
      this.checkGammaFloor(),
      // ... remains BUY rules
    ];
    
    const sellRules = [
      // ... remains SELL rules
    ];
    
    const triggeredBuy = buyRules.filter(r => r.triggered);
    const triggeredSell = sellRules.filter(r => r.triggered);
    
    const buyScore = triggeredBuy.reduce((sum, r) => sum + r.score, 0);
    const sellScore = triggeredSell.reduce((sum, r) => sum + r.score, 0);
    
    // Determine final signal
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

## 🎨 UI/UX Design

### **Result Card Updates**

```tsx
// components/StockResultCard.tsx
interface StockResultCardProps {
  result: StockResult;
  signal?: SignalScore;
}

export function StockResultCard({ result, signal }: StockResultCardProps) {
  return (
    <div className="result-card">
      {/* Existing content */}
      <div className="ticker">{result.ticker}</div>
      <div className="indicators">
        <span>RSI: {result.rsi}</span>
        <span>MFI: {result.mfi}</span>
      </div>
      
      {/* New signal section */}
      {signal && (
        <div className={`signal-section signal-${signal.signal.toLowerCase()}`}>
          <div className="signal-header">
            <span className="signal-badge">
              {signal.signal === 'STRONG_BUY' && '🟢🟢 STRONG BUY'}
              {signal.signal === 'BUY' && '🟢 BUY'}
              {signal.signal === 'STRONG_SELL' && '🔴🔴 STRONG SELL'}
              {signal.signal === 'SELL' && '🔴 SELL'}
            </span>
            <span className="confidence">{signal.confidence}</span>
            <span className="score">{signal.totalScore}pts</span>
          </div>
          
          <div className="triggered-rules">
            {signal.triggeredRules.map(rule => (
              <div key={rule.id} className={`rule-tag ${rule.type}`}>
                {rule.name}
              </div>
            ))}
          </div>
          
          <details className="analysis-details">
            <summary>Detailed Analysis</summary>
            <div className="analysis-content">
              {signal.analysis.buyReasons.length > 0 && (
                <div className="buy-reasons">
                  <h4>Buy Rationale:</h4>
                  <ul>
                    {signal.analysis.buyReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {signal.analysis.sellReasons.length > 0 && (
                <div className="sell-reasons">
                  <h4>Sell Rationale:</h4>
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

## 🎯 PC Roadmap

### **Milestone 1: Establish Python Foundation (3-4 days)**

**Goal**: Complete option data collection and primary calculations using Python.

```bash
# Day 1: Environment Setup
- [ ] Create Python virtual environment.
- [ ] Install yfinance, numpy, scipy.
- [ ] Test option chain data collection for a single symbol.

# Day 2-3: Implementation of Calculation Functions
- [ ] Calculate Max Pain.
- [ ] Calculate Gamma Wall (Black-Scholes).
- [ ] Calculate Skew Index.

# Day 4: Verification
- [ ] Verify accuracy of calculation results.
- [ ] Finalize JSON output format.
```

**Deliverable**: `scripts/options_analyzer.py` (Independently executable)

---

### **Milestone 2: Tauri Integration (2-3 days)**

**Goal**: Python invocation and data parsing within Rust.

```bash
# Day 1: Implementation of Tauri Command
- [ ] Write `analyze_with_options` command.
- [ ] Test Python process execution.
- [ ] Error handling.

# Day 2: Frontend Integration
- [ ] Define TypeScript types.
- [ ] Implement `invoke()` call.
- [ ] Loading state handling.

# Day 3: Testing
- [ ] Dev mode testing.
- [ ] Production build testing.
```

**Deliverable**: Successful invocation of Python script from Tauri app.

---

### **Milestone 3: Implementation of Signal Logic (4-5 days)**

**Goal**: Complete 10 buy/sell rules.

```bash
# Day 1-2: 5 BUY rules
- [ ] Gravity (Magnet regression)
- [ ] Gamma Floor (Gamma support)
- [ ] UOA Follow
- [ ] Skew Peak
- [ ] Pinning (0DTE effect)

# Day 3-4: 5 SELL rules
- [ ] Gamma Ceiling
- [ ] Skew Timing
- [ ] Gravity Exit
- [ ] Hedge Put Detection
- [ ] Volatility Explosion Alert

# Day 5: Weighting System
- [ ] Score calculation engine.
- [ ] Confidence grade classification.
```

**Deliverable**: `lib/signal-engine.ts` (Signal scoring)

---

### **Milestone 4: UI Implementation (2-3 days)**

**Goal**: Visually present signals to the user.

```bash
# Day 1: Component Design
- [ ] SignalBadge component.
- [ ] TriggeredRules list.
- [ ] Detailed analysis panel.

# Day 2: Styling
- [ ] BUY/SELL color themes.
- [ ] Animation effects.
- [ ] Responsive layout.

# Day 3: Filtering
- [ ] "Show BUY only" filter.
- [ ] "80+ Score" filter.
- [ ] Sorting options.
```

**Deliverable**: Finalized Signal UI.

---

### **Milestone 5: Optimization and Deployment (2-3 days)**

**Goal**: Performance optimization and Windows installer generation.

```bash
# Day 1: Performance Optimization
- [ ] Measure Python script execution time.
- [ ] Parallel processing (concurrent analysis).
- [ ] Caching strategy.

# Day 2: Python Embedded Packaging
- [ ] Download Python Embedded.
- [ ] Include dependency packages.
- [ ] Update Tauri build configuration.

# Day 3: Final Build and Testing
- [ ] Generate NSIS installer.
- [ ] Install testing on a clean PC.
- [ ] Write user guide.
```

**Deliverable**: `stock-vercel_1.1.0_x64-setup.exe`

---

## 📅 Overall Schedule (2-3 weeks)

```
Week 1: Python Foundation + Tauri Integration
├─ Mon-Thu: Milestone 1 (Python)
└─ Fri-Sun: Milestone 2 (Tauri)

Week 2: Signal Logic + UI
├─ Mon-Fri: Milestone 3 (Signal Engine)
└─ Sat-Sun: Milestone 4 (UI - Alpha)

Week 3: Polish + Optimization + Deployment
├─ Mon-Tue: Milestone 4 (UI - Final)
└─ Wed-Fri: Milestone 5 (Deployment)
```
