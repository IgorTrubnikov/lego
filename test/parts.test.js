import test from 'node:test';
import assert from 'node:assert/strict';
import { totalPrice,renderFigure,escapeHtml,withOptionalChoices,selectedFigureParts,choosePart,selectionCategories } from '../parts.js';
const parts=[{id:'h',category:'hair',price:250,image:'./haircuts/test.svg'},{id:'f',category:'face',price:150,image:'./faces/test.png'},{id:'t',category:'torso',price:350,image:'./clothes/test.webp'},{id:'l',category:'legs',price:250,image:'./pants/test.svg'}];
const selection={hair:'h',face:'f',torso:'t',legs:'l'};
test('price sums selected parts, including a zero-priced replacement',()=>{
 assert.equal(totalPrice(selection,parts),1000);
 assert.equal(totalPrice({...selection,hair:'new'},[...parts,{id:'new',category:'hair',price:0}]),750);
});
test('renders external layers in assembly order and crops category previews',()=>{
 const svg=renderFigure(selection,parts);
 assert.ok(svg.indexOf('./pants/')<svg.indexOf('./clothes/'));
 assert.ok(svg.indexOf('./clothes/')<svg.indexOf('./faces/'));
 assert.ok(svg.indexOf('./faces/')<svg.indexOf('./haircuts/'));
 const hair=renderFigure(selection,parts,'hair');
 assert.match(hair,/viewBox="155 65 290 255"/);assert.doesNotMatch(hair,/faces/);
});
test('escapes catalog names and image URLs',()=>{
 assert.equal(escapeHtml('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
 assert.doesNotMatch(renderFigure({hair:'x'},[{id:'x',category:'hair',image:'x" onload="bad'}]),/href="x" onload=/);
});

test('optional extras add to the price, render beside the figure and can be removed',()=>{
 const extras=withOptionalChoices([...parts,
  {id:'bag',category:'accessory',price:300,image:'./accessories/bag.svg'},
  {id:'cat',category:'animal',price:350,image:'./animals/cat.svg'}]);
 const chosen={...selection,accessory:'bag',animal:'cat'};
 assert.equal(totalPrice(chosen,extras),1650);
 const svg=renderFigure(chosen,extras);assert.match(svg,/data-layer="accessory"/);assert.match(svg,/data-layer="animal"/);
 assert.ok(svg.indexOf('./haircuts/')<svg.indexOf('./accessories/'));
 const empty={...chosen,accessory:'accessory-none',animal:'animal-none'};
 assert.equal(totalPrice(empty,extras),1000);
 assert.doesNotMatch(renderFigure(empty,extras),/data-layer="(?:animal|accessory)"/);
 assert.match(renderFigure(chosen,extras,'animal'),/viewBox="430 435 170 265"/);
});

test('asset-specific preview bounds enlarge thumbnails without moving assembled layers',()=>{
 const item={id:'controller',category:'accessory',price:200,image:'./accessories/controller.svg',previewBox:'19 582 142 107'};
 const chosen={...selection,accessory:item.id},catalog=[...parts,item];
 assert.match(renderFigure(chosen,catalog,'accessory'),/viewBox="19 582 142 107"/);
 assert.match(renderFigure(chosen,catalog),/viewBox="0 0 600 720"/);
 assert.match(renderFigure(chosen,catalog),/width="600" height="720" data-layer="accessory"/);
});

test('wedding additions affect the price and their cards without changing the character',()=>{
 const scene={id:'altar-test',category:'altar',name:'Алтарь',price:400,image:'./altars/test.svg',previewBox:'14 70 572 636'};
 const catalog=withOptionalChoices([...parts,scene]),chosen={...selection,altar:scene.id};
 assert.equal(totalPrice(chosen,catalog),1400);
 const svg=renderFigure(chosen,catalog);
 assert.equal(svg,renderFigure(selection,catalog));
 assert.doesNotMatch(svg,/data-layer="altar"|transform=/);
 const card=renderFigure(chosen,catalog,'altar');
 assert.match(card,/viewBox="14 70 572 636"/);
 assert.match(card,/data-layer="altar"/);assert.doesNotMatch(card,/data-layer="(?:legs|face|torso|hair)"/);
 const plain={...chosen,altar:'altar-none'};
 assert.equal(totalPrice(plain,catalog),1000);
 assert.doesNotMatch(renderFigure(plain,catalog),/data-figure-in-altar|data-layer="altar"/);
});

test('long hair uses the same back-first layers in the preview, thumbnails and PNG export',()=>{
 const hair={...parts[0],backImage:'./assets/hair-backs/test.svg'},catalog=[hair,...parts.slice(1)];
 const selected=selectedFigureParts(selection,catalog);
 assert.deepEqual(selected.map(p=>p.category),['hair-back','legs','torso','face','hair']);
 assert.equal(selected[0].image,hair.backImage);
 const figure=renderFigure(selection,catalog);
 assert.ok(figure.indexOf('data-layer="hair-back"')<figure.indexOf('data-layer="face"'));
 const thumb=renderFigure(selection,catalog,'hair');
 assert.match(thumb,/data-layer="hair-back"/);assert.match(thumb,/data-layer="hair"/);
 assert.doesNotMatch(thumb,/data-layer="(?:torso|face|legs)"/);
});

test('a complete suit replaces both body layers and prices without discarding separate choices',()=>{
 const suit={id:'suit-test',category:'suit',price:500,image:'./suits/full.svg',includedLabel:'Рюкзак в комплекте'};
 const catalog=withOptionalChoices([...parts,suit]),chosen=choosePart(selection,'suit',suit.id);
 assert.equal(totalPrice(chosen,catalog),900); // Hair 250 + face 150 + suit 500.
 assert.equal(chosen.torso,selection.torso);assert.equal(chosen.legs,selection.legs);
 assert.deepEqual(selectedFigureParts(chosen,catalog).map(p=>p.category),['suit','face','hair']);
 assert.deepEqual(selectionCategories(chosen,catalog).map(c=>c.id),['hair','face','suit','accessory','animal','altar']);
 const svg=renderFigure(chosen,catalog);assert.match(svg,/suits\/full.svg/);assert.doesNotMatch(svg,/clothes\/|pants\//);
 assert.ok(svg.indexOf('suits/full.svg')<svg.indexOf('faces/test.png'));
 for(const category of ['torso','legs']){
  const restored=choosePart(chosen,category,selection[category]);
  assert.equal(restored.suit,'suit-none');assert.equal(totalPrice(restored,catalog),1000);
  assert.deepEqual(selectedFigureParts(restored,catalog).map(p=>p.category),['legs','torso','face','hair']);
 }
 assert.equal(totalPrice({...chosen,suit:'suit-removed'},catalog),1000);
 assert.equal(choosePart(chosen,'face','another-face').suit,suit.id);
});
