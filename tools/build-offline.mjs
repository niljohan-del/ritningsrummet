/* Bygger enfilsversionen ur src/ och public/ — inversen av split-baseline.mjs.
 *
 * Varför inget byggverktyg: appen är fem klassiska <script> som delar ett
 * gemensamt globalt scope, och tillgångarna hämtas genom två funktioner.
 * En bundlare skulle skriva om scopet och behöva tvingas tillbaka till det
 * den redan gör fel. Att väva ihop filerna igen är femtio rader och noll
 * beroenden, och resultatet går att jämföra rakt mot baseline.
 *
 * Körs med:  node tools/build-offline.mjs [--slim] [utfil]
 *   --slim   utelämnar CJK-teckentabellerna (cmaps/). Sparar cirka 1,6 MB.
 *            PDF:er med japansk, koreansk eller kinesisk text får då sämre
 *            teckentolkning. Allt annat är oförändrat.
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CSP_SERVED, CSP_STRICT } from './csp.mjs';

const args = process.argv.slice(2);
const SLIM = args.includes('--slim');
const OUT = args.find(a => !a.startsWith('--')) ||
            (SLIM ? 'dist/Ritningsrummet-offline-slim.html' : 'dist/Ritningsrummet-offline.html');

const SRC = 'src', VENDOR = 'public/vendor', ASSETS = 'public/assets';
const NAMED_BACK = {
  'pdfMain.mjs': 'pdfMain', 'pdfWorker.mjs': 'pdfWorker', 'pdfLib.mjs': 'pdfLib',
  'ocrWorker.js': 'ocrWorker', 'ocrWasm.wasm': 'ocrWasm',
  'ocrLang.traineddata': 'ocrLang', 'licenses.txt': 'licenses',
};

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}

let html = await readFile(join(SRC, 'index.html'), 'utf8');

/* ---- 1. CSS tillbaka inline ---- */
const css = await readFile(join(SRC, 'styles.css'), 'utf8');
const linkTag = '<link rel="stylesheet" href="styles.css">';
if (!html.includes(linkTag)) throw Error('Hittade ingen stylesheet-länk i src/index.html.');
html = html.replace(linkTag, () => `<style>${css}</style>`);

/* ---- 2. Koden tillbaka inline, i samma ordning ---- */
const NAMES = ['core/rr.js', 'data/vehicles.js', 'core/rs.js', 'core/lc.js', 'app.js'];
const tags = NAMES.map(n => `<script src="${n}"></` + `script>`).join('\n');
if (!html.includes(tags)) throw Error('Script-taggarna ser inte ut som väntat i src/index.html.');
const inlined = [];
for (const n of NAMES) {
  const body = await readFile(join(SRC, n), 'utf8');
  if (body.includes('</scr' + 'ipt>')) throw Error(`${n} innehåller en avslutande script-tagg.`);
  inlined.push('<script>' + body + '</' + 'script>');
}
html = html.replace(tags, () => inlined.join('\n'));

/* ---- 3. Vendor tillbaka som base64-klump ---- */
const files = await walk(VENDOR);
const bundle = {};
let raw = 0, skipped = 0;
for (const f of files.sort()) {
  const rel = relative(VENDOR, f).split('\\').join('/');
  if (SLIM && rel.startsWith('cmaps/')) { skipped++; continue; }
  const key = NAMED_BACK[rel] || rel;
  const buf = await readFile(f);
  raw += buf.length;
  bundle[key] = buf.toString('base64');
}
for (const need of ['pdfMain', 'pdfWorker', 'pdfLib', 'ocrWorker', 'ocrWasm', 'ocrLang', 'licenses'])
  if (!bundle[need]) throw Error(`Tillgången ${need} saknas i ${VENDOR}.`);
const bundleTag = `<script type="application/json" id="bundledAssets">${JSON.stringify(bundle)}</` + `script>`;
// Klumpen måste ligga före app.js, eftersom tillgångslagret läser den direkt.
html = html.replace(inlined[0], () => bundleTag + '\n' + inlined[0]);

/* ---- 4. Välkomstbilden tillbaka som data-URI, nu som WebP ---- */
const webp = await readFile(join(ASSETS, 'welcome.webp'));
const imgRef = 'src="assets/welcome.webp"';
if (!html.includes(imgRef)) throw Error('Hittade ingen referens till välkomstbilden.');
html = html.replace(imgRef, () => `src="data:image/webp;base64,${webp.toString('base64')}"`);

/* ---- 5. Strikt CSP tillbaka: inget ska hämtas ---- */
if (!html.includes(CSP_SERVED)) throw Error('Hittade ingen serverad CSP att skärpa.');
html = html.replace(CSP_SERVED, () => CSP_STRICT);

/* ---- 6. Kontrollera att inget pekar utanför filen ---- */
for (const bad of ['href="styles.css"', 'src="core/', 'src="app.js"', 'src="assets/'])
  if (html.includes(bad)) throw Error(`Filen refererar fortfarande ${bad}.`);

await mkdir('dist', { recursive: true });
await writeFile(OUT, html);

const mb = n => (n / 1048576).toFixed(2) + ' MB';
console.log(`${OUT}`);
console.log(`  vendor      ${Object.keys(bundle).length} filer, ${mb(raw)} rått` +
            (SLIM ? `  (${skipped} cmaps utelämnade)` : ''));
console.log(`  välkomstbild ${(webp.length/1024).toFixed(0)} KB som WebP`);
console.log(`  summa       ${mb(html.length)}`);
