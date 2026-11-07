import {test,expect} from '@playwright/test';
async function download(page){const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();return page.locator('#png-link').getAttribute('href');}
test('dogs are visibly larger in the assembled character and PNG, with room for all other extras',async({page})=>{
 test.setTimeout(60_000);await page.goto('/');
 await page.locator('[data-category="suit"]').click();await page.locator('[data-part="suit-catalog-07"]').click();
 const before=await download(page);
 // Keep a copy because the next download revokes the previous object URL.
 const original=await page.evaluate(async url=>{const blob=await(await fetch(url)).blob();return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});},before);
 await page.locator('[data-category="animal"]').click();
 for(const id of ['animal-3d-shepherd','animal-3d-labrador']){
  await page.locator(`[data-part="${id}"]`).click();await expect(page.locator('#figure svg')).toHaveAttribute('viewBox','0 0 760 720');
  await expect(page.locator('#figure')).toHaveClass(/has-large-animal/);
  const url=await download(page),check=await page.evaluate(async({original,url})=>{
   const load=async src=>{const img=new Image();img.src=src;await img.decode();return img;};const old=await load(original),img=await load(url);
   const c=document.createElement('canvas');c.width=1520;c.height=1440;const ctx=c.getContext('2d');ctx.drawImage(old,0,0);const baseline=ctx.getImageData(0,0,1520,1440).data;ctx.clearRect(0,0,1520,1440);ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,1520,1440).data;
   let left=1520,right=0,top=1440,bottom=0;
   for(let y=0;y<1440;y++)for(let x=0;x<1520;x++){const i=(y*1520+x)*4;if(data[i+3]>128&&[0,1,2,3].some(k=>Math.abs(data[i+k]-baseline[i+k])>10)){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
   return {size:[img.width,img.height],left,right,top,bottom,width:right-left+1,height:bottom-top+1};
  },{original,url});
  expect(check.size).toEqual([1520,1440]);expect(check.width).toBeGreaterThan(550);expect(check.height).toBeGreaterThan(id.includes('shepherd')?560:450);expect(check.left).toBeGreaterThanOrEqual(895);expect(check.right).toBeLessThan(1470);expect(check.bottom).toBeLessThan(1400);
 }
 for(const [category,id] of [['accessory','accessory-catalog-first-aid'],['children','children-catalog-stroller-black'],['transport','transport-catalog-01']]){await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();}
 await page.reload();await expect(page.locator('#figure svg')).toHaveAttribute('viewBox','0 0 760 1020');
 const url=await download(page);expect(await page.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();return [img.width,img.height];},url)).toEqual([1520,2040]);
 await page.locator('[data-category="animal"]').click();await page.locator('[data-part="animal-none"]').click();await expect(page.locator('#figure svg')).toHaveAttribute('viewBox','0 0 600 1020');
 await expect(page.locator('#figure')).not.toHaveClass(/has-large-animal/);
});
