export const categories = [
  { id: 'hair', name: 'Причёски', singular: 'Причёска', icon: '<path d="M4 16C0 8 7 2 12 3c6-1 12 6 8 13l-3-4-2-5-4 3-4-1-1 5Z"/>' },
  { id: 'face', name: 'Лица', singular: 'Лицо', icon: '<rect x="4" y="3" width="16" height="18" rx="6"/><path d="M8 14q4 5 8 0M8 9h1m6 0h1"/>' },
  { id: 'torso', name: 'Одежда', singular: 'Одежда', icon: '<path d="m8 4-6 4 3 5 2-1v9h10v-9l2 1 3-5-6-4q-4 4-8 0Z"/>' },
  { id: 'legs', name: 'Брюки', singular: 'Брюки', icon: '<path d="M6 3h12l2 18h-7l-1-11-1 11H4ZM6 7h12"/>' },
  { id: 'skirt', name: 'Юбки', singular: 'Юбка', optional: true, emptyLabel: 'Без юбки', icon: '<path d="M8 3h8l5 18H3ZM8 6h8M9 9l-2 10m8-10 2 10"/>' },
  { id: 'suit', name: 'Костюмы', singular: 'Костюм', optional: true, emptyLabel: 'Одежда по частям', icon: '<path d="m8 3-5 4 2 7 2-1-1 8h5l1-7 1 7h5l-1-8 2 1 2-7-5-4-4 4Z"/>' },
  { id: 'accessory', name: 'Аксессуары', singular: 'Аксессуар', optional: true, emptyLabel: 'Без аксессуара', icon: '<path d="M5 8h14l2 13H3ZM8 8V6a4 4 0 0 1 8 0v2"/>' },
  { id: 'animal', name: 'Животные', singular: 'Животное', optional: true, emptyLabel: 'Без животного', icon: '<path d="M7 13c-2 2-4 6-1 7s4-1 6-1 3 2 6 1 1-5-1-7q-5-5-10 0Z"/><ellipse cx="4" cy="9" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="5" rx="2" ry="3"/><ellipse cx="21" cy="10" rx="2" ry="3"/>' },
  { id: 'transport', name: 'Транспорт', singular: 'Транспорт', optional: true, emptyLabel: 'Без транспорта', icon: '<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-8 5 8H5m10 0-3-12h4m-6 4H6"/>' },
  { id: 'children', name: 'Дети', singular: 'Ребёнок', optional: true, emptyLabel: 'Без ребёнка', icon: '<circle cx="12" cy="7" r="4"/><path d="M6 21v-5a6 6 0 0 1 12 0v5M9 21v-4m6 4v-4M10 7h.01M14 7h.01"/>' },
  { id: 'altar', name: 'Алтари', singular: 'Композиция', optional: true, emptyLabel: 'Без композиции', icon: '<path d="M4 21V10a8 8 0 0 1 16 0v11M2 21h6m8 0h6M7 21V10a5 5 0 0 1 10 0v11"/><path d="m12 5-2-2a1.5 1.5 0 0 1 2-2 1.5 1.5 0 0 1 2 2Z"/>' }
];
export const initialSelection = { hair:'hair-renewed-14',face:'face-catalog-58',torso:'torso-catalog-06',legs:'legs-catalog-04',skirt:'skirt-none',suit:'suit-none',accessory:'accessory-none',animal:'animal-none',transport:'transport-none',children:'children-none',altar:'altar-none' };
// Empty choices are virtual: administrators only add actual images to the folders.
export function withOptionalChoices(parts) {
 return [...categories.filter(c=>c.optional).map(c=>({id:c.id+'-none',category:c.id,name:c.emptyLabel,price:0})),...parts];
}
export const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
export function selectedSuit(selection,parts){return parts.find(p=>p.category==='suit'&&p.id===selection.suit&&p.image);}
export function selectedSkirt(selection,parts){return selectedSuit(selection,parts)?undefined:parts.find(p=>p.category==='skirt'&&p.id===selection.skirt&&p.image);}
export function selectionCategories(selection,parts){
 const suit=selectedSuit(selection,parts);
 const longSkirt=selectedSkirt(selection,parts)?.skirtMode==='replace-legs';
 return categories.filter(c=>suit?!['torso','legs','skirt'].includes(c.id):c.id!=='suit'&&(!longSkirt||c.id!=='legs'));
}
export function choosePart(selection,category,id,parts=[]){
 const next={...selection,[category]:id};
 if(['torso','legs'].includes(category)||(category==='skirt'&&id!=='skirt-none'))next.suit='suit-none';
 if(category==='suit'&&id!=='suit-none')next.skirt='skirt-none';
 if(category==='legs'&&selectedSkirt(selection,parts)?.skirtMode==='replace-legs')next.skirt='skirt-none';
 return next;
}
export const figurePrice=550;
export const includedInFigure=new Set(['hair','face','torso','legs']);
export function priceBreakdown(selection,parts){
 const suit=selectedSuit(selection,parts);
 const extras=selectionCategories(selection,parts).filter(c=>!includedInFigure.has(c.id)&&c.id!=='suit').map(c=>({category:c.id,label:c.singular,part:parts.find(p=>p.id===selection[c.id]&&p.category===c.id)})).filter(row=>row.part?.image&&row.part.price>0).map(row=>({category:row.category,label:row.label,price:row.part.price}));
 return [{category:'figure',label:suit?'Фигурка с костюмом':'Фигурка',price:suit?.price??figurePrice},...extras];
}
export function totalPrice(selection,parts){return priceBreakdown(selection,parts).reduce((sum,row)=>sum+row.price,0);}

