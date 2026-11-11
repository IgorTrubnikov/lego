import test from 'node:test';import assert from 'node:assert/strict';
import {characterBasePrice,cartTotals,restoreCart,newCart,snapshotDetails,packagingOptions,refreshCart,assignGroup} from '../cart.js';
import {withOptionalChoices,initialSelection,totalPrice} from '../parts.js';
const item=(id,details=[],groupId='none')=>({id,groupId,selection:{...initialSelection},preview:'data:image/webp;base64,YQ==',details});
const detail=(id,category,price)=>({id,category,label:category,name:id,price});
const group=(id,type)=>({id,type});
test('standalone characters always cost 550, including the fourth and later',()=>{
 assert.deepEqual([0,1,2,3,20].map(i=>characterBasePrice(i)),[550,550,550,550,550]);
 const cart={...newCart(),items:['a','b','c','d'].map(id=>item(id))};assert.equal(cartTotals(cart).total,2200);assert.equal(cartTotals(cart).ready,true);
});
test('each frame charges its empty price and the first three at 400, then 350',()=>{
 assert.deepEqual(packagingOptions.map(p=>p.price),[0,1500,1150,1250,1350,650]);
 for(const [type,price] of [['frame-10x15',1150],['frame-15x21',1250],['frame-20x20',1350]]){
  const cart={...newCart(),groups:[group('f',type)],items:['a','b','c','d','e'].map(id=>item(id,[],'f'))};
  const t=cartTotals(cart);assert.deepEqual(t.lines.map(l=>l.base),[400,400,400,350,350]);assert.equal(t.total,price+1900);
 }
 assert.equal(cartTotals({...newCart(),groups:[group('f','frame-10x15')],items:[item('a',[],'f'),item('b',[],'f')]}).total,1950);
});
test('flask includes first character, discounts depend on total characters, and keychain includes one',()=>{
 const cart={...newCart(),groups:[group('f','flask')],items:['a','b','c','d'].map(id=>item(id,[],'f'))};
 const t=cartTotals(cart);assert.deepEqual(t.lines.map(l=>l.base),[0,400,400,350]);assert.equal(t.total,2650);
 const key={...newCart(),groups:[group('k','keychain')],items:[item('a',[],'k'),item('b')]};
 assert.equal(cartTotals(key).total,1200);assert.equal(assignGroup(key,'b','k'),false);assert.equal(key.items[1].groupId,'none');
 assert.equal(cartTotals({...key,items:[item('a',[],'k'),item('b',[],'k')]}).ready,false);
});
test('independent groups reset discounts, extras never change and moving characters reprices both groups',()=>{
 const cart={...newCart(),groups:[group('f1','frame-10x15'),group('f2','frame-10x15'),group('c','flask'),group('k','keychain')],items:[item('a',[detail('bag','accessory',100)],'f1'),item('b',[],'f1'),item('c',[],'f1'),item('d',[],'f1'),item('e',[],'f2'),item('f',[],'c'),item('g',[],'k'),item('h')]};
 let t=cartTotals(cart);assert.equal(t.total,7050);assert.equal(t.extras,100);assert.equal(t.ready,true);
 assert.equal(assignGroup(cart,'d','f2'),true);t=cartTotals(cart);assert.equal(t.total,7100);assert.equal(t.groups.find(g=>g.id==='f2').figures,800);
 cart.items=cart.items.filter(i=>i.id!=='a');t=cartTotals(cart);assert.equal(t.extras,0);assert.equal(t.groups.find(g=>g.id==='f1').figures,800);
 assert.equal(assignGroup(cart,'e','none'),true);assert.equal(cartTotals(cart).lines.find(l=>l.item.id==='e').base,550);
});
test('empty formats and ambiguous migrations must be resolved before export',()=>{
 const cart={...newCart(),groups:[group('f','flask')],items:[item('a')]};assert.equal(cartTotals(cart).ready,false);
 assert.equal(assignGroup(cart,'a','f'),true);assert.equal(cartTotals(cart).ready,true);
 cart.needsReview=true;assert.equal(cartTotals(cart).ready,false);
 assert.equal(cartTotals(newCart()).ready,false);
});
test('snapshots list only active details including costume contents and wedding additions',()=>{
 const parts=withOptionalChoices([detail('hair','hair',0),detail('face','face',0),detail('shirt','torso',0),detail('legs','legs',0),{...detail('suit','suit',550),includedLabel:'Рюкзак в комплекте'},detail('altar','altar',400)].map(p=>({...p,image:'test.svg'})));
 const s={hair:'hair',face:'face',torso:'shirt',legs:'legs',suit:'suit',altar:'altar'};
 const details=snapshotDetails(s,parts);assert.deepEqual(details.map(p=>p.category),['hair','face','suit','altar']);assert.equal(details.find(p=>p.id==='suit').includedLabel,'Рюкзак в комплекте');assert.equal(totalPrice(s,parts),950);
 assert.equal(cartTotals({...newCart(),groups:[group('k','keychain')],items:[item('a',details,'k')]}).total,1050);
});
test('saved carts restore exact previews and destinations and reject external images, duplicates and invalid groups',()=>{
 const original={...newCart(),groups:[group('f','flask')],items:[item('a',[detail('hair-renewed-53','hair',0)],'f')]};
 const restored=restoreCart(JSON.parse(JSON.stringify(original)));assert.equal(restored.items[0].preview,original.items[0].preview);assert.equal(restored.items[0].groupId,'f');assert.equal(cartTotals(restored).total,1500);
 original.items.push({...item('bad'),preview:'https://tracker.invalid/image'});original.items.push(item('a'));original.items.push(item('missing',[],'no-such-group'));
 const safe=restoreCart(original);assert.equal(safe.items.length,2);assert.equal(safe.items[1].groupId,'none');assert.equal(restoreCart({version:1,items:null}).items.length,0);
 const keys=restoreCart({...newCart(),groups:[group('k','keychain')],items:[item('a',[],'k'),item('b',[],'k')]});assert.equal(keys.items[1].groupId,'none');
});
test('legacy single format migrates automatically while multiple quantities need explicit distribution',()=>{
 const old={version:1,id:'ABC123',packagingId:'frame-10x15',items:[item('a'),item('b')]};
 const frame=restoreCart(old);assert.equal(frame.version,2);assert.equal(frame.id,old.id);assert.equal(frame.groups.length,1);assert.equal(frame.items[0].groupId,frame.groups[0].id);assert.equal(cartTotals(frame).total,1950);
 const flask=restoreCart({...old,packagingId:'flask'});assert.equal(cartTotals(flask).total,1900);
 const key=restoreCart({...old,packagingId:'keychain'});assert.equal(key.items[1].groupId,'none');assert.equal(cartTotals(key).total,1200);
 const multiple=restoreCart({...old,packagingItems:[{id:'flask',quantity:2},{id:'keychain',quantity:3}]});assert.equal(multiple.groups.length,5);assert.equal(multiple.needsReview,true);assert.ok(multiple.items.every(i=>i.groupId==='none'));assert.equal(cartTotals(multiple).ready,false);
 const plain=restoreCart({...old,packagingId:'none'});assert.equal(cartTotals(plain).total,1100);assert.equal(cartTotals(plain).ready,true);
});
test('saved additions use current catalog prices and removed details require review',()=>{
 const saved={...newCart(),items:[item('a',[detail('skirt','skirt',200)]),item('b',[detail('accessory-catalog-wheel-small','accessory',100)])]};
 const updated=refreshCart(saved,[{...detail('skirt','skirt',100),image:'skirt.svg'}]);
 assert.equal(updated.items[0].details[0].price,100);assert.equal(updated.items[0].unavailable,false);assert.equal(updated.items[0].preview,saved.items[0].preview);assert.equal(updated.items[1].unavailable,true);assert.equal(cartTotals(updated).ready,false);
});
