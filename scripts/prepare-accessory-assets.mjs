// Local import of three transparent 4 × 4 sprite sheets, in catalog order.
// Artwork is prepared separately; ImageMagick only slices and positions it.
// Usage: node scripts/prepare-accessory-assets.mjs sheet-1.png sheet-2.png sheet-3.png
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
const root=fileURLToPath(new URL('../',import.meta.url));
export const accessoryItems=[
 ['gamepad','Геймпад',130,110],['magic-wand','Волшебная палочка',130,220],['white-handbag','Белая сумка',130,155],['skateboard','Скейтборд',140,110],
 ['book','Книга',110,165],['smartphone','Смартфон',110,150],['banknote','Купюра',130,90],['camera','Фотоаппарат',130,130],
 ['laptop-white','Ноутбук белый',140,125],['laptop-black','Ноутбук чёрный',140,125],['flowers-blue','Цветы синие',130,185],['flowers-purple','Цветы фиолетовые',130,185],
 ['flowers-pink','Цветы розовые',130,185],['flowers-orange','Цветы оранжевые',130,185],['flowers-yellow','Цветы жёлтые',130,185],['flowers-green','Цветы зелёные',130,185],
 ['tennis-racket','Теннисная ракетка',125,220],['hairbrush','Расчёска',110,180],['bottle','Бутылка',90,170],['shoulder-bag','Сумка на ремне',125,220],
 ['crowbar','Лом',90,220],['lipstick','Помада',70,165],['wheel-large','Колесо большое',135,145],['wheel-small','Колесо маленькое',105,115],
 ['rod-black','Стержень чёрный',100,165],['rod-red','Стержень красный',100,165],['rod-brown','Стержень коричневый',100,165],['rod-yellow','Стержень жёлтый',100,165],
 ['rod-cyan','Стержень голубой',100,165],['quibbler','Журнал The Quibbler',110,160],['mug-white','Кружка белая',110,115],['flower-white','Цветок белый',120,140],
 ['flower-pink','Цветок розовый',120,140],['syringe','Шприц',140,100],['boombox','Магнитофон',140,120],['bunny-pink','Кролик розовый',115,180],
 ['bunny-yellow','Кролик жёлтый',115,180],['bear-brown','Медведь коричневый',120,165],['bear-beige','Медведь бежевый',120,165],['heart','Сердце',110,145],
 ['football','Футбольный мяч',115,115],['coffee','Стакан кофе',100,145],['trophy','Кубок',120,165],['soda-can','Банка газировки',85,140],
 ['mug-blue','Кружка синяя',110,115],['mug-yellow','Кружка жёлтая',110,115],['headphones','Наушники',125,140],
];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();}
export function prepare(sources){
 if(sources.length!==3)throw Error('Provide three transparent 4 × 4 sprite sheets.');
 const temp=mkdtempSync(path.join(os.tmpdir(),'accessory-assets-'));
 try{
  const outputs=[];
  for(const [sheetIndex,source] of sources.entries()){
   const [width,height]=magick(['identify','-format','%w %h',path.resolve(source)]).split(' ').map(Number);
   if(width<800||width!==height)throw Error('Expected a square sprite sheet at least 800 px wide.');
   for(let cell=0;cell<16;cell++){
    const item=accessoryItems[sheetIndex*16+cell];if(!item)break;
    const [slug,name,maxWidth,maxHeight]=item,col=cell%4,row=Math.floor(cell/4);
    const left=Math.floor(col*width/4),top=Math.floor(row*height/4),right=Math.floor((col+1)*width/4),bottom=Math.floor((row+1)*height/4);
    const crop=`${right-left}x${bottom-top}+${left}+${top}`;
    const trim=magick([source,'-crop',crop,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
    const base=[source,'-crop',crop,'+repage','-crop',trim,'+repage','-filter','Lanczos','-resize',`${maxWidth}x${maxHeight}`];
    const [w,h]=magick([...base,'-format','%w %h','info:']).split(' ').map(Number);
    if(w<20||h<20)throw Error('Empty sprite: '+slug);
    const x=Math.round(90-w/2),y=683-h;
    const out=path.join(temp,slug+'.webp');
    magick([...base,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',out]);
    const previewBox=`${x-6} ${y-6} ${w+12} ${h+12}`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-preview-box="${previewBox}"><title>${escapeHtml(name)}</title><image width="600" height="720" href="data:image/webp;base64,${readFileSync(out).toString('base64')}"/></svg>\n`;
    outputs.push({filename:`catalog-${slug}__200__${name}.svg`,svg});
   }
  }
  if(outputs.length!==47)throw Error('Expected exactly 47 accessories.');
  const folder=path.join(root,'accessories');mkdirSync(folder,{recursive:true});
  // Replace only after every sprite has been prepared successfully.
  for(const name of readdirSync(folder))if(/\.(svg|png|webp)$/i.test(name))rmSync(path.join(folder,name));
  for(const {filename,svg} of outputs.filter(out=>!/^catalog-(?:mug-(?:blue|yellow)|wheel-small)__/.test(out.filename)))writeFileSync(path.join(folder,filename),svg);
  console.log(`Prepared ${outputs.length-3} accessories at 200 ₽ each.`);
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv.slice(2));
