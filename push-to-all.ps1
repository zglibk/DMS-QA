# DMS-QA Auto Push Script
# Function: Automatically add, commit and push code to all remote repositories
# Author: DMS-QA Team
# Date: 2025-11-08

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

# Generate intelligent commit message function
function Generate-CommitMessage {
    Write-ColorOutput "Analyzing changes to generate commit message..." "Yellow"
    
    # Get git status information
    $statusOutput = git status --porcelain
    $modifiedFiles = @()
    $addedFiles = @()
    $deletedFiles = @()
    $renamedFiles = @()
    
    foreach ($line in $statusOutput) {
        $status = $line.Substring(0, 2)
        $file = $line.Substring(3)
        
        switch ($status.Trim()) {
            "M" { $modifiedFiles += $file }
            "A" { $addedFiles += $file }
            "D" { $deletedFiles += $file }
            "R" { $renamedFiles += $file }
            "??" { $addedFiles += $file }
        }
    }
    
    # Generate commit message based on changes
    $commitParts = @()
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    if ($addedFiles.Count -gt 0) {
        $commitParts += "Add $($addedFiles.Count) new file$(if($addedFiles.Count -gt 1){'s'})"
    }
    
    if ($modifiedFiles.Count -gt 0) {
        $commitParts += "Update $($modifiedFiles.Count) file$(if($modifiedFiles.Count -gt 1){'s'})"
    }
    
    if ($deletedFiles.Count -gt 0) {
        $commitParts += "Delete $($deletedFiles.Count) file$(if($deletedFiles.Count -gt 1){'s'})"
    }
    
    if ($renamedFiles.Count -gt 0) {
        $commitParts += "Rename $($renamedFiles.Count) file$(if($renamedFiles.Count -gt 1){'s'})"
    }
    
    # Check for specific file types and generate more specific messages
    $hasReadme = $statusOutput | Where-Object { $_ -match "README" }
    $hasConfig = $statusOutput | Where-Object { $_ -match "config|\.env|\.json" }
    $hasFrontend = $statusOutput | Where-Object { $_ -match "frontend/|src/|\.vue|\.js|\.css" }
    $hasBackend = $statusOutput | Where-Object { $_ -match "server/|routes/|\.sql" }
    $hasScript = $statusOutput | Where-Object { $_ -match "\.ps1|\.bat|\.sh|scripts/" }
    
    if ($hasReadme) {
        return "docs: Update project documentation - $timestamp"
    } elseif ($hasScript) {
        return "scripts: Update automation scripts - $timestamp"
    } elseif ($hasFrontend -and $hasBackend) {
        return "feat: Update both frontend and backend components - $timestamp"
    } elseif ($hasFrontend) {
        return "feat: Update frontend components - $timestamp"
    } elseif ($hasBackend) {
        return "feat: Update backend components - $timestamp"
    } elseif ($hasConfig) {
        return "config: Update configuration files - $timestamp"
    } elseif ($commitParts.Count -gt 0) {
        return "chore: $($commitParts -join ', ') - $timestamp"
    } else {
        return "chore: Update project files - $timestamp"
    }
}

# Push to remote repositories function
function Push-ToRemotes {
    Write-ColorOutput "Getting remote repository configuration..." "Yellow"
    $remotes = git remote -v
    Write-ColorOutput "Current remote repository configuration:" "Cyan"
    $remotes
    
    Write-ColorOutput "`nStarting push to all remote repositories..." "Yellow"
    
    # Define remote repositories explicitly
    $remoteNames = @("gitee", "github")
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
            # Generate intelligent commit message
            $commitMessage = Generate-CommitMessage
            Write-ColorOutput "Auto-generated commit message: $commitMessage" "Cyan"
            
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