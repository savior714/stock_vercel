# 📈 Stock Analysis (Native App)

A professional stock analysis application for **Tauri (Desktop) & Android (Mobile)** based on real-time price analysis and technical indicators (RSI, MFI, Bollinger Bands).

---

## 🎯 Project Overview

To overcome the CORS constraints of web browsers and the Rate Limits of serverless environments, this project has transitioned to a **Native-only App** that performs direct data analysis based on the Rust backend (Tauri) and Native HTTP (Android).

### Supported Platforms

| Platform | Method | CORS Bypass | Analysis Engine |
|---|---|---|---|
| 🖥️ **Desktop (Tauri)** | ✅ **Main** | Rust Backend (High-speed) | Transparent overlay, click-through, system title bar removal |
| 📱 **Mobile (Android)** | ✅ Secondary | CapacitorHttp | Background analysis, mobile check-up |
| 🌐 **Web (Vercel)** | ❌ Discontinued | - | `npm run build` is only a step for generating Tauri UI |

---

## 🚀 Key Features

### 🎯 Triple Signal Analysis
- **Condition**: RSI < 30 AND MFI < 30 AND Bollinger Bands Lower Touch
- Accurate indicator calculation based on Adjusted Close price (reflecting dividends/splits)

### 📊 Technical Indicators
- **RSI (14 days)**: < 30 Oversold, > 70 Overbought
- **MFI (14 days)**: Volume-weighted indicator, < 30 Oversold
- **Bollinger Bands**: 20-day Moving Average ± 1 Standard Deviation

### 📈 Market Sentiment Indicators (Real-time)
- **Fear & Greed Index**: Linked with CNN Real-time Score
- **VIX Volatility Index**: Real-time tracking based on Yahoo Finance ^VIX
- **Put/Call Ratio**: Market fear/greed sentiment analysis

### 💡 User Experience (UX) Philosophy
- **Simplicity**: Removed complex charts/graphs to focus strictly on **"Buy Signals"**
- **Direct Link**: Click results to immediately navigate to the **[Toss Securities](https://tossinvest.com)** page
- **No Distraction**: Does not use OS notification center (Push). Quietly check status on the overlay.

### 🌓 Transparent Overlay & Click-Through (New)
- **Overlay Mode**: When the window loses focus, the background becomes transparent and mouse clicks are passed through to the window below (No distractions during gaming/video watching).
- **Active Mode**: Clicking the app or switching via Alt+Tab makes the background opaque and interactive.

### 🔄 Presets & GitHub Synchronization
- **GitHub Sync**: Centralized management via `presets.json`
- **Auto Push**: Automatically performs `git commit & push` when presets are modified in the app.

---

## 📂 Project Structure

```
stock-vercel/
├── src/app/                # Next.js App Router (UI Layer)
├── src/components/         # UI Components
├── src/hooks/              # Native Analysis Logic (Logic Layer)
├── src/lib/api-client/     # Platform-specific API Client (Tauri/Android)
├── src-tauri/              # Tauri Rust Backend (High-speed Analysis)
├── android/                # Capacitor Android Project
└── presets.json            # Preset Data (GitHub Sync Source)
```

---

## 📦 Installation & Execution

### 🖥️ Tauri Desktop App (Windows/macOS/Linux)
```bash
npm install
npx tauri dev
```

### 📱 Android APK Build
```bash
# Static build and synchronization
npm run cap:sync

# Build APK or run directly in Android Studio
npx cap open android
```

---

## 🔍 Troubleshooting

### 429 Too Many Requests (Yahoo Finance)
Native apps communicate directly without passing through a server, so there is no CORS, but Yahoo Finance may temporarily block frequent requests.
- Adjust analysis intervals or split the ticker list for analysis.
- Built-in User-Agent rotation feature.

### Git Push Failure (Saving Tauri Presets)
- Git must be installed on your PC.
- Commit/Push permissions must be configured for the repository.

---

## 📄 License
MIT License

**⚠️ Disclaimer**: This tool is for educational and informational purposes only. Investment decisions should be made at your own risk, and you should not rely solely on the analysis results provided by this tool.
