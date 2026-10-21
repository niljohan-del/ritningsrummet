# Ritningsrummet

Lokal granskning av ritningar för trafikplanering. Läser PDF, DXF och bilder,
lägger egna lager ovanpå, kalibrerar skala, mäter längd och area, och testar
körspår för typfordon enligt Trafikverkets VGU.

Allt körs i webbläsaren på din egen dator. Ingen server, inga filer som lämnar
maskinen.

## Använd verktyget

Dubbelklicka **`dist/Ritningsrummet-3.6.1.html`**. Det är den version som ska
användas — `baseline/Ritningsrummet-3.6.html` har ett fel i den automatiska
skalavläsningen som kan föreslå en lutningsangivelse som skala.

För ledbuss och påhängsvagn: dubbelklicka **`dist/korsparskontroll.html`**.
Fristående sida som ritar körspår för ledade fordon och jämför mot den slutna
formen. Behövs tills ledade fordon kopplats in i huvudverktyget.

## Kör testerna

Kräver bara Node, inget `npm install`:

```
node --test "test/**/*.test.js"
```

93 tester på geometri, skalberäkning, DXF-tolkning och körspår, varav 29 på
ledade fordon. Facit är analytiska formler, inte sparad utdata.

## Bygg om

```
node tools/patch-baseline.mjs          # dist/Ritningsrummet-3.6.1.html
node tools/build-korsparskontroll.mjs  # dist/korsparskontroll.html
```

## Mappar

| Sökväg | Innehåll |
|---|---|
| `PLAN.md` | Projektplanen, etapper och öppna beslut. **Börja här.** |
| `ARKITEKTUR.md` | Kartläggning av enfilsversionen och härledning av fordonsgeometrin |
| `src/core/rr.js` | Geometri, DXF, skala, körspår och ledade fordon |
| `src/data/vehicles.js` | Typfordon med källhänvisning per fordon |
| `test/rr.test.js` | Geometri, skala, DXF, körspår för stela fordon |
| `test/units.test.js` | Ledade fordon |
| `tools/` | Byggskript och mall för kontrollsidan |
| `baseline/` | Fryst utgångspunkt 3.6, referensen vi jämför mot |
| `dist/` | Byggresultat. Återskapas, ligger inte i git. |

`src/` är ännu inte inkopplat i huvudverktyget — uppdelningen sker i etapp 3.
Modulerna där är utbrutna för att kunna testas, och rättningar patchas in i
enfilsversionen tills omstruktureringen är klar.

## Arbetslägen i verktyget

- **Plan** — ritningsgranskning med lager, mått och körspår
- **Pilbil** — manuell körning med ratt och växel, för att känna efter om ett fordon kommer runt
- **Lark** — landskapsläge med symbolpalett
- **Sektion** — gatusektioner byggda av band, med kontroll mot VGU

Körspåren i huvudverktyget gäller tills vidare bara stela fordon. Ledbuss (Bl)
och dragbil med påhängsvagn (Lps) är modellerade och testade, men ritas ännu
bara av `korsparskontroll.html` — se etapp 2 i planen. Timmerbil (Ls) saknas
eftersom geometrin inte finns publicerad.

## Licenser

Verktyget använder pdf.js (Apache 2.0, Mozilla Foundation) och Tesseract med
`tessdata_fast` (Apache 2.0). Licenstexterna ligger inbäddade i filen och ska
följa med i alla bygg.

Fordonsmåtten är transkriberade ur Trafikverkets VGU, *Begrepp och grundvärden*,
figur 2.2-6 och 2.2-10. `maxSteer` är en egen simuleringsantagande, inte ett
VGU-värde.
