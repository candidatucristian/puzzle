// The to-do list's own tasks: what is left before the Steam release, beside
// the audit (audit.json, from scripts/license-audit.mjs). Each has an id (its
// tick is kept in this browser by it), who does it ("tu" or "eu"), and tags.
// Written on 2026-11-07; change freely.

export const SECTIONS = [
  {
    id: "steam",
    title: "Steam",
    intro: "Contul e făcut, taxa plătită (7 noiembrie), banca, formularul fiscal și actul trimise. Acum se așteaptă verificarea.",
    tasks: [
      { id: "steam-verify", who: "tu", title: "Aștepți e-mailul de la Valve că verificarea e gata", detail: "Până la 30 de zile lucrătoare. Nu-i contacta prin suport între timp." },
      { id: "steam-iban", who: "tu", title: "Verifici că IBAN-ul dat la Steam e al contului în USD", detail: "La ING fiecare monedă are IBAN propriu. Dacă e cel în lei, deschizi un cont în USD în Home'Bank și schimbi IBAN-ul." },
      { id: "steam-app", who: "tu", title: "Creezi aplicația „Ashcombe Manor” în Steamworks", detail: "După verificare. Primești App ID-ul; de acolo se face pagina magazinului." },
      { id: "steam-art", who: "eu", title: "Imaginile paginii de Steam, randate în Blender", detail: "Capsulele (header, small, main, vertical), imaginile de bibliotecă, logo-ul, minimum 5 capturi la 1920×1080." },
      { id: "steam-text", who: "eu", title: "Descrierea scurtă și cea lungă", detail: "Le scriu, tu le aprobi.", tags: ["text"] },
      { id: "steam-ai", who: "tu", title: "Completezi declarația despre AI (Content Survey)", detail: "După ce hotărâm ce rămâne AI în joc: textele, biroul din prolog, filmul." },
      { id: "steam-coming", who: "tu", title: "Pagina „Coming soon” publică minimum 2 săptămâni", detail: "Cel mai devreme se poate lansa pe 28 noiembrie 2026 (21 de zile de la plată)." },
      { id: "steam-url", who: "eu", title: "Pun adresa paginii de Steam în joc", detail: "STEAM_STORE_URL din src/shared/house.js: butonul de wishlist de la finalul demo-ului apare și în varianta publicată." },
      { id: "steam-desktop", who: "eu", title: "Aplicația pentru Windows (Electron)", detail: "Varianta care se urcă pe Steam; fonturile toate în joc, fără internet." },
    ],
  },
  {
    id: "site",
    title: "Site și demo",
    intro: "ashcombemanor.com e pe Netlify; acum acolo e demo-ul jocului, nu pagina de prezentare.",
    tasks: [
      { id: "site-landing", who: "eu", title: "Pagina de prezentare pe ashcombemanor.com, demo-ul la /play", detail: "Pe telefon oamenii văd acum doar „only on desktop”; așa ar vedea conacul, cazul și camerele." },
      { id: "site-coming", who: "eu", title: "„Coming soon to Steam” la finalul demo-ului", detail: "Până există adresa paginii de Steam." },
      { id: "demo-test", who: "eu", title: "O trecere completă prin demo, de la film până la final", detail: "E public și nu l-a jucat nimeni cap-coadă. (Cu acordul tău: e un test.)" },
      { id: "site-mail", who: "tu", title: "contact@ashcombemanor.com", detail: "Netlify nu face e-mail: ImprovMX (gratuit) îl trimite spre adresa ta; sau îl scot de pe pagină." },
    ],
  },
  {
    id: "code",
    title: "Cod de curățat",
    intro: "Ce a rămas în cod fără să mai fie folosit.",
    tasks: [
      { id: "code-tests", who: "eu", title: "Testul vechi al dosarului (tests/browser/casefile.spec.js)", detail: "Scris pentru dosarul de dinainte de carte; de rescris sau de scos." },
    ],
  },
  {
    id: "text",
    title: "Texte",
    tasks: [
      { id: "text-ai", who: "tu", title: "Textele poveștii și traducerile RO/RU sunt scrise cu AI", detail: "Pe Steam se declară, sau le rescrii tu. Hotărăște înainte de declarația AI." },
      { id: "text-hall", who: "tu", title: "Nota din hol spune „Poarta a fost lăsată descuiată pentru mine”", detail: "În demo poarta de pe scări e încuiată. O lăsăm așa?" },
    ],
  },
  {
    id: "archive",
    title: "Arhiva fișierelor scoase",
    intro: "Ce am scos din joc nu e șters: stă în .artifacts/removed-assets, câte un dosar pe zi (2026-11-07, 2026-11-08), cu aceeași structură de dosare.",
    tasks: [
      { id: "archive-delete", who: "tu", title: "Ștergi arhiva după ce ai jucat și totul merge", detail: "Versiuni vechi de randări, fișiere pe care nu le mai cere nimic, imaginile AI ale rezervelor moarte. O parte nu erau în git, deci odată șterse nu se mai pot recupera." },
      { id: "archive-ffmpeg", who: "tu", title: "Ștergi ffmpeg-ul descărcat (C:\\Users\\crist\\Tools\\ffmpeg-dl, 501 MB)", detail: "N-a putut fi folosit; filmul s-a comprimat cu Blender." },
    ],
  },
];

