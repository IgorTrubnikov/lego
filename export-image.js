import {figureCategories} from './parts.js';

// Draw the same local layers as the preview; no SVG serialization, API or upload.
export async function createFigurePng(selection,parts){
 const chosen=figureCategories.map(category=>parts.find(p=>p.category===category&&p.id===selection[category])).filter(p=>p?.image);
 if(!chosen.length)throw new Error('Нет выбранных деталей.');
 const images=await Promise.all(chosen.map(async part=>{
  const image=new Image();
  image.src=new URL(part.image,document.baseURI).href;
  await image.decode();
  return image;
 }));
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1440;
 const context=canvas.getContext('2d');if(!context)throw new Error('Canvas недоступен.');
 for(const image of images)context.drawImage(image,0,0,canvas.width,canvas.height);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Не удалось создать PNG.')),'image/png'));
}
