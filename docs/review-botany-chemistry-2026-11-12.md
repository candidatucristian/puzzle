# Review: Botanică și Chimie — 12 noiembrie 2026

Corecțiile de mai jos sunt implementate. Inspecția surselor și a imaginilor din aplicația pornită este făcută; validarea automată, simularea conexiunilor slabe și verificarea build-ului livrat sunt încă în așteptarea acordului explicit cerut conform `AGENTS.md`. Acest document nu certifică absența tuturor bug-urilor și nici pregătirea finală pentru Steam.

## Domeniu

Holul Botanicii, camerele I–VI și cele 18 enigme ale lor; holul Chimiei, camerele VII–IX și cele șapte enigme ale etajului. În holul Chimiei, enigma întrerupătorului este jucată direct în `Upper`. Nu au fost revizuite scenele sau activele etajului de Fizică. Unele corecții necesare se află în componente comune: navigare, încărcare, cache și interfață.

## Probleme reparate

| Problemă | Corecție |
| --- | --- |
| O singură imagine secundară lipsă făcea întreaga cameră neagră, deși obiectele și sclipiciul rămâneau interactive. | Fundalul principal este suficient pentru afișarea camerei. Cadrele secundare și componentele holurilor au înlocuitori când sunt indisponibile. Dacă lipsește o imagine necesară, scena nu pornește interactiv peste negru. |
| Descărcările eșuate nu aveau o recuperare vizibilă. | Două reîncercări automate pentru imaginile/sunetele eșuate, progres localizat, mesaj pentru încărcare lentă și buton de reîncercare a scenei. Patru descărcări simultane în loc de 32. |
| Phaser 3.60 setează timeout-ul XHR fără un handler pentru evenimentul `timeout`; setările implicite ale fiecărui fișier suprascriu și timeout-ul global cu zero. | Timeout de 120 s pe fișier și legarea evenimentului la mecanismul de eșec/reîncercare. |
| Plecarea dintr-o cameră care încă se încărca nu o oprea: `isActive()` exclude preîncărcarea. | Navigarea oprește și scenele în curs de încărcare, pauză sau repaus. Cererile nefinalizate sunt anulate; decodările întârziate nu mai completează o scenă abandonată. |
| Trei texturi active depășeau 4096 px și puteau eșua pe plăci video mai vechi. | Atlasul cărților a fost rearanjat fără micșorarea cadrelor; lupa de chimie și imaginea televizorului din Rally folosesc variante compatibile de maximum 4096 px. |
| Cot, Measures, Herbarium, Molecules și Equations puteau fi declarate gata înaintea construirii conținutului; callback-urile vechi puteau reconstrui o scenă redeschisă. | Inițializarea returnează promisiunea și verifică generația scenei. Ecranul de încărcare așteaptă conținutul. |
| Measures se oprea cu `TypeError: object is not iterable` în `phaserRain.js`. | Poligoanele ferestrei transmit perechi `[x,y]`, formatul cerut de rendererul ploii. Scena a fost redeschisă și inspectată după corecție. |
| Detectarea WebGL din Room VI crea contexte repetate; unele resurse 3D nu erau eliberate complet. | Detectare memorată, contextul de probă eliberat, ținte de mediu și umbre eliberate la ieșire. Room VI revine la fotografia Blender dacă rendererul său nu poate porni sau pierde contextul. Measures poate folosi vasele sale 2D existente. |
| Imaginile camerelor anterioare se acumulau în memorie. | Cache cu estimare CPU + GPU și eliminare a grupurilor inactive peste bugetul de 192 MiB. Imaginile scenei active sunt protejate. Bugetul privește sursele urmărite, nu reprezintă o limită a memoriei totale a jocului. |
| Mișcarea privirii forța citirea geometriei canvasului și când imaginea stătea nemișcată. | Actualizări când se modifică transformarea și sincronizare înaintea clickurilor. |
| Fiecare click pe sticlele de chimie adăuga alte bule permanente; starea inițială a flăcării putea deveni `NaN`. | Rafalele suplimentare sunt temporare; intensitatea pornește de la o valoare finită și scade în funcție de timpul scurs. |
| Escape era reținut permanent de enigma de chimie. | Pune lupa jos când este ținută; altfel permite revenirea în cameră. |
| Caietul lui Silas avea titluri, explicații și legende în engleză indiferent de limbă. | Traduceri în toate cele șase limbi, redesenare la schimbarea limbii/fonturilor și încadrare pentru texte lungi și chineza simplificată. Simbolurile chimice și răspunsul rămân aceleași. |
| Încărcarea inițială era declarată definitiv eșuată după 45 s, chiar dacă descărcarea continua. | Mesaj de așteptare cu posibilitate de reîncercare; o încărcare întârziată se poate termina normal. Fonturile opționale nu mai blochează nelimitat pornirea. |

