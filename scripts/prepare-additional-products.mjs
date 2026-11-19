// Prepare standalone product examples for the Additional category.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const items=[['card','Карточка со своим фоном',200],['heart-pink','Брелок-сердце розовый',100],['heart-black','Брелок-сердце чёрный',100],['heart-white','Брелок-сердце белый',100],['heart-red','Брелок-сердце красный',100]];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
const source=path.join(root,'scripts/additional-products/sheet.png');
const [width,height]=magick(['identify','-format','%w %h',source]).split(' ').map(Number);
const temp=mkdtempSync(path.join(os.tmpdir(),'additional-products-'));
try{
 const outputs=items.map(([slug,name,price],i)=>{
  const col=i%3,row=Math.floor(i/3),cellW=width/3,cellH=height/2;
  const sprite=path.join(temp,slug+'.png'),out=path.join(temp,slug+'.webp');
  magick([source,'-crop',`${cellW}x${cellH}+${col*cellW}+${row*cellH}`,'+repage','-channel','A','-fx','u<0.5?0:u','+channel','-trim','+repage','-resize','540x620',sprite]);
  const [w,h]=magick(['identify','-format','%w %h',sprite]).split(' ').map(Number),x=Math.round((600-w)/2),y=Math.round((720-h)/2);
  magick([sprite,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',out]);
  const bytes=readFileSync(out),version=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  return {file:`${slug}__${price}__${name}.svg`,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-asset-version="${version}" data-preview-box="${x-6} ${y-6} ${w+12} ${h+12}"><title>${name}</title><image width="600" height="720" href="data:image/webp;base64,${bytes.toString('base64')}"/></svg>\n`};
 });
 mkdirSync(path.join(root,'additional'),{recursive:true});
 for(const out of outputs)writeFileSync(path.join(root,'additional',out.file),out.svg);
 console.log('Prepared card (200 ₽) and four heart keychain examples (100 ₽ each).');
}finally{rmSync(temp,{recursive:true,force:true});}
