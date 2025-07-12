@echo off
:: Push to both Gitee and GitHub repositories
:: Usage: push-to-all.bat [branch-name]

echo ========================================
echo DMS-QA Multi-Repository Push Script
echo ========================================

set BRANCH=%1
if "%BRANCH%"=="" set BRANCH=master

echo Current branch: %BRANCH%
echo.

:: Check if there are any changes to commit
git status --porcelain > nul
if %errorlevel% neq 0 (
    echo Checking repository status...
    git status
    echo.
)

:: Ask for confirmation
set /p CONFIRM="Push to both Gitee and GitHub? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo ========================================
echo Pushing to all remote repositories...
echo ========================================

:: Method 1: If using multiple push URLs (recommended)
echo Pushing to origin (both Gitee and GitHub)...
git push origin %BRANCH%

if %errorlevel% equ 0 (
    echo [SUCCESS] Push completed successfully!
) else (
    echo [ERROR] Push failed!
    echo.
    echo Troubleshooting tips:
    echo 1. Check your internet connection
    echo 2. Verify GitHub repository exists
    echo 3. Check authentication credentials
    echo 4. Ensure branch exists on remote
    pause
    exit /b 1
)

echo.
echo ========================================
echo Push Summary
echo ========================================
echo Branch: %BRANCH%
echo Status: SUCCESS
echo Repositories updated:
echo   - Gitee: https://gitee.com/lbk168/dms-qa
echo   - GitHub: https://github.com/zglibk/DMS-QA
echo ========================================

pause
