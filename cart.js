import {selectionCategories,includedInFigure,figurePrice} from './parts.js';
export const cartStorageKey='teuilor-cart-v1';
export const packagingOptions=[
 {id:'none',name:'Без оформления',price:0},
 {id:'flask',name:'Колба',price:1500},
 {id:'frame-10x15',name:'Рамка 10×15',price:1550},
 {id:'frame-15x21',name:'Рамка 15×21',price:1650},
 {id:'frame-20x20',name:'Рамка 20×20',price:1750},
 {id:'keychain',name:'Брелок',price:650}
];
export const characterBasePrice=index=>index===0?figurePrice:index===1?400:350;
export const newCart=()=>({version:1,id:globalThis.crypto?.randomUUID?.().slice(0,8).toUpperCase()||Date.now().toString(36).toUpperCase(),createdAt:Date.now(),packagingId:'',packagingItems:[],items:[]});
const isPreview=value=>typeof value==='string'&&/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)&&value.length<2_000_000;
export function restoreCart(value){
 const empty=newCart();
 if(!value||value.version!==1||!Array.isArray(value.items))return empty;
 const items=value.items.filter(i=>i&&typeof i.id==='string'&&i.selection&&typeof i.selection==='object'&&Array.isArray(i.details)&&isPreview(i.preview)).map(i=>({...i,id:i.id.slice(0,80),selection:{...i.selection},altarPreview:isPreview(i.altarPreview)?i.altarPreview:undefined,details:i.details.filter(p=>p&&typeof p.id==='string'&&typeof p.category==='string'&&typeof p.name==='string'&&Number.isSafeInteger(p.price)&&p.price>=0&&p.price<=100000).map(p=>({id:p.id.slice(0,100),category:p.category.slice(0,30),label:String(p.label||p.category).slice(0,40),name:p.name.slice(0,160),price:p.price,includedLabel:typeof p.includedLabel==='string'?p.includedLabel.slice(0,100):undefined}))}));
 const unique=items.filter((item,index)=>items.findIndex(other=>other.id===item.id)===index);
 const formats=packagingLines(value).map(p=>({id:p.id,quantity:p.quantity}));
 return {...empty,packagingItems:formats,id:typeof value.id==='string'&&/^[A-Z0-9-]{1,40}$/.test(value.id)?value.id:empty.id,createdAt:Number.isFinite(value.createdAt)?value.createdAt:empty.createdAt,packagingId:packagingOptions.some(p=>p.id===value.packagingId)?value.packagingId:'',items:unique};
}
export function snapshotDetails(selection,parts){
 return selectionCategories(selection,parts).map(category=>{
  const part=parts.find(p=>p.id===selection[category.id]&&p.category===category.id&&p.image);
  return part?{id:part.id,category:part.category,label:category.singular,name:part.name,price:part.price,...(part.includedLabel?{includedLabel:part.includedLabel}:{})}:undefined;
 }).filter(Boolean);
}
export const detailIsExtra=part=>!includedInFigure.has(part.category)&&part.category!=='suit';
export const extrasPrice=item=>item.details.filter(detailIsExtra).reduce((sum,p)=>sum+p.price,0);
export function cartLines(cart){return cart.items.map((item,index)=>({item,index,base:characterBasePrice(index),extras:extrasPrice(item),total:characterBasePrice(index)+extrasPrice(item)}));}
export function packagingLines(cart){
 if(cart.packagingId==='none')return [];
 const rows=Array.isArray(cart.packagingItems)?cart.packagingItems:[];
 const chosen=new Map();
 for(const row of rows){
  const option=packagingOptions.find(p=>p.id===row?.id&&p.id!=='none');
  if(option&&Number.isSafeInteger(row.quantity)&&row.quantity>=1&&row.quantity<=999)chosen.set(option.id,{...option,quantity:row.quantity,total:option.price*row.quantity});
 }
 if(!chosen.size){const old=packagingOptions.find(p=>p.id===cart.packagingId&&p.id!=='none');if(old)chosen.set(old.id,{...old,quantity:1,total:old.price});}
 return [...chosen.values()];
}
export function cartTotals(cart){
 const lines=cartLines(cart),formats=packagingLines(cart);
 const packaging=cart.packagingId==='none'?packagingOptions[0]:formats.length?formats.at(-1):undefined;
 const figures=lines.reduce((sum,l)=>sum+l.base,0),extras=lines.reduce((sum,l)=>sum+l.extras,0),format=lines.length?formats.reduce((sum,p)=>sum+p.total,0):0;
 return {lines,figures,extras,format,packaging,packagingLines:formats,total:figures+extras+format};
}

// Saved previews remain intact; current prices and availability come from the catalog.
export function refreshCart(cart,parts){
 const catalog=new Map(parts.filter(p=>p.image).map(p=>[p.id,p]));
 return {...cart,items:cart.items.map(item=>({...item,unavailable:item.details.some(p=>catalog.get(p.id)?.category!==p.category),details:item.details.map(p=>{const current=catalog.get(p.id);return current?.category===p.category?{...p,price:current.price}:p;})}))};
}
