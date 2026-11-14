// Rebuild the 16 reviewed cutouts with Chromium; does not replace older suits.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),base=new URL('additional-suits/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base)));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
try{
 const page=await browser.newPage();
 for(const p of manifest){
  const source=(await readFile(new URL(p.sheet+'.png',base))).toString('base64');
  const raster=await page.evaluate(async({p,source})=>{
   const image=new Image();image.src='data:image/png;base64,'+source;await image.decode();
   const [bx,by,w,h]=p.box;
   const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
   // Reviewed silhouettes in normalized source coordinates exclude sheet artifacts.
   const path=new Path2D(p.sheet==='skirts'
    ? 'M.30 .005 L.70 .005 Q.72 .01 .73 .04 Q.83 .035 .88 .12 L.95 .30 Q1 .37 .98 .46 Q1 .47 1 .51 Q.99 .56 .84 .58 L.84 .99 L.81 1 L.54 1 L.525 .98 L.525 .74 L.485 .74 L.485 .98 L.47 1 L.18 1 L.16 .99 L.16 .58 Q.02 .57 0 .52 L0 .48 L.025 .46 Q0 .37 .05 .31 L.12 .12 Q.17 .035 .27 .04 Q.28 .01 .30 .005 Z'
    : 'M.32 .005 L.68 .005 Q.71 .008 .72 .04 Q.82 .025 .88 .14 L.95 .36 L.94 .41 Q1 .44 .99 .52 Q.985 .58 .94 .60 L.89 .57 L.88 .51 L.85 .49 L.825 .51 L.82 .57 L.79 .59 L.79 .99 L.77 1 L.55 1 L.53 .985 L.53 .71 L.48 .71 L.48 .985 L.46 1 L.23 1 L.21 .99 L.21 .59 L.18 .57 L.175 .51 L.15 .49 L.12 .51 L.11 .57 L.06 .60 Q.015 .58 .01 .52 Q0 .44 .06 .41 L.05 .36 L.12 .14 Q.18 .025 .28 .04 Q.29 .008 .32 .005 Z');
   ctx.save();ctx.scale(w,h);ctx.clip(path);ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(image,bx,by,w,h,0,0,w,h);
   // The open grips and leg gap are transparent, not colored sheet remnants.
   ctx.globalCompositeOperation='destination-out';
   for(const x of [.10,.90]){ctx.beginPath();ctx.ellipse(x*w,(p.sheet==='skirts'?.443:.535)*h,.035*w,.033*h,0,0,Math.PI*2);ctx.fill();}
   const out=document.createElement('canvas');out.width=600;out.height=720;const o=out.getContext('2d');const waist=Math.round(h*p.split);
   o.drawImage(c,0,0,w,waist,139,317,322,193);o.drawImage(c,0,waist,w,h-waist,139,510,322,186);
   return out.toDataURL('image/png').split(',')[1];
  },{p,source});
  const version=createHash('sha256').update(Buffer.from(raster,'base64')).digest('hex').slice(0,12),label=`${p.number} · ${p.name}`;
  await writeFile(new URL(`suits/additional-${p.number}__550__${label}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-asset-version="${version}" data-preview-box="133 311 334 391"><title>${label}</title><image width="600" height="720" href="data:image/png;base64,${raster}"/></svg>\n`);
 }
}finally{await browser.close();}
