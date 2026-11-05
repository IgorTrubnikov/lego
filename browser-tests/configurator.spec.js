import { test, expect } from '@playwright/test';

test('pants thumbnails cannot intercept category tabs',async({page})=>{
 await page.goto('/');
 await page.locator('[data-category="legs"]').click();
 const pants=await page.locator('[data-part]').evaluateAll(buttons=>buttons.map(b=>b.dataset.part));
 const allCategories=await page.locator('[role="tab"]').evaluateAll(tabs=>tabs.map(t=>t.dataset.category));
 for(const id of pants){
  await page.locator(`[data-part="${id}"]`).click();
  await expect(page.locator(`[data-part="${id}"]`)).toHaveAttribute('aria-pressed','true');
  for(const category of [...allCategories.filter(c=>c!=='legs'),'legs']){
   const tab=page.locator(`[data-category="${category}"]`);
   await tab.scrollIntoViewIfNeeded();
   const receivesPointer=await tab.evaluate(button=>{
    const r=button.getBoundingClientRect();
    return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[role="tab"]')===button;
   });
   expect(receivesPointer,`${id}: ${category} receives pointer`).toBe(true);
   await tab.click();
   await expect(tab).toHaveAttribute('aria-selected','true');
  }
 }
});

test('selection preserves tab elements, keyboard navigation and price updates',async({page})=>{
 await page.goto('/');
 await page.locator('[data-category="legs"]').click();
 await page.locator('#tabs').evaluate(t=>window.originalTabs=[...t.children]);
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const expectSelectedPrice=async()=>{
  const selected=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));
  const expected=catalog.filter(p=>Object.values(selected).includes(p.id)).reduce((sum,p)=>sum+p.price,0);
  expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(expected);
 };
 const pants=catalog.filter(p=>p.category==='legs').at(-1);
 await page.locator(`[data-part="${pants.id}"]`).click();
 await expectSelectedPrice();
 expect(await page.locator('#tabs').evaluate(t=>[...t.children].every((b,i)=>b===window.originalTabs[i]))).toBe(true);
 await page.locator('[data-category="legs"]').focus();await page.keyboard.press('ArrowLeft');
 await expect(page.locator('[data-category="torso"]')).toBeFocused();
 await expect(page.locator('[data-category="torso"]')).toHaveAttribute('aria-selected','true');
 const torso=catalog.filter(p=>p.category==='torso').at(-1);
 await page.locator(`[data-part="${torso.id}"]`).click();
 await expectSelectedPrice();
});

test('all hairstyles cover the head stud while keeping facial features visible',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async()=>{
  const {default:parts}=await import('./catalog.js');
  const features=[[274,232],[326,232],[274,250],[326,250],[300,277],[274,293],[326,293]];
  return Promise.all(parts.filter(p=>p.category==='hair').map(async part=>{
   const image=new Image();image.src=part.image;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,600,720);
   return {name:part.name,features:features.map(([x,y])=>ctx.getImageData(x,y,1,1).data[3]),stud:ctx.getImageData(300,182,1,1).data[3]};
  }));
 });
 expect(results.length).toBeGreaterThan(0);
 for(const result of results){
  expect(result.features,`${result.name}: eyebrows, eyes and mouth unobstructed`).toEqual([0,0,0,0,0,0,0]);
  expect(result.stud,`${result.name}: covers the head stud`).toBe(255);
 }
});

test('extras appear beside the figure, add to price, persist and reset to none',async({page})=>{
 await page.goto('/');
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const base=Number((await page.locator('#total').innerText()).replace(/\D/g,''));
 const chosen={};
 let sum=base;
 for(const category of ['accessory','animal']){
  await page.locator(`[data-category="${category}"]`).click();
  await expect(page.locator(`[data-part="${category}-none"]`)).toHaveAttribute('aria-pressed','true');
  for(const part of catalog.filter(p=>p.category===category)){
   await page.locator(`[data-part="${part.id}"]`).click();
   await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveAttribute('href',part.image);
  }
  chosen[category]=catalog.filter(p=>p.category===category).at(-1);
  sum+=chosen[category]?.price||0;
 }
 expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(sum);
 await page.reload();
 for(const category of ['accessory','animal'])if(chosen[category])await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveCount(1);
 await page.locator('#add-cart').click();await page.locator('#cart-open').click();
 await expect(page.locator('.cart-item')).toHaveCount(1);
 for(const category of ['accessory','animal'])if(chosen[category])await expect(page.locator(`.cart-art [data-layer="${category}"]`)).toHaveCount(1);
 await page.locator('#cart-dialog .close').click();
 for(const category of ['accessory','animal']){
  await page.locator(`[data-category="${category}"]`).click();
  await page.locator(`[data-part="${category}-none"]`).click();
  await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveCount(0);
 }
 expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(base);
 // Keyboard navigation wraps across all six categories.
 await page.locator('[data-category="animal"]').focus();await page.keyboard.press('ArrowRight');
 await expect(page.locator('[data-category="hair"]')).toBeFocused();
 await page.keyboard.press('End');await expect(page.locator('[data-category="animal"]')).toBeFocused();
 await page.locator('#random').click();await page.locator('#reset').click();
 for(const category of ['accessory','animal'])await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
