# Explainer video: Accidental Deaths in Japan, 1899–2025

`japanjiko-explainer.mp4`: 30.5 s, 1920×1080, 60 fps, H.264 + AAC stereo, music and sound effects
with no voiceover. It is an explainer for the web app at https://semui01.github.io/japanjiko/.

The film is a deterministic canvas animation (`film.html` + `engine.js`). It is rendered frame by frame
in headless Chromium with 4-sub-frame motion blur (12 in fast moves), scored in numpy (`score.py`,
`sound.py`) from cue times the film exports, and encoded with ffmpeg at −16 LUFS.

## Rebuild

```bash
python3 video/data/prepare.py .            # from the repository root: data/*.csv → video/data.js
cd video && ./build.sh /tmp/frames japanjiko-explainer.mp4
#   DRAFT=1 for a fast check pass; needs Node 18+, Playwright + Chromium, ffmpeg, Python 3 + numpy
```

Fonts: Gelasio stands in for the app's serif stack (it is metric-compatible with Georgia, which the
stack includes), and Inter for its `system-ui` sans. Both are in `fonts/` under the OFL. Japanese uses
Noto Sans/Serif CJK JP and the eyebrow uses Noto Sans Mono CJK JP. These come from the system through
`local()` in `fonts/fonts.css`, so install `fonts-noto-cjk` before rebuilding.

## Storyboard as built

| # | Time (s) | What moves | On-screen text |
|---|---|---|---|
| 1 | 0–3.2 | 124 yearly bars sweep in from 1899 to 2025, with no records for 1944–46. The earthquake years 1923, 1995 and 2011 are red | MHLW · VITAL STATISTICS OF JAPAN · *Accidental deaths in Japan, 1899–2025* · 日本の不慮の事故死亡統計 · 1923 earthquake · 2011 earthquake |
| 2 | 3.2–7.5 | Right-anchored zoom to 1995–2025. A dashed line is drawn after 2008, all bars dim, then 2009–2025 light up one by one while a counter follows them | *A 2009 ministry report, extended to 2025* · 2009–2025 ADDED · counter 38,153 → **45,068** · +18.1% vs 2008 |
| 3 | 7.2–11.3 | Each 1995–2025 bar splits into traffic, falls, drowning, choking and the rest. Each type then collapses to a dot at its own value and the dots join into lines | *Falls and drowning drove the rise* · Falls 11,963 · Drowning 10,065 · Choking 8,059 · Traffic 3,348 |
| 4 | 11.0–15.3 | Other lines fade and the drowning line hands over to a dot plot. For ages 65–69 to 85–89, the 2008 rate (ring) rises to the 2024 rate (dot) | *Drowning rates rose at every age 65–89* · per 100,000 · 2008 / 2024 · 30.5 → 39.3 (ages 80–84) |
| 5 | 15.2–19.2 | 2025 deaths by age group as bars stacked by type. Under 65 dims and a bracket groups the 65+ rows | **88.6%** were aged 65 or over · of all accidental deaths in 2025 · Under 65 5,092 · 65–79 11,238 · 80 and over 28,701 |
| 6 | 19.2–26.0 | The app's data explorer, redrawn in its dark theme. A cursor turns on Falls and then Drowning, and each line draws in. The 日本語 button switches the whole UI to Japanese, a CSV download is clicked, and the offline toast appears | *Explore it yourself* · Any cause, sex, age and year · 日本語 or English · PNG · CSV · offline |
| 7 | 26.05–30.5 | The app's mark flies out of the app bar and its bars regrow, followed by the title, URL and credit. Complete by 27.6 s and held for about 3 s | Accidental Deaths in *Japan* · 日本の不慮の事故死亡統計 1899〜2025年 · semui01.github.io/japanjiko · Data: MHLW Vital Statistics, via e-Stat |

## Facts on screen and their sources

