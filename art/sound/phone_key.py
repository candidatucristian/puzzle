# The old handset's key tone (An Unexpected Call, Room III): made here, not
# recorded. Every key gives the same short tone, as before: the telephone
# pair for "2" (697 Hz with 1336 Hz), a tenth of a second, out of the phone's
# own small speaker, which has no bass, little top, and buzzes a little
# when pushed. Under it, the soft knock of the rubber key going down.
#
# Run with Blender's Python (numpy, and aud for the MP3):
#   blender --background --factory-startup --python art/sound/phone_key.py -- public/assets/sounds/MobilePhone/key-tone.mp3
import sys, math, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(3310)
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "key-tone.mp3"

LENGTH, START, TONE, EDGE = 0.2, 0.008, 0.1, 0.003
N = int(LENGTH * SR)
t = np.arange(N) / SR

# the tone: the two frequencies of the key, as a phone's chip makes them
k = t - START
gate = np.clip(k / EDGE, 0, 1) * np.clip((TONE - k) / EDGE, 0, 1)
gate = 0.5 - 0.5 * np.cos(math.pi * gate)
tone = (np.sin(2 * math.pi * 697 * k) + 1.12 * np.sin(2 * math.pi * 1336 * k)) * gate * (k >= 0)

# the rubber key going down: a dull knock, just as the tone starts
n = int(0.012 * SR)
knock = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.0018 * SR))
spec = np.fft.rfft(knock)
f = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1)
knock = np.fft.irfft(spec * np.exp(-0.5 * (np.log2(f / 1700) / 0.9) ** 2), n)
sound = tone.copy()
at = int(0.002 * SR)
sound[at:at + n] += 0.5 * knock / (np.abs(knock).max() + 1e-9)

# the phone's own speaker: small, so no bass and little top; pushed a little
spec = np.fft.rfft(sound)
f = np.maximum(np.fft.rfftfreq(N, 1 / SR), 1)
lf = np.log2(f)
db = 3.0 * np.exp(-0.5 * ((lf - math.log2(1900)) / 0.5) ** 2)       # its little cone's ring
sound = np.fft.irfft(spec * 10 ** (db / 20) / np.sqrt(1 + (480 / f) ** 4) / np.sqrt(1 + (f / 4200) ** 4), N)
sound /= np.abs(sound).max()
sound = np.tanh(1.4 * sound) / math.tanh(1.4)

# as loud as the tone it replaces: the steady part at -29 dBFS
steady = (t > START + 0.02) & (t < START + TONE - 0.02)
sound *= 10 ** (-29 / 20) / np.sqrt((sound[steady] ** 2).mean())
print(f"phone key: {LENGTH:.2f} s, tone {TONE * 1000:.0f} ms from {START * 1000:.0f} ms, peak {20 * math.log10(np.abs(sound).max()):.1f} dBFS")

pcm = (np.clip(sound, -0.95, 0.95) * 32767).round().astype("<i2")
wav = OUT.rsplit(".", 1)[0] + ".wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
if OUT.endswith(".mp3"):
    import aud, os
    aud.Sound(wav).write(OUT, rate=SR, channels=aud.CHANNELS_MONO, format=aud.FORMAT_S16,
                         container=aud.CONTAINER_MP3, codec=aud.CODEC_MP3, bitrate=128000)
    os.remove(wav)
print("written", OUT)
