// Import the prepared transparent 6 × 7 torso sheet (37 reference designs).
// Usage: node scripts/prepare-clothes-assets.mjs clothes.png [price=0]
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
const root=fileURLToPath(new URL('../',import.meta.url));
export const clothesNames=[
 'Синий однотонный верх','Голубой однотонный верх','Бирюзовый однотонный верх','Синяя куртка с бананом','Красная университетская куртка','Светлый пиджак',
 'Тёмно-зелёный однотонный верх','Оливковый однотонный верх','Светло-жёлтый однотонный верх','Зелёный однотонный верх','Красная куртка с футболкой','Чёрный костюм с галстуком',
 'Кирпичный однотонный верх','Персиковый однотонный верх','Песочный однотонный верх','Синий свитер с орнаментом','Тропическая рубашка с бейджем','Чёрный жакет с котёнком',
 'Красный однотонный верх','Малиновый однотонный верх','Лавандовый однотонный верх','Свитер с красно-золотым шарфом','Серый жилет с жёлтым галстуком','Зелёный свитер с зигзагом',
 'Серый однотонный верх','Белый однотонный верх','Чёрный однотонный верх','Розовый однотонный верх','Бордовое худи Tiger','Белая футболка с единорогом',
 'Белый халат с бейджем','Белый халат со стетоскопом','Бирюзовая медицинская форма','Белая футболка I Love My GF','Белая футболка I Love My BF','Белый жакет в голубую полоску',
 'Розовая медицинская форма'
];
// Remove the colored neck pegs while retaining the collar, arms and complete hands.
const bands=[[65,190],[258,377],[444,558],[622,737],[797,910],[954,1073],[1125,1234]];
const columns=[7,222,432,642,852,1062,1274];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
export function prepare(source,price=0){
 if(!Number.isInteger(price)||price<0)throw Error('Invalid price');
 if(magick(['identify','-format','%wx%h',source])!=='1274x1235')throw Error('Expected the prepared 1274 × 1235 sheet');
 const temp=mkdtempSync(path.join(os.tmpdir(),'clothes-assets-'));
 try{
  const outputs=clothesNames.map((name,i)=>{
   const row=Math.floor(i/6),col=i%6,[top,bottom]=bands[row],left=columns[col];
   const cell=`${columns[col+1]-left}x${bottom-top}+${left}+${top}`;
   const trim=magick([source,'-crop',cell,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
   const file=path.join(temp,i+'.webp');
   magick([source,'-crop',cell,'+repage','-crop',trim,'+repage','-filter','Lanczos','-resize','322x215!','-background','none','-gravity','northwest','-splice','139x317','-extent','600x720','-strip','-define','webp:lossless=true',file]);
   const data=readFileSync(file).toString('base64');
   const number=String(i+1).padStart(2,'0'),title=number+' · '+name;
   const art=`<image width="600" height="720" href="data:image/webp;base64,${data}"/>`;
   const version=createHash('sha256').update(art).digest('hex').slice(0,12);
   return {filename:`catalog-${number}__${price}__${title}.svg`,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="133 311 334 227"><title>${escapeHtml(title)}</title>${art}</svg>\n`};
  }).filter(out=>!/^catalog-(03|10|14)__/.test(out.filename));
  const config=JSON.parse(readFileSync(new URL('./plain-torsos/order.json',import.meta.url)));
  const order=config.groups.flatMap(g=>g.numbers);
  const detailed=new Set(JSON.parse(readFileSync(new URL('./original-torsos/manifest.json',import.meta.url))).items.map(p=>p.number));
  const current=outputs.filter(out=>{const n=Number(out.filename.match(/^catalog-(\d+)/)[1]);return !config.retired.includes(n)&&!detailed.has(n);});
  for(const out of current){const n=Number(out.filename.match(/^catalog-(\d+)/)[1]);out.svg=out.svg.replace('<svg ',`<svg data-catalog-order="${(order.indexOf(n)+1)*10}" `);}
  // Replace trial clothing only after every design has been prepared successfully.
  for(const f of readdirSync(path.join(root,'clothes')))if(/^catalog-\d{2}__/.test(f)&&Number(f.match(/^catalog-(\d+)/)[1])<=37&&!detailed.has(Number(f.match(/^catalog-(\d+)/)[1])))rmSync(path.join(root,'clothes',f));
  for(const out of current)writeFileSync(path.join(root,'clothes',out.filename),out.svg);
  console.log(`Prepared ${current.length} original clothing variants; later colors preserved at ${price} ₽ each.`);
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv[2],Number(process.argv[3]??0));
