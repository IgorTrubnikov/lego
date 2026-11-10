import {test,expect} from '@playwright/test';
const amount=async page=>Number((await page.locator('#total').innerText()).replace(/\D/g,''));
async function pixels(page){
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();
 return page.evaluate(async()=>{
  const img=new Image();img.src=document.querySelector('#png-link').href;await img.decode();
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const upper=ctx.getImageData(0,0,1200,1440).data;let hash=2166136261;
  for(const value of upper)hash=Math.imul(hash^value,16777619)>>>0;
  let lower=0;if(img.height>1440){const data=ctx.getImageData(0,1440,1200,img.height-1440).data;for(let i=3;i<data.length;i+=4)if(data[i]>128)lower++;}
  return {size:[img.width,img.height],upper:hash,lower};
 });
}
test('15 motorcycles remain independent of suits, accessories and pets and export below the complete character',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 for(const [category,id] of [['suit','suit-catalog-37'],['hair','hair-catalog-long-golden'],['accessory','accessory-catalog-married-sign'],['animal','animal-cat-kitten-ginger']]){
  await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();
 }
 const before=await pixels(page),base=await amount(page);expect(before.size).toEqual([1200,1440]);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));
 const bikes=await page.evaluate(async()=>(await import('./catalog.js')).default.filter(p=>p.category==='transport'));
 expect(bikes).toHaveLength(15);await page.locator('[data-category="transport"]').click();
 for(const bike of bikes){
  expect(bike.price).toBe(500);await page.locator(`[data-part="${bike.id}"]`).click();
  await expect(page.locator('#figure [data-layer="transport"]')).toHaveAttribute('href',bike.image);
  expect(await amount(page)).toBe(base+500);
 }
 await expect(page.locator('#figure svg')).toHaveAttribute('viewBox','0 0 600 1020');
 const chosen=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));
 for(const category of ['suit','hair','accessory','animal'])expect(chosen[category]).toBe(saved[category]);
 await page.reload();await expect(page.locator('#figure [data-layer="transport"]')).toHaveAttribute('href',bikes.at(-1).image);
 const after=await pixels(page);expect(after.size).toEqual([1200,2040]);expect(after.upper).toBe(before.upper);expect(after.lower).toBeGreaterThan(30000);
 await page.locator('[data-category="transport"]').click();await page.locator('[data-part="transport-none"]').click();
 await expect(page.locator('#figure svg')).toHaveAttribute('viewBox','0 0 600 720');expect(await amount(page)).toBe(base);
 await page.locator('[data-part="transport-catalog-01"]').click();await page.locator('#reset').click();
 await expect(page.locator('#figure [data-layer="transport"]')).toHaveCount(0);await expect(page.locator('#figure')).not.toHaveClass(/has-transport/);
 expect(errors).toEqual([]);
});

test('motorcycle sprites have transparent margins and fit completely in their lower scene plane',async({page})=>{
 await page.goto('/');
 const checks=await page.evaluate(async()=>Promise.all((await import('./catalog.js')).default.filter(p=>p.category==='transport').map(async part=>{
  const img=new Image();img.src=part.image;await img.decode();const c=document.createElement('canvas');c.width=600;c.height=720;
  const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,600,720).data;
  const [left,top,w,h]=part.previewBox.split(' ').map(Number);let visible=0,outside=0;
  for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(pixels[(y*600+x)*4+3]){visible++;if(x<left||x>=left+w||y<top||y>=top+h||y<440||y>=702)outside++;}
  return {id:part.id,size:[img.width,img.height],visible,outside};
 })));
 expect(checks).toHaveLength(15);for(const check of checks){expect(check.size).toEqual([600,720]);expect(check.visible,check.id).toBeGreaterThan(20000);expect(check.outside,check.id).toBe(0);}
});
