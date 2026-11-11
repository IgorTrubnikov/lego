import {test,expect} from '@playwright/test';import {readFile} from 'node:fs/promises';
const amount=async(page,selector='#cart-total')=>Number((await page.locator(selector).innerText()).replace(/\D/g,''));
const choose=async(page,category,id)=>{await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();};
const add=async(page,count)=>{await page.locator('#add-cart').click();await expect(page.locator('.cart-item')).toHaveCount(count);};
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-cart-v1')));
const createGroup=async(page,type)=>{await page.locator('#cart-packaging').selectOption(type);return (await state(page)).groups.at(-1).id;};
const move=async(page,index,group)=>{const id=(await state(page)).items[index].id;await page.locator(`[data-cart-group="${id}"]`).selectOption(group);};
const character=async(page,index)=>page.locator(`[data-cart-item="${(await state(page)).items[index].id}"]`);
const download=async page=>{const pending=page.waitForEvent('download');await page.locator('#save-png').click();const file=await pending;expect(await file.failure()).toBeNull();return readFile(await file.path());};
const recordText=page=>page.evaluate(()=>{window.__orderTexts=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__orderTexts.push(String(text));return fill.call(this,text,...args);};});
test('separate orders, independent frames, edits, removal and reload keep the new prices',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');expect(await amount(page,'#total')).toBe(550);
 await choose(page,'accessory','accessory-catalog-gamepad');await add(page,1);expect(await amount(page,'#total')).toBe(550);
 await choose(page,'suit','suit-catalog-37');await choose(page,'children','children-catalog-infant');await add(page,2);await add(page,3);await add(page,4);
 expect(await amount(page)).toBe(2550); // 4 standalone + 350 additions.
 const f=await createGroup(page,'frame-10x15');await expect(page.locator('#save-png')).toBeDisabled();
 for(let i=0;i<4;i++)await move(page,i,f);expect(await amount(page)).toBe(3050); // 1150 + 1550 + 350 extras.
 const f2=await createGroup(page,'frame-10x15');await move(page,3,f2);expect(await amount(page)).toBe(4250);
 await page.reload();expect(await amount(page)).toBe(4250);await expect(page.locator('[data-format-quantity="frame-10x15"]')).toHaveValue('2');
 await (await character(page,1)).locator('[data-cart-edit]').click();expect(await amount(page,'#total')).toBe(800);
 await choose(page,'accessory','accessory-catalog-first-aid');await page.locator('#add-cart').click();await expect(page.locator('#cancel-edit')).toBeHidden();expect(await amount(page)).toBe(4350);
 expect((await state(page)).items[1].groupId).toBe(f);
 await (await character(page,0)).locator('[data-cart-remove]').click();expect(await amount(page)).toBe(3850);
 await (await character(page,0)).locator('summary').click();await expect(await character(page,0)).toContainText('Рюкзак в комплекте');
 await page.locator(`[data-group-remove="${f2}"]`).click();expect(await amount(page)).toBe(2850);expect((await state(page)).items[2].groupId).toBe('none');
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('flask includes the first, keychain includes one, and PNG describes the exact groups and details',async({page})=>{
 await page.goto('/');await choose(page,'altar','altar-photo-03');await choose(page,'transport','transport-catalog-01');await add(page,1);
 for(let i=2;i<=5;i++)await add(page,i);
 const flask=await createGroup(page,'flask');for(let i=0;i<4;i++)await move(page,i,flask);
 expect(await amount(page)).toBe(3750); // flask2650 + standalone550 + extras550.
 const key=await createGroup(page,'keychain');await move(page,4,key);expect(await amount(page)).toBe(3850);
 const select=(await character(page,0)).locator('[data-cart-group]');await expect(select.locator(`option[value="${key}"]`)).toHaveJSProperty('disabled',true);
 await recordText(page);const png=await download(page);expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(png.readUInt32BE(16)).toBe(1400);
 const text=await page.evaluate(()=>window.__orderTexts.join('\n').replace(/\u00a0/g,' '));expect(text).toContain('Колба №1 — 3 200 ₽');expect(text).toContain('Брелок №1 — 650 ₽');expect(text).toContain('Персонаж 5 — включён');expect(text).toContain('altar-photo-03');expect(text).toContain('transport-catalog-01');expect(text).toContain('с четвёртой по 350');
 await expect(page.locator('#order-downloads a')).toHaveCount(2);await expect(page.locator('#order-telegram')).toHaveAttribute('aria-disabled','false');
 await page.locator(`[data-group-remove="${key}"]`).click();expect(await amount(page)).toBe(3750);await expect(page.locator('#png-ready')).toBeHidden();
});
test('quantity changes create distinct groups and removing occupied formats preserves their characters',async({page})=>{
 await page.goto('/');await add(page,1);await add(page,2);await expect(page.locator('#save-png')).toBeEnabled();
 const flask=await createGroup(page,'flask');await move(page,0,flask);
 await page.locator('[data-format-quantity="flask"]').fill('2');await page.locator('[data-format-quantity="flask"]').dispatchEvent('change');
 const second=(await state(page)).groups.at(-1).id;await move(page,1,second);expect(await amount(page)).toBe(3000);await page.reload();await expect(page.locator('[data-format-quantity="flask"]')).toHaveValue('2');expect(await amount(page)).toBe(3000);
 await page.locator('[data-format-step="flask"][data-step="-1"]').click();expect(await amount(page)).toBe(2050);expect((await state(page)).items[1].groupId).toBe('none');
 await page.locator('[data-format-quantity="flask"]').fill('0');await page.locator('[data-format-quantity="flask"]').dispatchEvent('change');expect(await amount(page)).toBe(1100);await expect(page.locator('.cart-item')).toHaveCount(2);await expect(page.locator('.packaging-line')).toHaveCount(0);
 await recordText(page);await download(page);expect(await page.evaluate(()=>window.__orderTexts.join('\n').replace(/\u00a0/g,' '))).toContain('Без оформления — 1 100 ₽');
});
test('legacy baskets preserve exact previews and ask to distribute multiple formats',async({page})=>{
 await page.goto('/');await add(page,1);await add(page,2);
 const old=await state(page);await page.evaluate(c=>{c.version=1;c.packagingId='frame-10x15';delete c.groups;c.packagingItems=[];localStorage.setItem('teuilor-cart-v1',JSON.stringify(c));},old);
 await page.reload();expect(await amount(page)).toBe(1950);await expect(page.locator('#save-png')).toBeEnabled();
 const migrated=await state(page); // persistence occurs on mutation; reload alone need not overwrite the old record.
 await page.evaluate(c=>{c.version=1;c.packagingId='flask';c.packagingItems=[{id:'flask',quantity:1},{id:'keychain',quantity:1}];localStorage.setItem('teuilor-cart-v1',JSON.stringify(c));},migrated);
 await page.reload();await expect(page.locator('#cart-review')).toBeVisible();await expect(page.locator('#save-png')).toBeDisabled();
 const groups=await page.locator('[data-group]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.group,name:n.getAttribute('aria-label')})));
 await move(page,0,groups.find(g=>g.name.startsWith('Колба')).id);await move(page,1,groups.find(g=>g.name.startsWith('Брелок')).id);await expect(page.locator('#save-png')).toBeDisabled();
 await page.locator('#cart-review').click();await expect(page.locator('#save-png')).toBeEnabled();expect(await amount(page)).toBe(2150);await page.reload();expect(await amount(page)).toBe(2150);await expect(page.locator('#cart-review')).toBeHidden();
 expect((await state(page)).items.map(i=>i.preview)).toEqual(old.items.map(i=>i.preview));
});
test('failed export and storage failure preserve cart and let the user retry or download',async({page})=>{
 await page.goto('/');await add(page,1);const k=await createGroup(page,'keychain');await move(page,0,k);expect(await amount(page)).toBe(650);
 await page.evaluate(()=>{window.originalToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=cb=>cb(null);});
 await page.locator('#save-png').click();await expect(page.locator('#toast')).toContainText('Не удалось сохранить PNG');await expect(page.locator('#save-png')).toBeEnabled();await expect(page.locator('.cart-item')).toHaveCount(1);
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.originalToBlob;});await download(page);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='teuilor-cart-v1')throw new Error('Quota');return original.call(this,key,value);};});
 await add(page,2);await expect(page.locator('#cart-status')).toContainText('Скачайте заказ');await download(page);
});
test('saved skirt prices refresh and a retired small wheel is resolved through editing',async({page})=>{
 await page.goto('/');await choose(page,'skirt','skirt-catalog-short-pink');await add(page,1);expect(await amount(page)).toBe(650);
 await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('teuilor-cart-v1'));c.items[0].details.find(p=>p.category==='skirt').price=200;c.items[0].details.push({id:'accessory-catalog-wheel-small',category:'accessory',label:'Аксессуар',name:'Колесо маленькое',price:100});c.items[0].selection.accessory='accessory-catalog-wheel-small';localStorage.setItem('teuilor-cart-v1',JSON.stringify(c));});
 await page.reload();await expect(page.locator('.cart-unavailable')).toBeVisible();await expect(page.locator('#save-png')).toBeDisabled();
 await page.locator('[data-cart-edit]').click();await page.locator('#add-cart').click();await expect(page.locator('#cancel-edit')).toBeHidden();await expect(page.locator('.cart-unavailable')).toHaveCount(0);expect(await amount(page)).toBe(650);await expect(page.locator('#save-png')).toBeEnabled();
});
