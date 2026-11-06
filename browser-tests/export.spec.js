import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function downloadPng(page){
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();
 const download=await pending;expect(download.suggestedFilename()).toBe('teuilor-personazh.png');
 expect(await download.failure()).toBeNull();
 const bytes=await readFile(await download.path());
 expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([1200,1440]);
 return bytes;
}

test('downloads the full character with mixed SVG and WebP layers, independently of wedding additions',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 for(const [category,id] of [['face','face-catalog-07'],['torso','torso-catalog-12'],['legs','legs-catalog-03'],['accessory','accessory-catalog-gamepad'],['animal','animal-3d-ginger-kitten']]){
  await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();
 }
 const initial=await downloadPng(page);
 const pixels=await page.evaluate(async()=>{
  const img=new Image();img.src=document.querySelector('#png-link').href;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,1200,1440).data;
  const regions={hair:[195,90,210,130],face:[224,225,152,95],torso:[139,326,322,180],legs:[188,530,224,166],accessory:[15,405,150,290],animal:[430,435,170,265]};
  return {corners:[[0,0],[1199,0],[0,1439],[1199,1439]].map(([x,y])=>data[(y*1200+x)*4+3]),regions:Object.entries(regions).map(([name,[left,top,w,h]])=>{
   let visible=0;for(let y=top*2;y<(top+h)*2;y++)for(let x=left*2;x<(left+w)*2;x++)if(data[(y*1200+x)*4+3]>0)visible++;return {name,visible};
  })};
 });
 expect(pixels.corners).toEqual([0,0,0,0]);for(const r of pixels.regions)expect(r.visible,r.name).toBeGreaterThan(1000);
 await page.locator('[data-category="altar"]').click();await page.locator('[data-part="altar-altar-3"]').click();
 await expect(page.locator('#png-ready')).toBeHidden();
 const withAltar=await downloadPng(page);expect(withAltar.equals(initial)).toBe(true);
 await page.locator('[data-category="legs"]').click();await page.locator('[data-part="legs-catalog-23"]').click();
 const blue=await downloadPng(page);expect(blue.equals(initial)).toBe(false);
 await expect(page.locator('#png-link')).toHaveAttribute('target','_blank');
 await expect(page.locator('#order-telegram')).toHaveAttribute('href','https://t.me/teuilor');
 await expect(page.locator('#cart-open, #cart-dialog, #add-cart')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('an export error leaves the constructor usable and allows saving again',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{window.originalToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){callback(null);};});
 await page.locator('#save-png').click();
 await expect(page.locator('#toast')).toContainText('Не удалось сохранить изображение');
 await expect(page.locator('#save-png')).toBeEnabled();
 await expect(page.locator('#png-ready')).toBeHidden();
 await page.locator('[data-category="legs"]').click();await page.locator('[data-part="legs-catalog-23"]').click();
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-23__/);
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.originalToBlob;});
 await downloadPng(page);await expect(page.locator('#png-ready')).toBeVisible();
});
