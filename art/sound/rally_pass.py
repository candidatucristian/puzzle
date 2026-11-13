# A rally car through the flying finish (the RALLY level, The Night Circuit):
# made here, not recorded. The level is a night stage taped off the
# television and watched again on the drawing room's set, so this is the car
# as the broadcaster's trackside microphone heard it, then the tape, then
# the set's speaker.
#
# What goes into it:
#   - the engine at the top of a gear, about 7,200 rpm: a four-cylinder's
#     firing note and its harmonics through the exhaust's resonances, the
#     half orders of a crank that is never quite balanced, and the rasp of
#     each combustion; every cycle a little different from the last;
#   - the exhaust at the back: the car is louder once it is past you;
#   - over the line the driver lifts: the revs fall, the note goes dark, and
#     the exhaust pops and crackles as it goes;
#   - the tyres on gravel, the stones they throw, and the push of air as the
#     car goes by close;
#   - the pass itself: the car moving at 150 km/h, 7 m from the microphone,
#     so the note falls as it passes (Doppler) and the sound reaches the
#     microphone twice, straight and off the ground, which sweeps through it;
#     far off, the air takes the top off it;
#   - then the broadcast and the tape: one channel, no deep bass, nothing
#     above ten kilohertz, gently squeezed, and a little hiss.
#
# Run with Blender's Python (numpy, and aud for the MP3):
#   blender --background --factory-startup --python art/sound/rally_pass.py -- public/assets/sounds/Rally/car-pass.mp3
import sys, math, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(1983)
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "car-pass.mp3"

LENGTH = 1.9                     # seconds of sound
SPEED = 42.0                     # m/s, about 150 km/h
SIDE, MIC_H, PIPE_H = 7.0, 1.6, 0.4   # metres: track to microphone; heights
C = 343.0                        # speed of sound
PASS = 0.56                      # emission time (s) at which the car is level with the microphone
LIFT = PASS + 0.16               # the driver lifts just after the line
GROUND = 0.55                    # how much of the sound the gravel gives back

def lowband(n, lo, hi, tilt=0.0):
    """Noise between lo and hi (Hz), its spectrum tilted by `tilt` dB an octave."""
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1)
    g = (f / 1000) ** (tilt / 6.02) / np.sqrt(1 + (lo / f) ** 4) / np.sqrt(1 + (f / hi) ** 4)
    out = np.fft.irfft(spec * g, n)
    return out / (np.sqrt((out ** 2).mean()) + 1e-12)

def bell(lf, centre, width):
    return np.exp(-0.5 * ((lf - math.log2(centre)) / width) ** 2)

# ── what the car gives off, on its own clock (emission time) ─────────────────
tau = np.arange(int(-0.25 * SR), int((LENGTH + 0.05) * SR)) / SR
M = len(tau)

# revs: still pulling up to the line, then falling away once the driver lifts
lift = np.clip((tau - LIFT) / 0.06, 0, 1)
after = np.maximum(tau - LIFT, 0)
rpm = (6950 + 420 * np.clip((tau + 0.25) / (LIFT + 0.25), 0, 1)) * (1 - lift) \
    + lift * (4300 + (7370 - 4300) * np.exp(-after / 0.32))
throttle = 1 - 0.68 * lift
fire = rpm / 60 * 2                                   # four cylinders: two firings a turn
phase = 2 * math.pi * np.cumsum(fire) / SR            # the firing phase
cycle = phase / (2 * math.pi)
jitter = 1 + 0.13 * np.interp(cycle, np.arange(int(cycle.max()) + 3), rng.standard_normal(int(cycle.max()) + 3))

# the exhaust: its resonances, and how the note darkens off the throttle
def exhaust(fk):
    lf = np.log2(np.maximum(fk, 20))
    db = (-7.5 * np.log2(np.maximum(fk, 60) / 240)      # falling away up the harmonics
          + 3.0 * bell(lf, 260, 0.35) + 4.0 * bell(lf, 520, 0.3)
          + 5.0 * bell(lf, 1350, 0.4) + 4.5 * bell(lf, 3100, 0.45))
    return 10 ** (db / 20)
engine = np.zeros(M)
orders = [k / 2 for k in range(1, 81)]                # whole orders, and the half orders between
for k in orders:
    fk = k * fire
    if fk.min() > 11000:
        break
    amp = exhaust(fk) * (1.0 if k == int(k) else 0.22)
    amp *= 1 - (1 - throttle) * np.clip(fk / 1400, 0, 1) ** 0.7   # off the throttle: dark
    amp *= fk < 11000
    engine += amp * np.cos(k * phase + rng.uniform(0, 2 * math.pi))
engine *= jitter
engine /= np.sqrt((engine[tau < LIFT] ** 2).mean())

# each combustion's rasp: noise that comes in bursts, one a firing
pulse = ((1 + np.cos(phase)) / 2) ** 5
rasp = lowband(M, 900, 6500, tilt=-2) * pulse * jitter
rasp /= np.sqrt((rasp[tau < LIFT] ** 2).mean())
rasp *= 0.95 * (1 - 0.8 * lift)

