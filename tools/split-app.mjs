/* Delar src/app.js i filer per arbetsområde.
 *
 * Koden är redan tematiskt ordnad, så uppdelningen görs med RENA SNITT: ingen
 * funktion flyttas och ingen rad skrivs om, bara filgränser läggs in vid
 * toppnivådeklarationer. Ordningen bevaras därmed exakt, vilket är avgörande
 * eftersom de 163 funktionerna delar ett gemensamt globalt scope och
 * toppnivåns const/let inte hissas mellan skript.
 *
 * Skripten laddas i samma ordning som snitten, så semantiken är oförändrad.
 *
 * Varje del kontrolleras med node --check: ett snitt mitt i en funktion eller
 * en mall-literal ger syntaxfel och stoppar bygget. Beteendet kontrolleras
 * sedan mot test/fingerprint.json.
 *
 * Körs med:  node tools/split-app.mjs
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const run = promisify(execFile);
const SRC = 'src', DIR = join(SRC, 'app');

// Snittpunkter: filnamn → funktionen som inleder filen.
// Den första filen börjar vid app.js början.
const CUTS = [
  ['ui.js',          null,              'dialoger, notiser, historik och verktygsval'],
  ['panels.js',      'renderStatus',    'panelrendering, lager och inspektor'],
  ['interaction.js', 'worldPos',        'pekhantering, markering, vy och zoom'],
  ['sweep.js',       'vehiclePanel',    'körspår och fordonspanel'],
  ['text.js',        'textFormat',      'textobjekt och typografi'],
  ['canvas.js',      'requestRender',   'all canvas-ritning'],
  ['import.js',      'getPDF',          'PDF, OCR och filinläsning'],
  ['scale.js',       'openScale',       'skala och kalibrering'],
  ['project.js',     'download',        'spara, öppna och exportera'],
  ['sections.js',    'getSection',      'gatusektioner'],
  ['blank.js',       'blankPaperDialog','blankt papper'],
  ['lark.js',        'chooseLark',      'landskapsläget LARK'],
  ['pilbil.js',      'pilbilPanel',     'manuell körning med ratt'],
  ['start.js',       'renderAppearance','utseende, välkomstvy och uppstart'],
];

const src = await readFile(join(SRC, 'app.js'), 'utf8');

// Toppnivåfunktioner börjar på egen rad. En nästlad funktion är indenterad
// eller står inne i ett uttryck, och fångas därför inte av radbrytningen.
const at = name => {
  const re = new RegExp('\\n(?:async )?function ' + name + '\\s*\\(');
  const m = src.match(re);
  if (!m) throw Error(`Hittade ingen toppnivåfunktion ${name} i app.js.`);
  const second = src.slice(m.index + 1).match(re);
  if (second) throw Error(`${name} deklareras mer än en gång på toppnivå.`);
  return m.index + 1;                       // efter radbrytningen
};

const bounds = CUTS.map(([file, start, what], i) => ({
  file, what, from: start === null ? 0 : at(start),
}));
for (let i = 0; i < bounds.length; i++)
  bounds[i].to = i + 1 < bounds.length ? bounds[i + 1].from : src.length;

for (let i = 1; i < bounds.length; i++)
  if (bounds[i].from <= bounds[i - 1].from)
    throw Error(`Snittpunkterna ligger i fel ordning vid ${bounds[i].file}.`);

await rm(DIR, { recursive: true, force: true });
await mkdir(DIR, { recursive: true });

let total = 0;
for (const b of bounds) {
  const body = src.slice(b.from, b.to);
  total += body.length;
  await writeFile(join(DIR, b.file), `/* ${b.what} */\n` + body.replace(/^\n+/, ''));
}
if (total !== src.length) throw Error(`Delarna summerar till ${total}, app.js är ${src.length}.`);

// Varje del måste vara giltig JavaScript för sig.
for (const b of bounds) {
  try { await run(process.execPath, ['--check', join(DIR, b.file)]); }
  catch (e) {
    console.error(`AVBRYTER: ${b.file} är inte giltig JavaScript — snittet ligger fel.`);
    console.error(String(e.stderr).split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  }
}

// index.html ska ladda delarna i exakt samma ordning.
const html = await readFile(join(SRC, 'index.html'), 'utf8');
const oldTag = '<script src="app.js"></' + 'script>';
if (!html.includes(oldTag)) throw Error('Hittade ingen app.js-tagg i index.html.');
const newTags = bounds.map(b => `<script src="app/${b.file}"></` + `script>`).join('\n');
await writeFile(join(SRC, 'index.html'), html.replace(oldTag, () => newTags));
await rm(join(SRC, 'app.js'));

const kb = n => (n / 1024).toFixed(1).padStart(6) + ' KB';
for (const b of bounds) console.log(`  src/app/${b.file.padEnd(16)} ${kb(b.to - b.from)}  ${b.what}`);
console.log(`\n${bounds.length} delar, ${kb(total)} totalt. app.js borttagen, index.html uppdaterad.`);
