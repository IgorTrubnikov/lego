import {readFile} from 'node:fs/promises';
import {exportDraftPng} from './helpers/figure-export.js';
import {test,expect} from '@playwright/test';

test('all 74 heads load transparently, select, update price and survive reload',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('[data-category="face"]').click();
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const faces=catalog.filter(p=>p.category==='face');expect(faces).toHaveLength(74);
 expect(faces.every(p=>p.price===0&&/^face-(catalog|additional)-\d\d$/.test(p.id))).toBe(true);
 const artwork=await page.evaluate(async faces=>Promise.all(faces.map(async face=>{
  const img=new Image();img.src=face.image;await img.decode();
  const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const data=ctx.getImageData(0,0,600,720).data;let outside=0,visible=0;
  for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(data[(y*600+x)*4+3]){visible++;if(x<224||x>=376||y<173||y>=320)outside++;}
  return {id:face.id,w:img.width,h:img.height,outside,visible,forehead:ctx.getImageData(300,215,1,1).data[3]};
 })),faces);
 for(const a of artwork){expect([a.w,a.h],a.id).toEqual([600,720]);expect(a.outside,a.id).toBe(0);expect(a.visible,a.id).toBeGreaterThan(14000);expect(a.forehead,a.id).toBeGreaterThanOrEqual(245);}
 const before=await page.locator('#total').innerText();
 for(const face of faces){
  const card=page.locator(`[data-part="${face.id}"]`);await card.click();
  await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',face.image);
  await expect(page.locator('#total')).toHaveText(before);
 }
 await page.reload();await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',faces.at(-1).image);
 expect(errors).toEqual([]);
});

test('a removed test head resets to the new default without discarding other choices',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({face:'face-glasses',hair:'hair-renewed-07',torso:'torso-catalog-12',legs:'legs-catalog-21'})));
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-58__/);
 await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/renewed-07__/);
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-12__/);
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-21__/);
 await page.locator('[data-category="face"]').click();await expect(page.locator('[data-part="face-glasses"]')).toHaveCount(0);
});


test('all eight added heads persist and appear in PNG with their own face print',async({page})=>{
 test.setTimeout(90_000);await page.goto('/');
 const faces=await page.evaluate(async()=>(await import('./catalog.js')).default.filter(p=>p.id.startsWith('face-additional-')));
 expect(faces).toHaveLength(8);
 for(const face of faces){
  await page.locator('[data-category="face"]').click();await page.locator(`[data-part="${face.id}"]`).click();
  await expect(page.locator('#total')).toHaveText(/550/);await page.reload();
  await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',face.image);
  const pending=page.waitForEvent('download');await exportDraftPng(page);expect(await (await pending).failure()).toBeNull();
  const diff=await page.evaluate(async src=>{
   const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
   const images=await Promise.all([load(src),load(document.querySelector('#test-figure-png').href)]);
   const pixels=images.map(img=>{const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,600,720);return ctx.getImageData(275,260,50,35).data;});
   let sum=0,count=0;for(let i=0;i<pixels[0].length;i+=4)if(pixels[0][i+3]>245)for(let j=0;j<3;j++){sum+=Math.abs(pixels[0][i+j]-pixels[1][i+j]);count++;}return {count,mean:sum/count};
  },face.image);
  expect(diff.count).toBeGreaterThan(1000);expect(diff.mean).toBeLessThan(8);
 }
});


test('additional faces use the catalog skin and silhouette while retaining printed details',async({page})=>{
 await page.goto('/');
 const source=(await readFile(new URL('../scripts/additional-faces/source.png',import.meta.url))).toString('base64');
 const manifest=JSON.parse(await readFile(new URL('../scripts/additional-faces/manifest.json',import.meta.url),'utf8'));
 const results=await page.evaluate(async({source,manifest})=>{
  const catalog=(await import('./catalog.js')).default;
  const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
  const pixels=img=>{const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,600,720).data;};
  const ref=pixels(await load(catalog.find(p=>p.id==='face-catalog-58').image));
  const sheet=await load('data:image/png;base64,'+source),results=[];
  for(const item of manifest){
   const actual=pixels(await load(catalog.find(p=>p.id==='face-additional-'+item.number).image));
   let alphaDiff=0,skinDiff=0,printDiff=0,printed=0;
   for(let i=3;i<ref.length;i+=4)if(actual[i]!==ref[i])alphaDiff++;
   for(const [x,y] of [[300,210],[240,280],[360,280],[300,313]])for(let c=0;c<3;c++){const i=(y*600+x)*4+c;skinDiff=Math.max(skinDiff,Math.abs(actual[i]-ref[i]));}
   const raw=document.createElement('canvas');raw.width=600;raw.height=720;const ctx=raw.getContext('2d');
   const top=item.row?530:128,bottom=item.row?794:393;
   ctx.drawImage(sheet,item.center-164,top,328,bottom-top,224,195,152,112);
   const data=ctx.getImageData(0,0,600,720).data;
   for(let y=220;y<294;y++)for(let x=242;x<359;x++){
    const i=(y*600+x)*4,[r,g,b]=data.slice(i,i+3);
    if(data[i+3]>245&&(r<100||b>r+15||g>r+15||(r>g+60&&b>g+5))){printed++;for(let c=0;c<3;c++)printDiff=Math.max(printDiff,Math.abs(actual[i+c]-data[i+c]));}
   }
   results.push({number:item.number,alphaDiff,skinDiff,printed,printDiff});
  }return results;
 },{source,manifest});
 for(const result of results){expect(result.alphaDiff,String(result.number)).toBe(0);expect(result.skinDiff,String(result.number)).toBeLessThanOrEqual(2);expect(result.printed,String(result.number)).toBeGreaterThan(100);expect(result.printDiff,String(result.number)).toBeLessThanOrEqual(2);}
});
