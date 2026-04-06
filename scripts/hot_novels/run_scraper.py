from __future__ import annotations

import json

from scraper import top10_as_dict


if __name__ == "__main__":
    novels = top10_as_dict()
    print(json.dumps(novels, ensure_ascii=False, indent=2))
