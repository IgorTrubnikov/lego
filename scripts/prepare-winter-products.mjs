// Prepare the snowy tree, decorative snow example and two distinct letter tiles.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const items=[
 ['additional','snowy-tree','Заснеженная ёлка','730x575+0+0',540,620],
 ['additional','decorative-snow','Декоративный снег','576x500+864+32',540,620],
 ['accessories','catalog-letter-seal','Письмо с красной печатью','730x434+0+590',140,125],
 ['accessories','catalog-letter-love','Любовное письмо','768x434+768+590',140,125],
];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
const source=path.join(root,'scripts/winter-products/sheet.png');
if(magick(['identify','-format','%w %h',source])!=='1536 1024')throw Error('Unexpected source dimensions.');
const temp=mkdtempSync(path.join(os.tmpdir(),'winter-products-'));
try{
 const outputs=items.map(([folder,slug,name,crop,maxW,maxH])=>{
  const sprite=path.join(temp,slug+'.png'),out=path.join(temp,slug+'.webp');
  magick([source,'-crop',crop,'+repage','-channel','A','-fx','u<0.15?0:u','+channel','-trim','+repage','-filter','Lanczos','-resize',`${maxW}x${maxH}`,sprite]);
  const [width,height]=magick(['identify','-format','%w %h',sprite]).split(' ').map(Number);
  const x=folder==='accessories'?Math.round(90-width/2):Math.round((600-width)/2);
  const y=folder==='accessories'?683-height:Math.round((720-height)/2);
  magick([sprite,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',out]);
  const bytes=readFileSync(out),version=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-asset-version="${version}" data-preview-box="${x-6} ${y-6} ${width+12} ${height+12}"><title>${name}</title><image width="600" height="720" href="data:image/webp;base64,${bytes.toString('base64')}"/></svg>\n`;
  return {file:path.join(root,folder,`${slug}__100__${name}.svg`),svg};
 });
 for(const {file,svg} of outputs)writeFileSync(file,svg);
 console.log('Prepared four products at 100 ₽ each: tree, snow and two letters.');
}finally{rmSync(temp,{recursive:true,force:true});}
