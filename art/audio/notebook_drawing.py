"""Create the notebook's audible half-second cue from the supplied recording."""
import aud
import json
import os
import wave
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
source = os.path.join(ROOT, 'public/assets/sounds/drawingsound.mp3')
target = os.path.join(ROOT, 'public/assets/sounds/drawingsound-500ms.wav')
recording = aud.Sound.file(source)
rate = int(recording.specs[0])
samples = np.asarray(recording.data(), dtype=np.float32)
if samples.ndim == 1:
    samples = samples[:, None]
samples = np.nan_to_num(samples)
length = round(rate * .5)
energy = np.mean(samples.astype(np.float64) ** 2, axis=1)
total = np.concatenate(([0.0], np.cumsum(energy)))
offset = int(np.argmax(total[length:] - total[:-length])) if len(samples) >= length else 0
clip = samples[offset:offset + length].copy()
if len(clip) < length:
    clip = np.pad(clip, ((0, length - len(clip)), (0, 0)))
peak = float(np.max(np.abs(clip)))
if peak > 0:
    clip *= .8 / peak
fade = min(round(rate * .006), length // 4)
clip[:fade] *= np.linspace(0, 1, fade)[:, None]
clip[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(target, 'wb') as output:
    output.setnchannels(clip.shape[1])
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes((np.clip(clip, -1, 1) * 32767).astype('<i2').tobytes())
metadata = {
    'source': 'drawingsound.mp3', 'output': 'drawingsound-500ms.wav',
    'sourceDuration': len(samples) / rate, 'sourceOffset': offset / rate,
    'duration': .5, 'sourceFirstHalfRMS': float(np.sqrt(np.mean(energy[:length]))),
    'selectedSourceRMS': float(np.sqrt(np.mean(energy[offset:offset + length]))),
}
os.makedirs(os.path.join(ROOT, '.artifacts'), exist_ok=True)
with open(os.path.join(ROOT, '.artifacts/notebook-drawing-audio.json'), 'w', encoding='utf-8') as output:
    json.dump(metadata, output, indent=2)
print(json.dumps(metadata), flush=True)
