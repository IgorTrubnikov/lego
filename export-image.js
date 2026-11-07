import {figureScene} from './parts.js';

// Draw the same local layers as the preview; no SVG serialization, API or upload.
export async function createFigurePng(selection,parts){
 const scene=figureScene(selection,parts),chosen=scene.layers;
 if(!chosen.length)throw new Error('Нет выбранных деталей.');
 const images=await Promise.all(chosen.map(async part=>{
  const image=new Image();
  image.src=new URL(part.image,document.baseURI).href;
  await image.decode();
  return {image,x:part.x,y:part.y,scale:part.scale};
 }));
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=scene.height*2;
 const context=canvas.getContext('2d');if(!context)throw new Error('Canvas недоступен.');
 for(const {image,x,y,scale} of images)context.drawImage(image,x*2,y*2,1200*scale,1440*scale);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Не удалось создать PNG.')),'image/png'));
}
