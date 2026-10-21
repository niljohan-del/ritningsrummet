/* Skapar dist/Ritningsrummet-3.6.1.html ur baseline/Ritningsrummet-3.6.html.
 *
 * Bakgrunden: rättningen av scaleCandidates behövs i det körbara verktyget nu,
 * men uppdelningen av källkoden är inte klar. Den här patchen gör exakt tre
 * textbyten i baseline och rör ingenting annat — inbäddade bibliotek och
 * välkomstbild lämnas byte för byte orörda.
 *
 * Skriptet är avsiktligt tillfälligt. När etapp 3 är klar byggs 3.6.1 ur
 * src/ i stället och det här kan tas bort.
 *
 * Körs med:  node tools/patch-baseline.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const IN  = 'baseline/Ritningsrummet-3.6.html';
const OUT = 'dist/Ritningsrummet-3.6.1.html';

const PATCHES = [
  {
    why: 'scaleCandidates: explicit avgjordes av ett teckenfönster runt träffen i '
       + 'stället för av träffen själv, så ett SKALA längre bort i texten befordrade '
       + 'orelaterade tal — en lutning 1:20 kunde hamna först.',
    from: 'explicit:/skala|scale/i.test(context)',
    to:   'explicit:/skala|scale/i.test(m[0])',
  },
  {
    why: 'versionsnummer i fliken',
    from: '<title>Ritningsrummet 3.6 · Trafikplanering</title>',
    to:   '<title>Ritningsrummet 3.6.1 · Trafikplanering</title>',
  },
  {
    why: 'versionsnummer i sidhuvudet',
    from: 'TRAFIKPLANERING · 3.6',
    to:   'TRAFIKPLANERING · 3.6.1',
  },
];

let src = await readFile(IN, 'utf8');
const before = src.length;

for (const p of PATCHES) {
  const hits = src.split(p.from).length - 1;
  if (hits !== 1) {
    console.error(`AVBRYTER: "${p.from.slice(0, 50)}" gav ${hits} träffar, förväntade 1.`);
    console.error('Baseline ser inte ut som förväntat. Patchen har inte applicerats.');
    process.exit(1);
  }
  src = src.replace(p.from, p.to);
  console.log(`  ok  ${p.why}`);
}

await mkdir('dist', { recursive: true });
await writeFile(OUT, src);

console.log(`\n${IN} → ${OUT}`);
console.log(`${before} → ${src.length} tecken (diff ${src.length - before >= 0 ? '+' : ''}${src.length - before})`);
