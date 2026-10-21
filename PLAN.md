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

Målet är inte att slutа leverera en enda fil. Målet är att **fortsätta leverera
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

**Etapp 2 — Ledade fordon. MODELLEN KLAR, ÅTERSTÅR ATT KOPPLA IN I APPEN.**
`attachUnits` i `src/core/rr.js` fäster släpade enheter på resultatet från
vilken som helst av de fem `simulate*`-varianterna, så ledade fordon fungerar
lika i alla körspårslägen utan att någon av dem rörts. Bl och Lps finns i
fordonslistan med belagd geometri.

Vad som återstår: huvudappen ritar inte `frame.units` och känner inte till
ledade fordon i fordonspanelen. Den ändringen ligger i de 161 KB som ska delas
upp, och den görs när etapp 3 och 4 är på plats — att lägga in fordonen i
gränssnittet nu skulle visa dem som stela dragbilar, vilket är sämre än att
låta bli.

Under tiden finns `dist/korsparskontroll.html` som fristående verktyg för just
ledade körspår.

**Etapp 3 — Bryt ut assets och dela upp filerna**
De två jätteraderna blir riktiga filer, och de fem script-blocken flyttas till
egna filer ordagrant. `index.html` laddar dem i samma ordning.

**Etapp 4 — Byggsteg med Vite**
Ger dev-server med direktuppdatering och single-file-bygget.

**Observera att etapp 3 och 4 är en enhet.** Så fort assets ligger som separata
filer slutar verktyget fungera vid dubbelklick — Chrome blockerar `fetch` mot
`file://`, och det är med stor sannolikhet just därför allt är base64-inbäddat
från början. Det som gör filen körbar igen är single-file-bygget i etapp 4. Man
kan alltså inte stanna mellan dem.

**Etapp 5 — Dela upp huvudappen**
161 KB blir moduler per arbetsläge (plan / sektion / lark / pilbil) plus
paneler, dialoger och canvas-ritning. Störst etapp, görs i småsteg.

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

## Publicering på Vercel — blockerad, två sätt att lösa

Försökt 2026-10-21. Vercel-kopplingen kan **läsa** (den listar dina projekt) men
nekar skrivning: både `POST /v11/projects` och `POST /v13/deployments` ger
403 med `"remediation": {"actor": "user", "action": "grant_team_access"}`.

Dessutom: filinnehåll måste passera genom verktygsanropet, och containern har
ingen nätåtkomst till vercel.app — jag kan alltså varken skicka upp 22 MB eller
kontrollera efteråt att en uppladdning blev rätt. Att skicka 26 KB kod blint,
utan möjlighet att verifiera, vore samma sorts obevisade leverans som resten av
projektet går ut på att undvika.

**Väg A, bäst: skapa repot `niljohan-del/ritningsrummet` på GitHub.**
Då pushar jag hela projektet med git — ingen storleksgräns, ingen risk för
avskriftsfel — och Vercel kopplas till repot så varje push deployar automatiskt.
Det är också den uppsättning ett riktigt projekt ska ha. Sessionen har redan
push-rättigheter till dina befintliga repon; det som saknas är att repot finns.

**Väg B: ge Vercel-kopplingen skrivåtkomst** till scopen `niljohan-7752`.
Löser deployen men inte storleksproblemet — huvudverktyget på 22 MB kan ändå
inte skickas den vägen.

Statussidan ligger färdig i `web/index.html`, kontrollerad i både bred och smal
vy. Den går upp så snart någon av vägarna är öppen.

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
