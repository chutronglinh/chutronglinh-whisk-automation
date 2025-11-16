#!/bin/bash
# Quick Git Push Script (for Windows Git Bash)

if [ -z "$1" ]; then
    echo "Usage: ./scripts/git-push.sh \"Your commit message\""
    exit 1
fi

echo "🔍 Checking for changes..."
git status

echo ""
read -p "Continue with commit? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Push cancelled"
    exit 0
fi

echo ""
echo "📦 Adding all changes..."
git add .

echo "💬 Committing with message: $1"
git commit -m "$1"

echo "🚀 Pushing to origin main..."
git push origin main

echo ""
echo "✅ Push complete!"
echo ""
echo "📝 Next steps on server:"
echo "   cd /opt/whisk-automation"
echo "   ./deployment/deploy.sh"