// Import five prepared transparent sheets: 10, 12, 12, 3+backpack, 12.
// Usage: node scripts/prepare-suit-assets.mjs first.png second.png third.png bundle.png formal.png [price=500]
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
const root=fileURLToPath(new URL('../',import.meta.url));
export const suitNames=[
 'Спортивный комплект с дельфином','Красное платье с цветами','Синий узорчатый комплект','Белое длинное платье','Розовое худи Cute Girl',
 'Розовое кимоно','Синяя школьная форма','Фиолетовый наряд с блёстками','Русалка с зелёным хвостом','Синяя форма чирлидера',
 'Голубая рубашка с бейджем','Красно-белая форма для единоборств','Повар с красным платком','Синяя куртка с бейджем',
 'Оливковая форма для единоборств','Зелёный жилет с подтяжками','Повар с голубым фартуком','Белый верх с синим драконом',
 'Рабочий с коричневым фартуком','Жёлтый костюм с голубым поясом','Розовый брючный костюм','Чёрный верх с огненной эмблемой',
 'Чёрный наряд с кружевами','Белый костюм с красным галстуком','Синий пиджак с жёлтым бантом','Розовый наряд с белыми перчатками',
 'Жёлтая куртка с чёрными брюками','Серая форма с бейджем','Красный рождественский костюм','Чёрно-золотой наряд с драконом',
 'Цветочные шорты и бабочка','Бирюзовый узорчатый комплект','Песочный верх и камуфляжные брюки','Красно-золотой наряд',
 'Чёрный комплект I Love My GF','Белый комплект I Love My BF','Военный комплект с рюкзаком',
 'Чёрный костюм в полоску','Классический чёрный костюм','Чёрный фрак','Чёрный костюм с белым галстуком',
 'Чёрный жакет с серой рубашкой','Белый двубортный костюм','Чёрная кожаная куртка','Татуировка дракона и чёрные брюки',
 'Чёрный смокинг с бабочкой','Серый брючный костюм','Коричневое пальто с поясом','Татуировка с топорами и джинсы'
];
const layouts=[[5,2,10],[4,3,12],[4,3,12],[2,2,3],[4,3,12]];
const splits=[.46,.41,.48,.41,.49,.42,.48,.43,.39,.46];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
function crop(source,i,cols,rows,w,h){const x=Math.floor(i%cols*w/cols),y=Math.floor(Math.floor(i/cols)*h/rows);return `${Math.floor((i%cols+1)*w/cols)-x}x${Math.floor((Math.floor(i/cols)+1)*h/rows)-y}+${x}+${y}`;}
export function prepare(sources,price=500){
 if(sources.length!==5||!Number.isInteger(price)||price<0)throw Error('Provide five prepared sheets and an integer price');
 const temp=mkdtempSync(path.join(os.tmpdir(),'suit-assets-'));
 try{
  const outputs=[];let index=0;
  for(const [s,source] of sources.entries()){
   const [cols,rows,count]=layouts[s];const [w,h]=magick(['identify','-format','%w %h',source]).split(' ').map(Number);
   if(w<1000||h<800)throw Error('Prepared sheet is too small');
   for(let i=0;i<count;i++,index++){
    const cell=crop(source,i,cols,rows,w,h);
    const trim=magick([source,'-crop',cell,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
    const cut=path.join(temp,index+'-cut.png');magick([source,'-crop',cell,'+repage','-crop',trim,'+repage',cut]);
    const [cw,ch]=magick(['identify','-format','%w %h',cut]).split(' ').map(Number);
    const ratio=s===0?splits[i]:s===3&&i<2?.43:.46,waist=Math.round(ch*ratio);
    // Keep prints continuous at the waist while matching the standard torso/leg heights.
    const halves=[[0,waist,193],[waist,ch,186]].map(([top,bottom,target],j)=>{
     const f=path.join(temp,index+'-'+j+'.png');magick([cut,'-crop',`${cw}x${bottom-top}+0+${top}`,'+repage','-filter','Lanczos','-resize',`322x${target}!`,f]);return f;
    });
    const file=path.join(temp,index+'.webp');magick([...halves,'-append','-background','none','-gravity','northwest','-splice','139x317','-extent','600x720','-strip','-define','webp:lossless=true',file]);
    let art=`<image width="600" height="720" href="data:image/webp;base64,${readFileSync(file).toString('base64')}"/>`;
    if(index===6)art='<g data-fit="school-center" transform="translate(-18 0)">'+art+'</g>';
    if(index===8)art='<g data-fit="mermaid-center" transform="translate(21 0)">'+art+'</g>';
    const included=s===3&&i===2;
    if(included){
     const bagCell=crop(source,3,cols,rows,w,h);
     const bagTrim=magick([source,'-crop',bagCell,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
     const bag=path.join(temp,'backpack.webp');
     magick([source,'-crop',bagCell,'+repage','-crop',bagTrim,'+repage','-filter','Lanczos','-resize','105x145','-background','none','-gravity','northwest','-splice','475x325','-extent','600x720','-strip','-define','webp:lossless=true',bag]);
     art+=`<image width="600" height="720" href="data:image/webp;base64,${readFileSync(bag).toString('base64')}"/>`;
    }
    const number=String(index+1).padStart(2,'0'),name=number+' · '+suitNames[index];
    const version=createHash('sha256').update(art).digest('hex').slice(0,12);
    outputs.push({filename:`catalog-${number}__${price}__${name}.svg`,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="${index===6?115:index===8?154:133} 311 ${included?453:334} 391"${included?' data-included-label="Рюкзак в комплекте"':''}><title>${escapeHtml(name)}</title>${art}</svg>\n`});
   }
  }
  if(outputs.length!==49)throw Error('Expected 49 complete outfits');
  mkdirSync(path.join(root,'suits'),{recursive:true});
  for(const f of readdirSync(path.join(root,'suits')))if(/\.(svg|png|webp)$/i.test(f))rmSync(path.join(root,'suits',f));
  for(const out of outputs)writeFileSync(path.join(root,'suits',out.filename),out.svg);
  console.log(`Prepared ${outputs.length} suits at ${price} ₽ each; backpack included in 37.`);
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);prepare(args.slice(0,5),Number(args[5]??500));}
