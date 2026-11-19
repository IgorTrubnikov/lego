// Prepare hairstyle 70 at a uniform scale; keep the source's natural proportions.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'scripts/curly-hair-70/source.png');
const width=243,x=179,y=132;
function magick(args){
 const result=spawnSync('magick',args,{encoding:'utf8'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(result.stderr);
 return result.stdout.trim();
}
const temp=mkdtempSync(path.join(os.tmpdir(),'curly-hair-70-'));
try{
 const sprite=path.join(temp,'hair.png'),out=path.join(temp,'hair.webp');
 magick([source,'-channel','A','-fx','u<0.15?0:u','+channel','-trim','+repage','-filter','Lanczos','-resize',width+'x',sprite]);
 const height=Number(magick(['identify','-format','%h',sprite]));
 magick([sprite,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',out]);
 const raster=readFileSync(out),version=createHash('sha256').update(raster).digest('hex').slice(0,12);
 const label='70 · Каштановые локоны с пробором';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-catalog-order="700" data-preview-box="${x-6} ${y-6} ${width+12} ${height+12}"><title>${label}</title><image width="600" height="720" href="data:image/webp;base64,${raster.toString('base64')}"/></svg>\n`;
 writeFileSync(path.join(root,`haircuts/curly-brown-70__0__${label}.svg`),svg);
 console.log(`Prepared hairstyle 70: ${width} × ${height}, x=${x}, y=${y}, no extra charge.`);
}finally{rmSync(temp,{recursive:true,force:true});}
