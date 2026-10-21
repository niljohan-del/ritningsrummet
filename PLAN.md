# Ritningsrummet — projektplan

Utgångspunkt: `baseline/Ritningsrummet-3.6.html` (22,1 MB, en fil)
Uppdaterad 2026-10-21 efter genomgång och testning av `RR`-modulen.

---

## Kort svar: ja, men av ett annat skäl än filstorleken

Enfilslösningen är välbyggd. `RR`-modulen använder RK4-integration för
framaxelföljning och exakt sluten form för rörelse vid konstant styrutslag —
det är korrekt gjort, inte hemmasnickrat. Koden ligger redan i tre namngivna
moduler utan DOM-beroenden. Att allt är inbäddat är ett medvetet och riktigt
val för en jobbdator där du inte får installera något.

Skälet att göra det till ett projekt är att **161 KB i ett enda scope med 164
funktioner har nått gränsen för vad som går att ändra säkert**, och att det
inte fanns något sätt att testa matematiken separat från gränssnittet.

Målet är inte att sluta leverera en enda fil. Målet är att **fortsätta leverera
en enda fil, byggd ur delar som går att testa.**

---

## Vad som redan är gjort

**`RR` är utbruten och testad.** 64 tester mot analytiska facit, inte mot
tidigare utdata. Sviten körs med enbart Node, utan npm eller byggsteg:

```
node --test "test/**/*.test.js"
```

Matematiken håller. Kontrollerat mot slutna formler:

| Kontroll | Facit | Resultat |
|---|---|---|
| Bakaxelns offtracking, LBn på Rf = 12 m | √(Rf²−L²) = 10,392 m | inom 1 cm |
| Styrutslag i samma kurva | asin(L/Rf) = 30,0° | inom 0,1° |
| Bakaxelradie vid konstant styrutslag | L/tan δ | inom 1 µm |
| Kursändring per sträcka | s·tan δ / L | inom 1 nrad |
| Backning med styrutslag | samma radie som framåt | inom 1 µm |
| Båglängd kvartscirkel ur bulge | R·π/2 | inom 1 mm |

**Ett riktigt fel hittades och är rättat.** I `scaleCandidates` avgjordes om en
träff var en explicit skalangivelse av om ordet "skala" fanns någonstans i ett
fönster på ±80 tecken runt träffen — inte av om träffen faktiskt inleddes med
ordet. Följden:

```
"A3 utskrift. Lutning 1:20 i korsningen. SKALA 1:400"
   före:  1:20 explicit=true  ← hamnade först i förslagslistan
          1:400 explicit=true
   efter: 1:400 explicit=true
          1:20  explicit=false
```

En lutningsangivelse presenterades alltså som det främsta skalförslaget. Klickar
man på det blir varje mått i granskningen fel med faktor 20. Regexen fångade
redan prefixet i `m[0]`, så rättningen är ett tecken. Två regressionstester
täcker fallet, och de faller på den orättade modulen — vilket är beviset på att
de mäter något.

**Ledade fordon är modellerade och verifierade.** `attachUnits` bygger en kedja
av släpade enheter. Villkoret är att en släpad axel inte kan röra sig i sidled,
vilket ger samma ekvation som framaxelföljningen redan använder,
dθ/ds = sin(α − θ)/L, integrerad med RK4 mot kopplingspunktens egen färdsträcka.
Formeln är oförändrad vid backning — där pekar α motsatt θ och avvikelsen växer
av sig själv, så fällkniv uppstår utan specialfall.

Facit är den slutna formen √(R₁² + c² − L₂²) för stationär kurva, som är
oberoende av simuleringen. Avvikelse: **0,04 mm för Bl, 0,02 mm för Lps.**
Mutationstest bekräftar att testerna biter — ändrat släpaxelavstånd, flyttad
ledpunkt och nedgradering från RK4 till Euler fäller tre test var.

Geometrin är belagd, inte gissad. Se `ARKITEKTUR.md` för härledningen av
vändskivans läge och skälet att Ls utelämnats.

**Rättningen finns i det körbara verktyget redan.**
`dist/Ritningsrummet-3.6.1.html` är baseline med exakt tre textbyten: fixen och
två versionsnummer. Inbäddade bibliotek och välkomstbild är byte-identiska
(sha256 kontrollerad), 3 av 723 rader ändrade. Använd den filen från och med nu.
Den återskapas med `node tools/patch-baseline.mjs`.

---

## Vad jag också hittade, och som inte är en bugg

