#!/bin/bash
# Push FASE 6 naar GitHub
# Draai dit script vanuit de bestelsysteem-saas map in Terminal

set -e

# Verwijder stale lock files
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

# Stage alle wijzigingen
git add -A

# Commit
git commit -m "FASE 6: Menu-editor, QR-codes, pilot-checklist

- Menu CRUD: addCategory, updateCategory, deleteCategory in DataAPI
- Menu CRUD: addProduct, updateProduct, deleteProduct in DataAPI
- Beide adapters (Supabase + mock) geïmplementeerd
- MenuEditor in manager dashboard met tabbed UI (bewerken/beschikbaarheid)
- CategoryFormModal + ProductFormModal met allergenen-picker
- QR-code generator per tafel (/manager/qr) met print-layout
- Pilot-checklist (/manager/pilot) met 6 secties, 25 stappen
- Links naar QR-generator en pilot-checklist in manager dashboard
- npm: qrcode.react toegevoegd
- Zero TypeScript errors"

# Push
git push origin main

echo ""
echo "✅ Push geslaagd! Vercel bouwt automatisch."
echo "Check: https://github.com/bereikbaarklantin/klantin-table"
