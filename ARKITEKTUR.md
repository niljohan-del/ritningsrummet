# Ritningsrummet 3.6 — kartläggning av enfilsversionen

Framtagen genom analys av `baseline/Ritningsrummet-3.6.html` 2026-10-21.
Syftet är att uppdelningen ska bygga på mätta fakta, inte gissningar.

---

## Filens uppbyggnad

722 rader, 23 174 369 byte. Radnumren nedan gäller baseline-filen.

| Rad | Innehåll | Storlek |
|---|---|---|
| 3–4 | `<head>`, metadata | — |
| 5 | All CSS på en rad | 12,8 KB |
| 49–50 | `</style></head><body>` | — |
| 54 | Välkomstbild, base64-PNG i `<figure class="welcome-figure">` | 6,38 MB |
| 62 | `<header>` med projektnamn och navigering | — |
| 50–97 | Övrig markup: toolbar, paneler, viewport, footer, dialoger | — |
| 98 | `<script type="application/json" id="bundledAssets">` | 16,24 MB |
| 99–247 | **`RR`** — geometri, DXF, skala, körspår | 22 KB |
| 248–258 | VGU-data, typfordon | <1 KB |
| 259–302 | **`RS`** — gatusektioner | 7 KB |
| 303–320 | **`LC`** — pappersformat och layout | 4 KB |
| 321–721 | **Huvudappen** | 161 KB |

Alla tre modulerna är IIFE:er som skriver till `globalThis` under eget namn.
Det gör dem nästan färdiga ES-moduler redan — de har ingen DOM-kontakt.

---

## Modulen RR — geometri och körspår

Rad 99–247. Exporteras som `globalThis.RR`. Kommentar i koden:
*"geometry and DXF import. All measurements are plan distances."*

Rena geometrifunktioner:
`area`, `length`, `bounds`, `inside`, `segDist`, `simplePolygon`, `frame`,
`arcPoints`, `arcToTarget`, `bulgePoints`

DXF och skala:
`parseDXF`, `calibrate`, `ratioScale`, `scaleCandidates`

Körspår:
`simulate`, `simulateArcRoute`, `simulateDirected`, `simulateManeuver`,
`simulatePilbil`, `smoothRoute`

Övrigt: `emit`

**Det här är den viktigaste modulen att testa.** Ingen av funktionerna rör
DOM:en, så alla går att anropa direkt från ett testskript med kända indata.
Att det finns fem separata `simulate*`-varianter är också värt att titta på —
möjligen kan de slås ihop.

## Modulen RS — gatusektioner

Rad 259–302. Exporteras som `globalThis.RS`.
`bands`, `offset`, `planGeometry`, `reverse`, `validate`, `warnings`

Bygger tvärsektioner av band (körfält, trottoar, remsa) och validerar dem.

## Modulen LC — pappersformat

Rad 303–320. Exporteras som `globalThis.LC`.
`footprint`, `paper`, `rescaleBlank`, `transform`, `validateBlank`,
`validateObject`

Hanterar pappersstorlekar och omräkning vid skalbyte på tomma ritningar.

---

## Huvudappen — 164 funktioner

Rad 321–721. Allt i samma scope, vilket är skälet till att den behöver delas.
Funktionerna faller i tydliga grupper, och det är grupperna som blir filer:

**Canvas-ritning (16)**
`draw`, `drawScene`, `drawBase`, `drawObject`, `drawText`, `drawSweep`,
`drawStreet`, `drawLandscape`, `drawSectionCanvas`, `drawSectionFigure`,
`drawVehicleDraft`, `drawPilbilDraft`, `drawPilbilWheels`, `drawLarkSymbol`,
`drawLarkPreview`, `drawLarkThumb`

**Gränssnittsuppdatering (13)**
`renderUI`, `renderPanels`, `renderDocuments`, `renderLayers`,
`renderInspector`, `renderMeasurements`, `renderScale`, `renderStatus`,
`renderSections`, `renderAppearance`, `renderLarkPalette`, `renderPilbil`,
`renderPilbilVehicleChoice`

**Arbetsläget Pilbil — manuell körning med ratt (9)**
`initPilbil`, `newPilbil`, `resumePilbil`, `pilbilPanel`, `pilbilAction`,
`pilbilPlace`, `handlePilbilKey`, `setPilbilVehicle`, `openPilbilVehicle`,
plus `choosePilbilVehicle`, `checkedPilbilVehicle`

**Arbetsläget Lark — landskap med symbolpalett (6)**
`initLark`, `chooseLark`, `larkClick`, `larkPanel`, `finishLark`, `bindLark`

**Gatusektioner (8)**
`initSections`, `ensureSections`, `newSection`, `getSection`, `placeSection`,
`sectionCard`, `sectionEdit`, `sectionItem`, `sectionItemRow`,
`sectionSourceDialog`, `sectionWarningsHTML`, `refreshSectionPreviews`,
`illustrateSection`

**Körspår (6)**
`calculateSweep`, `getSweep`, `sweepKey`, `vehiclePanel`,
`vehicleDraftObject`, `addVehicleTarget`, `setVehicleGear`

**Skala (5)**
`openScale`, `applyScale`, `beginCalibration`, `calibrationDialog`,
`scaleDescription`, `recognizePage`, `ocrCall`

**Filinläsning och vendor-laddning (7)**
`importFile`, `importFiles`, `getPDF`, `getPDFDocument`, `getPDFLib`,
`getOCR`, `bytes64`, `demoDXF`, `loadDemo`

**Export (5)**
`exportDialog`, `exportImage`, `exportRect`, `exportReview`,
`exportSectionIllustration`

**Projekt (6)**
`startNewProject`, `createBlankProject`, `saveProject`, `loadProject`,
`serializeProject`, `validateProject`

