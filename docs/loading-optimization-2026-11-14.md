# Încărcarea camerelor — 14 noiembrie 2026

Optimizările începute pe 13 noiembrie sunt implementate. Pe 14 noiembrie a fost reluată și încheiată inspecția locală rămasă la holul Chimiei. Această continuare documentează implementarea existentă; nu modifică suplimentar codul jocului.

## Comportament implementat

- La deschiderea unei uși, jocul începe să descarce imaginile camerei alese, cu maximum două cereri speculative simultane. Intrarea folosește fișierele deja primite sau așteaptă cererea aflată în curs. Descărcarea și pregătirea texturilor rămân etape distincte.
- Un cache de sesiune păstrează maximum 32 MiB de fișiere comprimate. Astfel, eliminarea texturilor inactive din memoria grafică nu obligă jocul să descarce din nou aceleași imagini. Cache-ul nu persistă după reîncărcarea paginii și elimină fișierele vechi când depășește bugetul.
- Bugetul estimat pentru imaginile decodate urmărite este acum 384 MiB, față de cei 192 MiB din raportul din 12 noiembrie. Evacuarea se oprește imediat ce ajunge sub buget, iar imaginile grupurilor active sunt protejate. Acesta nu este un plafon pentru memoria totală a aplicației.
- Camerele cu atlas nativ de cufăr folosesc cadrele existente în atlas pentru pozițiile deschis/închis și nu mai solicită cele două imagini separate sau cufărul generic.
- Mesajul de încărcare apare după 450 ms, evitând apariția lui foarte scurtă la o tranziție rapidă. Erorile și reîncercările rămân vizibile.

## Reducere verificată din fișiere

Pentru imaginile proprii primei camere (`Study`), inclusiv cheia comună:

| | Înainte | Acum |
| --- | ---: | ---: |
| Fișiere necesare la încărcare fără cache | 7 | 4 |
| Date comprimate | 855.704 octeți | 645.644 octeți |

Reducerea este de 210.060 octeți, adică **24,55%**, fără micșorarea rezoluției imaginilor. Numerele nu includ resursele interfeței sau tutorialului, care se pot încărca separat la prima vizită. Procentul privește datele, nu timpul total de încărcare.

## Observații din aplicația pornită

Inspecție interactivă în Chrome izolat, la 1440 × 1000, pe serverul local de dezvoltare, cu o salvare separată de cea a utilizatorului:

| Traseu | Observație |
| --- | --- |
| Holul Chimiei → deschiderea ușii VII → intrare | Descărcarea imaginilor camerei începe la primul click. După al doilea click, încărcarea celor șapte imagini folosește URL-uri locale `blob:`, fără cereri HTTP noi pentru ele. |
| Camera VII → Chemistry → Escape | Revenire cu fundalul complet și fără cereri noi pentru imagini. |
| Study → Cryptex → Room6 → Study | În Room6, textura principală Study nu mai era prezentă în lista texturilor. La revenire, fundalul și atlasul cufărului s-au refăcut folosind fișierele comprimate păstrate, fără cereri HTTP noi pentru imagini. |

Au fost inspectate capturile holului Chimiei, camerei VII și revenirii sale, enigmei Chemistry, enigmei Cryptex, camerei VI și primei camere după revenire. Nu au apărut erori de pagină sau erori de consolă în această sesiune. Cele zece fișiere JavaScript implicate în optimizare au trecut verificarea de sintaxă `node --check`.

Capturi și instrumentul interactiv: `.artifacts/loading-review-2026-11-14/`. Valorile „Observed after ms” din consola instrumentului includ timpul dintre comenzile manuale; nu sunt măsurători ale duratei de încărcare.

## Limitele verificării

Nu au fost rulate teste automate, lint sau build. Nu au fost simulate conexiuni lente, întreruperi ori lipsa memoriei și nu a fost măsurată performanța pe calculatorul vechi. Prima descărcare, decodarea imaginilor și reconstruirea scenei pot necesita în continuare așteptare; beneficiul confirmat aici este evitarea descărcărilor repetate și reducerea datelor necesare.
