# DMS-QA Auto Push Script
# Function: Automatically add, commit and push code to all remote repositories
# Author: DMS-QA Team
# Date: 2025-01-15

# Set error handling
$ErrorActionPreference = "Stop"

# Color output function
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Check Git status function
function Check-GitStatus {
    Write-ColorOutput "Checking Git status..." "Yellow"
    $status = git status --porcelain
    if ($status) {
        Write-ColorOutput "Found uncommitted changes:" "Cyan"
        git status --short
        return $true
    } else {
        Write-ColorOutput "Working directory clean, no uncommitted changes." "Green"
        return $false
    }
}

# Add all changes function
function Add-AllChanges {
    Write-ColorOutput "Adding all changes to staging area..." "Yellow"
    git add .
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "All changes added to staging area" "Green"
    } else {
        Write-ColorOutput "Failed to add changes" "Red"
        exit 1
    }
}

# Commit changes function
function Commit-Changes {
    param([string]$CommitMessage)
    
    Write-ColorOutput "Committing changes..." "Yellow"
    git commit -m $CommitMessage
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Changes committed successfully" "Green"
    } else {
        Write-ColorOutput "Commit failed" "Red"
        exit 1
    }
}

# Push to remote repositories function
function Push-ToRemotes {
    Write-ColorOutput "Getting remote repository configuration..." "Yellow"
    $remotes = git remote -v
    Write-ColorOutput "Current remote repository configuration:" "Cyan"
    $remotes
    
    Write-ColorOutput "`nStarting push to all remote repositories..." "Yellow"
    
    # Push to all remote repositories
    $remoteNames = git remote
    foreach ($remote in $remoteNames) {
        Write-ColorOutput "Pushing to $remote..." "Yellow"
        git push $remote master
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Successfully pushed to $remote" "Green"
        } else {
            Write-ColorOutput "Failed to push to $remote" "Red"
        }
    }
}

# Main function
function Main {
    Write-ColorOutput "========================================" "Magenta"
    Write-ColorOutput "    DMS-QA Auto Push Script v2.0" "Magenta"
    Write-ColorOutput "========================================" "Magenta"
    
    try {
        # Check if in Git repository
        if (!(Test-Path ".git")) {
            Write-ColorOutput "Current directory is not a Git repository" "Red"
            exit 1
        }
        
        # Check Git status
        $hasChanges = Check-GitStatus
        
        if ($hasChanges) {
            # Get commit message
            $defaultMessage = "Update project files - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            Write-ColorOutput "`nPlease enter commit message (press Enter for default):" "Yellow"
            Write-ColorOutput "Default message: $defaultMessage" "Gray"
            $commitMessage = Read-Host "Commit message"
            
            if ([string]::IsNullOrWhiteSpace($commitMessage)) {
                $commitMessage = $defaultMessage
            }
            
            # Add all changes
            Add-AllChanges
            
            # Commit changes
            Commit-Changes $commitMessage
        }
        
        # Push to remote repositories
        Push-ToRemotes
        
        Write-ColorOutput "`n========================================" "Magenta"
        Write-ColorOutput "Push operation completed!" "Green"
        Write-ColorOutput "========================================" "Magenta"
        
    } catch {
        Write-ColorOutput "Script execution error: $($_.Exception.Message)" "Red"
        exit 1
    }
    
    Write-ColorOutput "`nPress any key to exit..." "Gray"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Execute main function
Main