import {test,expect} from '@playwright/test';

test('wedding additions change the order price without changing the assembled character',async({page})=>{
 await page.goto('/');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const scenes=catalog.filter(p=>p.category==='altar');
 expect(scenes.map(p=>p.name)).toEqual(['Алтарь 1','Алтарь 2','Алтарь 3','Алтарь 4','Алтарь 5','Алтарь 6']);
 expect(scenes.every(p=>p.price===400)).toBe(true);
 await expect(page.locator('#figure [data-layer="altar"]')).toHaveCount(0);
 for(const category of ['accessory','animal']){
  await page.locator(`[data-category="${category}"]`).click();
  await page.locator(`[data-part="${catalog.find(p=>p.category===category).id}"]`).click();
 }
 const character=await page.locator('#figure').innerHTML();
 const baseline=Number((await page.locator('#total').innerText()).replace(/\D/g,''));
 await page.locator('[data-category="altar"]').click();
 await expect(page.locator('[data-part="altar-none"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-part]')).toHaveCount(scenes.length+1);
 for(const scene of scenes){
  const card=page.locator(`[data-part="${scene.id}"]`);await card.click();
  expect(await page.locator('#figure').innerHTML()).toBe(character);
  await expect(page.locator('#addon-art [data-layer="altar"]')).toHaveAttribute('href',scene.image);
  await expect(page.locator('#addon-name')).toContainText(scene.name);
  await expect(card.locator('[data-layer]')).toHaveCount(1);
  await expect(page.locator('#addon-art [data-layer]')).toHaveCount(1);
  await expect(page.locator('#figure [data-layer="accessory"]')).toHaveCount(1);
  await expect(page.locator('#figure [data-layer="animal"]')).toHaveCount(1);
  expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(baseline+scene.price);
 }
 const selected=scenes.at(-1);
 await expect(page.locator('#order-addon')).toBeVisible();
 await expect(page.locator('.pedestal')).toBeVisible();
 await page.reload();
 await expect(page.locator('#addon-art [data-layer="altar"]')).toHaveAttribute('href',selected.image);
 expect(await page.locator('#figure').innerHTML()).toBe(character);
 await page.locator('#remove-addon').click();
 await expect(page.locator('#order-addon')).toBeHidden();
 await expect(page.locator('#figure [data-layer="altar"]')).toHaveCount(0);
 expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(baseline);
 await page.locator('[data-category="altar"]').click();
 await page.locator(`[data-part="${selected.id}"]`).click();await page.locator('#reset').click();
 await expect(page.locator('#order-addon')).toBeHidden();
 await expect(page.locator('#figure [data-layer="altar"]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('uploaded altar photos retain transparent canvas margins, full silhouettes and safe bounds',async({page})=>{
 await page.goto('/');
 const checks=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default;
  return Promise.all(catalog.filter(p=>p.category==='altar').map(async p=>{
   const img=new Image();img.src=p.image;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
   const pixels=ctx.getImageData(0,0,600,720).data;
   let visible=0,outside=0;const [x0,y0,w,h]=p.previewBox.split(' ').map(Number);
   for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(pixels[(y*600+x)*4+3]>0){
    visible++;if(x<x0||x>=x0+w||y<y0||y>=y0+h)outside++;
   }
   return {name:p.name,size:[img.width,img.height],visible,outside,corners:[[0,0],[599,0],[0,719],[599,719]].map(([x,y])=>pixels[(y*600+x)*4+3]),opening:pixels[(355*600+300)*4+3]};
  }));
 });
 expect(checks.length).toBeGreaterThan(0);
 for(const c of checks){
  expect(c.size,c.name).toEqual([600,720]);expect(c.visible,c.name).toBeGreaterThan(5000);
  expect(c.outside,c.name).toBe(0);expect(c.corners,c.name).toEqual([0,0,0,0]);
  // Uploaded photographs include their own figures and backdrops; they are separate add-ons.
  // Their central area is intentionally preserved rather than cut out for the constructor.
 }
});


test('retired altar selections reset without changing the configured character',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({altar:'altar-altar-3',hair:'hair-renewed-14',face:'face-catalog-58'})));
 await page.goto('/');await expect(page.locator('#order-addon')).toBeHidden();
 await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/renewed-14__/);
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-58__/);
 await page.locator('[data-category="altar"]').click();await expect(page.locator('[data-part="altar-none"]')).toHaveAttribute('aria-pressed','true');
 for(const id of ['altar-altar-1','altar-altar-2','altar-altar-3','altar-altar-4','altar-swing','altar-balcony'])await expect(page.locator(`[data-part="${id}"]`)).toHaveCount(0);
});