## Active adaptate

| Activ folosit în joc | Dimensiuni |
| --- | --- |
| `Bookshelf/native-v6/books.webp` | 4096 × 2130; 45 de cadre la dimensiunile originale |
| `Chemistry/bench-zoom-v2-4096.webp` | 4096 × 1424 |
| `Rally/v1/tv-4096.webp` | 4096 × 2178 |

Randările originale Blender/Cycles au fost păstrate. Nu s-a folosit generare AI de imagini. Publicatoarele respective au fost actualizate pentru a produce și variantele compatibile.

## Verificări efectuate

- Inspecție de surse, inclusiv codul efectiv al încărcătorului Phaser instalat.
- Verificare de sintaxă cu `node --check` pentru componentele schimbate; fără erori de sintaxă în fișierele verificate.
- Inventar de 219 imagini din directoarele celor două etaje: fără fișiere de imagine invalide. Cele trei originale mai mari de 4096 px încă există, dar rutele active modificate folosesc variantele compatibile.
- Inventar de 305 fișiere sursă: fără importuri relative lipsă și fără etichete literale de interacțiune lipsă din dicționarele celor șase limbi. Referințele la zece imagini vechi din randerele fotografice de rezervă sunt consemnate separat; nu au fost restaurate active vechi retrase.
- Deschidere și inspecție vizuală printr-o sesiune izolată Chrome, la 1440 × 1000, pentru spațiile și enigmele celor două etaje. Au fost inspectate și lupa de chimie și revenirea cu Escape. Salvarea utilizatorului nu a fost modificată.
- Inspecție a paginilor localizate ale caietului, inclusiv texte mai lungi și caractere chinezești, la 1280 × 720.

Capturi și inventare: `.artifacts/review-2026-11-12/`. Fișierele `contact-botanyRooms.png`, `contact-chemistry.png`, `contact-botanyA.png` și `contact-botanyB.png` reunesc imaginile pentru examinare. Capturile sunt dovezi vizuale punctuale, nu rezultate ale unei suite de teste.

## Validare rămasă

Nu au fost rulate teste automate, lint sau build. Au fost pregătite regresii în `tests/unit/scene-loading.test.js`, fără a le executa. Acordul pentru acestea a fost cerut separat, deoarece `AGENTS.md` cere explicit autorizare.

Înainte de a declara versiunea pregătită pentru Steam mai trebuie verificate: conexiune lentă/întreruptă și reîncercare, descărcări anulate la navigare rapidă, rulare prelungită și memorie, toate mecanicile și rezolvările enigmelor, salvare/reîncărcare, combinațiile de rezoluții și limbi, build-ul final și un PC cu performanțe apropiate de minimul declarat. Inspecția vizuală locală nu măsoară FPS-ul pe acel PC. Cot continuă să folosească three.js/WebGL2; compatibilitatea lui cu hardware fără WebGL2 nu este certificată de aceste corecții.
