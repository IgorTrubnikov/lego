import {test,expect} from '@playwright/test';import {readFile} from 'node:fs/promises';
const amount=async(page,selector)=>Number((await page.locator(selector).innerText()).replace(/\D/g,''));
const choose=async(page,category,id)=>{await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();};
const add=async(page,count)=>{await page.locator('#add-cart').click();await expect(page.locator('.cart-item')).toHaveCount(count);};
test('cart keeps independent characters, applies positional prices, edits, reprices deletion and survives reload',async({page})=>{
 await page.goto('/');await expect(page.locator('.checkout #save-png')).toHaveCount(0);expect(await amount(page,'#total')).toBe(550);
 await choose(page,'accessory','accessory-catalog-gamepad');await add(page,1);expect(await amount(page,'#total')).toBe(400);
 await choose(page,'suit','suit-catalog-37');await choose(page,'children','children-catalog-infant');await add(page,2);expect(await amount(page,'#total')).toBe(350);
 await add(page,3);expect(await amount(page,'#cart-total')).toBe(1650); // 550+100, 400+250, 350.
 await page.locator('#cart-packaging').selectOption('frame-10x15');expect(await amount(page,'#cart-total')).toBe(3200);
 await page.reload();await expect(page.locator('.cart-item')).toHaveCount(3);await expect(page.locator('#cart-packaging')).toHaveValue('frame-10x15');expect(await amount(page,'#cart-total')).toBe(3200);
 await page.locator('.cart-item').nth(1).locator('[data-cart-edit]').click();expect(await amount(page,'#total')).toBe(650);
 await choose(page,'accessory','accessory-catalog-first-aid');await page.locator('#add-cart').click();await expect(page.locator('#cancel-edit')).toBeHidden();expect(await amount(page,'#cart-total')).toBe(3300);
 await page.locator('.cart-item').first().locator('[data-cart-remove]').click();expect(await amount(page,'#cart-total')).toBe(2850); // 550+250+100, 400, frame1550.
 expect(await amount(page,'#total')).toBe(350);
 await page.locator('.cart-item').first().locator('summary').click();await expect(page.locator('.cart-item').first()).toContainText('Рюкзак в комплекте');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('cart exports a complete PNG including formatting and wedding extras',async({page})=>{
 await page.goto('/');await expect(page.locator('#save-png')).toBeDisabled();
 await choose(page,'hair','hair-renewed-53');await choose(page,'altar','altar-altar-3');await choose(page,'transport','transport-catalog-01');await add(page,1);
 await expect(page.locator('.cart-altar')).toHaveCount(1);await expect(page.locator('#save-png')).toBeDisabled();
 await page.locator('#cart-packaging').selectOption('flask');expect(await amount(page,'#cart-total')).toBe(2600);
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();const file=await pending;expect(await file.failure()).toBeNull();const png=await readFile(await file.path());expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(png.readUInt32BE(16)).toBe(1400);expect(png.readUInt32BE(20)).toBeGreaterThan(1000);
 await expect(page.locator('#png-link')).toBeVisible();await expect(page.locator('#order-telegram')).toHaveAttribute('href','https://t.me/teuilor');await expect(page.locator('#order-telegram')).toHaveAttribute('aria-disabled','false');
 await page.locator('#cart-packaging').selectOption('keychain');await expect(page.locator('#png-ready')).toBeHidden();expect(await amount(page,'#cart-total')).toBe(3250);
 await page.locator('[data-format-remove="flask"]').click();expect(await amount(page,'#cart-total')).toBe(1750);
});
test('failed PNG export leaves cart intact and allows retry',async({page})=>{
 await page.goto('/');await add(page,1);await page.locator('#cart-packaging').selectOption('keychain');
 await page.evaluate(()=>{window.originalToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=cb=>cb(null);});
 await page.locator('#save-png').click();await expect(page.locator('#toast')).toContainText('Не удалось сохранить PNG');await expect(page.locator('#save-png')).toBeEnabled();await expect(page.locator('.cart-item')).toHaveCount(1);
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.originalToBlob;});
 const retry=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await retry).failure()).toBeNull();
});
test('large carts produce numbered PNG pages and browser storage failure still permits a PNG order',async({page})=>{
 await page.goto('/');
 for(let i=1;i<=5;i++)await add(page,i);
 await page.locator('#cart-packaging').selectOption('keychain');expect(await amount(page,'#cart-total')).toBe(2650);
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();
 await expect(page.locator('#order-downloads a')).toHaveCount(2);
 const sizes=await page.evaluate(async()=>Promise.all([...document.querySelectorAll('#order-downloads a')].map(async a=>{const i=new Image();i.src=a.href;await i.decode();return [i.width,i.height];})));
 for(const size of sizes){expect(size[0]).toBe(1400);expect(size[1]).toBeLessThan(3500);}
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='teuilor-cart-v1')throw new Error('Quota');return original.call(this,key,value);};});
 await add(page,6);await expect(page.locator('#cart-status')).toContainText('Скачайте заказ');
 const file=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await file).failure()).toBeNull();
});

