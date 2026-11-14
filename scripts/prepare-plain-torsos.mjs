// Rebuild nine plain torsos, remove the retired selection and restore reviewed order.
import {chromium} from '@playwright/test';
import {readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),base=new URL('plain-torsos/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base))),config=JSON.parse(await readFile(new URL('order.json',base)));
const order=config.groups.flatMap(g=>g.numbers),source=(await readFile(new URL('source.png',base))).toString('base64');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
try{
 const page=await browser.newPage();
 for(const p of manifest){
  const raster=await page.evaluate(async({p,source})=>{
   const img=new Image();img.src='data:image/png;base64,'+source;await img.decode();
   const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');
   ctx.translate(139,317);ctx.scale(322,215);
   ctx.clip(new Path2D('M.30 0 L.70 0 Q.71 0 .72 .04 Q.83 .01 .89 .23 L.96 .55 L.96 .68 Q1 .74 1 .84 L.99 .94 Q.98 1 .94 1 L.93 .89 Q.89 .83 .85 .89 L.84 1 Q.78 1 .78 .94 L.78 .92 L.22 .92 Q.22 1 .16 1 L.15 .89 Q.11 .83 .07 .89 L.06 1 Q.01 1 .01 .94 L0 .84 Q0 .74 .04 .68 L.04 .55 L.11 .23 Q.17 .01 .28 .04 Q.29 0 .30 0 Z'));
   ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(img,30+p.col*407,[129,489,853][p.row],382,240,139,317,322,215);
   return c.toDataURL('image/png').split(',')[1];
  },{p,source});
  const label=`${p.number} · ${p.name}`,version=createHash('sha256').update(Buffer.from(raster,'base64')).digest('hex').slice(0,12);
  await writeFile(new URL(`clothes/plain-${p.number}__0__${label}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-preview-box="133 311 334 227" data-catalog-order="${(order.indexOf(p.number)+1)*10}" data-asset-version="${version}"><title>${label}</title><image width="600" height="720" href="data:image/png;base64,${raster}"/></svg>\n`);
 }
 for(const name of await readdir(new URL('clothes/',root))){
  const number=Number(name.match(/^(?:catalog|plain)-(\d+)__/)?.[1]);if(!number)continue;
  const url=new URL('clothes/'+name,root);
  if(config.retired.includes(number)){await unlink(url);continue;}
  if(!order.includes(number))throw Error('Missing torso order: '+name);
  const svg=(await readFile(url,'utf8')).replace(/ data-catalog-order="\d+"/,'').replace('<svg ',`<svg data-catalog-order="${(order.indexOf(number)+1)*10}" `);
  await writeFile(url,svg);
 }
}finally{await browser.close();}
