#!/bin/bash
set -ex

# ── aggiorna i branch ────────────────────────────────────────
git checkout master
git pull
git checkout develop
git pull

# ── esegui lo scraper ────────────────────────────────────────
cd ./estrai_dati

if [[ ! -d .venv ]]; then
    echo "creo venv"
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

python aggiorna_dati.py
deactivate
cd ..

# ── committa solo se ci sono modifiche ───────────────────────
if [[ -n $(git status --porcelain) ]]; then
    git add .
    git commit -m "aggiornamento dati - script"
    git push
else
    echo "Nessuna modifica ai dati, skip commit."
fi

# ── merge su master ──────────────────────────────────────────
git checkout master
git merge develop
git push
git checkout develop  # torna su develop per i lavori futuri