**Text (6)**
`textDialog`, `textFields`, `textFormat`, `textFormatPanel`, `textLayout`,
`previewTextFormat`, `proposeTextScale`, `canvasTextFont`, `fontFamilyCSS`

**Pekhantering (5)**
`handleDown`, `handleMove`, `handleUp`, `hitObject`, `selectObject`

**Lager (3)**
`renderLayers`, `moveLayer`, `deleteLayer`

**Historik (3)**
`snapshot`, `restoreHistory`, `changed`

**Sidor och vyer (8)**
`activatePage`, `basePage`, `pageAppearance`, `pageFitZoom`, `fitPage`,
`zoom`, `resize`, `requestRender`, `worldPos`, `screen`, `snapped`

**Arbetslägesväxling (3)**
`enterWorkspace`, `switchWorkspace`, `showWelcome`

**Småverktyg**
`modal`, `closeModal`, `toast`, `busy`, `unbusy`, `errorBox`, `field`,
`label`, `download`, `niceNumber`, `path`, `sanitizeSVG`, `esc`

---

## Inbäddade bibliotek

Rad 98, JSON med 11,61 MB base64-kodat innehåll under dessa nycklar:

| Grupp | Nycklar | Avkodat |
|---|---|---|
| OCR | `ocrWorker`, `ocrWasm`, `ocrLang` | 6,73 MB |
| pdf.js | `pdfMain`, `pdfWorker`, `pdfLib` | 2,10 MB |
| CJK-cmaps | `cmaps/*.bcmap` (~190 filer) | 1,20 MB |
| wasm | `wasm/jbig2`, `openjpeg`, `qcms` + fallback | 0,86 MB |
| Typsnitt | `fonts/Foxit*`, `fonts/Liberation*` | 0,80 MB |
| Licenser | `licenses`, `*/LICENSE*` | 0,05 MB |

Språkdatan är `tessdata_fast` (Apache 2.0). pdf.js är Apache 2.0, Mozilla
Foundation 2024. Licenstexterna ligger inbäddade i filen och ska följa med vid
uppdelningen — de får inte tappas.

---

## Observationer att ta ställning till

**Base64 kostar en tredjedel.** 11,61 MB nyttolast lagras som 16,24 MB text.
Som riktiga filer försvinner den overheaden — men bara i den serverade
versionen, eftersom single-file-bygget måste inbädda igen.

**Välkomstbilden är 2048×1147 px och 4,78 MB som PNG.** Testad omkodning:
324 KB som WebP kvalitet 80, 260 KB nedskalad till 1600 px. Visuellt
likvärdigt. Det är den enskilt billigaste vinsten i hela projektet.

**OCR är 58 % av vendor-innehållet** för en funktion som bara används när
skalan inte kan läsas ur PDF-texten.

**Fem `simulate*`-funktioner** i RR antyder att körspårslogiken vuxit i lager.
Värt att läsa igenom innan de flyttas, inte efter.

---

## Fordonsgeometri för ledade typfordon

Tillagt 2026-10-21. VGU:s *Begrepp och grundvärden* publicerar längd, bredd,
höjd, vändradie och körvidd för Bl, Lps och Ls, men **inte** axelavstånd eller
ledgeometri — till skillnad från de stela typfordonen. Måtten nedan kommer
därför ur Trafikverkets projektrapport **DETESS 1.0** (2020-06-15, Per
Strömgren), figur 5.13 och 5.14, som redovisar både VGU:s värden och nya
uppmätta.

**Bl, ledbuss — VGU:s uppsättning används.** Den summerar exakt till angiven
längd, vilket den nya inte gör:

```
2,8  överhäng fram
5,1  framaxel → mittaxel
2,2  mittaxel → ledpunkt
5,0  ledpunkt → bakaxel
2,9  överhäng bak
---- 
18,0 m   stämmer mot VGU:s angivna längd
```

(Nya uppmätta: 18,6 m totalt, men delmåtten summerar till 18,8. Avvikelsen på
0,2 m är oförklarad, så den exakta uppsättningen är att föredra.)

**Lps, dragbil med påhängsvagn — de nya uppmätta värdena används.** VGU:s gamla
uppsättning är internt motstridig: den placerar vändskivan 1,1 m *bakom*
drivboggin, vilket är fysiskt omöjligt.

Vändskivans läge anges inte direkt i någon av uppsättningarna utan är **härlett
ur längdkedjan**:

```
16,5 = 1,5 (överhäng fram) + x + 8,15 (kingpin → boggi) + 3,85 (överhäng bak)
  →  x = 3,0 m från framaxeln till vändskivan
     drivboggin ligger på 3,3 m
  →  vändskivan 0,3 m FRAMFÖR boggin
```

Det är ett rimligt och typiskt värde, men det är en härledning och inte en
citerad siffra — därför står det så i `vehicles.js`.

**Ls, lastbil med släp, utelämnas.** DETESS innehåller inget Ls alls, och VGU
ger bara ytterligare mått. Ett verkligt timmerekipage är dessutom dollystyrt,
alltså tre kroppar, inte två. `attachUnits` hanterar kedjor av godtycklig längd,
så Ls blir en ren datarad så snart måtten finns belagda.

**VGU:s körvidd går inte att reproducera stationärt.** För Bl ger en stationär
beräkning cirka 6,95 m mot VGU:s 6,7 m, vilket är nära. För Lps ger den cirka
6,0 m mot VGU:s 8,5 m. Skillnaden beror på att största körvidd uppstår i
genomfarten in i och ur kurvan, inte i stationärt tillstånd, och för långa
ekipage är den transienta utsvängningen betydligt större. Därför används VGU:s
vändradie och körvidd som redovisningsvärden i gränssnittet, inte som
testfacit.
