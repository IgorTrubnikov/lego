import {test,expect} from '@playwright/test';
const amount=async(page,selector='#total')=>Number((await page.locator(selector).innerText()).replace(/\D/g,''));
const choose=async(page,category,id)=>{await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();};

test('tree, snow and the two distinct letters cost 100 and survive cart reload and order export',async({page})=>{
 await page.goto('/');
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const ids=['additional-snowy-tree','additional-decorative-snow','accessory-catalog-letter-seal','accessory-catalog-letter-love'];
 for(const id of ids)expect(catalog.find(p=>p.id===id)?.price,id).toBe(100);
 const letters=ids.slice(2).map(id=>catalog.find(p=>p.id===id));
 expect(letters[0].image).not.toBe(letters[1].image);
 await choose(page,'accessory',letters[0].id);expect(await amount(page)).toBe(650);
 await choose(page,'accessory',letters[1].id);expect(await amount(page)).toBe(650);
 await expect(page.locator('#figure [data-layer="accessory"]')).toHaveAttribute('href',letters[1].image);
 await page.locator('#add-cart').click();await expect(page.locator('.cart-item')).toHaveCount(1);
 await choose(page,'additional',ids[0]);expect(await amount(page)).toBe(650);
 await page.locator('#add-cart').click();await expect(page.locator('.cart-item')).toHaveCount(2);
 await choose(page,'additional',ids[1]);await choose(page,'accessory',letters[0].id);
 expect(await amount(page)).toBe(750);
 await page.locator('#add-cart').click();await expect(page.locator('.cart-item')).toHaveCount(3);
 expect(await amount(page,'#cart-total')).toBe(2050);
 await page.reload();await expect(page.locator('.cart-additional')).toHaveCount(2);
 const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-cart-v1')));
 expect(cart.items[0].selection.accessory).toBe(letters[1].id);
 expect(cart.items[1].selection.additional).toBe(ids[0]);
 expect(cart.items[2].selection.additional).toBe(ids[1]);
 await page.evaluate(()=>{
  window.__winterTexts=[];const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__winterTexts.push(String(text));return fill.call(this,text,...args);};
 });
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();
 const text=await page.evaluate(()=>window.__winterTexts.join(' '));
 for(const id of ids)expect(text).toContain(id);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('additional products show below the figure independently of altars and explain the custom background',async({page})=>{
 await page.goto('/');
 const tabs=await page.locator('[data-category]').evaluateAll(nodes=>nodes.map(n=>n.dataset.category));
 expect(tabs.indexOf('additional')).toBe(tabs.indexOf('altar')+1);
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const items=catalog.filter(p=>p.category==='additional');
 expect(items).toHaveLength(7);
 const figure=await page.locator('#figure').innerHTML();
 await page.locator('[data-category="additional"]').click();
 await expect(page.locator('#additional-note')).toContainText('любая картинка');
 await expect(page.locator('[data-part]')).toHaveCount(8);
 for(const item of items){
  await page.locator(`[data-part="${item.id}"]`).click();
  expect(item.price).toBe(item.id==='additional-card'?200:100);
  expect(await amount(page)).toBe(550+item.price);
  expect(await page.locator('#figure').innerHTML()).toBe(figure);
  await expect(page.locator('#additional-art [data-layer="additional"]')).toHaveAttribute('href',item.image);
 }
 await choose(page,'additional','additional-card');
 await expect(page.locator('#additional-description')).toContainText('Фон выбираете вы');
 await choose(page,'altar','altar-photo-03');expect(await amount(page)).toBe(1150);
 await expect(page.locator('#order-addon')).toBeVisible();await expect(page.locator('#order-additional')).toBeVisible();
 await page.reload();await expect(page.locator('#additional-name')).toContainText('Карточка');
 await expect(page.locator('#additional-description')).toContainText('Пришлите её вместе с заказом');
 await page.locator('#remove-additional').click();expect(await amount(page)).toBe(950);
 await expect(page.locator('#order-addon')).toBeVisible();await expect(page.locator('#order-additional')).toBeHidden();
 await choose(page,'additional','additional-heart-red');
 await page.locator('#remove-addon').click();expect(await amount(page)).toBe(650);
 await expect(page.locator('#order-additional')).toBeVisible();
 await page.locator('#reset').click();await expect(page.locator('#order-additional')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('card note and both thumbnails survive cart reload, editing, heart packaging and order PNG',async({page})=>{
 await page.goto('/');
 await choose(page,'altar','altar-photo-03');await choose(page,'additional','additional-card');
 await page.locator('#add-cart').click();await expect(page.locator('.cart-item')).toHaveCount(1);
 await expect(page.locator('.cart-item-art img')).toHaveCount(3);
 await page.locator('#cart-packaging').selectOption('keychain-heart');
 let cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-cart-v1')));
 const id=cart.groups[0].id;
 await page.locator('[data-cart-group]').selectOption(id);
 expect(await amount(page,'#cart-total')).toBe(1275);
 const options=await page.locator('#cart-packaging option').allTextContents();
 expect(options.some(s=>s.includes('Брелок с круглым кольцом — 650'))).toBe(true);
 expect(options.some(s=>s.includes('Брелок с кольцом в виде сердца — 675'))).toBe(true);
 await page.reload();await expect(page.locator('.cart-item-art img')).toHaveCount(3);
 await page.locator('.cart-item summary').click();
 await expect(page.locator('.cart-detail-note')).toContainText('любая картинка');
 await page.evaluate(()=>{
  window.__orderTexts=[];window.__orderImages=[];
  const fill=CanvasRenderingContext2D.prototype.fillText,draw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__orderTexts.push(String(text));return fill.call(this,text,...args);};
  CanvasRenderingContext2D.prototype.drawImage=function(img,...args){window.__orderImages.push(img.src);return draw.call(this,img,...args);};
 });
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();
 const exported=await page.evaluate(()=>({text:window.__orderTexts.join(' ').replace(/\u00a0/g,' '),images:window.__orderImages}));
 expect(exported.text).toContain('Брелок с кольцом в виде сердца 675 ₽, один персонаж включён.');
 expect(exported.text).toContain('любая картинка');expect(exported.text).toContain('Итого за весь заказ: 1 275 ₽');
 expect(exported.images).toContain(cart.items[0].altarPreview);
 expect(exported.images).toContain(cart.items[0].additionalPreview);
 await page.locator('[data-cart-edit]').click();await expect(page.locator('#order-additional')).toBeVisible();
 await page.locator('#remove-additional').click();await page.locator('#add-cart').click();
 await expect(page.locator('#cancel-edit')).toBeHidden();
 expect(await amount(page,'#cart-total')).toBe(1075);await expect(page.locator('.cart-additional')).toHaveCount(0);
 cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-cart-v1')));
 expect(cart.items[0].groupId).toBe(id);expect(cart.items[0].selection.additional).toBe('additional-none');
});
