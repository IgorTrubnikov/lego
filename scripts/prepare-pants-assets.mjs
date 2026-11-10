// Import the prepared transparent 7 × 4 pants sheet in reference reading order.
// Usage: node scripts/prepare-pants-assets.mjs pants.png [price=200]
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
const root=fileURLToPath(new URL('../',import.meta.url));
export const pantsNames=[
 'Приглушённые синие','Оранжевые','Красные','Белые','Чёрные','Светло-серые','Тёмно-серые',
 'Тёмно-синие','Тёмно-зелёные','Розовые','Жёлтые','Коричневые','Бежевые','Зелёные',
 'Оливковые','Голубые','Светло-кремовые','Горчично-золотистые','Охристые','Ярко-оранжевые','Кобальтовые',
 'Прозрачные синие','Ярко-синие','Светло-голубые','Рыже-коричневые','Тёмно-коричневые','Бирюзовые','Жёлтые с рисунком и кедами'
];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
export function prepare(source,price=200){
 if(!Number.isInteger(price)||price<0)throw Error('Invalid price');
 if(magick(['identify','-format','%wx%h',source])!=='1659x948')throw Error('Expected the prepared 1659 × 948 sheet');
 const temp=mkdtempSync(path.join(os.tmpdir(),'pants-assets-'));
 try{
  const outputs=pantsNames.map((name,i)=>{
   const row=Math.floor(i/7);
   // The last row's studs start just before its cell boundary in this sheet.
   // Exclude them from the third row so no stray marks appear below the feet.
   const cell=`237x${row===2?225:237}+${i%7*237}+${row*237}`;
   const trim=magick([source,'-crop',cell,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
   const file=path.join(temp,i+'.webp');
   // 224 px waistband matches the new torso hems (old pants were 176 px wide).
   // Attachment pegs sit behind the torso; the soles remain within the shared canvas.
   magick([source,'-crop',cell,'+repage','-crop',trim,'+repage','-filter','Lanczos','-resize','224x249!','-background','none','-gravity','northwest','-splice','188x447','-extent','600x720','-strip','-define','webp:lossless=true',file]);
   const data=readFileSync(file).toString('base64');
   const number=String(i+1).padStart(2,'0'),title=number+' · '+name;
   const art=`<image width="600" height="720" href="data:image/webp;base64,${data}"/>`;
   const version=createHash('sha256').update(art).digest('hex').slice(0,12);
   return {filename:`catalog-${number}__${price}__${title}.svg`,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="182 441 236 261"><title>${escapeHtml(title)}</title>${art}</svg>\n`};
  }).filter(out=>!/^catalog-(01|15|17|24|18|19|23|22)__/.test(out.filename));
  // Do not replace the trial category until all 28 new variants are prepared.
  for(const f of readdirSync(path.join(root,'pants')))if(/\.(svg|png|webp)$/i.test(f))rmSync(path.join(root,'pants',f));
  for(const out of outputs)writeFileSync(path.join(root,'pants',out.filename),out.svg);
  console.log(`Prepared ${outputs.length} pants variants at ${price} ₽ each.`);
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv[2],Number(process.argv[3]??200));
