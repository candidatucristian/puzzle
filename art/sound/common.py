# What the sound scripts here share: noise of a given colour, resonances
# struck, rooms, loudness, and writing the result as an MP3 (through
# Blender's aud). Every sound is made from numbers, never from a recording.
#
# Each script is run with Blender's Python, e.g.
#   blender --background --factory-startup --python art/sound/ui_sounds.py -- public/assets/sounds
import math, os, sys, wave
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))


def out_dir(default="public/assets/sounds"):
    """The folder the sounds are written into: the argument after --."""
    return sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1 else default


def secs(n):
    return np.arange(n) / SR


def freqs(n):
    return np.maximum(np.fft.rfftfreq(n, 1 / SR), 1.0)


def noise(rng, n, lo=20, hi=20000, tilt=0.0):
    """Noise between lo and hi Hz, its spectrum tilted by `tilt` dB an octave
    (about 1 kHz), at an RMS of 1."""
    spec = np.fft.rfft(rng.standard_normal(n))
    f = freqs(n)
    g = (f / 1000) ** (tilt / 6.02) / np.sqrt(1 + (lo / f) ** 4) / np.sqrt(1 + (f / hi) ** 4)
    out = np.fft.irfft(spec * g, n)
    return out / (np.sqrt((out ** 2).mean()) + 1e-12)


def bell(f, centre, octaves):
    """A bump on a log-frequency scale, 1 at `centre`, `octaves` wide (sigma)."""
    return np.exp(-0.5 * (np.log2(f / centre) / octaves) ** 2)


def eq(sig, db=None, hp=None, lp=None, order=4):
    """A fixed equaliser, applied in the frequency domain: `db(f)` a gain curve
    in dB, `hp`/`lp` gentle high- and low-pass corners."""
    n = len(sig)
    f = freqs(n)
    g = np.ones_like(f)
    if db is not None:
        g *= 10 ** (db(f) / 20)
    if hp:
        g /= np.sqrt(1 + (hp / f) ** order)
    if lp:
        g /= np.sqrt(1 + (f / lp) ** order)
    return np.fft.irfft(np.fft.rfft(sig) * g, n)


def modes(n, table, rng=None, spread=0.0):
    """The ring of a struck thing: [(frequency, amplitude, decay seconds)],
    each partial a damped sine, as an impulse response `n` samples long."""
    t = secs(n)
    out = np.zeros(n)
    for f0, a, d in table:
        if f0 >= SR / 2 * 0.95:
            continue
        f1 = f0 * (1 + (rng.uniform(-spread, spread) if rng is not None and spread else 0))
        ph = rng.uniform(0, 2 * math.pi) if rng is not None else 0.0
        out += a * np.exp(-t / d) * np.sin(2 * math.pi * f1 * t + ph)
    return out


def convolve(sig, ir):
    n = len(sig) + len(ir) - 1
    size = 1 << int(math.ceil(math.log2(n)))
    return np.fft.irfft(np.fft.rfft(sig, size) * np.fft.rfft(ir, size), size)[:len(sig)]


def place(dst, src, at):
    """Adds `src` into `dst` from sample `at` on (clipped to dst)."""
    at = int(at)
    if at >= len(dst) or at + len(src) <= 0:
        return dst
    a, b = max(0, at), min(len(dst), at + len(src))
    dst[a:b] += src[a - at:b - at]
    return dst


def room(rng, seconds=0.6, rt=0.4, early=(), bright=1.0):
    """A room's impulse response: a few early reflections [(ms, gain)], then a
    tail that dies in `rt` seconds (its top end sooner), at unit energy."""
    n = int(seconds * SR)
    t = secs(n)
    ir = np.zeros(n)
    for lo, hi, k, w in ((80, 400, 1.15, 0.8), (400, 2500, 1.0, 1.0), (2500, 12000, 0.55 * bright, 0.6 * bright)):
        ir += w * noise(rng, n, lo, hi) * np.exp(-t * 6.91 / (rt * k))
    ir *= np.clip((t - 0.003) / 0.006, 0, 1)
    for ms, g in early:
        i = int(ms * SR / 1000)
        if i < n:
            ir[i] += g * rng.choice([-1, 1]) * 4
    return ir / np.sqrt((ir ** 2).sum())


def reverb(sig, ir, wet):
    """`sig` with the room `ir` under it, the room at `wet` of the dry RMS."""
    w = convolve(sig, ir)
    dry_rms, wet_rms = np.sqrt((sig ** 2).mean()), np.sqrt((w ** 2).mean()) + 1e-12
    return sig + w * wet * dry_rms / wet_rms


def fade(sig, fade_in=0.0, fade_out=0.0):
    n = len(sig)
    if fade_in:
        k = min(n, int(fade_in * SR))
        sig[:k] *= 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, k))
    if fade_out:
        k = min(n, int(fade_out * SR))
        sig[n - k:] *= 0.5 + 0.5 * np.cos(np.linspace(0, math.pi, k))
    return sig


def loudest(sig, window=0.05):
    """dBFS of the loudest `window`-second stretch (half-window steps)."""
    m = sig if sig.ndim == 1 else sig.mean(axis=1)
    w = max(1, int(window * SR))
    best = max(np.sqrt((m[i:i + w] ** 2).mean()) for i in range(0, max(1, len(m) - w), max(1, w // 2)))
    return 20 * math.log10(best + 1e-12)


def mean_db(sig, start=0.0, end=None):
    m = sig if sig.ndim == 1 else sig.mean(axis=1)
    seg = m[int(start * SR):int(end * SR) if end else len(m)]
    return 20 * math.log10(np.sqrt((seg ** 2).mean()) + 1e-12)


def set_db(sig, now_db, target_db):
    return sig * 10 ** ((target_db - now_db) / 20)


def write(path, sig, bitrate=160000):
    """Writes `sig` (mono, or [n, 2] stereo, ±1) as an MP3 by way of a WAV."""
    sig = np.clip(sig, -0.97, 0.97)
    stereo = sig.ndim == 2
    pcm = (sig * 32767).round().astype("<i2")
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    wav = path.rsplit(".", 1)[0] + ".wav"
    with wave.open(wav, "wb") as w:
        w.setnchannels(2 if stereo else 1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    if path.endswith(".mp3"):
        import aud
        aud.Sound(wav).write(path, rate=SR, channels=aud.CHANNELS_STEREO if stereo else aud.CHANNELS_MONO,
                             format=aud.FORMAT_S16, container=aud.CONTAINER_MP3, codec=aud.CODEC_MP3, bitrate=bitrate)
        os.remove(wav)
    peak = 20 * math.log10(np.abs(sig).max() + 1e-12)
    print(f"written {path}: {len(sig) / SR:.2f} s, peak {peak:.1f} dBFS, loudest 50 ms {loudest(sig):.1f} dBFS")