// what each sound is, in a word (by its file under public/assets/sounds/)
export const SOUND_NAMES = {
  "video/IntroVideo.mp4": "Sunetul filmului de intro",
  "global/background.mp3": "Muzica de fundal a jocului",
  "Modem/hardwaresound.mp3": "Muzica din nivelul cu routerul",
  "Modem/droid-hum.mp3": "Zumzetul de sub birou (routerul)",
  "HisCot/musicbox-cumparsita.mp3": "Cutia muzicală de la pătuț (făcută din cod)",
  "Wires/music.mp3": "„Amazing Grace” la muzicuță (nivelul cu firele)",
  "global/nextlevel.wav": "Melodia scurtă de nivel rezolvat",
  "writingonpaper.mp3": "Peniță pe hârtie (scrisorile)",
  "MobilePhone/vibration.mp3": "Telefonul care vibrează",
  "irongateopensound.mp3": "Poarta de fier care se deschide",
  "global/steps.mp3": "Pași",
  "global/steps-indoor.mp3": "Pași",
  "sigilbreak.mp3": "Sigiliul de ceară care se rupe",
  "page-turn.mp3": "Sigiliul și foaia scrisorii",
  "global/error.mp3": "Greșeală (cod greșit)",
  "global/click.mp3": "Clic în joc",
  "PlantPot/wateringplant.mp3": "Udatul plantei",
  "PlantPot/pouring-water.mp3": "Udatul plantei",
  "global/waterdrop.mp3": "Picătură de apă",
  "global/doorhandle.mp3": "Clanța ușii",
  "menuhover.mp3": "Trecerea peste meniu",
  "menu-hover.mp3": "Trecerea peste meniu (făcută din cod)",
  "global/ui-click.mp3": "Clic în joc",
  "global/wrong.mp3": "Greșeală (făcută din cod)",
  "global/solved.mp3": "Nivel rezolvat (făcut din cod)",
  "MobilePhone/buzz.mp3": "Vibrația telefonului (făcută din cod)",
  "pen-writing.mp3": "Peniță pe hârtie (făcută din cod)",
  "global/mouseclick.wav": "Clic de mouse în meniuri",
  "MobilePhone/keypad.mp3": "Tastele telefonului",
  "MobilePhone/key-tone.mp3": "Tastele telefonului (făcute din cod)",
  "Lightswitch/switchsound.mp3": "Întrerupătorul",
  "Rally/car-pass.mp3": "Mașina de raliu (făcută din cod)",
  "Lightswitch/sparkle.mp3": "Sclipire",
};

// sounds made to replace one that has no licence: shown first, beside the old one
export const CANDIDATES = [
  // (made in code, heard here first and taken into the game on 2026-11-07: the music box, the rally car,
  // the phone's keys and buzz, the menu's tick, the click, the wrong note, the solved swell, the pen)
];

// what to do about each kind of finding in the audit
export const ADVICE = {
  sounds: "Toate fișierele de sunet ale jocului. Ascultă-l pe fiecare, caută-l pe pixabay.com (Muzică sau Efecte sonore, filtrează după durată) și scrie sub el ce afli: numele lui adevărat, autorul, linkul paginii și dacă scrie „Content ID registered”. Ce nu găsești, scrie „negăsit” și îl înlocuim. Începe cu muzica, acolo e riscul: piesele cu Content ID aduc reclamații automate pe trailere și pe videourile streamerilor.",
  saved: "Ce scrii se salvează singur în todo/notes.json, în proiect, și de acolo îl citesc eu.",
  unsaved: "Notițele nu se pot salva în fișier: serverul pornit e de dinainte de schimbare. Oprește „npm run dev” și pornește-l din nou. Până atunci se țin doar în browserul ăsta.",
  madeInCode: "Restul sunetelor jocului nu sunt fișiere: sunt făcute din cod, deci n-au nevoie de licență. Așa sunt casa care scârțâie, vântul, ploaia, focul, foșnetul scrisorilor și sunetele mici ale puzzle-urilor. Tot din cod e și cutia muzicală, deși e un fișier (art/sound/music_box.py îl face).",
  ai: "Imagini generate cu AI care se încarcă încă în joc. În demo doar biroul din prolog; restul sunt în camerele de după III. Fiecare se înlocuiește cu o randare Blender înainte de lansarea jocului complet, sau se declară pe Steam.",
  unknown: "Nimic din proiect nu spune de unde vin. Spune-mi tu (Blender, Pixabay, AI, altceva), sau le înlocuim.",
  pixabay: "Declarate de pe Pixabay în registrul din septembrie, fără pagina exactă. Sunt folosite doar de puzzle-ul TV, care nu e în nicio cameră.",
  fonts: "Trei fonturi se încarcă de la Google. Licențele lor permit totul, dar jocul de pe Steam trebuie să meargă fără internet: le copiez în joc la pasul cu aplicația pentru Windows.",
};
