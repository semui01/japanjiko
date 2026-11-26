#!/usr/bin/env python3
"""Assemble the static site in docs/ from report/ and data/ (for GitHub Pages: main branch, /docs).

The page body is report/index.html exactly as used in the Claude dashboard; site/dash-shim.js
provides the small runtime API it calls, reading data/*.csv instead of the dashboard's store.
"""
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
DATASETS = ["long_run", "by_type", "age_rates", "traffic_mode", "place", "home_type",
            "age_groups_2025", "detail_causes"]

SHELL = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Accidental deaths in Japan, 1899–2025</title>
<meta name="description" content="An updated, interactive edition of MHLW's 2009 special report on accidental deaths in Japan, using final vital statistics to 2025.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Noto+Sans+JP:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,400&display=swap">
<link rel="stylesheet" href="tokens.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script>window.DASH_SOURCES = __SOURCES__;</script>
<script src="dash-shim.js"></script>
</head>
<body>
<div id="dash-root">
__BODY__
</div>
</body>
</html>
"""


def main() -> None:
    if DOCS.exists():
        shutil.rmtree(DOCS)
    (DOCS / "data").mkdir(parents=True)
    for name in ("app.js", "app.css"):
        shutil.copy(ROOT / "report" / name, DOCS / name)
    for name in ("dash-shim.js", "tokens.css"):
        shutil.copy(ROOT / "site" / name, DOCS / name)
    for d in DATASETS:
        shutil.copy(ROOT / "data" / f"{d}.csv", DOCS / "data" / f"{d}.csv")
    body = (ROOT / "report" / "index.html").read_text(encoding="utf-8")
    sources = json.dumps({d: f"data/{d}.csv" for d in DATASETS})
    html = SHELL.replace("__SOURCES__", sources).replace("__BODY__", body)
    (DOCS / "index.html").write_text(html, encoding="utf-8")
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")
    print(f"built {DOCS.relative_to(ROOT)}/ ({len(DATASETS)} datasets)")


if __name__ == "__main__":
    main()
