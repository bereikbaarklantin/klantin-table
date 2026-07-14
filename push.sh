#!/bin/bash
# Push FASE 1-5 naar GitHub
# Draai dit script vanuit de bestelsysteem-saas map in Terminal

set -e

# Verwijder stale lock files
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

# Stage alle wijzigingen
git add -A

# Commit
git commit -m "FASE 5: Production readiness

- Skeleton loaders op keuken, bediening, manager en gastpagina
- Supabase Realtime: tenant-filtered subscriptions + auto-reconnect
- ConnectionDot status indicator op alle staff screens
- ErrorBoundary + OfflineBanner (global in layout)
- useLive hook: error state + retry-drempel
- Duplicate order prevention (idempotency key, 5s window)
- Optimistic UI op OrderTicket (instant visuele feedback)
- Zero TypeScript errors"

# Push
git push origin main

echo ""
echo "✅ Push geslaagd! Vercel bouwt automatisch."
echo "Check: https://github.com/bereikbaarklantin/klantin-table"
