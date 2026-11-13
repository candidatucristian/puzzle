# The letters' sounds, made here, not recorded (common.py):
#   pen-writing.mp3   a steel nib writing on laid paper at a desk: strokes and
#                     the lifts between them, words with a pause between, the
#                     tooth of the paper under the nib, the side of the hand
#                     on the sheet. (The game plays its first two seconds.)
# As loud as the recording it replaced (writingonpaper.mp3).
#
# A wax seal breaking was made here too, and set aside (2026-11-07: the
# user found it not right). The pen's random draws begin where they began
# when the seal came first, so this still makes the take that was accepted.
#
#   blender --background --factory-startup --python art/sound/paper_sounds.py -- public/assets/sounds
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SR, secs, noise, bell, eq, modes, place, room, reverb, fade, mean_db, set_db, write, out_dir

OUT = out_dir()
rng = np.random.default_rng(1797)
DESK = room(rng, 0.5, 0.32, early=((4, 0.4), (8.5, 0.25), (15, 0.15)), bright=0.7)
# (where the accepted take's draws began)
rng.bit_generator.state = {"bit_generator": "PCG64", "state": {"state": 240802320314924490353634719182500930358,
                           "inc": 239728987995110386354687865802459220225}, "has_uint32": 1, "uinteger": 3788458315}


# ── a pen on paper ────────────────────────────────────────────────────────────
def pen_writing():
    n = int(4.0 * SR)
    sig = np.zeros(n)
    at = 0.04
    while at < 3.9:
        # a word: a few strokes, then a pause
        for _ in range(rng.integers(3, 8)):
            d = rng.uniform(0.07, 0.24)
            m = int(d * SR)
            k = np.linspace(0, 1, m)
            # the nib's speed through the stroke: up, a turn or two, down
            speed = np.sin(math.pi * k) ** 0.7 * (1 - 0.45 * np.abs(np.sin(math.pi * k * rng.integers(1, 4))))
            centre = rng.uniform(1700, 3600)
            hiss = noise(rng, m + 512, centre / 2.4, centre * 2.4, -1.5)[:m]
            grain = np.zeros(m)
            hits = rng.random(m) < 280 / SR
            grain[hits] = rng.uniform(0.6, 2.2, hits.sum()) * rng.choice([-1, 1], hits.sum())
            grain = eq(grain, hp=2200, lp=7000)
            hand = noise(rng, m + 512, 60, 300, -3)[:m] * 2.2      # the side of the hand on the sheet
            stroke = (hiss + 1.1 * grain + hand) * speed * rng.uniform(0.7, 1.1)
            place(sig, stroke, at * SR)
            # the nib set down: a tiny knock through the desk
            knock_n = int(0.03 * SR)
            place(sig, modes(knock_n, [(72, 0.5, 0.012), (165, 0.3, 0.008), (900, 0.15, 0.003)], rng) * 0.06, at * SR)
            at += d + rng.uniform(0.012, 0.07)
        at += rng.uniform(0.12, 0.26)
    sig = eq(sig, db=lambda f: 1.5 * bell(f, 3200, 0.6) - 4.0 * bell(f, 9000, 0.6), hp=50, lp=9000)
    sig = reverb(sig, DESK, 0.12)
    sig = fade(sig, 0.01, 0.2)
    return set_db(sig, mean_db(sig, 0.05, 2.15), -48.6)


write(os.path.join(OUT, "pen-writing.mp3"), pen_writing())
