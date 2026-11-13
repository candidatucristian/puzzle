# The start menu's tick, as the pointer (or the keys) comes onto a word: made
# here, not recorded. A small soft knock with a note in it, near where the
# old one sat (about 920 Hz): a little wooden block struck with something
# soft, the note settling a hair as it dies; a faint crisp edge at the
# front so it reads at once; gone in a few hundredths of a second.
#
# Run with Blender's Python (numpy, and aud for the MP3):
#   blender --background --factory-startup --python art/sound/menu_hover.py -- public/assets/sounds/menu-hover.mp3
import sys, math, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(1904)
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "menu-hover.mp3"

LENGTH, START = 0.16, 0.004
N = int(LENGTH * SR)
t = np.maximum(np.arange(N) / SR - START, 0)
on = np.arange(N) / SR >= START

# the block's note, settling from 935 Hz to 912 Hz as it dies
f0 = 912 + 23 * np.exp(-t / 0.012)
phase = 2 * math.pi * np.cumsum(f0) / SR
attack = 0.5 - 0.5 * np.cos(math.pi * np.clip(t / 0.0015, 0, 1))
note = np.sin(phase) * np.exp(-t / 0.016)
# the block's own higher ring (a wooden bar's next mode), quicker gone
note += 0.16 * np.sin(2.76 * phase + 0.7) * np.exp(-t / 0.006)
note += 0.06 * np.sin(5.4 * phase + 1.9) * np.exp(-t / 0.0028)
note *= attack * on

# the crisp edge: a breath of noise, a few milliseconds
n = int(0.004 * SR)
edge = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.0009 * SR))
spec = np.fft.rfft(edge)
f = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1)
edge = np.fft.irfft(spec * np.exp(-0.5 * (np.log2(f / 3600) / 0.7) ** 2), n)
at = int(START * SR)
note[at:at + n] += 0.12 * edge / (np.abs(edge).max() + 1e-9)

# a small room's answer, very faint
ir_n = int(0.12 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / (0.025 * SR))
size = 1 << int(math.ceil(math.log2(N + ir_n)))
wet = np.fft.irfft(np.fft.rfft(note, size) * np.fft.rfft(ir, size), size)[:N]
note += wet / (np.abs(wet).max() + 1e-9) * 0.05

# as loud as the tick it replaces: its peak at -23 dBFS
note *= 10 ** (-23 / 20) / np.abs(note).max()
tail = int(0.02 * SR)
note[-tail:] *= np.linspace(1, 0, tail)
print(f"menu hover: {LENGTH:.2f} s, peak {20 * math.log10(np.abs(note).max()):.1f} dBFS")

pcm = (note * 32767).round().astype("<i2")
wav = OUT.rsplit(".", 1)[0] + ".wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
if OUT.endswith(".mp3"):
    import aud, os
    aud.Sound(wav).write(OUT, rate=SR, channels=aud.CHANNELS_MONO, format=aud.FORMAT_S16,
                         container=aud.CONTAINER_MP3, codec=aud.CODEC_MP3, bitrate=128000)
    os.remove(wav)
print("written", OUT)
