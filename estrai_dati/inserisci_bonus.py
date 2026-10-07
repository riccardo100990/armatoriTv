import json
import os
import re

dir_base = os.path.dirname(__file__)

CAMPIONATO_CORRENTE = "girone-a"
CALENDARIO_OUTPUT_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", f"calendario_{CAMPIONATO_CORRENTE}.json"))
BONUS_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", "rosa.json"))
NOTE_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", "note"))
TEAM_NAME = "Amatori Lenola 2023"


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_last_match(calendario):
    played = calendario.get("played", [])
    if not played:
        return None
    return played[-1]


def gol_segnati(match):
    score_match = re.search(r"(\d+)\s*-\s*(\d+)", match["risultato"])
    if not score_match:
        return 0
    gol_casa, gol_trasferta = int(score_match.group(1)), int(score_match.group(2))
    is_home = TEAM_NAME.lower() == match["casa"].lower()
    return gol_casa if is_home else gol_trasferta


def gol_subiti(match):
    score_match = re.search(r"(\d+)\s*-\s*(\d+)", match["risultato"])
    if not score_match:
        return 0
    gol_casa, gol_trasferta = int(score_match.group(1)), int(score_match.group(2))
    is_home = TEAM_NAME.lower() == match["casa"].lower()
    return gol_trasferta if is_home else gol_casa


def show_players(players):
    """Mostra lista numerata dei giocatori."""
    for i, name in enumerate(players, 1):
        ruolo = players[name].get("ruolo", "?")
        print(f"  {i:>2}. [{ruolo}] {name}")


def pick_player(players, prompt, allow_empty=False):
    """Selezione singola: numero o nome parziale. Ritorna il nome o None."""
    player_list = list(players.keys())
    while True:
        val = input(prompt).strip()
        if not val and allow_empty:
            return None
        if val.isdigit():
            idx = int(val) - 1
            if 0 <= idx < len(player_list):
                return player_list[idx]
            print("  Numero non valido.")
        else:
            matches = [n for n in player_list if val.lower() in n.lower()]
            if len(matches) == 1:
                return matches[0]
            elif len(matches) > 1:
                print(f"  Ambiguo: {', '.join(matches)}. Sii più specifico.")
            else:
                print("  Nessun giocatore trovato.")


def pick_players_multi(players, prompt):
    """Selezione multipla: numeri o nomi separati da virgola. Ritorna lista nomi."""
    player_list = list(players.keys())
    val = input(prompt).strip()
    if not val:
        return []
    results = []
    for token in [t.strip() for t in val.split(",")]:
        if not token:
            continue
        if token.isdigit():
            idx = int(token) - 1
            if 0 <= idx < len(player_list):
                results.append(player_list[idx])
            else:
                print(f"  Numero {token} non valido, ignorato.")
        else:
            matches = [n for n in player_list if token.lower() in n.lower()]
            if len(matches) == 1:
                results.append(matches[0])
            elif len(matches) > 1:
                print(f"  Ambiguo '{token}': {', '.join(matches)}. Ignorato.")
            else:
                print(f"  '{token}' non trovato, ignorato.")
    return results


def salva_riepilogo(riepilogo):
    with open(NOTE_FILE, 'a', encoding="utf-8") as f:
        f.write(riepilogo + "\n\n")


