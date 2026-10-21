# Ritningsrummet

Lokal granskning av ritningar för trafikplanering. Läser PDF, DXF och bilder,
lägger egna lager ovanpå, kalibrerar skala, mäter längd och area, och testar
körspår för typfordon enligt Trafikverkets VGU — stela såväl som ledade.

Ritningarna lämnar aldrig datorn.

## Använd verktyget

**På en dator där inget får installeras:** dubbelklicka
`dist/Ritningsrummet-offline.html`. En enda fil, allt inbäddat, fungerar utan
server och utan internet. Bygg den med `node tools/build-offline.mjs`.

**På webben:** ritningsrummet.vercel.app — statussida, körspårskontroll och
verktyget självt under `/app`.

## Bygg

Inga beroenden, bara Node.

```
node tools/build-offline.mjs            # enfilsversion, 16,1 MB
node tools/build-offline.mjs --slim     # utan CJK-teckentabeller, 14,7 MB
node tools/build-web.mjs                # serverad version i web/app/
node tools/build-korsparskontroll.mjs   # fristående körspårskontroll
node --test "test/**/*.test.js"         # 93 enhetstester
node test/fingerprint.mjs               # beteendefacit för hela appen
```

Under utveckling: servera `src/` och `public/` tillsammans som en katalog.

## Mappar

| Sökväg | Innehåll |
|---|---|
| `src/` | Källan. `index.html`, `styles.css` och skripten |
| `src/core/rr.js` | Geometri, DXF, skala, körspår och ledade fordon |
| `src/app/` | Gränssnittet i 14 filer per arbetsområde |
| `src/data/vehicles.js` | Typfordon med källhänvisning per fordon |
| `public/vendor/` | pdf.js och Tesseract som riktiga filer |
| `public/assets/` | Välkomstbilden som WebP |
| `test/` | 93 enhetstester plus ett beteendefacit för hela appen |
| `tools/` | Byggskript och engångsverktygen från migreringen |
| `web/` | Det som publiceras |
| `baseline/` | Fryst 3.6, historisk referens. Behövs inte för att bygga. |

## Hur koden hänger ihop

Appen är klassiska `<script>` som delar ett gemensamt globalt scope — inte
ES-moduler. Det är avsiktligt bevarat från enfilsversionen: 163 funktioner
delar variabler fritt, och att bryta isär scopet skulle göra dolda beroenden
till fel.

Gränssnittet ligger i `src/app/` uppdelat på arbetsområde: `panels.js`,
`canvas.js`, `sweep.js`, `sections.js`, `lark.js`, `pilbil.js` och så vidare.
Uppdelningen gjordes med rena snitt — ingen funktion flyttades och ingen rad
skrevs om, bara filgränser lades in vid toppnivådeklarationer. Ordningen är
därmed exakt densamma, vilket spelar roll eftersom toppnivåns `const` och
`let` inte hissas mellan skript.

Komponenterna hämtas genom `assetBytes` och `assetURL`. Finns en inbäddad
base64-klump används den; annars hämtas filerna under `vendor/`. Samma kod
klarar alltså båda byggena.

**Enfilsversionens CSP är hårdare än den serverades.** Offline-filen kör
`default-src 'none'` utan `'self'` någonstans, eftersom ingenting ska hämtas.
Den serverade versionen måste få hämta sina egna filer och har därför `'self'`
tillagt. Se `tools/csp.mjs`.

## Körspår

Stela fordon följer en cykelmodell med RK4-integration; manövrer med konstant
styrutslag löses i sluten form. Släpade enheter fästs av `attachUnits` på
resultatet från samtliga fem körspårsvarianter, så ledade fordon fungerar lika
i alla lägen.

Avvikelse mot den slutna formen för stationär eftersläpning: 0,04 mm för
ledbuss, 0,02 mm för påhängsvagn.

Timmerbil (Ls) saknas: geometrin är inte publicerad, och ett verkligt
timmerekipage är dollystyrt — tre kroppar, inte två. Modellen klarar kedjor av
flera enheter, så Ls blir en datarad så snart måtten finns belagda.

## Licenser

pdf.js (Apache 2.0, Mozilla Foundation) och Tesseract med `tessdata_fast`
(Apache 2.0). Licenstexterna följer med i alla bygg och visas i hjälpen.

Fordonsmåtten är transkriberade ur Trafikverkets VGU, *Begrepp och
grundvärden*, och projektrapport DETESS 1.0. `maxSteer` och `maxArticulation`
är egna simuleringsantaganden, inte VGU-värden.
