import { test, expect } from '@playwright/test';

test('pants thumbnails cannot intercept category tabs',async({page})=>{
 test.setTimeout(60_000);
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
  }
 }
 // Check every thumbnail against every tab, then exercise actual tab navigation once.
 for(const category of [...allCategories.filter(c=>c!=='legs'),'legs']){
  const tab=page.locator(`[data-category="${category}"]`);await tab.click();
  await expect(tab).toHaveAttribute('aria-selected','true');
 }
});

test('selection preserves tab elements, keyboard navigation and price updates',async({page})=>{
 await page.goto('/');
 await page.locator('[data-category="legs"]').click();
 await page.locator('#tabs').evaluate(t=>window.originalTabs=[...t.children]);
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const expectSelectedPrice=async()=>{
  const selected=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));
  const expected=550+catalog.filter(p=>['accessory','animal','transport','children','altar','skirt'].includes(p.category)&&Object.values(selected).includes(p.id)).reduce((sum,p)=>sum+p.price,0);
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
  // Generated cutouts may encode a near-opaque matte (254 rather than 255).
  expect(result.stud,`${result.name}: covers the head stud`).toBeGreaterThanOrEqual(245);
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
 for(const category of ['accessory','animal']){
  await page.locator(`[data-category="${category}"]`).click();
  await page.locator(`[data-part="${category}-none"]`).click();
  await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveCount(0);
 }
 expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(base);
 // Keyboard navigation wraps across every category.
 await page.locator('[data-category="altar"]').focus();await page.keyboard.press('ArrowRight');
 await expect(page.locator('[data-category="hair"]')).toBeFocused();
 await page.keyboard.press('End');await expect(page.locator('[data-category="altar"]')).toBeFocused();
 await page.locator('#random').click();await page.locator('#reset').click();
 for(const category of ['accessory','animal'])await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('retained cats load with transparent backgrounds inside their assembly slot',async({page})=>{
 await page.goto('/');
 const checks=await page.evaluate(async()=>{
  const {default:catalog}=await import('./catalog.js');
  const slots={torso:[139,285,322,257],legs:[212,451,176,232],animal:[409,435,191,267]};
  return Promise.all(catalog.filter(p=>p.category==='animal').map(async part=>{
   const image=new Image();image.src=part.image;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const data=ctx.getImageData(0,0,600,720).data;
   const [left,top,width,height]=slots[part.category];
   let visible=0,outside=0;
   for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(data[(y*600+x)*4+3]>0){
    visible++;
    if(x<left||x>=left+width||y<top||y>=top+height)outside++;
   }
   return {id:part.id,width:image.width,height:image.height,visible,outside};
  }));
 });
 expect(checks).toHaveLength(10);
 for(const check of checks){
  expect([check.width,check.height],check.id).toEqual([600,720]);
  expect(check.visible,check.id).toBeGreaterThan(500);
  expect(check.outside,check.id+' does not cover other assembly slots').toBe(0);
 }
});

test('new clothing and pants combine with pets and persist after reload',async({page})=>{
 await page.goto('/');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const picks=[['torso','torso-catalog-18'],['legs','legs-catalog-21'],['animal','animal-cat-kitten-ginger']];
 for(const [category,id] of picks){
  await page.locator(`[data-category="${category}"]`).click();
  await page.locator(`[data-part="${id}"]`).click();
  await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveAttribute('href',new RegExp(id.replace(category+'-','')+'__'));
 }
 await page.locator('[data-category="face"]').click();await page.locator('[data-part="face-catalog-07"]').click();
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-07__/);
 await page.reload();
 for(const [category,id] of picks)await expect(page.locator(`#figure [data-layer="${category}"]`)).toHaveAttribute('href',new RegExp(id.replace(category+'-','')+'__'));
 await expect(page.locator('#figure image[href$=".webp"]')).toHaveCount(0);
 await page.locator('[data-category="torso"]').click();
 const scrollArea=page.locator('#catalog');
 expect(await scrollArea.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
 await page.locator('[data-part="torso-catalog-06"]').click();
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-06__/);
 await page.locator('[data-category="animal"]').click();
 expect(await scrollArea.evaluate(el=>el.scrollTop)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});


test('redrawn legacy assets preserve saved figures and their public URLs',async({page})=>{
 const original=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../test/fixtures/legacy-catalog.json',import.meta.url),'utf8'));
 const {collectParts}=await import('../scripts/build.mjs');
 const current=await collectParts((await import('node:url')).fileURLToPath(new URL('../',import.meta.url)));
 const retained=original.filter(p=>current.some(c=>c.image===p.image));
 test.skip(!retained.length,'The original artwork has intentionally been removed from the catalog.');
 const snapshot=Object.values(Object.fromEntries(retained.map(p=>[p.category,p])));
 if(!snapshot.some(p=>p.category==='hair'))snapshot.push(current.find(p=>p.category==='hair'));
 if(!snapshot.some(p=>p.category==='face'))snapshot.push(current.find(p=>p.category==='face'));
 if(!snapshot.some(p=>p.category==='torso'))snapshot.push(current.find(p=>p.category==='torso'));
 if(!snapshot.some(p=>p.category==='legs'))snapshot.push(current.find(p=>p.category==='legs'));
 const selection=Object.fromEntries(snapshot.map(p=>[p.category,p.id]));
 const total=550+snapshot.filter(p=>['accessory','animal'].includes(p.category)).reduce((sum,p)=>sum+p.price,0);
 await page.addInitScript(selection=>localStorage.setItem('teuilor-selection-v1',JSON.stringify(selection)),selection);
 await page.goto('/');
 expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(total);
 for(const part of snapshot){
  await expect(page.locator(`#figure [data-layer="${part.category}"]`)).toHaveAttribute('href',part.image);
 }
 const checks=await page.evaluate(async retained=>{
  const {default:catalog}=await import('./catalog.js');
  const slots={hair:[190,110,220,217],face:[224,173,152,147],torso:[139,285,322,257],legs:[212,451,176,232],accessory:[15,405,150,290],animal:[430,435,170,265]};
  return Promise.all(catalog.filter(p=>retained.some(old=>old.image===p.image)).map(async part=>{
   const svg=await (await fetch(part.image)).text();
   const image=new Image();image.src=part.image;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,600,720).data;
   const [left,top,width,height]=slots[part.category];let visible=0,outside=0;
   for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(pixels[(y*600+x)*4+3]>0){visible++;if(x<left||x>=left+width||y<top||y>=top+height)outside++;}
   return {id:part.id,style:svg.includes('data-render-style="glossy-plastic"'),visible,outside};
  }));
 },retained);
 expect(checks).toHaveLength(retained.length);
 for(const check of checks){expect(check.style,check.id).toBe(true);expect(check.visible,check.id).toBeGreaterThan(500);expect(check.outside,check.id).toBe(0);}
});
