# 📈 Stock Analysis Dashboard

Real-time Stock Analysis and Technical Indicator-based Alert System

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/savior714/stock_vercel)

## 🎯 Project Introduction

The Stock Analysis Dashboard is a web application that automatically identifies stocks in oversold zones using technical analysis indicators. It combines indicators like RSI, MFI, and Bollinger Bands to help capture optimal buying opportunities.

### Key Features

- **🎯 Triple Signal Analysis**: RSI < 35 AND MFI < 35 AND Bollinger Bands Lower Touch.
- **📊 Bollinger Bands Analysis**: Detects stocks touching the lower Bollinger Band.
- **📈 Market Indicator Monitoring**: 
  - CNN Fear & Greed Index (Real-time).
  - VIX Volatility Index (Includes 50-day average).
  - Put/Call Ratio (CBOE).
- **💾 Ticker Management**: Preset tickers + Custom ticker addition.
- **☁️ Preset Synchronization**: Share presets across devices via Vercel KV.
- **🔄 Real-time Updates**: Automatic refresh every 5 minutes.

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/savior714/stock_vercel.git
cd stock_vercel

# Install dependencies
npm install

# Configure environment variables (Optional - for Pre-sets)
# Create .env.local file and set Vercel KV variables
# KV_REST_API_URL=your_url
# KV_REST_API_TOKEN=your_token

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to check.

### Deployment

```bash
# Deploy to Vercel
vercel --prod
```

### Tauri Desktop App Build

```bash
# Build Windows NSIS installer
npm run tauri:build

# Build Outputs
# - src-tauri/target/release/stock-vercel.exe (Executable)
# - src-tauri/target/release/bundle/nsis/stock-vercel_0.1.0_x64-setup.exe (Installer)
```

> **Note**: `npm run build:static` is automatically executed before build to prevent API route issues.

### Capacitor Mobile App Build

```bash
# Build Android APK
npm run cap:build:apk

# Run in Android Studio
npx cap open android
# Then click the 'Run' button (▶) at the top of Android Studio

# Clean Build (In case of issues)
# 1. Android Studio: Build > Clean Project
# 2. Rebuild Project
```

---

## 🛠️ Troubleshooting

