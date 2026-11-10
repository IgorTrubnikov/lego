import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('all 20 retained reference pants have a wider waist, complete feet and a transparent background',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('[data-category="legs"]').click();
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const pants=catalog.filter(p=>p.category==='legs');expect(pants).toHaveLength(20);
 expect(pants.every(p=>p.price===200&&/^legs-catalog-\d\d$/.test(p.id))).toBe(true);
 const artwork=await page.evaluate(async list=>Promise.all(list.map(async part=>{
  const img=new Image();img.src=part.image;await img.decode();
  const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const data=ctx.getImageData(0,0,600,720).data;let outside=0,visible=0,leftFoot=0,rightFoot=0;
  for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(data[(y*600+x)*4+3]){
   visible++;if(x<188||x>=412||y<447||y>=696)outside++;
   if(y>=660&&x<295)leftFoot++;if(y>=660&&x>305)rightFoot++;
  }
  let left=300,right=300;const alpha=x=>ctx.getImageData(x,522,1,1).data[3];
  while(alpha(left-1)>32)left--;while(alpha(right+1)>32)right++;
  return {id:part.id,w:img.width,h:img.height,outside,visible,leftFoot,rightFoot,waist:right-left+1,center:(left+right)/2};
 })),pants);
 for(const a of artwork){
  expect([a.w,a.h],a.id).toEqual([600,720]);expect(a.outside,a.id).toBe(0);expect(a.visible,a.id).toBeGreaterThan(30000);
  expect(a.leftFoot,a.id).toBeGreaterThan(1500);expect(a.rightFoot,a.id).toBeGreaterThan(1500);
  expect(a.waist,a.id).toBeGreaterThanOrEqual(214);expect(a.waist,a.id).toBeLessThanOrEqual(224);expect(Math.abs(a.center-300),a.id).toBeLessThanOrEqual(4);
 }
 const before=await page.locator('#total').innerText();
 for(const part of pants){
  const card=page.locator(`[data-part="${part.id}"]`);await card.click();await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',part.image);await expect(page.locator('#total')).toHaveText(before);
 }
 await page.reload();await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',pants.at(-1).image);
 for(const id of ['legs-catalog-21','legs-catalog-28']){
  await page.locator('[data-category="legs"]').click();await page.locator(`[data-part="${id}"]`).click();
  const pending=page.waitForEvent('download');await page.locator('#save-png').click();const download=await pending;
  expect(await download.failure()).toBeNull();const bytes=await readFile(await download.path());
  expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([1200,1440]);
 }
 expect(errors).toEqual([]);
});

test('removed trial pants reset to new white pants while preserving the rest of the character',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({legs:'legs-3d-blue',torso:'torso-catalog-12',face:'face-catalog-07',hair:'hair-catalog-long-golden'})));
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-04__/);
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-12__/);
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-07__/);
 await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/catalog-long-golden__/);
 await page.locator('[data-category="legs"]').click();await expect(page.locator('[data-part="legs-3d-blue"]')).toHaveCount(0);
});
