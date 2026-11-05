import test from 'node:test';
import assert from 'node:assert/strict';
import { totalPrice,renderFigure,escapeHtml } from '../parts.js';
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
