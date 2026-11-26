"""Score for the Accidental Deaths in Japan explainer. One layer per kind of on-screen event.

usage: python3 score.py frames/cues.json soundtrack.wav
Every time comes from cues.json (exported by film.cues), so sound lands on the frame.
Tone: restrained (the subject is deaths). D minor pentatonic for every pitched event, a slow bed that
moves D minor → B♭maj7 → G minor → D minor → B♭ → F, and settles on F major (add 9) for the end card.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sound import Score, bell, boom, curve, hz, mallet, pop, riser, tick, whoosh  # noqa: E402

cues = json.load(open(sys.argv[1]))
dur = cues['dur']
phone = os.environ.get('VENUE') == 'phone' or cues.get('H', 1080) > cues.get('W', 1920)
sc = Score(dur, seed=11, profile='phone' if phone else 'speakers')
S = cues['scenes']            # scene starts: 0, zoom, split, S4, S5, app, end card
fin = cues['fin']

# ---------------------------------------------------------------- bed
bright = curve([(0, 320), (2.0, 800), (S[1], 900), (S[2], 1300), (S[3], 1100), (S[3] + 1, 650), (S[4], 800),
                (S[5], 1300), (S[5] + 2, 1700), (fin - .1, 2200), (fin, 3000), (dur, 1400)])
beds = [
    (['D2', 'A2', 'D3', 'E3', 'F3', 'A3'], S[0] + .05, S[1] + .4),       # D minor add 9: the long record
    (['Bb2', 'F3', 'A3', 'D4'], S[1], S[2] + .4),                         # B♭maj7: the report, extended
    (['G2', 'D3', 'F3', 'A3', 'Bb3'], S[2], S[3] + .4),                   # G minor 9: by type
    (['D2', 'A2', 'F3', 'A3', 'C4'], S[3], S[4] + .4),                    # D minor 7: drowning, older ages
    (['Bb2', 'F3', 'D4', 'A3'], S[4], S[5] + .4),                         # B♭maj7: 88.6%
    (['F2', 'C3', 'F3', 'A3', 'C4', 'D4'], S[5], fin + .2),               # F add 6: the app
]
for notes, a, b in beds:
    sc.chord(notes, a, b, bright, gain=.055, att=.5, rel=.7)
sc.chord(['F2', 'C3', 'F3', 'G3', 'A3', 'C4', 'E4'], fin, dur + .3, bright, gain=.06, att=.05, rel=.6)   # Fmaj9: resolve

PENT = ['D3', 'F3', 'G3', 'A3', 'C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6', 'D6']


def pitched(vals, lo_i, hi_i):
    lo, hi = min(vals), max(vals)
    return [PENT[lo_i + round((v - lo) / ((hi - lo) or 1) * (hi_i - lo_i))] for v in vals]


def hit(t, note, gain, pan=0, tau=.16, rev=.45, tk=.03):
    sc.add(mallet(hz(note), .7, tau), t, gain, pan, rev=rev)
    sc.add(tick(4200, .008, .0015), t, tk, pan)        # clear attack for the ear and for check.py's sync


# ---------------------------------------------------------------- S1: 127 years sweep in
sweep0, sweep1 = cues['decades'][0] - .3, cues['decades'][-1] + .3
sc.add(whoosh(sweep1 - sweep0, 300, 1400, q=.6, peak=.7), sweep0, .08, 0, rev=.3)
for i, t in enumerate(cues['decades']):
    sc.add(tick(3000 + 60 * i, .012, .002), t, .045, -.7 + 1.4 * i / (len(cues['decades']) - 1), rev=.2)
for t, v in zip(cues['quakes'], cues['quakeVals']):         # earthquake years: a dull low knock and a dark bell
    pan = -.6 + 1.2 * (t - cues['decades'][0]) / (cues['decades'][-1] - cues['decades'][0])
    sc.add(boom(1.0, 90, 50, .25, click=.25), t, .12 + .1 * (v - 40000) / 40000, pan, rev=.3)
    sc.add(bell(hz('A3'), 2.0, .7, 3.5, 1.0), t, .05, pan, rev=.6)

# ---------------------------------------------------------------- S2: zoom, the 2008 line, 2009–2025 light up
z0, z1 = cues['zoom']
sc.add(whoosh(z1 - z0 + .2, 220, 2400, q=.5, peak=.6), z0 - .05, .22, rev=.25)
sc.add(tick(2600, .02, .004), cues['dash'], .08, -.1, rev=.3)
sc.add(tick(3400, .02, .004), cues['added'], .06, .1, rev=.3)
for i, (t, nt) in enumerate(zip(cues['lit'], pitched(cues['litVals'], 3, 10))):
    hit(t, nt, .075, -.3 + .8 * i / 16, tau=.13, tk=.022)
sc.add(bell(hz('D6'), 2.6, .9, 2.0, 1.1), cues['counterLand'], .1, .45, rev=.7)
sc.add(tick(2200, .025, .005), cues['cap'], .05, .5, rev=.3)

# ---------------------------------------------------------------- S3: totals split into types, collapse to lines
for k, nt in enumerate(['A5', 'C6', 'D6', 'F6']):
    sc.add(bell(hz(nt), 1.2, .35, 2.0, .8), cues['split'] + k * .09, .035, -.5 + .33 * k, rev=.6)
m0, m1 = cues['morph']
sc.add(whoosh(m1 - m0 + .2, 2200, 300, q=.55, peak=.35), m0, .16, rev=.3)
l0, l1 = cues['lines']
sc.add(whoosh(l1 - l0, 500, 1600, q=.7, peak=.8), l0, .06, rev=.4)
for t, nt in zip(cues['endLabels'], pitched(cues['endVals'], 4, 11)):
    hit(t, nt, .1, .55, tau=.18)

# ---------------------------------------------------------------- S4: drowning rate by age, 2008 → 2024
for i, t in enumerate(cues['rings']):
    sc.add(tick(1800 + 150 * i, .02, .004), t, .05, -.5 + .25 * i, rev=.3)
for i, (t, nt) in enumerate(zip(cues['rises'], pitched(cues['riseVals'], 5, 12))):
    hit(t, nt, .1, -.5 + .25 * i, tau=.22, rev=.5)
    sc.add(bell(hz(nt), 1.4, .5, 2.0, .7), t + .5, .03, -.5 + .25 * i, rev=.7)   # the dot settles
sc.add(tick(2400, .02, .004), cues['val'], .05, .3, rev=.3)

# ---------------------------------------------------------------- S5: 2025 by age, 88.6%
for t, nt in zip(cues['bars5'], ['D3', 'F3', 'A3']):
    hit(t, nt, .13, 0, tau=.28, rev=.5)
sc.add(bell(hz('A5'), 2.6, .9, 2.0, 1.1), cues['count5Land'], .11, -.3, rev=.7)
sc.add(bell(hz('D5'), 2.6, .9, 2.0, 1.1), cues['count5Land'] + .12, .07, -.1, rev=.7)

# ---------------------------------------------------------------- S6: the app
sc.add(whoosh(.7, 400, 1800, q=.6, peak=.6), cues['win'] - .1, .13, rev=.3)
for i, t in enumerate(cues['clicks']):                       # UI clicks: same sound every time
    sc.add(pop(), t, .16, .2 + .1 * i, rev=.1)
    sc.add(tick(5200, .012, .0018), t, .05, .2 + .1 * i)
for t, nt in zip(cues['lineDraws'], ['A3', 'D4', 'F4']):     # a line draws in
    sc.add(mallet(hz(nt), .9, .3), t, .07, .3, rev=.55)
sc.add(bell(hz('A5'), 1.6, .5, 2.0, .9), cues['langFlip'], .06, -.2, rev=.6)
sc.add(bell(hz('D6'), 1.6, .5, 2.0, .9), cues['langFlip'] + .1, .05, .2, rev=.6)
sc.add(bell(hz('F5'), 1.8, .7, 2.0, 1.0), cues['toast'], .06, 0, rev=.6)

# ---------------------------------------------------------------- S7: the mark flies out, end card
f0, f1 = cues['fly']
sc.add(whoosh(f1 - f0 + .1, 300, 3000, q=.5, peak=.85), f0, .2, rev=.3)
sc.add(riser(f1 - f0, 300, 20), f0, .14, rev=.3)
sc.add(boom(2.2, 82, 43, .6), fin, .38, rev=.45)
for k, (t, nt) in enumerate(zip(cues['markBars'], ['F5', 'A5', 'C6', 'F6'])):   # the mark's four bars grow
    sc.add(bell(hz(nt), 2.4, .9, 2.0, 1.1), t, .075, -.35 + .23 * k, rev=.7)
sc.add(bell(hz('C6'), 2.4, .9, 3.5, 1.2), cues['url'], .06, .4, rev=.8)

sc.write(sys.argv[2])
