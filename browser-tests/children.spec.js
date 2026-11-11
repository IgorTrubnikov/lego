import {exportDraftPng} from './helpers/figure-export.js';
import {test,expect} from '@playwright/test';
const amount=async page=>Number((await page.locator('#total').innerText()).replace(/\D/g,''));
async function exportPixels(page){
 const pending=page.waitForEvent('download');await exportDraftPng(page);expect(await (await pending).failure()).toBeNull();
 return page.evaluate(async()=>{
  const img=new Image();img.src=document.querySelector('#test-figure-png').href;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
  let upper=2166136261;for(const value of ctx.getImageData(0,0,1200,1440).data)upper=Math.imul(upper^value,16777619)>>>0;
  const visible=(x,w)=>{if(img.height===1440)return 0;const pixels=ctx.getImageData(x,1440,w,600).data;let n=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>128)n++;return n;};
  return {size:[img.width,img.height],upper,left:visible(0,680),right:visible(700,500)};
 });
}
test('children options have separate infant and stroller prices, preserve every other addition and export together with transport',async({page})=>{
 test.setTimeout(60_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default),children=catalog.filter(p=>p.category==='children');
 expect(children).toHaveLength(3);
 for(const [category,id] of [['suit','suit-catalog-37'],['accessory','accessory-catalog-gamepad'],['animal','animal-cat-kitten-ginger'],['altar','altar-altar-1']]){
  await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();
 }
 const original=await exportPixels(page),base=await amount(page);expect(original.size).toEqual([1200,1440]);
 await page.locator('[data-category="children"]').click();
 for(const child of children){
  expect(child.price).toBe(child.id==='children-catalog-infant'?250:300);await page.locator(`[data-part="${child.id}"]`).click();
  await expect(page.locator('#figure [data-layer="children"]')).toHaveAttribute('href',child.image);expect(await amount(page)).toBe(base+child.price);
 }
 const solo=await exportPixels(page);expect(solo.size).toEqual([1200,2040]);expect(solo.upper).toBe(original.upper);
 await page.locator('[data-category="transport"]').click();await page.locator('[data-part="transport-catalog-01"]').click();expect(await amount(page)).toBe(base+450);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));await page.reload();
 for(const category of ['suit','accessory','animal','transport','children'])await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveCount(1);
 await expect(page.locator('#order-addon')).toBeVisible();
 const together=await exportPixels(page);expect(together.size).toEqual([1200,2040]);expect(together.upper).toBe(original.upper);expect(together.left).toBeGreaterThan(10000);expect(together.right).toBeGreaterThan(10000);
 await page.locator('[data-category="children"]').click();await page.locator('[data-part="children-none"]').click();expect(await amount(page)).toBe(base+150);
 await expect(page.locator('#figure [data-layer="transport"]')).toHaveAttribute('transform','translate(0 300)');
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('teuilor-selection-v1'));s.children='children-retired';localStorage.setItem('teuilor-selection-v1',JSON.stringify(s));});
 await page.reload();await expect(page.locator('#figure [data-layer="children"]')).toHaveCount(0);
 const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));for(const category of ['suit','accessory','animal','transport','altar'])expect(restored[category]).toBe(saved[category]);
 await page.locator('[data-category="transport"]').click();await page.locator('[data-part="transport-none"]').click();await expect(page.locator('#figure svg')).toHaveAttribute('viewBox','0 0 600 720');
 await page.locator('[data-category="children"]').click();await page.locator('[data-part="children-catalog-stroller-black"]').click();await page.locator('#reset').click();
 await expect(page.locator('#figure [data-layer="children"]')).toHaveCount(0);await expect(page.locator('#figure')).not.toHaveClass(/has-children/);expect(errors).toEqual([]);
});

test('all children artwork decodes with transparent margins and fits its own card',async({page})=>{
 await page.goto('/');const checks=await page.evaluate(async()=>Promise.all((await import('./catalog.js')).default.filter(p=>p.category==='children').map(async p=>{
  const img=new Image();img.src=p.image;await img.decode();const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(0,0,600,720).data,[left,top,w,h]=p.previewBox.split(' ').map(Number);let visible=0,outside=0;
  for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(pixels[(y*600+x)*4+3]){visible++;if(x<left||x>=left+w||y<top||y>=top+h||x<180||x>=420||y<425||y>=702)outside++;}
  return {id:p.id,size:[img.width,img.height],visible,outside};
 })));expect(checks).toHaveLength(3);for(const check of checks){expect(check.size).toEqual([600,720]);expect(check.visible,check.id).toBeGreaterThan(5000);expect(check.outside,check.id).toBe(0);}
});
