import json
import os

dir_base = os.path.dirname(__file__)
ROSA_FILE_PATH = os.path.realpath(os.path.join(dir_base, "..", "data", "rosa.json"))

if __name__ == "__main__":
    with open(ROSA_FILE_PATH, "r+") as f:
        data = json.load(f)
        for k,v in data.items():
            for kk,vv in v.items():
                if type(vv) == int:
                    data[k][kk] = 0
        f.seek(0)
        f.write(json.dumps(data, indent=3))


