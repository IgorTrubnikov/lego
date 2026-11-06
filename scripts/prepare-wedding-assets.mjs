// Local import of a prepared transparent 3-column × 2-row wedding sprite sheet.
// ImageMagick only slices and positions the finished artwork.
// Usage: node scripts/prepare-wedding-assets.mjs wedding-sheet.png
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const items=[['altar-1','Алтарь 1'],['altar-2','Алтарь 2'],['altar-3','Алтарь 3'],['altar-4','Алтарь 4'],['swing','Качели'],['balcony','Балкон']];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();}
const source=process.argv[2];if(!source)throw Error('Provide the prepared wedding sprite sheet.');
const [width,height]=magick(['identify','-format','%w %h',source]).split(' ').map(Number);
if(width%3||height%2||width/3!==height/2)throw Error('Expected a 3 × 2 grid of square cells.');
const size=width/3,temp=mkdtempSync(path.join(os.tmpdir(),'wedding-assets-'));
try{
 const outputs=items.map(([slug,name],i)=>{
  const cell=`${size}x${size}+${i%3*size}+${Math.floor(i/3)*size}`;
  const trim=magick([source,'-crop',cell,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
  const base=[source,'-crop',cell,'+repage','-crop',trim,'+repage','-filter','Lanczos','-resize','560x650'];
  const [w,h]=magick([...base,'-format','%w %h','info:']).split(' ').map(Number);
  const x=Math.round((600-w)/2),y=700-h,out=path.join(temp,slug+'.webp');
  magick([...base,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',out]);
  return {file:`${slug}__400__${name}.svg`,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-preview-box="${x-6} ${y-6} ${w+12} ${h+12}"><title>${escapeHtml(name)}</title><image width="600" height="720" href="data:image/webp;base64,${readFileSync(out).toString('base64')}"/></svg>\n`};
 });
 mkdirSync(path.join(root,'altars'),{recursive:true});
 for(const {file,svg} of outputs)writeFileSync(path.join(root,'altars',file),svg);
 console.log('Prepared six wedding scenes at 400 ₽ each.');
}finally{rmSync(temp,{recursive:true,force:true});}
