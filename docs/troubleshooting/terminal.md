# PowerShell 터미널 관련 트러블슈팅

### 터미널 출력 잘림 현상 (Git 명령어 등)

**증상:**
Git 명령어나 긴 출력이 있는 명령어 실행 시 출력이 중간에 잘리거나 줄바꿈이 이상하게 표시됨:
```
On branch main
Your branch is up to date with 'origin/mai
                                         es present
```

**원인:**
1. PowerShell 콘솔 폭 제한 (기본 80-120자)
2. 출력 버퍼 크기 제한
3. UTF-8 인코딩 처리 문제 (한글 경로 포함 시)

**해결 방법:**
`workspace_initializer` 스킬을 사용하여 콘솔 폭을 확장합니다:

```powershell
# 콘솔 폭 확장 (출력 잘림 방지)
try {
    if ($Host.UI.RawUI.BufferSize) {
        $bufferSize = $Host.UI.RawUI.BufferSize
        $bufferSize.Width = 200
        $Host.UI.RawUI.BufferSize = $bufferSize
        
        $windowSize = $Host.UI.RawUI.WindowSize
        $windowSize.Width = [Math]::Min(200, $windowSize.Width)
        $Host.UI.RawUI.WindowSize = $windowSize
    }
} catch {
    Write-Warning "콘솔 폭 설정 실패 (일부 환경에서는 정상)"
}

# Git 설정 최적화
git config --global core.pager ""
git config --global color.ui auto
```

**검증 방법:**
```powershell
# 콘솔 폭 확인
$Host.UI.RawUI.BufferSize

# Git 출력 테스트
git status
git log -n 5 --oneline
```
