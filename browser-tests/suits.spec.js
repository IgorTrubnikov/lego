import {test,expect} from '@playwright/test';

const amount=async page=>Number((await page.locator('#total').innerText()).replace(/\D/g,''));
async function download(page){const pending=page.waitForEvent('download');await page.locator('#save-png').click();const d=await pending;expect(await d.failure()).toBeNull();return page.evaluate(async()=>{const img=new Image();img.src=document.querySelector('#png-link').href;await img.decode();const c=document.createElement('canvas');c.width=1200;c.height=1440;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(950,650,210,290).data;let bag=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>128)bag++;return {width:img.width,height:img.height,bag};});}

test('49 suits replace body and legs once in price and restore separate clothing on demand',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default),suits=catalog.filter(p=>p.category==='suit');
 expect(suits).toHaveLength(49);expect(suits.every(p=>p.price===500)).toBe(true);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));
 const original=await amount(page),bodyPrice=catalog.filter(p=>[saved.torso,saved.legs].includes(p.id)).reduce((sum,p)=>sum+p.price,0);
 await page.locator('[data-category="suit"]').click();
 await expect(page.locator('[data-part="suit-none"]')).toHaveAttribute('aria-pressed','true');
 for(const suit of suits){
  const card=page.locator(`[data-part="${suit.id}"]`);await card.click();await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#figure [data-layer="suit"]')).toHaveAttribute('href',suit.image);
  await expect(page.locator('#figure [data-layer="torso"], #figure [data-layer="legs"]')).toHaveCount(0);
  expect(await amount(page)).toBe(original-bodyPrice+500);
 }
 await expect(page.locator('#breakdown')).toContainText('Костюм');await expect(page.locator('#breakdown')).not.toContainText('Одежда');await expect(page.locator('#breakdown')).not.toContainText('Брюки');
 const chosen=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));expect(chosen.torso).toBe(saved.torso);expect(chosen.legs).toBe(saved.legs);
 await page.reload();await expect(page.locator('#figure [data-layer="suit"]')).toHaveAttribute('href',suits.at(-1).image);
 await page.locator('[data-category="suit"]').click();await page.locator('[data-part="suit-none"]').click();
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveCount(1);await expect(page.locator('#figure [data-layer="legs"]')).toHaveCount(1);expect(await amount(page)).toBe(original);
 for(const category of ['torso','legs']){
  await page.locator('[data-category="suit"]').click();await page.locator('[data-part="suit-catalog-01"]').click();
  await page.locator(`[data-category="${category}"]`).click();await expect(page.locator('#catalog [aria-pressed="true"]')).toHaveCount(0);
  await page.locator(`[data-part="${saved[category]}"]`).click();await expect(page.locator('#figure [data-layer="suit"]')).toHaveCount(0);
  await expect(page.locator('#figure [data-layer="torso"]')).toHaveCount(1);await expect(page.locator('#figure [data-layer="legs"]')).toHaveCount(1);expect(await amount(page)).toBe(original);
 }
 expect(errors).toEqual([]);
});

test('army backpack is included in the suit, price and PNG while independent extras remain selectable',async({page})=>{
 test.setTimeout(60_000);await page.goto('/');const base=await amount(page);
 await page.locator('[data-category="suit"]').click();await page.locator('[data-part="suit-catalog-37"]').click();
 await expect(page.locator('#outfit-note')).toContainText('Рюкзак в комплекте');await expect(page.locator('[data-part="suit-catalog-37"] .part-includes')).toHaveText('Рюкзак в комплекте');
 expect(await amount(page)).toBe(base-400+500);
 await page.locator('[data-category="face"]').click();await page.locator('[data-part="face-catalog-07"]').click();
 await page.locator('[data-category="hair"]').click();await page.locator('[data-part="hair-catalog-long-golden"]').click();
 await expect(page.locator('#figure image').first()).toHaveAttribute('data-layer','hair-back');await expect(page.locator('#figure [data-layer="suit"]')).toHaveCount(1);
 await page.locator('[data-category="accessory"]').click();await page.locator('[data-part="accessory-catalog-gamepad"]').click();
 await page.locator('[data-category="animal"]').click();await page.locator('[data-part="animal-cat-kitten-ginger"]').click();
 await expect(page.locator('#figure [data-layer="accessory"], #figure [data-layer="animal"]')).toHaveCount(2);
 await page.reload();await expect(page.locator('#figure [data-layer="suit"]')).toHaveCount(1);
 const military=await download(page);expect([military.width,military.height]).toEqual([1200,1440]);expect(military.bag).toBeGreaterThan(5000);
 await page.locator('[data-category="suit"]').click();await page.locator('[data-part="suit-catalog-36"]').click();
 expect((await download(page)).bag).toBe(0);
 await page.locator('[data-category="suit"]').click();await page.locator('[data-part="suit-none"]').click();
 await expect(page.locator('#figure [data-layer="suit"]')).toHaveCount(0);expect((await download(page)).bag).toBe(0);
});

test('a missing saved suit falls back to separate parts and old saved figures stay usable',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({suit:'suit-removed',face:'face-catalog-07',hair:'hair-catalog-long-golden',torso:'torso-catalog-12',legs:'legs-catalog-21'})));
 await page.goto('/');await expect(page.locator('#figure [data-layer="suit"]')).toHaveCount(0);
 for(const [layer,id] of [['face','catalog-07'],['hair','catalog-long-golden'],['torso','catalog-12'],['legs','catalog-21']])await expect(page.locator(`#figure [data-layer="${layer}"]`)).toHaveAttribute('href',new RegExp(id+'__'));
 await page.locator('[data-category="suit"]').click();await expect(page.locator('[data-part="suit-none"]')).toHaveAttribute('aria-pressed','true');
});
