import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('fitted long hairstyles leave cheeks open and frontal caps sit above the eyebrows',async({page})=>{
 await page.goto('/');
 const failures=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default,failures=[];
  const croppedTail=p=>/^hair-catalog-(braid-black|pony-(brown|blond|burgundy|black))$/.test(p.id);
  for(const hair of catalog.filter(p=>p.category==='hair'&&(p.backImage||p.id.includes('cap-')||croppedTail(p)))){
   const image=new Image();image.src=hair.image;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   // A curved visor may reach the temples; cheeks and the entire lower face stay clear.
   // Long locks must also leave the forehead sides open.
   const faceTop=hair.backImage?236:250;
   const area=ctx.getImageData(248,faceTop,104,301-faceTop).data;
   if(area.some((v,i)=>i%4===3&&v!==0))failures.push(hair.id+': face overlap');
   if(croppedTail(hair)){
    if(hair.backImage)failures.push(hair.id+': rear tail still enabled');
    const belowHead=ctx.getImageData(0,320,600,400).data;
    if(belowHead.some((v,i)=>i%4===3&&v!==0))failures.push(hair.id+': tail over body');
    const behindFace=ctx.getImageData(250,250,100,70).data;
    if(behindFace.some((v,i)=>i%4===3&&v!==0))failures.push(hair.id+': rear fragment through face');
   }
   if(hair.id==='hair-catalog-long-black-ringlets'){
    // Locks must exist in the front layer over the shoulders, not only behind the body.
    for(const x of [250,350])if(ctx.getImageData(x,335,1,1).data[3]<200)failures.push(hair.id+': missing front lock');
   }
   if(hair.id.includes('cap-')){
    const bottom=x=>{let y=0;for(let r=90;r<280;r++)if(ctx.getImageData(x,r,1,1).data[3]>200)y=r;return y;};
    for(const offset of [20,40,60])if(Math.abs(bottom(300-offset)-bottom(300+offset))>7)failures.push(hair.id+': tilted visor');
    if(bottom(300)<195||bottom(300)>225)failures.push(hair.id+': visor height');
    if(ctx.getImageData(300,182,1,1).data[3]<245)failures.push(hair.id+': uncovered stud');
   }
  }
  return failures;
 });
 expect(failures).toEqual([]);
});

test('all hairstyles select independently, keep the correct price and export layered long hair and caps',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const hairs=catalog.filter(p=>p.category==='hair');expect(hairs.length).toBeGreaterThan(0);
 const start=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));
 const base=catalog.filter(p=>p.category!=='hair'&&Object.values(start).includes(p.id)).reduce((sum,p)=>sum+p.price,0);
 for(const hair of hairs){
  const card=page.locator(`[data-part="${hair.id}"]`);await card.click();
  await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',hair.image);
  await expect(page.locator('#figure [data-layer="hair-back"]')).toHaveCount(hair.backImage?1:0);
  if(hair.backImage){
   await expect(page.locator('#figure image').first()).toHaveAttribute('data-layer','hair-back');
   await expect(card.locator('[data-layer="hair-back"]')).toHaveCount(1);
  }
  expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(base+hair.price);
 }
 for(const id of ['hair-catalog-long-black-ringlets','hair-catalog-cap-white']){
  await page.locator(`[data-part="${id}"]`).click();
  const pending=page.waitForEvent('download');await page.locator('#save-png').click();
  const download=await pending;expect(await download.failure()).toBeNull();
  const bytes=await readFile(await download.path());expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  const center=await page.evaluate(async()=>{
   const i=new Image();i.src=document.querySelector('#png-link').href;await i.decode();
   const c=document.createElement('canvas');c.width=1200;c.height=1440;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);
   return [...ctx.getImageData(600,530,1,1).data];
  });
  // Existing face artwork can retain fractional alpha after compositing.
  expect(center[0]).toBeGreaterThan(150);expect(center[1]).toBeGreaterThan(100);expect(center[3]).toBeGreaterThanOrEqual(245);
  await page.reload();
  await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',catalog.find(p=>p.id===id).image);
  await page.locator('[data-category="hair"]').click();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('a retired test hairstyle resets to a new style while preserving other saved details',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({hair:'hair-wave',face:'face-catalog-07',torso:'torso-catalog-12',legs:'legs-catalog-21',accessory:'accessory-none',animal:'animal-none',altar:'altar-none'})));
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/catalog-short-black-classic__/);
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-07__/);
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-12__/);
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-21__/);
});

test('caramel curls preserve their natural proportions and have no straight cut at the cheeks',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default,hair=catalog.find(p=>p.id==='hair-catalog-long-caramel-center-curls');
  const img=new Image();img.src=hair.image;await img.decode();const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const data=ctx.getImageData(0,0,600,720).data,[px,py,pw,ph]=hair.previewBox.split(' ').map(Number);let left=600,right=0,top=720,bottom=0,outside=0;
  for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(data[(y*600+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(x<px||x>=px+pw||y<py||y>=py+ph)outside++;}
  const edges=[];for(let y=306;y<=332;y++){let innerLeft=0,innerRight=600;for(let x=185;x<290;x++)if(data[(y*600+x)*4+3]>200)innerLeft=x;for(let x=310;x<415;x++)if(data[(y*600+x)*4+3]>200){innerRight=x;break;}edges.push([innerLeft,innerRight]);}
  const jump=Math.max(...edges.slice(1).flatMap((e,i)=>e.map((x,j)=>Math.abs(x-edges[i][j]))));
  return {ratio:(right-left+1)/(bottom-top+1),bottom,outside,jump};
 });
 expect(result.ratio).toBeGreaterThan(.72);expect(result.ratio).toBeLessThan(.75);
 expect(result.bottom).toBeGreaterThan(465);expect(result.outside).toBe(0);expect(result.jump).toBeLessThanOrEqual(3);
});
