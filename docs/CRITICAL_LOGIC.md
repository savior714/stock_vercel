# 🧩 CRITICAL_LOGIC (SSOT)

## 🎯 Project Overview: Stock Analysis Native
- **Purpose**: Real-time oversold area detection and alert system based on technical indicators (RSI, MFI, Bollinger Bands).
- **Core Strategy**: Focused on Native (Tauri/Android) environments to bypass CORS constraints, prioritizing **Transparent Overlay (Always On Top)** mode.

## 🏗️ Architecture Principles (3-Layer DDD)
1. **Definition**: Domain models, type definitions, and constants (`src/types/`, `src/constants/`).
2. **Repository**: Data access layer including Tauri (Rust `reqwest`), CapacitorHttp, and GitHub Sync (`src/lib/api/`, `src/lib/storage/`).
3. **Service/Logic**: Business logic layer for indicator calculations, transparency control, and analysis pacing (`src/lib/analysis/`, `src/hooks/`).

## 🛠️ Tech Stack & Environment Standards
- **Frontend**: Next.js 15.1.1 (App Router), React 19.2.3, TypeScript.
- **UI Framework**: Progressive transition to **Ark UI** (Headless UI).
- **Styling**: Vanilla CSS (Optimized for Glassmorphism & Overlays).
- **Native**: Tauri v2 (Rust Backend), Capacitor 8.0 (Android).
- **Python**: 3.14 (uv managed `.venv`) - Data preprocessing and utilities.
- **GitHub Sync**: Inter-device synchronization based on `presets.json` (replacing Vercel KV).

## 📱 Platform Roles & Status
- **Desktop (Tauri)**: Primary platform. Supports transparent overlay, click-through, and automatic GitHub Push.
- **Mobile (Android)**: Secondary platform. Supports CapacitorHttp native communication and background restoration.
- **Web**: Pre-requisite stage for Tauri/Capacitor builds (Avoid direct Vercel deployment for core features).

## 🔄 Data Analysis & Anti-Blocking Logic
- **Triple Signal**: RSI(14) < 30 AND MFI(14) < 30 AND Price touching lower Bollinger Band (20, 1).
- **Data Integrity**: Based on **Adjusted Close** price (reflecting dividends/splits).
- **Anti-Blocking**:
  - User-Agent rotation (10 browser types).
  - Pacing: Server-side 5s (Web), Client-side 0.5s / Tauri 200ms delay.
  - 5-minute memory cache (TTL).
- **GitHub Sync**: Conflict prevention using `git pull --rebase` and atomic file writes.

## 📏 Constraints & UX Principles
- **No Charts**: Visualization excluded for system lightweightness.
- **No OS Notifications**: Quiet discovery approach (No Windows notifications).
- **Direct Links**: Detailed info connects to `tossinvest.com` external links.
- **Overlay First**: Forced transparent mode + click-through on focus out (blur).
