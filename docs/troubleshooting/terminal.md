# PowerShell Terminal Troubleshooting

### Terminal Output Truncation (e.g., Git commands)

**Symptoms:**
When running Git commands or commands with long output, the output is truncated or line breaks are displayed incorrectly:
```
On branch main
Your branch is up to date with 'origin/mai
                                         es present
```

**Cause:**
1. PowerShell console width limit (default 80-120 characters)
2. Output buffer size limit
3. UTF-8 encoding handling issues (especially with Korean paths)

**Resolution:**
Expand the console width using the following script (often automated via workspace initialization):

```powershell
# Expand console width to prevent output truncation
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
    Write-Warning "Failed to set console width (Normal in some environments)"
}

# Optimize Git configuration
git config --global core.pager ""
git config --global color.ui auto
```

**Verification:**
```powershell
# Check console width
$Host.UI.RawUI.BufferSize

# Test Git output
git status
git log -n 5 --oneline
```
