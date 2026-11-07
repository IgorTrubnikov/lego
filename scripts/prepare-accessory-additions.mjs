// Add six wedding accessories from a transparent 3 × 2 sheet without removing existing items.
// Usage: node scripts/prepare-accessory-additions.mjs wedding-accessories.png
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const items=[
 ['married-sign','Табличка WE MARRIED',140,140],
 ['flowers-red-bouquet','Букет красных цветов',130,190],
 ['heart-tile','Плитка с сердцем',125,130],
 ['ring-box','Коробочка с кольцами',125,145],
 ['chocolate','Шоколадка',95,150],
 ['heart-large','Сердце большое',140,150],
];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();}
export function prepare(source){
 if(!source)throw Error('Provide a transparent 3 × 2 sprite sheet.');
 source=path.resolve(source);
 const [width,height]=magick(['identify','-format','%w %h',source]).split(' ').map(Number);
 if(width<1200||width*2!==height*3)throw Error('Expected a 3 × 2 sheet at least 1200 px wide.');
 const temp=mkdtempSync(path.join(os.tmpdir(),'accessory-additions-'));
 try{
  const outputs=items.map(([slug,name,maxWidth,maxHeight],index)=>{
   const col=index%3,row=Math.floor(index/3);
   const left=Math.floor(col*width/3),top=Math.floor(row*height/2);
   const right=Math.floor((col+1)*width/3),bottom=Math.floor((row+1)*height/2);
   const crop=`${right-left}x${bottom-top}+${left}+${top}`;
   const trim=magick([source,'-crop',crop,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
   const base=[source,'-crop',crop,'+repage','-crop',trim,'+repage','-filter','Lanczos','-resize',`${maxWidth}x${maxHeight}`];
   const [w,h]=magick([...base,'-format','%w %h','info:']).split(' ').map(Number);
   if(w<20||h<20)throw Error('Empty sprite: '+slug);
   const x=Math.round(90-w/2),y=683-h,out=path.join(temp,slug+'.webp');
   magick([...base,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',out]);
   const raster=readFileSync(out),version=createHash('sha256').update(raster).digest('hex').slice(0,12);
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="${x-6} ${y-6} ${w+12} ${h+12}"><title>${escapeHtml(name)}</title><image width="600" height="720" href="data:image/webp;base64,${raster.toString('base64')}"/></svg>\n`;
   return {filename:`catalog-${slug}__200__${name}.svg`,svg};
  });
  const folder=path.join(root,'accessories');mkdirSync(folder,{recursive:true});
  for(const {filename,svg} of outputs)writeFileSync(path.join(folder,filename),svg);
  console.log(`Added ${outputs.length} accessories at 200 ₽ each; existing accessories preserved.`);
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv[2]);
