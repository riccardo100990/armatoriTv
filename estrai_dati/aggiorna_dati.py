import json
import os
import re
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

dir_base = os.path.dirname(__file__)

CAMPIONATO_CORRENTE = "girone-a"
CLASSIFICA_URL = f"https://www.amatoricassino.it/{CAMPIONATO_CORRENTE}/classifica"
CALENDARIO_URL = f"https://www.amatoricassino.it/{CAMPIONATO_CORRENTE}/calendario"

CLASSIFICA_OUTPUT_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", f"classifica_{CAMPIONATO_CORRENTE}.json"))
CALENDARIO_OUTPUT_FILE = os.path.realpath(os.path.join(dir_base, "..", "data", f"calendario_{CAMPIONATO_CORRENTE}.json"))


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

    table = soup.select_one("table.classifica-table") or soup.select_one("table")
    if not table:
        raise RuntimeError("Nessun tag <table> trovato nella pagina della classifica.")

    rows = table.select("tbody tr")
    if not rows:
        rows = table.find_all("tr")[1:]

    classifica = []

    for row in rows:
        tds = row.find_all("td")
        if len(tds) < 9:
            continue

        team_info = tds[0]

        pos_el = team_info.select_one(".position-number")
        if pos_el:
            posizione = clean_int(pos_el.text)
        else:
            match_pos = re.search(r"^\d+", team_info.text.strip())
            posizione = int(match_pos.group(0)) if match_pos else 0

        name_el = team_info.select_one(".team-name")
        if name_el:
            nome = name_el.text.strip()
        else:
            nome = re.sub(r"^\d+\s*", "", team_info.text.strip())

        logo_tag = team_info.select_one("img")
        logo = logo_tag["src"] if logo_tag else None
        if logo and logo.startswith("/"):
            logo = f"https://www.amatoricassino.it{logo}"

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

    giornate = soup.select("section.am-calendario-giornata")

    for giornata in giornate:
        num_giornata_elem = giornata.select_one(".am-calendario-giornata-numero")
        num_giornata = num_giornata_elem.get_text(strip=True) if num_giornata_elem else ""

        for match in giornata.select("article.am-calendario-match"):
            team_spans = match.select("span.line-clamp-2")
            if len(team_spans) < 2:
                continue

            home_team = team_spans[0].get_text(strip=True)
            away_team = team_spans[1].get_text(strip=True)

            if nome_squadra.lower() not in home_team.lower() and nome_squadra.lower() not in away_team.lower():
                continue

            parent_a = match.find_parent("a")
            match_url = parent_a["href"] if parent_a and parent_a.has_attr("href") else ""
            if match_url.startswith("/"):
                match_url = f"https://www.amatoricassino.it{match_url}"

            time_elem = match.select_one("time")
            date_time = time_elem.get_text(strip=True) if time_elem else ""

            campo_elem = match.select_one("span.truncate")
            campo = campo_elem.get_text(strip=True) if campo_elem else ""

            badge_elem = match.select_one(".am-calendario-badge")
            status = badge_elem.get_text(strip=True) if badge_elem else ""

            risultato_elem = match.select_one(".am-calendario-risultato")
            risultato = risultato_elem.get_text(strip=True) if risultato_elem else "vs"

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


if __name__ == "__main__":
    html_classifica, html_calendario = fetch_pages_html()
    scrape_classifica(html_classifica)
    scrape_calendar(html_calendario, nome_squadra="Lenola")
    print("Scraping completato e file JSON aggiornati con successo.")