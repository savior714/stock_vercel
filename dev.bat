@chcp 65001 > nul
@echo off
:: Antigravity: 통합 개발 모드 실행기 (Tauri Native)
title [Antigravity] Stock Analysis Tauri Dev
setlocal enabledelayedexpansion

echo ===================================================
echo     Stock Analysis Tauri Dev Mode (uv + npm)
echo ===================================================

:: 1. uv 가상환경 자동 구축 (없을 경우에만 1회 실행)
if not exist ".venv" (
    echo [Antigravity] Python 가상환경(.venv)이 없습니다. 생성 및 동기화 중...
    uv venv --python 3.14
    uv sync
)

:: 2. npm 의존성 자동 체크 (node_modules 없을 경우에만 1회 실행)
if not exist "node_modules" (
    echo [Antigravity] node_modules가 없습니다. 의존성 설치 중...
    npm install
)

:: 3. Tauri 앱 즉시 실행
echo [Antigravity] Tauri 데스크톱 앱을 실행합니다...
npm run tauri:dev

pause
