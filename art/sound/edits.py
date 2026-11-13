# The game's sounds that are Pixabay recordings, chosen by the developer and
# fitted here to where the game plays them: cut, eased in and out, set at the
# level of the sound each replaced, and, where the game loops one, made into
# a loop that runs on into itself. The downloads are kept, unshipped, in
# .artifacts/sources/pixabay/ (Pixabay's licence allows them in the game, not
# handed on by themselves); each one's page and credit is below and in
# docs/SOUND_SOURCES.md.
#
#   blender --background --factory-startup --python art/sound/edits.py -- [name …]
#   (no names: all of them; output under public/assets/sounds/)
import sys, os, wave, math
import aud
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
SOURCES = os.path.join(ROOT, ".artifacts", "sources", "pixabay")
OUT = os.path.join(ROOT, "public", "assets", "sounds")

EDITS = {
    # The watering can (PlantPot, Room I). The level tips the can for 400 ms,
    # pours for one second, then sets it back, and the sound starts as the can
    # tips. The recording's water comes in about half a second after its start,
    # pours to 1.4 s and drips after: so it is taken from 0.10 s (its water then
    # lands as the stream starts) to 2.45 s, drips and all. The old sound sat at
    # -40 dBFS and was barely heard; this one is set as loud as the seal and the
    # click.
    "watering": dict(
        kind="cut", out="PlantPot/pouring-water.mp3",
        source="universfield-pouring-water-into-glass-116975.mp3",
        page="https://pixabay.com/sound-effects/household-pouring-water-into-glass-116975/",
        credit='"Pouring Water into Glass" by Universfield',
        start=0.10, end=2.45, fade_in=0.05, fade_out=0.35, loudest=-30.0, bitrate=160000),
    # The room beneath the desk (the router level, Room II), looped for as long
    # as one stays. The recording fades in over its first seconds and out over
    # its last, so the loop is its middle, 5 s to about 21 s: its last three
    # seconds are faded, at constant power, into the three that led up to its
    # start, so the end runs on into the beginning. The exact end is chosen,
    # within a tenth of a second, where it best matches what led into the start.
    "router hum": dict(
        kind="loop", out="Modem/droid-hum.mp3",
        source="freesound_community-droid-hum-72042.mp3",
        page="https://pixabay.com/sound-effects/film-special-effects-droid-hum-72042/",
        credit='"Droid Hum" by TheSpiderWriter (Freesound), uploaded by freesound_community',
        start=5.0, end=21.0, join=3.0, mean=-36.5, bitrate=128000),
    # Footsteps through the house's halls. The longest walk the game plays them
    # for is 1.9 s, so four steps are enough, as the old sound had: the
    # recording steps every half second from 0.60 s, and is taken from just
    # before its first step to just before its fifth, at the old sound's level.
    "footsteps": dict(
        kind="cut", out="global/steps-indoor.mp3",
        source="freesound_community-steps-indoor-1-6723.mp3",
        page="https://pixabay.com/sound-effects/household-steps-indoor-1-6723/",
        credit='"Steps indoor 1" by Aurelon (Freesound), uploaded by freesound_community',
        start=0.565, end=2.585, fade_in=0.01, fade_out=0.08, loudest=-14.8, bitrate=160000),
    # A letter's seal giving way and the flap turned back (ui/paperSounds.js).
    # The game starts the sound at its first sound on the Blender rig's crack
    # frame. The recording lifts the page softly at 0.05 s and turns it at 0.3 s;
    # it is taken from just before the turn, so the turn comes with the crack
    # (its loudest a tenth of a second on, as the old seal's was), and eased out
    # of the quiet rustle after it, at the old seal's level.
    "seal": dict(
        kind="cut", out="page-turn.mp3",
        source="49053354-page-turn-305789.mp3",
        page="https://pixabay.com/sound-effects/film-special-effects-page-turn-305789/",
        credit='"Page Turn" by Pixabay user 49053354',
        start=0.27, end=1.15, fade_in=0.005, fade_out=0.35, loudest=-25.4, bitrate=128000),
    # A click at a puzzle (AudioManager "click"). The recording's click comes
    # at 0.05 s: it is taken from just before, so it sounds as the button is
    # pressed, at the level of the click it replaces.
    "click": dict(
        kind="cut", out="global/ui-click.mp3",
        source="u_u4pf5h7zip-click-345983.mp3",
        page="https://pixabay.com/sound-effects/film-special-effects-click-345983/",
        credit='"Click UI button sound effect" by u_u4pf5h7zip',
        start=0.04, end=0.16, fade_in=0.002, fade_out=0.03, loudest=-27.3, bitrate=128000),
}


