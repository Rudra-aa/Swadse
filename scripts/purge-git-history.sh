#!/usr/bin/env bash
# Removes known leaked key patterns from ALL git history.
# Requires: pip install git-filter-repo  OR  brew install git-filter-repo
#
# WARNING: Rewrites history. All collaborators must re-clone after force-push.
set -euo pipefail
cd "$(dirname "$0")/.."

REPLACEMENTS="$(mktemp)"
cat > "$REPLACEMENTS" <<'EOF'
literal:AIzaSyDUzxbFYmIsvuueslhdzZ4bDQKAMAULZE0==>REDACTED_FIREBASE_KEY
literal:AIzaSyBqm3WSzAPGOQgUAd73bHtKY2VY1dXGj24==>REDACTED_FIREBASE_KEY_OLD
literal:AIzaSyAECHdP5_6EpsPPY1Jf4MWBAPgHmyaXfsI==>REDACTED_GEMINI_KEY
literal:SwadseAdmin123==>REDACTED_PASSWORD
EOF

if ! command -v git-filter-repo &>/dev/null; then
  echo "Install git-filter-repo first:"
  echo "  pip install git-filter-repo"
  echo "  # or: brew install git-filter-repo"
  exit 1
fi

echo "This will rewrite git history. Press Ctrl+C to cancel, Enter to continue."
read -r _

git filter-repo --force --replace-text "$REPLACEMENTS"

rm -f "$REPLACEMENTS"
echo "Done. Force-push with: git push origin main --force"
echo "Then rotate all REDACTED keys in Firebase, Razorpay, and Google Cloud consoles."
