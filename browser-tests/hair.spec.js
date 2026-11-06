import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('fitted long hairstyles leave cheeks open and frontal caps sit above the eyebrows',async({page})=>{
 await page.goto('/');
 const failures=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default,failures=[];
  for(const hair of catalog.filter(p=>p.category==='hair'&&(p.backImage||p.id.includes('cap-')))){
   const image=new Image();image.src=hair.image;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   // A curved visor may reach the temples; cheeks and the entire lower face stay clear.
   // Long locks must also leave the forehead sides open.
   const faceTop=hair.backImage?236:250;
   const area=ctx.getImageData(238,faceTop,124,301-faceTop).data;
   if(area.some((v,i)=>i%4===3&&v!==0))failures.push(hair.id+': face overlap');
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
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({hair:'hair-wave',face:'face-glasses',torso:'torso-3d-black-suit',legs:'legs-3d-blue',accessory:'accessory-none',animal:'animal-none',altar:'altar-none'})));
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/catalog-short-black-classic__/);
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/glasses__/);
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/3d-black-suit__/);
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/3d-blue__/);
});
