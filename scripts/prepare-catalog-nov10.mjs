// Add the supplied bags, bear, ice creams and plain shirts; replace only the four old cats.
// Usage: node scripts/prepare-catalog-nov10.mjs accessories.png cats.png shirts.png
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const extras=[
 ['handbag-light-pink','Сумка светло-розовая',130,155],['handbag-hot-pink','Сумка ярко-розовая',120,150],
 ['bear-heart','Мишка с сердечком',120,165],['ice-cream-strawberry','Мороженое клубничное',85,160],
 ['ice-cream-vanilla','Мороженое ванильное',85,160],['ice-cream-chocolate','Мороженое шоколадное',85,160],
 ['shoulder-bag-black','Сумка на ремне чёрная',125,220],['shoulder-bag','Сумка на ремне коричневая',125,220]
];
const cats=[
 ['cat-standing-gray','Кошка серая'],['cat-standing-black','Кошка чёрная'],['cat-standing-tabby','Кошка рыжая полосатая'],['cat-standing-white','Кошка белая'],['cat-standing-yellow','Кошка жёлтая с ошейником'],
 ['cat-kitten-pink','Котёнок розовый'],['cat-kitten-cream','Котёнок кремовый'],['cat-kitten-ginger','Котёнок рыжий'],['cat-kitten-black','Котёнок чёрный'],['cat-kitten-white','Котёнок белый']
].map(([slug,name],i)=>[slug,name,150,i<5?210:170]);
const shirts=[['38','Коричневый однотонный верх'],['39','Светло-серый однотонный верх'],['40','Бежевый однотонный верх']].map(([n,name])=>['catalog-'+n,n+' · '+name,322,215]);
function magick(args){const result=spawnSync('magick',args,{encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw Error(result.stderr);return result.stdout.trim();}
export function prepare(sources){
 if(sources.length!==3)throw Error('Provide accessory, cat and shirt sprite sheets.');
 const temp=mkdtempSync(path.join(os.tmpdir(),'catalog-nov10-'));
 try{
  const outputs=[];
  for(const [s,group] of [
   {folder:'accessories',cols:4,rows:2,columns:[0,438,783,1159,1536],price:200,items:extras,center:90,bottom:683},
   {folder:'animals',cols:5,rows:2,columns:[0,337,633,929,1221,1536],bands:[0,590,1024],price:350,items:cats,center:515,bottom:683},
   {folder:'clothes',cols:3,rows:1,price:200,items:shirts,x:139,y:317}
  ].entries()){
   const source=path.resolve(sources[s]),[width,height]=magick(['identify','-format','%w %h',source]).split(' ').map(Number);
   if(width<1200||height<500)throw Error('Sprite sheet is too small.');
   for(const [i,[slug,name,maxWidth,maxHeight]] of group.items.entries()){
    const col=i%group.cols,row=Math.floor(i/group.cols);
    const edge=c=>Math.floor(group.columns?group.columns[c]*width/1536:c*width/group.cols),band=r=>Math.floor(group.bands?group.bands[r]*height/1024:r*height/group.rows);
    const left=edge(col),top=band(row),cw=edge(col+1)-left,ch=band(row+1)-top,cell=`${cw}x${ch}+${left}+${top}`;
    // Use the main connected silhouette for bounds, ignoring detached generation specks.
    const objects=magick([source,'-crop',cell,'+repage','-alpha','extract','-threshold','15%','-define','connected-components:verbose=true','-connected-components','8','null:']);
    const components=[...objects.matchAll(/^\s*\d+: (\d+)x(\d+)\+(\d+)\+(\d+) [\d.,-]+ (\d+) srgb\(255,255,255\)/gm)].sort((a,b)=>Number(b[5])-Number(a[5]));
    if(!components.length)throw Error('Empty sprite: '+slug);
    const [,bw,bh,bx,by]=components[0].map(Number),tx=Math.max(0,bx-2),ty=Math.max(0,by-2),trim=`${Math.min(cw,bx+bw+2)-tx}x${Math.min(ch,by+bh+2)-ty}+${tx}+${ty}`;
    const base=[source,'-crop',cell,'+repage','-crop',trim,'+repage','-filter','Lanczos','-resize',`${maxWidth}x${maxHeight}${group.folder==='clothes'?'!':''}`];
    const [w,h]=magick([...base,'-format','%w %h','info:']).split(' ').map(Number),x=group.x??Math.round(group.center-w/2),y=group.y??group.bottom-h;
    const file=path.join(temp,s+'-'+i+'.webp');magick([...base,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',file]);
    const bytes=readFileSync(file),version=createHash('sha256').update(bytes).digest('hex').slice(0,12),preview=`${x-6} ${y-6} ${w+12} ${h+12}`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="${preview}"><title>${escapeHtml(name)}</title><image width="600" height="720" href="data:image/webp;base64,${bytes.toString('base64')}"/></svg>\n`;
    outputs.push({folder:group.folder,filename:`${group.folder==='accessories'?'catalog-':''}${slug}__${group.price}__${name}.svg`,svg});
   }
  }
  if(outputs.length!==21)throw Error('Expected 8 accessories, 10 cats and 3 shirts.');
  for(const folder of ['accessories','animals','clothes'])mkdirSync(path.join(root,folder),{recursive:true});
  for(const file of readdirSync(path.join(root,'animals')))if(/^(?:black-cat|ginger-cat|3d-ginger-kitten|3d-ivory-kitten)__/.test(file))rmSync(path.join(root,'animals',file));
  for(const file of readdirSync(path.join(root,'accessories')))if(file.startsWith('catalog-shoulder-bag__'))rmSync(path.join(root,'accessories',file));
  for(const {folder,filename,svg} of outputs)writeFileSync(path.join(root,folder,filename),svg);
  console.log('Prepared 8 accessories (7 new, brown shoulder bag updated), 10 replacement cats and 3 shirts.');
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv.slice(2));