export function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export const figureCategories=['transport','legs','skirt','torso','face','hair','accessory','animal','children'];
export function selectedFigureParts(selection,parts){
  const suit=selectedSuit(selection,parts);
  const longSkirt=selectedSkirt(selection,parts)?.skirtMode==='replace-legs';
  const visible=suit?figureCategories.filter(c=>!['legs','skirt'].includes(c)).map(c=>c==='torso'?'suit':c):figureCategories.filter(c=>!longSkirt||c!=='legs');
  const front=visible.map(category=>parts.find(p=>p.id===selection[category]&&p.category===category)).filter(p=>p?.image);
  const hair=front.find(p=>p.category==='hair');
  if(hair?.backImage)front.splice(front[0]?.category==='transport'?1:0,0,{...hair,category:'hair-back',image:hair.backImage});
  return front;
}
// Extra lower plane and room for full-size dogs; character coordinates stay unchanged.
export const largeAnimalIds=new Set(['animal-3d-shepherd','animal-3d-labrador']);
export function figureScene(selection,parts){
 const chosen=selectedFigureParts(selection,parts);
 const hasChildren=chosen.some(p=>p.category==='children'),hasTransport=chosen.some(p=>p.category==='transport');
 const hasLargeAnimal=chosen.some(p=>p.category==='animal'&&largeAnimalIds.has(p.id));
 const layers=chosen.map(part=>{
  if(part.category==='animal'&&largeAnimalIds.has(part.id))return {...part,x:450-415*(14/9),y:695-695*(14/9),scale:14/9};
  if(part.category==='transport'&&hasChildren)return {...part,x:-31,y:501,scale:.7};
  if(part.category==='children')return {...part,x:hasTransport?150:0,y:300,scale:1};
  return {...part,x:0,y:part.category==='transport'?300:0,scale:1};
 });
 return {width:hasLargeAnimal?760:600,height:hasChildren||hasTransport?1020:720,layers};
}
export function renderFigure(selection, parts, crop) {
  const views={hair:'155 65 290 255',face:'190 170 220 160',torso:'125 280 350 270',legs:'200 445 200 250',skirt:'165 485 270 220',suit:'133 311 334 391',accessory:'15 405 150 290',animal:'430 435 170 265',transport:'70 440 460 260',children:'180 425 240 280',altar:'10 40 580 670'};
  const preview=crop&&parts.find(p=>p.id===selection[crop]&&p.category===crop)?.previewBox;
  const image=part=>{
    return part?.image ? `<image href="${escapeHtml(part.image)}" width="600" height="720" data-layer="${part.category}"${part.y?` transform="translate(${part.x||0} ${part.y})${part.scale!==1?` scale(${part.scale})`:''}"`:''}/>` : '';
  };
  const chosen=parts.find(p=>p.id===selection[crop]&&p.category===crop);
  const cropped=crop==='hair'&&chosen?.backImage?[{...chosen,category:'hair-back',image:chosen.backImage},chosen]:[chosen];
  const scene=figureScene(selection,parts);
  const layers=(crop?cropped:scene.layers).map(image).join('');
  return `<svg class="figure-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${crop?escapeHtml(preview||views[crop]):`0 0 ${scene.width} ${scene.height}`}" aria-hidden="true">${layers}</svg>`;
}
