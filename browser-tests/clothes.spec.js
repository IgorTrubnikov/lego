import {test,expect} from '@playwright/test';

test('all 37 available outfits keep their hands, fit below the head and select without a separate charge',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('[data-category="torso"]').click();
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const clothes=catalog.filter(p=>p.category==='torso');expect(clothes).toHaveLength(37);
 expect(clothes.every(p=>p.price===0&&/^torso-catalog-\d\d$/.test(p.id))).toBe(true);
 const artwork=await page.evaluate(async list=>Promise.all(list.map(async part=>{
  const img=new Image();img.src=part.image;await img.decode();
  const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const data=ctx.getImageData(0,0,600,720).data;let outside=0,visible=0,leftHand=0,rightHand=0;
  for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(data[(y*600+x)*4+3]){
   visible++;if(x<139||x>=461||y<317||y>=532)outside++;
   if(y>=450&&x<220)leftHand++;if(y>=450&&x>=380)rightHand++;
  }
  return {id:part.id,w:img.width,h:img.height,outside,visible,leftHand,rightHand,collar:ctx.getImageData(300,319,1,1).data[3]};
 })),clothes);
 for(const a of artwork){
  expect([a.w,a.h],a.id).toEqual([600,720]);expect(a.outside,a.id).toBe(0);expect(a.visible,a.id).toBeGreaterThan(30000);
  expect(a.leftHand,a.id).toBeGreaterThan(500);expect(a.rightHand,a.id).toBeGreaterThan(500);expect(a.collar,a.id).toBeGreaterThanOrEqual(245);
 }
 const before=await page.locator('#total').innerText();
 for(const part of clothes){
  const card=page.locator(`[data-part="${part.id}"]`);await card.click();await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',part.image);await expect(page.locator('#total')).toHaveText(before);
 }
 await page.reload();await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',clothes.at(-1).image);
 expect(errors).toEqual([]);
});

test('a retired trial outfit resets to the new blazer and preserves all other choices',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({torso:'torso-3d-black-suit',face:'face-catalog-07',hair:'hair-renewed-07',legs:'legs-catalog-21'})));
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-06__/);
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-07__/);
 await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/renewed-07__/);
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-21__/);
 await page.locator('[data-category="torso"]').click();await expect(page.locator('[data-part="torso-3d-black-suit"]')).toHaveCount(0);
});
