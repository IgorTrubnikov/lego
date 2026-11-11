import {exportDraftPng} from './helpers/figure-export.js';
import {test,expect} from '@playwright/test';
test('five cats and seven kittens select at 200 rubles and persist in PNG export',async({page})=>{
 await page.goto('/');
 const cats=await page.evaluate(async()=>(await import('./catalog.js')).default.filter(p=>p.category==='animal'&&p.id.startsWith('animal-cat-')));
 expect(cats).toHaveLength(12);expect(cats.filter(p=>p.id.startsWith('animal-cat-kitten-'))).toHaveLength(7);expect(cats.filter(p=>p.id.startsWith('animal-cat-standing-'))).toHaveLength(5);expect(cats.every(p=>p.price===200)).toBe(true);
 await page.locator('[data-category="animal"]').click();await expect(page.locator('#catalog [data-part]')).toHaveCount(40);
 for(const cat of cats){await page.locator(`[data-part="${cat.id}"]`).click();await expect(page.locator('#figure [data-layer="animal"]')).toHaveAttribute('href',cat.image);expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(750);}
 await page.reload();await expect(page.locator('#figure [data-layer="animal"]')).toHaveAttribute('href',cats.at(-1).image);
 const pending=page.waitForEvent('download');await exportDraftPng(page);expect(await(await pending).failure()).toBeNull();
 const size=await page.evaluate(async()=>{const i=new Image();i.src=document.querySelector('#test-figure-png').href;await i.decode();return [i.width,i.height];});expect(size).toEqual([1200,1440]);
});
test('every removed animal resets without losing the rest of the character',async({page})=>{
 await page.goto('/');
 for(const slug of ['3d-bulldog','3d-dalmatian','3d-labrador','3d-shepherd','corgi','dalmatian','parrot']){
  await page.evaluate(slug=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({hair:'hair-renewed-14',face:'face-catalog-58',torso:'torso-catalog-06',legs:'legs-catalog-04',animal:'animal-'+slug})),slug);
  await page.reload();await expect(page.locator('#figure [data-layer="animal"]')).toHaveCount(0);await expect(page.locator('#figure')).not.toHaveClass(/has-large-animal/);
  await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/renewed-14__/);await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-06__/);
  await page.locator('[data-category="animal"]').click();await expect(page.locator('[data-part="animal-none"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator(`[data-part="animal-${slug}"]`)).toHaveCount(0);
 }
});

test('all 39 animals are grouped in order and big dogs have room beside the complete character',async({page})=>{
 await page.goto('/');await page.locator('[data-category="animal"]').click();
 await expect(page.locator('[data-animal-group]')).toHaveText(['Кошки','Котята','Щенки','Собаки','Другие животные']);
 const animals=await page.evaluate(async()=>(await import('./catalog.js')).default.filter(p=>p.category==='animal'));
 expect(animals).toHaveLength(39);expect(animals.map(p=>p.catalogOrder)).toEqual([...animals.map(p=>p.catalogOrder)].sort((a,b)=>a-b));
 expect([1,2,3,4,5].map(group=>animals.filter(p=>Math.floor(p.catalogOrder/100)===group).length)).toEqual([5,7,9,11,7]);
 expect(animals.every(p=>p.price===200)).toBe(true);
 for(const id of ['animal-photo-dog-01','animal-photo-dog-11']){
  await page.locator(`[data-part="${id}"]`).click();await expect(page.locator('#figure svg')).toHaveAttribute('viewBox','0 0 760 720');
  const pending=page.waitForEvent('download');await exportDraftPng(page);expect(await(await pending).failure()).toBeNull();
  const result=await page.evaluate(async()=>{const img=new Image();img.src=document.querySelector('#test-figure-png').href;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(900,400,600,1000).data;let visible=0;for(let i=3;i<p.length;i+=4)if(p[i]>128)visible++;return {size:[img.width,img.height],visible};});
  expect(result.size).toEqual([1520,1440]);expect(result.visible).toBeGreaterThan(30_000);
 }
 for(const [category,id] of [['accessory','accessory-catalog-first-aid'],['children','children-catalog-stroller-black'],['transport','transport-catalog-01']]){await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();}
 await expect(page.locator('#figure svg')).toHaveAttribute('viewBox','0 0 760 1020');
 for(const layer of ['animal','accessory','children','transport'])await expect(page.locator(`#figure [data-layer="${layer}"]`)).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
