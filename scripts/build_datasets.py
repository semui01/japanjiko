#!/usr/bin/env python3
"""Build the report's datasets (data/*.csv) from the raw source tables in data/raw/.

Every output column is a count of deaths (or a rate per 100,000 where named *_rate)
copied from an official table. Nothing is estimated. The only arithmetic is:
  * "other" columns = total minus the named categories (as in the 2009 report), and
  * regrouping of detailed ICD-10 transport codes into the 2009 report's groups.

Run:  python3 scripts/build_datasets.py   (after scripts/fetch_sources.py)
"""
import csv
import io
import pathlib
import re

import xlrd  # pip install xlrd  (reads the 2010-era .xls workbook)

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data"

MHLW_SRC = "MHLW FY2009 accidental death report, statistical table {}"
ESTAT_SRC = "e-Stat vital statistics {} edition, table {}"


# ---------------------------------------------------------------- helpers
def estat(name):
    """Rows of an e-Stat CSV (Shift_JIS / cp932)."""
    text = (RAW / "estat" / f"{name}.csv").read_bytes().decode("cp932")
    return list(csv.reader(io.StringIO(text)))


def num(cell):
    """'-' means zero in Japanese statistical tables; '…' means not available."""
    s = str(cell).strip().replace(",", "")
    if s in ("-", "－", ""):
        return 0
    if s in ("…", "...", ".", "・", "x", "X", "*"):
        return None  # not available / not applicable
    v = float(s)
    return int(v) if v.is_integer() else v


def code_of(cell):
    """Leading ICD-10 code range of a row label, e.g. ' W65-W66,' -> 'W65-W66'."""
    m = re.match(r"\s*([VWX]\d\d(?:-[VWX]\d\d)?)", str(cell).replace("－", "-"))
    return m.group(1) if m else None


def year_columns(rows):
    """Map year -> first column index holding that year (death counts precede rates)."""
    for r in rows:
        years = {}
        for i, c in enumerate(r):
            s = str(c).strip()
            if re.fullmatch(r"(19|20)\d\d", s) and int(s) not in years:
                years[int(s)] = i
        if len(years) >= 3:
            return years
    raise ValueError("no year header row")


def write(name, header, rows):
    path = OUT / f"{name}.csv"
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(["" if v is None else v for v in r])
    print(f"wrote {path.relative_to(ROOT)} ({len(rows)} rows)")


BOOK = xlrd.open_workbook(str(RAW / "mhlw_furyo10" / "toukeihyo.xls"))


def mhlw_rows(sheet, first, last, cols):
    s = BOOK.sheet_by_name(sheet)
    out = []
    for r in range(first, last + 1):
        out.append([int(s.cell_value(r, 0))] + [num(s.cell_value(r, c)) for c in cols])
    return out


# --------------------------------------------- 1. long-run series 1899-2025
def long_run():
    rows = estat("2025_5-12")
    names = next(r for r in rows if "不慮の事故" in r)
    c_acc = names.index("不慮の事故")
    c_trf = names.index("交通事故")
    out, in_total = [], False
    for r in rows:
        head = r[0].strip()
        if head == "総数":
            in_total = True
            continue
        if in_total and head in ("男", "女"):
            break
        if in_total and re.fullmatch(r"\d{4}", head):
            out.append([int(head), num(r[1]), num(r[c_acc]), num(r[c_acc + 1]),
                        num(r[c_trf]), num(r[c_trf + 1])])
    write("long_run",
          ["year", "all_deaths", "accidental_deaths", "accidental_rate",
           "traffic_deaths", "traffic_rate"], out)


# ------------------------------------------ 2. deaths by main type 1995-2025
TYPE_CODES = [("total", "V01-X59"), ("traffic", "V01-V98"), ("falls", "W00-W17"),
              ("drowning", "W65-W74"), ("choking", "W75-W84"), ("fire", "X00-X09"),
              ("poisoning", "X40-X49")]
# which edition supplies which year (latest edition that prints the year as its own column;
# 2012-2025 values are after the 2019 recount of reporting omissions)
TYPE_EDITIONS = {2009: "2010", 2011: "2013", 2012: "2014", 2013: "2014"}


