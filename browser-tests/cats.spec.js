import {exportDraftPng} from './helpers/figure-export.js';
import {test,expect} from '@playwright/test';
test('only five cats and five kittens remain, select at 200 rubles and persist in PNG export',async({page})=>{
 await page.goto('/');
 const cats=await page.evaluate(async()=>(await import('./catalog.js')).default.filter(p=>p.category==='animal'));
 expect(cats).toHaveLength(10);expect(cats.filter(p=>p.id.startsWith('animal-cat-kitten-'))).toHaveLength(5);expect(cats.filter(p=>p.id.startsWith('animal-cat-standing-'))).toHaveLength(5);expect(cats.every(p=>p.price===200)).toBe(true);
 await page.locator('[data-category="animal"]').click();await expect(page.locator('#catalog [data-part]')).toHaveCount(11);
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
