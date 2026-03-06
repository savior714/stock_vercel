@chcp 65001 > nul
@echo off
rem [Antigravity] PowerShell delegation wrapper for UTF-8 compatibility
rem Prioritize PowerShell 7 (pwsh), fallback to Windows PowerShell (powershell)

where pwsh >nul 2>nul
if %ERRORLEVEL% equ 0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
)

if %ERRORLEVEL% neq 0 (
    exit /b %ERRORLEVEL%
)