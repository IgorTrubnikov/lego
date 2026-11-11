import test from 'node:test';import assert from 'node:assert/strict';
import {characterBasePrice,cartTotals,restoreCart,newCart,orderText,snapshotDetails,packagingOptions} from '../cart.js';
import {withOptionalChoices,initialSelection,totalPrice} from '../parts.js';
const item=(id,details=[])=>({id,selection:{...initialSelection},preview:'data:image/webp;base64,YQ==',details});
const detail=(id,category,price)=>({id,category,label:category,name:id,price});
test('figure discounts apply per position while additions and one packaging charge stay intact',()=>{
 assert.deepEqual([0,1,2,3,20].map(characterBasePrice),[550,400,350,350,350]);
 const cart={...newCart(),packagingId:'frame-15x21',items:[item('a',[detail('bag','accessory',100),detail('dog','animal',200)]),item('b',[detail('bike','transport',150),detail('baby','children',250)]),item('c',[detail('suit','suit',550)])]};
 let t=cartTotals(cart);assert.deepEqual(t.lines.map(l=>l.total),[850,800,350]);assert.equal(t.total,3650);
 cart.items.shift();t=cartTotals(cart);assert.deepEqual(t.lines.map(l=>l.base),[550,400]);assert.equal(t.extras,400);assert.equal(t.total,3000);
 cart.items=[];assert.equal(cartTotals(cart).total,0);
 assert.deepEqual(packagingOptions.map(p=>p.price),[1500,1550,1650,1750,650]);
});
test('snapshots list only active details including costume contents and wedding additions',()=>{
 const parts=withOptionalChoices([detail('hair','hair',0),detail('face','face',0),detail('shirt','torso',0),detail('legs','legs',0),{...detail('suit','suit',550),includedLabel:'Рюкзак в комплекте'},detail('altar','altar',400)].map(p=>({...p,image:'test.svg'})));
 const s={hair:'hair',face:'face',torso:'shirt',legs:'legs',suit:'suit',altar:'altar'};
 const details=snapshotDetails(s,parts);assert.deepEqual(details.map(p=>p.category),['hair','face','suit','altar']);assert.equal(details.find(p=>p.id==='suit').includedLabel,'Рюкзак в комплекте');
 assert.equal(totalPrice(s,parts,350),750);
 const cart={...newCart(),packagingId:'keychain',items:[item('a',details)]};const text=orderText(cart);
 assert.match(text,/suit/);assert.match(text,/Рюкзак в комплекте/);assert.match(text,/altar/);assert.match(text,/Брелок/);assert.match(text,/1.600/);
});
test('saved carts restore safely, reject external images and keep exact configured details',()=>{
 const original={...newCart(),packagingId:'flask',items:[item('a',[detail('hair-renewed-53','hair',0)])]};
 const restored=restoreCart(JSON.parse(JSON.stringify(original)));assert.deepEqual(restored.items,original.items.map(i=>({...i,altarPreview:undefined,details:i.details.map(d=>({...d,includedLabel:undefined}))})));
 original.items.push({...item('bad'),preview:'https://tracker.invalid/image'});original.items.push(item('a'));assert.equal(restoreCart(original).items.length,1);
 assert.equal(restoreCart({version:1,items:null}).items.length,0);
});
