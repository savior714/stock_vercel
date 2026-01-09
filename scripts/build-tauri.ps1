# Tauri 빌드 자동화 스크립트
# 사용법: .\scripts\build-tauri.ps1

Write-Host "=== Tauri Build Automation Script ===" -ForegroundColor Cyan
Write-Host ""

# 프로젝트 루트로 이동
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# 1. 사전 요구사항 확인
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

# Node.js 확인
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Rust 확인
try {
    $rustVersion = rustc --version
    Write-Host "  ✓ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Rust not found. Please install Rust from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Visual Studio Build Tools 확인 (링커)
try {
    $linker = where.exe link.exe 2>$null
    if ($linker) {
        Write-Host "  ✓ Visual Studio Build Tools: link.exe found" -ForegroundColor Green
    } else {
        throw "link.exe not found"
    }
} catch {
    Write-Host "  ✗ Visual Studio Build Tools not found" -ForegroundColor Red
    Write-Host "    Please install from: https://visualstudio.microsoft.com/downloads/" -ForegroundColor Yellow
    Write-Host "    Select 'Desktop development with C++' workload" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. API 디렉토리 백업
Write-Host "[2/7] Backing up API directory..." -ForegroundColor Yellow

if (Test-Path "app/api") {
    Move-Item "app/api" "api_backup" -Force
    Write-Host "  ✓ Moved app/api → api_backup" -ForegroundColor Green
} else {
    Write-Host "  ⚠ app/api not found (already backed up?)" -ForegroundColor Yellow
}

Write-Host ""

# 3. 빌드 디렉토리 정리
Write-Host "[3/7] Cleaning build directories..." -ForegroundColor Yellow

Remove-Item ".next", "out" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  ✓ Cleaned .next and out directories" -ForegroundColor Green

Write-Host ""

# 4. Next.js 정적 빌드
Write-Host "[4/7] Building Next.js static export..." -ForegroundColor Yellow

$env:TAURI_ENV = "true"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Next.js build failed!" -ForegroundColor Red
    
    # API 복원
    if (Test-Path "api_backup") {
        Move-Item "api_backup" "app/api" -Force
        Write-Host "  ✓ Restored app/api" -ForegroundColor Green
    }
    
    exit 1
}

Write-Host "  ✓ Next.js build completed" -ForegroundColor Green

# 빌드 결과 확인
if (Test-Path "out/index.html") {
    Write-Host "  ✓ Static export verified (out/index.html exists)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Static export failed (out/index.html not found)" -ForegroundColor Red
    
    # API 복원
    if (Test-Path "api_backup") {
        Move-Item "api_backup" "app/api" -Force
    }
    
    exit 1
}

Write-Host ""

# 5. Tauri 빌드
Write-Host "[5/7] Building Tauri application..." -ForegroundColor Yellow
Write-Host "  (This may take 5-15 minutes on first build)" -ForegroundColor Cyan

npx tauri build

$tauriExitCode = $LASTEXITCODE

Write-Host ""

# 6. API 디렉토리 복원
Write-Host "[6/7] Restoring API directory..." -ForegroundColor Yellow

if (Test-Path "api_backup") {
    Move-Item "api_backup" "app/api" -Force
    Write-Host "  ✓ Restored api_backup → app/api" -ForegroundColor Green
} else {
    Write-Host "  ⚠ api_backup not found" -ForegroundColor Yellow
}

Write-Host ""

# 7. 빌드 결과 확인
Write-Host "[7/7] Verifying build results..." -ForegroundColor Yellow

if ($tauriExitCode -ne 0) {
    Write-Host "  ✗ Tauri build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Visual Studio Build Tools not installed" -ForegroundColor Yellow
    Write-Host "  2. Rust version incompatible" -ForegroundColor Yellow
    Write-Host "  3. Cargo cache corrupted (try: cd src-tauri && cargo clean)" -ForegroundColor Yellow
    exit 1
}

# 실행 파일 확인
$exeFiles = Get-ChildItem "src-tauri/target/release/*.exe" -ErrorAction SilentlyContinue

if ($exeFiles) {
    Write-Host "  ✓ Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Executable files:" -ForegroundColor Cyan
    foreach ($file in $exeFiles) {
        $size = [math]::Round($file.Length / 1MB, 2)
        Write-Host "  - $($file.Name) ($size MB)" -ForegroundColor White
        Write-Host "    $($file.FullName)" -ForegroundColor Gray
    }
    
    # 인스톨러 확인
    $msiFiles = Get-ChildItem "src-tauri/target/release/bundle/msi/*.msi" -ErrorAction SilentlyContinue
    $nsisFiles = Get-ChildItem "src-tauri/target/release/bundle/nsis/*.exe" -ErrorAction SilentlyContinue
    
    if ($msiFiles -or $nsisFiles) {
        Write-Host ""
        Write-Host "Installers:" -ForegroundColor Cyan
        
        foreach ($file in $msiFiles) {
            $size = [math]::Round($file.Length / 1MB, 2)
            Write-Host "  - $($file.Name) ($size MB)" -ForegroundColor White
        }
        
        foreach ($file in $nsisFiles) {
            $size = [math]::Round($file.Length / 1MB, 2)
            Write-Host "  - $($file.Name) ($size MB)" -ForegroundColor White
        }
    }
} else {
    Write-Host "  ⚠ No executable files found in src-tauri/target/release/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Cyan