test('different formats have independent quantities and no-format orders can be saved',async({page})=>{
 await page.goto('/');await add(page,1);await expect(page.locator('#save-order-text')).toHaveCount(0);
 await page.locator('#cart-packaging').selectOption('flask');
 await page.locator('[data-format-quantity="flask"]').fill('2');await page.locator('[data-format-quantity="flask"]').dispatchEvent('change');
 await page.locator('#cart-packaging').selectOption('keychain');
 await page.locator('[data-format-quantity="keychain"]').fill('3');await page.locator('[data-format-quantity="keychain"]').dispatchEvent('change');
 expect(await amount(page,'#cart-total')).toBe(5500);await page.reload();
 await expect(page.locator('[data-format-quantity="flask"]')).toHaveValue('2');await expect(page.locator('[data-format-quantity="keychain"]')).toHaveValue('3');expect(await amount(page,'#cart-total')).toBe(5500);
 await page.evaluate(()=>{window.__orderTexts=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__orderTexts.push(String(text));return fill.call(this,text,...args);};});
 let file=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await file).failure()).toBeNull();
 const text=await page.evaluate(()=>window.__orderTexts.join('\n'));expect(text).toContain('Колба × 2');expect(text).toContain('Брелок × 3');
 await page.locator('#cart-packaging').selectOption('none');expect(await amount(page,'#cart-total')).toBe(550);await expect(page.locator('.packaging-line')).toHaveCount(0);await expect(page.locator('#png-ready')).toBeHidden();await expect(page.locator('#save-png')).toBeEnabled();
 await page.reload();await expect(page.locator('#cart-packaging')).toHaveValue('none');expect(await amount(page,'#cart-total')).toBe(550);
 file=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await file).failure()).toBeNull();await expect(page.locator('#order-telegram')).toHaveAttribute('aria-disabled','false');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('saved skirt prices refresh and a retired small wheel is resolved through editing',async({page})=>{
 await page.goto('/');await choose(page,'skirt','skirt-catalog-short-pink');await add(page,1);await page.locator('#cart-packaging').selectOption('none');
 expect(await amount(page,'#cart-total')).toBe(650);
 await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('teuilor-cart-v1'));c.items[0].details.find(p=>p.category==='skirt').price=200;c.items[0].details.push({id:'accessory-catalog-wheel-small',category:'accessory',label:'Аксессуар',name:'Колесо маленькое',price:100});c.items[0].selection.accessory='accessory-catalog-wheel-small';localStorage.setItem('teuilor-cart-v1',JSON.stringify(c));});
 await page.reload();await expect(page.locator('.cart-unavailable')).toBeVisible();await expect(page.locator('#save-png')).toBeDisabled();
 const data=await page.evaluate(()=>document.querySelector('.cart-item').innerText);expect(data).toContain('дополнения');
 await page.locator('[data-cart-edit]').click();await page.locator('#add-cart').click();await expect(page.locator('#cancel-edit')).toBeHidden();await expect(page.locator('.cart-unavailable')).toHaveCount(0);expect(await amount(page,'#cart-total')).toBe(650);await expect(page.locator('#save-png')).toBeEnabled();
});
