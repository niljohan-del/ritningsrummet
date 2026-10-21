/* Bygger den serverade webbplatsen i web/.
 *
 *   /          statussida (web/index.html, incheckad)
 *   /korspar   körspårskontroll för ledade fordon
 *   /app/      Ritningsrummet självt, med sina komponenter som riktiga filer
 *
 * Den serverade appen hämtar pdf.js och språkdata över HTTP i stället för ur
 * en inbäddad base64-klump. Enfilsversionen för offline-bruk byggs separat av
 * tools/build-offline.mjs och är fortfarande den som gäller på en dator där
 * ingenting får installeras.
 *
 * Körs med:  node tools/build-web.mjs
 */
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const WEB = 'web';

// Statussidan är incheckad i web/ och ska inte röras; allt annat byggs om.
await rm(join(WEB, 'app'), { recursive: true, force: true });
await mkdir(join(WEB, 'app'), { recursive: true });

await cp('src', join(WEB, 'app'), { recursive: true });
await cp('public', join(WEB, 'app'), { recursive: true });

// welcome.png är bara källa till WebP-versionen och behöver inte serveras.
await rm(join(WEB, 'app', 'assets', 'welcome.png'), { force: true });

async function size(dir) {
  let n = 0, files = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { const r = await size(p); n += r.n; files += r.files; }
    else { n += (await stat(p)).size; files++; }
  }
  return { n, files };
}

const { n, files } = await size(join(WEB, 'app'));
console.log(`${WEB}/app/  ${files} filer, ${(n / 1048576).toFixed(2)} MB`);
