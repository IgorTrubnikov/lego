// Usage: node scripts/prepare-renewed-hair.mjs directory-with-01.png-through-53.png
// Originals are from the two November hair archives; SHA-256 verifies the exact artwork.
import {readFileSync,writeFileSync,mkdtempSync,readdirSync,rmSync,renameSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('./renewed-hair-manifest.json',import.meta.url)));
const hash=data=>createHash('sha256').update(data).digest('hex');
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);}
export function prepare(sourceDir){
 if(!sourceDir)throw Error('Provide the directory containing the numbered original PNG files.');
 const temp=mkdtempSync(path.join(os.tmpdir(),'renewed-hair-'));
 try{
  // Stage every image before replacing the live catalog, so a failed import leaves it intact.
  for(const part of manifest){
   const number=String(part.number).padStart(2,'0'),source=path.join(sourceDir,number+'.png');
   if(hash(readFileSync(source))!==part.sha256)throw Error('Unexpected source image '+number);
   const [bx,by,bw,bh]=part.bbox,rasterFile=path.join(temp,number+'.webp');
   // Uniform resizing preserves the original contour, face opening and complete strand tips.
   magick([source,'-crop',`${bw}x${bh}+${bx}+${by}`,'+repage','-filter','Lanczos','-resize',part.width+'x','-background','none','-gravity','northwest','-splice',`${part.x}x${part.y}`,'-extent','600x720','-channel','A','-fx',`u<${part.matteThreshold||0.01}?0:u`,'+channel','-strip','-define','webp:lossless=true',rasterFile]);
   const raster=readFileSync(rasterFile),height=Math.round(bh*part.width/bw);
   const label=String(part.displayNumber).padStart(2,'0')+' · '+part.name;
   const box=[part.x-6,part.y-6,part.width+12,height+12].join(' ');
   const art=`<image width="600" height="720" href="data:image/webp;base64,${raster.toString('base64')}"/>`;
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${hash(art).slice(0,12)}" data-preview-box="${box}"><title>${label}</title>${art}</svg>\n`;
   writeFileSync(path.join(temp,`renewed-${number}__200__${label}.svg`),svg);
  }
  for(const name of readdirSync(path.join(root,'haircuts')))if(/\.(svg|png|webp)$/i.test(name)&&!/^catalog-cap-(white|black)__/.test(name))rmSync(path.join(root,'haircuts',name));
  for(const name of readdirSync(temp))if(name.endsWith('.svg'))renameSync(path.join(temp,name),path.join(root,'haircuts',name));
  rmSync(path.join(root,'assets/hair-backs'),{recursive:true,force:true});
  console.log(`Replaced the hair catalog with ${manifest.length} original hairpieces at 200 ₽ each.`);
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv[2]);