# off the throttle: the exhaust pops and crackles
pops = np.zeros(M)
for at, a in ((0.06, 1.0), (0.13, 0.55), (0.21, 0.9), (0.27, 0.4), (0.36, 0.65), (0.5, 0.35)):
    i = np.searchsorted(tau, LIFT + at + rng.uniform(-0.012, 0.012))
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    bang = lowband(n, 300, 7000, tilt=-1) * np.exp(-t / 0.0045) * 0.9
    bang += np.sin(2 * math.pi * rng.uniform(85, 130) * t) * np.exp(-t / 0.012) * 1.1
    pops[i:i + n] += a * 2.6 * bang[:M - i]

# the tyres on the gravel, and the stones they throw
tyres = lowband(M, 180, 8000, tilt=-3.5) * 0.42
stones = np.zeros(M)
for i in np.flatnonzero(rng.random(M) < 170 / SR):
    n = int(rng.uniform(0.0006, 0.0025) * SR)
    stones[i:i + n] += rng.uniform(0.2, 1.0) * np.hanning(n)[:M - i] * rng.choice([-1, 1])
stones = np.fft.irfft(np.fft.rfft(stones) * (lambda f: 1 / np.sqrt(1 + (1800 / f) ** 4) / np.sqrt(1 + (f / 7000) ** 2))(np.maximum(np.fft.rfftfreq(M, 1 / SR), 1)), M)
stones *= 0.5 / (np.abs(stones).max() + 1e-9)

# ── the pass: where the car is, and what reaches the microphone ──────────────
def position(tt):
    return SPEED * (tt - PASS)                        # along the track; 0 is level with the microphone
def reaching(t, height):
    """Emission time of what reaches the microphone at t, along a path whose
    height difference is `height` (straight, or off the ground)."""
    e = t.copy()
    for _ in range(6):
        x = position(e)
        e = t - np.sqrt(x * x + SIDE * SIDE + height * height) / C
    x = position(e)
    return e, np.sqrt(x * x + SIDE * SIDE + height * height), x

N = int(LENGTH * SR)
t = np.arange(N) / SR
heard = np.zeros(N)
for height, share in ((MIC_H - PIPE_H, 1.0), (MIC_H + PIPE_H, GROUND)):
    e, r, x = reaching(t, height)
    ahead = -x / r                                    # 1: coming at you; -1: gone past
    back = 0.62 - 0.38 * ahead                        # the exhaust points backwards
    near = SIDE / r
    take = lambda sig: np.interp(e, tau, sig)
    sound = (take(engine) * back * (0.55 + 0.45 * np.interp(e, tau, throttle))
             + take(rasp) * back ** 1.4
             + take(pops) * back
             + take(tyres) + take(stones))
    heard += share * sound * near
# the push of air as it goes by close
e, r, x = reaching(t, MIC_H - PIPE_H)
heard += lowband(N, 50, 220, tilt=-4) * 0.45 * np.exp(-0.5 * (x / 9.0) ** 2)
heard += lowband(N, 600, 7000, tilt=-3) * 0.7 * np.exp(-0.5 * (x / 6.0) ** 2)
# far off, the air takes the top off
far = np.clip((r - SIDE) / 28, 0, 1)
spec = np.fft.rfft(heard)
f = np.maximum(np.fft.rfftfreq(N, 1 / SR), 1)
dull = np.fft.irfft(spec / np.sqrt(1 + (f / 2600) ** 2), N)
heard = heard * (1 - far) + dull * far
# round the bend at the start, and gone at the end
heard *= np.clip(t / 0.32, 0, 1) ** 2 * (3 - 2 * np.clip(t / 0.32, 0, 1)) * np.clip((LENGTH - t) / 0.28, 0, 1) ** 1.5

# ── the broadcast, the tape, the set ─────────────────────────────────────────
spec = np.fft.rfft(heard)
lf = np.log2(f)
db = 2.5 * bell(lf, 2600, 0.5) - 1.5 * bell(lf, 330, 0.4) - 6.0 / (1 + (f / 220) ** 2)   # a television's small speaker: little below 200 Hz
heard = np.fft.irfft(spec * 10 ** (db / 20) / np.sqrt(1 + (120 / f) ** 6) / np.sqrt(1 + (f / 10500) ** 8), N)
heard /= np.abs(heard).max()
heard = np.tanh(1.5 * heard) / math.tanh(1.5)        # the broadcast limiter, gently
heard += lowband(N, 2500, 10000) * 10 ** (-58 / 20) * np.clip(t / 0.05, 0, 1) * np.clip((LENGTH - t) / 0.05, 0, 1)

# as loud as the recording it replaces: its loudest 50 ms at -22 dBFS
win = int(0.05 * SR)
loudest = max(np.sqrt((heard[i:i + win] ** 2).mean()) for i in range(0, N - win, win // 2))
heard *= 10 ** (-22 / 20) / loudest
heard = np.clip(heard, -0.95, 0.95)
at = max(range(0, N - win, win), key=lambda i: (heard[i:i + win] ** 2).sum())
print(f"rally pass: {LENGTH:.2f} s, loudest at {(at + win / 2) / SR:.2f} s, peak {20 * math.log10(np.abs(heard).max()):.1f} dBFS")

pcm = (heard * 32767).round().astype("<i2")
wav = OUT.rsplit(".", 1)[0] + ".wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
if OUT.endswith(".mp3"):
    import aud, os
    aud.Sound(wav).write(OUT, rate=SR, channels=aud.CHANNELS_MONO, format=aud.FORMAT_S16,
                         container=aud.CONTAINER_MP3, codec=aud.CODEC_MP3, bitrate=160000)
    os.remove(wav)
print("written", OUT)
