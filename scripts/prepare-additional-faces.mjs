// Rebuild the eight reviewed heads without replacing the original collection.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),base=new URL('additional-faces/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base)));
const source=(await readFile(new URL('source.png',base))).toString('base64');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
try{
 const page=await browser.newPage();
 for(const p of manifest){
  const raster=await page.evaluate(async({p,source})=>{
   const img=new Image();img.src='data:image/png;base64,'+source;await img.decode();
   const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');
   // Shared physical stud, shell and neck outline excludes the source matte.
   const outline=new Path2D();outline.roundRect(259,173,82,24,4);outline.roundRect(224,195,152,112,24);outline.roundRect(259,304,82,16,3);
   ctx.clip(outline);
   const top=p.row?530:128,stud=p.row?465:64,bottom=p.row?794:393,end=p.row?838:437;
   ctx.drawImage(img,p.center-164,stud,328,top-stud,224,173,152,22);
   ctx.drawImage(img,p.center-164,top,328,bottom-top,224,195,152,112);
   ctx.drawImage(img,p.center-164,bottom,328,end-bottom,224,307,152,13);
   return c.toDataURL('image/png').split(',')[1];
  },{p,source});
  const version=createHash('sha256').update(Buffer.from(raster,'base64')).digest('hex').slice(0,12),label=`${p.number} · ${p.name}`;
  await writeFile(new URL(`faces/additional-${p.number}__0__${label}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-preview-box="218 167 164 159" data-asset-version="${version}"><title>${label}</title><image width="600" height="720" href="data:image/png;base64,${raster}"/></svg>\n`);
 }
}finally{await browser.close();}
