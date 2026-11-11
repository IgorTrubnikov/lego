import {exportDraftPng} from './helpers/figure-export.js';
import {test,expect} from '@playwright/test';
const amount=async page=>Number((await page.locator('#total').innerText()).replace(/\D/g,''));
async function exportedBlue(page){
 const pending=page.waitForEvent('download');await exportDraftPng(page);expect(await (await pending).failure()).toBeNull();
 return page.evaluate(async()=>{const img=new Image();img.src=document.querySelector('#test-figure-png').href;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(400,1220,400,160).data;let blue=0;for(let i=0;i<data.length;i+=4)if(data[i+2]>120&&data[i]<90&&data[i+3]>128)blue++;return blue;});
}
test('skirts preserve pants or replace them, switch correctly with suits and match the saved PNG',async({page})=>{
 test.setTimeout(60_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.locator('[data-category="legs"]').click();await page.locator('[data-part="legs-catalog-21"]').click();const base=await amount(page);
 await page.locator('[data-category="skirt"]').click();
 for(const color of ['pink','white','black']){
  await page.locator(`[data-part="skirt-catalog-short-${color}"]`).click();expect(await amount(page)).toBe(base+100);
  await expect(page.locator('#figure [data-layer="legs"]')).toHaveCount(1);await expect(page.locator('#figure [data-layer="skirt"]')).toHaveCount(1);
 }
 expect(await exportedBlue(page)).toBeGreaterThan(5000);
 await page.locator('[data-category="legs"]').click();await page.locator('[data-part="legs-catalog-16"]').click();await expect(page.locator('#figure [data-layer="skirt"]')).toHaveCount(1);
 await page.locator('[data-part="legs-catalog-21"]').click();await page.locator('[data-category="skirt"]').click();await page.locator('[data-part="skirt-catalog-long-white"]').click();
 expect(await amount(page)).toBe(base+100);await expect(page.locator('#figure [data-layer="legs"]')).toHaveCount(0);await expect(page.locator('#breakdown')).not.toContainText('Брюки');
 await page.reload();await expect(page.locator('#figure [data-layer="legs"]')).toHaveCount(0);expect(await exportedBlue(page)).toBe(0);
 await page.locator('[data-category="legs"]').click();await expect(page.locator('#catalog [aria-pressed="true"]')).toHaveCount(0);await page.locator('[data-part="legs-catalog-21"]').click();
 await expect(page.locator('#figure [data-layer="skirt"]')).toHaveCount(0);expect(await amount(page)).toBe(base);
 await page.locator('[data-category="skirt"]').click();await page.locator('[data-part="skirt-catalog-short-pink"]').click();
 await page.locator('[data-category="suit"]').click();await page.locator('[data-part="suit-catalog-09"]').click();await expect(page.locator('#figure [data-layer="skirt"],#figure [data-layer="legs"]')).toHaveCount(0);
 await page.locator('[data-category="skirt"]').click();await page.locator('[data-part="skirt-catalog-long-white"]').click();await expect(page.locator('#figure [data-layer="suit"]')).toHaveCount(0);await expect(page.locator('#figure [data-layer="torso"]')).toHaveCount(1);expect(await amount(page)).toBe(base+100);
 await page.locator('[data-part="skirt-none"]').click();await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-21__/);expect(await amount(page)).toBe(base);
 await page.locator('[data-category="accessory"]').click();await page.locator('[data-part="accessory-catalog-first-aid"]').click();expect(await amount(page)).toBe(base+100);
 await page.locator('#reset').click();await expect(page.locator('#figure [data-layer="skirt"]')).toHaveCount(0);expect(errors).toEqual([]);
});

test('school uniform and mermaid collars are centered below the face',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const {default:catalog}=await import('./catalog.js');
  const draw=async id=>{const part=catalog.find(p=>p.id===id),img=new Image();img.src=part.image;await img.decode();const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {part,ctx};};
  const neckCenters=[];for(const id of ['suit-catalog-07','suit-catalog-09']){const {ctx}=await draw(id),neck=ctx.getImageData(0,320,600,1).data;let min=600,max=0;for(let x=0;x<600;x++)if(neck[x*4+3]>128){min=Math.min(min,x);max=x;}neckCenters.push((min+max)/2);}
  return {neckCenters};
 });
 for(const center of result.neckCenters)expect(Math.abs(center-300)).toBeLessThan(3);
});
