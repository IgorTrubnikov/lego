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
test('cart exports a complete PNG and readable detail list including formatting and wedding extras',async({page})=>{
 await page.goto('/');await expect(page.locator('#save-png')).toBeDisabled();
 await choose(page,'hair','hair-renewed-53');await choose(page,'altar','altar-altar-3');await choose(page,'transport','transport-catalog-01');await add(page,1);
 await expect(page.locator('.cart-altar')).toHaveCount(1);await expect(page.locator('#save-png')).toBeDisabled();
 await page.locator('#cart-packaging').selectOption('flask');expect(await amount(page,'#cart-total')).toBe(2600);
 let pending=page.waitForEvent('download');await page.locator('#save-order-text').click();let file=await pending;const text=await readFile(await file.path(),'utf8');
 for(const part of ['hair-renewed-53','28 ·','altar-altar-3','transport-catalog-01','Колба','ИТОГО: 2'])expect(text).toContain(part);
 pending=page.waitForEvent('download');await page.locator('#save-png').click();file=await pending;expect(await file.failure()).toBeNull();const png=await readFile(await file.path());expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(png.readUInt32BE(16)).toBe(1400);expect(png.readUInt32BE(20)).toBeGreaterThan(1000);
 await expect(page.locator('#png-link')).toBeVisible();await expect(page.locator('#order-telegram')).toHaveAttribute('href','https://t.me/teuilor');await expect(page.locator('#order-telegram')).toHaveAttribute('aria-disabled','false');
 await page.locator('#cart-packaging').selectOption('keychain');await expect(page.locator('#png-ready')).toBeHidden();expect(await amount(page,'#cart-total')).toBe(1750);
});
test('failed PNG export leaves cart intact and text download available',async({page})=>{
 await page.goto('/');await add(page,1);await page.locator('#cart-packaging').selectOption('keychain');
 await page.evaluate(()=>{window.originalToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=cb=>cb(null);});
 await page.locator('#save-png').click();await expect(page.locator('#toast')).toContainText('Не удалось сохранить PNG');await expect(page.locator('#save-png')).toBeEnabled();await expect(page.locator('.cart-item')).toHaveCount(1);
 const pending=page.waitForEvent('download');await page.locator('#save-order-text').click();expect(await (await pending).failure()).toBeNull();
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.originalToBlob;});
});
test('large carts produce numbered PNG pages and browser storage failure still permits a text order',async({page})=>{
 await page.goto('/');
 for(let i=1;i<=5;i++)await add(page,i);
 await page.locator('#cart-packaging').selectOption('keychain');expect(await amount(page,'#cart-total')).toBe(2650);
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();
 await expect(page.locator('#order-downloads a')).toHaveCount(2);
 const sizes=await page.evaluate(async()=>Promise.all([...document.querySelectorAll('#order-downloads a')].map(async a=>{const i=new Image();i.src=a.href;await i.decode();return [i.width,i.height];})));
 for(const size of sizes){expect(size[0]).toBe(1400);expect(size[1]).toBeLessThan(3500);}
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='teuilor-cart-v1')throw new Error('Quota');return original.call(this,key,value);};});
 await add(page,6);await expect(page.locator('#cart-status')).toContainText('Скачайте заказ');
 const textFile=page.waitForEvent('download');await page.locator('#save-order-text').click();expect(await (await textFile).failure()).toBeNull();
});
