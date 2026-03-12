@echo off
rem [Antigravity] Zero-Flicker Silent Bridge
rem ENCODING: ANSI (CP949) - Do NOT convert to UTF-8

set "PS_FILE=%~dp0dev.ps1"

:: Determine runner: prefer pwsh (PowerShell 7), fallback to powershell.exe
where pwsh >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "RUNNER=pwsh.exe"
) else (
    set "RUNNER=powershell.exe"
)

:: Launch via PowerShell. Removed Hidden/NonInteractive to ensure visibility and error capture.
start "" %RUNNER% -NoProfile -ExecutionPolicy Bypass -File "%PS_FILE%" %*

exit /b 0