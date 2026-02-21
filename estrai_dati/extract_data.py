import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import re
import os

dir_base = os.path.dirname(__file__)

# girone-b / premier-league / ecc
CAMPIONATO_CORRENTE = "girone-b"
CLASSIFICA_URL = f"https://www.amatoricassino.it/{CAMPIONATO_CORRENTE}/classifica"
CALENDARIO_URL = f"https://www.amatoricassino.it/{CAMPIONATO_CORRENTE}/calendario"

CLASSIFICA_OUTPUT_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", f"classifica_{CAMPIONATO_CORRENTE}.json"))
CALENDARIO_OUTPUT_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", f"calendario_{CAMPIONATO_CORRENTE}.json"))
BONUS_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", "rosa.json"))
NOTE_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", "note"))
TEAM_NAME = "Amatori Lenola 2023"

def clean_int(text):
    return int(text.strip().replace("+", ""))


def scrape_classifica():
    response = requests.get(CLASSIFICA_URL, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    table = soup.select_one("table.classifica-table")
    if not table:
        raise RuntimeError("Tabella classifica non trovata")

    rows = table.select("tbody tr.team-row")

    classifica = []

    for row in rows:
        tds = row.find_all("td")

        # --- colonna squadra ---
        team_info = tds[0]
        posizione = clean_int(team_info.select_one(".position-number").text)
        nome = team_info.select_one(".team-name").text.strip()

        logo_tag = team_info.select_one("img")
        logo = logo_tag["src"] if logo_tag else None

        # --- statistiche ---
        punti = clean_int(tds[1].text)
        giocate = clean_int(tds[2].text)
        vinte = clean_int(tds[3].text)
        pareggi = clean_int(tds[4].text)
        perse = clean_int(tds[5].text)
        gf = clean_int(tds[6].text)
        gs = clean_int(tds[7].text)
        dr = clean_int(tds[8].text)

        # classe css (champions / europa / ecc.)
        classe = " ".join(row.get("class", []))

        classifica.append({
            "posizione": posizione,
            "squadra": nome,
            "logo": logo,
            "punti": punti,
            "giocate": giocate,
            "vinte": vinte,
            "pareggi": pareggi,
            "perse": perse,
            "gf": gf,
            "gs": gs,
            "dr": dr,
            "classe_css": classe
        })

    output = {
        "girone": "B",
        "aggiornato_al": datetime.utcnow().isoformat() + "Z",
        "squadre": classifica
    }

    with open(CLASSIFICA_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)



def scrape_calendar():
    team_name = "Amatori Lenola 2023"
    response = requests.get(CALENDARIO_URL, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    played_matches = []
    upcoming_matches = []

    day_cards = soup.select(".site-card")

    for card in day_cards:
        header = card.select_one(".day-card-header")
        if not header:
            continue

        # giornata
        title = header.select_one(".day-title").get_text(strip=True)
        giornata_match = re.search(r"Giornata\s+(\d+)", title)
        giornata = int(giornata_match.group(1)) if giornata_match else None

        # data
        date_el = header.select_one(".day-meta")
        data = None
        if date_el:
            data_match = re.search(r"Data:\s*([\d-]+)", date_el.get_text())
            if data_match:
                data = data_match.group(1)

        rows = card.select("tbody tr.match-row")

        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 5:
                continue

            squadra_casa = cols[0].get_text(strip=True)
            risultato = cols[1].get_text(strip=True)
            squadra_trasferta = cols[2].get_text(strip=True)
            campo = cols[3].get_text(strip=True)
            # stato = cols[4].get_text(strip=True)

            # filtro squadra
            if team_name.lower() not in (
                squadra_casa.lower() + squadra_trasferta.lower()
            ):
                continue

            match_data = {
                "girone": "B",
                "giornata": giornata,
                "data": data,
                "casa": squadra_casa,
                "trasferta": squadra_trasferta,
                "risultato": risultato,
                "campo": campo,
                # "stato": stato
            }

            # partita giocata? (risultato tipo "2 - 1")
            score_match = re.search(r"(\d+)\s*-\s*(\d+)", risultato)

            if score_match:
                gol_casa = int(score_match.group(1))
                gol_trasferta = int(score_match.group(2))

                is_home = team_name.lower() == squadra_casa.lower()
                is_away = team_name.lower() == squadra_trasferta.lower()

                if gol_casa == gol_trasferta:
                    esito = "D"
                elif (is_home and gol_casa > gol_trasferta) or (is_away and gol_trasferta > gol_casa):
                    esito = "W"
                else:
                    esito = "L"

                match_data["esito"] = esito
                played_matches.append(match_data)

            else:
                upcoming_matches.append(match_data)

    d = {
        "team": team_name,
        "played": played_matches,
        "upcoming": upcoming_matches
    }


    # Scrittura JSON
    with open(CALENDARIO_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)



# ── helpers ────────────────────────────────────────────────────────────────────

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def get_last_match(calendario):
    played = calendario.get("played", [])
    if not played:
        raise RuntimeError("Nessuna partita giocata trovata nel calendario.")
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
            # ricerca parziale case-insensitive
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


# ── flusso principale ───────────────────────────────────────────────────────────

def aggiorna_bonus():
    bonus = load_json(BONUS_FILE)
    calendario = load_json(CALENDARIO_OUTPUT_FILE)
    match = get_last_match(calendario)

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

    # Dizionario per raccogliere le modifiche da applicare alla fine
    changes = {
        "portiere": None,
        "gol": [],      # lista di (scorer, assister_or_None)
        "ammoniti": [],
        "espulsi": [],
        "mvp": None,
    }

    # ── PORTIERE ──────────────────────────────────────────────────────────────
    print("── PORTIERE ─────────────────────────────────────────")
    show_players(bonus)
    changes["portiere"] = pick_player(bonus, "\nChi ha giocato in porta? ")
    if clean_sheet:
        print(f"  → {changes['portiere']} ottiene un CLEAN SHEET ✓")
    else:
        print(f"  → {changes['portiere']} selezionato (nessun clean sheet)")

    # ── GOL ───────────────────────────────────────────────────────────────────
    print(f"\n── GOL ({n_gol} da assegnare) ────────────────────────────")
    for i in range(1, n_gol + 1):
        print(f"\n  Gol {i}/{n_gol}:")
        show_players(bonus)
        scorer = pick_player(bonus, "  Chi ha segnato? ")
        assister = pick_player(bonus, "  Chi ha assistito? (invio = nessuno): ", allow_empty=True)
        changes["gol"].append((scorer, assister))

    # ── AMMONIZIONI / ESPULSIONI ──────────────────────────────────────────────
    print("\n── AMMONIZIONI ──────────────────────────────────────")
    show_players(bonus)
    changes["ammoniti"] = pick_players_multi(
        bonus, "\nGiocatori ammoniti? (numeri/nomi separati da virgola, invio = nessuno): "
    )
    if changes["ammoniti"]:
        print("\n── ESPULSIONI ───────────────────────────────────────")
        print("  (solo tra gli ammoniti o dirette)")
        changes["espulsi"] = pick_players_multi(
            bonus, "Giocatori espulsi? (invio = nessuno): "
        )

    # ── MVP ───────────────────────────────────────────────────────────────────
    print("\n── MVP ARMATORI TV ──────────────────────────────────")
    show_players(bonus)
    changes["mvp"] = pick_player(bonus, "\nMVP? (invio = nessuno): ", allow_empty=True)

    # ── RIEPILOGO ─────────────────────────────────────────────────────────────
    lines = []
    lines.append("═" * 50)
    lines.append("  RIEPILOGO")
    lines.append("═" * 50)
    lines.append(f"  Partita  : {match['casa']} {match['risultato']} {match['trasferta']} (G{match['giornata']} - {match['data']})")
    lines.append(f"  Portiere : {changes['portiere']}" + (" [CLEAN SHEET]" if clean_sheet else ""))
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

    # ── APPLICAZIONE MODIFICHE ────────────────────────────────────────────────
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
    print("\n  ✓ Bonus aggiornati e salvati correttamente!")
    print("═" * 50 + "\n")

    # ── SALVA RIEPILOGO IN NOTE ────────────────────────────────────────────────
    salva_riepilogo(riepilogo)




if __name__ == "__main__":
    scrape_classifica()
    scrape_calendar()
    aggiorna_bonus()
