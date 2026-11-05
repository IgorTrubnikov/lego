import { test, expect } from '@playwright/test';

test('pants thumbnails cannot intercept category tabs',async({page})=>{
 await page.goto('/');
 await page.locator('[data-category="legs"]').click();
 const pants=await page.locator('[data-part]').evaluateAll(buttons=>buttons.map(b=>b.dataset.part));
 for(const id of pants){
  await page.locator(`[data-part="${id}"]`).click();
  await expect(page.locator(`[data-part="${id}"]`)).toHaveAttribute('aria-pressed','true');
  for(const category of ['hair','face','torso','legs']){
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
