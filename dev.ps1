# Antigravity: Unified Development Mode Launcher (Tauri Native + Robust)
# PowerShell 7 (pwsh) based modern development environment script
$ErrorActionPreference = "Stop"

$Title = "[Antigravity] Stock Analysis Tauri Dev"
$Host.UI.RawUI.WindowTitle = $Title

function Write-Header {
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "    Stock Analysis Tauri Dev Mode (uv + npm)       " -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
}

function Check-Tools {
    Write-Host "[1/4] Verifying required development tools..." -ForegroundColor Yellow
    
    $Tools = @("uv", "npm", "cargo")
    foreach ($tool in $Tools) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            Write-Host "[CRITICAL ERROR] '$tool' not found." -ForegroundColor Red
            return $false
        }
    }
    Write-Host "[OK] All required tools are installed." -ForegroundColor Green
    return $true
}

function Sync-Python {
    Write-Host "[2/4] Aligning Python virtual environment and dependencies (uv)." -ForegroundColor Yellow
    if (-not (Test-Path ".venv")) {
        Write-Host "[Antigravity] .venv does not exist. Creating (Prioritizing Python 3.14)..." -ForegroundColor Cyan
        try {
            uv venv --python 3.14
        } catch {
            Write-Host "[WARN] Python 3.14 not found, using default environment." -ForegroundColor Gray
            uv venv
        }
    }
    # uv sync: Precisely reflect dependency changes in .venv
    uv sync
    if ($LASTEXITCODE -ne 0) { throw "An error occurred during 'uv sync' execution." }
}

function Sync-Node {
    Write-Host "[3/4] Verifying Node.js package status..." -ForegroundColor Yellow
    if (-not (Test-Path "node_modules")) {
        Write-Host "[Antigravity] node_modules not found. Starting installation..." -ForegroundColor Cyan
        npm install
    }
}

function Run-App {
    Write-Host "[4/4] Launching Tauri desktop app in development mode..." -ForegroundColor Yellow
    npm run tauri:dev
}

try {
    Write-Header
    if (Check-Tools) {
        Sync-Python
        Sync-Node
        Run-App
    }
} catch {
    Write-Host "`n[CRITICAL ERROR] Unable to proceed with the task: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the cause and run again."
    pause
    exit 1
}

Write-Host "`n[Antigravity] Development server terminated successfully." -ForegroundColor Green
pause
exit 0
