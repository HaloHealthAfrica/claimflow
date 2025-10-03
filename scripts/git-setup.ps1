# Git setup and push script for ClaimFlow
param(
    [string]$CommitMessage = "Initial commit: Complete ClaimFlow system with AI integration and comprehensive error handling"
)

Write-Host "🔧 Setting up Git repository for ClaimFlow..." -ForegroundColor Green

# Check if git is installed
try {
    git --version | Out-Null
} catch {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

# Initialize git repository if not already initialized
if (-not (Test-Path ".git")) {
    Write-Host "📁 Initializing Git repository..." -ForegroundColor Blue
    git init
}

# Add remote origin
Write-Host "🔗 Adding remote origin..." -ForegroundColor Blue
git remote add origin https://github.com/HaloHealthAfrica/claimflow.git

# Or update existing remote
git remote set-url origin https://github.com/HaloHealthAfrica/claimflow.git

# Add all files
Write-Host "📦 Adding files to Git..." -ForegroundColor Blue
git add .

# Create initial commit
Write-Host "💾 Creating commit..." -ForegroundColor Blue
git commit -m "$CommitMessage"

# Set main branch
Write-Host "🌿 Setting up main branch..." -ForegroundColor Blue
git branch -M main

# Push to GitHub
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Blue
try {
    git push -u origin main
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Push failed. You may need to authenticate with GitHub." -ForegroundColor Yellow
    Write-Host "Try running: git push -u origin main" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify your code is on GitHub: https://github.com/HaloHealthAfrica/claimflow" -ForegroundColor White
Write-Host "2. Deploy to Railway using: .\scripts\deploy.ps1" -ForegroundColor White
Write-Host "3. Set up environment variables in Railway dashboard" -ForegroundColor White
Write-Host "4. Configure database and run migrations" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Repository URL: https://github.com/HaloHealthAfrica/claimflow" -ForegroundColor Cyan