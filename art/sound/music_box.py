# The music box in the boy's cot (His Cot, Room II): made here, not recorded.
#
# The tune is the first strain of "La Cumparsita" (Gerardo Matos Rodríguez,
# 1916), a tango in the public domain: published before 1929, and its
# composer died in 1948. The score this arrangement follows is John Chambers'
# ABC transcription (abcnotation.com, "La Cumparsita, the Masked One"); the
# accompaniment and the sound are ours.
#
# The sound is built from what a music box is:
#   - steel tines on a comb, each plucked by a pin: a fundamental that rings
#     for seconds, a second harmonic the comb radiates (fading twice as fast),
#     the tine's own inharmonic bending modes (about 6x and 17x, gone in a
#     blink), and a short metallic tick as the pin lets go;
#   - two tines to a note, as real combs have for repeated notes, each a few
#     cents off true, so a held note shimmers; a tine plucked again while
#     still ringing is stopped by its damper first;
#   - the wooden box under the comb: no deep bass, a warm body around 500 Hz;
#   - the clockwork: a click as the spring is let go, and the governor's
#     faint whirr while it plays;
#   - a small nursery around it.
#
# Run with Blender's Python (numpy, and aud for the MP3):
#   blender --background --factory-startup --python art/sound/music_box.py -- public/assets/sounds/HisCot/musicbox-cumparsita.mp3
import sys, math, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(1916)
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "musicbox-cumparsita.mp3"

# ── the score ────────────────────────────────────────────────────────────────
# Positions in eighth notes from the first full bar (4/4, 8 eighths a bar);
# pitches as MIDI numbers. The melody is written as the transcription has it
# (A minor) and played an octave up, where a music box comb sings.
E, F, D, Ds, Dn, Db, C, B3, A3, Gs3 = 64, 65, 62, 63, 62, 61, 60, 59, 57, 56
d5, B, Gs, e5, c5, A = 74, 71, 68, 76, 72, 69
MELODY = []
def bar_arpeggio(b, notes):            # .E2 .d2 .B2 .^G2 — four staccato quarters
    for i, n in enumerate(notes):
        MELODY.append((b * 8 + 2 * i, n, 0.95 if i == 0 else 0.88))
def bar_turn(b, last=None):            # z E F E ^D2 E E/E/ — the turn about E
    at = b * 8
    MELODY.extend([(at + 1, E, 0.82), (at + 2, F, 0.86), (at + 3, E, 0.8), (at + 4, Ds, 0.92)])
    if last == "long":
        MELODY.append((at + 6, E, 0.9))
    else:
        MELODY.extend([(at + 6, E, 0.86), (at + 7, E, 0.66), (at + 7.5, E, 0.7)])

MELODY.extend([(-1, E, 0.66), (-0.5, E, 0.72)])                       # pickup
bar_arpeggio(0, [E, d5, B, Gs]); bar_turn(1)                          # E7
bar_arpeggio(2, [E, e5, c5, A]); bar_turn(3)                          # Am
bar_arpeggio(4, [E, d5, B, Gs]); bar_turn(5)                          # E7
bar_arpeggio(6, [E, e5, c5, A]); bar_turn(7, "long")                  # Am
MELODY.extend([                                                        # Dm
    (64, Dn, 0.9), (66, A, 0.88), (68, Gs, 0.86), (70, A, 0.88),
    (73, E, 0.8), (74, F, 0.84), (75, E, 0.8), (76, F, 0.86), (78, Gs, 0.9),
    (80, E, 0.92), (83, D, 0.7), (83.5, Db, 0.72), (84, C, 0.9),        # Am: E3 D/_D/ C4
    (89, Ds, 0.8), (90, E, 0.84), (91, D, 0.8), (92, E, 0.86), (94, F, 0.88),
    (96, D, 0.92), (99, Db, 0.7), (99.5, C, 0.72), (100, B3, 0.9),      # E7: D3 _D/C/ B,4
    (105, D, 0.8), (106, C, 0.82), (107, B3, 0.82), (108, A3, 0.86), (110, Gs3, 0.88),
    (112, A3, 0.9), (115, F, 0.84), (116, E, 0.82), (117, D, 0.8), (118, C, 0.8), (119, B3, 0.82),
    (120, A3, 0.9), (123, Gs, 0.84), (124, A, 0.95),                    # Am: the close
])
MELODY = [(at, n + 12, v) for at, n, v in MELODY]

