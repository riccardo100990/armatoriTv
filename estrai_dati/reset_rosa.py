import json
import os
from copy import deepcopy as cp

dir_base = os.path.dirname(__file__)
ROSA_FILE_PATH = os.path.realpath(os.path.join(dir_base, "..", "data", "rosa.json"))

inner_dict =  {
   "goals": 0,
   "assist": 0,
   "ammonizioni": 0,
   "espulsioni": 0,
   "clean_sheet": 0,
   "mvp_armatori_tv": 0,
   "ruolo": "",
   "team": ""
}

player_list = [
    {'name': 'Luca Mastrobattista', 'ruolo': 'C'},
    {'name': 'Gianfranco Grossi', 'ruolo': 'D'},
    {'name': 'Stefano Capodiferro', 'ruolo': 'A'},
    {'name': 'Matteo De Silvestri', 'ruolo': 'P'},
    {'name': 'Vasco Iacoveli', 'ruolo': 'C'},
    {'name': 'Ivan Tullio', 'ruolo': 'D'},
    {'name': 'Tiziano Panno', 'ruolo': 'P'},
    {'name': 'Gianluigi Piccione', 'ruolo': 'A'},
    {'name': 'Andrea Panno', 'ruolo': 'D'},
    {'name': 'Alex Grossi', 'ruolo': 'A'},
    {'name': 'Emanuele Guglietta', 'ruolo': 'D'},
    {'name': 'Luigi Quinto', 'ruolo': 'C'},
    {'name': 'Riccardo Ioli', 'ruolo': 'D'},
    {'name': 'Gianluigi Panno', 'ruolo': 'C'},
    {'name': 'Luciano Zannella', 'ruolo': 'A'},
    {'name': 'Gianmarco Di Manno', 'ruolo': 'D'},
    {'name': 'Vincenzo Speranza', 'ruolo': 'D'},
    {'name': 'Giuseppe Tatarelli', 'ruolo': 'D'},
    {'name': 'Mauro Capodiferro', 'ruolo': 'D'},
    {'name': 'Diego Benito De Filippis', 'ruolo': 'A'},
    {'name': 'Gabriel De Filippis', 'ruolo': 'D'},
    {'name': 'Piero Lo Stocco', 'ruolo': 'D'},
    {'name': 'Pasquale Antonio Tribuzio', 'ruolo': 'C'},
    {'name': 'Francesco Carroccia', 'ruolo': 'A'},
    {'name': 'Giovanni Lo Stocco', 'ruolo': 'A'},
    {'name': 'Lorenzo Rizzi', 'ruolo': 'A'},
    {'name': 'Giacomo Magnafico', 'ruolo': 'P'},
    {'name': 'Ahmed Abdi Sacid', 'ruolo': 'A'},
    {'name': 'Alessandro Pannozzo', 'ruolo': 'D'},
    {'name': 'Arcano Marrocco', 'ruolo': 'C'},
    {'name': 'Daniele Lauretti', 'ruolo': 'D'}
]

if __name__ == "__main__":
    new_data = {}
    with open(ROSA_FILE_PATH, "r+") as f:
        data = json.load(f)
        keys = data.keys()
        for new_player in player_list:
            new_dict = cp(inner_dict)
            n = new_player['name']
            team = ''
            if n in keys:
                team = data[n]['team']
            new_dict['team'] = team
            new_dict['ruolo'] = new_player['ruolo']
            new_data[n] = new_dict
        f.seek(0)
        f.write(json.dumps(new_data, indent=3))


