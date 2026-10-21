/* Bryter ut enfilsversionen i separata filer.
 *
 * Koden flyttas ORDAGRANT — inte en bokstav skrivs om. Enda undantaget är
 * tillgångslagret (ASSET_MAP/assetBytes/assetURL), som måste kunna hämta från
 * filer i stället för ur en inbäddad base64-klump. Det bytet görs av
 * tools/patch-assets.mjs i nästa steg, inte här.
 *
 * Körs med:  node tools/split-baseline.mjs
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const IN = 'baseline/Ritningsrummet-3.6.html';
const SRC = 'src';
const VENDOR = 'public/vendor';
const ASSETS = 'public/assets';

// Filändelser för de namngivna tillgångarna. Utan ändelse serveras de som
// application/octet-stream, och då vägrar import() och Worker ladda dem.
const NAMED = {
  pdfMain:   'pdfMain.mjs',
  pdfWorker: 'pdfWorker.mjs',
  pdfLib:    'pdfLib.mjs',
  ocrWorker: 'ocrWorker.js',
  ocrWasm:   'ocrWasm.wasm',
  ocrLang:   'ocrLang.traineddata',
  licenses:  'licenses.txt',
};
export const assetFile = k => NAMED[k] || k;

const text = await readFile(IN, 'utf8');

/* Gränserna härleds ur filen, inte ur radnummer. Ett tidigare försök
   hårdkodade dem och missade att CSS:en sträcker sig över flera rader, vilket
   tyst lade resten av stilmallen som löptext i markupen. */

/* ---- 1. CSS ---- */
const styleRe = /<style>([\s\S]*?)<\/style>/g;
const styles = [...text.matchAll(styleRe)];
if (styles.length !== 1) throw Error(`Förväntade exakt ett <style>-block, hittade ${styles.length}.`);
const css = styles[0][1];
if (css.length < 10000) throw Error(`CSS-blocket är bara ${css.length} tecken — ser fel ut.`);

/* ---- 2. Script-block, ordagrant ---- */
// Koddelarna är <script> utan attribut. Tillgångsklumpen har type/id och
// fångas av ett eget uttryck nedan.
const codeRe = /<script>([\s\S]*?)<\/script>/g;
const code = [...text.matchAll(codeRe)].map(m => m[1]);
const NAMES = ['core/rr.js', 'data/vehicles.js', 'core/rs.js', 'core/lc.js', 'app.js'];
if (code.length !== NAMES.length)
  throw Error(`Förväntade ${NAMES.length} kodblock, hittade ${code.length}.`);
const blocks = Object.fromEntries(NAMES.map((n, i) => [n, code[i]]));
// Sanity: app.js ska vara det största, rr.js ska innehålla parseDXF
if (blocks['app.js'].length < 100000) throw Error('app.js ser för liten ut.');
if (!blocks['core/rr.js'].includes('parseDXF')) throw Error('rr.js saknar parseDXF.');
if (!blocks['data/vehicles.js'].includes('VEHICLES')) throw Error('vehicles.js saknar VEHICLES.');

/* ---- 3. Vendor ur base64-klumpen ---- */
const bundleRe = /<script type="application\/json" id="bundledAssets">([\s\S]*?)<\/script>/;
const bundleMatch = text.match(bundleRe);
if (!bundleMatch) throw Error('Hittade ingen bundledAssets-klump.');
const bundle = JSON.parse(bundleMatch[1]);

await rm(VENDOR, { recursive: true, force: true });
let vendorBytes = 0, vendorCount = 0;
for (const [key, b64] of Object.entries(bundle)) {
  const out = join(VENDOR, assetFile(key));
  await mkdir(dirname(out), { recursive: true });
  const buf = Buffer.from(b64, 'base64');
  await writeFile(out, buf);
  vendorBytes += buf.length; vendorCount++;
}

/* ---- 4. Välkomstbilden ---- */
const imgRe = /src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/;
const imgMatch = text.match(imgRe);
if (!imgMatch) throw Error('Hittade ingen inbäddad välkomstbild.');
await mkdir(ASSETS, { recursive: true });
await writeFile(join(ASSETS, 'welcome.png'), Buffer.from(imgMatch[1], 'base64'));

/* ---- 5. Markup: samma dokument, med utbrutna delar ersatta ---- */
const tags = NAMES.map(n => `<script src="${n}"></` + `script>`).join('\n');
let html = text
  .replace(styleRe, '<link rel="stylesheet" href="styles.css">')
  .replace(bundleRe, '')
  .replace(imgRe, 'src="assets/welcome.webp"');
// Ersätt de fem kodblocken med script-taggar: första blocket blir alla fem
// taggarna, resten försvinner, så ordningen bevaras exakt.
let seen = 0;
html = html.replace(codeRe, () => (seen++ === 0 ? tags : ''));
if (seen !== NAMES.length) throw Error('Kodblocken ersattes inte som väntat.');
for (const marker of ['<style>', 'bundledAssets', 'data:image/png;base64'])
  if (html.includes(marker)) throw Error(`Markupen innehåller fortfarande ${marker}.`);

/* ---- 6. Skriv ---- */
await mkdir(join(SRC, 'core'), { recursive: true });
await mkdir(join(SRC, 'data'), { recursive: true });
await writeFile(join(SRC, 'styles.css'), css);
for (const [path, body] of Object.entries(blocks))
  await writeFile(join(SRC, path), body.replace(/^\n/, '') + '\n');
await writeFile(join(SRC, 'index.html'), html);

const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log(`src/index.html        ${kb(html.length)}`);
console.log(`src/styles.css        ${kb(css.length)}`);
for (const [p, b] of Object.entries(blocks)) console.log(`src/${p.padEnd(18)}${kb(b.length)}`);
console.log(`${VENDOR}/           ${vendorCount} filer, ${(vendorBytes/1048576).toFixed(2)} MB`);
console.log(`${ASSETS}/welcome.png  ${(imgMatch[1].length*0.75/1048576).toFixed(2)} MB`);