def from_530(edition, year):
    rows = estat(f"{edition}_5-30")
    col = year_columns(rows)[year]
    vals = {}
    for r in rows:
        c = code_of(r[0])
        if c and c not in vals:
            vals[c] = num(r[col])
    return vals


def by_type():
    out = []
    for r in mhlw_rows("統計表２", 5, 18, range(4, 12)):
        out.append(r + [MHLW_SRC.format(2)])
    for y in range(2009, 2026):
        ed = TYPE_EDITIONS.get(y, "2025")
        v = from_530(ed, y)
        named = [v[c] for _, c in TYPE_CODES]
        other = named[0] - sum(named[1:])
        out.append([y] + named + [other, ESTAT_SRC.format(ed, "5-30")])
    write("by_type", ["year", "total", "traffic", "falls", "drowning", "choking", "fire",
                      "poisoning", "other", "source"], out)


# ------------------------- 3. age-specific death rates (per 100,000) by type
AGES = ["0–4", "5–9", "10–14", "15–19", "20–24", "25–29", "30–34", "35–39", "40–44",
        "45–49", "50–54", "55–59", "60–64", "65–69", "70–74", "75–79", "80–84", "85–89"]


def age_rates():
    s = BOOK.sheet_by_name("統計表３")
    out = []
    # two side-by-side blocks: (year, first data row, label column)
    for year, first, lc in [(1995, 9, 0), (2000, 31, 0), (2005, 9, 11), (2008, 31, 11)]:
        for i, age in enumerate(AGES):
            r = first + i
            label = str(s.cell_value(r, lc)).replace("～", "–").strip()
            assert label == age, (year, label, age)
            total = num(s.cell_value(r, lc + 1))
            types = [num(s.cell_value(r, lc + k)) for k in range(4, 10)]
            out.append([year, age, total] + types + [MHLW_SRC.format(3)])
    rows = estat("2024_5-16")
    head = next(r for r in rows if "0～4歳" in r)
    cols = [head.index(a.replace("–", "～") + "歳") for a in AGES]
    want = ["20100", "20101", "20102", "20103", "20104", "20105", "20106"]
    found = {}
    for r in rows:
        k = r[0].strip()[:5]
        if k in want and r[1].strip() == "総数":
            found[k] = [num(r[c]) for c in cols]
    for i, age in enumerate(AGES):
        out.append([2024, age] + [found[k][i] for k in want] + [ESTAT_SRC.format(2024, "5-16")])
    write("age_rates", ["year", "age", "total", "traffic", "falls", "drowning", "choking",
                        "fire", "poisoning", "source"], out)


# ------------------------------- 4. traffic deaths by road-user type 1995-2025
def traffic_mode():
    out = []
    for r in mhlw_rows("統計表４", 8, 21, range(4, 14)):
        out.append(r + [MHLW_SRC.format(4)])
    for y in range(2009, 2026):
        ed = TYPE_EDITIONS.get(y, "2025")
        rows = estat(f"{ed}_5-33")
        col = year_columns(rows)[y]
        v = {}
        for r in rows:
            c = code_of(r[0])
            if c and c not in v:
                v[c] = num(r[col])
        g = lambda *codes: sum(v.get(c, 0) for c in codes)
        out.append([y, v["V01-V98"], g("V01-V06", "V01-V09"), v["V10-V19"], v["V20-V29"],
                    v["V40-V49"], v["V50-V59"], v["V60-V69"], g("V30-V39", "V70-V79", "V80-V89"),
                    v["V90-V94"], g("V95-V97", "V98", "V99"), ESTAT_SRC.format(ed, "5-33")])
    write("traffic_mode", ["year", "total", "pedestrian", "cyclist", "motorcycle", "car",
                           "light_truck_van", "heavy_vehicle", "other_land", "water", "other",
                           "source"], out)


# ------------------------- 5. non-traffic accidents by place of occurrence
PLACES = ["home", "residential_institution", "public_area", "sports", "street",
          "commercial", "industrial", "farm", "other_place", "unknown_place"]


