/* Kopplar in ledade fordon i gränssnittet.
 *
 * Två ändringar i src/app.js:
 *
 *  1. calculateSweep får en omslutande funktion som fäster de släpade
 *     enheterna på resultatet. Originalkroppen flyttas oförändrad till
 *     rigidSweep, så alla fem körspårsvarianter får ledade fordon utan att
 *     någon av dem ändras.
 *
 *  2. drawSweep ritar enheternas karosser i SAMMA bana som dragfordonets.
 *     Det är avgörande: banan fylls en gång med nonzero-regel, så överlappande
 *     lägen inte mörknar. En egen fyllning per enhet hade gett mörka skarvar.
 *
 * Engångsverktyg i migreringen från enfilsversionen. src/ är källan härefter.
 */
import { readFile, writeFile } from 'node:fs/promises';

const FILE = 'src/app.js';
let s = await readFile(FILE, 'utf8');

const patches = [

  { why: 'calculateSweep fäster släpade enheter',
    from: `function calculateSweep(o,p){if(o.drive?.control==='pilbil')`,
    to:   `function calculateSweep(o,p){const sw=rigidSweep(o,p);return sw?RR.attachUnits(sw,o.vehicle,p.scale,o.margin):sw;}\n` +
          `function rigidSweep(o,p){if(o.drive?.control==='pilbil')` },

  { why: 'drawSweep: buffertzonen omfattar enheterna',
    from: `if(o.margin>0){c.beginPath();for(const f of sw.frames)path(c,f.buffer,true);`,
    to:   `if(o.margin>0){c.beginPath();for(const f of sw.frames){path(c,f.buffer,true);if(f.units)for(const u of f.units)path(c,u.buffer,true);}` },

  { why: 'drawSweep: svept yta omfattar enheterna',
    from: `c.beginPath();for(const f of sw.frames)path(c,f.body,true);c.fillStyle=color;c.globalAlpha*=.14;`,
    to:   `c.beginPath();for(const f of sw.frames){path(c,f.body,true);if(f.units)for(const u of f.units)path(c,u.body,true);}c.fillStyle=color;c.globalAlpha*=.14;` },

  { why: 'drawSweep: hörnlinjer även för enheterna',
    from: `for(let k=0;k<4;k++){c.beginPath();path(c,sw.frames.map(f=>f.body[k]));c.stroke();}`,
    to:   `for(let k=0;k<4;k++){c.beginPath();path(c,sw.frames.map(f=>f.body[k]));c.stroke();}\n` +
          ` if(sw.units)for(let ui=0;ui<sw.units.length;ui++)for(let k=0;k<4;k++){c.beginPath();path(c,sw.frames.map(f=>f.units[ui].body[k]));c.stroke();}` },
];

for (const p of patches) {
  const hits = s.split(p.from).length - 1;
  if (hits !== 1) {
    console.error(`AVBRYTER: "${p.why}" matchade ${hits} gånger, förväntade 1.`);
    process.exit(1);
  }
  s = s.replace(p.from, () => p.to);
  console.log(`  ok  ${p.why}`);
}

await writeFile(FILE, s);
console.log(`\n${FILE} uppdaterad, ${patches.length} ändringar.`);
