import {test,expect} from '@playwright/test';

test('all 66 reference heads load transparently, select, update price and survive reload',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('[data-category="face"]').click();
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const faces=catalog.filter(p=>p.category==='face');expect(faces).toHaveLength(66);
 expect(faces.every(p=>p.price===200&&/^face-catalog-\d\d$/.test(p.id))).toBe(true);
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
