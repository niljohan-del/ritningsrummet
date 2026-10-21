/* Beteendefacit för appen.
 *
 * Kör appen i en riktig webbläsare och fångar ett fingeravtryck av hur den
 * beter sig: inläst ritning, körspår för varje typfordon, arbetslägen,
 * mätningar och vad canvasen faktiskt ritar. Resultatet jämförs mot en sparad
 * ögonblicksbild, så att en uppdelning av koden går att göra utan att en
 * subtil regression smiter förbi.
 *
 * Canvasen jämförs via en hash av pixeldatan. Det fångar även förändringar
 * som inget tillstånd avslöjar — fel ritordning, tappad linje, skiftad färg.
 *
 *   node test/fingerprint.mjs --save      spara facit till test/fingerprint.json
 *   node test/fingerprint.mjs             jämför mot sparat facit
 *   node test/fingerprint.mjs --url=...   mot en annan adress
 */
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/npm-tools/node_modules/playwright/index.js');

const args = process.argv.slice(2);
const SAVE = args.includes('--save');
const URL_ARG = args.find(a => a.startsWith('--url='))?.slice(6);
const SNAPSHOT = 'test/fingerprint.json';
const PORT = 8211;

/* --- liten statisk server över web/app --- */
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json', '.wasm':'application/wasm', '.webp':'image/webp',
  '.png':'image/png', '.traineddata':'application/octet-stream', '.txt':'text/plain' };
let server = null;
if (!URL_ARG) {
  const ROOT = 'web/app';
  await stat(join(ROOT, 'index.html')).catch(() => {
    console.error('web/app saknas. Kör  node tools/build-web.mjs  först.');
    process.exit(1);
  });
  server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
      const st = await stat(f);
      res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream',
                           'Content-Length': st.size });
      res.end(await readFile(f));
    } catch { res.writeHead(404); res.end('404'); }
  });
  await new Promise(r => server.listen(PORT, r));
}
const URL = URL_ARG || `http://127.0.0.1:${PORT}/`;

/* --- kör appen och fånga fingeravtrycket --- */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on('pageerror', e => problems.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('CONSOLE: ' + m.text().slice(0, 120)); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1000);
await page.click('#welcomeNew');
await page.waitForTimeout(600);
await page.click('#demoBtn');
await page.waitForTimeout(4000);

