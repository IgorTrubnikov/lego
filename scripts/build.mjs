import { readdir, readFile, mkdir, rm, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {categories} from '../parts.js';
import {renderHeader,renderFooter,renderPage,pages} from './site-pages.mjs';
import {readGallery,galleryPage,renderWorksPreview} from './gallery.mjs';
import {readReviews,reviewsPage} from './reviews.mjs';
import { fileURLToPath } from 'node:url';
import {createHash} from 'node:crypto';

export const folders = { haircuts:'hair', faces:'face', clothes:'torso', pants:'legs', skirts:'skirt', suits:'suit', accessories:'accessory', animals:'animal', transport:'transport', children:'children', altars:'altar' };
const size = { width:600, height:720 };

export function imageSize(data, extension) {
  if(extension === '.png') {
    if(data.length<33 || !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || data.toString('ascii',12,16)!=='IHDR') throw new Error('Неверный PNG');
    return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
  }
  if(extension === '.webp') {
    if(data.length<30 || data.toString('ascii',0,4)!=='RIFF' || data.toString('ascii',8,12)!=='WEBP') throw new Error('Неверный WebP');
    // Read the image header, skipping optional RIFF chunks.
    for(let i=12;i+8<=data.length;) {
      const chunk=data.toString('ascii',i,i+4), length=data.readUInt32LE(i+4), start=i+8;
      if(start+length>data.length) throw new Error('Повреждённый WebP');
      if(chunk==='VP8X' && length>=10) return {width:1+data.readUIntLE(start+4,3),height:1+data.readUIntLE(start+7,3)};
      if(chunk==='VP8 ' && length>=10 && data.subarray(start+3,start+6).equals(Buffer.from([157,1,42]))) return {width:data.readUInt16LE(start+6)&0x3fff,height:data.readUInt16LE(start+8)&0x3fff};
      if(chunk==='VP8L' && length>=5 && data[start]===47) {const bits=data.readUInt32LE(start+1);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}
      i=start+length+(length%2);
    }
    throw new Error('Нет размеров в WebP');
  }
  if(extension === '.svg') {
    const root=data.toString('utf8').match(/<svg\b[^>]*>/)?.[0];
    if(!root)throw new Error('Неверный SVG');
    const view=root.match(/\bviewBox=["']\s*0\s+0\s+(\d+)\s+(\d+)\s*["']/);
    if(!view)throw new Error('SVG должен иметь viewBox="0 0 600 720"');
    return {width:Number(view[1]),height:Number(view[2])};
  }
  throw new Error('Неизвестный формат');
}
export async function collectParts(root) {
  const parts=[], ids=new Set(categories.filter(c=>c.optional).map(c=>c.id+'-none'));
  for(const [folder,category] of Object.entries(folders)) {
    const optional=categories.find(c=>c.id===category)?.optional;
    let entries;
    try { entries=await readdir(path.join(root,folder),{withFileTypes:true}); }
    catch(error){if(optional&&error.code==='ENOENT')continue;throw error;}
    // Hair labels carry display numbers; stable slugs preserve saved selections.
    const sortName=entry=>category==='hair'?(entry.name.split('__')[2]||entry.name):entry.name;
    entries.sort((a,b)=>category==='hair'?sortName(a).localeCompare(sortName(b),'ru',{numeric:true}):a.name.localeCompare(b.name,'en'));
    let count=0;const categoryParts=[];
    for(const entry of entries) {
      if(entry.name.startsWith('.')||entry.name==='README.md')continue;
      const filename=entry.name;
      if(!entry.isFile())throw new Error(`${folder}/${filename}: вложенные папки и ссылки не поддерживаются`);
      const match=filename.match(/^([a-z0-9]+(?:-[a-z0-9]+)*)__([0-9]+)__(.{1,45})\.(png|webp|svg)$/i);
      if(!match)throw new Error(`${folder}/${filename}: используйте slug__цена__Название.png (или .webp/.svg)`);
      const [,slug,rawPrice,rawName,format]=match;
      const price=Number(rawPrice), name=rawName.trim(), id=category+'-'+slug.toLowerCase();
      if(!name || !Number.isSafeInteger(price)||price>100000)throw new Error(`${folder}/${filename}: неверное название или цена (0–100000 ₽)`);
      if(ids.has(id))throw new Error(`${folder}/${filename}: повторяется идентификатор ${id}`);
      const data=await readFile(path.join(root,folder,filename));
      if(data.length>2*1024*1024)throw new Error(`${folder}/${filename}: размер больше 2 МБ`);
      let dimensions;
      try{dimensions=imageSize(data,'.'+format.toLowerCase());}catch(e){throw new Error(`${folder}/${filename}: ${e.message}`);}
      if(dimensions.width!==size.width||dimensions.height!==size.height)throw new Error(`${folder}/${filename}: нужен холст 600 × 720 px`);
      const preview=format.toLowerCase()==='svg'?data.toString('utf8').match(/<svg\b[^>]*\bdata-preview-box=["']([^"']*)["']/)?.[1]:undefined;
      let previewBox;
      if(preview!==undefined){
        const box=preview.trim().split(/\s+/).map(Number),[x,y,w,h]=box;
        if(box.length!==4||!box.every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>size.width||y+h>size.height)throw new Error(`${folder}/${filename}: неверная область предпросмотра`);
        previewBox=box.join(' ');
      }
      const rawOrder=format.toLowerCase()==='svg'?data.toString('utf8').match(/<svg\b[^>]*\bdata-catalog-order=["']([^"']*)["']/)?.[1]:undefined;
      const catalogOrder=rawOrder===undefined?undefined:Number(rawOrder);
      if(rawOrder!==undefined&&(category!=='hair'||!Number.isSafeInteger(catalogOrder)||catalogOrder<1||catalogOrder>10000))throw new Error(`${folder}/${filename}: неверный порядок карточки`);
      const skirtMode=format.toLowerCase()==='svg'?data.toString('utf8').match(/<svg\b[^>]*\bdata-skirt-mode=["']([^"']*)["']/)?.[1]:undefined;
      if(skirtMode!==undefined&&(category!=='skirt'||!['overlay','replace-legs'].includes(skirtMode)))throw new Error(folder+'/'+filename+': неверный режим юбки');
      if(category==='skirt'&&!skirtMode)throw new Error(folder+'/'+filename+': укажите data-skirt-mode="overlay" или "replace-legs"');
      const backImage=format.toLowerCase()==='svg'?data.toString('utf8').match(/<svg\b[^>]*\bdata-back-image=["']([^"']*)["']/)?.[1]:undefined;
      const assetVersion=format.toLowerCase()==='svg'?data.toString('utf8').match(/<svg\b[^>]*\bdata-asset-version=["']([^"']*)["']/)?.[1]:undefined;
      if(assetVersion!==undefined&&!/^[a-z0-9-]{1,32}$/.test(assetVersion))throw new Error(`${folder}/${filename}: неверная версия изображения`);
      const versionQuery=assetVersion?'?v='+assetVersion:'';
      const includedLabel=format.toLowerCase()==='svg'?data.toString('utf8').match(/<svg\b[^>]*\bdata-included-label=["']([^"']*)["']/)?.[1]:undefined;
      if(includedLabel!==undefined&&(category!=='suit'||!includedLabel.trim()||includedLabel.length>60))throw new Error(`${folder}/${filename}: неверная подпись комплекта`);
      if(backImage!==undefined){
        if(category!=='hair'||!/^\.\/assets\/hair-backs\/[a-z0-9-]+\.svg$/.test(backImage))throw new Error(`${folder}/${filename}: неверный задний слой причёски`);
        const back=await readFile(path.join(root,backImage.slice(2)));
        const dimensions=imageSize(back,'.svg');
        if(back.length>2*1024*1024||dimensions.width!==size.width||dimensions.height!==size.height)throw new Error(`${folder}/${filename}: неверный размер заднего слоя причёски`);
      }
      ids.add(id);count++;
      categoryParts.push({id,category,name,price,...(catalogOrder!==undefined?{catalogOrder}:{}),image:`./${folder}/${encodeURIComponent(filename)}`+versionQuery,...(previewBox?{previewBox}:{}),...(backImage?{backImage:backImage+versionQuery}:{}),...(includedLabel?{includedLabel}:{}),...(skirtMode?{skirtMode}:{})});
    }
    if(category==='hair')categoryParts.sort((a,b)=>(a.catalogOrder??Number.MAX_SAFE_INTEGER)-(b.catalogOrder??Number.MAX_SAFE_INTEGER));
    parts.push(...categoryParts);
    if(!count&&!optional)throw new Error(`Добавьте хотя бы одну деталь в ${folder}/`);
  }
  return parts;
}
export async function build(root=process.cwd(),output=path.join(root,'_site')) {
  const works=await readGallery(root),reviews=await readReviews(root);
  const parts=await collectParts(root); // Validate before replacing the last successful build.
  await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
  for(const file of ['index.html','style.css','app.js','export-image.js','navigation.js','gallery.js','reviews.js','parts.js','assets',...Object.keys(folders)]){
    try{await cp(path.join(root,file),path.join(output,file),{recursive:true});}
    catch(error){if(error.code==='ENOENT'&&categories.find(c=>c.id===folders[file])?.optional)continue;throw error;}
  }
  const home=await readFile(path.join(root,'index.html'),'utf8');
  if(!home.includes('<!-- SITE_HEADER -->')||!home.includes('<!-- SITE_FOOTER -->'))throw new Error('Missing shared navigation placeholders in index.html');
  await writeFile(path.join(output,'index.html'),home.replace('<!-- SITE_HEADER -->',renderHeader('home')).replace('<!-- SITE_FOOTER -->',renderFooter('home')).replace('<!-- WORKS_PREVIEW -->',renderWorksPreview(works)));
  for(const page of [...pages,galleryPage(works),reviewsPage(reviews)])await writeFile(path.join(output,page.id+'.html'),renderPage(page));
  await writeFile(path.join(output,'catalog.js'),'// Generated from the category folders. Do not edit.\nexport default '+JSON.stringify(parts,null,2)+';\n');
  await versionAssets(output,['index.html',...pages.map(p=>p.id+'.html'),'works.html','reviews.html']);
  await writeFile(path.join(output,'.nojekyll'),'');
  console.log(`Каталог: ${parts.length} деталей. Статический сайт: ${output}`);
  return parts;
}

// A page and its complete module graph must load from the same release.
// Keep plain filenames for older cached pages and existing public URLs.
export async function versionAssets(output,htmlFiles){
  const assetFiles=['app.js','parts.js','catalog.js','export-image.js','navigation.js','gallery.js','reviews.js','style.css'];
  const source=new Map();
  for(const file of [...assetFiles,...htmlFiles])source.set(file,await readFile(path.join(output,file),'utf8'));
  const hash=createHash('sha256');
  for(const [name,contents] of source)hash.update(name).update('\0').update(contents).update('\0');
  const version=hash.digest('hex').slice(0,16);
  const assets=Object.fromEntries(assetFiles.map(file=>[file,file+'?v='+version]));
  for(const file of assetFiles){
    const contents=file.endsWith('.js')?source.get(file).replace(/(['"])(\.\/[^'"\s]+\.js)\1/g,(match,quote,url)=>assets[url.slice(2)]?quote+'./'+assets[url.slice(2)]+quote:match):source.get(file);
    await writeFile(path.join(output,file),contents);
  }
  for(const file of htmlFiles){
    const contents=source.get(file).replace(/\b(src|href)="([^"\s]+)"/g,(match,attribute,url)=>assets[url]?`${attribute}="${assets[url]}"`:match);
    await writeFile(path.join(output,file),contents);
  }
  await writeFile(path.join(output,'asset-manifest.json'),JSON.stringify({version,assets},null,2)+'\n');
  return {version,assets};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))build().catch(e=>{console.error(e.message);process.exitCode=1;});
