from bs4 import BeautifulSoup

# usata per estrarre marcatori e ammonizioni

with open("tmp.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f, "html")

def get_rows_with_value(value):
    rows = []
    for tr in soup.select("tbody tr"):
        if any(value in td.get_text() for td in tr.find_all("td")):
            rows.append(str(tr))
    return rows

result = get_rows_with_value("Lenola")

for row in result:
    print(row)
