#!/bin/bash

# Git setup and push script for ClaimFlow
COMMIT_MESSAGE="${1:-Initial commit: Complete ClaimFlow system with AI integration and comprehensive error handling}"

echo "🔧 Setting up Git repository for ClaimFlow..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
fi

# Add remote origin
echo "🔗 Adding remote origin..."
git remote add origin https://github.com/HaloHealthAfrica/claimflow.git 2>/dev/null || \
git remote set-url origin https://github.com/HaloHealthAfrica/claimflow.git

# Add all files
echo "📦 Adding files to Git..."
git add .

# Create initial commit
echo "💾 Creating commit..."
git commit -m "$COMMIT_MESSAGE"

# Set main branch
echo "🌿 Setting up main branch..."
git branch -M main

# Push to GitHub
echo "🚀 Pushing to GitHub..."
if git push -u origin main; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "⚠️  Push failed. You may need to authenticate with GitHub."
    echo "Try running: git push -u origin main"
fi

echo ""
echo "📋 Next steps:"
echo "1. Verify your code is on GitHub: https://github.com/HaloHealthAfrica/claimflow"
echo "2. Deploy to Railway using: ./scripts/deploy.sh"
echo "3. Set up environment variables in Railway dashboard"
echo "4. Configure database and run migrations"
echo ""
echo "🔗 Repository URL: https://github.com/HaloHealthAfrica/claimflow"