#!/usr/bin/env python3
"""Build the web app into docs/ (served by GitHub Pages from the main branch, /docs folder).

Copies app/ and the datasets, then writes docs/sw.js with the list of files to keep offline and a
cache version derived from their contents, so every change to the app or data ships a fresh cache.
"""
import hashlib
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"
DOCS = ROOT / "docs"
DATASETS = ["long_run", "by_type", "age_rates", "traffic_mode", "place", "home_type",
            "age_groups_2025", "detail_causes", "explorer"]


def main() -> None:
    if DOCS.exists():
        shutil.rmtree(DOCS)
    shutil.copytree(APP, DOCS, ignore=shutil.ignore_patterns("sw.js", ".DS_Store"))
    (DOCS / "data").mkdir()
    for d in DATASETS:
        shutil.copy(ROOT / "data" / f"{d}.csv", DOCS / "data" / f"{d}.csv")

    files = sorted(p for p in DOCS.rglob("*") if p.is_file())
    digest = hashlib.sha256()
    for p in files:
        digest.update(p.relative_to(DOCS).as_posix().encode())
        digest.update(p.read_bytes())
    version = digest.hexdigest()[:12]
    assets = ["./"] + [p.relative_to(DOCS).as_posix() for p in files]

    sw = (APP / "sw.js").read_text(encoding="utf-8")
    sw = sw.replace("'__VERSION__'", json.dumps(version)).replace("__ASSETS__", json.dumps(assets, indent=2))
    (DOCS / "sw.js").write_text(sw, encoding="utf-8")
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")
    size = sum(p.stat().st_size for p in DOCS.rglob("*") if p.is_file())
    print(f"built docs/ — {len(assets)} cached files, {size / 1024:.0f} KB, cache version {version}")


if __name__ == "__main__":
    main()
