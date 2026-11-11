import {test,expect} from '@playwright/test';
const amount=async page=>Number((await page.locator('#total').innerText()).replace(/\D/g,''));
test('one 550 ruble figure includes all core choices and every addition uses the current price list',async({page})=>{
 await page.goto('/');expect(await amount(page)).toBe(550);
 for(const category of ['hair','face','torso','legs']){
  await page.locator(`[data-category="${category}"]`).click();
  const card=page.locator('#catalog [data-part]').last();
  await expect(card.locator('.part-price')).toHaveText('Входит в фигурку');
  await card.click();expect(await amount(page)).toBe(550);
 }
 await page.locator('[data-category="suit"]').click();await page.locator('[data-part="suit-catalog-37"]').click();expect(await amount(page)).toBe(550);
 await expect(page.locator('#breakdown')).toContainText('Фигурка с костюмом');
 const choose=async(category,id)=>{await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();};
 await choose('accessory','accessory-catalog-gamepad');expect(await amount(page)).toBe(650);
 await choose('animal','animal-3d-shepherd');expect(await amount(page)).toBe(850);
 await choose('transport','transport-catalog-01');expect(await amount(page)).toBe(1000);
 await choose('children','children-catalog-stroller-black');expect(await amount(page)).toBe(1300);
 await choose('children','children-catalog-infant');expect(await amount(page)).toBe(1250);
 await page.reload();expect(await amount(page)).toBe(1250);
 await choose('suit','suit-none');expect(await amount(page)).toBe(1250);
 for(const category of ['accessory','animal','transport','children'])await choose(category,category+'-none');
 expect(await amount(page)).toBe(550);
 await expect(page.locator('#breakdown > div')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
