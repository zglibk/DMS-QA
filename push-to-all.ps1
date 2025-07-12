# DMS-QA Multi-Repository Push Script (PowerShell)
# Push to both Gitee and GitHub repositories

param(
    [string]$Branch = "master",
    [switch]$Force = $false
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "DMS-QA Multi-Repository Push Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nCurrent branch: $Branch" -ForegroundColor Cyan

# Check repository status
Write-Host "`nChecking repository status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "Uncommitted changes detected:" -ForegroundColor Yellow
    git status
    Write-Host ""
}

# Check current branch
$currentBranch = git branch --show-current
if ($currentBranch -ne $Branch) {
    Write-Host "Warning: Current branch ($currentBranch) differs from target branch ($Branch)" -ForegroundColor Yellow
}

# Confirmation
if (-not $Force) {
    $confirm = Read-Host "Push branch '$Branch' to both Gitee and GitHub? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Pushing to all remote repositories..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

try {
    # Check remote configuration
    Write-Host "Checking remote configuration..." -ForegroundColor Yellow
    $remotes = git remote -v
    Write-Host $remotes -ForegroundColor Gray
    
    # Push to origin (should push to both repositories if configured correctly)
    Write-Host "`nPushing to origin (both Gitee and GitHub)..." -ForegroundColor Yellow
    git push origin $Branch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Push completed successfully!" -ForegroundColor Green
    } else {
        throw "Git push failed with exit code $LASTEXITCODE"
    }
    
    # Optional: Push tags
    $pushTags = Read-Host "`nPush tags as well? (y/N)"
    if ($pushTags -eq "y" -or $pushTags -eq "Y") {
        Write-Host "Pushing tags..." -ForegroundColor Yellow
        git push origin --tags
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Tags pushed successfully!" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Failed to push tags" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "[ERROR] Push failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nTroubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Check your internet connection" -ForegroundColor White
    Write-Host "2. Verify GitHub repository exists and is accessible" -ForegroundColor White
    Write-Host "3. Check authentication credentials (GitHub token/SSH key)" -ForegroundColor White
    Write-Host "4. Ensure branch exists on remote repositories" -ForegroundColor White
    Write-Host "5. Verify remote URLs are configured correctly:" -ForegroundColor White
    Write-Host "   git remote -v" -ForegroundColor Gray
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Push Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Branch: $Branch" -ForegroundColor Cyan
Write-Host "Status: SUCCESS" -ForegroundColor Green
Write-Host "Repositories updated:" -ForegroundColor Cyan
Write-Host "  - Gitee: https://gitee.com/lbk168/dms-qa" -ForegroundColor White
Write-Host "  - GitHub: https://github.com/YOUR_USERNAME/dms-qa" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
Read-Host