def aggiorna_bonus():
    try:
        bonus = load_json(BONUS_FILE)
        calendario = load_json(CALENDARIO_OUTPUT_FILE)
    except Exception as e:
        print(f"\n  ⚠ Impossibile caricare i file JSON per i bonus: {e}")
        return

    match = get_last_match(calendario)
    if not match:
        print("\n  ⚠ Nessuna partita giocata (o struttura calendario variata). Bonus non aggiornati.")
        return

    if match.get("bonus_updated"):
        esito = match.get("esito", "?")
        motivo = "turno di riposo" if esito == "R" else "bonus già aggiornati per questa giornata"
        print(f"\n  ⚠ Giornata {match['giornata']}: {motivo}. Nessuna azione necessaria.")
        return

    n_gol = gol_segnati(match)
    n_subiti = gol_subiti(match)
    clean_sheet = n_subiti == 0

    print("\n" + "═" * 50)
    print(f"  AGGIORNAMENTO BONUS — Giornata {match['giornata']}")
    print(f"  {match['casa']} {match['risultato']} {match['trasferta']}")
    print(f"  Data: {match['data']}  |  Campo: {match['campo']}")
    print("═" * 50)
    print(f"  Gol segnati da {TEAM_NAME}: {n_gol}")
    print(f"  Gol subiti: {n_subiti} → clean sheet: {'✓ SÌ' if clean_sheet else '✗ NO'}")
    print()

    changes = {
        "portiere": None,
        "gol": [],
        "ammoniti": [],
        "espulsi": [],
        "mvp": None,
    }

    # ── PORTIERE ──
    print("── PORTIERE ─────────────────────────────────────────")
    show_players(bonus)
    changes["portiere"] = pick_player(bonus, "\nChi ha giocato in porta? ")
    if clean_sheet:
        print(f"  → {changes['portiere']} ottiene un CLEAN SHEET ✓")
    else:
        print(f"  → {changes['portiere']} selezionato (nessun clean sheet)")

    # ── GOL ──
    print(f"\n── GOL ({n_gol} da assegnare) ────────────────────────────")
    for i in range(1, n_gol + 1):
        print(f"\n  Gol {i}/{n_gol}:")
        show_players(bonus)
        scorer = pick_player(bonus, "  Chi ha segnato? ")
        assister = pick_player(bonus, "  Chi ha assistito? (invio = nessuno): ", allow_empty=True)
        changes["gol"].append((scorer, assister))

    # ── AMMONIZIONI / ESPULSIONI ──
    print("\n── AMMONIZIONI ──────────────────────────────────────")
    show_players(bonus)
    changes["ammoniti"] = pick_players_multi(
        bonus, "\nGiocatori ammoniti? (numeri/nomi separati da virgola, invio = nessuno): "
    )

    print("\n── ESPULSIONI ───────────────────────────────────────")
    show_players(bonus)
    print("  (doppio giallo tra gli ammoniti, o rosso diretto per chiunque)")
    changes["espulsi"] = pick_players_multi(
        bonus, "Giocatori espulsi? (invio = nessuno): "
    )

    for name in changes["espulsi"]:
        if name not in changes["ammoniti"]:
            print(f"  ⚠ {name} espulso con rosso diretto (non era tra gli ammoniti)")

    # ── MVP ──
    print("\n── MVP ARMATORI TV ──────────────────────────────────")
    show_players(bonus)
    changes["mvp"] = pick_player(bonus, "\nMVP? (invio = nessuno): ", allow_empty=True)

    # ── RIEPILOGO ──
    lines = [
        "═" * 50,
        "  RIEPILOGO",
        "═" * 50,
        f"  Partita  : {match['casa']} {match['risultato']} {match['trasferta']} (G{match['giornata']} - {match['data']})",
        f"  Portiere : {changes['portiere']}" + (" [CLEAN SHEET]" if clean_sheet else ""),
    ]
    for i, (sc, ass) in enumerate(changes["gol"], 1):
        ass_str = f" (ass. {ass})" if ass else ""
        lines.append(f"  Gol {i}    : {sc}{ass_str}")
    if changes["ammoniti"]:
        lines.append(f"  Ammoniti : {', '.join(changes['ammoniti'])}")
    if changes["espulsi"]:
        lines.append(f"  Espulsi  : {', '.join(changes['espulsi'])}")
    if changes["mvp"]:
        lines.append(f"  MVP      : {changes['mvp']}")
    lines.append("═" * 50)

    riepilogo = "\n".join(lines)
    print(riepilogo)

    confirm = input("Confermi e salvi? (s/n): ").strip().lower()
    if confirm != "s":
        print("  Annullato. Nessuna modifica salvata.")
        return

    # ── APPLICAZIONE MODIFICHE ──
    if changes["portiere"] and clean_sheet:
        bonus[changes["portiere"]]["clean_sheet"] += 1

    for scorer, assister in changes["gol"]:
        if scorer:
            bonus[scorer]["goals"] += 1
        if assister:
            bonus[assister]["assist"] += 1

    for name in changes["ammoniti"]:
        bonus[name]["ammonizioni"] += 1

    for name in changes["espulsi"]:
        bonus[name]["espulsioni"] += 1

    if changes["mvp"]:
        bonus[changes["mvp"]]["mvp_armatori_tv"] += 1

    save_json(BONUS_FILE, bonus)

    match["bonus_updated"] = True
    save_json(CALENDARIO_OUTPUT_FILE, calendario)

    print("\n  ✓ Bonus aggiornati e salvati correttamente!")
    print("═" * 50 + "\n")

    salva_riepilogo(riepilogo)


if __name__ == "__main__":
    aggiorna_bonus()