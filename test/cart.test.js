import test from 'node:test';import assert from 'node:assert/strict';
import {characterBasePrice,cartTotals,restoreCart,newCart,snapshotDetails,packagingOptions,refreshCart,assignGroup} from '../cart.js';
import {withOptionalChoices,initialSelection,totalPrice,choosePart} from '../parts.js';
const item=(id,details=[],groupId='none')=>({id,groupId,selection:{...initialSelection},preview:'data:image/webp;base64,YQ==',details});
const detail=(id,category,price)=>({id,category,label:category,name:id,price});
const group=(id,type)=>({id,type});
test('stand and ribbon balls use 400 per paid character at every position and charge extras in full',()=>{
 for(const [type,price,bases] of [
  ['ball-stand',1500,[0,400,400,400,400]],
  ['ball-ribbon',800,[400,400,400,400,400]],
 ]){
  const cart={...newCart(),groups:[group('ball',type)],items:['a','b','c','d','e'].map((id,i)=>item(id,i===0?[detail('bag','accessory',100),detail('snow','additional',100)]:[],'ball'))};
  const total=cartTotals(cart);
  assert.deepEqual(total.lines.map(line=>line.base),bases);assert.equal(total.extras,200);
  assert.equal(total.total,price+bases.reduce((a,b)=>a+b,0)+200);assert.equal(total.ready,true);
  assert.equal(cartTotals(restoreCart(cart)).total,total.total);
  const old=restoreCart({...cart,version:1,packagingId:type,groups:undefined});
  assert.equal(cartTotals(old).total,total.total);
 }
 const independent={...newCart(),groups:[group('a','ball-stand'),group('b','ball-stand')],items:[item('1',[],'a'),item('2',[],'a'),item('3',[],'b')]};
 assert.deepEqual(cartTotals(independent).lines.map(line=>line.base),[0,400,0]);
 assert.equal(cartTotals(independent).total,3400);
 assert.deepEqual([0,1,2,3,4].map(i=>characterBasePrice(i,'flask')),[0,400,400,350,350]);
});
test('multiple additions toggle independently, count once and preserve all previews',()=>{
 const parts=withOptionalChoices([
  {id:'additional-card',category:'additional',name:'Карточка',price:200,image:'card.svg'},
  {id:'additional-snowy-tree',category:'additional',name:'Ёлка',price:100,image:'tree.svg'},
  {id:'additional-decorative-snow',category:'additional',name:'Снег',price:100,image:'snow.svg'},
  {id:'altar-test',category:'altar',name:'Алтарь',price:400,image:'altar.svg'}
 ]);
 let selection={...initialSelection,additional:'additional-card',altar:'altar-test'};
 selection=choosePart(selection,'additional','additional-snowy-tree',parts);
 selection=choosePart(selection,'additional','additional-decorative-snow',parts);
 assert.equal(totalPrice(selection,parts),1350);
 const details=snapshotDetails(selection,parts);
 assert.equal(details.filter(p=>p.category==='additional').length,3);
 const previews=['data:image/webp;base64,YQ==','data:image/webp;base64,Yg=='];
 const restored=restoreCart({...newCart(),items:[{...item('a',details),selection,additionalPreviews:[...previews,'https://example.com/a.png']}]});
 assert.deepEqual(restored.items[0].additionalPreviews,previews);
 assert.equal(cartTotals(restored).total,1350);
 selection=choosePart(selection,'additional','additional-card',parts);
 assert.equal(totalPrice(selection,parts),1150);
 assert.equal(totalPrice({...selection,additionalItems:[...selection.additionalItems,'additional-snowy-tree','missing']},parts),1150);
 selection=choosePart(selection,'additional','additional-none',parts);
 assert.equal(totalPrice(selection,parts),950);
 assert.deepEqual(selection.additionalItems,[]);
});
test('heart keychain includes one figure, preserves additions and restores its own preview',()=>{
 const card={id:'additional-card',category:'additional',name:'Карточка со своим фоном',price:200,image:'./additional/card.svg'};
 const parts=withOptionalChoices([card]);
 const details=snapshotDetails({additional:card.id},parts);
 assert.match(details[0].note,/любая картинка/);
 const cart={...newCart(),groups:[group('heart','keychain-heart')],items:[{...item('a',details,'heart'),additionalPreview:'data:image/webp;base64,YQ=='},item('b')]};
 const total=cartTotals(cart);assert.equal(total.total,1425);assert.equal(total.lines[0].base,0);assert.equal(total.lines[0].extras,200);
 assert.equal(assignGroup(cart,'b','heart'),false);
 const restored=restoreCart(cart);assert.equal(restored.items[0].additionalPreview,cart.items[0].additionalPreview);
 assert.equal(restored.items[0].details[0].note,details[0].note);assert.equal(cartTotals(restored).total,1425);
 const legacy=restoreCart({...cart,version:1,packagingId:'keychain-heart',groups:undefined});
 assert.equal(legacy.items[0].groupId,legacy.groups[0].id);assert.equal(legacy.items[1].groupId,'none');
});
test('standalone characters always cost 550, including the fourth and later',()=>{
 assert.deepEqual([0,1,2,3,20].map(i=>characterBasePrice(i)),[550,550,550,550,550]);
 const cart={...newCart(),items:['a','b','c','d'].map(id=>item(id))};assert.equal(cartTotals(cart).total,2200);assert.equal(cartTotals(cart).ready,true);
});
test('each frame charges its empty price and the first three at 400, then 350',()=>{
 assert.deepEqual(packagingOptions.map(p=>p.price),[0,1500,1500,800,1150,1250,1350,650,675,2500]);
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


test('keyholder includes two figures, charges extras and restores the two-place limit',()=>{
 const cart={...newCart(),groups:[group('holder','keyholder')],items:[item('a',[detail('pet','animal',200)],'holder'),item('b',[],'holder'),item('c')]};
 let totals=cartTotals(cart);assert.deepEqual(totals.lines.map(l=>l.base),[0,0,550]);assert.equal(totals.total,3250);
 assert.equal(totals.groups.find(g=>g.id==='holder').total,2700);assert.equal(assignGroup(cart,'c','holder'),false);
 cart.items.pop();assert.equal(cartTotals(cart).total,2700);assert.ok(cartTotals(cart).ready);
 const restored=restoreCart({...cart,items:[...cart.items,item('c',[],'holder')]});assert.equal(restored.items[2].groupId,'none');
 assert.equal(cartTotals(restored).total,3250);assert.equal(restored.groups[0].type,'keyholder');
});