Refer to [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if you encounter issues during build or execution.

Common solutions:
- Tauri Preset Saving Failure → Check permission settings.
- Environment Detection Failure → Check client-side detection logic.
- Build Cache Issues → Delete `out` and `target/release` folders and rebuild.

---

### 429 Error Countermeasures

While Yahoo Finance API is free, 429 (Too Many Requests) errors may occur.

**Current Countermeasures:**
- 5-second delay between requests.
- User-Agent Rotation (10 variants).
- Memory Cache (5-minute TTL).

**In case of 429 Alerts:**
- Please try again after a short delay.
- Reduce the number of symbols being analyzed at once.

---

## 📊 Technical Indicator Descriptions

### RSI (Relative Strength Index)
- **Range**: 0-100
- **Oversold**: RSI < 35
- **Overbought**: RSI > 70
- Uses a 14-day period.

### MFI (Money Flow Index)
- **Range**: 0-100
- **Oversold**: MFI < 35
- **Overbought**: MFI > 80
- RSI equivalent that incorporates trading volume.

### Bollinger Bands
- 20-day Moving Average ± 1 Standard Deviation.
- Lower Band Touch: Oversold signal.
- Upper Band Touch: Overbought signal.

### Fear & Greed Index
- **0-25**: Extreme Fear
- **25-45**: Fear
- **45-55**: Neutral
- **55-75**: Greed
- **75-100**: Extreme Greed

### VIX (Volatility Index)
- **< 15**: Low Volatility
- **15-20**: Normal Volatility
- **20-30**: High Volatility
- **> 30**: Extreme Volatility

### Put/Call Ratio
- **> 1.0**: Extreme Fear
- **0.8-1.0**: Fear
- **< 0.8**: Neutral

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.1.1, React 19.2.3, TypeScript
- **Styling**: Global CSS (globals.css)
- **API**: Next.js API Routes
- **Storage**: 
  - Vercel KV (Upstash Redis) - Preset synchronization.
  - localStorage - Client ticker list cache.
- **Data Sources**:
  - Yahoo Finance API (Price data, VIX, Put/Call Ratio).
  - CNN Fear & Greed Index API.
- **Deployment**: Vercel

---

## 📁 Project Structure

```
stock-vercel/
├── app/
│   ├── api/
│   │   ├── analyze/          # Price analysis API
│   │   ├── market-indicators/ # Market indicator API
│   │   ├── presets/          # Preset management API (Vercel KV)
│   │   ├── tickers/          # Ticker management API (In-memory)
│   │   └── debug/            # Data verification API
│   ├── page.tsx              # Main page (Client Component)
│   ├── layout.tsx            # Layout
│   └── globals.css           # Global styles
├── docs/
│   ├── AGENTS.md             # Project guidelines
│   └── README.md             # User documentation
├── public/
│   └── preset_tickers.json   # Default presets (Backup)
└── package.json
```

---

## 🔧 API Endpoints

### POST /api/analyze
Execute stock analysis (Based on Adjusted Close price)

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

**Features:**
- Indicator calculation based on Adjusted Close price.
- API block prevention: User-Agent rotation, sequential processing.
- Clear guidance messages on 429 error.

### GET /api/market-indicators
Retrieve market indicators.

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
Data verification (Retrieve raw Yahoo Finance data).

**Query Parameters:**
- `ticker`: Ticker symbol (Required).
- `days`: Number of days to retrieve (Default: 30).

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

**Purpose:**
- Verify raw Yahoo Finance data.
- Validate calculated indicators (RSI, MFI, BB).
- Compare with other platforms like Toss Securities.

---

## 🎨 Key Characteristics

### Automatic Ticker Format Conversion
- `BRK.B` → `BRK-B` automatic conversion for enhanced Yahoo Finance API compatibility.

### Preset Tickers
- Provides presets for 360 popular stocks, including S&P 500, Nasdaq, and sector leaders.

### Preset Synchronization
- Server storage of presets via Vercel KV (Upstash Redis).
- "💾 Save Presets": Save the current ticker list to the server.
- "📥 Load Presets": Replace with server-stored presets.
- Enables consistent preset availability across PC and mobile.

### 🛡️ Enhanced Data Integrity & Reliability
- **Adjusted Close 반영**: Accuracy is improved by calculating indicators using prices that reflect dividends and splits.
- **API Block Prevention**: 
  - Client-side sequential processing and delay logic (0.5s per ticker).
  - Server-side sequential processing and delay logic (1s per request).
  - User-Agent Rotation (3 browser user-agents).
  - Clear guidance on 429 Too Many Requests.
- **Data Verification Tool**: Verify raw Yahoo Finance data and calculated indicators in table format under the '🔍 Data Verification' tab.
  - Daily bar data (Open/High/Low/Close, Adj Close, Volume).
  - Calculated indicators (RSI, MFI, Bollinger Bands).
  - Comparison with other platforms.

### ⚡ Performance Optimization
- **Memory Cache**: Fast responses via 5-minute TTL caching for repeated ticker requests.
- **CSS Optimization**: Improved rendering and maintainability through the use of Global CSS.
- **Progress Monitoring**: Real-time progress bar for batch ticker analysis.
- **Ticker List Optimization**: UI optimized for 10+ tickers with a "See More" feature.
- **Finnhub Fallback**: Automatic transition during Yahoo Finance 429 errors.

---

## 📝 Usage

1. **Add Ticker**: Input ticker symbol (e.g., AAPL) in the top input and press Enter or click "Add".
2. **Load Presets**: Click "📥 Load Presets" to replace with server-stored presets.
3. **Save Presets**: After editing, click "💾 Save Presets" to sync across all devices.
4. **Run Analysis**: Click "🚀 Run Analysis" (Progress displayed).
5. **Check Results**: 
   - 🎯 Triple Signal Tab: RSI < 35 AND MFI < 35 AND BB Lower touch.
   - 📊 Bollinger Bands Tab: BB Lower touch detections.
   - 🔍 Data Verification Tab: Verify raw data and calculated indicators.

---

## 🔍 Troubleshooting

### API Errors
- Yahoo Finance API may occasionally trigger rate limits.
- Analysis time increases with the number of tickers.

### Missing Data
- Some tickers may lack sufficient historical data.
- A minimum of 20 days of historical data is required.

---

## 📄 License
MIT License

**⚠️ Disclaimer**: This tool is for educational and informational purposes only. Investment decisions should be made at your own risk, and you should not rely solely on the analysis results provided by this tool.
