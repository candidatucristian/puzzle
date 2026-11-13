# A thing that runs, made here, not recorded (common.py):
#   MobilePhone/buzz.mp3   the old handset vibrating on the wooden desk, once:
#                          its little motor spinning up, three quarters of a
#                          second of it, spinning down. The phone rattles on
#                          the wood and the cup beside it ticks now and then.
#                          The level buzzes the phone for 750 ms every five
#                          seconds, and this is that one buzz.
# As loud as the recording it replaced (vibration.mp3).
#
# A watering can and a router hum were made here too, and set aside
# (2026-11-07: the user found them not right); the room's hum is now a
# Pixabay recording, looped by art/sound/edits.py.
#
#   blender --background --factory-startup --python art/sound/machine_sounds.py -- public/assets/sounds
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SR, secs, eq, modes, convolve, place, room, reverb, fade, mean_db, set_db, write, out_dir

OUT = out_dir()
rng = np.random.default_rng(2004)


# ── the phone buzzing on the desk ────────────────────────────────────────────
def buzz():
    n = int(0.95 * SR)
    t = secs(n)
    on, off = 0.01, 0.76
    # the motor: up to speed in a breath, steady, then running down
    spin = np.where(t < on, 0, np.clip((t - on) / 0.07, 0, 1) ** 0.6)
    spin = np.where(t > off, np.exp(-(t - off) / 0.06), spin)
    f = 175 * (0.25 + 0.75 * spin) * (1 + 0.012 * np.sin(2 * math.pi * 7.3 * t))
    phase = 2 * math.pi * np.cumsum(f) / SR
    swing = spin ** 2 * np.sin(phase)                                  # the weight going round
    # the phone lifting off the wood a little each turn, and coming down on it
    contact = np.maximum(0, swing - 0.55) ** 1.5
    desk = modes(int(0.08 * SR), [(105, 1.0, 0.03), (212, 0.4, 0.02), (380, 0.15, 0.012), (620, 0.1, 0.008)], rng)
    case = modes(int(0.03 * SR), [(1924, 1.0, 0.006), (2099, 0.9, 0.005), (2104, 0.6, 0.007), (3050, 0.6, 0.004),
                                  (4300, 0.45, 0.003), (5900, 0.3, 0.002)], rng)
    rattle = convolve(contact, desk) * 0.06 + convolve(contact, case) * 0.32
    whine = swing * 0.25 + 0.03 * spin ** 2 * np.sin(2 * phase + 0.6)
    sig = rattle + whine
    # the cup beside it ticking, now and then, while it shakes hardest
    cup = modes(int(0.04 * SR), [(3100, 1.0, 0.012), (4420, 0.6, 0.009), (5810, 0.35, 0.006)], rng)
    for at in rng.uniform(0.15, 0.7, 5):
        tick = np.zeros(int(0.04 * SR)); tick[:6] = rng.standard_normal(6)
        place(sig, convolve(tick, cup) * 0.03 * rng.uniform(0.4, 1.0), at * SR)
    sig = eq(sig, hp=70)
    sig = reverb(sig, room(rng, 0.5, 0.35, early=((5, 0.3), (11, 0.2)), bright=0.7), 0.12)
    sig = fade(sig, 0, 0.06)
    return set_db(sig, mean_db(sig, 0.2, 0.7), -26.1)


write(os.path.join(OUT, "MobilePhone/buzz.mp3"), buzz(), bitrate=128000)
