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

:: Use WScript.Shell.Run with SW_HIDE (0) to suppress window creation at the OS level.
:: mshta executes VBScript inline without a visible window, making this a true zero-flash bridge.
mshta vbscript:Execute("CreateObject(""WScript.Shell"").Run(""%RUNNER% -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File """"%PS_FILE%"""" %*"", 0, False):close()")

exit /b 0