# Where each sound comes from

Every sound and piece of music the game ships, with what plays it, and where
it was downloaded. The developer declared them all Pixabay downloads
(Pixabay Content License: commercial use allowed, no attribution required,
not to be redistributed on their own). For each, fill in the page it came
from and whether Pixabay marks the track **Content ID registered**. A track that is
can bring automatic claims on trailers and on streamers' videos of the game,
so either keep Pixabay's certificate for it or replace it.

The intro film (`assets/video/IntroVideo.mp4`) has its own soundtrack. Its
source, and whether the film was made with AI, are to be recorded here too.

## What matters most (2026-11-06)

Every file was downloaded from Pixabay, but no one remembers from whom. On this machine the original downloads are gone, and editing them in ffmpeg removed their tags. The Pixabay licence does not require knowing or naming the author, so the game may use them as they are. The record is only a safeguard.

- **Check first: music and long beds.** These can be registered in Content ID, which brings automatic claims on trailers and on streamers' videos.
  - `global/background.mp3`: about 2:40, plays throughout the game.
  - the soundtrack of the intro film.

  For each one, either find it again on Pixabay (filter by duration and genre, then listen) and note its page and whether it is marked Content ID, or replace it with a track whose page is saved when it is downloaded.
- **Little risk: short effects.** Clicks, steps, doors, keys, water, static, the switch, the gate, the seal, the pen, the vibration. Content ID is for music. Write "Pixabay, uploader not recorded" where the page cannot be found.
- **Removed (2026-11-07):** `Compass/creakingwood.mp3` and `drawingsound.mp3` played nowhere; they wait in .artifacts/removed-assets/2026-11-07.
- **Replaced (2026-11-07):** `HisCot/musicbox.mp3` had been taken from a YouTube video, so it had no licence. It was replaced by `HisCot/musicbox-cumparsita.mp3`, made in code; the old file waits in the same archive.
- **Replaced (2026-11-07):** `Rally/wroom.mp3` was Pixabay's "Fast Car Passing Sound" by moeeza3 (https://pixabay.com/sound-effects/city-fast-car-passing-sound-395038/), which Pixabay labels AI generated. It was replaced by `Rally/car-pass.mp3`, made in code; the old file waits in the archive.
- **Replaced (2026-11-07), made in code instead:** `global/click.mp3`, `global/error.mp3`, `global/nextlevel.wav`, `menuhover.mp3`, `MobilePhone/keypad.mp3`, `MobilePhone/vibration.mp3` and `writingonpaper.mp3`, whose pages were never found. The old files wait in the archive.
- **Replaced (2026-11-07):** `PlantPot/wateringplant.mp3`, whose page was never found, by `PlantPot/pouring-water.mp3`, a Pixabay sound the user chose; the old file waits in the archive.
- **Removed (2026-11-07, the user's call):** the six recorded voices going "aha" (`global/aha1.mp3` to `aha6.mp3`, played by ui/ahas.js every two or three minutes at a puzzle), along with that module; the files wait in the archive.
- **Replaced (2026-11-07):** `Modem/hardwaresound.mp3`, whose page was never found, by `Modem/droid-hum.mp3`, a Pixabay sound the user chose; the old file waits in the archive.
- **Replaced (2026-11-07):** `global/steps.mp3`, which Pixabay labels AI generated ("Walking on wood" by Soumages, https://pixabay.com/sound-effects/film-special-effects-walking-on-wood-363349/), by `global/steps-indoor.mp3`, a recording the user chose; the old file waits in the archive.
- **Replaced (2026-11-07):** `sigilbreak.mp3`, whose page was never found, by `page-turn.mp3`, a Pixabay sound the user chose for the seal; the old file waits in the archive.
- **Replaced (2026-11-08):** `global/game-click.mp3` (made in code the day before) by `global/ui-click.mp3`, a Pixabay click the user chose; the code-made one waits in .artifacts/removed-assets/2026-11-08.
- **Removed (2026-11-07):** `TV/staticsound.mp3` was only loaded by the TV and Metro puzzles, which are in no room. Their static is now made in code (`staticBurst` in src/shared/paint.js), and the file waits in the same archive.
- **Where to fill this in:** the to-do page (http://127.0.0.1:5173/todo/ on the dev server) lists every sound file, plus the intro film's sound track, each with a player and a notes box. What is written there is saved to `todo/notes.json` (scripts/todo-notes.mjs), and the table below is filled in from that file.

| File | Played by | Pixabay page | Content ID? |
| --- | --- | --- | --- |
| `assets/sounds/global/background.mp3` | core/AudioManager.js | | |
| `assets/sounds/global/ui-click.mp3` | core/AudioManager.js | https://pixabay.com/sound-effects/film-special-effects-click-345983/ ("Click UI button sound effect", by u_u4pf5h7zip; Pixabay Content License). Cut to its click and levelled by `art/sound/edits.py`; the download is kept, unshipped, in .artifacts/sources/pixabay/. | Not marked |
| `assets/sounds/global/doorhandle.mp3` | levels/hall/HallScene.js | https://pixabay.com/sound-effects/household-open-close-door-47504/ ("Open_Close_Door", by pixlrelm on Freesound, uploaded by freesound_community; Pixabay Content License) | Not marked |
| `assets/sounds/global/wrong.mp3` | core/AudioManager.js | Not downloaded: made in code by `art/sound/ui_sounds.py` (2026-11-07). | No |
| `assets/sounds/global/mouseclick.wav` | core/AudioManager.js | https://pixabay.com/sound-effects/film-special-effects-mouse-click-290204/ ("Mouse click UI sound effect", by MatthewVakaliuk73627; Pixabay Content License) | Not marked |
| `assets/sounds/global/solved.mp3` | core/AudioManager.js | Not downloaded: made in code by `art/sound/ui_sounds.py` (2026-11-07). | No |
| `assets/sounds/global/steps-indoor.mp3` | ui/footsteps.js | https://pixabay.com/sound-effects/household-steps-indoor-1-6723/ ("Steps indoor 1", by Aurelon on Freesound, uploaded by freesound_community; Pixabay Content License). Cut to four steps and levelled by `art/sound/edits.py`; the download is kept, unshipped, in .artifacts/sources/pixabay/. | Not marked |
| `assets/sounds/global/waterdrop.mp3` | levels/hall/HallScene.js, levels/tapcode/TapCodeScene.js | https://pixabay.com/sound-effects/household-two-drops-87977/ ("Two drops", by Millavsb on Freesound, uploaded by freesound_community; Pixabay Content License) | Not marked |
| `assets/sounds/HisCot/musicbox-cumparsita.mp3` | levels/cot/CotScene.js | Not downloaded: made in code by `art/sound/music_box.py` (2026-11-07). The tune is La Cumparsita (G. H. Matos Rodríguez, 1916; public domain), after John Chambers' ABC transcription; the arrangement and the sound are the project's own. | No |
| `assets/sounds/irongateopensound.mp3` | levels/hall/HallScene.js | https://pixabay.com/sound-effects/household-irongate2-85045/ ("irongate2", by viaaico2013 on Freesound, uploaded by freesound_community; Pixabay Content License; our file is its first 3.7 s of 10 s) | Not marked |
| `assets/sounds/Lightswitch/sparkle.mp3` | levels/hall/HallScene.js, levels/lightswitch/LightswitchScene.js | https://pixabay.com/sound-effects/film-special-effects-electricity-106510/ ("Electricity zap sound effect", Link-Boy on Freesound, uploaded by freesound_community; Pixabay Content License) | Not marked |
| `assets/sounds/Lightswitch/switchsound.mp3` | levels/hall/HallScene.js, levels/lightswitch/LightswitchScene.js | https://pixabay.com/sound-effects/film-special-effects-switch-150130/ ("Switch click sound effect", by SoundReality; Pixabay Content License) | Not marked |
| `assets/sounds/menu-hover.mp3` | ui/startMenu.js | Not downloaded: made in code by `art/sound/menu_hover.py` (2026-11-07). | No |
| `assets/sounds/MobilePhone/key-tone.mp3` | levels/mobilephone/MobilePhoneScene.js | Not downloaded: made in code by `art/sound/phone_key.py` (2026-11-07). | No |
| `assets/sounds/MobilePhone/buzz.mp3` | levels/mobilephone/MobilePhoneScene.js | Not downloaded: made in code by `art/sound/machine_sounds.py` (2026-11-07). | No |
| `assets/sounds/Modem/droid-hum.mp3` | levels/modem/NativeModemScene.js | https://pixabay.com/sound-effects/film-special-effects-droid-hum-72042/ ("Droid Hum", by TheSpiderWriter on Freesound, uploaded by freesound_community; Pixabay Content License). Made into a loop and levelled by `art/sound/edits.py`; the download is kept, unshipped, in .artifacts/sources/pixabay/. | Not marked |
| `assets/sounds/PlantPot/pouring-water.mp3` | levels/plantpot/PlantPotScene.js | https://pixabay.com/sound-effects/household-pouring-water-into-glass-116975/ ("Pouring Water into Glass", by Universfield; Pixabay Content License). Cut to the pour and levelled by `art/sound/edits.py`; the download is kept, unshipped, in .artifacts/sources/pixabay/. | Not marked |
| `assets/sounds/Rally/car-pass.mp3` | levels/rally/RallyScene.js | Not downloaded: made in code by `art/sound/rally_pass.py` (2026-11-07). | No |
| `assets/sounds/page-turn.mp3` | ui/paperSounds.js | https://pixabay.com/sound-effects/film-special-effects-page-turn-305789/ ("Page Turn", by Pixabay user 49053354; Pixabay Content License). Cut so the turn comes with the seal's crack, and levelled, by `art/sound/edits.py`; the download is kept, unshipped, in .artifacts/sources/pixabay/. | Not marked |
| `assets/sounds/Wires/music.mp3` | levels/metadata.js, levels/wires/WiresScene.js | https://pixabay.com/sound-effects/musical-amazing-grace-on-harmonica-26135/ ("Amazing grace on harmonica", by JordanDurren on Freesound, uploaded by freesound_community; Pixabay Content License; the tune and words are public domain) | Not marked |
| `assets/sounds/pen-writing.mp3` | ui/paperSounds.js | Not downloaded: made in code by `art/sound/paper_sounds.py` (2026-11-07). | No |
| `assets/video/IntroVideo.mp4` | ui/introVideo.js | | |
| `assets/video/key-unlock.mp4` | levels/hall/keyInsert.js | | |
