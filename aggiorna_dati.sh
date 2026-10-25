#!/bin/bash
set -e

# ── 1. Sincronizza master e allinea develop ───────────────────────────────
# Scarica gli ultimi dati scaricati da GitHub Actions su master
git checkout master
git pull origin master

# Passa su develop e importa le novità da master
git checkout develop
git pull origin develop
git merge master -m "Merge master into develop prima di aggiornare i bonus"

# ── 2. Esegui la procedura guidata dei bonus ──────────────────────────────
cd ./estrai_dati

python inserisci_bonus.py

# Torna alla root del progetto (se necessario per il git add)
cd ..

# ── 3. Committa e allinea master ───────────────────────────────────────────
if [[ -n $(git status --porcelain) ]]; then
    git add .
    git commit -m "aggiornamento bonus rosa"
    git push origin develop

    # Merge pulito su master (ora non ci saranno più conflitti)
    git checkout master
    git pull origin master
    git merge develop
    git push origin master
    git checkout develop
else
    echo "Nessun bonus modificato, skip commit."
fi

