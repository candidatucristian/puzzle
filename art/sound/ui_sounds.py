# The game's own small sounds, made here, not recorded (common.py):
#   global/wrong.mp3        a wrong answer: one low note struck on a wooden
#                           bar with a felt mallet, short and dull (D below
#                           middle C, its bar's overtone a tritone above)
#   global/solved.mp3       a puzzle solved: a swell in F minor rising for
#                           most of a second into a deep, soft boom, and the
#                           chord left ringing in the room
# Each is as loud as the recording it replaces.
#
# A click was made here too (global/game-click.mp3), and set aside on
# 2026-11-08 for a Pixabay one the user chose (art/sound/edits.py). These two
# draw their randomness from where they drew it when the click came first,
# so they still make the takes that were accepted.
#
#   blender --background --factory-startup --python art/sound/ui_sounds.py -- public/assets/sounds
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SR, secs, noise, bell, eq, modes, convolve, place, room, reverb, fade, loudest, set_db, write, out_dir

OUT = out_dir()
rng = np.random.default_rng(221)
# (where the accepted takes' draws began)
rng.bit_generator.state = {"bit_generator": "PCG64", "state": {"state": 8604964507497246981384787987684396504,
                           "inc": 305165797596254365596917799921203439781}, "has_uint32": 0, "uinteger": 427323502}


# ── a wrong answer ───────────────────────────────────────────────────────────
def wrong():
    n = int(0.62 * SR)
    t = secs(n)
    at = 0.008
    k = np.maximum(t - at, 0)
    f0 = 146.83                                                        # D3
    bar = (np.sin(2 * math.pi * f0 * k) * np.exp(-k / 0.075)
           + 0.36 * np.sin(2 * math.pi * 258.0 * k + 0.9) * np.exp(-k / 0.05)
           + 0.62 * np.sin(2 * math.pi * f0 * 2.76 * k + 0.4) * np.exp(-k / 0.04)
           + 0.24 * np.sin(2 * math.pi * f0 * 5.65 * k + 1.1) * np.exp(-k / 0.018)
           + 0.55 * np.sin(2 * math.pi * 98.0 * k + 0.2) * np.exp(-k / 0.085))  # the frame under the bar
    bar *= (t >= at) * (0.5 - 0.5 * np.cos(math.pi * np.clip(k / 0.004, 0, 1)))   # a felt mallet: soft in
    felt = noise(rng, n, 200, 1800, -3) * np.exp(-k / 0.006) * (t >= at) * 0.25
    sig = bar + felt
    sig = reverb(sig, room(rng, 0.5, 0.3, early=((7, 0.3), (13, 0.2))), 0.18)
    sig = fade(sig, 0, 0.08)
    return set_db(sig, loudest(sig), -12.3)


# ── a puzzle solved ──────────────────────────────────────────────────────────
def solved():
    n = int(2.4 * SR)
    t = secs(n)
    hit = 0.85
    rise = np.clip(t / hit, 0, 1)
    swell = np.where(t < hit, rise ** 3.2, np.exp(-(t - hit) / 0.55))
    # the chord: F minor, soft and a little detuned, swelling in and left ringing
    chord = np.zeros(n)
    for f0, a in ((87.31, 0.5), (174.61, 0.9), (261.63, 0.7), (349.23, 0.6), (415.30, 0.55), (523.25, 0.3)):
        for d in (-0.0025, 0.0025):
            ph = rng.uniform(0, 2 * math.pi)
            tone = np.sin(2 * math.pi * f0 * (1 + d) * t + ph) + 0.18 * np.sin(4 * math.pi * f0 * (1 + d) * t + ph)
            chord += a * tone
    chord *= swell
    # the air rising with it: noise drawn up from dark to bright
    air = np.zeros(n)
    blocks = 24
    for b in range(blocks):
        lo, hi = int(b * hit * SR / blocks), int((b + 1) * hit * SR / blocks)
        centre = 300 * (3000 / 300) ** (b / blocks)
        piece = noise(rng, hi - lo + 2048, centre / 2.2, centre * 2.2)[:hi - lo]
        air[lo:hi] = piece
    air *= np.where(t < hit, rise ** 2.6, 0) * 0.8
    air = eq(air, lp=9500)
    # the boom: a deep drum, felt rather than heard, sliding down onto F1
    k = np.maximum(t - hit, 0)
    pitch = 43.65 + 14 * np.exp(-k / 0.06)
    drum = 2 * math.pi * np.cumsum(pitch) / SR
    boom = (np.sin(drum) + 0.55 * np.sin(2 * drum + 0.5)) * np.exp(-k / 0.42) * (t >= hit)
    boom *= 0.5 - 0.5 * np.cos(math.pi * np.clip(k / 0.006, 0, 1))
    thump = noise(rng, n, 40, 220, -4) * np.exp(-k / 0.05) * (t >= hit) * 0.5
    sig = 0.42 * chord + air + 8.0 * boom + 3.0 * thump
    sig = reverb(sig, room(rng, 1.8, 1.3, early=((19, 0.25), (31, 0.2), (47, 0.15))), 0.4)
    sig = fade(sig, 0.02, 0.35)
    return set_db(sig, loudest(sig), -10.2)


for name, make in (("global/wrong.mp3", wrong), ("global/solved.mp3", solved)):
    write(os.path.join(OUT, name), make())
