/* Gör tillgångslagret i src/app.js oberoende av hur komponenterna levereras.
 *
 * Enfilsversionen bär sina bibliotek som base64 i ett <script
 * type="application/json" id="bundledAssets">. Den serverade versionen har
 * dem som riktiga filer under vendor/. Samma kod ska klara båda: finns
 * klumpen används den, annars hämtas filerna.
 *
 * Det tvingar assetBytes att bli asynkron, vilket berör tre anropsställen.
 * EmbeddedPDFData.fetch är redan async och returnerar värdet direkt, så den
 * behöver inget — pdf.js inväntar löftet självt.
 *
 * Körs med:  node tools/patch-assets.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

import { CSP_STRICT, CSP_SERVED } from './csp.mjs';

{
  const f = 'src/index.html';
  let h = await readFile(f, 'utf8');
  if (h.split(CSP_STRICT).length - 1 !== 1) {
    console.error('AVBRYTER: hittade inte exakt en strikt CSP i ' + f);
    process.exit(1);
  }
  await writeFile(f, h.replace(CSP_STRICT, CSP_SERVED));
  console.log('  ok  CSP: lagt till \'self\' för den serverade versionen');
}

const FILE = 'src/app.js';
let s = await readFile(FILE, 'utf8');

const patches = [

  { why: 'tillgångslagret: inbäddat eller hämtat',
    from:
`const ASSET_MAP=JSON.parse($('bundledAssets').textContent),decode64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const assetBytes=k=>{if(!ASSET_MAP[k])throw Error('En inbyggd komponent saknas: '+k);return decode64(ASSET_MAP[k]);},assetText=k=>new TextDecoder().decode(assetBytes(k));
const assetURL=k=>URL.createObjectURL(new Blob([assetBytes(k)],{type:'text/javascript'}));`,
    to:
`const INLINE_ASSETS=$('bundledAssets'),ASSET_MAP=INLINE_ASSETS?JSON.parse(INLINE_ASSETS.textContent):null,decode64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const ASSET_FILE={pdfMain:'pdfMain.mjs',pdfWorker:'pdfWorker.mjs',pdfLib:'pdfLib.mjs',ocrWorker:'ocrWorker.js',ocrWasm:'ocrWasm.wasm',ocrLang:'ocrLang.traineddata',licenses:'licenses.txt'};
const missing=k=>Error('En inbyggd komponent saknas: '+k);
const assetPath=k=>'vendor/'+(ASSET_FILE[k]||k);
const assetBytes=async k=>{if(ASSET_MAP){if(!ASSET_MAP[k])throw missing(k);return decode64(ASSET_MAP[k]);}const r=await fetch(assetPath(k));if(!r.ok)throw missing(k);return new Uint8Array(await r.arrayBuffer());};
const assetText=async k=>new TextDecoder().decode(await assetBytes(k));
const assetURL=k=>{if(!ASSET_MAP)return assetPath(k);if(!ASSET_MAP[k])throw missing(k);return URL.createObjectURL(new Blob([decode64(ASSET_MAP[k])],{type:'text/javascript'}));};` },

  { why: 'getOCR: invänta wasm och språkdata',
    from: `wasm:assetBytes('ocrWasm'),lang:assetBytes('ocrLang')`,
    to:   `wasm:await assetBytes('ocrWasm'),lang:await assetBytes('ocrLang')` },

  { why: 'licensdialogen: invänta texten',
    from: `$('licensesBtn').onclick=()=>{modal('Komponentlicenser',\`<pre style="white-space:pre-wrap;font-size:12px">\${esc(assetText('licenses'))}</pre>`,
    to:   `$('licensesBtn').onclick=async()=>{modal('Komponentlicenser',\`<pre style="white-space:pre-wrap;font-size:12px">\${esc(await assetText('licenses'))}</pre>` },

  { why: 'hjälptexten: komponenternas ursprung skiljer sig mellan byggena',
    from: `Ingen ritning laddas upp och inga komponenter hämtas från internet.`,
    to:   `Ingen ritning laddas upp.\${ASSET_MAP?' Inga komponenter hämtas från internet.':' Komponenterna hämtas från samma server som sidan.'}` },

  { why: 'hjälptexten: var källfilerna ligger',
    from: `Programmet och läsbara källfiler ligger inuti HTML-filen.`,
    to:   `\${ASSET_MAP?'Programmet och läsbara källfiler ligger inuti HTML-filen.':'Programmet och dess källfiler ligger bredvid sidan på servern.'}` },
];

let changed = 0;
for (const p of patches) {
  const hits = s.split(p.from).length - 1;
  if (hits !== 1) {
    console.error(`AVBRYTER: "${p.why}" matchade ${hits} gånger, förväntade 1.`);
    process.exit(1);
  }
  s = s.replace(p.from, () => p.to);
  console.log(`  ok  ${p.why}`);
  changed++;
}

await writeFile(FILE, s);
console.log(`\n${FILE} uppdaterad, ${changed} ändringar.`);
