import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import re

CLASSIFICA_URL = "https://www.amatoricassino.it/girone-b/classifica"
CLASSIFICA_OUTPUT_FILE = "../classifica_girone_b.json"
CALENDARIO_URL = "https://www.amatoricassino.it/girone-b/calendario"
CALENDARIO_OUTPUT_FILE = "../calendario_girone_b.json"


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

    print(f"Classifica salvata in {CLASSIFICA_OUTPUT_FILE}")




import requests
import re
from bs4 import BeautifulSoup

CALENDARIO_URL = "https://www.amatoricassino.it/girone-b/calendario"

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



if __name__ == "__main__":
    # scrape_classifica()
    scrape_calendar()
