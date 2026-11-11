import {cartTotals,detailIsExtra} from './cart.js';
import {money} from './parts.js';
function wrapped(ctx,text,width){
 const lines=[];let line='';
 for(const word of String(text).split(/\s+/)){
  const candidate=line?line+' '+word:word;
  if(ctx.measureText(candidate).width<=width){line=candidate;continue;}
  if(line)lines.push(line);line='';
  for(const char of word){if(ctx.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}
 }
 if(line)lines.push(line);return lines;
}
async function load(src){const i=new Image();i.src=src;await i.decode();return i;}
function contain(ctx,image,x,y,w,h){const s=Math.min(w/image.width,h/image.height);ctx.drawImage(image,x+(w-image.width*s)/2,y+(h-image.height*s)/2,image.width*s,image.height*s);}
export async function createCartPreviews(selection,parts){
 const {createFigurePng}=await import('./export-image.js');
 const blob=await createFigurePng(selection,parts),url=URL.createObjectURL(blob);
 try{
  const img=await load(url),c=document.createElement('canvas');c.width=360;c.height=Math.round(360*img.height/img.width);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  const preview=c.toDataURL('image/webp',.94);
  const altar=parts.find(p=>p.category==='altar'&&p.id===selection.altar&&p.image);let altarPreview;
  if(altar){
   const image=await load(new URL(altar.image,document.baseURI).href),[x,y,w,h]=(altar.previewBox||'0 0 600 720').split(' ').map(Number);
   const a=document.createElement('canvas');a.width=240;a.height=Math.round(240*h/w);a.getContext('2d').drawImage(image,x,y,w,h,0,0,a.width,a.height);altarPreview=a.toDataURL('image/webp',.94);
  }
  return {preview,altarPreview};
 }finally{URL.revokeObjectURL(url);}
}
export async function createOrderPngs(cart){
 const t=cartTotals(cart);if(!t.ready)throw Error('Проверьте персонажей и заполните группы оформления.');
 const scratch=document.createElement('canvas').getContext('2d');if(!scratch)throw Error('Canvas недоступен.');
 const ordered=t.groups.flatMap(g=>g.lines.map((line,index)=>({...line,group:g,firstInGroup:index===0})));
 const cards=await Promise.all(ordered.map(async line=>{
  scratch.font='21px Arial';
  const details=line.item.details.map(p=>({p,names:wrapped(scratch,p.label+': '+p.name,770),codes:wrapped(scratch,p.id+' · '+(detailIsExtra(p)?money(p.price):'входит в фигурку')+(p.includedLabel?' · '+p.includedLabel:''),850)}));
  const textHeight=details.reduce((sum,d)=>sum+d.names.length*29+d.codes.length*23+14,0);
  return {...line,details,height:Math.max(640,textHeight+190)+(line.firstInGroup?140:0),image:await load(line.item.preview),altar:line.item.altarPreview?await load(line.item.altarPreview):undefined};
 }));
 const pages=[];let current=[],height=0;
 for(const card of cards){if(current.length&&(height+card.height>2600||current.length===4)){pages.push(current);current=[];height=0;}current.push(card);height+=card.height;}
 if(current.length)pages.push(current);
 const results=[];
 for(let page=0;page<pages.length;page++){
  const group=pages[page];
  const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=320+group.reduce((sum,c)=>sum+c.height,0)+190;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fcfaf7';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#791e36';ctx.font='bold 38px Arial';ctx.fillText('LEGO.FROM.TEUILOR',55,65);
  ctx.font='27px Arial';ctx.fillText(`Заказ ${cart.id} · лист ${page+1} из ${pages.length}`,55,110);
  ctx.fillStyle='#38252a';ctx.font='25px Arial';ctx.fillText(`Персонажей: ${t.lines.length} · групп оформления: ${t.groups.filter(g=>g.id!=='none').length}`,55,158);
  ctx.font='bold 30px Arial';ctx.fillText(`Итого за весь заказ: ${money(t.total)}`,55,205);
  ctx.font='19px Arial';ctx.fillStyle='#746169';ctx.fillText(`Фигурки сверх включённых ${money(t.figures)} · дополнения ${money(t.extras)} · оформление ${money(t.format)}`,55,245);
  let top=290;
  for(const card of group){
   if(card.firstInGroup){
    const g=card.group;
    ctx.fillStyle='#f5e5e8';ctx.fillRect(35,top,1330,125);
    ctx.fillStyle='#791e36';ctx.font='bold 28px Arial';ctx.fillText(`${g.name} — ${money(g.total)}`,65,top+38);
    ctx.fillStyle='#38252a';ctx.font='21px Arial';
    const rule=g.type==='none'?'Без оформления: каждая фигурка 550 ₽.':g.type==='keychain'?'Брелок 650 ₽, один персонаж включён.':g.type==='flask'?'Колба 1500 ₽ с первой фигуркой; вторая и третья по 400 ₽, с четвёртой по 350 ₽.':`Рамка ${money(g.price)}; первые три фигурки по 400 ₽, с четвёртой по 350 ₽.`;
    ctx.fillText(rule,65,top+75);
    ctx.font='19px Arial';ctx.fillText(`Оформление ${money(g.price)} + фигурки ${money(g.figures)} + дополнения ${money(g.extras)} = ${money(g.total)}`,65,top+107);
    top+=140;
   }
   const cardHeight=card.height-(card.firstInGroup?140:0);
   ctx.fillStyle='#ffffff';ctx.fillRect(35,top,1330,cardHeight-20);ctx.strokeStyle='#eadfe0';ctx.strokeRect(35,top,1330,cardHeight-20);
   ctx.fillStyle='#791e36';ctx.font='bold 27px Arial';ctx.fillText(`Персонаж ${card.index+1} — ${card.included&&!card.extras?'включён':money(card.total)}`,65,top+45);
   ctx.fillStyle='#746169';ctx.font='19px Arial';ctx.fillText(`${card.groupName} · ${card.included?'фигурка включена':`фигурка ${money(card.base)}`} + дополнения ${money(card.extras)}`,65,top+78);
   const figureH=card.altar?Math.min(410,cardHeight-280):cardHeight-165;
   contain(ctx,card.image,65,top+100,350,figureH);
   if(card.altar){contain(ctx,card.altar,120,top+105+figureH,230,145);}
   let y=top+115;
   for(const detail of card.details){
    ctx.font='21px Arial';ctx.fillStyle='#38252a';for(const text of detail.names){ctx.fillText(text,465,y);y+=29;}
    ctx.font='17px Arial';ctx.fillStyle='#746169';for(const text of detail.codes){ctx.fillText(text,465,y);y+=23;}y+=14;
   }
   top+=cardHeight;
  }
  ctx.fillStyle='#791e36';ctx.font='bold 26px Arial';ctx.fillText(`Итого за весь заказ: ${money(t.total)}`,55,top+50);
  ctx.font='20px Arial';ctx.fillStyle='#38252a';ctx.fillText('Прикрепите все листы заказа к сообщению в Telegram: @teuilor',55,top+95);
  ctx.font='18px Arial';ctx.fillStyle='#746169';ctx.fillText('Итоговую стоимость и детали заказа согласуем перед оплатой.',55,top+130);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Не удалось создать PNG.')),'image/png'));
  results.push({blob,filename:`teuilor-zakaz-${cart.id}-${page+1}.png`});
 }
 return results;
}
