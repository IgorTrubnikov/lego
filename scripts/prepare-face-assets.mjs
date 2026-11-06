// Import the prepared 66-head transparent sheet, preserving reference row order.
// Usage: node scripts/prepare-face-assets.mjs heads.png [price=200]
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
const root=fileURLToPath(new URL('../',import.meta.url));
export const faceNames=[
 'Солнечные очки и улыбка','Красные губы и ресницы','Полосатая маска','Улыбка и густые брови','Ресницы и красная помада','Розовые губы','Круглые очки','Щетина и серьёзный взгляд',
 'Очки и голубая маска','Очки и розовая улыбка','Ресницы и улыбка','Широкая улыбка','Недовольное лицо','Рыжие бакенбарды','Густые брови и улыбка','Смех с закрытыми глазами',
 'Ресницы и розовые губы','Веснушки и розовая улыбка','Круглые очки и веснушки','Спокойная улыбка','Красные губы и взгляд вбок','Воздушный поцелуй','Коричневые солнечные очки','Щетина и улыбка',
 'Пиксельные очки','Кошачьи очки','Синие солнечные очки','Нежная розовая помада','Чёрная борода','Сердитое лицо со шрамами','Узкие солнечные очки','Чёрная борода и хмурые брови',
 'Кукольные швы','Зубастая улыбка','Удивление и румянец','Нахмуренное лицо','Розовая улыбка и брови','Усы и бородка','Очки и рыжая щетина','Седая борода и очки',
 'Тёмные очки и розовые губы','Седые брови и очки','Радостный смех','Смех и ресницы','Яркая красная улыбка','Рыжие брови','Улыбка и ямочки','Веснушки и спокойная улыбка',
 'Прямоугольные очки','Удивлённая улыбка','Недовольство и розовые губы','Хитрая улыбка','Квадратные очки и усы','Усы и веснушки','Светлые кошачьи очки','Зелёные солнечные очки',
 'Круглые очки и коричневая борода','Добрая улыбка','Спокойное лицо','Овальные очки и улыбка','Ресницы и розовая улыбка','Открытая радостная улыбка','Мягкая улыбка и ресницы','Широкая улыбка с ресницами',
 'Очки и седые пряди','Золотистые очки и розовые губы'
];
// Stud / head shell / neck boundaries in the cleaned reference sheet.
const rows=[[31,57,166,182],[181,193,299,312],[310,324,429,442],[440,454,559,572],[569,584,689,701],[699,714,818,830],[827,840,940,953],[966,991,1098,1114],[1118,1140,1253,1268]];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
export function prepare(source,price=200){
 if(!Number.isInteger(price)||price<0)throw Error('Invalid price');
 if(magick(['identify','-format','%wx%h',source])!=='1231x1278')throw Error('Expected the prepared 1231 × 1278 sheet');
 const temp=mkdtempSync(path.join(os.tmpdir(),'face-assets-'));
 try{
  const outputs=faceNames.map((name,i)=>{
   const row=i<64?Math.floor(i/8):8,col=i<64?i%8:i-64+3;
   const center=91+col*151.2,left=Math.round(center-67);
   const [stud,top,bottom,end]=rows[row];
   const pieces=[[stud,top,22],[top,bottom,112],[bottom,end,13]].map(([a,b,h],j)=>{
    const file=path.join(temp,`${i}-${j}.png`);
    magick([source,'-crop',`134x${b-a}+${left}+${a}`,'+repage','-filter','Lanczos','-resize',`152x${h}!`,file]);return file;
   });
   const file=path.join(temp,i+'.webp');
   magick([...pieces,'-append','-background','none','-gravity','northwest','-splice','224x173','-extent','600x720','-strip','-define','webp:lossless=true',file]);
   const data=readFileSync(file).toString('base64');
   // The physical head outline also excludes leftover matte/shadow pixels.
   const art=`<defs><clipPath id="head"><rect x="259" y="173" width="82" height="24" rx="4"/><rect x="224" y="195" width="152" height="112" rx="24"/><rect x="259" y="304" width="82" height="16" rx="3"/></clipPath></defs><image width="600" height="720" clip-path="url(#head)" href="data:image/webp;base64,${data}"/>`;
   const number=String(i+1).padStart(2,'0'),title=number+' · '+name;
   const version=createHash('sha256').update(art).digest('hex').slice(0,12);
   return {filename:`catalog-${number}__${price}__${title}.svg`,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="218 167 164 159"><title>${escapeHtml(title)}</title>${art}</svg>\n`};
  });
  // Replace the category only when every new head has been prepared successfully.
  for(const f of readdirSync(path.join(root,'faces')))if(/\.(svg|png|webp)$/i.test(f))rmSync(path.join(root,'faces',f));
  for(const out of outputs)writeFileSync(path.join(root,'faces',out.filename),out.svg);
  console.log(`Prepared ${outputs.length} heads at ${price} ₽ each.`);
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv[2],Number(process.argv[3]??200));
