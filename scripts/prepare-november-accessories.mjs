// Rebuild accessories from the transparent sheet and the replacement basketball.
// Usage: node scripts/prepare-november-accessories.mjs
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';

const root=fileURLToPath(new URL('../',import.meta.url));
export const additions=[
 ['basketball','Баскетбольный мяч',100,120,120,'362x350+0+0'],
 ['boxing-gloves','Боксёрские перчатки',100,140,135,'380x350+362+0'],
 ['briefcase-brown','Портфель коричневый',100,140,125,'344x350+742+0'],
 ['briefcase-black','Портфель чёрный',100,140,125,'362x350+1086+0'],
 ['katana-gold','Катана золотая',100,85,230,'362x400+0+350'],
 ['katana-gray','Катана серая',100,85,230,'362x400+362+350'],
 ['acoustic-guitar','Акустическая гитара',100,130,245,'362x400+724+350'],
 ['handbag-black','Сумка чёрная',100,140,140,'362x400+1086+350'],
 ['heart-white','Сердечко белое',15,110,105,'362x326+0+760'],
 ['heart-red','Сердечко красное',15,110,105,'362x326+362+760'],
 ['heart-pink','Сердечко розовое',15,110,105,'362x326+724+760'],
];
function magick(args){
 const result=spawnSync('magick',args,{encoding:'utf8'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(result.stderr);
 return result.stdout.trim();
}
const source=path.join(root,'scripts/accessory-additions-2026-11/sheet.png');
if(magick(['identify','-format','%w %h',source])!=='1448 1086')throw Error('Unexpected source dimensions.');
const temp=mkdtempSync(path.join(os.tmpdir(),'november-accessories-'));
try{
 const outputs=additions.map(([slug,name,price,maxWidth,maxHeight,crop])=>{
  const sprite=path.join(temp,slug+'.png');
  const input=slug==='basketball'
   ?[path.join(root,'scripts/accessory-additions-2026-11/basketball.png')]
   :[source,'-crop',crop,'+repage'];
  // Remove almost invisible matte remnants before trimming; preserve opaque artwork.
  magick([...input,'-channel','A','-fx','u<0.15?0:u','+channel','-trim','+repage','-filter','Lanczos','-resize',`${maxWidth}x${maxHeight}`,sprite]);
  const [width,height]=magick(['identify','-format','%w %h',sprite]).split(' ').map(Number);
  if(width<20||height<20)throw Error('Empty accessory: '+slug);
  const x=Math.round(90-width/2),y=683-height,out=path.join(temp,slug+'.webp');
  magick([sprite,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',out]);
  const bytes=readFileSync(out),version=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="${x-6} ${y-6} ${width+12} ${height+12}"><title>${escapeHtml(name)}</title><image width="600" height="720" href="data:image/webp;base64,${bytes.toString('base64')}"/></svg>\n`;
  return {filename:`catalog-${slug}__${price}__${name}.svg`,svg};
 });
 for(const {filename,svg} of outputs)writeFileSync(path.join(root,'accessories',filename),svg);
 console.log('Added 11 accessories: three hearts at 15 ₽, eight other accessories at 100 ₽.');
}finally{rmSync(temp,{recursive:true,force:true});}
