#!/usr/bin/env bash
# One-time setup for push reminders. Run it yourself, from the project root:
#
#   bash scripts/push-setup.sh ~/Downloads/<your-firebase-service-account>.json
#
# It signs you in to Vercel in the browser, links this folder to the couch-defector project, copies the
# push settings from .env.local into the project's Production environment, adds the Firebase service
# account, and sets the GitHub secret the hourly trigger sends. Nothing secret is printed or committed.
# Safe to re-run: each value is replaced rather than duplicated.
set -euo pipefail
cd "$(dirname "$0")/.."

SA="${1:-}"
if [ ! -f .env.local ]; then echo "No .env.local here. Run this from the couch-defector folder."; exit 1; fi
if [ -z "$SA" ] || [ ! -f "$SA" ]; then
  echo "Usage: bash scripts/push-setup.sh path/to/firebase-service-account.json"
  echo "Get the file from the Firebase console: Project settings > Service accounts > Generate new private key."
  exit 1
fi

val() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2-; }
vc() { npx --yes vercel@latest "$@"; }

echo "Signing in to Vercel and linking this folder to the project..."
vc link --yes --project couch-defector

for k in VITE_VAPID_PUBLIC_KEY VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT CRON_SECRET; do
  v="$(val "$k")"
  if [ -z "$v" ]; then echo "Missing $k in .env.local"; exit 1; fi
  vc env rm "$k" production --yes >/dev/null 2>&1 || true
  printf '%s' "$v" | vc env add "$k" production >/dev/null
  echo "  set $k"
done

# The service account goes in as one line of JSON.
vc env rm FIREBASE_SERVICE_ACCOUNT production --yes >/dev/null 2>&1 || true
python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))), end="")' "$SA" | vc env add FIREBASE_SERVICE_ACCOUNT production >/dev/null
echo "  set FIREBASE_SERVICE_ACCOUNT"

echo "Setting the GitHub secret for the hourly trigger..."
gh secret set CRON_SECRET --body "$(val CRON_SECRET)"

echo
echo "Done. Tell Claude, and it will redeploy so the app picks up the push key, then run a dry check."