**3.6 hade inga ledade fordon.** Fordonslistan innehöll `P`, `LBn` och ett eget
stelt fordon, och `RR` hade ingen ledad modell alls. Det var den största
funktionsluckan — värd mer än hela omstruktureringen för en trafikplanerare.
Modellen finns nu; se etapp 2.

**Typfordon Ls går inte att leverera på belagd grund.** Varken VGU:s
grundvärden eller DETESS publicerar dess axel- och dragstångsgeometri, och ett
verkligt timmersläp är dollystyrt — tre kroppar, inte två. `attachUnits` klarar
kedjor av flera enheter, så Ls blir en ren datarad så snart måtten finns
belagda. Att gissa dem vore att bygga in precis den feltyp verktyget ska hitta.

---

## Vad vi har idag, mätt

| Del | Rad | Storlek i filen | Avkodat |
|---|---|---|---|
| Vendor-bibliotek (base64-JSON) | 98 | 16,24 MB | 11,61 MB |
| Välkomstbild (base64-PNG) | 54 | 6,38 MB | 4,78 MB (2048×1147) |
| CSS | 5 | 12,8 KB | — |
| **Huvudapp** | 321–721 | **161 KB** | 164 funktioner |
| Geometri + DXF (`RR`) | 99–247 | 22 KB | 21 funktioner |
| Gatusektioner (`RS`) | 259–302 | 7 KB | 6 funktioner |
| Pappersformat (`LC`) | 303–320 | 4 KB | 6 funktioner |

Två rader är 99 % av filen. Den riktiga koden är 245 KB. Detaljerad
kartläggning ligger i `ARKITEKTUR.md`.

---

## Etapper

**Etapp 1 — Testa `RR`. KLAR.**
64 tester, ett fel hittat och rättat, körbart utan byggsteg.

**Etapp 2 — Ledade fordon. KLAR.**
`attachUnits` i `src/core/rr.js` fäster släpade enheter på resultatet från
vilken som helst av de fem `simulate*`-varianterna, så ledade fordon fungerar
lika i alla körspårslägen utan att någon av dem rörts. Bl och Lps finns i
fordonslistan med belagd geometri.

Inkopplat i gränssnittet: `calculateSweep` fäster enheterna och `drawSweep`
ritar dem i samma fyllnadsbana som dragfordonet, så överlappen inte mörknar.
Verifierat i appen — stela fordon får inga enheter, Bl och Lps får sin
släpvagn.

**Etapp 3 — Bryt ut assets och dela upp filerna. KLAR.**
Koden flyttades ordagrant till `src/`, tillgångarna till `public/`. Enda
kodändringen är tillgångslagret, som nu klarar både inbäddat och hämtat.

Två saker visade sig först när appen faktiskt kördes. CSS:en sträcker sig över
flera rader, inte en — ett första försök hårdkodade radnummer och lade tyst
halva stilmallen som löptext i markupen. Och enfilsversionen bär en hårdspänd
CSP utan `'self'`, som blockerade allt utbrutet. Båda hittades av att jämföra
renderingen mot baseline, inte av att läsa koden.

**Etapp 4 — Byggsteg. KLAR, men inte med Vite.**
Appen är fem klassiska skript som delar globalt scope, och en bundlare skulle
skriva om just det. Inversen av uppdelningen är femtio rader utan beroenden och
går att jämföra rakt mot baseline. `tools/build-offline.mjs` väver ihop filen
igen och sätter tillbaka den strikta CSP:n.

Verifierat: baseline, serverad version och offline-fil ger identiskt resultat
på inläst DXF — samma sidmått, samma skala och samma bläcktäckning på canvasen
ned till andra decimalen.

| Bygge | Storlek |
|---|---|
| baseline 3.6 | 22,10 MB |
| offline, komplett | 16,15 MB |
| offline, `--slim` utan CJK | 14,66 MB |

**Etapp 5 — Dela upp huvudappen. KLAR.**
161 KB blev 14 filer i `src/app/`, en per arbetsområde. Koden visade sig redan
ligga tematiskt ordnad, så uppdelningen kunde göras med rena snitt: ingen
funktion flyttades och ingen rad skrevs om. Det var avgörande — funktionerna
delar ett globalt scope, och att flytta dem hade gjort dolda beroenden till
fel.

Före ändringen sparades ett beteendefacit, `test/fingerprint.json`: appen körs
i en riktig webbläsare och allt fångas — inläst DXF, skala, körspår för
samtliga fem typfordon med slutpolygoner, arbetslägen, projektstruktur och en
hash av canvasens pixlar. Facit kontrollerades först för determinism (den
första versionen hashade genererade id:n och var slumpmässig).

