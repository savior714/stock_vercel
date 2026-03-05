# Antigravity: 통합 개발 모드 실행기 (Tauri Native + Robust)
# PowerShell 7 (pwsh) 기반 현대적 개발 환경 스크립트
$ErrorActionPreference = "Stop"

$Title = "[Antigravity] Stock Analysis Tauri Dev"
$Host.UI.RawUI.WindowTitle = $Title

function Write-Header {
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "    Stock Analysis Tauri Dev Mode (uv + npm)       " -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
}

function Check-Tools {
    Write-Host "[1/4] 필수 개발 도구 상태를 확인합니다..." -ForegroundColor Yellow
    
    $Tools = @("uv", "npm", "cargo")
    foreach ($tool in $Tools) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            Write-Host "[CRITICAL ERROR] '$tool'을(를) 찾을 수 없습니다." -ForegroundColor Red
            return $false
        }
    }
    Write-Host "[OK] 모든 필수 도구가 설치되어 있습니다." -ForegroundColor Green
    return $true
}

function Sync-Python {
    Write-Host "[2/4] Python 가상환경 및 의존성을 정렬합니다 (uv)." -ForegroundColor Yellow
    if (-not (Test-Path ".venv")) {
        Write-Host "[Antigravity] .venv가 존재하지 않습니다. 생성 중 (Python 3.14 최우선)..." -ForegroundColor Cyan
        try {
            uv venv --python 3.14
        } catch {
            Write-Host "[WARN] Python 3.14를 찾을 수 없어 기본 환경을 사용합니다." -ForegroundColor Gray
            uv venv
        }
    }
    # uv sync: 의존성 변경 사항을 .venv에 정밀 반영
    uv sync
    if ($LASTEXITCODE -ne 0) { throw "uv sync 실행 중 오류가 발생했습니다." }
}

function Sync-Node {
    Write-Host "[3/4] Node.js 패키지 상태를 확인합니다..." -ForegroundColor Yellow
    if (-not (Test-Path "node_modules")) {
        Write-Host "[Antigravity] node_modules가 없습니다. 설치를 시작합니다..." -ForegroundColor Cyan
        npm install
    }
}

function Run-App {
    Write-Host "[4/4] Tauri 데스크톱 앱을 실시간 실행합니다..." -ForegroundColor Yellow
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
    Write-Host "`n[CRITICAL ERROR] 작업을 진행할 수 없습니다: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "원인을 확인한 후 다시 실행해 주십시오."
    pause
    exit 1
}

Write-Host "`n[Antigravity] 개발 서버가 성공적으로 종료되었습니다." -ForegroundColor Green
pause
exit 0
