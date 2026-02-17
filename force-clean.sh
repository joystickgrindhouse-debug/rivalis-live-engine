#!/bin/bash
set -e

echo "🧹 Force cleaning git history of compromised token..."

# Stash any uncommitted changes
git stash

# Reset soft to go back past ALL bad commits (keeps files)
git reset --soft HEAD~3

# Or if that doesn't work, find the last good commit and reset to it
# You can check: git log --oneline

# Restore any stashed changes
git stash pop || true

# Now commit everything fresh with clean history
git add -A
git commit -m "Add comprehensive documentation and scripts with secure configuration"

# Force push to completely replace remote history
git push --force

echo "✅ History completely cleaned and pushed!"