# the accompaniment: a tango's marcato under the first half (bass on one and
# three, a light chord on two and four), its 3-3-2 under the second
HARMONY = ["E7", "E7", "Am", "Am", "E7", "E7", "Am", "Am", "Dm", "Dm", "Am", "Am", "E7", "E7", "Am|E7", "Am"]
ROOT = {"Am": (57, 52), "E7": (52, 59), "Dm": (50, 57)}               # root, fifth
CHORD = {"Am": (69, 72), "E7": (68, 71)}
ACCOMP = []
for b, h in enumerate(HARMONY):
    at = b * 8
    if b < 8:
        root, fifth = ROOT[h]
        ACCOMP += [(at, root, 0.58), (at + 4, fifth, 0.5)]
        ACCOMP += [(at + 2, n, 0.3) for n in CHORD[h]] + [(at + 6, n, 0.28) for n in CHORD[h]]
    elif h == "Am|E7":
        ACCOMP += [(at, 57, 0.58), (at + 4, 52, 0.52), (at + 6, 59, 0.44)]
    elif b == 15:
        ACCOMP += [(at, 57, 0.6)]
    else:
        root, fifth = ROOT[h]
        ACCOMP += [(at, root, 0.58), (at + 3, root, 0.44), (at + 6, fifth, 0.46)]
# the last chord, rolled up under the melody's final A
ACCOMP += [(124, 57, 0.5), (124, 64, 0.38), (124, 72, 0.34)]

# ── time: a steady cylinder, easing off over the last two bars ────────────────
EIGHTH, LEAD = 0.236, 0.42
def when(p):
    if p <= 112:
        return LEAD + (p + 1) * EIGHTH
    x = p - 112
    return LEAD + (113 + x + 0.32 * x * x / 32) * EIGHTH

events = []
for at, n, v in MELODY + ACCOMP:
    events.append([when(at), n, v * rng.uniform(0.92, 1.04)])
# pins in one row of the cylinder are never quite in line: chords roll upward
events.sort(key=lambda e: (round(e[0], 4), e[1]))
for i in range(1, len(events)):
    if abs(events[i][0] - events[i - 1][0]) < 0.004 or events[i][0] < events[i - 1][0]:
        events[i][0] = events[i - 1][0] + (0.024 if events[i][0] > when(123.5) else 0.008)
for e in events:
    e[0] += rng.uniform(-0.0025, 0.0025)

LENGTH = max(e[0] for e in events) + 4.2
N = int(LENGTH * SR)
left, right = np.zeros(N), np.zeros(N)

# ── the tines ─────────────────────────────────────────────────────────────────
def freq(m): return 440.0 * 2 ** ((m - 69) / 12)
def band_noise(n, lo, hi):
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= np.exp(-0.5 * (np.log2(np.maximum(f, 1) / math.sqrt(lo * hi)) / (math.log2(hi / lo) / 2)) ** 2)
    out = np.fft.irfft(spec, n)
    return out / (np.abs(out).max() + 1e-9)

tines = {}           # (pitch, which) → its make: tuning, modes; and when it was last plucked
last = {}            # pitch → which tine took the last pluck
voices = []          # [start sample, signal, pitch, which, gains]
for t0, m, v in sorted(events):
    which = 1 - last.get(m, 1)
    last[m] = which
    key = (m, which)
    if key not in tines:
        tines[key] = {
            "cents": rng.uniform(-3.5, 3.5),
            "r2": 6.05 + rng.uniform(-0.35, 0.35), "r3": 17.2 + rng.uniform(-0.8, 0.8),
            "phase": rng.uniform(0, 2 * math.pi, 6),
        }
    tine = tines[key]
    f0 = freq(m) * 2 ** (tine["cents"] / 1200)
    tau = float(np.clip(1.75 * (660 / f0) ** 0.7, 0.62, 3.6))
    n = int((tau * 6 + 0.05) * SR)
    t = np.arange(n) / SR
    loud = v * (f0 / 660) ** -0.12
    sig = np.zeros(n)
    modes = [
        (1.0, 1.0, tau),                        # the tine
        (1.0009, 0.1, tau * 0.95),              # its twin on the comb, a hair sharp
        (2.0, 0.24 * v, tau / 2),               # what the comb gives back at twice
        (3.0, 0.045 * v, tau / 3.2),
        (tine["r2"], 0.13, float(np.clip(0.26 * (880 / f0) ** 0.5, 0.05, 0.5))),
        (tine["r3"], 0.035, 0.035),
    ]
    for k, (ratio, amp, decay) in enumerate(modes):
        fk = f0 * ratio
        if fk > 16500:
            continue
        sig += amp * np.exp(-t / decay) * np.sin(2 * math.pi * fk * t + (tine["phase"][k] if k else 0.0))
    attack = int(0.0012 * SR)
    sig[:attack] *= 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, attack))
    # the pin letting go: a short bright tick
    tick = int(0.007 * SR)
    sig[:tick] += 0.07 * v * band_noise(tick, 2500, 9000) * np.exp(-np.arange(tick) / (0.0013 * SR))
    pan = float(np.interp(m, [48, 92], [-0.32, 0.32]))
    gains = (math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4))
    voices.append([int(t0 * SR), sig * loud, m, which, gains])