def place():
    out = []
    for r in mhlw_rows("統計表５", 5, 18, range(4, 15)):
        out.append(r + [MHLW_SRC.format(5)])
    for y in range(2009, 2026):
        rows = estat(f"{y}_5-34")
        total, vals = None, {}
        for r in rows:
            if len(r) < 2 or not re.fullmatch(r"[\d,.\-]+", r[1].strip()):
                continue  # titles, notes and header rows
            if "W00-X59" in r[0]:
                if total is not None:
                    break  # second block holds percentages
                total = num(r[1])
                continue
            m = re.search(r"\.(\d)", r[0])
            if total is not None and m and m.group(1) not in vals:
                vals[m.group(1)] = num(r[1])
        assert len(vals) == 10 and total == sum(vals.values()), (y, total, vals)
        out.append([y, total] + [vals[str(i)] for i in range(10)] + [ESTAT_SRC.format(y, "5-34")])
    write("place", ["year", "total"] + PLACES + ["source"], out)


# ------------------------------- 6. accidents at home by main type 1995-2025
HOME_CODES = ["W00-W17", "W65-W74", "W75-W84", "X00-X09", "X40-X49"]


def home_type():
    out = []
    for r in mhlw_rows("統計表６", 5, 18, range(4, 11)):
        out.append(r + [MHLW_SRC.format(6)])
    for y in range(2009, 2026):
        rows = estat(f"{y}_5-35")
        total, vals = None, {}
        for r in rows:
            if total is None and ("家庭" in r[0] or "W00-X59" in r[0]) and len(r) > 2 and r[2].strip():
                total = num(r[2])
                continue
            c = code_of(r[0])
            if total is not None and c in HOME_CODES and c not in vals:
                vals[c] = num(r[2])
        named = [vals[c] for c in HOME_CODES]
        out.append([y, total] + named + [total - sum(named), ESTAT_SRC.format(y, "5-35")])
    write("home_type", ["year", "total", "falls", "drowning", "choking", "fire", "poisoning",
                        "other", "source"], out)


# ------------------------------------- 7. 2025 deaths by age group and type
def age_groups_2025():
    rows = estat("2025_5-31")
    head = next(r for r in rows if "総数" in r and "0歳" in r)
    labels = [h.replace("～", "–").replace("歳以上", " and over").replace("歳", "").replace("不詳", "unknown")
              for h in head[3:]]
    v = {}
    for r in rows:
        c = code_of(r[0])
        if c and c not in v:
            v[c] = [num(x) for x in r[3:]]
    out = []
    for i, lab in enumerate(labels):
        named = [v[c][i] for _, c in TYPE_CODES]
        out.append([lab] + named + [named[0] - sum(named[1:])])
    write("age_groups_2025", ["age_group", "total", "traffic", "falls", "drowning", "choking",
                              "fire", "poisoning", "other"], out)


# --------------------- 8. detailed causes (three-character ICD-10), 2025 edition
def detail_causes():
    rows = estat("2025_5-30")
    years = year_columns(rows)
    out = []
    for r in rows:
        c = code_of(r[0])
        if not c:
            continue
        name = r[1].strip().replace("　", "")
        level = "group" if not r[0].startswith(" ") else "detail"
        for y, col in sorted(years.items()):
            rate_col = col + len(years)
            out.append([c, name, level, y, num(r[col]), num(r[rate_col])])
    write("detail_causes", ["code", "cause_ja", "level", "year", "deaths", "rate"], out)


# ------------- 9. explorer: deaths and rates by cause, sex and age, 1995-2025
EXPLORER_CAUSES = {"20100": "total", "20101": "traffic", "20102": "falls", "20103": "drowning",
                   "20104": "choking", "20105": "fire", "20106": "poisoning", "20107": "other"}
EXPLORER_AGES = AGES + ["90+"]
OLDEST = ["90–94", "95–99", "100+"]


