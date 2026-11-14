// Rebuild the eight reviewed heads without replacing the original collection.
import {chromium} from '@playwright/test';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),base=new URL('additional-faces/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base)));
const source=(await readFile(new URL('source.png',base))).toString('base64');
const referenceName=(await readdir(new URL('faces/',root))).find(name=>name.startsWith('catalog-58__'));
const reference=(await readFile(new URL('faces/'+referenceName,root))).toString('base64');
const blank=(await readFile(new URL('blank-reference.png',base))).toString('base64');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
try{
 const page=await browser.newPage();
 for(const p of manifest){
  const raster=await page.evaluate(async({p,source,reference,blank})=>{
   const img=new Image();img.src='data:image/png;base64,'+source;await img.decode();
   const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');
   // Shared physical stud, shell and neck outline excludes the source matte.
   const outline=new Path2D();outline.roundRect(259,173,82,24,4);outline.roundRect(224,195,152,112,24);outline.roundRect(259,304,82,16,3);
   ctx.clip(outline);
   const top=p.row?530:128,stud=p.row?465:64,bottom=p.row?794:393,end=p.row?838:437;
   ctx.drawImage(img,p.center-164,stud,328,top-stud,224,173,152,22);
   ctx.drawImage(img,p.center-164,top,328,bottom-top,224,195,152,112);
   ctx.drawImage(img,p.center-164,bottom,328,end-bottom,224,307,152,13);
   const original=ctx.getImageData(0,0,600,720);
   const load=async src=>{const image=new Image();image.src=src;await image.decode();return image;};
   const ref=await load('data:image/svg+xml;base64,'+reference),blankImage=await load('data:image/png;base64,'+blank);
   const base=document.createElement('canvas');base.width=600;base.height=720;const b=base.getContext('2d');b.drawImage(ref,0,0);
   const skin=b.getImageData(0,0,600,720);
   const clean=document.createElement('canvas');clean.width=600;clean.height=720;const q=clean.getContext('2d');
   q.drawImage(blankImage,429,368,287,215,224,195,152,112);
   const cleanPixels=q.getImageData(0,0,600,720).data;
   // Remove the reference print with the blank plastic texture, matching its
   // row colors at both sides. All pixels outside this patch retain the exact
   // catalog reference, including its silhouette, stud, neck and highlights.
   for(let y=216;y<295;y++)for(let x=252;x<349;x++){
    const i=(y*600+x)*4,l=(y*600+251)*4,r=(y*600+349)*4,t=(x-251)/98;
    const feather=Math.min(1,(x-251)/8,(349-x)/8,(y-215)/5,(295-y)/5);
    for(let channel=0;channel<3;channel++){
     const deltaLeft=skin.data[l+channel]-cleanPixels[l+channel],deltaRight=skin.data[r+channel]-cleanPixels[r+channel];
     const value=cleanPixels[i+channel]+deltaLeft*(1-t)+deltaRight*t;
     skin.data[i+channel]=Math.round(skin.data[i+channel]*(1-feather)+Math.max(0,Math.min(255,value))*feather);
    }
   }
   // Keep the original printed colors; reject warm peach source-skin pixels.
   // Feature extraction is limited to the face print so no old rim or shading
   // can change the common head shape or skin outside it.
   const rowSkin=[];
   for(let y=220;y<294;y++){
    const colors=[];
    for(let x=244;x<357;x++){const i=(y*600+x)*4,[r,g,blue]=original.data.slice(i,i+3);if(r>150&&g>105&&blue>70&&r-g>20&&r-g<85&&g-blue>8&&g-blue<70)colors.push([r,g,blue]);}
    rowSkin[y]=[0,1,2].map(c=>colors.map(rgb=>rgb[c]).sort((a,b)=>a-b)[Math.floor(colors.length*.65)]??[245,185,140][c]);
   }
   for(let y=220;y<294;y++)for(let x=242;x<359;x++){
    const i=(y*600+x)*4,[r,g,blue]=original.data.slice(i,i+3);
    const sourceSkin=r>150&&g>105&&blue>70&&r-g>20&&r-g<85&&g-blue>8&&g-blue<70;
    if(original.data[i+3]<240)continue;
    if(sourceSkin){
     const bg=rowSkin[y],coverage=1-Math.min(r/bg[0],g/bg[1],blue/bg[2]);
     const edgeZone=(y>=235&&y<=268&&x>=245&&x<=355)||(y>=274&&y<=288&&x>=280&&x<=320)||(p.number===73&&y>=224&&y<=246&&x>=245&&x<=355);
     if(edgeZone&&coverage>.12)for(let channel=0;channel<3;channel++)skin.data[i+channel]=Math.max(0,Math.min(255,Math.round(original.data[i+channel]+(skin.data[i+channel]-bg[channel])*(1-coverage))));
     continue;
    }
    for(let channel=0;channel<3;channel++)skin.data[i+channel]=original.data[i+channel];
   }
   b.putImageData(skin,0,0);
   return base.toDataURL('image/png').split(',')[1];
  },{p,source,reference,blank});
  const version=createHash('sha256').update(Buffer.from(raster,'base64')).digest('hex').slice(0,12),label=`${p.number} · ${p.name}`;
  await writeFile(new URL(`faces/additional-${p.number}__0__${label}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-preview-box="218 167 164 159" data-asset-version="${version}"><title>${label}</title><image width="600" height="720" href="data:image/png;base64,${raster}"/></svg>\n`);
 }
}finally{await browser.close();}
