@chcp 65001 > nul
@echo off
rem [Antigravity] PowerShell 7 delegation wrapper for UTF-8 compatibility
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
if %ERRORLEVEL% neq 0 (
    exit /b %ERRORLEVEL%
)