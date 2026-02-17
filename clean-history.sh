#!/bin/bash
set -e

echo "🧹 Cleaning git history..."

# Reset to the commit before we added the compromised files
git reset --soft HEAD~1

# Recommit with clean history
git add -A
git commit -m "Add comprehensive documentation and scripts with secure configuration"

# Force push to override the bad commit
git push --force-with-lease

echo "✅ Git history cleaned and pushed!"