`data/prepare.py` reads every number from this repository's `data/*.csv` (commit `be41ced`) and
asserts the cross-checks noted below. Those CSVs compile MHLW Vital Statistics of Japan (final data,
人口動態統計 確定数) via e-Stat, plus the MHLW FY2009 special report 「不慮の事故死亡統計」の概況
(statistical tables 2–6) for 1995–2008. See the repository README for table IDs, splicing and the
2019 recount. Source data © MHLW via e-Stat, credited on the end card.

| On screen | Value | File |
|---|---|---|
| Yearly accidental deaths, 1899–2025 (no records for 1944–46) | bars | `long_run.csv` |
| 1923 earthquake / 2011 earthquake bars | 71,322 / 59,416 | `long_run.csv` |
| 2008 → 2025 counter | 38,153 → 45,068 | `long_run.csv` (equals `by_type.csv` total for every year from 1995 to 2025, checked) |
| +18.1% vs 2008 | (45,068 − 38,153) / 38,153 | `by_type.csv` |
| Types, 1995–2025 | lines | `by_type.csv` (traffic V01–V98, falls W00–W17, drowning W65–W74, choking W75–W84; "rest" = fire + poisoning + other) |
| Falls / Drowning / Choking / Traffic, 2025 | 11,963 / 10,065 / 8,059 / 3,348 | `by_type.csv` |
| Drowning rate per 100,000, 2008 → 2024, ages 65–69 … 85–89 | 7.0→7.1, 11.8→13.7, 22.1→22.8, 30.5→39.3, 37.1→51.7 | `age_rates.csv` (the script asserts each rose) |
| 88.6% aged 65 or over | (11,238 + 28,701) / 45,068 | `age_groups_2025.csv` (the denominator includes 37 deaths of unknown age) |
| Under 65 / 65–79 / 80 and over, 2025 | 5,092 / 11,238 / 28,701 | `age_groups_2025.csv` (under 65 = sum of the seven younger groups; unknown age left out of the bars, as in the app) |
| Explorer lines in the app scene | traffic, falls, drowning, 1995–2025 | `by_type.csv` (the explorer's default view: deaths, both sexes, all ages) |
| UI labels, English and Japanese | — | `app/js/i18n.js` |

## Simplifications an expert might question

- The charts in scenes 1–3 have no y-axis. The S1/S2 bars share a zero baseline; the zoom rescales
  the y-axis from 0–80,000 to 0–62,000, and the type lines use 0–16,000. Values are given by the
  counter and the end labels.
- In the S3 morph the "rest" segment (fire, poisoning and other) fades out, and only the four largest
  types become lines, as in the app's explorer default.
- "2009–2025 ADDED": the app also re-sources 1995–2008 from the report's tables and splices editions
  (see the README). The label refers only to the years the 2009 report did not cover.
- The S4 comparison uses 2024, the latest year with official rates (2025 rates are not yet
  published). The legend says 2008 / 2024.
- The 2025 bars merge the seven age groups under 65 into one bar. The app's figure 8 shows them
  separately.
- Scene 6 is a redraw of the explorer, not a screen recording. Its layout, colours, labels and data
  match the app, but sizes are adjusted for video and the click sequence is staged. Its UI text is
  drawn as part of the picture, outside the text check. The headline and sublines above the window
  carry the message.

## Checks (final build, `tools/check.py`)

- Format: 1920×1080, 60 fps, 30.5 s. Median picture luma 0.08 (dark theme, as in the app). The first
  frame is near-black, since the film fades in on the bar sweep.
- Text: 47 text elements and 76 words (2.5 words/s; the limit is 3.5). No findings for reading time,
  overlaps, hand-offs, end-card hold, size or never-readable text.
- Audio: −16.1 LUFS integrated, −1.7 dBTP true peak, LRA 4.5 LU. 7% of the energy is below 60 Hz
  and 20% below 120 Hz.
- Sync: UI clicks −0.2 ms median over 4/4 cues; drowning-dot rises −0.2 ms over 5/5.
- A steady band near 1.2 kHz in the spectrogram was measured with numpy. Its peaks move with each
  chord (1103, 1175 and 1222 Hz), so it is the pad's upper harmonics and the D6 bells, not a stray
  tone.
- Not verified: listening. The mix was checked by measurement only.
