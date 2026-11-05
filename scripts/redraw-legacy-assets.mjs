// Optional, one-time import of 6 prepared glossy-plastic sprite sheets.
// The image-generation step draws the art. This tool only cuts sprites and
// aligns them to the shared canvas, preserving all existing public SVG URLs.
// Usage: node scripts/redraw-legacy-assets.mjs hair.png faces.png clothes.png pants.png accessories.png pets.png
// Each input sheet: 1536x1024 pixels, 3 columns x 2 rows; requires ImageMagick 7.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { escapeHtml } from '../parts.js';
const sources=process.argv.slice(2);
if(sources.length!==6)throw new Error('Provide 6 sprite sheets: hair, faces, clothes, pants, accessories, pets.');
const original=JSON.parse(readFileSync(new URL('../test/fixtures/legacy-catalog.json',import.meta.url),'utf8'));
const groups=[
 {category:'hair',order:['wave','bob','blond','curls','long','short'],positions:[[198,130,204,128],[199,130,202,181],[198,130,204,128],[197,130,206,128],[198,135,204,187],[203,143,194,107]]},
 {category:'face',order:['smile','glasses','wink','lashes','freckles','grin'],x:224,y:173,w:152,h:147},
 {category:'torso',order:['cream','black','pink','blue','red','green'],x:139,y:285,w:322,h:244},
 {category:'legs',order:['cream','denim','black','brown','pink','sage'],x:212,y:451,w:176,h:232},
 {category:'accessory',order:['handbag','tote','bouquet','tulips','rose'],w:130,h:240,center:90},
 {category:'animal',order:['corgi','dalmatian','ginger-cat','black-cat','parrot'],w:150,h:210,center:515},
];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw new Error(r.stderr);return r.stdout.trim();}
const temporary=mkdtempSync(path.join(os.tmpdir(),'legacy-renders-'));
try{
 const outputs=[];
 for(const [g,group] of groups.entries()){
  const source=path.resolve(sources[g]);
  if(magick(['identify','-format','%wx%h',source])!=='1536x1024')throw new Error('Expected 1536x1024 sheet: '+source);
  for(const [i,slug] of group.order.entries()){
   const part=original.find(p=>p.id===group.category+'-'+slug);
   if(!part)throw new Error('Unknown existing part: '+slug);
   const cell=`512x512+${(i%3)*512}+${Math.floor(i/3)*512}`;
   const trim=magick([source,'-crop',cell,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
   const [x0,y0,w,h]=group.positions?.[i]||[group.x,group.y,group.w,group.h];
   const resize=group.center?`${w}x${h}`:`${w}x${h}!`;
   const base=[source,'-crop',cell,'+repage','-crop',trim,'+repage','-filter','Lanczos','-resize',resize];
   let x=x0,y=y0;
   if(group.center){const [width,height]=magick([...base,'-format','%w %h','info:']).split(' ').map(Number);x=Math.round(group.center-width/2);y=683-height;}
   const image=path.join(temporary,part.id+'.webp');
   magick([...base,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true','-quality','100',image]);
   const data=readFileSync(image).toString('base64');
   // Shared front-hair opening guarantees no bangs or curls can cover eyes/mouth.
   // This clip is the same face-safe contour used by the original aligned hair.
   const clip=group.category==='hair'?'<defs><clipPath id="face-opening"><path d="M190 110H410V327H356V224C336 225 316 215 300 211C282 222 263 225 244 224V327H190Z"/></clipPath></defs>':'';
   const attr=group.category==='hair'?' clip-path="url(#face-opening)"':'';
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic"><title>${escapeHtml(part.name)}</title>${clip}<image width="600" height="720"${attr} href="data:image/webp;base64,${data}"/></svg>\n`;
   outputs.push({file:decodeURIComponent(part.image.slice(2)),svg});
  }
 }
 // No existing asset is changed unless all sheets and all sprites processed.
 for(const out of outputs){writeFileSync(out.file,out.svg);console.log(out.file);}
}finally{rmSync(temporary,{recursive:true,force:true});}