def loudest_rms(mono, rate):
    win = int(0.05 * rate)
    return max(np.sqrt((mono[i:i + win] ** 2).mean()) for i in range(0, len(mono) - win, win // 2))


def cut(e, src, out):
    """Cut [start, end], eased in and out, its loudest 50 ms at `loudest`
    dBFS (less, if that would take its peak past -1 dBFS)."""
    clip = aud.Sound(src).limit(e["start"], e["end"])
    rate = clip.specs[0]
    data = clip.data().astype(np.float64)
    mono = data.mean(axis=1) if data.ndim > 1 else data
    gain = 10 ** (e["loudest"] / 20) / loudest_rms(mono, rate)
    gain = min(gain, 10 ** (-1 / 20) / (np.abs(data).max() + 1e-12))
    length = e["end"] - e["start"]
    shaped = clip.fadein(0, e["fade_in"]).fadeout(length - e["fade_out"], e["fade_out"]).volume(float(gain))
    stereo = data.ndim > 1 and data.shape[1] == 2
    shaped.write(out, rate=int(rate), channels=aud.CHANNELS_STEREO if stereo else aud.CHANNELS_MONO,
                 format=aud.FORMAT_S16, container=aud.CONTAINER_MP3, codec=aud.CODEC_MP3, bitrate=e["bitrate"])
    return f"{length:.2f} s, gain {20 * math.log10(gain):+.1f} dB, peak {20 * math.log10(np.abs(data).max() * gain):.1f} dBFS"


def loop(e, src, out):
    """The stretch [start, ≈end] made to run on into itself, at `mean` dBFS."""
    snd = aud.Sound(src)
    rate = int(snd.specs[0])
    x = snd.data().astype(np.float64)
    if x.ndim == 1:
        x = x[:, None]
    s, k = int(e["start"] * rate), int(e["join"] * rate)
    lead = x[s - k:s].mean(axis=1)
    best, end = -2.0, int(e["end"] * rate)
    for j in range(int((e["end"] - 0.1) * rate), int((e["end"] + 0.1) * rate)):
        tail = x[j - k:j].mean(axis=1)
        c = float(np.dot(tail, lead) / (np.linalg.norm(tail) * np.linalg.norm(lead) + 1e-12))
        if c > best:
            best, end = c, j
    body = x[s:end].copy()
    theta = np.linspace(0, math.pi / 2, k)[:, None]
    body[-k:] = x[end - k:end] * np.cos(theta) + x[s - k:s] * np.sin(theta)
    level = 20 * math.log10(np.sqrt((body ** 2).mean()) + 1e-12)
    body *= 10 ** ((e["mean"] - level) / 20)
    pcm = (np.clip(body, -0.97, 0.97) * 32767).round().astype("<i2")
    wav = out.rsplit(".", 1)[0] + ".wav"
    with wave.open(wav, "wb") as f:
        f.setnchannels(body.shape[1]); f.setsampwidth(2); f.setframerate(rate); f.writeframes(pcm.tobytes())
    aud.Sound(wav).write(out, rate=rate, channels=aud.CHANNELS_STEREO if body.shape[1] == 2 else aud.CHANNELS_MONO,
                         format=aud.FORMAT_S16, container=aud.CONTAINER_MP3, codec=aud.CODEC_MP3, bitrate=e["bitrate"])
    os.remove(wav)
    return f"loop {e['start']:.2f}-{end / rate:.3f} s, join match {best:.3f}, gain {e['mean'] - level:+.1f} dB"


wanted = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for name, e in EDITS.items():
    if wanted and name not in wanted:
        continue
    src, out = os.path.join(SOURCES, e["source"]), os.path.join(OUT, e["out"])
    if not os.path.exists(src):
        print(f"skipped {name}: no download at {src}")
        continue
    print(f"written {e['out']} ({name}): " + (cut if e["kind"] == "cut" else loop)(e, src, out))
