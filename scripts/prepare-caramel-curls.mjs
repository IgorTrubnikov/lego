// Add one reference hairpiece, fitted to the shared head without clipping its curl tips.
// Usage: node scripts/prepare-caramel-curls.mjs isolated-hair.png
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
export function prepare(source){
 if(!source)throw Error('Provide the isolated transparent hair image.');
 const temp=mkdtempSync(path.join(os.tmpdir(),'caramel-curls-'));
 try{
  const objects=magick([source,'-alpha','extract','-threshold','15%','-define','connected-components:verbose=true','-connected-components','8','null:']);
  const components=[...objects.matchAll(/^\s*\d+: (\d+x\d+\+\d+\+\d+) [\d.,-]+ (\d+) srgb\(255,255,255\)/gm)].sort((a,b)=>Number(b[2])-Number(a[2]));
  if(!components.length)throw Error('Empty hair silhouette.');
  const file=path.join(temp,'hair.webp');
  magick([source,'-crop',components[0][1],'+repage','-filter','Lanczos','-resize','280x312!','-background','none','-gravity','northwest','-splice','160x144','-extent','600x720','-strip','-define','webp:lossless=true',file]);
  const raster=readFileSync(file);
  // Only the face opening is masked; crown, side waves and all ends stay intact.
  const opening='M238 320V238Q238 225 250 218Q300 199 350 218Q362 225 362 238V320Z';
  const art=`<defs><mask id="clear-face" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="720"><rect width="600" height="720" fill="white"/><path d="${opening}" fill="black"/></mask></defs><image width="600" height="720" mask="url(#clear-face)" href="data:image/webp;base64,${raster.toString('base64')}"/>`;
  const version=createHash('sha256').update(art).digest('hex').slice(0,12);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="154 138 292 324"><title>Длинные карамельные локоны</title>${art}</svg>\n`;
  writeFileSync(path.join(root,'haircuts/catalog-long-caramel-center-curls__200__Длинные карамельные локоны.svg'),svg);
  console.log('Added full-length caramel curls at 200 ₽.');
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv[2]);
