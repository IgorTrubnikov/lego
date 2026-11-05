import { readdir, readFile, mkdir, rm, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const folders = { haircuts:'hair', faces:'face', clothes:'torso', pants:'legs' };
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
  const parts=[], ids=new Set();
  for(const [folder,category] of Object.entries(folders)) {
    const entries=(await readdir(path.join(root,folder),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'));
    let count=0;
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
      ids.add(id);count++;
      parts.push({id,category,name,price,image:`./${folder}/${encodeURIComponent(filename)}`});
    }
    if(!count)throw new Error(`Добавьте хотя бы одну деталь в ${folder}/`);
  }
  return parts;
}
export async function build(root=process.cwd(),output=path.join(root,'_site')) {
  const parts=await collectParts(root); // Validate before replacing the last successful build.
  await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
  for(const file of ['index.html','style.css','app.js','parts.js','assets',...Object.keys(folders)])await cp(path.join(root,file),path.join(output,file),{recursive:true});
  await writeFile(path.join(output,'catalog.js'),'// Generated from the category folders. Do not edit.\nexport default '+JSON.stringify(parts,null,2)+';\n');
  await writeFile(path.join(output,'.nojekyll'),'');
  console.log(`Каталог: ${parts.length} деталей. Статический сайт: ${output}`);
  return parts;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))build().catch(e=>{console.error(e.message);process.exitCode=1;});
