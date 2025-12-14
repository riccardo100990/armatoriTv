import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

URL = "https://www.amatoricassino.it/girone-b/classifica"
OUTPUT_FILE = "../classifica_girone_b.json"


def clean_int(text):
    return int(text.strip().replace("+", ""))


def scrape_classifica():
    response = requests.get(URL, timeout=10)
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

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Classifica salvata in {OUTPUT_FILE}")


if __name__ == "__main__":
    scrape_classifica()