def age_key(label):
    """Normalise the many age-column spellings used since 1995 ('0～4', '000-004歳', '90歳～', ...)."""
    s = str(label).strip()
    if not s or "再" in s:
        return None
    if s == "総数":
        return "all"
    if s == "不詳":
        return "unknown"
    s = s.replace("歳", "").replace("～", "-").replace("〜", "-").replace("以上", "-")
    m = re.fullmatch(r"0*(\d+)-0*(\d+)", s)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        return f"{a}–{b}" if b - a == 4 else None
    m = re.fullmatch(r"0*(\d+)-", s)
    if m:
        return f"{int(m.group(1))}+"
    m = re.fullmatch(r"0*(\d+)", s)
    return "100+" if m and int(m.group(1)) == 100 else None


def sex_key(cell):
    s = str(cell)
    return "male" if "男" in s else "female" if "女" in s else "all" if "総数" in s else None


def by_cause_sex_age(name):
    """{(cause, sex): {age: value}} plus the all-cause rows, from a table-2 or table-5-16 CSV."""
    rows = estat(name)
    h = next(i for i, r in enumerate(rows) if "総数" in r and any(age_key(c) == "5–9" for c in r))
    head = rows[h]
    start = head.index("総数")
    cols = {i: age_key(c) for i, c in enumerate(head) if i >= start and age_key(c)}
    out, cause, first = {}, None, True
    for r in rows[h + 1:]:
        if len(r) <= start:
            continue
        sex = sex_key(r[start - 1])
        if sex is None:
            continue
        lead = r[0].strip()
        if lead:
            m = re.match(r"(\d{4,5})", lead)
            cause = "allcause" if first else (m.group(1).zfill(5) if m else None)
            first = False
        if cause is None or (cause, sex) in out:
            continue
        out[(cause, sex)] = {a: num(r[i]) for i, a in cols.items() if i < len(r)}
    return out


def explorer():
    out, derived_n = [], 0
    for y in range(1995, 2026):
        deaths = by_cause_sex_age(f"{y}_h2")
        rates = by_cause_sex_age(f"{y}_5-16") if (RAW / "estat" / f"{y}_5-16.csv").exists() else {}
        rate_all = rates.get(("allcause", "all")) or next(iter(rates.values()), None)
        for code, cause in EXPLORER_CAUSES.items():
            for sex in ("all", "male", "female"):
                d = deaths[(code, sex)]
                r = rates.get((code, sex), {})
                for age in ["all"] + EXPLORER_AGES:
                    derived = 0
                    if age == "90+":
                        dv = sum(d.get(a) or 0 for a in OLDEST) if "90+" not in d else d["90+"]
                    else:
                        dv = d.get(age)
                    rv = r.get(age) if r else None
                    if r and age == "90+" and rv is None:
                        # Rate not published for 90+: population = all-cause deaths / all-cause rate.
                        pop = 0.0
                        for a in OLDEST:
                            ad, ar = deaths[("allcause", sex)].get(a), rates[("allcause", sex)].get(a)
                            if ad and ar:
                                pop += ad / ar * 100000
                        rv = round(dv / pop * 100000, 1) if pop else None
                        derived, derived_n = 1, derived_n + 1
                    out.append([y, cause, sex, age, dv, rv, derived])
        del rate_all
    # check against the spliced headline series
    totals = {(r[0], r[1]): r[4] for r in out if r[2] == "all" and r[3] == "all"}
    with (OUT / "by_type.csv").open(encoding="utf-8") as f:
        diffs = []
        for row in csv.DictReader(f):
            for k in ("total", "traffic", "falls", "drowning", "choking", "fire", "poisoning", "other"):
                a, b = totals[(int(row["year"]), k)], int(row[k])
                if a != b:
                    diffs.append((row["year"], k, a, b))
    print(f"explorer: {derived_n} derived 90+ rates; {len(diffs)} cells differ from by_type.csv", diffs[:12])
    write("explorer", ["year", "cause", "sex", "age", "deaths", "rate", "rate_derived"], out)


if __name__ == "__main__":
    long_run()
    by_type()
    age_rates()
    traffic_mode()
    place()
    home_type()
    age_groups_2025()
    detail_causes()
    explorer()
