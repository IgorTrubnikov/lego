import {selectionCategories,includedInFigure,figurePrice} from './parts.js';
// Keep the storage key so existing orders can migrate without losing their previews.
export const cartStorageKey='teuilor-cart-v1';
export const packagingOptions=[
 {id:'none',name:'Без оформления',price:0},
 {id:'flask',name:'Колба',price:1500,includesFirst:true},
 {id:'frame-10x15',name:'Рамка 10×15',price:1150},
 {id:'frame-15x21',name:'Рамка 15×21',price:1250},
 {id:'frame-20x20',name:'Рамка 20×20',price:1350},
 {id:'keychain',name:'Брелок',price:650,includesFirst:true,capacity:1}
];
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
export const newGroup=type=>({id:uid(),type});
export const newCart=()=>({version:2,id:uid().slice(0,8).toUpperCase(),createdAt:Date.now(),groups:[],items:[],needsReview:false});
export function characterBasePrice(index=0,type='none'){
 const option=packagingOptions.find(p=>p.id===type);
 if(!option||type==='none')return figurePrice;
 if(option.includesFirst&&index===0)return 0;
 return index<3?400:350;
}
const isPreview=value=>typeof value==='string'&&/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)&&value.length<2_000_000;
export function restoreCart(value){
 const empty=newCart();
 if(!value||![1,2].includes(value.version)||!Array.isArray(value.items))return empty;
 const items=value.items.filter(i=>i&&typeof i.id==='string'&&i.selection&&typeof i.selection==='object'&&Array.isArray(i.details)&&isPreview(i.preview)).map(i=>({id:i.id.slice(0,80),groupId:typeof i.groupId==='string'?i.groupId:'none',selection:{...i.selection},preview:i.preview,altarPreview:isPreview(i.altarPreview)?i.altarPreview:undefined,details:i.details.filter(p=>p&&typeof p.id==='string'&&typeof p.category==='string'&&typeof p.name==='string'&&Number.isSafeInteger(p.price)&&p.price>=0&&p.price<=100000).map(p=>({id:p.id.slice(0,100),category:p.category.slice(0,30),label:String(p.label||p.category).slice(0,40),name:p.name.slice(0,160),price:p.price,includedLabel:typeof p.includedLabel==='string'?p.includedLabel.slice(0,100):undefined}))}));
 const unique=items.filter((item,index)=>items.findIndex(other=>other.id===item.id)===index);
 let groups=[],needsReview=value.needsReview===true;
 if(value.version===2){
  for(const g of Array.isArray(value.groups)?value.groups:[]){
   if(g&&typeof g.id==='string'&&g.id!=='none'&&g.id.length<=80&&!groups.some(p=>p.id===g.id)&&packagingOptions.some(p=>p.id===g.type&&p.id!=='none'))groups.push({id:g.id,type:g.type});
  }
 }else{
  const formats=new Map();
  if(value.packagingId!=='none'){
   for(const row of Array.isArray(value.packagingItems)?value.packagingItems:[]){if(packagingOptions.some(p=>p.id===row?.id&&p.id!=='none')&&Number.isSafeInteger(row.quantity)&&row.quantity>=1&&row.quantity<=999)formats.set(row.id,row.quantity);}
   if(!formats.size&&packagingOptions.some(p=>p.id===value.packagingId&&p.id!=='none'))formats.set(value.packagingId,1);
  }
  for(const [type,quantity] of formats)for(let i=0;i<quantity;i++)groups.push(newGroup(type));
  // A single old format has an unambiguous destination. Multiple formats need review.
  if(groups.length===1)unique.forEach((item,index)=>{item.groupId=groups[0].type==='keychain'&&index>0?'none':groups[0].id;});
  else{unique.forEach(item=>{item.groupId='none';});needsReview=groups.length>1&&unique.length>0;}
 }
 const counts=new Map();
 for(const item of unique){
  const g=groups.find(g=>g.id===item.groupId),option=packagingOptions.find(p=>p.id===g?.type);
  if(!g||(option?.capacity&&(counts.get(g.id)||0)>=option.capacity))item.groupId='none';
  else counts.set(g.id,(counts.get(g.id)||0)+1);
 }
 return {...empty,groups,needsReview,id:typeof value.id==='string'&&/^[A-Z0-9-]{1,40}$/.test(value.id)?value.id:empty.id,createdAt:Number.isFinite(value.createdAt)?value.createdAt:empty.createdAt,items:unique};
}
export function snapshotDetails(selection,parts){
 return selectionCategories(selection,parts).map(category=>{
  const part=parts.find(p=>p.id===selection[category.id]&&p.category===category.id&&p.image);
  return part?{id:part.id,category:part.category,label:category.singular,name:part.name,price:part.price,...(part.includedLabel?{includedLabel:part.includedLabel}:{})}:undefined;
 }).filter(Boolean);
}
export const detailIsExtra=part=>!includedInFigure.has(part.category)&&part.category!=='suit';
export const extrasPrice=item=>item.details.filter(detailIsExtra).reduce((sum,p)=>sum+p.price,0);
export function cartTotals(cart){
 const counts=new Map();
 const groups=[{id:'none',type:'none',name:'Без оформления',price:0},...(cart.groups||[]).map(g=>{
  const option=packagingOptions.find(p=>p.id===g.type);const number=(counts.get(g.type)||0)+1;counts.set(g.type,number);
  return {...option,...g,name:option.name+' №'+number};
 })].map(g=>({...g,lines:[]}));
 const lines=cart.items.map((item,index)=>{
  const group=groups.find(g=>g.id===item.groupId)||groups[0],position=group.lines.length;
  const base=characterBasePrice(position,group.type),extras=extrasPrice(item);
  const line={item,index,position,groupId:group.id,groupName:group.name,base,extras,total:base+extras,included:base===0};group.lines.push(line);return line;
 });
 for(const group of groups){
  group.figures=group.lines.reduce((s,l)=>s+l.base,0);group.extras=group.lines.reduce((s,l)=>s+l.extras,0);
  group.total=group.price+group.figures+group.extras;
 }
 const figures=lines.reduce((s,l)=>s+l.base,0),extras=lines.reduce((s,l)=>s+l.extras,0),format=groups.reduce((s,g)=>s+g.price,0);
 const ready=lines.length>0&&!cart.needsReview&&!lines.some(l=>l.item.unavailable)&&groups.every(g=>g.id==='none'||(g.lines.length>0&&(!g.capacity||g.lines.length<=g.capacity)));
 return {lines,groups,figures,extras,format,total:figures+extras+format,ready};
}
export function assignGroup(cart,itemId,groupId){
 const item=cart.items.find(i=>i.id===itemId);if(!item)return false;
 if(groupId!=='none'){
  const group=cart.groups.find(g=>g.id===groupId),option=packagingOptions.find(p=>p.id===group?.type);
  if(!group||option.capacity&&cart.items.filter(i=>i.groupId===groupId&&i.id!==itemId).length>=option.capacity)return false;
 }
 item.groupId=groupId;return true;
}
// Saved previews remain intact; current prices and availability come from the catalog.
export function refreshCart(cart,parts){
 const catalog=new Map(parts.filter(p=>p.image).map(p=>[p.id,p]));
 return {...cart,items:cart.items.map(item=>({...item,unavailable:item.details.some(p=>catalog.get(p.id)?.category!==p.category),details:item.details.map(p=>{const current=catalog.get(p.id);return current?.category===p.category?{...p,price:current.price,...(p.category==='altar'?{name:current.name}:{})}:p;})}))};
}