Både den serverade uppdelningen och offline-filen matchar facit i varje
mätpunkt, pixelhashen inräknad.

**Etapp 6 — Krymp filen**
Uppmätta vinster:

| Åtgärd | Sparar |
|---|---|
| Välkomstbilden som WebP (testat: 324 KB mot 6,38 MB) | 6,0 MB |
| CJK-teckentabeller bort | 1,2 MB |
| OCR laddas vid behov i stället för inbäddat | 6,7 MB |

Med bara de två första går filen från 22,1 till ungefär 14 MB utan att en enda
funktion försvinner. Det är den vinsten jag skulle ta; OCR är värt sina
megabyte på en låst dator.

**Etapp 7 — Git och versionshantering**
Riktig historik, så att "3.6" blir en tagg i stället för ett filnamn.

---

## Överlämning till Claude Code

**Ändrat sedan förra versionen av planen.** Jag skrev tidigare att etapp 1 och 2
kunde göras i chatten och att överlämningen kunde vänta. Det stämmer för
testningen och för ledade fordon — båda är rena beräkningar som går att
verifiera utan att appen körs, och etapp 1 är redan gjord på det sättet.

Men från etapp 3 behövs en terminal i mappen: `npm install`, `npm run dev`,
`git` och framför allt möjligheten att **öppna appen och se att den fortfarande
fungerar** efter varje flytt. Hela kvalitetskravet i etapp 3 är "beter sig
identiskt", och det går inte att intyga utan att köra programmet.

Så: etapp 2 kan göras här. Etapp 3 och framåt i Claude Code, i
`C:\Dev\ritningsrummet`.

---

## Publicering

**GitHub: klart.** Projektet ligger på
`github.com/niljohan-del/ritningsrummet`, pushat till `main` 2026-10-21.
Baseline och byggresultat är utanför git enligt `.gitignore`.

**Vercel: återstår ett klick från dig.** Kopplingen kan läsa dina projekt men
nekar all skrivning — `POST /v11/projects` och `POST /v13/deployments` ger båda
403 med `"remediation": {"actor": "user", "action": "grant_team_access"}`.
Testat tre gånger, det är ingen tillfällig miss.

Enklast: gå till **vercel.com/new** och importera repot. `vercel.json` ligger
redan i det och sätter byggkommando och utkatalog, så det ska inte behövas
några inställningar. Alternativt ger du MCP-kopplingen skrivåtkomst till scopen
`niljohan-7752`, så gör jag det åt dig.

Sidan som publiceras är `web/` — en statussida plus körspårskontrollen, som
byggs av `tools/build-korsparskontroll.mjs` vid varje deploy.

**Den lokala mappen är inte en git-klon.** `C:\Dev\ritningsrummet` har fyllts
genom filöverföring, inte genom `git clone`, så den saknar `.git`. Första gången
du öppnar Claude Code där bör mappen kopplas till repot:

```
git init
git remote add origin https://github.com/niljohan-del/ritningsrummet
git fetch origin
git reset origin/main
```

Då blir baseline och dist kvar på disk medan spårade filer matchar repot.

## Beslut jag behöver från dig

1. **Ledade fordon före omstrukturering?** Jag tycker ja — det är den funktion
   som saknas, och den går att leverera i enfilsversionen utan att vänta på
   resten.
2. **Får verktyget ha ett byggsteg?** Från etapp 4 kan du inte längre redigera
   den levererade filen direkt; ändringar görs i källkoden och byggs om.
3. **Behövs japanska, koreanska och kinesiska PDF:er?** Om nej: 1,2 MB bort,
   ingen märker något.
4. **Ska baseline in i git?** Mitt förslag: nej, den ligger på disk som referens.
   `.gitignore` är redan satt så.

---

## Risker

**Uppdelningen kan tappa funktion.** 164 funktioner i samma scope delar
variabler fritt; flyttar man dem blir dolda beroenden synliga som fel. Därför är
etapp 3 ordagrann flytt och inget annat, och etapp 5 görs i småsteg.

**Vi har inget beteendefacit för appen som helhet.** `RR` är nu täckt, men
gränssnittet är inte. Innan etapp 5 bör vi spara ett par riktiga testprojekt som
kan öppnas efteråt och jämföras — annars märks en subtil regression först i en
skarp granskning.

**`RR` har fem `simulate*`-varianter.** De är alla rimligt motiverade
(framaxelföljning, riktningsuppdelning, exakt manöver, bågkedja, manuell
körning), men överlappningen är värd en genomgång innan de flyttas. Jag har läst
dem men inte slagit ihop något — det vore en ändring utan beställare.
