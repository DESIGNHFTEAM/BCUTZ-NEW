#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# BCUTZ — Prepare project for a clean first commit in a new GitHub repo
#
# Usage:
#   1. Clone or copy the project into a fresh directory (no .git)
#   2. Run: bash scripts/prepare-clean-repo.sh
#   3. Then: git init && git add . && git commit -m "Initial commit"
#   4. Push to your new GitHub repo
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🧹 BCUTZ — Clean repo preparation"
echo ""

# ── 1. Remove old .git if present ──────────────────────────────────
if [ -d ".git" ]; then
  echo "⚠️  Removing existing .git directory..."
  rm -rf .git
fi

# ── 2. Remove .env (must never be committed) ──────────────────────
if [ -f ".env" ]; then
  echo "🔒 Removing .env (secrets stay local only)"
  rm .env
fi

# ── 3. Ensure .gitignore blocks .env and extra lockfiles ──────────
cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules

# Build output
dist
dist-ssr

# Environment (keep .env.example only)
.env
.env.local
.env.*.local
*.local

# Lockfiles — project uses bun (keep bun.lock only)
package-lock.json
bun.lockb
yarn.lock
pnpm-lock.yaml

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Native build output (Capacitor)
ios/
android/

# OS files
Thumbs.db
GITIGNORE
echo "✅ .gitignore updated"

# ── 4. Remove extra lockfiles (keep bun.lock only) ────────────────
[ -f "package-lock.json" ] && rm package-lock.json && echo "🗑  Removed package-lock.json"
[ -f "bun.lockb" ] && rm bun.lockb && echo "🗑  Removed bun.lockb (binary lockfile)"
[ -f "yarn.lock" ] && rm yarn.lock && echo "🗑  Removed yarn.lock"
[ -f "pnpm-lock.yaml" ] && rm pnpm-lock.yaml && echo "🗑  Removed pnpm-lock.yaml"

# ── 5. Verify .env.example exists ─────────────────────────────────
if [ ! -f ".env.example" ]; then
  echo "⚠️  Missing .env.example — creating placeholder"
  cat > .env.example << 'ENVEX'
# BCUTZ Environment Variables
# Copy this file to .env and fill in your values.
# NEVER commit .env to version control.

# Supabase (public/anon keys only — safe for client-side)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="your-project-ref"
ENVEX
fi
echo "✅ .env.example present"

# ── 6. Remove node_modules if present ─────────────────────────────
if [ -d "node_modules" ]; then
  echo "🗑  Removing node_modules (will reinstall fresh)"
  rm -rf node_modules
fi

# ── 7. Summary ────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Project is ready for a clean first commit."
echo ""
echo "Next steps:"
echo "  1. cp .env.example .env   # fill in your real values"
echo "  2. bun install             # install dependencies"
echo "  3. git init"
echo "  4. git add ."
echo "  5. git commit -m 'Initial commit — BCUTZ v1'"
echo "  6. git remote add origin <your-new-repo-url>"
echo "  7. git push -u origin main"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