# a tine plucked again is stopped first by its damper (a 14 ms fall)
fall = int(0.014 * SR)
for i, (s, sig, m, which, _) in enumerate(voices):
    for s2, _, m2, w2, _ in voices[i + 1:]:
        if m2 == m and w2 == which:
            cut = s2 - s
            if cut < len(sig):
                end = min(len(sig), cut + fall)
                sig[cut:end] *= np.linspace(1, 0, end - cut)
                sig[end:] = 0
            break
for s, sig, _, _, (gl, gr) in voices:
    end = min(N, s + len(sig))
    left[s:end] += gl * sig[:end - s]
    right[s:end] += gr * sig[:end - s]

# ── the clockwork: the spring let go, and the governor turning ───────────────
click_at, click = int(0.09 * SR), int(0.012 * SR)
burst = band_noise(click, 900, 5000) * np.exp(-np.arange(click) / (0.0025 * SR))
left[click_at:click_at + click] += 0.16 * burst
right[click_at:click_at + click] += 0.13 * burst
end_notes = max(e[0] for e in events)
t = np.arange(N) / SR
run = np.clip((t - 0.1) / 0.35, 0, 1) * np.clip((end_notes + 1.4 - t) / 1.2, 0, 1)
for ch, seed in ((left, 0.0), (right, 1.3)):
    whirr = band_noise(N, 700, 2600) * (1 + 0.3 * np.sin(2 * math.pi * 23.0 * t + seed))
    ch += 0.0045 * whirr * run

# ── the wooden box under the comb ──────────────────────────────────────────────
def shape(sig):
    spec = np.fft.rfft(sig)
    f = np.maximum(np.fft.rfftfreq(len(sig), 1 / SR), 1)
    lf = np.log2(f)
    gain_db = (4.0 * np.exp(-0.5 * ((lf - math.log2(500)) / 0.45) ** 2)
               + 2.5 * np.exp(-0.5 * ((lf - math.log2(1150)) / 0.35) ** 2)
               + 1.5 * np.exp(-0.5 * ((lf - math.log2(2700)) / 0.4) ** 2)
               - 2.0 * np.exp(-0.5 * ((lf - math.log2(4800)) / 0.3) ** 2))
    g = 10 ** (gain_db / 20) / np.sqrt(1 + (120 / f) ** 6) / np.sqrt(1 + (f / 12500) ** 4)
    return np.fft.irfft(spec * g, len(sig))
left, right = shape(left), shape(right)

# ── the nursery: a small room, soft furnishings, under half a second ──────────
def room_ir(seed):
    r = np.random.default_rng(seed)
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    ir = np.zeros(n)
    for ratio_lo, ratio_hi, rt, w in ((120, 400, 0.42, 0.7), (400, 2500, 0.36, 1.0), (2500, 9000, 0.2, 0.55)):
        band = band_noise(n, ratio_lo, ratio_hi)
        ir += w * band * np.exp(-t * 6.91 / rt)
    ir *= np.clip((t - 0.004) / 0.006, 0, 1)                    # a little before the first wall
    for ms, a in ((5.5, 0.55), (8.7, 0.42), (12.9, 0.36), (17.4, 0.28), (23.8, 0.2)):
        at = int((ms + r.uniform(-1.2, 1.2)) * SR / 1000)
        ir[at] += a * r.choice([-1, 1])
    return ir / np.sqrt((ir ** 2).sum())
def convolve(sig, ir):
    size = 1 << int(math.ceil(math.log2(len(sig) + len(ir))))
    return np.fft.irfft(np.fft.rfft(sig, size) * np.fft.rfft(ir, size), size)[:len(sig)]
dry_rms = math.sqrt(((left ** 2 + right ** 2) / 2).mean())
wet_l, wet_r = convolve(left, room_ir(1)), convolve(right, room_ir(2))
wet_rms = math.sqrt(((wet_l ** 2 + wet_r ** 2) / 2).mean())
left += wet_l * 0.3 * dry_rms / wet_rms
right += wet_r * 0.3 * dry_rms / wet_rms

# ── out ───────────────────────────────────────────────────────────────────────
tail = int(0.4 * SR)
for ch in (left, right):
    ch[-tail:] *= np.linspace(1, 0, tail) ** 2
peak = max(np.abs(left).max(), np.abs(right).max())
left, right = left / peak * 0.89, right / peak * 0.89
rms = math.sqrt(((left ** 2 + right ** 2) / 2).mean())
first = min(e[0] for e in events)
print(f"music box: {LENGTH:.1f} s, {len(events)} notes, first note at {first:.2f} s, rms {20 * math.log10(rms):.1f} dBFS")

pcm = (np.stack([left, right], axis=1) * 32767).round().astype("<i2")
wav = OUT.rsplit(".", 1)[0] + ".wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
if OUT.endswith(".mp3"):
    import aud, os
    aud.Sound(wav).write(OUT, rate=SR, channels=aud.CHANNELS_STEREO, format=aud.FORMAT_S16,
                         container=aud.CONTAINER_MP3, codec=aud.CODEC_MP3, bitrate=192000)
    os.remove(wav)
print("written", OUT)
