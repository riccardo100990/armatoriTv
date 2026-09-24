import json
import os
import re
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

dir_base = os.path.dirname(__file__)

# girone-b / premier-league / ecc
CAMPIONATO_CORRENTE = "girone-a"
CLASSIFICA_URL = f"https://www.amatoricassino.it/{CAMPIONATO_CORRENTE}/classifica"
CALENDARIO_URL = f"https://www.amatoricassino.it/{CAMPIONATO_CORRENTE}/calendario"

CLASSIFICA_OUTPUT_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", f"classifica_{CAMPIONATO_CORRENTE}.json"))
CALENDARIO_OUTPUT_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", f"calendario_{CAMPIONATO_CORRENTE}.json"))
BONUS_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", "rosa.json"))
NOTE_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", "note"))
TEAM_NAME = "Amatori Lenola 2023"


def clean_int(text):
    return int(text.strip().replace("+", ""))

def fetch_pages_html():
    """Apre un browser headless una sola volta e scarica l'HTML di classifica e calendario."""
    print("Avvio Playwright per il recupero dati...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Scarica HTML Classifica
        print(f"Scaricamento classifica: {CLASSIFICA_URL}")
        page.goto(CLASSIFICA_URL, wait_until="networkidle")
        try:
            page.wait_for_selector("table", timeout=5000)
        except Exception:
            pass
        html_classifica = page.content()

        # 2. Scarica HTML Calendario
        print(f"Scaricamento calendario: {CALENDARIO_URL}")
        page.goto(CALENDARIO_URL, wait_until="networkidle")
        html_calendario = page.content()

        browser.close()
        print("Scaricamento completato.")
        return html_classifica, html_calendario


def scrape_classifica(html_text):
    soup = BeautifulSoup(html_text, "html.parser")

    # Cerca il tag <table> generico se 'table.classifica-table' fallisce
    table = soup.select_one("table.classifica-table") or soup.select_one("table")
    if not table:
        raise RuntimeError("Nessun tag <table> trovato nella pagina della classifica.")

    rows = table.select("tbody tr")
    if not rows:
        rows = table.find_all("tr")[1:]  # Salta l'header se tbody non è presente

    classifica = []

    for row in rows:
        tds = row.find_all("td")
        if len(tds) < 9:
            continue  # Salta righe di intestazione o formattazione errata

        # --- colonna squadra ---
        team_info = tds[0]

        # Recupera la posizione
        pos_el = team_info.select_one(".position-number")
        if pos_el:
            posizione = clean_int(pos_el.text)
        else:
            match_pos = re.search(r"^\d+", team_info.text.strip())
            posizione = int(match_pos.group(0)) if match_pos else 0

        # Recupera il nome squadra
        name_el = team_info.select_one(".team-name")
        if name_el:
            nome = name_el.text.strip()
        else:
            nome = re.sub(r"^\d+\s*", "", team_info.text.strip())

        logo_tag = team_info.select_one("img")
        logo = logo_tag["src"] if logo_tag else None
        if logo and logo.startswith("/"):
            logo = f"https://www.amatoricassino.it{logo}"

        # --- statistiche ---
        punti = clean_int(tds[1].text)
        giocate = clean_int(tds[2].text)
        vinte = clean_int(tds[3].text)
        pareggi = clean_int(tds[4].text)
        perse = clean_int(tds[5].text)
        gf = clean_int(tds[6].text)
        gs = clean_int(tds[7].text)
        dr = clean_int(tds[8].text)

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
        "girone": "A",
        "aggiornato_al": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "squadre": classifica
    }

    with open(CLASSIFICA_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


def scrape_calendar(html_text, nome_squadra="Lenola"):
    soup = BeautifulSoup(html_text, "html.parser")
    upcoming_matches = []
    played_matches = []

    # Seleziona tutte le sezioni delle giornate
    giornate = soup.select("section.am-calendario-giornata")

    for giornata in giornate:
        num_giornata_elem = giornata.select_one(".am-calendario-giornata-numero")
        num_giornata = num_giornata_elem.get_text(strip=True) if num_giornata_elem else ""

        for match in giornata.select("article.am-calendario-match"):
            # Estrai i nomi delle squadre
            team_spans = match.select("span.line-clamp-2")
            if len(team_spans) < 2:
                continue

            home_team = team_spans[0].get_text(strip=True)
            away_team = team_spans[1].get_text(strip=True)

            # Filtro: se la squadra non è in casa o in trasferta, salta subito al prossimo ciclo
            if nome_squadra.lower() not in home_team.lower() and nome_squadra.lower() not in away_team.lower():
                continue

            # URL dettagli partita
            parent_a = match.find_parent("a")
            match_url = parent_a["href"] if parent_a and parent_a.has_attr("href") else ""
            if match_url.startswith("/"):
                match_url = f"https://www.amatoricassino.it{match_url}"

            # Data e ora
            time_elem = match.select_one("time")
            date_time = time_elem.get_text(strip=True) if time_elem else ""

            # Campo da gioco
            campo_elem = match.select_one("span.truncate")
            campo = campo_elem.get_text(strip=True) if campo_elem else ""

            # Stato e Risultato
            badge_elem = match.select_one(".am-calendario-badge")
            status = badge_elem.get_text(strip=True) if badge_elem else ""

            risultato_elem = match.select_one(".am-calendario-risultato")
            risultato = risultato_elem.get_text(strip=True) if risultato_elem else "vs"

            # Formattazione per aggiorna_bonus
            match_data = {
                "giornata": num_giornata,
                "casa": home_team,
                "trasferta": away_team,
                "data": date_time,
                "campo": campo,
                "status": status,
                "risultato": risultato,
                "url": match_url
            }

            # Popola le liste in base allo stato della partita
            if "In programma" in status:
                upcoming_matches.append(match_data)
            else:
                played_matches.append(match_data)

    output = {
        "girone": "A",
        "aggiornato_al": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "upcoming": upcoming_matches,
        "played": played_matches
    }

    with open(CALENDARIO_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


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


# ── flusso principale ───────────────────────────────────────────────────────────

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
    # 1. Recupero HTML in blocco
    html_classifica, html_calendario = fetch_pages_html()

    # 2. Scraping ed esportazione dati
    scrape_classifica(html_classifica)
    scrape_calendar(html_calendario, nome_squadra="Lenola")

    # 3. Interazione utente finale
    aggiorna_bonus()