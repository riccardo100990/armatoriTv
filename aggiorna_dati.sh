#!/bin/bash
set -e

# ── 1. Sincronizza il repo locale con i dati scaricati da GitHub Actions ──
git checkout develop
git pull origin develop

# ── 2. Esegui la procedura guidata dei bonus ──────────────────────────────
cd ./estrai_dati

python inserisci_bonus.py

# ── 3. Committa e allinea master ───────────────────────────────────────────
if [[ -n $(git status --porcelain) ]]; then
    git add .
    git commit -m "aggiornamento bonus rosa"
    git push origin develop

    # Merge su master
    git checkout master
    git pull origin master
    git merge develop
    git push origin master
    git checkout develop
else
    echo "Nessun bonus modificato, skip commit."
fi