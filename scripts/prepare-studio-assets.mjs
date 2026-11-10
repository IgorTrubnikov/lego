// Optional artwork import tool, NOT used by the website or Pages build.
// Input: three transparent 1536x1024 sheets, each a 3-column / 2-row grid.
// ImageMagick only slices, trims and positions already prepared artwork.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const sheets=process.argv.slice(2);
if(sheets.length!==3)throw new Error('Usage: node scripts/prepare-studio-assets.mjs torsos.png legs.png animals.png (requires ImageMagick 7)');
function magick(args){
 const result=spawnSync('magick',args,{encoding:'utf8'});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error(result.stderr);
 return result.stdout.trim();
}
const groups=[
 {folder:'clothes',width:322,height:257,x:139,y:285,items:[
  ['3d-ivory-blazer',450,'Светлый пиджак'],['3d-black-suit',450,'Чёрный костюм'],['3d-kitten-jacket',400,'Жакет с котёнком'],
  ['3d-varsity',400,'Красная куртка'],['3d-tropical',400,'Тропическая рубашка'],['3d-unicorn',350,'Футболка с единорогом'],
 ]},
 {folder:'pants',width:176,height:232,x:212,y:451,items:[
  ['3d-ivory',250,'Молочные Lego-брюки'],['3d-black',250,'Чёрные Lego-брюки'],['3d-blue',250,'Синие Lego-брюки'],
  ['3d-red',250,'Красные Lego-брюки'],['3d-pink',300,'Розовые Lego-брюки'],['3d-green',250,'Зелёные Lego-брюки'],
 ]},
 {folder:'animals',width:150,height:210,items:[
  ['3d-dalmatian',450,'Пятнистый далматинец'],['3d-ginger-kitten',350,'Рыжий котёнок'],['3d-ivory-kitten',350,'Белый котёнок'],
  ['3d-shepherd',500,'Немецкая овчарка'],['3d-labrador',450,'Светлый лабрадор'],['3d-bulldog',450,'Французский бульдог'],
 ]},
];
for(const [index,group] of groups.entries()){
 const source=path.resolve(sheets[index]);
 if(magick(['identify','-format','%wx%h',source])!=='1536x1024')throw new Error('Expected 1536x1024 sheet: '+source);
 mkdirSync(group.folder,{recursive:true});
 for(const [i,[slug,price,name]] of group.items.entries()){
  if(group.folder==='animals'&&[1,2].includes(i))continue; // Retired cats are replaced by the new cat catalog.
  const cell=`512x512+${(i%3)*512}+${Math.floor(i/3)*512}`;
  const crop=magick([source,'-crop',cell,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
  const base=[source,'-crop',cell,'+repage','-crop',crop,'+repage','-filter','Lanczos','-resize',`${group.width}x${group.height}${group.folder==='animals'?'':'!'}`];
  let x=group.x,y=group.y;
  if(group.folder==='animals'){
   const [w,h]=magick([...base,'-format','%w %h','info:']).split(' ').map(Number);
   x=Math.round(515-w/2);y=683-h;
  }
  const target=path.join(group.folder,`${slug}__${price}__${name}.webp`);
  magick([...base,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true','-quality','100',target]);
  console.log(target);
 }
}