const fp = await page.evaluate(async () => {
  const sha = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++)
    { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
  const canvasHash = () => {
    const c = document.getElementById('drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 0x811c9dc5, ink = 0;
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] << 16 | d[i+1] << 8 | d[i+2]);
      h ^= v; h = Math.imul(h, 0x01000193) >>> 0;
      if (d[i] < 235 || d[i+1] < 235 || d[i+2] < 235) ink++;
    }
    return { hash: h.toString(16), ink: +(ink / (d.length/4) * 100).toFixed(3),
             size: c.width + 'x' + c.height };
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const pg = S.pages[0];
  const out = {
    ritning: { namn: pg.name, kind: pg.kind, sidmatt: Math.round(pg.w) + 'x' + Math.round(pg.h),
      skala: pg.scale.status, metod: pg.scale.method, pxPerM: +(1/pg.scale.x).toFixed(6),
      kandidater: pg.candidates?.length ?? 0, cadObjekt: pg.cad?.shapes?.length ?? null,
      textHash: sha(pg.text || '') },
    lager: S.layers?.map(l => l.name) ?? null,
    tomCanvas: canvasHash(),
    geometri: {
      area: +RR.area([{x:0,y:0},{x:30,y:0},{x:30,y:20},{x:0,y:20}], pg.scale).toFixed(6),
      langd: +RR.length([{x:0,y:0},{x:30,y:40}], pg.scale).toFixed(6),
      skalkandidat: JSON.stringify(RR.scaleCandidates('Lutning 1:20. SKALA 1:400')),
    },
    korspar: {},
  };

  // körspår för varje typfordon, samma väg
  const pts = [{x:12,y:46},{x:50,y:46},{x:78,y:22}];
  for (const v of VEHICLES) {
    try {
      vehicleSettings.vehicle = JSON.parse(JSON.stringify(v));
      vehicleSettings.radius = 16;
      const o = vehicleDraftObject(pts); o.id = 'fp_' + v.id;
      const sw = calculateSweep(o, pg);
      const f = sw.frames.at(-1);
      out.korspar[v.id] = {
        frames: sw.frames.length,
        enheter: sw.units?.length ?? 0,
        ledvinkel: sw.maxArticulation != null ? +sw.maxArticulation.toFixed(4) : null,
        maxSteer: +(sw.maxSteer ?? 0).toFixed(4),
        langd: +(sw.length ?? 0).toFixed(4),
        issues: sw.issues.length,
        slutRear: Math.round(f.rear.x*1000)/1000 + ',' + Math.round(f.rear.y*1000)/1000,
        slutBody: f.body.map(p => Math.round(p.x*100)/100 + ',' + Math.round(p.y*100)/100).join(' '),
        slutUnit: f.units?.[0]?.body.map(p => Math.round(p.x*100)/100 + ',' + Math.round(p.y*100)/100).join(' ') ?? null,
      };
      pg.objects.push(o);
    } catch (e) { out.korspar[v.id] = 'KASTADE: ' + e.message; }
  }
  requestRender(); await wait(1200);
  out.canvasMedKorspar = canvasHash();

  // arbetslägen
  out.lagen = {};
  for (const mode of ['sections', 'lark', 'plan']) {
    try { switchWorkspace(mode); await wait(700);
      out.lagen[mode] = { aktiv: typeof workspaceMode !== 'undefined' ? workspaceMode : '?',
        canvas: canvasHash().size };
    } catch (e) { out.lagen[mode] = 'KASTADE: ' + e.message; }
  }

  // Projektets STRUKTUR, inte dess värden: id:n och tidsstämplar genereras om
  // vid varje körning, så en hash av innehållet vore slumpmässig. Formen är
  // det en uppdelning av koden kan råka ändra.
  try {
    const shape = (v, depth = 0) => {
      if (depth > 6) return '…';
      if (Array.isArray(v)) return v.length ? ['[' + v.length + ']', shape(v[0], depth+1)] : ['[0]'];
      if (v && typeof v === 'object')
        return Object.fromEntries(Object.keys(v).sort().map(k => [k, shape(v[k], depth+1)]));
      return typeof v;
    };
    const p = serializeProject();
    out.projekt = { form: sha(JSON.stringify(shape(p))),
                    nycklar: Object.keys(p).sort().join(','),
                    langdKB: Math.round(JSON.stringify(p).length / 1024) };
  } catch (e) { out.projekt = 'KASTADE: ' + e.message; }

  out.funktioner = ['draw','drawScene','drawSweep','calculateSweep','renderUI','renderInspector',
    'importFile','exportImage','serializeProject','loadProject','switchWorkspace','snapshot']
    .map(n => n + ':' + (typeof globalThis[n] === 'function' || typeof eval('typeof ' + n) === 'function' ? 'ok' : 'SAKNAS'))
    .join(' ');
  return out;
});

await browser.close();
if (server) await new Promise(r => server.close(r));

fp._problem = problems;

if (SAVE) {
  await writeFile(SNAPSHOT, JSON.stringify(fp, null, 1) + '\n');
  console.log(`Facit sparat till ${SNAPSHOT}`);
  console.log(`  körspår: ${Object.keys(fp.korspar).join(', ')}`);
  console.log(`  canvas:  ${fp.canvasMedKorspar.hash} (${fp.canvasMedKorspar.ink} % bläck)`);
  console.log(problems.length ? `  VARNING: ${problems.length} sidfel` : '  inga sidfel');
  process.exit(0);
}

const want = JSON.parse(await readFile(SNAPSHOT, 'utf8'));
const diffs = [];
(function walk(a, b, path) {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const pa = path ? path + '.' + k : k;
    const x = a?.[k], y = b?.[k];
    if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) walk(x, y, pa);
    else if (JSON.stringify(x) !== JSON.stringify(y)) diffs.push(`${pa}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
  }
})(want, fp, '');

if (diffs.length) {
  console.log(`SKILJER SIG FRÅN FACIT — ${diffs.length} avvikelser:\n`);
  for (const d of diffs) console.log('  ' + d);
  process.exit(1);
}
console.log('Beteendet matchar facit i alla mätpunkter.');
if (problems.length) { console.log('men sidfel: ' + problems.join(' | ')); process.exit(1); }
