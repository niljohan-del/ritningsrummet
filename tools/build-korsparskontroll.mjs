/* Bygger körspårskontrollen genom att baka in rr.js och vehicles.js i mallen.
 * Sidan blir självförsörjande och fungerar vid dubbelklick, utan server —
 * samma skäl som gör att huvudverktyget bäddar in sina bibliotek.
 *
 * Körs med:  node tools/build-korsparskontroll.mjs [utfil]
 * Utan argument hamnar den i dist/korsparskontroll.html.
 * Vercel bygger den till web/korspar.html, se vercel.json.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const OUT_PATH = process.argv[2] || 'dist/korsparskontroll.html';

const tpl = await readFile('tools/korsparskontroll.template.html', 'utf8');
const rr  = await readFile('src/core/rr.js', 'utf8');
const veh = await readFile('src/data/vehicles.js', 'utf8');

if (!tpl.includes('/*__RR__*/') || !tpl.includes('/*__VEHICLES__*/')) {
  console.error('AVBRYTER: mallen saknar platshållare.');
  process.exit(1);
}

// Modulerna exporterar till globalThis när module.exports inte finns, vilket
// är precis fallet i en webbläsare — därför behövs ingen omskrivning.
const out = tpl
  .replace('/*__RR__*/', () => rr)
  .replace('/*__VEHICLES__*/', () => veh);

if (out.includes('/*__RR__*/') || out.includes('/*__VEHICLES__*/')) {
  console.error('AVBRYTER: platshållare kvar efter inbakning.');
  process.exit(1);
}

await mkdir(dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, out);
console.log(`${OUT_PATH}  ${(out.length/1024).toFixed(1)} KB`);
